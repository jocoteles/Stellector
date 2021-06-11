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
#define STEP_AT_ZENITH 510      //steppers step values corresponding to the Zenith direction
#define STEP_MIN 30             //steppers step min value for eye laser safety 
#define STEP_MAX 989            //steppers step max value for eye laser safety 

#define STPR1_GPIOS {14, 27, 26, 25}  //stepper 1 (fixed) GPIO pins
#define STPR2_GPIOS {15,  2,  4, 16}  //stepper 2 (mobile) GPIO pins
#define LASER_GPIO 13                 //laser GPIO pin

#define RESET_PATH_OPT 1       //option to start a new path reading
#define EXEC_PATH_OPT 2        //option to execute the path
#define CYCLIC_PATH_OPT  3     //option to execute the path cyclicaly
#define LASER_SWITCH_OPT 4     //option to switch the laser
#define LASER_CHECK_OPT 5      //option to check the laser status
#define SET_ZENITH_OPT 6       //option to make actSteps equal to STEP_AT_ZENITH
#define READ_ACT_STEPS_OPT 7   //option to read the steppers actual steps
#define RESET_READ_OPT 8       //option to make the read steppers procedure ready

#define RESET_PATH_ST 9       //status to start a new path reading
#define EXEC_PATH_ST 10       //status to execute the path
#define CYCLIC_PATH_ST 11     //status to execute the path cyclicaly
#define LASER_ON_ST 12        //status if laser is on
#define LASER_OFF_ST 13       //status if laser is off
#define LASER_SWITCH_ST 14    //status to switch laser state
#define SET_ZENITH_ST 15      //status to make actSteps equal to STEP_AT_ZENITH
#define READ_ACT_STEPS_ST 16  //status to read the steppers actual steps

#define TIME_STEPPERS_OFF 15000       //time delay to turn off steppers when idle in miliseconds.
#define TIME_LASER_OFF 60000          //time delay to turn off laser when idle in miliseconds.

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

//Path variables:
//------------------
uint16_t phiP[PATH_MAX_SIZE];       //fixed stepper array of segments in step units
uint16_t thetaP[PATH_MAX_SIZE];     //mobile stepper array of segments in step units
uint16_t laserP[PATH_MAX_SIZE];     //laser state on/off array of segments (boolean - 1 bit)
uint16_t delayP[PATH_MAX_SIZE];     //step delay array of segments in 1 us times DELAY_FACTOR units
uint16_t pathSize = 0;
const uint8_t pathBase[PATHBASE_SIZE] = PATHBASE;   //number of bits of the base used to represent the path segments, respectively for: laser state, step delay, phi step, theta step
const uint8_t commBase[COMMBASE_SIZE] = COMMBASE;   //number of bits of the base used to communicate the path segments
bool cyclicPathF = false;
bool execPathF = false;
bool navigationF = false;
bool laserSwitchF = false;
bool setZenithF = false;
bool readActStepsF = false;
bool laserOnState = false;

unsigned long steppersTime = 0;
unsigned long laserTime = 0;


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
          break;
        case RESET_READ_OPT:          
          uint8_t r[1] = {0};  
          size_t size = 1;
          posMeasureC->setValue(r, size);
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
      phiP[0] = (actStep[0] + vals[0] - 127); //% STPS360;
      thetaP[0] = (actStep[1] + vals[1] - 127); //% STPS360;
      pathSize = 1;
      navigationF = true;
      steppersTime = millis();
      laserTime = millis();
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
  //Serial.print("ph: ");Serial.println(s);    
}

void stepperMob (uint16_t s) {
  //Serial.print("Mob: ");
  for (short int j = 0; j < 4; j++) {
    //Serial.print(fullStep[s % FSCYCLE][j]);
    digitalWrite(stpr2[j], fullStep[s % FSCYCLE][j]);
  }
  //Serial.println();
  actStep[1] = s;      
  //Serial.print("th: ");Serial.println(s);
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
      ph = phA + round(i*fph);
      th = thA + round(i*fth);            
      stepperFix(ph);
      stepperMob(th);      
      delayMicroseconds(delayP[j]*DELAY_FACTOR);
    }
    laser(laserP[j]);      
    phA = ph;
    thA = th;
  }
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
      execPath();
      //steppersOff();
    }    
    navigationF = false;    
  }

  if (execPathF) { //Path execution        
    if (checkPathBoundaries()) do {
      execPath();      
    } while (cyclicPathF);
    steppersOff();
    execPathF = false;    
  }

  if (laserSwitchF) {    
    laserOnState = !laserOnState;              
    laser(laserOnState);    
    laserSwitchF = false;
    laserTime = millis();    
  }
  
  if (setZenithF) {
    actStep[0] = STEP_AT_ZENITH;
    actStep[1] = STEP_AT_ZENITH;
    setZenithF = false;
  }

  if (readActStepsF) {        
    sendActSteps();
    readActStepsF = false;
  }

  if ((millis() - steppersTime) > TIME_STEPPERS_OFF) {
    steppersOff();
    steppersTime = millis();
  }

  if ((millis() - laserTime) > TIME_LASER_OFF) {
    laser(false);
    laserTime = millis();
  }

}
