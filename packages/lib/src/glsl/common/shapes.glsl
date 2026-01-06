/**
 * Signed Distance Functions (SDF) for geometric shapes
 * All functions return the signed distance to the shape's boundary:
 * - Negative inside the shape
 * - Zero on the boundary
 * - Positive outside the shape
 */

#ifndef PI
#define PI 3.14159265359
#endif

#define TAU 6.28318530718

// ============================================
// 2D Primitives
// ============================================

/**
 * Circle SDF
 * @param p - Point to test
 * @param r - Radius
 */
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

/**
 * Ring (annulus) SDF
 * @param p - Point to test
 * @param r - Outer radius
 * @param w - Ring width
 */
float sdRing(vec2 p, float r, float w) {
  return abs(length(p) - r) - w * 0.5;
}

/**
 * Box SDF
 * @param p - Point to test
 * @param b - Half-size of the box
 */
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

/**
 * Rounded box SDF
 * @param p - Point to test
 * @param b - Half-size of the box
 * @param r - Corner radius
 */
float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

/**
 * Equilateral triangle SDF
 * @param p - Point to test
 * @param r - Circumradius
 */
float sdTriangle(vec2 p, float r) {
  const float k = sqrt(3.0);
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) {
    p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  }
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}

/**
 * Regular polygon SDF
 * @param p - Point to test
 * @param r - Circumradius
 * @param n - Number of sides
 */
float sdPolygon(vec2 p, float r, float n) {
  float an = PI / n;
  float en = PI / n;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));

  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  return length(p) * sign(p.x);
}

/**
 * Star SDF
 * @param p - Point to test
 * @param r - Outer radius
 * @param n - Number of points
 * @param m - Inner radius ratio (0-1)
 */
float sdStar(vec2 p, float r, float n, float m) {
  float an = PI / n;
  float en = PI / m;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));

  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));

  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  return length(p) * sign(p.x);
}

/**
 * Heart SDF
 * @param p - Point to test
 * @param r - Size
 */
float sdHeart(vec2 p, float r) {
  p /= r;
  p.y -= 0.5;

  float a = atan(p.x, p.y) / PI;
  float d = length(p);
  float h = abs(a);
  float s = (0.5 + 0.5 * cos(3.0 * PI * a)) * 0.3;

  return (d - (0.5 + s)) * r;
}

/**
 * Line segment SDF
 * @param p - Point to test
 * @param a - Start point
 * @param b - End point
 */
float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

/**
 * Arc SDF
 * @param p - Point to test
 * @param sc - sin/cos of the arc's half-angle
 * @param ra - Arc radius
 * @param rb - Arc thickness
 */
float sdArc(vec2 p, vec2 sc, float ra, float rb) {
  p.x = abs(p.x);
  return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb;
}

// ============================================
// SDF Operations
// ============================================

/**
 * Union of two shapes
 */
float opUnion(float d1, float d2) {
  return min(d1, d2);
}

/**
 * Subtraction (d1 - d2)
 */
float opSubtract(float d1, float d2) {
  return max(-d1, d2);
}

/**
 * Intersection
 */
float opIntersect(float d1, float d2) {
  return max(d1, d2);
}

/**
 * Smooth union
 * @param k - Smoothing factor
 */
float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

/**
 * Smooth subtraction
 */
float opSmoothSubtract(float d1, float d2, float k) {
  float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
  return mix(d2, -d1, h) + k * h * (1.0 - h);
}

/**
 * Smooth intersection
 */
float opSmoothIntersect(float d1, float d2, float k) {
  float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) + k * h * (1.0 - h);
}

// ============================================
// Transformations
// ============================================

/**
 * Rotate a 2D point
 */
vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

/**
 * Scale a 2D point
 */
vec2 scale2D(vec2 p, float s) {
  return p / s;
}

/**
 * Repeat space
 */
vec2 repeat(vec2 p, vec2 c) {
  return mod(p + 0.5 * c, c) - 0.5 * c;
}

// ============================================
// Rendering helpers
// ============================================

/**
 * Fill - returns 1 inside, 0 outside
 */
float fill(float d) {
  return 1.0 - step(0.0, d);
}

/**
 * Stroke - returns 1 on the edge
 */
float stroke(float d, float width) {
  return 1.0 - step(width * 0.5, abs(d));
}

/**
 * Smooth fill with anti-aliasing
 */
float fillAA(float d, float aa) {
  return 1.0 - smoothstep(-aa, aa, d);
}

/**
 * Smooth stroke with anti-aliasing
 */
float strokeAA(float d, float width, float aa) {
  return 1.0 - smoothstep(-aa, aa, abs(d) - width * 0.5);
}
