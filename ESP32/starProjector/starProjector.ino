/*
    Star Projector ESP32 interface
    João Teles, jocoteles@gmail.com
    june/2020

    Some conventions:
    ------------------------------------------
    stepper: alias for step motor
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
#define PATHBASE {1, 9, 11, 11} //number of bits of the base used to represent the path segments, respectively for: laser state, step delay, phi step, theta step
#define COMMBASE {8, 8, 8, 8}   //number of bits of the base used to communicate the path segments
#define DELAY_FACTOR 100        //factor to be multiplied to the delay path array in order to give the desired microseconds step delay
#define DELAY_MIN 50            //minimum delay between stepper sucessive steps in DELAY_FACTOR microseconds unit

#define FSCYCLE 4               //steppers full step cycle
#define STPS360 2038            //steppers number of steps for a 360º rotation
#define STEP_AT_ZENITH 510         //steppers step values corresponding to the Zenith direction
#define STEP_MIN 30             //steppers step min value for eye laser safety 
#define STEP_MAX 989            //steppers step max value for eye laser safety 

#define STPR1_GPIOS {14, 27, 26, 25}  //stepper 1 (fixed) GPIO pins
#define STPR2_GPIOS {15,  2,  4, 16}  //stepper 2 (mobile) GPIO pins
#define LASER_GPIO 13                 //laser GPIO pin

#define ACC_TRE 1e-4                //accelerometer relative deviation treshold to stop taking averages
#define ACC_ITER_MAX 1000           //accelerometer maximum iterations used to take averages and standard deviations
#define ACC_AVG 100                 //accelerometer number of averages
#define ACC_ZENITH {0.0, 1.0, 0.0}  //accelerometer zenith direction {x, y, z}

#define RESET_PATH_OPT 1       //option to start a new path reading
#define EXEC_PATH_OPT 2        //option to execute the path
#define CYCLIC_PATH_OPT  3     //option to execute the path cyclicaly
#define PRECISE_PATH_OPT 4     //option to execute a precise single segment path
#define LASER_SWITCH_OPT 5     //option to switch the laser
#define LASER_CHECK_OPT 6      //option to check the laser status
#define SET_ZENITH_OPT 7       //option to point the laser toward zenith
#define READ_ACT_STEPS_OPT 8   //option to read the steppers actual steps

#define RESET_PATH_ST 9       //status to start a new path reading
#define EXEC_PATH_ST 10       //status to execute the path
#define CYCLIC_PATH_ST 11     //status to execute the path cyclicaly
#define PRECISE_PATH_ST 12    //status to execute a precise single segment path
#define LASER_ON_ST 13        //status if laser is on
#define LASER_OFF_ST 14       //status if laser is off
#define LASER_SWITCH_ST 15    //status to switch laser state
#define SET_ZENITH_ST 16      //status to point the laser toward zenith
#define READ_ACT_STEPS_ST 17  //status to read the steppers actual steps

#define STEP_PREC 1                 //step precision used as stop criterion in the steppers direction setting
#define STEP_ITER 5                 //maximum number of iterations for step precision quest

//BLE variables:
//--------------
#define DEVICE_NAME          "StarProjector"
#define MAIN_S_UUID          "b75dac84-0213-4580-9213-c17f932a719c"  //The single service for all device's characteristics
#define PATH_C_UUID          "6309b82c-ff09-4957-a51b-b63aefd95b39"  //characteristic for the path array
#define POS_MEASURE_C_UUID   "34331e8c-74bd-4219-aab0-5909aeea3c4e"  //characteristic for measuring the steppers position
#define STATUS_C_UUID        "46425bca-0669-4f53-81bb-2bf67a3a1141"  //characteristic for indicating the hardware status
// UUIDs generated at: https://www.uuidgenerator.net/ (for changes, all uuids must be generated at the same generator run)

#define mainSnumHandles  8 // = 2*(n+1), where n is the maximum number of characteristics for the mainS service (default n = 7)

BLEServer *server;
BLEService *mainS;
BLECharacteristic *pathC, *posMeasureC, *statusC;
BLEAdvertising *advertising = BLEDevice::getAdvertising();

const int MPU_addr = 0x68;  // I2C address of the MPU-6050 sensor

//Steppers variables:
//-------------------
const int fullStep[FSCYCLE][4] = {{1, 0, 0, 1},   //Phases of each stepper step
                                  {1, 1, 0, 0},
                                  {0, 1, 1, 0},
                                  {0, 0, 1, 1}};

const int stpr1[4] = STPR1_GPIOS;   //fixed stepper GPIO pins (phi)
const int stpr2[4] = STPR2_GPIOS;   //mobile stepper GPIO pins  (theta)

uint16_t actStep[2] = {STPS360/2, STPS360/2};   //actual step values for the fixed (phi) and mobile (theta) stepper, respectively
float actRect[3] = {0.0, 1.0, 0.0};             //actual laser rectangular coordinates (x, y, z)

//Path variables:
//------------------
uint16_t phiP[PATH_MAX_SIZE];       //fixed stepper array of segments in step units
uint16_t thetaP[PATH_MAX_SIZE];     //mobile stepper array of segments in step units
uint16_t laserP[PATH_MAX_SIZE];     //laser state on/off array of segments (boolean - 1 bit)
uint16_t delayP[PATH_MAX_SIZE];     //step delay array of segments in 1 us times DELAY_FACTOR units
uint16_t pathSize = 0;
uint16_t phiA, thetaA;              //auxiliary fixed and mobile steppers coordinates
const uint8_t pathBase[PATHBASE_SIZE] = PATHBASE;   //number of bits of the base used to represent the path segments, respectively for: laser state, step delay, phi step, theta step
const uint8_t commBase[COMMBASE_SIZE] = COMMBASE;   //number of bits of the base used to communicate the path segments
bool cyclicPathF = false;
bool execPathF = false;
bool precisePathF = false;
bool navigationF = false;
bool laserSwitchF = false;
bool setZenithF = false;
bool readActStepsF = false;
bool laserOnState = false;
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
      execPathF = false;
      cyclicPathF = false;      
      switch (option) {
        case RESET_PATH_OPT:
          delay(200);
          pathSize = 0;
          sendStatus(RESET_PATH_ST);
          break;
        case EXEC_PATH_OPT:
          execPathF = true;
          sendStatus(EXEC_PATH_ST);
          break;
        case CYCLIC_PATH_OPT:
          execPathF = true;
          cyclicPathF = true;
          sendStatus(CYCLIC_PATH_ST);
          break;        
        case PRECISE_PATH_OPT:          
          precisePathF = true;
          sendStatus(PRECISE_PATH_ST);
          break;
        case LASER_SWITCH_OPT:        
          laserSwitchF = true;
          sendStatus(LASER_SWITCH_ST);
          break;
        case LASER_CHECK_OPT:
          if (laserOnState) sendStatus(LASER_ON_ST);
          else sendStatus(LASER_OFF_ST);
          break;
        case SET_ZENITH_OPT:
          setZenithF = true;
          sendStatus(SET_ZENITH_ST);          
          break;
    		case READ_ACT_STEPS_OPT:
          readActStepsF = true;
          sendStatus(READ_ACT_STEPS_ST);
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
      delayP[0] = DELAY_MIN; //Verificar o efeito desta linha
    }
    if (vals.length() == 2) { //Read step sizes for free navigation      
      laserP[0] = laserOnState;
      delayP[0] = DELAY_MIN;
      //Serial.println(vals[0] - 127);
      phiP[0] = (actStep[0] + vals[0] - 127) % STPS360;
      thetaP[0] = (actStep[1] + vals[1] - 127) % STPS360;
      pathSize = 1;
      navigationF = true;
      /*phSS = vals[0] - 128;
      thSS = vals[1] - 128;*/
    }
    if (vals.length() == 3) {
      stepRead(1e-2, 100.0, 10);
      float gx = actRect[0];
      float gy = -actRect[1];
      float gz = actRect[2];
      //Serial.print("gxa: ");Serial.println(gx);      
      //Serial.print("gya: ");Serial.println(gy);
      //Serial.print("gza: ");Serial.println(gz);
      //Serial.print("fixa: ");Serial.println(actStep[0]);      
      //Serial.print("moba: ");Serial.println(actStep[1]);      
      float az = atan(gx/gz);
      float al = atan(gy/pow(gx*gx + gz*gz, 0.5));
      if (gz < 0) az += PI;
      az += (vals[0]-127)*2*PI/STPS360;
      al += (vals[1]-127)*2*PI/STPS360;
      if (al > PI/2) {
        al = PI - al;
        az += PI;
      }
      if (al < 0) al = 0.0;      
      gz = -sin(az)*pow(gx*gx + gz*gz, 0.5);
      gy = sin(al)*pow(gx*gx + gy*gy + gz*gz, 0.5);
      gx = -cos(az)*pow(gx*gx + gz*gz, 0.5);      
      float ph = atan(-gx/pow(gy*gy + gz*gz, 0.5));
      float th = atan(-gz/gy);
      phiP[0] = angToStep(ph) % STPS360;
      thetaP[0] = angToStep(th) % STPS360;    
      laserP[0] = laserOnState;
      delayP[0] = DELAY_MIN;
      pathSize = 1;
      //navigationF = true;
      //Serial.print("gxd: ");Serial.println(gx);      
      //Serial.print("gyd: ");Serial.println(gy);
      //Serial.print("gzd: ");Serial.println(gz);
      //Serial.print("fixd: ");Serial.println(phiP[0]);      
      //Serial.print("mobd: ");Serial.println(thetaP[0]);      
    }
  }
};

