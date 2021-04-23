/* globals starnamesJSON, stars6JSON */ //Necessary to glitch recognize the library

//stars6JSON equatorial coordinates are: ra - the Right Ascension (-180° to 180°) coordinate and dec - the Declination (-90º to 90º) coordinate.

import {VecSP, CommSP, PathSP} from './modules/StarPointer.module.js';
import './libs/orb.v2.min.js';


/* --------------------
  Frontend constants */

const $stepSizeR = document.getElementById("stepSizeR");
const $stepSizeRList = document.getElementById("stepSizeRList");
const $stepSizeT = document.getElementById("stepSizeT");
const $trackSpeedR = document.getElementById("trackSpeedR");
const $trackSpeedRList = document.getElementById("trackSpeedRList");
const $trackSpeedT = document.getElementById("trackSpeedT");
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
const $navDate = document.getElementById("navDate");
const $navTime = document.getElementById("navTime");
const $timeStepY = document.getElementById("timeStepY");
const $timeStepD = document.getElementById("timeStepD");
const $timeStepM = document.getElementById("timeStepM");
const $sideralOffset = document.getElementById("sideralOffset");
const $objectPointerStyle = document.getElementById("objectPointerStyle");
const $coordsPointerStyle = document.getElementById("coordsPointerStyle");
const $calibObjectsTypeCombo = document.getElementById("calibObjectsTypeCombo");
const $navObjectsTypeCombo = document.getElementById("navObjectsTypeCombo");
const $calibObjectsCombo = document.getElementById("calibObjectsCombo");
const $navObjectsCombo = document.getElementById("navObjectsCombo");

const laserStateBOFF = "laser is OFF";
const laserStateBON = "laser is ON";
const laserStateBON_color = "#9bf296";
const laserStateBOFF_color = "#f76459";

const stepSizeInputDatalistParams =  
{
  'min': 0,
  'max': 7,
  'step': 1,
  'init': 0,
  'input': $stepSizeR,
  'datalist': $stepSizeRList
};
const trackSpeedInputDatalistParams =
{
  'min': 1,
  'max': 7,
  'step': 1,
  'init': 4,
  'input': $trackSpeedR,
  'datalist': $trackSpeedRList
};

const objectsLabels =
{
  "star": ["name", "c", "hip", "hd"],
  "dso": ["name", "es", "desig"],
  "ss": ["name"],
  "messier": ["name", "m", "ngc"],
  "constellation": ["name", "en", "es"]
}

const objectCalibF =
[
  ["name", document.getElementById("nameCfilter")],
  ["c", document.getElementById("consCfilter")],
  ["hip", document.getElementById("hipCfilter")],
  ["hd", document.getElementById("hdCfilter")]
];
const objectNavF =
[
  ["name", document.getElementById("nameNfilter")],
  ["es", document.getElementById("esNfilter")],
  ["en", document.getElementById("enNfilter")],
  ["c", document.getElementById("consNfilter")],
  ["hip", document.getElementById("hipNfilter")],
  ["hd", document.getElementById("hdNfilter")],
  ["desig", document.getElementById("desigNfilter")],
  ["m", document.getElementById("mNfilter")],
  ["ngc", document.getElementById("ngcNfilter")]
];

const objectsTypeOptions =
{
  'ss': {'text': 'solar system'},
  'star': {'text': 'star'},
  'dso': {'text': 'deep sky and cluster'},
  'messier': {'text': 'messier'},
  'constellation': {'text': 'constellation'}
};
const calibTypeOptions =
{
  'ss': {'text': 'solar system'},
  'star': {'text': 'star'}
};

const itemsElements =
{
  "navObjects": {"typeCombo": $navObjectsTypeCombo, "itemCombo": $navObjectsCombo, "options": objectsTypeOptions, "filters": objectNavF, "labels": objectsLabels},
  "calibObjects": {"typeCombo": $calibObjectsTypeCombo, "itemCombo": $calibObjectsCombo, "options": calibTypeOptions, "filters": objectCalibF, "labels": objectsLabels}
};

