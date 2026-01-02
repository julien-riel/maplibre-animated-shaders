/**
 * Pulse Shader - Expanding concentric rings from point center
 *
 * Uniforms:
 *   u_time: float - Current animation time in seconds
 *   u_color: vec4 - Ring color (RGBA)
 *   u_rings: float - Number of visible rings
 *   u_maxRadius: float - Maximum radius in pixels
 *   u_fadeOut: float - Whether to fade out (0.0 or 1.0)
 *   u_thickness: float - Ring thickness in pixels
 *   u_speed: float - Animation speed multiplier
 */

precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_rings;
uniform float u_maxRadius;
uniform float u_fadeOut;
uniform float u_thickness;
uniform float u_speed;

varying vec2 v_pos;

// Signed distance function for a ring
float sdRing(vec2 p, float radius, float thickness) {
  float d = length(p) - radius;
  return abs(d) - thickness * 0.5;
}

void main() {
  vec2 pos = v_pos * u_maxRadius;
  float dist = length(pos);

  // Normalized time for cycling (0 to 1)
  float cycle = fract(u_time * u_speed * 0.5);

  // Calculate ring spacing
  float ringSpacing = u_maxRadius / u_rings;

  float alpha = 0.0;

  // Draw multiple expanding rings
  for (float i = 0.0; i < 10.0; i++) {
    if (i >= u_rings) break;

    // Each ring starts at a different phase
    float ringPhase = fract(cycle + i / u_rings);
    float ringRadius = ringPhase * u_maxRadius;

    // Calculate ring SDF
    float ringDist = sdRing(pos, ringRadius, u_thickness);

    // Anti-aliased ring
    float ringAlpha = 1.0 - smoothstep(0.0, 1.5, ringDist);

    // Fade out based on expansion (if enabled)
    float fadeFactor = mix(1.0, 1.0 - ringPhase, u_fadeOut);

    // Accumulate alpha
    alpha = max(alpha, ringAlpha * fadeFactor);
  }

  // Apply color with calculated alpha
  gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
}
