/*

Copyright 2021 João T. Carvalho-Neto, Fernando A. Pedersen and Matheus N. S. Silva

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

import { nelderMead } from './libs/nelderMead.js';

/**
 * @file Hathor web app documentation. It is part of the Stellector Project.
 * @author J Teles
 * @license Apache License, Version 2.0 (the "License")
 */

/**
 * Constants used in the Horus ESP32 server.
 * @enum
 */
const ESP32 = {
  /**steppers number of steps for a 360º rotation*/
	STPS360: 2038,			
  /**steppers step values corresponding to the Zenith direction */	
	STEP_AT_ZENITH: 1019,
  /**laser minimum angle from horizon for safety operation [degrees] */
	HORIZON_MIN_ANG: 3.0,	   
  /**number of bits of the base used to represent the path segments, respectively for: laser state, step delay, phi step, theta step */ 
	PATHBASE: [1, 9, 11, 11],
	/**number of bits of the base used to communicate the path segments */
  COMMBASE: [8, 8, 8, 8],
	/**option to start a new path reading */
  RESET_PATH_OPT: 1,
  /**option to execute the path */
	EXEC_PATH_OPT: 2,        
	/**option to execute the path cyclicaly */
  CYCLIC_PATH_OPT: 3,     	
  /**option to execute the path cyclicaly in reverse order alternately	 */
	REVERSE_PATH_OPT: 4,	    
	/**option to turn on the laser	 */
  LASER_SWITCH_OPT: 5,       	
	/**option to make actSteps equal to STEP_AT_ZENITH */
  SET_ZENITH_OPT: 6,       	
	/**option to read the steppers actual steps	 */
  READ_ACT_STEPS_OPT: 7,		
  /**The single service for all device's characteristics */
	MAIN_S_UUID:          "643790f9-355d-435b-b407-43ebf47a86b4",
	/**characteristic for the path array */
  PATH_C_UUID:          "f467e4e9-e2bc-422f-b8a3-aaaf6f92b999",
  /**characteristic for command execution on server */  
	COMMAND_C_UUID:       "f7b0afdf-b51e-4ba7-9513-48fb15497f22",
  /**characteristic for measuring the steppers position */
	STEPPERS_C_UUID:  	  "6f23d28a-a3cb-4c5f-9d08-63fda0806966",
  /**characteristic for indicating the hardware status	 */
	STATUS_C_UUID:        "4af8de6b-1f13-4dfb-b08e-0a4a97a983d5",
  /**device name that is broadcasted from Horus server */
	DEVICE_NAME: "Horus"
};

/**
 * General astronomical constants and configurations
 * @enum {number}
 */
const ga = {
  /**Number of miliseconds in a sideral day. */
  sideralDay: 86164090.5,
  /**Number of days in a sideral year. */
  sideralYear: 366.255936,
  /**Number of divisions for ecliptic path construction. */
  eclipticDivisions: 30
}

/**
 * Basic astronomical and hardware operations.
 * @namespace Basic
 */  
