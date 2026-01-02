/**
 * PolygonShaderLayer - WebGL Custom Layer for polygon shaders
 *
 * Implements MapLibre's CustomLayerInterface to render polygons
 * with custom GLSL fragment shaders.
 *
 * Supports data-driven properties via MapLibre-style expressions:
 * - color: ['get', 'fill_color']
 * - intensity: ['match', ['get', 'zone'], 'residential', 0.5, 1.0]
 */

import type { CustomLayerInterface, Map as MapLibreMap } from 'maplibre-gl';
import type { ShaderDefinition, ShaderConfig, AnimationTimingConfig, InteractivityConfig } from '../types';
import type { mat4 } from 'gl-matrix';
import { TimeOffsetCalculator } from '../timing';
import { ExpressionEvaluator, isExpression } from '../expressions';
import { FeatureAnimationStateManager, FeatureInteractionHandler } from '../interaction';
import { hexToRgba } from '../utils/color';
import {
  ShaderError,
  compileShaderWithErrorHandling,
  linkProgramWithErrorHandling,
  createBufferWithErrorHandling,
  safeCleanup,
  isContextLost,
} from '../utils/webgl-error-handler';

/**
 * Vertex shader for polygon rendering
 * Renders triangulated polygons with UV coordinates
 *
 * Supports data-driven properties via per-vertex attributes:
 * - a_color: Per-feature color (RGBA)
 * - a_intensity: Per-feature intensity
 *
 * Supports per-feature interactive animation:
 * - a_isPlaying: 0.0 = paused, 1.0 = playing
 * - a_localTime: Frozen time when paused
 */
const POLYGON_VERTEX_SHADER = `
  attribute vec2 a_pos;
  attribute vec2 a_uv;
  attribute vec2 a_centroid;
  attribute float a_polygon_index;
  attribute float a_timeOffset;
  attribute vec4 a_color;
  attribute float a_intensity;
  attribute float a_isPlaying;
  attribute float a_localTime;

  uniform mat4 u_matrix;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_useDataDrivenColor;
  uniform float u_useDataDrivenIntensity;

  varying vec2 v_pos;
  varying vec2 v_uv;
  varying vec2 v_centroid;
  varying float v_polygon_index;
  varying vec2 v_screen_pos;
  varying float v_timeOffset;
  varying float v_effectiveTime;
  varying vec4 v_color;
  varying float v_intensity;
  varying float v_useDataDrivenColor;
  varying float v_useDataDrivenIntensity;

  void main() {
    vec4 projected = u_matrix * vec4(a_pos, 0.0, 1.0);
    gl_Position = projected;

    // Pass data to fragment shader
    v_pos = a_pos;
    v_uv = a_uv;
    v_centroid = a_centroid;
    v_polygon_index = a_polygon_index;
    v_timeOffset = a_timeOffset;

    // Calculate effective time for interactive animation
    float globalAnimTime = u_time + a_timeOffset;
    v_effectiveTime = mix(a_localTime, globalAnimTime, a_isPlaying);

    // Screen position for effects
    v_screen_pos = (projected.xy / projected.w + 1.0) * 0.5 * u_resolution;

    // Pass data-driven properties
    v_color = a_color;
    v_intensity = a_intensity;
    v_useDataDrivenColor = u_useDataDrivenColor;
    v_useDataDrivenIntensity = u_useDataDrivenIntensity;
  }
`;

interface PolygonData {
  vertices: number[][];
  centroid: [number, number];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  index: number;
}

/**
 * Per-feature evaluated data for data-driven properties
 */
interface FeatureData {
  color: [number, number, number, number];
  intensity: number;
}

/**
 * PolygonShaderLayer - Custom WebGL layer for polygon shaders
 *
 * Supports data-driven properties via MapLibre-style expressions.
 */
export class PolygonShaderLayer implements CustomLayerInterface {
  id: string;
  type: 'custom' = 'custom';
  renderingMode: '2d' | '3d' = '2d';

