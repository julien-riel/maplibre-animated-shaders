/**
 * Data Visualization Plugin
 *
 * Shaders optimized for data visualization, progress indicators,
 * status displays, and analytical overlays.
 */

import type { ShaderPlugin, ShaderDefinition } from '../../../types';
import { pulseShader } from './shaders';
import { flowShader, gradientTravelShader, snakeShader } from './shaders';
import { scanLinesShader, fillWaveShader, marchingAntsShader } from './shaders';

/**
 * Data Visualization Plugin
 *
 * Contains shaders for:
 * - pulse: Expanding rings for alerts and notifications
 * - flow: Animated dashes showing movement direction
 * - gradientTravel: Color gradient traveling along paths
 * - snake: Colored segment progressing along path
 * - scanLines: Scanning lines for data analysis effect
 * - fillWave: Progressive fill for loading/progress
 * - marchingAnts: Animated selection border
 */
export const datavizPlugin: ShaderPlugin = {
  name: 'dataviz',
  version: '1.0.0',
  author: 'MapLibre Animated Shaders',
  description: 'Shaders for data visualization, progress indicators, and status displays',
  shaders: [
    pulseShader as unknown as ShaderDefinition,
    flowShader as unknown as ShaderDefinition,
    gradientTravelShader as unknown as ShaderDefinition,
    snakeShader as unknown as ShaderDefinition,
    scanLinesShader as unknown as ShaderDefinition,
    fillWaveShader as unknown as ShaderDefinition,
    marchingAntsShader as unknown as ShaderDefinition,
  ],
  presets: {
    // Pulse presets
    'alert-critical': {
      shader: 'pulse',
      config: { color: '#ff0000', speed: 2.0, rings: 3, maxRadius: 40 },
    },
    'alert-warning': {
      shader: 'pulse',
      config: { color: '#ff9900', speed: 1.5, rings: 2, maxRadius: 30 },
    },
    'alert-info': {
      shader: 'pulse',
      config: { color: '#0099ff', speed: 1.0, rings: 2, maxRadius: 25 },
    },
    // Flow presets
    'traffic-flow': {
      shader: 'flow',
      config: { color: '#00ff00', speed: 1.0, dashLength: 0.1, gapLength: 0.05 },
    },
    'data-stream': {
      shader: 'flow',
      config: { color: '#00ffff', speed: 2.0, dashLength: 0.05, gapLength: 0.02 },
    },
    // Progress presets
    'loading-wave': {
      shader: 'fillWave',
      config: { color: '#0088ff', speed: 0.5, waveHeight: 0.1 },
    },
    'progress-fill': {
      shader: 'fillWave',
      config: { color: '#00cc00', speed: 0.3, waveHeight: 0.05 },
    },
    // Selection preset
    selection: {
      shader: 'marchingAnts',
      config: { color: '#000000', speed: 1.0, dashSize: 4, gapSize: 4 },
    },
  },
};

export default datavizPlugin;

// Re-export shaders for direct access
export {
  pulseShader,
  flowShader,
  gradientTravelShader,
  snakeShader,
  scanLinesShader,
  fillWaveShader,
  marchingAntsShader,
};
