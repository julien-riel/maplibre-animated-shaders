/**
 * Fill Wave Shader - Animated liquid fill effect for polygons
 *
 * Creates a wave-like filling animation that simulates liquid rising or falling,
 * perfect for flood visualization, progress indicators, or level displays.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Fill Wave shader
 */
export interface FillWaveConfig extends ShaderConfig {
  /** Fill color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Fill level from 0 to 1 */
  level: number;
  /** Height of waves in pixels */
  waveHeight: number;
  /** Frequency of waves */
  waveFrequency: number;
  /** Direction of fill: up or down */
  direction: 'up' | 'down';
  /** Overall effect intensity */
  intensity: number;
}

/**
 * Default configuration for Fill Wave shader
 */
export const fillWaveDefaultConfig: FillWaveConfig = {
  color: '#0ea5e9',
  speed: 0.3,
  level: 0.5,
  waveHeight: 5,
  waveFrequency: 0.05,
  direction: 'up',
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const fillWaveConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#0ea5e9',
    label: 'Color',
    description: 'Color of the liquid fill',
  },
  speed: {
    type: 'number',
    default: 0.3,
    min: 0.0,
    max: 2.0,
    step: 0.1,
    label: 'Speed',
    description: 'Wave animation speed',
  },
  level: {
    type: 'number',
    default: 0.5,
    min: 0.0,
    max: 1.0,
    step: 0.05,
    label: 'Level',
    description: 'Fill level (0 to 1)',
  },
  waveHeight: {
    type: 'number',
    default: 5,
    min: 0,
    max: 20,
    step: 1,
    label: 'Wave Height',
    description: 'Height of the waves',
  },
  waveFrequency: {
    type: 'number',
    default: 0.05,
    min: 0.01,
    max: 0.2,
    step: 0.01,
    label: 'Wave Frequency',
    description: 'Frequency of waves',
  },
  direction: {
    type: 'select',
    default: 'up',
    options: ['up', 'down'],
    label: 'Direction',
    description: 'Fill direction',
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
 * Fragment shader GLSL code for Fill Wave effect
 */
export const fillWaveFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_level;
uniform float u_waveHeight;
uniform float u_waveFrequency;
uniform float u_direction;
uniform float u_intensity;

varying vec2 v_uv;
varying vec2 v_screen_pos;
varying float v_timeOffset;
varying float v_effectiveTime;

// Data-driven properties from vertex shader
varying vec4 v_color;
varying float v_intensity;
varying float v_useDataDrivenColor;
varying float v_useDataDrivenIntensity;

void main() {
  // Flip Y for direction (up = 1, down = 0)
  float y = u_direction > 0.5 ? v_uv.y : 1.0 - v_uv.y;

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Create wave pattern
  float wave1 = sin(v_screen_pos.x * u_waveFrequency + localTime * 3.0) * u_waveHeight * 0.01;
  float wave2 = sin(v_screen_pos.x * u_waveFrequency * 1.5 + localTime * 2.5 + 1.0) * u_waveHeight * 0.006;
  float wave3 = sin(v_screen_pos.x * u_waveFrequency * 0.7 + localTime * 2.0 + 2.0) * u_waveHeight * 0.004;

  float totalWave = wave1 + wave2 + wave3;

  // Calculate fill line with wave
  float fillLine = u_level + totalWave;

  // Smooth fill edge
  float fill = smoothstep(fillLine - 0.02, fillLine + 0.02, y);
  fill = 1.0 - fill;

  // Add subtle gradient to the fill
  float gradient = 1.0 - (y / max(u_level, 0.01)) * 0.3;
  gradient = clamp(gradient, 0.5, 1.0);

  // Add highlight at the wave surface
  float surfaceDist = abs(y - fillLine);
  float surfaceHighlight = exp(-surfaceDist * 30.0) * 0.5;

  // Use data-driven color/intensity if available, otherwise use uniform
  vec4 effectColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  float alpha = fill * gradient * finalIntensity + surfaceHighlight * fill;
  alpha = clamp(alpha, 0.0, 1.0);

  // Slight color variation for depth
  vec3 fillColor = effectColor.rgb * (0.8 + 0.2 * gradient);

  gl_FragColor = vec4(fillColor, effectColor.a * alpha);
}
`;

/**
 * Fill Wave shader definition
 */
export const fillWaveShader: ShaderDefinition<FillWaveConfig> = {
  name: 'fill-wave',
  displayName: 'Fill Wave',
  description: 'Animated liquid fill with wave effect - perfect for floods, progress, and levels',
  geometry: 'polygon',
  tags: ['liquid', 'flood', 'progress', 'water', 'animation', 'fill'],

  fragmentShader: fillWaveFragmentShader,

  defaultConfig: fillWaveDefaultConfig,
  configSchema: fillWaveConfigSchema,

  getUniforms: (config: FillWaveConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string' ? hexToRgba(config.color) : config.color;

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_level: config.level,
      u_waveHeight: config.waveHeight,
      u_waveFrequency: config.waveFrequency,
      u_direction: config.direction === 'up' ? 1.0 : 0.0,
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default fillWaveShader;
