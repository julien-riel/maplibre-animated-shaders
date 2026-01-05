/**
 * Shader registration and unregistration logic.
 * Handles the lifecycle of applying shaders to map layers.
 */

import type {
  ShaderConfig,
  ShaderDefinition,
  ShaderInstance,
  InteractivityConfig,
  GeometryType,
} from '../types';
import { PointShaderLayer } from '../layers/PointShaderLayer';
import { LineShaderLayer } from '../layers/LineShaderLayer';
import { PolygonShaderLayer } from '../layers/PolygonShaderLayer';
import { GlobalShaderLayer } from '../layers/GlobalShaderLayer';
import {
  GEOMETRY_LAYER_SUFFIX,
  GLOBAL_LAYER_SUFFIX,
  GEOMETRY_HIDE_PROPERTIES,
  GEOMETRY_RESTORE_PROPERTIES,
} from '../constants';
import type { ShaderManagerState, ShaderLayerUnion } from './ShaderState';
import { log } from './ShaderState';

// ============================================
// Types
// ============================================

/**
 * Configuration for registering a shader by geometry type
 */
interface GeometryShaderConfig {
  /** Suffix for the custom layer ID */
  layerIdSuffix: string;
  /** Paint properties to hide the original layer */
  hideProperties: string[];
  /** Whether this geometry type requires a source */
  requiresSource: boolean;
  /** Whether this geometry type supports interactivity */
  supportsInteractivity: boolean;
  /** Factory function to create the custom layer */
  createLayer: (
    layerId: string,
    sourceId: string | undefined,
    definition: ShaderDefinition,
    config: ShaderConfig,
    interactivityConfig?: InteractivityConfig
  ) => ShaderLayerUnion;
}

// ============================================
// Geometry Configurations
// ============================================

/**
 * Configuration map for each geometry type
 */
const GEOMETRY_CONFIGS: Record<Exclude<GeometryType, 'global'>, GeometryShaderConfig> = {
  point: {
    layerIdSuffix: GEOMETRY_LAYER_SUFFIX,
    hideProperties: GEOMETRY_HIDE_PROPERTIES.point,
    requiresSource: true,
    supportsInteractivity: true,
    createLayer: (layerId, sourceId, definition, config, interactivityConfig) =>
      new PointShaderLayer(layerId, sourceId!, definition, config, interactivityConfig),
  },
  line: {
    layerIdSuffix: GEOMETRY_LAYER_SUFFIX,
    hideProperties: GEOMETRY_HIDE_PROPERTIES.line,
    requiresSource: true,
    supportsInteractivity: true,
    createLayer: (layerId, sourceId, definition, config, interactivityConfig) =>
      new LineShaderLayer(layerId, sourceId!, definition, config, interactivityConfig),
  },
  polygon: {
    layerIdSuffix: GEOMETRY_LAYER_SUFFIX,
    hideProperties: GEOMETRY_HIDE_PROPERTIES.polygon,
    requiresSource: true,
    supportsInteractivity: true,
    createLayer: (layerId, sourceId, definition, config, interactivityConfig) =>
      new PolygonShaderLayer(layerId, sourceId!, definition, config, interactivityConfig),
  },
};

/**
 * Configuration for global shaders (special case)
 */
const GLOBAL_SHADER_CONFIG: GeometryShaderConfig = {
  layerIdSuffix: GLOBAL_LAYER_SUFFIX,
  hideProperties: [],
  requiresSource: false,
  supportsInteractivity: false,
  createLayer: (layerId, _sourceId, definition, config) =>
    new GlobalShaderLayer(layerId, definition, config),
};

// ============================================
// Registration Functions
// ============================================

/**
 * Register a shader on a layer.
 *
 * Supports both direct shader names and plugin-namespaced names (pluginName:shaderName).
 * Short names are resolved if unambiguous.
 *
 * @param state - The shader manager state
 * @param layerId - The ID of the layer to apply the shader to
 * @param shaderName - The name of the shader (can be namespaced)
 * @param config - Optional configuration overrides
 * @param interactivityConfig - Optional interactivity configuration
 * @throws Error if shader or layer is not found
 */
