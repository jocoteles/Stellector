/**
 * JS Module for the StarPointer app.
 * @module libs/StarPointer
 * @see module:libs/StarPointer.module.js
 */

import '../libs/three.min.js';
import '../libs/optimization.js'

/**
 * @param {Object} ESP32 - constants used in the ESP32 server
 */
let ESP32 = {
	STPS360: 2048,				//steppers number of steps for a 360º rotation
	ZENITH_STEP: 512,			//steppers step values corresponding to the Zenith direction
	PATHBASE: [1, 9, 11, 11],	//number of bits of the base used to represent the path segments, respectively for: laser state, step delay, phi step, theta step
	COMMBASE: [8, 8, 8, 8],	//number of bits of the base used to communicate the path segments
	RESET_PATH_OPT: 1,       	//option to start a new path reading
	EXEC_PATH_OPT: 2,        	//option to execute the path
	CYCLIC_PATH_OPT: 3,     	//option to execute the path cyclicaly
	LASER_ON_OPT: 4,         	//option to turn on the laser
	LASER_OFF_OPT: 5,        	//option to turn off the laser
	SET_ZENITH_OPT: 6,       	//option to point the laser toward zenith
	READ_ACT_STEPS_OPT: 7,		//option to read the steppers actual steps
	MAIN_S_UUID: "e80fd323-0ae1-454f-bbd5-31b571083af5",  //The single service for all device's characteristics
	PATH_C_UUID: "20e75b2b-6be1-4b18-b1d0-a06018dbdab5",  //characteristic for the path array
	POS_MEASURE_C_UUID: "e16843eb-fe97-42b4-acc7-83069473c1b5",  //characteristic for measuring the steppers position
	DEVICE_NAME: "StarProjector"
};


/**
 * A namespace for the vector operations in the StarPointer app'.
 * @namespace
 */
let VecSP = {};


/** Class representing a unity vector in equatorial coordinates with RA ranging from 0 to 24hs. */
VecSP.Equatorial = class {
    /**
     * Create a RA 24hs equatorial representation of a unity vector.
     * @param {number} ra - the Right Ascension (0 to 24hs) coordinate.
	 * @param {number} dec - the Declination (-90º to 90º) coordinate.
     */
    constructor (ra = 0.0, dec = 0.0) {
		this._ra = ra;
		this._dec = dec;
		this.correctCoords();
	}
	/** Set this.ra */
	set ra (ra) {
		this._ra = ra;
		this.correctCoords();
	}
	/** Set this.dec */
	set dec (dec) {		
		this._dec = dec;
		this.correctCoords();
	}
	/** Get this.ra */
	get ra () {		
		return this._ra;
	}
	/** Get this.dec */
	get dec () {		
		return this._dec;
	}
	/** Correct coordinates to their boundary values */
	correctCoords () {
		let n = Math.ceil(Math.abs(this._ra)/24);
		this._ra = (n*24 + this._ra) % 24;
		this._dec = Math.sign(this._dec)*Math.min(Math.abs(this._dec), 90);
	}
	/**
	 * Return the rectangular representation of this object.
	 * @returns {THREE.Vector3} rectangular representation of this object.
	 */
	toVector3 () {
		let phi = this.ra*Math.PI/12;
		let theta = (90-this.dec)*Math.PI/180;				
		return new THREE.Vector3().setFromSphericalCoords(1.0, theta, phi);
		//Phi and theta are exchanged in Three.js in relation with the usual notation
	}
	/**
	 * Set this object from rectangular representation.	 
	 * @param {THREE.Vector3} vec - rectangular representation of a vector.
	 */
	fromVector3 (vec) {
		let sph = new THREE.Spherical().setFromVector3(vec);
		this.ra = sph.theta*12/Math.PI;
		this.dec = (90-sph.phi*180/Math.PI);
		//Phi and theta are exchanged in Three.js in relation with the usual notation
	}
	/**
	 * Make a copy of this vector.
	 * @returns {VecSP.Equatorial} copy of this vector.
	 */
	clone () {
		return new VecSP.Equatorial(this.ra, this.dec);
	}
}

