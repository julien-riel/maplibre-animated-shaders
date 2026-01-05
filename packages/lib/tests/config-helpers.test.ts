/**
 * Tests for config-helpers utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getConfigNumber,
  getConfigString,
  getConfigBoolean,
  getConfigValue,
} from '../src/utils/config-helpers';
import type { ShaderConfig } from '../src/types';

describe('config-helpers', () => {
  describe('getConfigNumber', () => {
    it('should return first matching property value', () => {
      const config: ShaderConfig = { radius: 25, size: 50 };
      expect(getConfigNumber(config, ['radius', 'size'], 10)).toBe(25);
    });

    it('should return second property if first is missing', () => {
      const config: ShaderConfig = { size: 50 };
      expect(getConfigNumber(config, ['radius', 'size'], 10)).toBe(50);
    });

    it('should return default if no property found', () => {
      const config: ShaderConfig = {};
      expect(getConfigNumber(config, ['radius', 'size'], 10)).toBe(10);
    });

    it('should skip non-numeric values', () => {
      const config: ShaderConfig = { radius: 'large', size: 50 };
      expect(getConfigNumber(config, ['radius', 'size'], 10)).toBe(50);
    });

    it('should return default if all values are non-numeric', () => {
      const config: ShaderConfig = { radius: 'large', size: 'medium' };
      expect(getConfigNumber(config, ['radius', 'size'], 10)).toBe(10);
    });

    it('should handle zero values correctly', () => {
      const config: ShaderConfig = { value: 0 };
      expect(getConfigNumber(config, ['value'], 10)).toBe(0);
    });

    it('should handle negative values', () => {
      const config: ShaderConfig = { offset: -5 };
      expect(getConfigNumber(config, ['offset'], 0)).toBe(-5);
    });
  });

  describe('getConfigString', () => {
    it('should return first matching string property', () => {
      const config: ShaderConfig = { color: 'red', fill: 'blue' };
      expect(getConfigString(config, ['color', 'fill'], 'black')).toBe('red');
    });

    it('should return second property if first is missing', () => {
      const config: ShaderConfig = { fill: 'blue' };
      expect(getConfigString(config, ['color', 'fill'], 'black')).toBe('blue');
    });

    it('should return default if no property found', () => {
      const config: ShaderConfig = {};
      expect(getConfigString(config, ['color', 'fill'], 'black')).toBe('black');
    });

    it('should skip non-string values', () => {
      const config: ShaderConfig = { color: 123, fill: 'blue' };
      expect(getConfigString(config, ['color', 'fill'], 'black')).toBe('blue');
    });

    it('should handle empty string', () => {
      const config: ShaderConfig = { color: '' };
      expect(getConfigString(config, ['color'], 'default')).toBe('');
    });
  });

  describe('getConfigBoolean', () => {
    it('should return first matching boolean property', () => {
      const config: ShaderConfig = { enabled: true, active: false };
      expect(getConfigBoolean(config, ['enabled', 'active'], false)).toBe(true);
    });

    it('should return second property if first is missing', () => {
      const config: ShaderConfig = { active: false };
      expect(getConfigBoolean(config, ['enabled', 'active'], true)).toBe(false);
    });

    it('should return default if no property found', () => {
      const config: ShaderConfig = {};
      expect(getConfigBoolean(config, ['enabled', 'active'], true)).toBe(true);
    });

    it('should skip non-boolean values', () => {
      const config: ShaderConfig = { enabled: 'yes', active: true };
      expect(getConfigBoolean(config, ['enabled', 'active'], false)).toBe(true);
    });

    it('should handle false value correctly', () => {
      const config: ShaderConfig = { enabled: false };
      expect(getConfigBoolean(config, ['enabled'], true)).toBe(false);
    });
  });

  describe('getConfigValue', () => {
    it('should return value if present', () => {
      const config: ShaderConfig = { custom: 'value' };
      expect(getConfigValue(config, 'custom', 'default')).toBe('value');
    });

    it('should return default if property is undefined', () => {
      const config: ShaderConfig = {};
      expect(getConfigValue(config, 'custom', 'default')).toBe('default');
    });

    it('should return default if property is null', () => {
      const config: ShaderConfig = { custom: null };
      expect(getConfigValue(config, 'custom', 'default')).toBe('default');
    });

    it('should work with arrays', () => {
      const config: ShaderConfig = { colors: ['red', 'blue'] };
      expect(getConfigValue(config, 'colors', [])).toEqual(['red', 'blue']);
    });

    it('should work with objects', () => {
      const config: ShaderConfig = { options: { a: 1, b: 2 } };
      expect(getConfigValue(config, 'options', {})).toEqual({ a: 1, b: 2 });
    });

    it('should work with numbers', () => {
      const config: ShaderConfig = { count: 42 };
      expect(getConfigValue(config, 'count', 0)).toBe(42);
    });

    it('should preserve falsy values that are not null/undefined', () => {
      const config: ShaderConfig = { zero: 0, empty: '', bool: false };
      expect(getConfigValue(config, 'zero', 10)).toBe(0);
      expect(getConfigValue(config, 'empty', 'default')).toBe('');
      expect(getConfigValue(config, 'bool', true)).toBe(false);
    });
  });
});
