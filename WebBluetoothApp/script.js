/* globals THREE */ //Necessary to glitch recognize the library

/* --------------------
   Backend variables */

   const stps360 = 2048;    //steppers number of steps for a 360º rotation
   const maxChunk = 512;    //1 byte array maximum size to be sent to the bluetooth server
   const chunkTimeout = 2000  //Timeout delay between path chunk delivers in ms
   const pathBase = [1, 9, 11, 11]; //number of bits of the base used to represent the path segments, respectively for: laser state, step delay, phi step, theta step
   const commBase = [8, 8, 8, 8];   //number of bits of the base used to communicate the path segments
   const resetPathOpt = 1;       //option to start a new path reading
   const execPathOpt = 2;        //option to execute the path
   const cyclicPathOpt = 3;      //option to execute the path cyclicaly
   const laserOnOpt = 4;         //option to turn the laser on in the navigation mode
   const laserOffOpt = 5;        //option to turn the laser off in the navigation mode
   const setZenithOpt = 6;        //option to point the laser toward zenith
   
   const mainS_UUID =          "e80fd323-0ae1-454f-bbd5-31b571083af5";  //The single service for all device's characteristics
   const pathC_UUID =          "20e75b2b-6be1-4b18-b1d0-a06018dbdab5";  //characteristic for the path array
   const posMeasureC_UUID =    "e16843eb-fe97-42b4-acc7-83069473c1b5";  //characteristic for measuring the steppers position
   // UUIDs generated at: https://www.uuidgenerator.net/
   
   let mainS;
   let pathC, posMeasureC;
   let pathSize = 0;
   
   let phiP = [];
   let thetaP = [];
   let laserP = [];
   let delayP = [];
   let path = [];
   
   let deviceOptions = {
     filters: [{ name: "StarProjector" }],
     optionalServices: [
       mainS_UUID, 
       pathC_UUID,    
       posMeasureC_UUID]};
   
   /*----------------------- */
   
   
   /* --------------------
      Frontend variables */
   
   let stepSize;
   let $stepSizeR = document.getElementById("stepSizeR");
   let $stepSizeT = document.getElementById("stepSizeT");
   let $commStatus = document.getElementById("commStatus");
   let $laserStateB = document.getElementById("laserStateB");
   let $phiT = document.getElementById("phiT");
   let $thetaT = document.getElementById("thetaT");
   
   let laserStateBOFF = "turn laser ON";
   let laserStateBON = "turn laser OFF";
   let laserStateBON_color = "#f76459";
   let laserStateBOFF_color = "#9bf296";
   
   $stepSizeR.min = 0;
   $stepSizeR.max = 7;
   $stepSizeR.step = 1;
   $stepSizeR.value = $stepSizeR.min;
   
   /*----------------------- */
   
   
   
   function angleStep(angle) {
     return Math.round(angle*stps360*0.5/Math.PI + stps360*0.5);
   }
   
   function circlePath (center, border, angleIncrement, lpattern, delay) {
     /*  center = [phi, theta] coordinates array of circle center
         border = opt 1: [ang], circle angle aperture; opt 2: [phi, theta] coordinates array of a point at the circle border
         angleIncrement = angle step for the circle discretization in rad
         lpattern = [laser on # steps, laser off # steps]
         delay = time delay between steppers sucessive steps in multiples of 100 us
     */  
     let v0 = new THREE.Vector3();  
     let c = new THREE.Vector3();  
     c.setFromSphericalCoords(1.0, center[0], center[1])
     if (border.length == 2)
       v0.setFromSphericalCoords(1.0, border[0], border[1]);
     else
       v0.setFromSphericalCoords(1.0, center[0], center[1] + border[0]);
     let N = Math.round(2*Math.PI/angleIncrement);
     let s = new THREE.Spherical();
     let r = lpattern[0] + lpattern[1];
     for (let i = 0; i < N; i++) {
       let v = v0.clone();
       v.applyAxisAngle(c, i*angleIncrement);
       s.setFromVector3(v);
       phiP.push(angleStep(s.phi));
       thetaP.push(angleStep(s.theta));
       if ((i%r) < lpattern[0])
         laserP.push(1);
       else
         laserP.push(0);
       delayP.push(delay);
     }
   }
   
   function encode(data, encBase) {
     //data = [laser, delay, theta, phi]
     let x = 0;
     let b = 0;
     for (let i = 0; i < encBase.length; i++) {
       x += data[i]*2**b;
       b += encBase[i];
     }
     return x;
   }
   
   function decode(x, decBase) {
     //x decodification in the "decBase" array
     let b0 = 0;
     let r0 = x;
     let r = [];
     for (let i = 0; i < decBase.length; i++) {
       r.push( Math.trunc(r0 / 2**b0) % 2**decBase[i] );
       b0 += decBase[i];
       r0 -= r[i];
     }
     return r;
   }
   
   function composePath() {
     for (let i = 0; i < laserP.length; i++) {
       let x = encode([laserP[i], delayP[i], phiP[i], thetaP[i]], pathBase);
       path = path.concat(decode(x, commBase));
     }
   }
   
   async function startComm() {
     try {
       //log('Requesting StarPointer Device...');
       const device = await navigator.bluetooth.requestDevice(deviceOptions);
   
       //log('Connecting to GATT Server...');
       const server = await device.gatt.connect();
   
       //log('Getting GAP Services...');
       mainS = await server.getPrimaryService(mainS_UUID);
   
       //log('Getting GAP Characteristics...');
       pathC = await mainS.getCharacteristic(pathC_UUID);
       posMeasureC = await mainS.getCharacteristic(posMeasureC_UUID);
       //posMeasureC.addEventListener('characteristicvaluechanged', handlePosMeasureC);
       //posMeasureC.startNotifications();    
       $commStatus.innerHTML = "connected to StarProjector on ESP32";    
     } catch(error) {
       $commStatus.innerHTML = error;
     }
   }    
   
   async function sendPath() {  
     let j = 0;
     let pathChunk;
     for (let i = 0; i < path.length; i++) {
       j = i % maxChunk;
       if (j == 0) {      
         if (path.length - i >= maxChunk) pathChunk = new Uint8Array(maxChunk);
         else pathChunk = new Uint8Array(path.length - i);
       }
       pathChunk[j] = path[i];
       if ((j == maxChunk - 1) || (i == path.length -1)) {
         await pathC.writeValue(pathChunk);
         //setTimeout(function(){ pathC.writeValue(pathChunk); }, chunkTimeout);      
         /*for (let k = 0; k < pathChunk.length/commBase.length; k++) {
           let w = commBase.length*k;
           let s = pathChunk.slice(w, w+commBase.length);
           console.log(decode(encode(s, commBase), pathBase));
         }*/
       }
     }  
   }
   
   async function sendStepSize(ssId) {
     let m = parseInt($stepSizeT.innerHTML);
     let ph = Math.max((parseInt(ssId[1])-1)*m + 127, 0);
     let th = Math.max((parseInt(ssId[2])-1)*m + 127, 0);
     await pathC.writeValue(new Uint8Array([ph, th]));
     try {
       let value = await posMeasureC.readValue();
       let phv = value.getUint8(0)*256 + value.getUint8(1);
       let thv = value.getUint8(2)*256 + value.getUint8(3);
       $phiT.value = phv;
       $thetaT.value = thv;
     }
     catch(err) {
       $phiT.innerHTML = err;
     }
   }
   
   async function setZenith() {
     await pathC.writeValue(new Uint8Array([setZenithOpt]));
   }
   
   async function switchLaser() {
     
     if ($laserStateB.innerHTML == laserStateBOFF) {
       await pathC.writeValue(new Uint8Array([laserOnOpt]));
       $laserStateB.innerHTML = laserStateBON;
       $laserStateB.style.backgroundColor = laserStateBON_color;
     } else {
       await pathC.writeValue(new Uint8Array([laserOffOpt]));
       $laserStateB.innerHTML = laserStateBOFF;
       $laserStateB.style.backgroundColor = laserStateBOFF_color;
     }
   }
   
   function resetPath() {
     phiP = [];
     thetaP = [];
     laserP = [];
     delayP = [];
     path = [];
   }
   
   async function sendCircle() {  
     //let c = [Math.PI/6, Math.PI/6];
     let c = [Math.PI/10, Math.PI/10];
     let b = [Math.PI/18];
     let ainc = Math.PI/10;
     let lp = [5, 2];
     let delay = 50;
   
     resetPath();
     circlePath(c, b, ainc, lp, delay);
     composePath();
     
     await pathC.writeValue(new Uint8Array([resetPathOpt]));
     await sendPath();
     await pathC.writeValue(new Uint8Array([cyclicPathOpt]));
   }  
   
   function handlePosMeasureC(event) {
     try {    
       let ph = event.target.value.getUint8(0)*256 + event.target.value.getUint8(1);
       let th = event.target.value.getUint8(2)*256 + event.target.value.getUint8(3);
       $phiT.value = 40;
       $thetaT.value = th;
     }
     catch(err) {
       $commStatus.innerHTML = err;
     }
   }
   
   
   function updateStepSize() {
     stepSize = 2**$stepSizeR.value;
     $stepSizeT.innerHTML = stepSize;
   }
   
   
   function setWindow(windowId) {
     let windows = document.getElementsByClassName("window");
     for (let w of windows) w.style.display = "none";  
     document.getElementById(windowId).style.display = "grid";  
   }
   
   
   setWindow("appCommW");
   updateStepSize();
   $laserStateB.innerHTML = laserStateBOFF;
   $laserStateB.style.backgroundColor = laserStateBOFF_color;