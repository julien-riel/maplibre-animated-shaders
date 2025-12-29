/**
 * Shader exports
 * Each shader category exports its shaders here
 */

// Points shaders (Phase 1-2)
export * from './points';

// Lines shaders (Phase 3)
export * from './lines';

// Polygons shaders (Phase 4)
export * from './polygons';

// Global effects (Phase 5)
export * from './global';

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
import {
  scanLinesShader,
  rippleShader,
  hatchingShader,
  fillWaveShader,
  noiseShader,
  marchingAntsShader,
  gradientRotationShader,
  dissolveShader,
} from './polygons';
import {
  heatShimmerShader,
  dayNightCycleShader,
  depthFogShader,
  weatherShader,
  holographicGridShader,
} from './global';

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
  globalRegistry.register(scanLinesShader as unknown as ShaderDefinition);
  globalRegistry.register(rippleShader as unknown as ShaderDefinition);
  globalRegistry.register(hatchingShader as unknown as ShaderDefinition);
  globalRegistry.register(fillWaveShader as unknown as ShaderDefinition);
  globalRegistry.register(noiseShader as unknown as ShaderDefinition);
  globalRegistry.register(marchingAntsShader as unknown as ShaderDefinition);
  globalRegistry.register(gradientRotationShader as unknown as ShaderDefinition);
  globalRegistry.register(dissolveShader as unknown as ShaderDefinition);

  // Global (Phase 5)
  globalRegistry.register(heatShimmerShader as unknown as ShaderDefinition);
  globalRegistry.register(dayNightCycleShader as unknown as ShaderDefinition);
  globalRegistry.register(depthFogShader as unknown as ShaderDefinition);
  globalRegistry.register(weatherShader as unknown as ShaderDefinition);
  globalRegistry.register(holographicGridShader as unknown as ShaderDefinition);
}
