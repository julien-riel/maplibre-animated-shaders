/**
 * ShaderManager - Main facade for managing animated shaders on a MapLibre map.
 *
 * This class provides the public API for:
 * - Registering and unregistering shaders on map layers
 * - Controlling shader playback (play, pause, speed)
 * - Managing plugins
 * - Collecting performance metrics
 */

import type {
  IShaderManager,
  MapLibreMapInstance,
  ShaderConfig,
  ShaderController,
  InteractiveShaderController,
  InteractivityConfig,
  ShaderInstance,
  ShaderManagerOptions,
  ShaderPlugin,
  ShaderMetrics,
  PerformanceWarningHandler,
} from './types';
import { FeatureAnimationStateManager } from './interaction';
import { loadPlugin, type BuiltinPluginName } from './plugins';
import {
  createState,
  destroyState,
  log,
  registerShader,
  unregisterShader,
  removeAllShaders,
  play as corePlay,
  pause as corePause,
  setSpeed as coreSetSpeed,
  updateShaderConfig,
  type ShaderManagerState,
  type ShaderLayerUnion,
} from './core';

/**
 * Main entry point for managing animated shaders on a MapLibre map.
 * Handles shader lifecycle, animation synchronization, and configuration.
 */
export class ShaderManager implements IShaderManager {
  private state: ShaderManagerState;

  constructor(map: MapLibreMapInstance, options: ShaderManagerOptions = {}) {
    this.state = createState(map, options);
    this.state.pluginManager.setManager(this);
    log(this.state, 'ShaderManager initialized');
  }

  // =========================================================================
  // Plugin Management
  // =========================================================================

  /**
   * Register a plugin with the shader manager.
   *
   * Plugins provide named shaders with namespace support.
   * Example: use(myPlugin) makes shaders available as "pluginName:shaderName"
   */
  use(plugin: ShaderPlugin): void {
    this.state.pluginManager.use(plugin);
    log(this.state, `Plugin "${plugin.name}" v${plugin.version} registered`);
  }

  /**
   * Lazy load and register a built-in plugin.
   *
   * This method loads the plugin dynamically, reducing initial bundle size.
   * Use this instead of importing plugins directly for better code splitting.
   */
  async useAsync(pluginName: BuiltinPluginName): Promise<void> {
    const plugin = await loadPlugin(pluginName);
    this.use(plugin);
  }

  /**
   * Lazy load and register multiple built-in plugins in parallel.
   */
  async useAsyncAll(pluginNames: BuiltinPluginName[]): Promise<void> {
    await Promise.all(pluginNames.map((name) => this.useAsync(name)));
  }

  /**
   * Unregister a plugin from the shader manager.
   *
   * @returns true if the plugin was found and removed, false otherwise
   */
  unuse(pluginName: string): boolean {
    const result = this.state.pluginManager.unuse(pluginName);
    if (result) {
      log(this.state, `Plugin "${pluginName}" unregistered`);
    }
    return result;
  }

  /** Get a registered plugin by name */
  getPlugin(name: string): ShaderPlugin | undefined {
    return this.state.pluginManager.getPlugin(name);
  }

  /** Check if a plugin is registered */
  hasPlugin(name: string): boolean {
    return this.state.pluginManager.hasPlugin(name);
  }

  /** List all registered plugin names */
  listPlugins(): string[] {
    return this.state.pluginManager.listPlugins();
  }

  // =========================================================================
  // Shader Registration
  // =========================================================================

  /**
   * Register a shader on a layer.
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
    registerShader(this.state, layerId, shaderName, config, interactivityConfig);
  }

  /** Unregister a shader from a layer */
  unregister(layerId: string): void {
    unregisterShader(this.state, layerId);
  }

  // =========================================================================
  // Playback Control
  // =========================================================================

  /** Play animation for a specific layer or all layers */
  play(layerId?: string): void {
    corePlay(this.state, layerId);
  }

  /** Pause animation for a specific layer or all layers */
  pause(layerId?: string): void {
    corePause(this.state, layerId);
  }

  /** Set speed for a specific layer */
  setSpeed(layerId: string, speed: number): void {
    coreSetSpeed(this.state, layerId, speed);
  }

