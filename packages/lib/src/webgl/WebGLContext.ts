/**
 * WebGL Context Abstraction
 *
 * Provides a unified interface for WebGL 1.0 and WebGL 2.0, with automatic
 * fallback to WebGL 1.0 + extensions when WebGL 2.0 is not available.
 *
 * @module webgl/WebGLContext
 */

/**
 * WebGL rendering context types
 */
export type WebGLContextType = WebGLRenderingContext | WebGL2RenderingContext;

/**
 * WebGL version identifier
 */
export type WebGLVersion = 1 | 2;

/**
 * Unified interface for WebGL operations across versions.
 * Abstracts the differences between WebGL 1.0 and 2.0.
 */
export interface IWebGLContext {
  /** The underlying WebGL rendering context */
  readonly gl: WebGLContextType;

  /** WebGL version (1 or 2) */
  readonly version: WebGLVersion;

  /** Whether instanced rendering is supported */
  readonly supportsInstancing: boolean;

  /** Whether VAOs are supported */
  readonly supportsVAO: boolean;

  /** Whether float textures are supported */
  readonly supportsFloatTextures: boolean;

  /**
   * Create a Vertex Array Object (VAO)
   * @returns VAO or null if not supported
   */
  createVertexArray(): WebGLVertexArrayObject | null;

  /**
   * Bind a Vertex Array Object
   * @param vao - The VAO to bind, or null to unbind
   */
  bindVertexArray(vao: WebGLVertexArrayObject | null): void;

  /**
   * Delete a Vertex Array Object
   * @param vao - The VAO to delete
   */
  deleteVertexArray(vao: WebGLVertexArrayObject | null): void;

  /**
   * Draw arrays with instancing
   * @param mode - Primitive type (gl.TRIANGLES, etc.)
   * @param first - Starting index
   * @param count - Number of vertices per instance
   * @param instanceCount - Number of instances to draw
   */
  drawArraysInstanced(mode: number, first: number, count: number, instanceCount: number): void;

  /**
   * Draw elements with instancing
   * @param mode - Primitive type
   * @param count - Number of indices per instance
   * @param type - Index type (gl.UNSIGNED_SHORT, etc.)
   * @param offset - Byte offset into index buffer
   * @param instanceCount - Number of instances to draw
   */
  drawElementsInstanced(
    mode: number,
    count: number,
    type: number,
    offset: number,
    instanceCount: number
  ): void;

  /**
   * Set the divisor for vertex attribute instancing
   * @param index - Attribute location
   * @param divisor - Divisor value (0 = per vertex, 1 = per instance)
   */
  vertexAttribDivisor(index: number, divisor: number): void;

  /**
   * Create a framebuffer for render-to-texture
   * @returns Framebuffer or null on failure
   */
  createFramebuffer(): WebGLFramebuffer | null;

  /**
   * Check if the context is lost
   * @returns true if context is lost
   */
  isContextLost(): boolean;

  /**
   * Get the maximum texture size
   * @returns Maximum texture dimension in pixels
   */
  getMaxTextureSize(): number;

  /**
   * Get the maximum number of vertex attributes
   * @returns Maximum vertex attributes
   */
  getMaxVertexAttribs(): number;

  /**
   * Get detailed capabilities info
   * @returns Capabilities object
   */
  getCapabilities(): WebGLCapabilities;
}

/**
 * WebGL capabilities information
 */
export interface WebGLCapabilities {
  /** WebGL version */
  version: WebGLVersion;
  /** Max texture size in pixels */
  maxTextureSize: number;
  /** Max vertex attributes */
  maxVertexAttribs: number;
  /** Max vertex uniforms */
  maxVertexUniforms: number;
  /** Max fragment uniforms */
  maxFragmentUniforms: number;
  /** Max texture units */
  maxTextureUnits: number;
  /** Whether instancing is supported */
  supportsInstancing: boolean;
  /** Whether VAOs are supported */
  supportsVAO: boolean;
  /** Whether float textures are supported */
  supportsFloatTextures: boolean;
  /** Whether depth textures are supported */
  supportsDepthTextures: boolean;
  /** Renderer string */
  renderer: string;
  /** Vendor string */
  vendor: string;
}