/*void stepper (const int stpr[], uint16_t s) {
  for (short int j = 0; j < 4; j++)
    digitalWrite(stpr[j], fullStep[s % FSCYCLE][j]);
}*/

void stepperFix (uint16_t s) {
  //Serial.print("Fix: ");
  for (short int j = 0; j < 4; j++){
    //Serial.print(fullStep[s % FSCYCLE][j]);
    digitalWrite(stpr1[j], fullStep[s % FSCYCLE][j]);
  }
  //Serial.println();
  actStep[0] = s;  
}

void stepperMob (uint16_t s) {
  //Serial.print("Mob: ");
  for (short int j = 0; j < 4; j++) {
    //Serial.print(fullStep[s % FSCYCLE][j]);
    digitalWrite(stpr2[j], fullStep[s % FSCYCLE][j]);
  }
  //Serial.println();
  actStep[1] = s;  
}

void steppersOff () {
  for (short int j = 0; j < 4; j++) {
    digitalWrite(stpr1[j], 0);
    digitalWrite(stpr2[j], 0);
  }
}

void laser (bool s) {
  digitalWrite(LASER_GPIO, s);
  laserOnState = s;
}

uint16_t angToStep(float ang) {
  //Serial.println(round(ang*STPS360*0.5/PI) + STEP_AT_ZENITH);  
  return round(ang*STPS360*0.5/PI) + STEP_AT_ZENITH;
}

