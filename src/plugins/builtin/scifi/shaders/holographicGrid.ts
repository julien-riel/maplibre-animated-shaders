/**
 * Holographic Grid Shader - Sci-fi pulsing grid overlay
 *
 * Creates a futuristic holographic grid effect that pulses
 * across the map, perfect for tech/cyberpunk visualizations.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Holographic Grid shader
 */
export interface HolographicGridConfig extends ShaderConfig {
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
  /** Glow intensity (0-1) */
  glowIntensity: number;
  /** Overall effect intensity */
  intensity: number;
}

/**
 * Default configuration for Holographic Grid shader
 */
export const holographicGridDefaultConfig: HolographicGridConfig = {
  color: '#22d3ee',
  speed: 0.5,
  gridSize: 50,
  lineWidth: 1,
  pulseWave: true,
  glowIntensity: 0.5,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const holographicGridConfigSchema: ConfigSchema = {
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
 * Fragment shader GLSL code for Holographic Grid effect
 */
export const holographicGridFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_gridSize;
uniform float u_lineWidth;
uniform float u_pulseWave;
uniform float u_glowIntensity;
uniform float u_intensity;
uniform vec2 u_resolution;
uniform vec2 u_center;

varying vec2 v_uv;

// Create grid lines with glow
float gridLine(float coord, float lineWidth, float glowWidth) {
  float halfLine = lineWidth * 0.5;
  float dist = abs(fract(coord) - 0.5) * 2.0;

  // Sharp line
  float line = smoothstep(halfLine + 0.01, halfLine, dist);

  // Glow around line
  float glow = smoothstep(halfLine + glowWidth, halfLine, dist) * 0.5;

  return line + glow * u_glowIntensity;
}

// Pulse wave from center
float pulseWave(vec2 uv, float time) {
  vec2 center = vec2(0.5, 0.5);
  float dist = length(uv - center) * 2.0;

  // Multiple expanding rings
  float ring1 = sin(dist * 10.0 - time * 3.0);
  float ring2 = sin(dist * 15.0 - time * 4.0 + 1.0);
  float ring3 = sin(dist * 20.0 - time * 5.0 + 2.0);

  float rings = (ring1 + ring2 + ring3) / 3.0;
  rings = rings * 0.5 + 0.5;

  // Fade out toward edges
  float fade = 1.0 - smoothstep(0.3, 1.0, dist);

  return rings * fade;
}

// Scanline effect
float scanLine(float y, float time) {
  float scanSpeed = 0.3;
  float scanY = fract(time * scanSpeed);
  float dist = abs(y - scanY);
  return smoothstep(0.05, 0.0, dist);
}

// Data stream effect on grid lines
float dataStream(vec2 gridCoord, float time) {
  // Random data blocks traveling along grid lines
  float xStream = step(0.95, fract(gridCoord.x * 0.1 + time * 0.5));
  float yStream = step(0.95, fract(gridCoord.y * 0.1 + time * 0.3));
  return max(xStream, yStream);
}

void main() {
  vec2 uv = v_uv;
  vec2 pixelUV = uv * u_resolution;

  float time = u_time;

  // Calculate grid coordinates
  vec2 gridCoord = pixelUV / u_gridSize;
  float lineWidthNorm = u_lineWidth / u_gridSize;
  float glowWidthNorm = lineWidthNorm * 3.0;

  // Create grid lines
  float gridX = gridLine(gridCoord.x, lineWidthNorm, glowWidthNorm);
  float gridY = gridLine(gridCoord.y, lineWidthNorm, glowWidthNorm);

  // Combine grid (use max for intersection brightness)
  float grid = max(gridX, gridY);

  // Add intersection highlights
  float intersectionX = smoothstep(lineWidthNorm + 0.05, lineWidthNorm, abs(fract(gridCoord.x) - 0.5) * 2.0);
  float intersectionY = smoothstep(lineWidthNorm + 0.05, lineWidthNorm, abs(fract(gridCoord.y) - 0.5) * 2.0);
  float intersections = intersectionX * intersectionY * 0.5;
  grid += intersections;

  // Pulse wave modulation
  float pulse = 1.0;
  if (u_pulseWave > 0.5) {
    pulse = 0.5 + pulseWave(uv, time) * 0.5;
    grid *= pulse;
  }

  // Add scan line effect
  float scan = scanLine(uv.y, time) * 0.3;
  grid += scan;

  // Data stream effect
  float data = dataStream(gridCoord, time) * 0.5;
  grid += data;

  // Flicker effect for holographic feel
  float flicker = 0.95 + 0.05 * sin(time * 30.0);
  grid *= flicker;

  // Edge vignette
  float vignette = 1.0 - length((uv - 0.5) * 1.5);
  vignette = smoothstep(0.0, 0.5, vignette);

  // Calculate final alpha
  float alpha = grid * u_intensity * vignette;
  alpha = clamp(alpha, 0.0, 1.0);

  // Color with slight variation
  vec3 color = u_color.rgb;

  // Add slight color shift at intersections
  color = mix(color, color * 1.2, intersections);

  // Add scan line color boost
  color = mix(color, vec3(1.0), scan * 0.3);

  gl_FragColor = vec4(color, alpha * u_color.a);
}
`;

/**
 * Holographic Grid shader definition
 */
export const holographicGridShader: ShaderDefinition<HolographicGridConfig> = {
  name: 'holographicGrid',
  displayName: 'Holographic Grid',
  description: 'Sci-fi pulsing grid overlay - perfect for futuristic and tech visualizations',
  geometry: 'global',
  tags: ['grid', 'holographic', 'sci-fi', 'cyberpunk', 'tech', 'futuristic'],

  fragmentShader: holographicGridFragmentShader,

  defaultConfig: holographicGridDefaultConfig,
  configSchema: holographicGridConfigSchema,

  getUniforms: (config: HolographicGridConfig, time: number, _deltaTime: number) => {
    const color = hexToRgba(config.color);

    return {
      u_time: time * config.speed,
      u_color: color,
      u_color_vec4: color,
      u_gridSize: config.gridSize,
      u_lineWidth: config.lineWidth,
      u_pulseWave: config.pulseWave ? 1.0 : 0.0,
      u_glowIntensity: config.glowIntensity,
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default holographicGridShader;
