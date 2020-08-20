/*
    Star Projector ESP32 interface
    João Teles, jocoteles@gmail.com
    june/2020

    Some conventions:
    ------------------------------------------
    stepper = alias for step motor
    variables ended by capital letter 'C': it's a characteristic UUID
    step: is a stepper step value. It can vary only by -1, 0, or +1.
    segment: is a stepper step range, which is linearly followed by the stepper.
    path: the full array(s) of segments of a given steppers path execution.

    GY-511 MPU6050 sensor SCL, SDA connected, respectively, to the defaults GPIO 22, 21.
*/

#include <Wire.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>

#define PATH_MAX_SIZE 3000      //maximum size of the steppers segments array
#define PATHBASE_SIZE 4         //size of the path data chunk decodification
#define COMMBASE_SIZE 4         //size of the path data chunk codification
#define DELAY_FACTOR 100        //factor to be multiplied to the delay path array in order to give the desired microseconds step delay
#define DELAY_MIN 50            //minimum delay between stepper sucessive steps in DELAY_FACTOR microseconds unit

#define FSCYCLE 4               //steppers full step cycle
#define STPS360 2048            //steppers number of steps for a 360º rotation

#define STPR1_GPIOS {14, 27, 26, 25}  //stepper 1 (fixed) GPIO pins
#define STPR2_GPIOS {15,  2,  4, 16}  //stepper 2 (mobile) GPIO pins
#define LASER_GPIO 13                 //laser GPIO pin

#define ACC_TRE 1e-4                //accelerometer relative deviation treshold to stop taking averages
#define ACC_ITER_MAX 1000           //accelerometer maximum iterations used to take averages and standard deviations
#define ACC_AVG 100                 //accelerometer number of averages
#define ACC_ZENITH {0.0, 1.0, 0.0}  //accelerometer zenith direction {x, y, z}

#define STEP_PREC 1                 //step precision used as stop criterion in the steppers direction setting

//BLE variables:
//--------------
#define mainS_UUID          "e80fd323-0ae1-454f-bbd5-31b571083af5"  //The single service for all device's characteristics
#define pathC_UUID          "20e75b2b-6be1-4b18-b1d0-a06018dbdab5"  //characteristic for the path array
#define posMeasureC_UUID    "e16843eb-fe97-42b4-acc7-83069473c1b5"  //characteristic for measuring the steppers position
// UUIDs generated at: https://www.uuidgenerator.net/

#define mainSnumHandles  6 // = 2*(n+1), where n is the maximum number of characteristics for the mainS service (default n = 7)

BLEServer *server;
BLEService *mainS;
BLECharacteristic *pathC, *posMeasureC;
BLEAdvertising *advertising = BLEDevice::getAdvertising();

const int MPU_addr = 0x68;  // I2C address of the MPU-6050 sensor

//Steppers variables:
//-------------------
const int fullStep[FSCYCLE][4] = {  {1, 0, 0, 1},   //Phases of each stepper step
                                    {1, 1, 0, 0},
                                    {0, 1, 1, 0},
                                    {0, 0, 1, 1}};

const int stpr1[4] = STPR1_GPIOS;   //fixed stepper GPIO pins (phi)
const int stpr2[4] = STPR2_GPIOS;   //mobile stepper GPIO pins  (theta)

uint16_t actStep[2] = {STPS360/2, STPS360/2};   //actual step values for the fixed (phi) and mobile (theta) stepper, respectively

