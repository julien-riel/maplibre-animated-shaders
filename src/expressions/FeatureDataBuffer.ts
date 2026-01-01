/**
 * FeatureDataBuffer - Manages per-feature GPU attribute buffers
 *
 * This module handles the creation and management of WebGL attribute buffers
 * for data-driven shader properties. It efficiently converts expression-evaluated
 * values into GPU-ready attribute data.
 *
 * @example
 * ```typescript
 * const buffer = new FeatureDataBuffer(gl);
 *
 * // Register attributes that will be data-driven
 * buffer.registerAttribute('a_speed', 1, 'float');
 * buffer.registerAttribute('a_color', 4, 'float');
 *
 * // Update values from expression evaluation
 * buffer.setAttributeData('a_speed', speedValues);
 * buffer.setAttributeData('a_color', colorValues);
 *
 * // Bind for rendering
 * buffer.bind('a_speed', attributeLocation);
 * ```
 */

/**
 * Attribute type for WebGL
 */
export type AttributeType = 'float' | 'vec2' | 'vec3' | 'vec4';

/**
 * Registered attribute metadata
 */
interface AttributeInfo {
  name: string;
  components: number;
  type: AttributeType;
  buffer: WebGLBuffer | null;
  data: Float32Array | null;
  dirty: boolean;
}

/**
 * Manages per-feature attribute buffers for data-driven shader properties
 */
export class FeatureDataBuffer {
  private gl: WebGLRenderingContext | null = null;
  private attributes: Map<string, AttributeInfo> = new Map();
  private featureCount: number = 0;

  /**
   * Initialize the buffer manager with a WebGL context
   */
  initialize(gl: WebGLRenderingContext): void {
    this.gl = gl;
  }

  /**
   * Set the expected feature count
   * This is used to allocate buffers of the correct size
   */
  setFeatureCount(count: number): void {
    if (count !== this.featureCount) {
      this.featureCount = count;
      // Mark all attributes as dirty since feature count changed
      for (const attr of this.attributes.values()) {
        attr.dirty = true;
      }
    }
  }

  /**
   * Register an attribute for data-driven values
   *
   * @param name - Attribute name (e.g., 'a_speed')
   * @param components - Number of components (1 for float, 4 for vec4)
   * @param type - Attribute type
   */
  registerAttribute(
    name: string,
    components: number,
    type: AttributeType = 'float'
  ): void {
    if (this.attributes.has(name)) {
      return; // Already registered
    }

    this.attributes.set(name, {
      name,
      components,
      type,
      buffer: null,
      data: null,
      dirty: true,
    });
  }

  /**
   * Check if an attribute is registered
   */
  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  /**
   * Set attribute data from a Float32Array
   *
   * For quad-based rendering (points), the data will be expanded
   * so each vertex of the quad gets the same value.
   *
   * @param name - Attribute name
   * @param data - Data array (one value per feature for scalar, N*components for vectors)
   * @param expandForQuads - Whether to expand data for quad vertices (4x)
   */
  setAttributeData(
    name: string,
    data: Float32Array,
    expandForQuads: boolean = false
  ): void {
    const attr = this.attributes.get(name);
    if (!attr) {
      console.warn(`[FeatureDataBuffer] Attribute "${name}" not registered`);
      return;
    }

    if (expandForQuads) {
      // Expand data so each quad vertex gets the same value
      // Input: [v0, v1, v2, ...] (per feature)
      // Output: [v0, v0, v0, v0, v1, v1, v1, v1, ...] (per vertex)
      const components = attr.components;
      const featureCount = data.length / components;
      const expandedData = new Float32Array(featureCount * 4 * components);

      for (let i = 0; i < featureCount; i++) {
        const srcOffset = i * components;
        const dstOffset = i * 4 * components;

        // Copy to all 4 quad vertices
        for (let v = 0; v < 4; v++) {
          for (let c = 0; c < components; c++) {
            expandedData[dstOffset + v * components + c] = data[srcOffset + c];
          }
        }
      }

      attr.data = expandedData;
    } else {
      attr.data = data;
    }

    attr.dirty = true;
  }

  /**
   * Set attribute data from an array of numbers
   *
   * @param name - Attribute name
   * @param data - Array of numbers
   * @param expandForQuads - Whether to expand data for quad vertices
   */
  setAttributeDataFromArray(
    name: string,
    data: number[],
    expandForQuads: boolean = false
  ): void {
    this.setAttributeData(name, new Float32Array(data), expandForQuads);
  }

