'use strict';
// OBJLoader.js ─ parses .obj text (supports v, vt, vn, f)
// Handles face formats: v  v/vt  v//vn  v/vt/vn
// Fan-triangulates quads and n-gons.

class OBJLoader {
  constructor() {
    this.matrix    = new Matrix4();
    this.color     = [0.6, 0.35, 0.9, 1.0];
    this.vertCount = 0;
    this._posBuf   = null;
    this._normBuf  = null;
    this._uvBuf    = null;
    this._gl       = null;
  }

  // ─── parse an OBJ string and upload geometry to GPU ──────────
  parse(gl, text) {
    this._gl = gl;
    const rawV = [], rawVN = [], rawVT = [];
    const fp = [], fn = [], fu = [];

    for (let rawLine of text.split('\n')) {
      const line  = rawLine.trim();
      if (!line || line[0] === '#') continue;
      const tok = line.split(/\s+/);

      if (tok[0] === 'v') {
        rawV.push([+tok[1], +tok[2], +tok[3]]);
      } else if (tok[0] === 'vn') {
        rawVN.push([+tok[1], +tok[2], +tok[3]]);
      } else if (tok[0] === 'vt') {
        rawVT.push([+tok[1], +tok[2]]);
      } else if (tok[0] === 'f') {
        const verts = tok.slice(1);
        // Fan triangulation: triangle (0,i,i+1) for i=1..n-2
        for (let i = 1; i < verts.length - 1; i++) {
          for (const token of [verts[0], verts[i], verts[i+1]]) {
            const parts = token.split('/');
            const vi  = parseInt(parts[0]) - 1;
            const vti = (parts[1] && parts[1] !== '') ? parseInt(parts[1]) - 1 : -1;
            const vni = (parts[2] && parts[2] !== '') ? parseInt(parts[2]) - 1 : -1;

            const v = rawV[vi]  || [0,0,0];
            const n = (vni >= 0 && rawVN[vni]) ? rawVN[vni] : [0,1,0];
            const u = (vti >= 0 && rawVT[vti]) ? rawVT[vti] : [0,0];

            fp.push(v[0], v[1], v[2]);
            fn.push(n[0], n[1], n[2]);
            fu.push(u[0], u[1]);
          }
        }
      }
    }

    this.vertCount = fp.length / 3;
    this._posBuf   = _mkBuf(gl, new Float32Array(fp));
    this._normBuf  = _mkBuf(gl, new Float32Array(fn));
    this._uvBuf    = _mkBuf(gl, new Float32Array(fu));
  }

  // ─── fetch a .obj file from URL, then parse ──────────────────
  async loadFromURL(gl, url) {
    const resp = await fetch(url);
    const text = await resp.text();
    this.parse(gl, text);
  }
}

// ─── Generate a torus OBJ string (embedded model) ─────────────
function generateTorusOBJ(R = 0.72, r = 0.28, majorSegs = 28, minorSegs = 18) {
  const lines = [];

  // Vertices
  for (let i = 0; i <= majorSegs; i++) {
    const phi = (i / majorSegs) * 2 * Math.PI;
    const cp = Math.cos(phi), sp = Math.sin(phi);
    for (let j = 0; j <= minorSegs; j++) {
      const theta = (j / minorSegs) * 2 * Math.PI;
      const ct = Math.cos(theta), st = Math.sin(theta);
      const x = (R + r * ct) * cp;
      const y = r * st;
      const z = (R + r * ct) * sp;
      lines.push(`v ${x.toFixed(5)} ${y.toFixed(5)} ${z.toFixed(5)}`);
    }
  }

  // Normals (same loop order)
  for (let i = 0; i <= majorSegs; i++) {
    const phi = (i / majorSegs) * 2 * Math.PI;
    const cp = Math.cos(phi), sp = Math.sin(phi);
    for (let j = 0; j <= minorSegs; j++) {
      const theta = (j / minorSegs) * 2 * Math.PI;
      const ct = Math.cos(theta), st = Math.sin(theta);
      lines.push(`vn ${(ct*cp).toFixed(5)} ${st.toFixed(5)} ${(ct*sp).toFixed(5)}`);
    }
  }

  // Faces — each quad split into 2 triangles
  const stride = minorSegs + 1;
  for (let i = 0; i < majorSegs; i++) {
    for (let j = 0; j < minorSegs; j++) {
      const a = i * stride + j + 1;
      const b = a + stride;
      const c = b + 1;
      const d = a + 1;
      lines.push(`f ${a}//${a} ${b}//${b} ${d}//${d}`);
      lines.push(`f ${b}//${b} ${c}//${c} ${d}//${d}`);
    }
  }

  return lines.join('\n');
}