/**
 * ANGLE_instanced_arrays extension interface
 */
interface ANGLEInstancedArrays {
  drawArraysInstancedANGLE(mode: number, first: number, count: number, primcount: number): void;
  drawElementsInstancedANGLE(
    mode: number,
    count: number,
    type: number,
    offset: number,
    primcount: number
  ): void;
  vertexAttribDivisorANGLE(index: number, divisor: number): void;
  readonly VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE: number;
}

/**
 * OES_vertex_array_object extension interface
 */
interface OESVertexArrayObject {
  createVertexArrayOES(): WebGLVertexArrayObject | null;
  deleteVertexArrayOES(arrayObject: WebGLVertexArrayObject | null): void;
  isVertexArrayOES(arrayObject: WebGLVertexArrayObject | null): boolean;
  bindVertexArrayOES(arrayObject: WebGLVertexArrayObject | null): void;
  readonly VERTEX_ARRAY_BINDING_OES: number;
}

/**
 * WebGL Context wrapper that provides a unified API for WebGL 1.0 and 2.0.
 *
 * @example
 * ```typescript
 * // Create context from existing WebGL context
 * const ctx = new WebGLContext(gl);
 *
 * // Use unified API
 * const vao = ctx.createVertexArray();
 * ctx.bindVertexArray(vao);
 *
 * // Draw with instancing (works on both WebGL 1 and 2)
 * if (ctx.supportsInstancing) {
 *   ctx.drawArraysInstanced(ctx.gl.TRIANGLES, 0, 6, instanceCount);
 * }
 * ```
 */
export class WebGLContext implements IWebGLContext {
  /** The underlying WebGL rendering context */
  public readonly gl: WebGLContextType;

  /** WebGL version (1 or 2) */
  public readonly version: WebGLVersion;

  /** Whether instanced rendering is supported */
  public readonly supportsInstancing: boolean;

  /** Whether VAOs are supported */
  public readonly supportsVAO: boolean;

  /** Whether float textures are supported */
  public readonly supportsFloatTextures: boolean;

  /** Extension for instanced arrays (WebGL 1 only) */
  private instancedArraysExt: ANGLEInstancedArrays | null = null;

  /** Extension for VAOs (WebGL 1 only) */
  private vaoExt: OESVertexArrayObject | null = null;

  /** Cached capabilities */
  private capabilities: WebGLCapabilities | null = null;

  /**
   * Create a WebGLContext wrapper.
   *
   * @param gl - The WebGL rendering context to wrap
   * @throws Error if gl is null or invalid
   *
   * @example
   * ```typescript
   * const canvas = document.createElement('canvas');
   * const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
   * const ctx = new WebGLContext(gl);
   * console.log(`Using WebGL ${ctx.version}`);
   * ```
   */
  constructor(gl: WebGLContextType) {
    if (!gl) {
      throw new Error('[WebGLContext] WebGL context is null or undefined');
    }

    this.gl = gl;
    this.version = this.detectVersion();

    // Initialize extensions for WebGL 1
    if (this.version === 1) {
      this.instancedArraysExt = gl.getExtension(
        'ANGLE_instanced_arrays'
      ) as ANGLEInstancedArrays | null;
      this.vaoExt = gl.getExtension('OES_vertex_array_object') as OESVertexArrayObject | null;
    }

    // Set capability flags
    this.supportsInstancing = this.version === 2 || this.instancedArraysExt !== null;
    this.supportsVAO = this.version === 2 || this.vaoExt !== null;
    this.supportsFloatTextures = !!gl.getExtension('OES_texture_float');
  }

  /**
   * Detect the WebGL version from the context.
   * @returns 1 for WebGL 1.0, 2 for WebGL 2.0
   */
  private detectVersion(): WebGLVersion {
    // Check if it's WebGL 2 by looking for WebGL2-specific method
    if ('createVertexArray' in this.gl && typeof this.gl.createVertexArray === 'function') {
      return 2;
    }
    return 1;
  }

