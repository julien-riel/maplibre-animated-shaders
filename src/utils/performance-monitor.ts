/**
 * Production Performance Monitor
 *
 * A robust performance monitoring utility for production environments.
 * Tracks FPS, frame times, GPU metrics, and supports telemetry reporting.
 *
 * @module utils/performance-monitor
 * @category Utilities
 */

/**
 * Performance metrics snapshot
 */
export interface PerformanceMetrics {
  /** Current frames per second */
  fps: number;
  /** Average FPS over the sample window */
  avgFps: number;
  /** Minimum FPS in the sample window */
  minFps: number;
  /** Maximum FPS in the sample window */
  maxFps: number;
  /** Frame time in milliseconds */
  frameTime: number;
  /** 95th percentile frame time */
  frameTime95th: number;
  /** 99th percentile frame time */
  frameTime99th: number;
  /** Number of dropped frames (>16.67ms) */
  droppedFrames: number;
  /** JavaScript heap size in bytes (if available) */
  jsHeapSize?: number;
  /** Total JS heap limit in bytes (if available) */
  jsHeapLimit?: number;
  /** GPU memory usage in bytes (if available) */
  gpuMemory?: number;
  /** WebGL context lost count */
  contextLossCount: number;
  /** Timestamp of the metrics */
  timestamp: number;
}

/**
 * Performance warning thresholds
 */
export interface PerformanceThresholds {
  /** FPS below this triggers a warning */
  fpsWarning: number;
  /** FPS below this triggers a critical alert */
  fpsCritical: number;
  /** Frame time above this (ms) triggers a warning */
  frameTimeWarning: number;
  /** Frame time above this (ms) triggers a critical alert */
  frameTimeCritical: number;
  /** Dropped frame percentage that triggers a warning */
  droppedFrameWarning: number;
}

/**
 * Performance event types
 */
export type PerformanceEventType =
  | 'fps-warning'
  | 'fps-critical'
  | 'frame-time-warning'
  | 'frame-time-critical'
  | 'dropped-frames'
  | 'context-lost'
  | 'context-restored'
  | 'metrics-report';

/**
 * Performance event data
 */
export interface PerformanceEvent {
  type: PerformanceEventType;
  metrics: PerformanceMetrics;
  message: string;
  timestamp: number;
}

/**
 * Performance event handler
 */
export type PerformanceEventHandler = (event: PerformanceEvent) => void;

/**
 * Configuration options for the performance monitor
 */
export interface PerformanceMonitorOptions {
  /** Sample window size for calculating statistics (default: 60) */
  sampleSize?: number;
  /** Update interval in milliseconds (default: 1000) */
  updateInterval?: number;
  /** Performance thresholds for warnings */
  thresholds?: Partial<PerformanceThresholds>;
  /** Enable automatic telemetry reporting */
  enableTelemetry?: boolean;
  /** Telemetry report interval in milliseconds (default: 30000) */
  telemetryInterval?: number;
  /** Telemetry endpoint URL */
  telemetryEndpoint?: string;
  /** Custom telemetry reporter function */
  telemetryReporter?: (metrics: PerformanceMetrics) => void | Promise<void>;
}

/**
 * Default thresholds for performance warnings
 */
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  fpsWarning: 30,
  fpsCritical: 15,
  frameTimeWarning: 33.33, // 30 FPS
  frameTimeCritical: 66.67, // 15 FPS
  droppedFrameWarning: 0.1, // 10% dropped frames
};

/**
 * ProductionPerformanceMonitor - Robust performance monitoring for production
 *
 * @example
 * ```typescript
 * const monitor = new ProductionPerformanceMonitor({
 *   thresholds: { fpsWarning: 45 },
 *   enableTelemetry: true,
 *   telemetryReporter: (metrics) => analytics.track('performance', metrics)
 * });
 *
 * monitor.on('fps-warning', (event) => {
 *   console.warn('Low FPS detected:', event.metrics.fps);
 * });
 *
 * monitor.start();
 * ```
 */
