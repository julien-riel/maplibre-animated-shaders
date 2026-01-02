/**
 * Plugin System
 *
 * Provides infrastructure for registering and managing shader plugins.
 */

export { PluginManager, validatePlugin, NAMESPACE_SEPARATOR } from './PluginManager';

// Built-in plugins
export {
  datavizPlugin,
  atmosphericPlugin,
  scifiPlugin,
  organicPlugin,
  corePlugin,
} from './builtin';
