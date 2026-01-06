/**
 * PointShaderLayer - WebGL Custom Layer for point shaders
 *
 * Implements MapLibre's CustomLayerInterface to render points
 * with custom GLSL fragment shaders.
 *
 * Supports data-driven properties via MapLibre-style expressions:
 * - color: ['get', 'status_color']
 * - speed: ['coalesce', ['get', 'animation_speed'], 1.0]
 * - intensity: ['match', ['get', 'priority'], 'high', 1.0, 'low', 0.3, 0.5]
 */

import type { mat4 } from 'gl-matrix';
import { BaseShaderLayer } from './BaseShaderLayer';
import { getConfigNumber } from '../utils/config-helpers';
import { PoolManager, type PointData as PooledPointData } from '../utils/object-pool';

/**
 * Vertex shader for point rendering
 * Renders a quad at each point position
 *
 * Supports data-driven properties via per-vertex attributes:
 * - a_color: Per-feature color (RGBA)
 * - a_intensity: Per-feature intensity
 *
 * Supports per-feature interactive animation:
 * - a_isPlaying: 0.0 = paused, 1.0 = playing
 * - a_localTime: Frozen time when paused
 */
const POINT_VERTEX_SHADER = `
  attribute vec2 a_pos;
  attribute vec2 a_offset;
  attribute float a_index;
  attribute float a_timeOffset;
  attribute vec4 a_color;
  attribute float a_intensity;
  attribute float a_isPlaying;
  attribute float a_localTime;

  uniform mat4 u_matrix;
  uniform float u_size;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_useDataDrivenColor;
  uniform float u_useDataDrivenIntensity;

  varying vec2 v_pos;
  varying float v_index;
  varying float v_timeOffset;
  varying float v_effectiveTime;
  varying vec4 v_color;
  varying float v_intensity;
  varying float v_useDataDrivenColor;
  varying float v_useDataDrivenIntensity;

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
    v_timeOffset = a_timeOffset;

    // Calculate effective time for interactive animation
    // When playing (a_isPlaying = 1.0): use global time + offset
    // When paused (a_isPlaying = 0.0): use stored local time
    float globalAnimTime = u_time + a_timeOffset;
    v_effectiveTime = mix(a_localTime, globalAnimTime, a_isPlaying);

    // Pass data-driven properties
    v_color = a_color;
    v_intensity = a_intensity;
    v_useDataDrivenColor = u_useDataDrivenColor;
    v_useDataDrivenIntensity = u_useDataDrivenIntensity;
  }
`;

/**
 * PointShaderLayer - Custom WebGL layer for point shaders
 *
 * Supports data-driven properties via MapLibre-style expressions.
 */
export class PointShaderLayer extends BaseShaderLayer {
  protected readonly layerTypeName = 'PointShaderLayer';

  // Attribute locations
  private aPos: number = -1;
  private aOffset: number = -1;
  private aIndex: number = -1;
  private aTimeOffset: number = -1;
  private aColor: number = -1;
  private aIntensity: number = -1;
  private aIsPlaying: number = -1;
  private aLocalTime: number = -1;

  // Point data (using object pool for reduced GC pressure)
  private points: PooledPointData[] = [];
  private poolManager: PoolManager = PoolManager.getInstance();

  protected getVertexShader(): string {
    return POINT_VERTEX_SHADER;
  }

  protected initializeAttributes(gl: WebGLRenderingContext): void {
    if (!this.program) return;

    this.aPos = gl.getAttribLocation(this.program, 'a_pos');
    this.aOffset = gl.getAttribLocation(this.program, 'a_offset');
    this.aIndex = gl.getAttribLocation(this.program, 'a_index');
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
      'u_size',
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

    // Point-specific uniforms
    const pointUniforms = [
      'u_rings',
      'u_maxRadius',
      'u_fadeOut',
      'u_thickness',
      'u_minScale',
      'u_maxScale',
      'u_easing',
      'u_restDuration',
      'u_baseSize',
      'u_arcAngle',
      'u_radius',
      'u_trail',
      'u_gridLines',
      'u_showGrid',
      'u_gridColor',
      'u_particleCount',
      'u_spread',
      'u_particleSize',
      'u_lifetime',
      'u_gravity',
      'u_continuous',
      'u_softness',
      'u_pulseMin',
      'u_pulseMax',
      'u_coreSize',
      'u_holdDuration',
      'u_rotate',
      'u_strokeOnly',
      'u_strokeWidth',
      'u_shapeCount',
      'u_shape0',
      'u_shape1',
      'u_shape2',
      'u_shape3',
      'u_shape4',
    ];

    const allUniforms = new Set([...commonUniforms, ...schemaUniforms, ...pointUniforms]);

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
    const uSize = this.uniforms.get('u_size');
    const uTime = this.uniforms.get('u_time');

    if (uMatrix) gl.uniformMatrix4fv(uMatrix, false, matrix);
    if (uResolution) gl.uniform2fv(uResolution, resolution);

    // Get size from config (maxRadius, radius, size, or baseSize)
    const size = getConfigNumber(this.config, ['maxRadius', 'radius', 'size', 'baseSize'], 50);
    if (uSize) gl.uniform1f(uSize, size);
    if (uTime) gl.uniform1f(uTime, this.time);
  }

  protected updateData(gl: WebGLRenderingContext): void {
    if (!this.map) return;

    const source = this.map.getSource(this.sourceId);
    if (!source || source.type !== 'geojson') return;

    // Get features from source using querySourceFeatures
    const features = this.map.querySourceFeatures(this.sourceId);

    if (features.length > 0) {
      this.processFeatures(features, gl);
    }
  }

