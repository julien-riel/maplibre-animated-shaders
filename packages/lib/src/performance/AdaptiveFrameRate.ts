/**
 * Adaptive Frame Rate
 *
 * Monitors frame performance and dynamically adjusts quality
 * settings to maintain target frame rate.
 *
 * @module performance/AdaptiveFrameRate
 */

/**
 * Quality level configuration
 */
export interface QualityLevel {
  /** Quality level name */
  name: string;

  /** Quality factor (0-1, where 1 = highest quality) */
  quality: number;

  /** LOD simplification override */
  lodSimplification: number;

  /** Maximum features to render */
  maxFeatures: number;

  /** Whether to enable post-processing */
  enablePostProcessing: boolean;

  /** Shadow quality (0 = off, 1 = full) */
  shadowQuality: number;
}

/**
 * Adaptive frame rate configuration
 */
export interface AdaptiveFrameRateConfig {
  /** Target FPS */
  targetFPS: number;

  /** Minimum acceptable FPS before quality reduction */
  minFPS: number;

  /** Number of frames to average for FPS calculation */
  sampleSize: number;

  /** Cooldown between quality changes (ms) */
  adjustmentCooldown: number;

  /** FPS threshold to increase quality (must exceed by this margin) */
  increaseThreshold: number;

  /** FPS threshold to decrease quality (must be below by this margin) */
  decreaseThreshold: number;

  /** Quality levels from lowest to highest */
  qualityLevels: QualityLevel[];
}

/**
 * Default quality levels
 */
export const DEFAULT_QUALITY_LEVELS: QualityLevel[] = [
  {
    name: 'Minimal',
    quality: 0.1,
    lodSimplification: 0.1,
    maxFeatures: 500,
    enablePostProcessing: false,
    shadowQuality: 0,
  },
  {
    name: 'Low',
    quality: 0.25,
    lodSimplification: 0.25,
    maxFeatures: 2000,
    enablePostProcessing: false,
    shadowQuality: 0,
  },
  {
    name: 'Medium',
    quality: 0.5,
    lodSimplification: 0.5,
    maxFeatures: 10000,
    enablePostProcessing: true,
    shadowQuality: 0.5,
  },
  {
    name: 'High',
    quality: 0.75,
    lodSimplification: 0.75,
    maxFeatures: 50000,
    enablePostProcessing: true,
    shadowQuality: 0.75,
  },
  {
    name: 'Ultra',
    quality: 1.0,
    lodSimplification: 1.0,
    maxFeatures: 100000,
    enablePostProcessing: true,
    shadowQuality: 1.0,
  },
];

/**
 * Default configuration
 */
export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveFrameRateConfig = {
  targetFPS: 60,
  minFPS: 30,
  sampleSize: 30,
  adjustmentCooldown: 1000,
  increaseThreshold: 5, // FPS must be 5+ above target to increase quality
  decreaseThreshold: 10, // FPS must be 10+ below target to decrease quality
  qualityLevels: DEFAULT_QUALITY_LEVELS,
};

/**
 * Frame statistics
 */
export interface FrameStats {
  /** Current FPS */
  fps: number;

  /** Average frame time in ms */
  avgFrameTime: number;

  /** Maximum frame time in ms */
  maxFrameTime: number;

  /** Minimum frame time in ms */
  minFrameTime: number;

  /** Standard deviation of frame times */
  stdDev: number;

  /** Current quality level index */
  qualityLevel: number;

  /** Current quality level name */
  qualityName: string;

  /** Number of frames dropped (exceeded 2x target frame time) */
  droppedFrames: number;
}

/**
 * Adaptive frame rate manager.
 *
 * Monitors rendering performance and automatically adjusts quality
 * settings to maintain target frame rate.
 *
 * @example
 * ```typescript
 * const afr = new AdaptiveFrameRate({ targetFPS: 60 });
 *
 * // In animation loop
 * function animate() {
 *   const frameStart = performance.now();
 *
 *   // Get current quality settings
 *   const quality = afr.getCurrentQuality();
 *
 *   // Apply quality settings
 *   lodManager.setSimplification(quality.lodSimplification);
 *   postProcessing.setEnabled(quality.enablePostProcessing);
 *
 *   // ... render ...
 *
 *   // Record frame time
 *   afr.recordFrame(performance.now() - frameStart);
 *
 *   // Check if we should skip next frame
 *   if (!afr.shouldSkipFrame()) {
 *     requestAnimationFrame(animate);
 *   }
 * }
 * ```
 */
export class AdaptiveFrameRate {
  private config: AdaptiveFrameRateConfig;
  private frameTimes: number[] = [];
  private currentQualityIndex: number;
  private lastAdjustmentTime: number = 0;
  private droppedFrames: number = 0;
  private enabled: boolean = true;
  private targetFrameTime: number;

  /**
   * Callback when quality level changes
   */
  public onQualityChange?: (level: QualityLevel, index: number) => void;

  /**
   * Create an adaptive frame rate manager.
   *
   * @param config - Configuration options
   */
  constructor(config: Partial<AdaptiveFrameRateConfig> = {}) {
    this.config = {
      ...DEFAULT_ADAPTIVE_CONFIG,
      ...config,
      qualityLevels: config.qualityLevels || DEFAULT_QUALITY_LEVELS,
    };

    // Start at highest quality
    this.currentQualityIndex = this.config.qualityLevels.length - 1;
    this.targetFrameTime = 1000 / this.config.targetFPS;
  }

