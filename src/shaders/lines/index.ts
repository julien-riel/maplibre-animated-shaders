/**
 * Line shaders barrel export
 * Phase 3: All shaders for line geometry
 */

// Flow shader - Animated dashes
export {
  flowShader,
  flowDefaultConfig,
  flowConfigSchema,
  flowFragmentShader,
} from './flow';
export type { FlowConfig } from './flow';

// Gradient Travel shader - Moving gradient
export {
  gradientTravelShader,
  gradientTravelDefaultConfig,
  gradientTravelConfigSchema,
  gradientTravelFragmentShader,
} from './gradientTravel';
export type { GradientTravelConfig } from './gradientTravel';

// Electric shader - Plasma/electric effect
export {
  electricShader,
  electricDefaultConfig,
  electricConfigSchema,
  electricFragmentShader,
} from './electric';
export type { ElectricConfig } from './electric';

// Trail Fade shader - Fading trail
export {
  trailFadeShader,
  trailFadeDefaultConfig,
  trailFadeConfigSchema,
  trailFadeFragmentShader,
} from './trailFade';
export type { TrailFadeConfig } from './trailFade';

// Breathing shader - Pulsing width
export {
  breathingShader,
  breathingDefaultConfig,
  breathingConfigSchema,
  breathingFragmentShader,
} from './breathing';
export type { BreathingConfig } from './breathing';

// Snake shader - Moving segment
export {
  snakeShader,
  snakeDefaultConfig,
  snakeConfigSchema,
  snakeFragmentShader,
} from './snake';
export type { SnakeConfig } from './snake';

// Neon shader - Neon glow with flicker
export {
  neonShader,
  neonDefaultConfig,
  neonConfigSchema,
  neonFragmentShader,
} from './neon';
export type { NeonConfig } from './neon';
