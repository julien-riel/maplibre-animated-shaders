/**
 * Base Shader Layer
 *
 * Abstract base class for geometry-specific shader layers (Point, Line, Polygon).
 * Implements MapLibre's CustomLayerInterface and provides common functionality:
 *
 * - **WebGL Management**: Shader compilation, program linking, buffer management
 * - **Animation Control**: Play/pause/speed control, time tracking
 * - **Data-Driven Properties**: Expression evaluation for per-feature styling
 * - **Interactive Animations**: Per-feature play/pause with click/hover support
 * - **Time Offsets**: Desynchronized animations for visual variety
 * - **Error Handling**: Graceful degradation with detailed error logging
 *
 * @module layers/BaseShaderLayer
 *
 * @example
 * ```typescript
 * // BaseShaderLayer is abstract - use concrete implementations:
 * import { PointShaderLayer, LineShaderLayer } from 'maplibre-animated-shaders';
 *
 * // Create a point shader layer
 * const layer = new PointShaderLayer('my-points', 'points-source', pulseShader, {
 *   color: '#ff0000',
 *   speed: 1.5,
 *   interactivity: {
 *     onClick: 'toggle',
 *     onHover: { enter: 'play', leave: 'pause' }
 *   }
 * });
 *
 * // Add to map
 * map.addLayer(layer);
 *
 * // Control animation
 * layer.play();
 * layer.pause();
 * layer.setSpeed(2.0);
 * ```
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import type {
  ShaderDefinition,
  ShaderConfig,
  AnimationTimingConfig,
  InteractivityConfig,
  RenderMatrixOrOptions,
  GeometryType,
} from '../types';
import { extractMatrix } from '../types';
import type { mat4 } from 'gl-matrix';
import { TimeOffsetCalculator } from '../timing';
import { ExpressionEvaluator, isExpression } from '../expressions';
import { FeatureAnimationStateManager, FeatureInteractionHandler } from '../interaction';
import { hexToRgba } from '../utils/color';
import {
  ShaderError,
  compileShaderWithErrorHandling,
  linkProgramWithGeometry,
  createBufferWithErrorHandling,
  safeCleanup,
  isContextLost,
} from '../utils/webgl-error-handler';
import { throttle, DEFAULT_UPDATE_THROTTLE_MS } from '../utils/throttle';
import { WebGLContext, type IWebGLContext } from '../webgl/WebGLContext';
import { InstancedRenderer } from '../webgl/InstancedRenderer';

/**
 * Per-feature evaluated data for data-driven properties
 */
export interface FeatureData {
  color: [number, number, number, number];
  intensity: number;
}

/**
 * Abstract base class for shader layers.
 *
 * Subclasses must implement:
 * - `createGeometryBuffers(gl, features)`: Create vertex/index buffers for the geometry type
 * - `layerTypeName`: String identifier for logging (e.g., 'PointShaderLayer')
 *
 * @example
 * ```typescript
 * class MyCustomLayer extends BaseShaderLayer {
 *   protected readonly layerTypeName = 'MyCustomLayer';
 *
 *   protected createGeometryBuffers(gl: WebGLRenderingContext, features: GeoJSON.Feature[]): void {
 *     // Create buffers for custom geometry
 *   }
 * }
 * ```
 */
/**
 * Abstract base class that implements MapLibre CustomLayerInterface.
 * Note: We don't use `implements CustomLayerInterface` due to render signature
 * differences between MapLibre 3.x/4.x (mat4) and 5.x (CustomRenderMethodInput).
 * The class is runtime-compatible with both versions.
 */
export abstract class BaseShaderLayer {
  id: string;
  type = 'custom' as const;
  renderingMode: '2d' | '3d' = '2d';

  protected map: MapLibreMap | null = null;
  protected sourceId: string;
  protected definition: ShaderDefinition;
  protected config: ShaderConfig;
  protected time: number = 0;
  protected isPlaying: boolean = true;
  protected speed: number = 1.0;
  protected lastFrameTime: number = 0;

  // WebGL resources
  protected program: WebGLProgram | null = null;
  protected vertexBuffer: WebGLBuffer | null = null;
  protected indexBuffer: WebGLBuffer | null = null;
  protected dataDrivenBuffer: WebGLBuffer | null = null;

  // Time offset calculator
  protected timeOffsetCalculator: TimeOffsetCalculator = new TimeOffsetCalculator();
  protected features: GeoJSON.Feature[] = [];

