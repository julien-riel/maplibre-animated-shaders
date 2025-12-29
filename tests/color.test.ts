import { describe, it, expect } from 'vitest';
import {
  hexToRgba,
  rgbaToHex,
  normalizeColor,
  rgbToHsl,
  hslToRgb,
  lerpColor,
} from '../src/utils/color';

describe('color utilities', () => {
  describe('hexToRgba', () => {
    it('should parse 6-digit hex colors', () => {
      expect(hexToRgba('#ff0000')).toEqual([1, 0, 0, 1]);
      expect(hexToRgba('#00ff00')).toEqual([0, 1, 0, 1]);
      expect(hexToRgba('#0000ff')).toEqual([0, 0, 1, 1]);
      expect(hexToRgba('#ffffff')).toEqual([1, 1, 1, 1]);
      expect(hexToRgba('#000000')).toEqual([0, 0, 0, 1]);
    });

    it('should parse 3-digit hex colors', () => {
      expect(hexToRgba('#f00')).toEqual([1, 0, 0, 1]);
      expect(hexToRgba('#0f0')).toEqual([0, 1, 0, 1]);
      expect(hexToRgba('#00f')).toEqual([0, 0, 1, 1]);
      expect(hexToRgba('#fff')).toEqual([1, 1, 1, 1]);
    });

    it('should parse 8-digit hex colors with alpha', () => {
      expect(hexToRgba('#ff0000ff')).toEqual([1, 0, 0, 1]);
      expect(hexToRgba('#ff000080')).toEqual([1, 0, 0, 128 / 255]);
      expect(hexToRgba('#ff000000')).toEqual([1, 0, 0, 0]);
    });

    it('should handle mixed case', () => {
      expect(hexToRgba('#FF0000')).toEqual([1, 0, 0, 1]);
      expect(hexToRgba('#Ff00fF')).toEqual([1, 0, 1, 1]);
    });

    it('should throw for invalid hex length', () => {
      expect(() => hexToRgba('#ff00')).toThrow('Invalid hex color');
      expect(() => hexToRgba('#ff00000')).toThrow('Invalid hex color');
    });

    it('should accept hex without # prefix', () => {
      // The function strips # if present, so both formats work
      expect(hexToRgba('ff0000')).toEqual([1, 0, 0, 1]);
    });
  });

  describe('rgbaToHex', () => {
    it('should convert RGBA to 6-digit hex for opaque colors', () => {
      expect(rgbaToHex([1, 0, 0, 1])).toBe('#ff0000');
      expect(rgbaToHex([0, 1, 0, 1])).toBe('#00ff00');
      expect(rgbaToHex([0, 0, 1, 1])).toBe('#0000ff');
      expect(rgbaToHex([1, 1, 1, 1])).toBe('#ffffff');
      expect(rgbaToHex([0, 0, 0, 1])).toBe('#000000');
    });

    it('should convert RGBA to 8-digit hex for transparent colors', () => {
      expect(rgbaToHex([1, 0, 0, 0.5])).toBe('#ff000080');
      expect(rgbaToHex([1, 0, 0, 0])).toBe('#ff000000');
    });

    it('should round values correctly', () => {
      expect(rgbaToHex([0.5, 0.5, 0.5, 1])).toBe('#808080');
    });
  });

  describe('normalizeColor', () => {
    it('should convert hex string to RGBA', () => {
      expect(normalizeColor('#ff0000')).toEqual([1, 0, 0, 1]);
    });

    it('should pass through RGBA arrays', () => {
      const rgba: [number, number, number, number] = [0.5, 0.5, 0.5, 1];
      expect(normalizeColor(rgba)).toBe(rgba);
    });
  });

  describe('rgbToHsl', () => {
    it('should convert red', () => {
      const [h, s, l] = rgbToHsl(1, 0, 0);
      expect(h).toBeCloseTo(0);
      expect(s).toBeCloseTo(1);
      expect(l).toBeCloseTo(0.5);
    });

    it('should convert green', () => {
      const [h, s, l] = rgbToHsl(0, 1, 0);
      expect(h).toBeCloseTo(1 / 3);
      expect(s).toBeCloseTo(1);
      expect(l).toBeCloseTo(0.5);
    });

    it('should convert blue', () => {
      const [h, s, l] = rgbToHsl(0, 0, 1);
      expect(h).toBeCloseTo(2 / 3);
      expect(s).toBeCloseTo(1);
      expect(l).toBeCloseTo(0.5);
    });

    it('should convert white', () => {
      const [h, s, l] = rgbToHsl(1, 1, 1);
      expect(h).toBeCloseTo(0);
      expect(s).toBeCloseTo(0);
      expect(l).toBeCloseTo(1);
    });

    it('should convert black', () => {
      const [h, s, l] = rgbToHsl(0, 0, 0);
      expect(h).toBeCloseTo(0);
      expect(s).toBeCloseTo(0);
      expect(l).toBeCloseTo(0);
    });

    it('should convert gray', () => {
      const [h, s, l] = rgbToHsl(0.5, 0.5, 0.5);
      expect(s).toBeCloseTo(0);
      expect(l).toBeCloseTo(0.5);
    });
  });

  describe('hslToRgb', () => {
    it('should convert red', () => {
      const [r, g, b] = hslToRgb(0, 1, 0.5);
      expect(r).toBeCloseTo(1);
      expect(g).toBeCloseTo(0);
      expect(b).toBeCloseTo(0);
    });

    it('should convert green', () => {
      const [r, g, b] = hslToRgb(1 / 3, 1, 0.5);
      expect(r).toBeCloseTo(0);
      expect(g).toBeCloseTo(1);
      expect(b).toBeCloseTo(0);
    });

    it('should convert blue', () => {
      const [r, g, b] = hslToRgb(2 / 3, 1, 0.5);
      expect(r).toBeCloseTo(0);
      expect(g).toBeCloseTo(0);
      expect(b).toBeCloseTo(1);
    });

    it('should convert white', () => {
      const [r, g, b] = hslToRgb(0, 0, 1);
      expect(r).toBeCloseTo(1);
      expect(g).toBeCloseTo(1);
      expect(b).toBeCloseTo(1);
    });

    it('should convert gray (zero saturation)', () => {
      const [r, g, b] = hslToRgb(0, 0, 0.5);
      expect(r).toBeCloseTo(0.5);
      expect(g).toBeCloseTo(0.5);
      expect(b).toBeCloseTo(0.5);
    });
  });

  describe('lerpColor', () => {
    it('should interpolate between two colors at t=0', () => {
      const result = lerpColor('#ff0000', '#0000ff', 0);
      expect(result).toEqual([1, 0, 0, 1]);
    });

    it('should interpolate between two colors at t=1', () => {
      const result = lerpColor('#ff0000', '#0000ff', 1);
      expect(result).toEqual([0, 0, 1, 1]);
    });

    it('should interpolate between two colors at t=0.5', () => {
      const result = lerpColor('#ff0000', '#0000ff', 0.5);
      expect(result[0]).toBeCloseTo(0.5);
      expect(result[1]).toBeCloseTo(0);
      expect(result[2]).toBeCloseTo(0.5);
      expect(result[3]).toBeCloseTo(1);
    });

    it('should interpolate RGBA arrays', () => {
      const colorA: [number, number, number, number] = [1, 0, 0, 1];
      const colorB: [number, number, number, number] = [0, 0, 1, 0];
      const result = lerpColor(colorA, colorB, 0.5);
      expect(result[0]).toBeCloseTo(0.5);
      expect(result[1]).toBeCloseTo(0);
      expect(result[2]).toBeCloseTo(0.5);
      expect(result[3]).toBeCloseTo(0.5);
    });

    it('should handle mixed color formats', () => {
      const result = lerpColor('#ff0000', [0, 0, 1, 1], 0.5);
      expect(result[0]).toBeCloseTo(0.5);
      expect(result[2]).toBeCloseTo(0.5);
    });
  });

  describe('roundtrip conversions', () => {
    it('should roundtrip hex -> rgba -> hex', () => {
      const original = '#3b82f6';
      const rgba = hexToRgba(original);
      const result = rgbaToHex(rgba);
      expect(result).toBe(original);
    });

    it('should roundtrip rgb -> hsl -> rgb', () => {
      const originalR = 0.8;
      const originalG = 0.3;
      const originalB = 0.5;
      const [h, s, l] = rgbToHsl(originalR, originalG, originalB);
      const [r, g, b] = hslToRgb(h, s, l);
      expect(r).toBeCloseTo(originalR, 5);
      expect(g).toBeCloseTo(originalG, 5);
      expect(b).toBeCloseTo(originalB, 5);
    });
  });
});
