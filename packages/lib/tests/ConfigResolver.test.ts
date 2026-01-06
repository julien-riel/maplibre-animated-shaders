import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigResolver } from '../src/ConfigResolver';

describe('ConfigResolver', () => {
  let resolver: ConfigResolver;

  beforeEach(() => {
    resolver = new ConfigResolver();
  });

  describe('resolve', () => {
    it('should return defaults when no user config provided', () => {
      const defaults = { color: '#ff0000', speed: 1.0, enabled: true };
      const result = resolver.resolve(defaults);
      expect(result).toEqual(defaults);
    });

    it('should return a copy, not the original defaults', () => {
      const defaults = { color: '#ff0000', speed: 1.0 };
      const result = resolver.resolve(defaults);
      result.color = '#00ff00';
      expect(defaults.color).toBe('#ff0000');
    });

    it('should merge user config with defaults', () => {
      const defaults = { color: '#ff0000', speed: 1.0, enabled: true };
      const userConfig = { speed: 2.0 };
      const result = resolver.resolve(defaults, userConfig);
      expect(result).toEqual({ color: '#ff0000', speed: 2.0, enabled: true });
    });

    it('should override all provided user values', () => {
      const defaults = { color: '#ff0000', speed: 1.0, enabled: true };
      const userConfig = { color: '#00ff00', speed: 3.0, enabled: false };
      const result = resolver.resolve(defaults, userConfig);
      expect(result).toEqual(userConfig);
    });

    it('should ignore undefined user values', () => {
      const defaults = { color: '#ff0000', speed: 1.0 };
      const userConfig = { color: undefined, speed: 2.0 };
      const result = resolver.resolve(defaults, userConfig);
      expect(result).toEqual({ color: '#ff0000', speed: 2.0 });
    });
  });

  describe('validate', () => {
    describe('number validation', () => {
      const schema = {
        speed: { type: 'number' as const, min: 0.1, max: 5.0 },
      };

      it('should pass valid numbers', () => {
        const result = resolver.validate({ speed: 1.0 }, schema);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail for non-number values', () => {
        const result = resolver.validate({ speed: 'fast' }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].field).toBe('speed');
        expect(result.errors[0].message).toContain('Expected number');
      });

      it('should fail for NaN', () => {
        const result = resolver.validate({ speed: NaN }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].field).toBe('speed');
      });

      it('should fail for values below minimum', () => {
        const result = resolver.validate({ speed: 0.05 }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('below minimum');
      });

      it('should fail for values above maximum', () => {
        const result = resolver.validate({ speed: 10 }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('above maximum');
      });

      it('should pass for boundary values', () => {
        expect(resolver.validate({ speed: 0.1 }, schema).valid).toBe(true);
        expect(resolver.validate({ speed: 5.0 }, schema).valid).toBe(true);
      });
    });

    describe('color validation', () => {
      const schema = {
        color: { type: 'color' as const },
      };

      it('should pass valid 6-digit hex colors', () => {
        const result = resolver.validate({ color: '#ff0000' }, schema);
        expect(result.valid).toBe(true);
      });

      it('should pass valid 3-digit hex colors', () => {
        const result = resolver.validate({ color: '#f00' }, schema);
        expect(result.valid).toBe(true);
      });

      it('should pass valid 8-digit hex colors (with alpha)', () => {
        const result = resolver.validate({ color: '#ff0000ff' }, schema);
        expect(result.valid).toBe(true);
      });

      it('should pass valid RGBA arrays', () => {
        const result = resolver.validate({ color: [1, 0, 0, 1] }, schema);
        expect(result.valid).toBe(true);
      });

      it('should fail invalid hex format', () => {
        const result = resolver.validate({ color: 'ff0000' }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('Invalid hex color');
      });

      it('should fail invalid hex characters', () => {
        const result = resolver.validate({ color: '#gggggg' }, schema);
        expect(result.valid).toBe(false);
      });

      it('should fail RGBA arrays with wrong length', () => {
        const result = resolver.validate({ color: [1, 0, 0] }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('4 components');
      });

      it('should fail RGBA arrays with out-of-range values', () => {
        const result = resolver.validate({ color: [1, 0, 0, 2] }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('between 0 and 1');
      });

      it('should fail invalid color types', () => {
        const result = resolver.validate({ color: 123 }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('Invalid color type');
      });
    });

    describe('boolean validation', () => {
      const schema = {
        enabled: { type: 'boolean' as const },
      };

      it('should pass true', () => {
        const result = resolver.validate({ enabled: true }, schema);
        expect(result.valid).toBe(true);
      });

      it('should pass false', () => {
        const result = resolver.validate({ enabled: false }, schema);
        expect(result.valid).toBe(true);
      });

      it('should fail non-boolean values', () => {
        const result = resolver.validate({ enabled: 'yes' }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('Expected boolean');
      });
    });

    describe('string validation', () => {
      const schema = {
        label: { type: 'string' as const },
      };

      it('should pass valid strings', () => {
        const result = resolver.validate({ label: 'test' }, schema);
        expect(result.valid).toBe(true);
      });

      it('should fail non-string values', () => {
        const result = resolver.validate({ label: 123 }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('Expected string');
      });
    });

    describe('select validation', () => {
      const schema = {
        direction: {
          type: 'select' as const,
          options: ['forward', 'backward', 'both'],
        },
      };

      it('should pass valid options', () => {
        const result = resolver.validate({ direction: 'forward' }, schema);
        expect(result.valid).toBe(true);
      });

      it('should fail invalid options', () => {
        const result = resolver.validate({ direction: 'sideways' }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('Invalid option');
        expect(result.errors[0].message).toContain('forward, backward, both');
      });

      it('should fail non-string values', () => {
        const result = resolver.validate({ direction: 123 }, schema);
        expect(result.valid).toBe(false);
      });
    });

    describe('array validation', () => {
      const schema = {
        points: { type: 'array' as const },
      };

      it('should pass valid arrays', () => {
        const result = resolver.validate({ points: [1, 2, 3] }, schema);
        expect(result.valid).toBe(true);
      });

      it('should pass empty arrays', () => {
        const result = resolver.validate({ points: [] }, schema);
        expect(result.valid).toBe(true);
      });

      it('should fail non-array values', () => {
        const result = resolver.validate({ points: 'not an array' }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('Expected array');
      });
    });

    describe('multiple fields', () => {
      const schema = {
        color: { type: 'color' as const },
        speed: { type: 'number' as const, min: 0, max: 10 },
        enabled: { type: 'boolean' as const },
      };

      it('should validate all fields', () => {
        const config = { color: '#ff0000', speed: 5, enabled: true };
        const result = resolver.validate(config, schema);
        expect(result.valid).toBe(true);
      });

      it('should collect multiple errors', () => {
        const config = { color: 'invalid', speed: 'fast', enabled: 'yes' };
        const result = resolver.validate(config, schema);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(3);
      });

      it('should skip undefined values', () => {
        const config = { color: '#ff0000' };
        const result = resolver.validate(config, schema);
        expect(result.valid).toBe(true);
      });
    });
  });
});
