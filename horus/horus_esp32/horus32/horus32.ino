/*
Copyright 2021 João T. Carvalho-Neto, Fernando A. Pedersen and Matheus N. S. Silva

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/*
    horus32.ino ESP-WROOM-32 interface for the Stellector Project
    João Teles, jocoteles@gmail.com
    october/2021

    Some conventions:
    ------------------------------------------
    stepper: alias for step motor
    variables ended by capital letter 'C': it's a characteristic UUID
    step: is a stepper step value. It can vary only by -1, 0, or +1.
    segment: is a stepper step range, which is linearly followed by the stepper.
    path: the full array(s) of segments of a given steppers path execution.

    GY-521 MPU6050 and GY-511 lsm303dlhc sensors SCL, SDA connected, respectively, to the defaults GPIO 22, 21.
*/

#include <Adafruit_MPU6050.h>
#include <Adafruit_LSM303_Accel.h>
#include <Adafruit_LSM303DLH_Mag.h>
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
#define STEP_AT_ZENITH 1019     //steppers step values corresponding to the Zenith direction

#define LEVEL_ACC_CHANGE 2.5    //maximum angle tolerance of the base accelerometer change [degrees]
#define LEVEL_MAG_CHANGE 2.5    //maximum angle tolerance of the base magnetometer change [degrees]
#define LEVEL_ANG_MISS 3.0      //maximum angle tolerance of the base normal to zenith [degrees]
#define ZENITH_ANG_MIN 0.25     //minimum angle deviation for zenith setting [degrees]
#define MAX_ZENITH_ITER 1019    //maximum steps iterations for zenith setting [steps]
#define HORIZON_MIN_ANG 3.0     //laser minimum angle from horizon for safety operation [degrees]
#define SAFETY_HEIGTH 165.0     //safety height from ground [cm]

#define STPR1_GPIOS {14, 27, 26, 25}  //stepper 1 (fixed) GPIO pins
#define STPR2_GPIOS {15,  2,  4, 16}  //stepper 2 (mobile) GPIO pins
#define LASER_GPIO 13                 //laser GPIO pin
#define ULTRA_TRIG_GPIO 32            //ultrassonic hc-sr04 sensor trigger pin
#define ULTRA_ECHO_GPIO 33            //ultrassonic hc-sr04 sensor echo pin
#define UNSAFE_MODE_GPIO 36           //unsafe state input pin. When in high state makes possible to operate in unsafe mode

#define RESET_PATH_OPT 1       //option to start a new path reading
#define EXEC_PATH_OPT 2        //option to execute the path
#define CYCLIC_PATH_OPT  3     //option to execute the path cyclicaly
#define REVERSE_PATH_OPT  4    //option to execute the path cyclicaly in reverse order alternately
#define LASER_SWITCH_OPT 5     //option to switch the laser
#define SET_ZENITH_OPT 6       //option to make actSteps equal to STEP_AT_ZENITH
#define READ_ACT_STEPS_OPT 7   //option to read the steppers actual steps

#define TIME_STEPPERS_OFF 15000       //time delay to turn off steppers when idle in miliseconds.
#define TIME_LASER_OFF 60000          //time delay to turn off laser when idle in miliseconds.
//#define TIME_OUT 20000                //maximum waiting time to the system get idle in order to be ready for a new command execution

//Ultrassonic setup:
//------------------
//HCSR04 hcsr04(ULTRA_TRIG_GPIO, ULTRA_ECHO_GPIO, 20, 4000);
//UltraSonicDistanceSensor distanceSensor(ULTRA_TRIG_GPIO, ULTRA_ECHO_GPIO);

//Laser accelerometer and thermometer:
//------------------------------------
Adafruit_MPU6050 gy521;
Adafruit_Sensor *gy521Temp, *gy521Accel;

//Base accelerometer and magnetometer for level measurement:
//----------------------------------------------------------
/* Assign a unique ID to this sensor at the same time */
Adafruit_LSM303_Accel_Unified gy511accel = Adafruit_LSM303_Accel_Unified(12345);
Adafruit_LSM303DLH_Mag_Unified gy511mag = Adafruit_LSM303DLH_Mag_Unified(56789);

