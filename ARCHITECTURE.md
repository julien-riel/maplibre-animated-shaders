# MapLibre Animated Shaders Library — Architecture

## Overview

**maplibre-animated-shaders** is a modular library of animated GLSL shaders for MapLibre GL JS. It allows adding dynamic visual effects to map layers with a declarative and configurable API.

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Application                            │
├─────────────────────────────────────────────────────────────────┤
│                     maplibre-animated-shaders                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐    │
│  │ ShaderManager │  │ AnimationLoop │  │ ConfigResolver    │    │
│  └───────┬───────┘  └───────┬───────┘  └─────────┬─────────┘    │
│          │                  │                    │               │
│  ┌───────▼──────────────────▼────────────────────▼───────┐      │
│  │                    ShaderRegistry                      │      │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │      │
│  │  │ Points  │ │ Lines   │ │Polygons │ │ Global  │      │      │
│  │  │ Shaders │ │ Shaders │ │ Shaders │ │ Effects │      │      │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │      │
│  └───────────────────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────────────────┤
│                       MapLibre GL JS                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Main Modules

### 1. ShaderManager

Main entry point. Manages the shader lifecycle on a MapLibre instance.

```typescript
interface ShaderManager {
  // Registration
  register(layerId: string, shaderName: string, config?: ShaderConfig): void;
  unregister(layerId: string): void;

  // Control
  play(layerId?: string): void;
  pause(layerId?: string): void;
  setSpeed(layerId: string, speed: number): void;

  // Runtime configuration
  updateConfig(layerId: string, config: Partial<ShaderConfig>): void;

  // Lifecycle
  destroy(): void;
}
```

### 2. AnimationLoop

Manages the global animation loop with `requestAnimationFrame`. Injects uniform time into all active shaders.

```typescript
interface AnimationLoop {
  start(): void;
  stop(): void;
  addShader(id: string, updateFn: (time: number) => void): void;
  removeShader(id: string): void;
  setGlobalSpeed(speed: number): void;
}
```

### 3. ShaderRegistry

Catalog of all available shaders, organized by geometry.

```typescript
interface ShaderRegistry {
  register(name: string, definition: ShaderDefinition): void;
  get(name: string): ShaderDefinition | undefined;
  list(geometry?: GeometryType): string[];
}

type GeometryType = 'point' | 'line' | 'polygon' | 'global';
```

### 4. ConfigResolver

Merges user configuration with shader default values.

```typescript
interface ConfigResolver {
  resolve<T extends ShaderConfig>(
    defaults: T,
    userConfig?: Partial<T>
  ): T;

  validate(config: ShaderConfig, schema: ConfigSchema): ValidationResult;
}
```

### 5. ExpressionEvaluator (Data-Driven)

Wrapper around the MapLibre expression system for data-driven properties.

```typescript
interface ExpressionEvaluator {
  // Compile a MapLibre expression
  compile(key: string, expression: unknown, expectedType: string): CompiledExpression | null;

  // Compile all expressions from a config
  compileConfig(config: Record<string, unknown>, schema?: Record<string, { type: string }>): void;

  // Evaluate an expression for a feature
  evaluateExpression(key: string, feature: GeoJSON.Feature, zoom: number): unknown;

  // Evaluate all expressions for a feature
  evaluateForFeature(config: Record<string, unknown>, feature: GeoJSON.Feature, zoom: number): EvaluatedConfig;

  // Check if a config contains expressions
  hasExpression(key: string): boolean;
  hasDataDrivenExpressions(): boolean;
}
```

### 6. TimeOffsetCalculator (Animation Timing)

Calculates per-feature time offsets for animations.

```typescript
interface TimeOffsetCalculator {
  // Calculate offsets for all features
  calculateOffsets(features: GeoJSON.Feature[], config: AnimationTimingConfig): Float32Array;
}

// Supported calculation modes
type TimeOffsetValue =
  | number                        // Fixed offset
  | 'random'                      // Random [0, period]
  | ['get', string]               // From property
  | ['hash', string]              // Stable hash of a property
  | { min: number; max: number }; // Random range
```

### 7. FeatureAnimationStateManager (Interactive Control)

Manages per-feature animation state for interactive control (play/pause/toggle/reset).

