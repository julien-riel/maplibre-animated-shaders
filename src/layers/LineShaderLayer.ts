/**
 * LineShaderLayer - WebGL Custom Layer for line shaders
 *
 * Implements MapLibre's CustomLayerInterface to render lines
 * with custom GLSL fragment shaders.
 *
 * Supports data-driven properties via MapLibre-style expressions:
 * - color: ['get', 'line_color']
 * - intensity: ['match', ['get', 'type'], 'primary', 1.0, 0.5]
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
import { getConfigNumber } from '../utils/config-helpers';
import { throttle, DEFAULT_UPDATE_THROTTLE_MS } from '../utils/throttle';
import { PoolManager, type SegmentData } from '../utils/object-pool';

/**
 * Vertex shader for line rendering
 * Renders thick lines as quads along each segment
 *
 * Supports data-driven properties via per-vertex attributes:
 * - a_color: Per-feature color (RGBA)
 * - a_intensity: Per-feature intensity
 *
 * Supports per-feature interactive animation:
 * - a_isPlaying: 0.0 = paused, 1.0 = playing
 * - a_localTime: Frozen time when paused
 */
const LINE_VERTEX_SHADER = `
  attribute vec2 a_pos_start;
  attribute vec2 a_pos_end;
  attribute vec2 a_offset;
  attribute float a_progress;
  attribute float a_line_index;
  attribute float a_timeOffset;
  attribute vec4 a_color;
  attribute float a_intensity;
  attribute float a_isPlaying;
  attribute float a_localTime;

  uniform mat4 u_matrix;
  uniform float u_width;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_useDataDrivenColor;
  uniform float u_useDataDrivenIntensity;

  varying vec2 v_pos;
  varying float v_progress;
  varying float v_line_index;
  varying float v_width;
  varying float v_timeOffset;
  varying float v_effectiveTime;
  varying vec4 v_color;
  varying float v_intensity;
  varying float v_useDataDrivenColor;
  varying float v_useDataDrivenIntensity;

  void main() {
    // Calculate line direction and perpendicular
    vec4 start_projected = u_matrix * vec4(a_pos_start, 0.0, 1.0);
    vec4 end_projected = u_matrix * vec4(a_pos_end, 0.0, 1.0);

    // Convert to screen space
    vec2 start_screen = start_projected.xy / start_projected.w;
    vec2 end_screen = end_projected.xy / end_projected.w;

    // Calculate line direction in screen space
    vec2 dir = end_screen - start_screen;
    float len = length(dir);

    if (len > 0.0001) {
      dir = normalize(dir);
    } else {
      dir = vec2(1.0, 0.0);
    }

    // Perpendicular direction
    vec2 perp = vec2(-dir.y, dir.x);

    // Interpolate position along the segment
    float t = a_offset.x * 0.5 + 0.5; // Convert -1..1 to 0..1
    vec4 pos_projected = mix(start_projected, end_projected, t);

    // Calculate width offset in clip space
    float width_pixels = u_width;
    vec2 offset_clip = perp * a_offset.y * width_pixels / u_resolution * pos_projected.w;

    gl_Position = pos_projected + vec4(offset_clip, 0.0, 0.0);

    // Pass varying data
    v_pos = a_offset;
    v_progress = mix(a_progress, a_progress + (1.0 / max(1.0, float(a_line_index + 1.0))), t);
    v_line_index = a_line_index;
    v_width = u_width;
    v_timeOffset = a_timeOffset;

    // Calculate effective time for interactive animation
    float globalAnimTime = u_time + a_timeOffset;
    v_effectiveTime = mix(a_localTime, globalAnimTime, a_isPlaying);

    // Pass data-driven properties
    v_color = a_color;
    v_intensity = a_intensity;
    v_useDataDrivenColor = u_useDataDrivenColor;
    v_useDataDrivenIntensity = u_useDataDrivenIntensity;
  }
`;

// LineSegment is imported from object-pool as SegmentData

/**
 * Per-feature evaluated data for data-driven properties
 */
interface FeatureData {
  color: [number, number, number, number];
  intensity: number;
}