//Path variables:
//------------------
uint16_t phiP[PATH_MAX_SIZE];       //fixed stepper array of segments in step units
uint16_t thetaP[PATH_MAX_SIZE];     //mobile stepper array of segments in step units
uint16_t laserP[PATH_MAX_SIZE];     //laser state on/off array of segments (boolean - 1 bit)
uint16_t delayP[PATH_MAX_SIZE];     //step delay array of segments in 1 us times DELAY_FACTOR units
uint16_t pathSize = 0;
int phSS, thSS;                     //Step sizes for phi and theta displacements in the free navigation mode
const uint8_t pathBase[PATHBASE_SIZE] = {1, 9, 11, 11};   //number of bits of the base used to represent the path segments, respectively for: laser state, step delay, phi step, theta step
const uint8_t commBase[COMMBASE_SIZE] = {8, 8, 8, 8};     //number of bits of the base used to communicate the path segments
const uint16_t resetPathOpt = 1;       //option to start a new path reading
const uint16_t execPathOpt = 2;        //option to execute the path
const uint16_t cyclicPathOpt = 3;      //option to execute the path cyclicaly
const uint16_t laserOnOpt = 4;         //option to turn on the laser
const uint16_t laserOffOpt = 5;        //option to turn off the laser
const uint16_t setZenithOpt = 6;        //option to point the laser toward zenith
bool cyclicPathF = false;
bool execPathF = false;
bool navigationF = false;
bool laserF = false;
//bool started = false;

float origin[3] = ACC_ZENITH;   //direction where phi = 0 and theta = 0 

uint16_t * decode(uint32_t x) {
  //x decodification in the "pathBase" array
  uint8_t b0 = 0;
  uint32_t r0 = x;
  unsigned long p1, p2;
  static uint16_t r[PATHBASE_SIZE];
  for (uint8_t i = 0; i < PATHBASE_SIZE; i++)
  {
    p1 = pow(2, b0);
    p2 = pow(2, pathBase[i]);
    r[i] = (r0 / p1) % p2;
    b0 += pathBase[i];
    r0 -= r[i];
  }
  return r;
}

uint16_t * readChunk(uint16_t a[], uint16_t r[]) {
  //Read a COMMBASE_SIZE size of the path array
  //Return the decoded representation in the "pathBase"
  uint32_t v = 0;
  uint8_t b = 0;
  unsigned long p;
  uint8_t b0 = 0;
  uint8_t i;
  unsigned long p1, p2;  
  for (i = 0; i < COMMBASE_SIZE; i++) {
    p = pow(2, b);
    v += a[i]*p;
    b += commBase[i];
  }
  for (i = 0; i < PATHBASE_SIZE; i++)
  {
    p1 = pow(2, b0);
    p2 = pow(2, pathBase[i]);
    r[i] = (v / p1) % p2;
    b0 += pathBase[i];
    v -= r[i];
  }
}

class ReadPathCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string vals = pCharacteristic->getValue();
    uint16_t valsComm[COMMBASE_SIZE];
    uint16_t i, option;
    uint8_t j;      
    if (vals.length() == 1) {
      option = vals[0];      
      cyclicPathF = false;
      switch (option) {
        case execPathOpt:
          execPathF = true;
          break;
        case cyclicPathOpt:
          execPathF = true;
          cyclicPathF = true;
          break;
        case resetPathOpt:
          pathSize = 0;
          break;
        case laserOnOpt:        
          laserF = true;
          laser(laserF);
          break;
        case laserOffOpt:        
          laserF = false;
          laser(laserF);
          break;
        case setZenithOpt:
          setZenith();
          break;
      }
    }
    if (vals.length() >= COMMBASE_SIZE) { //Read path
      uint16_t r0[PATHBASE_SIZE];
      uint16_t dmin = DELAY_MIN;      
      for (i = 0; i < (vals.length() / COMMBASE_SIZE); i++)
      {
        for (j = 0; j < COMMBASE_SIZE; j++) valsComm[j] = vals[COMMBASE_SIZE*i + j];
        readChunk(valsComm, r0);
        laserP[pathSize+i] = r0[0];
        delayP[pathSize+i] = max(r0[1], dmin);
        phiP[pathSize+i] = r0[2];
        thetaP[pathSize+i] = r0[3];
      }
      pathSize += i;
    }
    if (vals.length() == 2) { //Read step sizes for free navigation      
      laserP[0] = laserF;
      delayP[0] = DELAY_MIN;
      phiP[0] = (actStep[0] + vals[0] - 127) % STPS360;
      thetaP[0] = (actStep[1] + vals[1] - 127) % STPS360;
      pathSize = 1;
      navigationF = true;
      /*phSS = vals[0] - 128;
      thSS = vals[1] - 128;*/
    }
  }
};

