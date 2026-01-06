# @maplibre-animated-shaders/vue

Vue 3 bindings for [MapLibre Animated Shaders](https://github.com/julien-riel/maplibre-animated-shaders).

## Installation

```bash
npm install @maplibre-animated-shaders/vue maplibre-animated-shaders maplibre-gl
```

## Quick Start

```vue
<script setup lang="ts">
import { AnimatedMap, ShaderLayer } from '@maplibre-animated-shaders/vue';
</script>

<template>
  <AnimatedMap
    :center="[-74.5, 40]"
    :zoom="9"
    @map-ready="(map) => console.log('Map ready')"
  >
    <template #default="{ map }">
      <ShaderLayer
        :map="map"
        shader-name="plasma"
        :config="{ speed: 1.5, intensity: 1.0 }"
      />
    </template>
  </AnimatedMap>
</template>
```

## Components

### `<AnimatedMap>`

Complete map component with shader support.

```vue
<AnimatedMap
  :center="[-74.5, 40]"
  :zoom="9"
  style="https://demotiles.maplibre.org/style.json"
  :map-options="{ maxZoom: 18 }"
  @map-ready="onMapReady"
  @map-error="onMapError"
>
  <template #default="{ map, isLoaded }">
    <!-- Child components receive map prop -->
  </template>
</AnimatedMap>
```

**Props:**
- `center` - Initial center `[lng, lat]` (default: `[-74.5, 40]`)
- `zoom` - Initial zoom level (default: `9`)
- `style` - Map style URL
- `mapOptions` - Additional MapLibre options

**Events:**
- `@map-ready` - Emitted when map loads with map instance
- `@map-error` - Emitted on error

### `<ShaderLayer>`

Declarative shader layer component.

```vue
<ShaderLayer
  :map="map"
  shader-name="plasma"
  id="my-layer"
  :config="{ speed: 1.5, color: '#ff6600' }"
  :data="geoJsonFeatures"
  :visible="true"
  before-id="labels"
  @add="onLayerAdd"
  @remove="onLayerRemove"
  @error="onLayerError"
/>
```

**Props:**
- `map` - MapLibre map instance (required)
- `shaderName` - Name of registered shader
- `id` - Layer ID (auto-generated if not provided)
- `config` - Shader configuration
- `data` - GeoJSON data source
- `visible` - Layer visibility
- `beforeId` - Insert layer before this ID

**Events:**
- `@add` - Emitted when layer is added
- `@remove` - Emitted when layer is removed
- `@error` - Emitted on error

## Composables

### `useShaderEffect`

Apply shader effects with reactive refs.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useShaderEffect } from '@maplibre-animated-shaders/vue';

const map = ref(null);
const shaderName = ref('plasma');
const config = ref({ speed: 1.5 });

const { isApplied, updateConfig, remove } = useShaderEffect({
  map,
  shaderName,
  config,
});
</script>
```

**Options:**
- `map` - Ref to map instance
- `shaderName` - Ref to shader name
- `config` - Ref to shader config
- `enabled` - Ref to enable/disable
- `data` - Ref to GeoJSON data

**Returns:**
- `layerId` - Ref to current layer ID
- `isApplied` - Ref to applied state
- `error` - Ref to any error
- `updateConfig` - Function to update config
- `remove` - Function to remove effect

### `useShaderManager`

Manage shader lifecycle.

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useShaderManager } from '@maplibre-animated-shaders/vue';

const { manager, isInitialized, listShaders, getShader } = useShaderManager();

const shaders = computed(() => listShaders());
</script>
```

### `useShaderRegistry`

Access the global shader registry.

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useShaderRegistry } from '@maplibre-animated-shaders/vue';

const { list, get, has, count } = useShaderRegistry();

const pointShaders = computed(() => list('point'));
const fillShaders = computed(() => list('fill'));
const totalCount = computed(() => count());
</script>
```

### `usePerformanceMonitor`

Monitor shader performance.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { usePerformanceMonitor } from '@maplibre-animated-shaders/vue';

const enabled = ref(true);
const canvas = ref(null);

const { metrics, isMonitoring, start, stop, reset } = usePerformanceMonitor({
  enabled,
  canvas,
  updateInterval: 500,
});
</script>

<template>
  <div v-if="metrics" class="fps-counter">
    {{ metrics.fps }} FPS | {{ metrics.frameTime.toFixed(1) }}ms
  </div>
</template>
```

## TypeScript

Full TypeScript support with exported types:

```ts
import type {
  ShaderLayerProps,
  AnimatedMapProps,
  UseShaderEffectOptions,
  UseShaderEffectReturn,
} from '@maplibre-animated-shaders/vue';
```

## Examples

### Multiple Layers

```vue
<template>
  <AnimatedMap :center="[-74.5, 40]" :zoom="9">
    <template #default="{ map }">
      <ShaderLayer
        :map="map"
        shader-name="water-ripples"
        :config="{ frequency: 2.0 }"
        :data="waterFeatures"
      />
      <ShaderLayer
        :map="map"
        shader-name="heat-distortion"
        :config="{ intensity: 0.5 }"
        :data="heatFeatures"
      />
    </template>
  </AnimatedMap>
</template>
```

### Dynamic Effects

```vue
<script setup lang="ts">
import { ref, reactive } from 'vue';

const shaderName = ref('plasma');
const config = reactive({ speed: 1.0 });
</script>

<template>
  <AnimatedMap :center="[-74.5, 40]" :zoom="9">
    <template #default="{ map }">
      <ShaderLayer :map="map" :shader-name="shaderName" :config="config" />
    </template>
  </AnimatedMap>

  <select v-model="shaderName">
    <option value="plasma">Plasma</option>
    <option value="water-ripples">Water Ripples</option>
  </select>

  <input
    type="range"
    v-model.number="config.speed"
    min="0.1"
    max="3"
    step="0.1"
  />
</template>
```

### With Pinia Store

```ts
// stores/shader.ts
import { defineStore } from 'pinia';
import { useShaderRegistry } from '@maplibre-animated-shaders/vue';

export const useShaderStore = defineStore('shader', () => {
  const { list, get, register } = useShaderRegistry();

  return {
    availableShaders: () => list(),
    getShader: get,
    registerCustomShader: register,
  };
});
```

## License

MIT
