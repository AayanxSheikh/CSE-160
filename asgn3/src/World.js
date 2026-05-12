// World.js — Assignment 3: Virtual World  (Aayan Sheikh, CSE 160 Spring 2026)

// ---------- Shaders ----------
const VSHADER = `
  attribute vec3 a_Position;
  attribute vec2 a_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  varying vec2 v_UV;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * vec4(a_Position, 1.0);
    v_UV = a_UV;
  }
`;

const FSHADER = `
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform int u_TexUnit;
  uniform float u_TexWeight;
  void main() {
    vec4 texCol = u_FragColor;
    if      (u_TexUnit == 0) texCol = texture2D(u_Sampler0, v_UV);
    else if (u_TexUnit == 1) texCol = texture2D(u_Sampler1, v_UV);
    else if (u_TexUnit == 2) texCol = texture2D(u_Sampler2, v_UV);
    else if (u_TexUnit == 3) texCol = texture2D(u_Sampler3, v_UV);
    gl_FragColor = (1.0 - u_TexWeight) * u_FragColor + u_TexWeight * texCol;
  }
`;

// ---------- 32×32 World map ----------
// Each cell = height of wall stack (0 = empty, 1-4 = wall cubes).
// tex: which texture for that wall column (0=dirt,1=stone,3=wood; grass=2 reserved for ground)
// Encoded as [height, texIndex] — we store in two parallel arrays for clarity.

// Heights: 0=open, 1-4=wall
const MAP_H = [
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,2,2,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,2,0,4],
  [4,0,2,0,0,0,1,0,0,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,4],
  [4,0,0,0,0,0,1,0,0,3,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,3,0,0,0,3,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,1,0,0,0,0,0,0,3,0,0,0,3,0,0,4,0,0,4,0,0,0,0,0,0,0,0,0,1,0,4],
  [4,0,1,0,0,0,0,0,0,3,3,0,3,3,0,0,4,0,0,4,0,0,2,2,2,2,0,0,0,1,0,4],
  [4,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,4,0,0,2,0,0,2,0,0,0,1,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,2,0,0,2,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,4],
  [4,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,3,3,0,0,4],
  [4,4,4,4,4,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,3,0,0,4],
  [4,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,3,0,0,4],
  [4,0,0,0,4,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,3,0,0,4],
  [4,0,0,0,4,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,0,3,3,3,0,3,3,3,3,0,0,4],
  [4,0,0,0,4,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,4],
  [4,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,4],
  [4,0,1,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,4,4,0,0,4],
  [4,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
];

// Texture per column (matches wall type visually)
const MAP_T = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,1],
  [1,0,3,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,1,0,0,1,0,0,3,3,3,3,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,3,0,0,3,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,3,0,0,3,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,1],
  [1,1,1,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,0,1,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,0,1,0,0,0,0,3,0,3,0,0,0,0,0,0,0,0,0,1,1,1,0,1,1,1,1,0,0,1],
  [1,0,0,0,1,0,0,0,0,3,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// ---------- Globals ----------
let gl, canvas, program;
let camera;
let lastTime = 0;
let texturesLoaded = 0;
const TOTAL_TEXTURES = 4;

// Score / game state
let score = 0;
let gameMsg = '';
let gameMsgTimer = 0;
// Hidden "gems" at certain map positions — walk through to collect
const GEMS = [
  {x:11, z:11, collected:false},
  {x:17, z: 5, collected:false},
  {x:23, z:19, collected:false},
  {x: 5, z:25, collected:false},
  {x:26, z: 3, collected:false},
];

// ---------- Init ----------
function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) { console.error("WebGL not supported"); return; }
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.5, 0.7, 1.0, 1.0);
}