  /** Update configuration at runtime */
  updateConfig(layerId: string, config: Partial<ShaderConfig>): void {
    updateShaderConfig(this.state, layerId, config);
  }

  /**
   * Update shader source code at runtime (hot-reload)
   *
   * This allows updating the GLSL shader code without removing and re-registering
   * the shader. Useful for development workflows and live shader editing.
   *
   * @param layerId - The layer ID to update
   * @param fragmentShader - New fragment shader source code
   * @param vertexShader - Optional new vertex shader source code
   * @returns true if the update succeeded, false otherwise
   *
   * @example
   * ```typescript
   * const newFragmentShader = `
   *   precision mediump float;
   *   uniform float u_time;
   *   void main() {
   *     gl_FragColor = vec4(sin(u_time), 0.0, 0.0, 1.0);
   *   }
   * `;
   * shaderManager.updateShaderSource('my-layer', newFragmentShader);
   * ```
   */
  updateShaderSource(layerId: string, fragmentShader: string, vertexShader?: string): boolean {
    const customLayer = this.state.customLayers.get(layerId);
    if (!customLayer) {
      log(this.state, `Cannot update shader source: layer "${layerId}" not found`);
      return false;
    }

    const success = customLayer.updateShaderSource(fragmentShader, vertexShader);

    if (success) {
      // Also update the instance definition for consistency
      const instance = this.state.instances.get(layerId);
      if (instance) {
        instance.definition = {
          ...instance.definition,
          fragmentShader,
          ...(vertexShader && { vertexShader }),
        };
      }
      log(this.state, `Shader source updated for layer "${layerId}"`);
    }

    return success;
  }

  /** Set global animation speed */
  setGlobalSpeed(speed: number): void {
    this.state.animationLoop.setGlobalSpeed(speed);
  }

  /** Get current animation time */
  getTime(): number {
    return this.state.animationLoop.getTime();
  }

  // =========================================================================
  // State Accessors
  // =========================================================================

  /** Get all registered layer IDs */
  getRegisteredLayers(): string[] {
    return Array.from(this.state.instances.keys());
  }

  /** Get shader instance for a layer */
  getInstance(layerId: string): ShaderInstance | undefined {
    return this.state.instances.get(layerId);
  }

  /** Get custom layer for a layer ID */
  getCustomLayer(layerId: string): ShaderLayerUnion | undefined {
    return this.state.customLayers.get(layerId);
  }

  // =========================================================================
  // Metrics & Observability
  // =========================================================================

  /** Get current performance metrics */
  getMetrics(): ShaderMetrics {
    this.state.metricsCollector.setActiveShaders(this.state.instances.size);
    this.state.metricsCollector.setFeaturesRendered(this.state.totalFeaturesRendered);
    return this.state.metricsCollector.getMetrics();
  }

  /** Register a callback for performance warnings */
  onPerformanceWarning(handler: PerformanceWarningHandler): () => void {
    return this.state.metricsCollector.onPerformanceWarning(handler);
  }

  /** Enable or disable metrics collection */
  setMetricsEnabled(enabled: boolean): void {
    this.state.metricsCollector.setEnabled(enabled);
  }

  /** Check if metrics collection is enabled */
  isMetricsEnabled(): boolean {
    return this.state.metricsCollector.isEnabled();
  }

  /** Reset metrics to initial state */
  resetMetrics(): void {
    this.state.metricsCollector.reset();
  }

  /** Record frame metrics (called internally by animation loop) */
  recordFrame(_frameTime: number): void {
    this.state.metricsCollector.endFrame(1000 / this.state.options.targetFPS);
  }

  /** Update the total features rendered count */
  updateFeaturesRendered(count: number): void {
    this.state.totalFeaturesRendered = count;
    this.state.metricsCollector.setFeaturesRendered(count);
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /** Clean up all resources */
  destroy(): void {
    removeAllShaders(this.state);
    destroyState(this.state);
  }
}

// =========================================================================
// Factory Functions
// =========================================================================

/**
 * Create a new ShaderManager instance.
 */
export function createShaderManager(
  map: MapLibreMapInstance,
  options?: ShaderManagerOptions
): ShaderManager {
  return new ShaderManager(map, options);
}

/**
 * Apply a shader to a layer with simple API.
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