/** Class representing a unity vector in step motor steps. */
VecSP.Step = class {
    /**
     * Create a step motor steps representation of a unity vector.
     * @param {number} fix - the fixed motor step (0 to this.maxSteps) coordinate.
	 * @param {number} mob - the mobile motor step (0 to this.maxSteps) coordinate.
     */
    constructor (fix = 0, mob = 0) {
		this._fix = fix;
		this._mob = mob;
		this.maxSteps = ESP32.STPS360;
		this.zenithSteps = ESP32.ZENITH_STEP;
		this.correctCoords();
	}
	/** Set this.fix */
	set fix (fix) {
		this._fix = fix;
		this.correctCoords();
	}
	/** Set this.mob */
	set mob (mob) {
		this._mob = mob;
		this.correctCoords();
	}
	/** Get this.fix */
	get fix () {
		let n = Math.ceil(Math.abs(this._fix)/this.maxSteps);
		return (n*this.maxSteps + this._fix) % this.maxSteps;
	}
	/** Get this.mob */
	get mob () {
		let n = Math.ceil(Math.abs(this._mob)/this.maxSteps);
		return (n*this.maxSteps + this._mob) % this.maxSteps;
	}
	/** Correct coordinates to their boundary values */
	correctCoords () {
		let nf = Math.ceil(Math.abs(this._fix)/this.maxSteps);
		let nm = Math.ceil(Math.abs(this._mob)/this.maxSteps);
		this._fix = (nf*this.maxSteps + this._fix) % this.maxSteps;
		this._mob = (nm*this.maxSteps + this._mob) % this.maxSteps;
	}
	/**
	 * Return the rectangular representation of this object.
	 * @returns {THREE.Vector3} rectangular representation of this object.
	 */
	toVector3 () {
		let phi = this.fix*2*Math.PI/this.maxSteps;
		let theta = Math.PI - this.mob*2*Math.PI/this.maxSteps;		
		return new THREE.Vector3().setFromSphericalCoords(1.0, theta, phi);
		//Phi and theta are exchanged in Three.js in relation with the usual notation
	}
	/**
	 * Set this object from rectangular representation.	 
	 * @param {THREE.Vector3} vec - rectangular representation of a vector.
	 */
	fromVector3 (vec) {
		let sph = new THREE.Spherical().setFromVector3(vec);
		this.fix = Math.round(sph.theta*this.maxSteps/(2*Math.PI));
		this.mob = Math.round((Math.PI - sph.phi)*this.maxSteps/(2*Math.PI));
		//Phi and theta are exchanged in Three.js in relation with the usual notation
	}
	/**
	 * Make a copy of this vector.
	 * @returns {VecSP.Step} copy of this vector.
	 */
	clone() {
		return new VecSP.Step(this.fix, this.mob);
	}	
}


/** Class representing a calibration star object. */
VecSP.CalibStar = class {
	/**
	 * Crate a calib star object.
	 * @param {string} text - a text output with this star information
	 * @param {string} value - a unique Id for this star object
	 * @param {Date} date - date when the star object was measured by the StarProjector system
	 * @param {VecSP.Step} step - local steppers coordinates for the star object
	 * @param {VecSP.Equatorial} eq - celestial equatorial coordinates for the star object
	 */
	constructor (text = null, value = null, date = null, step = null, eq = null) {
		this.text = text;
		this.value = value;
		this.date = date;
		this.step = step;
		this.eq = eq;
	}
}

