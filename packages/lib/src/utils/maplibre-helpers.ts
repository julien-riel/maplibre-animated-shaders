import type { MapLibreMapInstance } from '../types';

/**
 * Get the center of a layer's features in screen coordinates
 */
export function getLayerCenter(map: MapLibreMapInstance, layerId: string): [number, number] | null {
  const features = map.queryRenderedFeatures(undefined, { layers: [layerId] });

  if (features.length === 0) return null;

  // Calculate centroid of all features
  let totalX = 0;
  let totalY = 0;
  let count = 0;

  for (const feature of features) {
    if (feature.geometry.type === 'Point') {
      const coords = feature.geometry.coordinates as [number, number];
      const point = map.project(coords);
      totalX += point.x;
      totalY += point.y;
      count++;
    }
  }

  if (count === 0) return null;

  return [totalX / count, totalY / count];
}

/**
 * Check if a layer exists on the map
 */
export function layerExists(map: MapLibreMapInstance, layerId: string): boolean {
  return map.getLayer(layerId) !== undefined;
}

/**
 * Get the geometry type of a layer
 */
export function getLayerGeometryType(
  map: MapLibreMapInstance,
  layerId: string
): 'point' | 'line' | 'polygon' | 'unknown' {
  const layer = map.getLayer(layerId);
  if (!layer) return 'unknown';

  const type = layer.type;

  switch (type) {
    case 'circle':
    case 'symbol':
      return 'point';
    case 'line':
      return 'line';
    case 'fill':
    case 'fill-extrusion':
      return 'polygon';
    default:
      return 'unknown';
  }
}

/**
 * Wait for map to be loaded
 */
export function waitForMapLoad(map: MapLibreMapInstance): Promise<void> {
  return new Promise((resolve) => {
    if (map.loaded()) {
      resolve();
    } else {
      map.on('load', () => resolve());
    }
  });
}

/**
 * Wait for a specific layer to be added
 */
export function waitForLayer(map: MapLibreMapInstance, layerId: string): Promise<void> {
  return new Promise((resolve) => {
    if (map.getLayer(layerId)) {
      resolve();
    } else {
      const checkLayer = () => {
        if (map.getLayer(layerId)) {
          map.off('styledata', checkLayer);
          resolve();
        }
      };
      map.on('styledata', checkLayer);
    }
  });
}

/**
 * Get current zoom level
 */
export function getZoom(map: MapLibreMapInstance): number {
  return map.getZoom();
}

/**
 * Get map canvas size
 */
export function getCanvasSize(map: MapLibreMapInstance): [number, number] {
  const canvas = map.getCanvas();
  return [canvas.width, canvas.height];
}
