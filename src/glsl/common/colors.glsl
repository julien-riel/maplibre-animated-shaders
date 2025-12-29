/**
 * Color manipulation functions for GLSL shaders
 * Includes color space conversions and blend modes
 */

// ============================================
// Color Space Conversions
// ============================================

/**
 * RGB to HSL conversion
 * @param c - RGB color (0-1 range)
 * @return HSL color (H: 0-1, S: 0-1, L: 0-1)
 */
vec3 rgb2hsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float l = (maxC + minC) * 0.5;

  if (maxC == minC) {
    return vec3(0.0, 0.0, l);
  }

  float d = maxC - minC;
  float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);

  float h;
  if (maxC == c.r) {
    h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  } else if (maxC == c.g) {
    h = (c.b - c.r) / d + 2.0;
  } else {
    h = (c.r - c.g) / d + 4.0;
  }
  h /= 6.0;

  return vec3(h, s, l);
}

/**
 * Helper function for HSL to RGB
 */
float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

/**
 * HSL to RGB conversion
 * @param c - HSL color (H: 0-1, S: 0-1, L: 0-1)
 * @return RGB color (0-1 range)
 */
vec3 hsl2rgb(vec3 c) {
  if (c.y == 0.0) {
    return vec3(c.z);
  }

  float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y;
  float p = 2.0 * c.z - q;

  return vec3(
    hue2rgb(p, q, c.x + 1.0/3.0),
    hue2rgb(p, q, c.x),
    hue2rgb(p, q, c.x - 1.0/3.0)
  );
}

/**
 * RGB to HSV conversion
 */
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

/**
 * HSV to RGB conversion
 */
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

/**
 * sRGB to linear RGB
 */
vec3 srgb2linear(vec3 c) {
  return pow(c, vec3(2.2));
}

/**
 * Linear RGB to sRGB
 */
vec3 linear2srgb(vec3 c) {
  return pow(c, vec3(1.0/2.2));
}

// ============================================
// Color Manipulation
// ============================================

/**
 * Adjust brightness
 */
vec3 adjustBrightness(vec3 c, float amount) {
  return c + amount;
}

/**
 * Adjust contrast
 */
vec3 adjustContrast(vec3 c, float amount) {
  return (c - 0.5) * amount + 0.5;
}

/**
 * Adjust saturation
 */
vec3 adjustSaturation(vec3 c, float amount) {
  float grey = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(grey), c, amount);
}

/**
 * Adjust hue (rotate in HSL space)
 */
vec3 adjustHue(vec3 c, float shift) {
  vec3 hsl = rgb2hsl(c);
  hsl.x = fract(hsl.x + shift);
  return hsl2rgb(hsl);
}

/**
 * Invert color
 */
vec3 invertColor(vec3 c) {
  return 1.0 - c;
}

// ============================================
// Blend Modes
// ============================================

/**
 * Normal blend
 */
vec3 blendNormal(vec3 base, vec3 blend) {
  return blend;
}

/**
 * Multiply blend
 */
vec3 blendMultiply(vec3 base, vec3 blend) {
  return base * blend;
}

/**
 * Screen blend
 */
vec3 blendScreen(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

/**
 * Overlay blend
 */
vec3 blendOverlay(vec3 base, vec3 blend) {
  return mix(
    2.0 * base * blend,
    1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
    step(0.5, base)
  );
}

/**
 * Soft light blend
 */
vec3 blendSoftLight(vec3 base, vec3 blend) {
  return mix(
    2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
    sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
    step(0.5, blend)
  );
}

/**
 * Hard light blend
 */
vec3 blendHardLight(vec3 base, vec3 blend) {
  return blendOverlay(blend, base);
}

/**
 * Dodge blend
 */
vec3 blendDodge(vec3 base, vec3 blend) {
  return base / (1.0 - blend + 0.001);
}

/**
 * Burn blend
 */
vec3 blendBurn(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) / (blend + 0.001);
}

/**
 * Difference blend
 */
vec3 blendDifference(vec3 base, vec3 blend) {
  return abs(base - blend);
}

/**
 * Exclusion blend
 */
vec3 blendExclusion(vec3 base, vec3 blend) {
  return base + blend - 2.0 * base * blend;
}

/**
 * Add/Linear Dodge blend
 */
vec3 blendAdd(vec3 base, vec3 blend) {
  return min(base + blend, 1.0);
}

// ============================================
// Color Gradients
// ============================================

/**
 * Linear gradient between two colors
 */
vec3 gradientLinear(vec3 colorA, vec3 colorB, float t) {
  return mix(colorA, colorB, t);
}

/**
 * Multi-stop gradient
 * @param colors - Array of colors (max 4)
 * @param stops - Array of stop positions (0-1)
 * @param t - Position (0-1)
 */
vec3 gradientMulti(vec3 c0, vec3 c1, vec3 c2, vec3 c3, float t) {
  if (t < 0.333) return mix(c0, c1, t * 3.0);
  if (t < 0.666) return mix(c1, c2, (t - 0.333) * 3.0);
  return mix(c2, c3, (t - 0.666) * 3.0);
}

// ============================================
// Color Palettes
// ============================================

/**
 * Cosine palette (iq's technique)
 * Creates smooth color gradients
 */
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

/**
 * Rainbow palette
 */
vec3 rainbow(float t) {
  return hsv2rgb(vec3(t, 1.0, 1.0));
}

/**
 * Thermal/heat palette
 */
vec3 thermal(float t) {
  return vec3(
    smoothstep(0.0, 0.5, t),
    smoothstep(0.25, 0.75, t),
    smoothstep(0.5, 1.0, t)
  );
}

// ============================================
// Alpha/Transparency
// ============================================

/**
 * Alpha blend (over operator)
 */
vec4 alphaBlend(vec4 src, vec4 dst) {
  float outA = src.a + dst.a * (1.0 - src.a);
  if (outA == 0.0) return vec4(0.0);

  vec3 outRGB = (src.rgb * src.a + dst.rgb * dst.a * (1.0 - src.a)) / outA;
  return vec4(outRGB, outA);
}

/**
 * Premultiply alpha
 */
vec4 premultiply(vec4 c) {
  return vec4(c.rgb * c.a, c.a);
}

/**
 * Unpremultiply alpha
 */
vec4 unpremultiply(vec4 c) {
  if (c.a == 0.0) return vec4(0.0);
  return vec4(c.rgb / c.a, c.a);
}
