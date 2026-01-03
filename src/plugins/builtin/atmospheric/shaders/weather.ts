/**
 * Weather Shader - Rain, snow, and leaves particle effects
 *
 * Creates falling particle effects for various weather conditions
 * like rain, snow, or autumn leaves.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Weather type options
 */
export type WeatherType = 'rain' | 'snow' | 'leaves';

/**
 * Configuration for the Weather shader
 */
export interface WeatherConfig extends ShaderConfig {
  /** Type of weather particles */
  type: WeatherType;
  /** Animation speed multiplier */
  speed: number;
  /** Particle density (number of particles) */
  density: number;
  /** Particle color */
  color: string;
  /** Wind angle in degrees (-90 to 90, 0 = straight down) */
  wind: number;
  /** Particle size */
  particleSize: number;
  /** Overall effect intensity */
  intensity: number;
}

/**
 * Default configuration for Weather shader
 */
export const weatherDefaultConfig: WeatherConfig = {
  type: 'rain',
  speed: 1.0,
  density: 100,
  color: '#94a3b8',
  wind: 0,
  particleSize: 2,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const weatherConfigSchema: ConfigSchema = {
  type: {
    type: 'select',
    default: 'rain',
    options: ['rain', 'snow', 'leaves'],
    label: 'Type',
    description: 'Type of weather effect',
  },
  speed: {
    type: 'number',
    default: 1.0,
    min: 0.1,
    max: 3.0,
    step: 0.1,
    label: 'Speed',
    description: 'Particle fall speed',
  },
  density: {
    type: 'number',
    default: 100,
    min: 10,
    max: 500,
    step: 10,
    label: 'Density',
    description: 'Number of particles',
  },
  color: {
    type: 'color',
    default: '#94a3b8',
    label: 'Color',
    description: 'Particle color',
  },
  wind: {
    type: 'number',
    default: 0,
    min: -45,
    max: 45,
    step: 5,
    label: 'Wind',
    description: 'Wind direction angle',
  },
  particleSize: {
    type: 'number',
    default: 2,
    min: 1,
    max: 10,
    step: 0.5,
    label: 'Particle Size',
    description: 'Size of particles',
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
 * Fragment shader GLSL code for Weather effect
 */
export const weatherFragmentShader = `
precision highp float;

uniform float u_time;
uniform vec4 u_color;
uniform float u_weatherType; // 0 = rain, 1 = snow, 2 = leaves
uniform float u_density;
uniform float u_wind;
uniform float u_particleSize;
uniform float u_intensity;
uniform vec2 u_resolution;

varying vec2 v_uv;

// Hash functions for randomness
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Rain drop
float rainDrop(vec2 uv, vec2 pos, float size, float time) {
  vec2 d = uv - pos;

  // Elongate for rain streaks
  float aspect = 8.0;
  d.y /= aspect;

  float dist = length(d);
  float drop = smoothstep(size, size * 0.5, dist);

  // Add motion blur / streak effect
  float streak = smoothstep(size * 4.0, size, abs(d.y) * aspect) * smoothstep(size, 0.0, abs(d.x));

  return max(drop, streak * 0.5);
}

// Snowflake
float snowFlake(vec2 uv, vec2 pos, float size, float time, float id) {
  vec2 d = uv - pos;
  float dist = length(d);

  // Add slight rotation
  float angle = time * 0.5 + id * 6.28;
  float wobble = sin(time * 2.0 + id * 3.14) * 0.3;

  // Basic circle with soft edge
  float flake = smoothstep(size, size * 0.3, dist);

  // Add sparkle effect
  float sparkle = sin(time * 5.0 + id * 10.0) * 0.3 + 0.7;

  return flake * sparkle;
}

// Leaf
float leaf(vec2 uv, vec2 pos, float size, float time, float id) {
  vec2 d = uv - pos;

  // Rotate based on time and id
  float angle = time * 1.5 + id * 3.14;
  float c = cos(angle);
  float s = sin(angle);
  d = vec2(d.x * c - d.y * s, d.x * s + d.y * c);

  // Elongated ellipse shape
  d.x *= 2.0;
  float dist = length(d);

  float leafShape = smoothstep(size * 1.5, size * 0.5, dist);

  return leafShape;
}

void main() {
  vec2 uv = v_uv;
  float aspectRatio = u_resolution.x / u_resolution.y;
  uv.x *= aspectRatio;

  float time = u_time;

  // Wind direction (convert degrees to radians)
  float windRad = u_wind * 3.14159 / 180.0;
  float windX = sin(windRad);
  float windY = cos(windRad);

  float particles = 0.0;
  float particleSize = u_particleSize / u_resolution.y;

  // Number of particle layers for depth
  int layers = 3;

  for (int layer = 0; layer < 3; layer++) {
    float layerDepth = 1.0 - float(layer) * 0.3;
    float layerSpeed = layerDepth;
    float layerSize = particleSize * layerDepth;
    float layerDensity = u_density * layerDepth;

    for (float i = 0.0; i < 200.0; i++) {
      if (i >= layerDensity) break;

      float id = i + float(layer) * 1000.0;

      // Random starting position
      float px = hash(id);
      float py = hash(id + 100.0);

      // Calculate falling position with wind
      float fallSpeed;
      float wobbleAmount;

      if (u_weatherType < 0.5) {
        // Rain - fast, minimal wobble
        fallSpeed = 2.0 + hash(id + 200.0) * 1.0;
        wobbleAmount = 0.01;
      } else if (u_weatherType < 1.5) {
        // Snow - slow, lots of wobble
        fallSpeed = 0.3 + hash(id + 200.0) * 0.3;
        wobbleAmount = 0.1;
      } else {
        // Leaves - medium speed, swaying
        fallSpeed = 0.5 + hash(id + 200.0) * 0.3;
        wobbleAmount = 0.15;
      }

      fallSpeed *= layerSpeed;

      // Position with time
      float t = time * fallSpeed * u_intensity;
      float posY = fract(py - t);

      // Horizontal position with wind and wobble
      float wobble = sin(t * 3.0 + id) * wobbleAmount;
      float posX = fract(px + windX * t * 0.2 + wobble);

      posX *= aspectRatio;

      vec2 particlePos = vec2(posX, posY);

      // Draw particle based on type
      float particle = 0.0;

      if (u_weatherType < 0.5) {
        // Rain
        particle = rainDrop(uv, particlePos, layerSize, time);
      } else if (u_weatherType < 1.5) {
        // Snow
        particle = snowFlake(uv, particlePos, layerSize * 2.0, time, id);
      } else {
        // Leaves
        particle = leaf(uv, particlePos, layerSize * 3.0, time, id);
      }

      particles += particle * layerDepth;
    }
  }

  // Clamp and apply intensity
  particles = clamp(particles, 0.0, 1.0) * u_intensity;

  // Apply color
  vec3 color = u_color.rgb;

  // For leaves, add some color variation
  if (u_weatherType > 1.5) {
    color = mix(color, vec3(0.8, 0.4, 0.1), 0.3);
  }

  gl_FragColor = vec4(color, particles * u_color.a);
}
`;

/**
 * Weather shader definition
 */
export const weatherShader: ShaderDefinition<WeatherConfig> = {
  name: 'weather',
  displayName: 'Weather',
  description: 'Rain, snow, or falling leaves particle effects - perfect for weather visualization',
  geometry: 'global',
  tags: ['weather', 'rain', 'snow', 'leaves', 'particles', 'atmosphere'],

  fragmentShader: weatherFragmentShader,

  defaultConfig: weatherDefaultConfig,
  configSchema: weatherConfigSchema,

  getUniforms: (config: WeatherConfig, time: number, _deltaTime: number) => {
    const color = hexToRgba(config.color);

    // Map weather type to number
    let weatherType = 0;
    if (config.type === 'snow') weatherType = 1;
    else if (config.type === 'leaves') weatherType = 2;

    return {
      u_time: time * config.speed,
      u_color: color,
      u_color_vec4: color,
      u_weatherType: weatherType,
      u_density: config.density,
      u_wind: config.wind,
      u_particleSize: config.particleSize,
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default weatherShader;
