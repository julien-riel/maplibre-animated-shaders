/**
 * Trail Fade Shader - Fading trail effect along lines
 *
 * Creates a trail with decreasing opacity towards the back,
 * perfect for trajectories, GPS tracks, and movement visualization.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Trail Fade shader
 */
export interface TrailFadeConfig extends ShaderConfig {
  /** Trail color */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Length of the bright head (0-1) */
  headLength: number;
  /** Length of the fade zone (0-1) */
  fadeLength: number;
  /** Minimum opacity at the tail */
  minOpacity: number;
  /** Whether to loop continuously */
  loop: boolean;
  /** Line width in pixels */
  width: number;
}

/**
 * Default configuration for Trail Fade shader
 */
export const trailFadeDefaultConfig: TrailFadeConfig = {
  color: '#10b981',
  speed: 1.0,
  headLength: 0.2,
  fadeLength: 0.8,
  minOpacity: 0.1,
  loop: true,
  width: 4,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const trailFadeConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#10b981',
    label: 'Color',
    description: 'Trail color',
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
  headLength: {
    type: 'number',
    default: 0.2,
    min: 0.05,
    max: 0.5,
    step: 0.05,
    label: 'Head Length',
    description: 'Length of the bright head (0-1)',
  },
  fadeLength: {
    type: 'number',
    default: 0.8,
    min: 0.1,
    max: 1.0,
    step: 0.1,
    label: 'Fade Length',
    description: 'Length of the fade zone (0-1)',
  },
  minOpacity: {
    type: 'number',
    default: 0.1,
    min: 0.0,
    max: 0.5,
    step: 0.05,
    label: 'Min Opacity',
    description: 'Minimum opacity at the tail',
  },
  loop: {
    type: 'boolean',
    default: true,
    label: 'Loop',
    description: 'Continuous loop animation',
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
 * Fragment shader GLSL code for Trail Fade effect
 */
export const trailFadeFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_headLength;
uniform float u_fadeLength;
uniform float u_minOpacity;
uniform float u_loop;
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

  // Calculate head position
  float headPos = 0.0;
  if (u_loop > 0.5) {
    headPos = fract(localTime * 0.3);
  } else {
    headPos = clamp(localTime * 0.3, 0.0, 1.0);
  }

  // Calculate distance from head
  float distFromHead = headPos - v_progress;
  if (u_loop > 0.5 && distFromHead < 0.0) {
    distFromHead += 1.0;
  }

  // Calculate opacity based on distance from head
  float fadeAlpha = 1.0;
  if (distFromHead < 0.0 || distFromHead > u_fadeLength + u_headLength) {
    // Behind the head or beyond fade length
    fadeAlpha = u_minOpacity;
  } else if (distFromHead < u_headLength) {
    // In the bright head
    fadeAlpha = 1.0;
  } else {
    // In the fade zone
    float fadeProgress = (distFromHead - u_headLength) / u_fadeLength;
    fadeAlpha = mix(1.0, u_minOpacity, fadeProgress);
  }

  // Use data-driven color/intensity if available, otherwise use uniform
  vec4 finalColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  // Final alpha
  float alpha = lineAlpha * fadeAlpha * finalIntensity;

  gl_FragColor = vec4(finalColor.rgb, finalColor.a * alpha);
}
`;

/**
 * Trail Fade shader definition
 */
export const trailFadeShader: ShaderDefinition<TrailFadeConfig> = {
  name: 'trailFade',
  displayName: 'Trail Fade',
  description: 'Fading trail effect along lines - perfect for trajectories and GPS tracks',
  geometry: 'line',
  tags: ['trail', 'trajectory', 'gps', 'movement', 'fade'],

  fragmentShader: trailFadeFragmentShader,

  defaultConfig: trailFadeDefaultConfig,
  configSchema: trailFadeConfigSchema,

  getUniforms: (config: TrailFadeConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : config.color;

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_headLength: config.headLength,
      u_fadeLength: config.fadeLength,
      u_minOpacity: config.minOpacity,
      u_loop: config.loop ? 1.0 : 0.0,
      u_intensity: config.intensity ?? 1.0,
      u_width: config.width,
    };
  },

  requiredLayout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

export default trailFadeShader;
