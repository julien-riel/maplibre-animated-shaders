/**
 * Central constants file for maplibre-animated-shaders
 * All magic numbers and configuration defaults should be defined here.
 */

// ============================================
// Animation Constants
// ============================================

/** Default target frames per second */
export const DEFAULT_TARGET_FPS = 60;

/** Default animation speed multiplier */
export const DEFAULT_ANIMATION_SPEED = 1.0;

/** Milliseconds per second (for time conversions) */
export const MS_PER_SECOND = 1000;

// ============================================
// Throttling Constants
// ============================================

/** Default throttle interval for updates in milliseconds */
export const DEFAULT_UPDATE_THROTTLE_MS = 100;

/** Throttle interval for source data updates */
export const SOURCE_DATA_THROTTLE_MS = 100;

// ============================================
// Layer ID Suffixes
// ============================================

/** Suffix appended to layer IDs for geometry-based shader layers */
export const GEOMETRY_LAYER_SUFFIX = '-shader';

/** Suffix appended to layer IDs for global shader layers */
export const GLOBAL_LAYER_SUFFIX = '-global-shader';

// ============================================
// Paint Property Defaults
// ============================================

/** Default opacity for polygon layers when restored */
export const DEFAULT_POLYGON_OPACITY = 0.2;

/** Opacity value to hide a layer */
export const HIDDEN_OPACITY = 0;

/** Opacity value for fully visible layer */
export const VISIBLE_OPACITY = 1;

// ============================================
// Metrics Configuration Defaults
// ============================================

/** Default configuration for performance metrics collection */
export const METRICS_DEFAULTS = {
  /** Number of frames to sample for FPS calculation */
  sampleWindow: 60,
  /** FPS threshold below which a warning is triggered */
  lowFPSThreshold: 30,
  /** Frame time threshold (ms) above which a warning is triggered */
  highFrameTimeThreshold: 50,
  /** Maximum features threshold for performance warnings */
  maxFeaturesThreshold: 50000,
  /** Ratio of dropped frames that triggers a warning */
  droppedFramesThreshold: 0.1,
  /** Cooldown period (ms) between performance warnings */
  warningCooldown: 5000,
} as const;

// ============================================
// WebGL Constants
// ============================================

/** Vertices per point quad (2 triangles = 4 vertices) */
export const VERTICES_PER_POINT = 4;

/** Indices per point quad (2 triangles = 6 indices) */
export const INDICES_PER_POINT = 6;

// ============================================
// Geometry Type Constants
// ============================================

import type { GeometryType } from './types';

/** Paint properties to hide for each geometry type */
export const GEOMETRY_HIDE_PROPERTIES: Record<Exclude<GeometryType, 'global'>, string[]> = {
  point: ['circle-opacity', 'circle-stroke-opacity'],
  line: ['line-opacity'],
  polygon: ['fill-opacity'],
} as const;

/** Paint properties to restore for each geometry type with their default values */
export const GEOMETRY_RESTORE_PROPERTIES: Record<
  Exclude<GeometryType, 'global'>,
  Record<string, number>
> = {
  point: {
    'circle-opacity': VISIBLE_OPACITY,
    'circle-stroke-opacity': VISIBLE_OPACITY,
  },
  line: {
    'line-opacity': VISIBLE_OPACITY,
  },
  polygon: {
    'fill-opacity': DEFAULT_POLYGON_OPACITY,
  },
} as const;

// ============================================
// Plugin Constants
// ============================================

/** Separator used in namespaced shader names (e.g., "plugin:shader") */
export const NAMESPACE_SEPARATOR = ':';

// ============================================
// Debug Constants
// ============================================

/** Prefix for all console log messages */
export const LOG_PREFIX = '[ShaderManager]';

/** Prefix for plugin manager log messages */
export const PLUGIN_LOG_PREFIX = '[PluginManager]';

/** Prefix for WebGL-related log messages */
export const WEBGL_LOG_PREFIX = '[WebGL]';

/** Prefix for metrics collector log messages */
export const METRICS_LOG_PREFIX = '[MetricsCollector]';
