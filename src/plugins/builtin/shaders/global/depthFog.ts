/**
 * Depth Fog Shader - Animated fog based on zoom level
 *
 * Creates a fog overlay that becomes more visible at lower zoom levels,
 * adding atmosphere and depth to the map view.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Depth Fog shader
 */
export interface DepthFogConfig extends ShaderConfig {
  /** Fog color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Fog density (0-1) */
  density: number;
  /** Zoom level where fog starts appearing */
  minZoom: number;
  /** Zoom level where fog disappears */
  maxZoom: number;
  /** Whether fog is animated */
  animated: boolean;
  /** Overall effect intensity */
  intensity: number;
}

/**
 * Default configuration for Depth Fog shader
 */
export const depthFogDefaultConfig: DepthFogConfig = {
  color: '#e5e7eb',
  speed: 0.3,
  density: 0.5,
  minZoom: 8,
  maxZoom: 14,
  animated: true,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const depthFogConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#e5e7eb',
    label: 'Fog Color',
    description: 'Color of the fog',
  },
  speed: {
    type: 'number',
    default: 0.3,
    min: 0.0,
    max: 2.0,
    step: 0.1,
    label: 'Speed',
    description: 'Animation speed of fog movement',
  },
  density: {
    type: 'number',
    default: 0.5,
    min: 0.0,
    max: 1.0,
    step: 0.05,
    label: 'Density',
    description: 'How thick the fog appears',
  },
  minZoom: {
    type: 'number',
    default: 8,
    min: 0,
    max: 20,
    step: 1,
    label: 'Min Zoom',
    description: 'Zoom level where fog is fully visible',
  },
  maxZoom: {
    type: 'number',
    default: 14,
    min: 0,
    max: 22,
    step: 1,
    label: 'Max Zoom',
    description: 'Zoom level where fog disappears',
  },
  animated: {
    type: 'boolean',
    default: true,
    label: 'Animated',
    description: 'Enable fog movement animation',
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
 * Fragment shader GLSL code for Depth Fog effect
 */
export const depthFogFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_density;
uniform float u_zoom;
uniform float u_minZoom;
uniform float u_maxZoom;
uniform float u_animated;
uniform float u_intensity;
uniform vec2 u_resolution;

varying vec2 v_uv;

// Simplex noise
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

// Fractal Brownian Motion for more natural fog
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 5; i++) {
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

void main() {
  vec2 uv = v_uv;

  // Calculate fog visibility based on zoom
  float zoomFactor = 1.0 - smoothstep(u_minZoom, u_maxZoom, u_zoom);

  // If fog is not visible at this zoom, discard
  if (zoomFactor <= 0.0) {
    discard;
  }

  // Animated fog using FBM noise
  float time = u_time * 0.2;
  vec2 fogUV = uv * 3.0;

  // Move fog slowly
  if (u_animated > 0.5) {
    fogUV.x += time * 0.5;
    fogUV.y += time * 0.3;
  }

  // Generate fog pattern with multiple octaves
  float fog1 = fbm(fogUV);
  float fog2 = fbm(fogUV * 2.0 + vec2(100.0, 100.0));
  float fog3 = fbm(fogUV * 0.5 + vec2(-50.0, 50.0) + time * 0.1);

  // Combine fog layers
  float fog = (fog1 + fog2 * 0.5 + fog3 * 0.5) / 2.0;
  fog = fog * 0.5 + 0.5; // Normalize to 0-1

  // Apply density
  fog = pow(fog, 2.0 - u_density);

  // Add some variation in density
  float densityVariation = snoise(fogUV * 0.5 + time * 0.05) * 0.2 + 1.0;
  fog *= densityVariation;

  // Edge fade for more natural look
  float edgeFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);
  edgeFade *= smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);

  // Calculate final alpha
  float alpha = fog * u_density * zoomFactor * u_intensity * edgeFade;
  alpha = clamp(alpha, 0.0, 0.8); // Cap max opacity

  gl_FragColor = vec4(u_color.rgb, alpha);
}
`;

/**
 * Depth Fog shader definition
 */
export const depthFogShader: ShaderDefinition<DepthFogConfig> = {
  name: 'depthFog',
  displayName: 'Depth Fog',
  description: 'Animated fog that appears at lower zoom levels - adds atmosphere and depth',
  geometry: 'global',
  tags: ['fog', 'atmosphere', 'depth', 'weather', 'mist'],

  fragmentShader: depthFogFragmentShader,

  defaultConfig: depthFogDefaultConfig,
  configSchema: depthFogConfigSchema,

  getUniforms: (config: DepthFogConfig, time: number, _deltaTime: number) => {
    const color = hexToRgba(config.color);

    return {
      u_time: time * config.speed,
      u_color: color,
      u_color_vec4: color,
      u_density: config.density,
      u_minZoom: config.minZoom,
      u_maxZoom: config.maxZoom,
      u_animated: config.animated ? 1.0 : 0.0,
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default depthFogShader;
