/**
 * useShaderManager - Composable for shader lifecycle management
 */

import { ref, onMounted, onUnmounted } from 'vue';
import {
  ShaderManager,
  globalRegistry,
  examplePlugin,
  PluginManager,
} from 'maplibre-animated-shaders';
import type { ShaderDefinition, GeometryType } from 'maplibre-animated-shaders';
import type { UseShaderManagerReturn } from '../types';

let pluginManagerInitialized = false;

/**
 * Composable for managing the ShaderManager lifecycle
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useShaderManager } from '@maplibre-animated-shaders/vue';
 *
 * const { manager, listShaders, getShader } = useShaderManager();
 *
 * const shaders = computed(() => listShaders());
 * </script>
 * ```
 */
export function useShaderManager(): UseShaderManagerReturn {
  const manager = ref<ShaderManager | null>(null);
  const isInitialized = ref(false);

  // Initialize on mount
  onMounted(() => {
    // Register built-in shaders once
    if (!pluginManagerInitialized) {
      const pluginManager = new PluginManager(globalRegistry);
      pluginManager.use(examplePlugin);
      pluginManagerInitialized = true;
    }

    manager.value = new ShaderManager(globalRegistry);
    isInitialized.value = true;
  });

  // Cleanup on unmount
  onUnmounted(() => {
    if (manager.value) {
      manager.value.destroy();
      manager.value = null;
    }
    isInitialized.value = false;
  });

  // Register shader
  const register = (name: string, definition: ShaderDefinition) => {
    globalRegistry.register({ ...definition, name });
  };

  // Unregister shader
  const unregister = (name: string) => {
    globalRegistry.unregister(name);
  };

  // List shaders
  const listShaders = (geometry?: GeometryType) => {
    return globalRegistry.list(geometry);
  };

  // Get shader
  const getShader = (name: string) => {
    return globalRegistry.get(name);
  };

  return {
    manager,
    isInitialized,
    register,
    unregister,
    listShaders,
    getShader,
  };
}
