/**
 * Ripple Shader - Animated ripples emanating from polygon centroid
 *
 * Creates concentric ripple waves that spread outward from the center,
 * perfect for selection, impact, or zone effects.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Ripple shader
 */
export interface RippleConfig extends ShaderConfig {
  /** Ripple color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Number of ripple waves */
  waves: number;
  /** Decay rate of ripples */
  decay: number;
  /** Origin point: centroid, or relative coordinates [0-1, 0-1] */
  origin: 'centroid' | [number, number];
  /** Overall effect intensity */
  intensity: number;
}

/**
 * Default configuration for Ripple shader
 */
export const rippleDefaultConfig: RippleConfig = {
  color: '#6366f1',
  speed: 1.0,
  waves: 3,
  decay: 0.5,
  origin: 'centroid',
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const rippleConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#6366f1',
    label: 'Color',
    description: 'Color of the ripples',
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
  waves: {
    type: 'number',
    default: 3,
    min: 1,
    max: 10,
    step: 1,
    label: 'Waves',
    description: 'Number of ripple waves',
  },
  decay: {
    type: 'number',
    default: 0.5,
    min: 0.1,
    max: 1.0,
    step: 0.1,
    label: 'Decay',
    description: 'How quickly ripples fade',
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
 * Fragment shader GLSL code for Ripple effect
 */
export const rippleFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_waves;
uniform float u_decay;
uniform float u_intensity;

varying vec2 v_uv;
varying float v_timeOffset;

void main() {
  // Calculate distance from center (using UV coordinates, centered at 0.5, 0.5)
  vec2 center = vec2(0.5, 0.5);
  vec2 delta = v_uv - center;

  // Normalize to circular distance (aspect ratio correction)
  float dist = length(delta) * 2.0;

  // Apply per-feature time offset for animation desynchronization
  float localTime = u_time + v_timeOffset;

  // Create ripple pattern
  float phase = localTime * 2.0;
  float ripplePattern = 0.0;

  for (float i = 0.0; i < 10.0; i++) {
    if (i >= u_waves) break;

    float wavePhase = phase - i * 0.4;
    float waveRadius = fract(wavePhase) * 1.5;

    // Ring shape
    float ring = 1.0 - abs(dist - waveRadius) * 10.0;
    ring = clamp(ring, 0.0, 1.0);

    // Fade based on wave age and decay
    float waveFade = 1.0 - fract(wavePhase);
    waveFade = pow(waveFade, u_decay * 2.0);

    ripplePattern += ring * waveFade;
  }

  // Add subtle fill
  float fill = 0.1 * (1.0 - dist * 0.5);
  fill = max(fill, 0.0);

  float alpha = (ripplePattern + fill) * u_intensity;
  alpha = clamp(alpha, 0.0, 1.0);

  gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
}
`;

/**
 * Ripple shader definition
 */
export const rippleShader: ShaderDefinition<RippleConfig> = {
  name: 'ripple',
  displayName: 'Ripple',
  description: 'Concentric ripples spreading from polygon center - perfect for selection and impact effects',
  geometry: 'polygon',
  tags: ['selection', 'impact', 'waves', 'animation', 'highlight'],

  fragmentShader: rippleFragmentShader,

  defaultConfig: rippleDefaultConfig,
  configSchema: rippleConfigSchema,

  getUniforms: (config: RippleConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : config.color;

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_waves: config.waves,
      u_decay: config.decay,
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default rippleShader;
