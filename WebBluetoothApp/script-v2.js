/* globals starnamesJSON, stars6JSON */ //Necessary to glitch recognize the library

//stars6JSON equatorial coordinates are: ra - the Right Ascension (-180° to 180°) coordinate and dec - the Declination (-90º to 90º) coordinate.

import {VecSP, CommSP, PathSP} from './modules/StarPointer.module.js';
import './libs/orb.v2.min.js';


/* --------------------
  Frontend variables */

const $stepSizeR = document.getElementById("stepSizeR");
const $stepSizeT = document.getElementById("stepSizeT");
const $laserStateB = document.getElementById("laserStateB");
const $commStatus = document.getElementById("commStatus");
const $calibLog = document.getElementById("calibLog");
const $calibInfo = document.getElementById("calibInfo");
const $raH = document.getElementById("raInputH");
const $raM = document.getElementById("raInputM");
const $raS = document.getElementById("raInputS");
const $raF = document.getElementById("raInputF");
const $decD = document.getElementById("decInputD");
const $decM = document.getElementById("decInputM");
const $decS = document.getElementById("decInputS");
const $decF = document.getElementById("decInputF");  
const $fixI = document.getElementById("fixInput");
const $mobI = document.getElementById("mobInput");

const laserStateBOFF = "laser is OFF";
const laserStateBON = "laser is ON";
const laserStateBON_color = "#9bf296";
const laserStateBOFF_color = "#f76459";

const phiRepr = {labels: ["Fix", "RA", "RA"],
                units: ["step", "h", ""]};
const thetaRepr = {labels: ["Mob", "Dec", "Dec"],
                units: ["step", "deg", ""]};    

const starnames = JSON.parse(starnamesJSON);
const stars6 = JSON.parse(stars6JSON);
const starnamesLabels = ["name", "bayer", "flam", "c", "hd", "hip"] 

starnames["moon"] = {"name":"Earth\'s Moon"};
starnames["mercury"] = {"name":"Mercury planet"};
starnames["venus"] = {"name":"Venus planet"};
starnames["mars"] = {"name":"Mars planet"};
starnames["jupiter"] = {"name":"Jupiter planet"};
starnames["saturn"] = {"name":"Saturn planet"};
starnames["uranus"] = {"name":"Uranus planet"};
starnames["neptune"] = {"name":"Neptune planet"};

let calibStars;

let starCalibF = [["name", document.getElementById("nameCfilter")],
                  ["c", document.getElementById("consCfilter")],
                  ["hip", document.getElementById("hipCfilter")],
                  ["hd", document.getElementById("hdCfilter")]];
let starNavF = [["name", document.getElementById("nameNfilter")],
                ["c", document.getElementById("consNfilter")],
                ["hip", document.getElementById("hipNfilter")],
                ["hd", document.getElementById("hdNfilter")]];

$stepSizeR.min = 0;
$stepSizeR.max = 7;
$stepSizeR.step = 1;
$stepSizeR.value = $stepSizeR.min;

let stepSize;

let pointerStyles = { 'point': {'name': 'point'},
                      'bpoint': {'name': 'blinking point', 'interval': 2500},
                      'circle': {'name': 'circle', 'interval': 100, 'angle': Math.PI/60}};

/*----------------------- */



/* --------------------
  Global variables */

let BleInstance = new CommSP.Bluetooth($commStatus);
let CalibInstance = new VecSP.Calibration();
let CalibTemp = new VecSP.Calibration();
let CoordNavW = new VecSP.Equatorial(0, 0);

/*----------------------- */

/**
 * A namespace for the general App functions in the client app.
 * @namespace
 */
window.App = {};

/** Set the actual window choosen by the app menu. */
App.setWindow = function (windowId) {
	let windows = document.getElementsByClassName("window");
	for (let w of windows) w.style.display = "none";  
	document.getElementById(windowId).style.display = "grid";  
  if (windowId == "appCommW") $commStatus.scrollTop = $commStatus.scrollHeight;
}

App.changeNav = function (id) {
  let elem = document.getElementById(id);
  if (window.getComputedStyle(elem).getPropertyValue('display') == "grid") elem.style.display = "none";
  else elem.style.display = "grid";
}

/**Return actual time in the format: hours minutes seconds. */
App.time = function () {
  let d = new Date();
  return d.getHours() + 'h' + d.getMinutes() + 'm' + d.getSeconds() + 's: ';
}

