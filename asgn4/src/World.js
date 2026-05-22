'use strict';
// World.js ─ CSE 160 Assignment 4: Lighting
// Phong shading · point light · spotlight · normal viz · OBJ model · blocky tiger

// ================================================================
//  SHADERS
// ================================================================

const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec3 a_Normal;
  attribute vec2 a_UV;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjMatrix;
  uniform mat4 u_NormalMatrix;

  varying vec3 v_Normal;
  varying vec3 v_WorldPos;
  varying vec2 v_UV;

  void main() {
    vec4 wp     = u_ModelMatrix * a_Position;
    v_WorldPos  = wp.xyz;
    // Normal matrix: transpose of inverse of model matrix (upper-left 3×3)
    v_Normal    = normalize(mat3(u_NormalMatrix) * a_Normal);
    v_UV        = a_UV;
    gl_Position = u_ProjMatrix * u_ViewMatrix * wp;
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;

  uniform vec3  u_LightPos;
  uniform vec3  u_LightColor;
  uniform vec3  u_SpotPos;
  uniform vec3  u_SpotDir;
  uniform float u_SpotCutoff;
  uniform int   u_LightOn;
  uniform int   u_SpotOn;
  uniform int   u_NormalViz;

  uniform vec4      u_FragColor;
  uniform sampler2D u_Sampler;
  uniform int       u_UseTexture;
  uniform vec3      u_CameraPos;

  varying vec3 v_Normal;
  varying vec3 v_WorldPos;
  varying vec2 v_UV;

  // Phong contribution from one light source (no ambient ─ added once outside)
  vec3 phong(vec3 lPos, vec3 lCol, vec3 N, vec3 V, vec3 base) {
    vec3  L    = normalize(lPos - v_WorldPos);
    vec3  R    = reflect(-L, N);
    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(R, V), 0.0), 32.0);
    return lCol * (diff * base + spec * vec3(0.65));
  }

  void main() {
    vec3 N = normalize(v_Normal);

    // ── Normal visualisation mode ────────────────────────────
    if (u_NormalViz == 1) {
      gl_FragColor = vec4(N * 0.5 + 0.5, 1.0);
      return;
    }

    // ── Base colour (texture or flat) ────────────────────────
    vec3 base = (u_UseTexture == 1)
                ? texture2D(u_Sampler, v_UV).rgb
                : u_FragColor.rgb;

    // ── No lighting ─────────────────────────────────────────
    if (u_LightOn == 0 && u_SpotOn == 0) {
      gl_FragColor = vec4(base, 1.0);
      return;
    }

    vec3 V      = normalize(u_CameraPos - v_WorldPos);
    vec3 result = 0.15 * base;          // ambient

    // ── Point light ─────────────────────────────────────────
    if (u_LightOn == 1) {
      result += phong(u_LightPos, u_LightColor, N, V, base);
    }

    // ── Spotlight ───────────────────────────────────────────
    if (u_SpotOn == 1) {
      vec3  L  = normalize(u_SpotPos - v_WorldPos);
      float ca = dot(L, normalize(-u_SpotDir));
      if (ca > u_SpotCutoff) {
        float sf = smoothstep(u_SpotCutoff, u_SpotCutoff + 0.08, ca);
        result  += sf * phong(u_SpotPos, vec3(1.0, 0.92, 0.75), N, V, base);
      }
    }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
  }
