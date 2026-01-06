/**
 * useShaderRegistry - Composable for accessing the shader registry
 */

import { globalRegistry } from 'maplibre-animated-shaders';
import type { ShaderDefinition, GeometryType } from 'maplibre-animated-shaders';
import type { UseShaderRegistryReturn } from '../types';

/**
 * Composable for accessing and managing the global shader registry
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { computed } from 'vue';
 * import { useShaderRegistry } from '@maplibre-animated-shaders/vue';
 *
 * const { list, get, has } = useShaderRegistry();
 *
 * const pointShaders = computed(() => list('point'));
 * const fillShaders = computed(() => list('fill'));
 * </script>
 * ```
 */
export function useShaderRegistry(): UseShaderRegistryReturn {
  const list = (geometry?: GeometryType) => {
    return globalRegistry.list(geometry);
  };

  const get = (name: string) => {
    return globalRegistry.get(name);
  };

  const has = (name: string) => {
    return globalRegistry.has(name);
  };

  const register = (definition: ShaderDefinition) => {
    globalRegistry.register(definition);
  };

  const unregister = (name: string) => {
    globalRegistry.unregister(name);
  };

  const count = () => {
    return globalRegistry.list().length;
  };

  return {
    list,
    get,
    has,
    register,
    unregister,
    count,
  };
}
