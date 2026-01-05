/**
 * Texture Manager
 *
 * Manages WebGL texture loading, caching, and binding.
 *
 * @module textures/TextureManager
 */

/**
 * WebGL constants for Node.js test compatibility
 * These values are standard WebGL constants
 */
const GL = {
  CLAMP_TO_EDGE: 33071,
  LINEAR_MIPMAP_LINEAR: 9987,
  LINEAR: 9729,
  TEXTURE_2D: 3553,
  TEXTURE_WRAP_S: 10242,
  TEXTURE_WRAP_T: 10243,
  TEXTURE_MIN_FILTER: 10241,
  TEXTURE_MAG_FILTER: 10240,
  UNPACK_FLIP_Y_WEBGL: 37440,
  UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
  RGBA: 6408,
  UNSIGNED_BYTE: 5121,
} as const;

/**
 * Texture loading options
 */
export interface TextureOptions {
  /** Texture wrapping mode S (default: CLAMP_TO_EDGE) */
  wrapS?: number;

  /** Texture wrapping mode T (default: CLAMP_TO_EDGE) */
  wrapT?: number;

  /** Minification filter (default: LINEAR_MIPMAP_LINEAR) */
  minFilter?: number;

  /** Magnification filter (default: LINEAR) */
  magFilter?: number;

  /** Whether to generate mipmaps (default: true) */
  generateMipmaps?: boolean;

  /** Flip Y coordinate (default: true for images) */
  flipY?: boolean;

  /** Premultiply alpha (default: false) */
  premultiplyAlpha?: boolean;
}

/**
 * Loaded texture information
 */
export interface TextureInfo {
  /** WebGL texture object */
  texture: WebGLTexture;

  /** Texture width */
  width: number;

  /** Texture height */
  height: number;

  /** Original source URL or identifier */
  source: string;

  /** Whether mipmaps were generated */
  hasMipmaps: boolean;
}

/**
 * Default texture options
 */
const DEFAULT_OPTIONS: Required<TextureOptions> = {
  wrapS: GL.CLAMP_TO_EDGE,
  wrapT: GL.CLAMP_TO_EDGE,
  minFilter: GL.LINEAR_MIPMAP_LINEAR,
  magFilter: GL.LINEAR,
  generateMipmaps: true,
  flipY: true,
  premultiplyAlpha: false,
};

/**
 * Texture manager for WebGL texture operations.
 *
 * @example
 * ```typescript
 * const textureManager = new TextureManager(gl);
 *
 * // Load a texture
 * await textureManager.loadTexture('sprite', '/textures/sprite.png');
 *
 * // Bind texture to unit
 * textureManager.bind('sprite', 0);
 *
 * // In shader: uniform sampler2D u_texture;
 * gl.uniform1i(uniformLocation, 0);
 * ```
 */
export class TextureManager {
  private gl: WebGLRenderingContext;
  private textures: Map<string, TextureInfo> = new Map();
  private loadingPromises: Map<string, Promise<TextureInfo>> = new Map();
  private boundTextures: (string | null)[] = new Array(16).fill(null);

