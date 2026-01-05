/**
 * useShaderManager - Hook for managing shader lifecycle
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  ShaderManager,
  globalRegistry,
  examplePlugin,
  PluginManager,
} from 'maplibre-animated-shaders';
import type { ShaderDefinition } from 'maplibre-animated-shaders';
import type { UseShaderManagerOptions, UseShaderManagerReturn } from '../types';

/**
 * Hook for managing the ShaderManager lifecycle
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { manager, listShaders, getShader } = useShaderManager({
 *     autoInit: true,
 *   });
 *
 *   const availableShaders = listShaders();
 *
 *   return (
 *     <select>
 *       {availableShaders.map(name => (
 *         <option key={name} value={name}>
 *           {getShader(name)?.displayName ?? name}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useShaderManager(
  options: UseShaderManagerOptions = {}
): UseShaderManagerReturn {
  const { autoInit = true } = options;

  const [manager, setManager] = useState<ShaderManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const pluginManagerRef = useRef<PluginManager | null>(null);

  // Initialize on mount
  useEffect(() => {
    if (!autoInit) return;

    // Register built-in shaders if not already done
    if (!pluginManagerRef.current) {
      pluginManagerRef.current = new PluginManager(globalRegistry);
      pluginManagerRef.current.use(examplePlugin);
    }

    const newManager = new ShaderManager(globalRegistry);
    setManager(newManager);
    setIsInitialized(true);

    return () => {
      newManager.destroy();
      setManager(null);
      setIsInitialized(false);
    };
  }, [autoInit]);

  // Register shader
  const register = useCallback((name: string, definition: ShaderDefinition) => {
    globalRegistry.register({ ...definition, name });
  }, []);

  // Unregister shader
  const unregister = useCallback((name: string) => {
    globalRegistry.unregister(name);
  }, []);

  // List shaders
  const listShaders = useCallback(() => {
    return globalRegistry.list();
  }, []);

  // Get shader
  const getShader = useCallback((name: string) => {
    return globalRegistry.get(name);
  }, []);

  return useMemo(
    () => ({
      manager,
      isInitialized,
      register,
      unregister,
      listShaders,
      getShader,
    }),
    [manager, isInitialized, register, unregister, listShaders, getShader]
  );
}
