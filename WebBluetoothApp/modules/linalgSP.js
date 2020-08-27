/**
 * Linear Algebra module to the StarPointer app.
 * @module libs/linalgSP.js
 * @see module:libs/linalgSP.js
 */


/**
 * A namespace for the vector operations in the StarPointer app'.
 */
let VecSP = {};

/** Class representing a unity vector in rectangular coordinates. */
VecSP.Rectangular = class {
    /**
     * Create a rectangular representation of a unity vector.
     * @param {array} c = [float x, float y, float z] - the c rectangular array format.
     */
     constructor (c) {
         this.value = null;
         this.log = "";
         this.set(c);
     }
     /**
     * Set this.value to the [x, y, z] array format.
     */
    set(c) {
        if (c != null) {
            try {
                let n = (c[0] ** 2 + c[1] ** 2 + c[2] ** 2) ** 0.5;
                this.value = [c[0] / n, c[1] / n, c[2] / n];
                this.log += "Ok: VecSP.Rectangular.value was set.\n";
            }
            catch (err) {
                this.value = null;
                this.log += err + ". VecSP.Rectangular.value could not be set.\n";
                alert(this.log);
            }
        }
    }
    /**
     * Get the x component of this.value [x, y, z] rectangular array format.
     */
    get x () {
        if (this.value != null) return this.value[0];
        else return false;
    }
    /**
     * Get the y component of this.value [x, y, z] rectangular array format.
     */
    get y () {
        if (this.value != null) return this.value[1];
        else return false;
    }
    /**
     * Get the z component of this.value [x, y, z] rectangular array format.
     */
    get z () {
        if (this.value != null) return this.value[2];
        else return false;
    }
}

/** Class representing a unity vector in spherical coordinates. */
VecSP.Spherical = class {
    /**
     * Create a spherical representation of a unity vector.
     * @param {array} c = [float phi, float theta] - the c spherical array format in the azimuthal phi (0 to 2*PI radians) and polar theta (0 to PI radians) angles.
     */
     constructor (c) {
         this.value = null;
         this.log = "";
         this.set(c);
     }
     /**
     * Set this.value to the [phi, theta] array format.
     */
    set(c) {
        if (c != null) {
            try {
                if (c[0] >= 0.0 && c[0] <= 2 * Math.PI && c[1] >= 0.0 && c[1] <= Math.PI) {
                    this.value = c;
                    this.log += "Ok: VecSP.Spherical.value was set.\n";
                }
                else {
                    this.value = null;
                    this.log += "Err: VecSP.Spherical.value out of range.\n";
                    alert(this.log);
                }
            }
            catch (err) {
                this.value = null;
                this.log += err + ". VecSP.Spherical.value could not be set.\n";
                alert(this.log);
            }
        }
    }
    /**
     * Get the phi component of this.value [phi, theta] spherical array format.
     */
    get phi () {
        if (this.value != null) return this.value[0];
        else return false;
    }
    /**
     * Get the theta component of this.value [phi, theta] spherical array format.
     */
    get theta () {
        if (this.value != null) return this.value[1];
        else return false;
    }
}

/** Class representing a unity vector in equatorial coordinates with RA ranging from 0 to 24hs. */
VecSP.Equatorial24 = class {
    /**
     * Create a RA 24hs equatorial representation of a unity vector.
     * @param {array} c = [float RA, float DEC] - the c equatorial array format in the Right Ascension (0 to 24hs) and Declination (-90º to 90º) coordinates.
     */
     constructor (c) {
         this.value = null;
         this.log = "";
         this.set(c);
     }
     /**
     * Set this.value to the [RA, DEC] array format.
     */
    set(c) {
        if (c != null) {
            try {
                if (c >= 0.0 && c[0] <= 24.0 && c[1] >= -90.0 && c[1] <= 90.0) {
                    this.value = c;
                    this.log += "Ok: VecSP.Equatorial24.value was set.\n";
                }
                else {
                    this.value = null;
                    this.log += "Err: VecSP.Equatorial24.value out of range.\n";
                    alert(this.log);
                }
            }
            catch (err) {
                this.value = null;
                this.log += err + ". VecSP.Equatorial24.value could not be set.\n";
                alert(this.log);
            }
        }
    }
    /**
     * Get the RA component of this.value [RA, DEC] equatorial array format.
     */
    get RA () {
        if (this.value != null) return this.value[0];
        else return false;
    }
    /**
     * Get the DEC component of this.value [RA, DEC] equatorial array format.
     */
    get DEC () {
        if (this.value != null) return this.value[1];
        else return false;
    }
}