```typescript
interface FeatureAnimationStateManager {
  // Initialize state for all features
  initializeFromFeatures(features: GeoJSON.Feature[]): void;

  // Individual feature control
  playFeature(featureId: string | number): void;
  pauseFeature(featureId: string | number): void;
  toggleFeature(featureId: string | number): void;
  resetFeature(featureId: string | number): void;

  // Global control
  playAll(): void;
  pauseAll(): void;
  resetAll(): void;

  // State
  getState(featureId: string | number): FeatureAnimationState | undefined;

  // Per-frame update
  tick(globalTime: number, deltaTime: number): void;

  // GPU buffer data generation
  generateBufferData(verticesPerFeature: number): {
    isPlayingData: Float32Array;  // 0.0 or 1.0 per vertex
    localTimeData: Float32Array;  // Frozen time when paused
  };

  // Dirty tracking for optimization
  isDirty(): boolean;
  clearDirty(): void;
}

interface FeatureAnimationState {
  featureId: string | number;
  isPlaying: boolean;       // true = animation active
  localTime: number;        // Local time (frozen when paused)
  playCount: number;        // Number of complete plays
}
```

### 8. FeatureInteractionHandler (Event Handling)

Handles MapLibre events (click/hover) and dispatches to state manager.

```typescript
interface FeatureInteractionHandler {
  constructor(
    map: MapLibreMap,
    layerId: string,  // Layer ID for events
    stateManager: FeatureAnimationStateManager,
    config: InteractivityConfig
  );

  // Clean up event listeners
  dispose(): void;
}

interface InteractivityConfig {
  perFeatureControl?: boolean;
  initialState?: 'playing' | 'paused';
  onClick?: InteractionAction | InteractionHandler;
  onHover?: {
    enter?: InteractionAction | InteractionHandler;
    leave?: InteractionAction | InteractionHandler;
  };
  featureIdProperty?: string;
}

type InteractionAction = 'toggle' | 'play' | 'pause' | 'reset' | 'playOnce';
type InteractionHandler = (feature: GeoJSON.Feature, state: FeatureAnimationState) => void;
```

---

## Data-Driven Architecture

The data-driven system allows configuring shader parameters (color, intensity, etc.) from GeoJSON properties of each feature.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Shader Configuration                        │
│  {                                                               │
│    color: ['match', ['get', 'status'], 'high', '#f00', '#00f'], │
│    intensity: ['get', 'priority'],                              │
│    speed: 1.5  // static value                                  │
│  }                                                               │
├─────────────────────────────────────────────────────────────────┤
│                    ExpressionEvaluator                           │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ Compile via     │───▶│ CompiledExpr    │                     │
│  │ @maplibre/...   │    │ (cached)        │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                  │                               │
│                          evaluate(feature, zoom)                 │
│                                  ▼                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ { color: [1,0,0,1], intensity: 0.8, speed: 1.5 }        │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                      ShaderLayer (GPU)                           │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ Main Buffer     │    │ DataDriven      │                     │
│  │ (pos, uv, ...)  │    │ Buffer          │                     │
│  │                 │    │ (color, intens) │                     │
│  └─────────────────┘    └─────────────────┘                     │
│           │                      │                               │
│           ▼                      ▼                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Vertex Shader                         │    │
│  │  attribute vec4 a_color;     // per-vertex              │    │
│  │  attribute float a_intensity; // per-vertex             │    │
│  │  varying vec4 v_color;                                  │    │
│  │  varying float v_intensity;                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Fragment Shader                        │    │
│  │  // Uses v_color and v_intensity if data-driven         │    │
│  │  vec4 finalColor = mix(u_color, v_color, u_useDD);      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Configuration** — User provides a config with expressions or static values
2. **Compilation** — `ExpressionEvaluator` compiles expressions via `@maplibre/maplibre-gl-style-spec`
3. **Evaluation** — For each feature, expressions are evaluated
4. **GPU Buffer** — Values are written to a separate buffer (dataDrivenBuffer)
5. **Rendering** — Vertex shader reads per-vertex attributes and passes them to fragment shader

### Supported Properties

| Property | Type | Description |
|----------|------|-------------|
| `color` | `color` | Per-feature RGBA color |
| `intensity` | `number` | Effect intensity (0-1) |

---

## Interactive Animation Control Architecture

