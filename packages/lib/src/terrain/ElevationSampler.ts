/**
 * Elevation Sampler
 *
 * Provides elevation data sampling from Digital Elevation Model (DEM)
 * textures for 3D terrain rendering.
 *
 * @module terrain/ElevationSampler
 */

/**
 * DEM data configuration
 */
export interface DEMConfig {
  /** Minimum elevation value in the DEM */
  minElevation: number;

  /** Maximum elevation value in the DEM */
  maxElevation: number;

  /** DEM resolution in pixels */
  resolution: number;

  /** Tile size in pixels */
  tileSize: number;

  /** Encoding type */
  encoding: 'mapbox' | 'terrarium' | 'raw';
}

/**
 * Default DEM configuration
 */
const DEFAULT_DEM_CONFIG: DEMConfig = {
  minElevation: -500,
  maxElevation: 9000,
  resolution: 512,
  tileSize: 256,
  encoding: 'mapbox',
};

/**
 * Elevation data tile
 */
interface ElevationTile {
  /** Tile key (z/x/y) */
  key: string;

  /** Elevation data */
  data: Float32Array;

  /** Tile bounds [west, south, east, north] */
  bounds: [number, number, number, number];

  /** Last access timestamp */
  lastAccess: number;
}

/**
 * Elevation sampler for DEM data.
 *
 * @example
 * ```typescript
 * const sampler = new ElevationSampler(gl);
 *
 * // Load terrain tiles
 * await sampler.loadTile(10, 512, 341, 'https://api.mapbox.com/v4/mapbox.terrain-rgb');
 *
 * // Sample elevation at a point
 * const elevation = sampler.sampleElevation(-122.4, 37.8);
 * console.log(`Elevation: ${elevation}m`);
 *
 * // Get elevation for shader
 * const uniform = sampler.getElevationUniform(-122.4, 37.8);
 * ```
 */
export class ElevationSampler {
  private gl: WebGLRenderingContext;
  private config: DEMConfig;
  private tiles: Map<string, ElevationTile> = new Map();
  private texture: WebGLTexture | null = null;
  private maxTiles: number = 50;
  private currentTileKey: string | null = null;

  /**
   * Create an elevation sampler.
   *
   * @param gl - WebGL rendering context
   * @param config - DEM configuration
   */
  constructor(gl: WebGLRenderingContext, config: Partial<DEMConfig> = {}) {
    this.gl = gl;
    this.config = { ...DEFAULT_DEM_CONFIG, ...config };
    this.createTexture();
  }

  /**
   * Create the elevation texture.
   */
  private createTexture(): void {
    const gl = this.gl;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * Load a DEM tile from URL.
   *
   * @param z - Zoom level
   * @param x - Tile X
   * @param y - Tile Y
   * @param urlTemplate - URL template with {z}, {x}, {y} placeholders
   * @returns Promise resolving when tile is loaded
   */
  async loadTile(z: number, x: number, y: number, urlTemplate: string): Promise<void> {
    const key = `${z}/${x}/${y}`;

    // Check cache
    if (this.tiles.has(key)) {
      const tile = this.tiles.get(key)!;
      tile.lastAccess = Date.now();
      return;
    }

    // Build URL
    const url = urlTemplate
      .replace('{z}', String(z))
      .replace('{x}', String(x))
      .replace('{y}', String(y));

    // Load image
    const image = await this.loadImage(url);

    // Decode elevation data
    const data = this.decodeElevation(image);

    // Calculate tile bounds
    const bounds = this.tileBounds(z, x, y);

    // Store tile
    const tile: ElevationTile = {
      key,
      data,
      bounds,
      lastAccess: Date.now(),
    };

    this.tiles.set(key, tile);

    // Evict old tiles if necessary
    this.evictOldTiles();
  }

  /**
   * Load an image.
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load DEM tile: ${url}`));
      img.src = url;
    });
  }

  /**
   * Decode elevation data from image.
   */
  private decodeElevation(image: HTMLImageElement): Float32Array {
    // Create canvas to read pixel data
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const pixels = imageData.data;

    const elevations = new Float32Array(image.width * image.height);

    for (let i = 0; i < elevations.length; i++) {
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];

      elevations[i] = this.decodePixel(r, g, b);
    }

    return elevations;
  }

