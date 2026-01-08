# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Install dependencies (npm workspaces)
npm install

# Development
npm run dev:demo        # Run demo application with hot reload

# Building
npm run build:lib       # Build core library only
npm run build:demo      # Build demo application
npm run build:all       # Build everything

# Testing
npm test               # Run unit tests in watch mode
npm run test:run       # Run unit tests once
npm run test:coverage  # Run tests with coverage
npm run test:e2e       # Run Playwright e2e tests
npm run test:e2e:ui    # Run e2e tests with UI

# Code Quality
npm run lint           # Lint TypeScript files
npm run lint:fix       # Lint and auto-fix
npm run format         # Format with Prettier
npm run typecheck      # TypeScript type checking

# Other
npm run validate:glsl  # Validate GLSL shader syntax
npm run bench:run      # Run performance benchmarks
npm run docs           # Generate TypeDoc documentation
```

## Architecture Overview

This is a **monorepo** (npm workspaces) for animated WebGL shaders on MapLibre GL JS maps.

### Package Structure
- `packages/lib/` - Core library (`maplibre-animated-shaders` on npm)
- `packages/demo/` - Interactive demo application
- `packages/react/` - React bindings (in development)
- `packages/vue/` - Vue 3 bindings (in development)

### Core Library Architecture (`packages/lib/src/`)

**Entry Point**: `ShaderManager` is the main facade that orchestrates all shader operations.

**Key Components**:
- `ShaderManager.ts` - Main API facade, delegates to core modules
- `core/ShaderState.ts` - Shared state management and factory
- `core/ShaderRegistration.ts` - Register/unregister logic
- `core/ShaderPlayback.ts` - Play/pause/speed control
- `PluginManager.ts` - Plugin lifecycle, validation, namespace resolution
- `ShaderRegistry.ts` - Storage and lookup of shader definitions
- `AnimationLoop.ts` - Global timing and frame synchronization using requestAnimationFrame

**Layer System** (`layers/`):
- `BaseShaderLayer.ts` - Abstract base implementing MapLibre's `CustomLayerInterface`
- `PointShaderLayer.ts` - Points (circles)
- `LineShaderLayer.ts` - Lines
- `PolygonShaderLayer.ts` - Polygons (fills)
- `GlobalShaderLayer.ts` - Full-screen effects

**Plugin System**: Shaders are organized into plugins with namespaced names (e.g., `example:point`). Each plugin contains shader definitions with GLSL code, default configs, and uniform mappings.

**Data Flow**:
1. `shaderManager.register(layerId, shaderName, config)` resolves shader via PluginManager
2. Creates appropriate layer class (Point/Line/Polygon/Global)
3. Custom layer implements `onAdd`, `render`, `onRemove` for WebGL lifecycle
4. AnimationLoop triggers map repaint for continuous animation

### GLSL Conventions

Shaders are defined in TypeScript files (not .glsl) as template strings. Built-in GLSL utilities in `src/glsl/common/`:
- `noise.glsl` - Simplex noise, FBM, random
- `easing.glsl` - Animation easing functions
- `colors.glsl` - Color space conversions
- `shapes.glsl` - SDF primitives

Standard uniforms: `u_time`, `u_matrix`, `u_resolution`, `u_color`

### Expression System

Supports MapLibre-style expressions for data-driven properties:
```typescript
config: {
  color: ['get', 'status_color'],
  intensity: ['match', ['get', 'priority'], 'high', 1.0, 0.5]
}
```

### Key Type Definitions (`types/`)
- `core.ts` - `ShaderDefinition`, `ShaderConfig`, `GeometryType`
- `plugin.ts` - `ShaderPlugin`, `PluginMetadata`, `PluginHooks`
- `interfaces.ts` - `IShaderManager`, `IAnimationLoop`, etc.

### Testing Structure
- `packages/lib/tests/` - Unit tests (Vitest)
- `e2e/` - End-to-end tests (Playwright)
- `benchmarks/` - Performance benchmarks
