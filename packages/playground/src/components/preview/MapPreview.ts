/**
 * MapPreview - MapLibre preview for shader testing
 */

import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { GeometryType } from 'maplibre-animated-shaders';
import { ShaderManager, examplePlugin } from 'maplibre-animated-shaders';
import { SampleDataProvider } from './SampleDataProvider';
import { store } from '../../state';

export interface MapPreviewOptions {
  container: HTMLElement;
  onReady?: (map: MapLibreMap) => void;
}

/** Layer ID for the playground preview */
const PREVIEW_LAYER_ID = 'playground-preview';

/**
 * MapPreview component
 */
export class MapPreview {
  private map: MapLibreMap | null = null;
  private container: HTMLElement;
  private dataProvider: SampleDataProvider;
  private currentGeometry: GeometryType = 'point';
  private isReady = false;
  private onReady?: (map: MapLibreMap) => void;
  private shaderManager: ShaderManager | null = null;

  constructor(options: MapPreviewOptions) {
    this.container = options.container;
    this.onReady = options.onReady;
    this.dataProvider = new SampleDataProvider();
    this.initMap();
    this.subscribeToStore();
  }

  private initMap(): void {
    this.map = new maplibregl.Map({
      container: this.container,
      style: {
        version: 8,
        name: 'Playground Dark',
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#1a1a2e',
            },
          },
          {
            id: 'carto-dark-tiles',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [20, 30],
      zoom: 1.5,
      attributionControl: {
        compact: true,
      },
    });

    this.map.on('load', () => {
      this.isReady = true;
      this.setupSampleData();
      this.onReady?.(this.map!);

      // Expose map globally for debugging
      (window as unknown as { __playgroundMap: MapLibreMap }).__playgroundMap = this.map!;
    });
  }

  private subscribeToStore(): void {
    store.on('state:changed', ({ state }) => {
      if (state.currentShader !== this.currentGeometry) {
        this.setGeometry(state.currentShader);
      }
    });
  }

  /**
   * Setup sample data sources
   */
  private setupSampleData(): void {
    if (!this.map || !this.isReady) return;

    // Initialize ShaderManager
    this.shaderManager = new ShaderManager(this.map);
    this.shaderManager.use(examplePlugin);

    // Start the animation loop
    this.shaderManager.play();

    // Add sources for each geometry type
    const geometries: GeometryType[] = ['point', 'line', 'polygon'];

    geometries.forEach((geo) => {
      const sourceId = this.dataProvider.getSourceId(geo);
      const data = this.dataProvider.getData(geo);

      if (data && !this.map!.getSource(sourceId)) {
        this.map!.addSource(sourceId, {
          type: 'geojson',
          data,
        });
      }
    });

    // Add initial layer for current geometry
    this.addPreviewLayer(this.currentGeometry);
  }

  /**
   * Add preview layer for geometry type
   */
  private addPreviewLayer(geometry: GeometryType): void {
    if (!this.map || !this.isReady || !this.shaderManager) return;

    // Remove existing preview layers
    this.removePreviewLayers();

    const sourceId = this.dataProvider.getSourceId(geometry);

    if (geometry === 'global') {
      // Global layer - skip for now, requires special handling
      console.log('[Playground] Global geometry preview not yet implemented');
      return;
    }

    // First, add a base MapLibre layer (ShaderManager requires an existing layer)
    this.addBaseLayer(geometry, sourceId);

    // Debug: Check if base layer was added
    const baseLayer = this.map.getLayer(PREVIEW_LAYER_ID);
    const source = this.map.getSource(sourceId);
    console.log('[Playground] Base layer exists:', !!baseLayer);
    console.log('[Playground] Source exists:', !!source);
    console.log('[Playground] Source ID:', sourceId);

    // Then apply the animated shader on top
    try {
      const shaderName = `example:${geometry}`;
      console.log('[Playground] Registering shader:', shaderName, 'on layer:', PREVIEW_LAYER_ID);
      this.shaderManager.register(PREVIEW_LAYER_ID, shaderName, {
        speed: 1.0,
        intensity: 1.0,
        color: '#3b82f6',
        // Point-specific
        rings: 3,
        maxRadius: 50,
        thickness: 2,
        fadeOut: true,
        easing: 'easeOut',
        // Line-specific
        dashLength: 10,
        dashGap: 5,
        // Polygon-specific
        scale: 1.0,
      });
      console.log('[Playground] Animated shader layer added:', geometry);

      // Check the shader layer was created
      const customLayerId = `${PREVIEW_LAYER_ID}-shader`;
      console.log('[Playground] Custom shader layer exists:', !!this.map.getLayer(customLayerId));
    } catch (error) {
      console.error('[Playground] Failed to add shader layer:', error);
      // Base layer remains visible as fallback
    }
  }

