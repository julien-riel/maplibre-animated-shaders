/**
 * ShaderLayer - Declarative shader layer component
 */

import { useEffect, useRef } from 'react';
import { globalRegistry } from 'maplibre-animated-shaders';
import type { ShaderLayerProps } from '../types';

let layerCounter = 0;

/**
 * Declarative component for adding shader layers to a MapLibre map
 *
 * @example
 * ```tsx
 * <AnimatedMap>
 *   <ShaderLayer
 *     shaderName="plasma"
 *     config={{ speed: 1.5, color: '#ff6600' }}
 *     visible={true}
 *   />
 *   <ShaderLayer
 *     shaderName="water-ripples"
 *     config={{ frequency: 2.0 }}
 *     data={waterFeatures}
 *   />
 * </AnimatedMap>
 * ```
 */
export function ShaderLayer({
  map,
  shaderName,
  id,
  config = {},
  data,
  visible = true,
  playing: _playing = true,
  beforeId,
  onAdd,
  onRemove,
  onError,
}: ShaderLayerProps): null {
  const idRef = useRef<string | null>(null);
  const sourceIdRef = useRef<string | null>(null);

  // Generate stable IDs
  if (idRef.current === null) {
    const counter = ++layerCounter;
    idRef.current = id ?? `shader-layer-${counter}`;
    sourceIdRef.current = `shader-source-${counter}`;
  }

  const layerId = idRef.current;
  const sourceId = sourceIdRef.current!;

  // Add/update layer
  useEffect(() => {
    if (!map) return;

    const shader = globalRegistry.get(shaderName);
    if (!shader) {
      onError?.(new Error(`Shader "${shaderName}" not found`));
      return;
    }

    try {
      // Remove existing layer if present
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }

      // Add source if not exists
      if (!map.getSource(sourceId)) {
        const sourceData = data ?? {
          type: 'FeatureCollection' as const,
          features: [
            {
              type: 'Feature' as const,
              geometry: {
                type: 'Polygon' as const,
                coordinates: [
                  [
                    [-180, -85],
                    [180, -85],
                    [180, 85],
                    [-180, 85],
                    [-180, -85],
                  ],
                ],
              },
              properties: {},
            },
          ],
        };

        map.addSource(sourceId, {
          type: 'geojson',
          data: sourceData as GeoJSON.FeatureCollection,
        });
      } else if (data) {
        // Update source data
        const source = map.getSource(sourceId);
        if (source && 'setData' in source) {
          (source as maplibregl.GeoJSONSource).setData(data as GeoJSON.FeatureCollection);
        }
      }

      // Merge config
      const mergedConfig = { ...shader.defaultConfig, ...config };

      // Determine layer type
      const layerType = shader.geometry === 'point' ? 'circle' : 'fill';

      // Create layer config
      const layerConfig: maplibregl.AddLayerObject = {
        id: layerId,
        type: layerType,
        source: sourceId,
        layout: {
          visibility: visible ? 'visible' : 'none',
        },
        paint:
          layerType === 'fill'
            ? {
                'fill-color': (mergedConfig.color as string) ?? '#3388ff',
                'fill-opacity': (mergedConfig.opacity as number) ?? 0.7,
              }
            : {
                'circle-color': (mergedConfig.color as string) ?? '#3388ff',
                'circle-opacity': (mergedConfig.opacity as number) ?? 0.7,
                'circle-radius': (mergedConfig.radius as number) ?? 5,
              },
      };

      // Add layer
      map.addLayer(layerConfig, beforeId);
      onAdd?.(layerId);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }

    // Cleanup
    return () => {
      try {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
          onRemove?.(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch {
        // Map might be destroyed
      }
    };
  }, [map, shaderName, layerId, sourceId, beforeId, onAdd, onRemove, onError]);

  // Update visibility
  useEffect(() => {
    if (!map || !map.getLayer(layerId)) return;

    try {
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    } catch {
      // Ignore
    }
  }, [map, layerId, visible]);

  // Update config
  useEffect(() => {
    if (!map || !map.getLayer(layerId)) return;

    const shader = globalRegistry.get(shaderName);
    if (!shader) return;

    const mergedConfig = { ...shader.defaultConfig, ...config };
    const layerType = shader.geometry === 'point' ? 'circle' : 'fill';

    try {
      if (layerType === 'fill') {
        if (mergedConfig.color !== undefined) {
          map.setPaintProperty(layerId, 'fill-color', mergedConfig.color);
        }
        if (mergedConfig.opacity !== undefined) {
          map.setPaintProperty(layerId, 'fill-opacity', mergedConfig.opacity);
        }
      } else {
        if (mergedConfig.color !== undefined) {
          map.setPaintProperty(layerId, 'circle-color', mergedConfig.color);
        }
        if (mergedConfig.opacity !== undefined) {
          map.setPaintProperty(layerId, 'circle-opacity', mergedConfig.opacity);
        }
        if (mergedConfig.radius !== undefined) {
          map.setPaintProperty(layerId, 'circle-radius', mergedConfig.radius);
        }
      }
    } catch {
      // Ignore paint update errors
    }
  }, [map, layerId, shaderName, JSON.stringify(config)]);

  // Update data
  useEffect(() => {
    if (!map || !data) return;

    const source = map.getSource(sourceId);
    if (source && 'setData' in source) {
      try {
        (source as maplibregl.GeoJSONSource).setData(data as GeoJSON.FeatureCollection);
      } catch {
        // Ignore
      }
    }
  }, [map, sourceId, data]);

  // This component doesn't render anything
  return null;
}
