'use strict';
// Sphere.js - parametric unit sphere, smooth normals (normal = position)

function _mkBufSph(gl, data) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buf;
}

class Sphere {
  constructor() {
    this.matrix = new Matrix4();
    this.color  = [1.0, 1.0, 1.0, 1.0];
  }

  static _staticInit(gl, latBands = 24, lonBands = 24) {
    if (Sphere._ready) return;
    Sphere._gl = gl;

    const rawPos  = [], rawNorm = [], rawUV = [];

    for (let lat = 0; lat <= latBands; lat++) {
      const theta   = (lat / latBands) * Math.PI;
      const sinT    = Math.sin(theta);
      const cosT    = Math.cos(theta);
      for (let lon = 0; lon <= lonBands; lon++) {
        const phi  = (lon / lonBands) * 2 * Math.PI;
        const sinP = Math.sin(phi);
        const cosP = Math.cos(phi);
        const x = cosP * sinT;
        const y = cosT;
        const z = sinP * sinT;
        rawPos.push(x, y, z);
        rawNorm.push(x, y, z);  // unit sphere: normal == position
        rawUV.push(lon / lonBands, lat / latBands);
      }
    }

    // Build flat arrays by expanding index list
    const flatP = [], flatN = [], flatU = [];
    const stride = lonBands + 1;

    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < lonBands; lon++) {
        const a = lat * stride + lon;
        const b = a + stride;
        // Two triangles per quad
        const tris = [a, b, a+1,  b, b+1, a+1];
        for (const idx of tris) {
          flatP.push(rawPos[idx*3],  rawPos[idx*3+1],  rawPos[idx*3+2]);
          flatN.push(rawNorm[idx*3], rawNorm[idx*3+1], rawNorm[idx*3+2]);
          flatU.push(rawUV[idx*2],   rawUV[idx*2+1]);
        }
      }
    }

    Sphere._vertCount = flatP.length / 3;
    Sphere._posBuf    = _mkBufSph(gl, new Float32Array(flatP));
    Sphere._normBuf   = _mkBufSph(gl, new Float32Array(flatN));
    Sphere._uvBuf     = _mkBufSph(gl, new Float32Array(flatU));
    Sphere._ready = true;
  }
}
Sphere._ready = false;
Sphere._vertCount = 0;
