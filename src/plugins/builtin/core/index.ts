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

import type { ShaderPlugin, ShaderDefinition } from '../../../types';

// Import thematic plugins
import { datavizPlugin } from '../dataviz';
import { atmosphericPlugin } from '../atmospheric';
import { scifiPlugin } from '../scifi';
import { organicPlugin } from '../organic';

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
    // Dataviz shaders
    ...datavizPlugin.shaders,
    // Atmospheric shaders
    ...atmosphericPlugin.shaders,
    // Scifi shaders
    ...scifiPlugin.shaders,
    // Organic shaders
    ...organicPlugin.shaders,
  ].filter(
    // Remove duplicates (some shaders might be in multiple plugins)
    (shader, index, self) =>
      index ===
      self.findIndex((s) => (s as ShaderDefinition).name === (shader as ShaderDefinition).name)
  ),
  // Merge all presets from thematic plugins
  presets: {
    ...datavizPlugin.presets,
    ...atmosphericPlugin.presets,
    ...scifiPlugin.presets,
    ...organicPlugin.presets,
  },
};

export default corePlugin;
