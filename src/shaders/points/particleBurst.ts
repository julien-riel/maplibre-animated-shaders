/**
 * Particle Burst Shader - Particles emanating from center
 *
 * Creates an explosion-like effect with particles radiating outward
 * from the center point, with configurable count, spread, and gravity.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../types';
import { hexToRgba } from '../../utils/color';

/**
 * Configuration for the Particle Burst shader
 */
export interface ParticleBurstConfig extends ShaderConfig {
  /** Particle color (hex or rgba) */
  color: string;
  /** Emission speed */
  speed: number;
  /** Number of particles */
  particleCount: number;
  /** Spread angle in degrees */
  spread: number;
  /** Particle size in pixels */
  particleSize: number;
  /** Particle lifetime in seconds */
  lifetime: number;
  /** Gravity effect (0 = none, positive = down) */
  gravity: number;
  /** Maximum burst radius */
  maxRadius: number;
  /** Continuous emission vs single burst */
  continuous: boolean;
}

/**
 * Default configuration for Particle Burst shader
 */
export const particleBurstDefaultConfig: ParticleBurstConfig = {
  color: '#f59e0b',
  speed: 1.0,
  particleCount: 8,
  spread: 360,
  particleSize: 4,
  lifetime: 1.5,
  gravity: 0,
  maxRadius: 50,
  continuous: true,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const particleBurstConfigSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#f59e0b',
    label: 'Color',
    description: 'Color of the particles',
  },
  speed: {
    type: 'number',
    default: 1.0,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    label: 'Speed',
    description: 'Emission speed',
  },
  particleCount: {
    type: 'number',
    default: 8,
    min: 3,
    max: 24,
    step: 1,
    label: 'Particles',
    description: 'Number of particles',
  },
  spread: {
    type: 'number',
    default: 360,
    min: 30,
    max: 360,
    step: 15,
    label: 'Spread',
    description: 'Spread angle in degrees',
  },
  particleSize: {
    type: 'number',
    default: 4,
    min: 2,
    max: 12,
    step: 1,
    label: 'Particle Size',
    description: 'Size of each particle',
  },
  lifetime: {
    type: 'number',
    default: 1.5,
    min: 0.5,
    max: 4.0,
    step: 0.1,
    label: 'Lifetime',
    description: 'Particle lifetime in seconds',
  },
  gravity: {
    type: 'number',
    default: 0,
    min: -50,
    max: 50,
    step: 5,
    label: 'Gravity',
    description: 'Gravity effect (negative = up)',
  },
  maxRadius: {
    type: 'number',
    default: 50,
    min: 20,
    max: 120,
    step: 5,
    label: 'Max Radius',
    description: 'Maximum burst radius',
  },
  continuous: {
    type: 'boolean',
    default: true,
    label: 'Continuous',
    description: 'Continuous emission vs single burst',
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
 * Fragment shader GLSL code for Particle Burst effect
 */
export const particleBurstFragmentShader = `
precision highp float;

#define PI 3.14159265359
#define TWO_PI 6.28318530718

uniform float u_time;
uniform vec4 u_color;
uniform float u_particleCount;
uniform float u_spread;
uniform float u_particleSize;
uniform float u_lifetime;
uniform float u_gravity;
uniform float u_maxRadius;
uniform float u_continuous;
uniform float u_intensity;

varying vec2 v_pos;
varying float v_timeOffset;
varying float v_effectiveTime;

// Pseudo-random function
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 pos = v_pos * u_maxRadius;
  float alpha = 0.0;

  // Apply per-feature time offset for animation desynchronization
  float localTime = v_effectiveTime;

  // Convert spread to radians
  float spreadRad = u_spread * PI / 180.0;
  float startAngle = -spreadRad * 0.5 + PI * 0.5; // Start from top

  // Draw each particle
  for (float i = 0.0; i < 24.0; i++) {
    if (i >= u_particleCount) break;

    // Each particle has a unique random seed
    float seed = i * 17.31;

    // Staggered emission time for each particle (continuous mode)
    float emissionDelay = u_continuous > 0.5 ? hash(seed + 1.0) : 0.0;

    // Particle's individual time (with stagger)
    float particleTime = localTime - emissionDelay * u_lifetime;

    // Particle phase (0 to 1 over lifetime, loops)
    float phase = mod(particleTime / u_lifetime, 1.0);

    // Skip if particle hasn't been emitted yet
    if (particleTime < 0.0) continue;

    // Particle angle - evenly distributed with some randomness
    float baseAngle = startAngle + (i / u_particleCount) * spreadRad;
    float angleJitter = (hash(seed + 2.0) - 0.5) * 0.3;
    float particleAngle = baseAngle + angleJitter;

    // Particle speed variation (0.6 to 1.2)
    float speedVar = 0.6 + hash(seed + 3.0) * 0.6;

    // Calculate particle position at current phase
    // Use easing for more natural motion (ease out)
    float easedPhase = 1.0 - pow(1.0 - phase, 2.0);
    float distance = easedPhase * u_maxRadius * speedVar;

    // Apply gravity (quadratic for realistic arc)
    float gravityOffset = u_gravity * phase * phase * 0.5;

    vec2 particlePos = vec2(
      cos(particleAngle) * distance,
      sin(particleAngle) * distance - gravityOffset
    );

    // Particle size (shrinks towards end of life)
    float sizeFade = 1.0 - phase * 0.6;
    float size = u_particleSize * sizeFade;

    // Distance from this particle center
    float d = length(pos - particlePos);

    // Soft circle with glow
    float particleAlpha = 0.0;
    if (d < size * 2.0) {
      // Core (solid)
      float core = 1.0 - smoothstep(size * 0.5, size, d);
      // Glow (soft outer)
      float glow = (1.0 - smoothstep(size, size * 2.0, d)) * 0.5;
      particleAlpha = core + glow;
    }

    // Fade out over lifetime (faster at the end)
    float fadeOut = 1.0 - pow(phase, 1.5);
    particleAlpha *= fadeOut;

    // Accumulate alpha
    alpha = max(alpha, particleAlpha);
  }

  // Center glow (emission point)
  float centerGlow = exp(-length(pos) * 0.15) * 0.3;
  alpha = max(alpha, centerGlow);

  gl_FragColor = vec4(u_color.rgb, u_color.a * alpha * u_intensity);
}
`;

/**
 * Particle Burst shader definition
 */
export const particleBurstShader: ShaderDefinition<ParticleBurstConfig> = {
  name: 'particle-burst',
  displayName: 'Particle Burst',
  description: 'Particles emanating from center - perfect for events, impacts, and notifications',
  geometry: 'point',
  tags: ['explosion', 'burst', 'particle', 'event', 'impact', 'notification'],

  fragmentShader: particleBurstFragmentShader,

  defaultConfig: particleBurstDefaultConfig,
  configSchema: particleBurstConfigSchema,

  getUniforms: (config: ParticleBurstConfig, time: number, _deltaTime: number) => {
    const rgba = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : config.color;

    const colorRgba = `rgba(${Math.round(rgba[0] * 255)}, ${Math.round(rgba[1] * 255)}, ${Math.round(rgba[2] * 255)}, ${config.intensity ?? 1})`;

    return {
      // MapLibre paint property uniforms
      u_radius: config.maxRadius,
      u_color: colorRgba,
      u_opacity: config.intensity ?? 1,

      // Full GLSL uniforms
      u_time: time * config.speed,
      u_particleCount: config.particleCount,
      u_spread: config.spread,
      u_particleSize: config.particleSize,
      u_lifetime: config.lifetime,
      u_gravity: config.gravity,
      u_maxRadius: config.maxRadius,
      u_continuous: config.continuous ? 1.0 : 0.0,
      u_intensity: config.intensity ?? 1.0,
      u_color_vec4: rgba,
    };
  },

  requiredPaint: {
    'circle-pitch-alignment': 'map',
    'circle-opacity': 1,
  },
};

export default particleBurstShader;
