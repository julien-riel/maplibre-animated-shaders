/**
 * Neon Shader - Glowing neon effect with flicker
 *
 * Creates a neon sign-like effect with glow and subtle flicker,
 * perfect for cyberpunk aesthetics and futuristic UI.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Neon shader
 */
export interface NeonConfig extends ShaderConfig {
  /** Neon color */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Glow radius in pixels */
  glowRadius: number;
  /** Flicker intensity (0-1) */
  flickerIntensity: number;
  /** Flicker speed */
  flickerSpeed: number;
  /** Number of glow layers */
  layers: number;
  /** Core line width in pixels */
  width: number;
}

/**
 * Default configuration for Neon shader
 */
export const neonDefaultConfig: NeonConfig = {
  color: '#f0abfc',
  speed: 1.0,
  glowRadius: 10,
  flickerIntensity: 0.3,
  flickerSpeed: 5.0,
  layers: 3,
  width: 2,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const neonConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#f0abfc',
    label: 'Color',
    description: 'Neon glow color',
  },
  speed: {
    type: 'number',
    default: 1.0,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    label: 'Speed',
    description: 'Animation speed',
  },
  glowRadius: {
    type: 'number',
    default: 10,
    min: 2,
    max: 30,
    step: 1,
    label: 'Glow Radius',
    description: 'Radius of the glow effect',
  },
  flickerIntensity: {
    type: 'number',
    default: 0.3,
    min: 0,
    max: 1,
    step: 0.1,
    label: 'Flicker Intensity',
    description: 'Intensity of the flicker effect',
  },
  flickerSpeed: {
    type: 'number',
    default: 5.0,
    min: 1,
    max: 20,
    step: 1,
    label: 'Flicker Speed',
    description: 'Speed of the flicker',
  },
  layers: {
    type: 'number',
    default: 3,
    min: 1,
    max: 5,
    step: 1,
    label: 'Glow Layers',
    description: 'Number of glow layers',
  },
  width: {
    type: 'number',
    default: 2,
    min: 1,
    max: 10,
    step: 1,
    label: 'Core Width',
    description: 'Width of the neon core',
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
 * Fragment shader GLSL code for Neon effect
 */
export const neonFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_glowRadius;
uniform float u_flickerIntensity;
uniform float u_flickerSpeed;
uniform float u_layers;
uniform float u_intensity;
uniform float u_width;

varying vec2 v_pos;
varying float v_progress;
varying float v_line_index;
varying float v_width;
varying float v_timeOffset;
varying float v_effectiveTime;

// Data-driven properties from vertex shader
varying vec4 v_color;
varying float v_intensity;
varying float v_useDataDrivenColor;
varying float v_useDataDrivenIntensity;

// Pseudo-random for flicker
float random(float x) {
  return fract(sin(x * 12.9898) * 43758.5453);
}

float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(random(i), random(i + 1.0), smoothstep(0.0, 1.0, f));
}

void main() {
  // Calculate perpendicular distance from line center (in pixels)
  float dist = abs(v_pos.y) * u_width;

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Calculate flicker
  float flicker1 = noise(localTime * u_flickerSpeed);
  float flicker2 = noise(localTime * u_flickerSpeed * 1.7 + 100.0);
  float flicker3 = noise(localTime * u_flickerSpeed * 0.5 + 200.0);
  float flicker = (flicker1 + flicker2 + flicker3) / 3.0;
  flicker = 1.0 - u_flickerIntensity + flicker * u_flickerIntensity;

  // Bright core
  float coreWidth = u_width * 0.5;
  float coreAlpha = 1.0 - smoothstep(0.0, coreWidth, dist);

  // Glow layers
  float glowAlpha = 0.0;
  for (float i = 1.0; i <= 5.0; i++) {
    if (i > u_layers) break;
    float layerRadius = u_glowRadius * (i / u_layers);
    float layerAlpha = (1.0 - smoothstep(0.0, layerRadius, dist)) * (1.0 - i / (u_layers + 1.0));
    glowAlpha += layerAlpha * 0.3;
  }

  // Use data-driven color/intensity if available, otherwise use uniform
  vec4 effectColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  // Combine core and glow
  float totalAlpha = (coreAlpha + glowAlpha) * flicker * finalIntensity;

  // Core is brighter white, glow is colored
  vec3 coreColor = mix(effectColor.rgb, vec3(1.0), 0.7);
  vec3 finalColor = mix(effectColor.rgb, coreColor, coreAlpha);

  gl_FragColor = vec4(finalColor, effectColor.a * totalAlpha);
}
`;

/**
 * Neon shader definition
 */
export const neonShader: ShaderDefinition<NeonConfig> = {
  name: 'neon',
  displayName: 'Neon',
  description: 'Glowing neon effect with flicker - perfect for cyberpunk and futuristic UI',
  geometry: 'line',
  tags: ['neon', 'glow', 'cyberpunk', 'futuristic', 'flicker'],

  fragmentShader: neonFragmentShader,

  defaultConfig: neonDefaultConfig,
  configSchema: neonConfigSchema,

  getUniforms: (config: NeonConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string' ? hexToRgba(config.color) : config.color;

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_glowRadius: config.glowRadius,
      u_flickerIntensity: config.flickerIntensity,
      u_flickerSpeed: config.flickerSpeed,
      u_layers: config.layers,
      u_intensity: config.intensity ?? 1.0,
      u_width: config.width + config.glowRadius, // Total width including glow
    };
  },

  requiredLayout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

export default neonShader;
