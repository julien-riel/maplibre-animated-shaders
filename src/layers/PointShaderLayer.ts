/**
 * PointShaderLayer - WebGL Custom Layer for point shaders
 *
 * Implements MapLibre's CustomLayerInterface to render points
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
 * Vertex shader for point rendering
 * Renders a quad at each point position
 */
const POINT_VERTEX_SHADER = `
  attribute vec2 a_pos;
  attribute vec2 a_offset;
  attribute float a_index;

  uniform mat4 u_matrix;
  uniform float u_size;
  uniform vec2 u_resolution;

  varying vec2 v_pos;
  varying float v_index;

  void main() {
    // a_pos is the point center in Mercator coordinates
    // a_offset is the quad vertex offset (-1 to 1)

    // Transform point to clip space
    vec4 projected = u_matrix * vec4(a_pos, 0.0, 1.0);

    // Calculate pixel offset for the quad
    vec2 pixelOffset = a_offset * u_size;

    // Convert pixel offset to clip space offset
    vec2 clipOffset = pixelOffset / u_resolution * 2.0 * projected.w;

    gl_Position = projected + vec4(clipOffset, 0.0, 0.0);

    // Pass normalized position within quad to fragment shader (-1 to 1)
    v_pos = a_offset;
    v_index = a_index;
  }
`;

interface PointData {
  mercatorX: number;
  mercatorY: number;
  index: number;
}

/**
 * PointShaderLayer - Custom WebGL layer for point shaders
 */
export class PointShaderLayer implements CustomLayerInterface {
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
  private aPos: number = -1;
  private aOffset: number = -1;
  private aIndex: number = -1;

  // Uniform locations
  private uniforms: Map<string, WebGLUniformLocation | null> = new Map();

  // Point data
  private points: PointData[] = [];
  private vertexCount: number = 0;

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

      // Compile shaders and create program with error handling
      this.program = this.createProgram(gl);
      if (!this.program) {
        throw new Error('Failed to create shader program');
      }

      // Get attribute locations
      this.aPos = gl.getAttribLocation(this.program, 'a_pos');
      this.aOffset = gl.getAttribLocation(this.program, 'a_offset');
      this.aIndex = gl.getAttribLocation(this.program, 'a_index');

      // Get uniform locations
      this.cacheUniformLocations(gl);