//BLE variables:
//--------------
#define DEVICE_NAME          "Horus"
#define MAIN_S_UUID          "643790f9-355d-435b-b407-43ebf47a86b4"  //The single service for all device's characteristics
#define PATH_C_UUID          "f467e4e9-e2bc-422f-b8a3-aaaf6f92b999"  //characteristic for the path array
#define COMMAND_C_UUID       "f7b0afdf-b51e-4ba7-9513-48fb15497f22"  //characteristic for command execution on server
#define STEPPERS_C_UUID      "6f23d28a-a3cb-4c5f-9d08-63fda0806966"  //characteristic for measuring the steppers position
#define STATUS_C_UUID        "4af8de6b-1f13-4dfb-b08e-0a4a97a983d5"  //characteristic for indicating the hardware status
// UUIDs generated at: https://www.uuidgenerator.net/ (for changes, all uuids must be generated at the same generator run)

#define mainSnumHandles  10 // = 2*(n+1), where n is the maximum number of characteristics for the mainS service (default n = 7)

BLEServer *server;
BLEService *mainS;
BLECharacteristic *pathC, *steppersC, *statusC, *commandC;
BLEAdvertising *advertising = BLEDevice::getAdvertising();

//Steppers variables:
//-------------------
const int fullStep[FSCYCLE][4] = {{1, 0, 0, 1},   //Phases of each stepper step
                                  {1, 1, 0, 0},
                                  {0, 1, 1, 0},
                                  {0, 0, 1, 1}};

const int stpr1[4] = STPR1_GPIOS;   //fixed stepper GPIO pins (phi)
const int stpr2[4] = STPR2_GPIOS;   //mobile stepper GPIO pins  (theta)

uint16_t actStep[2] = {STPS360/2, STPS360/2};   //actual step values for the fixed (phi) and mobile (theta) stepper, respectively

//Safety operation variables:
//---------------------------
float accBase[3] = {0.0, 0.0, 0.0};   //gravity acceleration vector in the gy511 base sensor
float magBase[3] = {0.0, 0.0, 0.0};   //magnetic vector in the gy511 base sensor


//Status variables:
//-----------------
bool laserOnStatus = false;
bool systemIdleStatus = false;
bool unsafeModeStatus = false;
bool safeHeightStatus = false;
bool leveledStatus = false;
bool tiltedStatus = false;

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
bool reversePathF = false;
bool reverseStateF = false;
bool execPathF = false;
bool navigationF = false;
bool laserSwitchF = false;
bool setZenithF = false;
bool zenithUnsetF = true;

unsigned long steppersTime = 0;
unsigned long laserTime = 0;


void checkHeight () {  
  long duration;
  int distance;  
  sensors_event_t s;  
  gy521Temp->getEvent(&s);    
  delay(5);  
  
  digitalWrite(ULTRA_TRIG_GPIO, LOW);
  delayMicroseconds(2);  
  digitalWrite(ULTRA_TRIG_GPIO, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRA_TRIG_GPIO, LOW);  
  duration = pulseIn(ULTRA_ECHO_GPIO, HIGH);  
  
  distance = duration*(20.05*sqrt(273.15 + s.temperature)/20000); // distance with speed of sound temperature corrected
  //Serial.print("Distance: ");Serial.println(distance);  
  if (distance < SAFETY_HEIGTH) safeHeightStatus = false;
  else safeHeightStatus = true;
}

void checkLevel () {
  sensors_event_t accEvent, magEvent;
  double ax, ay, az, mx, my, mz, cosAcc, cosMag, cosZenith, aNorm, mNorm;
  
  gy511accel.getEvent(&accEvent);
  delay(5);
  gy511mag.getEvent(&magEvent);
  delay(5);
  ax = accEvent.acceleration.x;
  ay = accEvent.acceleration.y;
  az = accEvent.acceleration.z;
  mx = magEvent.magnetic.x;
  my = magEvent.magnetic.y;
  mz = magEvent.magnetic.z;  

  aNorm = sqrt(ax*ax+ay*ay+az*az);
  cosAcc = (ax*accBase[0]+ay*accBase[1]+az*accBase[2])/aNorm;
  mNorm = sqrt(mx*mx+my*my+mz*mz);
  cosMag = (mx*magBase[0]+my*magBase[1]+mz*magBase[2])/mNorm;
  cosZenith = abs(az)/aNorm;  
  
  leveledStatus = true;
  tiltedStatus = false;  
  if ((acos(cosAcc) > (LEVEL_ACC_CHANGE*PI/180)) || (acos(cosMag) > (LEVEL_MAG_CHANGE*PI/180))) tiltedStatus = true;    
  if ((cosZenith < cos(LEVEL_ANG_MISS*PI/180))) leveledStatus = false;        

  accBase[0] = ax/aNorm;
  accBase[1] = ay/aNorm;
  accBase[2] = az/aNorm;
  magBase[0] = mx/mNorm;
  magBase[1] = my/mNorm;
  magBase[2] = mz/mNorm;
}

