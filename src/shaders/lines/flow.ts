/**
 * Flow Shader - Animated dashes flowing along lines
 *
 * Creates dashes that "flow" along the line, perfect for
 * traffic direction, pipelines, and data flow visualization.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Flow shader
 */
export interface FlowConfig extends ShaderConfig {
  /** Dash color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Length of dashes in pixels */
  dashLength: number;
  /** Length of gaps in pixels */
  gapLength: number;
  /** Flow direction: forward or backward */
  direction: 'forward' | 'backward';
  /** Apply gradient to each dash */
  gradient: boolean;
  /** Line width in pixels */
  width: number;
}

/**
 * Default configuration for Flow shader
 */
export const flowDefaultConfig: FlowConfig = {
  color: '#3b82f6',
  speed: 1.0,
  dashLength: 10,
  gapLength: 10,
  direction: 'forward',
  gradient: false,
  width: 4,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const flowConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#3b82f6',
    label: 'Color',
    description: 'Color of the dashes',
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
  dashLength: {
    type: 'number',
    default: 10,
    min: 2,
    max: 50,
    step: 1,
    label: 'Dash Length',
    description: 'Length of dashes in pixels',
  },
  gapLength: {
    type: 'number',
    default: 10,
    min: 2,
    max: 50,
    step: 1,
    label: 'Gap Length',
    description: 'Length of gaps between dashes',
  },
  direction: {
    type: 'select',
    default: 'forward',
    options: ['forward', 'backward'],
    label: 'Direction',
    description: 'Flow direction along the line',
  },
  gradient: {
    type: 'boolean',
    default: false,
    label: 'Gradient',
    description: 'Apply gradient fade to each dash',
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
 * Fragment shader GLSL code for Flow effect
 */
export const flowFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_dashLength;
uniform float u_gapLength;
uniform float u_direction;
uniform float u_gradient;
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

  // Calculate dash pattern
  float cycleLength = u_dashLength + u_gapLength;
  float phase = localTime * 50.0 * u_direction; // Direction: 1 or -1
  float position = v_progress * 1000.0 + phase;

  // Wrap position to cycle
  float cyclePos = mod(position, cycleLength);

  // Dash visibility
  float dashAlpha = 0.0;
  if (cyclePos < u_dashLength) {
    dashAlpha = 1.0;

    // Apply gradient within dash if enabled
    if (u_gradient > 0.5) {
      float dashProgress = cyclePos / u_dashLength;
      dashAlpha *= 1.0 - dashProgress * 0.5;
    }
  }

  // Final alpha
  float alpha = lineAlpha * dashAlpha * u_intensity;

  // Use data-driven color/intensity if available, otherwise use uniform
  vec4 finalColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  gl_FragColor = vec4(finalColor.rgb, finalColor.a * alpha * finalIntensity / u_intensity);
}
`;

/**
 * Flow shader definition
 */
export const flowShader: ShaderDefinition<FlowConfig> = {
  name: 'flow',
  displayName: 'Flow',
  description: 'Animated dashes flowing along lines - perfect for traffic, pipelines, and data flow',
  geometry: 'line',
  tags: ['traffic', 'direction', 'pipeline', 'animation', 'dashes'],

  fragmentShader: flowFragmentShader,

  defaultConfig: flowDefaultConfig,
  configSchema: flowConfigSchema,

  getUniforms: (config: FlowConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : config.color;

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_dashLength: config.dashLength,
      u_gapLength: config.gapLength,
      u_direction: config.direction === 'forward' ? 1.0 : -1.0,
      u_gradient: config.gradient ? 1.0 : 0.0,
      u_intensity: config.intensity ?? 1.0,
      u_width: config.width,
    };
  },

  requiredLayout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

export default flowShader;
