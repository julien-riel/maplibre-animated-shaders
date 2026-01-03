/**
 * Atmospheric Plugin
 *
 * Shaders for weather effects, environmental phenomena,
 * and natural atmospheric conditions.
 */

import type { ShaderPlugin, ShaderDefinition } from '../../../types';
import {
  heatShimmerShader,
  dayNightCycleShader,
  depthFogShader,
  weatherShader,
  rippleShader,
  noiseShader,
} from './shaders';

/**
 * Atmospheric Plugin
 *
 * Contains shaders for:
 * - heatShimmer: Heat distortion/mirage effect
 * - weather: Rain, snow, and falling leaves particles
 * - depthFog: Animated fog based on zoom level
 * - dayNightCycle: Day/night lighting variation
 * - ripple: Water ripples expanding from center
 * - noise: Animated Simplex/Perlin noise texture
 */
export const atmosphericPlugin: ShaderPlugin = {
  name: 'atmospheric',
  version: '1.0.0',
  author: 'MapLibre Animated Shaders',
  description: 'Shaders for weather effects and environmental phenomena',
  shaders: [
    heatShimmerShader as unknown as ShaderDefinition,
    weatherShader as unknown as ShaderDefinition,
    depthFogShader as unknown as ShaderDefinition,
    dayNightCycleShader as unknown as ShaderDefinition,
    rippleShader as unknown as ShaderDefinition,
    noiseShader as unknown as ShaderDefinition,
  ],
  presets: {
    // Weather presets
    'rain-light': {
      shader: 'weather',
      config: { type: 'rain', intensity: 0.3, speed: 1.0, color: '#aaccff' },
    },
    'rain-heavy': {
      shader: 'weather',
      config: { type: 'rain', intensity: 1.0, speed: 1.5, color: '#8899bb' },
    },
    'snow-gentle': {
      shader: 'weather',
      config: { type: 'snow', intensity: 0.5, speed: 0.3, color: '#ffffff' },
    },
    'snow-blizzard': {
      shader: 'weather',
      config: { type: 'snow', intensity: 1.0, speed: 0.8, color: '#eeeeff' },
    },
    'autumn-leaves': {
      shader: 'weather',
      config: { type: 'leaves', intensity: 0.4, speed: 0.4, color: '#cc6600' },
    },
    // Fog presets
    'morning-mist': {
      shader: 'depthFog',
      config: { color: '#ffffff', density: 0.3, speed: 0.1 },
    },
    'dense-fog': {
      shader: 'depthFog',
      config: { color: '#cccccc', density: 0.8, speed: 0.05 },
    },
    // Heat presets
    'desert-heat': {
      shader: 'heatShimmer',
      config: { intensity: 1.0, speed: 0.5, distortion: 0.02 },
    },
    'mild-shimmer': {
      shader: 'heatShimmer',
      config: { intensity: 0.3, speed: 0.3, distortion: 0.01 },
    },
    // Water presets
    'calm-water': {
      shader: 'ripple',
      config: { color: '#0066cc', speed: 0.5, rings: 3, intensity: 0.5 },
    },
    'pond-ripple': {
      shader: 'ripple',
      config: { color: '#004488', speed: 1.0, rings: 5, intensity: 0.8 },
    },
    // Day/night
    'day-cycle': {
      shader: 'dayNightCycle',
      config: { speed: 0.1, dayColor: '#ffffee', nightColor: '#001133' },
    },
  },
};

export default atmosphericPlugin;

// Re-export shader types and configs
export * from './shaders';
