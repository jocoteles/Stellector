/* globals starnamesJSON, stars6JSON */ //Necessary to glitch recognize the library

//stars6JSON equatorial coordinates are: ra - the Right Ascension (-180° to 180°) coordinate and dec - the Declination (-90º to 90º) coordinate.

import {VecSP, CommSP, PathSP} from './modules/StarPointer.module.js';
import './libs/orb.v2.min.js';

/* --------------------
  Frontend constants */

const $controllerSVGcontainer = document.getElementById("controllerSVGcontainer");
const $stepSizeR = document.getElementById("stepSizeR");
const $stepSizeRList = document.getElementById("stepSizeRList");
const $stepSizeT = document.getElementById("stepSizeT");
const $lineSpeedR = document.getElementById("lineSpeedR");
const $lineSpeedRList = document.getElementById("lineSpeedRList");
const $lineSpeedT = document.getElementById("lineSpeedT");
const $lineOnR = document.getElementById("lineOnR");
const $lineOnRList = document.getElementById("lineOnRList");
const $lineOnT = document.getElementById("lineOnT");
const $lineAngR = document.getElementById("lineAngR");
const $lineAngT = document.getElementById("lineAngT");
const $circleSpeedR = document.getElementById("circleSpeedR");
const $circleSpeedRList = document.getElementById("circleSpeedRList");
const $circleSpeedT = document.getElementById("circleSpeedT");
const $circleOnR = document.getElementById("circleOnR");
const $circleOnRList = document.getElementById("circleOnRList");
const $circleOnT = document.getElementById("circleOnT");
const $circleApR = document.getElementById("circleApR");
const $circleApRList = document.getElementById("circleApRList");
const $circleApT = document.getElementById("circleApT");
const $circleAngR = document.getElementById("circleAngR");
const $circleAngT = document.getElementById("circleAngT");
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
const $objDate = document.getElementById("objDate");
const $objTime = document.getElementById("objTime");
const $trackDate = document.getElementById("trackDate");
const $trackTime = document.getElementById("trackTime");
const $timeStepY = document.getElementById("timeStepY");
const $timeStepD = document.getElementById("timeStepD");
const $timeStepM = document.getElementById("timeStepM");
const $sideralOffset = document.getElementById("sideralOffset");
const $objectPointerStyle = document.getElementById("objectPointerStyle");
const $trackPointerStyle = document.getElementById("trackPointerStyle");
const $coordsPointerStyle = document.getElementById("coordsPointerStyle");
const $calibObjectsTypeCombo = document.getElementById("calibObjectsTypeCombo");
const $calibListCombo = document.getElementById("calibListCombo");
const $navObjectsTypeCombo = document.getElementById("navObjectsTypeCombo");
const $navTracksTypeCombo = document.getElementById("navTracksTypeCombo");
const $calibObjectsCombo = document.getElementById("calibObjectsCombo");
const $angFixStretch = document.getElementById("angFixStretch");
const $angMobStretch = document.getElementById("angMobStretch");
const $fixStretchOptim = document.getElementById("fixStretchOptim");
const $mobStretchOptim = document.getElementById("mobStretchOptim");
const $laserTiltOptim = document.getElementById("laserTiltOptim");
const $laserTiltAng = document.getElementById("laserTiltAng");
const $mobTiltOptim = document.getElementById("mobTiltOptim");
const $mobTiltAng = document.getElementById("mobTiltAng");
const $useParamsCalib = document.getElementById("useParamsCalib");
const $navObjectsCombo = document.getElementById("navObjectsCombo");
const $navTracksCombo = document.getElementById("navTracksCombo");
const $trackAtDatetime = document.getElementById("trackAtDatetime");
const $speechLanguage = document.getElementById("speechLanguage");
const $speechRate = document.getElementById("speechRate");
const $speechPitch = document.getElementById("speechPitch");
const $speakStarName = document.getElementById("speakStarName");
const $speakBayer = document.getElementById("speakBayer");
const $speakConstellation = document.getElementById("speakConstellation");
const $speakHipparcos = document.getElementById("speakHipparcos");
const $controllerWidth = document.getElementById("controllerWidth");
const $controllerWidthValue = document.getElementById("controllerWidthValue");

const colorMenuSelected = "#339333";
const colorMenuUnselected = "#893838";

const startingLangName = 'pt-BR';

