/**
 * MapLibre GL Shaders - Animated GLSL shaders for MapLibre GL JS
 *
 * @packageDocumentation
 */

// Core classes
export { ShaderManager, createShaderManager, applyShader } from './ShaderManager';
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
  // Animation Timing (Phase 1)
  TimeOffsetValue,
  AnimationTimingConfig,
  TimedShaderConfig,
  // Data-Driven Expressions (Phase 2)
  DataDrivenExpression,
  DataDrivenValue,
  DataDrivenShaderConfig,
  // Interactive Animation (Phase 3)
  FeatureAnimationState,
  InteractionAction,
  InteractionHandler,
  HoverInteractionConfig,
  InteractivityConfig,
  InteractiveShaderController,
  FullShaderConfig,
} from './types';

// Expression evaluation (Phase 2)
export {
  ExpressionEvaluator,
  defaultExpressionEvaluator,
  isExpression,
  FeatureDataBuffer,
  registerStandardAttributes,
  interleaveAttributes,
} from './expressions';
export type { EvaluatedConfig, AttributeType } from './expressions';

// Timing utilities (Phase 1)
export { TimeOffsetCalculator, defaultTimeOffsetCalculator } from './timing';

// Interaction utilities (Phase 3)
export { FeatureAnimationStateManager, FeatureInteractionHandler } from './interaction';

// Utilities
export * from './utils';

// GLSL common functions
export { glsl, noiseGLSL, easingGLSL, shapesGLSL, colorsGLSL } from './glsl';

// Custom WebGL layers
export { PointShaderLayer } from './layers';

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
