/**
 * Dissolve Shader - Animated appearance/disappearance effect for polygons
 *
 * Creates a noise-based dissolve transition effect with glowing edges,
 * perfect for reveals, transitions, and progressive appearance animations.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Dissolve shader
 */
export interface DissolveConfig extends ShaderConfig {
  /** Fill color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Dissolve progress (0 = invisible, 1 = fully visible) */
  progress: number;
  /** Scale of the dissolve noise pattern */
  noiseScale: number;
  /** Edge glow color (null for none) */
  edgeColor: string | null;
  /** Width of the glowing edge */
  edgeWidth: number;
  /** Overall effect intensity */
  intensity: number;
}

/**
 * Default configuration for Dissolve shader
 */
export const dissolveDefaultConfig: DissolveConfig = {
  color: '#84cc16',
  speed: 0.5,
  progress: 1.0,
  noiseScale: 0.02,
  edgeColor: '#ffffff',
  edgeWidth: 0.05,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const dissolveConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#84cc16',
    label: 'Color',
    description: 'Fill color',
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
  progress: {
    type: 'number',
    default: 1.0,
    min: 0.0,
    max: 1.0,
    step: 0.05,
    label: 'Progress',
    description: 'Dissolve progress (0-1)',
  },
  noiseScale: {
    type: 'number',
    default: 0.02,
    min: 0.005,
    max: 0.1,
    step: 0.005,
    label: 'Noise Scale',
    description: 'Scale of dissolve pattern',
  },
  edgeColor: {
    type: 'color',
    default: '#ffffff',
    label: 'Edge Color',
    description: 'Color of the dissolve edge glow',
  },
  edgeWidth: {
    type: 'number',
    default: 0.05,
    min: 0.01,
    max: 0.2,
    step: 0.01,
    label: 'Edge Width',
    description: 'Width of the edge glow',
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
 * Fragment shader GLSL code for Dissolve effect
 */
export const dissolveFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_progress;
uniform float u_noiseScale;
uniform vec4 u_edgeColor;
uniform float u_edgeWidth;
uniform float u_intensity;

varying vec2 v_screen_pos;
varying vec2 v_uv;
varying float v_timeOffset;
varying float v_effectiveTime;

// Data-driven properties from vertex shader
varying vec4 v_color;
varying float v_intensity;
varying float v_useDataDrivenColor;
varying float v_useDataDrivenIntensity;

// Simplex noise functions
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

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * (snoise(p) * 0.5 + 0.5);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  // Generate dissolve noise
  vec2 noiseCoord = v_screen_pos * u_noiseScale;
  float noise = fbm(noiseCoord);

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Animate the progress with slight wave effect
  float animatedProgress = u_progress + sin(localTime * 2.0) * 0.02;
  animatedProgress = clamp(animatedProgress, 0.0, 1.0);

  // Calculate dissolve threshold
  float dissolveThreshold = animatedProgress;

  // Determine visibility
  float visible = step(noise, dissolveThreshold);

  // Calculate edge glow
  float edgeDist = abs(noise - dissolveThreshold);
  float edge = 1.0 - smoothstep(0.0, u_edgeWidth, edgeDist);
  edge *= step(noise, dissolveThreshold + u_edgeWidth); // Only show edge near visible area

  // Use data-driven color/intensity if available, otherwise use uniform
  vec4 effectColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  // Mix colors
  vec4 baseColor = effectColor * visible;
  vec4 glowColor = u_edgeColor * edge * (1.0 - visible * 0.5);

  vec4 finalColor = baseColor + glowColor;
  finalColor.a *= finalIntensity;

  // Discard fully transparent pixels
  if (finalColor.a < 0.01) {
    discard;
  }

  gl_FragColor = finalColor;
}
`;

/**
 * Dissolve shader definition
 */
export const dissolveShader: ShaderDefinition<DissolveConfig> = {
  name: 'dissolve',
  displayName: 'Dissolve',
  description: 'Animated dissolve effect with glowing edges for reveals and transitions',
  geometry: 'polygon',
  tags: ['dissolve', 'reveal', 'transition', 'appear', 'animation'],

  fragmentShader: dissolveFragmentShader,

  defaultConfig: dissolveDefaultConfig,
  configSchema: dissolveConfigSchema,

  getUniforms: (config: DissolveConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : config.color;

    const edgeRgba = config.edgeColor
      ? (typeof config.edgeColor === 'string'
        ? hexToRgba(config.edgeColor)
        : config.edgeColor)
      : [1, 1, 1, 1];

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_progress: config.progress,
      u_noiseScale: config.noiseScale,
      u_edgeColor: edgeRgba,
      u_edgeWidth: config.edgeWidth,
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default dissolveShader;
