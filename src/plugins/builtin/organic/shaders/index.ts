/**
 * Organic Shaders Index
 * Exports all shaders for the organic plugin
 */

// Point shaders
export { heartbeatShader, heartbeatDefaultConfig, heartbeatConfigSchema } from './heartbeat';
export type { HeartbeatConfig } from './heartbeat';

export {
  particleBurstShader,
  particleBurstDefaultConfig,
  particleBurstConfigSchema,
} from './particleBurst';
export type { ParticleBurstConfig } from './particleBurst';

export {
  morphingShapesShader,
  morphingShapesDefaultConfig,
  morphingShapesConfigSchema,
} from './morphingShapes';
export type { MorphingShapesConfig } from './morphingShapes';

// Line shaders
export { breathingShader, breathingDefaultConfig, breathingConfigSchema } from './breathing';
export type { BreathingConfig } from './breathing';

export { trailFadeShader, trailFadeDefaultConfig, trailFadeConfigSchema } from './trailFade';
export type { TrailFadeConfig } from './trailFade';

// Polygon shaders
export { dissolveShader, dissolveDefaultConfig, dissolveConfigSchema } from './dissolve';
export type { DissolveConfig } from './dissolve';

export { hatchingShader, hatchingDefaultConfig, hatchingConfigSchema } from './hatching';
export type { HatchingConfig } from './hatching';

export {
  gradientRotationShader,
  gradientRotationDefaultConfig,
  gradientRotationConfigSchema,
} from './gradientRotation';
export type { GradientRotationConfig } from './gradientRotation';
