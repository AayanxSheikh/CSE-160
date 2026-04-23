// Cone.js - Non-cube primitive: a cone/pyramid for tiger ears
var g_coneBuffer = null;
var g_coneVerts = null;
var g_coneVertCount = 0;

function initConeBuffer() {
  var segs = 12;
  var v = [];
  var r = 0.5;
  var h = 1.0;

  // Build cone: tip at (0.5, 1, 0.5), base circle at y=0 centered at (0.5, 0, 0.5)
  for (var i = 0; i < segs; i++) {
    var a1 = (i / segs) * 2 * Math.PI;
    var a2 = ((i + 1) / segs) * 2 * Math.PI;

    // Side triangle
    v.push(0.5, h, 0.5); // tip
    v.push(0.5 + Math.cos(a1) * r, 0, 0.5 + Math.sin(a1) * r);
    v.push(0.5 + Math.cos(a2) * r, 0, 0.5 + Math.sin(a2) * r);

    // Base triangle
    v.push(0.5, 0, 0.5); // center of base
    v.push(0.5 + Math.cos(a2) * r, 0, 0.5 + Math.sin(a2) * r);
    v.push(0.5 + Math.cos(a1) * r, 0, 0.5 + Math.sin(a1) * r);
  }

  g_coneVerts = new Float32Array(v);
  g_coneVertCount = v.length / 3;
}

function drawCone(M, color) {
  if (g_coneBuffer === null) {
    initConeBuffer();
    g_coneBuffer = gl.createBuffer();
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, g_coneBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_coneVerts, gl.STATIC_DRAW);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], 1.0);
  gl.drawArrays(gl.TRIANGLES, 0, g_coneVertCount);
}
