import type {
  ConfigParamSchema,
  ConfigSchema,
  IConfigResolver,
  ShaderConfig,
  ValidationError,
  ValidationResult,
} from './types';
import { isExpression } from './expressions';

/**
 * Resolves and validates shader configurations.
 * Merges user config with defaults and validates against schema.
 */
export class ConfigResolver implements IConfigResolver {
  /**
   * Resolve user configuration with defaults.
   * Deep merges the configurations, with user values taking precedence.
   */
  resolve<T extends ShaderConfig>(defaults: T, userConfig?: Partial<T>): T {
    if (!userConfig) {
      return { ...defaults };
    }

    const resolved: ShaderConfig = { ...defaults };

    for (const key of Object.keys(userConfig)) {
      const userValue = userConfig[key as keyof typeof userConfig];
      if (userValue !== undefined) {
        resolved[key] = userValue as ShaderConfig[string];
      }
    }

    return resolved as T;
  }

  /**
   * Validate configuration against a schema.
   * Returns validation result with any errors.
   */
  validate(config: ShaderConfig, schema: ConfigSchema): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, paramSchema] of Object.entries(schema)) {
      const value = config[field];

      // Check if value exists or use default
      if (value === undefined) {
        continue; // Will use default value
      }

      const error = this.validateField(field, value, paramSchema);
      if (error) {
        errors.push(error);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single field against its schema
   */
  private validateField(
    field: string,
    value: unknown,
    schema: ConfigParamSchema
  ): ValidationError | null {
    // Skip validation for MapLibre expressions - they are valid data-driven values
    // that will be evaluated per-feature at render time
    if (isExpression(value)) {
      return null;
    }

    switch (schema.type) {
      case 'number':
        return this.validateNumber(field, value, schema);
      case 'color':
        return this.validateColor(field, value);
      case 'boolean':
        return this.validateBoolean(field, value);
      case 'string':
        return this.validateString(field, value);
      case 'select':
        return this.validateSelect(field, value, schema);
      case 'array':
        return this.validateArray(field, value);
      default:
        return null;
    }
  }

  private validateNumber(
    field: string,
    value: unknown,
    schema: ConfigParamSchema
  ): ValidationError | null {
    if (typeof value !== 'number' || isNaN(value)) {
      return { field, message: `Expected number, got ${typeof value}`, value };
    }

    if (schema.min !== undefined && value < schema.min) {
      return { field, message: `Value ${value} is below minimum ${schema.min}`, value };
    }

    if (schema.max !== undefined && value > schema.max) {
      return { field, message: `Value ${value} is above maximum ${schema.max}`, value };
    }

    return null;
  }

  private validateColor(field: string, value: unknown): ValidationError | null {
    if (typeof value === 'string') {
      // Validate hex color
      if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value)) {
        return { field, message: `Invalid hex color format`, value };
      }
      return null;
    }

    if (Array.isArray(value)) {
      // Validate RGBA array
      if (value.length !== 4) {
        return { field, message: `Color array must have 4 components`, value };
      }
      for (const component of value) {
        if (typeof component !== 'number' || component < 0 || component > 1) {
          return { field, message: `Color components must be numbers between 0 and 1`, value };
        }
      }
      return null;
    }

    return { field, message: `Invalid color type, expected string or array`, value };
  }

  private validateBoolean(field: string, value: unknown): ValidationError | null {
    if (typeof value !== 'boolean') {
      return { field, message: `Expected boolean, got ${typeof value}`, value };
    }
    return null;
  }

  private validateString(field: string, value: unknown): ValidationError | null {
    if (typeof value !== 'string') {
      return { field, message: `Expected string, got ${typeof value}`, value };
    }
    return null;
  }

  private validateSelect(
    field: string,
    value: unknown,
    schema: ConfigParamSchema
  ): ValidationError | null {
    if (typeof value !== 'string') {
      return { field, message: `Expected string, got ${typeof value}`, value };
    }

    if (schema.options && !schema.options.includes(value)) {
      return {
        field,
        message: `Invalid option "${value}", must be one of: ${schema.options.join(', ')}`,
        value,
      };
    }

    return null;
  }

  private validateArray(field: string, value: unknown): ValidationError | null {
    if (!Array.isArray(value)) {
      return { field, message: `Expected array, got ${typeof value}`, value };
    }
    return null;
  }
}
