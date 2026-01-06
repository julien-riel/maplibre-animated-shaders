/**
 * Plugin System Types
 *
 * Types for the shader plugin system including metadata, hooks, and validation.
 */

import type { ShaderConfig, ShaderDefinition } from './core';
import type { IShaderManager } from './interfaces';

/**
 * Metadata for a shader plugin
 */
export interface PluginMetadata {
  /** Unique plugin identifier (e.g., 'weather-effects') */
  name: string;
  /** Semantic version (e.g., '1.2.0') */
  version: string;
  /** Plugin author */
  author?: string;
  /** Plugin description */
  description?: string;
  /** Plugin homepage/repository URL */
  homepage?: string;
  /** License identifier */
  license?: string;
  /** Keywords for discovery */
  keywords?: string[];
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  /**
   * Called when the plugin is registered with a ShaderManager
   * Use for initialization, logging, or setting up external resources
   */
  onRegister?: (manager: IShaderManager) => void;

  /**
   * Called when the plugin is unregistered from a ShaderManager
   * Use for cleanup of external resources
   */
  onUnregister?: (manager: IShaderManager) => void;

  /**
   * Called before a shader from this plugin is applied to a layer
   * Can be used for validation or pre-processing
   */
  onBeforeApply?: (
    layerId: string,
    shaderName: string,
    config: ShaderConfig
  ) => ShaderConfig | void;

  /**
   * Called after a shader from this plugin is applied to a layer
   */
  onAfterApply?: (layerId: string, shaderName: string, config: ShaderConfig) => void;
}

/**
 * Preset configuration for a shader
 */
export interface ShaderPreset<T extends ShaderConfig = ShaderConfig> {
  /** Preset name */
  name: string;
  /** Preset description */
  description?: string;
  /** Configuration values */
  config: Partial<T>;
}

/**
 * Shader plugin definition
 *
 * Plugins allow packaging and distributing collections of shaders
 * with metadata, lifecycle hooks, and optional presets.
 *
 * @example
 * ```typescript
 * const weatherPlugin: ShaderPlugin = {
 *   name: 'weather-effects',
 *   version: '1.0.0',
 *   author: 'Map Developers',
 *   description: 'Weather visualization shaders',
 *
 *   shaders: [rainShader, snowShader, fogShader],
 *
 *   presets: {
 *     'light-rain': { shader: 'rain', config: { intensity: 0.3 } },
 *     'heavy-rain': { shader: 'rain', config: { intensity: 1.0 } },
 *   },
 *
 *   onRegister(manager) {
 *     console.log('Weather plugin loaded');
 *   }
 * };
 *
 * // Usage
 * shaderManager.use(weatherPlugin);
 * shaderManager.register('layer', 'weather-effects:rain', config);
 * ```
 */
export interface ShaderPlugin extends PluginMetadata, PluginHooks {
  /** Shader definitions included in this plugin */
  shaders: ShaderDefinition[];

  /**
   * Named presets for quick configuration
   * Key is preset name, value is shader name and config
   */
  presets?: Record<string, { shader: string; config: Partial<ShaderConfig> }>;

  /**
   * Whether to use namespace prefix for shader names
   * If true, shaders are registered as 'pluginName:shaderName'
   * @default true
   */
  useNamespace?: boolean;
}

/**
 * Plugin registration state
 */
export interface PluginState {
  /** The plugin definition */
  plugin: ShaderPlugin;
  /** Whether the plugin is currently active */
  active: boolean;
  /** Timestamp when the plugin was registered */
  registeredAt: number;
  /** List of shader names registered by this plugin */
  registeredShaders: string[];
}

/**
 * Plugin manager interface
 */
export interface IPluginManager {
  /** Register a plugin */
  use(plugin: ShaderPlugin): void;
  /** Unregister a plugin */
  unuse(pluginName: string): boolean;
  /** Get a registered plugin by name */
  getPlugin(name: string): ShaderPlugin | undefined;
  /** Check if a plugin is registered */
  hasPlugin(name: string): boolean;
  /** List all registered plugin names */
  listPlugins(): string[];
  /** Get plugin state */
  getPluginState(name: string): PluginState | undefined;
  /** Resolve a shader name (handles namespacing) */
  resolveShaderName(name: string): string | undefined;
}

/**
 * Result of plugin validation
 */
export interface PluginValidationResult {
  valid: boolean;
  errors: PluginValidationError[];
  warnings: PluginValidationWarning[];
}

/**
 * Plugin validation error
 */
export interface PluginValidationError {
  code:
    | 'MISSING_NAME'
    | 'MISSING_VERSION'
    | 'INVALID_VERSION'
    | 'NO_SHADERS'
    | 'DUPLICATE_SHADER'
    | 'INVALID_SHADER';
  message: string;
  field?: string;
}

/**
 * Plugin validation warning
 */
export interface PluginValidationWarning {
  code: 'MISSING_AUTHOR' | 'MISSING_DESCRIPTION' | 'SHADER_NAME_CONFLICT';
  message: string;
  field?: string;
}
