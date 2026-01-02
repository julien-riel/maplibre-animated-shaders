/**
 * Pulse Shader - Expanding concentric rings from point center
 *
 * Creates a radar-like pulse effect with multiple rings expanding
 * outward from the center of each point feature.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Pulse shader
 */
export interface PulseConfig extends ShaderConfig {
  /** Ring color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Number of visible rings */
  rings: number;
  /** Maximum radius in pixels */
  maxRadius: number;
  /** Whether rings fade as they expand */
  fadeOut: boolean;
  /** Ring thickness in pixels */
  thickness: number;
}

/**
 * Default configuration for Pulse shader
 */
export const pulseDefaultConfig: PulseConfig = {
  color: '#3b82f6',
  speed: 1.0,
  rings: 3,
  maxRadius: 50,
  fadeOut: true,
  thickness: 2,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const pulseConfigSchema: ConfigSchema = {
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
  fadeOut: {
    type: 'boolean',
    default: true,
    label: 'Fade Out',
    description: 'Fade rings as they expand',
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
 * Fragment shader GLSL code for Pulse effect
 */
export const pulseFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_rings;
uniform float u_maxRadius;
uniform float u_fadeOut;
uniform float u_thickness;
uniform float u_intensity;

varying vec2 v_pos;
varying float v_timeOffset;
varying float v_effectiveTime;

// Data-driven properties from vertex shader
varying vec4 v_color;
varying float v_intensity;
varying float v_useDataDrivenColor;
varying float v_useDataDrivenIntensity;

float sdRing(vec2 p, float radius, float thickness) {
  float d = length(p) - radius;
  return abs(d) - thickness * 0.5;
}

void main() {
  vec2 pos = v_pos * u_maxRadius;
  float dist = length(pos);

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;
  float cycle = fract(localTime * 0.5);
  float alpha = 0.0;

  for (float i = 0.0; i < 10.0; i++) {
    if (i >= u_rings) break;

    float ringPhase = fract(cycle + i / u_rings);
    float ringRadius = ringPhase * u_maxRadius;
    float ringDist = sdRing(pos, ringRadius, u_thickness);
    float ringAlpha = 1.0 - smoothstep(0.0, 1.5, ringDist);
    float fadeFactor = mix(1.0, 1.0 - ringPhase, u_fadeOut);

    alpha = max(alpha, ringAlpha * fadeFactor);
  }

  // Use data-driven color/intensity if available, otherwise use uniform
  vec4 finalColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  gl_FragColor = vec4(finalColor.rgb, finalColor.a * alpha * finalIntensity);
}
`;

/**
 * Pulse shader definition
 */
export const pulseShader: ShaderDefinition<PulseConfig> = {
  name: 'pulse',
  displayName: 'Pulse',
  description: 'Expanding concentric rings from point center - perfect for alerts, POIs, and events',
  geometry: 'point',
  tags: ['alert', 'notification', 'radar', 'expand', 'ripple'],

  fragmentShader: pulseFragmentShader,

  defaultConfig: pulseDefaultConfig,
  configSchema: pulseConfigSchema,

  /**
   * Compute uniform values for MapLibre paint property animation
   * This provides a fallback animation using circle properties
   */
  getUniforms: (config: PulseConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : config.color;

    // Calculate animation phase (0 to 1)
    const phase = (time * config.speed * 0.5) % 1;

    // For paint property mode, we animate a single expanding ring
    // The radius expands from 0 to maxRadius
    const currentRadius = phase * config.maxRadius;

    // Opacity fades as ring expands (if fadeOut enabled)
    const opacity = config.fadeOut
      ? (1 - phase) * (config.intensity ?? 1)
      : config.intensity ?? 1;

    // Convert color to CSS format for MapLibre
    const colorRgba = `rgba(${Math.round(rgba[0] * 255)}, ${Math.round(rgba[1] * 255)}, ${Math.round(rgba[2] * 255)}, ${opacity})`;

    return {
      // Standard MapLibre paint property uniforms
      u_radius: currentRadius,
      u_color: colorRgba,
      u_opacity: opacity,
      u_stroke_width: config.thickness,
      u_stroke_color: colorRgba,

      // Full GLSL uniforms (for custom layer mode)
      u_time: time * config.speed,
      u_rings: config.rings,
      u_maxRadius: config.maxRadius,
      u_fadeOut: config.fadeOut ? 1.0 : 0.0,
      u_thickness: config.thickness,
      u_intensity: config.intensity ?? 1.0,
      u_color_vec4: rgba,
    };
  },

  requiredPaint: {
    'circle-pitch-alignment': 'map',
    'circle-opacity': 1,
  },
};

export default pulseShader;
