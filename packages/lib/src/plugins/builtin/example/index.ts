/**
 * Example Plugin
 *
 * A comprehensive example plugin demonstrating all features of the
 * MapLibre Animated Shaders system. Use this as a reference when
 * creating your own plugins.
 *
 * Features demonstrated:
 * - Per-feature timing offset (animation desynchronization)
 * - Data-driven expressions (color, intensity from feature properties)
 * - Multiple presets for common use cases
 * - GLSL utilities: easing, SDF, simplex noise, FBM, hash functions
 *
 * Shaders included:
 * - point: Pulse Marker (expanding rings)
 * - line: Flow Line (animated dashes)
 * - polygon: Wave Polygon (wave patterns with noise)
 * - global: Grid Overlay (holographic grid effect)
 */

import type { ShaderPlugin, ShaderDefinition } from '../../../types';
import { pointShader, lineShader, polygonShader, globalShader } from './shaders';

export const examplePlugin: ShaderPlugin = {
  name: 'example',
  version: '1.0.0',
  author: 'MapLibre Animated Shaders',
  description:
    'Example plugin demonstrating all features: per-feature timing, data-driven expressions, GLSL utilities, and presets',

  shaders: [
    pointShader as unknown as ShaderDefinition,
    lineShader as unknown as ShaderDefinition,
    polygonShader as unknown as ShaderDefinition,
    globalShader as unknown as ShaderDefinition,
  ],

  presets: {
    // =========================================
    // POINT PRESETS
    // =========================================

    /** Red alert with fast pulsing rings */
    'point-alert': {
      shader: 'point',
      config: {
        color: '#ef4444',
        speed: 2.0,
        rings: 3,
        maxRadius: 40,
        thickness: 2,
        fadeOut: true,
        easing: 'easeOut',
        intensity: 1.0,
      },
    },

    /** Blue notification with gentle pulsing */
    'point-notification': {
      shader: 'point',
      config: {
        color: '#3b82f6',
        speed: 1.0,
        rings: 2,
        maxRadius: 30,
        thickness: 2,
        fadeOut: true,
        easing: 'easeInOut',
        intensity: 0.8,
      },
    },

    /** Green beacon with elastic bounce effect */
    'point-beacon': {
      shader: 'point',
      config: {
        color: '#22c55e',
        speed: 0.8,
        rings: 1,
        maxRadius: 50,
        thickness: 3,
        fadeOut: false,
        easing: 'elastic',
        intensity: 1.0,
      },
    },

    // =========================================
    // LINE PRESETS
    // =========================================

    /** Green traffic flow with gradient */
    'line-traffic': {
      shader: 'line',
      config: {
        color: '#22c55e',
        speed: 1.0,
        dashLength: 0.15,
        gapLength: 0.1,
        direction: 'forward',
        gradient: true,
        glow: false,
        width: 4,
        intensity: 1.0,
      },
    },

    /** Blue pipeline with continuous flow */
    'line-pipeline': {
      shader: 'line',
      config: {
        color: '#0ea5e9',
        speed: 0.5,
        dashLength: 0.3,
        gapLength: 0.05,
        direction: 'forward',
        gradient: false,
        glow: true,
        width: 6,
        intensity: 1.0,
      },
    },

    /** Yellow electricity with fast glow */
    'line-electricity': {
      shader: 'line',
      config: {
        color: '#fbbf24',
        speed: 3.0,
        dashLength: 0.05,
        gapLength: 0.15,
        direction: 'forward',
        gradient: true,
        glow: true,
        width: 3,
        intensity: 1.0,
      },
    },

    // =========================================
    // POLYGON PRESETS
    // =========================================

    /** Blue water ripples */
    'polygon-water': {
      shader: 'polygon',
      config: {
        color: '#0ea5e9',
        speed: 0.5,
        waves: 4,
        scale: 8.0,
        amplitude: 0.6,
        useNoise: true,
        pattern: 'ripple',
        intensity: 0.8,
      },
    },

    /** Purple selection highlight */
    'polygon-selection': {
      shader: 'polygon',
      config: {
        color: '#a855f7',
        speed: 1.5,
        waves: 2,
        scale: 15.0,
        amplitude: 0.4,
        useNoise: false,
        pattern: 'diagonal',
        intensity: 0.7,
      },
    },

    /** Orange energy field */
    'polygon-energy': {
      shader: 'polygon',
      config: {
        color: '#f97316',
        speed: 2.0,
        waves: 5,
        scale: 12.0,
        amplitude: 0.7,
        useNoise: true,
        pattern: 'horizontal',
        intensity: 0.9,
      },
    },

    // =========================================
    // GLOBAL PRESETS
    // =========================================

    /** Green radar scan effect */
    'global-radar': {
      shader: 'global',
      config: {
        color: '#22c55e',
        speed: 0.3,
        gridSize: 80,
        lineWidth: 1,
        pulseWave: true,
        scanLine: true,
        glowIntensity: 0.6,
        intensity: 0.8,
      },
    },

    /** Cyan holographic display */
    'global-holographic': {
      shader: 'global',
      config: {
        color: '#22d3ee',
        speed: 0.5,
        gridSize: 50,
        lineWidth: 1,
        pulseWave: true,
        scanLine: false,
        glowIntensity: 0.7,
        intensity: 1.0,
      },
    },

    /** White measurement grid */
    'global-measurement': {
      shader: 'global',
      config: {
        color: '#f8fafc',
        speed: 0.0,
        gridSize: 100,
        lineWidth: 0.5,
        pulseWave: false,
        scanLine: false,
        glowIntensity: 0.2,
        intensity: 0.5,
      },
    },
  },
};

export default examplePlugin;
