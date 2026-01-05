/**
 * Types Index
 *
 * Re-exports all types from individual modules for convenient access.
 * Types are organized into logical groups for better maintainability.
 */

// Core types
export type {
  GeometryType,
  Color,
  BaseShaderConfig,
  ShaderConfig,
  ConfigParamType,
  ConfigParamSchema,
  ConfigSchema,
  ValidationResult,
  ValidationError,
  UniformValue,
  Uniforms,
  ShaderDefinition,
  ShaderInstance,
  ShaderController,
  ShaderManagerOptions,
  MapLibreMapInstance,
} from './core';

// Interface types
export type {
  IShaderManager,
  IAnimationLoop,
  IShaderRegistry,
  IConfigResolver,
} from './interfaces';

// Animation timing types
export type { TimeOffsetValue, AnimationTimingConfig, TimedShaderConfig } from './animation';

// Data-driven expression types
export type { DataDrivenExpression, DataDrivenValue, DataDrivenShaderConfig } from './data-driven';

// Interactive animation types
export type {
  FeatureAnimationState,
  InteractionAction,
  InteractionHandler,
  HoverInteractionConfig,
  InteractivityConfig,
  InteractiveShaderController,
  FullShaderConfig,
} from './interaction';

// Plugin system types
export type {
  PluginMetadata,
  PluginHooks,
  ShaderPreset,
  ShaderPlugin,
  PluginState,
  IPluginManager,
  PluginValidationResult,
  PluginValidationError,
  PluginValidationWarning,
} from './plugin';

// Metrics and observability types
export type {
  ShaderMetrics,
  PerformanceWarningType,
  PerformanceWarning,
  PerformanceWarningHandler,
  MetricsConfig,
} from './metrics';
