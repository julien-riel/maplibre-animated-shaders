/**
 * Expression evaluation module for data-driven shader properties
 *
 * This module provides tools for evaluating MapLibre-style expressions
 * against GeoJSON features, enabling per-feature shader configuration.
 *
 * @example
 * ```typescript
 * import { ExpressionEvaluator, isExpression, FeatureDataBuffer } from './expressions';
 *
 * // Check if a config value is an expression
 * if (isExpression(config.color)) {
 *   // Evaluate for all features
 *   const evaluator = new ExpressionEvaluator();
 *   evaluator.compile('color', config.color, 'color');
 *   const colors = evaluator.extractColorValues('color', defaultColor, features, zoom);
 *
 *   // Upload to GPU
 *   const buffer = new FeatureDataBuffer();
 *   buffer.setAttributeData('a_color', colors);
 * }
 * ```
 */

export {
  ExpressionEvaluator,
  defaultExpressionEvaluator,
  isExpression,
  type EvaluatedConfig,
} from './ExpressionEvaluator';

export {
  FeatureDataBuffer,
  registerStandardAttributes,
  interleaveAttributes,
  type AttributeType,
} from './FeatureDataBuffer';
