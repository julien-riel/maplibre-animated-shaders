/**
 * Noise Shader - Animated noise texture for polygons
 *
 * Creates animated noise patterns using simplex or perlin algorithms,
 * perfect for uncertainty visualization, fuzzy zones, or terrain effects.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Noise shader
 */
export interface NoiseConfig extends ShaderConfig {
  /** Base color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Scale of the noise pattern */
  scale: number;
  /** Number of octaves for detail */
  octaves: number;
  /** Noise intensity */
  intensity: number;
  /** Noise type: simplex, perlin, or static */
  noiseType: 'simplex' | 'perlin' | 'static';
}

/**
 * Default configuration for Noise shader
 */
export const noiseDefaultConfig: NoiseConfig = {
  color: '#a3a3a3',
  speed: 1.0,
  scale: 0.01,
  octaves: 3,
  intensity: 0.5,
  noiseType: 'simplex',
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const noiseConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#a3a3a3',
    label: 'Color',
    description: 'Base color for the noise',
  },
  speed: {
    type: 'number',
    default: 1.0,
    min: 0.0,
    max: 5.0,
    step: 0.1,
    label: 'Speed',
    description: 'Animation speed',
  },
  scale: {
    type: 'number',
    default: 0.01,
    min: 0.001,
    max: 0.1,
    step: 0.001,
    label: 'Scale',
    description: 'Scale of the noise pattern',
  },
  octaves: {
    type: 'number',
    default: 3,
    min: 1,
    max: 6,
    step: 1,
    label: 'Octaves',
    description: 'Detail levels (higher = more detail)',
  },
  intensity: {
    type: 'number',
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.1,
    label: 'Intensity',
    description: 'Noise intensity',
  },
  noiseType: {
    type: 'select',
    default: 'simplex',
    options: ['simplex', 'perlin', 'static'],
    label: 'Noise Type',
    description: 'Type of noise algorithm',
  },
};

/**
 * Fragment shader GLSL code for Noise effect
 */
export const noiseFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_scale;
uniform float u_octaves;
uniform float u_intensity;
uniform float u_noiseType;

varying vec2 v_screen_pos;
varying vec2 v_uv;
varying float v_timeOffset;
varying float v_effectiveTime;

// Data-driven properties from vertex shader
varying vec4 v_color;
varying float v_intensity;
varying float v_useDataDrivenColor;
varying float v_useDataDrivenIntensity;

// Simplex noise helper functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Perlin-like value noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// FBM (Fractal Brownian Motion)
float fbm(vec2 p, float octaves, float noiseType) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (float i = 0.0; i < 6.0; i++) {
    if (i >= octaves) break;

    float n;
    if (noiseType < 0.5) {
      // Static hash noise
      n = hash(floor(p * frequency));
    } else if (noiseType < 1.5) {
      // Simplex noise
      n = snoise(p * frequency) * 0.5 + 0.5;
    } else {
      // Value/Perlin-like noise
      n = valueNoise(p * frequency);
    }

    value += amplitude * n;
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  // Calculate noise coordinates
  vec2 noiseCoord = v_screen_pos * u_scale;

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Add time for animation (except for static noise)
  if (u_noiseType > 0.5) {
    noiseCoord += localTime * 0.1;
  } else {
    // Static noise uses time-based seed that changes slowly
    noiseCoord += floor(localTime * 10.0) * 0.001;
  }

  // Generate noise
  float noise = fbm(noiseCoord, u_octaves, u_noiseType);

  // Use data-driven color/intensity if available, otherwise use uniform
  vec4 effectColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  // Apply intensity
  float alpha = mix(0.3, 1.0, noise) * finalIntensity;

  // Add slight color variation based on noise
  vec3 variedColor = effectColor.rgb * (0.8 + 0.4 * noise);

  gl_FragColor = vec4(variedColor, effectColor.a * alpha);
}
`;

/**
 * Noise shader definition
 */
export const noiseShader: ShaderDefinition<NoiseConfig> = {
  name: 'noise',
  displayName: 'Noise',
  description: 'Animated noise texture for uncertainty, fuzzy zones, and terrain effects',
  geometry: 'polygon',
  tags: ['noise', 'uncertainty', 'terrain', 'texture', 'fuzzy'],

  fragmentShader: noiseFragmentShader,

  defaultConfig: noiseDefaultConfig,
  configSchema: noiseConfigSchema,

  getUniforms: (config: NoiseConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string' ? hexToRgba(config.color) : config.color;

    const noiseTypeMap: Record<string, number> = {
      static: 0.0,
      simplex: 1.0,
      perlin: 2.0,
    };

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_scale: config.scale,
      u_octaves: config.octaves,
      u_intensity: config.intensity ?? 1.0,
      u_noiseType: noiseTypeMap[config.noiseType] ?? 1.0,
    };
  },
};

export default noiseShader;