  /**
   * Add base MapLibre layer (required before applying shader)
   */
  private addBaseLayer(geometry: GeometryType, sourceId: string): void {
    if (!this.map) return;

    switch (geometry) {
      case 'point':
        this.map.addLayer({
          id: PREVIEW_LAYER_ID,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 15,
            'circle-color': '#3b82f6',
            'circle-opacity': 0.8,
          },
        });
        break;
      case 'line':
        this.map.addLayer({
          id: PREVIEW_LAYER_ID,
          type: 'line',
          source: sourceId,
          paint: {
            'line-width': 4,
            'line-color': '#3b82f6',
            'line-opacity': 0.8,
          },
        });
        break;
      case 'polygon':
        this.map.addLayer({
          id: PREVIEW_LAYER_ID,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.5,
          },
        });
        break;
    }
  }

  /**
   * Update shader source code (hot-reload)
   * TODO: Re-enable when custom shader support is implemented
   */
  updateShader(_fragmentShader: string, _vertexShader?: string): boolean {
    if (!this.isReady) return false;

    // For now, just trigger a repaint - hot-reload will be implemented later
    this.map?.triggerRepaint();
    return true;
  }

  /**
   * Remove all preview layers
   */
  private removePreviewLayers(): void {
    if (!this.map) return;

    // Remove the shader layer via ShaderManager if registered
    if (this.shaderManager) {
      try {
        this.shaderManager.unregister(PREVIEW_LAYER_ID);
      } catch {
        // Layer not registered with ShaderManager, try direct removal
      }
    }

    // Fallback: remove directly if it's a standard layer
    if (this.map.getLayer(PREVIEW_LAYER_ID)) {
      this.map.removeLayer(PREVIEW_LAYER_ID);
    }
  }

  /**
   * Set current geometry type
   */
  setGeometry(geometry: GeometryType): void {
    if (geometry === this.currentGeometry) return;

    this.currentGeometry = geometry;

    if (!this.isReady) return;

    // Update view
    const center = this.dataProvider.getCenter(geometry);
    const zoom = this.dataProvider.getZoomLevel(geometry);

    this.map?.flyTo({
      center,
      zoom,
      duration: 500,
    });

    // Update layer
    this.addPreviewLayer(geometry);
  }

  /**
   * Get the map instance
   */
  getMap(): MapLibreMap | null {
    return this.map;
  }

  /**
   * Get sample data provider
   */
  getDataProvider(): SampleDataProvider {
    return this.dataProvider;
  }

  /**
   * Check if map is ready
   */
  getIsReady(): boolean {
    return this.isReady;
  }

  /**
   * Trigger map repaint
   */
  triggerRepaint(): void {
    this.map?.triggerRepaint();
  }

  /**
   * Resize map
   */
  resize(): void {
    this.map?.resize();
  }

  /**
   * Dispose map
   */
  dispose(): void {
    if (this.shaderManager) {
      this.shaderManager.destroy();
      this.shaderManager = null;
    }
    this.map?.remove();
    this.map = null;
  }
}
