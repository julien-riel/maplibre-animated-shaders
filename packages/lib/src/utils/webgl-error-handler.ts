/**
 * WebGL Error Handler Utility
 *
 * Provides robust error handling for WebGL operations with:
 * - Try-catch wrappers
 * - Descriptive error messages
 * - WebGL 2 detection and fallback
 * - Context loss handling
 * - Improved shader error diagnostics with varying suggestions
 */

import type { GeometryType } from '../types';
import {
  formatAvailableVaryings,
  suggestVaryingReplacement,
  getVaryingNames,
} from './shader-varyings';

/**
 * WebGL error codes and their descriptions
 */
const GL_ERROR_MESSAGES: Record<number, string> = {
  0: 'NO_ERROR',
  1280: 'INVALID_ENUM - An unacceptable value was specified for an enumerated argument',
  1281: 'INVALID_VALUE - A numeric argument is out of range',
  1282: 'INVALID_OPERATION - The specified operation is not allowed in the current state',
  1285: 'OUT_OF_MEMORY - Not enough memory to execute the command',
  1286: 'INVALID_FRAMEBUFFER_OPERATION - The framebuffer object is not complete',
  37442: 'CONTEXT_LOST_WEBGL - The WebGL context has been lost',
};

/**
 * Error class for shader-related errors
 */
export class ShaderError extends Error {
  constructor(
    message: string,
    public readonly shaderType: 'vertex' | 'fragment' | 'program',
    public readonly glError?: number,
    public readonly shaderLog?: string
  ) {
    super(message);
    this.name = 'ShaderError';
  }
}

/**
 * Error class for WebGL context errors
 */
export class WebGLContextError extends Error {
  constructor(
    message: string,
    public readonly reason?: string
  ) {
    super(message);
    this.name = 'WebGLContextError';
  }
}

/**
 * Error class for buffer operation errors
 */
export class BufferError extends Error {
  constructor(
    message: string,
    public readonly bufferType: string
  ) {
    super(message);
    this.name = 'BufferError';
  }
}

/**
 * WebGL capability information
 */
export interface WebGLCapabilities {
  webgl2: boolean;
  maxTextureSize: number;
  maxVertexAttribs: number;
  maxVertexUniforms: number;
  maxFragmentUniforms: number;
  maxVaryings: number;
  floatTextures: boolean;
  depthTextures: boolean;
  anisotropicFiltering: boolean;
  maxAnisotropy: number;
}

/**
 * Check WebGL capabilities and support
 */
export function getWebGLCapabilities(gl: WebGLRenderingContext): WebGLCapabilities {
  const isWebGL2 = 'WebGL2RenderingContext' in window && gl instanceof WebGL2RenderingContext;

  // Get extension support
  const floatTexturesExt = gl.getExtension('OES_texture_float');
  const depthTexturesExt = gl.getExtension('WEBGL_depth_texture');
  const anisotropicExt =
    gl.getExtension('EXT_texture_filter_anisotropic') ||
    gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ||
    gl.getExtension('MOZ_EXT_texture_filter_anisotropic');

  return {
    webgl2: isWebGL2,
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number,
    maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) as number,
    maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) as number,
    maxVaryings: gl.getParameter(gl.MAX_VARYING_VECTORS) as number,
    floatTextures: !!floatTexturesExt || isWebGL2,
    depthTextures: !!depthTexturesExt || isWebGL2,
    anisotropicFiltering: !!anisotropicExt,
    maxAnisotropy: anisotropicExt
      ? (gl.getParameter(anisotropicExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number)
      : 1,
  };
}

/**
 * Check for and log any pending WebGL errors
 */
export function checkGLError(gl: WebGLRenderingContext, operation: string): void {
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    const errorMessage = GL_ERROR_MESSAGES[error] || `Unknown error (${error})`;
    console.error(`[WebGL Error] ${operation}: ${errorMessage}`);
  }
}

/**
 * Safe wrapper for WebGL operations
 */
export function safeGLOperation<T>(
  gl: WebGLRenderingContext,
  operation: string,
  fn: () => T,
  fallback?: T
): T | undefined {
  try {
    const result = fn();
    checkGLError(gl, operation);
    return result;
  } catch (error) {
    console.error(`[WebGL] ${operation} failed:`, error);
    if (fallback !== undefined) {
      return fallback;
    }
    return undefined;
  }
}

/**
 * Compile a shader with detailed error reporting
 */