      // Create buffers with error handling
      this.vertexBuffer = createBufferWithErrorHandling(gl, 'vertex', this.id);
      this.indexBuffer = createBufferWithErrorHandling(gl, 'index', this.id);

    } catch (error) {
      this.initializationError = error as Error;
      console.error(
        `[PointShaderLayer] Initialization failed for layer "${this.id}":`,
        error instanceof ShaderError ? error.message : error
      );
      return;
    }

    // Listen for source data changes
    const onSourceData = (e: { sourceId: string; isSourceLoaded?: boolean }) => {
      if (e.sourceId === this.sourceId && e.isSourceLoaded) {
        this.safeUpdatePointData(gl);
        map.triggerRepaint();
      }
    };
    map.on('sourcedata', onSourceData);

    // Also update when map becomes idle (tiles loaded)
    const onIdle = () => {
      this.safeUpdatePointData(gl);
      map.triggerRepaint();
    };
    map.once('idle', onIdle);

    // Initial data load (after a small delay to let source load)
    setTimeout(() => {
      this.safeUpdatePointData(gl);
      map.triggerRepaint();
    }, 100);

    this.lastFrameTime = performance.now();
  }

  /**
   * Safe wrapper for updatePointData with error handling
   */
  private safeUpdatePointData(gl: WebGLRenderingContext): void {
    try {
      this.updatePointData(gl);
    } catch (error) {
      console.error(`[PointShaderLayer] Error updating point data for layer "${this.id}":`, error);
    }
  }

  /**
   * Called when the layer is removed
   */
  onRemove(_map: MapLibreMap, gl: WebGLRenderingContext): void {
    // Use safe cleanup to handle any errors during resource disposal
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
        console.warn(`[PointShaderLayer] Skipping render for layer "${this.id}" due to initialization error`);
        this.hasLoggedError = true;
      }
      return;
    }

    // Check for WebGL context loss
    if (isContextLost(gl)) {
      console.warn(`[PointShaderLayer] WebGL context lost for layer "${this.id}"`);
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
    const uSize = this.uniforms.get('u_size');
    const uTime = this.uniforms.get('u_time');

    if (uMatrix) gl.uniformMatrix4fv(uMatrix, false, matrix);
    if (uResolution) gl.uniform2fv(uResolution, resolution);

    // Get size from config (maxRadius, radius, size, or baseSize)
    const size = (this.config as Record<string, unknown>).maxRadius ??
                 (this.config as Record<string, unknown>).radius ??
                 (this.config as Record<string, unknown>).size ??
                 (this.config as Record<string, unknown>).baseSize ?? 50;
    if (uSize) gl.uniform1f(uSize, size as number);
    if (uTime) gl.uniform1f(uTime, this.time);

    // Set shader-specific uniforms
    this.setShaderUniforms(gl);

    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    // Set up attributes
    // Position (2 floats)
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 20, 0);

    // Offset (2 floats)
    gl.enableVertexAttribArray(this.aOffset);
    gl.vertexAttribPointer(this.aOffset, 2, gl.FLOAT, false, 20, 8);

    // Index (1 float)
    gl.enableVertexAttribArray(this.aIndex);
    gl.vertexAttribPointer(this.aIndex, 1, gl.FLOAT, false, 20, 16);

    // Bind index buffer and draw
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.vertexCount, gl.UNSIGNED_SHORT, 0);

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
      // Compile shaders using error handling utilities
      vertexShader = compileShaderWithErrorHandling(
        gl,
        gl.VERTEX_SHADER,
        POINT_VERTEX_SHADER,
        this.id
      );

      fragmentShader = compileShaderWithErrorHandling(
        gl,
        gl.FRAGMENT_SHADER,
        this.definition.fragmentShader,
        this.id
      );

      // Link program using error handling utilities
      const program = linkProgramWithErrorHandling(
        gl,
        vertexShader,
        fragmentShader,
        this.id
      );

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
   * Cache uniform locations
   */
  private cacheUniformLocations(gl: WebGLRenderingContext): void {
    if (!this.program) return;

    // Common uniforms
    const commonUniforms = [
      'u_matrix', 'u_resolution', 'u_size', 'u_time',
      'u_color', 'u_intensity', 'u_opacity'
    ];

    // Get uniform names from config schema
    const schemaUniforms = Object.keys(this.definition.configSchema).map(
      key => `u_${key}`
    );

    // Also add known uniforms from the fragment shader
    const allUniforms = new Set([
      ...commonUniforms,
      ...schemaUniforms,
      // Common shader uniforms
      'u_rings', 'u_maxRadius', 'u_fadeOut', 'u_thickness',
      'u_minScale', 'u_maxScale', 'u_easing', 'u_restDuration', 'u_baseSize',
      'u_arcAngle', 'u_radius', 'u_trail', 'u_gridLines', 'u_showGrid', 'u_gridColor',
      'u_particleCount', 'u_spread', 'u_particleSize', 'u_lifetime', 'u_gravity', 'u_continuous',
      'u_softness', 'u_pulseMin', 'u_pulseMax', 'u_coreSize',
      'u_holdDuration', 'u_rotate', 'u_strokeOnly', 'u_strokeWidth',
      'u_shapeCount', 'u_shape0', 'u_shape1', 'u_shape2', 'u_shape3', 'u_shape4'
    ]);

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
   * Update point data from source
   */
  private updatePointData(gl: WebGLRenderingContext): void {
    if (!this.map) return;

    const source = this.map.getSource(this.sourceId);
    if (!source || source.type !== 'geojson') return;

    // Get features from source using querySourceFeatures
    // This requires the source to be loaded
    const features = this.map.querySourceFeatures(this.sourceId);

    if (features.length > 0) {
      this.processFeatures(features, gl);
    }
  }

  /**
   * Process GeoJSON features into vertex data
   */
  private processFeatures(features: GeoJSON.Feature[] | maplibregl.MapGeoJSONFeature[], gl: WebGLRenderingContext): void {
    this.points = [];

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (feature.geometry.type !== 'Point') continue;

      const coords = (feature.geometry as GeoJSON.Point).coordinates;
      const mercator = this.lngLatToMercator(coords[0], coords[1]);

      this.points.push({
        mercatorX: mercator[0],
        mercatorY: mercator[1],
        index: i,
      });
    }

    this.buildBuffers(gl);
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
    if (this.points.length === 0) {
      this.vertexCount = 0;
      return;
    }

    // Each point becomes a quad (4 vertices, 6 indices)
    // Vertex format: x, y, offsetX, offsetY, index (5 floats = 20 bytes)
    const vertexData = new Float32Array(this.points.length * 4 * 5);
    const indexData = new Uint16Array(this.points.length * 6);

    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const vi = i * 4 * 5; // Vertex data index
      const ii = i * 6;     // Index data index
      const baseVertex = i * 4;

      // Quad offsets: bottom-left, bottom-right, top-right, top-left
      const offsets = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ];

      for (let j = 0; j < 4; j++) {
        const vj = vi + j * 5;
        vertexData[vj + 0] = point.mercatorX;
        vertexData[vj + 1] = point.mercatorY;
        vertexData[vj + 2] = offsets[j][0];
        vertexData[vj + 3] = offsets[j][1];
        vertexData[vj + 4] = point.index;
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