  /**
   * Upload dirty buffers to GPU
   */
  uploadDirtyBuffers(): void {
    if (!this.gl) return;

    for (const attr of this.attributes.values()) {
      if (attr.dirty && attr.data) {
        this.uploadBuffer(attr);
        attr.dirty = false;
      }
    }
  }

  /**
   * Upload a single attribute buffer to GPU
   */
  private uploadBuffer(attr: AttributeInfo): void {
    if (!this.gl || !attr.data) return;

    // Create buffer if needed
    if (!attr.buffer) {
      attr.buffer = this.gl.createBuffer();
    }

    // Upload data
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attr.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, attr.data, this.gl.DYNAMIC_DRAW);
  }

  /**
   * Bind an attribute for rendering
   *
   * @param name - Attribute name
   * @param location - Attribute location from shader program
   * @param stride - Vertex stride in bytes (0 for tightly packed)
   * @param offset - Offset in bytes from start of vertex
   */
  bind(
    name: string,
    location: number,
    stride: number = 0,
    offset: number = 0
  ): boolean {
    if (!this.gl || location < 0) return false;

    const attr = this.attributes.get(name);
    if (!attr || !attr.buffer) return false;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attr.buffer);
    this.gl.enableVertexAttribArray(location);
    this.gl.vertexAttribPointer(
      location,
      attr.components,
      this.gl.FLOAT,
      false,
      stride,
      offset
    );

    return true;
  }

  /**
   * Unbind an attribute (disable the vertex attribute array)
   */
  unbind(location: number): void {
    if (!this.gl || location < 0) return;
    this.gl.disableVertexAttribArray(location);
  }

  /**
   * Get attribute data
   */
  getAttributeData(name: string): Float32Array | null {
    return this.attributes.get(name)?.data ?? null;
  }

  /**
   * Get attribute buffer
   */
  getBuffer(name: string): WebGLBuffer | null {
    return this.attributes.get(name)?.buffer ?? null;
  }

  /**
   * Clear all data and buffers
   */
  clear(): void {
    if (this.gl) {
      for (const attr of this.attributes.values()) {
        if (attr.buffer) {
          this.gl.deleteBuffer(attr.buffer);
        }
      }
    }

    this.attributes.clear();
    this.featureCount = 0;
  }

  /**
   * Dispose of all GPU resources
   */
  dispose(): void {
    this.clear();
    this.gl = null;
  }

  /**
   * Get info about all registered attributes
   */
  getAttributeInfo(): Array<{
    name: string;
    components: number;
    type: AttributeType;
    hasData: boolean;
    dataLength: number;
  }> {
    return Array.from(this.attributes.values()).map((attr) => ({
      name: attr.name,
      components: attr.components,
      type: attr.type,
      hasData: attr.data !== null,
      dataLength: attr.data?.length ?? 0,
    }));
  }
}

/**
 * Create a standard set of data-driven attributes for shader layers
 *
 * @param buffer - FeatureDataBuffer instance
 */
export function registerStandardAttributes(buffer: FeatureDataBuffer): void {
  // Numeric attributes (1 component)
  buffer.registerAttribute('a_speed', 1, 'float');
  buffer.registerAttribute('a_intensity', 1, 'float');
  buffer.registerAttribute('a_opacity', 1, 'float');
  buffer.registerAttribute('a_size', 1, 'float');
  buffer.registerAttribute('a_radius', 1, 'float');
  buffer.registerAttribute('a_thickness', 1, 'float');

  // Color attribute (4 components - RGBA)
  buffer.registerAttribute('a_color', 4, 'vec4');
}

/**
 * Helper to interleave multiple attribute arrays into a single buffer
 *
 * @param attributes - Map of attribute name to data
 * @param featureCount - Number of features
 * @param verticesPerFeature - Vertices per feature (4 for quads)
 * @returns Interleaved Float32Array
 */
export function interleaveAttributes(
  attributes: Map<string, { data: Float32Array; components: number }>,
  featureCount: number,
  verticesPerFeature: number = 1
): Float32Array {
  // Calculate total components per vertex
  let totalComponents = 0;
  for (const attr of attributes.values()) {
    totalComponents += attr.components;
  }

  const totalVertices = featureCount * verticesPerFeature;
  const result = new Float32Array(totalVertices * totalComponents);

  // Interleave data
  for (let v = 0; v < totalVertices; v++) {
    const featureIndex = Math.floor(v / verticesPerFeature);
    let offset = v * totalComponents;

    for (const attr of attributes.values()) {
      const srcOffset = featureIndex * attr.components;
      for (let c = 0; c < attr.components; c++) {
        result[offset++] = attr.data[srcOffset + c];
      }
    }
  }

  return result;
}