/**Class to perform the calibration of the steppers local reference frame with respect to the equatorial celestial reference frame.*/
VecSP.Calibration = class {
	/**
	 *  Cretate a calibration object.  
	 */
    constructor() {
		/**@member {VecSP.CalibStar[]} - Array of star objects used to perform calibration of the reference frame. */
		this.stars = [];
		/**@member {THREE.Vector3[]} - Celestial equatorial coordinates of this.stars. */
		this.equatorials = [];
		/**@member {THREE.Vector3[]} - Local steps coordinates of this.stars. */
		this.steps = [];
		/**@member {THREE.Euler} - Euler angles associated with the transformation from celestial to local reference frame. */
		this.eulerCelestialToLocal = new THREE.Euler();
		/**@member {THREE.Euler} - Euler angles associated with the transformation from local to celestial reference frame. */
		this.eulerLocalToCelestial = new THREE.Euler();		
		/**@member {Date} - First calib star date of assignment to calibration */
		this.t0 = new Date();
		/**@member {object} - Calibration statistics */
		this.stats = {dev: 0, min: 0, max: 0, minStar: null, maxStar: null};
	}
	/**
	 * Find the Euler rotations that relate the local reference system to the celestial reference system..
	 * @param {VecSP.CalibStar[]} stars - array of calibration stars 
	 */	
    calcCalib (stars) {
		this.stars = stars;
		this.t0 = stars[0].date;
		this.equatorials = [];
		this.steps = [];
		for (let s of this.stars) {
			this.equatorials.push(s.eq.toVector3());
			this.steps.push(s.step.toVector3())
		}
		window.euler = this.eulerLocalToCelestial;
		window.stars = this.stars;
		window.steps = this.steps;
		window.equatorials = this.equatorials;
		let optimFunction = function (angs) {
			window.euler.fromArray(angs);
			let N = window.stars.length;
			let dev = 0;		
			let eq;
			for (let i = 0; i < N; i++) {
				eq = window.steps[i].clone().applyEuler(window.euler);
				dev += window.equatorials[i].dot(eq);
			}
			return N - dev;
		}
		let angs = [[0,0,0],[1.5,0,0],[0,1.5,0],[0,0,1.5],[1.5,1.5,0],[1.5,0,1.5],[0,1.5,1.5],[1.5,1.5,1.5],[-1.5,0,0],[0,-1.5,0],[0,0,-1.5],[-1.5,-1.5,0],[-1.5,0,-1.5],[0,-1.5,-1.5],[-1.5,-1.5,-1.5]];		
		let optAngs;
		let bestValue = 1000;
		for (let i = 0; i < angs.length; i++) {
			let res = optimjs.minimize_Powell(optimFunction, angs[i]);
			if (res.fncvalue < bestValue) {
				bestValue = res.fncvalue;
				optAngs = res.argument;
			}
		}
		this.eulerLocalToCelestial.fromArray(optAngs);
		let invM = new THREE.Matrix4().makeRotationFromEuler(this.eulerLocalToCelestial).transpose();
		this.eulerCelestialToLocal.setFromRotationMatrix(invM);
		this.stats.dev = 0;
		this.stats.min = 1e3;
		this.stats.max = 0;
		let eq1, eq2, ang;
		for (let s of this.stars) {
			eq1 = this.celestialFromLocal(s.step).toVector3();				
			eq2 = s.eq.toVector3();
			ang = eq1.angleTo(eq2)*180/Math.PI;
			if (ang < this.stats.min) {
				this.stats.min = ang;
				this.stats.minStar = s.text;
			}
			if (ang > this.stats.max) {
				this.stats.max = ang;
				this.stats.maxStar = s.text;
			}
			this.stats.dev += ang/this.stars.length;
		}			
	}
	/**
	 * Local to Celestial convertion on the date of this function call.
	 * @param {VecSP.Step} s - local coordinate
	 * @returns {VecSP.Equatorial} celestial coordinate
	 */
	celestialFromLocal (s) {		
		let eq3 = s.toVector3()
		eq3.applyEuler(this.eulerLocalToCelestial);
		let eq = new VecSP.Equatorial();
		eq.fromVector3(eq3);
		let d = new Date();
		eq.ra += (d - this.t0)/3.6e6;
		return eq;
	}
	/**
	 * Celestial to Local convertion on the date of this function call.
	 * @param {VecSP.Equatorial} eq - celestial coordinate
	 * @returns {VecSP.Step} local coordinate
	 */
	localFromCelestial (eq0) {		
		let eq = eq0.clone();
		let d = new Date();
		eq.ra -= (d - this.t0)/3.6e6;
		let step3 = eq.toVector3().applyEuler(this.eulerCelestialToLocal);
		let step = new VecSP.Step();
		step.fromVector3(step3);
		return step;
	}
	/**
	 * Make a copy of this object.
	 * @returns {VecSP.Calib} copy of this object.
	 */
	clone () {
		let Calib = new VecSP.Calibration();
		Calib.stars = this.stars;
		Calib.equatorials = this.equatorials;
		Calib.steps = this.steps;
		Calib.eulerCelestialToLocal = this.eulerCelestialToLocal;
		Calib.eulerLocalToCelestial = this.eulerLocalToCelestial;
		Calib.t0 = this.t0;		
		for (let x in this.stats) Calib.stats[x] = this.stats[x];
		return Calib;
	}
}