  /**
   * Enable or disable adaptive quality.
   *
   * @param enabled - Whether to enable
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      // Reset to highest quality when disabled
      this.currentQualityIndex = this.config.qualityLevels.length - 1;
    }
  }

  /**
   * Check if adaptive quality is enabled.
   *
   * @returns true if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Record a frame's render time.
   *
   * @param frameTimeMs - Frame time in milliseconds
   */
  recordFrame(frameTimeMs: number): void {
    this.frameTimes.push(frameTimeMs);

    // Keep only recent samples
    while (this.frameTimes.length > this.config.sampleSize) {
      this.frameTimes.shift();
    }

    // Check for dropped frame
    if (frameTimeMs > this.targetFrameTime * 2) {
      this.droppedFrames++;
    }

    // Check if we should adjust quality
    if (this.enabled && this.frameTimes.length >= this.config.sampleSize) {
      this.evaluateQuality();
    }
  }

  /**
   * Evaluate and potentially adjust quality level.
   */
  private evaluateQuality(): void {
    const now = performance.now();

    // Respect cooldown
    if (now - this.lastAdjustmentTime < this.config.adjustmentCooldown) {
      return;
    }

    const currentFPS = this.getCurrentFPS();
    const targetFPS = this.config.targetFPS;

    // Check if we need to decrease quality
    if (currentFPS < targetFPS - this.config.decreaseThreshold) {
      if (this.currentQualityIndex > 0) {
        this.setQualityLevel(this.currentQualityIndex - 1);
        this.lastAdjustmentTime = now;
      }
    }
    // Check if we can increase quality
    else if (currentFPS > targetFPS + this.config.increaseThreshold) {
      if (this.currentQualityIndex < this.config.qualityLevels.length - 1) {
        this.setQualityLevel(this.currentQualityIndex + 1);
        this.lastAdjustmentTime = now;
      }
    }
  }

  /**
   * Set quality level directly.
   *
   * @param index - Quality level index
   */
  setQualityLevel(index: number): void {
    const clampedIndex = Math.max(0, Math.min(index, this.config.qualityLevels.length - 1));

    if (clampedIndex !== this.currentQualityIndex) {
      this.currentQualityIndex = clampedIndex;

      if (this.onQualityChange) {
        this.onQualityChange(this.getCurrentQuality(), clampedIndex);
      }
    }
  }

  /**
   * Get current quality level.
   *
   * @returns Current quality level configuration
   */
  getCurrentQuality(): QualityLevel {
    return this.config.qualityLevels[this.currentQualityIndex];
  }

  /**
   * Get current quality index.
   *
   * @returns Quality level index (0 = lowest)
   */
  getCurrentQualityIndex(): number {
    return this.currentQualityIndex;
  }

  /**
   * Get current FPS based on recent frame times.
   *
   * @returns Current FPS
   */
  getCurrentFPS(): number {
    if (this.frameTimes.length === 0) {
      return this.config.targetFPS;
    }

    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return 1000 / avgFrameTime;
  }

  /**
   * Get recommended quality factor.
   *
   * @returns Quality factor (0-1)
   */
  getRecommendedQuality(): number {
    return this.getCurrentQuality().quality;
  }

  /**
   * Check if the next frame should be skipped.
   * Used for frame rate limiting.
   *
   * @returns true if frame should be skipped
   */
  shouldSkipFrame(): boolean {
    if (this.frameTimes.length === 0) {
      return false;
    }

    // Skip frame if we're significantly behind
    const lastFrameTime = this.frameTimes[this.frameTimes.length - 1];
    return lastFrameTime > this.targetFrameTime * 3;
  }

  /**
   * Get frame statistics.
   *
   * @returns Current frame statistics
   */
  getStats(): FrameStats {
    if (this.frameTimes.length === 0) {
      return {
        fps: this.config.targetFPS,
        avgFrameTime: this.targetFrameTime,
        maxFrameTime: 0,
        minFrameTime: 0,
        stdDev: 0,
        qualityLevel: this.currentQualityIndex,
        qualityName: this.getCurrentQuality().name,
        droppedFrames: 0,
      };
    }

    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const max = Math.max(...this.frameTimes);
    const min = Math.min(...this.frameTimes);

    // Calculate standard deviation
    const squaredDiffs = this.frameTimes.map((t) => Math.pow(t - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    return {
      fps: 1000 / avg,
      avgFrameTime: avg,
      maxFrameTime: max,
      minFrameTime: min,
      stdDev,
      qualityLevel: this.currentQualityIndex,
      qualityName: this.getCurrentQuality().name,
      droppedFrames: this.droppedFrames,
    };
  }

  /**
   * Reset statistics.
   */
  reset(): void {
    this.frameTimes = [];
    this.droppedFrames = 0;
    this.lastAdjustmentTime = 0;
  }

  /**
   * Update configuration.
   *
   * @param config - Partial configuration to merge
   */
  updateConfig(config: Partial<AdaptiveFrameRateConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      qualityLevels: config.qualityLevels || this.config.qualityLevels,
    };

    this.targetFrameTime = 1000 / this.config.targetFPS;

    // Clamp current quality index
    this.currentQualityIndex = Math.min(
      this.currentQualityIndex,
      this.config.qualityLevels.length - 1
    );
  }

  /**
   * Get current configuration.
   *
   * @returns Current configuration
   */
  getConfig(): Readonly<AdaptiveFrameRateConfig> {
    return this.config;
  }
}
