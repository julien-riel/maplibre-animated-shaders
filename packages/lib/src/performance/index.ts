/**
 * Performance Module
 *
 * Provides performance optimization utilities for maintaining smooth animations:
 *
 * - **AdaptiveFrameRate**: Automatically adjusts quality based on frame rate
 * - **QualityLevel**: Predefined quality presets (low, medium, high, ultra)
 *
 * @module performance
 *
 * @example
 * ```typescript
 * import { AdaptiveFrameRate, DEFAULT_QUALITY_LEVELS } from 'maplibre-animated-shaders';
 *
 * const adaptive = new AdaptiveFrameRate({
 *   targetFPS: 60,
 *   qualityLevels: DEFAULT_QUALITY_LEVELS,
 * });
 *
 * // In animation loop
 * function render(timestamp: number) {
 *   adaptive.recordFrame(timestamp);
 *
 *   if (adaptive.shouldReduceQuality()) {
 *     reduceFeatureCount();
 *   }
 *
 *   const stats = adaptive.getStats();
 *   console.log(`FPS: ${stats.currentFPS.toFixed(1)}, Quality: ${stats.qualityLevel}`);
 *
 *   requestAnimationFrame(render);
 * }
 * ```
 */

export {
  AdaptiveFrameRate,
  DEFAULT_QUALITY_LEVELS,
  DEFAULT_ADAPTIVE_CONFIG,
  type QualityLevel,
  type AdaptiveFrameRateConfig,
  type FrameStats,
} from './AdaptiveFrameRate';
