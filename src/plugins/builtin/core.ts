/**
 * Core Plugin
 *
 * Contains ALL built-in shaders for backwards compatibility.
 * Use this when you need access to all shaders without loading individual plugins.
 *
 * For smaller bundle sizes, prefer loading only the thematic plugins you need:
 * - dataviz: Data visualization, progress, status indicators
 * - atmospheric: Weather, environment, natural phenomena
 * - scifi: Futuristic, technological, cyberpunk aesthetics
 * - organic: Natural, living, breathing effects
 */

import type { ShaderPlugin, ShaderDefinition } from '../../types';
import {
  pulseShader,
  heartbeatShader,
  radarShader,
  particleBurstShader,
  glowShader,
  morphingShapesShader,
} from './shaders/points';
import {
  flowShader,
  gradientTravelShader,
  electricShader,
  trailFadeShader,
  breathingShader,
  snakeShader,
  neonShader,
} from './shaders/lines';
import {
  scanLinesShader,
  rippleShader,
  hatchingShader,
  fillWaveShader,
  noiseShader,
  marchingAntsShader,
  gradientRotationShader,
  dissolveShader,
} from './shaders/polygons';
import {
  heatShimmerShader,
  dayNightCycleShader,
  depthFogShader,
  weatherShader,
  holographicGridShader,
} from './shaders/global';

// Import presets from thematic plugins
import { datavizPlugin } from './dataviz';
import { atmosphericPlugin } from './atmospheric';
import { scifiPlugin } from './scifi';
import { organicPlugin } from './organic';

/**
 * Core Plugin - All 26 built-in shaders
 *
 * Point shaders (6):
 * - pulse, heartbeat, radar, particleBurst, glow, morphingShapes
 *
 * Line shaders (7):
 * - flow, gradientTravel, electric, trailFade, breathing, snake, neon
 *
 * Polygon shaders (8):
 * - scanLines, ripple, hatching, fillWave, noise, marchingAnts, gradientRotation, dissolve
 *
 * Global shaders (5):
 * - heatShimmer, dayNightCycle, depthFog, weather, holographicGrid
 */
export const corePlugin: ShaderPlugin = {
  name: 'core',
  version: '1.0.0',
  author: 'MapLibre Animated Shaders',
  description: 'All 26 built-in shaders bundled together',
  shaders: [
    // Point shaders
    pulseShader as unknown as ShaderDefinition,
    heartbeatShader as unknown as ShaderDefinition,
    radarShader as unknown as ShaderDefinition,
    particleBurstShader as unknown as ShaderDefinition,
    glowShader as unknown as ShaderDefinition,
    morphingShapesShader as unknown as ShaderDefinition,
    // Line shaders
    flowShader as unknown as ShaderDefinition,
    gradientTravelShader as unknown as ShaderDefinition,
    electricShader as unknown as ShaderDefinition,
    trailFadeShader as unknown as ShaderDefinition,
    breathingShader as unknown as ShaderDefinition,
    snakeShader as unknown as ShaderDefinition,
    neonShader as unknown as ShaderDefinition,
    // Polygon shaders
    scanLinesShader as unknown as ShaderDefinition,
    rippleShader as unknown as ShaderDefinition,
    hatchingShader as unknown as ShaderDefinition,
    fillWaveShader as unknown as ShaderDefinition,
    noiseShader as unknown as ShaderDefinition,
    marchingAntsShader as unknown as ShaderDefinition,
    gradientRotationShader as unknown as ShaderDefinition,
    dissolveShader as unknown as ShaderDefinition,
    // Global shaders
    heatShimmerShader as unknown as ShaderDefinition,
    dayNightCycleShader as unknown as ShaderDefinition,
    depthFogShader as unknown as ShaderDefinition,
    weatherShader as unknown as ShaderDefinition,
    holographicGridShader as unknown as ShaderDefinition,
  ],
  // Merge all presets from thematic plugins
  presets: {
    ...datavizPlugin.presets,
    ...atmosphericPlugin.presets,
    ...scifiPlugin.presets,
    ...organicPlugin.presets,
  },
};

export default corePlugin;
