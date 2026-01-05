/**
 * WebGL Module
 *
 * Provides WebGL 2.0 support with automatic fallback to WebGL 1.0.
 * Includes unified context wrapper, program builder, and instanced rendering.
 *
 * @module webgl
 *
 * @example
 * ```typescript
 * import { WebGLContext, InstancedRenderer, buildProgram } from './webgl';
 *
 * // Create context from existing GL
 * const ctx = new WebGLContext(gl);
 * console.log(`Using WebGL ${ctx.version}`);
 *
 * // Build shader program
 * const program = buildProgram(ctx, vertexShader, fragmentShader, {
 *   attributes: ['a_position', 'a_color'],
 *   uniforms: ['u_matrix', 'u_time'],
 * });
 *
 * // Setup instanced rendering
 * if (ctx.supportsInstancing) {
 *   const renderer = new InstancedRenderer(ctx);
 *   renderer.setGeometry(vertices, 6, layout, stride);
 *   renderer.setInstanceData(instanceData, instanceLayout);
 *   renderer.draw(1000);
 * }
 * ```
 */

// Context abstraction
export {
  WebGLContext,
  createWebGLContext,
  wrapWebGLContext,
  type IWebGLContext,
  type WebGLContextType,
  type WebGLVersion,
  type WebGLCapabilities,
} from './WebGLContext';

// Program building
export {
  buildProgram,
  compileShader,
  applyDefines,
  addLineNumbers,
  extractUniforms,
  extractAttributes,
  usesInstancing,
  transformToWebGL2,
  transformToWebGL1,
  ShaderCompilationError,
  ProgramLinkError,
  type CompiledProgram,
  type ProgramOptions,
} from './ProgramBuilder';

// Instanced rendering
export {
  InstancedRenderer,
  createQuadGeometry,
  createLineGeometry,
  type InstanceAttribute,
  type InstanceLayout,
} from './InstancedRenderer';