export function registerShader(
  state: ShaderManagerState,
  layerId: string,
  shaderName: string,
  config?: Partial<ShaderConfig>,
  interactivityConfig?: InteractivityConfig
): void {
  // Try to resolve shader name via plugin manager first
  const resolvedName = state.pluginManager.resolveShaderName(shaderName) ?? shaderName;

  // Get shader definition
  const definition = state.registry.get(resolvedName);
  if (!definition) {
    throw new Error(
      `[ShaderManager] Shader "${shaderName}" not found. Available: ${state.registry.list().join(', ')}`
    );
  }

  // Unregister existing shader on this layer
  if (state.instances.has(layerId)) {
    unregisterShader(state, layerId);
  }

  // Resolve configuration
  const resolvedConfig = state.configResolver.resolve(definition.defaultConfig, config);

  // Validate configuration
  const validation = state.configResolver.validate(resolvedConfig, definition.configSchema);
  if (!validation.valid) {
    console.warn(
      `[ShaderManager] Configuration validation errors for "${layerId}":`,
      validation.errors
    );
  }

  // Get geometry configuration
  const geometryConfig =
    definition.geometry === 'global' ? GLOBAL_SHADER_CONFIG : GEOMETRY_CONFIGS[definition.geometry];

  if (geometryConfig) {
    registerWebGLShader(
      state,
      layerId,
      definition,
      resolvedConfig,
      geometryConfig,
      interactivityConfig
    );
    return;
  }

  // For other geometries, use paint property animation (legacy)
  registerPaintShader(state, layerId, definition, resolvedConfig);
}

/**
 * Register a WebGL shader using the geometry-specific configuration.
 */
function registerWebGLShader(
  state: ShaderManagerState,
  layerId: string,
  definition: ShaderDefinition,
  config: ShaderConfig,
  geometryConfig: GeometryShaderConfig,
  interactivityConfig?: InteractivityConfig
): void {
  let sourceId: string | undefined;

  // For geometry types that require a source, get it from the existing layer
  if (geometryConfig.requiresSource) {
    const existingLayer = state.map.getLayer(layerId);
    if (!existingLayer) {
      throw new Error(`[ShaderManager] Layer "${layerId}" not found on map`);
    }

    sourceId = (existingLayer as { source?: string }).source;
    if (!sourceId) {
      throw new Error(`[ShaderManager] Layer "${layerId}" has no source`);
    }
  }

  // Create custom layer ID
  const customLayerId = `${layerId}${geometryConfig.layerIdSuffix}`;

  // Remove existing custom layer if present
  if (state.map.getLayer(customLayerId)) {
    state.map.removeLayer(customLayerId);
  }

  // Hide original layer by setting opacity properties to 0
  for (const property of geometryConfig.hideProperties) {
    state.map.setPaintProperty(layerId, property, 0);
  }

  // Create the custom layer using the geometry-specific factory
  const effectiveInteractivity = geometryConfig.supportsInteractivity
    ? interactivityConfig
    : undefined;
  const customLayer = geometryConfig.createLayer(
    customLayerId,
    sourceId,
    definition,
    config,
    effectiveInteractivity
  );

  // Add the custom layer to the map
  // For source-based layers, add before the original layer; for global, add on top
  if (geometryConfig.requiresSource) {
    state.map.addLayer(customLayer, layerId);
  } else {
    state.map.addLayer(customLayer);
  }

  // Store the custom layer
  state.customLayers.set(layerId, customLayer);

  // Create shader instance for tracking
  const instance: ShaderInstance = {
    layerId,
    definition,
    config,
    isPlaying: true,
    speed: config.speed ?? 1.0,
    localTime: 0,
  };

  state.instances.set(layerId, instance);

  log(
    state,
    `Registered ${definition.geometry} shader "${definition.name}" on layer "${layerId}" (WebGL)`
  );
}

/**
 * Register a shader using paint property animation (for non-point geometries).
 */