const stepSizeInputDatalistParams =  
{
  'min': 0,
  'max': 7,
  'step': 1,
  'init': 0,
  'input': $stepSizeR,
  'datalist': $stepSizeRList
};
const lineSpeedInputDatalistParams =
{
  'min': 1,
  'max': 6,
  'step': 1,
  'init': 3,
  'delaylist' : [500, 400, 300, 200, 100, 0],   // multiples of 100 us
  'input': $lineSpeedR,
  'datalist': $lineSpeedRList
};
const lineOnInputDatalistParams =
{
  'min': 0,
  'max': 100,
  'step': 25,
  'init': 100,
  'input': $lineOnR,
  'datalist': $lineOnRList
};
const circleSpeedInputDatalistParams =
{
  'min': 1,
  'max': 6,
  'step': 1,
  'init': 3,
  'delaylist' : [500, 400, 300, 200, 100, 0],   // multiples of 100 us
  'input': $circleSpeedR,
  'datalist': $circleSpeedRList
};
const circleOnInputDatalistParams =
{
  'min': 0,
  'max': 100,
  'step': 25,
  'init': 100,
  'input': $circleOnR,
  'datalist': $circleOnRList
};
const circleApertureInputDatalistParams =
{
  'min': 0.5,
  'max': 160,
  'step': 0.5,
  'init': 2.0,
  'input': $circleApR,
  'datalist': $circleApRList
};

