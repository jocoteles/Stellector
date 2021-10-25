/*
Source: https://raw.githubusercontent.com/benfred/fmin/master/src/blas1.js
*/

/* 
Copyright 2016, Ben Frederickson
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the author nor the names of contributors may be used to
  endorse or promote products derived from this software without specific prior
  written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// need some basic operations on vectors, rather than adding a dependency,
// just define here
export function zeros(x) { var r = new Array(x); for (var i = 0; i < x; ++i) { r[i] = 0; } return r; }
export function zerosM(x,y) { return zeros(x).map(function() { return zeros(y); }); }

export function dot(a, b) {
    var ret = 0;
    for (var i = 0; i < a.length; ++i) {
        ret += a[i] * b[i];
    }
    return ret;
}

export function norm2(a)  {
    return Math.sqrt(dot(a, a));
}

export function scale(ret, value, c) {
    for (var i = 0; i < value.length; ++i) {
        ret[i] = value[i] * c;
    }
}

export function weightedSum(ret, w1, v1, w2, v2) {
    for (var j = 0; j < ret.length; ++j) {
        ret[j] = w1 * v1[j] + w2 * v2[j];
    }
}

export function gemv(output, A, x) {
    for (var i = 0; i < output.length; ++i) {
        output[i] = dot(A[i], x);
    }
}