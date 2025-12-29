/**
 * MapLibre GL Shaders - Animated GLSL shaders for MapLibre GL JS
 *
 * @packageDocumentation
 */

// Core classes
export { ShaderManager, createShaderManager, applyShader, removeShader } from './ShaderManager';
export { AnimationLoop } from './AnimationLoop';
export { ShaderRegistry, globalRegistry } from './ShaderRegistry';
export { ConfigResolver } from './ConfigResolver';

// Types
export type {
  // Core types
  GeometryType,
  Color,
  BaseShaderConfig,
  ShaderConfig,
  ShaderDefinition,
  ShaderInstance,
  ShaderController,
  ShaderManagerOptions,
  // Interfaces
  IShaderManager,
  IAnimationLoop,
  IShaderRegistry,
  IConfigResolver,
  // Validation
  ConfigParamType,
  ConfigParamSchema,
  ConfigSchema,
  ValidationResult,
  ValidationError,
  // Uniforms
  UniformValue,
  Uniforms,
  // MapLibre
  MapLibreMapInstance,
} from './types';

// Utilities
export * from './utils';

// GLSL common functions
export { glsl, noiseGLSL, easingGLSL, shapesGLSL, colorsGLSL } from './glsl';

// Shaders (will be populated as they are implemented)
export { registerAllShaders } from './shaders';

// Re-import for use in helper functions
import { globalRegistry as registry } from './ShaderRegistry';
import type { GeometryType, ShaderConfig, ShaderDefinition } from './types';

/**
 * Helper to define a custom shader with type safety
 */
export function defineShader<T extends ShaderConfig>(
  definition: ShaderDefinition<T>
): ShaderDefinition<T> {
  return definition;
}

/**
 * Register a custom shader to the global registry
 */
export function registerShader(definition: ShaderDefinition): void {
  registry.register(definition);
}

/**
 * List available shaders, optionally filtered by geometry
 */
export function listShaders(geometry?: GeometryType): string[] {
  return registry.list(geometry);
}