  // Expression evaluator for data-driven properties
  protected expressionEvaluator: ExpressionEvaluator = new ExpressionEvaluator();
  protected hasDataDrivenColor: boolean = false;
  protected hasDataDrivenIntensity: boolean = false;
  protected featureData: FeatureData[] = [];

  // Uniform locations
  protected uniforms: Map<string, WebGLUniformLocation | null> = new Map();

  // Vertex count for rendering
  protected vertexCount: number = 0;

  // Error handling state
  protected initializationError: Error | null = null;
  protected hasLoggedError: boolean = false;

  // Interactive animation state
  protected interactionEnabled: boolean = false;
  protected interactivityConfig: InteractivityConfig | null = null;
  protected stateManager: FeatureAnimationStateManager | null = null;
  protected interactionHandler: FeatureInteractionHandler | null = null;
  protected interactionBuffer: WebGLBuffer | null = null;

  // Layer name for logging
  protected abstract readonly layerTypeName: string;

  // Geometry type for this layer (used for error messages)
  protected abstract readonly geometryType: GeometryType;

  // Debug mode for shader compilation
  protected debug: boolean = false;

  // WebGL context wrapper for unified WebGL 1/2 API
  protected ctx: IWebGLContext | null = null;

  // Instanced renderer (optional, for layers that support instancing)
  protected instancedRenderer: InstancedRenderer | null = null;
  protected useInstancing: boolean = false;

  // Minimum feature count to enable instancing (small datasets don't benefit)
  protected static readonly INSTANCING_MIN_FEATURES = 100;

  /**
   * Options for BaseShaderLayer constructor
   */
  public static Options: {
    interactivityConfig?: InteractivityConfig;
    debug?: boolean;
  };

  constructor(
    id: string,
    sourceId: string,
    definition: ShaderDefinition,
    config: ShaderConfig,
    interactivityConfig?: InteractivityConfig,
    debug?: boolean
  ) {
    this.id = id;
    this.sourceId = sourceId;
    this.definition = definition;
    this.config = { ...definition.defaultConfig, ...config };
    this.debug = debug ?? false;

    // Initialize interaction if enabled
    if (interactivityConfig?.perFeatureControl) {
      this.interactionEnabled = true;
      this.interactivityConfig = interactivityConfig;
      this.stateManager = new FeatureAnimationStateManager(interactivityConfig);
    }

    // Compile expressions from config
    this.compileExpressions();
  }

  /**
   * Compile MapLibre expressions from config
   */
  protected compileExpressions(): void {
    this.expressionEvaluator.clear();
    this.hasDataDrivenColor = false;
    this.hasDataDrivenIntensity = false;

    // Check for color expression
    const colorValue = this.config.color;
    if (isExpression(colorValue)) {
      try {
        this.expressionEvaluator.compile('color', colorValue, 'color');
        this.hasDataDrivenColor = true;
      } catch (error) {
        console.warn(`[${this.layerTypeName}] Failed to compile color expression:`, error);
      }
    }

    // Check for intensity expression
    const intensityValue = this.config.intensity;
    if (isExpression(intensityValue)) {
      try {
        this.expressionEvaluator.compile('intensity', intensityValue, 'number');
        this.hasDataDrivenIntensity = true;
      } catch (error) {
        console.warn(`[${this.layerTypeName}] Failed to compile intensity expression:`, error);
      }
    }
  }

  /**
   * Update shader configuration
   */
  updateConfig(config: Partial<ShaderConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.speed !== undefined) {
      this.speed = config.speed;
    }

