'use strict';
// Camera.js ─ first-person camera for CSE 160 A4

class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.fov    = 60;
    // eye and at stored as plain [x,y,z] arrays for easy math
    this.eye = [0, 2, 8];
    this.at  = [0, 1, 0];
    this.up  = [0, 1, 0];
  }

  // ─── helpers ────────────────────────────────────────────────
  _fwd() {
    const [ex,ey,ez] = this.eye, [ax,ay,az] = this.at;
    const len = Math.hypot(ax-ex, ay-ey, az-ez);
    return [(ax-ex)/len, (ay-ey)/len, (az-ez)/len];
  }
  _right() {
    const [fx,fy,fz] = this._fwd();
    const [ux,uy,uz] = this.up;
    // right = fwd × up
    let rx = fy*uz - fz*uy;
    let ry = fz*ux - fx*uz;
    let rz = fx*uy - fy*ux;
    const len = Math.hypot(rx,ry,rz);
    return [rx/len, ry/len, rz/len];
  }

  // ─── movement ────────────────────────────────────────────────
  moveForward(d) {
    const [fx,fy,fz] = this._fwd();
    this.eye[0]+=fx*d; this.eye[1]+=fy*d; this.eye[2]+=fz*d;
    this.at[0] +=fx*d; this.at[1] +=fy*d; this.at[2] +=fz*d;
  }
  moveBackward(d) { this.moveForward(-d); }
  moveRight(d) {
    const [rx,ry,rz] = this._right();
    this.eye[0]+=rx*d; this.eye[1]+=ry*d; this.eye[2]+=rz*d;
    this.at[0] +=rx*d; this.at[1] +=ry*d; this.at[2] +=rz*d;
  }
  moveLeft(d) { this.moveRight(-d); }
  moveUp(d) {
    this.eye[1]+=d; this.at[1]+=d;
  }

  // ─── pan (rotate at around eye) ──────────────────────────────
  panLeft(deg) {
    const rad = deg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const [ex,ey,ez] = this.eye;
    let fx = this.at[0]-ex, fy = this.at[1]-ey, fz = this.at[2]-ez;
    // rotate around world Y
    const nfx = cos*fx + sin*fz;
    const nfz = -sin*fx + cos*fz;
    this.at[0] = ex + nfx;
    this.at[1] = ey + fy;
    this.at[2] = ez + nfz;
  }
  panRight(deg) { this.panLeft(-deg); }

  // vertical pan (pitch)
  panUp(deg) {
    const rad = deg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const [ex,ey,ez] = this.eye;
    let fx = this.at[0]-ex, fy = this.at[1]-ey, fz = this.at[2]-ez;
    const [rx,ry,rz] = this._right();
    // rotate f around right axis
    const dot = fx*rx + fy*ry + fz*rz;
    const nfx = fx*cos + (ry*fz-rz*fy)*sin + rx*(1-cos)*dot;
    const nfy = fy*cos + (rz*fx-rx*fz)*sin + ry*(1-cos)*dot;
    const nfz = fz*cos + (rx*fy-ry*fx)*sin + rz*(1-cos)*dot;
    this.at[0] = ex + nfx;
    this.at[1] = ey + nfy;
    this.at[2] = ez + nfz;
  }

  // ─── matrices ────────────────────────────────────────────────
  getViewMatrix() {
    const m = new Matrix4();
    m.setLookAt(
      this.eye[0], this.eye[1], this.eye[2],
      this.at[0],  this.at[1],  this.at[2],
      this.up[0],  this.up[1],  this.up[2]
    );
    return m;
  }
  getProjMatrix() {
    const m = new Matrix4();
    m.setPerspective(this.fov, this.canvas.width / this.canvas.height, 0.1, 300);
    return m;
  }
}
