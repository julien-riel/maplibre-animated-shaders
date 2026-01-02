/**
 * Data-Driven Expression Types
 *
 * Types for MapLibre-style expressions and data-driven properties.
 */

import type { ShaderConfig } from './core';
import type { AnimationTimingConfig } from './animation';

/**
 * MapLibre expression types for data-driven properties
 *
 * These expressions are evaluated per-feature using MapLibre's expression system.
 */
export type DataDrivenExpression =
  | ['get', string]
  | ['coalesce', ...unknown[]]
  | ['match', ...unknown[]]
  | ['interpolate', ...unknown[]]
  | ['case', ...unknown[]]
  | ['step', ...unknown[]]
  | ['literal', unknown]
  | ['==', ...unknown[]]
  | ['!=', ...unknown[]]
  | ['<', ...unknown[]]
  | ['<=', ...unknown[]]
  | ['>', ...unknown[]]
  | ['>=', ...unknown[]]
  | ['+', ...unknown[]]
  | ['-', ...unknown[]]
  | ['*', ...unknown[]]
  | ['/', ...unknown[]]
  | ['%', ...unknown[]]
  | ['^', ...unknown[]]
  | ['sqrt', unknown]
  | ['abs', unknown]
  | ['min', ...unknown[]]
  | ['max', ...unknown[]]
  | ['round', unknown]
  | ['floor', unknown]
  | ['ceil', unknown]
  | ['sin', unknown]
  | ['cos', unknown]
  | ['tan', unknown]
  | ['asin', unknown]
  | ['acos', unknown]
  | ['atan', unknown]
  | ['ln', unknown]
  | ['log10', unknown]
  | ['log2', unknown]
  | ['e']
  | ['pi']
  | ['zoom']
  | ['concat', ...unknown[]]
  | ['downcase', unknown]
  | ['upcase', unknown]
  | ['length', unknown]
  | ['rgb', number, number, number]
  | ['rgba', number, number, number, number]
  | ['to-color', unknown]
  | ['to-number', unknown]
  | ['to-string', unknown]
  | ['to-boolean', unknown]
  | ['all', ...unknown[]]
  | ['any', ...unknown[]]
  | ['!', unknown]
  | ['has', string]
  | ['in', ...unknown[]]
  | ['index-of', ...unknown[]]
  | ['slice', ...unknown[]]
  | ['let', ...unknown[]]
  | ['var', string]
  | ['at', number, unknown[]]
  | unknown[]; // Fallback for any other valid expression

/**
 * A value that can be either static or data-driven
 */
export type DataDrivenValue<T> = T | DataDrivenExpression;

/**
 * Data-driven shader configuration
 *
 * Any property can be either a static value or a MapLibre expression
 */
export type DataDrivenShaderConfig<T extends ShaderConfig = ShaderConfig> = {
  [K in keyof T]: DataDrivenValue<T[K]>;
} & AnimationTimingConfig;
