/**
 * WebGL Program Builder
 *
 * Provides utilities for compiling and linking WebGL shader programs
 * with comprehensive error handling and caching support.
 *
 * @module webgl/ProgramBuilder
 */

import type { IWebGLContext, WebGLContextType } from './WebGLContext';

/**
 * Shader compilation error with detailed information
 */
export class ShaderCompilationError extends Error {
  /** Shader type that failed (VERTEX_SHADER or FRAGMENT_SHADER) */
  public readonly shaderType: number;

  /** The shader source code that failed to compile */
  public readonly source: string;

  /** WebGL compilation log */
  public readonly glLog: string;

  /**
   * Create a shader compilation error.
   *
   * @param message - Error message
   * @param shaderType - GL shader type constant
   * @param source - Shader source code
   * @param glLog - WebGL info log
   */
  constructor(message: string, shaderType: number, source: string, glLog: string) {
    super(message);
    this.name = 'ShaderCompilationError';
    this.shaderType = shaderType;
    this.source = source;
    this.glLog = glLog;
  }
}

/**
 * Program linking error with detailed information
 */
export class ProgramLinkError extends Error {
  /** WebGL link log */
  public readonly glLog: string;

  /**
   * Create a program link error.
   *
   * @param message - Error message
   * @param glLog - WebGL info log
   */
  constructor(message: string, glLog: string) {
    super(message);
    this.name = 'ProgramLinkError';
    this.glLog = glLog;
  }
}

/**
 * Compiled shader program with metadata
 */
export interface CompiledProgram {
  /** The WebGL program */
  program: WebGLProgram;

  /** Map of attribute names to locations */
  attributes: Map<string, number>;

  /** Map of uniform names to locations */
  uniforms: Map<string, WebGLUniformLocation>;
}

/**
 * Options for program compilation
 */
export interface ProgramOptions {
  /** Attribute names to query locations for */
  attributes?: string[];

  /** Uniform names to query locations for */
  uniforms?: string[];

  /** Whether to delete shader objects after linking (default: true) */
  deleteShaders?: boolean;

  /** Vertex shader preprocessor defines */
  vertexDefines?: Record<string, string | number | boolean>;

  /** Fragment shader preprocessor defines */
  fragmentDefines?: Record<string, string | number | boolean>;
}

/**
 * Build a WebGL shader program with error handling.
 *
 * @param ctx - WebGL context wrapper
 * @param vertexSource - Vertex shader GLSL source
 * @param fragmentSource - Fragment shader GLSL source
 * @param options - Compilation options
 * @returns Compiled program with attribute and uniform locations
 * @throws ShaderCompilationError if shader compilation fails
 * @throws ProgramLinkError if program linking fails
 *
 * @example
 * ```typescript
 * const program = buildProgram(ctx, vertexShader, fragmentShader, {
 *   attributes: ['a_position', 'a_color'],
 *   uniforms: ['u_matrix', 'u_time'],
 * });
 *
 * gl.useProgram(program.program);
 * gl.uniform1f(program.uniforms.get('u_time'), time);
 * ```
 */
export function buildProgram(
  ctx: IWebGLContext,
  vertexSource: string,
  fragmentSource: string,
  options: ProgramOptions = {}
): CompiledProgram {
  const gl = ctx.gl;
  const { attributes = [], uniforms = [], deleteShaders = true } = options;

  // Apply preprocessor defines
  const processedVertex = applyDefines(vertexSource, options.vertexDefines);
  const processedFragment = applyDefines(fragmentSource, options.fragmentDefines);

  // Compile shaders
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, processedVertex);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, processedFragment);

  // Create and link program
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new ProgramLinkError('Failed to create WebGL program', '');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // Check link status
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) || 'Unknown linking error';
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new ProgramLinkError(`Failed to link shader program: ${log}`, log);
  }

  // Clean up shader objects
  if (deleteShaders) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  }

  // Query attribute locations
  const attributeLocations = new Map<string, number>();
  for (const name of attributes) {
    const location = gl.getAttribLocation(program, name);
    if (location !== -1) {
      attributeLocations.set(name, location);
    }
  }

  // Query uniform locations
  const uniformLocations = new Map<string, WebGLUniformLocation>();
  for (const name of uniforms) {
    const location = gl.getUniformLocation(program, name);
    if (location !== null) {
      uniformLocations.set(name, location);
    }
  }

  return {
    program,
    attributes: attributeLocations,
    uniforms: uniformLocations,
  };
}

/**
 * Compile a single shader.
 *
 * @param gl - WebGL context
 * @param type - Shader type (VERTEX_SHADER or FRAGMENT_SHADER)
 * @param source - GLSL source code
 * @returns Compiled shader
 * @throws ShaderCompilationError if compilation fails
 */
export function compileShader(gl: WebGLContextType, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new ShaderCompilationError(
      'Failed to create shader object',
      type,
      source,
      'createShader returned null'
    );
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'Unknown compilation error';
    const typeName = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
    gl.deleteShader(shader);

    // Add line numbers to source for easier debugging
    const numberedSource = addLineNumbers(source);
    throw new ShaderCompilationError(
      `Failed to compile ${typeName} shader:\n${log}\n\nSource:\n${numberedSource}`,
      type,
      source,
      log
    );
  }

  return shader;
}

/**
 * Apply preprocessor defines to shader source.
 *
 * @param source - Original shader source
 * @param defines - Map of define names to values
 * @returns Processed shader source with defines prepended
 *
 * @example
 * ```typescript
 * const processed = applyDefines(source, {
 *   USE_INSTANCING: true,
 *   MAX_LIGHTS: 8,
 * });
 * // Adds: #define USE_INSTANCING 1
 * //       #define MAX_LIGHTS 8
 * ```
 */
