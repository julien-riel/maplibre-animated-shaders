/**
 * Map adapter abstraction layer for maplibre-animated-shaders
 * Provides an interface to decouple the shader system from MapLibre GL specifics.
 * This enables potential support for other map libraries in the future.
 */

import type { CustomLayerInterface } from 'maplibre-gl';

// ============================================
// Adapter Interface
// ============================================

/**
 * Callback type for map events
 */
export type MapEventHandler = (...args: unknown[]) => void;

/**
 * Abstract interface for map operations.
 * Implementations of this interface wrap specific map libraries.
 */
export interface IMapAdapter {
  /**
   * Get a layer by its ID
   * @param id - The layer ID
   * @returns The layer object or undefined if not found
   */
  getLayer(id: string): unknown | undefined;

  /**
   * Add a custom WebGL layer to the map
   * @param layer - The custom layer to add
   * @param beforeId - Optional ID of the layer to insert before
   */
  addLayer(layer: CustomLayerInterface, beforeId?: string): void;

  /**
   * Remove a layer from the map
   * @param id - The layer ID to remove
   */
  removeLayer(id: string): void;

  /**
   * Set a paint property on a layer
   * @param layerId - The layer ID
   * @param property - The paint property name
   * @param value - The value to set
   */
  setPaintProperty(layerId: string, property: string, value: unknown): void;

  /**
   * Set a layout property on a layer
   * @param layerId - The layer ID
   * @param property - The layout property name
   * @param value - The value to set
   */
  setLayoutProperty(layerId: string, property: string, value: unknown): void;

  /**
   * Get the source ID for a layer
   * @param layerId - The layer ID
   * @returns The source ID or undefined
   */
  getLayerSource(layerId: string): string | undefined;

  /**
   * Request a repaint of the map
   */
  triggerRepaint(): void;

  /**
   * Get the map's canvas element
   * @returns The canvas element
   */
  getCanvas(): HTMLCanvasElement;

  /**
   * Get the WebGL rendering context
   * @returns The WebGL context or null
   */
  getWebGLContext(): WebGLRenderingContext | null;

  /**
   * Subscribe to a map event
   * @param event - The event name
   * @param handler - The event handler
   */
  on(event: string, handler: MapEventHandler): void;

  /**
   * Subscribe to a layer-specific event
   * @param event - The event name
   * @param layerId - The layer ID to filter events for
   * @param handler - The event handler
   */
  onLayer(event: string, layerId: string, handler: MapEventHandler): void;

  /**
   * Unsubscribe from a map event
   * @param event - The event name
   * @param handler - The event handler to remove
   */
  off(event: string, handler: MapEventHandler): void;

  /**
   * Unsubscribe from a layer-specific event
   * @param event - The event name
   * @param layerId - The layer ID
   * @param handler - The event handler to remove
   */
  offLayer(event: string, layerId: string, handler: MapEventHandler): void;

  /**
   * Subscribe to an event for a single emission
   * @param event - The event name
   * @param handler - The event handler
   */
  once(event: string, handler: MapEventHandler): void;

  /**
   * Check if a source is loaded
   * @param sourceId - The source ID
   * @returns True if the source is loaded
   */
  isSourceLoaded(sourceId: string): boolean;

  /**
   * Query features from a source
   * @param sourceId - The source ID
   * @param options - Query options
   * @returns Array of features
   */
  querySourceFeatures(sourceId: string, options?: { sourceLayer?: string }): GeoJSON.Feature[];

  /**
   * Get the current zoom level
   * @returns The zoom level
   */
  getZoom(): number;
}

// ============================================
// MapLibre Adapter Implementation
// ============================================

/**
 * MapLibre GL JS implementation of the map adapter.
 * Wraps MapLibre-specific calls behind the IMapAdapter interface.
 */
export class MapLibreAdapter implements IMapAdapter {
  constructor(private readonly map: maplibregl.Map) {}

  getLayer(id: string): unknown | undefined {
    return this.map.getLayer(id);
  }

  addLayer(layer: CustomLayerInterface, beforeId?: string): void {
    if (beforeId) {
      this.map.addLayer(layer, beforeId);
    } else {
      this.map.addLayer(layer);
    }
  }

  removeLayer(id: string): void {
    if (this.map.getLayer(id)) {
      this.map.removeLayer(id);
    }
  }

  setPaintProperty(layerId: string, property: string, value: unknown): void {
    try {
      this.map.setPaintProperty(layerId, property, value);
    } catch {
      // Property may not exist on this layer type - silently ignore
    }
  }

  setLayoutProperty(layerId: string, property: string, value: unknown): void {
    try {
      this.map.setLayoutProperty(layerId, property, value);
    } catch {
      // Property may not exist on this layer type - silently ignore
    }
  }

  getLayerSource(layerId: string): string | undefined {
    const layer = this.map.getLayer(layerId);
    if (layer && 'source' in layer) {
      return (layer as { source?: string }).source;
    }
    return undefined;
  }

  triggerRepaint(): void {
    this.map.triggerRepaint();
  }

  getCanvas(): HTMLCanvasElement {
    return this.map.getCanvas();
  }

  getWebGLContext(): WebGLRenderingContext | null {
    const canvas = this.map.getCanvas();
    return (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
  }

  on(event: string, handler: MapEventHandler): void {
    this.map.on(event as keyof maplibregl.MapEventType, handler as () => void);
  }

  onLayer(event: string, layerId: string, handler: MapEventHandler): void {
    this.map.on(event as keyof maplibregl.MapLayerEventType, layerId, handler as () => void);
  }

  off(event: string, handler: MapEventHandler): void {
    this.map.off(event as keyof maplibregl.MapEventType, handler as () => void);
  }

  offLayer(event: string, layerId: string, handler: MapEventHandler): void {
    this.map.off(event as keyof maplibregl.MapLayerEventType, layerId, handler as () => void);
  }

  once(event: string, handler: MapEventHandler): void {
    this.map.once(event as keyof maplibregl.MapEventType, handler as () => void);
  }

  isSourceLoaded(sourceId: string): boolean {
    return this.map.isSourceLoaded(sourceId);
  }

  querySourceFeatures(sourceId: string, options?: { sourceLayer?: string }): GeoJSON.Feature[] {
    return this.map.querySourceFeatures(sourceId, options);
  }

  getZoom(): number {
    return this.map.getZoom();
  }

  /**
   * Get the underlying MapLibre map instance.
   * Use this only when absolutely necessary - prefer using adapter methods.
   */
  getMap(): maplibregl.Map {
    return this.map;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a map adapter from a MapLibre map instance.
 * @param map - The MapLibre map instance
 * @returns A map adapter wrapping the map
 */
export function createMapAdapter(map: maplibregl.Map): IMapAdapter {
  return new MapLibreAdapter(map);
}
