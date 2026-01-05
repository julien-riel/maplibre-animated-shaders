/**
 * Tests for SpriteAtlas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpriteAtlas, createGridManifest, type SpriteManifest } from '../../src/textures/SpriteAtlas';
import { TextureManager } from '../../src/textures/TextureManager';

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
  width: number = 512;
  height: number = 512;
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

describe('SpriteAtlas', () => {
  let atlas: SpriteAtlas;
  let gl: WebGLRenderingContext;
  let textureManager: TextureManager;

  const sampleManifest: SpriteManifest = {
    width: 512,
    height: 512,
    sprites: {
      'arrow': { x: 0, y: 0, width: 32, height: 32 },
      'marker': { x: 32, y: 0, width: 24, height: 32, anchorX: 0.5, anchorY: 1.0 },
      'circle': { x: 0, y: 32, width: 16, height: 16 },
      'star': { x: 56, y: 0, width: 48, height: 48, anchorX: 0.5, anchorY: 0.5 },
    }
  };

  beforeEach(() => {
    gl = createMockGL();
    textureManager = new TextureManager(gl);
    atlas = new SpriteAtlas(gl, textureManager);
  });

  describe('constructor', () => {
    it('should create SpriteAtlas with gl context and texture manager', () => {
      expect(atlas).toBeDefined();
    });

    it('should not be loaded initially', () => {
      expect(atlas.isLoaded()).toBe(false);
    });
  });

  describe('load', () => {
    it('should load atlas from URL with manifest', async () => {
      await atlas.load('test-atlas', 'http://example.com/sprites.png', sampleManifest);

      expect(atlas.isLoaded()).toBe(true);
      expect(atlas.getSpriteCount()).toBe(4);
    });

    it('should cache all sprite UV coordinates', async () => {
      await atlas.load('test-atlas', 'http://example.com/sprites.png', sampleManifest);

      expect(atlas.hasSprite('arrow')).toBe(true);
      expect(atlas.hasSprite('marker')).toBe(true);
      expect(atlas.hasSprite('circle')).toBe(true);
      expect(atlas.hasSprite('star')).toBe(true);
    });

    it('should return false for non-existent sprite', async () => {
      await atlas.load('test-atlas', 'http://example.com/sprites.png', sampleManifest);

      expect(atlas.hasSprite('nonexistent')).toBe(false);
    });
  });

  describe('getSprite', () => {
    beforeEach(async () => {
      await atlas.load('test-atlas', 'http://example.com/sprites.png', sampleManifest);
    });

    it('should return UV coordinates for sprite', () => {
      const sprite = atlas.getSprite('arrow');

      expect(sprite).toBeDefined();
      expect(sprite!.uv).toHaveLength(4);
      // UV should be normalized (0-1 range)
      expect(sprite!.uv[0]).toBe(0); // u0
      expect(sprite!.uv[1]).toBe(0); // v0
      expect(sprite!.uv[2]).toBeCloseTo(32 / 512); // u1
      expect(sprite!.uv[3]).toBeCloseTo(32 / 512); // v1
    });

    it('should use default anchor when not specified', () => {
      const sprite = atlas.getSprite('arrow');

      expect(sprite!.anchor).toEqual([0.5, 0.5]);
    });

    it('should use custom anchor when specified', () => {
      const sprite = atlas.getSprite('marker');

      expect(sprite!.anchor).toEqual([0.5, 1.0]);
    });

    it('should include sprite size', () => {
      const sprite = atlas.getSprite('arrow');

      expect(sprite!.size).toEqual([32, 32]);
    });

    it('should return undefined for non-existent sprite', () => {
      const sprite = atlas.getSprite('nonexistent');

      expect(sprite).toBeUndefined();
    });
  });

  describe('getSpriteOrThrow', () => {
    beforeEach(async () => {
      await atlas.load('test-atlas', 'http://example.com/sprites.png', sampleManifest);
    });

    it('should return sprite when exists', () => {
      const sprite = atlas.getSpriteOrThrow('arrow');

      expect(sprite).toBeDefined();
      expect(sprite.uv).toHaveLength(4);
    });

    it('should throw for non-existent sprite', () => {
      expect(() => atlas.getSpriteOrThrow('nonexistent')).toThrow(
        /Sprite "nonexistent" not found/
      );
    });
  });

  describe('listSprites', () => {
    it('should return empty array when not loaded', () => {
      expect(atlas.listSprites()).toEqual([]);
    });

    it('should return all sprite names', async () => {
      await atlas.load('test-atlas', 'http://example.com/sprites.png', sampleManifest);

      const sprites = atlas.listSprites();

      expect(sprites).toContain('arrow');
      expect(sprites).toContain('marker');
      expect(sprites).toContain('circle');
      expect(sprites).toContain('star');
      expect(sprites).toHaveLength(4);
    });
  });

  describe('getAtlasSize', () => {
    it('should return [0, 0] when not loaded', () => {
      expect(atlas.getAtlasSize()).toEqual([0, 0]);
    });

    it('should return atlas dimensions when loaded', async () => {
      await atlas.load('test-atlas', 'http://example.com/sprites.png', sampleManifest);

      expect(atlas.getAtlasSize()).toEqual([512, 512]);
    });
  });

  describe('bind', () => {
    it('should return false when not loaded', () => {
      expect(atlas.bind(0)).toBe(false);
    });

    it('should return true when loaded', async () => {
      await atlas.load('test-atlas', 'http://example.com/sprites.png', sampleManifest);

      expect(atlas.bind(0)).toBe(true);
    });
  });

  describe('createSpriteData', () => {
    beforeEach(async () => {
      await atlas.load('test-atlas', 'http://example.com/sprites.png', sampleManifest);
    });

    it('should create Float32Array with sprite data', () => {
      const data = atlas.createSpriteData(['arrow', 'marker']);

      expect(data).toBeInstanceOf(Float32Array);
      expect(data.length).toBe(2 * 6); // 2 sprites * 6 floats each
    });

    it('should use default UV for unknown sprites', () => {
      const data = atlas.createSpriteData(['nonexistent']);

      // Should be full texture (0, 0, 1, 1) with default anchor
      expect(data[0]).toBe(0);
      expect(data[1]).toBe(0);
      expect(data[2]).toBe(1);
      expect(data[3]).toBe(1);
      expect(data[4]).toBe(0.5);
      expect(data[5]).toBe(0.5);
    });
  });

  describe('addSprite', () => {
    beforeEach(async () => {
      await atlas.load('test-atlas', 'http://example.com/sprites.png', sampleManifest);
    });

    it('should add new sprite to atlas', () => {
      atlas.addSprite('newSprite', { x: 100, y: 100, width: 20, height: 20 });

      expect(atlas.hasSprite('newSprite')).toBe(true);
      expect(atlas.getSpriteCount()).toBe(5);
    });

    it('should throw if atlas not loaded', () => {
      const unloadedAtlas = new SpriteAtlas(gl, textureManager);

      expect(() => unloadedAtlas.addSprite('test', { x: 0, y: 0, width: 10, height: 10 }))
        .toThrow(/Atlas not loaded/);
    });
  });

  describe('removeSprite', () => {
    beforeEach(async () => {
      await atlas.load('test-atlas', 'http://example.com/sprites.png', sampleManifest);
    });

    it('should remove existing sprite', () => {
      const countBefore = atlas.getSpriteCount();
      const result = atlas.removeSprite('arrow');

      expect(result).toBe(true);
      expect(atlas.hasSprite('arrow')).toBe(false);
      expect(atlas.getSpriteCount()).toBe(countBefore - 1);
    });

    it('should return false for non-existent sprite', () => {
      const result = atlas.removeSprite('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false if atlas not loaded', () => {
      const unloadedAtlas = new SpriteAtlas(gl, textureManager);

      expect(unloadedAtlas.removeSprite('test')).toBe(false);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await atlas.load('test-atlas', 'http://example.com/sprites.png', sampleManifest);

      atlas.dispose();

      expect(atlas.isLoaded()).toBe(false);
      expect(atlas.getSpriteCount()).toBe(0);
    });
  });
});

describe('createGridManifest', () => {
  it('should create manifest for uniform grid', () => {
    const manifest = createGridManifest(256, 256, 32, 32, [
      'sprite_0', 'sprite_1', 'sprite_2', 'sprite_3',
      'sprite_4', 'sprite_5', 'sprite_6', 'sprite_7',
    ]);

    expect(manifest.width).toBe(256);
    expect(manifest.height).toBe(256);
    expect(Object.keys(manifest.sprites)).toHaveLength(8);
  });

  it('should calculate correct positions', () => {
    const manifest = createGridManifest(128, 128, 32, 32, [
      'a', 'b', 'c', 'd',
      'e', 'f', 'g', 'h',
    ]);

    // First row
    expect(manifest.sprites['a']).toEqual({ x: 0, y: 0, width: 32, height: 32 });
    expect(manifest.sprites['b']).toEqual({ x: 32, y: 0, width: 32, height: 32 });
    expect(manifest.sprites['c']).toEqual({ x: 64, y: 0, width: 32, height: 32 });
    expect(manifest.sprites['d']).toEqual({ x: 96, y: 0, width: 32, height: 32 });

    // Second row
    expect(manifest.sprites['e']).toEqual({ x: 0, y: 32, width: 32, height: 32 });
    expect(manifest.sprites['f']).toEqual({ x: 32, y: 32, width: 32, height: 32 });
  });

  it('should handle non-square grids', () => {
    const manifest = createGridManifest(128, 64, 32, 32, [
      'a', 'b', 'c', 'd',
      'e', 'f', 'g', 'h',
    ]);

    // 4 columns, 2 rows
    expect(manifest.sprites['e']).toEqual({ x: 0, y: 32, width: 32, height: 32 });
  });

  it('should handle empty sprite list', () => {
    const manifest = createGridManifest(256, 256, 32, 32, []);

    expect(manifest.width).toBe(256);
    expect(manifest.height).toBe(256);
    expect(Object.keys(manifest.sprites)).toHaveLength(0);
  });
});
