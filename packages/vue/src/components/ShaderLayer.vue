<!--
  ShaderLayer - Declarative shader layer component for Vue 3
-->
<script setup lang="ts">
import { watch, onMounted, onUnmounted, ref, computed } from 'vue';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { globalRegistry } from 'maplibre-animated-shaders';
import type { ShaderConfig } from 'maplibre-animated-shaders';

interface Props {
  /** The MapLibre map instance (injected by AnimatedMap or provided directly) */
  map: MapLibreMap;
  /** Shader name from registry */
  shaderName: string;
  /** Unique layer ID */
  id?: string;
  /** Shader configuration */
  config?: ShaderConfig;
  /** GeoJSON data source */
  data?: GeoJSON.FeatureCollection | GeoJSON.Feature;
  /** Whether the layer is visible */
  visible?: boolean;
  /** Layer order (before this layer ID) */
  beforeId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({}),
  visible: true,
});

const emit = defineEmits<{
  (e: 'add', layerId: string): void;
  (e: 'remove', layerId: string): void;
  (e: 'error', error: Error): void;
}>();

let layerCounter = 0;
const layerId = props.id ?? `shader-layer-${++layerCounter}`;
const sourceId = `shader-source-${layerCounter}`;
const isAdded = ref(false);

// Get shader definition
const shader = computed(() => globalRegistry.get(props.shaderName));

// Add layer to map
const addLayer = () => {
  if (!props.map || !shader.value) {
    if (!shader.value) {
      emit('error', new Error(`Shader "${props.shaderName}" not found`));
    }
    return;
  }

  try {
    // Remove existing layer if present
    if (props.map.getLayer(layerId)) {
      props.map.removeLayer(layerId);
    }

    // Add source if not exists
    if (!props.map.getSource(sourceId)) {
      const sourceData = props.data ?? {
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

      props.map.addSource(sourceId, {
        type: 'geojson',
        data: sourceData as GeoJSON.FeatureCollection,
      });
    }

    // Merge config
    const mergedConfig = { ...shader.value.defaultConfig, ...props.config };
    const layerType = shader.value.geometry === 'point' ? 'circle' : 'fill';

    // Add layer
    props.map.addLayer(
      {
        id: layerId,
        type: layerType,
        source: sourceId,
        layout: {
          visibility: props.visible ? 'visible' : 'none',
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
      } as maplibregl.AddLayerObject,
      props.beforeId
    );

    isAdded.value = true;
    emit('add', layerId);
  } catch (err) {
    emit('error', err instanceof Error ? err : new Error(String(err)));
  }
};

// Remove layer from map
const removeLayer = () => {
  if (!props.map) return;

  try {
    if (props.map.getLayer(layerId)) {
      props.map.removeLayer(layerId);
      emit('remove', layerId);
    }
    if (props.map.getSource(sourceId)) {
      props.map.removeSource(sourceId);
    }
  } catch {
    // Ignore cleanup errors
  }

  isAdded.value = false;
};

// Update visibility
const updateVisibility = () => {
  if (!props.map || !props.map.getLayer(layerId)) return;

  try {
    props.map.setLayoutProperty(layerId, 'visibility', props.visible ? 'visible' : 'none');
  } catch {
    // Ignore
  }
};

// Update config
const updateConfig = () => {
  if (!props.map || !props.map.getLayer(layerId) || !shader.value) return;

  const mergedConfig = { ...shader.value.defaultConfig, ...props.config };
  const layerType = shader.value.geometry === 'point' ? 'circle' : 'fill';

  try {
    if (layerType === 'fill') {
      if (mergedConfig.color !== undefined) {
        props.map.setPaintProperty(layerId, 'fill-color', mergedConfig.color);
      }
      if (mergedConfig.opacity !== undefined) {
        props.map.setPaintProperty(layerId, 'fill-opacity', mergedConfig.opacity);
      }
    } else {
      if (mergedConfig.color !== undefined) {
        props.map.setPaintProperty(layerId, 'circle-color', mergedConfig.color);
      }
      if (mergedConfig.opacity !== undefined) {
        props.map.setPaintProperty(layerId, 'circle-opacity', mergedConfig.opacity);
      }
      if (mergedConfig.radius !== undefined) {
        props.map.setPaintProperty(layerId, 'circle-radius', mergedConfig.radius);
      }
    }
  } catch {
    // Ignore
  }
};

// Watchers
watch(
  () => props.map,
  (newMap) => {
    if (newMap) {
      addLayer();
    }
  }
);

watch(
  () => props.shaderName,
  () => {
    if (props.map) {
      removeLayer();
      addLayer();
    }
  }
);

watch(() => props.visible, updateVisibility);

watch(() => props.config, updateConfig, { deep: true });

watch(
  () => props.data,
  () => {
    if (!props.map || !props.data) return;

    const source = props.map.getSource(sourceId);
    if (source && 'setData' in source) {
      try {
        (source as maplibregl.GeoJSONSource).setData(props.data as GeoJSON.FeatureCollection);
      } catch {
        // Ignore
      }
    }
  }
);

// Lifecycle
onMounted(() => {
  if (props.map) {
    addLayer();
  }
});

onUnmounted(() => {
  removeLayer();
});

// Expose for parent components
defineExpose({
  layerId,
  isAdded,
});
</script>

<template>
  <!-- This component doesn't render anything visible -->
  <slot></slot>
</template>
