/**
 * Line Shader - Flow Line
 *
 * Demonstrates all features for line geometry:
 * - Per-feature timing offset
 * - Data-driven color/intensity/speed
 * - Direction control
 * - Gradient effects
 * - Presets
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Line shader
 */
export interface LineConfig extends ShaderConfig {
  /** Dash color (hex or rgba) */
  color: string;
  /** Animation speed multiplier */
  speed: number;
  /** Length of dashes (0-1 ratio) */
  dashLength: number;
  /** Length of gaps (0-1 ratio) */
  gapLength: number;
  /** Flow direction: forward or backward */
  direction: 'forward' | 'backward';
  /** Apply gradient fade to each dash */
  gradient: boolean;
  /** Trail glow effect */
  glow: boolean;
  /** Line width in pixels */
  width: number;
}

/**
 * Default configuration
 */
export const lineDefaultConfig: LineConfig = {
  color: '#10b981',
  speed: 1.0,
  dashLength: 0.15,
  gapLength: 0.1,
  direction: 'forward',
  gradient: true,
  glow: false,
  width: 4,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const lineConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#10b981',
    label: 'Color',
    description: 'Color of the flowing dashes',
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
  dashLength: {
    type: 'number',
    default: 0.15,
    min: 0.05,
    max: 0.5,
    step: 0.01,
    label: 'Dash Length',
    description: 'Length of dashes (ratio)',
  },
  gapLength: {
    type: 'number',
    default: 0.1,
    min: 0.02,
    max: 0.5,
    step: 0.01,
    label: 'Gap Length',
    description: 'Length of gaps between dashes',
  },
  direction: {
    type: 'select',
    default: 'forward',
    options: ['forward', 'backward'],
    label: 'Direction',
    description: 'Flow direction along the line',
  },
  gradient: {
    type: 'boolean',
    default: true,
    label: 'Gradient',
    description: 'Apply gradient fade to each dash',
  },
  glow: {
    type: 'boolean',
    default: false,
    label: 'Glow',
    description: 'Add glow effect around dashes',
  },
  width: {
    type: 'number',
    default: 4,
    min: 1,
    max: 20,
    step: 1,
    label: 'Width',
    description: 'Line width in pixels',
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
export const lineFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_dashLength;
uniform float u_gapLength;
uniform float u_direction;
uniform float u_gradient;
uniform float u_glow;
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

// ============================================
// GLSL UTILITY: Smoothstep for anti-aliasing
// ============================================

float antiAlias(float edge, float dist, float width) {
  float aa = 1.5 / width;
  return 1.0 - smoothstep(edge - aa, edge, dist);
}

void main() {
  // Calculate perpendicular distance from line center
  float dist = abs(v_pos.y);

  // ============================================
  // Anti-aliased line edge
  // ============================================
  float aa = 1.5 / u_width;
  float lineAlpha = 1.0 - smoothstep(1.0 - aa, 1.0, dist);

  // ============================================
  // FEATURE: Per-feature timing offset
  // Each line segment animates at different phases
  // ============================================
  float localTime = v_effectiveTime;

  // ============================================
  // Calculate dash pattern using fract()
  // ============================================
  float cycleLength = u_dashLength + u_gapLength;
  float phase = localTime * u_direction; // Direction: 1 or -1
  float position = v_progress + phase;

  // Wrap position to cycle using fract
  float cyclePos = fract(position / cycleLength) * cycleLength;

  // Dash visibility using smoothstep for soft edges
  float dashAlpha = 0.0;
  float dashEdge = 0.01;

  if (cyclePos < u_dashLength) {
    dashAlpha = 1.0;

    // Soft edges on dash
    dashAlpha *= smoothstep(0.0, dashEdge, cyclePos);
    dashAlpha *= smoothstep(0.0, dashEdge, u_dashLength - cyclePos);

    // ============================================
    // FEATURE: Gradient within dash
    // ============================================
    if (u_gradient > 0.5) {
      float dashProgress = cyclePos / u_dashLength;
      // Fade from bright head to dim tail
      dashAlpha *= 1.0 - dashProgress * 0.7;
    }
  }

  // ============================================
  // FEATURE: Glow effect
  // ============================================
  float glowAlpha = 0.0;
  if (u_glow > 0.5) {
    // Expand detection range for glow
    float glowCyclePos = fract((position - u_gapLength * 0.5) / cycleLength) * cycleLength;
    float glowRange = u_dashLength + u_gapLength * 0.5;

    if (glowCyclePos < glowRange) {
      float glowDist = abs(glowCyclePos - u_dashLength * 0.5);
      glowAlpha = exp(-glowDist * 5.0) * 0.3;
    }

    // Add perpendicular glow
    float perpGlow = exp(-dist * 3.0) * 0.2;
    glowAlpha = max(glowAlpha, perpGlow * dashAlpha);
  }

  // Combine dash and glow
  float combinedAlpha = dashAlpha + glowAlpha;

  // Final alpha with line edge
  float alpha = lineAlpha * combinedAlpha * u_intensity;

  // ============================================
  // FEATURE: Data-driven expressions
  // Color and intensity can come from feature properties
  // ============================================
  vec4 finalColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  // Apply glow color boost
  if (u_glow > 0.5 && glowAlpha > 0.0) {
    finalColor.rgb = mix(finalColor.rgb, vec3(1.0), glowAlpha * 0.5);
  }

  gl_FragColor = vec4(finalColor.rgb, finalColor.a * alpha * finalIntensity / u_intensity);
}
`;

/**
 * Line shader definition
 */
export const lineShader: ShaderDefinition<LineConfig> = {
  name: 'line',
  displayName: 'Flow Line',
  description:
    'Animated dashes flowing along lines - demonstrates per-feature timing, data-driven expressions, direction control, and gradient effects',
  geometry: 'line',
  tags: ['example', 'line', 'flow', 'traffic', 'pipeline', 'animation'],

  fragmentShader: lineFragmentShader,

  defaultConfig: lineDefaultConfig,
  configSchema: lineConfigSchema,

  getUniforms: (config: LineConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string' ? hexToRgba(config.color) : config.color;

    return {
      u_time: time * config.speed,
      u_color: rgba,
      u_color_vec4: rgba,
      u_dashLength: config.dashLength,
      u_gapLength: config.gapLength,
      u_direction: config.direction === 'forward' ? 1.0 : -1.0,
      u_gradient: config.gradient ? 1.0 : 0.0,
      u_glow: config.glow ? 1.0 : 0.0,
      u_intensity: config.intensity ?? 1.0,
      u_width: config.width,
    };
  },

  requiredLayout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

export default lineShader;