bool isAboveHorizon (uint16_t fix, uint16_t mob) {
  float x, y, z, ph, th;
  ph = (fix-STPS360/4.0)*2*PI/STPS360;
  th = (mob-STPS360/4.0)*2*PI/STPS360;
  x = cos(ph)*sin(th);
  y = sin(ph)*sin(th);
  z = cos(th);
  if ((y/sqrt(x*x+z*z)) > tan(HORIZON_MIN_ANG*PI/180)) return true;
  else return false;
}

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
    uint16_t i, k;
    uint8_t j;
    unsigned long t0 = millis();
    //while (!systemIdleStatus || ((millis()-t0) < TIME_OUT)) delayMicroseconds(100);                      
    if (vals.length() >= COMMBASE_SIZE) { //Read path
      uint16_t r0[PATHBASE_SIZE];
      uint16_t dmin = DELAY_MIN;                
      for (i = 0, k = 0; i < (vals.length() / COMMBASE_SIZE); i++)
      {
        for (j = 0; j < COMMBASE_SIZE; j++) valsComm[j] = vals[COMMBASE_SIZE*i + j];
        readChunk(valsComm, r0);
        if (unsafeModeStatus || isAboveHorizon(r0[2], r0[3])) {
          laserP[pathSize+k] = r0[0];
          delayP[pathSize+k] = max(r0[1], dmin);
          phiP[pathSize+k] = r0[2];
          thetaP[pathSize+k] = r0[3];
          k++;
        }
      }
      pathSize += k;      
      delayP[0] = DELAY_MIN; //Verificar o efeito desta linha
    }
              
  }
};

class ReadCommandCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string vals = pCharacteristic->getValue();    
    uint16_t i, k, option, ph0, th0;
    uint8_t j;          
    checkLevel();    
    checkHeight();    
    unsafeModeStatus = digitalRead(UNSAFE_MODE_GPIO);        
    if ((leveledStatus && safeHeightStatus) || unsafeModeStatus) {      
      if (zenithUnsetF) {
        setZenith();
        zenithUnsetF = false;
      }
      if (vals.length() == 1) {
        option = vals[0];      
        execPathF = false;
        cyclicPathF = false;
        reversePathF = false;
        reverseStateF = false;      
        switch (option) {
          case RESET_PATH_OPT:
            //delay(200);
            pathSize = 0;              
            break;
          case EXEC_PATH_OPT:
            execPathF = true;              
            break;
          case CYCLIC_PATH_OPT:
            execPathF = true;
            cyclicPathF = true;              
            break;
          case REVERSE_PATH_OPT:
            execPathF = true;
            reversePathF = true;                        
            break;                
          case LASER_SWITCH_OPT:        
            laserSwitchF = true;              
            break;            
          case SET_ZENITH_OPT:
            setZenithF = true;              
            break;
        }
      }
      if (vals.length() == 2) { //Execute free navigation              
        ph0 = (actStep[0] + vals[0] - 127); //% STPS360;
        th0 = (actStep[1] + vals[1] - 127); //% STPS360;
        if (isAboveHorizon(ph0, th0) || unsafeModeStatus) {
          laserP[0] = laserOnStatus;
          delayP[0] = DELAY_MIN;
          phiP[0] = ph0;
          thetaP[0] = th0;
          pathSize = 1;
          navigationF = true;
          steppersTime = millis();
          laserTime = millis();
        }      
      }
    }
  }
};