function registerPaintShader(
  state: ShaderManagerState,
  layerId: string,
  definition: ShaderDefinition,
  config: ShaderConfig
): void {
  // Check if layer exists
  if (!state.map.getLayer(layerId)) {
    throw new Error(`[ShaderManager] Layer "${layerId}" not found on map`);
  }

  // Create shader instance
  const instance: ShaderInstance = {
    layerId,
    definition,
    config,
    isPlaying: true,
    speed: config.speed ?? 1.0,
    localTime: 0,
  };

  state.instances.set(layerId, instance);

  // Apply required paint/layout properties
  applyRequiredProperties(state, layerId, definition);

  // Register with animation loop
  // Import updatePaintShader dynamically to avoid circular dependency
  state.animationLoop.addShader(layerId, (_time, deltaTime) => {
    // This callback will be handled by ShaderPlayback
    const inst = state.instances.get(layerId);
    if (inst && inst.isPlaying && !state.customLayers.has(layerId)) {
      inst.localTime += deltaTime * inst.speed;
    }
  });

  log(state, `Registered shader "${definition.name}" on layer "${layerId}" (paint)`);
}

/**
 * Apply required paint/layout properties from shader definition.
 */
function applyRequiredProperties(
  state: ShaderManagerState,
  layerId: string,
  definition: ShaderDefinition
): void {
  if (definition.requiredPaint) {
    for (const [prop, value] of Object.entries(definition.requiredPaint)) {
      try {
        state.map.setPaintProperty(layerId, prop, value);
      } catch {
        // Ignore if property doesn't apply
      }
    }
  }

  if (definition.requiredLayout) {
    for (const [prop, value] of Object.entries(definition.requiredLayout)) {
      try {
        state.map.setLayoutProperty(layerId, prop, value);
      } catch {
        // Ignore if property doesn't apply
      }
    }
  }
}

// ============================================
// Unregistration Functions
// ============================================

/**
 * Unregister a shader from a layer.
 *
 * @param state - The shader manager state
 * @param layerId - The ID of the layer to remove the shader from
 */
export function unregisterShader(state: ShaderManagerState, layerId: string): void {
  const instance = state.instances.get(layerId);
  if (!instance) {
    log(state, `No shader registered on layer "${layerId}"`);
    return;
  }

  // Remove custom layer if it exists
  const customLayer = state.customLayers.get(layerId);
  if (customLayer) {
    // Determine the custom layer ID based on geometry type
    const customLayerId =
      instance.definition.geometry === 'global'
        ? `${layerId}${GLOBAL_LAYER_SUFFIX}`
        : `${layerId}${GEOMETRY_LAYER_SUFFIX}`;

    if (state.map.getLayer(customLayerId)) {
      state.map.removeLayer(customLayerId);
    }
    state.customLayers.delete(layerId);

    // Restore original layer opacity based on geometry type
    if (state.map.getLayer(layerId)) {
      const geometry = instance.definition.geometry as Exclude<GeometryType, 'global'>;
      const restoreProps = GEOMETRY_RESTORE_PROPERTIES[geometry];
      if (restoreProps) {
        for (const [prop, value] of Object.entries(restoreProps)) {
          state.map.setPaintProperty(layerId, prop, value);
        }
      }
    }
  }

  // Remove from animation loop
  state.animationLoop.removeShader(layerId);

  // Remove from instances
  state.instances.delete(layerId);

  log(state, `Unregistered shader from layer "${layerId}"`);
}

/**
 * Remove all custom layers and restore original layer states.
 * Used during ShaderManager destruction.
 *
 * @param state - The shader manager state
 */
export function removeAllShaders(state: ShaderManagerState): void {
  for (const [layerId] of state.customLayers) {
    const instance = state.instances.get(layerId);

    // Determine the custom layer ID based on geometry type
    const customLayerId =
      instance?.definition.geometry === 'global'
        ? `${layerId}${GLOBAL_LAYER_SUFFIX}`
        : `${layerId}${GEOMETRY_LAYER_SUFFIX}`;

    if (state.map.getLayer(customLayerId)) {
      state.map.removeLayer(customLayerId);
    }

    // Restore original layer opacity based on geometry type
    if (state.map.getLayer(layerId) && instance) {
      const geometry = instance.definition.geometry as Exclude<GeometryType, 'global'>;
      const restoreProps = GEOMETRY_RESTORE_PROPERTIES[geometry];
      if (restoreProps) {
        for (const [prop, value] of Object.entries(restoreProps)) {
          state.map.setPaintProperty(layerId, prop, value);
        }
      }
    }
  }

  state.customLayers.clear();
}
