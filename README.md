# MapLibre GL Shaders

[![npm version](https://img.shields.io/npm/v/maplibre-gl-shaders.svg)](https://www.npmjs.com/package/maplibre-gl-shaders)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**Animated GLSL shaders for MapLibre GL JS** - Add stunning visual effects to your maps with minimal effort.

## Features

- **26 ready-to-use animated shaders** for points, lines, polygons, and global effects
- **TypeScript first** - Full type safety and autocompletion
- **Zero dependencies** - Only peer dependency is MapLibre GL JS
- **Tree-shakeable** - Import only the shaders you need
- **Customizable** - Every shader parameter is configurable
- **High performance** - Optimized WebGL rendering with shared animation loop

## Demo

Check out the [interactive playground](https://maplibre-gl-shaders.dev) to explore all shaders with live configuration.

## Installation

```bash
npm install maplibre-gl-shaders maplibre-gl
```

```bash
yarn add maplibre-gl-shaders maplibre-gl
```

```bash
pnpm add maplibre-gl-shaders maplibre-gl
```

## Quick Start

```typescript
import maplibregl from 'maplibre-gl';
import { createShaderManager, registerAllShaders } from 'maplibre-gl-shaders';

// Register all built-in shaders
registerAllShaders();

// Create your map
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [2.3522, 48.8566],
  zoom: 12
});

map.on('load', () => {
  // Create a shader manager
  const shaderManager = createShaderManager(map);

  // Add a GeoJSON source
  map.addSource('points', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
          properties: {}
        }
      ]
    }
  });

  // Apply a shader to your data
  shaderManager.apply('pulse', 'points', {
    color: '#3b82f6',
    speed: 1.5,
    rings: 3,
    maxRadius: 50
  });
});
```

## Available Shaders

### Point Shaders

| Shader | Description | Use Cases |
|--------|-------------|-----------|
| `pulse` | Expanding concentric rings | Alerts, active POIs, events |
| `heartbeat` | Rhythmic size pulsation | Real-time data, sensors, live status |
| `radar` | Rotating sweep arc | Coverage zones, scanning, search |
| `particleBurst` | Particles emanating from center | Events, impacts, notifications |
| `glow` | Luminous halo with variable intensity | Points of interest, hotspots, selection |
| `morphingShapes` | Fluid transitions between shapes | Dynamic categorization, multiple states |

### Line Shaders

| Shader | Description | Use Cases |
|--------|-------------|-----------|
| `flow` | Animated dashes flowing along the line | Traffic flow, direction, pipelines |
| `gradientTravel` | Moving color gradient | Networks, data transfer, energy |
| `electric` | Sinusoidal plasma/electric effect | Power lines, sci-fi effects |
| `trailFade` | Decreasing opacity trail | Trajectories, GPS history, animations |
| `breathing` | Rhythmically pulsing width | Congestion, network load, importance |
| `snake` | Colored segment progressing along path | Routes, progression, loading |
| `neon` | Neon effect with flicker | Cyberpunk style, live data, futuristic UI |

### Polygon Shaders

| Shader | Description | Use Cases |
|--------|-------------|-----------|
| `scanLines` | Scanning horizontal/vertical lines | Analysis in progress, processing |
| `ripple` | Ripples from polygon centroid | Selection, impact, effect zone |
| `hatching` | Animated hatch pattern | Construction zones, terrain, unavailable |
| `fillWave` | Progressive liquid fill | Flooding, progression, levels |
| `noise` | Animated noise texture | Uncertainty, fuzzy zones, terrain |
| `marchingAnts` | Animated dotted border | Active selection, editing, focus |
| `gradientRotation` | Rotating radial/linear gradient | Influence zones, orientation visualization |
| `dissolve` | Dissolution appear/disappear effect | Transitions, reveal, progressive appearance |

### Global Shaders

| Shader | Description | Use Cases |
|--------|-------------|-----------|
| `heatShimmer` | Heat distortion effect | Heat effect, desert, hot roads |
| `dayNightCycle` | Day/night lighting variation | Time simulation, ambiance |
| `depthFog` | Animated fog based on zoom | Atmosphere, depth, levels |
| `weather` | Rain/snow/leaves particles | Weather, ambiance, seasons |
| `holographicGrid` | Pulsing sci-fi grid | Futuristic interface, tech visualization |

## Configuration Examples

### Pulse Shader

```typescript
shaderManager.apply('pulse', 'my-source', {
  color: '#3b82f6',     // Ring color
  speed: 1.0,           // Expansion speed
  rings: 3,             // Number of visible rings
  maxRadius: 50,        // Maximum radius in pixels
  fadeOut: true,        // Fade out at edges
  thickness: 2          // Ring thickness
});
```

### Flow Shader (Lines)

```typescript
shaderManager.apply('flow', 'routes-source', {
  color: '#10b981',
  speed: 2.0,
  dashLength: 15,
  gapLength: 10,
  direction: 'forward',
  gradient: true
});
```

### Ripple Shader (Polygons)

```typescript
shaderManager.apply('ripple', 'zones-source', {
  color: '#6366f1',
  speed: 1.5,
  waves: 4,
  decay: 0.6,
  origin: 'centroid'
});
```

## API Reference

### `createShaderManager(map, options?)`

Creates a new shader manager instance.

```typescript
const manager = createShaderManager(map, {
  autoStart: true,    // Start animation loop automatically
  fps: 60             // Target frame rate
});
```

### `ShaderManager` Methods

| Method | Description |
|--------|-------------|
| `apply(shader, source, config?)` | Apply a shader to a source |
| `remove(shader, source)` | Remove a shader from a source |
| `update(shader, source, config)` | Update shader configuration |
| `pause()` | Pause all animations |
| `play()` | Resume all animations |
| `setSpeed(multiplier)` | Set global speed multiplier |
| `destroy()` | Clean up and remove all shaders |

### Functional API

```typescript
import { applyShader, removeShader } from 'maplibre-gl-shaders';

// Apply shader
const controller = applyShader(map, 'pulse', 'source-id', config);

// Update configuration
controller.update({ speed: 2.0 });

// Pause/resume
controller.pause();
controller.play();

// Remove
controller.remove();
// or
removeShader(map, 'pulse', 'source-id');
```

## Custom Shaders

Create your own animated shaders:

```typescript
import { defineShader, registerShader } from 'maplibre-gl-shaders';

const myShader = defineShader({
  name: 'myCustomShader',
  geometry: 'point',
  description: 'My custom animated shader',
  tags: ['custom', 'animation'],

  defaultConfig: {
    color: '#ff0000',
    speed: 1.0,
    size: 20
  },

  configSchema: {
    color: { type: 'color' },
    speed: { type: 'number', min: 0.1, max: 5.0 },
    size: { type: 'number', min: 5, max: 100 }
  },

  fragmentShader: `
    uniform vec3 u_color;
    uniform float u_time;
    uniform float u_size;

    void main() {
      float pulse = sin(u_time * 3.0) * 0.5 + 0.5;
      gl_FragColor = vec4(u_color * pulse, 1.0);
    }
  `,

  getUniforms(config, time) {
    return {
      u_color: hexToRgb(config.color),
      u_time: time * config.speed,
      u_size: config.size
    };
  }
});

registerShader(myShader);
```

## React Integration

```tsx
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { createShaderManager, registerAllShaders } from 'maplibre-gl-shaders';

function MapWithShaders() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const shaderManager = useRef<ReturnType<typeof createShaderManager> | null>(null);

  useEffect(() => {
    registerAllShaders();

    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [2.3522, 48.8566],
      zoom: 12
    });

    map.current.on('load', () => {
      shaderManager.current = createShaderManager(map.current!);

      // Add sources and apply shaders...
    });

    return () => {
      shaderManager.current?.destroy();
      map.current?.remove();
    };
  }, []);

  return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />;
}
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

Requires WebGL 2.0 support.

## Performance Tips

1. **Limit concurrent shaders** - Each shader adds GPU overhead
2. **Use appropriate FPS** - 30 FPS is often sufficient for smooth animations
3. **Reduce shader complexity** - Simpler shaders perform better
4. **Consider visibility** - Pause shaders when not visible

```typescript
// Adjust FPS for better performance
const manager = createShaderManager(map, { fps: 30 });

// Pause when not visible
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    manager.pause();
  } else {
    manager.play();
  }
});
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](./LICENSE) - See LICENSE file for details.

## Acknowledgments

- [MapLibre GL JS](https://maplibre.org/) - The open-source map library this project extends
- Inspired by various WebGL shader examples and map visualization techniques
