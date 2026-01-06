/**
 * Instanced Renderer
 *
 * Provides efficient instanced rendering for repeated geometry.
 * Automatically handles WebGL 1/2 differences via the WebGLContext wrapper.
 *
 * @module webgl/InstancedRenderer
 */

import type { IWebGLContext } from './WebGLContext';

/**
 * WebGL constants for Node.js test compatibility
 */
const GL = {
  FLOAT: 5126,
  STATIC_DRAW: 35044,
  DYNAMIC_DRAW: 35048,
  TRIANGLES: 4,
  LINES: 1,
} as const;

/**
 * Per-instance attribute configuration
 */
export interface InstanceAttribute {
  /** Attribute name in shader */
  name: string;

  /** Attribute location (from getAttribLocation) */
  location: number;

  /** Number of components (1-4) */
  size: number;

  /** Data type (gl.FLOAT, etc.) */
  type: number;

  /** Whether to normalize integer data */
  normalized?: boolean;

  /** Byte offset in instance data */
  offset: number;
}

/**
 * Instance buffer layout configuration
 */
export interface InstanceLayout {
  /** Stride in bytes between instances */
  stride: number;

  /** Attributes in this layout */
  attributes: InstanceAttribute[];
}

/**
 * Instanced renderer for efficient batch rendering.
 *
 * @example
 * ```typescript
 * const renderer = new InstancedRenderer(ctx);
 *
 * // Setup geometry (quad for each instance)
 * renderer.setGeometry(quadVertices, 6);
 *
 * // Setup per-instance data
 * const instanceData = new Float32Array([
 *   // instance 0: x, y, scale, rotation
 *   0.0, 0.0, 1.0, 0.0,
 *   // instance 1
 *   1.0, 0.0, 0.5, Math.PI/4,
 *   // ...
 * ]);
 *
 * renderer.setInstanceData(instanceData, {
 *   stride: 16, // 4 floats * 4 bytes
 *   attributes: [
 *     { name: 'a_offset', location: 1, size: 2, type: gl.FLOAT, offset: 0 },
 *     { name: 'a_scale', location: 2, size: 1, type: gl.FLOAT, offset: 8 },
 *     { name: 'a_rotation', location: 3, size: 1, type: gl.FLOAT, offset: 12 },
 *   ],
 * });
 *
 * // Draw all instances
 * renderer.draw(1000);
 * ```
 */
export class InstancedRenderer {
  private ctx: IWebGLContext;
  private geometryBuffer: WebGLBuffer | null = null;
  private instanceBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;

  private verticesPerInstance: number = 0;
  private instanceCount: number = 0;
  private useIndices: boolean = false;
  private indexCount: number = 0;
  private indexType: number;

  private geometryLayout: InstanceAttribute[] = [];
  private instanceLayout: InstanceLayout | null = null;
  private geometryStride: number = 0;

  /**
   * Create an instanced renderer.
   *
   * @param ctx - WebGL context wrapper
   * @throws Error if instancing is not supported
   */
  constructor(ctx: IWebGLContext) {
    if (!ctx.supportsInstancing) {
      throw new Error('[InstancedRenderer] Instancing is not supported on this device');
    }

    this.ctx = ctx;
    this.indexType = ctx.gl.UNSIGNED_SHORT;

    // Create buffers
    this.geometryBuffer = ctx.gl.createBuffer();
    this.instanceBuffer = ctx.gl.createBuffer();
    this.indexBuffer = ctx.gl.createBuffer();

    // Create VAO if supported
    if (ctx.supportsVAO) {
      this.vao = ctx.createVertexArray();
    }
  }

  /**
   * Check if instancing is supported.
   *
   * @param ctx - WebGL context wrapper
   * @returns true if instancing is available
   */
  static isSupported(ctx: IWebGLContext): boolean {
    return ctx.supportsInstancing;
  }

  /**
   * Set the geometry data (vertices shared by all instances).
   *
   * @param data - Vertex data
   * @param verticesPerInstance - Number of vertices per instance
   * @param layout - Attribute layout for geometry
   * @param stride - Byte stride between vertices
   */
  setGeometry(
    data: Float32Array,
    verticesPerInstance: number,
    layout: InstanceAttribute[],
    stride: number
  ): void {
    const gl = this.ctx.gl;

    this.verticesPerInstance = verticesPerInstance;
    this.geometryLayout = layout;
    this.geometryStride = stride;
    this.useIndices = false;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.geometryBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  }

