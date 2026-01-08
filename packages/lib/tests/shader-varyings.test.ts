/**
 * Tests for shader varyings utilities
 */

import { describe, it, expect } from 'vitest';
import {
  AVAILABLE_VARYINGS,
  getVaryingNames,
  isVaryingAvailable,
  formatAvailableVaryings,
  suggestVaryingReplacement,
} from '../src/utils/shader-varyings';

describe('AVAILABLE_VARYINGS', () => {
  it('should define varyings for all geometry types', () => {
    expect(AVAILABLE_VARYINGS.point).toBeDefined();
    expect(AVAILABLE_VARYINGS.line).toBeDefined();
    expect(AVAILABLE_VARYINGS.polygon).toBeDefined();
    expect(AVAILABLE_VARYINGS.global).toBeDefined();
  });

  it('should have v_pos for point, line, and polygon', () => {
    expect(AVAILABLE_VARYINGS.point.some((v) => v.name === 'v_pos')).toBe(true);
    expect(AVAILABLE_VARYINGS.line.some((v) => v.name === 'v_pos')).toBe(true);
    expect(AVAILABLE_VARYINGS.polygon.some((v) => v.name === 'v_pos')).toBe(true);
  });

  it('should have v_uv only for polygon and global', () => {
    expect(AVAILABLE_VARYINGS.point.some((v) => v.name === 'v_uv')).toBe(false);
    expect(AVAILABLE_VARYINGS.line.some((v) => v.name === 'v_uv')).toBe(false);
    expect(AVAILABLE_VARYINGS.polygon.some((v) => v.name === 'v_uv')).toBe(true);
    expect(AVAILABLE_VARYINGS.global.some((v) => v.name === 'v_uv')).toBe(true);
  });

  it('should have v_progress only for line', () => {
    expect(AVAILABLE_VARYINGS.point.some((v) => v.name === 'v_progress')).toBe(false);
    expect(AVAILABLE_VARYINGS.line.some((v) => v.name === 'v_progress')).toBe(true);
    expect(AVAILABLE_VARYINGS.polygon.some((v) => v.name === 'v_progress')).toBe(false);
    expect(AVAILABLE_VARYINGS.global.some((v) => v.name === 'v_progress')).toBe(false);
  });

  it('should have v_effectiveTime for point, line, and polygon', () => {
    expect(AVAILABLE_VARYINGS.point.some((v) => v.name === 'v_effectiveTime')).toBe(true);
    expect(AVAILABLE_VARYINGS.line.some((v) => v.name === 'v_effectiveTime')).toBe(true);
    expect(AVAILABLE_VARYINGS.polygon.some((v) => v.name === 'v_effectiveTime')).toBe(true);
  });
});

describe('getVaryingNames', () => {
  it('should return array of varying names for point', () => {
    const names = getVaryingNames('point');
    expect(names).toContain('v_pos');
    expect(names).toContain('v_index');
    expect(names).toContain('v_effectiveTime');
    expect(names).not.toContain('v_uv');
  });

  it('should return array of varying names for line', () => {
    const names = getVaryingNames('line');
    expect(names).toContain('v_pos');
    expect(names).toContain('v_progress');
    expect(names).toContain('v_line_index');
    expect(names).not.toContain('v_uv');
  });

  it('should return array of varying names for polygon', () => {
    const names = getVaryingNames('polygon');
    expect(names).toContain('v_pos');
    expect(names).toContain('v_uv');
    expect(names).toContain('v_centroid');
    expect(names).toContain('v_polygon_index');
  });

  it('should return array of varying names for global', () => {
    const names = getVaryingNames('global');
    expect(names).toContain('v_uv');
    expect(names).toContain('v_zoom');
    expect(names).not.toContain('v_pos');
  });
});

describe('isVaryingAvailable', () => {
  it('should return true for available varyings', () => {
    expect(isVaryingAvailable('point', 'v_pos')).toBe(true);
    expect(isVaryingAvailable('line', 'v_progress')).toBe(true);
    expect(isVaryingAvailable('polygon', 'v_uv')).toBe(true);
    expect(isVaryingAvailable('global', 'v_zoom')).toBe(true);
  });

  it('should return false for unavailable varyings', () => {
    expect(isVaryingAvailable('point', 'v_uv')).toBe(false);
    expect(isVaryingAvailable('line', 'v_uv')).toBe(false);
    expect(isVaryingAvailable('global', 'v_pos')).toBe(false);
    expect(isVaryingAvailable('point', 'v_progress')).toBe(false);
  });
});

describe('formatAvailableVaryings', () => {
  it('should format varyings for point geometry', () => {
    const formatted = formatAvailableVaryings('point');
    expect(formatted).toContain('v_pos');
    expect(formatted).toContain('vec2');
    expect(formatted).toContain('v_effectiveTime');
    expect(formatted).not.toContain('v_uv');
  });

  it('should include descriptions', () => {
    const formatted = formatAvailableVaryings('line');
    expect(formatted).toContain('v_progress');
    expect(formatted).toContain('Progress along the complete line');
  });

  it('should format as list with dashes', () => {
    const formatted = formatAvailableVaryings('global');
    expect(formatted).toMatch(/^\s*-/m);
  });
});

describe('suggestVaryingReplacement', () => {
  describe('v_uv suggestions', () => {
    it('should suggest v_pos for point geometry', () => {
      const suggestion = suggestVaryingReplacement('point', 'v_uv');
      expect(suggestion).toContain('v_pos');
    });

    it('should suggest v_pos for line geometry', () => {
      const suggestion = suggestVaryingReplacement('line', 'v_uv');
      expect(suggestion).toContain('v_pos');
    });

    it('should return null for polygon (v_uv is available)', () => {
      const suggestion = suggestVaryingReplacement('polygon', 'v_uv');
      expect(suggestion).toBeNull();
    });

    it('should return null for global (v_uv is available)', () => {
      const suggestion = suggestVaryingReplacement('global', 'v_uv');
      expect(suggestion).toBeNull();
    });
  });

  describe('v_progress suggestions', () => {
    it('should suggest alternatives for point geometry', () => {
      const suggestion = suggestVaryingReplacement('point', 'v_progress');
      expect(suggestion).toBeDefined();
      expect(suggestion).not.toBeNull();
    });

    it('should return null for line (v_progress is available)', () => {
      const suggestion = suggestVaryingReplacement('line', 'v_progress');
      expect(suggestion).toBeNull();
    });
  });

  describe('v_centroid suggestions', () => {
    it('should suggest alternative for point geometry', () => {
      const suggestion = suggestVaryingReplacement('point', 'v_centroid');
      expect(suggestion).toBeDefined();
    });

    it('should return null for polygon (v_centroid is available)', () => {
      const suggestion = suggestVaryingReplacement('polygon', 'v_centroid');
      expect(suggestion).toBeNull();
    });
  });

  describe('unknown varyings', () => {
    it('should return null for unknown varying names', () => {
      const suggestion = suggestVaryingReplacement('point', 'v_unknown');
      expect(suggestion).toBeNull();
    });
  });
});
