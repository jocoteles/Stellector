/**
 * JS Module for the StarPointer app.
 * @module libs/StarPointer
 * @see module:libs/StarPointer.module.js
 */

import '../libs/three.min.js';
import '../libs/optimization.js'
import '../libs/lalolib-noglpk-module.min.js'
import { nelderMead } from '../libs/nelderMead.js';

/**
 * @param {Object} ESP32 - constants used in the ESP32 server
 */
let ESP32 = {
	STPS360: 2038,				//steppers number of steps for a 360º rotation
	STEP_AT_ZENITH: 1019,		//steppers step values corresponding to the Zenith direction
	HORIZON_MIN_ANG: 3.0,	    //laser minimum angle from horizon for safety operation [degrees]
	PATHBASE: [1, 9, 11, 11],	//number of bits of the base used to represent the path segments, respectively for: laser state, step delay, phi step, theta step
	COMMBASE: [8, 8, 8, 8],		//number of bits of the base used to communicate the path segments
	RESET_PATH_OPT: 1,       	//option to start a new path reading
	EXEC_PATH_OPT: 2,        	//option to execute the path
	CYCLIC_PATH_OPT: 3,     	//option to execute the path cyclicaly
	REVERSE_PATH_OPT: 4,	    //option to execute the path cyclicaly in reverse order alternately	
	LASER_SWITCH_OPT: 5,       	//option to turn on the laser
	LASER_CHECK_OPT: 6,    		//option to check the laser	state
	SET_ZENITH_OPT: 7,       	//option to make actSteps equal to STEP_AT_ZENITH
	READ_ACT_STEPS_OPT: 8,		//option to read the steppers actual steps
	RESET_READ_OPT: 9,	        //option to make the read steppers procedure ready
	RESET_PATH_ST: 10,			//status to start a new path reading
	EXEC_PATH_ST: 11,			//status to execute the path
	CYCLIC_PATH_ST: 12,			//status to execute the path cyclicaly	
	REVERSE_PATH_ST: 13,	    //status to execute the path cyclicaly in reverse order alternately
	LASER_ON_ST: 14,			//status to turn on the laser
	LASER_OFF_ST: 15,			//status to turn off the laser
	LASER_SWITCH_ST: 16,	    //status to switch laser state
	SET_ZENITH_ST: 17,			//status to make actSteps equal to STEP_AT_ZENITH
	READ_ACT_STEPS_ST: 18,		//status to read the steppers actual steps
	UNSAFE_MEASURE_ST: 19,		//status for sensors measurement that indicate unsafe operation condition
	UNSAFE_MODE_ST: 20,     	//status to warn that the device is operating at unsafe mode
	LEVEL_CHANGED_ST: 21,   	//status to indicate that the apparatus changed orientation
	MAIN_S_UUID:          "643790f9-355d-435b-b407-43ebf47a86b4",  //The single service for all device's characteristics
	PATH_C_UUID:          "f467e4e9-e2bc-422f-b8a3-aaaf6f92b999",  //characteristic for the path array
	POS_MEASURE_C_UUID:   "6f23d28a-a3cb-4c5f-9d08-63fda0806966",  //characteristic for measuring the steppers position
	STATUS_C_UUID:        "4af8de6b-1f13-4dfb-b08e-0a4a97a983d5",  //characteristic for indicating the hardware status
	CHECK_STATUS_C_UUID:  "f7b0afdf-b51e-4ba7-9513-48fb15497f22",  //characteristic for measuring the hardware status
	DEVICE_NAME: "Stellector"
};



/**
 * A namespace for the vector operations in the StarPointer app'.
 * @namespace
 */
let VecSP = {};