  /**
   * Set indexed geometry data.
   *
   * @param vertices - Vertex data
   * @param indices - Index data
   * @param layout - Attribute layout for geometry
   * @param stride - Byte stride between vertices
   */
  setIndexedGeometry(
    vertices: Float32Array,
    indices: Uint16Array | Uint32Array,
    layout: InstanceAttribute[],
    stride: number
  ): void {
    const gl = this.ctx.gl;

    this.geometryLayout = layout;
    this.geometryStride = stride;
    this.useIndices = true;
    this.indexCount = indices.length;

    // Determine index type
    if (indices instanceof Uint32Array) {
      this.indexType = gl.UNSIGNED_INT;
    } else {
      this.indexType = gl.UNSIGNED_SHORT;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.geometryBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }

  /**
   * Set per-instance data.
   *
   * @param data - Instance data (positions, colors, etc.)
   * @param layout - Attribute layout for instance data
   * @param usage - Buffer usage hint (default: DYNAMIC_DRAW)
   */
  setInstanceData(
    data: Float32Array,
    layout: InstanceLayout,
    usage: number = GL.DYNAMIC_DRAW
  ): void {
    const gl = this.ctx.gl;

    this.instanceLayout = layout;
    this.instanceCount = Math.floor(data.byteLength / layout.stride);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  }

  /**
   * Update a portion of the instance data.
   *
   * @param data - New data
   * @param byteOffset - Offset in bytes from start of buffer
   */
  updateInstanceData(data: Float32Array, byteOffset: number = 0): void {
    const gl = this.ctx.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, byteOffset, data);
  }

  /**
   * Setup VAO with current geometry and instance layouts.
   * Call this after setting geometry and instance data.
   */
  setupVAO(): void {
    const gl = this.ctx.gl;

    if (this.vao) {
      this.ctx.bindVertexArray(this.vao);
    }

    // Setup geometry attributes (divisor = 0, per-vertex)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.geometryBuffer);
    for (const attr of this.geometryLayout) {
      gl.enableVertexAttribArray(attr.location);
      gl.vertexAttribPointer(
        attr.location,
        attr.size,
        attr.type,
        attr.normalized ?? false,
        this.geometryStride,
        attr.offset
      );
      this.ctx.vertexAttribDivisor(attr.location, 0);
    }

    // Setup instance attributes (divisor = 1, per-instance)
    if (this.instanceLayout) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
      for (const attr of this.instanceLayout.attributes) {
        gl.enableVertexAttribArray(attr.location);
        gl.vertexAttribPointer(
          attr.location,
          attr.size,
          attr.type,
          attr.normalized ?? false,
          this.instanceLayout.stride,
          attr.offset
        );
        this.ctx.vertexAttribDivisor(attr.location, 1);
      }
    }

    // Bind index buffer if using indices
    if (this.useIndices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    }