export class ProductionPerformanceMonitor {
  private sampleSize: number;
  private updateInterval: number;
  private thresholds: PerformanceThresholds;
  private enableTelemetry: boolean;
  private telemetryInterval: number;
  private telemetryEndpoint?: string;
  private telemetryReporter?: (metrics: PerformanceMetrics) => void | Promise<void>;

  private isRunning = false;
  private rafId: number | null = null;
  private updateTimerId: ReturnType<typeof setInterval> | null = null;
  private telemetryTimerId: ReturnType<typeof setInterval> | null = null;

  private frameCount = 0;
  private lastTime = 0;
  private frameTimes: number[] = [];
  private fpsHistory: number[] = [];
  private droppedFrameCount = 0;
  private contextLossCount = 0;

  private eventHandlers: Map<PerformanceEventType, Set<PerformanceEventHandler>> = new Map();
  private canvas?: HTMLCanvasElement;

  constructor(options: PerformanceMonitorOptions = {}) {
    this.sampleSize = options.sampleSize ?? 60;
    this.updateInterval = options.updateInterval ?? 1000;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
    this.enableTelemetry = options.enableTelemetry ?? false;
    this.telemetryInterval = options.telemetryInterval ?? 30000;
    this.telemetryEndpoint = options.telemetryEndpoint;
    this.telemetryReporter = options.telemetryReporter;
  }

  /**
   * Attach to a canvas element to monitor context loss events
   */
  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  /**
   * Detach from the canvas element
   */
  detachCanvas(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
      this.canvas = undefined;
    }
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.frameTimes = [];
    this.fpsHistory = [];
    this.droppedFrameCount = 0;

    this.tick();

    // Periodic metrics update
    this.updateTimerId = setInterval(() => {
      this.checkThresholds();
    }, this.updateInterval);

