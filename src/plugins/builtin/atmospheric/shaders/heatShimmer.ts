/**
 * Heat Shimmer Shader - Distortion effect like heat on asphalt
 *
 * Creates a wavy distortion effect that simulates heat waves rising
 * from hot surfaces, perfect for desert maps or hot weather visualization.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';

/**
 * Configuration for the Heat Shimmer shader
 */
export interface HeatShimmerConfig extends ShaderConfig {
  /** Animation speed multiplier */
  speed: number;
  /** Distortion intensity (0-1) */
  intensity: number;
  /** Scale of the distortion pattern */
  scale: number;
  /** Direction: vertical or horizontal */
  direction: 'vertical' | 'horizontal';
  /** Optional bounds [minX, minY, maxX, maxY] to limit effect */
  bounds: [number, number, number, number] | null;
}

/**
 * Default configuration for Heat Shimmer shader
 */
export const heatShimmerDefaultConfig: HeatShimmerConfig = {
  speed: 1.0,
  intensity: 0.5,
  scale: 0.005,
  direction: 'vertical',
  bounds: null,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const heatShimmerConfigSchema: ConfigSchema = {
  speed: {
    type: 'number',
    default: 1.0,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    label: 'Speed',
    description: 'Animation speed multiplier',
  },
  intensity: {
    type: 'number',
    default: 0.5,
    min: 0.0,
    max: 1.0,
    step: 0.05,
    label: 'Intensity',
    description: 'Distortion intensity',
  },
  scale: {
    type: 'number',
    default: 0.005,
    min: 0.001,
    max: 0.02,
    step: 0.001,
    label: 'Scale',
    description: 'Scale of the distortion pattern',
  },
  direction: {
    type: 'select',
    default: 'vertical',
    options: ['vertical', 'horizontal'],
    label: 'Direction',
    description: 'Direction of heat waves',
  },
};

/**
 * Fragment shader GLSL code for Heat Shimmer effect
 * Note: This creates a visual overlay effect since we cannot actually
 * distort the underlying map. The effect simulates heat shimmer.
 */
export const heatShimmerFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_scale;
uniform float u_direction;

varying vec2 v_uv;

// Simplex noise function
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = v_uv;

  // Create animated noise for distortion effect
  float time = u_time * 0.5;

  // Sample position for noise
  vec2 noisePos = uv * u_resolution * u_scale;

  // Vertical shimmer (heat rising)
  float distortionY = snoise(vec2(noisePos.x * 0.5, noisePos.y + time * 2.0)) * 0.5;
  distortionY += snoise(vec2(noisePos.x * 1.0, noisePos.y * 2.0 + time * 3.0)) * 0.3;
  distortionY += snoise(vec2(noisePos.x * 2.0, noisePos.y * 4.0 + time * 4.0)) * 0.2;

  // Horizontal shimmer
  float distortionX = snoise(vec2(noisePos.x + time * 2.0, noisePos.y * 0.5)) * 0.5;
  distortionX += snoise(vec2(noisePos.x * 2.0 + time * 3.0, noisePos.y * 1.0)) * 0.3;
  distortionX += snoise(vec2(noisePos.x * 4.0 + time * 4.0, noisePos.y * 2.0)) * 0.2;

  // Choose direction
  float distortion;
  if (u_direction < 0.5) {
    distortion = distortionY;
  } else {
    distortion = distortionX;
  }

  // Create shimmer lines effect
  float shimmerLines = sin(noisePos.y * 20.0 + time * 5.0 + distortion * 10.0);
  shimmerLines = smoothstep(0.8, 1.0, shimmerLines);

  // Combine with overall distortion pattern
  float shimmer = abs(distortion) * shimmerLines;

  // Fade effect toward edges for a more natural look
  float edgeFade = 1.0;
  if (u_direction < 0.5) {
    // Vertical: fade at top and bottom
    edgeFade = smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
  } else {
    // Horizontal: fade at left and right
    edgeFade = smoothstep(0.0, 0.3, uv.x) * smoothstep(1.0, 0.7, uv.x);
  }

  // Output as subtle white/transparent overlay
  float alpha = shimmer * u_intensity * edgeFade * 0.3;
  vec3 color = vec3(1.0); // White shimmer

  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * Heat Shimmer shader definition
 */
export const heatShimmerShader: ShaderDefinition<HeatShimmerConfig> = {
  name: 'heatShimmer',
  displayName: 'Heat Shimmer',
  description:
    'Distortion effect like heat waves on hot asphalt - perfect for desert and summer scenes',
  geometry: 'global',
  tags: ['heat', 'distortion', 'weather', 'atmosphere', 'desert'],

  fragmentShader: heatShimmerFragmentShader,

  defaultConfig: heatShimmerDefaultConfig,
  configSchema: heatShimmerConfigSchema,

  getUniforms: (config: HeatShimmerConfig, time: number, _deltaTime: number) => {
    return {
      u_time: time * config.speed,
      u_intensity: config.intensity,
      u_scale: config.scale,
      u_direction: config.direction === 'vertical' ? 0.0 : 1.0,
    };
  },
};

export default heatShimmerShader;
