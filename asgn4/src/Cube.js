'use strict';
// Cube.js ─ unit cube centered at origin with normals and UVs
// Shared static buffers (uploaded once, reused every draw call).

class Cube {
  constructor() {
    this.matrix = new Matrix4();
    this.color  = [1.0, 1.0, 1.0, 1.0];
  }

  // ─── static geometry init (call once after gl is ready) ─────
  static _staticInit(gl) {
    if (Cube._ready) return;
    Cube._gl = gl;

    // 6 faces × 2 triangles × 3 verts = 36 verts
    // Face order: +X  −X  +Y  −Y  +Z  −Z
    const pos = new Float32Array([
      // +X
       0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
       0.5,-0.5,-0.5,  0.5, 0.5, 0.5,  0.5,-0.5, 0.5,
      // −X
      -0.5,-0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5,
      -0.5,-0.5, 0.5, -0.5, 0.5,-0.5, -0.5,-0.5,-0.5,
      // +Y
      -0.5, 0.5,-0.5, -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,
      -0.5, 0.5,-0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5,
      // −Y
      -0.5,-0.5, 0.5, -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,
      -0.5,-0.5, 0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5,
      // +Z
      -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5,
      -0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
      // −Z
       0.5,-0.5,-0.5, -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,
       0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
    ]);

    const norm = new Float32Array([
       1,0,0, 1,0,0, 1,0,0,  1,0,0, 1,0,0, 1,0,0,
      -1,0,0,-1,0,0,-1,0,0, -1,0,0,-1,0,0,-1,0,0,
       0,1,0, 0,1,0, 0,1,0,  0,1,0, 0,1,0, 0,1,0,
       0,-1,0,0,-1,0,0,-1,0, 0,-1,0,0,-1,0,0,-1,0,
       0,0,1, 0,0,1, 0,0,1,  0,0,1, 0,0,1, 0,0,1,
       0,0,-1,0,0,-1,0,0,-1, 0,0,-1,0,0,-1,0,0,-1,
    ]);

    const uv = new Float32Array([
      0,0, 0,1, 1,1,  0,0, 1,1, 1,0,   // +X
      0,0, 0,1, 1,1,  0,0, 1,1, 1,0,   // −X
      0,0, 0,1, 1,1,  0,0, 1,1, 1,0,   // +Y
      0,0, 0,1, 1,1,  0,0, 1,1, 1,0,   // −Y
      0,0, 1,0, 1,1,  0,0, 1,1, 0,1,   // +Z
      0,0, 1,0, 1,1,  0,0, 1,1, 0,1,   // −Z
    ]);

    Cube._posBuf  = _mkBuf(gl, pos);
    Cube._normBuf = _mkBuf(gl, norm);
    Cube._uvBuf   = _mkBuf(gl, uv);
    Cube._ready = true;
  }
}
Cube._ready = false;

// ─── helper: allocate + upload a GL ARRAY_BUFFER ──────────────
function _mkBuf(gl, data) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buf;
}
