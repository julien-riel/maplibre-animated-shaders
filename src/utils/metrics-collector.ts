/**
 * MetricsCollector - Runtime performance monitoring for shaders
 *
 * Collects and analyzes performance metrics for shader rendering:
 * - Frame timing and FPS
 * - Dropped frames detection
 * - Feature count tracking
 * - Performance warning generation
 */

import type {
  ShaderMetrics,
  PerformanceWarning,
  PerformanceWarningHandler,
  PerformanceWarningType,
  MetricsConfig,
} from '../types';

/**
 * Default configuration for metrics collection
 */
const DEFAULT_CONFIG: Required<MetricsConfig> = {
  enabled: true,
  sampleWindow: 60,
  lowFPSThreshold: 30,
  highFrameTimeThreshold: 50,
  maxFeaturesThreshold: 50000,
  droppedFramesThreshold: 0.1,
};

/**
 * Collects and analyzes shader rendering performance metrics
 */
export class MetricsCollector {
  private config: Required<MetricsConfig>;
  private startTime: number = 0;
  private framesRendered: number = 0;
  private droppedFrames: number = 0;
  private peakFrameTime: number = 0;
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  private activeShaders: number = 0;
  private featuresRendered: number = 0;
  private warningHandlers: Set<PerformanceWarningHandler> = new Set();
  private lastWarnings: Map<PerformanceWarningType, number> = new Map();
  private warningCooldown: number = 5000; // 5 seconds between same warning type

  constructor(config?: MetricsConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.reset();
  }

  /**
   * Reset all metrics to initial state
   */
  reset(): void {
    this.startTime = performance.now();
    this.framesRendered = 0;
    this.droppedFrames = 0;
    this.peakFrameTime = 0;
    this.frameTimes = [];
    this.lastFrameTime = performance.now();
    this.lastWarnings.clear();
  }

  /**
   * Record the start of a frame
   * Call this at the beginning of each render cycle
   */
  beginFrame(): void {
    if (!this.config.enabled) return;
    this.lastFrameTime = performance.now();
  }

  /**
   * Record the end of a frame and update metrics
   * Call this at the end of each render cycle
   *
   * @param targetFrameTime - Target frame time in ms (e.g., 16.67 for 60fps)
   */
  endFrame(targetFrameTime: number = 16.67): void {
    if (!this.config.enabled) return;

    const now = performance.now();
    const frameTime = now - this.lastFrameTime;

    this.framesRendered++;
    this.frameTimes.push(frameTime);

    // Keep only the sample window
    if (this.frameTimes.length > this.config.sampleWindow) {
      this.frameTimes.shift();
    }

    // Track peak frame time
    if (frameTime > this.peakFrameTime) {
      this.peakFrameTime = frameTime;
    }

    // Detect dropped frames (frame took longer than target)
    if (frameTime > targetFrameTime * 1.5) {
      this.droppedFrames++;
    }

    // Check for performance warnings
    this.checkPerformanceWarnings(frameTime);
  }

  /**
   * Update the count of active shaders
   */
  setActiveShaders(count: number): void {
    this.activeShaders = count;
  }

  /**
   * Update the count of features being rendered
   */
  setFeaturesRendered(count: number): void {
    const previousCount = this.featuresRendered;
    this.featuresRendered = count;

    // Check for feature count warning
    if (
      count > this.config.maxFeaturesThreshold &&
      previousCount <= this.config.maxFeaturesThreshold
    ) {
      this.emitWarning({
        type: 'too_many_features',
        message: `Rendering ${count} features exceeds recommended maximum of ${this.config.maxFeaturesThreshold}`,
        value: count,
        threshold: this.config.maxFeaturesThreshold,
        timestamp: performance.now(),
        suggestion:
          'Consider using clustering, level-of-detail, or viewport culling to reduce feature count',
      });
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): ShaderMetrics {
    const now = performance.now();
    const uptime = now - this.startTime;
    const averageFrameTime = this.calculateAverageFrameTime();
    const currentFPS = averageFrameTime > 0 ? 1000 / averageFrameTime : 0;
    const averageFPS = uptime > 0 ? (this.framesRendered / uptime) * 1000 : 0;

    return {
      framesRendered: this.framesRendered,
      averageFrameTime,
      peakFrameTime: this.peakFrameTime,
      droppedFrames: this.droppedFrames,
      currentFPS: Math.round(currentFPS * 10) / 10,
      averageFPS: Math.round(averageFPS * 10) / 10,
      activeShaders: this.activeShaders,
      featuresRendered: this.featuresRendered,
      memoryUsage: this.getMemoryUsage(),
      uptime,
    };
  }

  /**
   * Register a performance warning handler
   */
  onPerformanceWarning(handler: PerformanceWarningHandler): () => void {
    this.warningHandlers.add(handler);
    return () => {
      this.warningHandlers.delete(handler);
    };
  }

  /**
   * Remove a performance warning handler
   */
  offPerformanceWarning(handler: PerformanceWarningHandler): void {
    this.warningHandlers.delete(handler);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MetricsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if metrics collection is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable or disable metrics collection
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled) {
      this.reset();
    }
  }

