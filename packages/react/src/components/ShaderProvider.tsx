/**
 * ShaderProvider - Context provider for shader management
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  ShaderManager,
  globalRegistry,
  examplePlugin,
  PluginManager,
} from 'maplibre-animated-shaders';
import type { ShaderDefinition } from 'maplibre-animated-shaders';
import type { ShaderProviderProps, ShaderContextValue } from '../types';

const ShaderContext = createContext<ShaderContextValue | null>(null);

/**
 * Provider component for shader context
 *
 * Provides shader management capabilities to all child components.
 * Automatically registers built-in shaders when useBuiltinShaders is true.
 *
 * @example
 * ```tsx
 * function App() {
 *   const customShaders = {
 *     'my-shader': {
 *       name: 'my-shader',
 *       displayName: 'My Custom Shader',
 *       // ... shader definition
 *     },
 *   };
 *
 *   return (
 *     <ShaderProvider
 *       useBuiltinShaders={true}
 *       shaders={customShaders}
 *     >
 *       <MyMap />
 *     </ShaderProvider>
 *   );
 * }
 * ```
 */
export function ShaderProvider({
  children,
  shaders = {},
  useBuiltinShaders = true,
}: ShaderProviderProps): React.ReactElement {
  const [manager, setManager] = useState<ShaderManager | null>(null);
  const [registry] = useState(() => new Map<string, ShaderDefinition>());

  // Initialize
  useEffect(() => {
    // Register built-in shaders
    if (useBuiltinShaders) {
      const pluginManager = new PluginManager(globalRegistry);
      pluginManager.use(examplePlugin);
    }

    // Register custom shaders
    Object.entries(shaders).forEach(([name, definition]) => {
      globalRegistry.register({ ...definition, name });
      registry.set(name, definition);
    });

    // Create manager
    const newManager = new ShaderManager(globalRegistry);
    setManager(newManager);

    return () => {
      newManager.destroy();
      setManager(null);
    };
  }, [useBuiltinShaders]);

  // Register shader
  const registerShader = useCallback(
    (name: string, definition: ShaderDefinition) => {
      globalRegistry.register({ ...definition, name });
      registry.set(name, definition);
    },
    [registry]
  );

  // Unregister shader
  const unregisterShader = useCallback(
    (name: string) => {
      globalRegistry.unregister(name);
      registry.delete(name);
    },
    [registry]
  );

  // List shaders
  const listShaders = useCallback(() => {
    return globalRegistry.list();
  }, []);

  // Get shader
  const getShader = useCallback((name: string) => {
    return globalRegistry.get(name);
  }, []);

  const contextValue = useMemo<ShaderContextValue>(
    () => ({
      manager,
      registry,
      registerShader,
      unregisterShader,
      listShaders,
      getShader,
    }),
    [manager, registry, registerShader, unregisterShader, listShaders, getShader]
  );

  return <ShaderContext.Provider value={contextValue}>{children}</ShaderContext.Provider>;
}

/**
 * Hook to access the shader context
 *
 * @example
 * ```tsx
 * function ShaderPicker() {
 *   const { listShaders, getShader } = useShaderContext();
 *
 *   return (
 *     <select>
 *       {listShaders().map(name => (
 *         <option key={name} value={name}>
 *           {getShader(name)?.displayName}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useShaderContext(): ShaderContextValue {
  const context = useContext(ShaderContext);
  if (!context) {
    throw new Error('useShaderContext must be used within a ShaderProvider');
  }
  return context;
}
