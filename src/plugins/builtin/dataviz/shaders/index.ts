/**
 * Dataviz Shader Definitions
 *
 * Exports all shaders for the dataviz plugin.
 */

// Points shaders
export { pulseShader, pulseDefaultConfig, pulseConfigSchema } from './pulse';
export type { PulseConfig } from './pulse';

// Lines shaders
export { flowShader, flowDefaultConfig, flowConfigSchema } from './flow';
export type { FlowConfig } from './flow';

export {
  gradientTravelShader,
  gradientTravelDefaultConfig,
  gradientTravelConfigSchema,
} from './gradientTravel';
export type { GradientTravelConfig } from './gradientTravel';

export { snakeShader, snakeDefaultConfig, snakeConfigSchema } from './snake';
export type { SnakeConfig } from './snake';

// Polygons shaders
export { scanLinesShader, scanLinesDefaultConfig, scanLinesConfigSchema } from './scanLines';
export type { ScanLinesConfig } from './scanLines';

export { fillWaveShader, fillWaveDefaultConfig, fillWaveConfigSchema } from './fillWave';
export type { FillWaveConfig } from './fillWave';

export {
  marchingAntsShader,
  marchingAntsDefaultConfig,
  marchingAntsConfigSchema,
} from './marchingAnts';
export type { MarchingAntsConfig } from './marchingAnts';
