/**
 * useShaderEffect - Composable for applying shader effects
 */

import { ref, watch, onUnmounted } from 'vue';
import { globalRegistry } from 'maplibre-animated-shaders';
import type { ShaderConfig } from 'maplibre-animated-shaders';
import type { UseShaderEffectOptions, UseShaderEffectReturn } from '../types';

let effectCounter = 0;

/**
 * Composable for applying animated shader effects to a MapLibre map
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { useShaderEffect } from '@maplibre-animated-shaders/vue';
 *
 * const map = ref(null);
 * const shaderName = ref('plasma');
 * const config = ref({ speed: 1.5 });
 *
 * const { isApplied, updateConfig } = useShaderEffect({
 *   map,
 *   shaderName,
 *   config,
 * });
 * </script>
 * ```
 */
export function useShaderEffect(options: UseShaderEffectOptions): UseShaderEffectReturn {
  const {
    map,
    shaderName,
    config = ref({}),
    layerId: providedLayerId,
    sourceId: providedSourceId,
    data,
    enabled = ref(true),
  } = options;

  // Generate stable IDs
  const counter = ++effectCounter;
  const layerId = providedLayerId ?? `shader-effect-${counter}`;
  const sourceId = providedSourceId ?? `shader-source-${counter}`;

  const currentLayerId = ref<string | null>(null);
  const isApplied = ref(false);
  const error = ref<Error | null>(null);

  // Apply shader effect
  const applyEffect = () => {
    const mapInstance = map.value;
    const shader = shaderName.value;

    if (!mapInstance || !shader || !enabled.value) {
      return;
    }

    const shaderDef = globalRegistry.get(shader);
    if (!shaderDef) {
      error.value = new Error(`Shader "${shader}" not found in registry`);
      return;
    }

    try {
      // Clean up previous layer
      if (currentLayerId.value && mapInstance.getLayer(currentLayerId.value)) {
        mapInstance.removeLayer(currentLayerId.value);
      }

      // Add source if not exists
      if (!mapInstance.getSource(sourceId)) {
        const sourceData = data?.value ?? {
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

        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: sourceData as GeoJSON.FeatureCollection,
        });
      }

      // Merge config
      const mergedConfig = { ...shaderDef.defaultConfig, ...config.value };
      const layerType = shaderDef.geometry === 'point' ? 'circle' : 'fill';

      // Add layer
      mapInstance.addLayer({
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
      } as maplibregl.AddLayerObject);

      currentLayerId.value = layerId;
      isApplied.value = true;
      error.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    }
  };

  // Remove effect
  const remove = () => {
    const mapInstance = map.value;
    if (!mapInstance || !currentLayerId.value) return;

    try {
      if (mapInstance.getLayer(currentLayerId.value)) {
        mapInstance.removeLayer(currentLayerId.value);
      }
      if (mapInstance.getSource(sourceId)) {
        mapInstance.removeSource(sourceId);
      }
    } catch {
      // Ignore
    }

    currentLayerId.value = null;
    isApplied.value = false;
  };

  // Update config
  const updateConfig = (newConfig: Partial<ShaderConfig>) => {
    const mapInstance = map.value;
    if (!mapInstance || !currentLayerId.value) return;

    const shader = shaderName.value;
    if (!shader) return;

    const shaderDef = globalRegistry.get(shader);
    if (!shaderDef) return;

    const layerType = shaderDef.geometry === 'point' ? 'circle' : 'fill';

    try {
      if (layerType === 'fill') {
        if (newConfig.color !== undefined) {
          mapInstance.setPaintProperty(currentLayerId.value, 'fill-color', newConfig.color);
        }
        if (newConfig.opacity !== undefined) {
          mapInstance.setPaintProperty(currentLayerId.value, 'fill-opacity', newConfig.opacity);
        }
      } else {
        if (newConfig.color !== undefined) {
          mapInstance.setPaintProperty(currentLayerId.value, 'circle-color', newConfig.color);
        }
        if (newConfig.opacity !== undefined) {
          mapInstance.setPaintProperty(currentLayerId.value, 'circle-opacity', newConfig.opacity);
        }
        if (newConfig.radius !== undefined) {
          mapInstance.setPaintProperty(currentLayerId.value, 'circle-radius', newConfig.radius);
        }
      }
    } catch {
      // Ignore
    }
  };

  // Watch for changes
  watch([map, shaderName, enabled], () => {
    if (map.value && shaderName.value && enabled.value) {
      applyEffect();
    } else {
      remove();
    }
  });

  watch(
    config,
    () => {
      if (isApplied.value) {
        updateConfig(config.value);
      }
    },
    { deep: true }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    remove();
  });

  return {
    layerId: currentLayerId,
    isApplied,
    error,
    updateConfig,
    remove,
  };
}
