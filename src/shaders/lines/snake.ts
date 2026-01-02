/**
 * Snake Shader - Colored segment moving along the line
 *
 * Creates a snake-like segment that travels along the path,
 * perfect for itineraries, progress indicators, and loading effects.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Snake shader
 */
export interface SnakeConfig extends ShaderConfig {
  /** Head color */
  headColor: string;
  /** Tail color */
  tailColor: string;
  /** Animation speed multiplier */
  speed: number;
  /** Snake length (0-1 of line length) */
  length: number;
  /** Base color of inactive line */
  baseColor: string;
  /** Whether to loop */
  loop: boolean;
  /** Line width in pixels */
  width: number;
}

/**
 * Default configuration for Snake shader
 */
export const snakeDefaultConfig: SnakeConfig = {
  headColor: '#3b82f6',
  tailColor: '#1e3a8a',
  speed: 0.3,
  length: 0.2,
  baseColor: '#cbd5e1',
  loop: true,
  width: 4,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const snakeConfigSchema: ConfigSchema = {
  headColor: {
    type: 'color',
    default: '#3b82f6',
    label: 'Head Color',
    description: 'Color of the snake head',
  },
  tailColor: {
    type: 'color',
    default: '#1e3a8a',
    label: 'Tail Color',
    description: 'Color of the snake tail',
  },
  speed: {
    type: 'number',
    default: 0.3,
    min: 0.1,
    max: 2.0,
    step: 0.1,
    label: 'Speed',
    description: 'Animation speed',
  },
  length: {
    type: 'number',
    default: 0.2,
    min: 0.05,
    max: 0.5,
    step: 0.05,
    label: 'Length',
    description: 'Snake length (0-1 of line)',
  },
  baseColor: {
    type: 'color',
    default: '#cbd5e1',
    label: 'Base Color',
    description: 'Color of the inactive line',
  },
  loop: {
    type: 'boolean',
    default: true,
    label: 'Loop',
    description: 'Loop animation',
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
 * Fragment shader GLSL code for Snake effect
 */
export const snakeFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_headColor;
uniform vec4 u_tailColor;
uniform vec4 u_baseColor;
uniform float u_length;
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

  // Calculate snake head position
  float headPos = 0.0;
  if (u_loop > 0.5) {
    headPos = fract(localTime * 0.3);
  } else {
    headPos = clamp(localTime * 0.3, 0.0, 1.0 + u_length);
  }

  // Calculate if we're in the snake
  float tailPos = headPos - u_length;
  float inSnake = 0.0;
  float snakeProgress = 0.0;

  if (u_loop > 0.5) {
    // Handle loop wrapping
    if (tailPos < 0.0) {
      // Snake wraps around
      if (v_progress >= headPos - u_length + 1.0 || v_progress <= headPos) {
        inSnake = 1.0;
        if (v_progress <= headPos) {
          snakeProgress = 1.0 - (headPos - v_progress) / u_length;
        } else {
          snakeProgress = 1.0 - (headPos + 1.0 - v_progress) / u_length;
        }
      }
    } else {
      if (v_progress >= tailPos && v_progress <= headPos) {
        inSnake = 1.0;
        snakeProgress = (v_progress - tailPos) / u_length;
      }
    }
  } else {
    if (v_progress >= max(0.0, tailPos) && v_progress <= min(1.0, headPos)) {
      inSnake = 1.0;
      snakeProgress = (v_progress - max(0.0, tailPos)) / u_length;
    }
  }

  // Clamp snake progress
  snakeProgress = clamp(snakeProgress, 0.0, 1.0);

  // Interpolate color
  vec4 color = u_baseColor;
  if (inSnake > 0.5) {
    color = mix(u_tailColor, u_headColor, snakeProgress);
  }

  // Use data-driven color/intensity if available (overrides snake colors)
  vec4 finalColor = mix(color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  // Final alpha
  float alpha = lineAlpha * finalIntensity;

  gl_FragColor = vec4(finalColor.rgb, finalColor.a * alpha);
}
`;

/**
 * Snake shader definition
 */
export const snakeShader: ShaderDefinition<SnakeConfig> = {
  name: 'snake',
  displayName: 'Snake',
  description: 'Colored segment moving along the line - perfect for itineraries and progress',
  geometry: 'line',
  tags: ['snake', 'progress', 'itinerary', 'loading', 'movement'],

  fragmentShader: snakeFragmentShader,

  defaultConfig: snakeDefaultConfig,
  configSchema: snakeConfigSchema,

  getUniforms: (config: SnakeConfig, time: number, _deltaTime: number) => {
    const headRgba = typeof config.headColor === 'string'
      ? hexToRgba(config.headColor)
      : config.headColor;
    const tailRgba = typeof config.tailColor === 'string'
      ? hexToRgba(config.tailColor)
      : config.tailColor;
    const baseRgba = typeof config.baseColor === 'string'
      ? hexToRgba(config.baseColor)
      : config.baseColor;

    return {
      u_time: time * config.speed,
      u_headColor: headRgba,
      u_tailColor: tailRgba,
      u_baseColor: baseRgba,
      u_color_vec4: headRgba,
      u_length: config.length,
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

export default snakeShader;
