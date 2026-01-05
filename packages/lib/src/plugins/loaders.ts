/**
 * Plugin Lazy Loaders
 *
 * Provides dynamic import functions for built-in plugins.
 * Use these loaders to reduce initial bundle size by loading
 * plugins only when needed.
 *
 * @example
 * ```typescript
 * // Instead of importing all plugins at once:
 * // import { examplePlugin } from 'maplibre-animated-shaders';
 *
 * // Load plugins on demand:
 * const { loadExamplePlugin } = await import('maplibre-animated-shaders/plugins/loaders');
 * const examplePlugin = await loadExamplePlugin();
 * shaderManager.use(examplePlugin);
 * ```
 */

import type { ShaderPlugin } from '../types';

/**
 * Available plugin names for lazy loading
 */
export type BuiltinPluginName = 'example';

/**
 * Plugin loader function type
 */
export type PluginLoader = () => Promise<ShaderPlugin>;

/**
 * Lazy load the example plugin
 *
 * Includes demonstration shaders for all geometry types:
 * - point: Pulse Marker (per-feature timing, easing, SDF)
 * - line: Flow Line (direction, gradient, glow)
 * - polygon: Wave Polygon (simplex noise, FBM, patterns)
 * - global: Grid Overlay (hash functions, scan effects)
 */
export async function loadExamplePlugin(): Promise<ShaderPlugin> {
  const module = await import('./builtin/example');
  return module.examplePlugin;
}

/**
 * Map of plugin names to their loaders
 */
export const pluginLoaders: Record<BuiltinPluginName, PluginLoader> = {
  example: loadExamplePlugin,
};

/**
 * Load a plugin by name
 *
 * @param name - Plugin name to load
 * @returns Promise resolving to the plugin
 * @throws Error if plugin name is not recognized
 *
 * @example
 * ```typescript
 * const plugin = await loadPlugin('example');
 * shaderManager.use(plugin);
 * ```
 */
export async function loadPlugin(name: BuiltinPluginName): Promise<ShaderPlugin> {
  const loader = pluginLoaders[name];
  if (!loader) {
    throw new Error(
      `Unknown plugin: "${name}". Available plugins: ${Object.keys(pluginLoaders).join(', ')}`
    );
  }
  return loader();
}

/**
 * Load multiple plugins in parallel
 *
 * @param names - Array of plugin names to load
 * @returns Promise resolving to array of plugins
 *
 * @example
 * ```typescript
 * const plugins = await loadPlugins(['example']);
 * plugins.forEach(plugin => shaderManager.use(plugin));
 * ```
 */
export async function loadPlugins(names: BuiltinPluginName[]): Promise<ShaderPlugin[]> {
  return Promise.all(names.map(loadPlugin));
}

/**
 * Preload plugins in the background
 *
 * This triggers the dynamic import but doesn't block.
 * Useful for preloading plugins that might be needed soon.
 *
 * @param names - Array of plugin names to preload
 *
 * @example
 * ```typescript
 * // Start loading in background while user interacts
 * preloadPlugins(['example']);
 *
 * // Later, when actually needed, load will be instant
 * const plugin = await loadPlugin('example');
 * ```
 */
export function preloadPlugins(names: BuiltinPluginName[]): void {
  names.forEach((name) => {
    const loader = pluginLoaders[name];
    if (loader) {
      // Trigger import but don't await
      loader().catch(() => {
        // Silently ignore preload errors
      });
    }
  });
}
