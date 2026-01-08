/**
 * MapView - MapLibre GL JS wrapper with demo data
 * Handles map initialization, data loading, and shader application
 * Supports multiple stacked effects with advanced configuration
 */

import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { createShaderManager, globalRegistry } from 'maplibre-animated-shaders';
import type { ShaderManager } from 'maplibre-animated-shaders';
import type { InteractivityConfig } from 'maplibre-animated-shaders/types';
import type { EffectId, StackedEffect, GeometryType } from '../types/effectStack';
import { buildShaderAdvancedConfig } from '../types/effectStack';

import demoPoints from '../data/demo-points.geojson';
import demoLines from '../data/demo-lines.geojson';
import demoPolygons from '../data/demo-polygons.geojson';

type ReadyCallback = () => void;

/**
 * Layer type configuration for each geometry
 */
interface LayerConfig {
  type: 'circle' | 'line' | 'fill';
  source: string;
  paint: Record<string, unknown>;
}

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
  /** Track dynamically created effect layers */
  private effectLayers: Map<EffectId, string> = new Map();

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
        case 'global':
          // Global shaders use a virtual layer ID
          return 'global-effect';
        default:
          return 'demo-points';
      }
    }

    return 'demo-points';
  }

  // ===== STACKED EFFECTS METHODS =====

  /**
   * Add a stacked effect to the map
   */
  addEffect(effect: StackedEffect): void {
    if (!this.isReady) {
      // Queue for when map is ready
      this.onReady(() => this.addEffect(effect));
      return;
    }

    // Ensure shader manager exists
    if (!this.shaderManager) {
      this.shaderManager = createShaderManager(this.map, { debug: false });
    }

    // Create a new layer for this effect
    const layerId = effect.layerId;

    // Get layer configuration based on geometry
    const layerConfig = this.getLayerConfigForGeometry(effect.geometry);

    if (layerConfig) {
      // Add the layer to the map
      this.map.addLayer({
        id: layerId,
        type: layerConfig.type,
        source: layerConfig.source,
        paint: layerConfig.paint,
      });
    }

    // Build full config including advanced options
    const fullConfig = this.buildFullConfig(effect);

    // Extract interactivity config (passed as separate 4th parameter)
    const interactivityConfig = this.getInteractivityConfig(effect);

    // Register shader on this layer
    try {
      this.shaderManager.register(layerId, effect.shaderName, fullConfig, interactivityConfig);
      this.effectLayers.set(effect.id, layerId);

      // Apply visibility
      if (!effect.visible) {
        this.setEffectVisibility(effect.id, false);
      }

      // Apply play state
      if (!effect.isPlaying) {
        this.shaderManager.pause(layerId);
      }
    } catch (error) {
      console.error(`Failed to add effect ${effect.id}:`, error);
      // Clean up layer if shader registration failed
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    }
  }

  /**
   * Build full configuration including advanced options (without interactivity)
   */
  private buildFullConfig(effect: StackedEffect): Record<string, unknown> {
    const config = { ...effect.config };

    // Merge in advanced timing config if present (not interactivity - that's separate)
    if (effect.advancedConfig) {
      const advancedShaderConfig = buildShaderAdvancedConfig(effect.advancedConfig);
      Object.assign(config, advancedShaderConfig);
    }

    return config;
  }

  /**
   * Extract interactivity config from effect
   */
  private getInteractivityConfig(effect: StackedEffect): InteractivityConfig | undefined {
    if (effect.advancedConfig?.interactivity?.perFeatureControl) {
      return effect.advancedConfig.interactivity;
    }
    return undefined;
  }

  /**
   * Remove an effect from the map
   */
  removeEffect(effectId: EffectId): void {
    const layerId = this.effectLayers.get(effectId);
    if (!layerId) {
      console.warn(`Effect ${effectId} not found`);
      return;
    }

    // Unregister shader
    if (this.shaderManager) {
      this.shaderManager.unregister(layerId);
    }

    // Remove the shader custom layer
    const shaderLayerId = `${layerId}-shader`;
    if (this.map.getLayer(shaderLayerId)) {
      this.map.removeLayer(shaderLayerId);
    }

    // Remove the base layer
    if (this.map.getLayer(layerId)) {
      this.map.removeLayer(layerId);
    }

    // Clean up tracking
    this.effectLayers.delete(effectId);
  }

  /**
   * Update configuration for an effect
   */
  updateEffectConfig(effectId: EffectId, config: Record<string, unknown>): void {
    const layerId = this.effectLayers.get(effectId);
    if (!layerId || !this.shaderManager) {
      return;
    }

    try {
      this.shaderManager.updateConfig(layerId, config);
    } catch (error) {
      console.error(`Failed to update effect ${effectId}:`, error);
    }
  }

  /**
   * Update advanced configuration for an effect
   * Interactivity changes require re-registering the shader
   */
  updateEffectAdvancedConfig(effect: StackedEffect): void {
    const layerId = this.effectLayers.get(effect.id);
    if (!layerId || !this.shaderManager) {
      return;
    }

    // Build full config with new advanced settings
    const fullConfig = this.buildFullConfig(effect);
    const interactivityConfig = this.getInteractivityConfig(effect);

    try {
      // Re-register the shader to apply interactivity changes
      // This is necessary because interactivity is set up in onAdd()
      this.shaderManager.unregister(layerId);

      // Remove the shader custom layer (added by previous registration)
      const shaderLayerId = `${layerId}-shader`;
      if (this.map.getLayer(shaderLayerId)) {
        this.map.removeLayer(shaderLayerId);
      }

      // Re-register with new config
      this.shaderManager.register(layerId, effect.shaderName, fullConfig, interactivityConfig);

      // Restore play state
      if (!effect.isPlaying) {
        this.shaderManager.pause(layerId);
      }
    } catch (error) {
      console.error(`Failed to update advanced config for ${effect.id}:`, error);
    }
  }

  /**
   * Update an effect with a custom shader (from visual editor)
   */
  updateEffectWithCustomShader(
    effect: StackedEffect,
    customShader: {
      vertexShader?: string;
      fragmentShader?: string;
      defaultConfig?: Record<string, unknown>;
    }
  ): void {
    const layerId = this.effectLayers.get(effect.id);
    if (!layerId || !this.shaderManager) {
      return;
    }

    // Get the original shader definition
    const originalShader = globalRegistry.get(effect.shaderName);
    if (!originalShader) {
      console.error(`Original shader ${effect.shaderName} not found`);
      return;
    }

    // Create a custom shader name
    const customShaderName = `${effect.shaderName}-custom-${effect.id}`;

    // Register the custom shader variant
    const customShaderDef = {
      name: customShaderName,
      displayName: `${originalShader.displayName} (Custom)`,
      geometry: originalShader.geometry,
      vertexShader: customShader.vertexShader || originalShader.vertexShader,
      fragmentShader: customShader.fragmentShader || originalShader.fragmentShader,
      defaultConfig: customShader.defaultConfig || originalShader.defaultConfig,
    };

    // Register in the global registry
    globalRegistry.register(customShaderDef);

    try {
      // Unregister the old shader
      this.shaderManager.unregister(layerId);

      // Remove the shader custom layer
      const shaderLayerId = `${layerId}-shader`;
      if (this.map.getLayer(shaderLayerId)) {
        this.map.removeLayer(shaderLayerId);
      }

      // Build full config
      const fullConfig = this.buildFullConfig(effect);
      const interactivityConfig = this.getInteractivityConfig(effect);

      // Re-register with custom shader
      this.shaderManager.register(layerId, customShaderName, fullConfig, interactivityConfig);

      // Restore play state
      if (!effect.isPlaying) {
        this.shaderManager.pause(layerId);
      }
    } catch (error) {
      console.error(`Failed to apply custom shader:`, error);
    }
  }

  /**
   * Set visibility for an effect
   */
  setEffectVisibility(effectId: EffectId, visible: boolean): void {
    const layerId = this.effectLayers.get(effectId);
    if (!layerId) {
      return;
    }

    // Hide both the base layer and shader layer
    const shaderLayerId = `${layerId}-shader`;

    if (this.map.getLayer(layerId)) {
      this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }

    if (this.map.getLayer(shaderLayerId)) {
      this.map.setLayoutProperty(shaderLayerId, 'visibility', visible ? 'visible' : 'none');
    }
  }

  /**
   * Play/pause an effect
   */
  setEffectPlaying(effectId: EffectId, playing: boolean): void {
    const layerId = this.effectLayers.get(effectId);
    if (!layerId || !this.shaderManager) {
      return;
    }

    if (playing) {
      this.shaderManager.play(layerId);
    } else {
      this.shaderManager.pause(layerId);
    }
  }

  /**
   * Reorder effects (change layer order)
   */
  reorderEffects(newOrder: StackedEffect[]): void {
    // MapLibre renders layers bottom-to-top
    // newOrder[0] should be at the bottom
    for (let i = 1; i < newOrder.length; i++) {
      const effect = newOrder[i];
      const prevEffect = newOrder[i - 1];
      const layerId = this.effectLayers.get(effect.id);
      const prevLayerId = this.effectLayers.get(prevEffect.id);

      if (layerId && prevLayerId) {
        // Move shader layer if exists
        const shaderLayerId = `${layerId}-shader`;
        const prevShaderLayerId = `${prevLayerId}-shader`;

        if (this.map.getLayer(shaderLayerId) && this.map.getLayer(prevShaderLayerId)) {
          // Move current layer above previous layer
          this.map.moveLayer(shaderLayerId);
        }
      }
    }
  }

  /**
   * Get layer configuration for a geometry type
   */
  private getLayerConfigForGeometry(geometry: GeometryType): LayerConfig | null {
    switch (geometry) {
      case 'point':
        return {
          type: 'circle',
          source: 'demo-points-source',
          paint: {
            'circle-radius': 8,
            'circle-color': '#3b82f6',
            'circle-opacity': 1,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        };
      case 'line':
        return {
          type: 'line',
          source: 'demo-lines-source',
          paint: {
            'line-color': '#22c55e',
            'line-width': 2,
            'line-opacity': 0.6,
          },
        };
      case 'polygon':
        return {
          type: 'fill',
          source: 'demo-polygons-source',
          paint: {
            'fill-color': '#8b5cf6',
            'fill-opacity': 0.2,
            'fill-outline-color': '#8b5cf6',
          },
        };
      case 'global':
        // Global effects don't need a base layer
        return null;
      default:
        return null;
    }
  }

  /**
   * Clear all effects
   */
  clearAllEffects(): void {
    for (const effectId of this.effectLayers.keys()) {
      this.removeEffect(effectId);
    }
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
    this.readyCallbacks.forEach((cb) => cb());
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
        .setHTML(
          `
          <div style="padding: 4px;">
            <strong>${name}</strong>
            ${category ? `<br><small style="color: #666;">${category}</small>` : ''}
          </div>
        `
        )
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
