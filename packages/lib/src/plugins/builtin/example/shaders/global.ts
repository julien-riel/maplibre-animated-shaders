/**
 * Global Shader - Grid Overlay
 *
 * Demonstrates all features for global (full-screen) geometry:
 * - Data-driven parameters
 * - Grid generation with SDF
 * - Pulse/scan effects
 * - Hash functions for randomness
 * - Presets
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Global shader
 */
export interface GlobalConfig extends ShaderConfig {
  /** Grid color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Grid cell size in pixels */
  gridSize: number;
  /** Line width */
  lineWidth: number;
  /** Enable pulse wave animation */
  pulseWave: boolean;
  /** Enable scan line effect */
  scanLine: boolean;
  /** Glow intensity (0-1) */
  glowIntensity: number;
}

/**
 * Default configuration
 */
export const globalDefaultConfig: GlobalConfig = {
  color: '#22d3ee',
  speed: 0.5,
  gridSize: 50,
  lineWidth: 1,
  pulseWave: true,
  scanLine: true,
  glowIntensity: 0.5,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const globalConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#22d3ee',
    label: 'Color',
    description: 'Grid color',
  },
  speed: {
    type: 'number',
    default: 0.5,
    min: 0.0,
    max: 2.0,
    step: 0.1,
    label: 'Speed',
    description: 'Animation speed',
  },
  gridSize: {
    type: 'number',
    default: 50,
    min: 20,
    max: 200,
    step: 10,
    label: 'Grid Size',
    description: 'Size of grid cells in pixels',
  },
  lineWidth: {
    type: 'number',
    default: 1,
    min: 0.5,
    max: 5,
    step: 0.5,
    label: 'Line Width',
    description: 'Width of grid lines',
  },
  pulseWave: {
    type: 'boolean',
    default: true,
    label: 'Pulse Wave',
    description: 'Enable radial pulse wave effect',
  },
  scanLine: {
    type: 'boolean',
    default: true,
    label: 'Scan Line',
    description: 'Enable horizontal scan line',
  },
  glowIntensity: {
    type: 'number',
    default: 0.5,
    min: 0.0,
    max: 1.0,
    step: 0.1,
    label: 'Glow',
    description: 'Glow intensity around lines',
  },
  intensity: {
    type: 'number',
    default: 1.0,
    min: 0.0,
    max: 1.0,
    step: 0.1,
    label: 'Intensity',
    description: 'Overall effect intensity',
  },
};

/**
 * Fragment shader GLSL code
 */
export const globalFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_gridSize;
uniform float u_lineWidth;
uniform float u_pulseWave;
uniform float u_scanLine;
uniform float u_glowIntensity;
uniform float u_intensity;
uniform vec2 u_resolution;

varying vec2 v_uv;

// ============================================
// GLSL UTILITY: Hash function for randomness
// Deterministic pseudo-random based on input
// ============================================

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash1D(float n) {
  return fract(sin(n) * 43758.5453123);
}

// ============================================
// GLSL UTILITY: Grid line with glow (SDF-based)
// ============================================

float gridLine(float coord, float lineWidth, float glowWidth) {
  float halfLine = lineWidth * 0.5;

  // Distance to nearest grid line
  float dist = abs(fract(coord) - 0.5) * 2.0;

  // Sharp line using smoothstep
  float line = smoothstep(halfLine + 0.01, halfLine, dist);

  // Glow around line
  float glow = smoothstep(halfLine + glowWidth, halfLine, dist) * 0.5;

  return line + glow * u_glowIntensity;
}

// ============================================
// GLSL UTILITY: Pulse wave from center
// ============================================

float pulseWave(vec2 uv, float time) {
  vec2 center = vec2(0.5, 0.5);
  float dist = length(uv - center) * 2.0;

  // Multiple expanding rings with different speeds
  float ring1 = sin(dist * 10.0 - time * 3.0);
  float ring2 = sin(dist * 15.0 - time * 4.0 + 1.0);
  float ring3 = sin(dist * 20.0 - time * 5.0 + 2.0);

  // Combine rings
  float rings = (ring1 + ring2 + ring3) / 3.0;
  rings = rings * 0.5 + 0.5;

  // Fade out toward edges
  float fade = 1.0 - smoothstep(0.3, 1.0, dist);

  return rings * fade;
}

// ============================================
// GLSL UTILITY: Horizontal scan line
// ============================================