void stepper (const int stpr[], uint16_t s) {
  for (short int j = 0; j < 4; j++)
    digitalWrite(stpr[j], fullStep[s % FSCYCLE][j]);
}

void steppersOff () {
  for (short int j = 0; j < 4; j++) {
    digitalWrite(stpr1[j], 0);
    digitalWrite(stpr2[j], 0);
  }
}

void laser (bool s) {digitalWrite(LASER_GPIO, s);}

uint16_t angToStep(float ang) {
  return round(ang*STPS360*0.5/PI) + STPS360/2;
}

/*void measureActualSteps(uint16_t steps[]) {
  float ph, th;
  ph = atan(-amX/pow(amY*amY + amZ*amZ, 0.5));
  th = atan(-amZ/amY);
  steps[0] = angToStep(ph);
  steps[1] = angToStep(th);
}*/

void setZenith() {  
  uint16_t a0 = angToStep(0.0);
  laserP[0] = laserF;
  delayP[0] = DELAY_MIN;
  phiP[0] = a0;
  thetaP[0] = a0;
  pathSize = 1;
  do {
    mpuRead(1e-3, 100.0, 10);    
    execPath();
  } while ((abs(actStep[0] - a0) + abs(actStep[1] - a0))/2 > STEP_PREC);  
  steppersOff();
}

bool checkPathBoundaries() {
  for (uint16_t j = 0; j < pathSize; j++) {
    if (abs(phiP[j]-STPS360/2) > STPS360/4 || abs(thetaP[j]-STPS360/2) > STPS360/4)
      return false;      
  }
  return true;
}

void execPath() {
  uint16_t N, ph, th, phA, thA;
  int dph, dth;
  float fph, fth;
  unsigned long t0;

  phA = actStep[0];
  thA = actStep[1];  
  
  for (uint16_t j = 0; j < pathSize; j++) {
    ph = phiP[j];
    th = thetaP[j];    
    dph = ph - phA;
    dth = th - thA;    
    N = max(abs(dph), abs(dth));
    fph = float(dph)/N;
    fth = float(dth)/N;    
    for (uint16_t i = 1; i <= N; i++) {
      ph = phA + int(i*fph);
      th = thA + int(i*fth);      
      stepper(stpr1, ph);
      stepper(stpr2, th);      
      delayMicroseconds(delayP[j]*DELAY_FACTOR);
    }
    laser(laserP[j]);      
    phA = ph;
    thA = th;
  }
}

void mpuRead(float treshold, float maxIter, int avgNumber) {
  /* Read MPU6050 averaged accelerometer values
   * treshold: relative average deviation stopping criterion
   * maxIter: max number of averages
   * avgNumber: number of partial averages
   */
  float x = 0.0, y = 0.0, z = 0.0;
  //float x2 = 0.0, y2 = 0.0, z2 = 0.0;
  float aXa = 32e3, aYa = 32e3, aZa = 32e3;
  float std = 1.0;
  float N = 0;
  float ph, th;
  int16_t acX, acY, acZ;
  float amX, amY, amZ; // accelerometer average values
  float adX, adY, adZ; // accelerometer standard deviation values
    
  while ((std > treshold) && (N < maxIter)) {
    Wire.beginTransmission(MPU_addr);
    Wire.write(0x3B);  // starting with register 0x3B (ACCEL_XOUT_H)
    Wire.endTransmission(false);
    Wire.requestFrom(MPU_addr, 6, true);  // request a total of 6 registers
    acX = -Wire.read()<<8|Wire.read();  // 0x3B (ACCEL_XOUT_H) & 0x3C (ACCEL_XOUT_L)
    acY =  Wire.read()<<8|Wire.read();  // 0x3D (ACCEL_YOUT_H) & 0x3E (ACCEL_YOUT_L)
    acZ = -Wire.read()<<8|Wire.read();  // 0x3F (ACCEL_ZOUT_H) & 0x40 (ACCEL_ZOUT_L)
    //tmp = Wire.read()<<8|Wire.read();  // 0x41 (TEMP_OUT_H) & 0x42 (TEMP_OUT_L)
    x += acZ;
    y += acY;
    z += acX;
    /*x2 += acX*acX;
    y2 += acY*acY;
    z2 += acZ*acZ;*/
    N++;    
    if (((int) N)%avgNumber == 0) {
      amX = x/N;
      amY = y/N;
      amZ = z/N;
      adX = fabs(amX - aXa);
      adY = fabs(amY - aYa);
      adZ = fabs(amZ - aZa);
      aXa = amX; aYa = amY; aZa = amZ;
      std = (fabs(adX/amX) + fabs(adY/amY) + fabs(adZ/amZ))/3.0;
    }    
    delay(1);
  }  
  ph = atan(-amX/pow(amY*amY + amZ*amZ, 0.5));
  th = atan(-amZ/amY);
  actStep[0] = angToStep(ph);
  actStep[1] = angToStep(th);  
  /*Serial.print("amX, adX: "); Serial.print(amX); Serial.print(", "); Serial.println(adX);
  Serial.print("amY, adY: "); Serial.print(amY); Serial.print(", "); Serial.println(adY);
  Serial.print("amZ, adZ: "); Serial.print(amZ); Serial.print(", "); Serial.println(adZ);*/
}