function connectVarsToGLSL() {
  if (!initShaders(gl, VSHADER, FSHADER)) { console.error("Failed to init shaders"); return; }
  program = gl.program;

  program.a_Position         = gl.getAttribLocation(program,  "a_Position");
  program.a_UV               = gl.getAttribLocation(program,  "a_UV");
  program.u_ModelMatrix      = gl.getUniformLocation(program, "u_ModelMatrix");
  program.u_ViewMatrix       = gl.getUniformLocation(program, "u_ViewMatrix");
  program.u_ProjectionMatrix = gl.getUniformLocation(program, "u_ProjectionMatrix");
  program.u_FragColor        = gl.getUniformLocation(program, "u_FragColor");
  program.u_TexUnit          = gl.getUniformLocation(program, "u_TexUnit");
  program.u_TexWeight        = gl.getUniformLocation(program, "u_TexWeight");
  program.u_Sampler0         = gl.getUniformLocation(program, "u_Sampler0");
  program.u_Sampler1         = gl.getUniformLocation(program, "u_Sampler1");
  program.u_Sampler2         = gl.getUniformLocation(program, "u_Sampler2");
  program.u_Sampler3         = gl.getUniformLocation(program, "u_Sampler3");

  gl.uniform1i(program.u_Sampler0, 0);
  gl.uniform1i(program.u_Sampler1, 1);
  gl.uniform1i(program.u_Sampler2, 2);
  gl.uniform1i(program.u_Sampler3, 3);
}

// ---------- Texture loading ----------
function loadTexture(url, unit) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array([128, 128, 128, 255]));
  const img = new Image();
  img.onload = () => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    texturesLoaded++;
    console.log(`Texture loaded (${texturesLoaded}/${TOTAL_TEXTURES}): ${url}`);
  };
  img.onerror = () => console.error("Texture failed to load:", url);
  img.src = url;
}

function loadAllTextures() {
  loadTexture("src/textures/dirt.png",  0);
  loadTexture("src/textures/stone.png", 1);
  loadTexture("src/textures/grass.png", 2);
  loadTexture("src/textures/wood.png",  3);
}

// ---------- Scene ----------
let groundCube, skyCube;
// Wall cubes stored as flat array for performance — no per-frame new()
let wallCubes = [];

function buildScene() {
  Cube.buildBuffers(gl);

  // Ground
  groundCube = new Cube();
  groundCube.textureNum = 2;
  groundCube.matrix.setTranslate(-1, -1, -1);
  groundCube.matrix.scale(34, 1, 34);

  // Sky
  skyCube = new Cube();
  skyCube.color = [0.4, 0.65, 1.0, 1.0];
  skyCube.textureNum = -1;
  skyCube.matrix.setTranslate(-500, -500, -500);
  skyCube.matrix.scale(1000, 1000, 1000);

  // Build wall cubes from map
  wallCubes = [];
  for (let z = 0; z < 32; z++) {
    for (let x = 0; x < 32; x++) {
      const h = MAP_H[z][x];
      const t = MAP_T[z][x];
      for (let y = 0; y < h; y++) {
        const c = new Cube();
        c.textureNum = t;
        c.matrix.setTranslate(x, y, z);
        wallCubes.push(c);
      }
    }
  }
  console.log(`Built ${wallCubes.length} wall cubes`);
}

// ---------- Add / Delete blocks ----------
function placeBlock() {
  const cell = camera.cellInFront(1.5);
  const {x, z} = cell;
  if (x < 0 || x >= 32 || z < 0 || z >= 32) return;
  const curH = MAP_H[z][x];
  if (curH >= 4) { showMsg("Max height!"); return; }
  MAP_H[z][x]++;
  // Rebuild only the column that changed
  rebuildColumn(x, z);
  showMsg("Block placed");
}

function deleteBlock() {
  const cell = camera.cellInFront(1.5);
  const {x, z} = cell;
  if (x < 0 || x >= 32 || z < 0 || z >= 32) return;
  const curH = MAP_H[z][x];
  if (curH <= 0) { showMsg("Nothing here!"); return; }
  MAP_H[z][x]--;
  rebuildColumn(x, z);
  showMsg("Block removed");
}

function rebuildColumn(cx, cz) {
  // Remove all cubes at this column then re-add
  wallCubes = wallCubes.filter(c => {
    const m = c.matrix.elements;
    const tx = Math.round(m[12]);
    const tz = Math.round(m[14]);
    return !(tx === cx && tz === cz);
  });
  const h = MAP_H[cz][cx];
  const t = MAP_T[cz][cx];
  for (let y = 0; y < h; y++) {
    const c = new Cube();
    c.textureNum = t;
    c.matrix.setTranslate(cx, y, cz);
    wallCubes.push(c);
  }
}

