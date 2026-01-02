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
 * // import { datavizPlugin, atmosphericPlugin } from 'maplibre-animated-shaders';
 *
 * // Load plugins on demand:
 * const { loadDatavizPlugin, loadAtmosphericPlugin } = await import('maplibre-animated-shaders/plugins/loaders');
 * const datavizPlugin = await loadDatavizPlugin();
 * shaderManager.use(datavizPlugin);
 * ```
 */

import type { ShaderPlugin } from '../types';

/**
 * Available plugin names for lazy loading
 */
export type BuiltinPluginName = 'dataviz' | 'atmospheric' | 'scifi' | 'organic' | 'core';

/**
 * Plugin loader function type
 */
export type PluginLoader = () => Promise<ShaderPlugin>;

/**
 * Lazy load the dataviz plugin
 *
 * Includes shaders for data visualization:
 * - pulse, heartbeat, radar (points)
 * - flow, gradientTravel, breathing, snake (lines)
 * - scanLines, fillWave, marchingAnts (polygons)
 */
export async function loadDatavizPlugin(): Promise<ShaderPlugin> {
  const module = await import('./builtin/dataviz');
  return module.datavizPlugin;
}

/**
 * Lazy load the atmospheric plugin
 *
 * Includes shaders for weather and atmospheric effects:
 * - weather, depthFog, dayNightCycle (global)
 * - ripple, noise (polygons)
 */
export async function loadAtmosphericPlugin(): Promise<ShaderPlugin> {
  const module = await import('./builtin/atmospheric');
  return module.atmosphericPlugin;
}

/**
 * Lazy load the scifi plugin
 *
 * Includes shaders for futuristic/tech effects:
 * - radar, glow (points)
 * - electric, neon (lines)
 * - holographicGrid, heatShimmer (global)
 */
export async function loadScifiPlugin(): Promise<ShaderPlugin> {
  const module = await import('./builtin/scifi');
  return module.scifiPlugin;
}

/**
 * Lazy load the organic plugin
 *
 * Includes shaders for natural/organic effects:
 * - heartbeat, particleBurst, morphingShapes (points)
 * - trailFade (lines)
 * - hatching, gradientRotation, dissolve (polygons)
 */
export async function loadOrganicPlugin(): Promise<ShaderPlugin> {
  const module = await import('./builtin/organic');
  return module.organicPlugin;
}

/**
 * Lazy load the core plugin
 *
 * Includes all built-in shaders for backwards compatibility.
 * This is the largest plugin - prefer loading thematic plugins
 * if you only need specific shaders.
 */
export async function loadCorePlugin(): Promise<ShaderPlugin> {
  const module = await import('./builtin/core');
  return module.corePlugin;
}

/**
 * Map of plugin names to their loaders
 */
export const pluginLoaders: Record<BuiltinPluginName, PluginLoader> = {
  dataviz: loadDatavizPlugin,
  atmospheric: loadAtmosphericPlugin,
  scifi: loadScifiPlugin,
  organic: loadOrganicPlugin,
  core: loadCorePlugin,
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
 * const plugin = await loadPlugin('dataviz');
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
 * const plugins = await loadPlugins(['dataviz', 'atmospheric']);
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
 * preloadPlugins(['atmospheric', 'scifi']);
 *
 * // Later, when actually needed, load will be instant
 * const plugin = await loadPlugin('atmospheric');
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
