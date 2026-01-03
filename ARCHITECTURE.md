# Architecture Documentation

This document provides a comprehensive technical overview of the MapLibre Animated Shaders library architecture.

## Table of Contents

1. [Overview](#overview)
2. [Core Architecture](#core-architecture)
3. [MapLibre Integration](#maplibre-integration)
4. [Shader System](#shader-system)
5. [Plugin Architecture](#plugin-architecture)
6. [Animation System](#animation-system)
7. [Data-Driven Properties](#data-driven-properties)
8. [Interaction System](#interaction-system)
9. [WebGL Resource Management](#webgl-resource-management)
10. [File Structure](#file-structure)

---

## Overview

MapLibre Animated Shaders is a WebGL-based library that extends MapLibre GL JS with animated shader effects. It uses MapLibre's `CustomLayerInterface` to inject custom WebGL rendering into the map's render pipeline.

### Key Design Principles

- **Non-invasive integration** - Works alongside existing MapLibre layers
- **Plugin-based extensibility** - Modular shader organization
- **Type safety** - Full TypeScript with strict typing
- **Performance focus** - Object pooling, buffer reuse, GPU-side animations
- **MapLibre compatibility** - Supports MapLibre expressions for data-driven styling

---

## Core Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              ShaderManager (Facade)                  │    │
│  │  - register/unregister shaders                       │    │
│  │  - play/pause control                                │    │
│  │  - configuration management                          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  PluginManager  │  │  ShaderRegistry │  │  AnimationLoop  │
│  - plugin       │  │  - shader       │  │  - frame timing │
│    lifecycle    │  │    storage      │  │  - callbacks    │
│  - namespace    │  │  - lookup       │  │  - global speed │
│    resolution   │  │  - filtering    │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Layer System                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              BaseShaderLayer (Abstract)                │  │
│  │  - WebGL program management                            │  │
│  │  - Uniform handling                                    │  │
│  │  - Buffer management                                   │  │
│  │  - Animation state                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│         │           │           │           │                │
│         ▼           ▼           ▼           ▼                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Point   │ │   Line   │ │ Polygon  │ │  Global  │       │
│  │  Shader  │ │  Shader  │ │  Shader  │ │  Shader  │       │
│  │  Layer   │ │  Layer   │ │  Layer   │ │  Layer   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Support Systems                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Expression  │  │  TimeOffset  │  │  Interaction │       │
│  │  Evaluator   │  │  Calculator  │  │  Handler     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 WebGL / MapLibre GL                          │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **ShaderManager** | Main facade - orchestrates all operations |
| **PluginManager** | Plugin registration, validation, namespace resolution |
| **ShaderRegistry** | Storage and lookup of shader definitions |
| **AnimationLoop** | Global timing and frame synchronization |
| **BaseShaderLayer** | Abstract base for WebGL rendering |
| **ExpressionEvaluator** | MapLibre expression evaluation |
| **TimeOffsetCalculator** | Per-feature timing offsets |
| **InteractionHandler** | Feature click/hover handling |

---

## MapLibre Integration

### CustomLayerInterface Implementation

The library uses MapLibre's `CustomLayerInterface` to inject custom WebGL rendering:

```typescript
// src/layers/BaseShaderLayer.ts
export abstract class BaseShaderLayer implements CustomLayerInterface {
  id: string;
  type = 'custom' as const;
  renderingMode: '2d' | '3d' = '2d';

  // Called when layer is added to map
  onAdd(map: MapLibreMap, gl: WebGLRenderingContext): void {
    this.map = map;
    this.gl = gl;
    this.program = this.createProgram(gl);
    this.cacheUniformLocations(gl);
    this.buildBuffers(gl);
  }

  // Called every frame
  render(gl: WebGLRenderingContext, matrix: mat4): void {
    this.updateTime();
    this.bindProgram(gl);
    this.setUniforms(gl, matrix);
    this.renderGeometry(gl);
  }

  // Called when layer is removed
  onRemove(map: MapLibreMap, gl: WebGLRenderingContext): void {
    this.cleanup(gl);
  }
}
```

### Layer Registration Flow

```
1. User calls: shaderManager.register('my-layer', 'example:point', config)
                                      │
2. Resolve shader name via PluginManager
                                      │
3. Get shader definition from ShaderRegistry
                                      │
4. Determine geometry type (point/line/polygon/global)
                                      │
5. Get source ID from original MapLibre layer
                                      │
6. Create appropriate CustomLayer (PointShaderLayer, etc.)
                                      │
7. Add custom layer to map: map.addLayer(customLayer, originalLayerId)
                                      │
8. Hide original layer: map.setPaintProperty(layerId, 'circle-opacity', 0)
                                      │
9. Register with AnimationLoop
```

### Geometry Type Mapping

| Shader Geometry | MapLibre Layer Type | Custom Layer Class |
|-----------------|--------------------|--------------------|
| `point` | `circle` | `PointShaderLayer` |
| `line` | `line` | `LineShaderLayer` |
| `polygon` | `fill` | `PolygonShaderLayer` |
| `global` | N/A (full screen) | `GlobalShaderLayer` |

---

## Shader System

### Shader Definition Structure

```typescript
// src/types/core.ts
interface ShaderDefinition<T extends ShaderConfig = ShaderConfig> {
  // Identification
  name: string;                        // Unique identifier
  displayName: string;                 // Human-readable name
  description: string;                 // Description
  geometry: GeometryType;              // 'point' | 'line' | 'polygon' | 'global'
  tags: string[];                      // Categories for filtering

  // GLSL code
  fragmentShader: string;              // Required
  vertexShader?: string;               // Optional (uses default)

  // Configuration
  defaultConfig: T;                    // Default values
  configSchema: ConfigSchema;          // Validation schema

  // Runtime
  getUniforms: (config: T, time: number, deltaTime: number) => Uniforms;

  // MapLibre integration
  requiredPaint?: Record<string, unknown>;
  requiredLayout?: Record<string, unknown>;
}
```

### Shader Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     Shader Pipeline                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Configuration Resolution                                 │
│     ┌──────────────┐                                        │
│     │ User Config  │──┐                                     │
│     └──────────────┘  │    ┌──────────────────┐            │
│                       ├───►│ ConfigResolver   │            │
│     ┌──────────────┐  │    │ - merge defaults │            │
│     │ Default      │──┘    │ - validate       │            │
│     │ Config       │       └────────┬─────────┘            │
│     └──────────────┘                │                       │
│                                     ▼                       │
│  2. Uniform Calculation                                     │
│     ┌──────────────────────────────────────┐               │
│     │ ShaderDefinition.getUniforms()       │               │
│     │ - config values → GPU uniforms       │               │
│     │ - time → u_time                      │               │
│     │ - colors → vec4                      │               │
│     └────────────────────┬─────────────────┘               │
│                          │                                  │
│                          ▼                                  │
│  3. Data-Driven Evaluation (if expressions present)        │
│     ┌──────────────────────────────────────┐               │
│     │ ExpressionEvaluator                  │               │
│     │ - ['get', 'property'] → value        │               │
│     │ - ['match', ...] → value             │               │
│     │ → Per-feature attribute buffers      │               │
│     └────────────────────┬─────────────────┘               │
│                          │                                  │
│                          ▼                                  │
│  4. WebGL Rendering                                         │
│     ┌──────────────────────────────────────┐               │
│     │ Vertex Shader                        │               │
│     │ - Transform positions                │               │
│     │ - Pass varyings                      │               │
│     └────────────────────┬─────────────────┘               │
│                          │                                  │
│     ┌──────────────────────────────────────┐               │
│     │ Fragment Shader                      │               │
│     │ - Calculate final color              │               │
│     │ - Apply animation effects            │               │
│     └──────────────────────────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Built-in GLSL Libraries

Located in `src/glsl/common/`:

| File | Functions | Description |
|------|-----------|-------------|
| `noise.glsl` | `snoise()`, `fbm()`, `random()` | Noise generation |
| `easing.glsl` | `easeOutQuad()`, `easeInOutCubic()`, etc. | Animation easing |
| `colors.glsl` | `rgb2hsl()`, `blendOverlay()`, etc. | Color manipulation |
| `shapes.glsl` | `sdCircle()`, `sdBox()`, `opUnion()` | SDF primitives |

---

## Plugin Architecture

### Plugin Structure

```typescript
// src/types/plugin.ts
interface ShaderPlugin extends PluginMetadata, PluginHooks {
  // Required metadata
  name: string;                        // Unique identifier (no ':')
  version: string;                     // Semver format
  shaders: ShaderDefinition[];         // At least one shader

  // Optional metadata
  author?: string;
  description?: string;
  homepage?: string;
  license?: string;
  keywords?: string[];

  // Optional configuration
  presets?: Record<string, { shader: string; config: Partial<ShaderConfig> }>;
  useNamespace?: boolean;              // Default: true

  // Lifecycle hooks
  onRegister?: (manager: IShaderManager) => void;
  onUnregister?: (manager: IShaderManager) => void;
  onBeforeApply?: (layerId: string, shaderName: string, config: ShaderConfig) => ShaderConfig | void;
  onAfterApply?: (layerId: string, shaderName: string, config: ShaderConfig) => void;
}
```

### Plugin Registration Flow

```
shaderManager.use(plugin)
        │
        ▼
┌──────────────────────────────────────┐
│         PluginManager.use()          │
├──────────────────────────────────────┤
│ 1. Validate plugin                   │
│    - name present and valid          │
│    - version is semver               │
│    - at least one shader             │
│    - no duplicate shader names       │
├──────────────────────────────────────┤
│ 2. Register shaders                  │
│    - Apply namespace: 'plugin:shader'│
│    - Add to ShaderRegistry           │
│    - Create name mapping             │
├──────────────────────────────────────┤
│ 3. Store plugin state                │
│    - registeredAt timestamp          │
│    - registeredShaders list          │
│    - active = true                   │
├──────────────────────────────────────┤
│ 4. Call onRegister hook (if defined) │
└──────────────────────────────────────┘
```

### Namespace Resolution

Shaders can be referenced by short name (if unambiguous) or full qualified name:

```typescript
// Full qualified name (always works)
'example:point'

// Short name (works if only one 'point' shader registered)
'point'

// Resolution in PluginManager.resolveShaderName():
function resolveShaderName(name: string): string | undefined {
  // Check if already qualified
  if (this.registry.get(name)) return name;

  // Look up in short name mapping
  const qualified = this.shaderToPlugin.get(name);
  return qualified;
}
```

### Lazy Loading

Plugins can be loaded on-demand to reduce initial bundle size:

```typescript
// src/plugins/loaders.ts
export async function loadPlugin(name: BuiltinPluginName): Promise<ShaderPlugin> {
  const loader = pluginLoaders[name];
  if (!loader) throw new Error(`Unknown plugin: "${name}"`);
  return loader();
}

export const pluginLoaders: Record<BuiltinPluginName, PluginLoader> = {
  example: async () => {
    const module = await import('./builtin/example');
    return module.examplePlugin;
  },
};

// Usage
await shaderManager.useAsync('example');
```

---

## Animation System

### AnimationLoop

Central timing coordinator using `requestAnimationFrame`:

```typescript
// src/AnimationLoop.ts
class AnimationLoop {
  private shaders: Map<string, UpdateCallback>;
  private running: boolean = false;
  private globalSpeed: number = 1.0;
  private currentTime: number = 0;
  private lastFrameTime: number = 0;
  private frameInterval: number;  // Based on maxFPS

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.tick();
  }

  private tick = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    // Throttle to target FPS
    if (elapsed >= this.frameInterval) {
      const deltaTime = (elapsed * this.globalSpeed) / 1000;
      this.currentTime += deltaTime;
      this.lastFrameTime = now;

      // Update all registered shaders
      this.shaders.forEach((callback) => {
        callback(this.currentTime, deltaTime);
      });
    }

    requestAnimationFrame(this.tick);
  };
}
```

### Per-Layer Timing

Each layer maintains its own time state:

```typescript
// In BaseShaderLayer
protected time: number = 0;
protected speed: number = 1.0;
protected isPlaying: boolean = true;
protected lastFrameTime: number = 0;

render(gl: WebGLRenderingContext, matrix: mat4): void {
  const now = performance.now();
  const deltaTime = (now - this.lastFrameTime) / 1000;
  this.lastFrameTime = now;

  if (this.isPlaying) {
    this.time += deltaTime * this.speed;
  }

  // Pass time to shader
  gl.uniform1f(this.u_time, this.time);

  // Request next frame if playing
  if (this.isPlaying) {
    this.map.triggerRepaint();
  }
}
```

### Per-Feature Timing

Features can have individual time offsets for staggered animations:

```typescript
// TimeOffsetValue types
type TimeOffsetValue =
  | number                           // Fixed offset
  | 'random'                         // Random in [0, period]
  | ['get', string]                  // From feature property
  | ['hash', string]                 // Stable hash of property
  | { min: number; max: number };    // Random range

// In vertex shader
attribute float a_timeOffset;
uniform float u_time;

void main() {
  float effectiveTime = u_time + a_timeOffset;
  // Use effectiveTime for animation
}
```

---

## Data-Driven Properties

### Expression Support

The library supports MapLibre expressions for per-feature values:

```typescript
// Configuration with expressions
shaderManager.register('layer', 'shader', {
  color: ['get', 'status_color'],
  intensity: ['match', ['get', 'priority'],
    'high', 1.0,
    'medium', 0.6,
    0.3  // default
  ]
});
```

### ExpressionEvaluator

Wraps `@maplibre/maplibre-gl-style-spec` for expression evaluation:

```typescript
// src/expressions/ExpressionEvaluator.ts
class ExpressionEvaluator {
  private expressions: Map<string, CompiledExpression>;

  compile(key: string, expression: unknown, expectedType: string): void {
    const compiled = createExpression(expression, { type: expectedType });
    if (compiled.result === 'success') {
      this.expressions.set(key, compiled.value);
    }
  }

  evaluate(key: string, feature: GeoJSON.Feature, zoom: number): unknown {
    const expr = this.expressions.get(key);
    if (!expr) return undefined;

    return expr.evaluate(
      { zoom },
      feature,
      {},  // featureState
      []   // canonical
    );
  }
}
```

### Data Buffer Flow

```
Features from GeoJSON Source
           │
           ▼
┌─────────────────────────────────────┐
│    ExpressionEvaluator.evaluate()   │
│    Per feature, per property        │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│    FeatureDataBuffer                │
│    Interleaved attribute data       │
│    [color.r, color.g, color.b,      │
│     color.a, intensity, ...]        │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│    WebGL Attribute Buffer           │
│    gl.bufferData(gl.ARRAY_BUFFER,   │
│                  data, STATIC_DRAW) │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│    Vertex Shader                    │
│    attribute vec4 a_color;          │
│    attribute float a_intensity;     │
└─────────────────────────────────────┘
```

---

## Interaction System

### Feature Animation State Management

```typescript
// src/interaction/FeatureAnimationStateManager.ts
interface FeatureAnimationState {
  playing: boolean;
  localTime: number;
  frozenTime: number;
}

class FeatureAnimationStateManager {
  private states: Map<string | number, FeatureAnimationState>;

  playFeature(id: string | number): void {
    const state = this.getState(id);
    if (!state.playing) {
      state.playing = true;
      // Resume from frozen time
    }
  }

  pauseFeature(id: string | number): void {
    const state = this.getState(id);
    if (state.playing) {
      state.playing = false;
      state.frozenTime = state.localTime;
    }
  }

  tick(globalTime: number, deltaTime: number): void {
    this.states.forEach((state) => {
      if (state.playing) {
        state.localTime += deltaTime;
      }
    });
  }

  generateBufferData(verticesPerFeature: number): InteractionBufferData {
    // Returns Float32Array for WebGL buffer
    // [isPlaying, localTime] per vertex
  }
}
```

### Interaction Configuration

```typescript
interface InteractivityConfig {
  perFeatureControl?: boolean;
  initialState?: { playing: boolean };
  featureIdProperty?: string;

  onClick?: (
    feature: GeoJSON.Feature,
    state: FeatureAnimationState,
    controller: FeatureController
  ) => void;

  onHover?: (
    feature: GeoJSON.Feature,
    state: FeatureAnimationState
  ) => void;

  onLeave?: () => void;
}
```

### Vertex Shader Integration

```glsl
// Per-feature animation attributes
attribute float a_isPlaying;   // 0.0 = paused, 1.0 = playing
attribute float a_localTime;   // Frozen time when paused

uniform float u_time;          // Global time

varying float v_effectiveTime;

void main() {
  // When paused, use frozen localTime
  // When playing, use global time with offset
  float globalAnimTime = u_time + a_timeOffset;
  v_effectiveTime = mix(a_localTime, globalAnimTime, a_isPlaying);

  // Pass to fragment shader
}
```

---

## WebGL Resource Management

### Buffer Management

Each geometry type manages its own buffers:

```typescript
// PointShaderLayer buffers
private vertexBuffer: WebGLBuffer | null;     // Positions, offsets
private indexBuffer: WebGLBuffer | null;      // Triangle indices
private dataDrivenBuffer: WebGLBuffer | null; // Per-feature colors, etc.
private interactionBuffer: WebGLBuffer | null; // Play/pause states

// Buffer layout for points (stride = 24 bytes)
// [x, y, offsetX, offsetY, featureIndex, timeOffset]
```

### Shader Compilation

```typescript
protected createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  // Compile vertex shader
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, this.getVertexShader());
  gl.compileShader(vertexShader);

  // Check for errors
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw new ShaderCompilationError(gl.getShaderInfoLog(vertexShader));
  }

  // Compile fragment shader
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, this.definition.fragmentShader);
  gl.compileShader(fragmentShader);

  // Link program
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // Cleanup shader objects (program keeps them)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}
```

### Uniform Location Caching

```typescript
protected cacheUniformLocations(gl: WebGLRenderingContext): void {
  this.u_matrix = gl.getUniformLocation(this.program, 'u_matrix');
  this.u_time = gl.getUniformLocation(this.program, 'u_time');
  this.u_resolution = gl.getUniformLocation(this.program, 'u_resolution');
  // ... shader-specific uniforms
}
```

### Resource Cleanup

```typescript
onRemove(map: MapLibreMap, gl: WebGLRenderingContext): void {
  // Delete buffers
  if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
  if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
  if (this.dataDrivenBuffer) gl.deleteBuffer(this.dataDrivenBuffer);
  if (this.interactionBuffer) gl.deleteBuffer(this.interactionBuffer);

  // Delete program
  if (this.program) gl.deleteProgram(this.program);

  // Clear references
  this.vertexBuffer = null;
  this.indexBuffer = null;
  this.program = null;

  // Remove event listeners
  this.map.off('sourcedata', this.onSourceData);
}
```

---

## File Structure

```
src/
├── index.ts                    # Public exports
├── ShaderManager.ts            # Main facade (926 lines)
├── AnimationLoop.ts            # Frame timing (128 lines)
├── ShaderRegistry.ts           # Shader storage (94 lines)
├── ConfigResolver.ts           # Config validation
│
├── layers/
│   ├── index.ts
│   ├── BaseShaderLayer.ts      # Abstract base (661 lines)
│   ├── PointShaderLayer.ts     # Points (478 lines)
│   ├── LineShaderLayer.ts      # Lines (594 lines)
│   ├── PolygonShaderLayer.ts   # Polygons (716 lines)
│   └── GlobalShaderLayer.ts    # Full-screen (411 lines)
│
├── types/
│   ├── index.ts
│   ├── core.ts                 # ShaderDefinition, ShaderConfig
│   ├── interfaces.ts           # IShaderManager, etc.
│   ├── plugin.ts               # Plugin types
│   ├── animation.ts            # Timing types
│   ├── interaction.ts          # Interaction types
│   ├── data-driven.ts          # Expression types
│   └── metrics.ts              # Performance types
│
├── plugins/
│   ├── index.ts
│   ├── PluginManager.ts        # Plugin lifecycle (433 lines)
│   ├── loaders.ts              # Lazy loading (119 lines)
│   └── builtin/
│       ├── index.ts
│       └── example/
│           ├── index.ts        # Plugin definition
│           └── shaders/
│               ├── index.ts
│               ├── point.ts    # Pulse Marker
│               ├── line.ts     # Flow Line
│               ├── polygon.ts  # Wave Polygon
│               └── global.ts   # Grid Overlay
│
├── expressions/
│   ├── index.ts
│   ├── ExpressionEvaluator.ts  # MapLibre expression eval
│   └── FeatureDataBuffer.ts    # Per-feature data buffers
│
├── interaction/
│   ├── index.ts
│   ├── FeatureAnimationStateManager.ts
│   └── InteractionHandler.ts
│
├── timing/
│   ├── index.ts
│   └── TimeOffsetCalculator.ts
│
├── glsl/
│   ├── index.ts
│   └── common/
│       ├── noise.glsl          # Noise functions
│       ├── easing.glsl         # Easing functions
│       ├── colors.glsl         # Color manipulation
│       └── shapes.glsl         # SDF primitives
│
└── utils/
    ├── index.ts
    ├── color.ts                # Color conversion
    ├── config-helpers.ts       # Config utilities
    ├── glsl-loader.ts          # GLSL preprocessing
    ├── glsl-uniform-extractor.ts
    ├── maplibre-helpers.ts
    ├── metrics-collector.ts    # Performance metrics
    ├── object-pool.ts          # Memory optimization
    ├── throttle.ts
    ├── webgl-capabilities.ts   # WebGL feature detection
    └── webgl-error-handler.ts  # Error handling
```

---

## Performance Considerations

### Object Pooling

The library uses object pools to reduce garbage collection:

```typescript
// src/utils/object-pool.ts
class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;

  acquire(): T {
    return this.pool.pop() || this.factory();
  }

  release(obj: T): void {
    this.pool.push(obj);
  }
}
```

### Buffer Reuse

Vertex buffers are reused when data changes:

```typescript
// Update existing buffer instead of recreating
gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
gl.bufferSubData(gl.ARRAY_BUFFER, 0, newData);
```

### Throttled Updates

Expensive operations are throttled:

```typescript
// src/utils/throttle.ts
const throttledUpdate = throttle((gl, data) => {
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
}, 16); // ~60fps
```

### Metrics Collection

Optional performance metrics for debugging:

```typescript
const metrics = shaderManager.getMetrics();
// { fps, frameTime, drawCalls, triangles, shaderSwitches }

shaderManager.onPerformanceWarning((warning) => {
  console.warn(`Performance warning: ${warning.type}`);
});
```

---

## Testing Architecture

### Unit Tests

Located in `tests/`:

```
tests/
├── ShaderManager.test.ts       # Manager tests
├── plugin-system.test.ts       # Plugin validation
├── builtin-plugins.test.ts     # Built-in shader tests
├── shaders.test.ts             # Shader definition tests
├── expressions.test.ts         # Expression evaluation
└── setup.ts                    # Test setup
```

### E2E Tests

Playwright tests in `e2e/`:

```
e2e/
├── shader-rendering.spec.ts    # Rendering tests
├── visual-regression.spec.ts   # Visual comparison
└── test-app/                   # Test application
```

### Benchmarks

Performance benchmarks in `benchmarks/`:

```
benchmarks/
├── core.bench.ts               # Core operations
├── data-processing.bench.ts    # Data handling
└── layers.bench.ts             # Layer rendering
```