void sendActSteps() {
  uint16_t r00 = actStep[0] / 256;
  uint16_t r01 = actStep[0] % 256;
  uint16_t r10 = actStep[1] / 256;
  uint16_t r11 = actStep[1] % 256;
  uint8_t r[4] = {r00, r01, r10, r11};
  /*Serial.println(actStep[0]);
  Serial.println(actStep[1]);
  Serial.println(r[0]);
  Serial.println(r[1]);
  Serial.println(r[2]);
  Serial.println(r[3]);*/
  size_t size = 4;
  posMeasureC->setValue(r, size);
  //posMeasureC->setValue(r00);
  //posMeasureC->notify();
}

void setup() {
  Serial.begin(115200);

  Wire.begin();
  Wire.beginTransmission(MPU_addr);
  Wire.write(0x6B);  // PWR_MGMT_1 register
  Wire.write(0);     // set to zero (wakes up the MPU-6050)
  Wire.endTransmission(true);

  for (int i = 0; i < 4; i++) {
    pinMode(stpr1[i], OUTPUT);
    pinMode(stpr2[i], OUTPUT);
  }
  pinMode(LASER_GPIO, OUTPUT);

  steppersOff();
  laser(false);

  Serial.println("Starting BLE work!");

  BLEDevice::init("StarProjector");
  
  server = BLEDevice::createServer();
  //mainS = server->createService(mainS_UUID);
  mainS = server->createService(BLEUUID(mainS_UUID), mainSnumHandles);  // In order to set numHandles parameter, mainS_UUID must be converted by function BLEUUID
  pathC = mainS->createCharacteristic(pathC_UUID, BLECharacteristic::PROPERTY_WRITE);
  posMeasureC = mainS->createCharacteristic(posMeasureC_UUID, BLECharacteristic::PROPERTY_READ);
  
  pathC->setCallbacks(new ReadPathCallback());
  
  mainS->start();
  
  advertising->addServiceUUID(mainS_UUID);
  advertising->setScanResponse(false);
  advertising->setMinPreferred(0x06);  // functions that help with iPhone connections issue
  advertising->setMinPreferred(0x12);  
  BLEDevice::startAdvertising();

  setZenith();
}


void loop() {
  
  if (navigationF) { //Steppers free navigation movement    
    if (checkPathBoundaries()) {
      execPath();
      mpuRead(1e-2, 100.0, 10);
      sendActSteps();
      steppersOff();
    }    
    navigationF = false;
  }

  if (execPathF) { //Path execution
    if (checkPathBoundaries()) do {
      execPath();
      mpuRead(1e-2, 100.0, 10);    
    } while (cyclicPathF);
    steppersOff();
    execPathF = false;
  }

  /*sendActSteps();
  delay(500);*/
  /*if (!started) {
    setZenith();
    started = true;
  }*/

  /*mpuRead(ACC_TRE, ACC_ITER_MAX, ACC_AVG);
  delay(1000);  
  Serial.print("phi: "); Serial.println(actStep[0]);
  Serial.print("theta: "); Serial.println(actStep[1]);*/
}
