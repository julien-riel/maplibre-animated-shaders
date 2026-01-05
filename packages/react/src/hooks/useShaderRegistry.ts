/**
 * useShaderRegistry - Hook for accessing the shader registry
 */

import { useCallback, useMemo } from 'react';
import { globalRegistry } from 'maplibre-animated-shaders';
import type { ShaderDefinition, GeometryType } from 'maplibre-animated-shaders';

/**
 * Return type for useShaderRegistry hook
 */
export interface UseShaderRegistryReturn {
  /** List all registered shaders */
  list: (geometry?: GeometryType) => string[];
  /** Get a shader by name */
  get: (name: string) => ShaderDefinition | undefined;
  /** Check if a shader exists */
  has: (name: string) => boolean;
  /** Register a new shader */
  register: (definition: ShaderDefinition) => void;
  /** Unregister a shader */
  unregister: (name: string) => void;
  /** Get shader count */
  count: () => number;
}

/**
 * Hook for accessing and managing the global shader registry
 *
 * @example
 * ```tsx
 * function ShaderPicker() {
 *   const { list, get } = useShaderRegistry();
 *
 *   const pointShaders = list('point');
 *   const fillShaders = list('fill');
 *
 *   return (
 *     <div>
 *       <h3>Point Effects</h3>
 *       {pointShaders.map(name => (
 *         <button key={name}>{get(name)?.displayName}</button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useShaderRegistry(): UseShaderRegistryReturn {
  const list = useCallback((geometry?: GeometryType) => {
    return globalRegistry.list(geometry);
  }, []);

  const get = useCallback((name: string) => {
    return globalRegistry.get(name);
  }, []);

  const has = useCallback((name: string) => {
    return globalRegistry.has(name);
  }, []);

  const register = useCallback((definition: ShaderDefinition) => {
    globalRegistry.register(definition);
  }, []);

  const unregister = useCallback((name: string) => {
    globalRegistry.unregister(name);
  }, []);

  const count = useCallback(() => {
    return globalRegistry.list().length;
  }, []);

  return useMemo(
    () => ({
      list,
      get,
      has,
      register,
      unregister,
      count,
    }),
    [list, get, has, register, unregister, count]
  );
}
