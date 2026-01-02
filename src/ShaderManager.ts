import type {
  IShaderManager,
  MapLibreMapInstance,
  ShaderConfig,
  ShaderController,
  InteractiveShaderController,
  InteractivityConfig,
  ShaderDefinition,
  ShaderInstance,
  ShaderManagerOptions,
  GeometryType,
  ShaderPlugin,
  ShaderMetrics,
  PerformanceWarningHandler,
  MetricsConfig,
} from './types';
import { AnimationLoop } from './AnimationLoop';
import { ConfigResolver } from './ConfigResolver';
import { globalRegistry, ShaderRegistry } from './ShaderRegistry';
import { PointShaderLayer } from './layers/PointShaderLayer';
import { LineShaderLayer } from './layers/LineShaderLayer';
import { PolygonShaderLayer } from './layers/PolygonShaderLayer';
import { GlobalShaderLayer } from './layers/GlobalShaderLayer';
import { FeatureAnimationStateManager } from './interaction';
import { checkMinimumRequirements, logCapabilities } from './utils/webgl-capabilities';
import { MetricsCollector } from './utils/metrics-collector';
import { PluginManager, loadPlugin, type BuiltinPluginName } from './plugins';

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
  ) => PointShaderLayer | LineShaderLayer | PolygonShaderLayer | GlobalShaderLayer;
}

/**
 * Configuration map for each geometry type
 */