/**
 * A namespace for the Communication operations between the StarPointer WebApp client and the ESP32 server.
 * @namespace
 */
let CommSP = {};

/**Class for the parsed path construction */
CommSP.CommPath = class {
	/**Create a parsed path to send to the ESP32 server.
	 * @param {PathSP.Path} Path - Path to be parsed.
	 * @param {VecSP.Calibration} Calib - calibration used to transform celestial to step coordinates
	*/
	constructor (Path, Calib) {
		/**@member {number[]} - Number of bits of the base used to represent the path segments, respectively for: laser state, step delay, fix step, mob step. */
		this._encBase = ESP32.PATHBASE;
		/**@member {number[]} - Number of bits of the base used to communicate the path segments. */
		this._decBase = ESP32.COMMBASE;
		/**@member {PathSP.Path} */
		this._path = Path;
		/**@member {VecSP.Calibration} */
		this.calib = Calib;
		/**@member {number[]} - Parsed path obtained from this._path. */
		this._parsedPath = [];
		this.composePath();
	}
	/**Parse a segment to be added to a parsed path.
	 * @param {PathSP.Segment} Segment - Segment to be parsed.
	 * @returns {number[]} Array with decBase size representing the parsed segment.
	 */
	parseSegment (Segment) {
		//Encoding to this._encBase:
		let step = this.calib.localFromCelestial(Segment.eq);
		let data = [Segment.laser, Segment.delay, step.fix, step.mob];
		let x = 0;
		let b = 0;
		for (let i = 0; i < this._encBase.length; i++) {
			x += data[i]*2**b;
			b += this._encBase[i];
		}
		//Decoding to this._decBase:
		let b0 = 0;
		let r0 = x;
		let r = [];
		for (let i = 0; i < this._decBase.length; i++) {
			r.push( Math.trunc(r0 / 2**b0) % 2**this._decBase[i] );
			b0 += this._decBase[i];
			r0 -= r[i];
		}
		return r;
	}
	/**Method for parsing this._path. */
	composePath () {		
		this._parsedPath = [];
		for (let i = 0; i < this._path.size; i++) {			
			let s = this.parseSegment(this._path.path[i]);
			this._parsedPath = this._parsedPath.concat(s);
		}
	}
	/**Set path. */
	set path (Path) {
		this._path = Path;
		this.composePath();
	}
	/**Set encBase. */
	set encBase (encBase) {
		this._encBase = encBase;
		this.composePath();
	}
	/**Set decBase. */
	set decBase (decBase) {
		this._decBase = decBase;
		this.composePath();
	}
	/**Get path. */
	get path () {
		return this._path;
	}
	/**Get encBase. */
	get encBase () {
		return this._encBase;
	}
	/**Get decBase. */
	get decBase () {
		return this._decBase;
	}
	/**Get parsedPath. */
	get parsedPath () {
		this.composePath();
		return this._parsedPath;
	}
	/**Get this path size */
	get size () {
		return this._path.size;
	}
}

