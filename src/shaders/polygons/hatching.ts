/**
 * Hatching Shader - Animated hatching pattern for polygons
 *
 * Creates diagonal line patterns that animate across the polygon,
 * perfect for construction zones, unavailable areas, or terrain visualization.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Hatching shader
 */
export interface HatchingConfig extends ShaderConfig {
  /** Hatch color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Angle of hatching in degrees */
  angle: number;
  /** Spacing between hatch lines */
  spacing: number;
  /** Thickness of hatch lines */
  thickness: number;
  /** Enable cross-hatching (double pattern) */
  crossHatch: boolean;
  /** Overall effect intensity */
  intensity: number;
}

/**
 * Default configuration for Hatching shader
 */
export const hatchingDefaultConfig: HatchingConfig = {
  color: '#78716c',
  speed: 0.5,
  angle: 45,
  spacing: 8,
  thickness: 2,
  crossHatch: false,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const hatchingConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#78716c',
    label: 'Color',
    description: 'Color of the hatch lines',
  },
  speed: {
    type: 'number',
    default: 0.5,
    min: 0.0,
    max: 3.0,
    step: 0.1,
    label: 'Speed',
    description: 'Animation speed (0 for static)',
  },
  angle: {
    type: 'number',
    default: 45,
    min: 0,
    max: 180,
    step: 15,
    label: 'Angle',
    description: 'Angle of hatch lines in degrees',
  },
  spacing: {
    type: 'number',
    default: 8,
    min: 3,
    max: 30,
    step: 1,
    label: 'Spacing',
    description: 'Spacing between hatch lines',
  },
  thickness: {
    type: 'number',
    default: 2,
    min: 1,
    max: 10,
    step: 1,
    label: 'Thickness',
    description: 'Thickness of hatch lines',
  },
  crossHatch: {
    type: 'boolean',
    default: false,
    label: 'Cross Hatch',
    description: 'Enable perpendicular cross-hatching',
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
 * Fragment shader GLSL code for Hatching effect
 */
export const hatchingFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_angle;
uniform float u_spacing;
uniform float u_thickness;
uniform float u_crossHatch;
uniform float u_intensity;

varying vec2 v_screen_pos;
varying float v_timeOffset;
varying float v_effectiveTime;

// Rotate a 2D vector
vec2 rotate2D(vec2 v, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

float hatchLine(vec2 pos, float angle, float offset) {
  vec2 rotated = rotate2D(pos, angle);
  float pattern = mod(rotated.x + offset, u_spacing);
  float line = 1.0 - smoothstep(u_thickness * 0.5 - 0.5, u_thickness * 0.5 + 0.5, abs(pattern - u_spacing * 0.5));
  return line;
}

void main() {
  // Convert angle to radians
  float angleRad = u_angle * 3.14159 / 180.0;

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Animation offset
  float offset = localTime * 20.0;

  // Primary hatch pattern
  float hatch1 = hatchLine(v_screen_pos, angleRad, offset);

  // Cross-hatch pattern (perpendicular)
  float hatch2 = 0.0;
  if (u_crossHatch > 0.5) {
    hatch2 = hatchLine(v_screen_pos, angleRad + 1.5708, -offset);
  }

  // Combine patterns
  float pattern = max(hatch1, hatch2);

  // Apply base fill
  float baseFill = 0.15;
  float alpha = mix(baseFill, 1.0, pattern) * u_intensity;

  gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
}
`;

/**
 * Hatching shader definition
 */
export const hatchingShader: ShaderDefinition<HatchingConfig> = {
  name: 'hatching',
  displayName: 'Hatching',
  description: 'Animated diagonal hatching pattern for construction, terrain, or unavailable zones',
  geometry: 'polygon',
  tags: ['construction', 'terrain', 'pattern', 'unavailable', 'zones'],

  fragmentShader: hatchingFragmentShader,

  defaultConfig: hatchingDefaultConfig,
  configSchema: hatchingConfigSchema,

  getUniforms: (config: HatchingConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : config.color;

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_angle: config.angle,
      u_spacing: config.spacing,
      u_thickness: config.thickness,
      u_crossHatch: config.crossHatch ? 1.0 : 0.0,
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default hatchingShader;
