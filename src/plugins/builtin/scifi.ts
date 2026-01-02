/**
 * Sci-Fi Plugin
 *
 * Shaders for futuristic, technological, and cyberpunk aesthetics.
 * Perfect for dashboards, gaming maps, and tech-themed applications.
 */

import type { ShaderPlugin, ShaderDefinition } from '../../types';
import { radarShader, glowShader } from '../../shaders/points';
import { electricShader, neonShader } from '../../shaders/lines';
import { holographicGridShader } from '../../shaders/global';

/**
 * Sci-Fi Plugin
 *
 * Contains shaders for:
 * - holographicGrid: Pulsing sci-fi grid overlay
 * - electric: Sinusoidal plasma/electric distortion
 * - neon: Neon glow effect with flicker
 * - radar: Rotating sweep arc with trail
 * - glow: Luminous halo with variable intensity
 */
export const scifiPlugin: ShaderPlugin = {
  name: 'scifi',
  version: '1.0.0',
  author: 'MapLibre Animated Shaders',
  description: 'Shaders for futuristic, technological, and cyberpunk aesthetics',
  shaders: [
    holographicGridShader as unknown as ShaderDefinition,
    electricShader as unknown as ShaderDefinition,
    neonShader as unknown as ShaderDefinition,
    radarShader as unknown as ShaderDefinition,
    glowShader as unknown as ShaderDefinition,
  ],
  presets: {
    // Holographic presets
    'holo-blue': {
      shader: 'holographicGrid',
      config: { color: '#00ffff', speed: 0.5, gridSize: 50, pulseIntensity: 0.5 },
    },
    'holo-green': {
      shader: 'holographicGrid',
      config: { color: '#00ff00', speed: 0.3, gridSize: 30, pulseIntensity: 0.3 },
    },
    'matrix': {
      shader: 'holographicGrid',
      config: { color: '#00ff00', speed: 1.0, gridSize: 20, pulseIntensity: 0.8 },
    },
    // Electric presets
    'plasma': {
      shader: 'electric',
      config: { color: '#ff00ff', speed: 2.0, amplitude: 0.1, frequency: 5.0 },
    },
    'lightning': {
      shader: 'electric',
      config: { color: '#ffffff', speed: 3.0, amplitude: 0.15, frequency: 8.0 },
    },
    'energy-flow': {
      shader: 'electric',
      config: { color: '#00ffff', speed: 1.5, amplitude: 0.05, frequency: 3.0 },
    },
    // Neon presets
    'neon-pink': {
      shader: 'neon',
      config: { color: '#ff00ff', glowSize: 3.0, flickerSpeed: 0.5, flickerIntensity: 0.2 },
    },
    'neon-blue': {
      shader: 'neon',
      config: { color: '#00ffff', glowSize: 4.0, flickerSpeed: 0.3, flickerIntensity: 0.1 },
    },
    'cyberpunk': {
      shader: 'neon',
      config: { color: '#ff0066', glowSize: 5.0, flickerSpeed: 0.8, flickerIntensity: 0.4 },
    },
    // Radar presets
    'radar-scan': {
      shader: 'radar',
      config: { color: '#00ff00', speed: 1.0, arcWidth: 0.3, trailLength: 0.5 },
    },
    'sonar': {
      shader: 'radar',
      config: { color: '#00ffff', speed: 0.5, arcWidth: 0.1, trailLength: 0.8 },
    },
    'detection': {
      shader: 'radar',
      config: { color: '#ff0000', speed: 2.0, arcWidth: 0.2, trailLength: 0.3 },
    },
    // Glow presets
    'energy-core': {
      shader: 'glow',
      config: { color: '#00ffff', intensity: 1.5, radius: 30, pulseSpeed: 1.0 },
    },
    'power-node': {
      shader: 'glow',
      config: { color: '#ffff00', intensity: 1.0, radius: 20, pulseSpeed: 0.5 },
    },
    'hazard': {
      shader: 'glow',
      config: { color: '#ff0000', intensity: 2.0, radius: 25, pulseSpeed: 2.0 },
    },
  },
};

export default scifiPlugin;
