// Point.js - Class for drawing a square/point shape
class Point {
  constructor() {
    this.type = 'point';
    this.position = [0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var size = this.size;

    // Set color
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    // Set size
    gl.uniform1f(u_PointSize, size);

    // Draw the point
    var d = size / 200.0; // convert pixel size to gl coords
    drawTriangle([xy[0]-d, xy[1]-d, xy[0]+d, xy[1]-d, xy[0]+d, xy[1]+d]);
    drawTriangle([xy[0]-d, xy[1]-d, xy[0]+d, xy[1]+d, xy[0]-d, xy[1]+d]);
  }
}