// ---------- Game: Gem collection ----------
function checkGems() {
  const ex = camera.eye.elements[0];
  const ez = camera.eye.elements[2];
  for (const gem of GEMS) {
    if (!gem.collected) {
      const dx = ex - (gem.x + 0.5);
      const dz = ez - (gem.z + 0.5);
      if (dx*dx + dz*dz < 1.5) {
        gem.collected = true;
        score++;
        showMsg(`💎 Gem collected! (${score}/${GEMS.length})`);
        if (score === GEMS.length) {
          showMsg("🏆 YOU COLLECTED ALL GEMS! You win!");
        }
      }
    }
  }
}

function showMsg(msg) {
  gameMsg = msg;
  gameMsgTimer = 3.0; // show for 3 seconds
  document.getElementById("status").textContent = msg;
}

function updateHUD(dt) {
  if (gameMsgTimer > 0) {
    gameMsgTimer -= dt;
    if (gameMsgTimer <= 0) {
      document.getElementById("status").textContent =
        `Score: ${score}/${GEMS.length} gems | F=place G=remove`;
    }
  }
}

// ---------- Render loop ----------
function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms (~20fps floor)
  lastTime = now;
  processMovement(dt);
  checkGems();
  updateHUD(dt);
  drawFrame();
  requestAnimationFrame(tick);
}

function drawFrame() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(program.u_ViewMatrix,       false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(program.u_ProjectionMatrix, false, camera.projMatrix.elements);

  skyCube.render(gl, program);
  groundCube.render(gl, program);

  // Render all wall cubes (single drawArrays per cube — standard approach)
  for (let i = 0; i < wallCubes.length; i++) {
    wallCubes[i].render(gl, program);
  }

  // Draw gem markers as tiny bright cubes
  for (const gem of GEMS) {
    if (!gem.collected) {
      const g = new Cube();
      g.textureNum = -1;
      g.color = [1.0, 0.9, 0.1, 1.0]; // gold
      g.matrix.setTranslate(gem.x + 0.3, 0.5, gem.z + 0.3);
      g.matrix.scale(0.4, 0.4, 0.4);
      g.render(gl, program);
    }
  }
}

// ---------- Input ----------
const keys = new Set(); // tracks currently held keys

function processMovement(dt) {
  // Scale speed by dt so movement is frame-rate independent
  const spd = camera.moveSpeed * dt * 60; // 60 = reference fps
  const savedSpeed = camera.moveSpeed;
  camera.moveSpeed = spd;

  if (keys.has('w')) camera.moveForward();
  if (keys.has('s')) camera.moveBackward();
  if (keys.has('a')) camera.moveLeft();
  if (keys.has('d')) camera.moveRight();
  if (keys.has('q')) camera.panLeft();
  if (keys.has('e')) camera.panRight();

  camera.moveSpeed = savedSpeed;
}

function setupInput() {
  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys.add(k);
    // One-shot actions (not held)
    if (k === 'f') placeBlock();
    if (k === 'g') deleteBlock();
  });
  document.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener("mousedown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
  canvas.addEventListener("mouseup",   () => { dragging = false; });
  canvas.addEventListener("mouseleave",() => { dragging = false; });
  canvas.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    camera.panBy(-dx * 0.3);
    camera.tiltBy( dy * 0.3);
  });
}

// ---------- Main ----------
function main() {
  setupWebGL();
  connectVarsToGLSL();
  loadAllTextures();

  camera = new Camera(canvas);
  // Start near center of world, facing inward
  camera.eye.elements[0] = 16;
  camera.eye.elements[1] = 1.8;
  camera.eye.elements[2] = 16;
  camera.at.elements[0]  = 16;
  camera.at.elements[1]  = 1.8;
  camera.at.elements[2]  = 15;
  camera.updateView();

  // Collision callback: returns true if world position (x,z) is inside a wall
  camera.isBlocked = function(x, z) {
    const col = Math.floor(x);
    const row = Math.floor(z);
    if (col < 0 || col >= 32 || row < 0 || row >= 32) return true; // out of bounds = blocked
    return MAP_H[row][col] > 0; // any wall height > 0 blocks movement
  };

  buildScene();
  setupInput();

  document.getElementById("status").textContent =
    `Score: 0/${GEMS.length} gems | Find the gold cubes! | F=place G=remove block`;

  requestAnimationFrame(tick);
}

window.addEventListener("load", main);