/** Class representing a unity vector in spherical coordinates (phi = 0 to 2*pi; theta = 0 to pi). */
VecSP.Spherical = class {
    /**
     * Create a spherical representation of a unity vector.
     * @param {number} phi - azimuthal angle: 0 to 2*pi.
	 * @param {number} theta - polar angle: 0 to pi.
     */
    constructor (phi = 0.0, theta = 0.0) {
		this._phi = phi;
		this._theta = theta;
		this.correctCoords();
	}
	/** Set this.phi */
	set phi (phi) {
		this._phi = phi;
		this.correctCoords();
	}
	/** Set this.theta */
	set theta (theta) {		
		this._theta = theta;
		this.correctCoords();
	}
	/** Get this.phi */
	get phi () {		
		return this._phi;
	}
	/** Get this.theta */
	get theta () {		
		return this._theta;
	}
	/** Correct coordinates to their boundary values */
	correctCoords () {
		let pi = Math.PI;
		let pi2 = 2.0*pi;
		let n = Math.ceil(Math.abs(this.phi)/pi2);
		this._phi = (n*pi2 + this._phi) % pi2;
		let m = Math.ceil(Math.abs(this.theta)/pi2);
		this._theta = (m*pi2 + this._theta) % pi2;
		if (this._theta > pi) {
			this._theta = pi2 - this._theta;
			this._phi = (this._phi + pi) % pi2;
		}
	}	
	/**
	 * Return the rectangular representation of this object.
	 * @returns {THREE.Vector3} rectangular representation of this object.
	 */
	toVector3 () {		
		return new THREE.Vector3().setFromSphericalCoords(1.0, this._theta, this._phi);
		//Phi and theta are exchanged in Three.js in relation to the usual notation
	}	
	/**
	 * Set this object from rectangular representation.	 
	 * @param {THREE.Vector3} vec - rectangular representation of a vector.
	 */
	fromVector3 (vec) {
		let sph = new THREE.Spherical().setFromVector3(vec);
		this._phi = sph.theta;
		this._theta = sph.phi;
		//Phi and theta are exchanged in Three.js in relation to the usual notation
	}	
	/**
	 * Make a copy of this vector.
	 * @returns {VecSP.Spherical} copy of this vector.
	 */
	clone () {
		return new VecSP.Spherical(this.phi, this.theta);
	}
}

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
		let sph = this.toSpherical();
		this.fromSpherical(sph);
	}	
	/**
	 * Return the rectangular representation of this object.
	 * @returns {THREE.Vector3} rectangular representation of this object.
	 */
	toVector3 () {		
		let sph = this.toSpherical();				
		return sph.toVector3();		
	}
	/**
	 * Return the spherical representation of this object.
	 * @returns {VecSP.Spherical} spherical representation of this object.
	 */
	 toSpherical () {
		let phi = this._ra*Math.PI/12;
		let theta = (90-this._dec)*Math.PI/180;				
		return new VecSP.Spherical(phi, theta);		
	}
	/**
	 * Set this object from rectangular representation.	 
	 * @param {THREE.Vector3} vec - rectangular representation of a vector.
	 */
	fromVector3 (vec) {
		let sph = new VecSP.Spherical();
		sph.fromVector3(vec);
		this.fromSpherical(sph);
	}
	/**
	 * Set this object from spherical representation.	 
	 * @param {VecSP.Spherical} vec - spherical representation of a vector.
	 */
	fromSpherical (sph) {		
		this._ra = sph.phi*12/Math.PI;
		this._dec = (90-sph.theta*180/Math.PI);		
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
		this.stepAtZenith = ESP32.STEP_AT_ZENITH;
		this.step90 = Math.trunc(ESP32.STPS360/4);				
		this.correctSteps();
	}
	/** Set this.fix */
	set fix (fix) {
		this._fix = fix;		
		this.correctSteps();
	}
	/** Set this.mob */
	set mob (mob) {
		this._mob = mob;
		this.correctSteps();
	}	
	/** Get this.fix */
	get fix () {		
		return this._fix;
	}
	/** Get this.mob */
	get mob () {		
		return this._mob;
	}
	/** Correct coordinates to their boundary values */
	correctSteps () {		
		let n = Math.ceil(Math.abs(this._fix)/this.maxSteps);
		this._fix = (n*this.maxSteps + this._fix) % this.maxSteps;
		let m = Math.ceil(Math.abs(this._mob)/this.maxSteps);
		this._mob = (m*this.maxSteps + this._mob) % this.maxSteps;
	}
	/** Return fix coordinate in radians
	 * @returns {number} this.fix in radians */		
	fixToRad () {
		return this._fix*2.0*Math.PI/this.maxSteps;
	}
	/** Return mob coordinate in radians
	 * @returns {number} this.mob in radians */		
	mobToRad () {
		return (this._mob - this.stepAtZenith + this.step90)*2.0*Math.PI/this.maxSteps;
	}
	/** Set fix coordinate from angle in radians
	 * @param {number} rad - angle in radians that will set the fix coordinate */		
	fixFromRad (rad) {
		this._fix = Math.round(rad*this.maxSteps/(2.0*Math.PI));
		this.correctSteps();
	}
	/** Set mob coordinate from angle in radians
	 * @param {number} rad - angle in radians that will set the mob coordinate */		
	 mobFromRad (rad) {
		this._mob = Math.round(rad*this.maxSteps/(2.0*Math.PI)) + this.stepAtZenith - this.step90;
		this.correctSteps();
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
	 * @param {Date} date - date when the star object was measured by the StarProjector system
	 * @param {VecSP.Step} step - local steppers coordinates for the star object
	 * @param {VecSP.Equatorial} eq - celestial equatorial coordinates for the star object
	 */
	constructor (text = null, date = null, step = null, eq = null) {
		this.text = text;		
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
		/**@member {THREE.Vector3[3]} - optimized vectors for the stepper fix, stepper mob and laser axes. */		
		this.fit = {						
			axes: {
				fix: new THREE.Vector3(1.0, 0.0, 0.0),
				mob: new THREE.Vector3(0.0, 1.0, 0.0),
				laser: new THREE.Vector3(1.0, 0.0, 0.0)
			},
			fixStretch: {value: 1.0, min: 0.8, max: 1.2, optimize: true},
			mobStretch: {value: 1.0, min: 0.8, max: 1.2, optimize: true},
			mobTilt: {value: 0.0, min: -5*Math.PI/180, max: 5*Math.PI/180, optimize: true},
			laserTilt: {value: 0.0, min: -5*Math.PI/180, max: 5*Math.PI/180, optimize: true}
		};						
		/**@member {Date} - First calib star date of assignment to calibration */
		this.t0 = new Date();
		/**@member {object} - Calibration statistics */
		this.stats = {dev: 0, min: 0, max: 0, minStar: null, maxStar: null};
		/**@member {number} - Number of tries used by the axes optmization algorithm. */
		this.axesTrial = 50;
		this.maxIter = 50;
		this.maxCalibIter = 500;
		this.maxOptimValue = (1.0 - Math.cos(1*Math.PI/1024))**0.5;
		this.maxCalibOptimumValue = (1.0 - Math.cos(1*Math.PI/1024))**0.5;
		this.sideralDay = 86164090.5; //[ms]
	}	
	/**
	 * Find the Euler rotations that relate the local reference system to the celestial reference system.
	 * @param {VecSP.CalibStar[]} stars - array of calibration stars
	 */	
    calcCalib (stars) {
		this.stars = stars;
		this.t0 = stars[0].date;
		window.equatorials = [];
		window.steps = [];
		for (let s of this.stars) {
			let eq = s.eq.clone();		
			eq.ra -= (s.date - this.t0)*24/this.sideralDay;
			window.equatorials.push(eq.toVector3());			
			window.steps.push(s.step);
		}
		window.fit = this.fit;
		window.fix = new THREE.Vector3(1.0, 0.0, 0.0);
		window.mob = new THREE.Vector3(0.0, 1.0, 0.0);
		window.laser = new THREE.Vector3(1.0, 0.0, 0.0);	
		let objFunc = function (p) {									
			let penal = 0.0;			
			let fixS = window.fit.fixStretch.value;
			let mobS = window.fit.mobStretch.value;
			window.fix = new THREE.Vector3(1.0, 0.0, 0.0);
			window.mob = new THREE.Vector3(0.0, 1.0, 0.0);
			window.laser = new THREE.Vector3(1.0, 0.0, 0.0);
			let Y = new THREE.Vector3(0.0, 1.0, 0.0);				
			let Z = new THREE.Vector3(0.0, 0.0, 1.0);				
			if (window.fit.fixStretch.optimize) {
				if (p[0] < window.fit.fixStretch.min) penal += window.fit.fixStretch.min - p[0];
				if (p[0] > window.fit.fixStretch.max) penal += p[0] - window.fit.fixStretch.max;				
				fixS = p[0];				
			}
			if (window.fit.mobStretch.optimize) {
				if (p[1] < window.fit.mobStretch.min) penal += window.fit.mobStretch.min - p[1];
				if (p[1] > window.fit.mobStretch.max) penal += p[1] - window.fit.mobStretch.max;
				mobS = p[1];				
			}
			if (window.fit.laserTilt.optimize) {
				if (p[2] < window.fit.laserTilt.min) penal += window.fit.laserTilt.min - p[2];
				if (p[2] > window.fit.laserTilt.max) penal += p[2] - window.fit.laserTilt.max;								
				window.laser.applyAxisAngle(Z, p[2]);
			}
			window.laser.applyAxisAngle(window.mob, p[4]);
			if (window.fit.mobTilt.optimize) {
				if (p[3] < window.fit.mobTilt.min) penal += window.fit.mobTilt.min - p[3];
				if (p[3] > window.fit.mobTilt.max) penal += p[3] - window.fit.mobTilt.max;								
				window.mob.applyAxisAngle(Z, p[3]);
				window.laser.applyAxisAngle(Z, p[3]);
			}
			window.mob.applyAxisAngle(window.fix, p[5]);
			window.mob.applyAxisAngle(Y, p[6]);
			window.mob.applyAxisAngle(Z, p[7]);
			window.laser.applyAxisAngle(window.fix, p[5]);
			window.laser.applyAxisAngle(Y, p[6]);
			window.laser.applyAxisAngle(Z, p[7]);
			window.fix.applyAxisAngle(Y, p[6]);
			window.fix.applyAxisAngle(Z, p[7]);
			
			let N = window.steps.length;
			let dots = 0;
			for (let i = 0; i < N; i++) {
				let l = window.laser.clone();				
				l.applyAxisAngle(window.mob, window.steps[i].mobToRad()*mobS);
				l.applyAxisAngle(window.fix, window.steps[i].fixToRad()*fixS);				
				dots += l.dot(window.equatorials[i]);
			}
			return (1 - dots/N)**0.5 + penal;
		}
		let p0;				
		let P;
		let bestValue = 1000;
		let i = 0;
		do {			
			p0 = [
				this.fit.fixStretch.min + Math.random()*(this.fit.fixStretch.max - this.fit.fixStretch.min),
				this.fit.mobStretch.min + Math.random()*(this.fit.mobStretch.max - this.fit.mobStretch.min),
				this.fit.laserTilt.min + Math.random()*(this.fit.laserTilt.max - this.fit.laserTilt.min),
				this.fit.mobTilt.min + Math.random()*(this.fit.mobTilt.max - this.fit.mobTilt.min),				
				Math.random()*2*Math.PI,
				Math.random()*2*Math.PI,
				Math.random()*Math.PI,
				Math.random()*2*Math.PI
			];						
			let res = nelderMead(objFunc, p0);		
			if (res.fx < bestValue) {
				bestValue = res.fx;
				P = res.x;
			}		
		} while ((i++ < this.maxCalibIter) && (bestValue > this.maxCalibOptimumValue));
		if (i >= this.maxCalibIter) alert('Calibration could not converge to maxCalibOptimValue!');				
				
		this.fit.fixStretch.value = P[0];
		this.fit.mobStretch.value = P[1];
		this.fit.laserTilt.value = P[2];
		this.fit.mobTilt.value = P[3];
		objFunc(P); // actualizes window.fix, window.mob and window.laser with optimized parameters P		
		this.fit.axes.fix = window.fix.clone();
		this.fit.axes.mob = window.mob.clone();
		this.fit.axes.laser = window.laser.clone();				

		this.stats.dev = 0;
		this.stats.min = 1e3;
		this.stats.max = 0;
		let eq1, eq2, ang;
		for (let s of this.stars) {
			eq1 = this.equatorialFromStep(s.step, s.date).toVector3();				
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
		let laser = this.fit.axes.laser.clone();		
		laser.applyAxisAngle(this.fit.axes.mob, s.mobToRad()*this.fit.mobStretch.value);
		laser.applyAxisAngle(this.fit.axes.fix, s.fixToRad()*this.fit.fixStretch.value);		
		let eq = new VecSP.Equatorial();
		eq.fromVector3(laser);		
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
		window.eq3 = eq.toVector3();
		window.fix = this.fit.axes.fix;
		window.mob = this.fit.axes.mob;
		window.laser = this.fit.axes.laser;
		window.fixStretch = this.fit.fixStretch.value;
		window.mobStretch = this.fit.mobStretch.value;					
		let optimFunction = function (s) {
			let laser = window.laser.clone();					
			let penal = 0.0;
			if (s[0] > 2*Math.PI) penal += s[0] - 2*Math.PI;
			if (s[0] < 0.0) penal += -s[0];
			if (s[1] > Math.PI) penal += s[1] - Math.PI;
			if (s[1] < 0.0) penal += -s[1];
			laser.applyAxisAngle(window.mob, s[1]*window.mobStretch);
			laser.applyAxisAngle(window.fix, s[0]*window.fixStretch);			
			return (1.0 - laser.dot(window.eq3))**0.5 + penal;			
		}
		let optAngs;
		let bestValue = 1.0;
		let i = 0;
		do {
			let res = nelderMead(optimFunction, [Math.random()*2*Math.PI, Math.random()*Math.PI]);		
			if (res.fx < bestValue) {
				bestValue = res.fx;
				optAngs = res.x;
			}
		} while ((i++ < this.maxIter) && (bestValue > this.maxOptimValue));		
		if (i >= this.maxIter) alert('stepFromEquatorial could not converge. Do not execute path!');		
		let step = new VecSP.Step();		
		step.fixFromRad(optAngs[0]);
		step.mobFromRad(optAngs[1]);
		return step;
	}
	/**
	 * Make a copy of this object.
	 * @returns {VecSP.Calib} copy of this object.
	 */
	clone () {
		let Calib = new VecSP.Calibration();
		Calib.stars = this.stars;		
		for (let x in this.fit) Calib.fit[x] = this.fit[x];				
		Calib.t0 = this.t0;		
		for (let x in this.stats) Calib.stats[x] = this.stats[x];
		Calib.axesTrial = this.axesTrial;
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
	/**
	 * Parse a segment to be added to a parsed path.
	 * @param {PathSP.Segment} Segment - Segment to be parsed. 	 
	 * @returns {number[]} Array with decBase size representing the parsed segment.
	 */
	parseSegment (Segment) {		
		//Encoding to this._encBase:		
		let step = Segment.eq;
		if (Segment.eq instanceof VecSP.Equatorial) step = this.calib.stepFromEquatorial(Segment.eq);		
		//console.log(Segment.eq);
		//console.log(step);
		/*if (step.fix < ESP32.STEP_MIN || step.fix > ESP32.STEP_MAX || step.mob < ESP32.STEP_MIN || step.mob > ESP32.STEP_MAX) {
			this.clipped = true;
			return false;
		}*/ //Recheck this function in the future		
		let ph = (step.fix-ESP32.STPS360/4.0)*2*Math.PI/ESP32.STPS360;
		let th = (step.mob-ESP32.STPS360/4.0)*2*Math.PI/ESP32.STPS360;
		let x = cos(ph)*sin(th);
		let y = sin(ph)*sin(th);
		let z = cos(th);
		let tanH = y/sqrt(x*x+z*z);
  		if (tanH <= Math.tan(ESP32.HORIZON_MIN_ANG*Math.PI/180)) {
			this.clipped = true;
			return false;			
		}
		let data = [Segment.laser, Segment.delay, step.fix, step.mob];
		let x0 = 0;
		let b = 0;
		for (let i = 0; i < this._encBase.length; i++) {
			x0 += data[i]*2**b;
			b += this._encBase[i];
		}
		//Decoding to this._decBase:
		let b0 = 0;
		let r0 = x0;
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
		this.serverStatus = {laser: 0, steppersWorking: 0, unsafeMode: 0, safeHeight: 0, leveled: 0, tilted: 0};		
	}
	/**Return actual time in the format: hours minutes seconds. */
	time () {
		let d = new Date();
		return d.getHours() + 'h' + d.getMinutes() + 'm' + d.getSeconds() + 's: ';
	}
	optKeyFromValue (value) {
		for (let x of Object.entries(this.OPT)) if (x[1] == value) return x[0];
		return false;
	}
	isServerIdle (opt) {
		if ((opt == this.OPT.LASER_OFF_ST) || (opt == this.OPT.LASER_ON_ST)) return true;
		else return false;
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
	disconnectMsg (errorMsg) {
		this.logDOM.innerHTML += this.time() + errorMsg + '. StarPointer disconnected!\n';
		alert(errorMsg + '. StarPointer disconnected! Start comm again.');
		return false;
	}
    
	/** Send a this.Opt item to ESP32 Server.
	 * @param {number} optValue - A valid this.Opt item value.
	*/
	async sendOption (optValue) {
		let optKey = this.optKeyFromValue(optValue);
		if (optKey) {			
			this.logDOM.innerHTML += this.time() + 'Option ' + optKey + ' sent to Server.\n';
			await this.pathC.writeValue(new Uint8Array([optValue]));			
			/*if (await this.checkStatus()) {
				let opt = this.optKeyFromValue(this.serverStatus);
				this.logDOM.innerHTML += this.time() + 'Option ' + opt + ' received by Server.\n';
				if (opt == 'LEVEL_CHANGED_ST') alert ('Atention! Horus changed orientation. Calibration may have been impaired.');
				else if (opt == 'UNSAFE_MEASURE_ST') alert ('Atention! Horus leveling or distance to the ground are unsafe. Set up the equipament correctly. No commands executed.');
				else if (opt == 'UNSAFE_MODE_ST') alert ('Atention! Horus operating in unsafe mode. Use it with caution.');
				return this.serverStatus;
			}
			else return false;*/
			return await this.checkStatus();
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
			await this.checkStatus();
			return true;
		} catch {return this.disconnectMsg();}
	}	
	/**Execute a parsedPath on steppers in the ESP32 server.
	 * @param {CommSP.CommPath} Path - Path to be executed by the ESP32 server steppers.
	 * @param {string} cyclicOpt - 'single': path is executed once; 'forward': path is excuted cyclically forward until stop signal; 'alternate': path is excuted cyclically alternate until stop signal.
	 */
	async goPath (Path, cyclicOpt = 'single') {  
		//console.log(Path);
	    try {			
			let path = Path.parsedPath;			
			if (path.length == 0) alert ('Path execution ignored due to steppers elevation out of bounds.');
			else {
				if (Path.clipped) alert('Path clipped due to steppers elevation out of bounds.');
				await this.sendOption(this.OPT.RESET_PATH_OPT);
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
				switch (cyclicOpt) {
					case 'single':
						await this.sendOption(this.OPT.EXEC_PATH_OPT);
						break;
					case 'forward':
						await this.sendOption(this.OPT.CYCLIC_PATH_OPT);
						break;
					case 'alternate':
						await this.sendOption(this.OPT.REVERSE_PATH_OPT);
						break;
				}				
				this.logDOM.innerHTML += this.time() + 'Path execution with Cyclic Option = ' + cyclicOpt + '.\n';
				return true;
			}
		} catch (error) {return this.disconnectMsg(error);}
	}
	/** Switch the laser status on/off in the ESP32 server. */
	async goLaser () {
		try {			
			//if (this.isServerIdle(await this.checkStatus())) await this.sendOption('LASER_SWITCH_OPT');												
			await this.sendOption(this.OPT.LASER_SWITCH_OPT);
		} catch (error) {			
			return this.disconnectMsg(error);}		
	}
	/** Asign the actual steppers step values to ESP32.STEP_AT_ZENITH.	 
	 */
	async setZenith() {
		try {			
			//if (this.isServerIdle(await this.checkStatus())) await this.sendOption('SET_ZENITH_OPT');
			//await this.sendOption('RESET_PATH_OPT');
			await this.sendOption(this.OPT.SET_ZENITH_OPT);												
		} catch (error) {			
			return this.disconnectMsg(error);
		}
	}
		/*try {
			await this.pathC.writeValue(new Uint8Array([this.OPT.SET_ZENITH_OPT]));
			this.logDOM.innerHTML += this.time() + "Laser beam pointed to zenith.\n";
			return true;
		} catch (error) {return await this.disconnectMsg(error);}
	}*/
	/** Read (using the server accelerometer) the steppers fix and mob coordinates in the ESP32 server.
	 */
	async readActSteps () {		
	    try {			
			let value;
			await this.pathC.writeValue(new Uint8Array([this.OPT.RESET_READ_OPT]));
			do {
				value = await this.posMeasureC.readValue();				
			} while (value.byteLength > 1);
			await this.pathC.writeValue(new Uint8Array([this.OPT.READ_ACT_STEPS_OPT]));
			do {
				value = await this.posMeasureC.readValue();				
			} while (value.byteLength < 4);
			let fix = value.getUint8(0)*256 + value.getUint8(1);
			let mob = value.getUint8(2)*256 + value.getUint8(3);
			this.logDOM.innerHTML += this.time() + 'Actual steps readings from server: fix=' + fix + ', mob=' + mob + '\n';
			this.actStep = new VecSP.Step(fix, mob);										
			return true;						
		} catch (error) {return this.disconnectMsg(error);}
	}
	async getStatus () {
		try {
			let status = await this.statusC.readValue();		
			this.serverStatus = value.getUint8(0);
			//return this.serverStatus;
			
			let opt = this.optKeyFromValue(this.serverStatus);
			this.logDOM.innerHTML += this.time() + 'Option ' + opt + ' received by Server.\n';
			if (opt == 'LEVEL_CHANGED_ST') alert ('Atention! Horus changed orientation. Calibration may have been impaired.');
			else if (opt == 'UNSAFE_MEASURE_ST') alert ('Atention! Horus leveling or distance to the ground are unsafe. Set up the equipament correctly. No commands executed.');
			else if (opt == 'UNSAFE_MODE_ST') alert ('Atention! Horus operating in unsafe mode. Use it with caution.');
			return this.serverStatus;

		} catch {
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
     * Create a segment for the path followed by the Star Pointer composed by equatorial or steps coords, laser status and time delay between steps.
	 * @param {VecSP.Equatorial|VecSP.Step} eq - equatorial or step coords of the path segment.
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
    /**Create the path followed by the Star Pointer composed by equatorial or step coords, laser status and time delay between steps. */
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
	v3.crossVectors(v0, v1).normalize();
	let r = lpattern[0] + lpattern[1];
	let laser;	
	for (let i = 0; i <= N; i++) {
		let v = v0.clone();
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