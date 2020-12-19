import {VecSP, PathSP, CommSP} from './modules/StarPointer.module.js';
import * as THREE from './libs/three.module.js';

var center = new THREE.Spherical(1.0, 0.5, 1.5);
var border = 0.5;
var angleIncrement = 0.2;
var lpattern = [5, 5];
var delay = 50;

var circ = new PathSP.Circle(center, border, angleIncrement, lpattern, delay);

var ppath = new CommSP.CommPath(circ.path);

console.log(circ.path.size);
console.log(circ.path.duration);
console.log(circ.path.path[30].coord);
console.log(circ.path.path[11].laser);
console.log(ppath.parsedPath)