class WriteStatusCallback: public BLECharacteristicCallbacks {
  void onRead(BLECharacteristic *pCharacteristic) {    
    checkLevel();    
    checkHeight();    
    unsafeModeStatus = digitalRead(UNSAFE_MODE_GPIO);
    uint8_t s0 = systemIdleStatus;
    uint8_t s1 = laserOnStatus;
    uint8_t s2 = unsafeModeStatus;
    uint8_t s3 = safeHeightStatus;
    uint8_t s4 = leveledStatus;
    uint8_t s5 = tiltedStatus;  
    uint8_t status[6] = {s0, s1, s2, s3, s4, s5};  
    size_t size = 6;
    pCharacteristic->setValue(status, size);    
  }
};

class WriteSteppersCallback: public BLECharacteristicCallbacks {
  void onRead(BLECharacteristic *pCharacteristic) {    
    uint16_t r00 = actStep[0] / 256;
    uint16_t r01 = actStep[0] % 256;
    uint16_t r10 = actStep[1] / 256;
    uint16_t r11 = actStep[1] % 256;
    uint8_t r[4] = {r00, r01, r10, r11};  
    size_t size = 4;
    pCharacteristic->setValue(r, size);      
  }
};

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
  laserOnStatus = s;
}

void execPath () {
  uint16_t N, ph, th, phA, thA;
  int dph, dth;
  float fph, fth;
  uint16_t j, k;  

  phA = actStep[0];
  thA = actStep[1];  
  
  for (j = 0; j < pathSize; j++) {        
    if (reverseStateF) k = pathSize - 1 - j;
    else k = j;          
    ph = phiP[k];
    th = thetaP[k];    
    dph = ph - phA;
    dth = th - thA;            
    N = max(max(abs(dph), abs(dth)), 1);
    fph = float(dph)/N;
    fth = float(dth)/N;    
    laser(laserP[k]);
    for (uint16_t i = 1; i <= N; i++) {
      ph = phA + round(i*fph);
      th = thA + round(i*fth);            
      stepperFix(ph);
      stepperMob(th);            
      delayMicroseconds(DELAY_MIN*DELAY_FACTOR);
    }          
    delayMicroseconds(delayP[k]*DELAY_FACTOR);
    phA = ph;
    thA = th;
  }  
}

void setZenith () {
  uint16_t fix, mob, i;
  float ax, ay, az, tanX, tanZ;
  float tol = tan(ZENITH_ANG_MIN*PI/180);  
  sensors_event_t s;
  i = 0;      
  systemIdleStatus = false;
  do {
    gy521Accel->getEvent(&s);
    ax = s.acceleration.x;
    ay = s.acceleration.y;
    az = s.acceleration.z;
    /*Serial.println(ax);
    Serial.println(ay);
    Serial.println(az);
    Serial.println("");*/
    if (az > 0) fix = actStep[0] + 1;
    else fix = actStep[0] - 1;
    if (ax > 0) mob = actStep[1] + 1;
    else mob = actStep[1] - 1;
    stepperFix(fix);
    stepperMob(mob);            
    delayMicroseconds(2*DELAY_MIN*DELAY_FACTOR);
    tanX = abs(ax)/sqrt(ay*ay+az*az);
    tanZ = abs(az)/sqrt(ay*ay+ax*ax);
  } while (((tanX > tol) || (tanZ > tol)) && (i++ < MAX_ZENITH_ITER));
  actStep[0] = STEP_AT_ZENITH;
  actStep[1] = STEP_AT_ZENITH;
  systemIdleStatus = true;
}

