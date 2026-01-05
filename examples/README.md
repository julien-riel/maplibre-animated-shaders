# Framework Integration Examples

This directory contains example integrations of `maplibre-animated-shaders` with popular frontend frameworks.

## Examples

### Vanilla JavaScript

A simple HTML/JavaScript example that works directly in the browser with ES modules.

```bash
# Serve the examples directory
npx serve examples/vanilla

# Or open directly in a browser that supports ES modules
```

**Files:**
- `vanilla/index.html` - Complete example with shader selection and configuration controls

### React

A React component using hooks for lifecycle management and state.

```bash
# Install dependencies in your React project
npm install maplibre-gl maplibre-animated-shaders

# Copy the example component
cp examples/react/AnimatedMap.tsx src/components/
```

**Files:**
- `react/AnimatedMap.tsx` - Full React component with TypeScript
- Includes `useShaderEffect` and `useAnimatedShaders` hooks

**Usage:**

```tsx
import { AnimatedMap } from './components/AnimatedMap';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <AnimatedMap
        center={[-74.5, 40]}
        zoom={9}
        initialShader="plasma"
        shaderConfig={{ speed: 1.5, intensity: 1.2 }}
        onMapReady={(map) => console.log('Map ready', map)}
        onShaderChange={(shader) => console.log('Shader changed', shader)}
      />
    </div>
  );
}
```

### Vue 3

A Vue 3 component using the Composition API.

```bash
# Install dependencies in your Vue project
npm install maplibre-gl maplibre-animated-shaders

# Copy the example component
cp examples/vue/AnimatedMap.vue src/components/
```

**Files:**
- `vue/AnimatedMap.vue` - Full Vue 3 component with TypeScript and Composition API

**Usage:**

```vue
<template>
  <div style="width: 100vw; height: 100vh">
    <AnimatedMap
      :center="[-74.5, 40]"
      :zoom="9"
      initial-shader="plasma"
      @map-ready="onMapReady"
      @shader-change="onShaderChange"
    />
  </div>
</template>

<script setup lang="ts">
import AnimatedMap from './components/AnimatedMap.vue';

function onMapReady(map) {
  console.log('Map ready', map);
}

function onShaderChange(shader) {
  console.log('Shader changed', shader);
}
</script>
```

## Key Integration Patterns

### 1. Initialize Shaders Once

Register shaders at module level, not in component lifecycle:

```typescript
import { globalRegistry, examplePlugin, PluginManager } from 'maplibre-animated-shaders';

// Do this ONCE at module level
const pluginManager = new PluginManager(globalRegistry);
pluginManager.use(examplePlugin);
```

### 2. Clean Up Resources

Always clean up WebGL resources when unmounting:

```typescript
// React
useEffect(() => {
  // setup
  return () => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  };
}, []);

// Vue
onUnmounted(() => {
  map.value?.remove();
});
```

### 3. Handle Context Loss

The library handles WebGL context loss automatically, but you may want to re-apply shaders after recovery:

```typescript
map.getCanvas().addEventListener('webglcontextrestored', () => {
  // Re-apply your shader configuration
  applyShader(currentShader, currentConfig);
});
```

### 4. Performance Optimization

For better performance in React/Vue:

```typescript
// Memoize config objects to prevent unnecessary re-renders
const config = useMemo(() => ({
  speed: 1.5,
  intensity: 1.0,
}), []);

// Debounce rapid config changes
const debouncedUpdate = useDebouncedCallback(updateShader, 100);
```

## TypeScript Support

All examples include full TypeScript support. Type definitions are exported from the main package:

```typescript
import type {
  ShaderDefinition,
  ShaderConfig,
  ShaderRegistry,
} from 'maplibre-animated-shaders';
```

## Common Issues

### MapLibre CSS Not Loading

Make sure to import the MapLibre CSS in your entry point:

```typescript
import 'maplibre-gl/dist/maplibre-gl.css';
```

### Shader Not Appearing

1. Ensure the map has fully loaded before applying shaders
2. Check that the source and layer names don't conflict
3. Verify the shader is registered in the global registry

### WebGL Errors

If you see WebGL errors:
1. Check browser compatibility
2. Ensure hardware acceleration is enabled
3. The library falls back to WebGL 1 if WebGL 2 is unavailable

## Need Help?

- [Documentation](/api-docs/)
- [GitHub Issues](https://github.com/julien-riel/maplibre-animated-shaders/issues)
- [Demo Site](/)
