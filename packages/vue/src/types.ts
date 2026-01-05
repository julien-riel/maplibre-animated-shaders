/**
 * Type definitions for @maplibre-animated-shaders/vue
 */

import type { Ref } from 'vue';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type {
  ShaderManager,
  ShaderDefinition,
  ShaderConfig,
  PerformanceMetrics,
  GeometryType,
} from 'maplibre-animated-shaders';

/**
 * Options for useShaderEffect composable
 */
export interface UseShaderEffectOptions {
  /** The MapLibre map instance */
  map: Ref<MapLibreMap | null>;
  /** Name of the shader to apply */
  shaderName: Ref<string | null>;
  /** Shader configuration */
  config?: Ref<ShaderConfig>;
  /** Layer ID (auto-generated if not provided) */
  layerId?: string;
  /** Source ID (auto-generated if not provided) */
  sourceId?: string;
  /** GeoJSON data for the shader layer */
  data?: Ref<GeoJSON.FeatureCollection | GeoJSON.Feature | null>;
  /** Whether the effect is enabled */
  enabled?: Ref<boolean>;
}

/**
 * Return value from useShaderEffect composable
 */
export interface UseShaderEffectReturn {
  /** Current layer ID */
  layerId: Ref<string | null>;
  /** Whether the shader is currently applied */
  isApplied: Ref<boolean>;
  /** Any error that occurred */
  error: Ref<Error | null>;
  /** Update shader configuration */
  updateConfig: (config: Partial<ShaderConfig>) => void;
  /** Remove the shader effect */
  remove: () => void;
}

/**
 * Return value from useShaderManager composable
 */
export interface UseShaderManagerReturn {
  /** The shader manager instance */
  manager: Ref<ShaderManager | null>;
  /** Whether the manager is initialized */
  isInitialized: Ref<boolean>;
  /** Register a shader */
  register: (name: string, definition: ShaderDefinition) => void;
  /** Unregister a shader */
  unregister: (name: string) => void;
  /** List available shaders */
  listShaders: (geometry?: GeometryType) => string[];
  /** Get a shader definition */
  getShader: (name: string) => ShaderDefinition | undefined;
}

/**
 * Return value from useShaderRegistry composable
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
 * Options for usePerformanceMonitor composable
 */
export interface UsePerformanceMonitorOptions {
  /** Enable monitoring */
  enabled?: Ref<boolean>;
  /** Update interval in ms */
  updateInterval?: number;
  /** Canvas element ref for context loss tracking */
  canvas?: Ref<HTMLCanvasElement | null>;
}

/**
 * Return value from usePerformanceMonitor composable
 */
export interface UsePerformanceMonitorReturn {
  /** Current metrics */
  metrics: Ref<PerformanceMetrics | null>;
  /** Whether monitoring is active */
  isMonitoring: Ref<boolean>;
  /** Start monitoring */
  start: () => void;
  /** Stop monitoring */
  stop: () => void;
  /** Reset metrics */
  reset: () => void;
}

/**
 * Props for ShaderLayer component
 */
export interface ShaderLayerProps {
  /** The MapLibre map instance */
  map: MapLibreMap;
  /** Shader name from registry */
  shaderName: string;
  /** Unique layer ID */
  id?: string;
  /** Shader configuration */
  config?: ShaderConfig;
  /** GeoJSON data source */
  data?: GeoJSON.FeatureCollection | GeoJSON.Feature;
  /** Whether the layer is visible */
  visible?: boolean;
  /** Layer order (before this layer ID) */
  beforeId?: string;
}

/**
 * Props for AnimatedMap component
 */
export interface AnimatedMapProps {
  /** Initial map center [lng, lat] */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  /** Map style URL or style object */
  style?: string;
  /** Map options */
  mapOptions?: Record<string, unknown>;
}