  private map: MapLibreMap | null = null;
  private sourceId: string;
  private definition: ShaderDefinition;
  private config: ShaderConfig;
  private time: number = 0;
  private isPlaying: boolean = true;
  private speed: number = 1.0;
  private lastFrameTime: number = 0;

  // WebGL resources
  private program: WebGLProgram | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  private dataDrivenBuffer: WebGLBuffer | null = null;

  // Attribute locations
  private aPos: number = -1;
  private aUv: number = -1;
  private aCentroid: number = -1;
  private aPolygonIndex: number = -1;
  private aTimeOffset: number = -1;
  private aColor: number = -1;
  private aIntensity: number = -1;
  private aIsPlaying: number = -1;
  private aLocalTime: number = -1;

  // Time offset calculator
  private timeOffsetCalculator: TimeOffsetCalculator = new TimeOffsetCalculator();
  private features: GeoJSON.Feature[] = [];

  // Expression evaluator for data-driven properties
  private expressionEvaluator: ExpressionEvaluator = new ExpressionEvaluator();
  private hasDataDrivenColor: boolean = false;
  private hasDataDrivenIntensity: boolean = false;
  private featureData: FeatureData[] = [];

  // Uniform locations
  private uniforms: Map<string, WebGLUniformLocation | null> = new Map();

  // Polygon data
  private polygons: PolygonData[] = [];
  private vertexCount: number = 0;
  private totalVertices: number = 0;

  // Error handling state
  private initializationError: Error | null = null;
  private hasLoggedError: boolean = false;

  // Interactive animation state
  private interactionEnabled: boolean = false;
  private interactivityConfig: InteractivityConfig | null = null;
  private stateManager: FeatureAnimationStateManager | null = null;
  private interactionHandler: FeatureInteractionHandler | null = null;
  private interactionBuffer: WebGLBuffer | null = null;

  constructor(
    id: string,
    sourceId: string,
    definition: ShaderDefinition,
    config: ShaderConfig,
    interactivityConfig?: InteractivityConfig
  ) {
    this.id = id;
    this.sourceId = sourceId;
    this.definition = definition;
    this.config = { ...definition.defaultConfig, ...config };

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
  private compileExpressions(): void {
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
        console.warn(`[PolygonShaderLayer] Failed to compile color expression:`, error);
      }
    }

