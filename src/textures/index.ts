/**
 * Textures Module
 *
 * Provides texture loading, management, and sprite atlas support for
 * shader-based effects and particle systems.
 *
 * - **TextureManager**: Load, cache, and bind textures
 * - **SpriteAtlas**: Pack multiple sprites into a single texture
 *
 * @module textures
 *
 * @example
 * ```typescript
 * import { TextureManager, SpriteAtlas, createGridManifest } from 'maplibre-animated-shaders';
 *
 * // Load individual textures
 * const textures = new TextureManager(gl);
 * await textures.loadTexture('particle', '/textures/particle.png');
 * textures.bind('particle', 0);
 *
 * // Create a sprite atlas
 * const atlas = new SpriteAtlas(gl);
 * await atlas.load('/textures/icons.png', createGridManifest(16, 16, 4, 4));
 *
 * // Get UV coordinates for a specific sprite
 * const uv = atlas.getSpriteUV('icon-0-0');
 * ```
 */

export {
  TextureManager,
  type TextureOptions,
  type TextureInfo,
} from './TextureManager';

export {
  SpriteAtlas,
  createGridManifest,
  type SpriteDefinition,
  type SpriteManifest,
  type SpriteUV,
} from './SpriteAtlas';
