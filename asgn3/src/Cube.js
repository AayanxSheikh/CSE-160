// Cube.js — unit cube centered at origin, sized 1x1x1, with per-face UVs.
// Reuses the pattern from Lab Activity 3 (UV-coordinate lab).

class Cube {
  constructor() {
    this.matrix    = new Matrix4();
    this.color     = [1.0, 1.0, 1.0, 1.0];
    this.textureNum = -1;        // -1 means use solid color (texColorWeight = 0)
    this.texWeight  = 1.0;       // how much of the texture to mix in
  }

  // Vertices for 6 faces × 2 triangles × 3 verts = 36 verts.
  // Coords are in [0,1] so the cube sits at origin to +1; we translate -0.5 in shader
  // via the model matrix when needed. (Keeps per-face UV math simple.)
  static buildBuffers(gl) {
    if (Cube._built) return;

    // prettier-ignore
    const vertices = new Float32Array([
      // FRONT  (z = 1)
      0,0,1,  1,0,1,  1,1,1,    0,0,1,  1,1,1,  0,1,1,
      // BACK   (z = 0)
      1,0,0,  0,0,0,  0,1,0,    1,0,0,  0,1,0,  1,1,0,
      // LEFT   (x = 0)
      0,0,0,  0,0,1,  0,1,1,    0,0,0,  0,1,1,  0,1,0,
      // RIGHT  (x = 1)
      1,0,1,  1,0,0,  1,1,0,    1,0,1,  1,1,0,  1,1,1,
      // TOP    (y = 1)
      0,1,1,  1,1,1,  1,1,0,    0,1,1,  1,1,0,  0,1,0,
      // BOTTOM (y = 0)
      0,0,0,  1,0,0,  1,0,1,    0,0,0,  1,0,1,  0,0,1,
    ]);

    // Each face gets a full [0,1] x [0,1] UV square so the texture tiles per face.
    const faceUV = [0,0, 1,0, 1,1,  0,0, 1,1, 0,1];
    const uvs = new Float32Array(faceUV.concat(faceUV, faceUV, faceUV, faceUV, faceUV));

    Cube.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    Cube.uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

    Cube.vertexCount = 36;
    Cube._built = true;
  }

  render(gl, program) {
    // Bind position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
    gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.a_Position);

    // Bind UV attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uvBuffer);
    gl.vertexAttribPointer(program.a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.a_UV);

    // Upload model matrix + color + texture controls
    gl.uniformMatrix4fv(program.u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4fv(program.u_FragColor, this.color);
    gl.uniform1i(program.u_TexUnit, Math.max(0, this.textureNum));
    gl.uniform1f(program.u_TexWeight, this.textureNum < 0 ? 0.0 : this.texWeight);

    gl.drawArrays(gl.TRIANGLES, 0, Cube.vertexCount);
  }
}
