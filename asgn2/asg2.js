// asg2.js - Assignment 2: Blocky Tiger
// CSE 160, Spring 2026 - Aayan Sheikh

// ---- Shaders ----
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotation;
  void main() {
    gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`;

// ---- Globals ----
var canvas, gl, a_Position, u_ModelMatrix, u_GlobalRotation, u_FragColor;

// Joint angles (controlled by sliders)
var g = {
  globalAngle: 0,
  headNod: 0, jaw: 0,
  tail1: 0, tail2: 0,
  fl1: 0, fl2: 0, fl3: 0,  // front left upper/lower/paw
  fr1: 0, fr2: 0, fr3: 0,  // front right
  bl1: 0, bl2: 0, bl3: 0,  // back left
  br1: 0, br2: 0, br3: 0,  // back right
};

var g_animation = false;
var g_pokeAnimation = false;
var g_pokeTime = 0;
var g_startTime = 0;
var g_mouseX = 0, g_mouseY = 0;
var g_mouseAngleX = 0, g_mouseAngleY = 0;
var g_dragging = false;

// ---- Colors ----
var ORANGE = [0.9, 0.55, 0.1];
var DARK_ORANGE = [0.7, 0.4, 0.05];
var WHITE = [1.0, 0.95, 0.9];
var BLACK = [0.1, 0.1, 0.1];
var PINK = [0.9, 0.5, 0.5];
var DARK_STRIPE = [0.3, 0.15, 0.0];

// ==============================
// Setup
// ==============================
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) { console.log('Failed to get WebGL context'); return; }
  gl.enable(gl.DEPTH_TEST);
}

function initShaders_custom(gl, vs, fs) {
  function load(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.log(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var v = load(gl.VERTEX_SHADER, vs), f = load(gl.FRAGMENT_SHADER, fs);
  var p = gl.createProgram();
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.log(gl.getProgramInfoLog(p)); return false; }
  gl.useProgram(p); gl.program = p;
  return true;
}

function connectVariablesToGLSL() {
  initShaders_custom(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
}

// ==============================
// Slider setup
// ==============================
function setupSliders() {
  var sliders = [
    ['sGlobal', 'vGlobal', 'globalAngle'],
    ['sHead', 'vHead', 'headNod'],
    ['sJaw', 'vJaw', 'jaw'],
    ['sTail1', 'vTail1', 'tail1'],
    ['sTail2', 'vTail2', 'tail2'],
    ['sFL1', 'vFL1', 'fl1'], ['sFL2', 'vFL2', 'fl2'], ['sFL3', 'vFL3', 'fl3'],
    ['sFR1', 'vFR1', 'fr1'], ['sFR2', 'vFR2', 'fr2'], ['sFR3', 'vFR3', 'fr3'],
    ['sBL1', 'vBL1', 'bl1'], ['sBL2', 'vBL2', 'bl2'], ['sBL3', 'vBL3', 'bl3'],
    ['sBR1', 'vBR1', 'br1'], ['sBR2', 'vBR2', 'br2'], ['sBR3', 'vBR3', 'br3'],
  ];
  sliders.forEach(function(s) {
    var el = document.getElementById(s[0]);
    if (!el) return;
    el.addEventListener('input', function() {
      g[s[2]] = parseFloat(this.value);
      document.getElementById(s[1]).textContent = this.value;
      if (!g_animation) renderScene();
    });
  });
}

// ==============================
// Mouse control
// ==============================
function setupMouse() {
  canvas.onmousedown = function(ev) {
    if (ev.shiftKey) { togglePoke(); return; }
    g_dragging = true;
    g_mouseX = ev.clientX;
    g_mouseY = ev.clientY;
  };
  canvas.onmouseup = function() { g_dragging = false; };
  canvas.onmousemove = function(ev) {
    if (!g_dragging) return;
    var dx = ev.clientX - g_mouseX;
    var dy = ev.clientY - g_mouseY;
    g_mouseAngleX += dx * 0.5;
    g_mouseAngleY += dy * 0.5;
    g_mouseAngleY = Math.max(-90, Math.min(90, g_mouseAngleY));
    g_mouseX = ev.clientX;
    g_mouseY = ev.clientY;
    if (!g_animation) renderScene();
  };
}

// ==============================
// Animation
// ==============================
function toggleAnimation() {
  g_animation = !g_animation;
  document.getElementById('btnAnim').textContent = 'Animation: ' + (g_animation ? 'ON' : 'OFF');
  document.getElementById('btnAnim').className = g_animation ? 'active' : '';
  if (g_animation) { g_startTime = performance.now() / 1000.0; tick(); }
}

function togglePoke() {
  g_pokeAnimation = true;
  g_pokeTime = 0;
  if (!g_animation) { g_animation = true; tick(); }
}

function updateAnimationAngles(t) {
  if (g_pokeAnimation) {
    g_pokeTime += 0.05;
    // Poke: tiger crouches and roars
    var p = Math.sin(g_pokeTime * 8);
    g.headNod = -30 + p * 15;
    g.jaw = 25 + p * 5;
    g.fl1 = 20; g.fr1 = 20; g.bl1 = -20; g.br1 = -20;
    g.tail1 = p * 40;
    g.tail2 = p * 30;
    if (g_pokeTime > 2.0) {
      g_pokeAnimation = false;
      g.headNod = 0; g.jaw = 0;
      g.fl1 = 0; g.fr1 = 0; g.bl1 = 0; g.br1 = 0;
      g.tail1 = 0; g.tail2 = 0;
    }
    return;
  }

  // Walking animation
  var walk = Math.sin(t * 3);
  var walk2 = Math.sin(t * 3 + Math.PI);
  g.fl1 = walk * 25;
  g.fl2 = Math.abs(walk) * -20;
  g.fl3 = walk * 8;
  g.fr1 = walk2 * 25;
  g.fr2 = Math.abs(walk2) * -20;
  g.fr3 = walk2 * 8;
  g.bl1 = walk2 * 25;
  g.bl2 = Math.abs(walk2) * -20;
  g.bl3 = walk2 * 8;
  g.br1 = walk * 25;
  g.br2 = Math.abs(walk) * -20;
  g.br3 = walk * 8;
  g.headNod = Math.sin(t * 2) * 8;
  g.jaw = Math.max(0, Math.sin(t * 1.5) * 10);
  g.tail1 = Math.sin(t * 2.5) * 30;
  g.tail2 = Math.sin(t * 3.5) * 25;
}

// ==============================
// Render Scene
// ==============================
function renderScene() {
  gl.clearColor(0.35, 0.6, 0.85, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Global rotation
  var globalRotM = new Matrix4();
  globalRotM.rotate(g.globalAngle + g_mouseAngleX, 0, 1, 0);
  globalRotM.rotate(g_mouseAngleY, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotM.elements);

  // ---- BODY ----
  var body = new Matrix4();
  body.translate(-0.25, -0.1, -0.15);
  body.scale(0.5, 0.3, 0.3);
  drawCube(body, ORANGE);

  // Stripes on body (vertical on left side)
  for (var i = 0; i < 4; i++) {
    var stripeL = new Matrix4();
    stripeL.translate(-0.12 + i * 0.1, -0.05, -0.152);
    stripeL.scale(0.03, 0.15, 0.01);
    drawCube(stripeL, DARK_STRIPE);
  }
  // Stripes on body (vertical on right side)
  for (var i = 0; i < 4; i++) {
    var stripeR = new Matrix4();
    stripeR.translate(-0.12 + i * 0.1, -0.05, 0.15);
    stripeR.scale(0.03, 0.15, 0.01);
    drawCube(stripeR, DARK_STRIPE);
  }
  // Stripes on top
  for (var i = 0; i < 3; i++) {
    var stripeT = new Matrix4();
    stripeT.translate(-0.1 + i * 0.12, 0.19, -0.08);
    stripeT.scale(0.03, 0.01, 0.16);
    drawCube(stripeT, DARK_STRIPE);
  }

  // Belly (white underside)
  var belly = new Matrix4();
  belly.translate(-0.2, -0.101, -0.1);
  belly.scale(0.4, 0.01, 0.2);
  drawCube(belly, WHITE);

  // ---- HEAD ----
  var headBase = new Matrix4();
  headBase.translate(0.25, 0.0, 0.0);
  headBase.rotate(g.headNod, 0, 0, 1);

  var head = new Matrix4(headBase);
  head.translate(0.0, -0.05, -0.12);
  head.scale(0.22, 0.25, 0.24);
  drawCube(head, ORANGE);

  // Snout (white)
  var snout = new Matrix4(headBase);
  snout.translate(0.15, -0.05, -0.06);
  snout.scale(0.1, 0.12, 0.12);
  drawCube(snout, WHITE);

  // Nose
  var nose = new Matrix4(headBase);
  nose.translate(0.245, 0.02, -0.025);
  nose.scale(0.01, 0.04, 0.05);
  drawCube(nose, PINK);

  // Left eye
  var eyeL = new Matrix4(headBase);
  eyeL.translate(0.18, 0.1, -0.121);
  eyeL.scale(0.04, 0.05, 0.01);
  drawCube(eyeL, BLACK);

  // Right eye
  var eyeR = new Matrix4(headBase);
  eyeR.translate(0.18, 0.1, 0.121);
  eyeR.scale(0.04, 0.05, 0.01);
  drawCube(eyeR, BLACK);

  // Left ear (cone - non-cube primitive)
  var earL = new Matrix4(headBase);
  earL.translate(0.05, 0.2, -0.1);
  earL.scale(0.07, 0.1, 0.07);
  drawCone(earL, ORANGE);

  // Right ear (cone)
  var earR = new Matrix4(headBase);
  earR.translate(0.05, 0.2, 0.03);
  earR.scale(0.07, 0.1, 0.07);
  drawCone(earR, ORANGE);

  // Inner ears (pink)
  var earInL = new Matrix4(headBase);
  earInL.translate(0.06, 0.2, -0.09);
  earInL.scale(0.05, 0.08, 0.05);
  drawCone(earInL, PINK);

  var earInR = new Matrix4(headBase);
  earInR.translate(0.06, 0.2, 0.04);
  earInR.scale(0.05, 0.08, 0.05);
  drawCone(earInR, PINK);

  // Jaw (opens with jaw angle)
  var jaw = new Matrix4(headBase);
  jaw.translate(0.15, -0.05, -0.055);
  jaw.rotate(-g.jaw, 0, 0, 1);
  jaw.scale(0.1, 0.04, 0.11);
  drawCube(jaw, DARK_ORANGE);

  // ---- TAIL ---- (2-part chain: tail base + tail tip)
  var tailBase = new Matrix4();
  tailBase.translate(-0.25, 0.1, -0.03);
  tailBase.rotate(g.tail1, 0, 0, 1);
  tailBase.rotate(g.tail1 * 0.3, 0, 1, 0);

  var tail1 = new Matrix4(tailBase);
  tail1.translate(-0.2, 0.0, 0.0);
  tail1.scale(0.2, 0.06, 0.06);
  drawCube(tail1, ORANGE);

  var tailTipBase = new Matrix4(tailBase);
  tailTipBase.translate(-0.2, 0.0, 0.0);
  tailTipBase.rotate(g.tail2, 0, 0, 1);

  var tail2 = new Matrix4(tailTipBase);
  tail2.translate(-0.15, 0.0, 0.0);
  tail2.scale(0.15, 0.05, 0.05);
  drawCube(tail2, DARK_STRIPE);

  // ---- LEGS ---- (each is a 3-level chain: upper -> lower -> paw)
  drawLeg(0.15, -0.1, -0.12, g.fl1, g.fl2, g.fl3, 1);   // front left
  drawLeg(0.15, -0.1, 0.04, g.fr1, g.fr2, g.fr3, 1);    // front right
  drawLeg(-0.2, -0.1, -0.12, g.bl1, g.bl2, g.bl3, -1);  // back left
  drawLeg(-0.2, -0.1, 0.04, g.br1, g.br2, g.br3, -1);   // back right
}

function drawLeg(x, y, z, a1, a2, a3, dir) {
  // Upper leg
  var upper = new Matrix4();
  upper.translate(x, y, z);
  upper.rotate(a1, 0, 0, 1);

  var upperCube = new Matrix4(upper);
  upperCube.scale(0.08, -0.15, 0.08);
  drawCube(upperCube, ORANGE);

  // Lower leg
  var lower = new Matrix4(upper);
  lower.translate(0.0, -0.15, 0.0);
  lower.rotate(a2, 0, 0, 1);

  var lowerCube = new Matrix4(lower);
  lowerCube.scale(0.07, -0.13, 0.07);
  drawCube(lowerCube, DARK_ORANGE);

  // Paw (3rd joint)
  var paw = new Matrix4(lower);
  paw.translate(0.0, -0.13, 0.0);
  paw.rotate(a3, 0, 0, 1);

  var pawCube = new Matrix4(paw);
  pawCube.translate(-0.01, -0.05, -0.005);
  pawCube.scale(0.09, 0.05, 0.08);
  drawCube(pawCube, WHITE);
}

// ==============================
// Tick / Performance
// ==============================
var g_lastFrame = performance.now();
var g_frameCount = 0;
var g_fps = 0;

function tick() {
  if (!g_animation && !g_pokeAnimation) return;

  var now = performance.now();
  var t = (now / 1000.0) - g_startTime;

  // FPS calc
  g_frameCount++;
  if (now - g_lastFrame >= 1000) {
    g_fps = g_frameCount;
    g_frameCount = 0;
    g_lastFrame = now;
    document.getElementById('perf').textContent = 'FPS: ' + g_fps + ' | Shapes: 20+';
  }

  updateAnimationAngles(t);
  renderScene();
  requestAnimationFrame(tick);
}

// ==============================
// Main
// ==============================
function main() {
  setupWebGL();
  connectVariablesToGLSL();
  setupSliders();
  setupMouse();
  renderScene();
}

main();
