/**
 * useShaderEffect - Hook for applying shader effects to MapLibre maps
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { globalRegistry } from 'maplibre-animated-shaders';
import type { ShaderConfig } from 'maplibre-animated-shaders';
import type { UseShaderEffectOptions, UseShaderEffectReturn } from '../types';

let effectCounter = 0;

/**
 * Hook for applying animated shader effects to a MapLibre map
 *
 * @example
 * ```tsx
 * function MyMap() {
 *   const mapRef = useRef<MapLibreMap | null>(null);
 *   const [map, setMap] = useState<MapLibreMap | null>(null);
 *
 *   const { isApplied, updateConfig } = useShaderEffect({
 *     map,
 *     shaderName: 'plasma',
 *     config: { speed: 1.5, intensity: 1.0 },
 *   });
 *
 *   return <div ref={mapContainerRef} />;
 * }
 * ```
 */
export function useShaderEffect(options: UseShaderEffectOptions): UseShaderEffectReturn {
  const {
    map,
    shaderName,
    config = {},
    layerId: providedLayerId,
    sourceId: providedSourceId,
    data,
    enabled = true,
    onApply,
    onError,
  } = options;

  // Generate stable IDs
  const idRef = useRef<number | null>(null);
  if (idRef.current === null) {
    idRef.current = ++effectCounter;
  }

  const layerId = providedLayerId ?? `shader-effect-${idRef.current}`;
  const sourceId = providedSourceId ?? `shader-source-${idRef.current}`;

  const [isApplied, setIsApplied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const configRef = useRef<ShaderConfig>(config);
  const currentLayerIdRef = useRef<string | null>(null);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [JSON.stringify(config)]);

  // Apply shader effect
  useEffect(() => {
    if (!map || !shaderName || !enabled) {
      return;
    }

    const shader = globalRegistry.get(shaderName);
    if (!shader) {
      const err = new Error(`Shader "${shaderName}" not found in registry`);
      setError(err);
      onError?.(err);
      return;
    }

    try {
      // Clean up previous layer if exists
      if (currentLayerIdRef.current && map.getLayer(currentLayerIdRef.current)) {
        map.removeLayer(currentLayerIdRef.current);
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
      }

      // Merge config with defaults
      const mergedConfig = { ...shader.defaultConfig, ...configRef.current };

      // Determine layer type based on shader geometry
      const layerType = shader.geometry === 'point' ? 'circle' : 'fill';

      // Add shader layer
      const layerConfig: maplibregl.LayerSpecification = {
        id: layerId,
        type: layerType,
        source: sourceId,
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

      map.addLayer(layerConfig as maplibregl.AddLayerObject);

      currentLayerIdRef.current = layerId;
      setIsApplied(true);
      setError(null);
      onApply?.(layerId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (map && currentLayerIdRef.current) {
        try {
          if (map.getLayer(currentLayerIdRef.current)) {
            map.removeLayer(currentLayerIdRef.current);
          }
          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }
        } catch {
          // Map might be destroyed
        }
        currentLayerIdRef.current = null;
        setIsApplied(false);
      }
    };
  }, [map, shaderName, enabled, layerId, sourceId, data, onApply, onError]);

  // Update config method
  const updateConfig = useCallback(
    (newConfig: Partial<ShaderConfig>) => {
      if (!map || !currentLayerIdRef.current) return;

      configRef.current = { ...configRef.current, ...newConfig };

      // Update layer paint properties
      try {
        const layer = map.getLayer(currentLayerIdRef.current);
        if (layer) {
          if ('fill-color' in (layer.paint ?? {})) {
            if (newConfig.color !== undefined) {
              map.setPaintProperty(currentLayerIdRef.current, 'fill-color', newConfig.color);
            }
            if (newConfig.opacity !== undefined) {
              map.setPaintProperty(currentLayerIdRef.current, 'fill-opacity', newConfig.opacity);
            }
          } else {
            if (newConfig.color !== undefined) {
              map.setPaintProperty(currentLayerIdRef.current, 'circle-color', newConfig.color);
            }
            if (newConfig.opacity !== undefined) {
              map.setPaintProperty(currentLayerIdRef.current, 'circle-opacity', newConfig.opacity);
            }
            if (newConfig.radius !== undefined) {
              map.setPaintProperty(currentLayerIdRef.current, 'circle-radius', newConfig.radius);
            }
          }
        }
      } catch {
        // Ignore paint update errors
      }
    },
    [map]
  );

  // Remove method
  const remove = useCallback(() => {
    if (!map || !currentLayerIdRef.current) return;

    try {
      if (map.getLayer(currentLayerIdRef.current)) {
        map.removeLayer(currentLayerIdRef.current);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    } catch {
      // Ignore removal errors
    }

    currentLayerIdRef.current = null;
    setIsApplied(false);
  }, [map, sourceId]);

  return useMemo(
    () => ({
      layerId: currentLayerIdRef.current,
      isApplied,
      error,
      updateConfig,
      remove,
    }),
    [isApplied, error, updateConfig, remove]
  );
}
