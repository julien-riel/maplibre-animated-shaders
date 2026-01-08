/**
 * Shared state for ShaderManager modules.
 * Provides centralized state management and utility functions.
 */

import type {
  MapLibreMapInstance,
  ShaderInstance,
  ShaderManagerOptions,
  MetricsConfig,
} from '../types';
import { AnimationLoop } from '../AnimationLoop';
import { ConfigResolver } from '../ConfigResolver';
import { globalRegistry, ShaderRegistry } from '../ShaderRegistry';
import { PluginManager } from '../plugins';
import { MetricsCollector } from '../utils/metrics-collector';
import { checkMinimumRequirements, logCapabilities } from '../utils/webgl-capabilities';
import { PointShaderLayer } from '../layers/PointShaderLayer';
import { LineShaderLayer } from '../layers/LineShaderLayer';
import { PolygonShaderLayer } from '../layers/PolygonShaderLayer';
import { GlobalShaderLayer } from '../layers/GlobalShaderLayer';
import { LOG_PREFIX, DEFAULT_TARGET_FPS } from '../constants';

// ============================================
// Types
// ============================================

/**
 * Union type for all custom shader layer types
 */
export type ShaderLayerUnion =
  | PointShaderLayer
  | LineShaderLayer
  | PolygonShaderLayer
  | GlobalShaderLayer;

/**
 * Resolved options with defaults applied
 */
export interface ResolvedShaderManagerOptions {
  targetFPS: number;
  autoStart: boolean;
  debug: boolean;
  checkCapabilities: boolean;
  enableMetrics: boolean;
  metricsConfig?: MetricsConfig;
}

/**
 * Internal state shared between ShaderManager modules.
 * This interface represents all the mutable state that needs to be
 * accessed and modified by the various shader management functions.
 */
export interface ShaderManagerState {
  /** The MapLibre map instance */
  map: MapLibreMapInstance;

  /** Map of layer IDs to shader instances */
  instances: Map<string, ShaderInstance>;

  /** Map of layer IDs to custom WebGL layers */
  customLayers: Map<string, ShaderLayerUnion>;

  /** Animation timing coordinator */
  animationLoop: AnimationLoop;

  /** Configuration resolver for merging and validating configs */
  configResolver: ConfigResolver;

  /** Shader definition registry */
  registry: ShaderRegistry;

  /** Plugin lifecycle manager */
  pluginManager: PluginManager;

  /** Performance metrics collector */
  metricsCollector: MetricsCollector;

  /** Resolved options */
  options: ResolvedShaderManagerOptions;

  /** Debug mode flag */
  debug: boolean;

  /** Total features currently being rendered */
  totalFeaturesRendered: number;
}

// ============================================
// State Factory
// ============================================

/**
 * Create and initialize the shader manager state.
 *
 * @param map - The MapLibre map instance
 * @param options - Configuration options
 * @returns Initialized state object
 * @throws Error if WebGL is not supported
 */
export function createState(
  map: MapLibreMapInstance,
  options: ShaderManagerOptions = {}
): ShaderManagerState {
  // Resolve options with defaults
  const resolvedOptions: ResolvedShaderManagerOptions = {
    targetFPS: options.targetFPS ?? DEFAULT_TARGET_FPS,
    autoStart: options.autoStart ?? true,
    debug: options.debug ?? false,
    checkCapabilities: options.checkCapabilities ?? true,
    enableMetrics: options.enableMetrics ?? options.debug ?? false,
    metricsConfig: options.metricsConfig,
  };

  const debug = resolvedOptions.debug;

  // Check WebGL capabilities if enabled
  if (resolvedOptions.checkCapabilities && typeof document !== 'undefined') {
    const requirements = checkMinimumRequirements();

    if (debug) {
      logCapabilities(requirements.capabilities);
    }

    if (!requirements.ok) {
      const errorMsg = requirements.errors.join('\n');
      console.warn(`${LOG_PREFIX} WebGL capability warnings:\n${errorMsg}`);

      // If WebGL is completely unsupported, throw an error
      if (!requirements.capabilities.supported) {
        throw new Error(
          `${LOG_PREFIX} WebGL is not supported in this browser. ` +
            'Animated shaders require WebGL to function.'
        );
      }
    }
  }

  // Create dependencies
  const animationLoop = new AnimationLoop(resolvedOptions.targetFPS);
  const configResolver = new ConfigResolver();
  const registry = globalRegistry;
  const pluginManager = new PluginManager(registry, { debug });
  const metricsCollector = new MetricsCollector({
    enabled: resolvedOptions.enableMetrics,
    ...resolvedOptions.metricsConfig,
  });

  // Auto-start animation loop if configured
  if (resolvedOptions.autoStart) {
    animationLoop.start();
  }

  return {
    map,
    instances: new Map(),
    customLayers: new Map(),
    animationLoop,
    configResolver,
    registry,
    pluginManager,
    metricsCollector,
    options: resolvedOptions,
    debug,
    totalFeaturesRendered: 0,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Log a debug message if debug mode is enabled.
 *
 * @param state - The shader manager state
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export function log(state: ShaderManagerState, message: string, ...args: unknown[]): void {
  if (state.debug) {
    // eslint-disable-next-line no-console
    console.log(`${LOG_PREFIX} ${message}`, ...args);
  }
}

/**
 * Clean up all resources in the state.
 * Should be called when the ShaderManager is destroyed.
 *
 * @param state - The shader manager state
 */
export function destroyState(state: ShaderManagerState): void {
  // Clear plugins
  state.pluginManager.clear();

  // Stop and destroy animation loop
  state.animationLoop.destroy();

  // Clear all maps
  state.instances.clear();
  state.customLayers.clear();

  log(state, 'ShaderManager destroyed');
}
