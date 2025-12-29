/**
 * MapView - MapLibre GL JS wrapper with demo data
 * Handles map initialization, data loading, and shader application
 */

import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { createShaderManager, globalRegistry } from '../../../src';
import type { ShaderManager } from '../../../src/ShaderManager';

import demoPoints from '../data/demo-points.geojson';
import demoLines from '../data/demo-lines.geojson';
import demoPolygons from '../data/demo-polygons.geojson';

type ReadyCallback = () => void;

/**
 * MapView component
 */
export class MapView {
  private map: MapLibreMap;
  private shaderManager: ShaderManager | null = null;
  private currentLayerId: string = 'demo-points';
  private currentShader: string | null = null;
  private currentConfig: Record<string, unknown> = {};
  private readyCallbacks: ReadyCallback[] = [];
  private isReady: boolean = false;

  constructor(containerId: string) {
    this.map = new maplibregl.Map({
      container: containerId,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [2.34, 48.858],
      zoom: 13,
      attributionControl: true,
    });

    this.map.on('load', () => this.onMapLoad());
  }

  /**
   * Register a callback for when the map is ready
   */
  onReady(callback: ReadyCallback): void {
    if (this.isReady) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  /**
   * Apply a shader to the demo layer
   */
  applyShader(shaderName: string, config: Record<string, unknown>): void {
    this.currentShader = shaderName;
    this.currentConfig = { ...config };

    if (!this.isReady) return;

    // Clean up existing shader
    if (this.shaderManager) {
      this.shaderManager.destroy();
    }

    // Create new shader manager
    this.shaderManager = createShaderManager(this.map, { debug: false });

    // Determine layer based on shader geometry
    this.currentLayerId = this.getLayerForShader(shaderName);

    // Apply shader
    try {
      this.shaderManager.register(this.currentLayerId, shaderName, config);
    } catch (error) {
      console.error('Failed to apply shader:', error);
    }
  }

  /**
   * Update shader configuration
   */
  updateConfig(config: Record<string, unknown>): void {
    this.currentConfig = { ...this.currentConfig, ...config };

    if (this.shaderManager && this.currentLayerId) {
      try {
        this.shaderManager.updateConfig(this.currentLayerId, config);
      } catch (error) {
        console.error('Failed to update config:', error);
      }
    }
  }

  /**
   * Play animation
   */
  play(): void {
    if (this.shaderManager) {
      this.shaderManager.play();
    }
  }

  /**
   * Pause animation
   */
  pause(): void {
    if (this.shaderManager) {
      this.shaderManager.pause();
    }
  }

  /**
   * Get the MapLibre map instance
   */
  getMap(): MapLibreMap {
    return this.map;
  }

  /**
   * Get layer ID for shader type
   */
  private getLayerForShader(shaderName: string): string {
    const definition = globalRegistry.get(shaderName);

    if (definition) {
      switch (definition.geometry) {
        case 'point':
          return 'demo-points';
        case 'line':
          return 'demo-lines';
        case 'polygon':
          return 'demo-polygons';
        default:
          return 'demo-points';
      }
    }

    return 'demo-points';
  }

  /**
   * Handle map load event
   */
  private onMapLoad(): void {
    this.addDataSources();
    this.addLayers();

    this.isReady = true;

    // Apply pending shader if any
    if (this.currentShader) {
      this.applyShader(this.currentShader, this.currentConfig);
    }

    // Notify ready callbacks
    this.readyCallbacks.forEach(cb => cb());
    this.readyCallbacks = [];
  }

  /**
   * Add GeoJSON data sources
   */
  private addDataSources(): void {
    this.map.addSource('demo-points-source', {
      type: 'geojson',
      data: demoPoints as GeoJSON.FeatureCollection,
    });

    this.map.addSource('demo-lines-source', {
      type: 'geojson',
      data: demoLines as GeoJSON.FeatureCollection,
    });

    this.map.addSource('demo-polygons-source', {
      type: 'geojson',
      data: demoPolygons as GeoJSON.FeatureCollection,
    });
  }

  /**
   * Add map layers for each geometry type
   */
  private addLayers(): void {
    // Polygons layer (bottom)
    this.map.addLayer({
      id: 'demo-polygons',
      type: 'fill',
      source: 'demo-polygons-source',
      paint: {
        'fill-color': '#8b5cf6',
        'fill-opacity': 0.2,
        'fill-outline-color': '#8b5cf6',
      },
    });

    // Lines layer
    this.map.addLayer({
      id: 'demo-lines',
      type: 'line',
      source: 'demo-lines-source',
      paint: {
        'line-color': '#22c55e',
        'line-width': 2,
        'line-opacity': 0.6,
      },
    });

    // Points layer (top)
    this.map.addLayer({
      id: 'demo-points',
      type: 'circle',
      source: 'demo-points-source',
      paint: {
        'circle-radius': 8,
        'circle-color': '#3b82f6',
        'circle-opacity': 1,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Add interactivity
    this.addInteractivity();
  }

  /**
   * Add mouse interactivity
   */
  private addInteractivity(): void {
    // Change cursor on hover
    this.map.on('mouseenter', 'demo-points', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'demo-points', () => {
      this.map.getCanvas().style.cursor = '';
    });

    // Show popup on click
    this.map.on('click', 'demo-points', (e) => {
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice();
      const name = feature.properties?.name || 'Unknown';
      const category = feature.properties?.category || '';

      // Ensure popup appears at click location
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      new maplibregl.Popup()
        .setLngLat(coordinates as [number, number])
        .setHTML(`
          <div style="padding: 4px;">
            <strong>${name}</strong>
            ${category ? `<br><small style="color: #666;">${category}</small>` : ''}
          </div>
        `)
        .addTo(this.map);
    });
  }

  /**
   * Destroy the map
   */
  destroy(): void {
    if (this.shaderManager) {
      this.shaderManager.destroy();
    }
    this.map.remove();
  }
}