export function compileShaderWithErrorHandling(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
  layerId: string
): WebGLShader {
  const shaderTypeName = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';

  // Create shader
  const shader = gl.createShader(type);
  if (!shader) {
    throw new ShaderError(
      `Failed to create ${shaderTypeName} shader for layer "${layerId}"`,
      shaderTypeName as 'vertex' | 'fragment'
    );
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  // Check compilation status
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const infoLog = gl.getShaderInfoLog(shader) || 'Unknown error';
    gl.deleteShader(shader);

    // Parse error to provide more helpful context
    const errorDetails = parseShaderError(infoLog, source);

    throw new ShaderError(
      `${shaderTypeName.charAt(0).toUpperCase() + shaderTypeName.slice(1)} shader compilation failed for layer "${layerId}":\n${errorDetails}`,
      shaderTypeName as 'vertex' | 'fragment',
      undefined,
      infoLog
    );
  }

  return shader;
}

/**
 * Options for shader linking with geometry context
 */
export interface LinkProgramOptions {
  /** Layer ID for error messages */
  layerId: string;
  /** Geometry type for varying suggestions */
  geometryType?: GeometryType;
  /** Enable debug mode for additional logging */
  debug?: boolean;
}

/**
 * Parse varying errors from program info log
 * Returns an array of missing varying names
 */
function parseVaryingErrors(infoLog: string): string[] {
  const missingVaryings: string[] = [];

  // Match different driver error formats for varying mismatches
  // Format 1: "FRAGMENT varying v_uv does not match any VERTEX varying"
  // Format 2: "varying 'v_uv' has not been declared in the vertex shader"
  // Format 3: "undeclared varying v_uv"
  const patterns = [
    /varying\s+(\w+)\s+does not match/gi,
    /varying\s+'(\w+)'\s+has not been declared/gi,
    /undeclared\s+varying\s+(\w+)/gi,
    /FRAGMENT\s+varying\s+(\w+)/gi,
    /varying\s+(\w+)\s+used\s+but\s+not\s+declared/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(infoLog)) !== null) {
      const varyingName = match[1];
      if (!missingVaryings.includes(varyingName)) {
        missingVaryings.push(varyingName);
      }
    }
  }

  return missingVaryings;
}

/**
 * Format enhanced error message with varying suggestions
 */
function formatVaryingErrorMessage(
  infoLog: string,
  missingVaryings: string[],
  geometryType: GeometryType | undefined,
  layerId: string
): string {
  const lines: string[] = [];
  lines.push(`Shader program linking failed for layer "${layerId}":`);
  lines.push('');
  lines.push('Error: ' + infoLog.trim());

  if (missingVaryings.length > 0 && geometryType) {
    lines.push('');
    lines.push('--- Varying Mismatch Detected ---');
    lines.push('');

    for (const varying of missingVaryings) {
      lines.push(`Missing varying: '${varying}'`);

      // Check if this varying exists in another geometry type
      const suggestion = suggestVaryingReplacement(geometryType, varying);
      if (suggestion) {
        lines.push(`  Hint: ${suggestion}`);
      }
    }

    lines.push('');
    lines.push(`Available varyings for '${geometryType}' geometry:`);
    lines.push(formatAvailableVaryings(geometryType));
  } else if (missingVaryings.length > 0) {
    lines.push('');
    lines.push('Tip: Missing varyings detected. Specify geometryType in options for suggestions.');
  }

  return lines.join('\n');
}

/**
 * Link a program with detailed error reporting
 *
 * @deprecated Use linkProgramWithGeometry for enhanced error messages with varying suggestions
 */
export function linkProgramWithErrorHandling(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
  layerId: string
): WebGLProgram {
  return linkProgramWithGeometry(gl, vertexShader, fragmentShader, { layerId });
}

/**
 * Link a program with detailed error reporting and geometry-aware varying suggestions
 *
 * @param gl - WebGL rendering context
 * @param vertexShader - Compiled vertex shader
 * @param fragmentShader - Compiled fragment shader
 * @param options - Options including layerId, geometryType, and debug flag
 * @returns Linked WebGL program
 * @throws ShaderError if linking fails
 *
 * @example
 * ```typescript
 * const program = linkProgramWithGeometry(gl, vertexShader, fragmentShader, {
 *   layerId: 'my-layer',
 *   geometryType: 'point',
 *   debug: true
 * });
 * ```
 */
