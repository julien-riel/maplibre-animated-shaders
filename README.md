# MapLibre Animated Shaders

Animated GLSL shaders for MapLibre GL JS. Add stunning visual effects to your map layers with smooth WebGL-powered animations.

[![npm version](https://img.shields.io/npm/v/maplibre-animated-shaders.svg)](https://www.npmjs.com/package/maplibre-animated-shaders)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Packages

This monorepo contains the following packages:

| Package | Description | npm |
|---------|-------------|-----|
| [`maplibre-animated-shaders`](./packages/lib) | Core library | [![npm](https://img.shields.io/npm/v/maplibre-animated-shaders.svg)](https://www.npmjs.com/package/maplibre-animated-shaders) |
| [`@maplibre-animated-shaders/react`](./packages/react) | React components and hooks | Coming soon |
| [`@maplibre-animated-shaders/vue`](./packages/vue) | Vue 3 composables and components | Coming soon |
| [`@maplibre-animated-shaders/demo`](./packages/demo) | Interactive demo application | - |

## Quick Start

```bash
npm install maplibre-animated-shaders maplibre-gl
```

```typescript
import maplibregl from 'maplibre-gl';
import { createShaderManager, examplePlugin } from 'maplibre-animated-shaders';

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [2.34, 48.858],
  zoom: 12
});

map.on('load', () => {
  const shaderManager = createShaderManager(map);
  shaderManager.use(examplePlugin);
  shaderManager.register('my-layer', 'example:point', { color: '#3b82f6' });
  shaderManager.play();
});
```

See the [core library documentation](./packages/lib/README.md) for full API reference.

## Features

- **WebGL-powered animations** - Smooth 60fps animations using custom GLSL shaders
- **Multiple geometry types** - Support for points, lines, polygons, and global effects
- **Data-driven styling** - Use MapLibre expressions for per-feature dynamic properties
- **Per-feature animation control** - Play, pause, and control animations on individual features
- **Plugin architecture** - Extensible system for organizing and sharing shaders
- **TypeScript first** - Full type definitions with strict typing
- **Framework integrations** - React and Vue 3 support

## Development

```bash
# Install dependencies
npm install

# Run demo application
npm run dev:demo

# Run tests
npm run test:run

# Build all packages
npm run build:all

# Lint and format
npm run lint
npm run format
```

## Project Structure

```
maplibre-animated-shaders/
├── packages/
│   ├── lib/          # Core shader library
│   ├── react/        # React bindings
│   ├── vue/          # Vue 3 bindings
│   └── demo/         # Demo application
├── e2e/              # End-to-end tests
├── scripts/          # Build and utility scripts
└── docs/             # Generated API documentation
```

## Documentation

- [Core Library README](./packages/lib/README.md) - Full API documentation
- [Architecture Guide](./ARCHITECTURE.md) - Technical architecture overview
- [Plugin Guide](./PLUGIN_GUIDE.md) - Creating custom shader plugins

## License

MIT License - see [LICENSE](./packages/lib/LICENSE) for details.

## Links

- [GitHub Repository](https://github.com/julien-riel/maplibre-animated-shaders)
- [Issue Tracker](https://github.com/julien-riel/maplibre-animated-shaders/issues)
- [API Documentation](https://julien-riel.github.io/maplibre-animated-shaders/)