  protected releasePooledData(): void {
    if (this.points.length > 0) {
      this.poolManager.pointPool.releaseAll(this.points);
      this.points = [];
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
    // Release existing points back to the pool before reprocessing
    this.releasePooledData();

    this.features = features as GeoJSON.Feature[];

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (feature.geometry.type !== 'Point') continue;

      const coords = (feature.geometry as GeoJSON.Point).coordinates;
      const mercator = this.lngLatToMercator(coords[0], coords[1]);

      // Acquire point from pool instead of creating new object
      const point = this.poolManager.pointPool.acquire();
      point.mercatorX = mercator[0];
      point.mercatorY = mercator[1];
      point.index = i;
      this.points.push(point);
    }

    this.buildBuffers(gl);
  }

  /**
   * Build vertex and index buffers
   */
  private buildBuffers(gl: WebGLRenderingContext): void {
    if (this.points.length === 0) {
      this.vertexCount = 0;
      return;
    }

    // Calculate time offsets for all features
    const timeOffsets = this.getTimeOffsets();

    // Evaluate data-driven properties
    this.evaluateDataDrivenProperties();

    // Each point becomes a quad (4 vertices, 6 indices)
    // Vertex format: x, y, offsetX, offsetY, index, timeOffset (6 floats = 24 bytes)
    const vertexData = new Float32Array(this.points.length * 4 * 6);
    const indexData = new Uint16Array(this.points.length * 6);

    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const vi = i * 4 * 6; // Vertex data index
      const ii = i * 6; // Index data index
      const baseVertex = i * 4;
      const timeOffset = timeOffsets[point.index] ?? 0;

      // Quad offsets: bottom-left, bottom-right, top-right, top-left
      const offsets = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ];

      for (let j = 0; j < 4; j++) {
        const vj = vi + j * 6;
        vertexData[vj + 0] = point.mercatorX;
        vertexData[vj + 1] = point.mercatorY;
        vertexData[vj + 2] = offsets[j][0];
        vertexData[vj + 3] = offsets[j][1];
        vertexData[vj + 4] = point.index;
        vertexData[vj + 5] = timeOffset;
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
   * Build the data-driven attribute buffer
   */
  private buildDataDrivenBuffer(gl: WebGLRenderingContext): void {
    if (!this.dataDrivenBuffer) return;

    // Data-driven format per vertex: color (4 floats) + intensity (1 float) = 5 floats = 20 bytes
    // Each point has 4 vertices (quad)
    const dataDrivenData = new Float32Array(this.points.length * 4 * 5);

    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const featureIdx = point.index;
      const data = this.featureData[featureIdx] ?? { color: [1, 1, 1, 1], intensity: 1.0 };

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

    const { isPlayingData, localTimeData } = this.stateManager.generateBufferData(4); // 4 vertices per point
    this.updateInteractionBuffer(gl, isPlayingData, localTimeData);
    this.stateManager.clearDirty();
  }

  protected updateInteractionBufferFromState(gl: WebGLRenderingContext): void {
    if (!this.stateManager || !this.interactionBuffer) return;

    const { isPlayingData, localTimeData } = this.stateManager.generateBufferData(4); // 4 vertices per point
    this.updateInteractionBuffer(gl, isPlayingData, localTimeData);
  }

  protected renderGeometry(gl: WebGLRenderingContext): void {
    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    // Set up attributes (stride = 24 bytes = 6 floats)
    const stride = 24;

    // Position (2 floats)
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, stride, 0);

    // Offset (2 floats)
    gl.enableVertexAttribArray(this.aOffset);
    gl.vertexAttribPointer(this.aOffset, 2, gl.FLOAT, false, stride, 8);

    // Index (1 float)
    gl.enableVertexAttribArray(this.aIndex);
    gl.vertexAttribPointer(this.aIndex, 1, gl.FLOAT, false, stride, 16);

    // TimeOffset (1 float)
    if (this.aTimeOffset >= 0) {
      gl.enableVertexAttribArray(this.aTimeOffset);
      gl.vertexAttribPointer(this.aTimeOffset, 1, gl.FLOAT, false, stride, 20);
    }

    // Bind data-driven buffer for color and intensity attributes
    const hasDataDriven = this.hasDataDrivenColor || this.hasDataDrivenIntensity;
    if (hasDataDriven && this.dataDrivenBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.dataDrivenBuffer);

      // Data-driven stride: color (4 floats) + intensity (1 float) = 5 floats = 20 bytes
      const dataDrivenStride = 20;

      // Color attribute (4 floats)
      if (this.aColor >= 0) {
        gl.enableVertexAttribArray(this.aColor);
        gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, dataDrivenStride, 0);
      }

      // Intensity attribute (1 float)
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
    if (this.aOffset >= 0) gl.disableVertexAttribArray(this.aOffset);
    if (this.aIndex >= 0) gl.disableVertexAttribArray(this.aIndex);
    if (this.aTimeOffset >= 0) gl.disableVertexAttribArray(this.aTimeOffset);
    if (this.aColor >= 0) gl.disableVertexAttribArray(this.aColor);
    if (this.aIntensity >= 0) gl.disableVertexAttribArray(this.aIntensity);
    if (this.aIsPlaying >= 0) gl.disableVertexAttribArray(this.aIsPlaying);
    if (this.aLocalTime >= 0) gl.disableVertexAttribArray(this.aLocalTime);
  }
}
