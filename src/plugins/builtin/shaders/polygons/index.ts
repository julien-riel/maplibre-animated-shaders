/**
 * Polygon Shaders - Phase 4
 *
 * Animated shaders for polygon/fill geometries including
 * scan lines, ripples, hatching, and more.
 */

// Export all polygon shaders
export { scanLinesShader, scanLinesDefaultConfig, scanLinesConfigSchema } from './scanLines';
export type { ScanLinesConfig } from './scanLines';

export { rippleShader, rippleDefaultConfig, rippleConfigSchema } from './ripple';
export type { RippleConfig } from './ripple';

export { hatchingShader, hatchingDefaultConfig, hatchingConfigSchema } from './hatching';
export type { HatchingConfig } from './hatching';

export { fillWaveShader, fillWaveDefaultConfig, fillWaveConfigSchema } from './fillWave';
export type { FillWaveConfig } from './fillWave';

export { noiseShader, noiseDefaultConfig, noiseConfigSchema } from './noise';
export type { NoiseConfig } from './noise';

export { marchingAntsShader, marchingAntsDefaultConfig, marchingAntsConfigSchema } from './marchingAnts';
export type { MarchingAntsConfig } from './marchingAnts';

export { gradientRotationShader, gradientRotationDefaultConfig, gradientRotationConfigSchema } from './gradientRotation';
export type { GradientRotationConfig } from './gradientRotation';

export { dissolveShader, dissolveDefaultConfig, dissolveConfigSchema } from './dissolve';
export type { DissolveConfig } from './dissolve';