export function linkProgramWithGeometry(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
  options: LinkProgramOptions
): WebGLProgram {
  const { layerId, geometryType, debug } = options;

  // Debug logging: show available varyings before compilation
  if (debug && geometryType) {
    // eslint-disable-next-line no-console
    console.log(`[ShaderDebug] Compiling shader for '${geometryType}' geometry`);
    // eslint-disable-next-line no-console
    console.log(`[ShaderDebug] Available varyings:`, getVaryingNames(geometryType));
  }

  const program = gl.createProgram();
  if (!program) {
    throw new ShaderError(`Failed to create shader program for layer "${layerId}"`, 'program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // Check link status
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const infoLog = gl.getProgramInfoLog(program) || 'Unknown error';
    gl.deleteProgram(program);

    // Parse for varying errors
    const missingVaryings = parseVaryingErrors(infoLog);

    // Format enhanced error message
    const errorMessage = formatVaryingErrorMessage(
      infoLog,
      missingVaryings,
      geometryType,
      layerId
    );

    throw new ShaderError(errorMessage, 'program', undefined, infoLog);
  }

  // Validate program
  gl.validateProgram(program);
  if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
    const infoLog = gl.getProgramInfoLog(program) || 'Validation failed';
    console.warn(`[WebGL] Program validation warning for layer "${layerId}": ${infoLog}`);
  }

  if (debug) {
    // eslint-disable-next-line no-console
    console.log(`[ShaderDebug] Shader program linked successfully for layer "${layerId}"`);
  }

  return program;
}

/**
 * Create a buffer with error handling
 */
export function createBufferWithErrorHandling(
  gl: WebGLRenderingContext,
  bufferType: string,
  layerId: string
): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new BufferError(
      `Failed to create ${bufferType} buffer for layer "${layerId}"`,
      bufferType
    );
  }
  return buffer;
}

/**
 * Parse shader error log to provide more context
 */
function parseShaderError(infoLog: string, source: string): string {
  const lines = source.split('\n');
  const errorLines: string[] = [];

  // Try to extract line numbers from error message
  // Format varies by driver: "ERROR: 0:42:" or "ERROR: line 42:"
  const lineMatch = infoLog.match(/(?:0:|line\s*)(\d+)/i);

  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1], 10);
    const startLine = Math.max(0, lineNum - 3);
    const endLine = Math.min(lines.length, lineNum + 2);

    errorLines.push('Source context:');
    for (let i = startLine; i < endLine; i++) {
      const prefix = i + 1 === lineNum ? '>>> ' : '    ';
      errorLines.push(`${prefix}${i + 1}: ${lines[i]}`);
    }
    errorLines.push('');
  }

  errorLines.push('Compiler message:');
  errorLines.push(infoLog);

  return errorLines.join('\n');
}

/**
 * Check if WebGL context is lost
 */
export function isContextLost(gl: WebGLRenderingContext): boolean {
  return gl.isContextLost();
}

/**
 * Setup context loss handling for a layer
 */
export function setupContextLossHandler(
  canvas: HTMLCanvasElement,
  onContextLost: () => void,
  onContextRestored: () => void
): () => void {
  const handleLost = (event: Event) => {
    event.preventDefault();
    // eslint-disable-next-line no-console
    console.warn('[WebGL] Context lost');
    onContextLost();
  };

  const handleRestored = () => {
    // eslint-disable-next-line no-console
    console.info('[WebGL] Context restored');
    onContextRestored();
  };

  canvas.addEventListener('webglcontextlost', handleLost);
  canvas.addEventListener('webglcontextrestored', handleRestored);

  // Return cleanup function
  return () => {
    canvas.removeEventListener('webglcontextlost', handleLost);
    canvas.removeEventListener('webglcontextrestored', handleRestored);
  };
}

/**
 * Log WebGL capabilities for debugging
 */
export function logWebGLCapabilities(gl: WebGLRenderingContext): void {
  const caps = getWebGLCapabilities(gl);
  // eslint-disable-next-line no-console
  console.info('[WebGL] Capabilities:', caps);
}

/**
 * Safe cleanup of WebGL resources
 */
export function safeCleanup(
  gl: WebGLRenderingContext,
  resources: {
    program?: WebGLProgram | null;
    buffers?: (WebGLBuffer | null)[];
    shaders?: (WebGLShader | null)[];
    textures?: (WebGLTexture | null)[];
  }
): void {
  try {
    if (resources.program) {
      gl.deleteProgram(resources.program);
    }

    if (resources.buffers) {
      for (const buffer of resources.buffers) {
        if (buffer) gl.deleteBuffer(buffer);
      }
    }

    if (resources.shaders) {
      for (const shader of resources.shaders) {
        if (shader) gl.deleteShader(shader);
      }
    }

    if (resources.textures) {
      for (const texture of resources.textures) {
        if (texture) gl.deleteTexture(texture);
      }
    }
  } catch (error) {
    console.warn('[WebGL] Error during cleanup:', error);
  }
}