  /**
   * Create a Vertex Array Object (VAO).
   *
   * @returns VAO or null if VAOs are not supported
   *
   * @example
   * ```typescript
   * const vao = ctx.createVertexArray();
   * if (vao) {
   *   ctx.bindVertexArray(vao);
   *   // Setup vertex attributes...
   *   ctx.bindVertexArray(null);
   * }
   * ```
   */
  createVertexArray(): WebGLVertexArrayObject | null {
    if (this.version === 2) {
      return (this.gl as WebGL2RenderingContext).createVertexArray();
    }
    if (this.vaoExt) {
      return this.vaoExt.createVertexArrayOES();
    }
    return null;
  }

  /**
   * Bind a Vertex Array Object.
   *
   * @param vao - The VAO to bind, or null to unbind
   */
  bindVertexArray(vao: WebGLVertexArrayObject | null): void {
    if (this.version === 2) {
      (this.gl as WebGL2RenderingContext).bindVertexArray(vao);
    } else if (this.vaoExt) {
      this.vaoExt.bindVertexArrayOES(vao);
    }
  }

  /**
   * Delete a Vertex Array Object.
   *
   * @param vao - The VAO to delete
   */
  deleteVertexArray(vao: WebGLVertexArrayObject | null): void {
    if (!vao) return;

    if (this.version === 2) {
      (this.gl as WebGL2RenderingContext).deleteVertexArray(vao);
    } else if (this.vaoExt) {
      this.vaoExt.deleteVertexArrayOES(vao);
    }
  }

  /**
   * Draw arrays with instancing.
   *
   * @param mode - Primitive type (gl.TRIANGLES, gl.LINES, etc.)
   * @param first - Starting vertex index
   * @param count - Number of vertices per instance
   * @param instanceCount - Number of instances to draw
   * @throws Error if instancing is not supported
   *
   * @example
   * ```typescript
   * // Draw 1000 triangles (6 vertices each)
   * ctx.drawArraysInstanced(gl.TRIANGLES, 0, 6, 1000);
   * ```
   */
  drawArraysInstanced(mode: number, first: number, count: number, instanceCount: number): void {
    if (this.version === 2) {
      (this.gl as WebGL2RenderingContext).drawArraysInstanced(mode, first, count, instanceCount);
    } else if (this.instancedArraysExt) {
      this.instancedArraysExt.drawArraysInstancedANGLE(mode, first, count, instanceCount);
    } else {
      throw new Error('[WebGLContext] Instanced rendering is not supported');
    }
  }

  /**
   * Draw elements with instancing.
   *
   * @param mode - Primitive type
   * @param count - Number of indices per instance
   * @param type - Index type (gl.UNSIGNED_SHORT, gl.UNSIGNED_INT)
   * @param offset - Byte offset into index buffer
   * @param instanceCount - Number of instances to draw
   * @throws Error if instancing is not supported
   */
  drawElementsInstanced(
    mode: number,
    count: number,
    type: number,
    offset: number,
    instanceCount: number
  ): void {
    if (this.version === 2) {
      (this.gl as WebGL2RenderingContext).drawElementsInstanced(
        mode,
        count,
        type,
        offset,
        instanceCount
      );
    } else if (this.instancedArraysExt) {
      this.instancedArraysExt.drawElementsInstancedANGLE(mode, count, type, offset, instanceCount);
    } else {
      throw new Error('[WebGLContext] Instanced rendering is not supported');
    }
  }

  /**
   * Set the divisor for vertex attribute instancing.
   *
   * @param index - Attribute location
   * @param divisor - Divisor value (0 = per vertex, 1 = per instance, n = per n instances)
   * @throws Error if instancing is not supported
   *
   * @example
   * ```typescript
   * // Attribute 0 is per-vertex (divisor 0)
   * ctx.vertexAttribDivisor(0, 0);
   * // Attribute 1 is per-instance (divisor 1)
   * ctx.vertexAttribDivisor(1, 1);
   * ```
   */
  vertexAttribDivisor(index: number, divisor: number): void {
    if (this.version === 2) {
      (this.gl as WebGL2RenderingContext).vertexAttribDivisor(index, divisor);
    } else if (this.instancedArraysExt) {
      this.instancedArraysExt.vertexAttribDivisorANGLE(index, divisor);
    } else {
      throw new Error('[WebGLContext] Instanced rendering is not supported');
    }
  }