/*void measureActualSteps(uint16_t steps[]) {
  float ph, th;
  ph = atan(-amX/pow(amY*amY + amZ*amZ, 0.5));
  th = atan(-amZ/amY);
  steps[0] = angToStep(ph);
  steps[1] = angToStep(th);
}*/

/*void setZenith() {  
  uint16_t a0 = angToStep(0.0);
  laserP[0] = laserOnState;
  delayP[0] = DELAY_MIN;
  phiP[0] = a0;
  thetaP[0] = a0;
  pathSize = 1;
  stepRead(1.0, 1000, 100);
  int i = 0;
  do {
    execPath();
    stepRead(1.0, 1000, 100);
  } while (((abs(actStep[0] - a0) > STEP_PREC) || (abs(actStep[1] - a0) > STEP_PREC)) && (i++ < STEP_ITER));  
  steppersOff();
}*/

bool checkPathBoundaries() {
  /*for (uint16_t j = 0; j < pathSize; j++) {
    if ((phiP[j] < STEP_MIN) || (phiP[j] > STEP_MAX) || (thetaP[j] < STEP_MIN) || (thetaP[j] > STEP_MAX))
      return false;      
  }*/
  return true;
}

void execPath() {
  uint16_t N, ph, th, phA, thA;
  int dph, dth;
  float fph, fth;
  uint16_t j;

  phA = actStep[0];
  thA = actStep[1];  
  
  for (j = 0; j < pathSize; j++) {
    ph = phiP[j];
    th = thetaP[j];    
    dph = ph - phA;
    dth = th - thA;        
    //dph += dph%2;
    //dth += dth%2;
    N = max(max(abs(dph), abs(dth)), 1);
    fph = float(dph)/N;
    fth = float(dth)/N;
    /*Serial.println("-------------------------------------");
    Serial.print("j: ");Serial.println(j);
    Serial.print("phA: ");Serial.println(phA);
    Serial.print("thA: ");Serial.println(thA);
    Serial.print("ph: ");Serial.println(ph);
    Serial.print("th: ");Serial.println(th);*/
    for (uint16_t i = 1; i <= N; i++) {
      ph = phA + int(i*fph);
      th = thA + int(i*fth);      
      stepperFix(ph);
      stepperMob(th);      
      delayMicroseconds(delayP[j]*DELAY_FACTOR);
    }
    laser(laserP[j]);      
    phA = ph;
    thA = th;
  }
  actStep[0] = ph;
  actStep[1] = th;
}

