/**
 * Breathing Shader - Pulsing line width effect
 *
 * Creates a rhythmic pulsation of line thickness,
 * perfect for congestion, network load, and importance visualization.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Breathing shader
 */
export interface BreathingConfig extends ShaderConfig {
  /** Line color */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Minimum line width in pixels */
  minWidth: number;
  /** Maximum line width in pixels */
  maxWidth: number;
  /** Easing function type */
  easing: 'linear' | 'sine' | 'quad';
  /** Line width for calculation (base) */
  width: number;
}

/**
 * Default configuration for Breathing shader
 */
export const breathingDefaultConfig: BreathingConfig = {
  color: '#f43f5e',
  speed: 0.5,
  minWidth: 2,
  maxWidth: 8,
  easing: 'sine',
  width: 8,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const breathingConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#f43f5e',
    label: 'Color',
    description: 'Line color',
  },
  speed: {
    type: 'number',
    default: 0.5,
    min: 0.1,
    max: 3.0,
    step: 0.1,
    label: 'Speed',
    description: 'Breathing speed',
  },
  minWidth: {
    type: 'number',
    default: 2,
    min: 1,
    max: 10,
    step: 1,
    label: 'Min Width',
    description: 'Minimum line width in pixels',
  },
  maxWidth: {
    type: 'number',
    default: 8,
    min: 2,
    max: 30,
    step: 1,
    label: 'Max Width',
    description: 'Maximum line width in pixels',
  },
  easing: {
    type: 'select',
    default: 'sine',
    options: ['linear', 'sine', 'quad'],
    label: 'Easing',
    description: 'Easing function for the pulse',
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
 * Fragment shader GLSL code for Breathing effect
 */
export const breathingFragmentShader = `
precision highp float;

#define PI 3.14159265359

uniform float u_time;
uniform vec4 u_color;
uniform float u_minWidth;
uniform float u_maxWidth;
uniform float u_easing;
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

// Easing functions
float easeLinear(float t) {
  return t;
}

float easeSine(float t) {
  return sin(t * PI) * 0.5 + 0.5;
}

float easeQuad(float t) {
  float t2 = t * 2.0;
  if (t2 < 1.0) {
    return 0.5 * t2 * t2;
  }
  t2 -= 1.0;
  return -0.5 * (t2 * (t2 - 2.0) - 1.0);
}

void main() {
  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Calculate breath phase (0 to 1 cycle)
  float phase = fract(localTime);

  // Apply easing
  float easedPhase = 0.0;
  if (u_easing < 0.5) {
    easedPhase = easeLinear(phase);
  } else if (u_easing < 1.5) {
    easedPhase = easeSine(phase);
  } else {
    easedPhase = easeQuad(phase);
  }

  // Calculate current width
  float currentWidth = mix(u_minWidth, u_maxWidth, easedPhase);

  // Normalized width ratio
  float widthRatio = currentWidth / u_width;

  // Calculate perpendicular distance from line center
  float dist = abs(v_pos.y);

  // Adjusted distance based on current width
  float adjustedDist = dist / widthRatio;

  // Anti-aliased line edge
  float aa = 1.5 / currentWidth;
  float lineAlpha = 1.0 - smoothstep(1.0 - aa, 1.0, adjustedDist);

  // Use data-driven color/intensity if available, otherwise use uniform
  vec4 finalColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  // Final alpha
  float alpha = lineAlpha * finalIntensity;

  gl_FragColor = vec4(finalColor.rgb, finalColor.a * alpha);
}
`;

/**
 * Breathing shader definition
 */
export const breathingShader: ShaderDefinition<BreathingConfig> = {
  name: 'breathing',
  displayName: 'Breathing',
  description: 'Pulsing line width effect - perfect for congestion and network load',
  geometry: 'line',
  tags: ['pulse', 'breathing', 'congestion', 'load', 'rhythm'],

  fragmentShader: breathingFragmentShader,

  defaultConfig: breathingDefaultConfig,
  configSchema: breathingConfigSchema,

  getUniforms: (config: BreathingConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : config.color;

    const easingValue = config.easing === 'linear' ? 0.0 :
                        config.easing === 'sine' ? 1.0 : 2.0;

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_minWidth: config.minWidth,
      u_maxWidth: config.maxWidth,
      u_easing: easingValue,
      u_intensity: config.intensity ?? 1.0,
      u_width: config.maxWidth, // Use maxWidth as base
    };
  },

  requiredLayout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

export default breathingShader;
