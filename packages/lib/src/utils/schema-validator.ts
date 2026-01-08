/**
 * Schema Validator Utilities
 *
 * Standalone utilities for validating shader configurations against schemas
 * and generating TypeScript type definitions from schemas.
 *
 * @module utils/schema-validator
 *
 * @example
 * ```typescript
 * import {
 *   validateConfig,
 *   generateTypeDefinition,
 *   getSchemaDefaults,
 *   isValidColor
 * } from 'maplibre-animated-shaders';
 *
 * // Validate a configuration
 * const result = validateConfig(config, schema);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 *
 * // Generate TypeScript interface from schema
 * const typeDef = generateTypeDefinition(schema, 'MyShaderConfig');
 * console.log(typeDef);
 * ```
 */

import type { ConfigParamSchema, ConfigSchema, ShaderConfig } from '../types';
import { isExpression } from '../expressions';

/**
 * Extended validation result with detailed error information
 */
export interface SchemaValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** List of validation errors */
  errors: SchemaValidationError[];
  /** List of validation warnings (non-blocking issues) */
  warnings: SchemaValidationWarning[];
}

/**
 * Detailed validation error
 */
export interface SchemaValidationError {
  /** Field that failed validation */
  field: string;
  /** Error message */
  message: string;
  /** The invalid value */
  value: unknown;
  /** Expected type or constraint */
  expected?: string;
  /** Suggestion for fixing the error */
  suggestion?: string;
}

/**
 * Validation warning (non-blocking)
 */
export interface SchemaValidationWarning {
  /** Field with the warning */
  field: string;
  /** Warning message */
  message: string;
  /** The value that triggered the warning */
  value: unknown;
}

/**
 * Hex color regex pattern
 */
const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

/**
 * Check if a string is a valid hex color
 *
 * @param value - Value to check
 * @returns True if value is a valid hex color
 *
 * @example
 * ```typescript
 * isValidHexColor('#fff');      // true
 * isValidHexColor('#ff6600');   // true
 * isValidHexColor('#ff6600aa'); // true (with alpha)
 * isValidHexColor('red');       // false
 * isValidHexColor('#gggggg');   // false
 * ```
 */
export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

/**
 * Check if a value is a valid RGBA color array
 *
 * @param value - Value to check
 * @returns True if value is a valid RGBA array [r, g, b, a] with values 0-1
 */
export function isValidRgbaArray(value: unknown): value is [number, number, number, number] {
  if (!Array.isArray(value) || value.length !== 4) {
    return false;
  }
  return value.every(
    (component) => typeof component === 'number' && component >= 0 && component <= 1
  );
}

/**
 * Check if a value is a valid color (hex string or RGBA array)
 *
 * @param value - Value to check
 * @returns True if value is a valid color
 *
 * @example
 * ```typescript
 * isValidColor('#ff6600');           // true
 * isValidColor([1, 0.4, 0, 1]);      // true
 * isValidColor('red');               // false
 * isValidColor([1, 0.4, 0]);         // false (missing alpha)
 * isValidColor([256, 0, 0, 1]);      // false (out of range)
 * ```
 */
export function isValidColor(value: unknown): boolean {
  if (typeof value === 'string') {
    return isValidHexColor(value);
  }
  return isValidRgbaArray(value);
}

/**
 * Validate a configuration value against a parameter schema
 *
 * @param field - Field name
 * @param value - Value to validate
 * @param schema - Parameter schema
 * @returns Validation error or null if valid
 */
function validateField(
  field: string,
  value: unknown,
  schema: ConfigParamSchema
): SchemaValidationError | null {
  // Skip validation for MapLibre expressions (data-driven values)
  if (isExpression(value)) {
    return null;
  }

  switch (schema.type) {
    case 'number':
      return validateNumber(field, value, schema);
    case 'color':
      return validateColor(field, value, schema);
    case 'boolean':
      return validateBoolean(field, value);
    case 'string':
      return validateString(field, value);
    case 'select':
      return validateSelect(field, value, schema);
    case 'array':
      return validateArray(field, value);
    default:
      return null;
  }
}

/**
 * Validate a number field
 */
function validateNumber(
  field: string,
  value: unknown,
  schema: ConfigParamSchema
): SchemaValidationError | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      field,
      message: `Expected number, got ${typeof value}`,
      value,
      expected: 'number',
      suggestion: `Provide a numeric value for '${field}'`,
    };
  }

  if (schema.min !== undefined && value < schema.min) {
    return {
      field,
      message: `Value ${value} is below minimum ${schema.min}`,
      value,
      expected: `>= ${schema.min}`,
      suggestion: `Use a value of at least ${schema.min}`,
    };
  }

  if (schema.max !== undefined && value > schema.max) {
    return {
      field,
      message: `Value ${value} is above maximum ${schema.max}`,
      value,
      expected: `<= ${schema.max}`,
      suggestion: `Use a value of at most ${schema.max}`,
    };
  }

  return null;
}