/**Class to communicate via Low Energy Bluetooth with the Star Pointer ESP32 server.
 * @param {Object} - DOM element whose innerHTML attribute receives the communication logs.
*/
CommSP.Bluetooth = class {
	constructor (logDOM) {
		/**@member {string} - Server device name.*/
		this.deviceName = ESP32.DEVICE_NAME;
		/**@member {string} - The single service for all device's characteristics.*/
		this.mainS_UUID = ESP32.MAIN_S_UUID;
		/**@member {string} - Characteristic UUID for the CommSP.parsedPath transmission.*/
		this.pathC_UUID = ESP32.PATH_C_UUID;
		/**@member {string} - Characteristic UUID for measuring the steppers position.*/
		this.posMeasureC_UUID = ESP32.POS_MEASURE_C_UUID;
		/**@member {Object} - Characteristic for the CommSP.parsedPath transmission.*/
		this.pathC = NaN;
		/**@member {Object} - Characteristic for measuring the steppers position.*/
		this.posMeasureC = NaN;
		/**@member {Object} - DOM element whose innerHTML attribute receives the communication logs.*/
		this.logDOM = logDOM;
		/**@member {number} - 1 byte array maximum size to be sent to the server. */
		this.maxChunk = 512;
		/**@member {Object} - Execution options to ESP32 server. */
		this.Opt = {	resetPath: ESP32.RESET_PATH_OPT,       	//start a new path reading
						execPath: ESP32.EXEC_PATH_OPT,        	//execute the path
						cyclicPath: ESP32.CYCLIC_PATH_OPT,      //execute the path cyclicaly
						laserOn: ESP32.LASER_ON_OPT,			//turn on the laser in the navigation mode
						laserOff: ESP32.LASER_OFF_OPT,	        //turn off the laser in the navigation mode
						setZenith: ESP32.SET_ZENITH_OPT,       	//point the laser towards zenith
						readActSteps: ESP32.READ_ACT_STEPS_OPT	//read the steppers actual steps
		}
		/**@member {VecSP.Step} - the steppers fix and mob coordinates obtained from the accelerometer readings. */
		this.actStep = new VecSP.Step(0, 0);
	}
	/**Return actual time in the format: hours minutes seconds. */
	time () {
		let d = new Date();
		return d.getHours() + 'h' + d.getMinutes() + 'm' + d.getSeconds() + 's: ';
	}
	/**Start bluetooth communication with ESP32 server.
	 * @returns {boolean} connection status.
	*/
	async startComm () {
		let deviceOptions = {
			filters: [{ name: this.deviceName }],
			optionalServices: [
			  this.mainS_UUID, 
			  this.pathC_UUID,    
			  this.posMeasureC_UUID]};
		try {
			this.logDOM.innerHTML = this.time() + 'Requesting StarPointer Device...\n';      
			this.device = await navigator.bluetooth.requestDevice(deviceOptions);
			
			this.logDOM.innerHTML += this.time() + 'Connecting to GATT Server...\n';
			this.server = await this.device.gatt.connect();
			
			this.logDOM.innerHTML += this.time() + 'Getting GAP Services...\n';
			this.mainS = await this.server.getPrimaryService(this.mainS_UUID);
			
			this.logDOM.innerHTML += this.time() + 'Getting GAP Characteristics...\n';
			this.pathC = await this.mainS.getCharacteristic(this.pathC_UUID);
			this.posMeasureC = await this.mainS.getCharacteristic(this.posMeasureC_UUID);
			this.logDOM.innerHTML += this.time() + 'Connected to StarPointer on ESP32 Server.\n';
			return true;    
		}
		catch(error) {
			this.logDOM.innerHTML += error + '\n';
			return false;
		}	
	}
	async disconnectMsg () {
		this.logDOM.innerHTML += this.time() + 'StarPointer disconnected!\n';
		alert('StarPointer disconnected! Start comm again.');
		return false;
	}
    
	/** Send a this.Opt item to ESP32 Server.
	 * @param {string} option - A valid this.Opt item.
	*/
	async sendOption (option) {
		if (Object.keys(this.Opt).includes(option)) {
			await this.pathC.writeValue(new Uint8Array([this.Opt[option]]));
			this.logDOM.innerHTML += this.time() + 'Option ' + option + ' sent to Server.\n';
		    return true;
		}
		else {
		  this.logDOM.innerHTML += this.time() + 'Option ' + option + ' not recognized. Nothing sent to Server.\n';
		  return false;
		}
	}
	/** Execute a step size on steppers in the ESP32 server.
	 * @param {number} stepSize - Step size between 1 and 128.
	 * @param {string} dirs - String in the format 'xab', where x is any alphabetic character, a and b control the fixed and mobile steppers, respectively, and each one can assume the characters: '0' = move backward, '1' = stay still, and '2' = move forward.
	 */
	async goStepSize (stepSize, dirs) {
		try {
			let m = stepSize;
			let fix = Math.max((parseInt(dirs[1])-1)*m + 127, 0);
			let mob = Math.max((parseInt(dirs[2])-1)*m + 127, 0);
			await this.pathC.writeValue(new Uint8Array([fix, mob]));
			this.logDOM.innerHTML += this.time() + 'Step size of (' + (fix-127) + ',' + (mob-127) + ') sent to (fixed,mobile) steppers on Server.\n';
			return true;
		} catch {return await this.disconnectMsg();}
	}
	/**Execute a parsedPath on steppers in the ESP32 server.
	 * @param {CommSP.CommPath} Path - Path to be executed by the ESP32 server steppers.
	 * @param {boolean} cyclicOpt - If false, Path is executed once, else it is excuted cyclicaly until stop signal.
	 */
	async goPath (Path, cyclicOpt = false) {  
	    try {
			await this.sendOption('resetPath');
			let j = 0;
			let pathChunk;
			let path = Path.parsedPath;
			for (let i = 0; i < path.length; i++) {
					j = i % this.maxChunk;
				if (j == 0) {      
					if (path.length - i >= this.maxChunk) pathChunk = new Uint8Array(this.maxChunk);
					else pathChunk = new Uint8Array(path.length - i);
				}
				pathChunk[j] = path[i];
				if ((j == this.maxChunk - 1) || (i == path.length -1)) {
					await this.pathC.writeValue(pathChunk);
				}
			}
			this.logDOM.innerHTML += this.time() + 'Path with ' + Path.size + ' segments sent to Server.\n';
			if (cyclicOpt) await this.sendOption('cyclicPath');
			else await this.sendOption('execPath');
			this.logDOM.innerHTML += this.time() + 'Path execution with Cyclic Option = ' + cyclicOpt + '.\n';
			return true;
		} catch {return await this.disconnectMsg();}
	}
	/** Turn on/off the laser in the ESP32 server.
	 * @param {boolean} status - turn the laser on(off) if true(false). 
	 */
	async goLaser (status = false) {
		try {
			if (status) {
				await this.pathC.writeValue(new Uint8Array([this.Opt.laserOn]));
				this.logDOM.innerHTML += this.time() + "Laser turned on.\n";			
			}
			else {
				await this.pathC.writeValue(new Uint8Array([this.Opt.laserOff]));
				this.logDOM.innerHTML += this.time() + "Laser turned off.\n";
			}
			return true;
		} catch {return await this.disconnectMsg();}		
	}
	/** Move the steppers in the ESP32 server until the laser points toward zenith.	 
	 */
	async goZenith() {
		try {
			await this.pathC.writeValue(new Uint8Array([this.Opt.setZenith]));
			this.logDOM.innerHTML += this.time() + "Laser beam pointed to zenith.\n";
			return true;
		} catch {return await this.disconnectMsg();}
	}
	/** Read (using the server accelerometer) the steppers fix and mob coordinates in the ESP32 server.
	 */
	async readActSteps () {		
	    try {
			await this.pathC.writeValue(new Uint8Array([this.Opt.readActSteps]));
			let value = await this.posMeasureC.readValue();		
			let fix = value.getUint8(0)*256 + value.getUint8(1);
			let mob = value.getUint8(2)*256 + value.getUint8(3);
			this.logDOM.innerHTML += this.time() + 'Actual steps readings from server: fix=' + fix + ', mob=' + mob + '\n';
			this.actStep = new VecSP.Step(fix, mob);		
			return true;
		} catch {return await this.disconnectMsg();}
	}
}


