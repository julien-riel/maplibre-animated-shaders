/**
 * PluginManager - Manages shader plugin lifecycle
 *
 * Handles registration, unregistration, and namespace resolution
 * for shader plugins.
 */

import type {
  IPluginManager,
  IShaderManager,
  IShaderRegistry,
  ShaderPlugin,
  PluginState,
  ShaderDefinition,
  PluginValidationResult,
  PluginValidationError,
  PluginValidationWarning,
} from '../types';

/**
 * Namespace separator used in shader names
 */
export const NAMESPACE_SEPARATOR = ':';

/**
 * Validates a semantic version string
 */
function isValidSemVer(version: string): boolean {
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
  return semverRegex.test(version);
}

/**
 * Validates a plugin definition
 */
export function validatePlugin(plugin: ShaderPlugin): PluginValidationResult {
  const errors: PluginValidationError[] = [];
  const warnings: PluginValidationWarning[] = [];

  // Required fields
  if (!plugin.name || typeof plugin.name !== 'string' || plugin.name.trim() === '') {
    errors.push({
      code: 'MISSING_NAME',
      message: 'Plugin must have a non-empty name',
      field: 'name',
    });
  } else if (plugin.name.includes(NAMESPACE_SEPARATOR)) {
    errors.push({
      code: 'MISSING_NAME',
      message: `Plugin name cannot contain '${NAMESPACE_SEPARATOR}'`,
      field: 'name',
    });
  }

  if (!plugin.version || typeof plugin.version !== 'string') {
    errors.push({
      code: 'MISSING_VERSION',
      message: 'Plugin must have a version',
      field: 'version',
    });
  } else if (!isValidSemVer(plugin.version)) {
    errors.push({
      code: 'INVALID_VERSION',
      message: `Invalid version format: ${plugin.version}. Expected semver (e.g., 1.0.0)`,
      field: 'version',
    });
  }

  if (!plugin.shaders || !Array.isArray(plugin.shaders) || plugin.shaders.length === 0) {
    errors.push({
      code: 'NO_SHADERS',
      message: 'Plugin must include at least one shader',
      field: 'shaders',
    });
  } else {
    // Validate each shader
    const shaderNames = new Set<string>();
    for (let i = 0; i < plugin.shaders.length; i++) {
      const shader = plugin.shaders[i];
      if (!shader || !shader.name) {
        errors.push({
          code: 'INVALID_SHADER',
          message: `Shader at index ${i} is invalid or missing name`,
          field: `shaders[${i}]`,
        });
      } else if (shaderNames.has(shader.name)) {
        errors.push({
          code: 'DUPLICATE_SHADER',
          message: `Duplicate shader name: ${shader.name}`,
          field: `shaders[${i}].name`,
        });
      } else {
        shaderNames.add(shader.name);
      }
    }
  }

  // Warnings for optional but recommended fields
  if (!plugin.author) {
    warnings.push({
      code: 'MISSING_AUTHOR',
      message: 'Plugin has no author specified',
      field: 'author',
    });
  }

  if (!plugin.description) {
    warnings.push({
      code: 'MISSING_DESCRIPTION',
      message: 'Plugin has no description',
      field: 'description',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * PluginManager implementation
 *
 * Manages the lifecycle of shader plugins including:
 * - Registration with namespace support
 * - Shader name resolution
 * - Lifecycle hook execution
 * - Plugin state tracking
 */
export class PluginManager implements IPluginManager {
  private plugins: Map<string, PluginState> = new Map();
  private shaderToPlugin: Map<string, string> = new Map();
  private registry: IShaderRegistry;
  private manager: IShaderManager | null = null;
  private debug: boolean;

  constructor(registry: IShaderRegistry, options: { debug?: boolean } = {}) {
    this.registry = registry;
    this.debug = options.debug ?? false;
  }

  /**
   * Set the shader manager reference (called by ShaderManager)
   */
  setManager(manager: IShaderManager): void {
    this.manager = manager;
  }

  /**
   * Register a plugin
   */
  use(plugin: ShaderPlugin): void {
    // Validate plugin
    const validation = validatePlugin(plugin);
    if (!validation.valid) {
      const errorMessages = validation.errors.map((e) => e.message).join('; ');
      throw new Error(`[PluginManager] Invalid plugin: ${errorMessages}`);
    }

    // Log warnings
    if (this.debug && validation.warnings.length > 0) {
      validation.warnings.forEach((w) => {
        console.warn(`[PluginManager] Warning for plugin "${plugin.name}": ${w.message}`);
      });
    }

    // Check if already registered
    if (this.plugins.has(plugin.name)) {
      throw new Error(`[PluginManager] Plugin "${plugin.name}" is already registered`);
    }

    // Determine if using namespace
    const useNamespace = plugin.useNamespace !== false;

    // Register shaders
    const registeredShaders: string[] = [];

    for (const shader of plugin.shaders) {
      const namespacedName = useNamespace
        ? `${plugin.name}${NAMESPACE_SEPARATOR}${shader.name}`
        : shader.name;

      // Check for conflicts
      if (this.registry.has(namespacedName)) {
        throw new Error(
          `[PluginManager] Shader name conflict: "${namespacedName}" is already registered`
        );
      }

      // Also check if the non-namespaced name would conflict (for resolution)
      if (!useNamespace && this.shaderToPlugin.has(shader.name)) {
        const existingPlugin = this.shaderToPlugin.get(shader.name);
        throw new Error(
          `[PluginManager] Shader "${shader.name}" conflicts with plugin "${existingPlugin}"`
        );
      }

      // Register with the shader registry
      const registrationShader: ShaderDefinition = {
        ...shader,
        name: namespacedName,
      };
      this.registry.register(registrationShader);

      // Track the mapping
      this.shaderToPlugin.set(namespacedName, plugin.name);
      if (useNamespace) {
        // Also map the short name for resolution
        this.shaderToPlugin.set(shader.name, plugin.name);
      }

      registeredShaders.push(namespacedName);

      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log(
          `[PluginManager] Registered shader "${namespacedName}" from plugin "${plugin.name}"`
        );
      }
    }

    // Create plugin state
    const state: PluginState = {
      plugin,
      active: true,
      registeredAt: Date.now(),
      registeredShaders,
    };

    this.plugins.set(plugin.name, state);

    // Call onRegister hook
    if (plugin.onRegister && this.manager) {
      try {
        plugin.onRegister(this.manager);
      } catch (error) {
        console.error(
          `[PluginManager] Error in onRegister hook for plugin "${plugin.name}":`,
          error
        );
      }
    }

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(
        `[PluginManager] Plugin "${plugin.name}" v${plugin.version} registered with ${registeredShaders.length} shaders`
      );
    }
  }

  /**
   * Unregister a plugin
   */
  unuse(pluginName: string): boolean {
    const state = this.plugins.get(pluginName);
    if (!state) {
      if (this.debug) {
        console.warn(`[PluginManager] Plugin "${pluginName}" is not registered`);
      }
      return false;
    }

    // Call onUnregister hook
    if (state.plugin.onUnregister && this.manager) {
      try {
        state.plugin.onUnregister(this.manager);
      } catch (error) {
        console.error(
          `[PluginManager] Error in onUnregister hook for plugin "${pluginName}":`,
          error
        );
      }
    }

    // Unregister all shaders
    for (const shaderName of state.registeredShaders) {
      this.registry.unregister(shaderName);
      this.shaderToPlugin.delete(shaderName);
    }

    // Also clean up short name mappings
    for (const shader of state.plugin.shaders) {
      this.shaderToPlugin.delete(shader.name);
    }

    this.plugins.delete(pluginName);

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(`[PluginManager] Plugin "${pluginName}" unregistered`);
    }

    return true;
  }

  /**
   * Get a plugin by name
   */
  getPlugin(name: string): ShaderPlugin | undefined {
    return this.plugins.get(name)?.plugin;
  }

  /**
   * Check if a plugin is registered
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * List all registered plugin names
   */
  listPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get plugin state
   */
  getPluginState(name: string): PluginState | undefined {
    return this.plugins.get(name);
  }

  /**
   * Resolve a shader name to its fully qualified name
   *
   * Handles:
   * - Fully qualified names (plugin:shader) - returns as-is if valid
   * - Short names (shader) - returns namespaced name if unambiguous
   */
  resolveShaderName(name: string): string | undefined {
    // If already in registry, return as-is
    if (this.registry.has(name)) {
      return name;
    }

    // Check if it's a short name that needs resolution
    if (!name.includes(NAMESPACE_SEPARATOR)) {
      const pluginName = this.shaderToPlugin.get(name);
      if (pluginName) {
        const fullName = `${pluginName}${NAMESPACE_SEPARATOR}${name}`;
        if (this.registry.has(fullName)) {
          return fullName;
        }
      }
    }

    return undefined;
  }

  /**
   * Get the plugin that provides a shader
   */
  getShaderPlugin(shaderName: string): ShaderPlugin | undefined {
    const pluginName = this.shaderToPlugin.get(shaderName);
    if (pluginName) {
      return this.getPlugin(pluginName);
    }
    return undefined;
  }

  /**
   * Get a preset from a plugin
   */
  getPreset(
    pluginName: string,
    presetName: string
  ): { shader: string; config: Record<string, unknown> } | undefined {
    const plugin = this.getPlugin(pluginName);
    if (!plugin?.presets) {
      return undefined;
    }
    return plugin.presets[presetName];
  }

  /**
   * Get all available presets across all plugins
   */
  getAllPresets(): Array<{ plugin: string; preset: string; shader: string }> {
    const presets: Array<{ plugin: string; preset: string; shader: string }> = [];

    for (const [pluginName, state] of this.plugins) {
      const plugin = state.plugin;
      if (plugin.presets) {
        for (const [presetName, presetConfig] of Object.entries(plugin.presets)) {
          presets.push({
            plugin: pluginName,
            preset: presetName,
            shader: presetConfig.shader,
          });
        }
      }
    }

    return presets;
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    // Unregister all plugins in reverse order
    const pluginNames = Array.from(this.plugins.keys()).reverse();
    for (const name of pluginNames) {
      this.unuse(name);
    }
  }

  /**
   * Get statistics about registered plugins
   */
  getStats(): {
    pluginCount: number;
    shaderCount: number;
    presetCount: number;
  } {
    let shaderCount = 0;
    let presetCount = 0;

    for (const state of this.plugins.values()) {
      shaderCount += state.registeredShaders.length;
      presetCount += Object.keys(state.plugin.presets ?? {}).length;
    }

    return {
      pluginCount: this.plugins.size,
      shaderCount,
      presetCount,
    };
  }
}