  /**
   * Decode elevation from RGB pixel values.
   */
  private decodePixel(r: number, g: number, b: number): number {
    switch (this.config.encoding) {
      case 'mapbox':
        // Mapbox Terrain-RGB encoding
        return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;

      case 'terrarium':
        // Terrarium encoding
        return r * 256 + g + b / 256 - 32768;

      case 'raw':
        // Raw 16-bit in RG channels
        return (r * 256 + g) / 65535 * (this.config.maxElevation - this.config.minElevation) + this.config.minElevation;

      default:
        return 0;
    }
  }

  /**
   * Calculate tile bounds in lon/lat.
   */
  private tileBounds(z: number, x: number, y: number): [number, number, number, number] {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    const north = (180 / Math.PI) * Math.atan(Math.sinh(n));

    const s = Math.PI - (2 * Math.PI * (y + 1)) / Math.pow(2, z);
    const south = (180 / Math.PI) * Math.atan(Math.sinh(s));

    const west = (x / Math.pow(2, z)) * 360 - 180;
    const east = ((x + 1) / Math.pow(2, z)) * 360 - 180;

    return [west, south, east, north];
  }

  /**
   * Evict old tiles from cache.
   */
  private evictOldTiles(): void {
    if (this.tiles.size <= this.maxTiles) {
      return;
    }

    // Sort by last access time
    const entries = Array.from(this.tiles.entries());
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // Remove oldest tiles
    const toRemove = entries.slice(0, entries.length - this.maxTiles);
    for (const [key] of toRemove) {
      this.tiles.delete(key);
    }
  }

