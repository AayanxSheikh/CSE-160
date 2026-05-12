// Camera.js — first-person camera as specified in the Assignment 3 instructions.
// Uses cuon-matrix Vector3 / Matrix4 (course-provided).

class Camera {
  constructor(canvas) {
    this.fov   = 75;
    this.eye   = new Vector3([0, 1.8, 5]);
    this.at    = new Vector3([0, 1.8, 0]);
    this.up    = new Vector3([0, 1, 0]);

    this.viewMatrix = new Matrix4();
    this.projMatrix = new Matrix4();

    this.aspect = canvas.width / canvas.height;
    this.projMatrix.setPerspective(this.fov, this.aspect, 0.1, 1000);

    this.moveSpeed = 0.25;
    this.panAngle  = 4;          // degrees per Q/E press

    // Collision: set this to a function(x, z) -> bool (true = blocked)
    // World.js sets this after construction.
    this.isBlocked = null;

    this._tmpF = new Vector3();
    this._tmpS = new Vector3();
    this._tmpR = new Matrix4();

    this.updateView();
  }

  updateView() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at .elements[0], this.at .elements[1], this.at .elements[2],
      this.up .elements[0], this.up .elements[1], this.up .elements[2]
    );
  }

  // Returns true if the given world XZ position is inside a wall.
  // Uses a small radius so the player can't squeeze through gaps.
  _blocked(nx, nz) {
    if (!this.isBlocked) return false;
    const r = 0.25; // player radius
    // Check four corners of the player's bounding square
    return this.isBlocked(nx - r, nz - r) ||
           this.isBlocked(nx + r, nz - r) ||
           this.isBlocked(nx - r, nz + r) ||
           this.isBlocked(nx + r, nz + r);
  }

  // Horizontal-only forward vector (ignores pitch so WASD stays on the ground plane)
  _flatForward() {
    const f = new Vector3([
      this.at.elements[0] - this.eye.elements[0],
      0,
      this.at.elements[2] - this.eye.elements[2]
    ]);
    f.normalize();
    return f;
  }

  // Try to move by (dx, dz). If fully blocked, try sliding along each axis separately.
  _tryMove(dx, dz) {
    const ex = this.eye.elements[0];
    const ez = this.eye.elements[2];

    const nx = ex + dx;
    const nz = ez + dz;

    if (!this._blocked(nx, nz)) {
      // Full move OK
      this.eye.elements[0] += dx;
      this.eye.elements[2] += dz;
      this.at.elements[0]  += dx;
      this.at.elements[2]  += dz;
    } else if (!this._blocked(nx, ez)) {
      // Slide along X only
      this.eye.elements[0] += dx;
      this.at.elements[0]  += dx;
    } else if (!this._blocked(ex, nz)) {
      // Slide along Z only
      this.eye.elements[2] += dz;
      this.at.elements[2]  += dz;
    }
    // else fully cornered — don't move at all

    this.updateView();
  }

  moveForward() {
    const f = this._flatForward();
    this._tryMove(f.elements[0] * this.moveSpeed, f.elements[2] * this.moveSpeed);
  }

  moveBackward() {
    const f = this._flatForward();
    this._tryMove(-f.elements[0] * this.moveSpeed, -f.elements[2] * this.moveSpeed);
  }

  moveLeft() {
    const f = this._flatForward();
    const s = Vector3.cross(this.up, f);
    s.normalize();
    this._tryMove(s.elements[0] * this.moveSpeed, s.elements[2] * this.moveSpeed);
  }

  moveRight() {
    const f = this._flatForward();
    const s = Vector3.cross(f, this.up);
    s.normalize();
    this._tryMove(s.elements[0] * this.moveSpeed, s.elements[2] * this.moveSpeed);
  }

  // rotate "at" around eye by +panAngle deg around up axis
  panLeft()  { this.panBy(+this.panAngle); }
  panRight() { this.panBy(-this.panAngle); }

  panBy(deg) {
    const f = this._tmpF;
    f.set(this.at); f.sub(this.eye);
    const rot = this._tmpR;
    rot.setRotate(deg, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    const fPrime = rot.multiplyVector3(f);
    this.at.set(this.eye);
    this.at.add(fPrime);
    this.updateView();
  }

  // Pitch up/down: rotate "at" around the right (side) axis
  tiltBy(deg) {
    const f = this._tmpF;
    f.set(this.at); f.sub(this.eye);

    // right = forward x up
    const right = Vector3.cross(f, this.up);
    right.normalize();

    const rot = this._tmpR;
    rot.setRotate(deg, right.elements[0], right.elements[1], right.elements[2]);
    const fPrime = rot.multiplyVector3(f);

    // Clamp: don't let camera flip over
    const fLen = Math.sqrt(
      fPrime.elements[0]*fPrime.elements[0] +
      fPrime.elements[1]*fPrime.elements[1] +
      fPrime.elements[2]*fPrime.elements[2]
    );
    if (Math.abs(fPrime.elements[1] / fLen) > 0.98) return;

    this.at.set(this.eye);
    this.at.add(fPrime);
    this.updateView();
  }

  // Returns the integer grid cell directly in front of the camera (for add/delete blocks)
  cellInFront(distance = 1.5) {
    const f = new Vector3();
    f.set(this.at); f.sub(this.eye); f.normalize(); f.mul(distance);
    const x = this.eye.elements[0] + f.elements[0];
    const z = this.eye.elements[2] + f.elements[2];
    return { x: Math.floor(x + 0.5), z: Math.floor(z + 0.5) };
  }
}