The interactive control system allows managing each feature's animation state individually via click/hover events.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Shader Configuration                        │
│  {                                                               │
│    perFeatureControl: true,                                      │
│    initialState: 'paused',                                       │
│    onClick: 'toggle',                                            │
│    onHover: { enter: 'play', leave: 'pause' }                    │
│  }                                                               │
├─────────────────────────────────────────────────────────────────┤
│               FeatureInteractionHandler                          │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ MapLibre Events │───▶│ Event Dispatch  │                     │
│  │ click/mouseenter│    │ to StateManager │                     │
│  │ mouseleave      │    │                 │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                  │                               │
│                          action: 'toggle' | 'play' | etc.        │
│                                  ▼                               │
├─────────────────────────────────────────────────────────────────┤
│            FeatureAnimationStateManager                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ states: Map<featureId, FeatureAnimationState>           │    │
│  │                                                         │    │
│  │ Feature 1: { isPlaying: true,  localTime: 2.5 }        │    │
│  │ Feature 2: { isPlaying: false, localTime: 1.2 }        │    │
│  │ Feature 3: { isPlaying: true,  localTime: 0.8 }        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                       │
│              tick(globalTime, deltaTime)                         │
│              generateBufferData(verticesPerFeature)              │
│                          ▼                                       │
├─────────────────────────────────────────────────────────────────┤
│                      ShaderLayer (GPU)                           │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ Main Buffer     │    │ Interaction     │                     │
│  │ (pos, uv, ...)  │    │ Buffer          │                     │
│  │                 │    │ (isPlaying,     │                     │
│  │                 │    │  localTime)     │                     │
│  └─────────────────┘    └─────────────────┘                     │
│           │                      │                               │
│           ▼                      ▼                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Vertex Shader                         │    │
│  │  attribute float a_isPlaying;   // 0.0 or 1.0           │    │
│  │  attribute float a_localTime;   // Frozen time if paused │    │
│  │  attribute float a_timeOffset;  // Timing offset        │    │
│  │  varying float v_effectiveTime;                         │    │
│  │                                                         │    │
│  │  // Effective time calculation                          │    │
│  │  float globalAnimTime = u_time + a_timeOffset;          │    │
│  │  v_effectiveTime = mix(a_localTime, globalAnimTime,     │    │
│  │                        a_isPlaying);                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Fragment Shader                        │    │
│  │  // Uses v_effectiveTime for animation                  │    │
│  │  float phase = fract(v_effectiveTime * u_speed);        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Interaction Flow

1. **Event** — User clicks or hovers over a feature on the map
2. **Dispatch** — `FeatureInteractionHandler` receives event via MapLibre
3. **Action** — Configured action (toggle/play/pause/reset) is executed
4. **State Update** — `FeatureAnimationStateManager` updates feature state
5. **Dirty Flag** — Buffer is marked as needing update
6. **Buffer Update** — On next frame, data is uploaded to GPU
7. **Rendering** — Shader uses `v_effectiveTime` for animation

### Effective Time Management

Effective time (`v_effectiveTime`) combines multiple components:

| State | Calculation |
|-------|-------------|
| **Playing** | `u_time + a_timeOffset` (global time + offset) |
| **Paused** | `a_localTime` (frozen at pause time) |

GLSL formula: `mix(a_localTime, u_time + a_timeOffset, a_isPlaying)`

### Optimization with Dirty Tracking

To avoid unnecessary GPU updates:

1. `FeatureAnimationStateManager` maintains a `dirty` flag
2. Flag becomes `true` only on state change
3. Buffer is updated only if `isDirty() === true`
4. After upload, `clearDirty()` is called

---

## Shader Structure

Each shader is defined as a standalone module:

```typescript
interface ShaderDefinition {
  // Metadata
  name: string;
  displayName: string;
  description: string;
  geometry: GeometryType;
  tags: string[];

  // GLSL code
  vertexShader?: string;      // Optional override
  fragmentShader: string;     // Required

  // Configuration
  defaultConfig: ShaderConfig;
  configSchema: ConfigSchema;

  // Dynamic uniforms
  getUniforms(config: ShaderConfig, time: number): Record<string, any>;

  // Required MapLibre style
  requiredPaint?: Record<string, any>;
  requiredLayout?: Record<string, any>;
}
```

### Shader Configuration

```typescript
interface ShaderConfig {
  // Common to all shaders
  speed?: number;           // Speed multiplier (default: 1.0)
  intensity?: number;       // Effect intensity (default: 1.0)
  enabled?: boolean;        // Enable/disable (default: true)

  // Shader-specific (examples)
  color?: string | [number, number, number, number];
  frequency?: number;
  amplitude?: number;
  // ... other parameters per shader
}
```

---

## File Organization

