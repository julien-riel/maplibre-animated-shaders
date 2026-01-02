/**
 * Metrics & Observability Types
 *
 * Types for runtime performance monitoring and warnings.
 */

/**
 * Performance metrics for shader rendering
 */
export interface ShaderMetrics {
  /** Total number of frames rendered since start */
  framesRendered: number;
  /** Average frame time in milliseconds */
  averageFrameTime: number;
  /** Peak (worst) frame time in milliseconds */
  peakFrameTime: number;
  /** Number of frames dropped (exceeded target frame time) */
  droppedFrames: number;
  /** Current frames per second */
  currentFPS: number;
  /** Average frames per second over the session */
  averageFPS: number;
  /** Number of currently active shaders */
  activeShaders: number;
  /** Total number of features being rendered */
  featuresRendered: number;
  /** Memory usage estimate in bytes (if available) */
  memoryUsage?: number;
  /** Time since metrics collection started (ms) */
  uptime: number;
}

/**
 * Performance warning types
 */
export type PerformanceWarningType =
  | 'low_fps'
  | 'high_frame_time'
  | 'memory_pressure'
  | 'too_many_features'
  | 'dropped_frames';

/**
 * Performance warning event
 */
export interface PerformanceWarning {
  /** Type of performance issue */
  type: PerformanceWarningType;
  /** Human-readable warning message */
  message: string;
  /** Current metric value that triggered the warning */
  value: number;
  /** Threshold that was exceeded */
  threshold: number;
  /** Timestamp when the warning occurred */
  timestamp: number;
  /** Suggested action to resolve the issue */
  suggestion?: string;
}

/**
 * Performance warning callback handler
 */
export type PerformanceWarningHandler = (warning: PerformanceWarning) => void;

/**
 * Configuration for metrics collection
 */
export interface MetricsConfig {
  /** Enable metrics collection (default: true in debug mode) */
  enabled?: boolean;
  /** Window size for averaging calculations (default: 60 frames) */
  sampleWindow?: number;
  /** FPS threshold for low_fps warning (default: 30) */
  lowFPSThreshold?: number;
  /** Frame time threshold in ms for high_frame_time warning (default: 50) */
  highFrameTimeThreshold?: number;
  /** Feature count threshold for too_many_features warning (default: 50000) */
  maxFeaturesThreshold?: number;
  /** Dropped frames percentage threshold for warning (default: 0.1 = 10%) */
  droppedFramesThreshold?: number;
}
