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

App.equatorialFromStars6 = function (starSelected) {
  try {
    let stars = stars6.features;
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
            let eq = App.equatorialFromStars6(opt);            
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

NavW.setZenith = async function () {
	await BleInstance.goZenith();
}

NavW.goToActStep = async function () {
	let laser = 0;	
	if (document.getElementById("laserStateB").innerHTML == laserStateBON) laser = 1;
	let seg = new PathSP.Segment(CoordNavW, laser, 0);
	let path = new PathSP.Path();
	path.addSegment(seg);
	let commPath = new CommSP.CommPath(path, CalibInstance);	
	await BleInstance.goPath(commPath);	
}

NavW.readActStep = async function () {
  if (await BleInstance.readActSteps()) {				
	  setTimeout(function() {	  	
	  	CoordNavW = CalibInstance.celestialFromLocal(BleInstance.actStep);
	  	NavW.updateCoordSys('check');
	  }, 500);
  }
}

NavW.loadCoords = function () {
  let $nsc = document.getElementById("navStarsCombo");
  let opt = $nsc.options[$nsc.selectedIndex];              
  CoordNavW = App.equatorialFromStars6(opt);
  NavW.updateCoordSys('check');
}

NavW.floatToArc = function (c, unit) {  
  let symb = {ra: ['h ', 'm ', 's'], dec: ['° ', '\' ', '\"']};
  if (c != 0) {
    let c_p = Math.trunc(c);
    let min = (c - c_p)*60;
    let c_m = Math.trunc(min);
    let c_s = Math.round((min - c_m)*60);    
    let r = "";
    let pad;
    if (c_p != 0) {
      r += String(c_p) + symb[unit][0];
      pad = 2;
    } else pad = 0;    
    if (c_m != 0) {
      r += String(c_m).padStart(pad,'0') + symb[unit][1];
      pad = 2;
    } else pad = 0;
    if (c_s != 0) r += String(c_s).padStart(pad,'0') + symb[unit][2];
    return r;
  }  
  else return symb[unit][2];  
}

NavW.arcToFloat = function (a, unit) {
  if (a != "s") {
    let symb = {ra: ['h', 'm', 's'], dec: ['°', '\'', '\"']};
    let aa = a.split(' ');
    let r = 0;
    for (let x of aa) {
      if (x.search(symb[unit][0]) > 0) r += Number(x.replace(symb[unit][0], ''));
      if (x.search(symb[unit][1]) > 0) r += Number(x.replace(symb[unit][1], ''))/60;
      if (x.search(symb[unit][2]) > 0) r += Number(x.replace(symb[unit][2], ''))/3600;
    }
    return r;
  }
  else return 0;
}

NavW.changeCoordSign = function () {  
  let $elem = document.getElementById('thetaS');
  let s = -1*Number($elem.value + '1');
  if (s >= 0) $elem.value = '+';
  else $elem.value = '-';
  CoordNavW.dec *= -1;    
}

NavW.updateCoordSys = function (type) {
  let val = document.querySelector('input[name="coordSysN"]:checked').value;
  let $ph = document.getElementById("phiI").value;  
  let $th = document.getElementById("thetaI").value;      
  let i;
  let ph, th, ths;  
  switch (val) {
    case "steps":            
      i = 0;
      if (type == 'check') {
        document.getElementById("thetaS").disabled = true;
        let s = CalibInstance.localFromCelestial(CoordNavW);
        ph = s.fix;
        th = s.mob;        
      }
      else if (type == 'insert') {         
        ph = $ph;
        th = $th;
        if (isNaN(Number(ph[ph.length-1]))) ph = ph.slice(0,-1);
        if (isNaN(Number(th[th.length-1]))) th = th.slice(0,-1);        
        let step = new VecSP.Step(Number(ph), Number(th));        
        CoordNavW = CalibInstance.celestialFromLocal(step);
      }
      break;
    case "eqFloat":
      i = 1;                        
      if (type == 'check') {        
        document.getElementById("thetaS").disabled = false;
        ph = CoordNavW.ra.toFixed(5);
        th = Math.abs(CoordNavW.dec).toFixed(5);
        ths = Math.sign(CoordNavW.dec);
        if (ths >= 0) document.getElementById("thetaS").value = '+';
        else document.getElementById("thetaS").value = '-';
      }
      else if (type == 'insert') {
        if (document.getElementById("thetaS").value == '+') ths = 1;
        else ths = -1;    
        ph = $ph;
        th = $th; 
        if (isNaN(Number(ph))) ph = ph.slice(0,-1);
        if (isNaN(Number(th))) th = th.slice(0,-1);          
        CoordNavW.ra = Number(ph);
        CoordNavW.dec = ths*Number(th);
      }
      break;
    case "eqArc":          
      i = 2;
      if (type == 'check') {
        document.getElementById("thetaS").disabled = false;
        ph = NavW.floatToArc(CoordNavW.ra, 'ra');
        th = NavW.floatToArc(Math.abs(CoordNavW.dec), 'dec');        
        ths = Math.sign(CoordNavW.dec);
        if (ths >= 0) document.getElementById("thetaS").value = '+';
        else document.getElementById("thetaS").value = '-';        
      }
      else if (type == 'insert') {
        if (document.getElementById("thetaS").value == '+') ths = 1;
        else ths = -1;
        ph = $ph;
        th = $th;
        let rs = ['h ', 'm ', 's'];
        let ds = ['° ', '\' ', '\"'];
        if (ph.search(rs[2]) == -1) ph = ph.slice(0, ph.length-1);        
        let phr = ph.replace(rs[0],'').replace(rs[1],'').replace(rs[2],'');        
        let pl = phr.length;
        if (pl > 6) {
          phr = phr.slice(0, 6);
          pl = 6;
        }
        let n = Math.trunc(pl/2);
        let r = pl%2;
        ph = '';
        let i;
        for (i = 0; i < n; i++) {
          ph = phr.slice(r+2*(n-(i+1)), r+2*(n-i)) + rs[2-i] + ph;
        }
        if (r != 0) ph = phr.slice(0, 1) + rs[2-i] + ph;
        if (ph.length == 0) ph = rs[2];
        CoordNavW.ra = NavW.arcToFloat(ph, 'ra');
        if (th.search(ds[2]) == -1) th = th.slice(0, th.length-1);        
        let thr = th.replace(ds[0],'').replace(ds[1],'').replace(ds[2],'');
        let tl = thr.length;
        if (tl > 6) {
          thr = thr.slice(0, 6);
          tl = 6;
        }
        n = Math.trunc(tl/2);
        r = tl%2;
        th = '';        
        for (i = 0; i < n; i++) {
          th = thr.slice(r+2*(n-(i+1)), r+2*(n-i)) + ds[2-i] + th;
        }
        if (r != 0) th = thr.slice(0, 1) + ds[2-i] + th;
        if (th.length == 0) th = ds[2];
        CoordNavW.dec = NavW.arcToFloat(th, 'dec')*ths;
      }
  }    
  document.getElementById("phiLabel").innerHTML = phiRepr.labels[i];
  document.getElementById("phiI").value = ph;  
  document.getElementById("phiUnit").innerHTML = phiRepr.units[i];
  document.getElementById("thetaLabel").innerHTML = thetaRepr.labels[i];
  document.getElementById("thetaI").value = th;  
  document.getElementById("thetaUnit").innerHTML = thetaRepr.units[i];
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
document.getElementsByName("coordSysN")[0].checked = "true";
NavW.updateCoordSys('check');

//Initialize calib stars list:
calibStars = [];

//let x = new VecSP.Step(20,30);
//$commStatus.innerHTML = x.fix;