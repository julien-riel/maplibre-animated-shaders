/**
 * GLSL Uniform Extractor
 *
 * Parses GLSL shader code to extract uniform declarations.
 * Useful for validation and automatic uniform location caching.
 */

/**
 * Supported GLSL uniform types
 */
export type GLSLUniformType =
  | 'float'
  | 'int'
  | 'bool'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'mat2'
  | 'mat3'
  | 'mat4'
  | 'sampler2D'
  | 'samplerCube';

/**
 * Extracted uniform information
 */
export interface ExtractedUniform {
  /** Uniform name (e.g., 'u_time') */
  name: string;
  /** GLSL type (e.g., 'float', 'vec4') */
  type: GLSLUniformType;
  /** Whether this is an array uniform */
  isArray: boolean;
  /** Array size if isArray is true */
  arraySize?: number;
}

/**
 * Regular expression to match GLSL uniform declarations
 *
 * Matches patterns like:
 * - uniform float u_time;
 * - uniform vec4 u_color;
 * - uniform mat4 u_matrix;
 * - uniform float u_values[10];
 */
const UNIFORM_REGEX = /uniform\s+(float|int|bool|vec[234]|mat[234]|sampler2D|samplerCube)\s+(\w+)(?:\[(\d+)\])?;/g;

/**
 * Extract uniform declarations from GLSL shader code.
 *
 * @param glslCode - The GLSL shader source code
 * @returns Array of extracted uniform information
 *
 * @example
 * ```typescript
 * const code = `
 *   uniform float u_time;
 *   uniform vec4 u_color;
 *   uniform mat4 u_matrix;
 * `;
 *
 * const uniforms = extractUniforms(code);
 * // Returns:
 * // [
 * //   { name: 'u_time', type: 'float', isArray: false },
 * //   { name: 'u_color', type: 'vec4', isArray: false },
 * //   { name: 'u_matrix', type: 'mat4', isArray: false },
 * // ]
 * ```
 */
export function extractUniforms(glslCode: string): ExtractedUniform[] {
  const uniforms: ExtractedUniform[] = [];
  const seen = new Set<string>();

  // Remove comments to avoid false positives
  const codeWithoutComments = glslCode
    .replace(/\/\/.*$/gm, '') // Single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Multi-line comments

  let match: RegExpExecArray | null;
  while ((match = UNIFORM_REGEX.exec(codeWithoutComments)) !== null) {
    const [, type, name, arraySize] = match;

    // Skip duplicates (can happen with #ifdef blocks)
    if (seen.has(name)) continue;
    seen.add(name);

    uniforms.push({
      name,
      type: type as GLSLUniformType,
      isArray: !!arraySize,
      arraySize: arraySize ? parseInt(arraySize, 10) : undefined,
    });
  }

  return uniforms;
}

/**
 * Extract uniform names from GLSL shader code.
 *
 * @param glslCode - The GLSL shader source code
 * @returns Array of uniform names
 */
export function extractUniformNames(glslCode: string): string[] {
  return extractUniforms(glslCode).map((u) => u.name);
}

/**
 * Validate that all required uniforms are declared in the shader code.
 *
 * @param glslCode - The GLSL shader source code
 * @param requiredUniforms - Array of uniform names that must be present
 * @returns Object with validation result and missing uniforms
 *
 * @example
 * ```typescript
 * const result = validateUniforms(shaderCode, ['u_time', 'u_color']);
 * if (!result.valid) {
 *   console.warn('Missing uniforms:', result.missing);
 * }
 * ```
 */
export function validateUniforms(
  glslCode: string,
  requiredUniforms: string[]
): { valid: boolean; missing: string[] } {
  const declared = new Set(extractUniformNames(glslCode));
  const missing = requiredUniforms.filter((name) => !declared.has(name));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get uniform type information for WebGL uniform setters.
 *
 * Maps GLSL types to the appropriate WebGL uniform function.
 *
 * @param type - The GLSL uniform type
 * @returns Information about how to set this uniform type
 */
export function getUniformSetterInfo(type: GLSLUniformType): {
  setter: 'uniform1f' | 'uniform1i' | 'uniform2fv' | 'uniform3fv' | 'uniform4fv' | 'uniformMatrix2fv' | 'uniformMatrix3fv' | 'uniformMatrix4fv';
  componentCount: number;
} {
  switch (type) {
    case 'float':
      return { setter: 'uniform1f', componentCount: 1 };
    case 'int':
    case 'bool':
    case 'sampler2D':
    case 'samplerCube':
      return { setter: 'uniform1i', componentCount: 1 };
    case 'vec2':
      return { setter: 'uniform2fv', componentCount: 2 };
    case 'vec3':
      return { setter: 'uniform3fv', componentCount: 3 };
    case 'vec4':
      return { setter: 'uniform4fv', componentCount: 4 };
    case 'mat2':
      return { setter: 'uniformMatrix2fv', componentCount: 4 };
    case 'mat3':
      return { setter: 'uniformMatrix3fv', componentCount: 9 };
    case 'mat4':
      return { setter: 'uniformMatrix4fv', componentCount: 16 };
  }
}

/**
 * Create a uniform location cache from extracted uniforms.
 *
 * @param gl - WebGL rendering context
 * @param program - WebGL program
 * @param uniforms - Array of extracted uniform information
 * @returns Map of uniform name to WebGLUniformLocation
 */
export function createUniformCache(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  uniforms: ExtractedUniform[]
): Map<string, WebGLUniformLocation> {
  const cache = new Map<string, WebGLUniformLocation>();

  for (const uniform of uniforms) {
    const location = gl.getUniformLocation(program, uniform.name);
    if (location !== null) {
      cache.set(uniform.name, location);
    }
  }

  return cache;
}
