// asg0.js
// Assignment 0: Vector Library
// Based on DrawRectangle.js (Listing 2.2) from the WebGL Programming Guide.

// Global canvas and context
var canvas;
var ctx;

function main() {
  // Retrieve <canvas> element  <- (1)
  canvas = document.getElementById('example');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return;
  }

  // Get the rendering context for 2DCG  <- (2)
  ctx = canvas.getContext('2d');

  // Clear canvas with black
  clearCanvas();

  // Draw a default red vector v1 = (2.25, 2.25, 0)
  var v1 = new Vector3([2.25, 2.25, 0.0]);
  drawVector(v1, "red");
}

/**
 * Clear the canvas to black.
 */
function clearCanvas() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Draw a vector from the center of the canvas.
 * Coordinates are scaled by 20 so that unit-length vectors are visible.
 * The canvas y-axis is flipped (positive y goes down), so we subtract.
 *
 * @param v     Vector3 — the vector to draw (z is ignored)
 * @param color string  — e.g. "red", "blue", "green"
 */
function drawVector(v, color) {
  var cx = canvas.width  / 2;   // 200
  var cy = canvas.height / 2;   // 200
  var scale = 20;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + v.elements[0] * scale, cy - v.elements[1] * scale);
  ctx.stroke();
}

/**
 * Called when the user clicks the "Draw" button.
 * Reads v1 and v2 from the text boxes and draws them.
 */
function handleDrawEvent() {
  // Clear canvas
  clearCanvas();

  // Read v1 values
  var v1x = parseFloat(document.getElementById('v1x').value) || 0;
  var v1y = parseFloat(document.getElementById('v1y').value) || 0;
  var v1 = new Vector3([v1x, v1y, 0.0]);

  // Read v2 values
  var v2x = parseFloat(document.getElementById('v2x').value) || 0;
  var v2y = parseFloat(document.getElementById('v2y').value) || 0;
  var v2 = new Vector3([v2x, v2y, 0.0]);

  // Draw v1 in red, v2 in blue
  drawVector(v1, "red");
  drawVector(v2, "blue");
}

/**
 * Called when the user clicks the "Draw Operation" button.
 * Reads v1, v2, the selected operation, and the scalar value,
 * then performs the operation and draws the result in green.
 */
function handleDrawOperationEvent() {
  // Clear canvas
  clearCanvas();

  // Read v1
  var v1x = parseFloat(document.getElementById('v1x').value) || 0;
  var v1y = parseFloat(document.getElementById('v1y').value) || 0;
  var v1 = new Vector3([v1x, v1y, 0.0]);

  // Read v2
  var v2x = parseFloat(document.getElementById('v2x').value) || 0;
  var v2y = parseFloat(document.getElementById('v2y').value) || 0;
  var v2 = new Vector3([v2x, v2y, 0.0]);

  // Draw original vectors
  drawVector(v1, "red");
  drawVector(v2, "blue");

  // Read operation and scalar
  var op     = document.getElementById('op-select').value;
  var scalar = parseFloat(document.getElementById('scalar').value) || 0;

  switch (op) {
    case 'add': {
      // v3 = v1 + v2
      var v3 = new Vector3(v1.elements);
      v3.add(v2);
      drawVector(v3, "green");
      break;
    }
    case 'sub': {
      // v3 = v1 - v2
      var v3 = new Vector3(v1.elements);
      v3.sub(v2);
      drawVector(v3, "green");
      break;
    }
    case 'mul': {
      // v3 = v1 * scalar,  v4 = v2 * scalar
      var v3 = new Vector3(v1.elements);
      v3.mul(scalar);
      var v4 = new Vector3(v2.elements);
      v4.mul(scalar);
      drawVector(v3, "green");
      drawVector(v4, "green");
      break;
    }
    case 'div': {
      // v3 = v1 / scalar,  v4 = v2 / scalar
      var v3 = new Vector3(v1.elements);
      v3.div(scalar);
      var v4 = new Vector3(v2.elements);
      v4.div(scalar);
      drawVector(v3, "green");
      drawVector(v4, "green");
      break;
    }
    case 'magnitude': {
      // Print magnitudes to the browser console
      console.log('Magnitude v1: ' + v1.magnitude());
      console.log('Magnitude v2: ' + v2.magnitude());
      break;
    }
    case 'normalize': {
      // Draw normalized v1 and v2 in green
      var v3 = new Vector3(v1.elements);
      v3.normalize();
      var v4 = new Vector3(v2.elements);
      v4.normalize();
      drawVector(v3, "green");
      drawVector(v4, "green");
      break;
    }
    case 'angle': {
      // Print the angle between v1 and v2
      var angle = angleBetween(v1, v2);
      console.log('Angle: ' + angle);
      break;
    }
    case 'area': {
      // Print the area of the triangle formed by v1 and v2
      var area = areaTriangle(v1, v2);
      console.log('Area of the triangle: ' + area);
      break;
    }
  }
}

/**
 * Compute the angle (in degrees) between two vectors using the dot product.
 *   dot(v1, v2) = ||v1|| * ||v2|| * cos(alpha)
 *   alpha = acos( dot(v1,v2) / (||v1|| * ||v2||) )
 *
 * @param v1 Vector3
 * @param v2 Vector3
 * @return Number — angle in degrees
 */
function angleBetween(v1, v2) {
  var d    = Vector3.dot(v1, v2);
  var mag1 = v1.magnitude();
  var mag2 = v2.magnitude();

  if (mag1 === 0 || mag2 === 0) {
    console.log('Error: cannot compute angle with zero-length vector');
    return 0;
  }

  // Clamp to [-1, 1] to guard against floating-point errors
  var cosAlpha = Math.max(-1, Math.min(1, d / (mag1 * mag2)));
  var angleRad = Math.acos(cosAlpha);
  return angleRad * (180.0 / Math.PI);
}

/**
 * Compute the area of the triangle formed by vectors v1 and v2.
 *   ||v1 × v2|| = area of the parallelogram
 *   triangle area = ||v1 × v2|| / 2
 *
 * @param v1 Vector3
 * @param v2 Vector3
 * @return Number — area of the triangle
 */
function areaTriangle(v1, v2) {
  var crossVec = Vector3.cross(v1, v2);
  return crossVec.magnitude() / 2.0;
}
