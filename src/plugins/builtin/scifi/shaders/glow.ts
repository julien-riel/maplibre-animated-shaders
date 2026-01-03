/**
 * Glow Shader - Luminous halo with variable intensity
 *
 * Creates a soft glowing effect around the point with
 * pulsating intensity for a dreamy, atmospheric look.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Glow shader
 */
export interface GlowConfig extends ShaderConfig {
  /** Glow color (hex or rgba) */
  color: string;
  /** Pulsation speed */
  speed: number;
  /** Base light intensity */
  intensity: number;
  /** Halo radius in pixels */
  radius: number;
  /** Gradient softness (0-1) */
  softness: number;
  /** Minimum pulse intensity */
  pulseMin: number;
  /** Maximum pulse intensity */
  pulseMax: number;
  /** Core size ratio (0-1) */
  coreSize: number;
}

/**
 * Default configuration for Glow shader
 */
export const glowDefaultConfig: GlowConfig = {
  color: '#8b5cf6',
  speed: 0.5,
  intensity: 1.0,
  radius: 30,
  softness: 0.5,
  pulseMin: 0.6,
  pulseMax: 1.0,
  coreSize: 0.3,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const glowConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#8b5cf6',
    label: 'Color',
    description: 'Color of the glow',
  },
  speed: {
    type: 'number',
    default: 0.5,
    min: 0.1,
    max: 3.0,
    step: 0.1,
    label: 'Speed',
    description: 'Pulsation speed',
  },
  radius: {
    type: 'number',
    default: 30,
    min: 10,
    max: 100,
    step: 5,
    label: 'Radius',
    description: 'Halo radius in pixels',
  },
  softness: {
    type: 'number',
    default: 0.5,
    min: 0.1,
    max: 1.0,
    step: 0.05,
    label: 'Softness',
    description: 'Gradient softness',
  },
  pulseMin: {
    type: 'number',
    default: 0.6,
    min: 0,
    max: 1,
    step: 0.05,
    label: 'Pulse Min',
    description: 'Minimum pulse intensity',
  },
  pulseMax: {
    type: 'number',
    default: 1.0,
    min: 0.5,
    max: 1.5,
    step: 0.05,
    label: 'Pulse Max',
    description: 'Maximum pulse intensity',
  },
  coreSize: {
    type: 'number',
    default: 0.3,
    min: 0.1,
    max: 0.8,
    step: 0.05,
    label: 'Core Size',
    description: 'Solid core size ratio',
  },
  intensity: {
    type: 'number',
    default: 1.0,
    min: 0,
    max: 1.5,
    step: 0.1,
    label: 'Intensity',
    description: 'Overall effect intensity',
  },
};

/**
 * Fragment shader GLSL code for Glow effect
 */
export const glowFragmentShader = `
precision highp float;

#define PI 3.14159265359

uniform float u_time;
uniform vec4 u_color;
uniform float u_radius;
uniform float u_softness;
uniform float u_pulseMin;
uniform float u_pulseMax;
uniform float u_coreSize;
uniform float u_intensity;

varying vec2 v_pos;
varying float v_timeOffset;
varying float v_effectiveTime;

// Data-driven properties from vertex shader
varying vec4 v_color;
varying float v_intensity;
varying float v_useDataDrivenColor;
varying float v_useDataDrivenIntensity;

void main() {
  vec2 pos = v_pos * u_radius;
  float dist = length(pos);

  // Normalized distance (0 at center, 1 at edge)
  float normalizedDist = dist / u_radius;

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Calculate pulsating intensity
  float pulse = sin(localTime * PI * 2.0) * 0.5 + 0.5;
  float pulseIntensity = mix(u_pulseMin, u_pulseMax, pulse);

  // Multi-layer glow for more realistic effect
  float coreRadius = u_coreSize;
  float glowStart = coreRadius;
  float glowEnd = 1.0;

  float alpha = 0.0;

  // Solid core
  if (normalizedDist < coreRadius) {
    alpha = 1.0;
  }
  // Glow region
  else if (normalizedDist < glowEnd) {
    // Calculate glow falloff
    float glowDist = (normalizedDist - glowStart) / (glowEnd - glowStart);

    // Soft exponential falloff
    float falloff = 1.0 - pow(glowDist, 1.0 / (u_softness + 0.1));
    falloff = max(0.0, falloff);

    // Add multiple glow layers for richness
    float layer1 = exp(-glowDist * 2.0 / u_softness);
    float layer2 = exp(-glowDist * 4.0 / u_softness) * 0.5;
    float layer3 = exp(-glowDist * 8.0 / u_softness) * 0.25;

    alpha = (layer1 + layer2 + layer3) * 0.5;
  }

  // Apply pulse intensity
  alpha *= pulseIntensity;

  // Use data-driven color/intensity if available, otherwise use uniform
  vec4 finalColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  // Color intensity boost based on proximity to center
  vec3 color = finalColor.rgb;
  float colorBoost = 1.0 + (1.0 - normalizedDist) * 0.3;
  color = min(color * colorBoost, vec3(1.0));

  gl_FragColor = vec4(color, finalColor.a * alpha * finalIntensity);
}
`;

/**
 * Glow shader definition
 */
export const glowShader: ShaderDefinition<GlowConfig> = {
  name: 'glow',
  displayName: 'Glow',
  description: 'Luminous halo with variable intensity - perfect for hotspots, POIs, and selection',
  geometry: 'point',
  tags: ['light', 'halo', 'hotspot', 'poi', 'selection', 'ambient'],

  fragmentShader: glowFragmentShader,

  defaultConfig: glowDefaultConfig,
  configSchema: glowConfigSchema,

  getUniforms: (config: GlowConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string' ? hexToRgba(config.color) : config.color;

    // Calculate current pulse intensity
    const pulse = Math.sin(time * config.speed * Math.PI * 2) * 0.5 + 0.5;
    const pulseIntensity = config.pulseMin + (config.pulseMax - config.pulseMin) * pulse;

    const opacity = pulseIntensity * (config.intensity ?? 1);
    const colorRgba = `rgba(${Math.round(rgba[0] * 255)}, ${Math.round(rgba[1] * 255)}, ${Math.round(rgba[2] * 255)}, ${opacity})`;

    return {
      // MapLibre paint property uniforms
      u_radius: config.radius,
      u_color: colorRgba,
      u_opacity: opacity,

      // Full GLSL uniforms
      u_time: time * config.speed,
      u_softness: config.softness,
      u_pulseMin: config.pulseMin,
      u_pulseMax: config.pulseMax,
      u_coreSize: config.coreSize,
      u_intensity: config.intensity ?? 1.0,
      u_color_vec4: rgba,
    };
  },

  requiredPaint: {
    'circle-pitch-alignment': 'map',
    'circle-opacity': 1,
    'circle-blur': 0.5,
  },
};

export default glowShader;
