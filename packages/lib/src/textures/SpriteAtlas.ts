/**
 * Sprite Atlas
 *
 * Manages a texture atlas containing multiple sprites.
 * Provides UV coordinate lookup for sprite rendering.
 *
 * @module textures/SpriteAtlas
 */

import { TextureManager, type TextureInfo } from './TextureManager';

/**
 * Sprite definition in atlas
 */
export interface SpriteDefinition {
  /** X position in atlas (pixels) */
  x: number;

  /** Y position in atlas (pixels) */
  y: number;

  /** Width in pixels */
  width: number;

  /** Height in pixels */
  height: number;

  /** Optional anchor point X (0-1, default 0.5) */
  anchorX?: number;

  /** Optional anchor point Y (0-1, default 0.5) */
  anchorY?: number;
}

/**
 * Sprite atlas manifest
 */
export interface SpriteManifest {
  /** Atlas image dimensions */
  width: number;
  height: number;

  /** Sprite definitions by name */
  sprites: Record<string, SpriteDefinition>;
}

/**
 * UV coordinates for a sprite
 */
export interface SpriteUV {
  /** UV coordinates [u0, v0, u1, v1] */
  uv: [number, number, number, number];

  /** Anchor point [x, y] */
  anchor: [number, number];

  /** Sprite size in pixels [width, height] */
  size: [number, number];
}

/**
 * Sprite atlas for efficient sprite rendering.
 *
 * @example
 * ```typescript
 * const atlas = new SpriteAtlas(gl, textureManager);
 *
 * // Load atlas
 * await atlas.load('sprites', '/textures/sprites.png', {
 *   width: 512,
 *   height: 512,
 *   sprites: {
 *     'arrow': { x: 0, y: 0, width: 32, height: 32 },
 *     'marker': { x: 32, y: 0, width: 24, height: 32, anchorY: 1.0 },
 *     'circle': { x: 0, y: 32, width: 16, height: 16 },
 *   }
 * });
 *
 * // Get sprite UV
 * const arrow = atlas.getSprite('arrow');
 * // arrow.uv = [0, 0, 0.0625, 0.0625]
 *
 * // Bind for rendering
 * atlas.bind(0);
 * ```
 */
export class SpriteAtlas {
  private gl: WebGLRenderingContext;
  private textureManager: TextureManager;
  private textureInfo: TextureInfo | null = null;
  private manifest: SpriteManifest | null = null;
  private spriteCache: Map<string, SpriteUV> = new Map();
  private name: string = '';

  /**
   * Create a sprite atlas.
   *
   * @param gl - WebGL rendering context
   * @param textureManager - Texture manager instance
   */
  constructor(gl: WebGLRenderingContext, textureManager: TextureManager) {
    this.gl = gl;
    this.textureManager = textureManager;
  }

  /**
   * Load a sprite atlas.
   *
   * @param name - Atlas identifier
   * @param url - Atlas texture URL
   * @param manifest - Sprite manifest
   * @returns Promise resolving when loaded
   */
  async load(name: string, url: string, manifest: SpriteManifest): Promise<void> {
    this.name = name;
    this.manifest = manifest;
    this.spriteCache.clear();

    // Load the atlas texture
    this.textureInfo = await this.textureManager.loadTexture(name, url, {
      generateMipmaps: true,
      minFilter: this.gl.LINEAR_MIPMAP_LINEAR,
      magFilter: this.gl.LINEAR,
    });

    // Pre-compute UV coordinates for all sprites
    for (const [spriteName, def] of Object.entries(manifest.sprites)) {
      this.spriteCache.set(spriteName, this.computeUV(def, manifest.width, manifest.height));
    }
  }

