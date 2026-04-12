// asg1.js - Assignment 1: Paint Program
// CSE 160, Spring 2026 - Aayan Sheik

// ---- Global WebGL variables ----
var canvas;
var gl;
var a_Position;
var u_FragColor;
var u_PointSize;

// ---- State variables ----
var g_shapesList = [];
var g_currentMode = 'square';  // 'square', 'triangle', 'circle'
var g_selectedColor = [1.0, 0.0, 0.0, 1.0];
var g_selectedSize = 10;
var g_selectedSegments = 20;
var g_rainbowMode = false;
var g_hue = 0;

// ===============================
// Setup Functions
// ===============================

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  // Enable blending for alpha/transparency (awesomeness)
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function connectVariablesToGLSL() {
  // Compile vertex shader
  var vertexShaderSource = document.getElementById('vertex-shader').textContent;
  var fragmentShaderSource = document.getElementById('fragment-shader').textContent;

  if (!initShaders(gl, vertexShaderSource, fragmentShaderSource)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_PointSize = gl.getUniformLocation(gl.program, 'u_PointSize');
  if (!u_PointSize) {
    console.log('Failed to get the storage location of u_PointSize');
    return;
  }
}

// ===============================
// Shader Initialization (from cuon-utils)
// ===============================

function initShaders(gl, vshader, fshader) {
  var program = createProgram(gl, vshader, fshader);
  if (!program) {
    console.log('Failed to create program');
    return false;
  }
  gl.useProgram(program);
  gl.program = program;
  return true;
}

function createProgram(gl, vshader, fshader) {
  var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vshader);
  var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fshader);
  if (!vertexShader || !fragmentShader) return null;

  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    console.log('Failed to link program: ' + gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function loadShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    console.log('Failed to compile shader: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// ===============================
// Event Handlers
// ===============================

function setupEventHandlers() {
  // Mouse events
  canvas.onmousedown = function(ev) { click(ev); };
  canvas.onmousemove = function(ev) {
    if (ev.buttons === 1) { click(ev); }
  };

  // Slider value display updates
  var sliders = [
    { id: 'sliderR', valId: 'valR' },
    { id: 'sliderG', valId: 'valG' },
    { id: 'sliderB', valId: 'valB' },
    { id: 'sliderA', valId: 'valA' },
  ];
  sliders.forEach(function(s) {
    document.getElementById(s.id).addEventListener('input', function() {
      document.getElementById(s.valId).textContent = parseFloat(this.value).toFixed(2);
      updateColor();
    });
  });

  document.getElementById('sliderSize').addEventListener('input', function() {
    g_selectedSize = parseInt(this.value);
    document.getElementById('valSize').textContent = this.value;
  });

  document.getElementById('sliderSeg').addEventListener('input', function() {
    g_selectedSegments = parseInt(this.value);
    document.getElementById('valSeg').textContent = this.value;
  });
}

function updateColor() {
  g_selectedColor[0] = parseFloat(document.getElementById('sliderR').value);
  g_selectedColor[1] = parseFloat(document.getElementById('sliderG').value);
  g_selectedColor[2] = parseFloat(document.getElementById('sliderB').value);
  g_selectedColor[3] = parseFloat(document.getElementById('sliderA').value);
}

function click(ev) {
  // Convert mouse coordinates to WebGL coordinates
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  // Rainbow mode: cycle hue
  var color;
  if (g_rainbowMode) {
    color = hslToRgb(g_hue / 360, 1.0, 0.5);
    color.push(g_selectedColor[3]); // keep alpha
    g_hue = (g_hue + 3) % 360;
  } else {
    color = g_selectedColor.slice();
  }

  // Create the appropriate shape
  var shape;
  if (g_currentMode === 'square') {
    shape = new Point();
  } else if (g_currentMode === 'triangle') {
    shape = new Triangle();
  } else if (g_currentMode === 'circle') {
    shape = new Circle();
    shape.segments = g_selectedSegments;
  }

  shape.position = [x, y];
  shape.color = color;
  shape.size = g_selectedSize;

  g_shapesList.push(shape);
  renderAllShapes();
}

// ===============================
// Rendering
// ===============================

function renderAllShapes() {
  var startTime = performance.now();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (var i = 0; i < g_shapesList.length; i++) {
    g_shapesList[i].render();
  }

  var duration = performance.now() - startTime;
  if (duration > 16) {
    console.log('Rendering took ' + duration.toFixed(1) + 'ms (' + g_shapesList.length + ' shapes)');
  }
}

// ===============================
// UI Actions
// ===============================

function setMode(mode) {
  g_currentMode = mode;
  document.getElementById('btnSquare').className = (mode === 'square') ? 'active' : '';
  document.getElementById('btnTriangle').className = (mode === 'triangle') ? 'active' : '';
  document.getElementById('btnCircle').className = (mode === 'circle') ? 'active' : '';
}

function clearCanvas() {
  g_shapesList = [];
  renderAllShapes();
}

function undoShape() {
  if (g_shapesList.length > 0) {
    g_shapesList.pop();
    renderAllShapes();
  }
}

function toggleRainbow() {
  g_rainbowMode = !g_rainbowMode;
  document.getElementById('btnRainbow').className = g_rainbowMode ? 'active' : '';
}

// ===============================
// Draw Picture (Initials "AS" using 20+ triangles)
// ===============================

function drawPicture() {
  // Clear first
  g_shapesList = [];

  // Helper: create a colored triangle at specific vertices
  function addTri(x1, y1, x2, y2, x3, y3, r, g, b) {
    var t = new PicTriangle();
    t.vertices = [x1, y1, x2, y2, x3, y3];
    t.color = [r, g, b, 1.0];
    g_shapesList.push(t);
  }

  // Background: dark blue sky
  addTri(-1, -1, 1, -1, 1, 1, 0.05, 0.05, 0.2);
  addTri(-1, -1, 1, 1, -1, 1, 0.05, 0.05, 0.2);

  // Ground: dark green
  addTri(-1, -1, 1, -1, 1, -0.4, 0.0, 0.25, 0.05);
  addTri(-1, -1, 1, -0.4, -1, -0.4, 0.0, 0.25, 0.05);

  // ---- Letter "A" (left side) ----
  // Left leg of A
  addTri(-0.7, -0.3, -0.55, -0.3, -0.45, 0.6, 0.9, 0.7, 0.1);
  addTri(-0.7, -0.3, -0.45, 0.6, -0.6, 0.6, 0.9, 0.7, 0.1);
  // Right leg of A
  addTri(-0.15, -0.3, -0.3, -0.3, -0.4, 0.6, 0.9, 0.7, 0.1);
  addTri(-0.15, -0.3, -0.4, 0.6, -0.25, 0.6, 0.9, 0.7, 0.1);
  // Top of A
  addTri(-0.6, 0.6, -0.25, 0.6, -0.425, 0.8, 1.0, 0.8, 0.0);
  // Crossbar of A
  addTri(-0.58, 0.1, -0.27, 0.1, -0.27, 0.2, 0.8, 0.6, 0.0);
  addTri(-0.58, 0.1, -0.27, 0.2, -0.58, 0.2, 0.8, 0.6, 0.0);

  // ---- Letter "S" (right side) ----
  // Top bar of S
  addTri(0.1, 0.6, 0.6, 0.6, 0.6, 0.7, 0.2, 0.6, 0.9);
  addTri(0.1, 0.6, 0.6, 0.7, 0.1, 0.7, 0.2, 0.6, 0.9);
  // Top cap of S (top of curve)
  addTri(0.1, 0.7, 0.6, 0.7, 0.35, 0.85, 0.3, 0.7, 1.0);
  // Upper left vertical of S
  addTri(0.1, 0.3, 0.22, 0.3, 0.22, 0.7, 0.15, 0.5, 0.8);
  addTri(0.1, 0.3, 0.22, 0.7, 0.1, 0.7, 0.15, 0.5, 0.8);
  // Middle bar of S
  addTri(0.1, 0.2, 0.6, 0.2, 0.6, 0.3, 0.2, 0.6, 0.9);
  addTri(0.1, 0.2, 0.6, 0.3, 0.1, 0.3, 0.2, 0.6, 0.9);
  // Lower right vertical of S
  addTri(0.48, -0.3, 0.6, -0.3, 0.6, 0.3, 0.15, 0.5, 0.8);
  addTri(0.48, -0.3, 0.6, 0.3, 0.48, 0.3, 0.15, 0.5, 0.8);
  // Bottom bar of S
  addTri(0.1, -0.4, 0.6, -0.4, 0.6, -0.3, 0.2, 0.6, 0.9);
  addTri(0.1, -0.4, 0.6, -0.3, 0.1, -0.3, 0.2, 0.6, 0.9);
  // Bottom cap
  addTri(0.1, -0.4, 0.6, -0.4, 0.35, -0.55, 0.1, 0.4, 0.7);

  // ---- Stars ----
  addTri(-0.9, 0.85, -0.85, 0.95, -0.8, 0.85, 1.0, 1.0, 0.8);
  addTri(0.75, 0.9, 0.8, 1.0, 0.85, 0.9, 1.0, 1.0, 0.8);
  addTri(-0.3, 0.92, -0.25, 1.0, -0.2, 0.92, 1.0, 1.0, 0.6);
  addTri(0.88, 0.7, 0.92, 0.78, 0.96, 0.7, 1.0, 1.0, 0.7);

  renderAllShapes();
}

// PicTriangle: a triangle with custom vertices for the picture
class PicTriangle {
  constructor() {
    this.type = 'picTriangle';
    this.vertices = [0,0, 0,0, 0,0];
    this.color = [1, 1, 1, 1];
  }
  render() {
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    drawTriangle(this.vertices);
  }
}

// ===============================
// Utility: HSL to RGB (for rainbow mode)
// ===============================

function hslToRgb(h, s, l) {
  var r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [r, g, b];
}

// ===============================
// Main
// ===============================

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  setupEventHandlers();
  updateColor();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

main();
