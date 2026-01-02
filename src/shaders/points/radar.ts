/**
 * Radar Shader - Rotating sweep arc around the point
 *
 * Creates a radar-like scanning effect with an arc that rotates
 * around the center, with optional grid lines and trail effect.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Radar shader
 */
export interface RadarConfig extends ShaderConfig {
  /** Sweep color (hex or rgba) */
  color: string;
  /** Rotation speed (turns per second) */
  speed: number;
  /** Arc angle in degrees */
  arcAngle: number;
  /** Radar radius in pixels */
  radius: number;
  /** Trail length (0-1) */
  trail: number;
  /** Number of concentric grid circles */
  gridLines: number;
  /** Show grid lines */
  showGrid: boolean;
  /** Grid color */
  gridColor: string;
}

/**
 * Default configuration for Radar shader
 */
export const radarDefaultConfig: RadarConfig = {
  color: '#22c55e',
  speed: 1.0,
  arcAngle: 60,
  radius: 40,
  trail: 0.5,
  gridLines: 3,
  showGrid: true,
  gridColor: '#22c55e',
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const radarConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#22c55e',
    label: 'Color',
    description: 'Color of the radar sweep',
  },
  speed: {
    type: 'number',
    default: 1.0,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    label: 'Speed',
    description: 'Rotation speed (turns per second)',
  },
  arcAngle: {
    type: 'number',
    default: 60,
    min: 10,
    max: 180,
    step: 5,
    label: 'Arc Angle',
    description: 'Sweep arc angle in degrees',
  },
  radius: {
    type: 'number',
    default: 40,
    min: 10,
    max: 150,
    step: 5,
    label: 'Radius',
    description: 'Radar radius in pixels',
  },
  trail: {
    type: 'number',
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.05,
    label: 'Trail',
    description: 'Trail length (0-1)',
  },
  gridLines: {
    type: 'number',
    default: 3,
    min: 0,
    max: 8,
    step: 1,
    label: 'Grid Lines',
    description: 'Number of concentric circles',
  },
  showGrid: {
    type: 'boolean',
    default: true,
    label: 'Show Grid',
    description: 'Display grid circles',
  },
  gridColor: {
    type: 'color',
    default: '#22c55e',
    label: 'Grid Color',
    description: 'Color of the grid lines',
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
 * Fragment shader GLSL code for Radar effect
 */
export const radarFragmentShader = `
precision highp float;

#define PI 3.14159265359
#define TWO_PI 6.28318530718

uniform float u_time;
uniform vec4 u_color;
uniform vec4 u_gridColor;
uniform float u_arcAngle;
uniform float u_radius;
uniform float u_trail;
uniform float u_gridLines;
uniform float u_showGrid;
uniform float u_intensity;

varying vec2 v_pos;
varying float v_timeOffset;
varying float v_effectiveTime;

// Data-driven properties from vertex shader
varying vec4 v_color;
varying float v_intensity;
varying float v_useDataDrivenColor;
varying float v_useDataDrivenIntensity;

float sdRing(vec2 p, float r, float w) {
  float d = length(p) - r;
  return abs(d) - w * 0.5;
}

void main() {
  vec2 pos = v_pos * u_radius;
  float dist = length(pos);

  // Outside the radar
  if (dist > u_radius) {
    discard;
  }

  float angle = atan(pos.y, pos.x);
  // Normalize angle to [0, TWO_PI]
  float normalizedAngle = angle < 0.0 ? angle + TWO_PI : angle;

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Current sweep angle
  float sweepAngle = fract(localTime) * TWO_PI;

  // Calculate angular distance from sweep
  float angleDiff = normalizedAngle - sweepAngle;
  if (angleDiff < 0.0) angleDiff += TWO_PI;

  // Arc angle in radians
  float arcRad = u_arcAngle * PI / 180.0;

  // Calculate sweep alpha (includes trail)
  float trailLength = u_trail * TWO_PI;
  float sweepAlpha = 0.0;

  if (angleDiff < arcRad) {
    // In the main arc
    sweepAlpha = 1.0;
  } else if (angleDiff < arcRad + trailLength) {
    // In the trail
    float trailProgress = (angleDiff - arcRad) / trailLength;
    sweepAlpha = 1.0 - trailProgress;
  }

  // Apply radial falloff
  float radialFade = 1.0 - (dist / u_radius) * 0.3;
  sweepAlpha *= radialFade;

  // Grid lines
  float gridAlpha = 0.0;
  if (u_showGrid > 0.5 && u_gridLines > 0.0) {
    // Concentric circles
    for (float i = 1.0; i <= 8.0; i++) {
      if (i > u_gridLines) break;
      float ringRadius = (i / (u_gridLines + 1.0)) * u_radius;
      float ringDist = sdRing(pos, ringRadius, 1.0);
      gridAlpha = max(gridAlpha, 1.0 - smoothstep(0.0, 1.5, ringDist));
    }

    // Cross lines (4 directions)
    float crossWidth = 0.5;
    float crossAlpha = 0.0;

    // Vertical line
    if (abs(pos.x) < crossWidth && dist < u_radius) {
      crossAlpha = max(crossAlpha, 0.3);
    }
    // Horizontal line
    if (abs(pos.y) < crossWidth && dist < u_radius) {
      crossAlpha = max(crossAlpha, 0.3);
    }

    gridAlpha = max(gridAlpha * 0.3, crossAlpha);
  }

  // Outer ring
  float outerRingDist = sdRing(pos, u_radius - 1.0, 2.0);
  float outerRingAlpha = (1.0 - smoothstep(0.0, 1.5, outerRingDist)) * 0.5;
  gridAlpha = max(gridAlpha, outerRingAlpha);

  // Center dot
  float centerDist = length(pos);
  float centerAlpha = 1.0 - smoothstep(2.0, 4.0, centerDist);

  // Use data-driven color/intensity if available, otherwise use uniform
  vec4 effectColor = mix(u_color, v_color, v_useDataDrivenColor);
  float effectIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  // Combine sweep and grid
  vec3 finalColor = effectColor.rgb * sweepAlpha + u_gridColor.rgb * gridAlpha * 0.5;
  float finalAlpha = max(sweepAlpha, gridAlpha * 0.5);
  finalAlpha = max(finalAlpha, centerAlpha * 0.8);

  gl_FragColor = vec4(finalColor, finalAlpha * effectIntensity * effectColor.a);
}
`;

/**
 * Radar shader definition
 */
export const radarShader: ShaderDefinition<RadarConfig> = {
  name: 'radar',
  displayName: 'Radar',
  description: 'Rotating sweep arc around the point - perfect for coverage zones, scanning, and search',
  geometry: 'point',
  tags: ['scan', 'sweep', 'coverage', 'search', 'detection', 'radar'],

  fragmentShader: radarFragmentShader,

  defaultConfig: radarDefaultConfig,
  configSchema: radarConfigSchema,

  getUniforms: (config: RadarConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : config.color;

    const gridRgba = typeof config.gridColor === 'string'
      ? hexToRgba(config.gridColor)
      : config.gridColor;

    const colorRgba = `rgba(${Math.round(rgba[0] * 255)}, ${Math.round(rgba[1] * 255)}, ${Math.round(rgba[2] * 255)}, ${config.intensity ?? 1})`;

    return {
      // MapLibre paint property uniforms
      u_radius: config.radius,
      u_color: colorRgba,
      u_opacity: config.intensity ?? 1,

      // Full GLSL uniforms
      u_time: time * config.speed,
      u_arcAngle: config.arcAngle,
      u_trail: config.trail,
      u_gridLines: config.gridLines,
      u_showGrid: config.showGrid ? 1.0 : 0.0,
      u_intensity: config.intensity ?? 1.0,
      u_color_vec4: rgba,
      u_gridColor: gridRgba,
    };
  },

  requiredPaint: {
    'circle-pitch-alignment': 'map',
    'circle-opacity': 1,
  },
};

export default radarShader;
