<!--
  MapLibre Animated Shaders - Vue 3 Example

  This example demonstrates how to integrate maplibre-animated-shaders
  with Vue 3 using the Composition API.

  Installation:
    npm install maplibre-gl maplibre-animated-shaders vue
-->

<template>
  <div class="animated-map-container">
    <div ref="mapContainer" class="map"></div>

    <div class="controls">
      <h3>Shader Controls</h3>

      <div class="control-group">
        <label for="shader-select">Effect</label>
        <select id="shader-select" v-model="currentShader" @change="onShaderChange">
          <option v-for="shader in availableShaders" :key="shader" :value="shader">
            {{ getShaderDisplayName(shader) }}
          </option>
        </select>
      </div>

      <div class="control-group">
        <label for="speed">Animation Speed</label>
        <input
          id="speed"
          type="range"
          v-model.number="config.speed"
          min="0.1"
          max="3"
          step="0.1"
          @input="updateShader"
        />
        <span class="value">{{ config.speed.toFixed(1) }}x</span>
      </div>

      <div class="control-group">
        <label for="intensity">Intensity</label>
        <input
          id="intensity"
          type="range"
          v-model.number="config.intensity"
          min="0.1"
          max="2"
          step="0.1"
          @input="updateShader"
        />
        <span class="value">{{ config.intensity.toFixed(1) }}</span>
      </div>

      <div class="control-group">
        <label>
          <input type="checkbox" v-model="isPlaying" @change="togglePlayback" />
          Animation Playing
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import {
  ShaderManager,
  globalRegistry,
  examplePlugin,
  PluginManager,
} from 'maplibre-animated-shaders';

import 'maplibre-gl/dist/maplibre-gl.css';

// Register built-in shaders
const pluginManager = new PluginManager(globalRegistry);
pluginManager.use(examplePlugin);

// Props
interface Props {
  center?: [number, number];
  zoom?: number;
  styleUrl?: string;
  initialShader?: string;
}

const props = withDefaults(defineProps<Props>(), {
  center: () => [-74.5, 40],
  zoom: 9,
  styleUrl: 'https://demotiles.maplibre.org/style.json',
  initialShader: 'plasma',
});

// Emits
const emit = defineEmits<{
  (e: 'map-ready', map: MapLibreMap): void;
  (e: 'shader-change', shader: string): void;
}>();

// Refs
const mapContainer = ref<HTMLDivElement | null>(null);
const map = ref<MapLibreMap | null>(null);
const shaderManager = ref<ShaderManager | null>(null);
const currentShader = ref(props.initialShader);
const currentLayerId = ref<string | null>(null);
const isPlaying = ref(true);

// Reactive config
const config = reactive({
  speed: 1.0,
  intensity: 1.0,
  opacity: 0.7,
});

// Computed
const availableShaders = globalRegistry.list();

/**
 * Get display name for a shader
 */
function getShaderDisplayName(shaderName: string): string {
  const shader = globalRegistry.get(shaderName);
  return shader?.displayName || shaderName;
}

/**
 * Apply shader effect to the map
 */
function applyShader(shaderName: string): void {
  if (!map.value) return;

  const shader = globalRegistry.get(shaderName);
  if (!shader) {
    console.error(`Shader "${shaderName}" not found`);
    return;
  }

  // Initialize shader manager if needed
  if (!shaderManager.value) {
    shaderManager.value = new ShaderManager(globalRegistry);
  }

  // Remove existing layer
  if (currentLayerId.value && map.value.getLayer(currentLayerId.value)) {
    map.value.removeLayer(currentLayerId.value);
  }

  // Ensure source exists
  if (!map.value.getSource('shader-source')) {
    map.value.addSource('shader-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
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
      },
    });
  }

  // Create new layer
  const layerId = `shader-${shaderName}-${Date.now()}`;
  const mergedConfig = { ...shader.defaultConfig, ...config };

  map.value.addLayer({
    id: layerId,
    type: 'fill',
    source: 'shader-source',
    paint: {
      'fill-color': (mergedConfig.color as string) || '#3388ff',
      'fill-opacity': config.opacity,
    },
  });

  currentLayerId.value = layerId;
  shaderManager.value.register(shaderName, shader);

  console.log(`Applied shader: ${shaderName}`, mergedConfig);
}

/**
 * Handle shader selection change
 */
function onShaderChange(): void {
  applyShader(currentShader.value);
  emit('shader-change', currentShader.value);
}

/**
 * Update shader with current config
 */
function updateShader(): void {
  applyShader(currentShader.value);
}

/**
 * Toggle animation playback
 */
function togglePlayback(): void {
  // In a real implementation, you would call the shader manager's
  // play/pause methods here
  console.log(`Animation ${isPlaying.value ? 'playing' : 'paused'}`);
}

// Lifecycle hooks
onMounted(() => {
  if (!mapContainer.value) return;

  map.value = new maplibregl.Map({
    container: mapContainer.value,
    style: props.styleUrl,
    center: props.center,
    zoom: props.zoom,
  });

  map.value.on('load', () => {
    emit('map-ready', map.value!);
    applyShader(currentShader.value);
  });
});

onUnmounted(() => {
  map.value?.remove();
  map.value = null;
  shaderManager.value = null;
});

// Watch for prop changes
watch(() => props.initialShader, (newShader) => {
  currentShader.value = newShader;
  if (map.value) {
    applyShader(newShader);
  }
});

// Expose methods for parent components
defineExpose({
  map,
  applyShader,
  getAvailableShaders: () => availableShaders,
});
</script>

<style scoped>
.animated-map-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.map {
  width: 100%;
  height: 100%;
}

.controls {
  position: absolute;
  top: 10px;
  left: 10px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 200px;
}

.controls h3 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #333;
}

.control-group {
  margin-bottom: 12px;
}

.control-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  color: #666;
}

.control-group select,
.control-group input[type='range'] {
  width: 100%;
}

.control-group select {
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.control-group input[type='checkbox'] {
  width: auto;
  margin-right: 5px;
}

.value {
  display: block;
  text-align: right;
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}
</style>