export function applyDefines(
  source: string,
  defines?: Record<string, string | number | boolean>
): string {
  if (!defines || Object.keys(defines).length === 0) {
    return source;
  }

  const defineLines: string[] = [];
  for (const [name, value] of Object.entries(defines)) {
    if (typeof value === 'boolean') {
      if (value) {
        defineLines.push(`#define ${name} 1`);
      }
    } else {
      defineLines.push(`#define ${name} ${value}`);
    }
  }

  // Insert defines after #version if present, otherwise at the start
  const versionMatch = source.match(/^(#version\s+\d+(\s+\w+)?)\s*\n/);
  if (versionMatch) {
    const versionLine = versionMatch[0];
    const restOfSource = source.slice(versionLine.length);
    return versionLine + defineLines.join('\n') + '\n' + restOfSource;
  }

  return defineLines.join('\n') + '\n' + source;
}

/**
 * Add line numbers to shader source for debugging.
 *
 * @param source - Shader source code
 * @returns Source with line numbers prepended
 */
export function addLineNumbers(source: string): string {
  const lines = source.split('\n');
  const padWidth = String(lines.length).length;
  return lines.map((line, i) => `${String(i + 1).padStart(padWidth, ' ')} | ${line}`).join('\n');
}

/**
 * Extract uniform names from shader source.
 *
 * @param source - Shader source code
 * @returns Array of uniform names found in the source
 *
 * @example
 * ```typescript
 * const uniforms = extractUniforms(fragmentShader);
 * // ['u_time', 'u_color', 'u_matrix']
 * ```
 */
export function extractUniforms(source: string): string[] {
  const uniformRegex = /uniform\s+\w+\s+(\w+)/g;
  const uniforms: string[] = [];
  let match;

  while ((match = uniformRegex.exec(source)) !== null) {
    uniforms.push(match[1]);
  }

  return uniforms;
}

/**
 * Extract attribute names from shader source.
 *
 * @param source - Shader source code
 * @returns Array of attribute names found in the source
 */
export function extractAttributes(source: string): string[] {
  // Match both 'attribute' (WebGL 1) and 'in' (WebGL 2) declarations
  const attributeRegex = /(?:attribute|in)\s+\w+\s+(\w+)/g;
  const attributes: string[] = [];
  let match;

  while ((match = attributeRegex.exec(source)) !== null) {
    attributes.push(match[1]);
  }

  return attributes;
}

/**
 * Check if a shader uses instancing.
 *
 * @param vertexSource - Vertex shader source
 * @returns true if the shader appears to use instancing
 */
export function usesInstancing(vertexSource: string): boolean {
  // Look for gl_InstanceID (WebGL 2) or common instancing patterns
  return (
    vertexSource.includes('gl_InstanceID') ||
    vertexSource.includes('a_instanceMatrix') ||
    vertexSource.includes('a_instance')
  );
}

/**
 * Transform WebGL 1 shader to WebGL 2 syntax.
 *
 * @param source - WebGL 1 shader source
 * @param type - Shader type
 * @returns WebGL 2 compatible source
 */
export function transformToWebGL2(source: string, type: 'vertex' | 'fragment'): string {
  let transformed = source;

  // Add version directive if not present
  if (!transformed.includes('#version')) {
    transformed = '#version 300 es\n' + transformed;
  }

  // Replace attribute with in
  transformed = transformed.replace(/\battribute\s+/g, 'in ');

  // Replace varying
  if (type === 'vertex') {
    transformed = transformed.replace(/\bvarying\s+/g, 'out ');
  } else {
    transformed = transformed.replace(/\bvarying\s+/g, 'in ');
    // Add output variable for fragment color
    if (!transformed.includes('out vec4') && transformed.includes('gl_FragColor')) {
      const precisionMatch = transformed.match(/(precision\s+\w+\s+float;)/);
      if (precisionMatch) {
        transformed = transformed.replace(
          precisionMatch[0],
          precisionMatch[0] + '\nout vec4 fragColor;'
        );
      } else {
        transformed = transformed.replace(
          '#version 300 es\n',
          '#version 300 es\nout vec4 fragColor;\n'
        );
      }
      transformed = transformed.replace(/gl_FragColor/g, 'fragColor');
    }
  }

  // Replace texture2D with texture
  transformed = transformed.replace(/\btexture2D\s*\(/g, 'texture(');

  return transformed;
}

/**
 * Transform WebGL 2 shader to WebGL 1 syntax.
 *
 * @param source - WebGL 2 shader source
 * @param type - Shader type
 * @returns WebGL 1 compatible source
 */
export function transformToWebGL1(source: string, type: 'vertex' | 'fragment'): string {
  let transformed = source;

  // Remove version directive
  transformed = transformed.replace(/#version\s+\d+(\s+\w+)?\s*\n/, '');

  // Replace in with attribute/varying
  if (type === 'vertex') {
    // First line 'in' declarations are attributes, rest are uniforms/etc
    const isFirstBlock = true;
    transformed = transformed.replace(/\bin\s+(\w+\s+\w+)/g, (match, rest) => {
      if (isFirstBlock && !rest.startsWith('uniform')) {
        return 'attribute ' + rest;
      }
      return match;
    });
    transformed = transformed.replace(/\bout\s+/g, 'varying ');
  } else {
    transformed = transformed.replace(/\bin\s+/g, 'varying ');
    // Replace out vec4 fragColor with nothing, use gl_FragColor
    transformed = transformed.replace(/out\s+vec4\s+\w+;\s*\n?/g, '');
    transformed = transformed.replace(/\bfragColor\b/g, 'gl_FragColor');
  }

  // Replace texture with texture2D
  transformed = transformed.replace(/\btexture\s*\(/g, 'texture2D(');

  return transformed;
}