/**
 * A namespace for the Path operations in the StarPointer app'.
 * @namespace
 */
let PathSP = {};

/** Class for the Star Pointer Segment construction. */
PathSP.Segment = class {
    /**
     * Create a segment for the path followed by the Star Pointer composed by ra and dec equatorial coords, laser status and time delay between steps.
	 * @param {VecSP.Equatorial} eq - equatorial coords of the path segment.
	 * @param {number} laser - Laser state: 0 = off, 1 = on.
	 * @param {number} delay - Time delay between steppers sucessive steps in multiples of 100 us.
     */
	constructor (eq, laser, delay) {
		this.eq = eq;
		this.laser = laser;
		this.delay = delay;
	}
}

/**Class for the Star Pointer General Path construction. */
PathSP.Path = class {
    /**Create the path followed by the Star Pointer composed by ra and dec equatorial coords, laser status and time delay between steps. */
	constructor () {
		this.reset();
	}
	/**Reset PathSP.Path variables */
    reset () {		
		/**@member {PathSP.Segment[]} - array of Segment objects. */
		this.path = [];
		/**@member {number} - Path.path number of segments. */
		this.size = 0;
		/**@member {number} - Sum of all Path.path segments delay in 100 us unit. */
		this.duration = 0;
	}
	/**Add segment object to the path.
	 * @param {PathSP.Segment} Segment
	 */
	addSegment (Segment) {
		this.path.push(Segment);
		this.size = this.path.length;
		this.duration += Segment.delay;
	}
	/** Concatenate path.
	 *  @param {PathSP.Path} Path
	 */
	addPath (Path) {
		this.path.push(Path.path);
		this.size += Path.size;
		this.duration += Path.duration;
	}
}