App.equatorialFromStars6 = function (starSelected, starsObject) {
  try {
    let stars = starsObject.features;
    let obj = starSelected.text.split(" ");
    let objType = obj[obj.length-1];    
    if (objType == "Moon" || objType == "planet") {
      let objSS;
      if (objType == "Moon") objSS = new Orb.Luna();
      else objSS = new Orb.VSOP(obj[0]);
      let date = new Date();
      let radec = objSS.radec(date);
      console.log(radec.ra + ", " + radec.dec)
      return new VecSP.Equatorial(radec.ra, radec.dec);
    }
    else {
      let hip = parseInt(starSelected.value.match(/\d+/)); //extracts the number part
      for (let i = 0; i < stars.length; i++) {
        if (stars[i].id == hip) {
          let eq = stars[i].geometry.coordinates;
          let ra = (24 + eq[0]*12/180)%24; //convertion from (-180° to 180° units) to (0 to 24hs units)        
          return new VecSP.Equatorial(ra, eq[1]);
        }
      }
    }
  }
  catch (err) {
    alert("Star equatorial coordinates not found. " + err);
    return false;
  }
}

App.filterStarCombo = function (filter, comboId, data, label) {    
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
          if (data[star]["hip"] !== undefined) option.value = data[star]["hip"];
          else option.value = "0";
          x.add(option);
        }
      }
    }
  }
}

App.createPointerStyleOptions = function (pointerStyleCombo, styles) {
  for (let opt in styles) {
    let option = document.createElement("option");
    option.text = styles[opt].name;
    pointerStyleCombo.add(option);
  }
}

/**
 * A namespace for the Controller functions in the client app.
 * @namespace
 */
window.Controller = {};

Controller.sendStepSize = async function (ssId) {
	let m = parseInt($stepSizeT.innerHTML);	    
	await BleInstance.goStepSize(m, ssId);  	
}

Controller.switchLaser = async function () {
	if ($laserStateB.innerHTML == laserStateBOFF) {
	  	if (await BleInstance.goLaser(true)) {
			$laserStateB.innerHTML = laserStateBON;
			$laserStateB.style.backgroundColor = laserStateBON_color;
	  	}
	}
	else {
		if (await BleInstance.goLaser(false)) {
			$laserStateB.innerHTML = laserStateBOFF;
			$laserStateB.style.backgroundColor = laserStateBOFF_color;
		}
	}
}

Controller.updateStepSize = function () {
  stepSize = 2**$stepSizeR.value;
  $stepSizeT.innerHTML = stepSize;
}


/**
 * A namespace for the Calibration Window functions in the client app.
 * @namespace
 */
window.CalibW = {};

CalibW.updateCalib = async function (action) {    	
	let $nsc = document.getElementById("calibStarsCombo");
	let $csc = document.getElementById("calibListCombo");
    if ($nsc.innerText != null) {              
        if (action == "add") {           
          if (await BleInstance.readActSteps()) {
            let opt = $nsc.options[$nsc.selectedIndex];            
            let eq = App.equatorialFromStars6(opt, stars6);            
            if (eq) {
              let t = new Date();
              let s = new VecSP.CalibStar(opt.text, opt.value, t, BleInstance.actStep, eq);
              calibStars.push(s);
            }
          }
        }
        if (action == "remThis") {
            if (calibStars.length > 0) {
                let index = $csc.selectedIndex;
                calibStars.splice(index, 1);
            }
        }
        if (action == "remAll") calibStars = [];

        $csc.innerText = null;   
        for (let i = 0; i < calibStars.length; i++) {
            let option = document.createElement("option");
            option.text = calibStars[i].text;
            $csc.add(option);
        }
        $csc.selectedIndex = Math.max(0, calibStars.length-1);      
    }
}

