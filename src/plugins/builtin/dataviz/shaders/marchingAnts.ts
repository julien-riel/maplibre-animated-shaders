/**
 * Marching Ants Shader - Animated selection border for polygons
 *
 * Creates the classic "marching ants" selection effect with animated dashes
 * around the polygon border, perfect for active selection and editing states.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Marching Ants shader
 */
export interface MarchingAntsConfig extends ShaderConfig {
  /** Primary dash color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Length of dashes in pixels */
  dashLength: number;
  /** Length of gaps in pixels */
  gapLength: number;
  /** Border width in pixels */
  width: number;
  /** Alternate color for gaps (null for transparent) */
  alternateColor: string | null;
  /** Overall effect intensity */
  intensity: number;
}

/**
 * Default configuration for Marching Ants shader
 */
export const marchingAntsDefaultConfig: MarchingAntsConfig = {
  color: '#000000',
  speed: 2.0,
  dashLength: 5,
  gapLength: 5,
  width: 2,
  alternateColor: '#ffffff',
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const marchingAntsConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#000000',
    label: 'Color',
    description: 'Primary dash color',
  },
  speed: {
    type: 'number',
    default: 2.0,
    min: 0.5,
    max: 5.0,
    step: 0.1,
    label: 'Speed',
    description: 'Animation speed',
  },
  dashLength: {
    type: 'number',
    default: 5,
    min: 2,
    max: 20,
    step: 1,
    label: 'Dash Length',
    description: 'Length of dashes',
  },
  gapLength: {
    type: 'number',
    default: 5,
    min: 2,
    max: 20,
    step: 1,
    label: 'Gap Length',
    description: 'Length of gaps',
  },
  width: {
    type: 'number',
    default: 2,
    min: 1,
    max: 10,
    step: 1,
    label: 'Width',
    description: 'Border width',
  },
  alternateColor: {
    type: 'color',
    default: '#ffffff',
    label: 'Alternate Color',
    description: 'Color for gaps (or null for transparent)',
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
 * Fragment shader GLSL code for Marching Ants effect
 */
export const marchingAntsFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_dashLength;
uniform float u_gapLength;
uniform float u_width;
uniform vec4 u_alternateColor;
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
  // Calculate distance from edges (using UV coordinates)
  float edgeDistX = min(v_uv.x, 1.0 - v_uv.x);
  float edgeDistY = min(v_uv.y, 1.0 - v_uv.y);
  float edgeDist = min(edgeDistX, edgeDistY);

  // Convert to pixel-like distance (approximate)
  float borderWidth = u_width * 0.02; // Normalize to UV space
  float inBorder = 1.0 - smoothstep(0.0, borderWidth, edgeDist);

  // Skip if not in border area
  if (inBorder < 0.01) {
    discard;
  }

  // Calculate position along the border for dash pattern
  float borderPos;
  if (edgeDistX < edgeDistY) {
    // Closer to left/right edge
    borderPos = v_uv.y;
    if (v_uv.x > 0.5) {
      borderPos = 1.0 - v_uv.y; // Reverse direction on right side
    }
  } else {
    // Closer to top/bottom edge
    borderPos = v_uv.x;
    if (v_uv.y > 0.5) {
      borderPos = 1.0 - v_uv.x; // Reverse direction on bottom
    }
  }

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Create marching pattern using screen position for consistency
  float perimeter = (v_screen_pos.x + v_screen_pos.y);
  float cycleLength = u_dashLength + u_gapLength;
  float phase = localTime * 30.0;
  float pattern = mod(perimeter + phase, cycleLength);

  // Determine if we're in a dash or gap
  float isDash = step(pattern, u_dashLength);

  // Use data-driven color/intensity if available, otherwise use uniform
  vec4 effectColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  // Choose color based on dash/gap
  vec4 dashColor = effectColor;
  vec4 gapColor = u_alternateColor;

  vec4 finalColor = mix(gapColor, dashColor, isDash);

  // Apply border mask and intensity
  float alpha = inBorder * finalIntensity;

  gl_FragColor = vec4(finalColor.rgb, finalColor.a * alpha);
}
`;

/**
 * Marching Ants shader definition
 */
export const marchingAntsShader: ShaderDefinition<MarchingAntsConfig> = {
  name: 'marching-ants',
  displayName: 'Marching Ants',
  description: 'Classic animated selection border with marching dashes',
  geometry: 'polygon',
  tags: ['selection', 'editing', 'focus', 'border', 'animation'],

  fragmentShader: marchingAntsFragmentShader,

  defaultConfig: marchingAntsDefaultConfig,
  configSchema: marchingAntsConfigSchema,

  getUniforms: (config: MarchingAntsConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string' ? hexToRgba(config.color) : config.color;

    const altRgba = config.alternateColor
      ? typeof config.alternateColor === 'string'
        ? hexToRgba(config.alternateColor)
        : config.alternateColor
      : [0, 0, 0, 0];

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_dashLength: config.dashLength,
      u_gapLength: config.gapLength,
      u_width: config.width,
      u_alternateColor: altRgba,
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default marchingAntsShader;
