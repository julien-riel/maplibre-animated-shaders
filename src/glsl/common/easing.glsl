/**
 * Easing functions for GLSL shaders
 * All functions take a value t in [0, 1] and return a value in [0, 1]
 */

// ============================================
// Linear
// ============================================

float linear(float t) {
  return t;
}

// ============================================
// Quadratic
// ============================================

float easeInQuad(float t) {
  return t * t;
}

float easeOutQuad(float t) {
  return t * (2.0 - t);
}

float easeInOutQuad(float t) {
  return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t;
}

// ============================================
// Cubic
// ============================================

float easeInCubic(float t) {
  return t * t * t;
}

float easeOutCubic(float t) {
  float t1 = t - 1.0;
  return t1 * t1 * t1 + 1.0;
}

float easeInOutCubic(float t) {
  return t < 0.5 ? 4.0 * t * t * t : (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0;
}

// ============================================
// Quartic
// ============================================

float easeInQuart(float t) {
  return t * t * t * t;
}

float easeOutQuart(float t) {
  float t1 = t - 1.0;
  return 1.0 - t1 * t1 * t1 * t1;
}

float easeInOutQuart(float t) {
  float t1 = t - 1.0;
  return t < 0.5 ? 8.0 * t * t * t * t : 1.0 - 8.0 * t1 * t1 * t1 * t1;
}

// ============================================
// Quintic
// ============================================

float easeInQuint(float t) {
  return t * t * t * t * t;
}

float easeOutQuint(float t) {
  float t1 = t - 1.0;
  return 1.0 + t1 * t1 * t1 * t1 * t1;
}

float easeInOutQuint(float t) {
  float t1 = t - 1.0;
  return t < 0.5 ? 16.0 * t * t * t * t * t : 1.0 + 16.0 * t1 * t1 * t1 * t1 * t1;
}

// ============================================
// Sine
// ============================================

#define PI 3.14159265359

float easeInSine(float t) {
  return 1.0 - cos(t * PI / 2.0);
}

float easeOutSine(float t) {
  return sin(t * PI / 2.0);
}

float easeInOutSine(float t) {
  return -0.5 * (cos(PI * t) - 1.0);
}

// ============================================
// Exponential
// ============================================

float easeInExpo(float t) {
  return t == 0.0 ? 0.0 : pow(2.0, 10.0 * (t - 1.0));
}

float easeOutExpo(float t) {
  return t == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t);
}

float easeInOutExpo(float t) {
  if (t == 0.0) return 0.0;
  if (t == 1.0) return 1.0;
  if (t < 0.5) return 0.5 * pow(2.0, 20.0 * t - 10.0);
  return 1.0 - 0.5 * pow(2.0, -20.0 * t + 10.0);
}

// ============================================
// Circular
// ============================================

float easeInCirc(float t) {
  return 1.0 - sqrt(1.0 - t * t);
}

float easeOutCirc(float t) {
  float t1 = t - 1.0;
  return sqrt(1.0 - t1 * t1);
}

float easeInOutCirc(float t) {
  if (t < 0.5) {
    return 0.5 * (1.0 - sqrt(1.0 - 4.0 * t * t));
  }
  float t1 = 2.0 * t - 2.0;
  return 0.5 * (sqrt(1.0 - t1 * t1) + 1.0);
}

// ============================================
// Elastic
// ============================================

float easeInElastic(float t) {
  if (t == 0.0) return 0.0;
  if (t == 1.0) return 1.0;
  return -pow(2.0, 10.0 * t - 10.0) * sin((t * 10.0 - 10.75) * (2.0 * PI / 3.0));
}

float easeOutElastic(float t) {
  if (t == 0.0) return 0.0;
  if (t == 1.0) return 1.0;
  return pow(2.0, -10.0 * t) * sin((t * 10.0 - 0.75) * (2.0 * PI / 3.0)) + 1.0;
}

float easeInOutElastic(float t) {
  if (t == 0.0) return 0.0;
  if (t == 1.0) return 1.0;
  if (t < 0.5) {
    return -0.5 * pow(2.0, 20.0 * t - 10.0) * sin((20.0 * t - 11.125) * (2.0 * PI / 4.5));
  }
  return 0.5 * pow(2.0, -20.0 * t + 10.0) * sin((20.0 * t - 11.125) * (2.0 * PI / 4.5)) + 1.0;
}

// ============================================
// Back (overshoot)
// ============================================

float easeInBack(float t) {
  const float c1 = 1.70158;
  const float c3 = c1 + 1.0;
  return c3 * t * t * t - c1 * t * t;
}

float easeOutBack(float t) {
  const float c1 = 1.70158;
  const float c3 = c1 + 1.0;
  float t1 = t - 1.0;
  return 1.0 + c3 * t1 * t1 * t1 + c1 * t1 * t1;
}

float easeInOutBack(float t) {
  const float c1 = 1.70158;
  const float c2 = c1 * 1.525;
  if (t < 0.5) {
    return 0.5 * (4.0 * t * t * ((c2 + 1.0) * 2.0 * t - c2));
  }
  float t1 = 2.0 * t - 2.0;
  return 0.5 * (t1 * t1 * ((c2 + 1.0) * t1 + c2) + 2.0);
}

// ============================================
// Bounce
// ============================================

float easeOutBounce(float t) {
  const float n1 = 7.5625;
  const float d1 = 2.75;

  if (t < 1.0 / d1) {
    return n1 * t * t;
  } else if (t < 2.0 / d1) {
    float t1 = t - 1.5 / d1;
    return n1 * t1 * t1 + 0.75;
  } else if (t < 2.5 / d1) {
    float t1 = t - 2.25 / d1;
    return n1 * t1 * t1 + 0.9375;
  } else {
    float t1 = t - 2.625 / d1;
    return n1 * t1 * t1 + 0.984375;
  }
}

float easeInBounce(float t) {
  return 1.0 - easeOutBounce(1.0 - t);
}

float easeInOutBounce(float t) {
  return t < 0.5
    ? 0.5 * (1.0 - easeOutBounce(1.0 - 2.0 * t))
    : 0.5 * (1.0 + easeOutBounce(2.0 * t - 1.0));
}

// ============================================
// Utility: apply easing by name (for uniforms)
// ============================================

float applyEasing(float t, int easingType) {
  // 0: linear, 1: easeInQuad, 2: easeOutQuad, 3: easeInOutQuad
  // 4: easeInCubic, 5: easeOutCubic, 6: easeInOutCubic
  // 7: easeInSine, 8: easeOutSine, 9: easeInOutSine
  // 10: easeInElastic, 11: easeOutElastic, 12: easeInOutElastic
  // 13: easeInBounce, 14: easeOutBounce, 15: easeInOutBounce

  if (easingType == 0) return linear(t);
  if (easingType == 1) return easeInQuad(t);
  if (easingType == 2) return easeOutQuad(t);
  if (easingType == 3) return easeInOutQuad(t);
  if (easingType == 4) return easeInCubic(t);
  if (easingType == 5) return easeOutCubic(t);
  if (easingType == 6) return easeInOutCubic(t);
  if (easingType == 7) return easeInSine(t);
  if (easingType == 8) return easeOutSine(t);
  if (easingType == 9) return easeInOutSine(t);
  if (easingType == 10) return easeInElastic(t);
  if (easingType == 11) return easeOutElastic(t);
  if (easingType == 12) return easeInOutElastic(t);
  if (easingType == 13) return easeInBounce(t);
  if (easingType == 14) return easeOutBounce(t);
  if (easingType == 15) return easeInOutBounce(t);

  return t;
}
