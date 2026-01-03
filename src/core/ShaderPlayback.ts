/**
 * Shader playback control functions.
 * Handles play, pause, speed, and configuration updates.
 */

import type { ShaderConfig, ShaderDefinition } from '../types';
import type { ShaderManagerState } from './ShaderState';
import { log } from './ShaderState';

// ============================================
// Playback Control
// ============================================

/**
 * Play animation for a specific layer or all layers.
 *
 * @param state - The shader manager state
 * @param layerId - Optional layer ID. If not provided, plays all layers.
 */
export function play(state: ShaderManagerState, layerId?: string): void {
  if (layerId) {
    const instance = state.instances.get(layerId);
    if (instance) {
      instance.isPlaying = true;
      // Update custom layer if present
      const customLayer = state.customLayers.get(layerId);
      if (customLayer) {
        customLayer.play();
        state.map.triggerRepaint();
      }
      log(state, `Playing shader on layer "${layerId}"`);
    }
  } else {
    state.instances.forEach((instance, id) => {
      instance.isPlaying = true;
      const customLayer = state.customLayers.get(id);
      if (customLayer) {
        customLayer.play();
      }
    });
    state.animationLoop.start();
    state.map.triggerRepaint();
    log(state, 'Playing all shaders');
  }
}

/**
 * Pause animation for a specific layer or all layers.
 *
 * @param state - The shader manager state
 * @param layerId - Optional layer ID. If not provided, pauses all layers.
 */
export function pause(state: ShaderManagerState, layerId?: string): void {
  if (layerId) {
    const instance = state.instances.get(layerId);
    if (instance) {
      instance.isPlaying = false;
      // Update custom layer if present
      const customLayer = state.customLayers.get(layerId);
      if (customLayer) {
        customLayer.pause();
      }
      log(state, `Paused shader on layer "${layerId}"`);
    }
  } else {
    state.instances.forEach((instance, id) => {
      instance.isPlaying = false;
      const customLayer = state.customLayers.get(id);
      if (customLayer) {
        customLayer.pause();
      }
    });
    log(state, 'Paused all shaders');
  }
}

/**
 * Set animation speed for a specific layer.
 *
 * @param state - The shader manager state
 * @param layerId - The layer ID
 * @param speed - The speed multiplier (0 or positive)
 */
export function setSpeed(state: ShaderManagerState, layerId: string, speed: number): void {
  const instance = state.instances.get(layerId);
  if (instance) {
    instance.speed = Math.max(0, speed);
    // Update custom layer if present
    const customLayer = state.customLayers.get(layerId);
    if (customLayer) {
      customLayer.setSpeed(speed);
    }
    log(state, `Set speed to ${speed} on layer "${layerId}"`);
  }
}

/**
 * Update shader configuration at runtime.
 *
 * @param state - The shader manager state
 * @param layerId - The layer ID
 * @param config - Partial configuration to merge
 * @throws Error if no shader is registered on the layer
 */
export function updateShaderConfig(
  state: ShaderManagerState,
  layerId: string,
  config: Partial<ShaderConfig>
): void {
  const instance = state.instances.get(layerId);
  if (!instance) {
    throw new Error(`[ShaderManager] No shader registered on layer "${layerId}"`);
  }

  // Merge new config with existing
  instance.config = state.configResolver.resolve(instance.config, config);

  // Handle speed update
  if (config.speed !== undefined) {
    instance.speed = config.speed;
  }

  // Handle enabled update
  if (config.enabled !== undefined) {
    instance.isPlaying = config.enabled;
  }

  // Update custom layer if present
  const customLayer = state.customLayers.get(layerId);
  if (customLayer) {
    customLayer.updateConfig(config);
    state.map.triggerRepaint();
  }

  log(state, `Updated config on layer "${layerId}"`, config);
}

// ============================================
// Paint Shader Animation
// ============================================

/**
 * Map shader uniform name to MapLibre paint property.
 */
function mapUniformToPaint(uniformName: string, geometry: string): string | null {
  const mappings: Record<string, Record<string, string>> = {
    point: {
      u_radius: 'circle-radius',
      u_color: 'circle-color',
      u_opacity: 'circle-opacity',
      u_stroke_width: 'circle-stroke-width',
      u_stroke_color: 'circle-stroke-color',
    },
    line: {
      u_width: 'line-width',
      u_color: 'line-color',
      u_opacity: 'line-opacity',
      u_dasharray: 'line-dasharray',
    },
    polygon: {
      u_color: 'fill-color',
      u_opacity: 'fill-opacity',
      u_outline_color: 'fill-outline-color',
    },
  };

  return mappings[geometry]?.[uniformName] ?? null;
}

/**
 * Apply uniform values to a map layer (for paint property animation).
 *
 * @param state - The shader manager state
 * @param layerId - The layer ID
 * @param uniforms - The uniform values to apply
 * @param definition - The shader definition
 */
export function applyUniforms(
  state: ShaderManagerState,
  layerId: string,
  uniforms: Record<string, unknown>,
  definition: ShaderDefinition
): void {
  for (const [key, value] of Object.entries(uniforms)) {
    const paintProperty = mapUniformToPaint(key, definition.geometry);
    if (paintProperty) {
      try {
        state.map.setPaintProperty(layerId, paintProperty, value);
      } catch {
        // Property may not exist on this layer type
      }
    }
  }
}

/**
 * Update a paint shader (for paint property animation).
 * Called by the animation loop for non-WebGL shaders.
 *
 * @param state - The shader manager state
 * @param layerId - The layer ID
 * @param _time - Current animation time (unused, kept for API compatibility)
 * @param deltaTime - Time since last frame
 */
export function updatePaintShader(
  state: ShaderManagerState,
  layerId: string,
  _time: number,
  deltaTime: number
): void {
  const instance = state.instances.get(layerId);
  if (!instance || !instance.isPlaying) return;

  // Skip if using custom layer
  if (state.customLayers.has(layerId)) return;

  // Update local time with instance speed
  instance.localTime += deltaTime * instance.speed;

  // Get uniforms from shader definition
  const uniforms = instance.definition.getUniforms(
    instance.config,
    instance.localTime,
    deltaTime * instance.speed
  );

  // Apply uniforms to map layer
  applyUniforms(state, layerId, uniforms, instance.definition);
}
