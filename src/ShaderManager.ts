import type {
  IShaderManager,
  MapLibreMapInstance,
  ShaderConfig,
  ShaderController,
  ShaderDefinition,
  ShaderInstance,
  ShaderManagerOptions,
} from './types';
import { AnimationLoop } from './AnimationLoop';
import { ConfigResolver } from './ConfigResolver';
import { globalRegistry, ShaderRegistry } from './ShaderRegistry';
import { PointShaderLayer } from './layers/PointShaderLayer';
import { LineShaderLayer } from './layers/LineShaderLayer';

/**
 * Main entry point for managing animated shaders on a MapLibre map.
 * Handles shader lifecycle, animation synchronization, and configuration.
 */
export class ShaderManager implements IShaderManager {
  private map: MapLibreMapInstance;
  private animationLoop: AnimationLoop;
  private configResolver: ConfigResolver;
  private registry: ShaderRegistry;
  private instances: Map<string, ShaderInstance> = new Map();
  private customLayers: Map<string, PointShaderLayer | LineShaderLayer> = new Map();
  private options: Required<ShaderManagerOptions>;
  private debug: boolean;

  constructor(map: MapLibreMapInstance, options: ShaderManagerOptions = {}) {
    this.map = map;
    this.options = {
      targetFPS: options.targetFPS ?? 60,
      autoStart: options.autoStart ?? true,
      debug: options.debug ?? false,
    };
    this.debug = this.options.debug;

    this.animationLoop = new AnimationLoop(this.options.targetFPS);
    this.configResolver = new ConfigResolver();
    this.registry = globalRegistry;

    if (this.options.autoStart) {
      this.animationLoop.start();
    }

    this.log('ShaderManager initialized');
  }

  /**
   * Register a shader on a layer
   */
  register(layerId: string, shaderName: string, config?: Partial<ShaderConfig>): void {
    // Get shader definition
    const definition = this.registry.get(shaderName);
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

    // For point shaders, use WebGL custom layer
    if (definition.geometry === 'point') {
      this.registerPointShader(layerId, definition, resolvedConfig);
      return;
    }

    // For line shaders, use WebGL custom layer
    if (definition.geometry === 'line') {
      this.registerLineShader(layerId, definition, resolvedConfig);
      return;
    }

    // For other geometries, use paint property animation (legacy)
    this.registerPaintShader(layerId, definition, resolvedConfig);
  }

  /**
   * Register a point shader using WebGL custom layer
   */
  private registerPointShader(
    layerId: string,
    definition: ShaderDefinition,
    config: ShaderConfig
  ): void {
    // Get the source ID from the existing layer
    const existingLayer = this.map.getLayer(layerId);
    if (!existingLayer) {
      throw new Error(`[ShaderManager] Layer "${layerId}" not found on map`);
    }

    // Get source ID from the layer
    const sourceId = (existingLayer as { source?: string }).source;
    if (!sourceId) {
      throw new Error(`[ShaderManager] Layer "${layerId}" has no source`);
    }

    // Create custom layer ID
    const customLayerId = `${layerId}-shader`;

    // Remove existing custom layer if present
    if (this.map.getLayer(customLayerId)) {
      this.map.removeLayer(customLayerId);
    }

    // Make original layer invisible but keep it in the render tree
    // This ensures the source data is loaded
    this.map.setPaintProperty(layerId, 'circle-opacity', 0);
    this.map.setPaintProperty(layerId, 'circle-stroke-opacity', 0);

    // Create the custom layer
    const customLayer = new PointShaderLayer(
      customLayerId,
      sourceId,
      definition,
      config
    );

    // Add the custom layer to the map
    this.map.addLayer(customLayer, layerId);

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

    this.log(`Registered point shader "${definition.name}" on layer "${layerId}" (WebGL)`);
  }

  /**
   * Register a line shader using WebGL custom layer
   */
  private registerLineShader(
    layerId: string,
    definition: ShaderDefinition,
    config: ShaderConfig
  ): void {
    // Get the source ID from the existing layer
    const existingLayer = this.map.getLayer(layerId);
    if (!existingLayer) {
      throw new Error(`[ShaderManager] Layer "${layerId}" not found on map`);
    }

    // Get source ID from the layer
    const sourceId = (existingLayer as { source?: string }).source;
    if (!sourceId) {
      throw new Error(`[ShaderManager] Layer "${layerId}" has no source`);
    }

    // Create custom layer ID
    const customLayerId = `${layerId}-shader`;

    // Remove existing custom layer if present
    if (this.map.getLayer(customLayerId)) {
      this.map.removeLayer(customLayerId);
    }

    // Make original layer invisible but keep it in the render tree
    this.map.setPaintProperty(layerId, 'line-opacity', 0);

    // Create the custom layer
    const customLayer = new LineShaderLayer(
      customLayerId,
      sourceId,
      definition,
      config
    );

    // Add the custom layer to the map
    this.map.addLayer(customLayer, layerId);

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

    this.log(`Registered line shader "${definition.name}" on layer "${layerId}" (WebGL)`);
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
      const customLayerId = `${layerId}-shader`;
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
   * Clean up all resources
   */
  destroy(): void {
    // Remove all custom layers
    for (const [layerId] of this.customLayers) {
      const customLayerId = `${layerId}-shader`;
      if (this.map.getLayer(customLayerId)) {
        this.map.removeLayer(customLayerId);
      }
      // Restore original layer opacity based on geometry type
      const instance = this.instances.get(layerId);
      if (this.map.getLayer(layerId) && instance) {
        const geometry = instance.definition.geometry;
        if (geometry === 'point') {
          this.map.setPaintProperty(layerId, 'circle-opacity', 1);
          this.map.setPaintProperty(layerId, 'circle-stroke-opacity', 1);
        } else if (geometry === 'line') {
          this.map.setPaintProperty(layerId, 'line-opacity', 1);
        }
      }
    }
    this.customLayers.clear();

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
  config?: Partial<ShaderConfig>
): ShaderController {
  const manager = new ShaderManager(map, { autoStart: true });
  manager.register(layerId, shaderName, config);

  return {
    pause: () => manager.pause(layerId),
    play: () => manager.play(layerId),
    update: (newConfig) => manager.updateConfig(layerId, newConfig),
    remove: () => {
      manager.unregister(layerId);
      manager.destroy();
    },
    isPlaying: () => manager.getInstance(layerId)?.isPlaying ?? false,
  };
}

/**
 * Remove a shader from a layer
 * @deprecated Use the controller returned by applyShader instead
 */
export function removeShader(_map: MapLibreMapInstance, _layerId: string): void {
  console.warn(
    '[removeShader] This function is deprecated. Use the controller returned by applyShader instead.'
  );
}
