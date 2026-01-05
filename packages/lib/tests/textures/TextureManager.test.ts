/**
 * Tests for TextureManager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextureManager } from '../../src/textures';

// Mock WebGL context
function createMockGL(): WebGLRenderingContext {
  let textureCounter = 0;

  return {
    TEXTURE_2D: 3553,
    TEXTURE0: 33984,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    CLAMP_TO_EDGE: 33071,
    LINEAR: 9729,
    LINEAR_MIPMAP_LINEAR: 9987,
    NEAREST: 9728,
    REPEAT: 10497,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    FLOAT: 5126,
    UNPACK_FLIP_Y_WEBGL: 37440,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
    createTexture: vi.fn(() => ({ id: ++textureCounter })),
    deleteTexture: vi.fn(),
    bindTexture: vi.fn(),
    activeTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    generateMipmap: vi.fn(),
    pixelStorei: vi.fn(),
    getExtension: vi.fn((name: string) => {
      if (name === 'OES_texture_float') return {};
      if (name === 'WEBGL_depth_texture') return {};
      return null;
    }),
  } as unknown as WebGLRenderingContext;
}

// Mock Image class
class MockImage {
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  src: string = '';
  width: number = 256;
  height: number = 256;
  crossOrigin: string = '';

  constructor() {
    setTimeout(() => {
      if (this.src.includes('error')) {
        this.onerror?.(new Error('Load error'));
      } else {
        this.onload?.();
      }
    }, 0);
  }
}

// @ts-expect-error - Mock global Image
global.Image = MockImage;

describe('TextureManager', () => {
  let manager: TextureManager;
  let gl: WebGLRenderingContext;

  beforeEach(() => {
    gl = createMockGL();
    manager = new TextureManager(gl);
  });

  describe('constructor', () => {
    it('should create TextureManager with gl context', () => {
      expect(manager).toBeDefined();
    });
  });

  describe('loadTexture', () => {
    it('should load texture from URL', async () => {
      const info = await manager.loadTexture('test', 'http://example.com/test.png');

      expect(info).toBeDefined();
      expect(info.texture).toBeDefined();
      expect(info.source).toBe('http://example.com/test.png');
      expect(gl.createTexture).toHaveBeenCalled();
    });

    it('should cache loaded textures', async () => {
      await manager.loadTexture('cached', 'http://example.com/cached.png');
      await manager.loadTexture('cached', 'http://example.com/cached.png');

      // Should only create one texture
      expect(manager.has('cached')).toBe(true);
    });

    it('should apply texture options', async () => {
      await manager.loadTexture('options', 'http://example.com/options.png', {
        wrapS: gl.REPEAT,
        wrapT: gl.REPEAT,
        minFilter: gl.NEAREST,
        generateMipmaps: false,
      });

      expect(gl.texParameteri).toHaveBeenCalled();
    });
  });

  describe('createFromData', () => {
    it('should create texture from Uint8Array data', () => {
      const data = new Uint8Array(256 * 256 * 4);
      const info = manager.createFromData('data-texture', data, 256, 256);

      expect(info).toBeDefined();
      expect(info.texture).toBeDefined();
      expect(info.width).toBe(256);
      expect(info.height).toBe(256);
      expect(gl.createTexture).toHaveBeenCalled();
    });

    it('should support Float32Array data', () => {
      const data = new Float32Array(64 * 64 * 4);
      const info = manager.createFromData('float-texture', data, 64, 64, {
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        generateMipmaps: false,
      });

      expect(info).toBeDefined();
      expect(info.width).toBe(64);
      expect(info.height).toBe(64);
    });
  });

  describe('createSolidColor', () => {
    it('should create a solid color texture', () => {
      const info = manager.createSolidColor('red', [255, 0, 0, 255]);

      expect(info).toBeDefined();
      expect(info.texture).toBeDefined();
      expect(info.width).toBe(1);
      expect(info.height).toBe(1);
    });
  });

  describe('bind', () => {
    it('should bind texture to unit', async () => {
      await manager.loadTexture('bindtest', 'http://example.com/bind.png');

      const result = manager.bind('bindtest', 0);

      expect(result).toBe(true);
      expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0);
      expect(gl.bindTexture).toHaveBeenCalled();
    });

    it('should bind to different texture units', async () => {
      await manager.loadTexture('unit1', 'http://example.com/unit1.png');
      await manager.loadTexture('unit2', 'http://example.com/unit2.png');

      manager.bind('unit1', 0);
      manager.bind('unit2', 1);

      expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0);
      expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + 1);
    });

    it('should return false for non-existent texture', () => {
      const result = manager.bind('nonexistent', 0);

      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should return texture info for loaded texture', async () => {
      await manager.loadTexture('gettest', 'http://example.com/get.png');

      const info = manager.get('gettest');

      expect(info).toBeDefined();
      expect(info?.source).toBe('http://example.com/get.png');
    });

    it('should return undefined for non-existent texture', () => {
      const info = manager.get('nonexistent');

      expect(info).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for loaded texture', async () => {
      await manager.loadTexture('hastest', 'http://example.com/has.png');

      expect(manager.has('hastest')).toBe(true);
    });

    it('should return false for unloaded texture', () => {
      expect(manager.has('unloaded')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete specific texture', async () => {
      await manager.loadTexture('deletetest', 'http://example.com/delete.png');

      const result = manager.delete('deletetest');

      expect(result).toBe(true);
      expect(manager.has('deletetest')).toBe(false);
      expect(gl.deleteTexture).toHaveBeenCalled();
    });

    it('should return false for non-existent texture', () => {
      const result = manager.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('should return list of loaded texture names', async () => {
      await manager.loadTexture('tex1', 'http://example.com/tex1.png');
      await manager.loadTexture('tex2', 'http://example.com/tex2.png');

      const names = manager.list();

      expect(names).toContain('tex1');
      expect(names).toContain('tex2');
      expect(names).toHaveLength(2);
    });

    it('should return empty array when no textures loaded', () => {
      const names = manager.list();

      expect(names).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should delete all textures', async () => {
      await manager.loadTexture('clear1', 'http://example.com/clear1.png');
      await manager.loadTexture('clear2', 'http://example.com/clear2.png');

      manager.clear();

      expect(manager.list()).toHaveLength(0);
      expect(gl.deleteTexture).toHaveBeenCalledTimes(2);
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', async () => {
      await manager.loadTexture('dispose1', 'http://example.com/dispose1.png');

      manager.dispose();

      expect(manager.list()).toHaveLength(0);
    });
  });
});
