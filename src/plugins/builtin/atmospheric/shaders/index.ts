/**
 * Atmospheric Shaders Index
 * Exports all shaders for the atmospheric plugin
 */

export {
  heatShimmerShader,
  heatShimmerDefaultConfig,
  heatShimmerConfigSchema,
} from './heatShimmer';
export type { HeatShimmerConfig } from './heatShimmer';

export {
  dayNightCycleShader,
  dayNightCycleDefaultConfig,
  dayNightCycleConfigSchema,
} from './dayNightCycle';
export type { DayNightCycleConfig } from './dayNightCycle';

export { depthFogShader, depthFogDefaultConfig, depthFogConfigSchema } from './depthFog';
export type { DepthFogConfig } from './depthFog';

export { weatherShader, weatherDefaultConfig, weatherConfigSchema } from './weather';
export type { WeatherConfig } from './weather';

export { rippleShader, rippleDefaultConfig, rippleConfigSchema } from './ripple';
export type { RippleConfig } from './ripple';

export { noiseShader, noiseDefaultConfig, noiseConfigSchema } from './noise';
export type { NoiseConfig } from './noise';