/** Class representing a unity vector in equatorial coordinates with RA ranging from -180º to 180º. */
VecSP.Equatorial180 = class {
    /**
     * Create a RA 180º equatorial representation of a unity vector.
     * @param {array} c = [float RA, float DEC] - the c equatorial array format in the Right Ascension (-180º to 180º) and Declination (-90º to 90º) coordinates.
     */
     constructor (c) {
         this.value = null;
         this.log = "";
         this.set(c);
     }
     /**
     * Set this.value to the [RA, DEC] array format.
     */
    set(c) {
        if (c != null) {
            try {
                if (c[0] >= -180.0 && c[0] <= 180.0 && c[1] >= -90.0 && c[1] <= 90.0) {
                    this.value = c;
                    this.log += "Ok: VecSP.Equatorial180.value was set.\n";
                }
                else {
                    this.value = null;
                    this.log += "Err: VecSP.Equatorial180.value out of range.\n"
                    alert(this.log);
                }
            }
            catch (err) {
                this.value = null;
                this.log += err + ". VecSP.Equatorial180.value could not be set.\n";
                alert(this.log);
            }
        }
    }
    /**
     * Get the RA component of this.value [RA, DEC] equatorial array format.
     */
    get RA () {
        if (this.value != null) return this.value[0];
        else return false;
    }
    /**
     * Get the DEC component of this.value [RA, DEC] equatorial array format.
     */
    get DEC () {
        if (this.value != null) return this.value[1];
        else return false;
    }
}

/** Class representing a unity vector in step motor steps. */
VecSP.Step = class {
    /**
     * Create a step motor steps representation of a unity vector.
     * @param {array} c = [int fix, int mob] - the c steps array format in the fixed motor (0 to this.maxStep) and mobile motor (0 to this.maxStep) coordinates.
     */
     constructor (c) {
         this.maxStep = stps360;
         this.value = null;
         this.log = "";
         this.set(c);
     }
     /**
     * Set this.value to the [fix, mob] array format.
     */
    set(c) {
        if (c != null) {
            try {
                if (c[0] >= 0 && c[1] >= 0) {
                    let c0 = Math.round(c[0]) % this.maxStep;
                    let c1 = Math.round(c[1]) % this.maxStep;
                    this.value = [c0, c1];
                    this.log += "Ok: VecSP.Step.value was set.\n";
                }
                else {
                    this.value = null;
                    this.log += " Err: VecSP.Step.value out of range.\n"
                    alert(this.log);
                }
            }
            catch (err) {
                this.value = null;
                this.log += err + ". VecSP.Step.value could not be set.\n";
                alert(this.log);
            }
        }
    }
    /**
     * Get the fix component of this.value [fix, mob] stepper array format.
     */
    get fix () {
        if (this.value != null) return this.value[0];
        else return false;
    }
    /**
     * Get the mob component of this.value [fix, mob] stepper array format.
     */
    get mob () {
        if (this.value != null) return this.value[1];
        else return false;
    }
}


