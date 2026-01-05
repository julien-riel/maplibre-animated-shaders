/**
 * @maplibre-animated-shaders/vue
 *
 * Vue 3 bindings for MapLibre Animated Shaders
 *
 * @packageDocumentation
 */

// Composables
export { useShaderEffect } from './composables/useShaderEffect';
export { useShaderManager } from './composables/useShaderManager';
export { useShaderRegistry } from './composables/useShaderRegistry';
export { usePerformanceMonitor } from './composables/usePerformanceMonitor';

// Components
export { default as ShaderLayer } from './components/ShaderLayer.vue';
export { default as AnimatedMap } from './components/AnimatedMap.vue';

// Types
export type {
  UseShaderEffectOptions,
  UseShaderEffectReturn,
  UseShaderManagerReturn,
  UseShaderRegistryReturn,
  UsePerformanceMonitorOptions,
  UsePerformanceMonitorReturn,
  ShaderLayerProps,
  AnimatedMapProps,
} from './types';