const GEOMETRY_CONFIGS: Record<Exclude<GeometryType, 'global'>, GeometryShaderConfig> = {
  point: {
    layerIdSuffix: '-shader',
    hideProperties: ['circle-opacity', 'circle-stroke-opacity'],
    requiresSource: true,
    supportsInteractivity: true,
    createLayer: (layerId, sourceId, definition, config, interactivityConfig) =>
      new PointShaderLayer(layerId, sourceId!, definition, config, interactivityConfig),
  },
  line: {
    layerIdSuffix: '-shader',
    hideProperties: ['line-opacity'],
    requiresSource: true,
    supportsInteractivity: true,
    createLayer: (layerId, sourceId, definition, config, interactivityConfig) =>
      new LineShaderLayer(layerId, sourceId!, definition, config, interactivityConfig),
  },
  polygon: {
    layerIdSuffix: '-shader',
    hideProperties: ['fill-opacity'],
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
  layerIdSuffix: '-global-shader',
  hideProperties: [],
  requiresSource: false,
  supportsInteractivity: false,
  createLayer: (layerId, _sourceId, definition, config) =>
    new GlobalShaderLayer(layerId, definition, config),
};

/**
 * Main entry point for managing animated shaders on a MapLibre map.
 * Handles shader lifecycle, animation synchronization, and configuration.
 */
export class ShaderManager implements IShaderManager {
  private map: MapLibreMapInstance;
  private animationLoop: AnimationLoop;
  private configResolver: ConfigResolver;
  private registry: ShaderRegistry;
  private pluginManager: PluginManager;
  private metricsCollector: MetricsCollector;
  private instances: Map<string, ShaderInstance> = new Map();
  private customLayers: Map<
    string,
    PointShaderLayer | LineShaderLayer | PolygonShaderLayer | GlobalShaderLayer
  > = new Map();
  private options: Required<Omit<ShaderManagerOptions, 'metricsConfig'>> & {
    metricsConfig?: MetricsConfig;
  };
  private debug: boolean;
  private totalFeaturesRendered: number = 0;

  constructor(map: MapLibreMapInstance, options: ShaderManagerOptions = {}) {
    this.map = map;
    this.options = {
      targetFPS: options.targetFPS ?? 60,
      autoStart: options.autoStart ?? true,
      debug: options.debug ?? false,
      checkCapabilities: options.checkCapabilities ?? true,
      enableMetrics: options.enableMetrics ?? options.debug ?? false,
      metricsConfig: options.metricsConfig,
    };
    this.debug = this.options.debug;

    // Check WebGL capabilities if enabled
    if (this.options.checkCapabilities && typeof document !== 'undefined') {
      const requirements = checkMinimumRequirements();

      if (this.debug) {
        logCapabilities(requirements.capabilities);
      }

      if (!requirements.ok) {
        const errorMsg = requirements.errors.join('\n');
        console.warn(`[ShaderManager] WebGL capability warnings:\n${errorMsg}`);

        // If WebGL is completely unsupported, throw an error
        if (!requirements.capabilities.supported) {
          throw new Error(
            '[ShaderManager] WebGL is not supported in this browser. ' +
              'Animated shaders require WebGL to function.'
          );
        }
      }
    }

    this.animationLoop = new AnimationLoop(this.options.targetFPS);
    this.configResolver = new ConfigResolver();
    this.registry = globalRegistry;
    this.pluginManager = new PluginManager(this.registry, { debug: this.debug });
    this.pluginManager.setManager(this);

    // Initialize metrics collector
    this.metricsCollector = new MetricsCollector({
      enabled: this.options.enableMetrics,
      ...this.options.metricsConfig,
    });

    if (this.options.autoStart) {
      this.animationLoop.start();
    }

    this.log('ShaderManager initialized');
  }

  /**
   * Register a plugin with the shader manager
   *
   * Plugins provide named shaders with namespace support.
   * Example: use(myPlugin) makes shaders available as "pluginName:shaderName"
   */
  use(plugin: ShaderPlugin): void {
    this.pluginManager.use(plugin);
    this.log(`Plugin "${plugin.name}" v${plugin.version} registered`);
  }

  /**
   * Lazy load and register a built-in plugin
   *
   * This method loads the plugin dynamically, reducing initial bundle size.
   * Use this instead of importing plugins directly for better code splitting.
   *
   * @param pluginName - Name of the built-in plugin to load
   * @returns Promise that resolves when the plugin is loaded and registered
   *
   * @example
   * ```typescript
   * // Load only the plugins you need
   * await shaderManager.useAsync('dataviz');
   * await shaderManager.useAsync('atmospheric');
   *
   * // Or load multiple in parallel
   * await Promise.all([
   *   shaderManager.useAsync('dataviz'),
   *   shaderManager.useAsync('scifi'),
   * ]);
   * ```
   */
  async useAsync(pluginName: BuiltinPluginName): Promise<void> {
    const plugin = await loadPlugin(pluginName);
    this.use(plugin);
  }

  /**
   * Lazy load and register multiple built-in plugins in parallel
   *
   * @param pluginNames - Array of plugin names to load
   * @returns Promise that resolves when all plugins are loaded and registered
   *
   * @example
   * ```typescript
   * await shaderManager.useAsyncAll(['dataviz', 'atmospheric', 'scifi']);
   * ```
   */
  async useAsyncAll(pluginNames: BuiltinPluginName[]): Promise<void> {
    await Promise.all(pluginNames.map((name) => this.useAsync(name)));
  }

  /**
   * Unregister a plugin from the shader manager
   *
   * @returns true if the plugin was found and removed, false otherwise
   */
  unuse(pluginName: string): boolean {
    const result = this.pluginManager.unuse(pluginName);
    if (result) {
      this.log(`Plugin "${pluginName}" unregistered`);
    }
    return result;
  }

  /**
   * Get a registered plugin by name
   */
  getPlugin(name: string): ShaderPlugin | undefined {
    return this.pluginManager.getPlugin(name);
  }

  /**
   * Check if a plugin is registered
   */
  hasPlugin(name: string): boolean {
    return this.pluginManager.hasPlugin(name);
  }

  /**
   * List all registered plugin names
   */
  listPlugins(): string[] {
    return this.pluginManager.listPlugins();
  }

  /**
   * Register a shader on a layer
   *
   * Supports both direct shader names and plugin-namespaced names (pluginName:shaderName).
   * Short names are resolved if unambiguous.
   */
  register(
    layerId: string,
    shaderName: string,
    config?: Partial<ShaderConfig>,
    interactivityConfig?: InteractivityConfig
  ): void {
    // Try to resolve shader name via plugin manager first
    const resolvedName = this.pluginManager.resolveShaderName(shaderName) ?? shaderName;

    // Get shader definition
    const definition = this.registry.get(resolvedName);
    if (!definition) {
      throw new Error(
        `[ShaderManager] Shader "${shaderName}" not found. Available: ${this.registry.list().join(', ')}`
      );
    }

    // Unregister existing shader on this layer
    if (this.instances.has(layerId)) {
      this.unregister(layerId);
    }

    // Resolve configuration
    const resolvedConfig = this.configResolver.resolve(definition.defaultConfig, config);

    // Validate configuration
    const validation = this.configResolver.validate(resolvedConfig, definition.configSchema);
    if (!validation.valid) {
      console.warn(
        `[ShaderManager] Configuration validation errors for "${layerId}":`,
        validation.errors
      );
    }

    // Get geometry configuration
    const geometryConfig =
      definition.geometry === 'global'
        ? GLOBAL_SHADER_CONFIG
        : GEOMETRY_CONFIGS[definition.geometry];

    if (geometryConfig) {
      this.registerWebGLShader(
        layerId,
        definition,
        resolvedConfig,
        geometryConfig,
        interactivityConfig
      );
      return;
    }

    // For other geometries, use paint property animation (legacy)
    this.registerPaintShader(layerId, definition, resolvedConfig);
  }

  /**
   * Register a WebGL shader using the geometry-specific configuration
   */
  private registerWebGLShader(
    layerId: string,
    definition: ShaderDefinition,
    config: ShaderConfig,
    geometryConfig: GeometryShaderConfig,
    interactivityConfig?: InteractivityConfig
  ): void {
    let sourceId: string | undefined;

    // For geometry types that require a source, get it from the existing layer
    if (geometryConfig.requiresSource) {
      const existingLayer = this.map.getLayer(layerId);
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
    if (this.map.getLayer(customLayerId)) {
      this.map.removeLayer(customLayerId);
    }

    // Hide original layer by setting opacity properties to 0
    for (const property of geometryConfig.hideProperties) {
      this.map.setPaintProperty(layerId, property, 0);
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
      this.map.addLayer(customLayer, layerId);
    } else {
      this.map.addLayer(customLayer);
    }

    // Store the custom layer
    this.customLayers.set(layerId, customLayer);

    // Create shader instance for tracking
    const instance: ShaderInstance = {
      layerId,
      definition,
      config,
      isPlaying: true,
      speed: config.speed ?? 1.0,
      localTime: 0,
    };

    this.instances.set(layerId, instance);

    this.log(
      `Registered ${definition.geometry} shader "${definition.name}" on layer "${layerId}" (WebGL)`
    );
  }

  /**
   * Register a shader using paint property animation (for non-point geometries)
   */
  private registerPaintShader(
    layerId: string,
    definition: ShaderDefinition,
    config: ShaderConfig
  ): void {
    // Check if layer exists
    if (!this.map.getLayer(layerId)) {
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

    this.instances.set(layerId, instance);

    // Apply required paint/layout properties
    this.applyRequiredProperties(layerId, definition);

    // Register with animation loop
    this.animationLoop.addShader(layerId, (time, deltaTime) => {
      this.updateShader(layerId, time, deltaTime);
    });

    this.log(`Registered shader "${definition.name}" on layer "${layerId}" (paint)`);
  }

  /**
   * Unregister a shader from a layer
   */
  unregister(layerId: string): void {
    const instance = this.instances.get(layerId);
    if (!instance) {
      this.log(`No shader registered on layer "${layerId}"`);
      return;
    }

    // Remove custom layer if it exists
    const customLayer = this.customLayers.get(layerId);
    if (customLayer) {
      // Determine the custom layer ID based on geometry type
      const customLayerId =
        instance.definition.geometry === 'global'
          ? `${layerId}-global-shader`
          : `${layerId}-shader`;
      if (this.map.getLayer(customLayerId)) {
        this.map.removeLayer(customLayerId);
      }
      this.customLayers.delete(layerId);

      // Restore original layer opacity based on geometry type
      if (this.map.getLayer(layerId)) {
        const geometry = instance.definition.geometry;
        if (geometry === 'point') {
          this.map.setPaintProperty(layerId, 'circle-opacity', 1);
          this.map.setPaintProperty(layerId, 'circle-stroke-opacity', 1);
        } else if (geometry === 'line') {
          this.map.setPaintProperty(layerId, 'line-opacity', 1);
        } else if (geometry === 'polygon') {
          this.map.setPaintProperty(layerId, 'fill-opacity', 0.2);
        }
      }
    }

    // Remove from animation loop
    this.animationLoop.removeShader(layerId);

    // Remove from instances
    this.instances.delete(layerId);

    this.log(`Unregistered shader from layer "${layerId}"`);
  }

  /**
   * Play animation for a specific layer or all layers
   */
  play(layerId?: string): void {
    if (layerId) {
      const instance = this.instances.get(layerId);
      if (instance) {
        instance.isPlaying = true;
        // Update custom layer if present
        const customLayer = this.customLayers.get(layerId);
        if (customLayer) {
          customLayer.play();
          this.map.triggerRepaint();
        }
        this.log(`Playing shader on layer "${layerId}"`);
      }
    } else {
      this.instances.forEach((instance, id) => {
        instance.isPlaying = true;
        const customLayer = this.customLayers.get(id);
        if (customLayer) {
          customLayer.play();
        }
      });
      this.animationLoop.start();
      this.map.triggerRepaint();
      this.log('Playing all shaders');
    }
  }

  /**
   * Pause animation for a specific layer or all layers
   */
  pause(layerId?: string): void {
    if (layerId) {
      const instance = this.instances.get(layerId);
      if (instance) {
        instance.isPlaying = false;
        // Update custom layer if present
        const customLayer = this.customLayers.get(layerId);
        if (customLayer) {
          customLayer.pause();
        }
        this.log(`Paused shader on layer "${layerId}"`);
      }
    } else {
      this.instances.forEach((instance, id) => {
        instance.isPlaying = false;
        const customLayer = this.customLayers.get(id);
        if (customLayer) {
          customLayer.pause();
        }
      });
      this.log('Paused all shaders');
    }
  }

  /**
   * Set speed for a specific layer
   */
  setSpeed(layerId: string, speed: number): void {
    const instance = this.instances.get(layerId);
    if (instance) {
      instance.speed = Math.max(0, speed);
      // Update custom layer if present
      const customLayer = this.customLayers.get(layerId);
      if (customLayer) {
        customLayer.setSpeed(speed);
      }
      this.log(`Set speed to ${speed} on layer "${layerId}"`);
    }
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(layerId: string, config: Partial<ShaderConfig>): void {
    const instance = this.instances.get(layerId);
    if (!instance) {
      throw new Error(`[ShaderManager] No shader registered on layer "${layerId}"`);
    }

    // Merge new config with existing
    instance.config = this.configResolver.resolve(instance.config, config);

    // Handle speed update
    if (config.speed !== undefined) {
      instance.speed = config.speed;
    }

    // Handle enabled update
    if (config.enabled !== undefined) {
      instance.isPlaying = config.enabled;
    }

    // Update custom layer if present
    const customLayer = this.customLayers.get(layerId);
    if (customLayer) {
      customLayer.updateConfig(config);
      this.map.triggerRepaint();
    }

    this.log(`Updated config on layer "${layerId}"`, config);
  }

  /**
   * Get all registered layer IDs
   */
  getRegisteredLayers(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Get shader instance for a layer
   */
  getInstance(layerId: string): ShaderInstance | undefined {
    return this.instances.get(layerId);
  }

  /**
   * Get custom layer for a layer ID
   */
  getCustomLayer(
    layerId: string
  ): PointShaderLayer | LineShaderLayer | PolygonShaderLayer | GlobalShaderLayer | undefined {
    return this.customLayers.get(layerId);
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    // Remove all custom layers
    for (const [layerId] of this.customLayers) {
      const instance = this.instances.get(layerId);
      // Determine the custom layer ID based on geometry type
      const customLayerId =
        instance?.definition.geometry === 'global'
          ? `${layerId}-global-shader`
          : `${layerId}-shader`;
      if (this.map.getLayer(customLayerId)) {
        this.map.removeLayer(customLayerId);
      }
      // Restore original layer opacity based on geometry type
      if (this.map.getLayer(layerId) && instance) {
        const geometry = instance.definition.geometry;
        if (geometry === 'point') {
          this.map.setPaintProperty(layerId, 'circle-opacity', 1);
          this.map.setPaintProperty(layerId, 'circle-stroke-opacity', 1);
        } else if (geometry === 'line') {
          this.map.setPaintProperty(layerId, 'line-opacity', 1);
        } else if (geometry === 'polygon') {
          this.map.setPaintProperty(layerId, 'fill-opacity', 0.2);
        }
        // Global shaders don't have associated layers to restore
      }
    }
    this.customLayers.clear();

    // Clear all plugins
    this.pluginManager.clear();

    this.animationLoop.destroy();
    this.instances.clear();
    this.log('ShaderManager destroyed');
  }

  /**
   * Set global animation speed
   */
  setGlobalSpeed(speed: number): void {
    this.animationLoop.setGlobalSpeed(speed);
  }

  /**
   * Get current animation time
   */
  getTime(): number {
    return this.animationLoop.getTime();
  }

  // =========================================================================
  // Metrics & Observability
  // =========================================================================

  /**
   * Get current performance metrics
   *
   * Returns a snapshot of rendering performance including FPS, frame times,
   * dropped frames, and resource usage.
   *
   * @example
   * ```typescript
   * const metrics = shaderManager.getMetrics();
   * console.log(`Current FPS: ${metrics.currentFPS}`);
   * console.log(`Dropped frames: ${metrics.droppedFrames}`);
   * ```
   */
  getMetrics(): ShaderMetrics {
    // Update metrics with current state
    this.metricsCollector.setActiveShaders(this.instances.size);
    this.metricsCollector.setFeaturesRendered(this.totalFeaturesRendered);
    return this.metricsCollector.getMetrics();
  }

  /**
   * Register a callback for performance warnings
   *
   * Warnings are emitted when performance degrades below configured thresholds.
   * Returns an unsubscribe function.
   *
   * @example
   * ```typescript
   * const unsubscribe = shaderManager.onPerformanceWarning((warning) => {
   *   console.warn(`Performance issue: ${warning.message}`);
   *   if (warning.type === 'low_fps') {
   *     // Reduce animation complexity
   *     shaderManager.setGlobalSpeed(0.5);
   *   }
   * });
   *
   * // Later, to stop receiving warnings:
   * unsubscribe();
   * ```
   */
  onPerformanceWarning(handler: PerformanceWarningHandler): () => void {
    return this.metricsCollector.onPerformanceWarning(handler);
  }

  /**
   * Enable or disable metrics collection
   *
   * Disabling metrics can improve performance slightly by avoiding
   * the overhead of metric collection.
   */
  setMetricsEnabled(enabled: boolean): void {
    this.metricsCollector.setEnabled(enabled);
  }

  /**
   * Check if metrics collection is enabled
   */
  isMetricsEnabled(): boolean {
    return this.metricsCollector.isEnabled();
  }

  /**
   * Reset metrics to initial state
   *
   * Useful for starting a new measurement session.
   */
  resetMetrics(): void {
    this.metricsCollector.reset();
  }

  /**
   * Record frame metrics (called internally by animation loop)
   */
  recordFrame(_frameTime: number): void {
    this.metricsCollector.endFrame(1000 / this.options.targetFPS);
  }

  /**
   * Update the total features rendered count
   * Called by layers when feature data changes
   */
  updateFeaturesRendered(count: number): void {
    this.totalFeaturesRendered = count;
    this.metricsCollector.setFeaturesRendered(count);
  }

  /**
   * Update a single shader (for paint property animation)
   */
  private updateShader(layerId: string, _time: number, deltaTime: number): void {
    const instance = this.instances.get(layerId);
    if (!instance || !instance.isPlaying) return;

    // Skip if using custom layer
    if (this.customLayers.has(layerId)) return;

    // Update local time with instance speed
    instance.localTime += deltaTime * instance.speed;

    // Get uniforms from shader definition
    const uniforms = instance.definition.getUniforms(
      instance.config,
      instance.localTime,
      deltaTime * instance.speed
    );

    // Apply uniforms to map layer
    this.applyUniforms(layerId, uniforms, instance.definition);
  }

  /**
   * Apply uniform values to the map layer
   */
  private applyUniforms(
    layerId: string,
    uniforms: Record<string, unknown>,
    definition: ShaderDefinition
  ): void {
    // For now, we use paint property animation
    // In the future, this could use custom layers with WebGL
    for (const [key, value] of Object.entries(uniforms)) {
      // Map uniform names to MapLibre properties
      const paintProperty = this.mapUniformToPaint(key, definition.geometry);
      if (paintProperty) {
        try {
          this.map.setPaintProperty(layerId, paintProperty, value);
        } catch {
          // Property may not exist on this layer type
        }
      }
    }
  }

  /**
   * Map shader uniform name to MapLibre paint property
   */
  private mapUniformToPaint(uniformName: string, geometry: string): string | null {
    // Common mappings based on geometry type
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
   * Apply required paint/layout properties from shader definition
   */
  private applyRequiredProperties(layerId: string, definition: ShaderDefinition): void {
    if (definition.requiredPaint) {
      for (const [prop, value] of Object.entries(definition.requiredPaint)) {
        try {
          this.map.setPaintProperty(layerId, prop, value);
        } catch {
          // Ignore if property doesn't apply
        }
      }
    }

    if (definition.requiredLayout) {
      for (const [prop, value] of Object.entries(definition.requiredLayout)) {
        try {
          this.map.setLayoutProperty(layerId, prop, value);
        } catch {
          // Ignore if property doesn't apply
        }
      }
    }
  }

  /**
   * Log debug messages
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.debug) {
      console.log(`[ShaderManager] ${message}`, ...args);
    }
  }
}

/**
 * Create a new ShaderManager instance
 */
export function createShaderManager(
  map: MapLibreMapInstance,
  options?: ShaderManagerOptions
): ShaderManager {
  return new ShaderManager(map, options);
}

/**
 * Apply a shader to a layer with simple API
 */
export function applyShader(
  map: MapLibreMapInstance,
  layerId: string,
  shaderName: string,
  config?: Partial<ShaderConfig & InteractivityConfig>
): ShaderController | InteractiveShaderController {
  // Extract interactivity config from combined config
  const interactivityConfig: InteractivityConfig | undefined = config?.perFeatureControl
    ? {
        perFeatureControl: config.perFeatureControl,
        initialState: config.initialState,
        onClick: config.onClick,
        onHover: config.onHover,
        featureIdProperty: config.featureIdProperty,
      }
    : undefined;

  const manager = new ShaderManager(map, { autoStart: true });
  manager.register(layerId, shaderName, config, interactivityConfig);

  const baseController: ShaderController = {
    pause: () => manager.pause(layerId),
    play: () => manager.play(layerId),
    update: (newConfig) => manager.updateConfig(layerId, newConfig),
    remove: () => {
      manager.unregister(layerId);
      manager.destroy();
    },
    isPlaying: () => manager.getInstance(layerId)?.isPlaying ?? false,
  };

  // Return InteractiveShaderController if perFeatureControl is enabled
  if (interactivityConfig?.perFeatureControl) {
    const customLayer = manager.getCustomLayer(layerId);
    const stateManager = (
      customLayer as { getStateManager?: () => FeatureAnimationStateManager | null }
    )?.getStateManager?.();

    if (stateManager) {
      return {
        ...baseController,
        playFeature: (featureId: string | number) => stateManager.playFeature(featureId),
        pauseFeature: (featureId: string | number) => stateManager.pauseFeature(featureId),
        resetFeature: (featureId: string | number) => stateManager.resetFeature(featureId),
        toggleFeature: (featureId: string | number) => stateManager.toggleFeature(featureId),
        playAll: () => stateManager.playAll(),
        pauseAll: () => stateManager.pauseAll(),
        resetAll: () => stateManager.resetAll(),
        getFeatureState: (featureId: string | number) => stateManager.getFeatureState(featureId),
      };
    }
  }

  return baseController;
}