/**
 * Validate a color field
 */
function validateColor(
  field: string,
  value: unknown,
  schema: ConfigParamSchema
): SchemaValidationError | null {
  if (typeof value === 'string') {
    if (!isValidHexColor(value)) {
      return {
        field,
        message: 'Invalid hex color format',
        value,
        expected: '#RGB, #RRGGBB, or #RRGGBBAA',
        suggestion: `Use a valid hex color like '${schema.default || '#3b82f6'}'`,
      };
    }
    return null;
  }

  if (Array.isArray(value)) {
    if (value.length !== 4) {
      return {
        field,
        message: 'Color array must have 4 components [r, g, b, a]',
        value,
        expected: '[r, g, b, a]',
        suggestion: 'Add the alpha component (e.g., 1 for fully opaque)',
      };
    }
    for (let i = 0; i < 4; i++) {
      const component = value[i];
      if (typeof component !== 'number' || component < 0 || component > 1) {
        return {
          field,
          message: `Color component ${i} must be a number between 0 and 1`,
          value,
          expected: '0-1 for each component',
          suggestion: 'Normalize color values to 0-1 range (divide by 255 if using 0-255)',
        };
      }
    }
    return null;
  }

  return {
    field,
    message: 'Invalid color type, expected hex string or RGBA array',
    value,
    expected: 'string or [number, number, number, number]',
    suggestion: "Use a hex color like '#ff6600' or an RGBA array like [1, 0.4, 0, 1]",
  };
}

/**
 * Validate a boolean field
 */
function validateBoolean(field: string, value: unknown): SchemaValidationError | null {
  if (typeof value !== 'boolean') {
    return {
      field,
      message: `Expected boolean, got ${typeof value}`,
      value,
      expected: 'boolean',
      suggestion: 'Use true or false',
    };
  }
  return null;
}

/**
 * Validate a string field
 */
function validateString(field: string, value: unknown): SchemaValidationError | null {
  if (typeof value !== 'string') {
    return {
      field,
      message: `Expected string, got ${typeof value}`,
      value,
      expected: 'string',
      suggestion: `Provide a string value for '${field}'`,
    };
  }
  return null;
}

/**
 * Validate a select field
 */
function validateSelect(
  field: string,
  value: unknown,
  schema: ConfigParamSchema
): SchemaValidationError | null {
  if (typeof value !== 'string') {
    return {
      field,
      message: `Expected string, got ${typeof value}`,
      value,
      expected: 'string',
      suggestion: 'Provide one of the valid options',
    };
  }

  if (schema.options && !schema.options.includes(value)) {
    return {
      field,
      message: `Invalid option "${value}"`,
      value,
      expected: `one of: ${schema.options.join(', ')}`,
      suggestion: `Choose one of: ${schema.options.join(', ')}`,
    };
  }

  return null;
}

/**
 * Validate an array field
 */
function validateArray(field: string, value: unknown): SchemaValidationError | null {
  if (!Array.isArray(value)) {
    return {
      field,
      message: `Expected array, got ${typeof value}`,
      value,
      expected: 'array',
      suggestion: `Provide an array value for '${field}'`,
    };
  }
  return null;
}

/**
 * Validate a configuration object against a schema
 *
 * Performs comprehensive validation including:
 * - Type checking for all fields
 * - Range validation for numbers (min/max)
 * - Format validation for colors
 * - Option validation for select fields
 * - Skips validation for MapLibre expressions (data-driven values)
 *
 * @param config - Configuration to validate
 * @param schema - Schema to validate against
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const schema: ConfigSchema = {
 *   speed: { type: 'number', default: 1.0, min: 0.1, max: 5.0 },
 *   color: { type: 'color', default: '#3b82f6' },
 *   enabled: { type: 'boolean', default: true },
 * };
 *
 * const config = { speed: 2.0, color: '#invalid', enabled: 'yes' };
 * const result = validateConfig(config, schema);
 *
 * // result.valid = false
 * // result.errors = [
 * //   { field: 'color', message: 'Invalid hex color format', ... },
 * //   { field: 'enabled', message: 'Expected boolean, got string', ... }
 * // ]
 * ```
 */