CalibW.calcCalib = function () {
	if (calibStars.length < 2) alert("You must add at least two calibration stars.");
	else {    
    CalibTemp.calcCalib(calibStars)
    $calibLog.innerHTML += '-------------------------------------\n';
    $calibLog.innerHTML += window.App.time() + 'New calibration performed with stars:\n';
    for (let s of CalibTemp.stars) $calibLog.innerHTML += s.text + '\n';
    let dev = CalibTemp.stats.dev.toFixed(1);
    let devStep = (CalibTemp.stats.dev*calibStars[0].step.maxSteps/360).toFixed(1);
    let min = CalibTemp.stats.min.toFixed(1);
    let minStep = (CalibTemp.stats.min*calibStars[0].step.maxSteps/360).toFixed(1);
    let max = CalibTemp.stats.max.toFixed(1);
    let maxStep = (CalibTemp.stats.max*calibStars[0].step.maxSteps/360).toFixed(1);
    $calibLog.innerHTML += 'Average angle deviation: ' + dev + '° (' + devStep + ' steps).\n';
    $calibLog.innerHTML += 'Minimum angle deviation of ' + min + '° (' + minStep + ' steps).\n';
    $calibLog.innerHTML += 'Maximum angle deviation of ' + max + '° (' + maxStep + ' steps).\n';    
    alert("Calibration with " + String(calibStars.length) + " stars resulted in an average angle deviation of + dev + '° (' + devStep + ' steps). Press ACCEPT button to accept this calibration.");    
	}
}

CalibW.acceptCalib = function () {
  if (CalibTemp.stars.length > 0) {
    CalibInstance = CalibTemp.clone();
    $calibLog.innerHTML += window.App.time() + 'New calibration accepted.\n';
    $calibInfo.innerHTML = window.App.time() + 'Actual calibration stars:\n';
    $calibInfo.innerHTML += '----------------------------------\n';
    for (let s of CalibInstance.stars) $calibInfo.innerHTML += '-> ' + s.text + '\n';
    let dev = CalibInstance.stats.dev.toFixed(1);
    let devStep = (CalibInstance.stats.dev*calibStars[0].step.maxSteps/360).toFixed(1);
    let min = CalibInstance.stats.min.toFixed(1);
    let minStep = (CalibInstance.stats.min*calibStars[0].step.maxSteps/360).toFixed(1);
    let max = CalibInstance.stats.max.toFixed(1);
    let maxStep = (CalibInstance.stats.max*calibStars[0].step.maxSteps/360).toFixed(1);
    $calibInfo.innerHTML += 'Calibration parameters:\n';
    $calibInfo.innerHTML += '-----------------------\n';
    $calibInfo.innerHTML += 'Average angle deviation: ' + dev + '° (' + devStep + ' steps).\n';
    $calibInfo.innerHTML += 'Minimum angle deviation of ' + min + '° (' + minStep + ' steps).\n';
    $calibInfo.innerHTML += 'Maximum angle deviation of ' + max + '° (' + maxStep + ' steps).\n';
    $calibInfo.innerHTML += 'Reference date: ' + CalibInstance.stars[0].date + '\n';    
  }
}


/**
 * A namespace for the Navigation Window functions in the client app.
 * @namespace
 */
window.NavW = {};

NavW.goZenith = async function () {
	await BleInstance.goZenith();
}

NavW.goEquatorial = async function () {
	let laser = 0;	
	if (document.getElementById("laserStateB").innerHTML == laserStateBON) laser = 1;
  CoordNavW.ra = Number($raF.value);
  CoordNavW.dec = Number($decF.value);
	let seg = new PathSP.Segment(CoordNavW, laser, 0);
	let path = new PathSP.Path();
	path.addSegment(seg);
	let commPath = new CommSP.CommPath(path, CalibInstance);	
	await BleInstance.goPath(commPath);	
}

NavW.goSteps = async function () {
	let laser = 0;	
	if (document.getElementById("laserStateB").innerHTML == laserStateBON) laser = 1;
  let Step = new VecSP.Step(Number($fixI.value), Number($mobI.value));
  CoordNavW = CalibInstance.celestialFromLocal(Step);  
	let seg = new PathSP.Segment(CoordNavW, laser, 0);
	let path = new PathSP.Path();
	path.addSegment(seg);
	let commPath = new CommSP.CommPath(path, CalibInstance);	
	await BleInstance.goPath(commPath);	  
}

NavW.readCoords = async function () {
  if (await BleInstance.readActSteps()) {				
	  setTimeout(function() {	  	
	  	CoordNavW = CalibInstance.celestialFromLocal(BleInstance.actStep);
      $decF.value = CoordNavW.dec.toFixed(4);
      $raF.value = CoordNavW.ra.toFixed(4);
      $fixI.value = BleInstance.actStep.fix;
      $mobI.value = BleInstance.actStep.mob;
	  	//NavW.updateCoordSys('check');
	  }, 500);
  }
}