  /**
   * Validate coordinate values.
   *
   * @param lng - Longitude
   * @param lat - Latitude
   * @throws RangeError if coordinates are invalid
   */
  private validateCoordinates(lng: number, lat: number): void {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      throw new RangeError(`Invalid coordinates: (${lng}, ${lat})`);
    }
    if (lng < -180 || lng > 180) {
      throw new RangeError(`Longitude out of range [-180, 180]: ${lng}`);
    }
    if (lat < -90 || lat > 90) {
      throw new RangeError(`Latitude out of range [-90, 90]: ${lat}`);
    }
  }

  /**
   * Sample elevation at a point.
   *
   * @param lng - Longitude (-180 to 180)
   * @param lat - Latitude (-90 to 90)
   * @returns Elevation in meters, or 0 if no data available
   * @throws RangeError if coordinates are out of valid range
   */
  sampleElevation(lng: number, lat: number): number {
    this.validateCoordinates(lng, lat);

    // Find tile containing this point
    const tile = this.findTileForPoint(lng, lat);
    if (!tile) {
      return 0;
    }

    // Calculate position within tile
    const [west, south, east, north] = tile.bounds;
    const u = (lng - west) / (east - west);
    const v = (lat - south) / (north - south);

    // Bilinear interpolation
    return this.sampleBilinear(tile.data, u, v, this.config.tileSize);
  }

  /**
   * Find tile containing a point.
   */
  private findTileForPoint(lng: number, lat: number): ElevationTile | null {
    for (const tile of this.tiles.values()) {
      const [west, south, east, north] = tile.bounds;
      if (lng >= west && lng <= east && lat >= south && lat <= north) {
        tile.lastAccess = Date.now();
        return tile;
      }
    }
    return null;
  }

  /**
   * Bilinear interpolation of elevation data.
   */
  private sampleBilinear(
    data: Float32Array,
    u: number,
    v: number,
    size: number
  ): number {
    // Flip V to match image coordinates
    v = 1 - v;

    const x = u * (size - 1);
    const y = v * (size - 1);

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, size - 1);
    const y1 = Math.min(y0 + 1, size - 1);

    const fx = x - x0;
    const fy = y - y0;

    const v00 = data[y0 * size + x0];
    const v10 = data[y0 * size + x1];
    const v01 = data[y1 * size + x0];
    const v11 = data[y1 * size + x1];

    const v0 = v00 * (1 - fx) + v10 * fx;
    const v1 = v01 * (1 - fx) + v11 * fx;

    return v0 * (1 - fy) + v1 * fy;
  }

  /**
   * Get elevation as normalized value for shader.
   *
   * @param lng - Longitude (-180 to 180)
   * @param lat - Latitude (-90 to 90)
   * @returns Normalized elevation (0-1 range)
   * @throws RangeError if coordinates are out of valid range
   */
  getElevationNormalized(lng: number, lat: number): number {
    // Validation done in sampleElevation
    const elevation = this.sampleElevation(lng, lat);
    return (elevation - this.config.minElevation) /
      (this.config.maxElevation - this.config.minElevation);
  }

  /**
   * Upload current tile to texture.
   *
   * @param lng - Longitude to determine which tile (-180 to 180)
   * @param lat - Latitude to determine which tile (-90 to 90)
   * @throws RangeError if coordinates are out of valid range
   */
  uploadToTexture(lng: number, lat: number): void {
    this.validateCoordinates(lng, lat);
    const tile = this.findTileForPoint(lng, lat);
    if (!tile || tile.key === this.currentTileKey) {
      return;
    }

    const gl = this.gl;
    const size = this.config.tileSize;

    // Convert to RGBA for texture
    const rgba = new Uint8Array(size * size * 4);
    for (let i = 0; i < tile.data.length; i++) {
      const normalized =
        (tile.data[i] - this.config.minElevation) /
        (this.config.maxElevation - this.config.minElevation);
      const value = Math.round(normalized * 255);
      rgba[i * 4] = value;
      rgba[i * 4 + 1] = value;
      rgba[i * 4 + 2] = value;
      rgba[i * 4 + 3] = 255;
    }

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.currentTileKey = tile.key;
  }

  /**
   * Bind elevation texture to a texture unit.
   *
   * @param unit - Texture unit
   */
  bind(unit: number = 0): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
  }

  /**
   * Get uniforms for terrain shader.
   *
   * @param lng - Center longitude (-180 to 180)
   * @param lat - Center latitude (-90 to 90)
   * @returns Uniforms object
   * @throws RangeError if coordinates are out of valid range
   */
  getUniforms(lng: number, lat: number): Record<string, number | number[]> {
    this.validateCoordinates(lng, lat);
    const tile = this.findTileForPoint(lng, lat);
    if (!tile) {
      return {
        u_elevationMin: this.config.minElevation,
        u_elevationMax: this.config.maxElevation,
        u_elevationScale: 1.0,
        u_tileBounds: [0, 0, 1, 1],
      };
    }

    return {
      u_elevationMin: this.config.minElevation,
      u_elevationMax: this.config.maxElevation,
      u_elevationScale: 1.0,
      u_tileBounds: tile.bounds,
    };
  }

  /**
   * Check if elevation data is available for a point.
   *
   * @param lng - Longitude (-180 to 180)
   * @param lat - Latitude (-90 to 90)
   * @returns true if data is available
   * @throws RangeError if coordinates are out of valid range
   */
  hasDataFor(lng: number, lat: number): boolean {
    this.validateCoordinates(lng, lat);
    return this.findTileForPoint(lng, lat) !== null;
  }

  /**
   * Get the elevation texture.
   *
   * @returns WebGL texture
   */
  getTexture(): WebGLTexture | null {
    return this.texture;
  }

  /**
   * Set maximum number of cached tiles.
   *
   * @param max - Maximum tiles
   */
  setMaxTiles(max: number): void {
    this.maxTiles = max;
    this.evictOldTiles();
  }

  /**
   * Clear all cached tiles.
   */
  clearCache(): void {
    this.tiles.clear();
    this.currentTileKey = null;
  }

  /**
   * Get number of cached tiles.
   *
   * @returns Tile count
   */
  getTileCount(): number {
    return this.tiles.size;
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
    this.tiles.clear();
  }
}
