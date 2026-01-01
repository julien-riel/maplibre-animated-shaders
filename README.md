# MapLibre GL Shaders

[![npm version](https://img.shields.io/npm/v/maplibre-animated-shaders.svg)](https://www.npmjs.com/package/maplibre-animated-shaders)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-125%20passing-brightgreen.svg)]()

**Animated GLSL shaders for MapLibre GL JS** - Add stunning visual effects to your maps with minimal effort.

## Features

- **26 ready-to-use animated shaders** for points, lines, polygons, and global effects
- **TypeScript first** - Full type safety and autocompletion
- **Zero dependencies** - Only peer dependency is MapLibre GL JS
- **Tree-shakeable** - Import only the shaders you need
- **Customizable** - Every shader parameter is configurable
- **High performance** - Optimized WebGL rendering with shared animation loop

## Demo

Run the interactive playground locally:

```bash
npm run dev:demo
```

## Installation

```bash
npm install maplibre-animated-shaders maplibre-gl
```

```bash
yarn add maplibre-animated-shaders maplibre-gl
```

```bash
pnpm add maplibre-animated-shaders maplibre-gl
```

## Quick Start

```typescript
import maplibregl from 'maplibre-gl';
import { createShaderManager, registerAllShaders } from 'maplibre-animated-shaders';

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
  // Add a GeoJSON source
  map.addSource('my-points', {
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

  // Add a circle layer (required for point shaders)
  map.addLayer({
    id: 'my-points-layer',
    type: 'circle',
    source: 'my-points',
    paint: {
      'circle-radius': 20,
      'circle-color': '#3b82f6'
    }
  });

  // Create a shader manager and apply a shader
  const shaderManager = createShaderManager(map);
  shaderManager.register('my-points-layer', 'pulse', {
    color: '#3b82f6',
    speed: 1.5,
    rings: 3,
    maxRadius: 50
  });
});
```

## Available Shaders

### Point Shaders (6)

| Shader | Description | Use Cases |
|--------|-------------|-----------|
| `pulse` | Expanding concentric rings | Alerts, active POIs, events |
| `heartbeat` | Rhythmic size pulsation | Real-time data, sensors, live status |
| `radar` | Rotating sweep arc | Coverage zones, scanning, search |
| `particleBurst` | Particles emanating from center | Events, impacts, notifications |
| `glow` | Luminous halo with variable intensity | Points of interest, hotspots, selection |
| `morphingShapes` | Fluid transitions between shapes | Dynamic categorization, multiple states |

### Line Shaders (7)

| Shader | Description | Use Cases |
|--------|-------------|-----------|
| `flow` | Animated dashes flowing along the line | Traffic flow, direction, pipelines |
| `gradientTravel` | Moving color gradient | Networks, data transfer, energy |
| `electric` | Sinusoidal plasma/electric effect | Power lines, sci-fi effects |
| `trailFade` | Decreasing opacity trail | Trajectories, GPS history, animations |
| `breathing` | Rhythmically pulsing width | Congestion, network load, importance |
| `snake` | Colored segment progressing along path | Routes, progression, loading |
| `neon` | Neon effect with flicker | Cyberpunk style, live data, futuristic UI |

### Polygon Shaders (8)

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

### Global Shaders (5)

| Shader | Description | Use Cases |
|--------|-------------|-----------|
| `heatShimmer` | Heat distortion effect | Heat effect, desert, hot roads |
| `dayNightCycle` | Day/night lighting variation | Time simulation, ambiance |
| `depthFog` | Animated fog based on zoom | Atmosphere, depth, levels |
| `weather` | Rain/snow/leaves particles | Weather, ambiance, seasons |
| `holographicGrid` | Pulsing sci-fi grid | Futuristic interface, tech visualization |

## API Reference

### `createShaderManager(map, options?)`

Creates a new shader manager instance.

```typescript
const manager = createShaderManager(map, {
  autoStart: true,    // Start animation loop automatically (default: true)
  targetFPS: 60,      // Target frame rate (default: 60)
  debug: false        // Enable debug logging (default: false)
});
```

### `ShaderManager` Methods

| Method | Description |
|--------|-------------|
| `register(layerId, shaderName, config?)` | Apply a shader to an existing layer |
| `unregister(layerId)` | Remove a shader from a layer |
| `updateConfig(layerId, config)` | Update shader configuration at runtime |
| `play(layerId?)` | Resume animation (all layers if no ID provided) |
| `pause(layerId?)` | Pause animation (all layers if no ID provided) |
| `setSpeed(layerId, speed)` | Set speed for a specific layer |
| `setGlobalSpeed(speed)` | Set global animation speed multiplier |
| `getTime()` | Get current animation time in seconds |
| `getInstance(layerId)` | Get shader instance for a layer |
| `getRegisteredLayers()` | Get all registered layer IDs |
| `destroy()` | Clean up and remove all shaders |

### Functional API

```typescript
import { applyShader } from 'maplibre-animated-shaders';

// Apply shader and get a controller
const controller = applyShader(map, 'my-layer', 'pulse', {
  color: '#3b82f6',
  speed: 1.5
});

// Update configuration
controller.update({ speed: 2.0 });

// Pause/resume
controller.pause();
controller.play();

// Check state
console.log(controller.isPlaying());

// Remove
controller.remove();
```

## Configuration Examples

### Pulse Shader (Points)

```typescript
shaderManager.register('my-layer', 'pulse', {
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
shaderManager.register('routes-layer', 'flow', {
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
shaderManager.register('zones-layer', 'ripple', {
  color: '#6366f1',
  speed: 1.5,
  waves: 4,
  decay: 0.6
});
```

### Weather Shader (Global)

```typescript
shaderManager.register('weather-effect', 'weather', {
  type: 'rain',         // 'rain' | 'snow' | 'leaves'
  speed: 1.0,
  density: 100,
  color: '#94a3b8',
  wind: 15              // Wind angle in degrees
});
```

## Data-Driven Properties

Configure shader parameters dynamically based on GeoJSON feature properties using MapLibre-style expressions. This enables per-feature customization of colors, intensity, and other parameters.

### Basic Property Access

```typescript
shaderManager.register('points-layer', 'pulse', {
  // Read color directly from feature property
  color: ['get', 'status_color'],

  // Read intensity from property
  intensity: ['get', 'priority_level'],

  // Static values still work
  speed: 1.5,
  rings: 3
});
```

### Conditional Mapping with `match`

```typescript
shaderManager.register('alerts-layer', 'pulse', {
  // Map status to colors
  color: ['match', ['get', 'status'],
    'critical', '#ef4444',
    'warning', '#f59e0b',
    'info', '#3b82f6',
    '#6b7280'  // default gray
  ],

  // Map priority to intensity
  intensity: ['match', ['get', 'priority'],
    'high', 1.0,
    'medium', 0.6,
    'low', 0.3,
    0.5  // default
  ]
});
```

### Interpolation

```typescript
shaderManager.register('earthquakes-layer', 'pulse', {
  // Interpolate radius based on magnitude
  maxRadius: ['interpolate', ['linear'], ['get', 'magnitude'],
    0, 10,    // magnitude 0 -> radius 10
    5, 50,    // magnitude 5 -> radius 50
    10, 100   // magnitude 10 -> radius 100
  ],

  // Interpolate color based on depth
  color: ['interpolate', ['linear'], ['get', 'depth'],
    0, '#22c55e',    // shallow = green
    100, '#eab308',  // medium = yellow
    300, '#ef4444'   // deep = red
  ]
});
```

### Fallback Values with `coalesce`

```typescript
shaderManager.register('data-layer', 'glow', {
  // Use feature color if available, otherwise default
  color: ['coalesce', ['get', 'custom_color'], '#3b82f6'],

  // Use animation speed from property, or default to 1.0
  speed: ['coalesce', ['get', 'animation_speed'], 1.0]
});
```

### Animation Time Offset

Add variety to animations by offsetting the time per feature:

```typescript
shaderManager.register('points-layer', 'heartbeat', {
  color: '#ef4444',
  speed: 1.0,

  timing: {
    // Random offset for natural feel
    timeOffset: 'random',

    // Or use a stable hash based on ID
    // timeOffset: ['hash', 'id'],

    // Or read from property
    // timeOffset: ['get', 'delay'],

    // Or specify a range
    // timeOffset: { min: 0, max: 2 }
  }
});
```

## Interactive Animation Control

Control animations on a per-feature basis via click/hover interactions. This enables individual features to have their animations independently played, paused, toggled, or reset.

### Basic Usage

```typescript
import { applyShader } from 'maplibre-animated-shaders';

// Apply shader with per-feature control
const controller = applyShader(map, 'alerts-layer', 'pulse', {
  color: '#ef4444',
  speed: 1.5,

  // Enable per-feature control
  perFeatureControl: true,
  initialState: 'paused',  // 'playing' | 'paused'

  // Toggle animation on click
  onClick: 'toggle',

  // Play on hover, pause on leave
  onHover: {
    enter: 'play',
    leave: 'pause'
  }
});
```

### Programmatic Control

When `perFeatureControl` is enabled, the returned controller has additional methods:

```typescript
const controller = applyShader(map, 'layer', 'pulse', {
  perFeatureControl: true
});

// Control individual features
controller.playFeature('feature-id-1');
controller.pauseFeature('feature-id-2');
controller.toggleFeature('feature-id-3');
controller.resetFeature('feature-id-4');

// Get feature state
const state = controller.getFeatureState('feature-id-1');
// { featureId: 'feature-id-1', isPlaying: true, localTime: 2.5, playCount: 1 }

// Control all features at once
controller.playAll();
controller.pauseAll();
controller.resetAll();
```

### Interaction Actions

Available actions for `onClick` and `onHover.enter`/`onHover.leave`:

| Action | Description |
|--------|-------------|
| `'toggle'` | Toggle between play and pause |
| `'play'` | Start or resume the animation |
| `'pause'` | Pause the animation at current time |
| `'reset'` | Reset animation to the beginning |
| `'playOnce'` | Play once then pause at the end |

### Custom Interaction Handlers

Use custom functions for advanced interaction logic:

```typescript
applyShader(map, 'layer', 'pulse', {
  perFeatureControl: true,

  onClick: (feature, state) => {
    console.log(`Clicked feature ${feature.id}`);
    console.log(`Currently playing: ${state.isPlaying}`);
    console.log(`Animation time: ${state.localTime}`);

    // Custom logic based on feature properties
    if (feature.properties?.priority === 'high') {
      // Handle high priority features differently
    }
  },

  onHover: {
    enter: (feature, state) => {
      // Custom hover enter logic
    },
    leave: (feature, state) => {
      // Custom hover leave logic
    }
  }
});
```

### Feature ID Configuration

By default, features are identified by their `id` property. Customize this with `featureIdProperty`:

```typescript
applyShader(map, 'layer', 'pulse', {
  perFeatureControl: true,

  // Use 'uuid' property as feature identifier
  featureIdProperty: 'uuid'
});
```

### GeoJSON Data Example

```typescript
// Your GeoJSON data with properties
const geojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.35, 48.85] },
      properties: {
        status: 'critical',
        priority: 'high',
        magnitude: 7.2,
        custom_color: '#ff0000'
      }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.36, 48.86] },
      properties: {
        status: 'info',
        priority: 'low',
        magnitude: 3.1
        // custom_color not set - will use fallback
      }
    }
  ]
};

// Each feature will have its own color/intensity based on its properties
```

### Supported Expressions

All MapLibre expression types are supported, including:

| Category | Examples |
|----------|----------|
| **Property access** | `['get', 'prop']`, `['has', 'prop']`, `['id']` |
| **Comparison** | `['==', ...]`, `['!=', ...]`, `['>', ...]`, `['<', ...]` |
| **Logic** | `['all', ...]`, `['any', ...]`, `['!', ...]` |
| **Math** | `['+', ...]`, `['*', ...]`, `['/', ...]`, `['%', ...]` |
| **String** | `['concat', ...]`, `['downcase', ...]`, `['upcase', ...]` |
| **Color** | `['rgb', ...]`, `['rgba', ...]`, `['to-color', ...]` |
| **Conditional** | `['case', ...]`, `['match', ...]`, `['coalesce', ...]` |
| **Interpolation** | `['interpolate', ...]`, `['step', ...]` |

See [MapLibre Expressions](https://maplibre.org/maplibre-style-spec/expressions/) for full documentation.

## Custom Shaders

Create your own animated shaders:

```typescript
import { defineShader, registerShader, hexToRgba } from 'maplibre-animated-shaders';

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
    precision mediump float;
    uniform vec3 u_color;
    uniform float u_time;
    uniform float u_size;

    void main() {
      float pulse = sin(u_time * 3.0) * 0.5 + 0.5;
      gl_FragColor = vec4(u_color * pulse, 1.0);
    }
  `,

  getUniforms(config, time) {
    const rgba = hexToRgba(config.color);
    return {
      u_color: [rgba[0], rgba[1], rgba[2]],
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
import { ShaderManager, createShaderManager, registerAllShaders } from 'maplibre-animated-shaders';

function MapWithShaders() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const shaderManager = useRef<ShaderManager | null>(null);

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

      // Add source and layer...
      map.current!.addSource('points', { /* ... */ });
      map.current!.addLayer({ id: 'points-layer', /* ... */ });

      // Apply shader
      shaderManager.current.register('points-layer', 'pulse', {
        color: '#3b82f6'
      });
    });

    return () => {
      shaderManager.current?.destroy();
      map.current?.remove();
    };
  }, []);

  return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />;
}
```

## Utilities

The library exports several utility functions:

```typescript
import {
  hexToRgba,      // Convert hex color to RGBA array
  rgbaToHex,      // Convert RGBA array to hex string
  normalizeColor, // Normalize color to RGBA array
  rgbToHsl,       // Convert RGB to HSL
  hslToRgb,       // Convert HSL to RGB
  lerpColor,      // Interpolate between two colors
  listShaders,    // List available shaders by geometry
} from 'maplibre-animated-shaders';

// List all point shaders
const pointShaders = listShaders('point');
// ['pulse', 'heartbeat', 'radar', 'particleBurst', 'glow', 'morphingShapes']
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
3. **Pause when hidden** - Save resources when the page is not visible

```typescript
// Use 30 FPS for better performance
const manager = createShaderManager(map, { targetFPS: 30 });

// Pause when page is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    manager.pause();
  } else {
    manager.play();
  }
});
```

## Development

```bash
# Install dependencies
npm install

# Run demo site
npm run dev:demo

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build library
npm run build:lib

# Generate API documentation
npm run docs
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](./LICENSE) - See LICENSE file for details.

## Acknowledgments

- [MapLibre GL JS](https://maplibre.org/) - The open-source map library this project extends
- Inspired by various WebGL shader examples and map visualization techniques
