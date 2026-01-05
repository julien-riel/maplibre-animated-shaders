# MapLibre Animated Shaders

Animated GLSL shaders for MapLibre GL JS. Add stunning visual effects to your map layers with smooth WebGL-powered animations.

[![npm version](https://img.shields.io/npm/v/maplibre-animated-shaders.svg)](https://www.npmjs.com/package/maplibre-animated-shaders)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **WebGL-powered animations** - Smooth 60fps animations using custom GLSL shaders
- **Multiple geometry types** - Support for points, lines, polygons, and global (full-screen) effects
- **Data-driven styling** - Use MapLibre expressions for per-feature dynamic properties
- **Per-feature animation control** - Play, pause, and control animations on individual features
- **Plugin architecture** - Extensible system for organizing and sharing shaders
- **TypeScript first** - Full type definitions with strict typing
- **Built-in shader library** - Ready-to-use GLSL utilities (noise, easing, colors, shapes)
- **Typed event system** - Subscribe to shader lifecycle events
- **Error hierarchy** - Typed errors with error codes for robust error handling
- **Performance optimized** - Shader program caching, object pooling, buffer reuse

### Implementation Progress

| Phase | Feature | Status |
|-------|---------|--------|
| 1.1 | WebGL 2.0 Support avec Fallback | ✅ Complete |
| 1.2 | Config Immutability (deep-freeze) | ✅ Complete |
| 1.3 | Complete JSDoc documentation | ⏳ In Progress |
| 2.1 | Instanced Rendering | ✅ Complete |
| 2.2 | Frustum Culling | ✅ Complete |
| 2.3 | Level of Detail (LOD) | ✅ Complete |
| 2.4 | Adaptive Frame Rate | ✅ Complete |
| 3.1 | Textures and Sprites | ✅ Complete |
| 3.2 | Post-Processing Pipeline | ✅ Complete |
| 3.3 | Shader Transitions | ✅ Complete |
| 4.1 | Terrain/3D Shaders | ✅ Complete |
| 5.1 | Worker Thread Support | ✅ Complete |

## Installation

```bash
npm install maplibre-animated-shaders maplibre-gl
```

## Quick Start

```typescript
import maplibregl from 'maplibre-gl';
import { createShaderManager, examplePlugin } from 'maplibre-animated-shaders';

// Create your map
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [2.34, 48.858],
  zoom: 12
});

map.on('load', () => {
  // Add a circle layer to your map
  map.addSource('points', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.34, 48.858] }, properties: {} }
      ]
    }
  });

  map.addLayer({
    id: 'my-points',
    type: 'circle',
    source: 'points',
    paint: { 'circle-radius': 20, 'circle-color': '#3b82f6' }
  });

  // Create the shader manager and register the example plugin
  const shaderManager = createShaderManager(map);
  shaderManager.use(examplePlugin);

  // Apply an animated shader to the layer
  shaderManager.register('my-points', 'example:point', {
    color: '#3b82f6',
    speed: 1.0,
    rings: 3,
    maxRadius: 40
  });

  // Start the animation
  shaderManager.play();
});
```

## API Reference

### ShaderManager

The main orchestrator for managing animated shaders on your map.

```typescript
const shaderManager = createShaderManager(map, options?);
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debug` | `boolean` | `false` | Enable debug logging |
| `maxFPS` | `number` | `60` | Maximum frames per second |
| `collectMetrics` | `boolean` | `false` | Enable performance metrics collection |

#### Methods

| Method | Description |
|--------|-------------|
| `use(plugin)` | Register a shader plugin |
| `useAsync(pluginName)` | Lazy-load and register a built-in plugin |
| `register(layerId, shaderName, config?, interactivityConfig?)` | Apply a shader to a layer |
| `unregister(layerId)` | Remove a shader from a layer |
| `play(layerId?)` | Start animation (all or specific layer) |
| `pause(layerId?)` | Pause animation (all or specific layer) |
| `setSpeed(layerId, speed)` | Set animation speed for a layer |
| `updateConfig(layerId, config)` | Update shader configuration |
| `getMetrics()` | Get performance metrics |
| `destroy()` | Clean up all resources |

### Shader Configuration

Each shader has its own configuration options. Here's an example for the point shader:

```typescript
shaderManager.register('my-layer', 'example:point', {
  // Static values
  color: '#ff0000',
  speed: 1.5,
  rings: 3,

  // Or data-driven with MapLibre expressions
  color: ['get', 'status_color'],
  intensity: ['match', ['get', 'priority'],
    'high', 1.0,
    'low', 0.3,
    0.5
  ]
});
```

### Per-Feature Animation Control

Enable individual control over each feature's animation:

```typescript
shaderManager.register('my-layer', 'example:point', config, {
  perFeatureControl: true,
  initialState: { playing: false },
  featureIdProperty: 'id',
  onClick: (feature, state, controller) => {
    controller.toggleFeature(feature.id);
  },
  onHover: (feature, state) => {
    console.log(`Hovering feature ${feature.id}`);
  }
});
```

## Built-in Shaders

The `examplePlugin` includes shaders for all geometry types:

### Point Shader: "Pulse Marker"
Animated concentric rings radiating from points.

```typescript
{
  color: string,       // Color (hex or rgba)
  speed: number,       // Animation speed multiplier
  rings: number,       // Number of visible rings
  maxRadius: number,   // Maximum radius in pixels
  thickness: number,   // Ring thickness
  fadeOut: boolean,    // Fade rings as they expand
  easing: 'linear' | 'easeOut' | 'easeInOut' | 'elastic'
}
```

### Line Shader: "Flow Line"
Animated dashes flowing along lines.

```typescript
{
  color: string,
  speed: number,
  dashLength: number,    // Dash length ratio (0-1)
  gapLength: number,     // Gap length ratio (0-1)
  direction: 'forward' | 'backward',
  gradient: boolean,     // Gradient within each dash
  glow: boolean,         // Glow effect
  width: number          // Line width in pixels
}
```

### Polygon Shader: "Wave Polygon"
Wave and noise patterns on filled areas.

```typescript
{
  color: string,
  speed: number,
  waves: number,        // Number of wave cycles
  scale: number,        // Pattern scale
  amplitude: number,    // Wave amplitude
  useNoise: boolean,    // Use noise pattern
  pattern: 'waves' | 'ripple' | 'noise'
}
```

### Global Shader: "Grid Overlay"
Full-screen sci-fi grid effects.

```typescript
{
  color: string,
  speed: number,
  gridSize: number,      // Grid cell size
  lineWidth: number,     // Grid line width
  pulseWave: boolean,    // Radial pulse effect
  scanLine: boolean,     // Horizontal scan line
  glowIntensity: number  // Glow intensity
}
```

## Presets

Shaders can include presets for common configurations:

```typescript
// List available presets
const presets = shaderManager.getAllPresets();
// ['example:point-alert', 'example:point-notification', ...]

// Use a preset
shaderManager.registerPreset('my-layer', 'example:point-alert');
```

## Event System

Subscribe to shader lifecycle events:

```typescript
import { globalEventEmitter } from 'maplibre-animated-shaders';

// Listen to shader registration
const unsubscribe = globalEventEmitter.on('shader:registered', (event) => {
  console.log(`Shader registered on layer: ${event.layerId}`);
});

// Listen to errors
globalEventEmitter.on('error', (event) => {
  console.error(`Error: ${event.error.message}`, event.context);
});

// Available events:
// - 'shader:registered', 'shader:unregistered', 'shader:configUpdated'
// - 'shader:play', 'shader:pause', 'shader:speedChanged'
// - 'plugin:registered', 'plugin:unregistered'
// - 'error', 'performance:warning', 'performance:frame'
// - 'destroyed'

// Unsubscribe when done
unsubscribe();
```

## Error Handling

The library provides typed errors for better error handling:

```typescript
import {
  ShaderManagerError,
  ShaderNotFoundError,
  LayerNotFoundError,
  isShaderManagerError,
  hasErrorCode,
  ErrorCodes
} from 'maplibre-animated-shaders';

try {
  shaderManager.register('unknown-layer', 'example:point', {});
} catch (error) {
  if (isShaderManagerError(error)) {
    console.log(`Error code: ${error.code}`);
    console.log(`Details: ${JSON.stringify(error.details)}`);
  }

  if (hasErrorCode(error, ErrorCodes.LAYER_NOT_FOUND)) {
    console.log('The layer does not exist on the map');
  }
}
```

## GLSL Utilities

The library exports reusable GLSL functions for your custom shaders:

```typescript
import { glsl } from 'maplibre-animated-shaders';

// Available modules:
glsl.noise    // Perlin, Simplex, Value noise, FBM
glsl.easing   // 15+ easing functions
glsl.colors   // Color space conversions, blend modes
glsl.shapes   // SDF primitives and operations
```

### Noise Functions
```glsl
float snoise(vec2 v)           // Simplex noise 2D
float snoise(vec3 v)           // Simplex noise 3D
float fbm(vec2 p, int octaves) // Fractal Brownian Motion
float random(vec2 st)          // Hash-based random
```

### Easing Functions
```glsl
float easeOutQuad(float t)
float easeInOutCubic(float t)
float easeOutElastic(float t)
float easeOutBounce(float t)
// ... and many more
```

### Color Functions
```glsl
vec3 rgb2hsl(vec3 c)
vec3 hsl2rgb(vec3 c)
vec3 adjustSaturation(vec3 c, float amount)
vec3 blendOverlay(vec3 base, vec3 blend)
```

### Shape Functions (SDF)
```glsl
float sdCircle(vec2 p, float r)
float sdBox(vec2 p, vec2 b)
float sdRing(vec2 p, float r, float w)
float opSmoothUnion(float d1, float d2, float k)
```

## Creating Custom Plugins

See [PLUGIN_GUIDE.md](./PLUGIN_GUIDE.md) for detailed instructions on creating your own shader plugins.

Quick example:

```typescript
import { ShaderPlugin, defineShader } from 'maplibre-animated-shaders';

const myShader = defineShader({
  name: 'glow',
  displayName: 'Glowing Points',
  geometry: 'point',
  fragmentShader: `
    precision mediump float;
    uniform float u_time;
    uniform vec4 u_color;
    varying vec2 v_pos;

    void main() {
      float dist = length(v_pos);
      float glow = 0.5 + 0.5 * sin(u_time * 3.0);
      float alpha = (1.0 - dist) * glow;
      gl_FragColor = vec4(u_color.rgb, alpha * u_color.a);
    }
  `,
  defaultConfig: { color: '#ffffff', speed: 1.0 },
  configSchema: {
    color: { type: 'color', label: 'Color' },
    speed: { type: 'number', label: 'Speed', min: 0.1, max: 5 }
  },
  getUniforms: (config, time) => ({
    u_time: time * config.speed,
    u_color: hexToRgba(config.color)
  })
});

export const myPlugin: ShaderPlugin = {
  name: 'my-shaders',
  version: '1.0.0',
  shaders: [myShader]
};
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation.

## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 14+
- Any browser with WebGL 1.0 support

## Development

```bash
# Install dependencies
npm install

# Run development server with demo
npm run dev:demo

# Run tests
npm test

# Run e2e tests
npm run test:e2e

# Build library
npm run build:lib

# Generate documentation
npm run docs
```

## Scripts

| Script | Description |
|--------|-------------|
| `dev:demo` | Start development server with demo app |
| `build` | Build library (validate GLSL + TypeScript + bundle) |
| `build:lib` | Build library only |
| `build:demo` | Build demo application |
| `test` | Run unit tests (watch mode) |
| `test:run` | Run unit tests once |
| `test:coverage` | Run tests with coverage report |
| `test:e2e` | Run Playwright e2e tests |
| `lint` | Lint source code |
| `format` | Format source code |
| `validate:glsl` | Validate GLSL shader syntax |
| `bench` | Run performance benchmarks |
| `docs` | Generate TypeDoc documentation |

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## Links

- [GitHub Repository](https://github.com/julien-riel/maplibre-animated-shaders)
- [Issue Tracker](https://github.com/julien-riel/maplibre-animated-shaders/issues)
- [API Documentation](https://julien-riel.github.io/maplibre-animated-shaders/)
