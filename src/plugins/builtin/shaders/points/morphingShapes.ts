/**
 * Morphing Shapes Shader - Fluid transition between geometric shapes
 *
 * Creates smooth morphing transitions between different geometric shapes
 * like circles, squares, triangles, and more.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Morphing Shapes shader
 */
export interface MorphingShapesConfig extends ShaderConfig {
  /** Shape color (hex or rgba) */
  color: string;
  /** Morphing speed */
  speed: number;
  /** Shape sequence (comma-separated: circle,square,triangle,hexagon,star) */
  shapes: string;
  /** Shape size in pixels */
  size: number;
  /** Easing function */
  easing: string;
  /** Hold duration on each shape (0-1 of cycle) */
  holdDuration: number;
  /** Rotation enabled */
  rotate: boolean;
  /** Stroke only (vs fill) */
  strokeOnly: boolean;
  /** Stroke width */
  strokeWidth: number;
}

/**
 * Default configuration for Morphing Shapes shader
 */
export const morphingShapesDefaultConfig: MorphingShapesConfig = {
  color: '#06b6d4',
  speed: 0.3,
  shapes: 'circle,square,triangle',
  size: 20,
  easing: 'easeInOutCubic',
  holdDuration: 0.2,
  rotate: false,
  strokeOnly: false,
  strokeWidth: 2,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const morphingShapesConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#06b6d4',
    label: 'Color',
    description: 'Shape color',
  },
  speed: {
    type: 'number',
    default: 0.3,
    min: 0.1,
    max: 2.0,
    step: 0.05,
    label: 'Speed',
    description: 'Morphing speed',
  },
  shapes: {
    type: 'string',
    default: 'circle,square,triangle',
    label: 'Shapes',
    description: 'Sequence: circle,square,triangle,hexagon,star',
  },
  size: {
    type: 'number',
    default: 20,
    min: 10,
    max: 80,
    step: 2,
    label: 'Size',
    description: 'Shape size in pixels',
  },
  easing: {
    type: 'select',
    default: 'easeInOutCubic',
    options: [
      'linear',
      'easeInOutQuad',
      'easeInOutCubic',
      'easeInOutSine',
      'easeInOutElastic',
      'easeInOutBounce',
    ],
    label: 'Easing',
    description: 'Transition easing function',
  },
  holdDuration: {
    type: 'number',
    default: 0.2,
    min: 0,
    max: 0.5,
    step: 0.05,
    label: 'Hold',
    description: 'Hold duration on each shape',
  },
  rotate: {
    type: 'boolean',
    default: false,
    label: 'Rotate',
    description: 'Enable rotation',
  },
  strokeOnly: {
    type: 'boolean',
    default: false,
    label: 'Stroke Only',
    description: 'Show stroke instead of fill',
  },
  strokeWidth: {
    type: 'number',
    default: 2,
    min: 1,
    max: 6,
    step: 0.5,
    label: 'Stroke Width',
    description: 'Width of stroke',
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
 * Fragment shader GLSL code for Morphing Shapes effect
 */
export const morphingShapesFragmentShader = `
precision highp float;

#define PI 3.14159265359
#define TWO_PI 6.28318530718

uniform float u_time;
uniform vec4 u_color;
uniform float u_size;
uniform float u_holdDuration;
uniform float u_rotate;
uniform float u_strokeOnly;
uniform float u_strokeWidth;
uniform float u_intensity;
uniform float u_shapeCount;
uniform float u_shape0;
uniform float u_shape1;
uniform float u_shape2;
uniform float u_shape3;
uniform float u_shape4;

varying vec2 v_pos;
varying float v_timeOffset;
varying float v_effectiveTime;

// Data-driven properties from vertex shader
varying vec4 v_color;
varying float v_intensity;
varying float v_useDataDrivenColor;
varying float v_useDataDrivenIntensity;

// Easing
float easeInOutCubic(float t) {
  return t < 0.5 ? 4.0 * t * t * t : (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0;
}

// 2D rotation
vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// SDF for circle
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

// SDF for box/square
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// SDF for equilateral triangle
float sdTriangle(vec2 p, float r) {
  const float k = sqrt(3.0);
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}

// SDF for regular polygon
float sdPolygon(vec2 p, float r, float n) {
  float an = PI / n;
  float en = PI / n;
  vec2 acs = vec2(cos(an), sin(an));
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p.y += clamp(-p.y, 0.0, r * acs.y);
  return length(p) * sign(p.x);
}

// SDF for star
float sdStar(vec2 p, float r, float n, float m) {
  float an = PI / n;
  float en = PI / m;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  return length(p) * sign(p.x);
}

// Get shape by index: 0=circle, 1=square, 2=triangle, 3=hexagon, 4=star
float getShapeSDF(vec2 p, float shapeType, float size) {
  if (shapeType < 0.5) return sdCircle(p, size);
  if (shapeType < 1.5) return sdBox(p, vec2(size * 0.85));
  if (shapeType < 2.5) return sdTriangle(p, size);
  if (shapeType < 3.5) return sdPolygon(p, size, 6.0);
  if (shapeType < 4.5) return sdStar(p, size, 5.0, 2.5);
  return sdCircle(p, size);
}

float getShape(float index) {
  if (index < 0.5) return u_shape0;
  if (index < 1.5) return u_shape1;
  if (index < 2.5) return u_shape2;
  if (index < 3.5) return u_shape3;
  if (index < 4.5) return u_shape4;
  return 0.0;
}

void main() {
  vec2 pos = v_pos * u_size;

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Apply rotation if enabled
  if (u_rotate > 0.5) {
    pos = rotate2D(pos, localTime * 0.5);
  }

  // Calculate which shapes we're morphing between
  float totalPhase = localTime;

  // Each shape gets (1 / shapeCount) of the cycle
  // With holdDuration, we split each segment into hold + transition
  float segmentDuration = 1.0 / u_shapeCount;
  float currentSegment = mod(totalPhase, 1.0) / segmentDuration;
  float currentShape = floor(currentSegment);
  float segmentProgress = fract(currentSegment);

  // Calculate morphing progress
  float morphProgress;
  if (segmentProgress < u_holdDuration) {
    // Holding on current shape
    morphProgress = 0.0;
  } else {
    // Transitioning to next shape
    morphProgress = (segmentProgress - u_holdDuration) / (1.0 - u_holdDuration);
    morphProgress = easeInOutCubic(morphProgress);
  }

  // Get current and next shape indices
  float nextShape = currentShape + 1.0;
  if (nextShape >= u_shapeCount) nextShape = 0.0;

  float shapeA = getShape(currentShape);
  float shapeB = getShape(nextShape);

  // Get SDFs for both shapes
  float sdfA = getShapeSDF(pos, shapeA, u_size * 0.5);
  float sdfB = getShapeSDF(pos, shapeB, u_size * 0.5);

  // Interpolate SDFs
  float sdf = mix(sdfA, sdfB, morphProgress);

  // Render
  float alpha;
  if (u_strokeOnly > 0.5) {
    // Stroke mode
    alpha = 1.0 - smoothstep(u_strokeWidth * 0.5 - 1.0, u_strokeWidth * 0.5 + 1.0, abs(sdf));
  } else {
    // Fill mode
    alpha = 1.0 - smoothstep(-1.0, 1.0, sdf);
  }

  // Use data-driven color/intensity if available, otherwise use uniform
  vec4 finalColor = mix(u_color, v_color, v_useDataDrivenColor);
  float finalIntensity = mix(u_intensity, v_intensity, v_useDataDrivenIntensity);

  gl_FragColor = vec4(finalColor.rgb, finalColor.a * alpha * finalIntensity);
}
`;

// Shape name to GLSL int mapping
const SHAPE_MAP: Record<string, number> = {
  circle: 0,
  square: 1,
  triangle: 2,
  hexagon: 3,
  star: 4,
};

const EASING_MAP: Record<string, number> = {
  linear: 0,
  easeInOutQuad: 3,
  easeInOutCubic: 6,
  easeInOutSine: 9,
  easeInOutElastic: 12,
  easeInOutBounce: 15,
};

/**
 * Morphing Shapes shader definition
 */
export const morphingShapesShader: ShaderDefinition<MorphingShapesConfig> = {
  name: 'morphing-shapes',
  displayName: 'Morphing Shapes',
  description:
    'Fluid transition between geometric shapes - perfect for dynamic categorization and status changes',
  geometry: 'point',
  tags: ['morph', 'shape', 'transform', 'category', 'status', 'geometric'],

  fragmentShader: morphingShapesFragmentShader,

  defaultConfig: morphingShapesDefaultConfig,
  configSchema: morphingShapesConfigSchema,

  getUniforms: (config: MorphingShapesConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string' ? hexToRgba(config.color) : config.color;

    // Parse shapes string
    const shapeNames = config.shapes.split(',').map((s) => s.trim().toLowerCase());
    const shapeIndices = shapeNames.map((name) => SHAPE_MAP[name] ?? 0);

    // Pad to 5 elements
    while (shapeIndices.length < 5) {
      shapeIndices.push(0);
    }

    const colorRgba = `rgba(${Math.round(rgba[0] * 255)}, ${Math.round(rgba[1] * 255)}, ${Math.round(rgba[2] * 255)}, ${config.intensity ?? 1})`;

    return {
      // MapLibre paint property uniforms
      u_radius: config.size / 2,
      u_color: colorRgba,
      u_opacity: config.intensity ?? 1,

      // Full GLSL uniforms
      u_time: time * config.speed,
      u_size: config.size,
      u_easing: EASING_MAP[config.easing] ?? 6,
      u_holdDuration: config.holdDuration,
      u_rotate: config.rotate ? 1.0 : 0.0,
      u_strokeOnly: config.strokeOnly ? 1.0 : 0.0,
      u_strokeWidth: config.strokeWidth,
      u_intensity: config.intensity ?? 1.0,
      u_color_vec4: rgba,
      u_shapeCount: Math.min(shapeIndices.length, 5),
      u_shape0: shapeIndices[0],
      u_shape1: shapeIndices[1],
      u_shape2: shapeIndices[2],
      u_shape3: shapeIndices[3],
      u_shape4: shapeIndices[4],
    };
  },

  requiredPaint: {
    'circle-pitch-alignment': 'map',
    'circle-opacity': 1,
  },
};

export default morphingShapesShader;