```
maplibre-animated-shaders/
├── src/
│   ├── index.ts                    # Main export
│   ├── ShaderManager.ts
│   ├── AnimationLoop.ts
│   ├── ShaderRegistry.ts
│   ├── ConfigResolver.ts
│   │
│   ├── expressions/                # Data-driven expressions
│   │   ├── index.ts                # Module exports
│   │   ├── ExpressionEvaluator.ts  # MapLibre expression wrapper
│   │   └── FeatureDataBuffer.ts    # Per-feature GPU buffer
│   │
│   ├── timing/                     # Animation timing
│   │   ├── index.ts                # Module exports
│   │   └── TimeOffsetCalculator.ts # Offset calculation
│   │
│   ├── interaction/                # Interactive control
│   │   ├── index.ts                # Module exports
│   │   ├── FeatureAnimationStateManager.ts  # Per-feature state
│   │   └── InteractionHandler.ts   # Click/hover event handling
│   │
│   ├── layers/                     # WebGL Custom Layers
│   │   ├── index.ts
│   │   ├── BaseShaderLayer.ts      # Abstract base class
│   │   ├── PointShaderLayer.ts     # Points with data-driven
│   │   ├── LineShaderLayer.ts      # Lines with data-driven
│   │   └── PolygonShaderLayer.ts   # Polygons with data-driven
│   │
│   ├── plugins/                    # Plugin system
│   │   ├── index.ts
│   │   ├── PluginManager.ts
│   │   ├── loaders.ts              # Lazy loading
│   │   └── builtin/                # Built-in plugins
│   │       ├── dataviz.ts
│   │       ├── atmospheric.ts
│   │       ├── scifi.ts
│   │       ├── organic.ts
│   │       └── core.ts
│   │
│   ├── glsl/
│   │   ├── common/
│   │   │   ├── noise.glsl          # Noise functions (simplex, perlin)
│   │   │   ├── easing.glsl         # Easing functions
│   │   │   ├── shapes.glsl         # SDF for geometric shapes
│   │   │   └── colors.glsl         # Color manipulation
│   │   │
│   │   └── includes/
│   │       └── ... (reusable fragments)
│   │
│   ├── utils/
│   │   ├── color.ts                # Color conversion
│   │   ├── glsl-loader.ts          # GLSL loading/compilation
│   │   ├── metrics-collector.ts    # Performance metrics
│   │   ├── object-pool.ts          # Object pooling
│   │   └── maplibre-helpers.ts     # MapLibre utilities
│   │
│   └── types/
│       ├── index.ts                # Type re-exports
│       ├── core.ts                 # Core types
│       ├── interfaces.ts           # Service interfaces
│       ├── animation.ts            # Animation timing types
│       ├── data-driven.ts          # Expression types
│       ├── interaction.ts          # Interactive animation types
│       ├── plugin.ts               # Plugin system types
│       └── metrics.ts              # Observability types
│
├── demo/
│   ├── index.html
│   ├── demo.ts
│   └── styles.css
│
├── tests/
│   └── ...
│
├── e2e/
│   ├── shader-rendering.spec.ts
│   └── visual-regression.spec.ts
│
├── benchmarks/
│   ├── core.bench.ts
│   ├── layers.bench.ts
│   └── data-processing.bench.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── ARCHITECTURE.md
└── README.md
```

---

## Public API

The API is designed to be **easy to integrate** into any existing MapLibre project. No modification of existing code is needed.

### Installation

```bash
npm install maplibre-animated-shaders
```

### Integration in 3 Lines

```typescript
import { applyShader } from 'maplibre-animated-shaders';

const map = new maplibregl.Map({ container: 'map', style: '...' });

// Apply a shader to an existing layer
applyShader(map, 'my-layer', 'pulse');
```

That's it! The shader is active and animated.

### Usage with Configuration

```typescript
import { applyShader } from 'maplibre-animated-shaders';

applyShader(map, 'traffic-layer', 'flow', {
  speed: 2.0,
  color: '#ff6b6b',
  dashLength: 15,
  direction: 'forward'
});
```

### Advanced Usage with Control

```typescript
import { createShaderManager } from 'maplibre-animated-shaders';

const shaders = createShaderManager(map);

// Register multiple shaders
shaders.register('alerts', 'pulse', { speed: 1.5, rings: 3 });
shaders.register('roads', 'flow', { speed: 2.0 });
shaders.register('zones', 'ripple');

// Runtime control
shaders.pause('alerts');
shaders.play('alerts');
shaders.setSpeed('roads', 3.0);

// Config update
shaders.updateConfig('alerts', { color: '#22c55e' });

// Remove a shader
shaders.unregister('zones');

// Complete cleanup
shaders.destroy();
```

