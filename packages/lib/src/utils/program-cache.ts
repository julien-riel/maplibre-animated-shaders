/**
 * WebGL Shader Program Cache
 * Caches compiled shader programs to avoid redundant compilation.
 * Programs are keyed by a hash of their vertex and fragment shader sources.
 */

import { WEBGL_LOG_PREFIX } from '../constants';

// ============================================
// Types
// ============================================

interface CacheEntry {
  program: WebGLProgram;
  refCount: number;
  vertexShader: WebGLShader;
  fragmentShader: WebGLShader;
  hash: string;
}

interface ProgramCacheOptions {
  /** Enable debug logging */
  debug?: boolean;
}

// ============================================
// Hash Function
// ============================================

/**
 * Simple hash function for shader source code.
 * Uses djb2 algorithm for fast, collision-resistant hashing.
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Create a cache key from vertex and fragment shader sources.
 */
function createCacheKey(vertexSource: string, fragmentSource: string): string {
  return `${hashString(vertexSource)}_${hashString(fragmentSource)}`;
}

// ============================================
// ProgramCache Class
// ============================================

/**
 * Cache for WebGL shader programs.
 *
 * Features:
 * - Reference counting for shared programs
 * - Automatic cleanup when reference count reaches zero
 * - Hash-based deduplication of identical shader combinations
 *
 * @example
 * ```typescript
 * const cache = new ProgramCache({ debug: true });
 *
 * // Get or create a program
 * const program = cache.getOrCreate(gl, vertexSrc, fragmentSrc);
 *
 * // When done with a program
 * cache.release(vertexSrc, fragmentSrc, gl);
 *
 * // Clean up all programs
 * cache.clear(gl);
 * ```
 */
export class ProgramCache {
  private cache: Map<string, CacheEntry> = new Map();
  private layerToHash: Map<string, string> = new Map();
  private debug: boolean;

  constructor(options: ProgramCacheOptions = {}) {
    this.debug = options.debug ?? false;
  }

  /**
   * Get an existing program or create a new one.
   * Increments the reference count if the program already exists.
   *
   * @param gl - The WebGL rendering context
   * @param vertexSource - The vertex shader source code
   * @param fragmentSource - The fragment shader source code
   * @param layerId - Optional layer ID for tracking (used in logging)
   * @returns The compiled WebGL program
   * @throws Error if shader compilation or linking fails
   */
  getOrCreate(
    gl: WebGLRenderingContext,
    vertexSource: string,
    fragmentSource: string,
    layerId?: string
  ): WebGLProgram {
    const hash = createCacheKey(vertexSource, fragmentSource);

    // Check if we already have this program cached
    const existing = this.cache.get(hash);
    if (existing) {
      existing.refCount++;
      if (layerId) {
        this.layerToHash.set(layerId, hash);
      }
      this.log(`Cache hit for program ${hash} (refCount: ${existing.refCount})`, layerId);
      return existing.program;
    }

    // Create new program
    this.log(`Cache miss - compiling new program ${hash}`, layerId);

    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = this.linkProgram(gl, vertexShader, fragmentShader);

    // Store in cache
    const entry: CacheEntry = {
      program,
      refCount: 1,
      vertexShader,
      fragmentShader,
      hash,
    };
    this.cache.set(hash, entry);

    if (layerId) {
      this.layerToHash.set(layerId, hash);
    }

    this.log(`Program ${hash} compiled and cached`, layerId);
    return program;
  }

  /**
   * Release a program reference.
   * When the reference count reaches zero, the program is deleted.
   *
   * @param vertexSource - The vertex shader source code
   * @param fragmentSource - The fragment shader source code
   * @param gl - The WebGL rendering context (needed for cleanup)
   */
  release(
    vertexSource: string,
    fragmentSource: string,
    gl: WebGLRenderingContext
  ): void {
    const hash = createCacheKey(vertexSource, fragmentSource);
    this.releaseByHash(hash, gl);
  }

  /**
   * Release a program reference by layer ID.
   *
   * @param layerId - The layer ID that was using the program
   * @param gl - The WebGL rendering context
   */
  releaseByLayerId(layerId: string, gl: WebGLRenderingContext): void {
    const hash = this.layerToHash.get(layerId);
    if (hash) {
      this.layerToHash.delete(layerId);
      this.releaseByHash(hash, gl);
    }
  }

  /**
   * Internal method to release by hash.
   */
  private releaseByHash(hash: string, gl: WebGLRenderingContext): void {
    const entry = this.cache.get(hash);
    if (!entry) {
      return;
    }

    entry.refCount--;
    this.log(`Released program ${hash} (refCount: ${entry.refCount})`);

    if (entry.refCount <= 0) {
      // Clean up WebGL resources
      gl.deleteProgram(entry.program);
      gl.deleteShader(entry.vertexShader);
      gl.deleteShader(entry.fragmentShader);
      this.cache.delete(hash);
      this.log(`Program ${hash} deleted from cache`);
    }
  }

  /**
   * Check if a program with the given shaders exists in the cache.
   *
   * @param vertexSource - The vertex shader source code
   * @param fragmentSource - The fragment shader source code
   * @returns True if the program is cached
   */
  has(vertexSource: string, fragmentSource: string): boolean {
    const hash = createCacheKey(vertexSource, fragmentSource);
    return this.cache.has(hash);
  }

  /**
   * Get the current number of cached programs.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics.
   */
  getStats(): { programs: number; totalRefs: number; entries: { hash: string; refCount: number }[] } {
    let totalRefs = 0;
    const entries: { hash: string; refCount: number }[] = [];

    this.cache.forEach((entry, hash) => {
      totalRefs += entry.refCount;
      entries.push({ hash, refCount: entry.refCount });
    });

    return {
      programs: this.cache.size,
      totalRefs,
      entries,
    };
  }

  /**
   * Clear all cached programs.
   * Should be called when the WebGL context is being destroyed.
   *
   * @param gl - The WebGL rendering context
   */
  clear(gl: WebGLRenderingContext): void {
    this.cache.forEach((entry) => {
      gl.deleteProgram(entry.program);
      gl.deleteShader(entry.vertexShader);
      gl.deleteShader(entry.fragmentShader);
    });
    this.cache.clear();
    this.layerToHash.clear();
    this.log('Cache cleared');
  }

  /**
   * Compile a shader.
   */
  private compileShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
      throw new Error(`Failed to compile ${shaderType} shader: ${info}`);
    }

    return shader;
  }

  /**
   * Link vertex and fragment shaders into a program.
   */
  private linkProgram(
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ): WebGLProgram {
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create program');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Failed to link program: ${info}`);
    }

    return program;
  }

  /**
   * Log a message if debug mode is enabled.
   */
  private log(message: string, layerId?: string): void {
    if (this.debug) {
      const prefix = layerId ? `${WEBGL_LOG_PREFIX} [${layerId}]` : WEBGL_LOG_PREFIX;
      console.log(`${prefix} ProgramCache: ${message}`);
    }
  }
}

// ============================================
// Global Instance
// ============================================

/**
 * Global program cache instance.
 * Use this when you want to share programs across multiple shader layers.
 */
export const globalProgramCache = new ProgramCache();
