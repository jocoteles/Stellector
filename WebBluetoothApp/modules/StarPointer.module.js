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
	STPS360: 2038,				//steppers number of steps for a 360º rotation
	ZENITH_STEP: 510,			//steppers step values corresponding to the Zenith direction
	STEP_MIN: 30,				//steppers step min value for eye laser safety 
	STEP_MAX: 989,				//steppers step max value for eye laser safety 
	PATHBASE: [1, 9, 11, 11],	//number of bits of the base used to represent the path segments, respectively for: laser state, step delay, phi step, theta step
	COMMBASE: [8, 8, 8, 8],		//number of bits of the base used to communicate the path segments
	RESET_PATH_OPT: 1,       	//option to start a new path reading
	EXEC_PATH_OPT: 2,        	//option to execute the path
	CYCLIC_PATH_OPT: 3,     	//option to execute the path cyclicaly
	LASER_SWITCH_OPT: 4,       	//option to turn on the laser
	SET_ZENITH_OPT: 5,       	//option to point the laser toward zenith
	READ_ACT_STEPS_OPT: 6,		//option to read the steppers actual steps
	RESET_PATH_ST: 1,			//status to start a new path reading
	EXEC_PATH_ST: 2,			//status to execute the path
	CYCLIC_PATH_ST: 3,			//status to execute the path cyclicaly
	LASER_ON_ST: 4,				//status to turn on the laser
	LASER_OFF_ST: 5,			//status to turn off the laser
	SET_ZENITH_ST: 6,			//status to point the laser toward zenith
	READ_ACT_STEPS_ST: 7,		//status to read the steppers actual steps
	IDLE_ST: 8,					//status for the idle hardware state
	MAIN_S_UUID: "b75dac84-0213-4580-9213-c17f932a719c",  		//The single service for all device's characteristics
	PATH_C_UUID: "6309b82c-ff09-4957-a51b-b63aefd95b39",		//characteristic for the path array
	POS_MEASURE_C_UUID: "34331e8c-74bd-4219-aab0-5909aeea3c4e",  //characteristic for measuring the steppers position
	STATUS_C_UUID: "46425bca-0669-4f53-81bb-2bf67a3a1141",  	//characteristic for indicating the hardware status
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
		/**@member {number} - Number of tries used by the optmization algorithm. */
		this.minimizationTries = 10;
	}
	/**
	 * Find the Euler rotations that relate the local reference system to the celestial reference system.
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
		let dims = [optimjs.Real(0, 2*Math.Pi), optimjs.Real(0, 2*Math.Pi), optimjs.Real(0, 2*Math.Pi)];		
		let optAngs;
		let bestValue = 1000;
		for (let i = 0; i < this.minimizationTries; i++) {
			let dres = optimjs.dummy_minimize(optimFunction, dims, n_calls=256);
			let res = optimjs.minimize_Powell(optimFunction, dres.best_x);
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
			eq1 = this.equatorialFromStep(s.step).toVector3();				
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
	 * Celestial from Local coordinates convertion on the given date.
	 * @param {VecSP.Step} s - local coordinate
	 * @param {Date} d - given date (actual date, if ommitted)
	 * @returns {VecSP.Equatorial} celestial coordinate
	 */
	equatorialFromStep (s, d = new Date()) {		
		let eq3 = s.toVector3()
		eq3.applyEuler(this.eulerLocalToCelestial);
		let eq = new VecSP.Equatorial();
		eq.fromVector3(eq3);		
		eq.ra += (d - this.t0)/3.6e6;
		return eq;
	}
	/**
	 * Local from Celestial coordinates convertion on the given date.
	 * @param {VecSP.Equatorial} eq - celestial coordinate
	 * @param {Date} d - given date (actual date, if ommitted)
	 * @returns {VecSP.Step} local coordinate
	 */
	stepFromEquatorial (eq0, d = new Date()) {		
		let eq = eq0.clone();		
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
		/**@member {boolean} - True if this._parsedPath is out of steppers bounds. */
		this.clipped = false;
		this.composePath();
	}
	/**Parse a segment to be added to a parsed path.
	 * @param {PathSP.Segment} Segment - Segment to be parsed.
	 * @returns {number[]} Array with decBase size representing the parsed segment.
	 */
	parseSegment (Segment) {
		//Encoding to this._encBase:		
		let step = this.calib.stepFromEquatorial(Segment.eq);
		//console.log(Segment.eq);
		//console.log(step);
		if (step.fix < ESP32.STEP_MIN || step.fix > ESP32.STEP_MAX || step.mob < ESP32.STEP_MIN || step.mob > ESP32.STEP_MAX) {
			this.clipped = true;
			return false;
		}
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
		this.clipped = false;
		for (let i = 0; i < this._path.size; i++) {					    
			let s = this.parseSegment(this._path.path[i]);
			if (s) this._parsedPath = this._parsedPath.concat(s);
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
		/**@member {string} - Characteristic UUID for measuring ESP32 status.*/
		this.statusC_UUID = ESP32.STATUS_C_UUID;
		/**@member {Object} - Characteristic for the CommSP.parsedPath transmission.*/
		this.pathC = NaN;
		/**@member {Object} - Characteristic for measuring the steppers position.*/
		this.posMeasureC = NaN;
		/**@member {Object} - DOM element whose innerHTML attribute receives the communication logs.*/
		this.logDOM = logDOM;
		/**@member {number} - 1 byte array maximum size to be sent to the server. */
		this.maxChunk = 512;
		/**@member {Object} - Execution options to ESP32 server. */
		this.OPT = ESP32;
		/**@member {VecSP.Step} - the steppers fix and mob coordinates obtained from the accelerometer readings. */
		this.actStep = new VecSP.Step(0, 0);
		this.serverStatus = 0;		
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
				this.posMeasureC_UUID,
				this.statusC_UUID]};
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
			this.statusC = await this.mainS.getCharacteristic(this.statusC_UUID);
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
		if (Object.keys(this.OPT).includes(option)) {
			await this.pathC.writeValue(new Uint8Array([this.OPT[option]]));
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
		console.log(Path);
	    try {			
			let path = Path.parsedPath;			
			if (path.length == 0) alert ('Path execution ignored due to steppers elevation out of bounds.');
			else {
				if (Path.clipped) alert('Path clipped due to steppers elevation out of bounds.');
				await this.sendOption('RESET_PATH_OPT');
				let j = 0;
				let pathChunk;
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
				if (cyclicOpt) await this.sendOption('CYCLIC_PATH_OPT');
				else await this.sendOption('EXEC_PATH_OPT');
				this.logDOM.innerHTML += this.time() + 'Path execution with Cyclic Option = ' + cyclicOpt + '.\n';
				return true;
			}
		} catch {return await this.disconnectMsg();}
	}
	/** Switch the laser status on/off in the ESP32 server. */
	async goLaser () {
		try {
			let status = await this.checkStatus();	
			if ((status == this.OPT.LASER_OFF_ST) || (status == this.OPT.LASER_ON_ST)) {
				await this.pathC.writeValue(new Uint8Array([this.OPT.LASER_SWITCH_OPT]));								
				let s = await this.checkStatus();
				switch (s) {
					case ESP32.LASER_ON_ST:							
						this.logDOM.innerHTML += this.time() + "Laser state is on.\n";
						break;
					case ESP32.LASER_OFF_ST:
						this.logDOM.innerHTML += this.time() + "Laser state is off.\n";
						break;
					default:				
						this.logDOM.innerHTML += this.time() + "Laser state is busy.\n";					
				}
			}
		} catch {return await this.disconnectMsg();}		
	}
	/** Move the steppers in the ESP32 server until the laser points toward zenith.	 
	 */
	async goZenith() {
		try {
			await this.pathC.writeValue(new Uint8Array([this.OPT.SET_ZENITH_OPT]));
			this.logDOM.innerHTML += this.time() + "Laser beam pointed to zenith.\n";
			return true;
		} catch {return await this.disconnectMsg();}
	}
	/** Read (using the server accelerometer) the steppers fix and mob coordinates in the ESP32 server.
	 */
	async readActSteps () {		
	    try {
			await this.pathC.writeValue(new Uint8Array([this.OPT.READ_ACT_STEPS_OPT]));
			let value = await this.posMeasureC.readValue();		
			let fix = value.getUint8(0)*256 + value.getUint8(1);
			let mob = value.getUint8(2)*256 + value.getUint8(3);
			this.logDOM.innerHTML += this.time() + 'Actual steps readings from server: fix=' + fix + ', mob=' + mob + '\n';
			this.actStep = new VecSP.Step(fix, mob);		
			return true;
		} catch {return await this.disconnectMsg();}
	}
	async checkStatus () {
		try {
			let value = await this.statusC.readValue();		
			this.serverStatus = value.getUint8(0);
			return this.serverStatus;
		} catch {
			alert("No status read.");
			return false;
		}
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
		this.path = this.path.concat(Path.path);
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

/** Function to generate a geodesic path trajectory.
*   @param {VecSP.Equatorial} eq0 - geodesic starting point.
*	@param {VecSP.Equatorial} eq1 - geodesic ending point.
*	@param {number} angleIncrement - angle step for the geodesic discretization in rad.
*	@param {Array} lpattern - [laser on number of steps, laser off number of steps].
*	@param {number} delay - time delay between steppers sucessive steps in multiples of 100 us.
*	@returns {PathSP.Path} path for the geodesic trajectory.
*/
PathSP.makeGeodesic = function (eq0, eq1, angleIncrement, lpattern, delay) {
	let path = new PathSP.Path();
	let v0 = eq0.toVector3();
	let v1 = eq1.toVector3();	
	let a = v0.angleTo(v1);
	let N = Math.max(1.0, Math.round(Math.abs(a/angleIncrement)));		
	let ainc = a/N;
	let v3 = new THREE.Vector3();
	v3 = THREE.crossVectors(v0, v1);	
	let r = lpattern[0] + lpattern[1];	
	let laser;	
	for (let i = 0; i <= N; i++) {
		let v = v1.clone();
		v.applyAxisAngle(v3, i*ainc);
		laser = 0;
		if ((i%r) < lpattern[0]) laser = 1;
		let eq = new VecSP.Equatorial();
		eq.fromVector3(v);
		let segment = new PathSP.Segment(eq, laser, delay);
		path.addSegment(segment);
	}
	return path;   
}

export {ESP32, VecSP, CommSP, PathSP};