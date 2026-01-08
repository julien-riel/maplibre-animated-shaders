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

import type { mat4 } from 'gl-matrix';
import { BaseShaderLayer } from './BaseShaderLayer';
import { PoolManager, type PolygonData as PooledPolygonData } from '../utils/object-pool';

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

/**
 * PolygonShaderLayer - Custom WebGL layer for polygon shaders
 *
 * Supports data-driven properties via MapLibre-style expressions.
 */
export class PolygonShaderLayer extends BaseShaderLayer {
  protected readonly layerTypeName = 'PolygonShaderLayer';
  protected readonly geometryType = 'polygon' as const;

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

  // Polygon data (using object pool for reduced GC pressure)
  private polygons: PooledPolygonData[] = [];
  private totalVertices: number = 0;
  private poolManager: PoolManager = PoolManager.getInstance();

  protected getVertexShader(): string {
    return POLYGON_VERTEX_SHADER;
  }

  protected initializeAttributes(gl: WebGLRenderingContext): void {
    if (!this.program) return;

    this.aPos = gl.getAttribLocation(this.program, 'a_pos');
    this.aUv = gl.getAttribLocation(this.program, 'a_uv');
    this.aCentroid = gl.getAttribLocation(this.program, 'a_centroid');
    this.aPolygonIndex = gl.getAttribLocation(this.program, 'a_polygon_index');
    this.aTimeOffset = gl.getAttribLocation(this.program, 'a_timeOffset');
    this.aColor = gl.getAttribLocation(this.program, 'a_color');
    this.aIntensity = gl.getAttribLocation(this.program, 'a_intensity');
    this.aIsPlaying = gl.getAttribLocation(this.program, 'a_isPlaying');
    this.aLocalTime = gl.getAttribLocation(this.program, 'a_localTime');
  }

  protected cacheUniformLocations(gl: WebGLRenderingContext): void {
    if (!this.program) return;

    // Common uniforms
    const commonUniforms = [
      'u_matrix',
      'u_resolution',
      'u_time',
      'u_color',
      'u_intensity',
      'u_opacity',
      // Data-driven flags
      'u_useDataDrivenColor',
      'u_useDataDrivenIntensity',
    ];

    // Get uniform names from config schema
    const schemaUniforms = Object.keys(this.definition.configSchema).map((key) => `u_${key}`);

    // Polygon-specific uniforms
    const polygonUniforms = [
      // Scan Lines
      'u_direction',
      'u_lineWidth',
      'u_spacing',
      'u_fade',
      // Ripple
      'u_waves',
      'u_decay',
      'u_origin',
      // Hatching
      'u_angle',
      'u_thickness',
      'u_crossHatch',
      // Fill Wave
      'u_level',
      'u_waveHeight',
      'u_waveFrequency',
      // Noise
      'u_scale',
      'u_octaves',
      'u_noiseType',
      // Marching Ants
      'u_dashLength',
      'u_gapLength',
      'u_width',
      'u_alternateColor',
      // Gradient Rotation
      'u_colors',
      'u_gradientType',
      'u_center',
      'u_color0',
      'u_color1',
      'u_color2',
      'u_color3',
      // Dissolve
      'u_progress',
      'u_noiseScale',
      'u_edgeColor',
      'u_edgeWidth',
    ];

    const allUniforms = new Set([...commonUniforms, ...schemaUniforms, ...polygonUniforms]);

    for (const name of allUniforms) {
      this.uniforms.set(name, gl.getUniformLocation(this.program, name));
    }
  }

  protected setCommonUniforms(
    gl: WebGLRenderingContext,
    matrix: mat4,
    resolution: [number, number]
  ): void {
    const uMatrix = this.uniforms.get('u_matrix');
    const uResolution = this.uniforms.get('u_resolution');
    const uTime = this.uniforms.get('u_time');

    if (uMatrix) gl.uniformMatrix4fv(uMatrix, false, matrix);
    if (uResolution) gl.uniform2fv(uResolution, resolution);
    if (uTime) gl.uniform1f(uTime, this.time);
  }

  protected updateData(gl: WebGLRenderingContext): void {
    if (!this.map) return;

    const source = this.map.getSource(this.sourceId);
    if (!source || source.type !== 'geojson') return;

    // Get features from source
    const features = this.map.querySourceFeatures(this.sourceId);

    if (features.length > 0) {
      this.processFeatures(features, gl);
    }
  }

  protected releasePooledData(): void {
    if (this.polygons.length > 0) {
      this.poolManager.polygonPool.releaseAll(this.polygons);
      this.polygons = [];
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
    // Release existing polygons back to the pool before reprocessing
    this.releasePooledData();
    this.features = features as GeoJSON.Feature[];

    let polygonIndex = 0;

    for (const feature of features) {
      if (feature.geometry.type === 'Polygon') {
        this.processPolygon((feature.geometry as GeoJSON.Polygon).coordinates, polygonIndex++);
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
   * Uses object pooling for reduced GC pressure
   */
  private processPolygon(coordinates: number[][][], polygonIndex: number): void {
    // Get outer ring (first ring)
    const outerRing = coordinates[0];
    if (outerRing.length < 3) return;

    // Acquire polygon object from pool
    const polygon = this.poolManager.polygonPool.acquire();

    // Reset bounds to initial values
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let centroidX = 0,
      centroidY = 0;

    // Convert to Mercator and calculate bounds/centroid
    for (let i = 0; i < outerRing.length - 1; i++) {
      // Skip last point (duplicate of first)
      const [lng, lat] = outerRing[i];
      const [mx, my] = this.lngLatToMercator(lng, lat);
      polygon.vertices.push([mx, my]);

      minX = Math.min(minX, mx);
      minY = Math.min(minY, my);
      maxX = Math.max(maxX, mx);
      maxY = Math.max(maxY, my);

      centroidX += mx;
      centroidY += my;
    }

    const vertexCount = polygon.vertices.length;
    if (vertexCount > 0) {
      centroidX /= vertexCount;
      centroidY /= vertexCount;
    }

    // Set polygon properties
    polygon.centroid[0] = centroidX;
    polygon.centroid[1] = centroidY;
    polygon.bounds.minX = minX;
    polygon.bounds.minY = minY;
    polygon.bounds.maxX = maxX;
    polygon.bounds.maxY = maxY;
    polygon.index = polygonIndex;

    this.polygons.push(polygon);
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
    const timeOffsets = this.getTimeOffsets();

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
        const u =
          bounds.maxX !== bounds.minX ? (x - bounds.minX) / (bounds.maxX - bounds.minX) : 0.5;
        const v =
          bounds.maxY !== bounds.minY ? (y - bounds.minY) / (bounds.maxY - bounds.minY) : 0.5;
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

      // Triangulate using ear clipping
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

  protected updateInteractionBufferFromState(gl: WebGLRenderingContext): void {
    if (!this.stateManager || !this.interactionBuffer) return;

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
  }

  protected renderGeometry(gl: WebGLRenderingContext): void {
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
  }
}
