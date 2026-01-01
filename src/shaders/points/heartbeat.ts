/**
 * Heartbeat Shader - Rhythmic size pulsation with ease-in-out
 *
 * Creates a heartbeat-like effect with the point scaling up and down
 * rhythmically, mimicking a heartbeat pattern.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Easing function name mapping to GLSL integer
 */
const EASING_MAP: Record<string, number> = {
  'linear': 0,
  'easeInQuad': 1,
  'easeOutQuad': 2,
  'easeInOutQuad': 3,
  'easeInCubic': 4,
  'easeOutCubic': 5,
  'easeInOutCubic': 6,
  'easeInSine': 7,
  'easeOutSine': 8,
  'easeInOutSine': 9,
  'easeInElastic': 10,
  'easeOutElastic': 11,
  'easeInOutElastic': 12,
  'easeInBounce': 13,
  'easeOutBounce': 14,
  'easeInOutBounce': 15,
};

/**
 * Configuration for the Heartbeat shader
 */
export interface HeartbeatConfig extends ShaderConfig {
  /** Point color (hex or rgba) */
  color: string;
  /** Animation speed (BPM relative) */
  speed: number;
  /** Minimum scale factor */
  minScale: number;
  /** Maximum scale factor */
  maxScale: number;
  /** Easing function name */
  easing: string;
  /** Rest duration between beats (0-1) */
  restDuration: number;
  /** Base size in pixels */
  baseSize: number;
}

/**
 * Default configuration for Heartbeat shader
 */
