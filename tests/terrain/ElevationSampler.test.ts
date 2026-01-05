/**
 * Tests for ElevationSampler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElevationSampler, type DEMConfig } from '../../src/terrain';

// Mock WebGL context
function createMockGL(): WebGLRenderingContext {
  return {
    TEXTURE_2D: 3553,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    LINEAR: 9729,
    CLAMP_TO_EDGE: 33071,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE0: 33984,
    createTexture: vi.fn(() => ({ id: 1 })),
    deleteTexture: vi.fn(),
    bindTexture: vi.fn(),
    activeTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    pixelStorei: vi.fn(),
  } as unknown as WebGLRenderingContext;
}

describe('ElevationSampler', () => {
  let sampler: ElevationSampler;
  let gl: WebGLRenderingContext;

  beforeEach(() => {
    gl = createMockGL();
    sampler = new ElevationSampler(gl);
  });

  afterEach(() => {
    sampler.dispose();
  });

  describe('constructor', () => {
    it('should create with default encoding', () => {
      expect(sampler).toBeDefined();
      expect(gl.createTexture).toHaveBeenCalled();
    });

    it('should accept custom encoding', () => {
      const customSampler = new ElevationSampler(gl, { encoding: 'terrarium' });
      expect(customSampler).toBeDefined();
      customSampler.dispose();
    });

    it('should accept custom min/max elevation', () => {
      const customSampler = new ElevationSampler(gl, {
        minElevation: 0,
        maxElevation: 5000,
      });
      expect(customSampler).toBeDefined();
      customSampler.dispose();
    });
  });

  describe('sampleElevation', () => {
    it('should return 0 when no tiles loaded', () => {
      const elevation = sampler.sampleElevation(0, 0);
      expect(elevation).toBe(0);
    });
  });

  describe('hasDataFor', () => {
    it('should return false when no tiles loaded', () => {
      expect(sampler.hasDataFor(0, 0)).toBe(false);
    });
  });

  describe('getTileCount', () => {
    it('should return 0 initially', () => {
      expect(sampler.getTileCount()).toBe(0);
    });
  });

  describe('getTexture', () => {
    it('should return texture object', () => {
      expect(sampler.getTexture()).not.toBeNull();
    });
  });

  describe('bind', () => {
    it('should bind texture to unit', () => {
      sampler.bind(0);

      expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0);
      expect(gl.bindTexture).toHaveBeenCalled();
    });

    it('should bind to different texture units', () => {
      sampler.bind(0);
      sampler.bind(1);

      expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0);
      expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + 1);
    });
  });

  describe('getUniforms', () => {
    it('should return default uniforms when no data', () => {
      const uniforms = sampler.getUniforms(0, 0);

      expect(uniforms.u_elevationMin).toBeDefined();
      expect(uniforms.u_elevationMax).toBeDefined();
      expect(uniforms.u_elevationScale).toBeDefined();
      expect(uniforms.u_tileBounds).toBeDefined();
    });
  });

  describe('getElevationNormalized', () => {
    it('should return normalized value', () => {
      const normalized = sampler.getElevationNormalized(0, 0);

      expect(typeof normalized).toBe('number');
      expect(normalized).toBeGreaterThanOrEqual(0);
      expect(normalized).toBeLessThanOrEqual(1);
    });
  });

  describe('setMaxTiles', () => {
    it('should update max tiles', () => {
      sampler.setMaxTiles(10);
      // No error means it worked
    });
  });

  describe('clearCache', () => {
    it('should clear all cached tiles', () => {
      sampler.clearCache();
      expect(sampler.getTileCount()).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      sampler.dispose();

      expect(gl.deleteTexture).toHaveBeenCalled();
    });

    it('should handle double dispose', () => {
      sampler.dispose();
      sampler.dispose();

      // Should not throw
    });
  });
});

describe('DEMConfig', () => {
  it('should support mapbox encoding', () => {
    const gl = createMockGL();
    const sampler = new ElevationSampler(gl, { encoding: 'mapbox' });
    expect(sampler).toBeDefined();
    sampler.dispose();
  });

  it('should support terrarium encoding', () => {
    const gl = createMockGL();
    const sampler = new ElevationSampler(gl, { encoding: 'terrarium' });
    expect(sampler).toBeDefined();
    sampler.dispose();
  });

  it('should support raw encoding', () => {
    const gl = createMockGL();
    const sampler = new ElevationSampler(gl, { encoding: 'raw' });
    expect(sampler).toBeDefined();
    sampler.dispose();
  });
});
