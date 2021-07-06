/* globals starnamesJSON, stars6JSON */ //Necessary to glitch recognize the library

//stars6JSON equatorial coordinates are: ra - the Right Ascension (-180° to 180°) coordinate and dec - the Declination (-90º to 90º) coordinate.

import {VecSP, CommSP, PathSP} from './modules/StarPointer.module.js';
import './libs/orb.v2.min.js';


/* --------------------
  Frontend constants */

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
const $circleApT = document.getElementById("circleApT");
const $circleAngR = document.getElementById("circleAngR");
const $circleAngT = document.getElementById("circleAngT");
const $precisePoint = document.getElementById("precisePoint");
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
const $navObjectsCombo = document.getElementById("navObjectsCombo");
const $navTracksCombo = document.getElementById("navTracksCombo");
const $trackAtDatetime = document.getElementById("trackAtDatetime");
const $trackCyclically = document.getElementById("trackCyclically");

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
  'max': 7,
  'step': 1,
  'init': 4,
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
  'max': 7,
  'step': 1,
  'init': 4,
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
let CoordNavW = new VecSP.Equatorial(0, 0);

let calibStars;
let stepSize;

let itemsNames = {};
let itemsData = {};

let trackPath = {'paths': [], 'fullPath': new PathSP.Path()};
let trackStep = -1;


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
  
  function coordinatesMakeLinear (data) {  
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
  coordinatesMakeLinear(asterismsData);

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
            console.log(opt);
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

CalibW.calcCalib = function (opt) {
	if (calibStars.length < 2) alert("You must add at least two calibration stars.");
	else {    
    CalibTemp.calcCalib(calibStars, opt)
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
    $calibLog.innerHTML += 'Maximum angle deviation of ' + maxStar + ': ' + max + '° (' + maxStep + ' steps).\n';    
    //alert("Calibration with " + String(calibStars.length) + " stars resulted in an average angle deviation of + dev + '° (' + devStep + ' steps). Press ACCEPT button to accept this calibration.");    
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
	await BleInstance.setZenith();
}

NavW.goObjectStyle = async function (style) {
  let path = new PathSP.Path();
  let cyclicOpt;
  switch (style) {
    case "point":
      let seg = new PathSP.Segment(CoordNavW, 1, 0);
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
      let ap = 0.5*$circleApR.value*Math.PI/180;      
      let inc = $circleAngR.value*Math.PI/180;  
      let delay = Number($circleSpeedR.value)*100;      
      let cp = Math.round(Number($circleOnR.value)/25);
      let lp = [cp, 4-cp];    
      let circle = new PathSP.makeCircle(CoordNavW, ap, inc, lp, delay);
	    path.addPath(circle);
      cyclicOpt = true;
      break;
  }
  let commPath = new CommSP.CommPath(path, CalibInstance);	
  await BleInstance.goPath(commPath, cyclicOpt);  
}

NavW.goEquatorial = async function () {	
  CoordNavW.ra = Number($raF.value);
  CoordNavW.dec = Number($decF.value);
  let style = $coordsPointerStyle.value;
  await NavW.goObjectStyle(style);
}

NavW.goSteps = async function () {	
  let step = new VecSP.Step(Number($fixI.value), Number($mobI.value));  
  let seg = new PathSP.Segment(step, 1, 0);
  let path = new PathSP.Path();
  path.addSegment(seg);
  let commPath = new CommSP.CommPath(path, CalibInstance);	
  let cyclicOpt = false;
  await BleInstance.goPath(commPath, cyclicOpt);  
}

NavW.readCoords = async function () {
  if (await BleInstance.readActSteps()) {				
	  	CoordNavW = CalibInstance.equatorialFromStep(BleInstance.actStep);
      $fixI.value = BleInstance.actStep.fix;
      $mobI.value = BleInstance.actStep.mob;
      $raF.value = CoordNavW.ra.toFixed(4); 
      $decF.value = CoordNavW.dec.toFixed(4);           
	  	NavW.updateCoordSys($raF);
      NavW.updateCoordSys($decF);
  }
}

NavW.showCoords = function () {  
  let opt = App.valueSelected($navObjectsCombo);    
  CoordNavW = App.equatorialFromObjectData(opt);
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
  CoordNavW = App.equatorialFromObjectData(opt, date);
  
  //await NavW.goObjectStyle(style);

  //Simulation:
  let theorEqVec = CoordNavW.toVector3();
  optimStep = CalibInstance.stepFromEquatorial(theorEqVec);
  optimStepVec = optimStep.toVector3();
  console.log('--------------------------------------');
  console.log("Nominal: Ra " + CoordNavW.ra + ", Dec: " + CoordNavW.dec);
  console.log("Optimiz: Fix " + optimStep.fix + ", Mob: " + optimStep.mob);
  console.log("Angle deviation: " + String(theorEqVec.angleTo(optimStepVec)*Math.PI/180));
}

NavW.goTrack = async function (opt) {
  let coords = true;
  if (trackStep < 0) {    
    let track = App.valueSelected($navTracksCombo).split("|");
    let trackType = track[0];
    let trackId = track[1];
    let date;
    if ($trackAtDatetime.checked) date = new Date($trackDate.value+'T'+$trackTime.value);
    else date = new Date();    
    coords = App.getCoordinates(trackType, trackId);        
    let trackArray = [];
    if (coords) {      
      let circle = App.valueSelected($trackPointerStyle).includes('circle');
      let solid = App.valueSelected($trackPointerStyle).includes('solid');
      let dashed = App.valueSelected($trackPointerStyle).includes('dashed');      
      let ldelay = Number($lineSpeedR.value)*100;
      let cdelay = Number($circleSpeedR.value)*100;
      let lp = Math.round(Number($lineOnR.value)/25);      
      let llp = solid ? [1, 0] : [lp, 4-lp];
      let cp = Math.round(Number($circleOnR.value)/25);
      let clp = [cp, 4-cp];
      let linc = $lineAngR.value*Math.PI/180;
      let cinc = $circleAngR.value*Math.PI/180;
      let cap = $circleApR.value*Math.PI/180;
      let dt = (date - new Date())*24/sideralDay;
      let n = coords.length-1;      
      for (let i = 0; i < n; i++) {
        let ra0 = App.ra180to24(coords[i][0]) + dt;
        let dec0 = coords[i][1];
        let ra1 = App.ra180to24(coords[i+1][0]) + dt;        
        let dec1 = coords[i+1][1];
        let eq0 = new VecSP.Equatorial(ra0, dec0);
        let eq1 = new VecSP.Equatorial(ra1, dec1);
        let circlePath = new PathSP.makeCircle(eq0, cap, cinc, clp, cdelay);
        circlePath.path[circlePath.size-1].laser = 0;
        if (circle) trackArray = trackArray.concat([circlePath]);        
        if (solid || dashed) trackArray = trackArray.concat([PathSP.makeGeodesic(eq0, eq1, linc, llp, ldelay)]);
      }      
      if (circle) {
        let ra = App.ra180to24(coords[n][0]) + dt;
        let dec = coords[n][1];
        let eq = new VecSP.Equatorial(ra, dec);
        trackArray = trackArray.concat([PathSP.makeCircle(eq, cap, cinc, clp, cdelay)]);        
      }
      trackPath.paths = trackArray;      
      for (let p of trackArray) trackPath.fullPath.addPath(p);
    } else alert("Track coordinates not found.");    
  }
  if (coords) {
    if (opt == 'fullTrack') {
      let commPath = new CommSP.CommPath(trackPath.fullPath, CalibInstance);	      
      await BleInstance.goPath(commPath, $trackCyclically.checked);
      NavW.resetTrack();
    }
    else {
      trackStep += Number(opt);
      trackStep = (trackPath.paths.length + trackStep)%trackPath.paths.length;
      let commPath = new CommSP.CommPath(trackPath.paths[trackStep], CalibInstance);	    
      await BleInstance.goPath(commPath, $trackCyclically.checked);    
    }
  }
}

NavW.resetTrack = function () {
  trackPath.segments = [];
  trackPath.fullPath = new PathSP.Path();
  trackStep = -1;
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
 * A namespace for the Help Window functions in the client app.
 * @namespace
 */
window.HelpW = {};

HelpW.updatePointer = function (option) {
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

HelpW.checkStatus = async function () {
  await BleInstance.checkStatus();
  document.getElementById("statusLog").innerHTML = String(BleInstance.serverStatus);
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


/**
 * A namespace for simulations of the optimization algorithms performance. It is not used by the client app.
 * @namespace
 */
 window.Sim = {};

Sim.createSimCalib = function () {
  let simCalib = new VecSP.Calibration();

  //Random axes:
  let deltaAxis = 0.0002*Math.PI/180;  
  let X = new THREE.Vector3(1.0, 0.0, 0.0);
  let Y = new THREE.Vector3(0.0, 1.0, 0.0);
  let Z = new THREE.Vector3(0.0, 0.0, 1.0);
  simCalib.params.fix.applyAxisAngle(X, (0.5-Math.random())*deltaAxis);
  simCalib.params.fix.applyAxisAngle(Z, (0.5-Math.random())*deltaAxis);
  simCalib.params.mob.applyAxisAngle(Y, (0.5-Math.random())*deltaAxis);
  simCalib.params.mob.applyAxisAngle(Z, (0.5-Math.random())*deltaAxis);
  simCalib.params.laser.applyAxisAngle(X, (0.5-Math.random())*deltaAxis);
  simCalib.params.laser.applyAxisAngle(Z, (0.5-Math.random())*deltaAxis);  

  //Random linear angle corrections:
  let delta_dTheta = Math.PI/10;  
  let delta_aAng = 0.2;
  simCalib.params.dTheta = (0.5-Math.random())*delta_dTheta;
  simCalib.params.aTheta = (0.5-Math.random())*delta_aAng + 1.0;
  simCalib.params.aPhi = (0.5-Math.random())*delta_aAng + 1.0;

  //Random Star Projector orientation relative to Equatorial system:
  simCalib.params.localToEquatorial = new THREE.Euler(Math.random()*2*Math.PI*0, Math.random()*2*Math.PI*0, Math.random()*2*Math.PI*0);
  let invM = new THREE.Matrix4().makeRotationFromEuler(simCalib.params.localToEquatorial).transpose();
	simCalib.params.equatorialToLocal.setFromRotationMatrix(invM);

  return simCalib;
}

Sim.simParams = {calib: Sim.createSimCalib()};

Sim.updateCalib = function (action) {    		
  
  let deltaEq = 0.5; //Random error in equatorial coords in degrees

  if ($calibObjectsCombo.innerText != null) {              
      if (action == "add") {                   
        let opt = App.valueSelected($calibObjectsCombo);                    
        let eq = App.equatorialFromObjectData(opt);

        //Random measurement procedure:
        let b = new VecSP.Equatorial(eq.ra, eq.dec + deltaEq*Math.random());            
        let v = b.toVector3();
        let c = eq.toVector3();
        v.applyAxisAngle(c, Math.random()*2*Math.PI);
        let eqMod = new VecSP.Equatorial();
        eqMod.fromVector3(v);

        let actStep = Sim.simParams.calib.stepFromEquatorial(eqMod);
        let name = App.textSelected($calibObjectsCombo);
        console.log(name.split("|")[0] + " added with fix: " + actStep.fix + ", mob: " + actStep.mob);
        if (eq) {
          let t = new Date();
          let s = new VecSP.CalibStar(App.textSelected($calibObjectsCombo), t, actStep, eq);
          calibStars.push(s);              
        }        
      }

      $calibListCombo.innerText = null;   
      for (let i = 0; i < calibStars.length; i++) {
          let option = document.createElement("option");
          option.text = calibStars[i].text;
          $calibListCombo.add(option);
      }
      $calibListCombo.selectedIndex = Math.max(0, calibStars.length-1);      
  }
}

//Set initial window:
App.setWindow("appCalibW");

//Set input datalist parameters:
App.setInputRangeDatalist(stepSizeInputDatalistParams);
App.setInputRangeDatalist(lineSpeedInputDatalistParams);
App.setInputRangeDatalist(lineOnInputDatalistParams);
App.setInputRangeDatalist(circleSpeedInputDatalistParams);
App.setInputRangeDatalist(circleOnInputDatalistParams);

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
  item["typeCombo"].selectedIndex = 0;
  App.changeObjectsType(item["typeCombo"]);
}

//Set initial step size:
Controller.updateStepSize();

//Set navigation actual time:
$objDate.value = App.localDateString(new Date());
$objTime.value = App.localTimeString(new Date());
$trackDate.value = App.localDateString(new Date());
$trackTime.value = App.localTimeString(new Date());

//Set pointer config initial options:
HelpW.updatePointer('lineSpeed');
HelpW.updatePointer('circleSpeed');
HelpW.updatePointer('lineOn');
HelpW.updatePointer('lineAng');
HelpW.updatePointer('circleOn');
HelpW.updatePointer('circleAp');
HelpW.updatePointer('circleAng');


//Initialize calib stars list:
calibStars = [];

//Simulate initial calibration. Atention: comment these commands for real operation
CalibInstance = Sim.simParams.calib.clone();
CalibTemp = Sim.simParams.calib.clone();

console.log(new VecSP.Spherical(2.0, 4.0));