/** Class representing an unity vector in various formats. */
VecSP.Representation = class {
    /**
     * Create an unity vector.
     * @param {object} v - allowed objects: array [x, y, z], VecSP.Rectangular, VecSP.Spherical, VecSP.Equatorial24, VecSP.Equatorial180, VecSP.Step, THREE.Vector3, THREE.Spherical.
     */
    constructor (v) {
        this.rectangular = null;
        this.log = "";
        this.set(v);
    }
    /**
     * Set this.rectangular to the [x, y, z] array rectangular format.
     */
    set(v) {
        let msg = "";
        try {
            msg = "Ok: VecSP.Representation.rectangular was set.";
            if (v instanceof Array) {
                let n = (v[0] ** 2 + v[1] ** 2 + v[2] ** 2) ** 0.5;
                this.rectangular = [v[0] / n, v[1] / n, v[2] / n];
            }
            else if (v instanceof VecSP.Rectangular) {
                this.rectangular = v.value;
            }
            else if (v instanceof VecSP.Spherical) {
                let a = new THREE.Vector3();
                a.setFromSphericalCoords(1.0, v.phi, v.theta);
                this.rectangular = [a.x, a.y, a.z];
            }
            else if (v instanceof VecSP.Equatorial24) {
                let phi = v.RA * hourToRad;
                let theta = (v.DEC + 90.0) * degToRad;
                let a = new THREE.Vector3();
                a.setFromSphericalCoords(1.0, phi, theta);
                this.rectangular = [a.x, a.y, a.z];
            }
            else if (v instanceof VecSP.Equatorial180) {
                let phi = ((v.RA + 360.0) % 360.0) * degToRad;
                let theta = (v.DEC + 90.0) * degToRad;
                let a = new THREE.Vector3();
                a.setFromSphericalCoords(1.0, phi, theta);
                this.rectangular = [a.x, a.y, a.z];
            }
            else if (v instanceof VecSP.Step) {
                let phi = v.fix * stepToRad;
                let theta = v.mob * stepToRad;
                let a = new THREE.Vector3();
                a.setFromSphericalCoords(1.0, phi, theta);
                this.rectangular = [a.x, a.y, a.z];
            }
            else if (v instanceof THREE.Vector3) {
                let a = v.clone().normalize();
                this.rectangular = [a.x, a.y, a.z];
            }
            else if (v instanceof THREE.Spherical) {
                let a = new THREE.Vector3();
                a.setFromSpherical(v);
                this.rectangular = [a.x, a.y, a.z];
            }
            else {
                this.rectangular = null;
                msg = "";
            }
        }    
        catch (err) {
            this.rectangular = null;
            msg = err + ". VecSP.Representation.rectangular could not be set.\n";
            alert(msg);
        }
        this.log += msg;
    }
    /**
     * Get the x component of this.rectangular [x, y, z] array rectangular format.
     */
    get x () {
        if (this.rectangular != null) return this.rectangular[0];
        else return false;
    }
    /**
     * Get the y component of this.rectangular [x, y, z] array rectangular format.
     */
    get y () {
        if (this.rectangular != null) return this.rectangular[1];
        else return false;
    }
    /**
     * Get the z component of this.rectangular [x, y, z] array rectangular format.
     */
    get z () {
        if (this.rectangular != null) return this.rectangular[2];
        else return null;
    }
    /**
     * Convert this.rectangular to a VecSP.Spherical object.
     */
    toSpherical () {
        let c = this.toTHREESpherical();
        if (c != null) return new VecSP.Spherical([c.phi, c.theta]);
        else return null;
    }
    /**
     * Convert this.rectangular to a THREE.Vector3 object.
     */
    toTHREEVector () {
        let v = this.rectangular;
        if (v != null) return new THREE.Vector3(v[0], v[1], v[2]);
        else return null;
    }
    /**
     * Convert this.rectangular to a THREE.Spherical object.
     */
    toTHREESpherical () {
        let v = this.rectangular;
        if (v != null) {
            let x = new THREE.Spherical();
            return x.setFromCartesianCoords(v[0], v[1], v[2]);
        }
        else return null;
    }

}