  /**
   * Calculate average frame time from sample window
   */
  private calculateAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return sum / this.frameTimes.length;
  }

  /**
   * Get memory usage if available (Chrome-only)
   */
  private getMemoryUsage(): number | undefined {
    // @ts-expect-error - memory is a non-standard Chrome API
    const memory = performance.memory;
    if (memory) {
      return memory.usedJSHeapSize;
    }
    return undefined;
  }

  /**
   * Check for performance issues and emit warnings
   */
  private checkPerformanceWarnings(frameTime: number): void {
    const now = performance.now();

    // Check for high frame time
    if (frameTime > this.config.highFrameTimeThreshold) {
      this.emitWarningThrottled('high_frame_time', {
        type: 'high_frame_time',
        message: `Frame time ${frameTime.toFixed(1)}ms exceeds threshold of ${this.config.highFrameTimeThreshold}ms`,
        value: frameTime,
        threshold: this.config.highFrameTimeThreshold,
        timestamp: now,
        suggestion: 'Reduce shader complexity, feature count, or animation speed',
      });
    }

    // Check for low FPS (only after collecting enough samples)
    if (this.frameTimes.length >= this.config.sampleWindow) {
      const avgFrameTime = this.calculateAverageFrameTime();
      const currentFPS = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

      if (currentFPS < this.config.lowFPSThreshold) {
        this.emitWarningThrottled('low_fps', {
          type: 'low_fps',
          message: `FPS dropped to ${currentFPS.toFixed(1)}, below threshold of ${this.config.lowFPSThreshold}`,
          value: currentFPS,
          threshold: this.config.lowFPSThreshold,
          timestamp: now,
          suggestion:
            'Consider reducing animation complexity or pausing animations when not visible',
        });
      }
    }

    // Check for dropped frames percentage
    if (this.framesRendered > 100) {
      const droppedPercentage = this.droppedFrames / this.framesRendered;
      if (droppedPercentage > this.config.droppedFramesThreshold) {
        this.emitWarningThrottled('dropped_frames', {
          type: 'dropped_frames',
          message: `${(droppedPercentage * 100).toFixed(1)}% of frames dropped exceeds threshold of ${this.config.droppedFramesThreshold * 100}%`,
          value: droppedPercentage,
          threshold: this.config.droppedFramesThreshold,
          timestamp: now,
          suggestion:
            'The browser is struggling to maintain frame rate. Reduce workload or check for memory issues',
        });
      }
    }
  }

  /**
   * Emit a warning with throttling to prevent spam
   */
  private emitWarningThrottled(type: PerformanceWarningType, warning: PerformanceWarning): void {
    const lastWarning = this.lastWarnings.get(type) ?? 0;
    const now = performance.now();

    if (now - lastWarning > this.warningCooldown) {
      this.lastWarnings.set(type, now);
      this.emitWarning(warning);
    }
  }

  /**
   * Emit a warning to all registered handlers
   */
  private emitWarning(warning: PerformanceWarning): void {
    this.warningHandlers.forEach((handler) => {
      try {
        handler(warning);
      } catch (error) {
        console.error('[MetricsCollector] Error in warning handler:', error);
      }
    });
  }
}

/**
 * Singleton instance for global metrics collection
 */
let globalMetricsCollector: MetricsCollector | null = null;

/**
 * Get the global metrics collector instance
 */
export function getGlobalMetricsCollector(config?: MetricsConfig): MetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new MetricsCollector(config);
  }
  return globalMetricsCollector;
}

/**
 * Reset the global metrics collector
 */
export function resetGlobalMetricsCollector(): void {
  if (globalMetricsCollector) {
    globalMetricsCollector.reset();
  }
}