const objectsLabels =
{
  "star": ["name", "c", "hip", "hd"],
  "dso": ["name", "es", "desig"],
  "ss": ["name"],
  "messier": ["name", "m", "ngc"],
  "constellation": ["name", "en", "es"]
}
const tracksLabels = 
{
  "clines": ["name", "en", "es"],
  "cbounds": ["name", "en", "es"],
  "asterisms": ["name", "es"],
  "ecliptic": ["name"]
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
const trackNavF =
[
  ["name", document.getElementById("nameTfilter")],
  ["es", document.getElementById("esTfilter")],
  ["en", document.getElementById("enTfilter")]
]

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
const tracksTypeOptions = 
{
  'clines': {'text': 'constellation lines'},
  'cbounds': {'text': 'constellation bounds'},
  'asterisms': {'text': 'asterisms'},
  'ecliptic': {'text': 'ecliptic'}
}

const itemsElements =
{
  "navObjects": {"typeCombo": $navObjectsTypeCombo, "itemCombo": $navObjectsCombo, "options": objectsTypeOptions, "filters": objectNavF, "labels": objectsLabels},
  "calibObjects": {"typeCombo": $calibObjectsTypeCombo, "itemCombo": $calibObjectsCombo, "options": calibTypeOptions, "filters": objectCalibF, "labels": objectsLabels},
  "navTracks": {"typeCombo": $navTracksTypeCombo, "itemCombo": $navTracksCombo, "options": tracksTypeOptions, "filters": trackNavF, "labels": tracksLabels}
};

const pointerStyleOptions =
{
  'point': {'text': 'point'},
  'bpoint': {'text': 'blinking point', 'interval': 2500},
  'circle': {'text': 'circle'}
};

const trackStyleOptions =
{
  'solid': {'text': 'solid'},
  'dashed': {'text': 'dashed'},
  'circle': {'text': 'circle'},
  'solidcircle': {'text': 'solid-circle'},
  'dashedcircle': {'text': 'dashed-circle'}
}

const filterComboMinLength = 0;

/*----------------------- */



/* --------------------
  Global variables */

let BleInstance = new CommSP.Bluetooth($commStatus);
let CalibInstance = new VecSP.Calibration();
let CalibTemp = new VecSP.Calibration();

let calibStars = [];
let stepSize = 1;

let itemsNames = {};
let itemsData = {};

//let trackPath = {'paths': [], 'coords':[], 'fullPath': new PathSP.Path(), 'step': 0};
let trackCoords = {'coords':[], 'indexes': [], 'step': 0};


/*let pointerConfig = {
  'lineSpeed': 0;
}*/

/*----------------------- */


/* --------------------
  Astronomy constants */

const sideralDay = 86164090.5; //[ms]
const sideralYear = 366.255936; //[sideral days]
const eclipticDivisions = 30;

/*--------------------- */

/**
 * A namespace for the general App functions in the client app.
 * @namespace
 */
window.App = {};

/** Set the actual window choosen by the app menu. */
App.setWindow = function (windowId, menuElem) {
	let windows = document.getElementsByClassName("window");  
	for (let w of windows) w.style.display = "none";
  for (let m of document.getElementsByClassName("menuBtn")) m.style.backgroundColor = colorMenuUnselected;
  menuElem.style.backgroundColor = colorMenuSelected;
	document.getElementById(windowId).style.display = "block";  
  if (windowId == "appCommW") $commStatus.scrollTop = $commStatus.scrollHeight;  
  if (windowId == "appCommW" || windowId == "appConfigW") document.getElementById("appControllerDiv").style.display = "none";
  else document.getElementById("appControllerDiv").style.display = "block";
}

App.changeNav = function (id) {
  let elem = document.getElementById(id);
  if (window.getComputedStyle(elem).getPropertyValue('display') == "block") elem.style.display = "none";        
  else elem.style.display = "block";    
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

/**
 * Convertion from (-180° to 180° units) to (0 to 24hs units)
 * @param {Number} ra in -180° to 180° units
 * @returns ra in 0 to 24hs units
 */
App.ra180to24 = function (ra) {
  return (24 + ra*12/180)%24;
}

/**
 * Convertion from (0 to 24hs units) to (-180° to 180° units)
 * @param {Number} ra in 0 to 24hs units
 * @returns ra in -180° to 180° units
 */
 App.ra24to180 = function (ra) {
  return ra > 12 ? (ra - 24) * 15 : ra * 15;
}

App.getCoordinates = function (itemType, itemId) {
  let items = itemsData[itemType].features;      
  for (let i = 0; i < items.length; i++)
    if (items[i].id == itemId) return items[i].geometry.coordinates;          
  return false;
}

App.equatorialFromObjectData = function (value, date = new Date()) {
  try {            
    let obj = value.split("|");
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
      let eq = App.getCoordinates(type, id);
      if (eq) {
        let ra = App.ra180to24(eq[0]); 
        ra += (date - new Date())*24/sideralDay;
        return new VecSP.Equatorial(ra, eq[1]);
      }
    }
  }
  catch (err) {
    alert("Object coordinates not found. " + err);
    return false;
  }
  alert("Object coordinates not found.");
  return false;
}

App.changeObjectsType = function (itemElement) {  
  let opt = App.valueSelected(itemElement);  
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
  let clinesData = JSON.parse(clinesJSON);
  let cboundsData = JSON.parse(cboundsJSON);
  let asterismsData = JSON.parse(asterismsJSON);
  let asterismsName = {};
  let eclipticData = {};
  let eclipticName = {};
  
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
  
  /*function coordinatesMakeLinear (data) {  
    for (let i = 0; i < data["features"].length; i++) {
      let cn = [];
      let carray = data["features"][i]["geometry"]["coordinates"]; 
      if (carray[0][0][0] == undefined) for (let a of carray) cn = cn.concat([a]);
      else for (let a of carray) for (let b of a) cn = cn.concat([b]);
      data["features"][i]["geometry"]["coordinates"] = cn;
    }  
  }
  coordinatesMakeLinear(clinesData);
  coordinatesMakeLinear(cboundsData);
  coordinatesMakeLinear(asterismsData);*/

  for (let obj of asterismsData["features"]) {            
    let id = obj["id"];
    asterismsName[id] = {};
    asterismsName[id]["id"] = id;
    asterismsName[id]["name"] = obj["properties"]["n"];        
    asterismsName[id]["es"] = obj["properties"]["es"];        
  }

  eclipticData["features"] = [{'id': 'ecliptic', 'properties': {'name': 'ecliptic'}, 'geometry': {'coordinates': []}}];
  let eclipitic = [];
  let dt = sideralDay*sideralYear/eclipticDivisions;  
  let sun = new Orb.Sun();
  let date0 = new Date().getTime();  
  for (let i = 0; i < eclipticDivisions; i++) {    
    let date = new Date(date0 + Math.round(i*dt));    
    let radec = sun.radec(date);
    eclipitic = eclipitic.concat([[App.ra24to180(radec.ra).toFixed(4), radec.dec.toFixed(4)]]);    
  }
  eclipticData["features"][0]["geometry"]["coordinates"] = eclipitic;
  eclipticName['ecliptic'] = {};
  eclipticName['ecliptic']['id'] = 'ecliptic';
  eclipticName['ecliptic']['name'] = 'ecliptic';

  itemsNames["star"] = starsNames;
  itemsNames["dso"] = dsoNames;
  itemsNames["ss"] = ssNames;
  itemsNames["messier"] = mNames;
  itemsNames["constellation"] = consNames;
  itemsNames["clines"] = consNames;
  itemsNames["cbounds"] = consNames;
  itemsNames["asterisms"] = asterismsName;
  itemsData["star"] = starsData;
  itemsData["dso"] = dsoData;
  itemsData["messier"] = mData;
  itemsData["constellation"] = consData;
  itemsData["clines"] = clinesData;
  itemsData["cbounds"] = cboundsData;
  itemsData["asterisms"] = asterismsData;  
}



App.filterCombo = function (filterElement, itemElement, minLength) {        
  let type = App.valueSelected(itemElement["typeCombo"]);    
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

App.valueSelected = function (element) {
  return element.options[element.selectedIndex].value;                
}

App.textSelected = function (element) {
  return element.options[element.selectedIndex].text;                
}

App.getRadioValue = function (elementName) {
  let elems = document.getElementsByName(elementName);  
  for(let elem of elems) if (elem.checked) return elem.value;
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
  await BleInstance.goLaser();  
  await BleInstance.sendOption(BleInstance.OPT.LASER_CHECK_OPT);  
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
    if ($calibObjectsCombo.innerText != null) {              
        if (action == "add") {           
          if (await BleInstance.readActSteps()) {
            let opt = App.valueSelected($calibObjectsCombo);                        
            //let track = App.valueSelected($navTracksCombo).split("|");
            //let trackType = track[0];
            //let trackId = track[1];
            let eq = App.equatorialFromObjectData(opt);                        
            if (eq) {
              let t = new Date();
              let s = new VecSP.CalibStar(App.textSelected($calibObjectsCombo), t, BleInstance.actStep, eq);
              calibStars.push(s);              
            }
          }
        }
        if (action == "remThis") {
            if (calibStars.length > 0) {
                let index = $calibListCombo.selectedIndex;
                calibStars.splice(index, 1);
            }
        }
        if (action == "remAll") calibStars = [];

        $calibListCombo.innerText = null;   
        for (let i = 0; i < calibStars.length; i++) {
            let option = document.createElement("option");
            option.text = calibStars[i].text;
            $calibListCombo.add(option);
        }
        $calibListCombo.selectedIndex = Math.max(0, calibStars.length-1);      
    }
}

CalibW.calcCalib = function () {
	if (calibStars.length < 2) alert("You must add at least two calibration stars.");
	else {    
    if ($useParamsCalib) {
      CalibTemp.fit.fixStretch.value = Number($angFixStretch.value);
      CalibTemp.fit.mobStretch.value = Number($angMobStretch.value);
      CalibTemp.fit.laserTilt.value = Number($laserTiltAng.value)*Math.PI/180;
      CalibTemp.fit.mobTilt.value = Number($mobTiltAng.value)*Math.PI/180;
    }    
    CalibTemp.fit.fixStretch.optimize = $fixStretchOptim.checked;
    CalibTemp.fit.mobStretch.optimize = $mobStretchOptim.checked;
    CalibTemp.fit.laserTilt.optimize = $laserTiltOptim.checked;
    CalibTemp.fit.mobTilt.optimize = $mobTiltOptim.checked;    
    CalibTemp.calcCalib(calibStars)
    $calibLog.innerHTML += '-------------------------------------\n';
    $calibLog.innerHTML += window.App.time() + 'New calibration performed with stars:\n';
    for (let s of CalibTemp.stars) $calibLog.innerHTML += s.text + '\n';
    let dev = CalibTemp.stats.dev.toFixed(1);
    let devStep = (CalibTemp.stats.dev*calibStars[0].step.maxSteps/360).toFixed(1);
    let min = CalibTemp.stats.min.toFixed(1);
    let minStar = CalibTemp.stats.minStar.split('|')[0];
    let minStep = (CalibTemp.stats.min*calibStars[0].step.maxSteps/360).toFixed(1);
    let max = CalibTemp.stats.max.toFixed(1);
    let maxStar = CalibTemp.stats.maxStar.split('|')[0];
    let maxStep = (CalibTemp.stats.max*calibStars[0].step.maxSteps/360).toFixed(1);
    $calibLog.innerHTML += 'Average angle deviation: ' + dev + '° (' + devStep + ' steps).\n';
    $calibLog.innerHTML += 'Minimum angle deviation of ' + minStar + ': ' + min + '° (' + minStep + ' steps).\n';
    $calibLog.innerHTML += 'Maximum angle deviation of ' + maxStar + ': ' + max + '° (' + maxStep + ' steps).\n\n';
    $calibLog.innerHTML += 'Fix angle strech factor: ' + CalibTemp.fit.fixStretch.value + '\n';
    $calibLog.innerHTML += 'Mob angle strech factor: ' + CalibTemp.fit.mobStretch.value + '\n';
    $calibLog.innerHTML += 'Laser axis tilt angle: ' + CalibTemp.fit.laserTilt.value*180/Math.PI + '°\n';
    $calibLog.innerHTML += 'Mob axis tilt angle: ' + CalibTemp.fit.mobTilt.value*180/Math.PI + '°\n';
    alert("Calibration calculated. Press ACCEPT button to accept this calibration.");    
	}
}

CalibW.acceptCalib = function () {
  if (CalibTemp.stars.length > 0) {
    CalibInstance = CalibTemp.clone();
    $angFixStretch.value = CalibInstance.fit.fixStretch.value;
    $angMobStretch.value = CalibInstance.fit.mobStretch.value;
    $laserTiltAng.value = CalibInstance.fit.laserTilt.value*180/Math.PI;
    $mobTiltAng.value = CalibInstance.fit.mobTilt.value*180/Math.PI;
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
    $calibInfo.innerHTML += '\nStars angle deviations:\n';
    $calibInfo.innerHTML += '-----------------------\n';
    $calibInfo.innerHTML += '-> Avg: ' + dev + '° (' + devStep + ' steps).\n';
    $calibInfo.innerHTML += '-> Min: ' + min + '° (' + minStep + ' steps).\n';
    $calibInfo.innerHTML += '-> Max: ' + max + '° (' + maxStep + ' steps).\n';
    $calibInfo.innerHTML += '\nFitting paramenters:\n';
    $calibInfo.innerHTML += '-----------------------\n';
    $calibInfo.innerHTML += '-> Fix strech: ' + CalibInstance.fit.fixStretch.value + '\n';
    $calibInfo.innerHTML += '-> Mob strech: ' + CalibInstance.fit.mobStretch.value + '\n';
    $calibInfo.innerHTML += '-> Laser tilt: ' + CalibInstance.fit.laserTilt.value*180/Math.PI + '°\n';
    $calibInfo.innerHTML += '-> Mob tilt: ' + CalibInstance.fit.mobTilt.value*180/Math.PI + '°\n';
    $calibInfo.innerHTML += 'Reference date: ' + CalibInstance.stars[0].date + '\n\n';        
  }
}


/**
 * A namespace for the Navigation Window functions in the client app.
 * @namespace
 */
window.NavW = {};

NavW.setZenith = async function () {
	await BleInstance.setZenith();
}

NavW.goObjectStyle = async function (style, eqCoord) {
  let path = new PathSP.Path();
  let cyclicOpt, delay;
  switch (style) {
    case "point":
      let seg = new PathSP.Segment(eqCoord, 1, 0);
	    path.addSegment(seg);            	    
      cyclicOpt = 'single';
      break;
    case "bpoint":
      delay = lineSpeedInputDatalistParams.delaylist[Number($lineSpeedR.value)-1];
      let seg0 = new PathSP.Segment(eqCoord, 0, delay);
      let seg1 = new PathSP.Segment(eqCoord, 1, delay);
      path.addSegment(seg0);
      path.addSegment(seg1);
      cyclicOpt = 'forward';
      break;
    case "circle":
      let ap = 0.5*$circleApR.value*Math.PI/180;      
      let inc = $circleAngR.value*Math.PI/180;  
      delay = circleSpeedInputDatalistParams.delaylist[Number($circleSpeedR.value)-1];      
      let cp = Math.round(Number($circleOnR.value)/25);
      let lp = [cp, 4-cp];    
      let circle = new PathSP.makeCircle(eqCoord, ap, inc, lp, delay);
	    path.addPath(circle);
      cyclicOpt = 'forward';
      break;
  }
  let commPath = new CommSP.CommPath(path, CalibInstance);	
  await BleInstance.goPath(commPath, cyclicOpt);  
}

NavW.goEquatorial = async function () {	
  let eqCoord = new VecSP.Equatorial();
  eqCoord.ra = Number($raF.value);
  eqCoord.dec = Number($decF.value);
  let style = $coordsPointerStyle.value;
  await NavW.goObjectStyle(style, eqCoord);
}

NavW.goSteps = async function () {	
  let step = new VecSP.Step(Number($fixI.value), Number($mobI.value));  
  let seg = new PathSP.Segment(step, 1, 0);
  let path = new PathSP.Path();
  path.addSegment(seg);
  let commPath = new CommSP.CommPath(path, CalibInstance);	  
  await BleInstance.goPath(commPath);  
}

NavW.readCoords = async function () {
  if (await BleInstance.readActSteps()) {		
    let eqCoord = new VecSP.Equatorial();		
    eqCoord = CalibInstance.equatorialFromStep(BleInstance.actStep);
    $fixI.value = BleInstance.actStep.fix;
    $mobI.value = BleInstance.actStep.mob;
    $raF.value = eqCoord.ra.toFixed(4); 
    $decF.value = eqCoord.dec.toFixed(4);           
    NavW.updateCoordSys($raF);
    NavW.updateCoordSys($decF);
  }
}

NavW.showCoords = function () {  
  let opt = App.valueSelected($navObjectsCombo);      
  let eqCoord = App.equatorialFromObjectData(opt);
  $raF.value = eqCoord.ra.toFixed(4);
  $decF.value = eqCoord.dec.toFixed(4);  
  NavW.updateCoordSys($raF);
  NavW.updateCoordSys($decF);
  let step = CalibInstance.stepFromEquatorial(eqCoord);
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
  $elem.value = Math.trunc(value);
}

/*NavW.timeTest = function ($elem) {
  let date = new Date($objDate.value+'T'+$objTime.value);
  let now = new Date();  
  console.log(now);
  console.log(date);
  console.log(date-now);
}*/

NavW.goStar = async function (timeOpt) {  
  let opt = App.valueSelected($navObjectsCombo);                
  let style = $objectPointerStyle.value;
  let date;
  if (timeOpt == 'now') date = new Date();  
  else if (timeOpt == 'date') date = new Date($objDate.value+'T'+$objTime.value);
  else {
    let s = Number(timeOpt);
    let d = new Date($objDate.value+'T'+$objTime.value);    
    let year = d.getFullYear() + s*Number($timeStepY.value);
    let month = d.getMonth();
    let day = d.getDate() + s*Number($timeStepD.value);
    let hour = d.getHours();
    let minute = d.getMinutes() + s*Number($timeStepM.value);
    date = new Date(year, month, day, hour, minute);        
  }
  $objDate.value = App.localDateString(date);
  $objTime.value = App.localTimeString(date);
  let eqCoord = App.equatorialFromObjectData(opt, date);
  
  await NavW.goObjectStyle(style, eqCoord); 
}

NavW.goTrack = async function (opt) { 
  if (trackCoords.coords) {
    let circle = App.valueSelected($trackPointerStyle).includes('circle');
    let solid = App.valueSelected($trackPointerStyle).includes('solid');
    let dashed = App.valueSelected($trackPointerStyle).includes('dashed');          
    let ldelay = lineSpeedInputDatalistParams.delaylist[Number($lineSpeedR.value)-1];
    let cdelay = circleSpeedInputDatalistParams.delaylist[Number($circleSpeedR.value)-1];      
    let lp = Math.round(Number($lineOnR.value)/25);      
    let llp = solid ? [1, 0] : [lp, 4-lp];
    let cp = Math.round(Number($circleOnR.value)/25);
    let clp = [cp, 4-cp];
    let linc = $lineAngR.value*Math.PI/180;
    let cinc = $circleAngR.value*Math.PI/180;
    let cap = $circleApR.value*Math.PI/180;
    let date;
    if ($trackAtDatetime.checked) date = new Date($trackDate.value+'T'+$trackTime.value);
    else date = new Date();    
    let dt = (date - new Date())*24/sideralDay;
    let ra0, dec0, ra1, dec1, eq0, eq1;
    if (opt == 'fullTrack') {
      let trackPath = new PathSP.Path();
      for (let coord of trackCoords.coords) {        
        ra0 = App.ra180to24(coord[0][0]) + dt;
        dec0 = coord[0][1];
        eq0 = new VecSP.Equatorial(ra0, dec0);                
        if (circle) trackPath.addPath(new PathSP.makeCircle(eq0, cap, cinc, clp, cdelay));
        for (let i = 0; i < coord.length-1; i++) {
          ra0 = App.ra180to24(coord[i][0]) + dt;
          dec0 = coord[i][1];
          ra1 = App.ra180to24(coord[i+1][0]) + dt;        
          dec1 = coord[i+1][1];
          eq0 = new VecSP.Equatorial(ra0, dec0);
          eq1 = new VecSP.Equatorial(ra1, dec1);            
          if (solid || dashed) trackPath.addPath(new PathSP.makeGeodesic(eq0, eq1, linc, llp, ldelay));            
          if (circle) trackPath.addPath(new PathSP.makeCircle(eq0, cap, cinc, clp, cdelay));            
        }
      }
      let commPath = new CommSP.CommPath(trackPath, CalibInstance);	  
      let trackCyclicallyOpt = App.getRadioValue('trackCyclicallyRadio');          
      await BleInstance.goPath(commPath, trackCyclicallyOpt);        
    }
    else {      
      trackCoords.step += Number(opt);
      trackCoords.step = (trackCoords.indexes.length + trackCoords.step)%trackCoords.indexes.length;
      let index = trackCoords.indexes[trackCoords.step];
      let coord = trackCoords.coords[index[0]][index[1]];            
      ra0 = App.ra180to24(coord[0]) + dt;
      dec0 = coord[1];      
      eq0 = new VecSP.Equatorial(ra0, dec0);
      let trackPath;
      if (circle) trackPath = new PathSP.makeCircle(eq0, cap, cinc, clp, cdelay);                  
      else {
        let seg = new PathSP.Segment(eq0, 1, 0);
        trackPath = new PathSP.Path();
        trackPath.addSegment(seg);
      }
      let commPath = new CommSP.CommPath(trackPath, CalibInstance);	                
      await BleInstance.goPath(commPath, 'forward');        
      Speech.speakStar(coord);      
    }    
  }
  else alert("Track coordinates not found.");      
}

NavW.resetTrack = function () {
  let track = App.valueSelected($navTracksCombo).split("|");
  let trackType = track[0];
  let trackId = track[1];    
  trackCoords.coords = App.getCoordinates(trackType, trackId);
  trackCoords.step = 0;
  trackCoords.indexes = [];    
  for (let i = 0; i < trackCoords.coords.length; i++)
    for (let j = 0; j < trackCoords.coords[i].length; j++) 
      trackCoords.indexes = trackCoords.indexes.concat([[i, j]]);  
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
 * A namespace for the Config Window functions in the client app.
 * @namespace
 */
window.ConfigW = {};

ConfigW.updatePointer = function (option) {
  switch (option) {
    case 'lineSpeed':
      $lineSpeedT.innerHTML = $lineSpeedR.value;
      break;
    case 'circleSpeed':
      $circleSpeedT.innerHTML = $circleSpeedR.value;
      break;
    case 'lineOn':
      $lineOnT.innerHTML = $lineOnR.value + '%';
      break;
    case 'lineAng':
        $lineAngT.innerHTML = $lineAngR.value + '°';
        break;
    case 'circleOn':
      $circleOnT.innerHTML = $circleOnR.value + '%';
      break;
    case 'circleAp':
      $circleApT.innerHTML = $circleApR.value + '°';
      break;
    case 'circleAng':
      $circleAngT.innerHTML = $circleAngR.value + '°';
      break;
  }
}

ConfigW.checkStatus = async function () {
  await BleInstance.checkStatus();
  document.getElementById("statusLog").innerHTML = String(BleInstance.serverStatus);
}

ConfigW.updateControllerWidth = function () {
  $controllerWidthValue.innerHTML = $controllerWidth.value + "%";
  $controllerSVGcontainer.style.width = $controllerWidthValue.innerHTML;
}



/**
 * A namespace for speech synthesis.
 * @namespace
 */
window.Speech = {};

Speech.synth = window.speechSynthesis;
Speech.voices = [];

Speech.populateVoiceList = function () {  
  Speech.voices = Speech.synth.getVoices().sort((a, b) => {
    const aname = a.name.toUpperCase(), bname = b.name.toUpperCase();
    if ( aname < bname ) return -1;
    else if ( aname == bname ) return 0;
    else return +1;
  });  
  for(let i = 0; i < Speech.voices.length ; i++) {
    let option = document.createElement('option');
    option.textContent = Speech.voices[i].name + ' (' + Speech.voices[i].lang + ')';
    
    if(Speech.voices[i].default) {
      option.textContent += ' -- DEFAULT';
    }

    option.setAttribute('data-lang', Speech.voices[i].lang);
    option.setAttribute('data-name', Speech.voices[i].name);    
    $speechLanguage.appendChild(option);    
    if (startingLangName) {
      if (Speech.voices[i].lang == startingLangName) option.selected = 'selected';
    }
    else if (Speech.voices[i].default) option.selected = 'selected';
  }  
}

Speech.speakStar = function (coord) {
  if ($speakStarName.checked || $speakBayer.checked || $speakConstellation.checked || $speakHipparcos.checked) {    
    if (Speech.synth.speaking) {
        console.error('speechSynthesis.speaking');
        return;
    }
    let text = "";
    let snames = {};
    for (let features of itemsData.star.features)
      if (features.geometry.coordinates[0] == coord[0] && features.geometry.coordinates[1] == coord[1]) {      
        snames = itemsNames.star[features.id];
        if ($speakStarName.checked && snames.name != "") text = snames.name + ". ";
        if ($speakBayer.checked && snames.bayer != "") text += snames.bayer + ". ";
        if ($speakConstellation.checked && snames.c != "") {          
          let cons  = itemsNames.constellation;
          for (let x in cons) {                        
            let cname = cons[x].id.toLowerCase();
            let sname = snames.c.toLowerCase();            
            if (cname.includes(sname)) {
              text += cons[x].name + ". ";
              break;
            }
          }          
        }
        if ($speakHipparcos.checked && snames.id != "") text += "Hiparcos " + snames.id + ". ";        
        break;
      }
    
    if (text !== '') {
      let utterThis = new window.SpeechSynthesisUtterance(text);
      utterThis.onend = function (event) {
          console.log('SpeechSynthesisUtterance.onend');
      }
      utterThis.onerror = function (event) {
          console.error('SpeechSynthesisUtterance.onerror');
      }
      let selectedOption = $speechLanguage.selectedOptions[0].getAttribute('data-name');
      for(let i = 0; i < Speech.voices.length ; i++) {
        if(Speech.voices[i].name === selectedOption) {
          utterThis.voice = Speech.voices[i];
          break;
        }
      }
      utterThis.pitch = $speechPitch.value;
      utterThis.rate = $speechRate.value;
      Speech.synth.speak(utterThis);
    }
  }
}

Speech.populateVoiceList('pt-BR');
if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = Speech.populateVoiceList;
}



//Set initial window:
App.setWindow("appCommW", document.getElementById("commM"));

//Set input datalist parameters:
App.setInputRangeDatalist(stepSizeInputDatalistParams);
App.setInputRangeDatalist(lineSpeedInputDatalistParams);
App.setInputRangeDatalist(lineOnInputDatalistParams);
App.setInputRangeDatalist(circleSpeedInputDatalistParams);
App.setInputRangeDatalist(circleOnInputDatalistParams);
App.setInputRangeDatalist(circleApertureInputDatalistParams);

//Load sky objects data and names:
App.loadItemsDataNames();

//Set pointer style options:
App.createComboOptions($objectPointerStyle, pointerStyleOptions);
App.createComboOptions($coordsPointerStyle, pointerStyleOptions);
App.createComboOptions($trackPointerStyle, trackStyleOptions);

//Set items type options:
for (let i in itemsElements) {
  let item = itemsElements[i];  
  App.createComboOptions(item["typeCombo"], item["options"]);  
  App.setFiltersEvents(item, filterComboMinLength);
  //Set initial navigation type option:  
  item["typeCombo"].selectedIndex = 1;
  App.changeObjectsType(item["typeCombo"]);
}

//Reset track events:
$navTracksCombo.addEventListener('change', NavW.resetTrack);
$navTracksCombo.addEventListener('click', NavW.resetTrack);
$trackPointerStyle.addEventListener('change', NavW.resetTrack);
$trackDate.addEventListener('change', NavW.resetTrack);
$trackTime.addEventListener('change', NavW.resetTrack);
$trackAtDatetime.addEventListener('change', NavW.resetTrack);

//Set initial step size:
Controller.updateStepSize();

//Set navigation actual time:
$objDate.value = App.localDateString(new Date());
$objTime.value = App.localTimeString(new Date());
$trackDate.value = App.localDateString(new Date());
$trackTime.value = App.localTimeString(new Date());

//Set pointer config initial options:
ConfigW.updatePointer('lineSpeed');
ConfigW.updatePointer('circleSpeed');
ConfigW.updatePointer('lineOn');
ConfigW.updatePointer('lineAng');
ConfigW.updatePointer('circleOn');
ConfigW.updatePointer('circleAp');
ConfigW.updatePointer('circleAng');

//Set initial controller width:
ConfigW.updateControllerWidth();

//Set inital trackCoords:
NavW.resetTrack();

//setTimeout(function(){ App.selectOptionByText($speechLanguage); }, 1000);