  /**
   * Create a texture manager.
   *
   * @param gl - WebGL rendering context
   */
  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }

  /**
   * Load a texture from a URL.
   *
   * @param name - Texture identifier
   * @param url - Image URL
   * @param options - Texture options
   * @returns Promise resolving to texture info
   *
   * @example
   * ```typescript
   * const texture = await manager.loadTexture('particle', '/textures/particle.png', {
   *   wrapS: gl.REPEAT,
   *   wrapT: gl.REPEAT,
   * });
   * ```
   */
  async loadTexture(
    name: string,
    url: string,
    options: TextureOptions = {}
  ): Promise<TextureInfo> {
    // Check if already loaded
    const existing = this.textures.get(name);
    if (existing) {
      return existing;
    }

    // Check if loading is in progress
    const loading = this.loadingPromises.get(name);
    if (loading) {
      return loading;
    }

    // Start loading
    const promise = this.loadTextureAsync(name, url, options);
    this.loadingPromises.set(name, promise);

    try {
      const info = await promise;
      this.loadingPromises.delete(name);
      return info;
    } catch (error) {
      this.loadingPromises.delete(name);
      throw error;
    }
  }

  /**
   * Internal async texture loading.
   */
  private async loadTextureAsync(
    name: string,
    url: string,
    options: TextureOptions
  ): Promise<TextureInfo> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const gl = this.gl;

    // Load image
    const image = await this.loadImage(url);

    // Create texture
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error(`[TextureManager] Failed to create texture for "${name}"`);
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set pixel store parameters
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, opts.flipY);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, opts.premultiplyAlpha);

    // Upload image data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, opts.wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, opts.wrapT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opts.minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opts.magFilter);

    // Generate mipmaps
    let hasMipmaps = false;
    if (opts.generateMipmaps && this.isPowerOfTwo(image.width) && this.isPowerOfTwo(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      hasMipmaps = true;
    } else if (opts.generateMipmaps) {
      // Non-POT texture, disable mipmapping
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);

    const info: TextureInfo = {
      texture,
      width: image.width,
      height: image.height,
      source: url,
      hasMipmaps,
    };

    this.textures.set(name, info);
    return info;
  }

  /**
   * Load an image from URL.
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load image: ${url}`));

      image.src = url;
    });
  }

  /**
   * Check if a number is a power of two.
   */
  private isPowerOfTwo(value: number): boolean {
    return (value & (value - 1)) === 0 && value !== 0;
  }

  /**
   * Create a texture from raw data.
   *
   * @param name - Texture identifier
   * @param data - Pixel data
   * @param width - Texture width
   * @param height - Texture height
   * @param options - Texture options
   * @returns Texture info
   */
  createFromData(
    name: string,
    data: Uint8Array | Float32Array,
    width: number,
    height: number,
    options: TextureOptions = {}
  ): TextureInfo {
    const opts = { ...DEFAULT_OPTIONS, ...options, flipY: false };
    const gl = this.gl;

    const texture = gl.createTexture();
    if (!texture) {
      throw new Error(`[TextureManager] Failed to create texture for "${name}"`);
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, opts.flipY);

    // Determine format based on data type
    const isFloat = data instanceof Float32Array;
    const format = gl.RGBA;
    const type = isFloat ? gl.FLOAT : gl.UNSIGNED_BYTE;

    // Check float texture support
    if (isFloat && !gl.getExtension('OES_texture_float')) {
      throw new Error('[TextureManager] Float textures not supported');
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, data);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, opts.wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, opts.wrapT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bindTexture(gl.TEXTURE_2D, null);

    const info: TextureInfo = {
      texture,
      width,
      height,
      source: `data:${name}`,
      hasMipmaps: false,
    };

    this.textures.set(name, info);
    return info;
  }

  /**
   * Create a 1x1 solid color texture.
   *
   * @param name - Texture identifier
   * @param color - RGBA color values (0-255)
   * @returns Texture info
   */
  createSolidColor(name: string, color: [number, number, number, number]): TextureInfo {
    return this.createFromData(name, new Uint8Array(color), 1, 1);
  }

  /**
   * Bind a texture to a texture unit.
   *
   * @param name - Texture identifier
   * @param unit - Texture unit (0-15)
   * @returns true if texture was found and bound
   */
  bind(name: string, unit: number = 0): boolean {
    const info = this.textures.get(name);
    if (!info) {
      return false;
    }

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, info.texture);
    this.boundTextures[unit] = name;

    return true;
  }

  /**
   * Unbind a texture unit.
   *
   * @param unit - Texture unit to unbind
   */
  unbind(unit: number = 0): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.boundTextures[unit] = null;
  }

  /**
   * Get texture info by name.
   *
   * @param name - Texture identifier
   * @returns Texture info or undefined
   */
  get(name: string): TextureInfo | undefined {
    return this.textures.get(name);
  }

  /**
   * Check if a texture exists.
   *
   * @param name - Texture identifier
   * @returns true if texture exists
   */
  has(name: string): boolean {
    return this.textures.has(name);
  }

  /**
   * Delete a texture.
   *
   * @param name - Texture identifier
   * @returns true if texture was found and deleted
   */
  delete(name: string): boolean {
    const info = this.textures.get(name);
    if (!info) {
      return false;
    }

    this.gl.deleteTexture(info.texture);
    this.textures.delete(name);

    // Unbind from any units
    for (let i = 0; i < this.boundTextures.length; i++) {
      if (this.boundTextures[i] === name) {
        this.unbind(i);
      }
    }

    return true;
  }

  /**
   * List all loaded texture names.
   *
   * @returns Array of texture names
   */
  list(): string[] {
    return Array.from(this.textures.keys());
  }

  /**
   * Delete all textures.
   */
  clear(): void {
    for (const [_name, info] of this.textures) {
      this.gl.deleteTexture(info.texture);
    }
    this.textures.clear();
    this.boundTextures.fill(null);
  }

  /**
   * Clean up and release all resources.
   */
  dispose(): void {
    this.clear();
  }
}