    // Telemetry reporting
    if (this.enableTelemetry) {
      this.telemetryTimerId = setInterval(() => {
        this.reportTelemetry();
      }, this.telemetryInterval);
    }
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    this.isRunning = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.updateTimerId !== null) {
      clearInterval(this.updateTimerId);
      this.updateTimerId = null;
    }

    if (this.telemetryTimerId !== null) {
      clearInterval(this.telemetryTimerId);
      this.telemetryTimerId = null;
    }
  }

  /**
   * Register an event handler
   */
  on(event: PerformanceEventType, handler: PerformanceEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Remove an event handler
   */
  off(event: PerformanceEventType, handler: PerformanceEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const fps = this.calculateFPS();
    const avgFps = this.calculateAverageFPS();
    const minFps = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0;
    const maxFps = this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 0;
    const frameTime = fps > 0 ? 1000 / fps : 0;
    const frameTime95th = this.calculatePercentile(this.frameTimes, 95);
    const frameTime99th = this.calculatePercentile(this.frameTimes, 99);
    const totalFrames = this.fpsHistory.reduce((a, b) => a + b, 0);
    const droppedFrames = totalFrames > 0 ? this.droppedFrameCount / totalFrames : 0;

    const metrics: PerformanceMetrics = {
      fps,
      avgFps,
      minFps,
      maxFps,
      frameTime,
      frameTime95th,
      frameTime99th,
      droppedFrames,
      contextLossCount: this.contextLossCount,
      timestamp: Date.now(),
    };

    // Add memory info if available
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (memory) {
      metrics.jsHeapSize = memory.usedJSHeapSize;
      metrics.jsHeapLimit = memory.jsHeapSizeLimit;
    }

    return metrics;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.frameTimes = [];
    this.fpsHistory = [];
    this.droppedFrameCount = 0;
  }

  /**
   * Destroy the monitor and clean up resources
   */
  destroy(): void {
    this.stop();
    this.detachCanvas();
    this.eventHandlers.clear();
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;

    if (deltaTime > 0) {
      this.frameTimes.push(deltaTime);
      if (this.frameTimes.length > this.sampleSize * 2) {
        this.frameTimes = this.frameTimes.slice(-this.sampleSize);
      }

      // Count dropped frames (>16.67ms = below 60 FPS)
      if (deltaTime > 16.67) {
        this.droppedFrameCount++;
      }
    }

    this.lastTime = currentTime;
    this.frameCount++;

    // Update FPS history every second
    if (this.frameTimes.length >= 60) {
      const fps = this.calculateFPS();
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > this.sampleSize) {
        this.fpsHistory.shift();
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private calculateFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    const avgFrameTime =
      this.frameTimes.slice(-60).reduce((a, b) => a + b, 0) /
      Math.min(this.frameTimes.length, 60);
    return avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0;
  }

  private calculateAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private checkThresholds(): void {
    const metrics = this.getMetrics();

    // FPS checks
    if (metrics.fps < this.thresholds.fpsCritical) {
      this.emit({
        type: 'fps-critical',
        metrics,
        message: `Critical FPS: ${metrics.fps} (threshold: ${this.thresholds.fpsCritical})`,
        timestamp: Date.now(),
      });
    } else if (metrics.fps < this.thresholds.fpsWarning) {
      this.emit({
        type: 'fps-warning',
        metrics,
        message: `Low FPS: ${metrics.fps} (threshold: ${this.thresholds.fpsWarning})`,
        timestamp: Date.now(),
      });
    }

    // Frame time checks
    if (metrics.frameTime99th > this.thresholds.frameTimeCritical) {
      this.emit({
        type: 'frame-time-critical',
        metrics,
        message: `Critical frame time: ${metrics.frameTime99th.toFixed(2)}ms (99th percentile)`,
        timestamp: Date.now(),
      });
    } else if (metrics.frameTime95th > this.thresholds.frameTimeWarning) {
      this.emit({
        type: 'frame-time-warning',
        metrics,
        message: `High frame time: ${metrics.frameTime95th.toFixed(2)}ms (95th percentile)`,
        timestamp: Date.now(),
      });
    }

    // Dropped frames check
    if (metrics.droppedFrames > this.thresholds.droppedFrameWarning) {
      this.emit({
        type: 'dropped-frames',
        metrics,
        message: `High dropped frame rate: ${(metrics.droppedFrames * 100).toFixed(1)}%`,
        timestamp: Date.now(),
      });
    }
  }

  private async reportTelemetry(): Promise<void> {
    const metrics = this.getMetrics();

    // Custom reporter
    if (this.telemetryReporter) {
      try {
        await this.telemetryReporter(metrics);
      } catch (error) {
        console.error('Telemetry reporter error:', error);
      }
    }

    // HTTP endpoint
    if (this.telemetryEndpoint) {
      try {
        await fetch(this.telemetryEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metrics),
        });
      } catch (error) {
        console.error('Telemetry endpoint error:', error);
      }
    }

    this.emit({
      type: 'metrics-report',
      metrics,
      message: 'Periodic metrics report',
      timestamp: Date.now(),
    });
  }

  private handleContextLost = (): void => {
    this.contextLossCount++;
    this.emit({
      type: 'context-lost',
      metrics: this.getMetrics(),
      message: `WebGL context lost (count: ${this.contextLossCount})`,
      timestamp: Date.now(),
    });
  };

  private handleContextRestored = (): void => {
    this.emit({
      type: 'context-restored',
      metrics: this.getMetrics(),
      message: 'WebGL context restored',
      timestamp: Date.now(),
    });
  };

  private emit(event: PerformanceEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error('Performance event handler error:', error);
        }
      });
    }
  }
}

/**
 * Singleton instance for convenience
 */
let defaultMonitor: ProductionPerformanceMonitor | null = null;

/**
 * Get or create the default performance monitor instance
 *
 * @example
 * ```typescript
 * import { getPerformanceMonitor } from 'maplibre-animated-shaders';
 *
 * const monitor = getPerformanceMonitor();
 * monitor.start();
 *
 * // Later, get metrics
 * console.log(monitor.getMetrics());
 * ```
 */
export function getPerformanceMonitor(
  options?: PerformanceMonitorOptions
): ProductionPerformanceMonitor {
  if (!defaultMonitor) {
    defaultMonitor = new ProductionPerformanceMonitor(options);
  }
  return defaultMonitor;
}

/**
 * Reset the default performance monitor instance
 */
export function resetPerformanceMonitor(): void {
  if (defaultMonitor) {
    defaultMonitor.destroy();
    defaultMonitor = null;
  }
}
