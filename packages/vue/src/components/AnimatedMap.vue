<!--
  AnimatedMap - Complete map component with shader support for Vue 3
-->
<script setup lang="ts">
import {
  ref,
  onMounted,
  onUnmounted,
  watch,
  provide,
  useSlots,
  h,
  render,
  type VNode,
} from 'vue';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import { globalRegistry, examplePlugin, PluginManager } from 'maplibre-animated-shaders';

import 'maplibre-gl/dist/maplibre-gl.css';

interface Props {
  /** Initial map center [lng, lat] */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  /** Map style URL or style object */
  style?: string;
  /** Additional map options */
  mapOptions?: Record<string, unknown>;
}

const props = withDefaults(defineProps<Props>(), {
  center: () => [-74.5, 40],
  zoom: 9,
  style: 'https://demotiles.maplibre.org/style.json',
  mapOptions: () => ({}),
});

const emit = defineEmits<{
  (e: 'map-ready', map: MapLibreMap): void;
  (e: 'map-error', error: Error): void;
}>();

// Refs
const mapContainer = ref<HTMLDivElement | null>(null);
const map = ref<MapLibreMap | null>(null);
const isLoaded = ref(false);

// Provide map to child components
provide('map', map);
provide('isMapLoaded', isLoaded);

// Initialize built-in shaders
let pluginInitialized = false;
if (!pluginInitialized) {
  const pluginManager = new PluginManager(globalRegistry);
  pluginManager.use(examplePlugin);
  pluginInitialized = true;
}

// Initialize map
onMounted(() => {
  if (!mapContainer.value) return;

  try {
    const mapInstance = new maplibregl.Map({
      container: mapContainer.value,
      style: props.style,
      center: props.center,
      zoom: props.zoom,
      ...props.mapOptions,
    });

    mapInstance.on('load', () => {
      map.value = mapInstance;
      isLoaded.value = true;
      emit('map-ready', mapInstance);
    });

    mapInstance.on('error', (e) => {
      emit('map-error', new Error(e.error?.message ?? 'Map error'));
    });
  } catch (err) {
    emit('map-error', err instanceof Error ? err : new Error(String(err)));
  }
});

// Cleanup
onUnmounted(() => {
  if (map.value) {
    map.value.remove();
    map.value = null;
  }
  isLoaded.value = false;
});

// Watch for center changes
watch(() => props.center, (newCenter) => {
  if (map.value && isLoaded.value) {
    map.value.setCenter(newCenter);
  }
});

// Watch for zoom changes
watch(() => props.zoom, (newZoom) => {
  if (map.value && isLoaded.value) {
    map.value.setZoom(newZoom);
  }
});

// Watch for style changes
watch(() => props.style, (newStyle) => {
  if (map.value && isLoaded.value) {
    map.value.setStyle(newStyle);
  }
});

// Expose for parent components
defineExpose({
  map,
  isLoaded,
});
</script>

<template>
  <div ref="mapContainer" class="animated-map">
    <template v-if="isLoaded && map">
      <slot :map="map" :is-loaded="isLoaded"></slot>
    </template>
  </div>
</template>

<style scoped>
.animated-map {
  width: 100%;
  height: 100%;
}
</style>