  /**
   * Create a framebuffer for render-to-texture operations.
   *
   * @returns Framebuffer or null on failure
   */
  createFramebuffer(): WebGLFramebuffer | null {
    return this.gl.createFramebuffer();
  }

  /**
   * Check if the WebGL context has been lost.
   *
   * @returns true if the context is lost
   */
  isContextLost(): boolean {
    return this.gl.isContextLost();
  }

  /**
   * Get the maximum texture size supported.
   *
   * @returns Maximum texture dimension in pixels
   */
  getMaxTextureSize(): number {
    return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) as number;
  }

  /**
   * Get the maximum number of vertex attributes.
   *
   * @returns Maximum vertex attributes
   */
  getMaxVertexAttribs(): number {
    return this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS) as number;
  }

  /**
   * Get detailed capabilities information.
   *
   * @returns Capabilities object with all WebGL limits and features
   *
   * @example
   * ```typescript
   * const caps = ctx.getCapabilities();
   * console.log(`Max texture size: ${caps.maxTextureSize}`);
   * console.log(`Instancing supported: ${caps.supportsInstancing}`);
   * ```
   */
  getCapabilities(): WebGLCapabilities {
    if (this.capabilities) {
      return this.capabilities;
    }

    const gl = this.gl;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

    this.capabilities = {
      version: this.version,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number,
      maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) as number,
      maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) as number,
      maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number,
      supportsInstancing: this.supportsInstancing,
      supportsVAO: this.supportsVAO,
      supportsFloatTextures: this.supportsFloatTextures,
      supportsDepthTextures: !!gl.getExtension('WEBGL_depth_texture'),
      renderer: debugInfo
        ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string)
        : 'Unknown',
      vendor: debugInfo ? (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string) : 'Unknown',
    };

    return this.capabilities;
  }
}

/**
 * Create a WebGLContext from a canvas element.
 *
 * Attempts WebGL 2.0 first, falls back to WebGL 1.0.
 *
 * @param canvas - The canvas element to get context from
 * @param options - WebGL context attributes
 * @returns WebGLContext wrapper or null if WebGL is not supported
 *
 * @example
 * ```typescript
 * const canvas = document.getElementById('canvas') as HTMLCanvasElement;
 * const ctx = createWebGLContext(canvas);
 * if (ctx) {
 *   console.log(`Using WebGL ${ctx.version}`);
 * }
 * ```
 */
export function createWebGLContext(
  canvas: HTMLCanvasElement,
  options?: WebGLContextAttributes
): WebGLContext | null {
  // Try WebGL 2 first
  let gl: WebGLContextType | null = canvas.getContext('webgl2', options) as WebGL2RenderingContext | null;

  // Fall back to WebGL 1
  if (!gl) {
    gl = canvas.getContext('webgl', options) as WebGLRenderingContext | null;
  }

  // Try experimental-webgl as last resort
  if (!gl) {
    gl = canvas.getContext('experimental-webgl', options) as WebGLRenderingContext | null;
  }

  if (!gl) {
    return null;
  }

  return new WebGLContext(gl);
}

/**
 * Wrap an existing WebGL context.
 *
 * @param gl - The WebGL context to wrap
 * @returns WebGLContext wrapper
 *
 * @example
 * ```typescript
 * // In a MapLibre custom layer's onAdd:
 * onAdd(map: Map, gl: WebGLRenderingContext) {
 *   const ctx = wrapWebGLContext(gl);
 *   // Use unified API
 * }
 * ```
 */
export function wrapWebGLContext(gl: WebGLContextType): WebGLContext {
  return new WebGLContext(gl);
}