    // Check for intensity expression
    const intensityValue = this.config.intensity;
    if (isExpression(intensityValue)) {
      try {
        this.expressionEvaluator.compile('intensity', intensityValue, 'number');
        this.hasDataDrivenIntensity = true;
      } catch (error) {
        console.warn(`[PolygonShaderLayer] Failed to compile intensity expression:`, error);
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
      if (isContextLost(gl)) {
        throw new Error('WebGL context is lost');
      }

      this.program = this.createProgram(gl);
      if (!this.program) {
        throw new Error('Failed to create shader program');
      }

      this.aPos = gl.getAttribLocation(this.program, 'a_pos');
      this.aUv = gl.getAttribLocation(this.program, 'a_uv');
      this.aCentroid = gl.getAttribLocation(this.program, 'a_centroid');
      this.aPolygonIndex = gl.getAttribLocation(this.program, 'a_polygon_index');
      this.aTimeOffset = gl.getAttribLocation(this.program, 'a_timeOffset');
      this.aColor = gl.getAttribLocation(this.program, 'a_color');
      this.aIntensity = gl.getAttribLocation(this.program, 'a_intensity');
      this.aIsPlaying = gl.getAttribLocation(this.program, 'a_isPlaying');
      this.aLocalTime = gl.getAttribLocation(this.program, 'a_localTime');

      this.cacheUniformLocations(gl);

      this.vertexBuffer = createBufferWithErrorHandling(gl, 'vertex', this.id);
      this.indexBuffer = createBufferWithErrorHandling(gl, 'index', this.id);
      this.dataDrivenBuffer = createBufferWithErrorHandling(gl, 'dataDriven', this.id);

      // Create interaction buffer if interaction is enabled
      if (this.interactionEnabled) {
        this.interactionBuffer = createBufferWithErrorHandling(gl, 'interaction', this.id);
      }

    } catch (error) {
      this.initializationError = error as Error;
      console.error(
        `[PolygonShaderLayer] Initialization failed for layer "${this.id}":`,
        error instanceof ShaderError ? error.message : error
      );
      return;
    }

    const onSourceData = (e: { sourceId: string; isSourceLoaded?: boolean }) => {
      if (e.sourceId === this.sourceId && e.isSourceLoaded) {
        this.safeUpdatePolygonData(gl);
        map.triggerRepaint();
      }
    };
    map.on('sourcedata', onSourceData);

    // Initial data load - check if source is already loaded, otherwise wait for idle
    if (map.isSourceLoaded(this.sourceId)) {
      this.safeUpdatePolygonData(gl);
      map.triggerRepaint();
    } else {
      map.once('idle', () => {
        this.safeUpdatePolygonData(gl);
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

  private safeUpdatePolygonData(gl: WebGLRenderingContext): void {
    try {
      this.updatePolygonData(gl);
    } catch (error) {
      console.error(`[PolygonShaderLayer] Error updating polygon data for layer "${this.id}":`, error);
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
    this.initializationError = null;
    this.stateManager = null;
    this.expressionEvaluator.clear();
  }

  /**
   * Render the layer
   */
  render(gl: WebGLRenderingContext, matrix: mat4): void {
    if (this.initializationError) {
      if (!this.hasLoggedError) {
        console.warn(`[PolygonShaderLayer] Skipping render for layer "${this.id}" due to initialization error`);
        this.hasLoggedError = true;
      }
      return;
    }

    if (isContextLost(gl)) {
      console.warn(`[PolygonShaderLayer] WebGL context lost for layer "${this.id}"`);
      return;
    }

    if (!this.program || !this.map || this.vertexCount === 0) return;

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
        // For polygons, we need to expand buffer data per polygon vertex
        const { isPlayingData, localTimeData } = this.stateManager.generateBufferData(1);
        const expandedIsPlaying = new Float32Array(this.totalVertices);
        const expandedLocalTime = new Float32Array(this.totalVertices);

        let vertexOffset = 0;
        for (const polygon of this.polygons) {
          const featureIdx = polygon.index;
          const isPlaying = isPlayingData[featureIdx] ?? 1.0;
          const localTime = localTimeData[featureIdx] ?? 0.0;

          for (let j = 0; j < polygon.vertices.length; j++) {
            expandedIsPlaying[vertexOffset] = isPlaying;
            expandedLocalTime[vertexOffset] = localTime;
            vertexOffset++;
          }
        }

        this.updateInteractionBuffer(gl, expandedIsPlaying, expandedLocalTime);
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
    const resolution = [canvas.width, canvas.height];

    // Set common uniforms
    const uMatrix = this.uniforms.get('u_matrix');
    const uResolution = this.uniforms.get('u_resolution');
    const uTime = this.uniforms.get('u_time');

    if (uMatrix) gl.uniformMatrix4fv(uMatrix, false, matrix);
    if (uResolution) gl.uniform2fv(uResolution, resolution);
    if (uTime) gl.uniform1f(uTime, this.time);

    // Set data-driven flags
    const uUseDataDrivenColor = this.uniforms.get('u_useDataDrivenColor');
    const uUseDataDrivenIntensity = this.uniforms.get('u_useDataDrivenIntensity');
    if (uUseDataDrivenColor) gl.uniform1f(uUseDataDrivenColor, this.hasDataDrivenColor ? 1.0 : 0.0);
    if (uUseDataDrivenIntensity) gl.uniform1f(uUseDataDrivenIntensity, this.hasDataDrivenIntensity ? 1.0 : 0.0);

    // Set shader-specific uniforms
    this.setShaderUniforms(gl);

    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    // Vertex format: posX, posY, uvX, uvY, centroidX, centroidY, polygonIndex, timeOffset
    // 8 floats = 32 bytes per vertex
    const stride = 32;

    // Set up attributes
    if (this.aPos >= 0) {
      gl.enableVertexAttribArray(this.aPos);
      gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, stride, 0);
    }

    if (this.aUv >= 0) {
      gl.enableVertexAttribArray(this.aUv);
      gl.vertexAttribPointer(this.aUv, 2, gl.FLOAT, false, stride, 8);
    }

    if (this.aCentroid >= 0) {
      gl.enableVertexAttribArray(this.aCentroid);
      gl.vertexAttribPointer(this.aCentroid, 2, gl.FLOAT, false, stride, 16);
    }

    if (this.aPolygonIndex >= 0) {
      gl.enableVertexAttribArray(this.aPolygonIndex);
      gl.vertexAttribPointer(this.aPolygonIndex, 1, gl.FLOAT, false, stride, 24);
    }

    if (this.aTimeOffset >= 0) {
      gl.enableVertexAttribArray(this.aTimeOffset);
      gl.vertexAttribPointer(this.aTimeOffset, 1, gl.FLOAT, false, stride, 28);
    }

    // Bind data-driven buffer for color and intensity attributes
    const hasDataDriven = this.hasDataDrivenColor || this.hasDataDrivenIntensity;
    if (hasDataDriven && this.dataDrivenBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.dataDrivenBuffer);

      // Data-driven stride: color (4 floats) + intensity (1 float) = 5 floats = 20 bytes
      const dataDrivenStride = 20;

      if (this.aColor >= 0) {
        gl.enableVertexAttribArray(this.aColor);
        gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, dataDrivenStride, 0);
      }

      if (this.aIntensity >= 0) {
        gl.enableVertexAttribArray(this.aIntensity);
        gl.vertexAttribPointer(this.aIntensity, 1, gl.FLOAT, false, dataDrivenStride, 16);
      }
    }

    // Bind interaction buffer for a_isPlaying and a_localTime attributes
    if (this.interactionEnabled && this.interactionBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.interactionBuffer);

      // Interaction stride: isPlaying (1 float) + localTime (1 float) = 2 floats = 8 bytes
      const interactionStride = 8;

      if (this.aIsPlaying >= 0) {
        gl.enableVertexAttribArray(this.aIsPlaying);
        gl.vertexAttribPointer(this.aIsPlaying, 1, gl.FLOAT, false, interactionStride, 0);
      }

      if (this.aLocalTime >= 0) {
        gl.enableVertexAttribArray(this.aLocalTime);
        gl.vertexAttribPointer(this.aLocalTime, 1, gl.FLOAT, false, interactionStride, 4);
      }
    } else {
      // When interaction is not enabled, set default constant attribute values
      // a_isPlaying = 1.0 means always playing (use global time)
      // a_localTime = 0.0 is ignored when playing
      if (this.aIsPlaying >= 0) {
        gl.disableVertexAttribArray(this.aIsPlaying);
        gl.vertexAttrib1f(this.aIsPlaying, 1.0);
      }
      if (this.aLocalTime >= 0) {
        gl.disableVertexAttribArray(this.aLocalTime);
        gl.vertexAttrib1f(this.aLocalTime, 0.0);
      }
    }

    // Bind index buffer and draw
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.vertexCount, gl.UNSIGNED_SHORT, 0);

    // Restore WebGL state - disable vertex attribute arrays
    if (this.aPos >= 0) gl.disableVertexAttribArray(this.aPos);
    if (this.aUv >= 0) gl.disableVertexAttribArray(this.aUv);
    if (this.aCentroid >= 0) gl.disableVertexAttribArray(this.aCentroid);
    if (this.aPolygonIndex >= 0) gl.disableVertexAttribArray(this.aPolygonIndex);
    if (this.aTimeOffset >= 0) gl.disableVertexAttribArray(this.aTimeOffset);
    if (this.aColor >= 0) gl.disableVertexAttribArray(this.aColor);
    if (this.aIntensity >= 0) gl.disableVertexAttribArray(this.aIntensity);
    if (this.aIsPlaying >= 0) gl.disableVertexAttribArray(this.aIsPlaying);
    if (this.aLocalTime >= 0) gl.disableVertexAttribArray(this.aLocalTime);

    // Request another frame
    if (this.isPlaying) {
      this.map.triggerRepaint();
    }
  }