Basic: {
  /**
   * Coordinates operations.
   * @namespace Coord
   * @memberof Basic
   */
  Coord: {
    /**
     * Representation of an unity vector in spherical coordinates.
     * @memberof Basic.Coord
     */
    var Spherical = class {
        /**
        * Creates a spherical representation of a unity vector.
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
      /**
        * Corrects coordinates to their boundary values.
        */
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
        * Returns the rectangular representation of this object.
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
        * Makes a copy of this vector.
        * @returns {Spherical} copy of this vector.
        */
      clone () {
        return new Spherical(this.phi, this.theta);
      }
    }
    
    /**
     * Representation of an unity vector in equatorial coordinates.
     * @memberof Basic.Coord
     */
     var Equatorial = class {
        /**
        * Creates a RA 24hs equatorial representation of a unity vector.
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
      /**
        * Corrects coordinates to their boundary values
        */
      correctCoords () {
        let sph = this.toSpherical();
        this.fromSpherical(sph);
      }	
      /**
        * Returns the rectangular representation of this object.
        * @returns {THREE.Vector3} rectangular representation of this object.
        */
      toVector3 () {		
        let sph = this.toSpherical();				
        return sph.toVector3();		
      }
      /**
        * Returns the spherical representation of this object.
        * @returns {Spherical} spherical representation of this object.
        */
        toSpherical () {
        let phi = this._ra*Math.PI/12;
        let theta = (90-this._dec)*Math.PI/180;				
        return new Spherical(phi, theta);		
      }
      /**
        * Set this object from rectangular representation.	 
        * @param {THREE.Vector3} vec - rectangular representation of a vector.
        */
      fromVector3 (vec) {
        let sph = new Spherical();
        sph.fromVector3(vec);
        this.fromSpherical(sph);
      }
      /**
        * Set this object from spherical representation.	 
        * @param {Spherical} vec - spherical representation of a vector.
        */
      fromSpherical (sph) {		
        this._ra = sph.phi*12/Math.PI;
        this._dec = (90-sph.theta*180/Math.PI);		
      }
      /**
        * Makes a copy of this vector.
        * @returns {Equatorial} copy of this vector.
        */
      clone () {
        return new Equatorial(this.ra, this.dec);
      }
    }
    
    /**
    * Representation of an unity vector in step motor steps.
    * @memberof Basic.Coord
    */
     var Step = class {
        /**
        * Creates a step motor steps representation of a unity vector.
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
      /**
        * Corrects coordinates to their boundary values.
        */
      correctSteps () {		
        let n = Math.ceil(Math.abs(this._fix)/this.maxSteps);
        this._fix = (n*this.maxSteps + this._fix) % this.maxSteps;
        let m = Math.ceil(Math.abs(this._mob)/this.maxSteps);
        this._mob = (m*this.maxSteps + this._mob) % this.maxSteps;
      }	
      /**
        * Returns fix coordinate in radians.
        * @returns {number} this.fix in radians
        */
      fixToRad () {
        return this._fix*2.0*Math.PI/this.maxSteps;
      }	
      /**
        * Returns mob coordinate in radians.
        * @returns {number} this.mob in radians
        */
      mobToRad () {
        return (this._mob - this.stepAtZenith + this.step90)*2.0*Math.PI/this.maxSteps;
      }	
      /**
        * Set fix coordinate from angle in radians
        * @param {number} rad - angle in radians that will set the fix coordinate
        */
      fixFromRad (rad) {
        this._fix = Math.round(rad*this.maxSteps/(2.0*Math.PI));
        this.correctSteps();
      }	
      /**
        * Set mob coordinate from angle in radians
        * @param {number} rad - angle in radians that will set the mob coordinate
        */
        mobFromRad (rad) {
        this._mob = Math.round(rad*this.maxSteps/(2.0*Math.PI)) + this.stepAtZenith - this.step90;
        this.correctSteps();
      }
      /**
        * Make a copy of this vector.
        * @returns {Step} copy of this vector.
        */
      clone() {
        return new Step(this.fix, this.mob);
      }	
    }
    
    /**
    * Representation of a calibration star object.
    * @memberof Basic.Coord
    */
     var CalibStar = class {
      /**
        * Crates a calib star object.
        * @param {string} text - a text output with this star information	 
        * @param {Date} date - date when the star object was measured by the Horus system
        * @param {Step} step - local steppers coordinates for the star object
        * @param {Equatorial} eq - celestial equatorial coordinates for the star object
        */
      constructor (text = null, date = null, step = null, eq = null) {
        this.text = text;		
        this.date = date;
        this.step = step;
        this.eq = eq;
      }
    }
    
    /**
    * Class to perform the calibration of the steppers local reference frame with respect to the equatorial celestial reference frame.
    * @memberof Basic.Coord
    */
     var Calibration = class {
      /**
      * Cretates a calibration object.  
      */
      constructor() {
      /**@member {CalibStar[]} - Array of star objects used to perform calibration of the reference frame. */
      this.stars = [];		
      /**@member - optimized vectors for the stepper fix, stepper mob and laser axes. */		
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
      ga.sideralDay = 86164090.5; //[ms]
    }	
    /**
    * Finds this.fit.axes of the local reference system relative to the celestial reference system.
    * @param {CalibStar[]} stars - array of calibration stars
    */	
    calcCalib (stars) {
      this.stars = stars;
      this.t0 = stars[0].date;
      window.equatorials = [];
      window.steps = [];
      for (let s of this.stars) {
        let eq = s.eq.clone();		
        eq.ra -= (s.date - this.t0)*24/ga.sideralDay;
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
    * @param {Step} s - local coordinate
    * @param {Date} d - given date (actual date, if ommitted)
    * @returns {Equatorial} celestial coordinate
    */
    equatorialFromStep (s, d = new Date()) {		
      let laser = this.fit.axes.laser.clone();		
      laser.applyAxisAngle(this.fit.axes.mob, s.mobToRad()*this.fit.mobStretch.value);
      laser.applyAxisAngle(this.fit.axes.fix, s.fixToRad()*this.fit.fixStretch.value);		
      let eq = new Equatorial();
      eq.fromVector3(laser);		
      eq.ra += (d - this.t0)/3.6e6;
      return eq;
    }	
    /**
    * Local from Celestial coordinates convertion on the given date.
    * @param {Equatorial} eq - celestial coordinate
    * @param {Date} d - given date (actual date, if ommitted)
    * @returns {Step} local coordinate
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
      let step = new Step();		
      step.fixFromRad(optAngs[0]);
      step.mobFromRad(optAngs[1]);
      return step;
    }
    /**
    * Makes a copy of this object.
    * @returns {Calibration} copy of this object.
    */
    clone () {
      let Calib = new Calibration();
      Calib.stars = this.stars;		
      for (let x in this.fit) Calib.fit[x] = this.fit[x];				
      Calib.t0 = this.t0;		
      for (let x in this.stats) Calib.stats[x] = this.stats[x];
      Calib.axesTrial = this.axesTrial;
      return Calib;
    }
    }
  }
  /**
  * Communication operations between the Hathor WebApp client and the Horus ESP32 server.
  * @namespace Comm
  * @memberof Basic
  */
  Comm: { 
    /**
    * Parsed path construction for communication to Horus ESP32 server.
    * @memberof Basic.Comm
    */
    var CommPath = class {
      /**
      * Creates a parsed path to send to the ESP32 server.
      * @param {Path} Path - Path to be parsed.
      * @param {Calibration} Calib - calibration used to transform celestial to step coordinates
      */
      constructor (Path, Calib) {
        /**@member {number[]} - Number of bits of the base used to represent the path segments, respectively for: laser state, step delay, fix step, mob step. */
        this._encBase = ESP32.PATHBASE;
        /**@member {number[]} - Number of bits of the base used to communicate the path segments. */
        this._decBase = ESP32.COMMBASE;
        /**@member {Path} */
        this._path = Path;
        /**@member {Calibration} */
        this.calib = Calib;
        /**@member {number[]} - Parsed path obtained from this._path. */
        this._parsedPath = [];
        /**@member {boolean} - True if path clipped due to be below horizon. */
        this.clipped = false;
        this.composePath();
      }
      /**
      * Checks if the laser will point above the horizon for safe operation.      
      * @param {Step} Step - step to be checked if is above horizon. 
      * @returns {boolean} true if above horizon, false otherwise.
      */
      isAboveHorizon (Step) {
        let ph = (Step.fix-ESP32.STPS360/4.0)*2*Math.PI/ESP32.STPS360;
        let th = (Step.mob-ESP32.STPS360/4.0)*2*Math.PI/ESP32.STPS360;		
        let x = Math.cos(ph)*Math.sin(th);
        let y = Math.sin(ph)*Math.sin(th);
        let z = Math.cos(th);
        let tanH = y/Math.sqrt(x*x+z*z);		
          if (tanH > Math.tan(ESP32.HORIZON_MIN_ANG*Math.PI/180)) return true;
        else return false;		
      }    
      /**
      * Parses a segment to be added to a parsed path.
      * @param {Segment} Segment - Segment to be parsed. 	 
      * @returns {number[]} Array with decBase size representing the parsed segment.
      */
      parseSegment (Segment) {		
        //Encoding to this._encBase:		
        let step = Segment.coord;
        if (Segment.coord instanceof Equatorial) step = this.calib.stepFromEquatorial(Segment.coord);						
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
      /**
      * Method for parsing this._path.
      */
      composePath () {
        this.clipped = false;
        this._parsedPath = [];				
        let path = this._path.path;		
        for (let i = 0; i < path.length; i++) {
          if (path[i].coord instanceof Equatorial) path[i].coord = this.calib.stepFromEquatorial(path[i].coord);							
          if (this.isAboveHorizon(path[i].coord)) {
            //console.log(path[i].laser);
            let seg = new Segment(path[i].coord, path[i].laser, path[i].delay);
            //if (i+1 < path.length)
            if (i-1 >= 0)
              if (!this.isAboveHorizon(path[i-1].coord)) {
                seg.laser = 0;
                seg.delay = 0;
                this.clipped = true;
              }
            //console.log(path[i].laser);
            //console.log('-------------');
            this._parsedPath = this._parsedPath.concat(this.parseSegment(seg));												
          }
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
    /**
    * Communication via Low Energy Bluetooth with the Horus ESP32 server.
    * @memberof Basic.Comm
    */
    var Bluetooth = class {
      /**
      * Creates a bluetooth connection.
      * @param {*} logHTML -HTML element whose innerHTML attribute receives the communication logs. 
      * @param {*} unsafeHTML -HTML element to indicate when in the unsafe mode. 
      */
      constructor (logHTML, unsafeHTML) {
        /**@member {string} - Server device name.*/
        this.deviceName = ESP32.DEVICE_NAME;
        /**@member {string} - The single service for all device's characteristics.*/
        this.mainS_UUID = ESP32.MAIN_S_UUID;
        /**@member {string} - Characteristic UUID for the parsedPath transmission.*/
        this.pathC_UUID = ESP32.PATH_C_UUID;
        /**@member {string} - Characteristic UUID for sending commands to server.*/
        this.commandC_UUID = ESP32.COMMAND_C_UUID;
        /**@member {string} - Characteristic UUID for measuring the steppers position.*/
        this.steppersC_UUID = ESP32.STEPPERS_C_UUID;
        /**@member {string} - Characteristic UUID for measuring ESP32 status.*/
        this.statusC_UUID = ESP32.STATUS_C_UUID;		
        /**@member {Object} - HTML element whose innerHTML attribute receives the communication logs.*/
        this.logHTML = logHTML;
        /**@member {Object} - HTML element to indicate unsafe mode operation.*/
        this.unsafeHTML = unsafeHTML;
        /**@member {number} - 1 byte array maximum size to be sent to the server. */
        this.maxChunk = 512;
        /**@member {Object} - Execution options to ESP32 server. */
        this.OPT = ESP32;
        /**@member {Step} - the steppers fix and mob coordinates obtained from the accelerometer readings. */
        this.actStep = new Step(0, 0);
        this.serverStatus = {
          idle: false,
          laserOn: false,
          unsafeMode: false,
          safeHeight: false,
          leveled: false,
          tilted: false
        };		
      }      
      /**
       * Actual time for log display.
       * @returns actual time in the format: hours minutes seconds.
       */
      time () {
        let d = new Date();
        return d.getHours() + 'h' + d.getMinutes() + 'm' + d.getSeconds() + 's: ';
      }	
      /**
      * Starts bluetooth communication with Horus ESP32 server.
      * @returns {boolean} connection status.
      */
      async startComm () {
        let deviceOptions = {
          filters: [{ name: this.deviceName }],
          optionalServices: [
            this.mainS_UUID, 
            this.pathC_UUID,
            this.commandC_UUID,    
            this.steppersC_UUID,
            this.statusC_UUID]};
        try {
          this.logHTML.innerHTML = this.time() + 'Requesting Horus Device...\n';      
          this.device = await navigator.bluetooth.requestDevice(deviceOptions);
          
          this.logHTML.innerHTML += this.time() + 'Connecting to GATT Server...\n';
          this.server = await this.device.gatt.connect();
          
          this.logHTML.innerHTML += this.time() + 'Getting GAP Services...\n';
          this.mainS = await this.server.getPrimaryService(this.mainS_UUID);
          
          this.logHTML.innerHTML += this.time() + 'Getting GAP Characteristics...\n';
          this.pathC = await this.mainS.getCharacteristic(this.pathC_UUID);
          this.commandC = await this.mainS.getCharacteristic(this.commandC_UUID);
          this.steppersC = await this.mainS.getCharacteristic(this.steppersC_UUID);
          this.statusC = await this.mainS.getCharacteristic(this.statusC_UUID);
          this.logHTML.innerHTML += this.time() + 'Connected to Horus on ESP32 Server.\n';
    
          this.getStatus();
          return true;    
        }
        catch(error) {
          this.logHTML.innerHTML += error + '\n';
          return false;
        }	
      }
      /**
      * Sends an Alert informing disconnection with server.
      * @param {string} errorMsg - to be displayed with the disconnected message.      
      */
      disconnectMsg (errorMsg) {
        this.logHTML.innerHTML += this.time() + errorMsg + '. Horus disconnected!\n';
        alert(errorMsg + '. Horus disconnected! Start comm again.');
      }
        
      /**
      * Sends a this.Opt item to Horus ESP32 Server.
      * @param {number} optValue - A valid this.Opt item value.
      */
      async sendCommand (optValue) {
        let optKey = false;
        for (let x of Object.entries(this.OPT)) if (x[1] == optValue) optKey = x[0];		
        if (optKey) {			
          this.logHTML.innerHTML += this.time() + 'Option ' + optKey + ' sent to Server.\n';
          await this.commandC.writeValue(new Uint8Array([optValue]));						
          return true;
        }
        else {
          this.logHTML.innerHTML += this.time() + 'Option ' + option + ' not recognized. Nothing sent to Server.\n';
          return false;
        }
      }
      /**
      * Executes a step size on steppers in the Horus ESP32 server.
      * @param {number} stepSize - Step size between 1 and 128.
      * @param {string} dirs - String in the format 'xab', where x is any alphabetic character, a and b control the fixed and mobile steppers, respectively, and each one can assume the characters: '0' = move backward, '1' = stay still, and '2' = move forward.
      */
      async goStepSize (stepSize, dirs) {
        try {
          if (await this.getStatus()) {			
            let fix = Math.max((parseInt(dirs[1])-1)*stepSize + 127, 0);
            let mob = Math.max((parseInt(dirs[2])-1)*stepSize + 127, 0);
            await this.commandC.writeValue(new Uint8Array([fix, mob]));
            this.logHTML.innerHTML += this.time() + 'Step size of (' + (fix-127) + ',' + (mob-127) + ') sent to (fixed,mobile) steppers on Server.\n';
            return true;
          }
        } catch {this.disconnectMsg();}
        return false;
      }	
      /**
      * Executes a parsedPath on steppers in the ESP32 server.
      * @param {CommPath} Path - Path to be executed by the ESP32 server steppers.
      * @param {string} cyclicOpt - 'single': path is executed once; 'forward': path is excuted cyclically forward until stop signal; 'alternate': path is excuted cyclically alternate until stop signal.
      */
      async goPath (Path, cyclicOpt = 'single') {  		
        try {
          if (await this.getStatus()) {			
            let path = Path.parsedPath;			
            if (path.length == 0) {
              alert ('Path execution ignored due to steppers elevation out of bounds.');
              return false;
            }
            else {
              if (Path.clipped) alert('Path clipped due to steppers elevation out of bounds.');
              await this.sendCommand(this.OPT.RESET_PATH_OPT);
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
              this.logHTML.innerHTML += this.time() + 'Path with ' + Path.size + ' segments sent to Server.\n';
              switch (cyclicOpt) {
                case 'single':
                  await this.sendCommand(this.OPT.EXEC_PATH_OPT);
                  break;
                case 'forward':
                  await this.sendCommand(this.OPT.CYCLIC_PATH_OPT);
                  break;
                case 'alternate':
                  await this.sendCommand(this.OPT.REVERSE_PATH_OPT);
                  break;
              }				
              this.logHTML.innerHTML += this.time() + 'Path execution with Cyclic Option = ' + cyclicOpt + '.\n';              
            }
            return true;
          }        
        } catch (error) {this.disconnectMsg(error);}
        return false;
      }
      /**
      * Switchs the laser status on/off in the ESP32 server.
      */
      async goLaser () {
        try {			
          if (await this.getStatus()) {				
            await this.sendCommand(this.OPT.LASER_SWITCH_OPT);
            return true;
          }
        } catch (error) {this.disconnectMsg(error);}
        return false;																	
      }
      /**
      * Set actual steppers step values to ESP32.STEP_AT_ZENITH.	 
      */
      async setZenith() {
        try {			
          if (await this.getStatus()) {
            await this.sendCommand(this.OPT.SET_ZENITH_OPT);																				
            return true;
          }
        } catch (error) {this.disconnectMsg(error);}
        return false;
      }
      /**
      * Read the steppers fix and mob coordinates in the ESP32 server.
      */
      async readActSteps () {		
        try {			
          let value = await this.steppersC.readValue();							
          let fix = value.getUint8(0)*256 + value.getUint8(1);
          let mob = value.getUint8(2)*256 + value.getUint8(3);
          this.logHTML.innerHTML += this.time() + 'Actual steps readings from server: fix=' + fix + ', mob=' + mob + '\n';
          this.actStep = new Step(fix, mob);										
          return true;						
        } catch (error) {this.disconnectMsg(error);}
        return false;
      }
      /**
      * Check status from server and emits alert message for safe and correct use.
      * @returns true if it receives status from ESP32 sever, false otherwise.
      */
      async getStatus () {
        try {
          let status = await this.statusC.readValue();		
          this.serverStatus.idle = status.getUint8(0);			
          this.serverStatus.laserOn = status.getUint8(1);
          let unsafeMode = status.getUint8(2);
          let safeHeight = status.getUint8(3);
          let leveled = status.getUint8(4);
          let tilted = status.getUint8(5);
    
          if (unsafeMode) this.unsafeHTML.style.display = "block";
          else this.unsafeHTML.style.display = "none";
    
          if ((unsafeMode != this.serverStatus.unsafeMode) && unsafeMode) alert ('Atention! Horus operating in unsafe mode. Use it with caution.');	
          if (!unsafeMode) {
            let msg = '';
            if (!safeHeight) msg += 'Distance to the ground is unsafe. ';
            if (!leveled) msg += 'Horus is not leveled. ';
            if (msg != '') alert('Atention! ' + msg + 'Set up the equipament correctly. No commands executed.');
          }
          if (tilted) alert ('Atention! Horus changed orientation. Calibration may have been impaired.');
    
          this.serverStatus.unsafeMode = unsafeMode;
          this.serverStatus.safeHeight = safeHeight;
          this.serverStatus.leveled = leveled;
          this.serverStatus.tilted = tilted;
          
          if ((safeHeight && leveled) || unsafeMode) return true;
          else return false;
    
        } catch {
          return false;
        }
      }		
    }
  } 
  /**
   * Path operations.
   * @namespace PathOp
   * @memberof Basic
   */
  Path: {  
    /**
     * Path segment construction.
     * @memberof Basic.PathOp
     */
    var Segment = class {
      /**
       * Creates a segment for the path followed by the Horus laser composed by equatorial or steps coords, laser status and time delay between steps.
       * @param {Equatorial|Step} coord - equatorial or step coords of the path segment.
       * @param {number} laser - Laser state: 0 = off, 1 = on.
       * @param {number} delay - Time delay between steppers sucessive steps in multiples of 100 us.
       */
      constructor (coord, laser, delay) {
        this.coord = coord;
        this.laser = laser;
        this.delay = delay;
      }
    }    
    /**
     * General Path construction.
     * @memberof Basic.PathOp
     */
    var Path = class {
      /**
       * Creates the path followed by the Star Pointer composed by equatorial or step coords, laser status and time delay between steps.
       */
      constructor () {
        this.reset();
      }
      /**
       * Resets Path variables.
       */
      reset () {		
        /**@member {Segment[]} - array of Segment objects. */
        this.path = [];
        /**@member {number} - path number of segments. */
        this.size = 0;
        /**@member {number} - Sum of all path segments delay in 100 us unit. */
        this.duration = 0;
      }
      /**
       * Add segment object to the path.
       * @param {Segment} Segment
       */
      addSegment (Segment) {
        this.path.push(Segment);
        this.size = this.path.length;
        this.duration += Segment.delay;
      }
      /** 
       * Concatenate path.
       * @param {Path} Path
       */
      addPath (Path) {
        this.path = this.path.concat(Path.path);
        this.size += Path.size;
        this.duration += Path.duration;
      }
    }    
    /** 
     * Function to generate a circular path trajectory.
     * @memberof Basic.PathOp
     * @param {Equatorial} Center - celestial coordinate of circle center.
     * @param {number|Equatorial} border - circle angle aperture in rad or celestial coordinate of a point at the circle border.
     * @param {number} angleIncrement - angle step for the circle discretization in rad.
     * @param {Array} lpattern - [laser on number of steps, laser off number of steps].
     * @param {number} delay - time delay between steppers sucessive steps in multiples of 100 us.
     * @returns {Path} path for the circular trajectory.
     */
    var makeCircle = function (Center, border, angleIncrement, lpattern, delay) {
      let path = new Path();
      let c = Center.toVector3();
      let b;
      if (typeof(border.phi) == 'undefined') {
        b = new Equatorial(Center.ra, Center.dec+border*180/Math.PI);		
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
        let eq = new Equatorial();
        eq.fromVector3(v);
        let segment = new Segment(eq, laser, delay);
        path.addSegment(segment);
      }
      return path;   
    }
    
    /**
     * Function to generate a geodesic path trajectory.
     * @memberof Basic.PathOp
     * @param {Equatorial} eq0 - geodesic starting point.
     * @param {Equatorial} eq1 - geodesic ending point.
     * @param {number} angleIncrement - angle step for the geodesic discretization in rad.
     * @param {Array} lpattern - [laser on number of steps, laser off number of steps].
     * @param {number} delay - time delay between steppers sucessive steps in multiples of 100 us.
     * @returns {Path} path for the geodesic trajectory.
     */
    var makeGeodesic = function (eq0, eq1, angleIncrement, lpattern, delay) {
      let path = new Path();
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
        let eq = new Equatorial();
        eq.fromVector3(v);
        let segment = new Segment(eq, laser, delay);
        path.addSegment(segment);
      }
      return path;   
    }
  }
}

/**
 * User interface.
 * @namespace Ui
 */
Ui: {  
  
  /**
   * User interface doom elements.
   * @enum {Object}
   * @memberof Ui
   */
  var el = {
    controllerSVGcontainer: document.getElementById("controllerSVGcontainer"),
    stepSizeR: document.getElementById("stepSizeR"),
    stepSizeRList: document.getElementById("stepSizeRList"),
    stepSizeT: document.getElementById("stepSizeT"),
    lineSpeedR: document.getElementById("lineSpeedR"),
    lineSpeedRList: document.getElementById("lineSpeedRList"),
    lineSpeedT: document.getElementById("lineSpeedT"),
    lineOnR: document.getElementById("lineOnR"),
    lineOnRList: document.getElementById("lineOnRList"),
    lineOnT: document.getElementById("lineOnT"),
    lineAngR: document.getElementById("lineAngR"),
    lineAngT: document.getElementById("lineAngT"),
    circleSpeedR: document.getElementById("circleSpeedR"),
    circleSpeedRList: document.getElementById("circleSpeedRList"),
    circleSpeedT: document.getElementById("circleSpeedT"),
    circleOnR: document.getElementById("circleOnR"),
    circleOnRList: document.getElementById("circleOnRList"),
    circleOnT: document.getElementById("circleOnT"),
    circleApR: document.getElementById("circleApR"),
    circleApRList: document.getElementById("circleApRList"),
    circleApT: document.getElementById("circleApT"),
    circleAngR: document.getElementById("circleAngR"),
    circleAngT: document.getElementById("circleAngT"),
    commStatus: document.getElementById("commStatus"),
    calibLog: document.getElementById("calibLog"),
    calibInfo: document.getElementById("calibInfo"),
    raH: document.getElementById("raInputH"),
    raM: document.getElementById("raInputM"),
    raS: document.getElementById("raInputS"),
    raF: document.getElementById("raInputF"),
    decD: document.getElementById("decInputD"),
    decM: document.getElementById("decInputM"),
    decS: document.getElementById("decInputS"),
    decF: document.getElementById("decInputF"),  
    fixI: document.getElementById("fixInput"),
    mobI: document.getElementById("mobInput"),
    objDate: document.getElementById("objDate"),
    objTime: document.getElementById("objTime"),
    trackDate: document.getElementById("trackDate"),
    trackTime: document.getElementById("trackTime"),
    timeStepY: document.getElementById("timeStepY"),
    timeStepD: document.getElementById("timeStepD"),
    timeStepM: document.getElementById("timeStepM"),
    sideralOffset: document.getElementById("sideralOffset"),
    objectPointerStyle: document.getElementById("objectPointerStyle"),
    trackPointerStyle: document.getElementById("trackPointerStyle"),
    coordsPointerStyle: document.getElementById("coordsPointerStyle"),
    calibObjectsTypeCombo: document.getElementById("calibObjectsTypeCombo"),
    calibListCombo: document.getElementById("calibListCombo"),
    navObjectsTypeCombo: document.getElementById("navObjectsTypeCombo"),
    navTracksTypeCombo: document.getElementById("navTracksTypeCombo"),
    calibObjectsCombo: document.getElementById("calibObjectsCombo"),
    angFixStretch: document.getElementById("angFixStretch"),
    angMobStretch: document.getElementById("angMobStretch"),
    fixStretchOptim: document.getElementById("fixStretchOptim"),
    mobStretchOptim: document.getElementById("mobStretchOptim"),
    laserTiltOptim: document.getElementById("laserTiltOptim"),
    laserTiltAng: document.getElementById("laserTiltAng"),
    mobTiltOptim: document.getElementById("mobTiltOptim"),
    mobTiltAng: document.getElementById("mobTiltAng"),
    useParamsCalib: document.getElementById("useParamsCalib"),
    navObjectsCombo: document.getElementById("navObjectsCombo"),
    navTracksCombo: document.getElementById("navTracksCombo"),
    trackAtDatetime: document.getElementById("trackAtDatetime"),
    speechLanguage: document.getElementById("speechLanguage"),
    speechRate: document.getElementById("speechRate"),
    speechPitch: document.getElementById("speechPitch"),
    speakStarName: document.getElementById("speakStarName"),
    speakBayer: document.getElementById("speakBayer"),
    speakConstellation: document.getElementById("speakConstellation"),
    speakHipparcos: document.getElementById("speakHipparcos"),
    controllerWidth: document.getElementById("controllerWidth"),
    controllerWidthValue: document.getElementById("controllerWidthValue"),
    unsafeModeWarning: document.getElementById("unsafeModeWarning")    
  }

  /**
   * User interface parameters and data bindings.
   * @enum {Object}
   * @memberof Ui
   */
  var db = {
    colorMenuSelected: "#339333",
    colorMenuUnselected: "#893838",  
    startingLangName: 'pt-BR',  
    stepSizeInputDatalistParams:  
    {
      'min': 0,
      'max': 7,
      'step': 1,
      'init': 0,
      'input': el.stepSizeR,
      'datalist': el.stepSizeRList
    },
    lineSpeedInputDatalistParams:
    {
      'min': 1,
      'max': 6,
      'step': 1,
      'init': 3,
      'delaylist' : [500, 400, 300, 200, 100, 0],   // multiples of 100 us
      'input': el.lineSpeedR,
      'datalist': el.lineSpeedRList
    },
    lineOnInputDatalistParams:
    {
      'min': 0,
      'max': 100,
      'step': 25,
      'init': 100,
      'input': el.lineOnR,
      'datalist': el.lineOnRList
    },
    circleSpeedInputDatalistParams:
    {
      'min': 1,
      'max': 6,
      'step': 1,
      'init': 3,
      'delaylist' : [500, 400, 300, 200, 100, 0],   // multiples of 100 us
      'input': el.circleSpeedR,
      'datalist': el.circleSpeedRList
    },
    circleOnInputDatalistParams:
    {
      'min': 0,
      'max': 100,
      'step': 25,
      'init': 100,
      'input': el.circleOnR,
      'datalist': el.circleOnRList
    },
    circleApertureInputDatalistParams:
    {
      'min': 0.5,
      'max': 160,
      'step': 0.5,
      'init': 2.0,
      'input': el.circleApR,
      'datalist': el.circleApRList
    },  
    objectsLabels:
    {
      "star": ["name", "c", "hip", "hd"],
      "dso": ["name", "es", "desig"],
      "ss": ["name"],
      "messier": ["name", "m", "ngc"],
      "constellation": ["name", "en", "es"]
    },
    tracksLabels: 
    {
      "clines": ["name", "en", "es"],
      "cbounds": ["name", "en", "es"],
      "asterisms": ["name", "es"],
      "ecliptic": ["name"]
    },  
    objectCalibF:
    [
      ["name", document.getElementById("nameCfilter")],
      ["c", document.getElementById("consCfilter")],
      ["hip", document.getElementById("hipCfilter")],
      ["hd", document.getElementById("hdCfilter")]
    ],
    objectNavF:
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
    ],
    trackNavF:
    [
      ["name", document.getElementById("nameTfilter")],
      ["es", document.getElementById("esTfilter")],
      ["en", document.getElementById("enTfilter")]
    ],  
    objectsTypeOptions:
    {
      'ss': {'text': 'solar system'},
      'star': {'text': 'star'},
      'dso': {'text': 'deep sky and cluster'},
      'messier': {'text': 'messier'},
      'constellation': {'text': 'constellation'}
    },
    calibTypeOptions:
    {
      'ss': {'text': 'solar system'},
      'star': {'text': 'star'}
    },
    tracksTypeOptions: 
    {
      'clines': {'text': 'constellation lines'},
      'cbounds': {'text': 'constellation bounds'},
      'asterisms': {'text': 'asterisms'},
      'ecliptic': {'text': 'ecliptic'}
    },      
    pointerStyleOptions:
    {
      'point': {'text': 'point'},
      'bpoint': {'text': 'blinking point', 'interval': 2500},
      'circle': {'text': 'circle'},
      'alternate': {'text': 'circle alternate'}
    },  
    trackStyleOptions:
    {
      'solid': {'text': 'solid'},
      'dashed': {'text': 'dashed'},
      'circle': {'text': 'circle'},
      'solidcircle': {'text': 'solid-circle'},
      'dashedcircle': {'text': 'dashed-circle'}
    },
    filterComboMinLength: 0  
  }
  
  /**
   * ComboHTML elements and their bindings associated with Celestial objects in the Navigation and Calibration windows, and Tracks in the NAvigation Window.
   * @memberof Ui
   */
  var itemsElements =
  {
    "navObjects": {"typeCombo": el.navObjectsTypeCombo, "itemCombo": el.navObjectsCombo, "options": db.objectsTypeOptions, "filters": db.objectNavF, "labels": db.objectsLabels},
    "calibObjects": {"typeCombo": el.calibObjectsTypeCombo, "itemCombo": el.calibObjectsCombo, "options": db.calibTypeOptions, "filters": db.objectCalibF, "labels": db.objectsLabels},
    "navTracks": {"typeCombo": el.navTracksTypeCombo, "itemCombo": el.navTracksCombo, "options": db.tracksTypeOptions, "filters": db.trackNavF, "labels": db.tracksLabels}
  };

  /** 
   * The single Bluetooth object used in the Hathor webapp. 
   * @memberof Ui
   */
  var BleInstance = new Bluetooth(el.commStatus, el.unsafeModeWarning);

  /**
   * The accepted reference frame Calibration object.
   * @memberof Ui
   */
  var CalibInstance = new Calibration();

  /**
   * Celestial objects and sets names.
   * @memberof Ui   
   */
  var itemsNames = {
    starsNames: {},
    dso: {},
    ss: {},
    messier: {},
    constellation: {},
    clines: {},
    cbounds: {},
    asterisms: {}
  };

  /**
   * Celestial objects and sets general data.
   * @memberof Ui   
   */
  var itemsData = {
    starsNames: {},
    dso: {},  
    messier: {},
    constellation: {},
    clines: {},
    cbounds: {},
    asterisms: {}
  };

  /**
   * Coordinates and data for a given sky track (e.g. constelation lines, bounds, asterisms, ecliptic, etc.).
   * @memberof Ui
   */
  var trackCoords = {'coords':[], 'indexes': [], 'step': 0};    
  
  /**
   * Sets and shows the actual window choosen by the user in the app menu.
   * @memberof Ui
   * @param {string} windowId - Id of the chosen app window dom element.
   * @param {object} menuElem - Dom element representing the menu chosen.
   */
  window.setWindow = function (windowId, menuElem) {
    let windows = document.getElementsByClassName("window");  
    for (let w of windows) w.style.display = "none";
    for (let m of document.getElementsByClassName("menuBtn")) m.style.backgroundColor = db.colorMenuUnselected;
    menuElem.style.backgroundColor = db.colorMenuSelected;
    document.getElementById(windowId).style.display = "block";  
    if (windowId == "appCommW") el.commStatus.scrollTop = el.commStatus.scrollHeight;  
    if (windowId == "appCommW" || windowId == "appConfigW") document.getElementById("appControllerDiv").style.display = "none";
    else document.getElementById("appControllerDiv").style.display = "block";
  }

  /**
   * Open or close the selected tab in the user interface.
   * @memberof Ui
   * @param {string} id - Id of the tab dom element
   */
  window.changeNav = function (id) {
    let elem = document.getElementById(id);
    if (window.getComputedStyle(elem).getPropertyValue('display') == "block") elem.style.display = "none";        
    else elem.style.display = "block";    
  }

  /**
   * Actual time in a readble format for the log text fields.
   * @memberof Ui
   * @returns time in the format: hours minutes seconds.
   */
  var appTime = function () {
    let d = new Date();
    return d.getHours() + 'h' + d.getMinutes() + 'm' + d.getSeconds() + 's: ';
  }  
  
  /**
   * Date value for the <input type='date'> dom element.
   * @memberof Ui
   * @param {Date} date 
   * @returns local date string in the format: year-month-day.
   */
  var localDateString = function (date) {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    if (month < 10) month = '0' + month;
    if (day < 10) day = '0' + day;
    return String(year) + '-' + String(month) + '-' + String(day);
  }

  /**
   * Date value for the <input type='time'> dom element.
   * @memberof Ui
   * @param {Date} date 
   * @returns local date string in the format: hour:minute.
   */
  var localTimeString = function (date) {
    let hour = date.getHours();
    let minute = date.getMinutes();  
    if (hour < 10) hour = '0' + hour;
    if (minute < 10) minute = '0' + minute;
    return String(hour) + ':' + String(minute);
  }

  /**
   * Convertion from (-180° to 180° units) to (0 to 24hs units).
   * @memberof Ui
   * @param {Number} ra in -180° to 180° units.
   * @returns ra in 0 to 24hs units.
   */
  var ra180to24 = function (ra) {
    return (24 + ra*12/180)%24;
  }

  /**
   * Convertion from (0 to 24hs units) to (-180° to 180° units)
   * @memberof Ui
   * @param {Number} ra in 0 to 24hs units.
   * @returns ra in -180° to 180° units.
   */
  var ra24to180 = function (ra) {
    return ra > 12 ? (ra - 24) * 15 : ra * 15;
  }

  /**
   * Coordinates of a specific celestial object from the data files.
   * @memberof Ui
   * @param {string} itemType - a key of itemsData object.
   * @param {string} itemId - the unique id for a celestial object in itemsData[itemType].features object.
   * @returns the celestial object coordinates or false if id not found.
   */
  var getCoordinates = function (itemType, itemId) {
    let items = itemsData[itemType].features;      
    for (let i = 0; i < items.length; i++)
      if (items[i].id == itemId) return items[i].geometry.coordinates;          
    return false;
  }

  /**
   * Equatorial coordinates of a celestial object from a combo list dom element.
   * @memberof Ui
   * @param {Object} value - an item value from the combo list.
   * @param {Date} date - chosen data when the coordinates will be computed (default = now).
   * @returns a Basic.Equatorial object with the equatorial coordinates of the celestial object.
   */
  var equatorialFromObjectData = function (value, date = new Date()) {
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
        //console.log(date);
        //console.log(radec);
        if (!el.sideralOffset.checked) radec.ra -= (date - new Date())*24/ga.sideralDay;      
        return new Equatorial(radec.ra, radec.dec);
      }
      else {
        let eq = getCoordinates(type, id);
        if (eq) {
          let ra = ra180to24(eq[0]); 
          ra += (date - new Date())*24/ga.sideralDay;
          return new Equatorial(ra, eq[1]);
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
  
  /**
   * Method called when Object Type comboHTML element is changed.
   * @memberof Ui
   * @param {Object} itemElement - A comboHTML element for the celestial objects and tracks types.
   */
  window.changeObjectsType = function (itemElement) {  
    let opt = valueSelected(itemElement);  
    let item;
    for (let i in itemsElements) {
      if (itemsElements[i]["typeCombo"].id == itemElement.id) item = itemsElements[i];    
    }  
    setFiltersEvents(item, db.filterComboMinLength);    
    filterCombo(item["filters"][0], item, db.filterComboMinLength);  
    let filter = item["filters"];
    let style;
    for (let x of filter) {
      if (item["labels"][opt].includes(x[0])) style = "block";
      else style = "none";        
      x[1].parentNode.style.display = style;
      x[1].parentNode.previousSibling.style.display = style;    
    }  
  }

  /**
   * Method for reading the celestial objects data in json files and Solar System object names and ids.
   * @memberof Ui
   */
  var loadItemsDataNames = function () {
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
    let dt = ga.sideralDay*ga.sideralYear/ga.eclipticDivisions;  
    let sun = new Orb.Sun();
    let date0 = new Date().getTime();  
    for (let i = 0; i < ga.eclipticDivisions; i++) {    
      let date = new Date(date0 + Math.round(i*dt));    
      let radec = sun.radec(date);
      eclipitic = eclipitic.concat([[ra24to180(radec.ra).toFixed(4), radec.dec.toFixed(4)]]);    
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

  /**
   * Get the text typed in a filterHTML element and matches all celestial objects that contain the typed text corresponding to the celestial object type selected in the type comboHTML element.
   * The filtered objects are showed in a celestial object comboHTML element. 
   * @memberof Ui
   * @param {Object} filterElement - a db.itemsElement.filters item.
   * @param {Object} itemElement - a db.itemsElement item.
   * @param {number} minLength - db.filterComboMinLength.
   */
  var filterCombo = function (filterElement, itemElement, minLength) {        
    let type = valueSelected(itemElement["typeCombo"]);    
    let x = itemElement["itemCombo"];
    x.innerText = null;
    let label = filterElement[0];
    let filter = filterElement[1].value;
    if (filter.length >= minLength) {          
      let obj, l, text;              
      for (obj in itemsNames[type]) {
        if ((itemsNames[type][obj][label] !== undefined)) {
          if (itemsNames[type][obj][label].match(RegExp(filter, 'gi'))) {
            let option = document.createElement("option");
            text = "";
            for (l of itemElement["labels"][type]) if (itemsNames[type][obj][l] !== undefined) {
              text += itemsNames[type][obj][l] + "|";              
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

  /**
   * Set the events keyup and click to the filterHTML element used to select a celestial object or configuration.
   * @memberof Ui
   * @param {Object} item - a db.itemsElement item
   * @param {number} minLength - db.filterComboMinLenght.
   */
  var setFiltersEvents = function (item, minLength) {        
    let i = item["filters"];
    for (let l in i)
      for (let evt of ["keyup", "click"]) {           
        i[l][1].addEventListener(evt, function(){filterCombo(i[l], item, minLength)});  
      }
  }

  /**
   * Create the options for a comboHTML element.
   * @memberof Ui
   * @param {Object} comboElement - aHTML select element.
   * @param {Array} options - a list of options to be included in the comboElement.
   */
  var createComboOptions = function (comboElement, options) {
    for (let opt in options) {
      let option = document.createElement("option");
      option.value = opt;
      option.text = options[opt].text;    
      comboElement.add(option);
    }
  }

  /**
   * Value from a selectHTML element.
   * @memberof Ui
   * @param {Object} element - Select element.
   * @returns the value of the selected option in the Select element.
   */
  var valueSelected = function (element) {
    return element.options[element.selectedIndex].value;                
  }

  /**
   * Text from a selectHTML element.
   * @memberof Ui
   * @param {Object} element - Select element.
   * @returns the text of the selected option in the Select element.
   */
  var textSelected = function (element) {
    return element.options[element.selectedIndex].text;                
  }

  /**
   * Value from a radioHTML element group.
   * @memberof Ui
   * @param {string} elementName - Radio element group name.
   * @returns the value of the checked radio option in the Radio element.
   */
  var getRadioValue = function (elementName) {
    let elems = document.getElementsByName(elementName);  
    for(let elem of elems) if (elem.checked) return elem.value;
  }

  /**
   * Sets the properties of an input rangeHTML element.
   * @memberof Ui
   * @param {Object} params - a db dataList object.
   */
  var setInputRangeDatalist = function (params) {
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
   * @namespace Controller
   * @memberof Ui
   */
  Controller: {

    /**
     * Sends a command to the Horus server to execute the step size on the step motors in the direction given by the ssId string.
     * @memberof Ui.Controller
     * @param {string} ssId - String in the format 'dxy' where 'x','y' = '0', '1', or '2'. '0' for step backward, '1' for hold still, and '2' for step forward, with 'x' for the fixed and 'y' for the mobile step motor.
     */
    window.sendStepSize = async function (ssId) {    
      let m = parseInt(el.stepSizeT.innerHTML);	    
      await BleInstance.goStepSize(m, ssId);  	
    }

    /**
     * Sends a command to the Horus server to switch the laser on/off state.
     * @memberof Ui.Controller
     */
    window.switchLaser = async function () {
      await BleInstance.goLaser();    
    }

    /**
     * Updates the step size value shown next to the step size input rangeHTML element.
     * @memberof Ui.Controller
     */
    window.updateStepSize = function () {  
      el.stepSizeT.innerHTML = 2**el.stepSizeR.value;
    }
  }

  /**
   * Calibration Window functions and objects.
   * @namespace CalibW
   * @memberof Ui
   */    
  CalibW: {    

    /**
     * Calibration stars list.
     * @memberof Ui.CalibW 
     */
    var cwStars = [];

    /**
     * The temporary reference frame Calibration object.
     * @memberof Ui.CalibW
     */
    var calibTemp = new Calibration();

    /**
     * Method called when calibration objects are removed or added.
     * @memberof Ui.CalibW
     * @param {string} action - 'add' for adding, 'remThis' for removing an item, 'remAll' for cleaning the calibration list.
     */
    window.cwUpdateCalib = async function (action) {    		
        if (el.calibObjectsCombo.innerText != null) {              
            if (action == "add") {           
              if (await BleInstance.readActSteps()) {
                let opt = valueSelected(el.calibObjectsCombo);                                        
                let eq = equatorialFromObjectData(opt);                        
                if (eq) {
                  let t = new Date();
                  let s = new CalibStar(textSelected(el.calibObjectsCombo), t, BleInstance.actStep, eq);
                  cwStars.push(s);              
                }
              }
            }
            if (action == "remThis") {
                if (cwStars.length > 0) {
                    let index = el.calibListCombo.selectedIndex;
                    cwStars.splice(index, 1);
                }
            }
            if (action == "remAll") cwStars = [];

            el.calibListCombo.innerText = null;   
            for (let i = 0; i < cwStars.length; i++) {
                let option = document.createElement("option");
                option.text = cwStars[i].text;
                el.calibListCombo.add(option);
            }
            el.calibListCombo.selectedIndex = Math.max(0, cwStars.length-1);      
        }
    }

    /**
     * Method called to calibrate the local reference frame with the calibration objects list.
     * The calibTemp object is actualized with this new calibration.
     * @memberof Ui.CalibW
     */
    window.cwCalcCalib = function () {
      if (cwStars.length < 2) alert("You must add at least two calibration stars.");
      else {    
        if (el.useParamsCalib) {
          calibTemp.fit.fixStretch.value = Number(el.angFixStretch.value);
          calibTemp.fit.mobStretch.value = Number(el.angMobStretch.value);
          calibTemp.fit.laserTilt.value = Number(el.laserTiltAng.value)*Math.PI/180;
          calibTemp.fit.mobTilt.value = Number(el.mobTiltAng.value)*Math.PI/180;
        }    
        calibTemp.fit.fixStretch.optimize = el.fixStretchOptim.checked;
        calibTemp.fit.mobStretch.optimize = el.mobStretchOptim.checked;
        calibTemp.fit.laserTilt.optimize = el.laserTiltOptim.checked;
        calibTemp.fit.mobTilt.optimize = el.mobTiltOptim.checked;    
        calibTemp.calcCalib(cwStars)
        el.calibLog.innerHTML += '-------------------------------------\n';
        el.calibLog.innerHTML += appTime() + 'New calibration performed with stars:\n';
        for (let s of calibTemp.stars) el.calibLog.innerHTML += s.text + '\n';
        let dev = calibTemp.stats.dev.toFixed(1);
        let devStep = (calibTemp.stats.dev*cwStars[0].step.maxSteps/360).toFixed(1);
        let min = calibTemp.stats.min.toFixed(1);
        let minStar = calibTemp.stats.minStar.split('|')[0];
        let minStep = (calibTemp.stats.min*cwStars[0].step.maxSteps/360).toFixed(1);
        let max = calibTemp.stats.max.toFixed(1);
        let maxStar = calibTemp.stats.maxStar.split('|')[0];
        let maxStep = (calibTemp.stats.max*cwStars[0].step.maxSteps/360).toFixed(1);
        el.calibLog.innerHTML += 'Average angle deviation: ' + dev + '° (' + devStep + ' steps).\n';
        el.calibLog.innerHTML += 'Minimum angle deviation of ' + minStar + ': ' + min + '° (' + minStep + ' steps).\n';
        el.calibLog.innerHTML += 'Maximum angle deviation of ' + maxStar + ': ' + max + '° (' + maxStep + ' steps).\n\n';
        el.calibLog.innerHTML += 'Fix angle strech factor: ' + calibTemp.fit.fixStretch.value + '\n';
        el.calibLog.innerHTML += 'Mob angle strech factor: ' + calibTemp.fit.mobStretch.value + '\n';
        el.calibLog.innerHTML += 'Laser axis tilt angle: ' + calibTemp.fit.laserTilt.value*180/Math.PI + '°\n';
        el.calibLog.innerHTML += 'Mob axis tilt angle: ' + calibTemp.fit.mobTilt.value*180/Math.PI + '°\n';
        alert("Calibration calculated. Press ACCEPT button to accept this calibration.");    
      }
    }

    /**
     * Method to accept the actual calibration.
     * The calibInstance object is actualized (cloned from) with the calibTemp object.
     * @memberof Ui.CalibW
     */
    window.cwAcceptCalib = function () {
      if (calibTemp.stars.length > 0) {
        CalibInstance = calibTemp.clone();
        el.angFixStretch.value = CalibInstance.fit.fixStretch.value;
        el.angMobStretch.value = CalibInstance.fit.mobStretch.value;
        el.laserTiltAng.value = CalibInstance.fit.laserTilt.value*180/Math.PI;
        el.mobTiltAng.value = CalibInstance.fit.mobTilt.value*180/Math.PI;
        el.calibLog.innerHTML += appTime() + 'New calibration accepted.\n';
        el.calibInfo.innerHTML = appTime() + 'Actual calibration stars:\n';
        el.calibInfo.innerHTML += '----------------------------------\n';
        for (let s of CalibInstance.stars) el.calibInfo.innerHTML += '-> ' + s.text + '\n';
        let dev = CalibInstance.stats.dev.toFixed(1);
        let devStep = (CalibInstance.stats.dev*cwStars[0].step.maxSteps/360).toFixed(1);
        let min = CalibInstance.stats.min.toFixed(1);
        let minStep = (CalibInstance.stats.min*cwStars[0].step.maxSteps/360).toFixed(1);
        let max = CalibInstance.stats.max.toFixed(1);
        let maxStep = (CalibInstance.stats.max*cwStars[0].step.maxSteps/360).toFixed(1);
        el.calibInfo.innerHTML += '\nStars angle deviations:\n';
        el.calibInfo.innerHTML += '-----------------------\n';
        el.calibInfo.innerHTML += '-> Avg: ' + dev + '° (' + devStep + ' steps).\n';
        el.calibInfo.innerHTML += '-> Min: ' + min + '° (' + minStep + ' steps).\n';
        el.calibInfo.innerHTML += '-> Max: ' + max + '° (' + maxStep + ' steps).\n';
        el.calibInfo.innerHTML += '\nFitting paramenters:\n';
        el.calibInfo.innerHTML += '-----------------------\n';
        el.calibInfo.innerHTML += '-> Fix strech: ' + CalibInstance.fit.fixStretch.value + '\n';
        el.calibInfo.innerHTML += '-> Mob strech: ' + CalibInstance.fit.mobStretch.value + '\n';
        el.calibInfo.innerHTML += '-> Laser tilt: ' + CalibInstance.fit.laserTilt.value*180/Math.PI + '°\n';
        el.calibInfo.innerHTML += '-> Mob tilt: ' + CalibInstance.fit.mobTilt.value*180/Math.PI + '°\n';
        el.calibInfo.innerHTML += 'Reference date: ' + CalibInstance.stars[0].date + '\n\n';        
      }
    }
  }

  /**
   * Navigation Window functions in the client app.
   * @namespace NavW
   * @memberof Ui
   */
  NavW: {

    /**
     * Sends a command to the Horus server to set the Zenith coordinates to the actual laser direction.
     * @memberof Ui.NavW
     */
    window.NWsetZenith = async function () {  
      await BleInstance.setZenith();  
    }

    /**
     * Sends a command to the Horus server to trace the laser according to a chosen pointer style at a given equatorial coordinate.
     * @memberof Ui.NavW
     * @param {string} style - laser tracing style: 'point', 'bpoint', 'alternate' or 'circle'.
     * @param {Basic.Equatorial} eqCoord  - equatorial coordinate to be pointed to.
     */
    var NWgoObjectStyle = async function (style, eqCoord) {
      let path = new Path();
      let cyclicOpt, delay;
      switch (style) {
        case "point":
          let seg = new Segment(eqCoord, 1, 0);
          path.addSegment(seg);            	    
          cyclicOpt = 'single';
          break;
        case "bpoint":
          delay = db.lineSpeedInputDatalistParams.delaylist[Number(el.lineSpeedR.value)-1];
          let seg0 = new Segment(eqCoord, 0, delay);
          let seg1 = new Segment(eqCoord, 1, delay);
          path.addSegment(seg0);
          path.addSegment(seg1);
          cyclicOpt = 'forward';
          break;
        case "alternate":
        case "circle":
          let ap = 0.5*el.circleApR.value*Math.PI/180;      
          let inc = el.circleAngR.value*Math.PI/180;  
          delay = db.circleSpeedInputDatalistParams.delaylist[Number(el.circleSpeedR.value)-1];      
          let cp = Math.round(Number(el.circleOnR.value)/25);
          let lp = [cp, 4-cp];    
          let circle = new makeCircle(eqCoord, ap, inc, lp, delay);
          path.addPath(circle);
          if (style == "circle") cyclicOpt = 'forward';
          else cyclicOpt = 'alternate';
          break;
      }
      let commPath = new CommPath(path, CalibInstance);	
      await BleInstance.goPath(commPath, cyclicOpt);  
    }

    /**
     * Sends a command to the Horus server to point the laser at the equatorial coordinate informed in the Coordinate Tab of the Navigation window.
     * @memberof Ui.NavW
     */
    window.NWgoEquatorial = async function () {	
      let eqCoord = new Equatorial();
      eqCoord.ra = Number(el.raF.value);
      eqCoord.dec = Number(el.decF.value);
      let style = el.coordsPointerStyle.value;
      await NWgoObjectStyle(style, eqCoord);
    }

    /**
     * Sends a command to the Horus server to point the laser at the step coordinate informed in the Coordinate Tab of the Navigation window.
     * @memberof Ui.NavW
     */
    window.NWgoSteps = async function () {	
      let step = new Step(Number(el.fixI.value), Number(el.mobI.value));  
      let seg = new Segment(step, 1, 0);
      let path = new Path();
      path.addSegment(seg);
      let commPath = new CommPath(path, CalibInstance);	  
      await BleInstance.goPath(commPath);  
    }

    /**
     * Sends a command to the Horus server to point the laser at Zenith direction.
     * @memberof Ui.NavW
     */
    window.NWgoZenith = async function () {	
      let step = new Step(ESP32.STEP_AT_ZENITH, ESP32.STEP_AT_ZENITH);  
      let seg = new Segment(step, 1, 0);
      let path = new Path();
      path.addSegment(seg);
      let commPath = new CommPath(path, CalibInstance);	  
      await BleInstance.goPath(commPath);  
    }

    /**
     * Sends a command to the Horus server to read the actual laser coordinates which are informed in the Coordinate Tab of the Navigation window.
     * @memberof Ui.NavW
     */
    window.NWreadCoords = async function () {
      if (await BleInstance.readActSteps()) {		
        let eqCoord = new Equatorial();		
        eqCoord = CalibInstance.equatorialFromStep(BleInstance.actStep);
        el.fixI.value = BleInstance.actStep.fix;
        el.mobI.value = BleInstance.actStep.mob;
        el.raF.value = eqCoord.ra.toFixed(4); 
        el.decF.value = eqCoord.dec.toFixed(4);           
        NWupdateCoordSys(el.raF);
        NWupdateCoordSys(el.decF);
      }
    }

    /**
     * Show the coordinates, in the Coordinate Tab of the Navigation window, of the celestial object selected in the Navigation Objects Combo.
     * @memberof Ui.NavW
     */
    window.NWshowCoords = function () {  
      let opt = valueSelected(el.navObjectsCombo);      
      let eqCoord = equatorialFromObjectData(opt);
      el.raF.value = eqCoord.ra.toFixed(4);
      el.decF.value = eqCoord.dec.toFixed(4);  
      NWupdateCoordSys(el.raF);
      NWupdateCoordSys(el.decF);
      let step = CalibInstance.stepFromEquatorial(eqCoord);
      el.fixI.value = step.fix;
      el.mobI.value = step.mob;
    }

    /**
     * Converts the equatorial coordinates from decimal representation to minutes and seconds and actualizes the values in the equatorial coordinate fields of the Coordinate tab at the Navigation window.
     * @memberof Ui.NavW
     * @param {object} $elem - a coordinate doom element.
     */
    window.NWupdateCoordSys = function ($elem) {       
      let value = Number($elem.value);
      let min = Number($elem.min);
      let max = Number($elem.max);    
      if (value < min) value = min;
      if (value > max) value = max;    
      if ($elem.id == 'raInputF') {      
        let h = Math.trunc(value);
        let m = Math.trunc(60*(value - h));
        let s = Math.trunc(60*(60*(value - h) - m));
        el.raH.value = h;
        el.raM.value = m;
        el.raS.value = s;      
      }
      else if ($elem.id == 'decInputF') {      
        let d = Math.trunc(value);
        let x = Math.abs(value) - Math.abs(d);
        let m = Math.trunc(60*x);
        let s = Math.trunc(60*(60*x - m));
        el.decD.value = d;
        el.decM.value = m;
        el.decS.value = s;      
      }
      else {
        $elem.value = Math.round(value);
        let raF = Number(el.raH.value) + Number(el.raM.value)/60 + Number(el.raS.value)/3600;
        el.raF.value = raF.toFixed(4);
        let s = ((Number(el.decD.value) < 0) ? -1 : 1);
        let decF = Number(el.decD.value) + s*Number(el.decM.value)/60 + s*Number(el.decS.value)/3600;
        el.decF.value = decF.toFixed(4);
      }    
    }

    /**
     * Restricts a time step to the boundary values.
     * @memberof Ui.NavW
     * @param {object} $elem - a time step doom element.
     */
    window.NWtimeStepCheck = function ($elem) {
      let value = Number($elem.value);
      let min = Number($elem.min);
      let max = Number($elem.max);    
      if (value < min) value = min;
      if (value > max) value = max;
      $elem.value = Math.trunc(value);
    }

    /**
     * Sends a command to Horus server to point the laser to the celestial object selected in the el.navObjectsCombo at a specific date and time.
     * @memberof Ui.NavW
     * @param {string} timeOpt - 'now' to point to star now or 'date' to point to the star at a date and time specified at the el.objDate and el.objTimeHTML elements.
     */
    window.NWgoStar = async function (timeOpt) {       
      let opt = valueSelected(el.navObjectsCombo);                
      let style = el.objectPointerStyle.value;
      let date;
      if (timeOpt == 'now') date = new Date();  
      else if (timeOpt == 'date') date = new Date(el.objDate.value+'T'+el.objTime.value);
      else {
        let s = Number(timeOpt);
        let d = new Date(el.objDate.value+'T'+el.objTime.value);    
        let year = d.getFullYear() + s*Number(el.timeStepY.value);
        let month = d.getMonth();
        let day = d.getDate() + s*Number(el.timeStepD.value);
        let hour = d.getHours();
        let minute = d.getMinutes() + s*Number(el.timeStepM.value);
        date = new Date(year, month, day, hour, minute);        
      }
      el.objDate.value = localDateString(date);
      el.objTime.value = localTimeString(date);  
      let eqCoord = equatorialFromObjectData(opt, date);
      
      await NWgoObjectStyle(style, eqCoord); 
    }

    /**
     * Sends a command to Horus server to execute the laser path along the selected track.
     * @memberof Ui.NavW
     * @param {string} opt - 'fullTrack' to execute the full track recorded in trackCoords global variable. Otherwise, each track step is executed at a time.
     */
    window.NWgoTrack = async function (opt) {       
      if (trackCoords.coords) {
        let circle = valueSelected(el.trackPointerStyle).includes('circle');
        let solid = valueSelected(el.trackPointerStyle).includes('solid');
        let dashed = valueSelected(el.trackPointerStyle).includes('dashed');          
        let ldelay = db.lineSpeedInputDatalistParams.delaylist[Number(el.lineSpeedR.value)-1];
        let cdelay = db.circleSpeedInputDatalistParams.delaylist[Number(el.circleSpeedR.value)-1];      
        let lp = Math.round(Number(el.lineOnR.value)/25);      
        let llp = solid ? [1, 0] : [lp, 4-lp];
        let cp = Math.round(Number(el.circleOnR.value)/25);
        let clp = [cp, 4-cp];
        let linc = el.lineAngR.value*Math.PI/180;
        let cinc = el.circleAngR.value*Math.PI/180;
        let cap = el.circleApR.value*Math.PI/180;
        let date;
        if (el.trackAtDatetime.checked) date = new Date(el.trackDate.value+'T'+el.trackTime.value);
        else date = new Date();    
        let dt = (date - new Date())*24/ga.sideralDay;
        let ra0, dec0, ra1, dec1, eq0, eq1;
        if (opt == 'fullTrack') {
          let trackPath = new Path();
          for (let coord of trackCoords.coords) {        
            ra0 = ra180to24(coord[0][0]) - dt;
            dec0 = coord[0][1];
            eq0 = new Equatorial(ra0, dec0);                
            if (circle) trackPath.addPath(new makeCircle(eq0, cap, cinc, clp, cdelay));
            for (let i = 0; i < coord.length-1; i++) {
              ra0 = ra180to24(coord[i][0]) - dt;
              dec0 = coord[i][1];
              ra1 = ra180to24(coord[i+1][0]) - dt;        
              dec1 = coord[i+1][1];
              eq0 = new Equatorial(ra0, dec0);
              eq1 = new Equatorial(ra1, dec1);            
              if (solid || dashed) trackPath.addPath(new makeGeodesic(eq0, eq1, linc, llp, ldelay));            
              if (circle) trackPath.addPath(new makeCircle(eq0, cap, cinc, clp, cdelay));            
            }
          }
          let commPath = new CommPath(trackPath, CalibInstance);	  
          let trackCyclicallyOpt = getRadioValue('trackCyclicallyRadio');          
          await BleInstance.goPath(commPath, trackCyclicallyOpt);        
        }
        else {      
          trackCoords.step += Number(opt);
          trackCoords.step = (trackCoords.indexes.length + trackCoords.step)%trackCoords.indexes.length;
          let index = trackCoords.indexes[trackCoords.step];
          let coord = trackCoords.coords[index[0]][index[1]];            
          ra0 = ra180to24(coord[0]) + dt;
          dec0 = coord[1];      
          eq0 = new Equatorial(ra0, dec0);
          let trackPath;
          if (circle) trackPath = new makeCircle(eq0, cap, cinc, clp, cdelay);                  
          else {
            let seg = new Segment(eq0, 1, 0);
            trackPath = new Path();
            trackPath.addSegment(seg);
          }
          let commPath = new CommPath(trackPath, CalibInstance);	                
          await BleInstance.goPath(commPath, 'forward');        
          speakStar(coord);      
        }    
      }
      else alert("Track coordinates not found.");      
    }

    /**
     * Function called when a new track is selected at the el.navTracksComboHTML element. It actualizes the global variable trackCoords with the data of the selected track.
     * @memberof Ui.NavW
     */
    window.NWresetTrack = function () {
      let track = valueSelected(el.navTracksCombo).split("|");
      let trackType = track[0];
      let trackId = track[1];    
      trackCoords.coords = getCoordinates(trackType, trackId);
      trackCoords.step = 0;
      trackCoords.indexes = [];    
      for (let i = 0; i < trackCoords.coords.length; i++)
        for (let j = 0; j < trackCoords.coords[i].length; j++) 
          trackCoords.indexes = trackCoords.indexes.concat([[i, j]]);  
    }

  }

  /**
   * Communication Window functions in the client app.
   * @namespace CommW
   * @memberof Ui
   */
  CommW: {  

    /**
     * Communication start.
     * @memberof Ui.CommW
     */
    window.cmStartComm = function () {
      BleInstance.startComm();
    }

  }  

  /**
   * Config Window functions in the client app.
   * @namespace ConfigW
   * @memberof Ui
   */
  ConfigW: {    
    
    /**
     * Function called when a pointer input range configHTML element is changed to actualize the corresponding text with the input value.
     * @memberof Ui.ConfigW
     * @param {string} option - 'lineSpeed', 'circleSpeed', 'lineOn', 'lineAng', 'circleOn', 'circleAp' or 'circleAng'.
     */    
    window.updatePointer = function (option) {
      switch (option) {
        case 'lineSpeed':
          el.lineSpeedT.innerHTML = el.lineSpeedR.value;
          break;
        case 'circleSpeed':
          el.circleSpeedT.innerHTML = el.circleSpeedR.value;
          break;
        case 'lineOn':
          el.lineOnT.innerHTML = el.lineOnR.value + '%';
          break;
        case 'lineAng':
            el.lineAngT.innerHTML = el.lineAngR.value + '°';
            break;
        case 'circleOn':
          el.circleOnT.innerHTML = el.circleOnR.value + '%';
          break;
        case 'circleAp':
          el.circleApT.innerHTML = el.circleApR.value + '°';
          break;
        case 'circleAng':
          el.circleAngT.innerHTML = el.circleAngR.value + '°';
          break;
      }
    }    

    /**
     * Function called to actualize the step motor controller width.
     * @memberof Ui.ConfigW
     */
    window.updateControllerWidth = function () {
      el.controllerWidthValue.innerHTML = el.controllerWidth.value + "%";
      el.controllerSVGcontainer.style.width = el.controllerWidthValue.innerHTML;
    }
  
    /**
     * speechSynthesis instance
     * @memberof Ui.ConfigW
     */  
    let synth = window.speechSynthesis;

    /**
     * List of available voices for speechSynthesis.
     * @memberof Ui.ConfigW
     */
    var voices = [];

    /**
     * Creates the voice list.
     * @memberof Ui.ConfigW
     */
    var populateVoiceList = function () {  
      voices = synth.getVoices().sort((a, b) => {
        const aname = a.name.toUpperCase(), bname = b.name.toUpperCase();
        if ( aname < bname ) return -1;
        else if ( aname == bname ) return 0;
        else return +1;
      });  
      for(let i = 0; i < voices.length ; i++) {
        let option = document.createElement('option');
        option.textContent = voices[i].name + ' (' + voices[i].lang + ')';
        
        if(voices[i].default) {
          option.textContent += ' -- DEFAULT';
        }

        option.setAttribute('data-lang', voices[i].lang);
        option.setAttribute('data-name', voices[i].name);    
        el.speechLanguage.appendChild(option);    
        if (db.startingLangName) {
          if (voices[i].lang == db.startingLangName) option.selected = 'selected';
        }
        else if (voices[i].default) option.selected = 'selected';
      }  
    }

    /**
     * Speaks the star designations checked in the speak options in the Config window.
     * @memberof Ui.ConfigW
     * @param {number} coord - A star equatorial coordinate contained in itemsData.star.features.geometry.coordinates.
     */
    var speakStar = function (coord) {      
      if (el.speakStarName.checked || el.speakBayer.checked || el.speakConstellation.checked || el.speakHipparcos.checked) {    
        if (synth.speaking) {
            console.error('speechSynthesis.speaking');
            return;
        }
        let text = "";
        let snames = {};
        for (let features of itemsData.star.features)
          if (features.geometry.coordinates[0] == coord[0] && features.geometry.coordinates[1] == coord[1]) {      
            snames = itemsNames.star[features.id];            
            if (el.speakStarName.checked && snames.name != "") text = snames.name + ". ";
            if (el.speakBayer.checked && snames.bayer != "") text += snames.bayer + ". ";
            if (el.speakConstellation.checked && snames.c != "") {          
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
            if (el.speakHipparcos.checked && snames.id != "") text += "Hiparcos " + snames.id + ". ";        
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
          let selectedOption = el.speechLanguage.selectedOptions[0].getAttribute('data-name');
          for(let i = 0; i < voices.length ; i++) {
            if(voices[i].name === selectedOption) {
              utterThis.voice = voices[i];
              break;
            }
          }
          utterThis.pitch = el.speechPitch.value;
          utterThis.rate = el.speechRate.value;
          synth.speak(utterThis);
        }
      }
    }

    populateVoiceList('pt-BR');
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }
  }

}

//Set initial window:
setWindow("appCommW", document.getElementById("commM"));

//Set input datalist parameters:
setInputRangeDatalist(db.stepSizeInputDatalistParams);
setInputRangeDatalist(db.lineSpeedInputDatalistParams);
setInputRangeDatalist(db.lineOnInputDatalistParams);
setInputRangeDatalist(db.circleSpeedInputDatalistParams);
setInputRangeDatalist(db.circleOnInputDatalistParams);
setInputRangeDatalist(db.circleApertureInputDatalistParams);

//Load sky objects data and names:
loadItemsDataNames();

//Set pointer style options:
createComboOptions(el.objectPointerStyle, db.pointerStyleOptions);
createComboOptions(el.coordsPointerStyle, db.pointerStyleOptions);
createComboOptions(el.trackPointerStyle, db.trackStyleOptions);

//Set items type options:
for (let i in itemsElements) {
  let item = itemsElements[i];  
  createComboOptions(item["typeCombo"], item["options"]);  
  setFiltersEvents(item, db.filterComboMinLength);
  //Set initial navigation type option:  
  item["typeCombo"].selectedIndex = 1;
  changeObjectsType(item["typeCombo"]);
}

//Reset track events:
el.navTracksCombo.addEventListener('change', NWresetTrack);
el.navTracksCombo.addEventListener('click', NWresetTrack);
el.navTracksTypeCombo.addEventListener('change', NWresetTrack);
el.navTracksTypeCombo.addEventListener('click', NWresetTrack);
el.trackPointerStyle.addEventListener('change', NWresetTrack);
el.trackDate.addEventListener('change', NWresetTrack);
el.trackTime.addEventListener('change', NWresetTrack);
el.trackAtDatetime.addEventListener('change', NWresetTrack);

//Set initial step size:
updateStepSize();

//Set navigation actual time:
el.objDate.value = localDateString(new Date());
el.objTime.value = localTimeString(new Date());
el.trackDate.value = localDateString(new Date());
el.trackTime.value = localTimeString(new Date());

//Set pointer config initial options:
updatePointer('lineSpeed');
updatePointer('circleSpeed');
updatePointer('lineOn');
updatePointer('lineAng');
updatePointer('circleOn');
updatePointer('circleAp');
updatePointer('circleAng');

//Set initial controller width:
updateControllerWidth();

//Set inital trackCoords:
NWresetTrack();

//Useful to prevent accidental page reload which deletes any calibration.
window.addEventListener("beforeunload", function(event) {
  event.preventDefault();
  return event.returnValue = "Are you sure you want to exit?";
});
 
//ServiceWorker initialization:
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker
      .register("/Stellector/hathor/serviceWorker.js")
      .then(res => console.log("service worker registered"))
      .catch(err => console.log("service worker not registered", err))
  })
}
