/**
 * Gradient Travel Shader - Moving color gradient along lines
 *
 * Creates a gradient that travels along the line, perfect for
 * network visualization, energy transfer, and data flow.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Gradient Travel shader
 */
export interface GradientTravelConfig extends ShaderConfig {
  /** Start color of the gradient */
  colorStart: string;
  /** End color of the gradient */
  colorEnd: string;
  /** Animation speed multiplier */
  speed: number;
  /** Wavelength of the gradient in pixels */
  wavelength: number;
  /** Mode: linear or wave */
  mode: 'linear' | 'wave';
  /** Line width in pixels */
  width: number;
}

/**
 * Default configuration for Gradient Travel shader
 */
export const gradientTravelDefaultConfig: GradientTravelConfig = {
  colorStart: '#3b82f6',
  colorEnd: '#8b5cf6',
  speed: 0.5,
  wavelength: 100,
  mode: 'linear',
  width: 4,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const gradientTravelConfigSchema: ConfigSchema = {
  colorStart: {
    type: 'color',
    default: '#3b82f6',
    label: 'Start Color',
    description: 'Color at the start of the gradient',
  },
  colorEnd: {
    type: 'color',
    default: '#8b5cf6',
    label: 'End Color',
    description: 'Color at the end of the gradient',
  },
  speed: {
    type: 'number',
    default: 0.5,
    min: 0.1,
    max: 3.0,
    step: 0.1,
    label: 'Speed',
    description: 'Animation speed multiplier',
  },
  wavelength: {
    type: 'number',
    default: 100,
    min: 20,
    max: 500,
    step: 10,
    label: 'Wavelength',
    description: 'Length of one gradient cycle in pixels',
  },
  mode: {
    type: 'select',
    default: 'linear',
    options: ['linear', 'wave'],
    label: 'Mode',
    description: 'Gradient progression mode',
  },
  width: {
    type: 'number',
    default: 4,
    min: 1,
    max: 20,
    step: 1,
    label: 'Width',
    description: 'Line width in pixels',
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
 * Fragment shader GLSL code for Gradient Travel effect
 */
export const gradientTravelFragmentShader = `
precision highp float;

#define PI 3.14159265359

uniform float u_time;
uniform vec4 u_colorStart;
uniform vec4 u_colorEnd;
uniform float u_wavelength;
uniform float u_mode;
uniform float u_intensity;
uniform float u_width;

varying vec2 v_pos;
varying float v_progress;
varying float v_line_index;
varying float v_width;
varying float v_timeOffset;
varying float v_effectiveTime;

// Data-driven properties from vertex shader
varying vec4 v_color;
varying float v_intensity;
varying float v_useDataDrivenColor;
varying float v_useDataDrivenIntensity;

void main() {
  // Calculate perpendicular distance from line center
  float dist = abs(v_pos.y);

  // Anti-aliased line edge
  float aa = 1.5 / u_width;
  float lineAlpha = 1.0 - smoothstep(1.0 - aa, 1.0, dist);

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Calculate gradient position
  float position = v_progress * 1000.0 - localTime * 50.0;
  float gradientPos = 0.0;

  if (u_mode < 0.5) {
    // Linear mode: sawtooth wave
    gradientPos = fract(position / u_wavelength);
  } else {
    // Wave mode: smooth sine wave
    gradientPos = sin(position / u_wavelength * PI * 2.0) * 0.5 + 0.5;
  }

  // Interpolate between colors
  vec4 color = mix(u_colorStart, u_colorEnd, gradientPos);

  // Use data-driven color/intensity if available (overrides gradient colors)
  vec4 finalColor = mix(color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  // Final alpha
  float alpha = lineAlpha * finalIntensity;

  gl_FragColor = vec4(finalColor.rgb, finalColor.a * alpha);
}
`;

/**
 * Gradient Travel shader definition
 */
export const gradientTravelShader: ShaderDefinition<GradientTravelConfig> = {
  name: 'gradientTravel',
  displayName: 'Gradient Travel',
  description: 'Moving color gradient along lines - perfect for networks and energy transfer',
  geometry: 'line',
  tags: ['network', 'energy', 'gradient', 'flow', 'data'],

  fragmentShader: gradientTravelFragmentShader,

  defaultConfig: gradientTravelDefaultConfig,
  configSchema: gradientTravelConfigSchema,

  getUniforms: (config: GradientTravelConfig, time: number, _deltaTime: number) => {
    const rgbaStart = typeof config.colorStart === 'string'
      ? hexToRgba(config.colorStart)
      : config.colorStart;
    const rgbaEnd = typeof config.colorEnd === 'string'
      ? hexToRgba(config.colorEnd)
      : config.colorEnd;

    return {
      u_time: time * config.speed,
      u_colorStart: rgbaStart,
      u_colorEnd: rgbaEnd,
      u_color_vec4: rgbaStart,
      u_wavelength: config.wavelength,
      u_mode: config.mode === 'linear' ? 0.0 : 1.0,
      u_intensity: config.intensity ?? 1.0,
      u_width: config.width,
    };
  },

  requiredLayout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

export default gradientTravelShader;
