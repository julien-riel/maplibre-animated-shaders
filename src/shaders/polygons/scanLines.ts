/**
 * Scan Lines Shader - Animated scanning lines across polygons
 *
 * Creates horizontal, vertical, or diagonal lines that sweep across the polygon,
 * perfect for analysis, processing, or selection effects.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Scan Lines shader
 */
export interface ScanLinesConfig extends ShaderConfig {
  /** Line color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Direction: horizontal, vertical, or diagonal */
  direction: 'horizontal' | 'vertical' | 'diagonal';
  /** Line width in pixels */
  lineWidth: number;
  /** Spacing between lines in pixels */
  spacing: number;
  /** Enable fade at edges */
  fade: boolean;
  /** Overall effect intensity */
  intensity: number;
}

/**
 * Default configuration for Scan Lines shader
 */
export const scanLinesDefaultConfig: ScanLinesConfig = {
  color: '#22d3ee',
  speed: 1.0,
  direction: 'horizontal',
  lineWidth: 3,
  spacing: 20,
  fade: true,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const scanLinesConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#22d3ee',
    label: 'Color',
    description: 'Color of the scan lines',
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
  direction: {
    type: 'select',
    default: 'horizontal',
    options: ['horizontal', 'vertical', 'diagonal'],
    label: 'Direction',
    description: 'Direction of the scan lines',
  },
  lineWidth: {
    type: 'number',
    default: 3,
    min: 1,
    max: 20,
    step: 1,
    label: 'Line Width',
    description: 'Width of the scan lines',
  },
  spacing: {
    type: 'number',
    default: 20,
    min: 5,
    max: 100,
    step: 5,
    label: 'Spacing',
    description: 'Spacing between lines',
  },
  fade: {
    type: 'boolean',
    default: true,
    label: 'Fade',
    description: 'Enable fade effect at edges',
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
 * Fragment shader GLSL code for Scan Lines effect
 */
export const scanLinesFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_direction;
uniform float u_lineWidth;
uniform float u_spacing;
uniform float u_fade;
uniform float u_intensity;

varying vec2 v_uv;
varying vec2 v_screen_pos;
varying float v_timeOffset;
varying float v_effectiveTime;

void main() {
  // Calculate pattern based on direction
  float coord;
  if (u_direction < 0.5) {
    // Horizontal
    coord = v_screen_pos.y;
  } else if (u_direction < 1.5) {
    // Vertical
    coord = v_screen_pos.x;
  } else {
    // Diagonal
    coord = (v_screen_pos.x + v_screen_pos.y) * 0.707;
  }

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Animate the pattern
  float phase = localTime * 50.0;
  float pattern = mod(coord + phase, u_spacing);

  // Create line pattern
  float lineAlpha = 1.0 - smoothstep(u_lineWidth * 0.5 - 1.0, u_lineWidth * 0.5 + 1.0, abs(pattern - u_spacing * 0.5));

  // Add scanning wave effect
  float scanWave = sin(localTime * 2.0) * 0.5 + 0.5;
  float scanPos = mod(v_uv.y + localTime * 0.3, 1.0);
  float scanHighlight = smoothstep(0.0, 0.1, scanPos) * smoothstep(0.2, 0.1, scanPos);

  // Combine with scan highlight
  float alpha = lineAlpha * 0.6 + scanHighlight * 0.4;

  // Apply fade at edges if enabled
  if (u_fade > 0.5) {
    float edgeFade = min(
      min(v_uv.x, 1.0 - v_uv.x),
      min(v_uv.y, 1.0 - v_uv.y)
    );
    alpha *= smoothstep(0.0, 0.15, edgeFade);
  }

  alpha *= u_intensity;

  gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
}
`;

/**
 * Scan Lines shader definition
 */
export const scanLinesShader: ShaderDefinition<ScanLinesConfig> = {
  name: 'scan-lines',
  displayName: 'Scan Lines',
  description: 'Animated scanning lines for analysis, processing, and selection effects',
  geometry: 'polygon',
  tags: ['analysis', 'processing', 'selection', 'animation', 'tech'],

  fragmentShader: scanLinesFragmentShader,

  defaultConfig: scanLinesDefaultConfig,
  configSchema: scanLinesConfigSchema,

  getUniforms: (config: ScanLinesConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : config.color;

    const directionMap: Record<string, number> = {
      horizontal: 0.0,
      vertical: 1.0,
      diagonal: 2.0,
    };

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_direction: directionMap[config.direction] ?? 0.0,
      u_lineWidth: config.lineWidth,
      u_spacing: config.spacing,
      u_fade: config.fade ? 1.0 : 0.0,
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default scanLinesShader;
