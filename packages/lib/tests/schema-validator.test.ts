import { describe, it, expect } from 'vitest';
import {
  validateConfig,
  isValidHexColor,
  isValidRgbaArray,
  isValidColor,
  getSchemaDefaults,
  mergeWithDefaults,
  generateTypeDefinition,
  generateSchemaDocumentation,
  createSchemaFromDefaults,
  formatValidationErrors,
} from '../src/utils/schema-validator';
import type { ConfigSchema } from '../src/types';

describe('schema-validator', () => {
  describe('isValidHexColor', () => {
    it('should validate 3-digit hex colors', () => {
      expect(isValidHexColor('#fff')).toBe(true);
      expect(isValidHexColor('#FFF')).toBe(true);
      expect(isValidHexColor('#f00')).toBe(true);
    });

    it('should validate 6-digit hex colors', () => {
      expect(isValidHexColor('#ff6600')).toBe(true);
      expect(isValidHexColor('#FF6600')).toBe(true);
      expect(isValidHexColor('#000000')).toBe(true);
    });

    it('should validate 8-digit hex colors (with alpha)', () => {
      expect(isValidHexColor('#ff6600aa')).toBe(true);
      expect(isValidHexColor('#FF6600AA')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(isValidHexColor('ff6600')).toBe(false); // missing #
      expect(isValidHexColor('#gggggg')).toBe(false); // invalid chars
      expect(isValidHexColor('#ff66')).toBe(false); // wrong length
      expect(isValidHexColor('red')).toBe(false); // named color
      expect(isValidHexColor('')).toBe(false);
    });
  });

  describe('isValidRgbaArray', () => {
    it('should validate correct RGBA arrays', () => {
      expect(isValidRgbaArray([1, 0, 0, 1])).toBe(true);
      expect(isValidRgbaArray([0, 0, 0, 0])).toBe(true);
      expect(isValidRgbaArray([0.5, 0.5, 0.5, 0.5])).toBe(true);
    });

    it('should reject non-arrays', () => {
      expect(isValidRgbaArray('not an array')).toBe(false);
      expect(isValidRgbaArray(123)).toBe(false);
      expect(isValidRgbaArray(null)).toBe(false);
      expect(isValidRgbaArray(undefined)).toBe(false);
    });

    it('should reject arrays with wrong length', () => {
      expect(isValidRgbaArray([1, 0, 0])).toBe(false);
      expect(isValidRgbaArray([1, 0, 0, 1, 1])).toBe(false);
      expect(isValidRgbaArray([])).toBe(false);
    });

    it('should reject arrays with out-of-range values', () => {
      expect(isValidRgbaArray([2, 0, 0, 1])).toBe(false);
      expect(isValidRgbaArray([1, 0, 0, -0.1])).toBe(false);
      expect(isValidRgbaArray([256, 0, 0, 1])).toBe(false);
    });

    it('should reject arrays with non-number values', () => {
      expect(isValidRgbaArray(['1', 0, 0, 1])).toBe(false);
      expect(isValidRgbaArray([null, 0, 0, 1])).toBe(false);
    });
  });

  describe('isValidColor', () => {
    it('should accept valid hex colors', () => {
      expect(isValidColor('#ff6600')).toBe(true);
      expect(isValidColor('#fff')).toBe(true);
    });

    it('should accept valid RGBA arrays', () => {
      expect(isValidColor([1, 0.4, 0, 1])).toBe(true);
    });

    it('should reject invalid values', () => {
      expect(isValidColor('red')).toBe(false);
      expect(isValidColor([1, 0, 0])).toBe(false);
      expect(isValidColor(123)).toBe(false);
    });
  });

  describe('validateConfig', () => {
    const schema: ConfigSchema = {
      speed: {
        type: 'number',
        default: 1.0,
        min: 0.1,
        max: 5.0,
        description: 'Animation speed',
      },
      color: {
        type: 'color',
        default: '#3b82f6',
        description: 'Primary color',
      },
      enabled: {
        type: 'boolean',
        default: true,
        description: 'Enable effect',
      },
      mode: {
        type: 'select',
        default: 'normal',
        options: ['normal', 'fast', 'slow'],
        description: 'Animation mode',
      },
      label: {
        type: 'string',
        default: 'default',
        description: 'Display label',
      },
      items: {
        type: 'array',
        default: [],
        description: 'List of items',
      },
    };

    it('should validate a correct configuration', () => {
      const config = {
        speed: 2.0,
        color: '#ff6600',
        enabled: true,
        mode: 'fast',
        label: 'Test',
        items: [1, 2, 3],
      };

      const result = validateConfig(config, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip validation for undefined values', () => {
      const result = validateConfig({}, schema);
      expect(result.valid).toBe(true);
    });

    it('should report errors for invalid number types', () => {
      const result = validateConfig({ speed: 'fast' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('speed');
      expect(result.errors[0].message).toContain('Expected number');
      expect(result.errors[0].suggestion).toBeDefined();
    });

    it('should report errors for number below minimum', () => {
      const result = validateConfig({ speed: 0.05 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('below minimum');
      expect(result.errors[0].expected).toBe('>= 0.1');
    });

    it('should report errors for number above maximum', () => {
      const result = validateConfig({ speed: 10 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('above maximum');
      expect(result.errors[0].expected).toBe('<= 5');
    });

    it('should report errors for invalid color format', () => {
      const result = validateConfig({ color: 'red' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('color');
      expect(result.errors[0].message).toContain('Invalid hex color');
    });

    it('should report errors for invalid RGBA array', () => {
      const result = validateConfig({ color: [1, 0, 0] }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('4 components');
    });

    it('should report errors for invalid boolean', () => {
      const result = validateConfig({ enabled: 'yes' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Expected boolean');
    });

    it('should report errors for invalid select option', () => {
      const result = validateConfig({ mode: 'turbo' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid option');
    });

    it('should report errors for invalid string', () => {
      const result = validateConfig({ label: 123 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Expected string');
    });

    it('should report errors for invalid array', () => {
      const result = validateConfig({ items: 'not array' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Expected array');
    });

    it('should collect multiple errors', () => {
      const config = {
        speed: 'invalid',
        color: 123,
        enabled: 'yes',
      };

      const result = validateConfig(config, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    it('should warn about unknown fields', () => {
      const result = validateConfig({ unknownField: 'value' }, schema);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('unknownField');
      expect(result.warnings[0].message).toContain('Unknown field');
    });

    it('should skip validation for MapLibre expressions', () => {
      const config = {
        speed: ['get', 'speed_property'],
        color: ['match', ['get', 'type'], 'A', '#ff0000', '#00ff00'],
      };

      const result = validateConfig(config, schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('getSchemaDefaults', () => {
    it('should extract all default values', () => {
      const schema: ConfigSchema = {
        speed: { type: 'number', default: 1.0 },
        color: { type: 'color', default: '#3b82f6' },
        enabled: { type: 'boolean', default: true },
      };

      const defaults = getSchemaDefaults(schema);
      expect(defaults).toEqual({
        speed: 1.0,
        color: '#3b82f6',
        enabled: true,
      });
    });

    it('should skip fields without defaults', () => {
      const schema: ConfigSchema = {
        speed: { type: 'number', default: 1.0 },
        optional: { type: 'string' } as ConfigSchema['optional'],
      };

      const defaults = getSchemaDefaults(schema);
      expect(defaults).toEqual({ speed: 1.0 });
      expect('optional' in defaults).toBe(false);
    });
  });

  describe('mergeWithDefaults', () => {
    it('should merge user config with defaults', () => {
      const schema: ConfigSchema = {
        speed: { type: 'number', default: 1.0 },
        color: { type: 'color', default: '#3b82f6' },
      };

      const config = mergeWithDefaults({ speed: 2.0 }, schema);
      expect(config).toEqual({
        speed: 2.0,
        color: '#3b82f6',
      });
    });

    it('should return defaults when config is empty', () => {
      const schema: ConfigSchema = {
        speed: { type: 'number', default: 1.0 },
        color: { type: 'color', default: '#3b82f6' },
      };

      const config = mergeWithDefaults({}, schema);
      expect(config).toEqual({
        speed: 1.0,
        color: '#3b82f6',
      });
    });
  });

  describe('generateTypeDefinition', () => {
    it('should generate TypeScript interface', () => {
      const schema: ConfigSchema = {
        speed: {
          type: 'number',
          default: 1.0,
          min: 0.1,
          max: 5.0,
          description: 'Animation speed',
        },
        color: {
          type: 'color',
          default: '#3b82f6',
          description: 'Primary color',
        },
        easing: {
          type: 'select',
          default: 'linear',
          options: ['linear', 'easeIn', 'easeOut'],
          description: 'Easing function',
        },
      };

      const typeDef = generateTypeDefinition(schema, 'TestConfig');

      expect(typeDef).toContain('interface TestConfig');
      expect(typeDef).toContain('speed: number');
      expect(typeDef).toContain('color: string | [number, number, number, number]');
      expect(typeDef).toContain("'linear' | 'easeIn' | 'easeOut'");
      expect(typeDef).toContain('Animation speed');
      expect(typeDef).toContain('default: 1');
      expect(typeDef).toContain('min: 0.1');
      expect(typeDef).toContain('max: 5');
    });

    it('should use default interface name', () => {
      const schema: ConfigSchema = {
        value: { type: 'number', default: 0 },
      };

      const typeDef = generateTypeDefinition(schema);
      expect(typeDef).toContain('interface Config');
    });

    it('should handle all param types', () => {
      const schema: ConfigSchema = {
        num: { type: 'number', default: 0 },
        bool: { type: 'boolean', default: false },
        str: { type: 'string', default: '' },
        col: { type: 'color', default: '#000' },
        sel: { type: 'select', default: 'a', options: ['a', 'b'] },
        arr: { type: 'array', default: [] },
      };

      const typeDef = generateTypeDefinition(schema);
      expect(typeDef).toContain('num: number');
      expect(typeDef).toContain('bool: boolean');
      expect(typeDef).toContain('str: string');
      expect(typeDef).toContain('col: string | [number, number, number, number]');
      expect(typeDef).toContain("sel: 'a' | 'b'");
      expect(typeDef).toContain('arr: unknown[]');
    });
  });

  describe('generateSchemaDocumentation', () => {
    it('should generate markdown table', () => {
      const schema: ConfigSchema = {
        speed: {
          type: 'number',
          default: 1.0,
          min: 0.1,
          max: 5.0,
          description: 'Animation speed',
        },
      };

      const docs = generateSchemaDocumentation(schema, 'Configuration');

      expect(docs).toContain('## Configuration');
      expect(docs).toContain('| Property | Type | Default | Constraints | Description |');
      expect(docs).toContain('| speed | number | 1 | min: 0.1, max: 5 | Animation speed |');
    });

    it('should handle select options', () => {
      const schema: ConfigSchema = {
        mode: {
          type: 'select',
          default: 'normal',
          options: ['normal', 'fast'],
          description: 'Mode',
        },
      };

      const docs = generateSchemaDocumentation(schema);
      expect(docs).toContain('options: normal, fast');
    });
  });

  describe('createSchemaFromDefaults', () => {
    it('should infer types from default values', () => {
      const defaults = {
        speed: 1.0,
        color: '#3b82f6',
        enabled: true,
        label: 'test',
      };

      const schema = createSchemaFromDefaults(defaults);

      expect(schema.speed.type).toBe('number');
      expect(schema.speed.default).toBe(1.0);
      expect(schema.color.type).toBe('color');
      expect(schema.color.default).toBe('#3b82f6');
      expect(schema.enabled.type).toBe('boolean');
      expect(schema.enabled.default).toBe(true);
      expect(schema.label.type).toBe('string');
      expect(schema.label.default).toBe('test');
    });

    it('should detect RGBA arrays as colors', () => {
      const defaults = {
        color: [1, 0.4, 0, 1] as [number, number, number, number],
      };

      const schema = createSchemaFromDefaults(defaults);
      expect(schema.color.type).toBe('color');
    });

    it('should detect regular arrays', () => {
      const defaults = {
        items: [1, 2, 3],
      };

      const schema = createSchemaFromDefaults(defaults);
      expect(schema.items.type).toBe('array');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors nicely', () => {
      const result = {
        valid: false,
        errors: [
          {
            field: 'speed',
            message: 'Expected number, got string',
            value: 'fast',
            expected: 'number',
            suggestion: 'Provide a numeric value',
          },
        ],
        warnings: [
          {
            field: 'unknown',
            message: 'Unknown field',
            value: 'test',
          },
        ],
      };

      const formatted = formatValidationErrors(result);

      expect(formatted).toContain('Validation Errors:');
      expect(formatted).toContain('speed: Expected number, got string');
      expect(formatted).toContain('Expected: number');
      expect(formatted).toContain('Suggestion: Provide a numeric value');
      expect(formatted).toContain('Warnings:');
      expect(formatted).toContain('unknown: Unknown field');
    });

    it('should return success message for valid config', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [],
      };

      const formatted = formatValidationErrors(result);
      expect(formatted).toBe('Configuration is valid.');
    });
  });
});
