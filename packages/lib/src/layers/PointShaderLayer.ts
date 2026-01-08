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
import {
  InstancedRenderer,
  createQuadGeometry,
  type InstanceAttribute,
  type InstanceLayout,
} from '../webgl/InstancedRenderer';
import type { IWebGLContext } from '../webgl/WebGLContext';

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
/**
 * Standard vertex shader for point rendering (non-instanced)
 * Uses 4 vertices per point with duplicated position data
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
 * Instanced vertex shader for point rendering
 *
 * Per-vertex attributes (shared quad geometry):
 * - a_vertex: Unit quad vertex position (-0.5 to 0.5)
 * - a_uv: Texture coordinates (0 to 1)
 *
 * Per-instance attributes:
 * - a_position: Mercator coordinates of the point center
 * - a_index: Feature index for data lookup
 * - a_timeOffset: Time offset for desynchronized animation
 * - a_color: Data-driven color (RGBA)
 * - a_intensity: Data-driven intensity
 * - a_isPlaying: Interactive play state (0.0 = paused, 1.0 = playing)
 * - a_localTime: Frozen time when paused
 */
const POINT_VERTEX_SHADER_INSTANCED = `
  // Per-vertex (shared quad geometry)
  attribute vec2 a_vertex;
  attribute vec2 a_uv;

  // Per-instance (data for each point)
  attribute vec2 a_position;
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
    // a_position is the point center in Mercator coordinates
    // a_vertex is the unit quad vertex (-0.5 to 0.5)

    // Transform point to clip space
    vec4 projected = u_matrix * vec4(a_position, 0.0, 1.0);

    // Calculate pixel offset for the quad (scale from -0.5..0.5 to -1..1 for size)
    vec2 pixelOffset = a_vertex * 2.0 * u_size;

    // Convert pixel offset to clip space offset
    vec2 clipOffset = pixelOffset / u_resolution * 2.0 * projected.w;

    gl_Position = projected + vec4(clipOffset, 0.0, 0.0);

    // Pass normalized position within quad to fragment shader (-1 to 1)
    v_pos = a_vertex * 2.0;
    v_index = a_index;
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

/**
 * PointShaderLayer - Custom WebGL layer for point shaders
 *
 * Supports data-driven properties via MapLibre-style expressions.
 */
/**
 * Instance data stride for instanced rendering
 * Layout per instance:
 * - position (2 floats) = 8 bytes
 * - index (1 float) = 4 bytes
 * - timeOffset (1 float) = 4 bytes
 * - color (4 floats) = 16 bytes
 * - intensity (1 float) = 4 bytes
 * - isPlaying (1 float) = 4 bytes
 * - localTime (1 float) = 4 bytes
 * Total: 11 floats = 44 bytes per instance
 */
const INSTANCE_STRIDE = 44;
const INSTANCE_FLOATS = 11;

export class PointShaderLayer extends BaseShaderLayer {
  protected readonly layerTypeName = 'PointShaderLayer';

  // Attribute locations (standard rendering)
  private aPos: number = -1;
  private aOffset: number = -1;
  private aIndex: number = -1;
  private aTimeOffset: number = -1;
  private aColor: number = -1;
  private aIntensity: number = -1;
  private aIsPlaying: number = -1;
  private aLocalTime: number = -1;

  // Attribute locations (instanced rendering)
  private aVertex: number = -1;
  private aUv: number = -1;
  private aPosition: number = -1;
  private aIndexInstanced: number = -1;
  private aTimeOffsetInstanced: number = -1;
  private aColorInstanced: number = -1;
  private aIntensityInstanced: number = -1;
  private aIsPlayingInstanced: number = -1;
  private aLocalTimeInstanced: number = -1;

  // Point data (using object pool for reduced GC pressure)
  private points: PooledPointData[] = [];
  private poolManager: PoolManager = PoolManager.getInstance();

  // Instance data buffer for instanced rendering
  private instanceData: Float32Array | null = null;

  protected getVertexShader(): string {
    // Return instanced shader if instancing will be used
    return this.useInstancing ? POINT_VERTEX_SHADER_INSTANCED : POINT_VERTEX_SHADER;
  }

  protected initializeAttributes(gl: WebGLRenderingContext): void {
    if (!this.program) return;

    if (this.useInstancing) {
      // Instanced rendering attributes
      // Per-vertex (geometry)
      this.aVertex = gl.getAttribLocation(this.program, 'a_vertex');
      this.aUv = gl.getAttribLocation(this.program, 'a_uv');
      // Per-instance
      this.aPosition = gl.getAttribLocation(this.program, 'a_position');
      this.aIndexInstanced = gl.getAttribLocation(this.program, 'a_index');
      this.aTimeOffsetInstanced = gl.getAttribLocation(this.program, 'a_timeOffset');
      this.aColorInstanced = gl.getAttribLocation(this.program, 'a_color');
      this.aIntensityInstanced = gl.getAttribLocation(this.program, 'a_intensity');
      this.aIsPlayingInstanced = gl.getAttribLocation(this.program, 'a_isPlaying');
      this.aLocalTimeInstanced = gl.getAttribLocation(this.program, 'a_localTime');
    } else {
      // Standard rendering attributes
      this.aPos = gl.getAttribLocation(this.program, 'a_pos');
      this.aOffset = gl.getAttribLocation(this.program, 'a_offset');
      this.aIndex = gl.getAttribLocation(this.program, 'a_index');
      this.aTimeOffset = gl.getAttribLocation(this.program, 'a_timeOffset');
      this.aColor = gl.getAttribLocation(this.program, 'a_color');
      this.aIntensity = gl.getAttribLocation(this.program, 'a_intensity');
      this.aIsPlaying = gl.getAttribLocation(this.program, 'a_isPlaying');
      this.aLocalTime = gl.getAttribLocation(this.program, 'a_localTime');
    }
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
   * Chooses between instanced and standard rendering based on feature count
   */
  private buildBuffers(gl: WebGLRenderingContext): void {
    if (this.points.length === 0) {
      this.vertexCount = 0;
      return;
    }

    // Initialize interaction state manager with features (needed for both paths)
    if (this.interactionEnabled && this.stateManager) {
      this.stateManager.initializeFromFeatures(this.features);
    }

    // Use instanced rendering for large datasets
    if (this.shouldUseInstancing(this.points.length)) {
      this.buildInstanceData();
      // For instanced rendering, vertexCount is used as instance count
      this.vertexCount = this.points.length;
      return;
    }

    // Standard rendering path (non-instanced)
    this.buildStandardBuffers(gl);
  }

  /**
   * Build standard (non-instanced) vertex and index buffers
   */
  private buildStandardBuffers(gl: WebGLRenderingContext): void {
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

    // Build interaction buffer if enabled
    if (this.interactionEnabled && this.stateManager) {
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
    if (!this.stateManager) return;

    // Use instanced path if applicable
    if (this.shouldUseInstancing(this.points.length)) {
      this.updateInstanceInteractionData();
      return;
    }

    // Standard path
    if (!this.interactionBuffer) return;
    const { isPlayingData, localTimeData } = this.stateManager.generateBufferData(4); // 4 vertices per point
    this.updateInteractionBuffer(gl, isPlayingData, localTimeData);
  }

  protected renderGeometry(gl: WebGLRenderingContext): void {
    // Use instanced rendering if available and beneficial
    if (this.instancedRenderer && this.shouldUseInstancing(this.points.length)) {
      this.renderInstanced(gl);
    } else {
      this.renderStandard(gl);
    }
  }

  /**
   * Standard (non-instanced) rendering path
   * Used when instancing is not supported or for small datasets
   */
  private renderStandard(gl: WebGLRenderingContext): void {
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

  /**
   * Instanced rendering path
   * More efficient for large datasets as it reuses quad geometry
   */
  private renderInstanced(_gl: WebGLRenderingContext): void {
    if (!this.instancedRenderer) return;

    // The InstancedRenderer handles all attribute setup via VAO
    this.instancedRenderer.draw(this.points.length);
  }

  // =========================================================================
  // Instancing implementation
  // =========================================================================

  /**
   * Check if this layer supports instanced rendering
   */
  protected supportsInstancing(): boolean {
    return true;
  }

  /**
   * Initialize the instanced renderer with quad geometry
   */
  protected initializeInstancedRenderer(ctx: IWebGLContext): void {
    const gl = ctx.gl;

    // Create the instanced renderer
    this.instancedRenderer = new InstancedRenderer(ctx);

    // Setup shared quad geometry
    const { vertices, indices, layout, stride } = createQuadGeometry();

    // Update layout with actual attribute locations
    const updatedLayout: InstanceAttribute[] = layout.map((attr) => ({
      ...attr,
      location:
        attr.name === 'a_vertex' ? this.aVertex : attr.name === 'a_uv' ? this.aUv : attr.location,
    }));

    this.instancedRenderer.setIndexedGeometry(vertices, indices, updatedLayout, stride);

    // Define instance attribute layout
    const instanceLayout: InstanceLayout = {
      stride: INSTANCE_STRIDE,
      attributes: [
        {
          name: 'a_position',
          location: this.aPosition,
          size: 2,
          type: gl.FLOAT,
          offset: 0,
        },
        {
          name: 'a_index',
          location: this.aIndexInstanced,
          size: 1,
          type: gl.FLOAT,
          offset: 8,
        },
        {
          name: 'a_timeOffset',
          location: this.aTimeOffsetInstanced,
          size: 1,
          type: gl.FLOAT,
          offset: 12,
        },
        {
          name: 'a_color',
          location: this.aColorInstanced,
          size: 4,
          type: gl.FLOAT,
          offset: 16,
        },
        {
          name: 'a_intensity',
          location: this.aIntensityInstanced,
          size: 1,
          type: gl.FLOAT,
          offset: 32,
        },
        {
          name: 'a_isPlaying',
          location: this.aIsPlayingInstanced,
          size: 1,
          type: gl.FLOAT,
          offset: 36,
        },
        {
          name: 'a_localTime',
          location: this.aLocalTimeInstanced,
          size: 1,
          type: gl.FLOAT,
          offset: 40,
        },
      ],
    };

    // Initial empty instance data
    const emptyData = new Float32Array(0);
    this.instancedRenderer.setInstanceData(emptyData, instanceLayout);
    this.instancedRenderer.setupVAO();
  }

  /**
   * Build instance data for instanced rendering
   * Packs all per-instance attributes into a single buffer
   */
  private buildInstanceData(): void {
    if (!this.instancedRenderer || this.points.length === 0) {
      this.instanceData = null;
      return;
    }

    const timeOffsets = this.getTimeOffsets();
    this.evaluateDataDrivenProperties();

    // Get interaction state if enabled
    let isPlayingData: Float32Array | null = null;
    let localTimeData: Float32Array | null = null;
    if (this.interactionEnabled && this.stateManager) {
      const bufferData = this.stateManager.generateBufferData(1); // 1 value per instance
      isPlayingData = bufferData.isPlayingData;
      localTimeData = bufferData.localTimeData;
    }

    // Allocate instance data buffer
    this.instanceData = new Float32Array(this.points.length * INSTANCE_FLOATS);

    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const offset = i * INSTANCE_FLOATS;
      const featureData = this.featureData[point.index] ?? {
        color: [1, 1, 1, 1],
        intensity: 1.0,
      };
      const timeOffset = timeOffsets[point.index] ?? 0;
      const isPlaying = isPlayingData ? (isPlayingData[point.index] ?? 1.0) : 1.0;
      const localTime = localTimeData ? (localTimeData[point.index] ?? 0.0) : 0.0;

      // Pack instance data
      this.instanceData[offset + 0] = point.mercatorX; // position.x
      this.instanceData[offset + 1] = point.mercatorY; // position.y
      this.instanceData[offset + 2] = point.index; // index
      this.instanceData[offset + 3] = timeOffset; // timeOffset
      this.instanceData[offset + 4] = featureData.color[0]; // color.r
      this.instanceData[offset + 5] = featureData.color[1]; // color.g
      this.instanceData[offset + 6] = featureData.color[2]; // color.b
      this.instanceData[offset + 7] = featureData.color[3]; // color.a
      this.instanceData[offset + 8] = featureData.intensity; // intensity
      this.instanceData[offset + 9] = isPlaying; // isPlaying
      this.instanceData[offset + 10] = localTime; // localTime
    }

    // Update the instance buffer
    const ctx = this.getContext();
    if (ctx) {
      const instanceLayout: InstanceLayout = {
        stride: INSTANCE_STRIDE,
        attributes: [
          { name: 'a_position', location: this.aPosition, size: 2, type: ctx.gl.FLOAT, offset: 0 },
          {
            name: 'a_index',
            location: this.aIndexInstanced,
            size: 1,
            type: ctx.gl.FLOAT,
            offset: 8,
          },
          {
            name: 'a_timeOffset',
            location: this.aTimeOffsetInstanced,
            size: 1,
            type: ctx.gl.FLOAT,
            offset: 12,
          },
          {
            name: 'a_color',
            location: this.aColorInstanced,
            size: 4,
            type: ctx.gl.FLOAT,
            offset: 16,
          },
          {
            name: 'a_intensity',
            location: this.aIntensityInstanced,
            size: 1,
            type: ctx.gl.FLOAT,
            offset: 32,
          },
          {
            name: 'a_isPlaying',
            location: this.aIsPlayingInstanced,
            size: 1,
            type: ctx.gl.FLOAT,
            offset: 36,
          },
          {
            name: 'a_localTime',
            location: this.aLocalTimeInstanced,
            size: 1,
            type: ctx.gl.FLOAT,
            offset: 40,
          },
        ],
      };

      this.instancedRenderer.setInstanceData(this.instanceData, instanceLayout);
      this.instancedRenderer.setupVAO();
    }
  }

  /**
   * Update instance data for interaction state changes
   * Only updates isPlaying and localTime fields for efficiency
   */
  private updateInstanceInteractionData(): void {
    if (!this.instancedRenderer || !this.instanceData || !this.stateManager) return;

    const { isPlayingData, localTimeData } = this.stateManager.generateBufferData(1);

    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const offset = i * INSTANCE_FLOATS;
      this.instanceData[offset + 9] = isPlayingData[point.index] ?? 1.0;
      this.instanceData[offset + 10] = localTimeData[point.index] ?? 0.0;
    }

    // Update just the instance buffer (faster than full rebuild)
    this.instancedRenderer.updateInstanceData(this.instanceData);
  }
}
