/**
 * Day Night Cycle Shader - Simulates day/night lighting transitions
 *
 * Creates an overlay that modulates the map's apparent lighting
 * to simulate different times of day, from bright noon to dark midnight.
 */

import type { ShaderConfig, ShaderDefinition, ConfigSchema } from '../../../../types';
import { hexToRgba } from '../../../../utils/color';

/**
 * Configuration for the Day Night Cycle shader
 */
export interface DayNightCycleConfig extends ShaderConfig {
  /** Animation speed multiplier */
  speed: number;
  /** Time of day (0 = midnight, 0.5 = noon, 1 = midnight) */
  timeOfDay: number;
  /** Ambient light color during day */
  ambientDay: string;
  /** Ambient light color during night */
  ambientNight: string;
  /** Sun/moon color tint */
  sunColor: string;
  /** Shadow intensity (0-1) */
  shadowIntensity: number;
}

/**
 * Default configuration for Day Night Cycle shader
 */
export const dayNightCycleDefaultConfig: DayNightCycleConfig = {
  speed: 0.1,
  timeOfDay: 0.5,
  ambientDay: '#ffffff',
  ambientNight: '#1e3a5f',
  sunColor: '#fef3c7',
  shadowIntensity: 0.3,
  intensity: 1.0,
  enabled: true,
};

/**
 * Configuration schema for validation and UI generation
 */
export const dayNightCycleConfigSchema: ConfigSchema = {
  speed: {
    type: 'number',
    default: 0.1,
    min: 0.0,
    max: 1.0,
    step: 0.01,
    label: 'Speed',
    description: 'Speed of the day/night cycle (0 = static)',
  },
  timeOfDay: {
    type: 'number',
    default: 0.5,
    min: 0.0,
    max: 1.0,
    step: 0.01,
    label: 'Time of Day',
    description: '0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset',
  },
  ambientDay: {
    type: 'color',
    default: '#ffffff',
    label: 'Day Ambient',
    description: 'Ambient light color during day',
  },
  ambientNight: {
    type: 'color',
    default: '#1e3a5f',
    label: 'Night Ambient',
    description: 'Ambient light color during night',
  },
  sunColor: {
    type: 'color',
    default: '#fef3c7',
    label: 'Sun Color',
    description: 'Color tint from the sun',
  },
  shadowIntensity: {
    type: 'number',
    default: 0.3,
    min: 0.0,
    max: 1.0,
    step: 0.05,
    label: 'Shadow Intensity',
    description: 'How dark shadows appear at night',
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
 * Fragment shader GLSL code for Day Night Cycle effect
 */
export const dayNightCycleFragmentShader = `
precision highp float;

uniform float u_time;
uniform float u_timeOfDay;
uniform float u_speed;
uniform vec4 u_ambientDay;
uniform vec4 u_ambientNight;
uniform vec4 u_sunColor;
uniform float u_shadowIntensity;
uniform float u_intensity;
uniform vec2 u_resolution;

varying vec2 v_uv;

// Stars
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float stars(vec2 uv, float density) {
  vec2 id = floor(uv * density);
  float star = hash(id);
  star = step(0.995, star);

  vec2 center = id / density + 0.5 / density;
  float dist = length(uv - center);
  star *= smoothstep(0.01, 0.0, dist);

  // Twinkle
  star *= 0.5 + 0.5 * sin(u_time * 2.0 + hash(id) * 6.28);

  return star;
}

void main() {
  vec2 uv = v_uv;

  // Calculate animated time of day
  float time = u_timeOfDay;
  if (u_speed > 0.0) {
    time = fract(u_timeOfDay + u_time * u_speed * 0.1);
  }

  // Convert time to sun position (0 = midnight, 0.5 = noon)
  // Create smooth transitions
  float sunAngle = time * 2.0 * 3.14159; // 0 to 2PI
  float sunHeight = sin(sunAngle); // -1 to 1

  // Daylight factor (0 = night, 1 = day)
  float daylight = smoothstep(-0.2, 0.3, sunHeight);

  // Sunrise/sunset factor (peaks at dawn/dusk)
  float twilight = 1.0 - abs(sunHeight);
  twilight = smoothstep(0.6, 1.0, twilight) * (1.0 - abs(daylight - 0.5) * 2.0);

  // Mix ambient colors based on daylight
  vec3 ambient = mix(u_ambientNight.rgb, u_ambientDay.rgb, daylight);

  // Add warm tint during sunrise/sunset
  vec3 twilightColor = mix(vec3(1.0, 0.5, 0.2), vec3(1.0, 0.3, 0.5), time > 0.5 ? 1.0 : 0.0);
  ambient = mix(ambient, twilightColor, twilight * 0.5);

  // Calculate overlay opacity
  // At noon (full daylight), effect is minimal
  // At night, effect is maximal
  float overlayStrength = 1.0 - daylight;
  overlayStrength = mix(0.1, 0.7, overlayStrength);

  // Add subtle gradient (sky is lighter than ground at twilight)
  float skyGradient = smoothstep(0.0, 1.0, uv.y);
  float gradientEffect = mix(1.0, skyGradient * 0.3 + 0.7, twilight);
  ambient *= gradientEffect;

  // Add stars at night
  float nightFactor = 1.0 - daylight;
  float starLayer1 = stars(uv * 2.0, 50.0);
  float starLayer2 = stars(uv * 2.0 + 0.5, 100.0) * 0.5;
  float starBrightness = (starLayer1 + starLayer2) * nightFactor * nightFactor;
  ambient += vec3(starBrightness);

  // Calculate final alpha based on intensity and time
  float alpha = overlayStrength * u_intensity;

  // Blend mode: multiply for darkening, add for stars
  // Output as colored overlay
  gl_FragColor = vec4(ambient, alpha);
}
`;

/**
 * Day Night Cycle shader definition
 */
export const dayNightCycleShader: ShaderDefinition<DayNightCycleConfig> = {
  name: 'dayNightCycle',
  displayName: 'Day Night Cycle',
  description: 'Simulates day/night lighting transitions with sunrise and sunset effects',
  geometry: 'global',
  tags: ['lighting', 'atmosphere', 'time', 'day', 'night', 'sunset', 'sunrise'],

  fragmentShader: dayNightCycleFragmentShader,

  defaultConfig: dayNightCycleDefaultConfig,
  configSchema: dayNightCycleConfigSchema,

  getUniforms: (config: DayNightCycleConfig, time: number, _deltaTime: number) => {
    const ambientDay = hexToRgba(config.ambientDay);
    const ambientNight = hexToRgba(config.ambientNight);
    const sunColor = hexToRgba(config.sunColor);

    return {
      u_time: time,
      u_speed: config.speed,
      u_timeOfDay: config.timeOfDay,
      u_ambientDay: ambientDay,
      u_ambientNight: ambientNight,
      u_sunColor: sunColor,
      u_shadowIntensity: config.shadowIntensity,
      u_intensity: config.intensity ?? 1.0,
    };
  },
};

export default dayNightCycleShader;
