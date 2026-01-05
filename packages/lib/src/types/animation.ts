/**
 * Animation Timing Types
 *
 * Types for animation timing, offset, and randomization.
 */

import type { ShaderConfig } from './core';

/**
 * Time offset value specification
 *
 * - number: Fixed offset in seconds
 * - 'random': Random offset within [0, period]
 * - ['get', string]: Value from feature property
 * - ['hash', string]: Stable hash of feature property (normalized to [0, period])
 * - { min, max }: Random offset within range
 */
export type TimeOffsetValue =
  | number
  | 'random'
  | ['get', string]
  | ['hash', string]
  | { min: number; max: number };

/**
 * Animation timing configuration
 *
 * Controls per-feature time offset for animation desynchronization
 */
export interface AnimationTimingConfig {
  /**
   * Time offset mode
   *
   * @example
   * // Fixed offset
   * timeOffset: 0.5
   *
   * // Random offset within period
   * timeOffset: 'random'
   *
   * // Value from feature property
   * timeOffset: ['get', 'animation_delay']
   *
   * // Stable hash of property (reproducible)
   * timeOffset: ['hash', 'id']
   *
   * // Random within range
   * timeOffset: { min: 0, max: 2 }
   */
  timeOffset?: TimeOffsetValue;

  /**
   * Seed for reproducible random offsets
   *
   * Can be a number or string. Same seed produces same offsets.
   */
  randomSeed?: number | string;

  /**
   * Animation period in seconds
   *
   * Used to normalize offset values for 'random' and 'hash' modes.
   * @default 1
   */
  period?: number;
}

/**
 * Extended shader config with timing support
 */
export interface TimedShaderConfig extends ShaderConfig, AnimationTimingConfig {}