NavW.loadCoords = function () {
  let $nsc = document.getElementById("navStarsCombo");
  let opt = $nsc.options[$nsc.selectedIndex];              
  CoordNavW = App.equatorialFromStars6(opt, stars6);
  NavW.updateCoordSys('check');
}

NavW.updateCoordSys = function ($elem) {     
  if ($elem.value != '') {   
    let value = Number($elem.value);   
    if ($elem.id == 'raInputH') {    
      if (value > 23) value = 23;
      if (value < 0) value = 0;
      $elem.value = Math.round(value);
    }
    if ($elem.id == 'decInputD') {    
      if (value > 89) value = 89;
      if (value < -89) value = -89;
      $elem.value = Math.round(value);    
    }
    if ($elem.id.includes('M') || $elem.id.includes('S')) {
      if (value > 59) value = 59;
      if (value < 0) value = 0;
      $elem.value = Math.round(value);    
    }
    if ($elem.id == 'raInputF') {
      if (value > 23.997) value = 23.997;
      if (value < 0) value = 0;
      let h = Math.trunc(value);
      let m = Math.trunc(60*(value - h));
      let s = Math.trunc(60*(60*(value - h) - m));
      $raH.value = h;
      $raM.value = m;
      $raS.value = s;
    }
    if ($elem.id == 'decInputF') {
      if (value > 89.997) value = 89.997;
      if (value < -89.997) value = -89.997;
      let d = Math.trunc(value);
      let x = Math.abs(value) - Math.abs(d);
      let m = Math.trunc(60*x);
      let s = Math.trunc(60*(60*x - m));
      $decD.value = d;
      $decM.value = m;
      $decS.value = s;
    }
    if ($elem.id == 'fixInput' || $elem.id == 'mobInput') {
      if (value > 1023) value = 1023;
      if (value < 0) value = 0;
      $elem.value = Math.trunc(value);
    }
  }
  if ($elem.id.includes('ra') && !$elem.id.includes('F')) {
    let res = Number($raH.value) + Number($raM.value)/60 + Number($raS.value)/3600;
    $raF.value = res.toFixed(4);
  }
  if ($elem.id.includes('dec') && !$elem.id.includes('F')) {    
    let s = ((Number($decD.value) < 0) ? -1 : 1);
    let res = Number($decD.value) + s*Number($decM.value)/60 + s*Number($decS.value)/3600;
    $decF.value = res.toFixed(4);
  }
}


/**
 * A namespace for the Communication Window functions in the client app.
 * @namespace
 */
window.CommW = {};

CommW.startComm = function () {
	let c = BleInstance.startComm();
  /*if (c) {
    setTimeout(function(){
      BleInstance.readActSteps();			
      NavW.updateCoordSys();	  
    }, 200);
  }*/
}


/**
 * A namespace for the Tour Window functions in the client app.
 * @namespace
 */
window.TourW = {};

TourW.goCircle = async function () {
  let path = PathSP.makeCircle(CoordNavW, Math.PI/40, Math.PI/10, [1,0], 50);
  let commPath = new CommSP.CommPath(path, CalibInstance);
  await BleInstance.goPath(commPath, true);
}



//Set stars navigation filter events binder:
for (let l of starNavF)
    for (let evt of ["keyup", "click"])      
      l[1].addEventListener(evt, function(){App.filterStarCombo(l[1].value, "navStarsCombo", starnames, l[0])});
//Set stars calibration filter events binder:
for (let l of starCalibF)
    for (let evt of ["keyup", "click"])      
      l[1].addEventListener(evt, function(){App.filterStarCombo(l[1].value, "calibStarsCombo", starnames, l[0])});



//Set initial window:
App.setWindow("appCommW");

//Set initial step size:
Controller.updateStepSize();

//Set initial laser status
$laserStateB.innerHTML = laserStateBOFF;
$laserStateB.style.backgroundColor = laserStateBOFF_color;

//Set initial coordinate system:
//document.getElementsByName("coordSysN")[0].checked = "true";
//NavW.updateCoordSys('check');

//Set pointer style options for the star and solar sytem tab in the navigation menu:
App.createPointerStyleOptions(document.getElementById("ssPointerStyle"), pointerStyles);

//Initialize calib stars list:
calibStars = [];

//let x = new VecSP.Step(20,30);
//$commStatus.innerHTML = x.fix;