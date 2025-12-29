/**
 * Global effect shaders
 * Full-screen effects that overlay the entire map
 */

// Heat Shimmer
export {
  heatShimmerShader,
  heatShimmerDefaultConfig,
  heatShimmerConfigSchema,
  heatShimmerFragmentShader,
} from './heatShimmer';
export type { HeatShimmerConfig } from './heatShimmer';

// Day Night Cycle
export {
  dayNightCycleShader,
  dayNightCycleDefaultConfig,
  dayNightCycleConfigSchema,
  dayNightCycleFragmentShader,
} from './dayNightCycle';
export type { DayNightCycleConfig } from './dayNightCycle';

// Depth Fog
export {
  depthFogShader,
  depthFogDefaultConfig,
  depthFogConfigSchema,
  depthFogFragmentShader,
} from './depthFog';
export type { DepthFogConfig } from './depthFog';

// Weather
export {
  weatherShader,
  weatherDefaultConfig,
  weatherConfigSchema,
  weatherFragmentShader,
} from './weather';
export type { WeatherConfig, WeatherType } from './weather';

// Holographic Grid
export {
  holographicGridShader,
  holographicGridDefaultConfig,
  holographicGridConfigSchema,
  holographicGridFragmentShader,
} from './holographicGrid';
export type { HolographicGridConfig } from './holographicGrid';