    if (this.vao) {
      this.ctx.bindVertexArray(null);
    }
  }

  /**
   * Draw all instances.
   *
   * @param instanceCount - Number of instances to draw (default: all)
   * @param mode - Primitive mode (default: TRIANGLES)
   */
  draw(instanceCount?: number, mode?: number): void {
    const gl = this.ctx.gl;
    const count = instanceCount ?? this.instanceCount;
    const drawMode = mode ?? gl.TRIANGLES;

    if (count === 0) return;

    if (this.vao) {
      this.ctx.bindVertexArray(this.vao);
    } else {
      // Manual attribute setup if no VAO
      this.setupAttributes();
    }

    if (this.useIndices) {
      this.ctx.drawElementsInstanced(drawMode, this.indexCount, this.indexType, 0, count);
    } else {
      this.ctx.drawArraysInstanced(drawMode, 0, this.verticesPerInstance, count);
    }

    if (this.vao) {
      this.ctx.bindVertexArray(null);
    }
  }

  /**
   * Draw a range of instances.
   *
   * This method allows drawing a subset of instances starting from a specific index.
   *
   * **Limitations:**
   * - WebGL does not support `gl_BaseInstance`, so this method works by adjusting
   *   vertex attribute pointers to offset into the instance buffer.
   * - This requires rebinding and reconfiguring attributes on every call, which
   *   may impact performance when called frequently with different ranges.
   * - For best performance with static ranges, consider using multiple separate
   *   instance buffers instead of drawRange.
   * - The instance data must be tightly packed (no padding between instances)
   *   for the offset calculation to work correctly.
   * - VAO state is temporarily modified during this call.
   *
   * @param startInstance - First instance to draw (0-based index)
   * @param count - Number of instances to draw
   * @param mode - Primitive mode (default: TRIANGLES)
   *
   * @example
   * ```typescript
   * // Draw instances 100-199 (100 instances starting at index 100)
   * renderer.drawRange(100, 100);
   *
   * // For better performance with fixed ranges, consider separate buffers:
   * // renderer1.setInstanceData(dataSlice1, layout);
   * // renderer2.setInstanceData(dataSlice2, layout);
   * ```
   */
  drawRange(startInstance: number, count: number, mode?: number): void {
    // Note: WebGL doesn't support gl_BaseInstance, so we need to offset the buffer
    const gl = this.ctx.gl;
    const drawMode = mode ?? gl.TRIANGLES;

    if (count === 0 || !this.instanceLayout) return;

    if (this.vao) {
      this.ctx.bindVertexArray(this.vao);
    }

    // Rebind instance buffer with offset
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const byteOffset = startInstance * this.instanceLayout.stride;

    for (const attr of this.instanceLayout.attributes) {
      gl.vertexAttribPointer(
        attr.location,
        attr.size,
        attr.type,
        attr.normalized ?? false,
        this.instanceLayout.stride,
        attr.offset + byteOffset
      );
    }

    if (this.useIndices) {
      this.ctx.drawElementsInstanced(drawMode, this.indexCount, this.indexType, 0, count);
    } else {
      this.ctx.drawArraysInstanced(drawMode, 0, this.verticesPerInstance, count);
    }

    if (this.vao) {
      this.ctx.bindVertexArray(null);
    }
  }

  /**
   * Setup attributes manually (when VAO not available).
   */
  private setupAttributes(): void {
    const gl = this.ctx.gl;

    // Geometry attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.geometryBuffer);
    for (const attr of this.geometryLayout) {
      gl.enableVertexAttribArray(attr.location);
      gl.vertexAttribPointer(
        attr.location,
        attr.size,
        attr.type,
        attr.normalized ?? false,
        this.geometryStride,
        attr.offset
      );
      this.ctx.vertexAttribDivisor(attr.location, 0);
    }

    // Instance attributes
    if (this.instanceLayout) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
      for (const attr of this.instanceLayout.attributes) {
        gl.enableVertexAttribArray(attr.location);
        gl.vertexAttribPointer(
          attr.location,
          attr.size,
          attr.type,
          attr.normalized ?? false,
          this.instanceLayout.stride,
          attr.offset
        );
        this.ctx.vertexAttribDivisor(attr.location, 1);
      }
    }

    if (this.useIndices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    }
  }

  /**
   * Get the current instance count.
   *
   * @returns Number of instances
   */
  getInstanceCount(): number {
    return this.instanceCount;
  }

  /**
   * Get the vertices per instance.
   *
   * @returns Vertices per instance
   */
  getVerticesPerInstance(): number {
    return this.useIndices ? this.indexCount : this.verticesPerInstance;
  }

  /**
   * Clean up all WebGL resources.
   */
  dispose(): void {
    const gl = this.ctx.gl;

    if (this.vao) {
      this.ctx.deleteVertexArray(this.vao);
      this.vao = null;
    }

    if (this.geometryBuffer) {
      gl.deleteBuffer(this.geometryBuffer);
      this.geometryBuffer = null;
    }

    if (this.instanceBuffer) {
      gl.deleteBuffer(this.instanceBuffer);
      this.instanceBuffer = null;
    }

    if (this.indexBuffer) {
      gl.deleteBuffer(this.indexBuffer);
      this.indexBuffer = null;
    }
  }
}

/**
 * Create a unit quad geometry for instanced point rendering.
 *
 * @returns Vertex data and layout for a quad centered at origin
 *
 * @example
 * ```typescript
 * const { vertices, indices, layout, stride } = createQuadGeometry();
 * renderer.setIndexedGeometry(vertices, indices, layout, stride);
 * ```
 */
export function createQuadGeometry(): {
  vertices: Float32Array;
  indices: Uint16Array;
  layout: InstanceAttribute[];
  stride: number;
} {
  // Quad vertices: position (2) + uv (2)
  const vertices = new Float32Array([
    // x, y, u, v
    -0.5, -0.5, 0, 0, 0.5, -0.5, 1, 0, 0.5, 0.5, 1, 1, -0.5, 0.5, 0, 1,
  ]);

  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  const layout: InstanceAttribute[] = [
    {
      name: 'a_vertex',
      location: 0,
      size: 2,
      type: GL.FLOAT,
      offset: 0,
    },
    {
      name: 'a_uv',
      location: 1,
      size: 2,
      type: GL.FLOAT,
      offset: 8,
    },
  ];

  return {
    vertices,
    indices,
    layout,
    stride: 16, // 4 floats * 4 bytes
  };
}

/**
 * Create a line segment geometry for instanced line rendering.
 *
 * @returns Vertex data and layout for a line segment
 */
export function createLineGeometry(): {
  vertices: Float32Array;
  layout: InstanceAttribute[];
  stride: number;
  vertexCount: number;
} {
  // Line vertices: position along line (0-1)
  const vertices = new Float32Array([
    0.0, // start
    1.0, // end
  ]);

  const layout: InstanceAttribute[] = [
    {
      name: 'a_position',
      location: 0,
      size: 1,
      type: GL.FLOAT,
      offset: 0,
    },
  ];

  return {
    vertices,
    layout,
    stride: 4, // 1 float * 4 bytes
    vertexCount: 2,
  };
}