`;

// ================================================================
//  GLOBALS
// ================================================================

let gl, canvas;
const sh = {};            // cached attribute / uniform locations

// light state
let g_lightPos   = [3, 3, 0];
let g_lightColor = [1, 1, 1];
let g_lightAngle = 0;     // degrees
let g_lightY     = 3.0;
let g_lightOn    = true;
let g_spotOn     = false;
let g_normalViz  = false;

// scene
let g_camera;
let g_spheres  = [];
let g_objModel = null;    // OBJLoader instance

// time
let g_lastTime = 0;
let g_fpsFrames = 0;
let g_fpsTimer  = 0;

// spotlight fixed params
const SPOT_POS = [-1, 6, 0];
const SPOT_DIR = [0.1, -1, 0.1];       // roughly downward
const SPOT_CUTOFF = Math.cos(22 * Math.PI / 180);

// ================================================================
//  ENTRY
// ================================================================

function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');
  if (!gl) { alert('WebGL not available in your browser.'); return; }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.42, 0.65, 0.88, 1.0);   // sky colour

  _initShaders();
  _initGeometry();
  _initScene();
  _initUI();

  requestAnimationFrame(_tick);
}

// ================================================================
//  INIT HELPERS
// ================================================================

function _initShaders() {
  // cuon-utils initShaders() calls gl.useProgram internally and returns true/false.
  // The resulting program is stored on gl.program.
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, VSHADER_SOURCE); gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS))
      console.error('VERTEX SHADER:\n', gl.getShaderInfoLog(vs));
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, FSHADER_SOURCE); gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS))
      console.error('FRAGMENT SHADER:\n', gl.getShaderInfoLog(fs));
    alert('Shader failed — check console (F12)');
    return;
  }
  const prog = gl.program;  // cuon-utils stores the linked program here
  sh.prog = prog;

  sh.a_Position    = gl.getAttribLocation(prog, 'a_Position');
  sh.a_Normal      = gl.getAttribLocation(prog, 'a_Normal');
  sh.a_UV          = gl.getAttribLocation(prog, 'a_UV');

  sh.u_ModelMatrix  = gl.getUniformLocation(prog, 'u_ModelMatrix');
  sh.u_ViewMatrix   = gl.getUniformLocation(prog, 'u_ViewMatrix');
  sh.u_ProjMatrix   = gl.getUniformLocation(prog, 'u_ProjMatrix');
  sh.u_NormalMatrix = gl.getUniformLocation(prog, 'u_NormalMatrix');

  sh.u_LightPos    = gl.getUniformLocation(prog, 'u_LightPos');
  sh.u_LightColor  = gl.getUniformLocation(prog, 'u_LightColor');
  sh.u_SpotPos     = gl.getUniformLocation(prog, 'u_SpotPos');
  sh.u_SpotDir     = gl.getUniformLocation(prog, 'u_SpotDir');
  sh.u_SpotCutoff  = gl.getUniformLocation(prog, 'u_SpotCutoff');
  sh.u_LightOn     = gl.getUniformLocation(prog, 'u_LightOn');
  sh.u_SpotOn      = gl.getUniformLocation(prog, 'u_SpotOn');
  sh.u_NormalViz   = gl.getUniformLocation(prog, 'u_NormalViz');

  sh.u_FragColor   = gl.getUniformLocation(prog, 'u_FragColor');
  sh.u_Sampler     = gl.getUniformLocation(prog, 'u_Sampler');
  sh.u_UseTexture  = gl.getUniformLocation(prog, 'u_UseTexture');
  sh.u_CameraPos   = gl.getUniformLocation(prog, 'u_CameraPos');
}

function _initGeometry() {
  // Upload shared static vertex data once
  Cube._staticInit(gl);
  Sphere._staticInit(gl);
}

function _initScene() {
  // ── OBJ model: procedurally generated torus ──────────────
  g_objModel = new OBJLoader();
  const torusText = generateTorusOBJ(0.72, 0.28, 28, 18);
  g_objModel.parse(gl, torusText);
  g_objModel.matrix.setTranslate(3.5, 1.2, -2.5);
  g_objModel.matrix.scale(1.3, 1.3, 1.3);
  g_objModel.color = [0.55, 0.25, 0.92, 1.0];

  // ── Spheres ───────────────────────────────────────────────
  const s1 = new Sphere();
  s1.matrix.setTranslate(-2.5, 1.2, -2);
  s1.matrix.scale(1.2, 1.2, 1.2);
  s1.color = [0.18, 0.55, 1.0, 1.0];
  g_spheres.push(s1);

  const s2 = new Sphere();
  s2.matrix.setTranslate(0.5, 0.9, -5.5);
  s2.color = [1.0, 0.28, 0.28, 1.0];
  g_spheres.push(s2);

  // ── Camera ────────────────────────────────────────────────
  g_camera = new Camera(canvas);
  g_camera.eye = [0, 2.5, 9];
  g_camera.at  = [0, 1, 0];
}

// ================================================================
//  UI
// ================================================================

function _initUI() {
  // ── Toggle buttons ───────────────────────────────────────
  const btnLight = document.getElementById('btn-light');
  btnLight.addEventListener('click', () => {
    g_lightOn = !g_lightOn;
    btnLight.textContent = g_lightOn ? '💡 Light: ON' : '💡 Light: OFF';
    btnLight.classList.toggle('active', g_lightOn);
  });

  const btnSpot = document.getElementById('btn-spot');
  btnSpot.addEventListener('click', () => {
    g_spotOn = !g_spotOn;
    btnSpot.textContent = g_spotOn ? '🔦 Spot: ON' : '🔦 Spot: OFF';
    btnSpot.classList.toggle('on', g_spotOn);
  });

  const btnNorm = document.getElementById('btn-normal');
  btnNorm.addEventListener('click', () => {
    g_normalViz = !g_normalViz;
    btnNorm.textContent = g_normalViz ? '🎨 Normals: ON' : '🎨 Normals: OFF';
    btnNorm.classList.toggle('on', g_normalViz);
  });

  // ── Light position sliders ────────────────────────────────
  const slAngle = document.getElementById('sl-angle');
  slAngle.addEventListener('input', () => {
    g_lightAngle = parseFloat(slAngle.value);
    document.getElementById('val-angle').textContent = Math.round(g_lightAngle);
    _updateLightPos();
  });

  const slY = document.getElementById('sl-y');
  slY.addEventListener('input', () => {
    g_lightY = parseFloat(slY.value);
    document.getElementById('val-y').textContent = g_lightY.toFixed(1);
    _updateLightPos();
  });

  // ── Light colour sliders ──────────────────────────────────
  ['r','g','b'].forEach((c, i) => {
    const sl = document.getElementById(`sl-${c}`);
    sl.addEventListener('input', () => {
      g_lightColor[i] = parseFloat(sl.value);
      document.getElementById(`val-${c}`).textContent = g_lightColor[i].toFixed(2);
      _updateColorPreview();
    });
  });

  // ── Camera keyboard ───────────────────────────────────────
  document.addEventListener('keydown', e => {
    const s = 0.18;
    switch (e.code) {
      case 'KeyW':      g_camera.moveForward(s);  break;
      case 'KeyS':      g_camera.moveBackward(s); break;
      case 'KeyA':      g_camera.moveLeft(s);     break;
      case 'KeyD':      g_camera.moveRight(s);    break;
      case 'KeyQ':      g_camera.panLeft(3);      break;
      case 'KeyE':      g_camera.panRight(3);     break;
      case 'ArrowUp':   g_camera.moveUp(s);       break;
      case 'ArrowDown': g_camera.moveUp(-s);      break;
    }
  });

  // ── Camera mouse drag (pan) ───────────────────────────────
  let dragging = false, lastMX = 0, lastMY = 0;
  canvas.addEventListener('mousedown', e => {
    dragging = true; lastMX = e.clientX; lastMY = e.clientY;
  });
  document.addEventListener('mouseup', () => { dragging = false; });
  canvas.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastMX;
    const dy = e.clientY - lastMY;
    g_camera.panLeft(-dx * 0.28);
    g_camera.panUp(dy * 0.18);
    lastMX = e.clientX; lastMY = e.clientY;
  });
}

function _updateLightPos() {
  const rad = g_lightAngle * Math.PI / 180;
  g_lightPos[0] = 4 * Math.cos(rad);
  g_lightPos[1] = g_lightY;
  g_lightPos[2] = 4 * Math.sin(rad);
}

function _updateColorPreview() {
  const r = Math.round(g_lightColor[0]*255);
  const g_ = Math.round(g_lightColor[1]*255);
  const b = Math.round(g_lightColor[2]*255);
  const el = document.getElementById('color-preview');
  if (el) el.style.background = `rgb(${r},${g_},${b})`;
}

// ================================================================
//  TICK / RENDER
// ================================================================

function _tick(ts) {
  const dt = Math.min((ts - g_lastTime) / 1000, 0.05);
  g_lastTime = ts;

  // Animate light orbit
  g_lightAngle = (g_lightAngle + 28 * dt) % 360;
  _updateLightPos();
  const sl = document.getElementById('sl-angle');
  if (sl) sl.value = g_lightAngle;
  const va = document.getElementById('val-angle');
  if (va) va.textContent = Math.round(g_lightAngle);

  // FPS counter
  g_fpsFrames++; g_fpsTimer += dt;
  if (g_fpsTimer >= 1) {
    const fpsEl = document.getElementById('fps');
    if (fpsEl) fpsEl.textContent = `FPS: ${g_fpsFrames}`;
    g_fpsFrames = 0; g_fpsTimer = 0;
  }

  _render();
  requestAnimationFrame(_tick);
}

function _render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // ── Camera / projection ───────────────────────────────────
  const vm = g_camera.getViewMatrix();
  const pm = g_camera.getProjMatrix();
  gl.uniformMatrix4fv(sh.u_ViewMatrix, false, vm.elements);
  gl.uniformMatrix4fv(sh.u_ProjMatrix, false, pm.elements);
  gl.uniform3fv(sh.u_CameraPos, g_camera.eye);

  // ── Light uniforms ────────────────────────────────────────
  gl.uniform3fv(sh.u_LightPos,   g_lightPos);
  gl.uniform3fv(sh.u_LightColor, g_lightColor);
  gl.uniform1i(sh.u_LightOn,  g_lightOn  ? 1 : 0);
  gl.uniform1i(sh.u_SpotOn,   g_spotOn   ? 1 : 0);
  gl.uniform1i(sh.u_NormalViz, g_normalViz ? 1 : 0);
  gl.uniform3fv(sh.u_SpotPos,    SPOT_POS);
  gl.uniform3fv(sh.u_SpotDir,    SPOT_DIR);
  gl.uniform1f(sh.u_SpotCutoff, SPOT_CUTOFF);
  gl.uniform1i(sh.u_Sampler, 0);

  // ── Scene objects ─────────────────────────────────────────
  _drawGround();
  _drawTiger();

  for (const s of g_spheres) _renderSphere(s);
  if (g_objModel && g_objModel.vertCount > 0) _renderOBJ(g_objModel);

  // ── Light markers (lighting off so they're always bright) ─
  gl.uniform1i(sh.u_LightOn, 0);
  gl.uniform1i(sh.u_SpotOn,  0);
  gl.uniform1i(sh.u_NormalViz, 0);

  // Point light marker
  {
    const m = new Matrix4();
    m.setTranslate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    m.scale(0.2, 0.2, 0.2);
    _rc(m, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  }
  // Spotlight marker
  if (g_spotOn) {
    const m = new Matrix4();
    m.setTranslate(SPOT_POS[0], SPOT_POS[1], SPOT_POS[2]);
    m.scale(0.28, 0.28, 0.28);
    _rc(m, 1.0, 0.92, 0.75);
  }
}

// ================================================================
//  DRAW PRIMITIVES
// ================================================================

// _rc: render cube with model matrix + RGBA color, using static buffers
function _rc(mat, r, g, b, a = 1.0) {
  // Set model + normal matrix
  gl.uniformMatrix4fv(sh.u_ModelMatrix, false, mat.elements);
  const nm = new Matrix4();
  nm.setInverseOf(mat);
  nm.transpose();
  gl.uniformMatrix4fv(sh.u_NormalMatrix, false, nm.elements);

  gl.uniform4f(sh.u_FragColor, r, g, b, a);
  gl.uniform1i(sh.u_UseTexture, 0);

  // Bind Cube static buffers
  gl.bindBuffer(gl.ARRAY_BUFFER, Cube._posBuf);
  gl.vertexAttribPointer(sh.a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(sh.a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, Cube._normBuf);
  gl.vertexAttribPointer(sh.a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(sh.a_Normal);

  gl.bindBuffer(gl.ARRAY_BUFFER, Cube._uvBuf);
  gl.vertexAttribPointer(sh.a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(sh.a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function _renderSphere(s) {
  gl.uniformMatrix4fv(sh.u_ModelMatrix, false, s.matrix.elements);
  const nm = new Matrix4(); nm.setInverseOf(s.matrix); nm.transpose();
  gl.uniformMatrix4fv(sh.u_NormalMatrix, false, nm.elements);
  gl.uniform4fv(sh.u_FragColor, s.color);
  gl.uniform1i(sh.u_UseTexture, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, Sphere._posBuf);
  gl.vertexAttribPointer(sh.a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(sh.a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, Sphere._normBuf);
  gl.vertexAttribPointer(sh.a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(sh.a_Normal);

  gl.bindBuffer(gl.ARRAY_BUFFER, Sphere._uvBuf);
  gl.vertexAttribPointer(sh.a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(sh.a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, Sphere._vertCount);
}

function _renderOBJ(obj) {
  gl.uniformMatrix4fv(sh.u_ModelMatrix, false, obj.matrix.elements);
  const nm = new Matrix4(); nm.setInverseOf(obj.matrix); nm.transpose();
  gl.uniformMatrix4fv(sh.u_NormalMatrix, false, nm.elements);
  gl.uniform4fv(sh.u_FragColor, obj.color);
  gl.uniform1i(sh.u_UseTexture, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, obj._posBuf);
  gl.vertexAttribPointer(sh.a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(sh.a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, obj._normBuf);
  gl.vertexAttribPointer(sh.a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(sh.a_Normal);

  gl.bindBuffer(gl.ARRAY_BUFFER, obj._uvBuf);
  gl.vertexAttribPointer(sh.a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(sh.a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, obj.vertCount);
}

// ================================================================
//  SCENE DRAWING FUNCTIONS
// ================================================================

function _drawGround() {
  const m = new Matrix4();
  m.setTranslate(0, -0.1, 0);
  m.scale(22, 0.2, 22);
  _rc(m, 0.12, 0.42, 0.1);
}

// ── Tiger (blocky animal from A2) ────────────────────────────────
// All cube parts positioned relative to world origin, tiger facing +X
const OG = [1.0,  0.50, 0.10, 1.0];  // orange body
const DK = [0.18, 0.08, 0.02, 1.0];  // dark stripe / ear tip
const BG = [1.0,  0.85, 0.65, 1.0];  // beige snout
const BK = [0.04, 0.04, 0.04, 1.0];  // black eyes / nose

// Helper: T * [R] * S matrix
function _tm(tx, ty, tz, sx, sy, sz, rdeg = 0, rax = 0, ray = 1, raz = 0) {
  const m = new Matrix4();
  m.setTranslate(tx, ty, tz);
  if (rdeg !== 0) m.rotate(rdeg, rax, ray, raz);
  m.scale(sx, sy, sz);
  return m;
}

function _drawTiger() {
  const X = 0.5, Y = 0, Z = -1.5;   // tiger world offset

  // Body
  _rc(_tm(X, Y+0.85, Z,      1.65, 0.90, 0.90), ...OG);
  // Body stripes
  _rc(_tm(X+0.40, Y+0.87, Z, 0.15, 0.95, 0.95), ...DK);
  _rc(_tm(X-0.05, Y+0.87, Z, 0.13, 0.95, 0.95), ...DK);
  _rc(_tm(X-0.45, Y+0.87, Z, 0.10, 0.95, 0.95), ...DK);

  // Neck
  _rc(_tm(X+0.82, Y+0.95, Z, 0.32, 0.42, 0.52), ...OG);
  // Head
  _rc(_tm(X+1.10, Y+1.18, Z, 0.72, 0.72, 0.72), ...OG);
  // Head stripe
  _rc(_tm(X+1.10, Y+1.22, Z, 0.12, 0.75, 0.75), ...DK);

  // Snout
  _rc(_tm(X+1.50, Y+1.02, Z, 0.28, 0.22, 0.40), ...BG);
  // Nose
  _rc(_tm(X+1.64, Y+1.04, Z, 0.07, 0.07, 0.15), ...BK);

  // Eyes
  _rc(_tm(X+1.24, Y+1.32, Z+0.22, 0.13, 0.13, 0.13), ...BK);
  _rc(_tm(X+1.24, Y+1.32, Z-0.22, 0.13, 0.13, 0.13), ...BK);

  // Ears
  _rc(_tm(X+0.95, Y+1.62, Z+0.24, 0.18, 0.28, 0.18), ...OG);
  _rc(_tm(X+0.95, Y+1.62, Z-0.24, 0.18, 0.28, 0.18), ...OG);
  _rc(_tm(X+0.95, Y+1.77, Z+0.24, 0.09, 0.12, 0.09), ...DK);
  _rc(_tm(X+0.95, Y+1.77, Z-0.24, 0.09, 0.12, 0.09), ...DK);

  // Legs (FL FR BL BR)
  _rc(_tm(X+0.52, Y+0.28, Z+0.35, 0.26, 0.62, 0.26), ...OG);
  _rc(_tm(X+0.52, Y+0.28, Z-0.35, 0.26, 0.62, 0.26), ...OG);
  _rc(_tm(X-0.52, Y+0.28, Z+0.35, 0.26, 0.62, 0.26), ...OG);
  _rc(_tm(X-0.52, Y+0.28, Z-0.35, 0.26, 0.62, 0.26), ...OG);

  // Paws
  _rc(_tm(X+0.52, Y+0.02, Z+0.35, 0.30, 0.08, 0.30), ...BG);
  _rc(_tm(X+0.52, Y+0.02, Z-0.35, 0.30, 0.08, 0.30), ...BG);
  _rc(_tm(X-0.52, Y+0.02, Z+0.35, 0.30, 0.08, 0.30), ...BG);
  _rc(_tm(X-0.52, Y+0.02, Z-0.35, 0.30, 0.08, 0.30), ...BG);

  // Tail (rotated around Z)
  {
    const m = new Matrix4();
    m.setTranslate(X-0.98, Y+1.0, Z);
    m.rotate(38, 0, 0, 1);
    m.scale(0.16, 0.72, 0.16);
    _rc(m, ...OG);
    // Tail tip stripe
    const mt = new Matrix4();
    mt.setTranslate(X-0.98, Y+1.0, Z);
    mt.rotate(38, 0, 0, 1);
    mt.scale(0.17, 0.18, 0.17);
    mt.translate(0, 2.4, 0);   // top of tail in local coords
    _rc(mt, ...DK);
  }
}

// ================================================================
//  BOOT  ← this was missing; main() was defined but never called
// ================================================================
window.onload = main;