export const heartbeatDefaultConfig: HeartbeatConfig = {
  color: '#ef4444',
  speed: 1.0,
  minScale: 0.8,
  maxScale: 1.3,
  easing: 'easeInOutQuad',
  restDuration: 0.3,
  baseSize: 20,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const heartbeatConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#ef4444',
    label: 'Color',
    description: 'Color of the point',
  },
  speed: {
    type: 'number',
    default: 1.0,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    label: 'Speed',
    description: 'BPM relative speed',
  },
  minScale: {
    type: 'number',
    default: 0.8,
    min: 0.1,
    max: 1.0,
    step: 0.05,
    label: 'Min Scale',
    description: 'Minimum scale factor',
  },
  maxScale: {
    type: 'number',
    default: 1.3,
    min: 1.0,
    max: 2.0,
    step: 0.05,
    label: 'Max Scale',
    description: 'Maximum scale factor',
  },
  easing: {
    type: 'select',
    default: 'easeInOutQuad',
    options: ['linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic', 'easeInSine', 'easeOutSine', 'easeInOutSine', 'easeInElastic', 'easeOutElastic', 'easeInOutBounce'],
    label: 'Easing',
    description: 'Easing function for the animation',
  },
  restDuration: {
    type: 'number',
    default: 0.3,
    min: 0,
    max: 0.8,
    step: 0.05,
    label: 'Rest Duration',
    description: 'Pause between beats (0-1)',
  },
  baseSize: {
    type: 'number',
    default: 20,
    min: 5,
    max: 100,
    step: 1,
    label: 'Base Size',
    description: 'Base size in pixels',
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
 * Fragment shader GLSL code for Heartbeat effect
 */
export const heartbeatFragmentShader = `
precision highp float;

#define PI 3.14159265359

uniform float u_time;
uniform vec4 u_color;
uniform float u_minScale;
uniform float u_maxScale;
uniform float u_easing;
uniform float u_restDuration;
uniform float u_baseSize;
uniform float u_intensity;

varying vec2 v_pos;
varying float v_timeOffset;

// Easing functions
float easeInQuad(float t) { return t * t; }
float easeOutQuad(float t) { return t * (2.0 - t); }
float easeInOutQuad(float t) { return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t; }
float easeInCubic(float t) { return t * t * t; }
float easeOutCubic(float t) { float t1 = t - 1.0; return t1 * t1 * t1 + 1.0; }
float easeInOutCubic(float t) { return t < 0.5 ? 4.0 * t * t * t : (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0; }
float easeInSine(float t) { return 1.0 - cos(t * PI / 2.0); }
float easeOutSine(float t) { return sin(t * PI / 2.0); }
float easeInOutSine(float t) { return -0.5 * (cos(PI * t) - 1.0); }
float easeInElastic(float t) {
  if (t == 0.0 || t == 1.0) return t;
  return -pow(2.0, 10.0 * t - 10.0) * sin((t * 10.0 - 10.75) * (2.0 * PI / 3.0));
}
float easeOutElastic(float t) {
  if (t == 0.0 || t == 1.0) return t;
  return pow(2.0, -10.0 * t) * sin((t * 10.0 - 0.75) * (2.0 * PI / 3.0)) + 1.0;
}
float easeOutBounce(float t) {
  const float n1 = 7.5625;
  const float d1 = 2.75;
  if (t < 1.0 / d1) return n1 * t * t;
  else if (t < 2.0 / d1) { float t1 = t - 1.5 / d1; return n1 * t1 * t1 + 0.75; }
  else if (t < 2.5 / d1) { float t1 = t - 2.25 / d1; return n1 * t1 * t1 + 0.9375; }
  else { float t1 = t - 2.625 / d1; return n1 * t1 * t1 + 0.984375; }
}
float easeInBounce(float t) { return 1.0 - easeOutBounce(1.0 - t); }
float easeInOutBounce(float t) {
  return t < 0.5 ? 0.5 * (1.0 - easeOutBounce(1.0 - 2.0 * t)) : 0.5 * (1.0 + easeOutBounce(2.0 * t - 1.0));
}

float applyEasing(float t, float easingType) {
  if (easingType < 0.5) return t;
  if (easingType < 1.5) return easeInQuad(t);
  if (easingType < 2.5) return easeOutQuad(t);
  if (easingType < 3.5) return easeInOutQuad(t);
  if (easingType < 4.5) return easeInCubic(t);
  if (easingType < 5.5) return easeOutCubic(t);
  if (easingType < 6.5) return easeInOutCubic(t);
  if (easingType < 7.5) return easeInSine(t);
  if (easingType < 8.5) return easeOutSine(t);
  if (easingType < 9.5) return easeInOutSine(t);
  if (easingType < 10.5) return easeInElastic(t);
  if (easingType < 11.5) return easeOutElastic(t);
  if (easingType < 15.5) return easeInOutBounce(t);
  return t;
}

void main() {
  // Apply per-feature time offset for animation desynchronization
  float localTime = u_time + v_timeOffset;

  // Create heartbeat pattern: quick beat, rest, quick beat
  float cycle = fract(localTime);

  // Active beat duration (excluding rest)
  float activeDuration = 1.0 - u_restDuration;

  // Calculate scale based on heartbeat pattern
  float scale;
  if (cycle < activeDuration * 0.5) {
    // First beat up
    float t = cycle / (activeDuration * 0.5);
    float eased = applyEasing(t, u_easing);
    scale = mix(u_minScale, u_maxScale, eased);
  } else if (cycle < activeDuration) {
    // First beat down
    float t = (cycle - activeDuration * 0.5) / (activeDuration * 0.5);
    float eased = applyEasing(t, u_easing);
    scale = mix(u_maxScale, u_minScale, eased);
  } else {
    // Rest period
    scale = u_minScale;
  }

  // Draw circle with animated scale
  float radius = u_baseSize * 0.5 * scale;
  vec2 pos = v_pos * u_baseSize;
  float dist = length(pos);

  // Anti-aliased circle
  float aa = 1.5;
  float alpha = 1.0 - smoothstep(radius - aa, radius + aa, dist);

  gl_FragColor = vec4(u_color.rgb, u_color.a * alpha * u_intensity);
}
`;

/**
 * Heartbeat shader definition
 */
export const heartbeatShader: ShaderDefinition<HeartbeatConfig> = {
  name: 'heartbeat',
  displayName: 'Heartbeat',
  description: 'Rhythmic size pulsation with ease-in-out - perfect for real-time data, sensors, and live status',
  geometry: 'point',
  tags: ['pulse', 'realtime', 'sensor', 'live', 'status', 'beat'],

  fragmentShader: heartbeatFragmentShader,

  defaultConfig: heartbeatDefaultConfig,
  configSchema: heartbeatConfigSchema,

  getUniforms: (config: HeartbeatConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : config.color;

    // Calculate animated scale for paint property mode
    const cycle = (time * config.speed) % 1;
    const activeDuration = 1.0 - config.restDuration;

    let scale: number;
    if (cycle < activeDuration * 0.5) {
      const t = cycle / (activeDuration * 0.5);
      scale = config.minScale + (config.maxScale - config.minScale) * t * t;
    } else if (cycle < activeDuration) {
      const t = (cycle - activeDuration * 0.5) / (activeDuration * 0.5);
      scale = config.maxScale - (config.maxScale - config.minScale) * t * t;
    } else {
      scale = config.minScale;
    }

    const currentSize = config.baseSize * scale;
    const colorRgba = `rgba(${Math.round(rgba[0] * 255)}, ${Math.round(rgba[1] * 255)}, ${Math.round(rgba[2] * 255)}, ${config.intensity ?? 1})`;

    return {
      // MapLibre paint property uniforms
      u_radius: currentSize / 2,
      u_color: colorRgba,
      u_opacity: config.intensity ?? 1,

      // Full GLSL uniforms
      u_time: time * config.speed,
      u_minScale: config.minScale,
      u_maxScale: config.maxScale,
      u_easing: EASING_MAP[config.easing] ?? 3,
      u_restDuration: config.restDuration,
      u_baseSize: config.baseSize,
      u_intensity: config.intensity ?? 1.0,
      u_color_vec4: rgba,
    };
  },

  requiredPaint: {
    'circle-pitch-alignment': 'map',
    'circle-opacity': 1,
  },
};

export default heartbeatShader;