float scanLineEffect(float y, float time) {
  float scanSpeed = 0.3;
  float scanY = fract(time * scanSpeed);
  float dist = abs(y - scanY);

  // Sharp scan line with tail
  float scan = smoothstep(0.05, 0.0, dist);
  float tail = smoothstep(0.2, 0.0, dist) * 0.3;

  return scan + tail;
}

// ============================================
// GLSL UTILITY: Data stream effect
// Random data blocks on grid lines
// ============================================

float dataStream(vec2 gridCoord, float time) {
  // Create random data blocks traveling along grid
  float xBlock = step(0.92, fract(gridCoord.x * 0.1 + time * 0.5 + hash1D(floor(gridCoord.y))));
  float yBlock = step(0.92, fract(gridCoord.y * 0.1 + time * 0.3 + hash1D(floor(gridCoord.x))));

  return max(xBlock, yBlock);
}

void main() {
  vec2 uv = v_uv;
  vec2 pixelUV = uv * u_resolution;
  float time = u_time;

  // ============================================
  // Calculate grid coordinates
  // ============================================
  vec2 gridCoord = pixelUV / u_gridSize;
  float lineWidthNorm = u_lineWidth / u_gridSize;
  float glowWidthNorm = lineWidthNorm * 3.0;

  // ============================================
  // Create grid lines using SDF
  // ============================================
  float gridX = gridLine(gridCoord.x, lineWidthNorm, glowWidthNorm);
  float gridY = gridLine(gridCoord.y, lineWidthNorm, glowWidthNorm);

  // Combine grid (max for brighter intersections)
  float grid = max(gridX, gridY);

  // ============================================
  // Intersection highlights
  // ============================================
  float intX = smoothstep(lineWidthNorm + 0.05, lineWidthNorm, abs(fract(gridCoord.x) - 0.5) * 2.0);
  float intY = smoothstep(lineWidthNorm + 0.05, lineWidthNorm, abs(fract(gridCoord.y) - 0.5) * 2.0);
  float intersections = intX * intY * 0.5;
  grid += intersections;

  // ============================================
  // FEATURE: Pulse wave modulation
  // ============================================
  float pulse = 1.0;
  if (u_pulseWave > 0.5) {
    pulse = 0.5 + pulseWave(uv, time) * 0.5;
    grid *= pulse;
  }

  // ============================================
  // FEATURE: Scan line effect
  // ============================================
  float scan = 0.0;
  if (u_scanLine > 0.5) {
    scan = scanLineEffect(uv.y, time) * 0.4;
    grid += scan;
  }

  // ============================================
  // Data stream effect using hash
  // ============================================
  float data = dataStream(gridCoord, time) * 0.4;
  grid += data;

  // ============================================
  // Holographic flicker effect
  // ============================================
  float flicker = 0.95 + 0.05 * sin(time * 30.0);
  grid *= flicker;

  // ============================================
  // Edge vignette
  // ============================================
  float vignette = 1.0 - length((uv - 0.5) * 1.5);
  vignette = smoothstep(0.0, 0.5, vignette);

  // ============================================
  // Final alpha
  // ============================================
  float alpha = grid * u_intensity * vignette;
  alpha = clamp(alpha, 0.0, 1.0);

  // ============================================
  // Color with variations
  // ============================================
  vec3 color = u_color.rgb;

  // Brighter at intersections
  color = mix(color, color * 1.3, intersections);

  // Boost color on scan line
  color = mix(color, vec3(1.0), scan * 0.3);

  // Data stream color
  color = mix(color, color * 1.5, data);

  gl_FragColor = vec4(color, alpha * u_color.a);
}
`;

/**
 * Global shader definition
 */
export const globalShader: ShaderDefinition<GlobalConfig> = {
  name: 'global',
  displayName: 'Grid Overlay',
  description:
    'Sci-fi pulsing grid overlay - demonstrates hash functions, SDF grid generation, pulse waves, and scan effects',
  geometry: 'global',
  tags: ['example', 'global', 'grid', 'holographic', 'radar', 'overlay'],

  fragmentShader: globalFragmentShader,

  defaultConfig: globalDefaultConfig,
  configSchema: globalConfigSchema,

  getUniforms: (config: GlobalConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string' ? hexToRgba(config.color) : config.color;

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_gridSize: config.gridSize,
      u_lineWidth: config.lineWidth,
      u_pulseWave: config.pulseWave ? 1.0 : 0.0,
      u_scanLine: config.scanLine ? 1.0 : 0.0,
      u_glowIntensity: config.glowIntensity,
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default globalShader;
