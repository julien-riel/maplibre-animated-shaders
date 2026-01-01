/**
 * ExpressionEvaluator - Wrapper around MapLibre's expression system
 *
 * This module provides a simplified interface for evaluating MapLibre-style
 * expressions against GeoJSON features, enabling data-driven shader parameters.
 *
 * @example
 * ```typescript
 * const evaluator = new ExpressionEvaluator();
 *
 * // Compile expressions from config
 * evaluator.compileConfig({
 *   color: ['get', 'status_color'],
 *   speed: ['coalesce', ['get', 'animation_speed'], 1.0],
 *   intensity: ['match', ['get', 'priority'],
 *     'high', 1.0,
 *     'medium', 0.6,
 *     0.5
 *   ],
 * });
 *
 * // Evaluate for each feature
 * const values = evaluator.evaluateForFeature(config, feature, zoom);
 * ```
 */

import {
  createExpression,
  isExpression as maplibreIsExpression,
} from '@maplibre/maplibre-gl-style-spec';
import type {
  StyleExpression,
  GlobalProperties,
} from '@maplibre/maplibre-gl-style-spec';

/**
 * Extended expression type with 'kind' property for data-driven detection
 */
interface ExtendedStyleExpression extends StyleExpression {
  kind?: string;
}

/**
 * Check if a value is a MapLibre expression (array starting with an operator)
 */
export function isExpression(value: unknown): value is unknown[] {
  return maplibreIsExpression(value);
}

/**
 * Result of expression compilation
 */
interface CompiledExpression {
  expression: ExtendedStyleExpression;
  isDataDriven: boolean;
}

/**
 * Result of evaluating expressions for a feature
 */
export interface EvaluatedConfig {
  [key: string]: unknown;
}

/**
 * Wrapper around MapLibre's expression system for data-driven shader properties
 */
export class ExpressionEvaluator {
  /**
   * Cache of compiled expressions by config key
   */
  private compiledExpressions: Map<string, CompiledExpression> = new Map();

  /**
   * Keys that contain expressions (for quick lookup)
   */
  private expressionKeys: Set<string> = new Set();

  /**
   * Clear all compiled expressions
   */
  clear(): void {
    this.compiledExpressions.clear();
    this.expressionKeys.clear();
  }

  /**
   * Compile a single expression
   *
   * @param key - Config key for error messages
   * @param expression - MapLibre expression to compile
   * @param expectedType - Expected output type ('number', 'color', 'string', etc.)
   * @returns Compiled expression or null if not an expression
   */
  compile(
    key: string,
    expression: unknown,
    expectedType: string = 'number'
  ): CompiledExpression | null {
    // Not an expression - return null
    if (!isExpression(expression)) {
      return null;
    }

    // Create the expression with proper type specification
    const result = createExpression(expression, {
      type: expectedType,
      // Allow data-driven (feature-dependent) expressions
      'property-type': 'data-driven',
      expression: {
        interpolated: true,
        parameters: ['zoom', 'feature'],
      },
    } as unknown as Parameters<typeof createExpression>[1]);

    if (result.result === 'error') {
      const errors = result.value.map((e) => e.message).join(', ');
      throw new Error(`Invalid expression for "${key}": ${errors}`);
    }

    const expr = result.value as ExtendedStyleExpression;
    const compiled: CompiledExpression = {
      expression: expr,
      isDataDriven: expr.kind === 'source' || expr.kind === 'composite',
    };

    this.compiledExpressions.set(key, compiled);
    this.expressionKeys.add(key);

    return compiled;
  }

  /**
   * Compile all expressions in a configuration object
   *
   * @param config - Configuration object that may contain expressions
   * @param schema - Optional schema to determine expected types
   */
  compileConfig(
    config: Record<string, unknown>,
    schema?: Record<string, { type: string }>
  ): void {
    this.clear();

    for (const [key, value] of Object.entries(config)) {
      if (isExpression(value)) {
        // Determine expected type from schema or default to 'number'
        let expectedType = 'number';
        if (schema?.[key]) {
          const schemaType = schema[key].type;
          if (schemaType === 'color') {
            expectedType = 'color';
          } else if (schemaType === 'string') {
            expectedType = 'string';
          } else if (schemaType === 'boolean') {
            expectedType = 'boolean';
          }
        }

        this.compile(key, value, expectedType);
      }
    }
  }

  /**
   * Check if a config key has a compiled expression
   */
  hasExpression(key: string): boolean {
    return this.expressionKeys.has(key);
  }

