/**
 * Gradient Rotation Shader - Animated rotating gradient for polygons
 *
 * Creates radial, linear, or conic gradients that rotate around the polygon center,
 * perfect for zone of influence visualization or orientation displays.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Gradient Rotation shader
 */
export interface GradientRotationConfig extends ShaderConfig {
  /** Gradient colors (2-4 colors) */
  colors: string[];
  /** Animation speed multiplier */
  speed: number;
  /** Gradient type: radial, linear, or conic */
  gradientType: 'radial' | 'linear' | 'conic';
  /** Overall effect intensity */
  intensity: number;
}

/**
 * Default configuration for Gradient Rotation shader
 */
export const gradientRotationDefaultConfig: GradientRotationConfig = {
  colors: ['#3b82f6', '#8b5cf6', '#ec4899'],
  speed: 0.2,
  gradientType: 'conic',
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const gradientRotationConfigSchema: ConfigSchema = {
  colors: {
    type: 'array',
    default: ['#3b82f6', '#8b5cf6', '#ec4899'],
    label: 'Colors',
    description: 'Gradient colors (2-4 colors)',
  },
  speed: {
    type: 'number',
    default: 0.2,
    min: 0.0,
    max: 2.0,
    step: 0.1,
    label: 'Speed',
    description: 'Rotation speed',
  },
  gradientType: {
    type: 'select',
    default: 'conic',
    options: ['radial', 'linear', 'conic'],
    label: 'Gradient Type',
    description: 'Type of gradient',
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
 * Fragment shader GLSL code for Gradient Rotation effect
 */
export const gradientRotationFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color0;
uniform vec4 u_color1;
uniform vec4 u_color2;
uniform vec4 u_color3;
uniform float u_colorCount;
uniform float u_gradientType;
uniform float u_intensity;

varying vec2 v_uv;

const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;

// Smooth color interpolation
vec4 getGradientColor(float t) {
  t = fract(t);

  if (u_colorCount <= 2.0) {
    return mix(u_color0, u_color1, t);
  } else if (u_colorCount <= 3.0) {
    float segment = t * 3.0;
    if (segment < 1.0) {
      return mix(u_color0, u_color1, segment);
    } else if (segment < 2.0) {
      return mix(u_color1, u_color2, segment - 1.0);
    } else {
      return mix(u_color2, u_color0, segment - 2.0);
    }
  } else {
    float segment = t * 4.0;
    if (segment < 1.0) {
      return mix(u_color0, u_color1, segment);
    } else if (segment < 2.0) {
      return mix(u_color1, u_color2, segment - 1.0);
    } else if (segment < 3.0) {
      return mix(u_color2, u_color3, segment - 2.0);
    } else {
      return mix(u_color3, u_color0, segment - 3.0);
    }
  }
}

void main() {
  vec2 center = vec2(0.5, 0.5);
  vec2 pos = v_uv - center;

  float t;

  if (u_gradientType < 0.5) {
    // Radial gradient
    float dist = length(pos) * 2.0;
    t = dist + u_time;
  } else if (u_gradientType < 1.5) {
    // Linear gradient (rotating)
    float angle = u_time * TWO_PI;
    vec2 dir = vec2(cos(angle), sin(angle));
    t = dot(pos, dir) + 0.5;
  } else {
    // Conic gradient (rotating)
    float angle = atan(pos.y, pos.x);
    t = (angle + PI) / TWO_PI + u_time;
  }

  vec4 gradientColor = getGradientColor(t);

  gl_FragColor = vec4(gradientColor.rgb, gradientColor.a * u_intensity);
}
`;

/**
 * Gradient Rotation shader definition
 */
export const gradientRotationShader: ShaderDefinition<GradientRotationConfig> = {
  name: 'gradient-rotation',
  displayName: 'Gradient Rotation',
  description: 'Animated rotating gradient for influence zones and orientation visualization',
  geometry: 'polygon',
  tags: ['gradient', 'rotation', 'influence', 'visualization', 'colorful'],

  fragmentShader: gradientRotationFragmentShader,

  defaultConfig: gradientRotationDefaultConfig,
  configSchema: gradientRotationConfigSchema,

  getUniforms: (config: GradientRotationConfig, time: number, _deltaTime: number) => {
    const colors = config.colors.map(c =>
      typeof c === 'string' ? hexToRgba(c) : c
    );

    // Pad with transparent if less than 4 colors
    while (colors.length < 4) {
      colors.push(colors[colors.length - 1] || [0, 0, 0, 1]);
    }

    const gradientTypeMap: Record<string, number> = {
      radial: 0.0,
      linear: 1.0,
      conic: 2.0,
    };

    return {
      u_time: time * config.speed,
      u_color0: colors[0],
      u_color1: colors[1],
      u_color2: colors[2],
      u_color3: colors[3],
      u_colorCount: config.colors.length,
      u_gradientType: gradientTypeMap[config.gradientType] ?? 2.0,
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default gradientRotationShader;
