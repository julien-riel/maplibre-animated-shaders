/**
 * Organic Plugin
 *
 * Shaders for natural, living, and organic visual effects.
 * Includes breathing animations, particle effects, and smooth transitions.
 */

import type { ShaderPlugin, ShaderDefinition } from '../../types';
import { heartbeatShader, particleBurstShader, morphingShapesShader } from '../../shaders/points';
import { breathingShader, trailFadeShader } from '../../shaders/lines';
import { dissolveShader, hatchingShader, gradientRotationShader } from '../../shaders/polygons';

/**
 * Organic Plugin
 *
 * Contains shaders for:
 * - heartbeat: Rhythmic size pulsation with easing
 * - breathing: Rhythmically pulsing line width
 * - particleBurst: Particles emanating from center
 * - morphingShapes: Fluid shape transitions
 * - dissolve: Dissolution appear/disappear effect
 * - trailFade: Decreasing opacity trail
 * - hatching: Animated hatch pattern
 * - gradientRotation: Rotating color gradient
 */
export const organicPlugin: ShaderPlugin = {
  name: 'organic',
  version: '1.0.0',
  author: 'MapLibre Animated Shaders',
  description: 'Shaders for natural, living, and organic visual effects',
  shaders: [
    heartbeatShader as unknown as ShaderDefinition,
    breathingShader as unknown as ShaderDefinition,
    particleBurstShader as unknown as ShaderDefinition,
    morphingShapesShader as unknown as ShaderDefinition,
    dissolveShader as unknown as ShaderDefinition,
    trailFadeShader as unknown as ShaderDefinition,
    hatchingShader as unknown as ShaderDefinition,
    gradientRotationShader as unknown as ShaderDefinition,
  ],
  presets: {
    // Heartbeat presets
    'heartbeat-slow': {
      shader: 'heartbeat',
      config: { color: '#ff0000', speed: 0.5, scale: 1.2, intensity: 0.8 },
    },
    'heartbeat-fast': {
      shader: 'heartbeat',
      config: { color: '#ff0000', speed: 2.0, scale: 1.5, intensity: 1.0 },
    },
    'life-pulse': {
      shader: 'heartbeat',
      config: { color: '#00ff00', speed: 1.0, scale: 1.3, intensity: 0.6 },
    },
    // Breathing presets
    'calm-breath': {
      shader: 'breathing',
      config: { color: '#0088ff', speed: 0.3, minWidth: 2, maxWidth: 6 },
    },
    'rapid-breath': {
      shader: 'breathing',
      config: { color: '#ff8800', speed: 1.5, minWidth: 1, maxWidth: 8 },
    },
    // Particle presets
    'celebration': {
      shader: 'particleBurst',
      config: { colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00'], speed: 1.0, count: 20, spread: 1.0 },
    },
    'firework': {
      shader: 'particleBurst',
      config: { colors: ['#ffff00', '#ff8800', '#ff0000'], speed: 1.5, count: 30, spread: 1.2 },
    },
    'sparkle': {
      shader: 'particleBurst',
      config: { colors: ['#ffffff', '#ffffcc'], speed: 0.5, count: 10, spread: 0.5 },
    },
    // Morphing presets
    'fluid-morph': {
      shader: 'morphingShapes',
      config: { color: '#0088ff', speed: 0.5, shapes: ['circle', 'square', 'triangle'] },
    },
    'geometric-dance': {
      shader: 'morphingShapes',
      config: { color: '#ff00ff', speed: 1.0, shapes: ['triangle', 'hexagon', 'star'] },
    },
    // Dissolve presets
    'fade-out': {
      shader: 'dissolve',
      config: { speed: 0.5, direction: 'out', noiseScale: 0.1 },
    },
    'fade-in': {
      shader: 'dissolve',
      config: { speed: 0.5, direction: 'in', noiseScale: 0.1 },
    },
    'pixelate': {
      shader: 'dissolve',
      config: { speed: 0.3, direction: 'out', noiseScale: 0.05 },
    },
    // Trail presets
    'motion-trail': {
      shader: 'trailFade',
      config: { color: '#ffffff', length: 0.5, opacity: 0.8 },
    },
    'ghost-trail': {
      shader: 'trailFade',
      config: { color: '#aaaaff', length: 0.8, opacity: 0.4 },
    },
    // Hatching presets
    'blueprint': {
      shader: 'hatching',
      config: { color: '#0066cc', angle: 45, spacing: 5, width: 1 },
    },
    'sketch': {
      shader: 'hatching',
      config: { color: '#333333', angle: -30, spacing: 3, width: 0.5 },
    },
    // Gradient rotation presets
    'rainbow-spin': {
      shader: 'gradientRotation',
      config: { colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'], speed: 0.5 },
    },
    'sunset': {
      shader: 'gradientRotation',
      config: { colors: ['#ff6600', '#ff0066', '#660099'], speed: 0.2 },
    },
  },
};

export default organicPlugin;