void execSingleSegment(uint16_t phs, uint16_t ths, bool lstate) {
  uint16_t N, phA, thA, ph, th;
  int dph, dth;
  float fph, fth;

  phA = actStep[0];
  thA = actStep[1];
  ph = phs;
  th = ths;      
  dph = ph - phA;
  dth = th - thA;
  //dph += dph%2;
  //dth += dth%2;    
  N = max(max(abs(dph), abs(dth)), 1);
  fph = float(dph)/N;
  fth = float(dth)/N;    
  for (uint16_t i = 1; i <= N; i++) {
    ph = phA + int(i*fph);
    th = thA + int(i*fth);      
    stepperFix(ph);
    stepperMob(th);      
    delayMicroseconds(DELAY_MIN*DELAY_FACTOR);
  }
  actStep[0] = ph;
  actStep[1] = th;  
  laser(lstate);      
}

void stepRead(float treshold, int maxIter, int avgNumber) {
  /* Read MPU6050 averaged accelerometer values
   * treshold: average deviation stopping criterion
   * maxIter: max number of averages
   * avgNumber: number of partial averages
   */
  float x = 0.0, y = 0.0, z = 0.0;  
  float aXa = 32e3, aYa = 32e3, aZa = 32e3;
  float dev = 1.0e3;
  float N = 0;
  float ph, th;
  int16_t acX, acY, acZ;
  float amX, amY, amZ; // accelerometer average values
  float adX, adY, adZ; // accelerometer standard deviation values  
    
  while ((dev > treshold) && (N < maxIter)) {
    Wire.beginTransmission(MPU_addr);
    Wire.write(0x3B);  // starting with register 0x3B (ACCEL_XOUT_H)
    Wire.endTransmission(false);
    Wire.requestFrom(MPU_addr, 6, true);  // request a total of 6 registers
    acX = -Wire.read()<<8|Wire.read();  // 0x3B (ACCEL_XOUT_H) & 0x3C (ACCEL_XOUT_L)
    acY =  Wire.read()<<8|Wire.read();  // 0x3D (ACCEL_YOUT_H) & 0x3E (ACCEL_YOUT_L)
    acZ = -Wire.read()<<8|Wire.read();  // 0x3F (ACCEL_ZOUT_H) & 0x40 (ACCEL_ZOUT_L)
    //tmp = Wire.read()<<8|Wire.read();  // 0x41 (TEMP_OUT_H) & 0x42 (TEMP_OUT_L)
    x += (float) acZ;
    y += (float) acY;
    z += (float) acX;
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
      dev = (fabs(amX - aXa) + fabs(amY - aYa) + fabs(amZ - aZa))/3;
      aXa = amX; aYa = amY; aZa = amZ;      
    }    
    //delay(5);
  }
  //Serial.println(N);  
  ph = atan(-amX/pow(amY*amY + amZ*amZ, 0.5));
  th = atan(-amZ/amY);
  actRect[0] = amX;
  actRect[1] = amY;
  actRect[2] = amZ;
  actStep[0] = angToStep(ph);
  actStep[1] = angToStep(th);      
  /*Serial.print("amX, adX: "); Serial.print(amX); Serial.print(", "); Serial.println(adX);
  Serial.print("amY, adY: "); Serial.print(amY); Serial.print(", "); Serial.println(adY);
  Serial.print("amZ, adZ: "); Serial.print(amZ); Serial.print(", "); Serial.println(adZ);*/
}

