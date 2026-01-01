/**
 * LineShaderLayer - WebGL Custom Layer for line shaders
 *
 * Implements MapLibre's CustomLayerInterface to render lines
 * with custom GLSL fragment shaders.
 */

import type { CustomLayerInterface, Map as MapLibreMap } from 'maplibre-gl';
import type { ShaderDefinition, ShaderConfig } from '../types';
import type { mat4 } from 'gl-matrix';
import {
  ShaderError,
  compileShaderWithErrorHandling,
  linkProgramWithErrorHandling,
  createBufferWithErrorHandling,
  safeCleanup,
  isContextLost,
} from '../utils/webgl-error-handler';

/**
 * Vertex shader for line rendering
 * Renders thick lines as quads along each segment
 */
const LINE_VERTEX_SHADER = `
  attribute vec2 a_pos_start;
  attribute vec2 a_pos_end;
  attribute vec2 a_offset;
  attribute float a_progress;
  attribute float a_line_index;

  uniform mat4 u_matrix;
  uniform float u_width;
  uniform vec2 u_resolution;

  varying vec2 v_pos;
  varying float v_progress;
  varying float v_line_index;
  varying float v_width;

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
  }
`;

interface LineSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  lineIndex: number;
}

/**
 * LineShaderLayer - Custom WebGL layer for line shaders
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

  // Attribute locations
  private aPosStart: number = -1;
  private aPosEnd: number = -1;
  private aOffset: number = -1;
  private aProgress: number = -1;
  private aLineIndex: number = -1;

  // Uniform locations
  private uniforms: Map<string, WebGLUniformLocation | null> = new Map();

  // Line data
  private segments: LineSegment[] = [];
  private vertexCount: number = 0;
  private totalLength: number = 0;

  // Error handling state
  private initializationError: Error | null = null;
  private hasLoggedError: boolean = false;

  constructor(
    id: string,
    sourceId: string,
    definition: ShaderDefinition,
    config: ShaderConfig
  ) {
    this.id = id;
    this.sourceId = sourceId;
    this.definition = definition;
    this.config = { ...definition.defaultConfig, ...config };
  }

  /**
   * Update shader configuration
   */
  updateConfig(config: Partial<ShaderConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.speed !== undefined) {
      this.speed = config.speed;
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

      // Get uniform locations
      this.cacheUniformLocations(gl);

      // Create buffers with error handling
      this.vertexBuffer = createBufferWithErrorHandling(gl, 'vertex', this.id);
      this.indexBuffer = createBufferWithErrorHandling(gl, 'index', this.id);

    } catch (error) {
      this.initializationError = error as Error;
      console.error(
        `[LineShaderLayer] Initialization failed for layer "${this.id}":`,
        error instanceof ShaderError ? error.message : error
      );
      return;
    }

    // Listen for source data changes
    const onSourceData = (e: { sourceId: string; isSourceLoaded?: boolean }) => {
      if (e.sourceId === this.sourceId && e.isSourceLoaded) {
        this.safeUpdateLineData(gl);
        map.triggerRepaint();
      }
    };
    map.on('sourcedata', onSourceData);

    // Also update when map becomes idle
    const onIdle = () => {
      this.safeUpdateLineData(gl);
      map.triggerRepaint();
    };
    map.once('idle', onIdle);

    // Initial data load
    setTimeout(() => {
      this.safeUpdateLineData(gl);
      map.triggerRepaint();
    }, 100);

    this.lastFrameTime = performance.now();
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
    safeCleanup(gl, {
      program: this.program,
      buffers: [this.vertexBuffer, this.indexBuffer],
    });

    this.program = null;
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.map = null;
    this.initializationError = null;
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
    const width = (this.config as Record<string, unknown>).width ??
                  (this.config as Record<string, unknown>).lineWidth ?? 4;
    if (uWidth) gl.uniform1f(uWidth, width as number);
    if (uTime) gl.uniform1f(uTime, this.time);
    if (uTotalLength) gl.uniform1f(uTotalLength, this.totalLength);

    // Set shader-specific uniforms
    this.setShaderUniforms(gl);

    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    // Vertex format: startX, startY, endX, endY, offsetX, offsetY, progress, lineIndex
    // 8 floats = 32 bytes per vertex
    const stride = 32;

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

    // Bind index buffer and draw
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.vertexCount, gl.UNSIGNED_SHORT, 0);

    // Restore WebGL state - disable vertex attribute arrays
    if (this.aPosStart >= 0) gl.disableVertexAttribArray(this.aPosStart);
    if (this.aPosEnd >= 0) gl.disableVertexAttribArray(this.aPosEnd);
    if (this.aOffset >= 0) gl.disableVertexAttribArray(this.aOffset);
    if (this.aProgress >= 0) gl.disableVertexAttribArray(this.aProgress);
    if (this.aLineIndex >= 0) gl.disableVertexAttribArray(this.aLineIndex);

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
      'u_color', 'u_intensity', 'u_opacity'
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
   * Set shader-specific uniforms from config
   */
  private setShaderUniforms(gl: WebGLRenderingContext): void {
    // Get uniforms from the shader's getUniforms function
    const uniforms = this.definition.getUniforms(
      this.config,
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
   * Process GeoJSON features into vertex data
   */
  private processFeatures(
    features: GeoJSON.Feature[] | maplibregl.MapGeoJSONFeature[],
    gl: WebGLRenderingContext
  ): void {
    this.segments = [];
    this.totalLength = 0;

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

      this.segments.push({
        startX: startMerc[0],
        startY: startMerc[1],
        endX: endMerc[0],
        endY: endMerc[1],
        progress,
        lineIndex,
      });

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

    // Each segment becomes a quad (4 vertices, 6 indices)
    // Vertex format: startX, startY, endX, endY, offsetX, offsetY, progress, lineIndex
    // 8 floats = 32 bytes per vertex
    const vertexData = new Float32Array(this.segments.length * 4 * 8);
    const indexData = new Uint16Array(this.segments.length * 6);

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const vi = i * 4 * 8; // Vertex data index
      const ii = i * 6;     // Index data index
      const baseVertex = i * 4;

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
        const vj = vi + j * 8;
        vertexData[vj + 0] = seg.startX;
        vertexData[vj + 1] = seg.startY;
        vertexData[vj + 2] = seg.endX;
        vertexData[vj + 3] = seg.endY;
        vertexData[vj + 4] = offsets[j][0];
        vertexData[vj + 5] = offsets[j][1];
        vertexData[vj + 6] = seg.progress;
        vertexData[vj + 7] = seg.lineIndex;
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

    this.vertexCount = indexData.length;
  }
}
