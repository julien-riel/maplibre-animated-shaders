/**
 * Electric Shader - Plasma/electric distortion effect
 *
 * Creates a sinusoidal distortion with electric/plasma effect,
 * perfect for power lines, sci-fi effects, and energy visualization.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Electric shader
 */
export interface ElectricConfig extends ShaderConfig {
  /** Main color */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Amplitude of distortion in pixels */
  amplitude: number;
  /** Frequency of the wave */
  frequency: number;
  /** Noise scale for variation */
  noiseScale: number;
  /** Enable glow effect */
  glow: boolean;
  /** Line width in pixels */
  width: number;
}

/**
 * Default configuration for Electric shader
 */
export const electricDefaultConfig: ElectricConfig = {
  color: '#facc15',
  speed: 2.0,
  amplitude: 5,
  frequency: 0.1,
  noiseScale: 0.05,
  glow: true,
  width: 3,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const electricConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#facc15',
    label: 'Color',
    description: 'Electric effect color',
  },
  speed: {
    type: 'number',
    default: 2.0,
    min: 0.5,
    max: 10.0,
    step: 0.5,
    label: 'Speed',
    description: 'Animation speed multiplier',
  },
  amplitude: {
    type: 'number',
    default: 5,
    min: 1,
    max: 20,
    step: 1,
    label: 'Amplitude',
    description: 'Distortion amplitude in pixels',
  },
  frequency: {
    type: 'number',
    default: 0.1,
    min: 0.01,
    max: 0.5,
    step: 0.01,
    label: 'Frequency',
    description: 'Wave frequency',
  },
  noiseScale: {
    type: 'number',
    default: 0.05,
    min: 0.01,
    max: 0.2,
    step: 0.01,
    label: 'Noise Scale',
    description: 'Random variation scale',
  },
  glow: {
    type: 'boolean',
    default: true,
    label: 'Glow',
    description: 'Enable glow effect',
  },
  width: {
    type: 'number',
    default: 3,
    min: 1,
    max: 15,
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
 * Fragment shader GLSL code for Electric effect
 */
export const electricFragmentShader = `
precision highp float;

#define PI 3.14159265359

uniform float u_time;
uniform vec4 u_color;
uniform float u_amplitude;
uniform float u_frequency;
uniform float u_noiseScale;
uniform float u_glow;
uniform float u_intensity;
uniform float u_width;

varying vec2 v_pos;
varying float v_progress;
varying float v_line_index;
varying float v_width;
varying float v_timeOffset;

// Simple pseudo-random function
float random(float x) {
  return fract(sin(x * 12.9898) * 43758.5453);
}

// Simple noise function
float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(random(i), random(i + 1.0), smoothstep(0.0, 1.0, f));
}

void main() {
  // Calculate base position along line
  float pos = v_progress * 1000.0;

  // Apply per-feature time offset for animation desynchronization
  float localTime = u_time + v_timeOffset;

  // Create electric distortion
  float wave1 = sin(pos * u_frequency + localTime * 5.0) * u_amplitude;
  float wave2 = sin(pos * u_frequency * 2.3 + localTime * 7.0) * u_amplitude * 0.5;
  float wave3 = sin(pos * u_frequency * 3.7 + localTime * 11.0) * u_amplitude * 0.25;

  // Add noise for randomness
  float noiseOffset = noise(pos * u_noiseScale + localTime * 3.0) * u_amplitude * 0.5;

  float totalOffset = wave1 + wave2 + wave3 + noiseOffset;

  // Distance from distorted line center
  float distortedY = v_pos.y * u_width - totalOffset / u_width;
  float dist = abs(distortedY);

  // Core line
  float aa = 1.5;
  float coreAlpha = 1.0 - smoothstep(0.0, aa, dist - 0.5);

  // Glow effect
  float glowAlpha = 0.0;
  if (u_glow > 0.5) {
    glowAlpha = (1.0 - smoothstep(0.0, 3.0, dist)) * 0.5;
  }

  // Combine core and glow
  float alpha = max(coreAlpha, glowAlpha) * u_intensity;

  // Add some brightness variation
  float brightness = 0.8 + noise(pos * 0.1 + localTime * 10.0) * 0.4;
  vec3 finalColor = u_color.rgb * brightness;

  gl_FragColor = vec4(finalColor, u_color.a * alpha);
}
`;

/**
 * Electric shader definition
 */
export const electricShader: ShaderDefinition<ElectricConfig> = {
  name: 'electric',
  displayName: 'Electric',
  description: 'Plasma/electric distortion effect - perfect for power lines and sci-fi effects',
  geometry: 'line',
  tags: ['electric', 'plasma', 'energy', 'scifi', 'power'],

  fragmentShader: electricFragmentShader,

  defaultConfig: electricDefaultConfig,
  configSchema: electricConfigSchema,

  getUniforms: (config: ElectricConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : config.color;

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_amplitude: config.amplitude,
      u_frequency: config.frequency,
      u_noiseScale: config.noiseScale,
      u_glow: config.glow ? 1.0 : 0.0,
      u_intensity: config.intensity ?? 1.0,
      u_width: config.width,
    };
  },

  requiredLayout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

export default electricShader;
