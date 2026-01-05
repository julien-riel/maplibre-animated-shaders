/**
 * @maplibre-animated-shaders/react
 *
 * React bindings for MapLibre Animated Shaders
 *
 * @packageDocumentation
 */

// Hooks
export { useShaderEffect } from './hooks/useShaderEffect';
export { useShaderManager } from './hooks/useShaderManager';
export { useShaderRegistry } from './hooks/useShaderRegistry';
export { usePerformanceMonitor } from './hooks/usePerformanceMonitor';

// Components
export { ShaderLayer } from './components/ShaderLayer';
export { AnimatedMap } from './components/AnimatedMap';
export { ShaderProvider, useShaderContext } from './components/ShaderProvider';

// Types
export type {
  UseShaderEffectOptions,
  UseShaderEffectReturn,
  UseShaderManagerOptions,
  UseShaderManagerReturn,
  ShaderLayerProps,
  AnimatedMapProps,
  ShaderProviderProps,
  ShaderContextValue,
} from './types';
