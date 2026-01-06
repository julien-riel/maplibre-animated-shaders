/**
 * Plugin System
 *
 * Provides infrastructure for registering and managing shader plugins.
 */

export { PluginManager, validatePlugin, NAMESPACE_SEPARATOR } from './PluginManager';

// Built-in plugins (synchronous imports)
export { examplePlugin } from './builtin';

// Lazy loading support
export {
  loadPlugin,
  loadPlugins,
  preloadPlugins,
  loadExamplePlugin,
  pluginLoaders,
} from './loaders';
export type { BuiltinPluginName, PluginLoader } from './loaders';
