/* globals THREE */ //Necessary to glitch recognize the library
/* globals lalolib */

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

let actStep = new VecSP.Step([stps360/2, stps360/2]); //actual step values for the fixed (phi) and mobile (theta) stepper, respectively

let deviceOptions = {
 filters: [{ name: "StarProjector" }],
 optionalServices: [
   mainS_UUID, 
   pathC_UUID,    
   posMeasureC_UUID]};

/*----------------------- */


/* --------------------
  Frontend variables */

const $stepSizeR = document.getElementById("stepSizeR");
const $stepSizeT = document.getElementById("stepSizeT");
const $commStatus = document.getElementById("commStatus");
const $laserStateB = document.getElementById("laserStateB");

const laserStateBOFF = "turn laser ON";
const laserStateBON = "turn laser OFF";
const laserStateBON_color = "#f76459";
const laserStateBOFF_color = "#9bf296";

const phiRepr = {labels: ["Fix", "Phi", "RA"],
                units: ["step", "deg", "h:m:s"]};
const thetaRepr = {labels: ["Mob", "Theta", "Dec"],
                units: ["step", "deg", "º:':\""]};    

const starnames = JSON.parse(starnamesJSON);
const stars6 = JSON.parse(stars6JSON);
const starnamesLabels = ["name", "bayer", "flam", "c", "hd", "hip"]           

const calibStarsInit = {text: [], value: [], date: [], step: [], eq180: []};
let calibStars = calibStarsInit;

$stepSizeR.min = 0;
$stepSizeR.max = 7;
$stepSizeR.step = 1;
$stepSizeR.value = $stepSizeR.min;

let stepSize;

/*----------------------- */



/* --------------------
  Math constants */

const radToDeg = 180 / Math.PI;
const degToRad = Math.PI / 180;
const hourToRad = Math.PI / 12;

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