  /**
   * Load atlas from a JSON manifest file.
   *
   * @param name - Atlas identifier
   * @param textureUrl - Atlas texture URL
   * @param manifestUrl - JSON manifest URL
   */
  async loadFromManifest(name: string, textureUrl: string, manifestUrl: string): Promise<void> {
    // Fetch manifest
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to load sprite manifest: ${manifestUrl}`);
    }

    const manifest = (await response.json()) as SpriteManifest;
    await this.load(name, textureUrl, manifest);
  }

  /**
   * Compute UV coordinates for a sprite definition.
   */
  private computeUV(def: SpriteDefinition, atlasWidth: number, atlasHeight: number): SpriteUV {
    const u0 = def.x / atlasWidth;
    const v0 = def.y / atlasHeight;
    const u1 = (def.x + def.width) / atlasWidth;
    const v1 = (def.y + def.height) / atlasHeight;

    return {
      uv: [u0, v0, u1, v1],
      anchor: [def.anchorX ?? 0.5, def.anchorY ?? 0.5],
      size: [def.width, def.height],
    };
  }

  /**
   * Get sprite UV coordinates.
   *
   * @param spriteName - Name of the sprite
   * @returns Sprite UV or undefined if not found
   */
  getSprite(spriteName: string): SpriteUV | undefined {
    return this.spriteCache.get(spriteName);
  }

  /**
   * Get sprite UV coordinates, throwing if not found.
   *
   * @param spriteName - Name of the sprite
   * @returns Sprite UV
   * @throws Error if sprite not found
   */
  getSpriteOrThrow(spriteName: string): SpriteUV {
    const sprite = this.spriteCache.get(spriteName);
    if (!sprite) {
      throw new Error(`[SpriteAtlas] Sprite "${spriteName}" not found in atlas "${this.name}"`);
    }
    return sprite;
  }

  /**
   * Check if a sprite exists.
   *
   * @param spriteName - Name of the sprite
   * @returns true if sprite exists
   */
  hasSprite(spriteName: string): boolean {
    return this.spriteCache.has(spriteName);
  }

  /**
   * List all sprite names.
   *
   * @returns Array of sprite names
   */
  listSprites(): string[] {
    return Array.from(this.spriteCache.keys());
  }

  /**
   * Get the number of sprites.
   *
   * @returns Sprite count
   */
  getSpriteCount(): number {
    return this.spriteCache.size;
  }

  /**
   * Get atlas dimensions.
   *
   * @returns [width, height] or [0, 0] if not loaded
   */
  getAtlasSize(): [number, number] {
    return this.manifest ? [this.manifest.width, this.manifest.height] : [0, 0];
  }

  /**
   * Bind the atlas texture to a texture unit.
   *
   * @param unit - Texture unit (default: 0)
   * @returns true if bound successfully
   */
  bind(unit: number = 0): boolean {
    if (!this.textureInfo) {
      return false;
    }
    return this.textureManager.bind(this.name, unit);
  }

  /**
   * Unbind the atlas texture.
   *
   * @param unit - Texture unit
   */
  unbind(unit: number = 0): void {
    this.textureManager.unbind(unit);
  }

  /**
   * Get the texture info.
   *
   * @returns Texture info or null
   */
  getTextureInfo(): TextureInfo | null {
    return this.textureInfo;
  }

  /**
   * Check if atlas is loaded.
   *
   * @returns true if loaded
   */
  isLoaded(): boolean {
    return this.textureInfo !== null;
  }

  /**
   * Create sprite data for instanced rendering.
   * Returns a Float32Array with [u0, v0, u1, v1, anchorX, anchorY] per sprite.
   *
   * @param spriteNames - Array of sprite names
   * @returns Float32Array with sprite data
   */
  createSpriteData(spriteNames: string[]): Float32Array {
    const data = new Float32Array(spriteNames.length * 6);

    for (let i = 0; i < spriteNames.length; i++) {
      const sprite = this.spriteCache.get(spriteNames[i]);
      const offset = i * 6;

      if (sprite) {
        data[offset] = sprite.uv[0];
        data[offset + 1] = sprite.uv[1];
        data[offset + 2] = sprite.uv[2];
        data[offset + 3] = sprite.uv[3];
        data[offset + 4] = sprite.anchor[0];
        data[offset + 5] = sprite.anchor[1];
      } else {
        // Default to full texture
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 1;
        data[offset + 3] = 1;
        data[offset + 4] = 0.5;
        data[offset + 5] = 0.5;
      }
    }

    return data;
  }

  /**
   * Add a sprite to the atlas (updates manifest only, not texture).
   *
   * @param name - Sprite name
   * @param definition - Sprite definition
   */
  addSprite(name: string, definition: SpriteDefinition): void {
    if (!this.manifest) {
      throw new Error('[SpriteAtlas] Atlas not loaded');
    }

    this.manifest.sprites[name] = definition;
    this.spriteCache.set(
      name,
      this.computeUV(definition, this.manifest.width, this.manifest.height)
    );
  }

  /**
   * Remove a sprite from the atlas.
   *
   * @param name - Sprite name
   * @returns true if removed
   */
  removeSprite(name: string): boolean {
    if (!this.manifest) {
      return false;
    }

    if (name in this.manifest.sprites) {
      delete this.manifest.sprites[name];
      this.spriteCache.delete(name);
      return true;
    }
    return false;
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    if (this.name) {
      this.textureManager.delete(this.name);
    }
    this.spriteCache.clear();
    this.manifest = null;
    this.textureInfo = null;
  }
}

/**
 * Create a grid-based sprite manifest.
 * Useful for sprite sheets with uniform cell sizes.
 *
 * @param atlasWidth - Atlas width in pixels
 * @param atlasHeight - Atlas height in pixels
 * @param cellWidth - Cell width in pixels
 * @param cellHeight - Cell height in pixels
 * @param spriteNames - Array of sprite names (row by row)
 * @returns Sprite manifest
 *
 * @example
 * ```typescript
 * const manifest = createGridManifest(256, 256, 32, 32, [
 *   'sprite_0', 'sprite_1', 'sprite_2', 'sprite_3',
 *   'sprite_4', 'sprite_5', 'sprite_6', 'sprite_7',
 *   // ...
 * ]);
 * ```
 */
export function createGridManifest(
  atlasWidth: number,
  atlasHeight: number,
  cellWidth: number,
  cellHeight: number,
  spriteNames: string[]
): SpriteManifest {
  const cols = Math.floor(atlasWidth / cellWidth);
  const sprites: Record<string, SpriteDefinition> = {};

  for (let i = 0; i < spriteNames.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    sprites[spriteNames[i]] = {
      x: col * cellWidth,
      y: row * cellHeight,
      width: cellWidth,
      height: cellHeight,
    };
  }

  return {
    width: atlasWidth,
    height: atlasHeight,
    sprites,
  };
}
