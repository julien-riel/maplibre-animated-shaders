/**
 * Plugin System
 *
 * Provides infrastructure for registering and managing shader plugins.
 */

export { PluginManager, validatePlugin, NAMESPACE_SEPARATOR } from './PluginManager';

// Built-in plugins (synchronous imports)
export {
  datavizPlugin,
  atmosphericPlugin,
  scifiPlugin,
  organicPlugin,
  corePlugin,
} from './builtin';

// Lazy loading support
export {
  loadPlugin,
  loadPlugins,
  preloadPlugins,
  loadDatavizPlugin,
  loadAtmosphericPlugin,
  loadScifiPlugin,
  loadOrganicPlugin,
  loadCorePlugin,
  pluginLoaders,
} from './loaders';
export type { BuiltinPluginName, PluginLoader } from './loaders';