void setup() {
  Serial.begin(115200);  

  //GY521 sensor setup:
  gy521.begin();
  gy521.setAccelerometerRange(MPU6050_RANGE_2_G);  
  gy521.setFilterBandwidth(MPU6050_BAND_5_HZ);

  gy521Temp = gy521.getTemperatureSensor();
  gy521Accel = gy521.getAccelerometerSensor();

  //GY511 accelerometer sensor setup:
  gy511accel.begin();
  gy511accel.setRange(LSM303_RANGE_2G);
  gy511accel.setMode(LSM303_MODE_NORMAL);  

  //GY511 magnetometer sensor setup:
  gy511mag.begin();

  //Steppers pin setup:
  for (int i = 0; i < 4; i++) {
    pinMode(stpr1[i], OUTPUT);
    pinMode(stpr2[i], OUTPUT);
  }

  //Laser pin setup:
  pinMode(LASER_GPIO, OUTPUT);
  
  //Unsafe mode pin setup:
  pinMode(UNSAFE_MODE_GPIO, INPUT);

  //HC-SR04 ultrasonic sensor pins:
  pinMode(ULTRA_TRIG_GPIO, OUTPUT);
  pinMode(ULTRA_ECHO_GPIO, INPUT);

    
  Serial.println("Starting BLE work!");

  BLEDevice::init(DEVICE_NAME);
  
  server = BLEDevice::createServer();  
  mainS = server->createService(BLEUUID(MAIN_S_UUID), mainSnumHandles);  // In order to set numHandles parameter, MAIN_S_UUID must be converted by function BLEUUID
  pathC = mainS->createCharacteristic(PATH_C_UUID, BLECharacteristic::PROPERTY_WRITE);
  commandC = mainS->createCharacteristic(COMMAND_C_UUID, BLECharacteristic::PROPERTY_WRITE);
  steppersC = mainS->createCharacteristic(STEPPERS_C_UUID, BLECharacteristic::PROPERTY_READ);
  statusC = mainS->createCharacteristic(STATUS_C_UUID, BLECharacteristic::PROPERTY_READ);  
  
  pathC->setCallbacks(new ReadPathCallback());
  commandC->setCallbacks(new ReadCommandCallback());
  statusC->setCallbacks(new WriteStatusCallback());
  steppersC->setCallbacks(new WriteSteppersCallback());

  mainS->start();
  
  advertising->addServiceUUID(MAIN_S_UUID);
  advertising->setScanResponse(false);
  advertising->setMinPreferred(0x06);  // functions that help with iPhone connections issue
  advertising->setMinPreferred(0x12);  
  BLEDevice::startAdvertising();

  steppersOff();
  laser(false);
  checkLevel();  
  tiltedStatus = false;  
}


void loop() {
  
  systemIdleStatus = true;

  if (navigationF) { //Steppers free navigation movement    
    systemIdleStatus = false;    
    execPath();        
    navigationF = false;        
  }

  if (execPathF) { //Path execution        
    systemIdleStatus = false;
    do {
      execPath();      
      if (reversePathF) reverseStateF = !reverseStateF;
    } while (cyclicPathF || reversePathF);
    steppersOff();
    execPathF = false;
  }

  if (laserSwitchF) {    
    laserOnStatus = !laserOnStatus;              
    laser(laserOnStatus);    
    laserSwitchF = false;    
    laserTime = millis();    
  }
  
  if (setZenithF) {
    //actStep[0] = STEP_AT_ZENITH;
    //actStep[1] = STEP_AT_ZENITH;
    setZenith();
    setZenithF = false;
  }
  
  if ((millis() - steppersTime) > TIME_STEPPERS_OFF) {
    steppersOff();
    steppersTime = millis();
  }

  if ((millis() - laserTime) > TIME_LASER_OFF) {
    laser(false);
    laserTime = millis();
  }

  
  /*float distance = distanceSensor.measureDistanceCm();
  Serial.println(distance);

  sensors_event_t a, g, temp;
  gy521.getEvent(&a, &g, &temp);  
  Serial.print("Acceleration X: ");
  Serial.print(a.acceleration.x);
  Serial.print(", Y: ");
  Serial.print(a.acceleration.y);
  Serial.print(", Z: ");
  Serial.print(a.acceleration.z);
  Serial.println(" m/s^2");
  Serial.print("Temperature: ");
  Serial.print(temp.temperature);
  Serial.println(" degC");
  Serial.println("");
  
  sensors_event_t event;
  gy511accel.getEvent(&event);
  Serial.print("X: ");
  Serial.print(event.acceleration.x);
  Serial.print("  ");
  Serial.print("Y: ");
  Serial.print(event.acceleration.y);
  Serial.print("  ");
  Serial.print("Z: ");
  Serial.print(event.acceleration.z);
  Serial.print("  ");
  Serial.println("m/s^2");
  Serial.println("");

  sensors_event_t event2;
  gy511mag.getEvent(&event2);  
  Serial.print("X: ");
  Serial.print(event2.magnetic.x);
  Serial.print("  ");
  Serial.print("Y: ");
  Serial.print(event2.magnetic.y);
  Serial.print("  ");
  Serial.print("Z: ");
  Serial.print(event2.magnetic.z);
  Serial.print("  ");
  Serial.println("uT");
  Serial.println("");
  
  delay(1000);*/

}