  /**
   * Check if any expressions are data-driven (depend on feature properties)
   */
  hasDataDrivenExpressions(): boolean {
    for (const compiled of this.compiledExpressions.values()) {
      if (compiled.isDataDriven) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all keys that have expressions
   */
  getExpressionKeys(): string[] {
    return Array.from(this.expressionKeys);
  }

  /**
   * Evaluate a single expression for a feature
   *
   * @param key - Config key
   * @param feature - GeoJSON feature
   * @param zoom - Current map zoom level
   * @returns Evaluated value or undefined if no expression for this key
   */
  evaluateExpression(
    key: string,
    feature: GeoJSON.Feature,
    zoom: number
  ): unknown | undefined {
    const compiled = this.compiledExpressions.get(key);
    if (!compiled) {
      return undefined;
    }

    const globals: GlobalProperties = { zoom };

    // Create a feature object that works with the expression evaluator
    // The evaluate method expects properties and optional id
    const evalFeature = {
      properties: feature.properties || {},
      id: feature.id,
      type: feature.geometry?.type,
    };

    return compiled.expression.evaluate(globals, evalFeature as Parameters<typeof compiled.expression.evaluate>[1]);
  }

  /**
   * Evaluate all expressions for a feature, merging with static config values
   *
   * @param config - Original configuration (may contain expressions and static values)
   * @param feature - GeoJSON feature
   * @param zoom - Current map zoom level
   * @returns Configuration with all expressions evaluated
   */
  evaluateForFeature(
    config: Record<string, unknown>,
    feature: GeoJSON.Feature,
    zoom: number
  ): EvaluatedConfig {
    const result: EvaluatedConfig = {};

    for (const [key, value] of Object.entries(config)) {
      if (this.expressionKeys.has(key)) {
        // Evaluate expression
        result[key] = this.evaluateExpression(key, feature, zoom);
      } else {
        // Static value - pass through
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Evaluate all expressions for multiple features
   *
   * Optimized for batch evaluation - reuses compiled expressions
   *
   * @param config - Original configuration
   * @param features - Array of GeoJSON features
   * @param zoom - Current map zoom level
   * @returns Array of evaluated configs, one per feature
   */
  evaluateForFeatures(
    config: Record<string, unknown>,
    features: GeoJSON.Feature[],
    zoom: number
  ): EvaluatedConfig[] {
    // If no expressions, return the same config for all features
    if (this.expressionKeys.size === 0) {
      return features.map(() => ({ ...config }));
    }

    return features.map((feature) =>
      this.evaluateForFeature(config, feature, zoom)
    );
  }

  /**
   * Extract values for a specific key across all features
   *
   * Useful for creating per-feature attribute buffers
   *
   * @param key - Config key to extract
   * @param staticValue - Static value to use if no expression
   * @param features - Array of GeoJSON features
   * @param zoom - Current map zoom level
   * @returns Array of values, one per feature
   */
  extractValues<T>(
    key: string,
    staticValue: T,
    features: GeoJSON.Feature[],
    zoom: number
  ): T[] {
    if (!this.expressionKeys.has(key)) {
      // No expression - return static value for all features
      return features.map(() => staticValue);
    }

    return features.map(
      (feature) => this.evaluateExpression(key, feature, zoom) as T
    );
  }

  /**
   * Extract numeric values for a specific key, returning a Float32Array
   *
   * Optimized for GPU buffer creation
   *
   * @param key - Config key to extract
   * @param staticValue - Static value to use if no expression
   * @param features - Array of GeoJSON features
   * @param zoom - Current map zoom level
   * @returns Float32Array of values
   */
  extractNumericValues(
    key: string,
    staticValue: number,
    features: GeoJSON.Feature[],
    zoom: number
  ): Float32Array {
    const values = new Float32Array(features.length);

    if (!this.expressionKeys.has(key)) {
      // No expression - fill with static value
      values.fill(staticValue);
      return values;
    }

    for (let i = 0; i < features.length; i++) {
      const value = this.evaluateExpression(key, features[i], zoom);
      values[i] = typeof value === 'number' ? value : staticValue;
    }

    return values;
  }

  /**
   * Extract color values, returning RGBA Float32Array (4 values per feature)
   *
   * @param key - Config key to extract
   * @param staticColor - Static RGBA color [r, g, b, a] (0-1 range)
   * @param features - Array of GeoJSON features
   * @param zoom - Current map zoom level
   * @returns Float32Array of RGBA values (length = features.length * 4)
   */
  extractColorValues(
    key: string,
    staticColor: [number, number, number, number],
    features: GeoJSON.Feature[],
    zoom: number
  ): Float32Array {
    const values = new Float32Array(features.length * 4);

    if (!this.expressionKeys.has(key)) {
      // No expression - fill with static color
      for (let i = 0; i < features.length; i++) {
        const offset = i * 4;
        values[offset] = staticColor[0];
        values[offset + 1] = staticColor[1];
        values[offset + 2] = staticColor[2];
        values[offset + 3] = staticColor[3];
      }
      return values;
    }

    for (let i = 0; i < features.length; i++) {
      const value = this.evaluateExpression(key, features[i], zoom);
      const offset = i * 4;

      if (value && typeof value === 'object' && 'r' in value) {
        // Color object from MapLibre expression
        const color = value as { r: number; g: number; b: number; a: number };
        values[offset] = color.r;
        values[offset + 1] = color.g;
        values[offset + 2] = color.b;
        values[offset + 3] = color.a;
      } else {
        // Fallback to static color
        values[offset] = staticColor[0];
        values[offset + 1] = staticColor[1];
        values[offset + 2] = staticColor[2];
        values[offset + 3] = staticColor[3];
      }
    }

    return values;
  }
}

/**
 * Default shared instance for simple use cases
 */
export const defaultExpressionEvaluator = new ExpressionEvaluator();
