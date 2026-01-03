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

// Constants
export * from './constants';

// Error hierarchy
export * from './errors';

// Event system
export {
  ShaderEventEmitter,
  globalEventEmitter,
} from './events';
export type {
  ShaderEventType,
  ShaderEvent,
  ShaderEventMap,
  ShaderEventHandler,
  ShaderRegisteredEvent,
  ShaderUnregisteredEvent,
  ShaderConfigUpdatedEvent,
  ShaderPlayEvent,
  ShaderPauseEvent,
  ShaderSpeedChangedEvent,
  PluginRegisteredEvent,
  PluginUnregisteredEvent,
  ShaderErrorEvent,
  PerformanceWarningEvent,
  PerformanceFrameEvent,
  DestroyedEvent,
} from './events';

// Adapters
export {
  MapLibreAdapter,
  createMapAdapter,
} from './adapters';
export type {
  IMapAdapter,
  MapEventHandler,
} from './adapters';

// Program cache
export { ProgramCache, globalProgramCache } from './utils/program-cache';

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
  // Metrics & Observability
  ShaderMetrics,
  PerformanceWarning,
  PerformanceWarningType,
  PerformanceWarningHandler,
  MetricsConfig,
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

// Plugin system
export { PluginManager, validatePlugin, NAMESPACE_SEPARATOR } from './plugins';
export type {
  ShaderPlugin,
  PluginMetadata,
  PluginHooks,
  PluginState,
  PluginValidationResult,
  PluginValidationError,
  PluginValidationWarning,
  IPluginManager,
} from './types';

// Built-in example plugin (synchronous)
export { examplePlugin } from './plugins';

// Lazy loading for plugins (code splitting)
export {
  loadPlugin,
  loadPlugins,
  preloadPlugins,
  loadExamplePlugin,
  pluginLoaders,
} from './plugins';
export type { BuiltinPluginName, PluginLoader } from './plugins';

// Utilities
export * from './utils';

// GLSL common functions
export { glsl, noiseGLSL, easingGLSL, shapesGLSL, colorsGLSL } from './glsl';

// Custom WebGL layers
export { PointShaderLayer } from './layers';

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
 * @deprecated Use manager.use(plugin) instead
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
