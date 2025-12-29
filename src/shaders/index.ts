/**
 * Shader exports
 * Each shader category exports its shaders here
 */

// Points shaders (Phase 1-2)
export * from './points';

// Lines shaders (Phase 3)
export * from './lines';

// Polygons shaders (Phase 4)
// export * from './polygons';

// Global effects (Phase 5)
// export * from './global';

import { globalRegistry } from '../ShaderRegistry';
import type { ShaderDefinition } from '../types';
import {
  pulseShader,
  heartbeatShader,
  radarShader,
  particleBurstShader,
  glowShader,
  morphingShapesShader,
} from './points';
import {
  flowShader,
  gradientTravelShader,
  electricShader,
  trailFadeShader,
  breathingShader,
  snakeShader,
  neonShader,
} from './lines';

/**
 * Register all built-in shaders with the global registry
 */
export function registerAllShaders(): void {
  // Points (Phase 1)
  globalRegistry.register(pulseShader as unknown as ShaderDefinition);

  // Points (Phase 2)
  globalRegistry.register(heartbeatShader as unknown as ShaderDefinition);
  globalRegistry.register(radarShader as unknown as ShaderDefinition);
  globalRegistry.register(particleBurstShader as unknown as ShaderDefinition);
  globalRegistry.register(glowShader as unknown as ShaderDefinition);
  globalRegistry.register(morphingShapesShader as unknown as ShaderDefinition);

  // Lines (Phase 3)
  globalRegistry.register(flowShader as unknown as ShaderDefinition);
  globalRegistry.register(gradientTravelShader as unknown as ShaderDefinition);
  globalRegistry.register(electricShader as unknown as ShaderDefinition);
  globalRegistry.register(trailFadeShader as unknown as ShaderDefinition);
  globalRegistry.register(breathingShader as unknown as ShaderDefinition);
  globalRegistry.register(snakeShader as unknown as ShaderDefinition);
  globalRegistry.register(neonShader as unknown as ShaderDefinition);

  // Polygons (Phase 4)
  // globalRegistry.register(rippleShader);

  // Global (Phase 5)
  // globalRegistry.register(heatShimmerShader);
}