    // Recompile expressions if color or intensity changed
    if (config.color !== undefined || config.intensity !== undefined) {
      this.compileExpressions();
    }
  }

  /**
   * Update shader source code and recompile (hot-reload)
   *
   * @param fragmentShader - New fragment shader source code
   * @param vertexShader - Optional new vertex shader source code
   * @returns true if recompilation succeeded, false otherwise
   */
  updateShaderSource(fragmentShader: string, vertexShader?: string): boolean {
    if (!this.ctx || !this.program) {
      console.warn(`[${this.layerTypeName}] Cannot update shader: WebGL context not available`);
      return false;
    }

    const gl = this.ctx.gl;

    // Store old program in case compilation fails
    const oldProgram = this.program;
    const oldDefinition = this.definition;

    try {
      // Update definition with new shader sources
      this.definition = {
        ...this.definition,
        fragmentShader,
        ...(vertexShader && { vertexShader }),
      };

      // Create new program
      const newProgram = this.createProgram(gl);

      if (!newProgram) {
        // Revert to old definition
        this.definition = oldDefinition;
        console.error(`[${this.layerTypeName}] Hot-reload failed: program creation returned null`);
        return false;
      }

      // Success - delete old program and use new one
      gl.deleteProgram(oldProgram);
      this.program = newProgram;

      // Re-cache uniform locations for new program
      this.cacheUniformLocations(gl);

      // Trigger repaint
      this.map?.triggerRepaint();

      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log(`[${this.layerTypeName}] Hot-reload successful for layer "${this.id}"`);
      }

      return true;
    } catch (error) {
      // Revert to old definition on error
      this.definition = oldDefinition;
      console.error(`[${this.layerTypeName}] Hot-reload failed:`, error);
      return false;
    }
  }

  /**
   * Play animation
   */
  play(): void {
    this.isPlaying = true;
  }

  /**
   * Pause animation
   */
  pause(): void {
    this.isPlaying = false;
  }

  /**
   * Set animation speed
   */
  setSpeed(speed: number): void {
    this.speed = speed;
  }

  /**
   * Check if layer has an initialization error
   */
  hasError(): boolean {
    return this.initializationError !== null;
  }

  /**
   * Get the initialization error if any
   */
  getError(): Error | null {
    return this.initializationError;
  }

  /**
   * Called when the layer is added to the map
   */
  onAdd(map: MapLibreMap, gl: WebGLRenderingContext): void {
    this.map = map;
    this.initializationError = null;
    this.hasLoggedError = false;

    try {
      // Check for context loss
      if (isContextLost(gl)) {
        throw new Error('WebGL context is lost');
      }

      // Initialize WebGL context wrapper for unified WebGL 1/2 API
      this.ctx = new WebGLContext(gl);

      // Check if instancing is supported
      this.useInstancing = this.ctx.supportsInstancing && this.supportsInstancing();

      // Compile shaders and create program
      this.program = this.createProgram(gl);
      if (!this.program) {
        throw new Error('Failed to create shader program');
      }

      // Get attribute locations (geometry-specific)
      this.initializeAttributes(gl);

      // Get uniform locations
      this.cacheUniformLocations(gl);

      // Create buffers with error handling
      this.vertexBuffer = createBufferWithErrorHandling(gl, 'vertex', this.id);
      this.indexBuffer = createBufferWithErrorHandling(gl, 'index', this.id);
      this.dataDrivenBuffer = createBufferWithErrorHandling(gl, 'dataDriven', this.id);

      // Create interaction buffer if interaction is enabled
      if (this.interactionEnabled) {
        this.interactionBuffer = createBufferWithErrorHandling(gl, 'interaction', this.id);
      }

      // Initialize instanced renderer if supported
      if (this.useInstancing && this.ctx) {
        this.initializeInstancedRenderer(this.ctx);
      }
    } catch (error) {
      this.initializationError = error as Error;
      console.error(
        `[${this.layerTypeName}] Initialization failed for layer "${this.id}":`,
        error instanceof ShaderError ? error.message : error
      );
      return;
    }

    // Listen for source data changes (throttled to avoid excessive updates)
    const throttledUpdate = throttle(() => {
      this.safeUpdateData(gl);
      map.triggerRepaint();
    }, DEFAULT_UPDATE_THROTTLE_MS);

    const onSourceData = (e: { sourceId: string; isSourceLoaded?: boolean }) => {
      if (e.sourceId === this.sourceId && e.isSourceLoaded) {
        throttledUpdate();
      }
    };
    map.on('sourcedata', onSourceData);

    // Initial data load - check if source is already loaded, otherwise wait for idle
    if (map.isSourceLoaded(this.sourceId)) {
      this.safeUpdateData(gl);
      map.triggerRepaint();
    } else {
      map.once('idle', () => {
        this.safeUpdateData(gl);
        map.triggerRepaint();
      });
    }

    this.lastFrameTime = performance.now();

    // Setup interaction handler if enabled
    if (this.interactionEnabled && this.stateManager && this.interactivityConfig) {
      // Original layer ID for events (remove -shader suffix)
      const originalLayerId = this.id.replace('-shader', '');
      this.interactionHandler = new FeatureInteractionHandler(
        map,
        originalLayerId,
        this.stateManager,
        this.interactivityConfig
      );
    }
  }

  /**
   * Safe wrapper for updateData with error handling
   */
  private safeUpdateData(gl: WebGLRenderingContext): void {
    try {
      this.updateData(gl);
    } catch (error) {
      console.error(`[${this.layerTypeName}] Error updating data for layer "${this.id}":`, error);
    }
  }

  /**
   * Called when the layer is removed
   */
  onRemove(_map: MapLibreMap, gl: WebGLRenderingContext): void {
    // Dispose interaction handler
    if (this.interactionHandler) {
      this.interactionHandler.dispose();
      this.interactionHandler = null;
    }

    // Dispose instanced renderer
    if (this.instancedRenderer) {
      this.instancedRenderer.dispose();
      this.instancedRenderer = null;
    }

    // Release geometry-specific pooled objects
    this.releasePooledData();
    this.featureData = [];

    // Use safe cleanup to handle any errors during resource disposal
    safeCleanup(gl, {
      program: this.program,
      buffers: [this.vertexBuffer, this.indexBuffer, this.dataDrivenBuffer, this.interactionBuffer],
    });

    this.program = null;
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.dataDrivenBuffer = null;
    this.interactionBuffer = null;
    this.map = null;
    this.ctx = null;
    this.initializationError = null;
    this.stateManager = null;
    this.useInstancing = false;
    this.expressionEvaluator.clear();
  }

  /**
   * Render the layer
   * Supports both MapLibre 3.x/4.x (mat4) and 5.x (CustomRenderMethodInput) signatures
   */
  render(gl: WebGLRenderingContext, matrixOrOptions: RenderMatrixOrOptions): void {
    // Skip rendering if there was an initialization error
    if (this.initializationError) {
      if (!this.hasLoggedError) {
        console.warn(
          `[${this.layerTypeName}] Skipping render for layer "${this.id}" due to initialization error`
        );
        this.hasLoggedError = true;
      }
      return;
    }

    // Check for WebGL context loss
    if (isContextLost(gl)) {
      console.warn(`[${this.layerTypeName}] WebGL context lost for layer "${this.id}"`);
      return;
    }

    if (!this.program || !this.map || this.vertexCount === 0) return;

    // Extract matrix from either MapLibre 3.x/4.x mat4 or 5.x options object
    const matrix = extractMatrix(matrixOrOptions) as mat4;

    // Update time
    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (this.isPlaying) {
      this.time += deltaTime * this.speed;
    }

    // Update interaction state manager
    if (this.interactionEnabled && this.stateManager) {
      this.stateManager.tick(this.time, deltaTime);

      // Update interaction buffer if state changed
      if (this.stateManager.isDirty() && this.interactionBuffer) {
        this.updateInteractionBufferFromState(gl);
        this.stateManager.clearDirty();
      }
    }

    // Use our shader program
    gl.useProgram(this.program);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Disable depth test for 2D rendering
    gl.disable(gl.DEPTH_TEST);

    // Get canvas size
    const canvas = this.map.getCanvas();
    const resolution: [number, number] = [canvas.width, canvas.height];

    // Set common uniforms
    this.setCommonUniforms(gl, matrix, resolution);

    // Set data-driven flags
    const uUseDataDrivenColor = this.uniforms.get('u_useDataDrivenColor');
    const uUseDataDrivenIntensity = this.uniforms.get('u_useDataDrivenIntensity');
    if (uUseDataDrivenColor) gl.uniform1f(uUseDataDrivenColor, this.hasDataDrivenColor ? 1.0 : 0.0);
    if (uUseDataDrivenIntensity)
      gl.uniform1f(uUseDataDrivenIntensity, this.hasDataDrivenIntensity ? 1.0 : 0.0);

    // Set shader-specific uniforms
    this.setShaderUniforms(gl);

    // Geometry-specific rendering
    this.renderGeometry(gl);

    // Request another frame
    if (this.isPlaying) {
      this.map.triggerRepaint();
    }
  }

  /**
   * Create the shader program with comprehensive error handling
   *
   * Uses geometry-aware error messages that suggest correct varyings
   * when a varying mismatch is detected.
   */
  protected createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;

    try {
      // Compile shaders using error handling utilities
      vertexShader = compileShaderWithErrorHandling(
        gl,
        gl.VERTEX_SHADER,
        this.getVertexShader(),
        this.id
      );

      fragmentShader = compileShaderWithErrorHandling(
        gl,
        gl.FRAGMENT_SHADER,
        this.definition.fragmentShader,
        this.id
      );

      // Link program using geometry-aware error handling
      const program = linkProgramWithGeometry(gl, vertexShader, fragmentShader, {
        layerId: this.id,
        geometryType: this.geometryType,
        debug: this.debug,
      });

      // Clean up shaders (they're now part of the program)
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);

      return program;
    } catch (error) {
      // Clean up any created shaders on error
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);

      // Re-throw to be caught by onAdd
      throw error;
    }
  }

  /**
   * Get a sanitized config that replaces expressions with default values
   * This is needed because getUniforms expects static values, not MapLibre expressions
   * Data-driven properties are handled via vertex attributes, not uniforms
   */
  protected getSanitizedConfigForUniforms(): ShaderConfig {
    const sanitized: ShaderConfig = { ...this.config };
    const defaults = this.definition.defaultConfig;

    // Replace expressions with defaults for data-driven properties
    if (this.hasDataDrivenColor && defaults.color !== undefined) {
      sanitized.color = defaults.color;
    }
    if (this.hasDataDrivenIntensity && defaults.intensity !== undefined) {
      sanitized.intensity = defaults.intensity;
    }

    // Also check and sanitize any other expression-type values
    for (const [key, value] of Object.entries(sanitized)) {
      if (isExpression(value) && defaults[key] !== undefined) {
        sanitized[key] = defaults[key];
      }
    }

    return sanitized;
  }

  /**
   * Set shader-specific uniforms from config
   */
  protected setShaderUniforms(gl: WebGLRenderingContext): void {
    // Create a sanitized config that replaces expressions with default values
    // Data-driven properties are handled via attributes, not uniforms
    const sanitizedConfig = this.getSanitizedConfigForUniforms();

    // Get uniforms from the shader's getUniforms function
    const uniforms = this.definition.getUniforms(sanitizedConfig, this.time, 0);

    for (const [key, value] of Object.entries(uniforms)) {
      const location = this.uniforms.get(key);
      if (!location) continue;

      if (Array.isArray(value)) {
        if (value.length === 2) {
          gl.uniform2fv(location, value as number[]);
        } else if (value.length === 3) {
          gl.uniform3fv(location, value as number[]);
        } else if (value.length === 4) {
          gl.uniform4fv(location, value as number[]);
        }
      } else if (typeof value === 'number') {
        gl.uniform1f(location, value);
      } else if (typeof value === 'boolean') {
        gl.uniform1f(location, value ? 1.0 : 0.0);
      }
      // Skip string values (like color strings) - they should be converted to vec4 in getUniforms
    }

    // Also set u_color as vec4 if we have u_color_vec4
    const colorVec4 = uniforms.u_color_vec4;
    if (colorVec4 && Array.isArray(colorVec4)) {
      const uColor = this.uniforms.get('u_color');
      if (uColor) {
        gl.uniform4fv(uColor, colorVec4 as number[]);
      }
    }
  }

  /**
   * Evaluate data-driven properties for all features
   */
  protected evaluateDataDrivenProperties(): void {
    if (!this.map) return;

    const zoom = this.map.getZoom();
    this.featureData = [];

    // Get default color from config
    const defaultColorValue = this.config.color;
    let defaultColor: [number, number, number, number] = [1, 1, 1, 1];
    if (typeof defaultColorValue === 'string' && !isExpression(defaultColorValue)) {
      defaultColor = hexToRgba(defaultColorValue);
    } else if (
      Array.isArray(defaultColorValue) &&
      defaultColorValue.length === 4 &&
      typeof defaultColorValue[0] === 'number'
    ) {
      defaultColor = defaultColorValue as [number, number, number, number];
    }

    // Get default intensity from config
    const defaultIntensity =
      typeof this.config.intensity === 'number' ? this.config.intensity : 1.0;

    for (let i = 0; i < this.features.length; i++) {
      const feature = this.features[i];

      // Evaluate color
      let color: [number, number, number, number] = defaultColor;
      if (this.hasDataDrivenColor) {
        const evaluated = this.expressionEvaluator.evaluateExpression('color', feature, zoom);
        if (evaluated && typeof evaluated === 'object' && 'r' in evaluated) {
          const c = evaluated as { r: number; g: number; b: number; a: number };
          color = [c.r, c.g, c.b, c.a];
        } else if (typeof evaluated === 'string') {
          color = hexToRgba(evaluated);
        }
      }

      // Evaluate intensity
      let intensity = defaultIntensity;
      if (this.hasDataDrivenIntensity) {
        const evaluated = this.expressionEvaluator.evaluateExpression('intensity', feature, zoom);
        if (typeof evaluated === 'number') {
          intensity = evaluated;
        }
      }

      this.featureData.push({ color, intensity });
    }
  }

  /**
   * Update the interaction buffer with new state data (common implementation)
   */
  protected updateInteractionBuffer(
    gl: WebGLRenderingContext,
    isPlayingData: Float32Array,
    localTimeData: Float32Array
  ): void {
    if (!this.interactionBuffer) return;

    // Interleave isPlaying and localTime data
    // Layout: [isPlaying0, localTime0, isPlaying1, localTime1, ...]
    const interleavedData = new Float32Array(isPlayingData.length * 2);
    for (let i = 0; i < isPlayingData.length; i++) {
      interleavedData[i * 2] = isPlayingData[i];
      interleavedData[i * 2 + 1] = localTimeData[i];
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.interactionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, interleavedData, gl.DYNAMIC_DRAW);
  }

  /**
   * Get the state manager for external control of per-feature animation
   */
  getStateManager(): FeatureAnimationStateManager | null {
    return this.stateManager;
  }

  /**
   * Convert lng/lat to Mercator coordinates (0-1 range)
   */
  protected lngLatToMercator(lng: number, lat: number): [number, number] {
    const x = (lng + 180) / 360;
    const sinLat = Math.sin((lat * Math.PI) / 180);
    const y = 0.5 - (0.25 * Math.log((1 + sinLat) / (1 - sinLat))) / Math.PI;
    return [x, y];
  }

  /**
   * Get time offsets for features based on timing config
   */
  protected getTimeOffsets(): Float32Array {
    const timingConfig = this.config as unknown as AnimationTimingConfig;
    return this.timeOffsetCalculator.calculateOffsets(this.features, timingConfig);
  }

  // =========================================================================
  // Abstract methods to be implemented by subclasses
  // =========================================================================

  /**
   * Get the vertex shader source code for this geometry type
   */
  protected abstract getVertexShader(): string;

  /**
   * Initialize attribute locations (geometry-specific)
   */
  protected abstract initializeAttributes(gl: WebGLRenderingContext): void;

  /**
   * Cache uniform locations (includes geometry-specific uniforms)
   */
  protected abstract cacheUniformLocations(gl: WebGLRenderingContext): void;

  /**
   * Set common uniforms (matrix, resolution, size/width, time)
   */
  protected abstract setCommonUniforms(
    gl: WebGLRenderingContext,
    matrix: mat4,
    resolution: [number, number]
  ): void;

  /**
   * Update geometry data from source
   */
  protected abstract updateData(gl: WebGLRenderingContext): void;

  /**
   * Release pooled geometry objects back to the pool
   */
  protected abstract releasePooledData(): void;

  /**
   * Render the geometry (bind buffers, set attributes, draw)
   */
  protected abstract renderGeometry(gl: WebGLRenderingContext): void;

  /**
   * Update interaction buffer from state manager (geometry-specific expansion)
   */
  protected abstract updateInteractionBufferFromState(gl: WebGLRenderingContext): void;

  // =========================================================================
  // Instancing hooks - Override in subclasses to enable instanced rendering
  // =========================================================================

  /**
   * Check if this layer type supports instanced rendering.
   * Override in subclasses that implement instancing.
   *
   * @returns true if instancing is supported
   */
  protected supportsInstancing(): boolean {
    return false;
  }

  /**
   * Initialize the instanced renderer with geometry.
   * Override in subclasses that implement instancing.
   *
   * @param ctx - WebGL context wrapper
   */
  protected initializeInstancedRenderer(_ctx: IWebGLContext): void {
    // Default: no-op. Override in subclasses.
  }

  /**
   * Check if instancing should be used for the current feature count.
   * Uses the INSTANCING_MIN_FEATURES threshold.
   *
   * @param featureCount - Number of features to render
   * @returns true if instancing should be used
   */
  protected shouldUseInstancing(featureCount: number): boolean {
    return this.useInstancing && featureCount >= BaseShaderLayer.INSTANCING_MIN_FEATURES;
  }

  /**
   * Get the WebGL context wrapper.
   *
   * @returns WebGL context or null if not initialized
   */
  protected getContext(): IWebGLContext | null {
    return this.ctx;
  }

  /**
   * Check if instancing is currently enabled.
   *
   * @returns true if instancing is enabled
   */
  isInstancingEnabled(): boolean {
    return this.useInstancing && this.instancedRenderer !== null;
  }
}
