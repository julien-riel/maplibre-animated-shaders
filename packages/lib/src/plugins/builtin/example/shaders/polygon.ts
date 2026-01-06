/**
 * Polygon Shader - Wave Polygon
 *
 * Demonstrates all features for polygon geometry:
 * - Per-feature timing offset
 * - Data-driven color/intensity
 * - Simplex noise 2D
 * - Wave patterns
 * - Presets
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Polygon shader
 */
export interface PolygonConfig extends ShaderConfig {
  /** Wave color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Number of wave layers */
  waves: number;
  /** Wave scale (frequency) */
  scale: number;
  /** Wave amplitude (height) */
  amplitude: number;
  /** Use noise for organic look */
  useNoise: boolean;
  /** Pattern type */
  pattern: 'ripple' | 'horizontal' | 'diagonal';
}

/**
 * Default configuration
 */
export const polygonDefaultConfig: PolygonConfig = {
  color: '#8b5cf6',
  speed: 1.0,
  waves: 3,
  scale: 10.0,
  amplitude: 0.5,
  useNoise: true,
  pattern: 'ripple',
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const polygonConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#8b5cf6',
    label: 'Color',
    description: 'Color of the wave effect',
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
    description: 'Number of wave layers',
  },
  scale: {
    type: 'number',
    default: 10.0,
    min: 1.0,
    max: 50.0,
    step: 1.0,
    label: 'Scale',
    description: 'Wave frequency/scale',
  },
  amplitude: {
    type: 'number',
    default: 0.5,
    min: 0.1,
    max: 1.0,
    step: 0.1,
    label: 'Amplitude',
    description: 'Wave height/intensity',
  },
  useNoise: {
    type: 'boolean',
    default: true,
    label: 'Use Noise',
    description: 'Add noise for organic look',
  },
  pattern: {
    type: 'select',
    default: 'ripple',
    options: ['ripple', 'horizontal', 'diagonal'],
    label: 'Pattern',
    description: 'Wave pattern type',
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
 * Fragment shader GLSL code
 */
export const polygonFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_waves;
uniform float u_scale;
uniform float u_amplitude;
uniform float u_useNoise;
uniform float u_pattern;
uniform float u_intensity;

varying vec2 v_uv;
varying float v_timeOffset;
varying float v_effectiveTime;

// Data-driven properties from vertex shader
varying vec4 v_color;
varying float v_intensity;
varying float v_useDataDrivenColor;
varying float v_useDataDrivenIntensity;

// ============================================
// GLSL UTILITY: Simplex Noise 2D
// Classic simplex noise implementation
// ============================================

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,   // (3.0-sqrt(3.0))/6.0
    0.366025403784439,   // 0.5*(sqrt(3.0)-1.0)
    -0.577350269189626,  // -1.0 + 2.0 * C.x
    0.024390243902439    // 1.0 / 41.0
  );

  // First corner
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);

  // Other corners
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  // Permutations
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));

  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;

  // Gradients
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

  // Compute final noise value
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// ============================================
// GLSL UTILITY: Fractal Brownian Motion (FBM)
// Layered noise for more complex patterns
// ============================================

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 4; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = v_uv;
  vec2 center = vec2(0.5, 0.5);

  // ============================================
  // FEATURE: Per-feature timing offset
  // Each polygon animates at different phases
  // ============================================
  float localTime = v_effectiveTime;

  // ============================================
  // Calculate base pattern based on type
  // ============================================
  float patternValue = 0.0;

  // Pattern 0: Ripple (radial)
  if (u_pattern < 0.5) {
    float dist = length(uv - center) * 2.0;
    patternValue = dist * u_scale;
  }
  // Pattern 1: Horizontal
  else if (u_pattern < 1.5) {
    patternValue = uv.y * u_scale;
  }
  // Pattern 2: Diagonal
  else {
    patternValue = (uv.x + uv.y) * u_scale * 0.5;
  }

  // ============================================
  // Create wave layers
  // ============================================
  float waveSum = 0.0;

  for (float i = 0.0; i < 10.0; i++) {
    if (i >= u_waves) break;

    float wavePhase = localTime * 2.0 - i * 0.3;
    float waveFreq = 1.0 + i * 0.5;

    float wave = sin(patternValue * waveFreq - wavePhase);
    wave = wave * 0.5 + 0.5; // Normalize to 0-1

    // Weight by layer (first layers stronger)
    float layerWeight = 1.0 / (1.0 + i * 0.5);
    waveSum += wave * layerWeight;
  }

  // Normalize wave sum
  waveSum /= u_waves * 0.5;

  // ============================================
  // FEATURE: Simplex noise for organic look
  // ============================================
  float noiseValue = 0.0;
  if (u_useNoise > 0.5) {
    vec2 noiseCoord = uv * u_scale * 0.5 + vec2(localTime * 0.1);
    noiseValue = fbm(noiseCoord, 3) * 0.3;
    waveSum += noiseValue;
  }

  // Apply amplitude
  float alpha = waveSum * u_amplitude;

  // Add base fill
  float baseFill = 0.2;
  alpha = baseFill + alpha * (1.0 - baseFill);

  alpha = clamp(alpha, 0.0, 1.0) * u_intensity;

  // ============================================
  // FEATURE: Data-driven expressions
  // Color and intensity can come from feature properties
  // ============================================
  vec4 finalColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  // Add color variation based on wave intensity
  vec3 colorOut = finalColor.rgb;
  colorOut = mix(colorOut * 0.8, colorOut * 1.2, waveSum);

  gl_FragColor = vec4(colorOut, finalColor.a * alpha * finalIntensity / u_intensity);
}
`;

/**
 * Convert pattern name to numeric value for shader
 */
function patternToNumber(pattern: PolygonConfig['pattern']): number {
  switch (pattern) {
    case 'ripple':
      return 0.0;
    case 'horizontal':
      return 1.0;
    case 'diagonal':
      return 2.0;
    default:
      return 0.0;
  }
}

/**
 * Polygon shader definition
 */
export const polygonShader: ShaderDefinition<PolygonConfig> = {
  name: 'polygon',
  displayName: 'Wave Polygon',
  description:
    'Animated wave patterns on polygons - demonstrates per-feature timing, data-driven expressions, simplex noise, and FBM',
  geometry: 'polygon',
  tags: ['example', 'polygon', 'wave', 'water', 'selection', 'zone'],

  fragmentShader: polygonFragmentShader,

  defaultConfig: polygonDefaultConfig,
  configSchema: polygonConfigSchema,

  getUniforms: (config: PolygonConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string' ? hexToRgba(config.color) : config.color;

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_waves: config.waves,
      u_scale: config.scale,
      u_amplitude: config.amplitude,
      u_useNoise: config.useNoise ? 1.0 : 0.0,
      u_pattern: patternToNumber(config.pattern),
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default polygonShader;