/** Function to generate a circular path trajectory.
*   @param {VecSP.Equatorial} Center - celestial coordinate of circle center.
*	@param {number|VecSP.Equatorial} border - circle angle aperture in rad or celestial coordinate of a point at the circle border.
*	@param {number} angleIncrement - angle step for the circle discretization in rad.
*	@param {Array} lpattern - [laser on number of steps, laser off number of steps].
*	@param {number} delay - time delay between steppers sucessive steps in multiples of 100 us.
*	@returns {PathSP.Path} path for the circular trajectory.
*/
PathSP.makeCircle = function (Center, border, angleIncrement, lpattern, delay) {
	let path = new PathSP.Path();
	let c = Center.toVector3();
	let b;
	if (typeof(border.phi) == 'undefined') {
		b = new VecSP.Equatorial(Center.ra, Center.dec+border*180/Math.PI);		
	}
	else {
		b = border;
	}
	let v0 = b.toVector3();
	let N = Math.round(2*Math.PI/angleIncrement);		
	let r = lpattern[0] + lpattern[1];	
	let laser;	
	for (let i = 0; i < N; i++) {
		let v = v0.clone();
		v.applyAxisAngle(c, i*angleIncrement);
		laser = 0;
		if ((i%r) < lpattern[0]) laser = 1;
		let eq = new VecSP.Equatorial();
		eq.fromVector3(v);
		let segment = new PathSP.Segment(eq, laser, delay);
		path.addSegment(segment);
	}
	return path;   
}

export {VecSP, CommSP, PathSP};