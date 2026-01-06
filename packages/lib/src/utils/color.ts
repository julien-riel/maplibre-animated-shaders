/**
 * Color Utilities
 *
 * Provides color parsing, conversion, and interpolation functions for shader uniforms.
 * All color values are normalized to 0-1 range for WebGL compatibility.
 *
 * Supported formats:
 * - Hex strings: `#RGB`, `#RRGGBB`, `#RRGGBBAA`
 * - RGBA arrays: `[r, g, b, a]` (0-1 range)
 *
 * @module utils/color
 *
 * @example
 * ```typescript
 * import { hexToRgba, rgbaToHex, lerpColor, normalizeColor } from 'maplibre-animated-shaders';
 *
 * // Parse hex to RGBA
 * const rgba = hexToRgba('#ff6600'); // [1, 0.4, 0, 1]
 *
 * // Convert RGBA to hex
 * const hex = rgbaToHex([1, 0.4, 0, 1]); // '#ff6600'
 *
 * // Interpolate between colors
 * const midColor = lerpColor('#ff0000', '#0000ff', 0.5); // Purple
 *
 * // Normalize any color format
 * const normalized = normalizeColor('#ff6600'); // [1, 0.4, 0, 1]
 * ```
 */

import type { Color } from '../types';

/**
 * Parse a hex color string to RGBA array.
 *
 * Supports 3, 6, and 8 character hex strings (with or without `#` prefix).
 * Values are normalized to 0-1 range for WebGL uniforms.
 *
 * @param hex - Hex color string (`#RGB`, `#RRGGBB`, or `#RRGGBBAA`)
 * @returns RGBA tuple with values in 0-1 range
 * @throws Error if the hex string format is invalid
 *
 * @example
 * ```typescript
 * hexToRgba('#f00');      // [1, 0, 0, 1] - Short format
 * hexToRgba('#ff6600');   // [1, 0.4, 0, 1] - Standard format
 * hexToRgba('#ff660080'); // [1, 0.4, 0, 0.5] - With alpha
 * hexToRgba('ff6600');    // [1, 0.4, 0, 1] - Without # prefix
 * ```
 */
export function hexToRgba(hex: string): [number, number, number, number] {
  const cleaned = hex.replace('#', '');

  let r: number,
    g: number,
    b: number,
    a = 1;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
    g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
    b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.slice(0, 2), 16) / 255;
    g = parseInt(cleaned.slice(2, 4), 16) / 255;
    b = parseInt(cleaned.slice(4, 6), 16) / 255;
  } else if (cleaned.length === 8) {
    r = parseInt(cleaned.slice(0, 2), 16) / 255;
    g = parseInt(cleaned.slice(2, 4), 16) / 255;
    b = parseInt(cleaned.slice(4, 6), 16) / 255;
    a = parseInt(cleaned.slice(6, 8), 16) / 255;
  } else {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return [r, g, b, a];
}

/**
 * Convert RGBA array to hex string.
 *
 * Converts normalized RGBA values (0-1) to a hex color string.
 * Omits alpha channel if it equals 1 (fully opaque).
 *
 * @param rgba - RGBA tuple with values in 0-1 range
 * @returns Hex color string (`#RRGGBB` or `#RRGGBBAA`)
 *
 * @example
 * ```typescript
 * rgbaToHex([1, 0.4, 0, 1]);     // '#ff6600'
 * rgbaToHex([1, 0.4, 0, 0.5]);   // '#ff660080'
 * rgbaToHex([0, 0, 0, 1]);       // '#000000'
 * ```
 */
export function rgbaToHex(rgba: [number, number, number, number]): string {
  const [r, g, b, a] = rgba.map((v) => Math.round(v * 255));

  if (a === 255) {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
}

/**
 * Normalize any color format to RGBA array.
 *
 * Accepts both hex strings and RGBA arrays, returning a normalized RGBA tuple.
 * Useful for handling user input that may be in either format.
 *
 * @param color - Color as hex string or RGBA array
 * @returns RGBA tuple with values in 0-1 range
 *
 * @example
 * ```typescript
 * normalizeColor('#ff6600');           // [1, 0.4, 0, 1]
 * normalizeColor([1, 0.4, 0, 1]);      // [1, 0.4, 0, 1] (passthrough)
 * ```
 */
export function normalizeColor(color: Color): [number, number, number, number] {
  if (typeof color === 'string') {
    return hexToRgba(color);
  }
  return color;
}

/**
 * Convert RGB to HSL color space.
 *
 * Converts RGB values (0-1) to HSL (Hue, Saturation, Lightness).
 * Useful for color manipulation like adjusting brightness or saturation.
 *
 * @param r - Red component (0-1)
 * @param g - Green component (0-1)
 * @param b - Blue component (0-1)
 * @returns HSL tuple: [hue (0-1), saturation (0-1), lightness (0-1)]
 *
 * @example
 * ```typescript
 * rgbToHsl(1, 0, 0);      // [0, 1, 0.5] - Pure red
 * rgbToHsl(0, 1, 0);      // [0.333, 1, 0.5] - Pure green
 * rgbToHsl(0.5, 0.5, 0.5); // [0, 0, 0.5] - Gray
 * ```
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h, s, l];
}

/**
 * Convert HSL to RGB color space.
 *
 * Converts HSL values (0-1) back to RGB (0-1).
 * Use after manipulating hue, saturation, or lightness.
 *
 * @param h - Hue (0-1, wraps around)
 * @param s - Saturation (0-1)
 * @param l - Lightness (0-1)
 * @returns RGB tuple with values in 0-1 range
 *
 * @example
 * ```typescript
 * hslToRgb(0, 1, 0.5);      // [1, 0, 0] - Pure red
 * hslToRgb(0.333, 1, 0.5);  // [0, 1, 0] - Pure green
 * hslToRgb(0, 0, 0.5);      // [0.5, 0.5, 0.5] - Gray
 * ```
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    return [l, l, l];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

/**
 * Linearly interpolate between two colors.
 *
 * Performs component-wise linear interpolation in RGB space.
 * Useful for creating smooth color transitions and gradients.
 *
 * @param colorA - Start color (hex string or RGBA array)
 * @param colorB - End color (hex string or RGBA array)
 * @param t - Interpolation factor (0 = colorA, 1 = colorB)
 * @returns Interpolated RGBA tuple with values in 0-1 range
 *
 * @example
 * ```typescript
 * // Fade from red to blue
 * lerpColor('#ff0000', '#0000ff', 0);    // [1, 0, 0, 1] - Red
 * lerpColor('#ff0000', '#0000ff', 0.5);  // [0.5, 0, 0.5, 1] - Purple
 * lerpColor('#ff0000', '#0000ff', 1);    // [0, 0, 1, 1] - Blue
 *
 * // Animate color over time
 * const t = (Math.sin(time) + 1) / 2; // 0-1 oscillation
 * const color = lerpColor('#00ff00', '#ff0000', t);
 * ```
 */
export function lerpColor(
  colorA: Color,
  colorB: Color,
  t: number
): [number, number, number, number] {
  const a = normalizeColor(colorA);
  const b = normalizeColor(colorB);

  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ];
}
