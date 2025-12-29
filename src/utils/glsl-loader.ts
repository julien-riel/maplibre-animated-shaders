/**
 * GLSL shader loading and preprocessing utilities
 */

/**
 * Common GLSL includes that can be injected into shaders
 */
const GLSL_INCLUDES: Record<string, string> = {};

/**
 * Register a GLSL include for use in shaders
 */
export function registerGLSLInclude(name: string, source: string): void {
  GLSL_INCLUDES[name] = source;
}

/**
 * Process GLSL source, resolving includes
 * Supports #include "name" syntax
 */
export function processGLSL(source: string): string {
  const includeRegex = /#include\s+"([^"]+)"/g;

  return source.replace(includeRegex, (_match, includeName) => {
    const includeSource = GLSL_INCLUDES[includeName];
    if (!includeSource) {
      console.warn(`[GLSL] Include "${includeName}" not found`);
      return `// Include "${includeName}" not found`;
    }
    return includeSource;
  });
}

/**
 * Combine vertex and fragment shaders with common uniforms
 */
export function createShaderProgram(
  fragmentShader: string,
  vertexShader?: string
): { vertex: string; fragment: string } {
  const commonUniforms = `
uniform float u_time;
uniform float u_delta_time;
uniform vec2 u_resolution;
`;

  const processedFragment = processGLSL(fragmentShader);
  const processedVertex = vertexShader ? processGLSL(vertexShader) : undefined;

  return {
    vertex: processedVertex ?? getDefaultVertexShader(),
    fragment: commonUniforms + processedFragment,
  };
}

/**
 * Get default vertex shader for MapLibre custom layers
 */
export function getDefaultVertexShader(): string {
  return `
attribute vec2 a_position;
varying vec2 v_position;

void main() {
  v_position = a_position;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
}

/**
 * Get precision header for fragment shaders
 */
export function getPrecisionHeader(): string {
  return `
#ifdef GL_ES
precision highp float;
#endif
`;
}
