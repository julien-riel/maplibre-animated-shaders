/**
 * PolygonShaderLayer - WebGL Custom Layer for polygon shaders
 *
 * Implements MapLibre's CustomLayerInterface to render polygons
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
 * Vertex shader for polygon rendering
 * Renders triangulated polygons with UV coordinates
 */
const POLYGON_VERTEX_SHADER = `
  attribute vec2 a_pos;
  attribute vec2 a_uv;
  attribute vec2 a_centroid;
  attribute float a_polygon_index;

  uniform mat4 u_matrix;
  uniform vec2 u_resolution;

  varying vec2 v_pos;
  varying vec2 v_uv;
  varying vec2 v_centroid;
  varying float v_polygon_index;
  varying vec2 v_screen_pos;

  void main() {
    vec4 projected = u_matrix * vec4(a_pos, 0.0, 1.0);
    gl_Position = projected;

    // Pass data to fragment shader
    v_pos = a_pos;
    v_uv = a_uv;
    v_centroid = a_centroid;
    v_polygon_index = a_polygon_index;

    // Screen position for effects
    v_screen_pos = (projected.xy / projected.w + 1.0) * 0.5 * u_resolution;
  }
`;

interface PolygonData {
  vertices: number[][];
  centroid: [number, number];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  index: number;
}

/**
 * PolygonShaderLayer - Custom WebGL layer for polygon shaders
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

  // Attribute locations
  private aPos: number = -1;
  private aUv: number = -1;
  private aCentroid: number = -1;
  private aPolygonIndex: number = -1;

  // Uniform locations
  private uniforms: Map<string, WebGLUniformLocation | null> = new Map();

  // Polygon data
  private polygons: PolygonData[] = [];
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

      this.cacheUniformLocations(gl);

      this.vertexBuffer = createBufferWithErrorHandling(gl, 'vertex', this.id);
      this.indexBuffer = createBufferWithErrorHandling(gl, 'index', this.id);

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

    const onIdle = () => {
      this.safeUpdatePolygonData(gl);
      map.triggerRepaint();
    };
    map.once('idle', onIdle);

    setTimeout(() => {
      this.safeUpdatePolygonData(gl);
      map.triggerRepaint();
    }, 100);

    this.lastFrameTime = performance.now();
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

    // Set shader-specific uniforms
    this.setShaderUniforms(gl);

    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    // Vertex format: posX, posY, uvX, uvY, centroidX, centroidY, polygonIndex
    // 7 floats = 28 bytes per vertex
    const stride = 28;

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

    // Bind index buffer and draw
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.vertexCount, gl.UNSIGNED_SHORT, 0);

    // Restore WebGL state - disable vertex attribute arrays
    if (this.aPos >= 0) gl.disableVertexAttribArray(this.aPos);
    if (this.aUv >= 0) gl.disableVertexAttribArray(this.aUv);
    if (this.aCentroid >= 0) gl.disableVertexAttribArray(this.aCentroid);
    if (this.aPolygonIndex >= 0) gl.disableVertexAttribArray(this.aPolygonIndex);

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
      'u_color', 'u_intensity', 'u_opacity'
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

    // Calculate total vertices and indices needed
    let totalVertices = 0;
    let totalIndices = 0;

    for (const polygon of this.polygons) {
      totalVertices += polygon.vertices.length;
      // Each polygon with N vertices creates N-2 triangles (fan triangulation)
      totalIndices += (polygon.vertices.length - 2) * 3;
    }

    // Vertex format: posX, posY, uvX, uvY, centroidX, centroidY, polygonIndex
    // 7 floats = 28 bytes per vertex
    const vertexData = new Float32Array(totalVertices * 7);
    const indexData = new Uint16Array(totalIndices);

    let vertexOffset = 0;
    let indexOffset = 0;
    let baseVertex = 0;

    for (const polygon of this.polygons) {
      const { vertices, centroid, bounds, index } = polygon;

      // Add vertices with UV coordinates
      for (let i = 0; i < vertices.length; i++) {
        const [x, y] = vertices[i];
        const vOffset = vertexOffset * 7;

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
}