void stepReadSimple(int avgNumber) {
  /* Read MPU6050 averaged accelerometer values
   * avgNumber: number of averages
   */
  int32_t x = 0, y = 0, z = 0;    
  float ph, th;
  int16_t acX, acY, acZ;
  float amX, amY, amZ;
    
  for (int i = 0; i < avgNumber; i++) {
    Wire.beginTransmission(MPU_addr);
    Wire.write(0x3B);  // starting with register 0x3B (ACCEL_XOUT_H)
    Wire.endTransmission(false);
    Wire.requestFrom(MPU_addr, 6, true);  // request a total of 6 registers
    acX = -Wire.read()<<8|Wire.read();  // 0x3B (ACCEL_XOUT_H) & 0x3C (ACCEL_XOUT_L)
    acY =  Wire.read()<<8|Wire.read();  // 0x3D (ACCEL_YOUT_H) & 0x3E (ACCEL_YOUT_L)
    acZ = -Wire.read()<<8|Wire.read();  // 0x3F (ACCEL_ZOUT_H) & 0x40 (ACCEL_ZOUT_L)
    x += acZ;
    y += acY;
    z += acX;
    //delay(5);
  }
  amX = float(x)/avgNumber;
  amY = float(y)/avgNumber;
  amZ = float(z)/avgNumber;  
  ph = atan(-amX/pow(amY*amY + amZ*amZ, 0.5));
  th = atan(-amZ/amY);
  actRect[0] = amX;
  actRect[1] = amY;
  actRect[2] = amZ;
  actStep[0] = angToStep(ph);
  actStep[1] = angToStep(th);      
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

void sendStatus(uint8_t st) {
  uint8_t v[1] = {st};
  size_t size = 1;  
  statusC->setValue(v, size);
}

bool steppersOutTarget(uint16_t phTarget, uint16_t thTarget, int i) {
  if (((abs(actStep[0] - phTarget) > STEP_PREC) || (abs(actStep[1] - thTarget) > STEP_PREC)) && (i < STEP_ITER)) return true;
  else return false;
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

  BLEDevice::init(DEVICE_NAME);
  
  server = BLEDevice::createServer();
  //mainS = server->createService(mainS_UUID);
  mainS = server->createService(BLEUUID(MAIN_S_UUID), mainSnumHandles);  // In order to set numHandles parameter, MAIN_S_UUID must be converted by function BLEUUID
  pathC = mainS->createCharacteristic(PATH_C_UUID, BLECharacteristic::PROPERTY_WRITE);
  posMeasureC = mainS->createCharacteristic(POS_MEASURE_C_UUID, BLECharacteristic::PROPERTY_READ);
  statusC = mainS->createCharacteristic(STATUS_C_UUID, BLECharacteristic::PROPERTY_READ);
  
  pathC->setCallbacks(new ReadPathCallback());
  
  mainS->start();
  
  advertising->addServiceUUID(MAIN_S_UUID);
  advertising->setScanResponse(false);
  advertising->setMinPreferred(0x06);  // functions that help with iPhone connections issue
  advertising->setMinPreferred(0x12);  
  BLEDevice::startAdvertising();

  //setZenith();
}


void loop() {
  
  if (navigationF) { //Steppers free navigation movement    
    if (checkPathBoundaries()) {
      //stepRead(10.0, 100, 10);
      execPath();
      //stepRead(10.0, 100, 10);
      //sendActSteps();
      steppersOff();
    }    
    navigationF = false;    
  }

  if (execPathF) { //Path execution    
    stepRead(1.0, 1000, 100);    
    //stepReadSimple(1000);
    if (checkPathBoundaries()) do {
      phiA = phiP[pathSize-1];
      thetaA = thetaP[pathSize-1];
      execPath();
      int i = 0;      
      if (precisePathF) do {                      
        execSingleSegment(phiA, thetaA, laserOnState);        
        stepRead(1.0, 5000, 100);                
      } while (steppersOutTarget(phiA, thetaA, i++));        
    } while (cyclicPathF);
    steppersOff();
    execPathF = false;
    precisePathF = false;
  }

  if (laserSwitchF) {    
    laserOnState = !laserOnState;              
    laser(laserOnState);    
    laserSwitchF = false;    
  }
  
  if (setZenithF) {    
    laserP[0] = laserOnState;
    delayP[0] = DELAY_MIN;
    phiP[0] = STEP_AT_ZENITH;
    thetaP[0] = STEP_AT_ZENITH;
    pathSize = 1;
    stepRead(1.0, 1000, 100);
    int i = 0;
    do {
      execPath();
      stepRead(1.0, 1000, 100);
    } while (steppersOutTarget(STEP_AT_ZENITH, STEP_AT_ZENITH, i++));    
    steppersOff();
    setZenithF = false;
  }

  if (readActStepsF) {    
    stepRead(1.0, 5000, 100);
    //stepReadSimple(1000);
    sendActSteps();
    readActStepsF = false;
  }

}