### Functional API (One-Liners)

```typescript
import { applyShader, listShaders } from 'maplibre-animated-shaders';

// Apply
const controller = applyShader(map, 'layer', 'heartbeat', { speed: 1.2 });

// Control
controller.pause();
controller.play();
controller.update({ speed: 2.0 });

// Remove
controller.remove();

// List available shaders
console.log(listShaders());          // all
console.log(listShaders('point'));   // by geometry
```

### With React

```tsx
import { useShader } from 'maplibre-animated-shaders/react';

function MapComponent() {
  const mapRef = useRef(null);

  useShader(mapRef, 'my-layer', 'pulse', {
    speed: 1.5,
    color: '#3b82f6'
  });

  return <Map ref={mapRef} />;
}
```

### Lazy Loading Plugins

```typescript
import { createShaderManager } from 'maplibre-animated-shaders';

const shaders = createShaderManager(map);

// Load plugins on demand (code splitting)
await shaders.useAsync('dataviz');
await shaders.useAsync('atmospheric');

// Or load multiple in parallel
await shaders.useAsyncAll(['dataviz', 'scifi', 'organic']);
```

### Thematic Presets

```typescript
import { applyShader, presets } from 'maplibre-animated-shaders';

// Predefined presets for common use cases
applyShader(map, 'traffic', 'flow', presets.traffic.congestion);
applyShader(map, 'alerts', 'pulse', presets.alerts.critical);
applyShader(map, 'selection', 'ripple', presets.ui.selection);
```

### Custom Shader Creation

```typescript
import { defineShader, registerShader, applyShader } from 'maplibre-animated-shaders';

const myShader = defineShader({
  name: 'my-custom-effect',
  geometry: 'point',
  fragmentShader: `
    uniform float u_time;
    uniform float u_intensity;

    void main() {
      // Custom GLSL...
    }
  `,
  defaultConfig: {
    intensity: 1.0
  },
  getUniforms: (config, time) => ({
    u_time: time,
    u_intensity: config.intensity
  })
});

registerShader(myShader);

// Use like any other shader
applyShader(map, 'layer', 'my-custom-effect', { intensity: 0.8 });
```

### Performance Metrics

```typescript
const shaders = createShaderManager(map, {
  enableMetrics: true
});

// Get current metrics
const metrics = shaders.getMetrics();
console.log(`FPS: ${metrics.currentFPS}`);
console.log(`Dropped frames: ${metrics.droppedFrames}`);

// Listen for performance warnings
const unsubscribe = shaders.onPerformanceWarning((warning) => {
  console.warn(`Performance issue: ${warning.message}`);
  if (warning.type === 'low_fps') {
    shaders.setGlobalSpeed(0.5); // Reduce complexity
  }
});
```

---

## MapLibre Integration

The library integrates with MapLibre via several mechanisms:

### 1. Custom Layers (Global Effects)

For post-processing effects and global overlays.

```typescript
map.addLayer({
  id: 'shader-overlay',
  type: 'custom',
  onAdd: (map, gl) => { /* init WebGL */ },
  render: (gl, matrix) => { /* render */ }
});
```

### 2. Paint Properties Animation

For animatable properties of standard layers.

```typescript
// Interpolation via requestAnimationFrame
map.setPaintProperty('layer', 'circle-radius', animatedValue);
```

### 3. Expressions with Feature-State (Advanced)

For per-feature individual animations.

```typescript
map.setFeatureState({ source: 'src', id: featureId }, { phase: 0.5 });
```

---

## Performance Considerations

1. **Update Batching** — Uniforms are updated once per frame, not per shader
2. **Shader Compilation Cache** — WebGL programs are compiled once and reused
3. **Lazy Loading** — Shaders are loaded on demand
4. **Object Pooling** — Reduces GC pressure by 90% for 10k+ features
5. **Configurable Throttling** — FPS limiting to save resources
6. **Metrics Collection** — Runtime performance monitoring with warnings

---

## Compatibility

- MapLibre GL JS >= 3.0
- Browsers with WebGL 2.0+
- TypeScript >= 5.0 (types included)
- ESM and CommonJS

---

## Extensibility

The library is designed to be extended:

- **Plugins** — Plugin system for adding shader categories
- **Themes** — Thematic configuration presets
- **Hooks** — Callbacks on animation events
- **Adapters** — Future support for deck.gl or other renderers
- **Lazy Loading** — Dynamic import for code splitting