export function validateConfig<T extends ShaderConfig>(
  config: T,
  schema: ConfigSchema
): SchemaValidationResult {
  const errors: SchemaValidationError[] = [];
  const warnings: SchemaValidationWarning[] = [];

  // Check for missing required fields
  for (const [field, paramSchema] of Object.entries(schema)) {
    const value = config[field];

    // If field is missing and has no default, add warning
    if (value === undefined && paramSchema.default === undefined) {
      warnings.push({
        field,
        message: `Field '${field}' is not provided and has no default`,
        value: undefined,
      });
      continue;
    }

    // Skip undefined values (will use default)
    if (value === undefined) {
      continue;
    }

    // Validate the field
    const error = validateField(field, value, paramSchema);
    if (error) {
      errors.push(error);
    }
  }

  // Check for unknown fields (optional warning)
  for (const field of Object.keys(config)) {
    if (!(field in schema)) {
      warnings.push({
        field,
        message: `Unknown field '${field}' not in schema`,
        value: config[field],
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extract default values from a schema
 *
 * Creates a configuration object populated with all default values.
 *
 * @param schema - Configuration schema
 * @returns Object with all default values
 *
 * @example
 * ```typescript
 * const schema: ConfigSchema = {
 *   speed: { type: 'number', default: 1.0 },
 *   color: { type: 'color', default: '#3b82f6' },
 *   enabled: { type: 'boolean', default: true },
 * };
 *
 * const defaults = getSchemaDefaults(schema);
 * // { speed: 1.0, color: '#3b82f6', enabled: true }
 * ```
 */
export function getSchemaDefaults<T extends ShaderConfig>(schema: ConfigSchema): T {
  const defaults: Record<string, unknown> = {};

  for (const [field, paramSchema] of Object.entries(schema)) {
    if (paramSchema.default !== undefined) {
      defaults[field] = paramSchema.default;
    }
  }

  return defaults as T;
}

/**
 * Merge user configuration with schema defaults
 *
 * @param config - User configuration (partial)
 * @param schema - Configuration schema
 * @returns Complete configuration with defaults filled in
 *
 * @example
 * ```typescript
 * const schema: ConfigSchema = {
 *   speed: { type: 'number', default: 1.0 },
 *   color: { type: 'color', default: '#3b82f6' },
 * };
 *
 * const config = mergeWithDefaults({ speed: 2.0 }, schema);
 * // { speed: 2.0, color: '#3b82f6' }
 * ```
 */
export function mergeWithDefaults<T extends ShaderConfig>(
  config: Partial<T>,
  schema: ConfigSchema
): T {
  const defaults = getSchemaDefaults<T>(schema);
  return { ...defaults, ...config } as T;
}

/**
 * Map schema param type to TypeScript type string
 */
function paramTypeToTsType(param: ConfigParamSchema): string {
  switch (param.type) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'color':
      return 'string | [number, number, number, number]';
    case 'string':
      return 'string';
    case 'select':
      if (param.options && param.options.length > 0) {
        return param.options.map((o) => `'${o}'`).join(' | ');
      }
      return 'string';
    case 'array':
      return 'unknown[]';
    default:
      return 'unknown';
  }
}

/**
 * Generate TypeScript interface definition from a schema
 *
 * Creates a TypeScript interface string that can be used for documentation
 * or as a reference for type-safe configuration.
 *
 * @param schema - Configuration schema
 * @param interfaceName - Name for the generated interface (default: 'Config')
 * @returns TypeScript interface definition as a string
 *
 * @example
 * ```typescript
 * const schema: ConfigSchema = {
 *   speed: {
 *     type: 'number',
 *     default: 1.0,
 *     min: 0.1,
 *     max: 5.0,
 *     description: 'Animation speed multiplier'
 *   },
 *   color: {
 *     type: 'color',
 *     default: '#3b82f6',
 *     description: 'Primary color'
 *   },
 *   easing: {
 *     type: 'select',
 *     default: 'linear',
 *     options: ['linear', 'easeIn', 'easeOut'],
 *     description: 'Easing function'
 *   }
 * };
 *
 * const typeDef = generateTypeDefinition(schema, 'PulseConfig');
 * console.log(typeDef);
 * // Outputs a TypeScript interface string with JSDoc comments
 * ```
 */
export function generateTypeDefinition(schema: ConfigSchema, interfaceName = 'Config'): string {
  const lines: string[] = [`interface ${interfaceName} {`];

  for (const [key, param] of Object.entries(schema)) {
    const tsType = paramTypeToTsType(param);

    // Build JSDoc comment
    const docParts: string[] = [];
    if (param.description) {
      docParts.push(param.description);
    }
    if (param.default !== undefined) {
      const defaultStr =
        typeof param.default === 'string' ? `'${param.default}'` : String(param.default);
      docParts.push(`(default: ${defaultStr})`);
    }
    if (param.min !== undefined || param.max !== undefined) {
      const range = [];
      if (param.min !== undefined) range.push(`min: ${param.min}`);
      if (param.max !== undefined) range.push(`max: ${param.max}`);
      docParts.push(`[${range.join(', ')}]`);
    }

    if (docParts.length > 0) {
      lines.push(`  /** ${docParts.join(' ')} */`);
    }

    lines.push(`  ${key}: ${tsType};`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate a human-readable description of a schema
 *
 * Creates a markdown-formatted table describing all configuration options.
 *
 * @param schema - Configuration schema
 * @param title - Optional title for the table
 * @returns Markdown-formatted table string
 *
 * @example
 * ```typescript
 * const docs = generateSchemaDocumentation(schema, 'Configuration Options');
 * console.log(docs);
 * // Outputs a markdown table with Property, Type, Default, Constraints, Description columns
 * ```
 */
export function generateSchemaDocumentation(schema: ConfigSchema, title?: string): string {
  const lines: string[] = [];

  if (title) {
    lines.push(`## ${title}`, '');
  }

  lines.push('| Property | Type | Default | Constraints | Description |');
  lines.push('|----------|------|---------|-------------|-------------|');

  for (const [key, param] of Object.entries(schema)) {
    const type = param.type;
    const defaultValue =
      param.default !== undefined
        ? typeof param.default === 'string'
          ? `\`${param.default}\``
          : String(param.default)
        : '-';

    // Build constraints string
    const constraints: string[] = [];
    if (param.min !== undefined) constraints.push(`min: ${param.min}`);
    if (param.max !== undefined) constraints.push(`max: ${param.max}`);
    if (param.step !== undefined) constraints.push(`step: ${param.step}`);
    if (param.options) constraints.push(`options: ${param.options.join(', ')}`);
    const constraintStr = constraints.length > 0 ? constraints.join(', ') : '-';

    const description = param.description || '-';

    lines.push(`| ${key} | ${type} | ${defaultValue} | ${constraintStr} | ${description} |`);
  }

  return lines.join('\n');
}

/**
 * Create a schema from default values (useful for simple shaders)
 *
 * Infers types from the default values to create a basic schema.
 * Note: This creates a minimal schema without constraints or descriptions.
 *
 * @param defaults - Object with default configuration values
 * @returns Generated schema
 *
 * @example
 * ```typescript
 * const defaults = {
 *   speed: 1.0,
 *   color: '#3b82f6',
 *   enabled: true,
 * };
 *
 * const schema = createSchemaFromDefaults(defaults);
 * // schema.speed.type === 'number'
 * // schema.color.type === 'color'
 * // schema.enabled.type === 'boolean'
 * ```
 */
export function createSchemaFromDefaults(defaults: Record<string, unknown>): ConfigSchema {
  const schema: ConfigSchema = {};

  for (const [key, value] of Object.entries(defaults)) {
    if (typeof value === 'number') {
      schema[key] = { type: 'number', default: value };
    } else if (typeof value === 'boolean') {
      schema[key] = { type: 'boolean', default: value };
    } else if (typeof value === 'string') {
      // Check if it looks like a color
      if (isValidHexColor(value)) {
        schema[key] = { type: 'color', default: value };
      } else {
        schema[key] = { type: 'string', default: value };
      }
    } else if (Array.isArray(value)) {
      // Check if it's an RGBA array
      if (isValidRgbaArray(value)) {
        schema[key] = { type: 'color', default: value };
      } else {
        schema[key] = { type: 'array', default: value };
      }
    } else {
      schema[key] = { type: 'string', default: String(value) };
    }
  }

  return schema;
}

/**
 * Format validation errors for display
 *
 * @param result - Validation result
 * @returns Formatted error string
 */
export function formatValidationErrors(result: SchemaValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return 'Configuration is valid.';
  }

  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('Validation Errors:');
    for (const error of result.errors) {
      lines.push(`  - ${error.field}: ${error.message}`);
      if (error.expected) {
        lines.push(`    Expected: ${error.expected}`);
      }
      if (error.suggestion) {
        lines.push(`    Suggestion: ${error.suggestion}`);
      }
    }
  }

  if (result.warnings.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  - ${warning.field}: ${warning.message}`);
    }
  }

  return lines.join('\n');
}
