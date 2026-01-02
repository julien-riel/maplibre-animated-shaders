/**
 * TimeOffsetCalculator - Calculates per-feature time offsets for animation desynchronization
 *
 * This module provides various strategies for calculating time offsets:
 * - Fixed: Same offset for all features
 * - Random: Random offset within a range
 * - Hash: Deterministic offset based on feature property hash
 * - Property: Offset from feature property value
 */

import type { AnimationTimingConfig, TimeOffsetValue } from '../types';

/**
 * TimeOffsetCalculator class
 *
 * Calculates time offsets for features based on various strategies
 */
export class TimeOffsetCalculator {
  private seed: number;

  constructor(seed: number | string = 12345) {
    this.seed = typeof seed === 'string' ? this.hashString(seed) : seed;
  }

  /**
   * Calculate time offsets for an array of features
   */
  calculateOffsets(features: GeoJSON.Feature[], config: AnimationTimingConfig): Float32Array {
    const offsets = new Float32Array(features.length);
    const period = config.period ?? 1;
    const randomSeed =
      config.randomSeed !== undefined
        ? typeof config.randomSeed === 'string'
          ? this.hashString(config.randomSeed)
          : config.randomSeed
        : this.seed;

    for (let i = 0; i < features.length; i++) {
      offsets[i] = this.calculateSingleOffset(
        features[i],
        config.timeOffset,
        period,
        randomSeed,
        i
      );
    }

    return offsets;
  }

  /**
   * Calculate offset for a single feature
   */
  private calculateSingleOffset(
    feature: GeoJSON.Feature,
    timeOffset: TimeOffsetValue | undefined,
    period: number,
    randomSeed: number,
    index: number
  ): number {
    // No offset configured
    if (timeOffset === undefined) {
      return 0;
    }

    // Fixed numeric offset
    if (typeof timeOffset === 'number') {
      return timeOffset;
    }

    // Random offset within [0, period]
    if (timeOffset === 'random') {
      return this.seededRandom(randomSeed, index) * period;
    }

    // Array expression: ['get', 'propertyName'] or ['hash', 'propertyName']
    if (Array.isArray(timeOffset)) {
      const [operation, propertyName] = timeOffset;

      if (operation === 'get') {
        // Get value directly from feature property
        const value = feature.properties?.[propertyName];
        return typeof value === 'number' ? value : 0;
      }

      if (operation === 'hash') {
        // Hash the property value for a stable offset
        const prop = feature.properties?.[propertyName] ?? index;
        return this.hashString(String(prop)) * period;
      }
    }

    // Range object: { min, max }
    if (typeof timeOffset === 'object' && 'min' in timeOffset && 'max' in timeOffset) {
      const { min, max } = timeOffset;
      return min + this.seededRandom(randomSeed, index) * (max - min);
    }

    return 0;
  }

  /**
   * Generate a stable hash from a string (normalized to [0, 1])
   * Uses MurmurHash3-like mixing for better distribution
   */
  private hashString(str: string): number {
    let h = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193); // FNV prime
    }
    // Additional mixing for better distribution
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  }

  /**
   * Generate a seeded random number (normalized to [0, 1])
   * Uses a combination of seed and index for reproducible randomness
   */
  private seededRandom(seed: number, index: number): number {
    // Mix seed and index together for better distribution
    let h = seed ^ (index * 0x9e3779b9);
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  }

  /**
   * Create offsets for features that expand to multiple vertices
   * (e.g., points become quads with 4 vertices each)
   */
  calculateOffsetsExpanded(
    features: GeoJSON.Feature[],
    config: AnimationTimingConfig,
    verticesPerFeature: number
  ): Float32Array {
    const featureOffsets = this.calculateOffsets(features, config);
    const expanded = new Float32Array(features.length * verticesPerFeature);

    for (let i = 0; i < features.length; i++) {
      const offset = featureOffsets[i];
      const baseIndex = i * verticesPerFeature;
      for (let j = 0; j < verticesPerFeature; j++) {
        expanded[baseIndex + j] = offset;
      }
    }

    return expanded;
  }
}

/**
 * Default TimeOffsetCalculator instance
 */
export const defaultTimeOffsetCalculator = new TimeOffsetCalculator();

export default TimeOffsetCalculator;
