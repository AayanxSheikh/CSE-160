// Cube.js - Draws a unit cube [0,0,0] to [1,1,1] with a given color and matrix

var g_cubeBuffer = null;
var g_cubeVerts = null;

function initCubeBuffer() {
  // 6 faces * 2 triangles * 3 vertices * 3 coords = 108 floats
  g_cubeVerts = new Float32Array([
    // Front face
    0,0,0, 1,1,0, 1,0,0,
    0,0,0, 0,1,0, 1,1,0,
    // Back face
    0,0,1, 1,0,1, 1,1,1,
    0,0,1, 1,1,1, 0,1,1,
    // Top face
    0,1,0, 0,1,1, 1,1,1,
    0,1,0, 1,1,1, 1,1,0,
    // Bottom face
    0,0,0, 1,0,1, 0,0,1,
    0,0,0, 1,0,0, 1,0,1,
    // Right face
    1,0,0, 1,1,0, 1,1,1,
    1,0,0, 1,1,1, 1,0,1,
    // Left face
    0,0,0, 0,0,1, 0,1,1,
    0,0,0, 0,1,1, 0,1,0,
  ]);
}

function drawCube(M, color) {
  if (g_cubeBuffer === null) {
    initCubeBuffer();
    g_cubeBuffer = gl.createBuffer();
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_cubeVerts, gl.STATIC_DRAW);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  var r = color[0], g = color[1], b = color[2];

  // Draw each face with slightly different shading for depth
  var shades = [1.0, 0.85, 1.1, 0.7, 0.95, 0.8];
  for (var i = 0; i < 6; i++) {
    var s = shades[i];
    gl.uniform4f(u_FragColor,
      Math.min(r * s, 1.0),
      Math.min(g * s, 1.0),
      Math.min(b * s, 1.0),
      1.0
    );
    gl.drawArrays(gl.TRIANGLES, i * 6, 6);
  }
}