const pointerStyleOptions =
{
  'point': {'text': 'point'},
  'bpoint': {'text': 'blinking point', 'interval': 2500},
  'circle': {'text': 'circle', 'interval': 100, 'angle': Math.PI/60, 'increment': Math.PI/20}
};

const filterComboMinLength = 0;

/*----------------------- */



/* --------------------
  Global variables */

let BleInstance = new CommSP.Bluetooth($commStatus);
let CalibInstance = new VecSP.Calibration();
let CalibTemp = new VecSP.Calibration();
let CoordNavW = new VecSP.Equatorial(0, 0);

let calibStars;
let stepSize;

let itemsNames = {};
let itemsData = {};

/*----------------------- */


/* --------------------
  Astronomy constants */

const sideralDay = 86164090.5; //[ms]

/*--------------------- */

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

App.localDateString = function (date) {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  if (month < 10) month = '0' + month;
  if (day < 10) day = '0' + day;
  return String(year) + '-' + String(month) + '-' + String(day);
}

App.localTimeString = function (date) {
  let hour = date.getHours();
  let minute = date.getMinutes();  
  if (hour < 10) hour = '0' + hour;
  if (minute < 10) minute = '0' + minute;
  return String(hour) + ':' + String(minute);
}

App.equatorialFromItemsData = function (itemSelected, date = new Date()) {
  try {            
    let obj = itemSelected.value.split("|");
    let type = obj[0];
    let id = obj[1];    
    if (type == "ss") {
      let objSS;
      if (id == "Moon") objSS = new Orb.Luna();
      else if (id == "Sun") objSS = new Orb.Sun();
      else objSS = new Orb.VSOP(id);      
      let radec = objSS.radec(date);
      if ($sideralOffset.checked) radec.ra -= (date - new Date())*24/sideralDay;      
      return new VecSP.Equatorial(radec.ra, radec.dec);
    }
    else {
      let items = itemsData[type].features;      
      for (let i = 0; i < items.length; i++) {                
        if (items[i].id == id) {                    
          let eq = items[i].geometry.coordinates;          
          let ra = (24 + eq[0]*12/180)%24; //convertion from (-180° to 180° units) to (0 to 24hs units)        
          ra += (date - new Date())*24/sideralDay;
          return new VecSP.Equatorial(ra, eq[1]);
        }
      }
    }
  }
  catch (err) {
    alert("Equatorial coordinates not found. " + err);
    return false;
  }
  alert("Equatorial coordinates not found.");
  return false;
}

App.changeObjectsType = function (itemElement) {  
  let opt = itemElement.options[itemElement.selectedIndex].value;  
  let item;
  for (let i in itemsElements) {
  	if (itemsElements[i]["typeCombo"].id == itemElement.id) item = itemsElements[i];    
  }  
  App.setFiltersEvents(item, filterComboMinLength);    
  App.filterCombo(item["filters"][0], item, filterComboMinLength);  
  let filter = item["filters"];
  let style;
  for (let x of filter) {
    if (item["labels"][opt].includes(x[0])) style = "block";
    else style = "none";        
    x[1].parentNode.style.display = style;
    x[1].parentNode.previousSibling.style.display = style;    
  }  
}