async function goToActStep() {
    await pathC.writeValue(new Uint8Array(actStep.value));
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

function updateCoordSys() {
    let val = document.querySelector('input[name="coordSysN"]:checked').value;
    let i;
    let ph, th;
    switch (val) {
        case "steps":
            i = 0;
            ph = actStep.fix;
            th = actStep.mob;
            break;
        case "spherical":
            i = 1;            
            let st = new VecSP.Representation(actStep);
            let sp = st.toSpherical();
            ph = sp.phi*radToDeg;
            th = sp.theta*radToDeg;
            break;
        case "equatorial":
            i = 2;
    }
    document.getElementById("phiLabel").innerHTML = phiRepr.labels[i];
    document.getElementById("phiI").value = ph;
    document.getElementById("phiUnit").innerHTML = phiRepr.units[i];
    document.getElementById("thetaLabel").innerHTML = thetaRepr.labels[i];
    document.getElementById("thetaI").value = th;
    document.getElementById("thetaUnit").innerHTML = thetaRepr.units[i];
}

function setWindow(windowId) {
    let windows = document.getElementsByClassName("window");
    for (let w of windows) w.style.display = "none";  
    document.getElementById(windowId).style.display = "grid";  
}

class Calibration {
    constructor(stars = null) {
        this._stars = stars;
        this.C = lalolib.eye(3);    //unknown transformation matrix
        this.A = null;              //local rectangular coordinates matrix
        this.B = null;              //equatorial rectangular coordinates matrix
    }
    set stars(x) {
        this._stars = x;
    }
    systemMount () {        
        let sa = this.stars.eq180;
        let sb = this.stars.step;        
        if (sa.len > 1) {
            let A = [], B = [];            
            let Ai = new VecSP.Representation();
            let Bi = new VecSP.Representation();
            for (let i = 0; i < sa.len; i++) {                
                Ai.set(new VecSP.Eq180(sa[i]));
                A.push(Ai.rectangular);
                Bi.set(new VecSP.Step(sb[i]));
                B.push(Bi.rectangular);
            }
            if (sp.len == 2) {
                let A0 = new VecSP.Representation(A[0]);
                let A1 = new VecSP.Representation(A[1]);                
                let ca3 = THREE.cross(A0.toTHREEVector(), A1.toTHREEVector());
                let B0 = new VecSP.Representation(B[0]);
                let B1 = new VecSP.Representation(B[1]);                
                let cb3 = THREE.cross(B0.toTHREEVector(), B1.toTHREEVector());
                A.push(ca3.toArray());
                B.push(cb3.toArray());
            }
            this.A = A;
            this.B = B;
            return true;
        } else return false;
    }
    systemSolve () {
        if (this.A != null) {
            let A = lalolib.array2mat(A.this);            
            let b, x, i;
            for (let j = 0; j < 3; j++) {
                b = [];
                for (i = 0; i < this.A.length; i++) b.push(this.B[i][j]);
                b = lalolib.array2vec(b);
                x = lalolib.solve(A,b);
                for (let i = 0; i < 3; i++) this.C.val[i*this.C.n + j] = x[i];
            }
            return true;
        } else return false;
    }
}

function filterCombo (filter, comboId, data, label) {    
    if (filter.length > 2) {        
        let x = document.getElementById(comboId);        
        x.innerText = null;
        let star, l, text;        
        for (star in data) {
            if (data[star][label] !== undefined) {
                if (data[star][label].match(RegExp(filter, 'gi'))) {
                    let option = document.createElement("option");
                    text = "";
                    for (l of starnamesLabels) if (data[star][l] !== undefined) text += data[star][l] + " ";
                    option.text = text;
                    option.value = data[star]["hip"];
                    x.add(option);
                }
            }
        }
    }
}

function findEquatorial (starSelected, data) {
    try {
        let stars = data.features;
        let hip = parseInt(starSelected.value.match(/\d+/)); //extracts the number part
        for (let i = 0; i < stars.length; i++) {
            if (stars[i].id == hip) return stars[i].geometry.coordinates;
        }
    }
    catch (err) {
        alert("Star equatorial coordinates not found. " + err);
        return false;
    }
}

function updateCalib(action){
    let $nsc = document.getElementById("navStarsCombo");
    let $csc = document.getElementById("calibStarsCombo");
    if ($nsc.innerText != null) {        
        if (action == "add") {
            let opt = $nsc.options[$nsc.selectedIndex];            
            let eq = findEquatorial(opt, stars6);
            if (eq) {
                let t0 = Date.now();                
                calibStars.text.push(opt.text);
                calibStars.value.push(opt.value);
                calibStars.date.push(t0);
                calibStars.step.push(actStep.value);
                calibStars.eq180.push(eq);
            }
        }
        if (action == "remThis") {
            if (calibStars.text != []) {
                let index = $csc.selectedIndex;
                for (let v of calibStars) v.splice(index, 1);
            }
        }
        if (action == "remAll") calibStars = calibStarsInit;

        $csc.innerText = null;        
        for (let i = 0; i < calibStars.text.length; i++) {
            let option = document.createElement("option");
            option.text = calibStars.text[i];
            $csc.add(option);
        }
        $csc.selectedIndex = Math.max(0, calibStars.text.length-1);
    }
}

//Stars filter events binder:
let starF = [["name", document.getElementById("namefilter")],
             ["c", document.getElementById("consfilter")],
             ["hip", document.getElementById("hipfilter")],
             ["hd", document.getElementById("hdfilter")]];
for (let l of starF)
    for (let evt of ["keyup", "click"])
        l[1].addEventListener(evt, function(){filterCombo(l[1].value, "navStarsCombo", starnames, l[0])});


setWindow("appCommW");
updateStepSize();
$laserStateB.innerHTML = laserStateBOFF;
$laserStateB.style.backgroundColor = laserStateBOFF_color;

document.getElementsByName("coordSysN")[0].checked = "true";
updateCoordSys();


$commStatus.innerHTML = starnames["122"].hip;