/**
 * LineShaderLayer - Custom WebGL layer for line shaders
 *
 * Supports data-driven properties via MapLibre-style expressions.
 */
export class LineShaderLayer implements CustomLayerInterface {
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
  private aPosStart: number = -1;
  private aPosEnd: number = -1;
  private aOffset: number = -1;
  private aProgress: number = -1;
  private aLineIndex: number = -1;
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

  // Line data (using object pool for reduced GC pressure)
  private segments: SegmentData[] = [];
  private vertexCount: number = 0;
  private totalLength: number = 0;
  private poolManager: PoolManager = PoolManager.getInstance();

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
        console.warn(`[LineShaderLayer] Failed to compile color expression:`, error);
      }
    }

    // Check for intensity expression
    const intensityValue = this.config.intensity;
    if (isExpression(intensityValue)) {
      try {
        this.expressionEvaluator.compile('intensity', intensityValue, 'number');
        this.hasDataDrivenIntensity = true;
      } catch (error) {
        console.warn(`[LineShaderLayer] Failed to compile intensity expression:`, error);
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
      // Check for context loss
      if (isContextLost(gl)) {
        throw new Error('WebGL context is lost');
      }

      // Compile shaders and create program
      this.program = this.createProgram(gl);
      if (!this.program) {
        throw new Error('Failed to create shader program');
      }

      // Get attribute locations
      this.aPosStart = gl.getAttribLocation(this.program, 'a_pos_start');
      this.aPosEnd = gl.getAttribLocation(this.program, 'a_pos_end');
      this.aOffset = gl.getAttribLocation(this.program, 'a_offset');
      this.aProgress = gl.getAttribLocation(this.program, 'a_progress');
      this.aLineIndex = gl.getAttribLocation(this.program, 'a_line_index');
      this.aTimeOffset = gl.getAttribLocation(this.program, 'a_timeOffset');
      this.aColor = gl.getAttribLocation(this.program, 'a_color');
      this.aIntensity = gl.getAttribLocation(this.program, 'a_intensity');
      this.aIsPlaying = gl.getAttribLocation(this.program, 'a_isPlaying');
      this.aLocalTime = gl.getAttribLocation(this.program, 'a_localTime');

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

    } catch (error) {
      this.initializationError = error as Error;
      console.error(
        `[LineShaderLayer] Initialization failed for layer "${this.id}":`,
        error instanceof ShaderError ? error.message : error
      );
      return;
    }

    // Listen for source data changes (throttled to avoid excessive updates)
    const throttledUpdate = throttle(() => {
      this.safeUpdateLineData(gl);
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
      this.safeUpdateLineData(gl);
      map.triggerRepaint();
    } else {
      map.once('idle', () => {
        this.safeUpdateLineData(gl);
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
   * Safe wrapper for updateLineData with error handling
   */
  private safeUpdateLineData(gl: WebGLRenderingContext): void {
    try {
      this.updateLineData(gl);
    } catch (error) {
      console.error(`[LineShaderLayer] Error updating line data for layer "${this.id}":`, error);
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

    // Release pooled objects back to the pool
    this.releasePooledSegments();
    this.featureData = [];

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
    // Skip rendering if there was an initialization error
    if (this.initializationError) {
      if (!this.hasLoggedError) {
        console.warn(`[LineShaderLayer] Skipping render for layer "${this.id}" due to initialization error`);
        this.hasLoggedError = true;
      }
      return;
    }

    // Check for WebGL context loss
    if (isContextLost(gl)) {
      console.warn(`[LineShaderLayer] WebGL context lost for layer "${this.id}"`);
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
        // For lines, we need to expand buffer data per segment
        const { isPlayingData, localTimeData } = this.stateManager.generateBufferData(1);
        const segmentCount = this.segments.length;
        const expandedIsPlaying = new Float32Array(segmentCount * 4);
        const expandedLocalTime = new Float32Array(segmentCount * 4);

        for (let i = 0; i < segmentCount; i++) {
          const lineIndex = this.segments[i].lineIndex;
          const isPlaying = isPlayingData[lineIndex] ?? 1.0;
          const localTime = localTimeData[lineIndex] ?? 0.0;

          for (let j = 0; j < 4; j++) {
            expandedIsPlaying[i * 4 + j] = isPlaying;
            expandedLocalTime[i * 4 + j] = localTime;
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
    const uWidth = this.uniforms.get('u_width');
    const uTime = this.uniforms.get('u_time');
    const uTotalLength = this.uniforms.get('u_total_length');

    if (uMatrix) gl.uniformMatrix4fv(uMatrix, false, matrix);
    if (uResolution) gl.uniform2fv(uResolution, resolution);

    // Get width from config
    const width = getConfigNumber(this.config, ['width', 'lineWidth'], 4);
    if (uWidth) gl.uniform1f(uWidth, width);
    if (uTime) gl.uniform1f(uTime, this.time);
    if (uTotalLength) gl.uniform1f(uTotalLength, this.totalLength);

    // Set data-driven flags
    const uUseDataDrivenColor = this.uniforms.get('u_useDataDrivenColor');
    const uUseDataDrivenIntensity = this.uniforms.get('u_useDataDrivenIntensity');
    if (uUseDataDrivenColor) gl.uniform1f(uUseDataDrivenColor, this.hasDataDrivenColor ? 1.0 : 0.0);
    if (uUseDataDrivenIntensity) gl.uniform1f(uUseDataDrivenIntensity, this.hasDataDrivenIntensity ? 1.0 : 0.0);

    // Set shader-specific uniforms
    this.setShaderUniforms(gl);

    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    // Vertex format: startX, startY, endX, endY, offsetX, offsetY, progress, lineIndex, timeOffset
    // 9 floats = 36 bytes per vertex
    const stride = 36;

    // Set up attributes
    if (this.aPosStart >= 0) {
      gl.enableVertexAttribArray(this.aPosStart);
      gl.vertexAttribPointer(this.aPosStart, 2, gl.FLOAT, false, stride, 0);
    }

    if (this.aPosEnd >= 0) {
      gl.enableVertexAttribArray(this.aPosEnd);
      gl.vertexAttribPointer(this.aPosEnd, 2, gl.FLOAT, false, stride, 8);
    }

    if (this.aOffset >= 0) {
      gl.enableVertexAttribArray(this.aOffset);
      gl.vertexAttribPointer(this.aOffset, 2, gl.FLOAT, false, stride, 16);
    }

    if (this.aProgress >= 0) {
      gl.enableVertexAttribArray(this.aProgress);
      gl.vertexAttribPointer(this.aProgress, 1, gl.FLOAT, false, stride, 24);
    }

    if (this.aLineIndex >= 0) {
      gl.enableVertexAttribArray(this.aLineIndex);
      gl.vertexAttribPointer(this.aLineIndex, 1, gl.FLOAT, false, stride, 28);
    }

    if (this.aTimeOffset >= 0) {
      gl.enableVertexAttribArray(this.aTimeOffset);
      gl.vertexAttribPointer(this.aTimeOffset, 1, gl.FLOAT, false, stride, 32);
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
    if (this.aPosStart >= 0) gl.disableVertexAttribArray(this.aPosStart);
    if (this.aPosEnd >= 0) gl.disableVertexAttribArray(this.aPosEnd);
    if (this.aOffset >= 0) gl.disableVertexAttribArray(this.aOffset);
    if (this.aProgress >= 0) gl.disableVertexAttribArray(this.aProgress);
    if (this.aLineIndex >= 0) gl.disableVertexAttribArray(this.aLineIndex);
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
        LINE_VERTEX_SHADER,
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
      'u_matrix', 'u_resolution', 'u_width', 'u_time', 'u_total_length',
      'u_color', 'u_intensity', 'u_opacity',
      // Data-driven flags
      'u_useDataDrivenColor', 'u_useDataDrivenIntensity'
    ];

    // Get uniform names from config schema
    const schemaUniforms = Object.keys(this.definition.configSchema).map(
      key => `u_${key}`
    );

    // Line-specific uniforms
    const lineUniforms = [
      'u_dashLength', 'u_gapLength', 'u_direction', 'u_gradient',
      'u_colorStart', 'u_colorEnd', 'u_wavelength', 'u_mode',
      'u_amplitude', 'u_frequency', 'u_noiseScale', 'u_glow',
      'u_headLength', 'u_fadeLength', 'u_minOpacity', 'u_loop',
      'u_minWidth', 'u_maxWidth', 'u_easing', 'u_syncToData',
      'u_headColor', 'u_tailColor', 'u_length', 'u_baseColor',
      'u_glowRadius', 'u_flickerIntensity', 'u_flickerSpeed', 'u_layers'
    ];

    const allUniforms = new Set([...commonUniforms, ...schemaUniforms, ...lineUniforms]);

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
   * Update line data from source
   */
  private updateLineData(gl: WebGLRenderingContext): void {
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
   * Release pooled segment objects back to the pool
   */
  private releasePooledSegments(): void {
    if (this.segments.length > 0) {
      this.poolManager.segmentPool.releaseAll(this.segments);
      this.segments = [];
    }
  }

  /**
   * Process GeoJSON features into vertex data
   * Uses object pooling to reduce GC pressure on large datasets
   */
  private processFeatures(
    features: GeoJSON.Feature[] | maplibregl.MapGeoJSONFeature[],
    gl: WebGLRenderingContext
  ): void {
    // Release existing segments back to the pool before reprocessing
    this.releasePooledSegments();
    this.totalLength = 0;
    this.features = features as GeoJSON.Feature[];

    let lineIndex = 0;

    for (const feature of features) {
      if (feature.geometry.type === 'LineString') {
        this.processLineString(
          (feature.geometry as GeoJSON.LineString).coordinates,
          lineIndex++
        );
      } else if (feature.geometry.type === 'MultiLineString') {
        for (const line of (feature.geometry as GeoJSON.MultiLineString).coordinates) {
          this.processLineString(line, lineIndex++);
        }
      }
    }

    this.buildBuffers(gl);
  }

  /**
   * Process a single LineString into segments
   */
  private processLineString(coordinates: number[][], lineIndex: number): void {
    if (coordinates.length < 2) return;

    // Calculate total line length for progress
    let lineLength = 0;
    const segmentLengths: number[] = [];

    for (let i = 0; i < coordinates.length - 1; i++) {
      const [x1, y1] = coordinates[i];
      const [x2, y2] = coordinates[i + 1];
      const segLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      segmentLengths.push(segLen);
      lineLength += segLen;
    }

    this.totalLength = Math.max(this.totalLength, lineLength);

    // Create segments with progress values
    let accumulatedLength = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const [x1, y1] = coordinates[i];
      const [x2, y2] = coordinates[i + 1];

      const startMerc = this.lngLatToMercator(x1, y1);
      const endMerc = this.lngLatToMercator(x2, y2);

      const progress = lineLength > 0 ? accumulatedLength / lineLength : 0;

      // Acquire segment from pool instead of creating new object
      const segment = this.poolManager.segmentPool.acquire();
      segment.startX = startMerc[0];
      segment.startY = startMerc[1];
      segment.endX = endMerc[0];
      segment.endY = endMerc[1];
      segment.progress = progress;
      segment.lineIndex = lineIndex;
      this.segments.push(segment);

      accumulatedLength += segmentLengths[i];
    }
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
   * Build vertex and index buffers
   */
  private buildBuffers(gl: WebGLRenderingContext): void {
    if (this.segments.length === 0) {
      this.vertexCount = 0;
      return;
    }

    // Calculate time offsets for all features
    // timeOffset is at the top level of config (not nested under timing)
    const timingConfig = this.config as unknown as AnimationTimingConfig;
    const timeOffsets = this.timeOffsetCalculator.calculateOffsets(this.features, timingConfig);

    // Evaluate data-driven properties
    this.evaluateDataDrivenProperties();

    // Each segment becomes a quad (4 vertices, 6 indices)
    // Vertex format: startX, startY, endX, endY, offsetX, offsetY, progress, lineIndex, timeOffset
    // 9 floats = 36 bytes per vertex
    const vertexData = new Float32Array(this.segments.length * 4 * 9);
    const indexData = new Uint16Array(this.segments.length * 6);

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const vi = i * 4 * 9; // Vertex data index
      const ii = i * 6;     // Index data index
      const baseVertex = i * 4;
      const timeOffset = timeOffsets[seg.lineIndex] ?? 0;

      // Four corners of the quad:
      // (-1, -1): start, bottom
      // ( 1, -1): end, bottom
      // ( 1,  1): end, top
      // (-1,  1): start, top
      const offsets = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ];

      for (let j = 0; j < 4; j++) {
        const vj = vi + j * 9;
        vertexData[vj + 0] = seg.startX;
        vertexData[vj + 1] = seg.startY;
        vertexData[vj + 2] = seg.endX;
        vertexData[vj + 3] = seg.endY;
        vertexData[vj + 4] = offsets[j][0];
        vertexData[vj + 5] = offsets[j][1];
        vertexData[vj + 6] = seg.progress;
        vertexData[vj + 7] = seg.lineIndex;
        vertexData[vj + 8] = timeOffset;
      }

      // Two triangles: 0-1-2 and 0-2-3
      indexData[ii + 0] = baseVertex + 0;
      indexData[ii + 1] = baseVertex + 1;
      indexData[ii + 2] = baseVertex + 2;
      indexData[ii + 3] = baseVertex + 0;
      indexData[ii + 4] = baseVertex + 2;
      indexData[ii + 5] = baseVertex + 3;
    }

    // Upload vertex data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

    // Upload index data
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

    // Build data-driven buffer if needed
    if (this.hasDataDrivenColor || this.hasDataDrivenIntensity) {
      this.buildDataDrivenBuffer(gl);
    }

    // Initialize interaction state manager with features
    if (this.interactionEnabled && this.stateManager) {
      this.stateManager.initializeFromFeatures(this.features);
      this.buildInteractionBuffer(gl);
    }

    this.vertexCount = indexData.length;
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
   * Build the data-driven attribute buffer
   */
  private buildDataDrivenBuffer(gl: WebGLRenderingContext): void {
    if (!this.dataDrivenBuffer) return;

    // Data-driven format per vertex: color (4 floats) + intensity (1 float) = 5 floats = 20 bytes
    // Each segment has 4 vertices (quad)
    const dataDrivenData = new Float32Array(this.segments.length * 4 * 5);

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const lineIndex = seg.lineIndex;
      const data = this.featureData[lineIndex] ?? { color: [1, 1, 1, 1], intensity: 1.0 };

      // Each quad vertex gets the same data-driven values
      for (let j = 0; j < 4; j++) {
        const offset = (i * 4 + j) * 5;
        dataDrivenData[offset + 0] = data.color[0];
        dataDrivenData[offset + 1] = data.color[1];
        dataDrivenData[offset + 2] = data.color[2];
        dataDrivenData[offset + 3] = data.color[3];
        dataDrivenData[offset + 4] = data.intensity;
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.dataDrivenBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, dataDrivenData, gl.DYNAMIC_DRAW);
  }

  /**
   * Build the interaction buffer for per-feature animation state
   */
  private buildInteractionBuffer(gl: WebGLRenderingContext): void {
    if (!this.interactionBuffer || !this.stateManager) return;

    // For lines, we need to expand buffer data per segment, not per feature
    // Each segment has 4 vertices, and segments are indexed by lineIndex
    const { isPlayingData, localTimeData } = this.stateManager.generateBufferData(1);

    // Expand to per-segment, per-vertex data
    const segmentCount = this.segments.length;
    const expandedIsPlaying = new Float32Array(segmentCount * 4);
    const expandedLocalTime = new Float32Array(segmentCount * 4);

    for (let i = 0; i < segmentCount; i++) {
      const lineIndex = this.segments[i].lineIndex;
      const isPlaying = isPlayingData[lineIndex] ?? 1.0;
      const localTime = localTimeData[lineIndex] ?? 0.0;

      for (let j = 0; j < 4; j++) {
        expandedIsPlaying[i * 4 + j] = isPlaying;
        expandedLocalTime[i * 4 + j] = localTime;
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