App.loadItemsDataNames = function () {
  let starsNames = JSON.parse(starnamesJSON);
  let starsData = JSON.parse(stars6JSON);
  let dsoNames = JSON.parse(dsonamesJSON);
  let dsoData = JSON.parse(dso6JSON);
  let mData = JSON.parse(messierJSON);
  let mNames = {};
  let consData = JSON.parse(constellationsJSON);
  let consNames = {};
  
  let ssNames = {
                  "sun": {"name":"Sun", "id":"Sun"},
                  "moon": {"name":"Moon", "id":"Moon"},
                  "mercury": {"name":"Mercury", "id":"Mercury"},
                  "venus": {"name":"Venus", "id":"Venus"},
                  "mars": {"name":"Mars", "id":"Mars"},
                  "jupiter": {"name":"Jupiter", "id":"Jupiter"},
                  "saturn": {"name":"Saturn", "id":"Saturn"},
                  "uranus": {"name":"Uranus", "id":"Uranus"},
                  "neptune": {"name":"Neptune", "id":"Neptune"}
                };

  for (let obj of starsData.features) obj.id = String(obj.id);
  for (let obj in starsNames) starsNames[obj]["id"] = String(parseInt(starsNames[obj]["hip"].match(/\d+/))); 

  for (let obj of dsoData.features) obj.id = String(parseInt(obj.id.match(/\d+/)));
  for (let obj in dsoNames) {
    dsoNames[obj]["id"] = String(parseInt(obj.match(/\d+/)));
    dsoNames[obj]["desig"] = obj;
  }

  for (let obj of mData["features"]) {    
    let id = obj["id"];    
    mNames[id] = {};
    mNames[id]["id"] = id;
    mNames[id]["name"] = obj["properties"]["alt"];
    mNames[id]["m"] = obj["properties"]["name"];
    mNames[id]["ngc"] = obj["properties"]["desig"];  
  }

  for (let obj of consData["features"]) {            
    let id = obj["id"];
    consNames[id] = {};
    consNames[id]["id"] = id;
    consNames[id]["name"] = obj["properties"]["name"];    
    consNames[id]["en"] = obj["properties"]["en"];    
    consNames[id]["es"] = obj["properties"]["es"];    
    obj["geometry"]["coordinates"] = obj["properties"]["display"]; //replace coordinates with display (optional)
  }

  itemsNames["star"] = starsNames;
  itemsNames["dso"] = dsoNames;
  itemsNames["ss"] = ssNames;
  itemsNames["messier"] = mNames;
  itemsNames["constellation"] = consNames;
  itemsData["star"] = starsData;
  itemsData["dso"] = dsoData;
  itemsData["messier"] = mData;
  itemsData["constellation"] = consData;
}

App.filterCombo = function (filterElement, itemElement, minLength) {        
  let type = itemElement["typeCombo"].options[itemElement["typeCombo"].selectedIndex].value;    
  let x = itemElement["itemCombo"];
  x.innerText = null;
  let label = filterElement[0];
  let filter = filterElement[1].value;
  if (filter.length >= minLength) {          
    let obj, l, text;        
    //let id = itemElement["ids"][type];
    for (obj in itemsNames[type]) {
      if ((itemsNames[type][obj][label] !== undefined)) {
        if (itemsNames[type][obj][label].match(RegExp(filter, 'gi'))) {
          let option = document.createElement("option");
          text = "";
          for (l of itemElement["labels"][type]) if (itemsNames[type][obj][l] !== undefined) {
            text += itemsNames[type][obj][l] + "|";
            //console.log(itemsNames[type][obj]);
          }
          option.text = text;
          if (itemsNames[type][obj].id !== undefined) option.value = type + "|" + itemsNames[type][obj].id;
          else option.value = "0";          
          x.add(option);
        }
      }
    }
  }
}

App.setFiltersEvents = function (item, minLength) {        
  let i = item["filters"];
  for (let l in i)
    for (let evt of ["keyup", "click"]) {           
      i[l][1].addEventListener(evt, function(){App.filterCombo(i[l], item, minLength)});  
    }
}

App.createComboOptions = function (comboElement, options) {
  for (let opt in options) {
    let option = document.createElement("option");
    option.value = opt;
    option.text = options[opt].text;    
    comboElement.add(option);
  }
}

