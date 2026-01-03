/**
 * Point Shader - Pulse Marker
 *
 * Demonstrates all features for point geometry:
 * - Per-feature timing offset
 * - Data-driven color/intensity/speed
 * - Multiple easing functions
 * - SDF (Signed Distance Function)
 * - Presets
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Point shader
 */
export interface PointConfig extends ShaderConfig {
  /** Ring color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Number of visible rings */
  rings: number;
  /** Maximum radius in pixels */
  maxRadius: number;
  /** Ring thickness in pixels */
  thickness: number;
  /** Whether rings fade as they expand */
  fadeOut: boolean;
  /** Easing function type */
  easing: 'linear' | 'easeOut' | 'easeInOut' | 'elastic';
}

/**
 * Default configuration
 */
export const pointDefaultConfig: PointConfig = {
  color: '#3b82f6',
  speed: 1.0,
  rings: 3,
  maxRadius: 50,
  thickness: 2,
  fadeOut: true,
  easing: 'easeOut',
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const pointConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#3b82f6',
    label: 'Color',
    description: 'Color of the pulse rings',
  },
  speed: {
    type: 'number',
    default: 1.0,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    label: 'Speed',
    description: 'Animation speed multiplier',
  },
  rings: {
    type: 'number',
    default: 3,
    min: 1,
    max: 10,
    step: 1,
    label: 'Rings',
    description: 'Number of visible rings',
  },
  maxRadius: {
    type: 'number',
    default: 50,
    min: 10,
    max: 200,
    step: 5,
    label: 'Max Radius',
    description: 'Maximum radius in pixels',
  },
  thickness: {
    type: 'number',
    default: 2,
    min: 1,
    max: 10,
    step: 0.5,
    label: 'Thickness',
    description: 'Ring thickness in pixels',
  },
  fadeOut: {
    type: 'boolean',
    default: true,
    label: 'Fade Out',
    description: 'Fade rings as they expand',
  },
  easing: {
    type: 'select',
    default: 'easeOut',
    options: ['linear', 'easeOut', 'easeInOut', 'elastic'],
    label: 'Easing',
    description: 'Animation easing function',
  },
  intensity: {
    type: 'number',
    default: 1.0,
    min: 0,
    max: 1,
    step: 0.1,
    label: 'Intensity',
    description: 'Overall effect intensity',
  },
};

/**
 * Fragment shader GLSL code
 */
export const pointFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_rings;
uniform float u_maxRadius;
uniform float u_thickness;
uniform float u_fadeOut;
uniform float u_easing;
uniform float u_intensity;

varying vec2 v_pos;
varying float v_timeOffset;
varying float v_effectiveTime;

// Data-driven properties from vertex shader
varying vec4 v_color;
varying float v_intensity;
varying float v_useDataDrivenColor;
varying float v_useDataDrivenIntensity;

// ============================================
// GLSL UTILITY: Easing Functions
// ============================================

float easeLinear(float t) {
  return t;
}

float easeOutQuad(float t) {
  return 1.0 - (1.0 - t) * (1.0 - t);
}

float easeInOutCubic(float t) {
  return t < 0.5
    ? 4.0 * t * t * t
    : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

float easeOutElastic(float t) {
  float c4 = (2.0 * 3.14159265) / 3.0;
  if (t <= 0.0) return 0.0;
  if (t >= 1.0) return 1.0;
  return pow(2.0, -10.0 * t) * sin((t * 10.0 - 0.75) * c4) + 1.0;
}

float applyEasing(float t, float easingType) {
  if (easingType < 0.5) return easeLinear(t);           // 0: linear
  if (easingType < 1.5) return easeOutQuad(t);          // 1: easeOut
  if (easingType < 2.5) return easeInOutCubic(t);       // 2: easeInOut
  return easeOutElastic(t);                              // 3: elastic
}

// ============================================
// GLSL UTILITY: Signed Distance Function (SDF)
// ============================================

float sdRing(vec2 p, float radius, float thickness) {
  float d = length(p) - radius;
  return abs(d) - thickness * 0.5;
}

void main() {
  vec2 pos = v_pos * u_maxRadius;
  float dist = length(pos);

  // ============================================
  // FEATURE: Per-feature timing offset
  // Each feature animates at different phases
  // ============================================
  float localTime = v_effectiveTime;
  float cycle = fract(localTime * 0.5);
  float alpha = 0.0;

  // Render multiple rings with different phases
  for (float i = 0.0; i < 10.0; i++) {
    if (i >= u_rings) break;

    // Calculate ring phase with per-feature offset
    float ringPhase = fract(cycle + i / u_rings);

    // Apply easing to the ring expansion
    float easedPhase = applyEasing(ringPhase, u_easing);

    float ringRadius = easedPhase * u_maxRadius;
    float ringDist = sdRing(pos, ringRadius, u_thickness);
    float ringAlpha = 1.0 - smoothstep(0.0, 1.5, ringDist);

    // Fade factor based on ring age
    float fadeFactor = mix(1.0, 1.0 - ringPhase, u_fadeOut);

    alpha = max(alpha, ringAlpha * fadeFactor);
  }

  // ============================================
  // FEATURE: Data-driven expressions
  // Color and intensity can come from feature properties
  // ============================================
  vec4 finalColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  gl_FragColor = vec4(finalColor.rgb, finalColor.a * alpha * finalIntensity);
}
`;

/**
 * Convert easing name to numeric value for shader
 */
function easingToNumber(easing: PointConfig['easing']): number {
  switch (easing) {
    case 'linear':
      return 0.0;
    case 'easeOut':
      return 1.0;
    case 'easeInOut':
      return 2.0;
    case 'elastic':
      return 3.0;
    default:
      return 1.0;
  }
}

/**
 * Point shader definition
 */
export const pointShader: ShaderDefinition<PointConfig> = {
  name: 'point',
  displayName: 'Pulse Marker',
  description:
    'Expanding concentric rings from point center - demonstrates per-feature timing, data-driven expressions, easing functions, and SDF',
  geometry: 'point',
  tags: ['example', 'point', 'pulse', 'alert', 'marker', 'rings'],

  fragmentShader: pointFragmentShader,

  defaultConfig: pointDefaultConfig,
  configSchema: pointConfigSchema,

  getUniforms: (config: PointConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string' ? hexToRgba(config.color) : config.color;

    const phase = (time * config.speed * 0.5) % 1;
    const currentRadius = phase * config.maxRadius;
    const opacity = config.fadeOut ? (1 - phase) * (config.intensity ?? 1) : (config.intensity ?? 1);
    const colorRgba = `rgba(${Math.round(rgba[0] * 255)}, ${Math.round(rgba[1] * 255)}, ${Math.round(rgba[2] * 255)}, ${opacity})`;

    return {
      // MapLibre paint property uniforms
      u_radius: currentRadius,
      u_color: colorRgba,
      u_opacity: opacity,
      u_stroke_width: config.thickness,
      u_stroke_color: colorRgba,

      // GLSL uniforms
      u_time: time * config.speed,
      u_rings: config.rings,
      u_maxRadius: config.maxRadius,
      u_thickness: config.thickness,
      u_fadeOut: config.fadeOut ? 1.0 : 0.0,
      u_easing: easingToNumber(config.easing),
      u_intensity: config.intensity ?? 1.0,
      u_color_vec4: rgba,
    };
  },

  requiredPaint: {
    'circle-pitch-alignment': 'map',
    'circle-opacity': 1,
  },
};

export default pointShader;
