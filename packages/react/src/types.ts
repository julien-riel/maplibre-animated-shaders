/**
 * Type definitions for @maplibre-animated-shaders/react
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import type {
  ShaderManager,
  ShaderDefinition,
  ShaderConfig,
  PerformanceMetrics,
} from 'maplibre-animated-shaders';
import type { ReactNode, RefObject } from 'react';

/**
 * Options for useShaderEffect hook
 */
export interface UseShaderEffectOptions {
  /** The MapLibre map instance */
  map: MapLibreMap | null;
  /** Name of the shader to apply */
  shaderName: string | null;
  /** Shader configuration */
  config?: ShaderConfig;
  /** Layer ID (auto-generated if not provided) */
  layerId?: string;
  /** Source ID (auto-generated if not provided) */
  sourceId?: string;
  /** GeoJSON data for the shader layer */
  data?: GeoJSON.FeatureCollection | GeoJSON.Feature | string;
  /** Whether the effect is enabled */
  enabled?: boolean;
  /** Callback when shader is applied */
  onApply?: (layerId: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Return value from useShaderEffect hook
 */
export interface UseShaderEffectReturn {
  /** Current layer ID */
  layerId: string | null;
  /** Whether the shader is currently applied */
  isApplied: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Update shader configuration */
  updateConfig: (config: Partial<ShaderConfig>) => void;
  /** Remove the shader effect */
  remove: () => void;
}

/**
 * Options for useShaderManager hook
 */
export interface UseShaderManagerOptions {
  /** Auto-initialize on mount */
  autoInit?: boolean;
  /** Custom shader registry */
  registry?: Map<string, ShaderDefinition>;
}

/**
 * Return value from useShaderManager hook
 */
export interface UseShaderManagerReturn {
  /** The shader manager instance */
  manager: ShaderManager | null;
  /** Whether the manager is initialized */
  isInitialized: boolean;
  /** Register a shader */
  register: (name: string, definition: ShaderDefinition) => void;
  /** Unregister a shader */
  unregister: (name: string) => void;
  /** List available shaders */
  listShaders: () => string[];
  /** Get a shader definition */
  getShader: (name: string) => ShaderDefinition | undefined;
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
  data?: GeoJSON.FeatureCollection | GeoJSON.Feature | string;
  /** Whether the layer is visible */
  visible?: boolean;
  /** Whether animation is playing */
  playing?: boolean;
  /** Layer order (before this layer ID) */
  beforeId?: string;
  /** Callback when layer is added */
  onAdd?: (layerId: string) => void;
  /** Callback when layer is removed */
  onRemove?: (layerId: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
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
  style?: string | maplibregl.StyleSpecification;
  /** Container class name */
  className?: string;
  /** Container style */
  containerStyle?: React.CSSProperties;
  /** Map options */
  mapOptions?: Partial<maplibregl.MapOptions>;
  /** Callback when map is ready */
  onMapReady?: (map: MapLibreMap) => void;
  /** Callback on map error */
  onError?: (error: Error) => void;
  /** Child components (ShaderLayer, etc.) */
  children?: ReactNode;
}

/**
 * Props for ShaderProvider component
 */
export interface ShaderProviderProps {
  /** Child components */
  children: ReactNode;
  /** Pre-registered shaders */
  shaders?: Record<string, ShaderDefinition>;
  /** Enable built-in shaders */
  useBuiltinShaders?: boolean;
}

/**
 * Context value for ShaderProvider
 */
export interface ShaderContextValue {
  /** Shader manager instance */
  manager: ShaderManager | null;
  /** Shader registry */
  registry: Map<string, ShaderDefinition>;
  /** Register a shader */
  registerShader: (name: string, definition: ShaderDefinition) => void;
  /** Unregister a shader */
  unregisterShader: (name: string) => void;
  /** List available shaders */
  listShaders: () => string[];
  /** Get shader by name */
  getShader: (name: string) => ShaderDefinition | undefined;
}

/**
 * Options for usePerformanceMonitor hook
 */
export interface UsePerformanceMonitorOptions {
  /** Enable monitoring */
  enabled?: boolean;
  /** Update interval in ms */
  updateInterval?: number;
  /** Canvas element ref for context loss tracking */
  canvasRef?: RefObject<HTMLCanvasElement>;
  /** Callback on metrics update */
  onMetrics?: (metrics: PerformanceMetrics) => void;
  /** Callback on performance warning */
  onWarning?: (type: string, message: string) => void;
}

/**
 * Return value from usePerformanceMonitor hook
 */
export interface UsePerformanceMonitorReturn {
  /** Current metrics */
  metrics: PerformanceMetrics | null;
  /** Whether monitoring is active */
  isMonitoring: boolean;
  /** Start monitoring */
  start: () => void;
  /** Stop monitoring */
  stop: () => void;
  /** Reset metrics */
  reset: () => void;
}