  /**
   * Create the shader program with comprehensive error handling
   */
  private createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;

    try {
      vertexShader = compileShaderWithErrorHandling(
        gl,
        gl.VERTEX_SHADER,
        POLYGON_VERTEX_SHADER,
        this.id
      );

      fragmentShader = compileShaderWithErrorHandling(
        gl,
        gl.FRAGMENT_SHADER,
        this.definition.fragmentShader,
        this.id
      );

      const program = linkProgramWithErrorHandling(
        gl,
        vertexShader,
        fragmentShader,
        this.id
      );

      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);

      return program;

    } catch (error) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      throw error;
    }
  }

  /**
   * Cache uniform locations
   */
  private cacheUniformLocations(gl: WebGLRenderingContext): void {
    if (!this.program) return;

    // Common uniforms
    const commonUniforms = [
      'u_matrix', 'u_resolution', 'u_time',
      'u_color', 'u_intensity', 'u_opacity',
      // Data-driven flags
      'u_useDataDrivenColor', 'u_useDataDrivenIntensity'
    ];

    // Get uniform names from config schema
    const schemaUniforms = Object.keys(this.definition.configSchema).map(
      key => `u_${key}`
    );

    // Polygon-specific uniforms
    const polygonUniforms = [
      // Scan Lines
      'u_direction', 'u_lineWidth', 'u_spacing', 'u_fade',
      // Ripple
      'u_waves', 'u_decay', 'u_origin',
      // Hatching
      'u_angle', 'u_thickness', 'u_crossHatch',
      // Fill Wave
      'u_level', 'u_waveHeight', 'u_waveFrequency',
      // Noise
      'u_scale', 'u_octaves', 'u_noiseType',
      // Marching Ants
      'u_dashLength', 'u_gapLength', 'u_width', 'u_alternateColor',
      // Gradient Rotation
      'u_colors', 'u_gradientType', 'u_center',
      'u_color0', 'u_color1', 'u_color2', 'u_color3',
      // Dissolve
      'u_progress', 'u_noiseScale', 'u_edgeColor', 'u_edgeWidth'
    ];

    const allUniforms = new Set([...commonUniforms, ...schemaUniforms, ...polygonUniforms]);

    for (const name of allUniforms) {
      this.uniforms.set(name, gl.getUniformLocation(this.program, name));
    }
  }

  /**
   * Get a sanitized config that replaces expressions with default values
   * This is needed because getUniforms expects static values, not MapLibre expressions
   * Data-driven properties are handled via vertex attributes, not uniforms
   */
  private getSanitizedConfigForUniforms(): ShaderConfig {
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
  private setShaderUniforms(gl: WebGLRenderingContext): void {
    // Create a sanitized config that replaces expressions with default values
    // Data-driven properties are handled via attributes, not uniforms
    const sanitizedConfig = this.getSanitizedConfigForUniforms();

    // Get uniforms from the shader's getUniforms function
    const uniforms = this.definition.getUniforms(
      sanitizedConfig,
      this.time,
      0
    );

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
   * Update polygon data from source
   */
  private updatePolygonData(gl: WebGLRenderingContext): void {
    if (!this.map) return;

    const source = this.map.getSource(this.sourceId);
    if (!source || source.type !== 'geojson') return;

    // Get features from source
    const features = this.map.querySourceFeatures(this.sourceId);

    if (features.length > 0) {
      this.processFeatures(features, gl);
    }
  }

  /**
   * Process GeoJSON features into vertex data
   */
  private processFeatures(
    features: GeoJSON.Feature[] | maplibregl.MapGeoJSONFeature[],
    gl: WebGLRenderingContext
  ): void {
    this.polygons = [];
    this.features = features as GeoJSON.Feature[];

    let polygonIndex = 0;

    for (const feature of features) {
      if (feature.geometry.type === 'Polygon') {
        this.processPolygon(
          (feature.geometry as GeoJSON.Polygon).coordinates,
          polygonIndex++
        );
      } else if (feature.geometry.type === 'MultiPolygon') {
        for (const polygon of (feature.geometry as GeoJSON.MultiPolygon).coordinates) {
          this.processPolygon(polygon, polygonIndex++);
        }
      }
    }

    this.buildBuffers(gl);
  }

  /**
   * Process a single Polygon into triangulated data
   */
  private processPolygon(coordinates: number[][][], polygonIndex: number): void {
    // Get outer ring (first ring)
    const outerRing = coordinates[0];
    if (outerRing.length < 3) return;

    // Convert to Mercator and calculate bounds/centroid
    const vertices: number[][] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let centroidX = 0, centroidY = 0;

    for (let i = 0; i < outerRing.length - 1; i++) { // Skip last point (duplicate of first)
      const [lng, lat] = outerRing[i];
      const [mx, my] = this.lngLatToMercator(lng, lat);
      vertices.push([mx, my]);

      minX = Math.min(minX, mx);
      minY = Math.min(minY, my);
      maxX = Math.max(maxX, mx);
      maxY = Math.max(maxY, my);

      centroidX += mx;
      centroidY += my;
    }

    centroidX /= vertices.length;
    centroidY /= vertices.length;

    this.polygons.push({
      vertices,
      centroid: [centroidX, centroidY],
      bounds: { minX, minY, maxX, maxY },
      index: polygonIndex,
    });
  }

  /**
   * Convert lng/lat to Mercator coordinates (0-1 range)
   */
  private lngLatToMercator(lng: number, lat: number): [number, number] {
    const x = (lng + 180) / 360;
    const sinLat = Math.sin((lat * Math.PI) / 180);
    const y = 0.5 - (0.25 * Math.log((1 + sinLat) / (1 - sinLat))) / Math.PI;
    return [x, y];
  }

  /**
   * Build vertex and index buffers using ear clipping triangulation
   */
  private buildBuffers(gl: WebGLRenderingContext): void {
    if (this.polygons.length === 0) {
      this.vertexCount = 0;
      return;
    }

    // Calculate time offsets for all features
    // timeOffset is at the top level of config (not nested under timing)
    const timingConfig = this.config as unknown as AnimationTimingConfig;
    const timeOffsets = this.timeOffsetCalculator.calculateOffsets(this.features, timingConfig);

    // Calculate total vertices and indices needed
    let totalVertices = 0;
    let totalIndices = 0;

    for (const polygon of this.polygons) {
      totalVertices += polygon.vertices.length;
      // Each polygon with N vertices creates N-2 triangles (fan triangulation)
      totalIndices += (polygon.vertices.length - 2) * 3;
    }

    // Vertex format: posX, posY, uvX, uvY, centroidX, centroidY, polygonIndex, timeOffset
    // 8 floats = 32 bytes per vertex
    const vertexData = new Float32Array(totalVertices * 8);
    const indexData = new Uint16Array(totalIndices);

    let vertexOffset = 0;
    let indexOffset = 0;
    let baseVertex = 0;

    for (const polygon of this.polygons) {
      const { vertices, centroid, bounds, index } = polygon;
      const timeOffset = timeOffsets[index] ?? 0;

      // Add vertices with UV coordinates
      for (let i = 0; i < vertices.length; i++) {
        const [x, y] = vertices[i];
        const vOffset = vertexOffset * 8;

        // Position
        vertexData[vOffset + 0] = x;
        vertexData[vOffset + 1] = y;

        // UV (normalized to polygon bounds)
        const u = bounds.maxX !== bounds.minX
          ? (x - bounds.minX) / (bounds.maxX - bounds.minX)
          : 0.5;
        const v = bounds.maxY !== bounds.minY
          ? (y - bounds.minY) / (bounds.maxY - bounds.minY)
          : 0.5;
        vertexData[vOffset + 2] = u;
        vertexData[vOffset + 3] = v;

        // Centroid
        vertexData[vOffset + 4] = centroid[0];
        vertexData[vOffset + 5] = centroid[1];

        // Polygon index
        vertexData[vOffset + 6] = index;

        // Time offset
        vertexData[vOffset + 7] = timeOffset;

        vertexOffset++;
      }

      // Triangulate using fan method (works for convex polygons)
      // For more complex polygons, we'd need ear clipping
      const triangles = this.triangulatePolygon(vertices);

      for (const tri of triangles) {
        indexData[indexOffset++] = baseVertex + tri[0];
        indexData[indexOffset++] = baseVertex + tri[1];
        indexData[indexOffset++] = baseVertex + tri[2];
      }

      baseVertex += vertices.length;
    }

    // Upload vertex data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

    // Upload index data
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

    this.vertexCount = indexOffset;
    this.totalVertices = totalVertices;

    // Evaluate data-driven properties and build buffer
    this.evaluateDataDrivenProperties();

    if (this.hasDataDrivenColor || this.hasDataDrivenIntensity) {
      this.buildDataDrivenBuffer(gl);
    }

    // Initialize interaction state manager with features
    if (this.interactionEnabled && this.stateManager) {
      this.stateManager.initializeFromFeatures(this.features);
      this.buildInteractionBuffer(gl);
    }
  }

  /**
   * Evaluate data-driven properties for all features
   */
  private evaluateDataDrivenProperties(): void {
    if (!this.map) return;

    const zoom = this.map.getZoom();
    this.featureData = [];

    // Get default color from config
    const defaultColorValue = this.config.color;
    let defaultColor: [number, number, number, number] = [1, 1, 1, 1];
    if (typeof defaultColorValue === 'string' && !isExpression(defaultColorValue)) {
      defaultColor = hexToRgba(defaultColorValue);
    } else if (Array.isArray(defaultColorValue) && defaultColorValue.length === 4 && typeof defaultColorValue[0] === 'number') {
      defaultColor = defaultColorValue as [number, number, number, number];
    }

    // Get default intensity from config
    const defaultIntensity = typeof this.config.intensity === 'number' ? this.config.intensity : 1.0;

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
   * Build the data-driven buffer with per-vertex color and intensity
   */
  private buildDataDrivenBuffer(gl: WebGLRenderingContext): void {
    if (!this.dataDrivenBuffer) return;

    // Data-driven format per vertex: color (4 floats) + intensity (1 float) = 5 floats = 20 bytes
    const dataDrivenData = new Float32Array(this.totalVertices * 5);

    let dataOffset = 0;
    for (const polygon of this.polygons) {
      const featureIdx = polygon.index;
      const data = this.featureData[featureIdx] ?? { color: [1, 1, 1, 1], intensity: 1.0 };

      // Each vertex in this polygon gets the same data-driven values
      for (let j = 0; j < polygon.vertices.length; j++) {
        const offset = dataOffset * 5;
        dataDrivenData[offset + 0] = data.color[0];
        dataDrivenData[offset + 1] = data.color[1];
        dataDrivenData[offset + 2] = data.color[2];
        dataDrivenData[offset + 3] = data.color[3];
        dataDrivenData[offset + 4] = data.intensity;
        dataOffset++;
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.dataDrivenBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, dataDrivenData, gl.DYNAMIC_DRAW);
  }

  /**
   * Simple ear-clipping triangulation
   * Returns array of triangle vertex indices
   */
  private triangulatePolygon(vertices: number[][]): number[][] {
    const n = vertices.length;
    if (n < 3) return [];
    if (n === 3) return [[0, 1, 2]];

    // Use ear clipping algorithm
    const triangles: number[][] = [];
    const indices = Array.from({ length: n }, (_, i) => i);

    // Determine winding order
    const isClockwise = this.polygonArea(vertices) < 0;

    let attempts = 0;
    const maxAttempts = n * n;

    while (indices.length > 3 && attempts < maxAttempts) {
      attempts++;
      let earFound = false;

      for (let i = 0; i < indices.length; i++) {
        const prev = indices[(i - 1 + indices.length) % indices.length];
        const curr = indices[i];
        const next = indices[(i + 1) % indices.length];

        if (this.isEar(vertices, indices, prev, curr, next, isClockwise)) {
          triangles.push([prev, curr, next]);
          indices.splice(i, 1);
          earFound = true;
          break;
        }
      }

      // If no ear found, use fallback (shouldn't happen for simple polygons)
      if (!earFound) {
        break;
      }
    }

    // Add remaining triangle
    if (indices.length === 3) {
      triangles.push([indices[0], indices[1], indices[2]]);
    }

    return triangles;
  }

  /**
   * Calculate signed area of polygon (positive = counter-clockwise)
   */
  private polygonArea(vertices: number[][]): number {
    let area = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = vertices[i];
      const [x2, y2] = vertices[(i + 1) % n];
      area += x1 * y2 - x2 * y1;
    }
    return area / 2;
  }

  /**
   * Check if vertex at index 'curr' forms an ear
   */
  private isEar(
    vertices: number[][],
    indices: number[],
    prev: number,
    curr: number,
    next: number,
    isClockwise: boolean
  ): boolean {
    const a = vertices[prev];
    const b = vertices[curr];
    const c = vertices[next];

    // Check if angle is convex
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const isConvex = isClockwise ? cross < 0 : cross > 0;

    if (!isConvex) return false;

    // Check that no other vertex is inside this triangle
    for (const idx of indices) {
      if (idx === prev || idx === curr || idx === next) continue;
      if (this.pointInTriangle(vertices[idx], a, b, c)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if point P is inside triangle ABC
   */
  private pointInTriangle(p: number[], a: number[], b: number[], c: number[]): boolean {
    const [px, py] = p;
    const [ax, ay] = a;
    const [bx, by] = b;
    const [cx, cy] = c;

    const v0x = cx - ax;
    const v0y = cy - ay;
    const v1x = bx - ax;
    const v1y = by - ay;
    const v2x = px - ax;
    const v2y = py - ay;

    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return u >= 0 && v >= 0 && u + v < 1;
  }

  /**
   * Build the interaction buffer for per-feature animation state
   */
  private buildInteractionBuffer(gl: WebGLRenderingContext): void {
    if (!this.interactionBuffer || !this.stateManager) return;

    // For polygons, we need to expand buffer data per vertex
    const { isPlayingData, localTimeData } = this.stateManager.generateBufferData(1);

    const expandedIsPlaying = new Float32Array(this.totalVertices);
    const expandedLocalTime = new Float32Array(this.totalVertices);

    let vertexOffset = 0;
    for (const polygon of this.polygons) {
      const featureIdx = polygon.index;
      const isPlaying = isPlayingData[featureIdx] ?? 1.0;
      const localTime = localTimeData[featureIdx] ?? 0.0;

      for (let j = 0; j < polygon.vertices.length; j++) {
        expandedIsPlaying[vertexOffset] = isPlaying;
        expandedLocalTime[vertexOffset] = localTime;
        vertexOffset++;
      }
    }

    this.updateInteractionBuffer(gl, expandedIsPlaying, expandedLocalTime);
    this.stateManager.clearDirty();
  }

  /**
   * Update the interaction buffer with new state data
   */
  private updateInteractionBuffer(
    gl: WebGLRenderingContext,
    isPlayingData: Float32Array,
    localTimeData: Float32Array
  ): void {
    if (!this.interactionBuffer) return;

    // Interleave isPlaying and localTime data
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
}