App.setInputRangeDatalist = function (params) {
  params.input.min = params.min;
  params.input.max = params.max;
  params.input.step = params.step;
  params.input.value = params.init;
  let options = "";
  for (let i = params.min; i <= params.max; i += params.step)
    options += '<option value="' + String(i) + '" />';  
  params.datalist.innerHTML = options;
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
            let eq = App.equatorialFromItemsData(opt);            
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

NavW.goStyle = async function (style) {
  let path = new PathSP.Path();
  let cyclicOpt;
  switch (style) {
    case "point":
      let seg = new PathSP.Segment(CoordNavW, laser, 0);	  
	    path.addSegment(seg);
      cyclicOpt = false;
      break;
    case "bpoint":
      let seg0 = new PathSP.Segment(CoordNavW, 0, pointerStyles.bpoint.interval);
      let seg1 = new PathSP.Segment(CoordNavW, 1, pointerStyles.bpoint.interval);
      path.addSegment(seg0);
      path.addSegment(seg1);
      cyclicOpt = true;
      break;
    case "circle":
      let circle = new PathSP.makeCircle(CoordNavW, pointerStyles.circle.angle, pointerStyles.circle.increment, [1,0], pointerStyles.circle.interval);
	    path.addPath(circle);
      cyclicOpt = true;
      break;
  }	
	let commPath = new CommSP.CommPath(path, CalibInstance);	
	await BleInstance.goPath(commPath, cyclicOpt);
}

NavW.goEquatorial = async function () {
	let laser = 0;	
	if ($laserStateB.innerHTML == laserStateBON) laser = 1;
  CoordNavW.ra = Number($raF.value);
  CoordNavW.dec = Number($decF.value);
  let style = $coordsPointerStyle.value;
  await NavW.goStyle(style);
}

NavW.goSteps = async function () {
	let laser = 0;	
	if (document.getElementById("laserStateB").innerHTML == laserStateBON) laser = 1;
  let Step = new VecSP.Step(Number($fixI.value), Number($mobI.value));
  CoordNavW = CalibInstance.equatorialFromStep(Step);  
	let style = $coordsPointerStyle.value;
  await NavW.goStyle(style);
}

NavW.readCoords = async function () {
  if (await BleInstance.readActSteps()) {				
	  setTimeout(function() {	  	
	  	CoordNavW = CalibInstance.equatorialFromStep(BleInstance.actStep);
      $fixI.value = BleInstance.actStep.fix;
      $mobI.value = BleInstance.actStep.mob;
      $raF.value = CoordNavW.ra.toFixed(4); 
      $decF.value = CoordNavW.dec.toFixed(4);           
	  	NavW.updateCoordSys($raF);
      NavW.updateCoordSys($decF);
	  }, 500);
  }
}

NavW.showCoords = function () {
  let $nsc = document.getElementById("navObjectsCombo");
  let opt = $nsc.options[$nsc.selectedIndex];  
  //console.log(opt);
  CoordNavW = App.equatorialFromItemsData(opt);
  $raF.value = CoordNavW.ra.toFixed(4);
  $decF.value = CoordNavW.dec.toFixed(4);  
  NavW.updateCoordSys($raF);
  NavW.updateCoordSys($decF);
  let step = CalibInstance.stepFromEquatorial(CoordNavW);
  $fixI.value = step.fix;
  $mobI.value = step.mob;
}

NavW.updateCoordSys = function ($elem) {       
  let value = Number($elem.value);
  let min = Number($elem.min);
  let max = Number($elem.max);    
  if (value < min) value = min;
  if (value > max) value = max;    
  if ($elem.id == 'raInputF') {      
    let h = Math.trunc(value);
    let m = Math.trunc(60*(value - h));
    let s = Math.trunc(60*(60*(value - h) - m));
    $raH.value = h;
    $raM.value = m;
    $raS.value = s;      
  }
  else if ($elem.id == 'decInputF') {      
    let d = Math.trunc(value);
    let x = Math.abs(value) - Math.abs(d);
    let m = Math.trunc(60*x);
    let s = Math.trunc(60*(60*x - m));
    $decD.value = d;
    $decM.value = m;
    $decS.value = s;      
  }
  else {
    $elem.value = Math.round(value);
    let raF = Number($raH.value) + Number($raM.value)/60 + Number($raS.value)/3600;
    $raF.value = raF.toFixed(4);
    let s = ((Number($decD.value) < 0) ? -1 : 1);
    let decF = Number($decD.value) + s*Number($decM.value)/60 + s*Number($decS.value)/3600;
    $decF.value = decF.toFixed(4);
  }    
}

NavW.timeStepCheck = function ($elem) {
  let value = Number($elem.value);
  let min = Number($elem.min);
  let max = Number($elem.max);    
  if (value < min) value = min;
  if (value > max) value = max;
  $elem.value = Math.round(value);    
}

NavW.timeTest = function ($elem) {
  let date = new Date($navDate.value+'T'+$navTime.value);
  let now = new Date();  
  console.log(now);
  console.log(date);
  console.log(date-now);
}

NavW.goStar = async function (timeOpt) {
  let $nsc = document.getElementById("navObjectsCombo");
  let opt = $nsc.options[$nsc.selectedIndex];                
  let style = $objectPointerStyle.value;
  let date 
  if (timeOpt == 'now') date = new Date();  
  else if (timeOpt == 'date') date = new Date($navDate.value+'T'+$navTime.value);
  else {
    let s = Number(timeOpt);
    let d = new Date($navDate.value+'T'+$navTime.value);    
    let year = d.getFullYear() + s*Number($timeStepY.value);
    let month = d.getMonth();
    let day = d.getDate() + s*Number($timeStepD.value);
    let hour = d.getHours();
    let minute = d.getMinutes() + s*Number($timeStepM.value);
    let second = d.getSeconds();
    date = new Date(year, month, day, hour, minute);        
  }
  $navDate.value = App.localDateString(date);
  $navTime.value = App.localTimeString(date);
  CoordNavW = App.equatorialFromItemsData(opt, date);
  await NavW.goStyle(style);
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

//Set initial window:
App.setWindow("appNavW");

//Set input datalist parameters:
App.setInputRangeDatalist(stepSizeInputDatalistParams);
App.setInputRangeDatalist(trackSpeedInputDatalistParams);

//Load sky objects data and names:
App.loadItemsDataNames();

//Set pointer style options:
App.createComboOptions($objectPointerStyle, pointerStyleOptions);
App.createComboOptions($coordsPointerStyle, pointerStyleOptions);

//Set items type options:
for (let i in itemsElements) {
  let item = itemsElements[i];  
  App.createComboOptions(item["typeCombo"], item["options"]);  
  App.setFiltersEvents(item, filterComboMinLength);
  //Set initial navigation type option:  
  item["typeCombo"].selectedIndex = 0;
  App.changeObjectsType(item["typeCombo"]);
}
//App.createComboOptions($navObjectsTypeCombo, objectsTypeOptions);
//App.createComboOptions($calibObjectsTypeCombo, calibTypeOptions);

//Set initial step size:
Controller.updateStepSize();

//Set initial laser status
$laserStateB.innerHTML = laserStateBOFF;
$laserStateB.style.backgroundColor = laserStateBOFF_color;

//Set navigation stars actual time:
$navDate.value = App.localDateString(new Date());
$navTime.value = App.localTimeString(new Date());

//Set initial navigation type option:
//$navObjectsTypeCombo.selectedIndex = 0;
//App.changeObjectsType($navObjectsTypeCombo);
//Set initial calibration type option:
//$calibObjectsTypeCombo.selectedIndex = 0;
//App.changeObjectsType($calibObjectsTypeCombo);

//Initialize calib stars list:
calibStars = [];

//let x = new VecSP.Step(20,30);
//$commStatus.innerHTML = x.fix;