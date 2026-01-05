# MapLibre GL Shaders - API Examples

This document provides code examples for all the features available in the library.

## Table of Contents

1. [WebGL Context](#webgl-context)
2. [Deep Freeze Utilities](#deep-freeze-utilities)
3. [Instanced Rendering](#instanced-rendering)
4. [Frustum Culling](#frustum-culling)
5. [LOD Manager](#lod-manager)
6. [Texture Manager](#texture-manager)
7. [Sprite Atlas](#sprite-atlas)
8. [Post-Processing](#post-processing)
9. [Shader Transitions](#shader-transitions)
10. [Terrain / Elevation Sampler](#terrain--elevation-sampler)
11. [Adaptive Frame Rate](#adaptive-frame-rate)
12. [Geometry Worker](#geometry-worker)

---

## WebGL Context

Unified interface for WebGL 1.0 and 2.0 with automatic fallback.

### Basic Usage

```typescript
import { WebGLContext, createWebGLContext, wrapWebGLContext } from 'maplibre-gl-shaders';

// Create from canvas (tries WebGL 2 first, falls back to WebGL 1)
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = createWebGLContext(canvas);

if (ctx) {
  console.log(`Using WebGL ${ctx.version}`);
  console.log(`Instancing supported: ${ctx.supportsInstancing}`);
  console.log(`VAO supported: ${ctx.supportsVAO}`);
}
```

### Wrap Existing Context (MapLibre Integration)

```typescript
import { wrapWebGLContext } from 'maplibre-gl-shaders';

// In a MapLibre custom layer's onAdd method:
class MyCustomLayer {
  onAdd(map: maplibregl.Map, gl: WebGLRenderingContext) {
    const ctx = wrapWebGLContext(gl);

    // Now use unified API
    if (ctx.supportsInstancing) {
      ctx.drawArraysInstanced(gl.TRIANGLES, 0, 6, 1000);
    }
  }
}
```

### Get Capabilities

```typescript
const capabilities = ctx.getCapabilities();

console.log(`Max texture size: ${capabilities.maxTextureSize}`);
console.log(`Max vertex uniforms: ${capabilities.maxVertexUniforms}`);
console.log(`Renderer: ${capabilities.renderer}`);
console.log(`Float textures: ${capabilities.supportsFloatTextures}`);
```

### VAO Operations

```typescript
// Create and use VAO (works on WebGL 1 with extension or WebGL 2)
const vao = ctx.createVertexArray();
ctx.bindVertexArray(vao);

// Setup vertex attributes...
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(0);

ctx.bindVertexArray(null);

// Later, for drawing:
ctx.bindVertexArray(vao);
gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
ctx.bindVertexArray(null);

// Cleanup
ctx.deleteVertexArray(vao);
```

---

## Deep Freeze Utilities

Create immutable objects to prevent accidental configuration mutation.

### Freeze Configuration

```typescript
import { deepFreeze, createImmutableConfig } from 'maplibre-gl-shaders';

// Freeze a shader configuration
const config = deepFreeze({
  color: '#ff0000',
  speed: 1.0,
  nested: { value: 10 }
});

// Attempting to modify throws in strict mode
config.speed = 2.0;           // TypeError!
config.nested.value = 20;     // TypeError!
```

### Clone and Freeze

```typescript
import { deepFreezeClone } from 'maplibre-gl-shaders';

const original = { color: '#ff0000', speed: 1.0 };
const immutable = deepFreezeClone(original);

original.speed = 2.0;    // Works - original is still mutable
immutable.speed = 2.0;   // TypeError - clone is frozen
```

### Merge Configurations

```typescript
import { createImmutableConfig, mergeConfigs } from 'maplibre-gl-shaders';

const base = createImmutableConfig({ color: '#ff0000', speed: 1.0 });
const updated = mergeConfigs(base, { speed: 2.0 });

console.log(updated); // { color: '#ff0000', speed: 2.0 }
console.log(base.speed); // 1.0 (unchanged)
```

### Unfreeze for Modification

```typescript
import { createImmutableConfig, unfreeze } from 'maplibre-gl-shaders';

const frozen = createImmutableConfig({ color: '#ff0000', speed: 1.0 });

// Create mutable copy when you need to modify
const mutable = unfreeze(frozen);
mutable.speed = 2.0; // Works!

// Re-freeze when done
const newFrozen = createImmutableConfig(mutable);
```

### Check Frozen State

```typescript
import { isFrozen, isDeeplyFrozen, deepFreeze } from 'maplibre-gl-shaders';

const partial = Object.freeze({ nested: { value: 1 } });
console.log(isFrozen(partial));        // true (shallow)
console.log(isDeeplyFrozen(partial));  // false (nested not frozen)

const full = deepFreeze({ nested: { value: 1 } });
console.log(isDeeplyFrozen(full));     // true
```

---

## Instanced Rendering

Efficient batch rendering for thousands of similar objects.

### Basic Setup

```typescript
import {
  InstancedRenderer,
  createQuadGeometry,
  wrapWebGLContext
} from 'maplibre-gl-shaders';

const ctx = wrapWebGLContext(gl);

// Check support
if (!InstancedRenderer.isSupported(ctx)) {
  console.warn('Instancing not supported');
  return;
}

const renderer = new InstancedRenderer(ctx);
```

### Setup Quad Geometry

```typescript
// Create unit quad for point sprites
const { vertices, indices, layout, stride } = createQuadGeometry();
renderer.setIndexedGeometry(vertices, indices, layout, stride);
```

### Setup Instance Data

```typescript
// Per-instance data: x, y, scale, rotation
const instanceCount = 1000;
const instanceData = new Float32Array(instanceCount * 4);

for (let i = 0; i < instanceCount; i++) {
  instanceData[i * 4 + 0] = Math.random() * 2 - 1;  // x
  instanceData[i * 4 + 1] = Math.random() * 2 - 1;  // y
  instanceData[i * 4 + 2] = 0.01 + Math.random() * 0.05;  // scale
  instanceData[i * 4 + 3] = Math.random() * Math.PI * 2;  // rotation
}

renderer.setInstanceData(instanceData, {
  stride: 16, // 4 floats * 4 bytes
  attributes: [
    { name: 'a_offset', location: 2, size: 2, type: gl.FLOAT, offset: 0 },
    { name: 'a_scale', location: 3, size: 1, type: gl.FLOAT, offset: 8 },
    { name: 'a_rotation', location: 4, size: 1, type: gl.FLOAT, offset: 12 },
  ],
});

renderer.setupVAO();
```

### Draw Instances

```typescript
// In render loop
gl.useProgram(shaderProgram);
// Set uniforms...

renderer.draw(); // Draw all instances
// or
renderer.draw(500); // Draw only first 500 instances
```

### Update Instance Data

```typescript
// Update a portion of instance data (e.g., animate positions)
function animate() {
  for (let i = 0; i < instanceCount; i++) {
    instanceData[i * 4 + 3] += 0.01; // Rotate
  }
  renderer.updateInstanceData(instanceData);
}
```

### Cleanup

```typescript
renderer.dispose();
```

---

## Frustum Culling

Skip rendering features outside the visible area.

### Basic Usage

```typescript
import { FrustumCuller, type BBox2D } from 'maplibre-gl-shaders';

const culler = new FrustumCuller();

// Update frustum from camera's projection-view matrix
culler.updateFrustum(projectionViewMatrix);

// Test individual bounding box
const bbox: BBox2D = { minX: -122.5, minY: 37.7, maxX: -122.4, maxY: 37.8 };
if (culler.isVisible(bbox)) {
  renderFeature();
}
```

### Compute Bounds from GeoJSON

```typescript
// Compute bounds for a geometry
const bounds = FrustumCuller.computeBounds(feature.geometry);

// Compute bounds for multiple features
const boundsArray = FrustumCuller.computeBoundsArray(features);
```

### Bulk Culling

```typescript
// Cull many features at once
const features: GeoJSON.Feature[] = [...];
const bounds = FrustumCuller.computeBoundsArray(features);

// Get indices of visible features
const visibleIndices = culler.cullFeatures(features, bounds);

for (const i of visibleIndices) {
  renderFeature(features[i]);
}
```

### Get Culling Statistics

```typescript
const { indices, stats } = culler.cullFeaturesWithStats(features, bounds);

console.log(`Total: ${stats.total}`);
console.log(`Visible: ${stats.visible}`);
console.log(`Culled: ${stats.culled}`);
console.log(`Visibility ratio: ${(stats.ratio * 100).toFixed(1)}%`);
```

### 3D Culling

```typescript
const culler3D = new FrustumCuller(true); // Enable 3D mode

const bbox3D = {
  minX: -122.5, minY: 37.7, minZ: 0,
  maxX: -122.4, maxY: 37.8, maxZ: 100
};

if (culler3D.isVisible3D(bbox3D)) {
  renderFeature();
}
```

---

## LOD Manager

Reduce geometry complexity based on zoom level.

### Basic Usage

```typescript
import { LODManager, DEFAULT_LOD_CONFIG } from 'maplibre-gl-shaders';

const lodManager = new LODManager();

// Get LOD level for current zoom
const level = lodManager.getLODLevel(map.getZoom());

console.log(`Simplification: ${level.simplification}`);
console.log(`Max features: ${level.maxFeatures}`);
console.log(`Min vertices: ${level.minVertices}`);
```

### Apply LOD to Features

```typescript
// Apply LOD to a feature collection
const features: GeoJSON.Feature[] = [...];
const zoom = map.getZoom();

const simplified = lodManager.applyLOD(features, zoom);
// Returns limited and simplified features
```

### Simplify Individual Geometry

```typescript
const level = lodManager.getLODLevel(zoom);
const simplifiedGeometry = lodManager.simplifyGeometry(feature.geometry, level);
```

### Custom LOD Configuration

```typescript
const customLOD = new LODManager({
  enabled: true,
  levels: [
    { minZoom: 0, maxZoom: 8, simplification: 0.1, maxFeatures: 500, minVertices: 3 },
    { minZoom: 8, maxZoom: 12, simplification: 0.5, maxFeatures: 5000, minVertices: 4 },
    { minZoom: 12, maxZoom: 24, simplification: 1.0, maxFeatures: 50000, minVertices: 6 },
  ],
  defaultSimplification: 1.0,
  defaultMaxFeatures: 10000,
});
```

### Toggle LOD

```typescript
lodManager.setEnabled(false); // Disable LOD
lodManager.setEnabled(true);  // Re-enable

if (lodManager.isEnabled()) {
  // Apply simplification
}
```

---

## Texture Manager

Load and manage WebGL textures with caching.

### Load Texture from URL

```typescript
import { TextureManager } from 'maplibre-gl-shaders';

const textureManager = new TextureManager(gl);

// Load a texture
await textureManager.loadTexture('particle', '/textures/particle.png');

// Load with options
await textureManager.loadTexture('pattern', '/textures/pattern.png', {
  wrapS: gl.REPEAT,
  wrapT: gl.REPEAT,
  generateMipmaps: true,
});
```

### Bind Texture

```typescript
// Bind texture to texture unit 0
textureManager.bind('particle', 0);

// In shader: uniform sampler2D u_texture;
gl.uniform1i(uniformLocation, 0);

// Unbind when done
textureManager.unbind(0);
```

### Create from Raw Data

```typescript
// Create texture from raw pixel data
const data = new Uint8Array([
  255, 0, 0, 255,   // Red
  0, 255, 0, 255,   // Green
  0, 0, 255, 255,   // Blue
  255, 255, 0, 255, // Yellow
]);

const texture = textureManager.createFromData('colors', data, 2, 2);
```

### Create Solid Color

```typescript
// Create 1x1 solid color texture
textureManager.createSolidColor('white', [255, 255, 255, 255]);
textureManager.createSolidColor('transparent', [0, 0, 0, 0]);
```

### Cleanup

```typescript
textureManager.delete('particle'); // Delete specific texture
textureManager.clear();            // Delete all textures
textureManager.dispose();          // Full cleanup
```

---

## Sprite Atlas

Manage multiple sprites in a single texture atlas.

### Load Atlas with Manifest

```typescript
import { SpriteAtlas, TextureManager, createGridManifest } from 'maplibre-gl-shaders';

const textureManager = new TextureManager(gl);
const atlas = new SpriteAtlas(gl, textureManager);

// Load with inline manifest
await atlas.load('ui', '/textures/ui-sprites.png', {
  width: 256,
  height: 256,
  sprites: {
    'arrow': { x: 0, y: 0, width: 32, height: 32 },
    'marker': { x: 32, y: 0, width: 24, height: 32, anchorY: 1.0 },
    'circle': { x: 0, y: 32, width: 16, height: 16 },
  }
});
```

### Load from JSON Manifest

```typescript
await atlas.loadFromManifest('ui', '/textures/ui-sprites.png', '/textures/ui-sprites.json');
```

### Get Sprite UV Coordinates

```typescript
const sprite = atlas.getSprite('arrow');
if (sprite) {
  console.log(`UV: [${sprite.uv.join(', ')}]`);
  console.log(`Anchor: [${sprite.anchor.join(', ')}]`);
  console.log(`Size: ${sprite.size[0]}x${sprite.size[1]}`);
}

// Or throw if not found
const marker = atlas.getSpriteOrThrow('marker');
```

### Use in Rendering

```typescript
// Bind atlas texture
atlas.bind(0);
gl.uniform1i(textureUniform, 0);

// Get sprite UVs for shader
const sprite = atlas.getSpriteOrThrow('arrow');
gl.uniform4fv(uvUniform, sprite.uv);
```

### Create Grid-Based Manifest

```typescript
// For uniform sprite sheets
const manifest = createGridManifest(256, 256, 32, 32, [
  'sprite_0', 'sprite_1', 'sprite_2', 'sprite_3',
  'sprite_4', 'sprite_5', 'sprite_6', 'sprite_7',
  // ...
]);
```

### Generate Sprite Data for Instancing

```typescript
// Get sprite data for many sprites at once
const spriteNames = instances.map(i => i.spriteName);
const spriteData = atlas.createSpriteData(spriteNames);
// Returns Float32Array with [u0, v0, u1, v1, anchorX, anchorY] per sprite
```

---

## Post-Processing

Apply screen-space effects to rendered output.

### Setup Pipeline

```typescript
import { PostProcessingPipeline, wrapWebGLContext } from 'maplibre-gl-shaders';

const ctx = wrapWebGLContext(gl);
const pipeline = new PostProcessingPipeline(ctx);

// Initialize with viewport size
pipeline.resize(canvas.width, canvas.height);
```

### Add Built-in Effects

```typescript
// Vignette effect
pipeline.addEffect(PostProcessingPipeline.createVignette(0.5, 0.5));

// Blur effect
pipeline.addEffect(PostProcessingPipeline.createBlur(2, [1, 0]));

// Color grading
pipeline.addEffect(PostProcessingPipeline.createColorGrade({
  brightness: 1.1,
  contrast: 1.2,
  saturation: 0.9,
  tint: [1.0, 0.95, 0.9],
}));

// Sharpen
pipeline.addEffect(PostProcessingPipeline.createSharpen(0.3));
```

### Custom Effect

```typescript
pipeline.addEffect({
  name: 'grayscale',
  fragmentShader: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    uniform float u_intensity;

    void main() {
      vec4 color = texture2D(u_texture, v_texCoord);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      gl_FragColor = vec4(mix(color.rgb, vec3(gray), u_intensity), color.a);
    }
  `,
  uniforms: {
    u_intensity: 1.0,
  },
});
```

### Render with Effects

```typescript
function render() {
  pipeline.begin(); // Start capturing

  // Render your scene here
  renderScene();

  pipeline.end(); // Apply effects and present
}
```

### Control Effects

```typescript
// Enable/disable effect
pipeline.setEffectEnabled('vignette', false);

// Update effect parameters
pipeline.updateEffect('colorGrade', {
  u_brightness: 1.2,
  u_saturation: 1.1,
});

// Remove effect
pipeline.removeEffect('blur');
```

---

## Shader Transitions

Smooth transitions between shader configurations.

### Basic Transition

```typescript
import { ShaderTransition, Easing } from 'maplibre-gl-shaders';

const transition = new ShaderTransition();

// Start transition
transition.start(
  { color: '#ff0000', intensity: 0.5 },
  { color: '#00ff00', intensity: 1.0 },
  { duration: 1000, easing: Easing.easeOutCubic }
);

// In animation loop
function render(deltaTime: number) {
  transition.update(deltaTime);

  if (transition.isActive()) {
    const config = transition.getCurrentConfig();
    applyConfig(config);
  }
}
```

### Available Easing Functions

```typescript
import { Easing } from 'maplibre-gl-shaders';

Easing.linear         // Linear interpolation
Easing.easeIn         // Accelerate
Easing.easeOut        // Decelerate
Easing.easeInOut      // Accelerate then decelerate
Easing.easeInCubic    // Cubic ease in
Easing.easeOutCubic   // Cubic ease out
Easing.easeInOutCubic // Cubic ease in-out
Easing.easeInElastic  // Elastic ease in
Easing.easeOutElastic // Elastic ease out
Easing.easeOutBounce  // Bounce effect
```

### Transition with Callbacks

```typescript
transition.start(fromConfig, toConfig, {
  duration: 500,
  easing: Easing.easeInOut,
  onUpdate: (progress) => {
    console.log(`Progress: ${(progress * 100).toFixed(0)}%`);
  },
  onComplete: () => {
    console.log('Transition complete!');
  },
});
```

### Chain Multiple Transitions

```typescript
import { chainTransitions, Easing } from 'maplibre-gl-shaders';

await chainTransitions([
  { from: config1, to: config2, duration: 500 },
  { from: config2, to: config3, duration: 300, easing: Easing.easeOut },
  { from: config3, to: config4, duration: 700 },
], (currentConfig) => {
  applyConfig(currentConfig);
});
```

### Control Transitions

```typescript
// Get current state
const state = transition.getState();
console.log(`Active: ${state.active}`);
console.log(`Progress: ${state.progress}`);
console.log(`Type: ${state.type}`);

// Skip to end
transition.complete();

// Cancel transition
transition.cancel();
```

### Wipe Transition

```typescript
transition.start(fromConfig, toConfig, {
  duration: 1000,
  type: 'wipe',
  direction: Math.PI / 4, // 45 degrees
});

// In shader, use wipe position
const [x, y] = transition.getWipePosition();
```

---

## Terrain / Elevation Sampler

Sample elevation data from DEM tiles.

### Setup

```typescript
import { ElevationSampler } from 'maplibre-gl-shaders';

const sampler = new ElevationSampler(gl, {
  encoding: 'mapbox',      // 'mapbox', 'terrarium', or 'raw'
  minElevation: -500,
  maxElevation: 9000,
  tileSize: 256,
});
```

### Load Terrain Tiles

```typescript
// Load a specific tile
await sampler.loadTile(10, 512, 341,
  'https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw?access_token=YOUR_TOKEN'
);

// Load multiple tiles for an area
const tiles = getTilesForBounds(bounds, zoom);
await Promise.all(tiles.map(t =>
  sampler.loadTile(t.z, t.x, t.y, urlTemplate)
));
```

### Sample Elevation

```typescript
// Get elevation at a point (in meters)
const elevation = sampler.sampleElevation(-122.4194, 37.7749);
console.log(`Elevation: ${elevation}m`);

// Get normalized elevation (0-1)
const normalized = sampler.getElevationNormalized(-122.4194, 37.7749);
```

### Use in Shader

```typescript
// Upload elevation tile to texture
sampler.uploadToTexture(longitude, latitude);

// Bind texture
sampler.bind(1); // Texture unit 1
gl.uniform1i(elevationUniform, 1);

// Get uniforms for shader
const uniforms = sampler.getUniforms(longitude, latitude);
gl.uniform1f(minElevUniform, uniforms.u_elevationMin);
gl.uniform1f(maxElevUniform, uniforms.u_elevationMax);
```

### Cache Management

```typescript
// Set max cached tiles
sampler.setMaxTiles(100);

// Clear cache
sampler.clearCache();

// Check cache status
console.log(`Cached tiles: ${sampler.getTileCount()}`);
```

---

## Adaptive Frame Rate

Automatically adjust quality based on performance.

### Setup

```typescript
import { AdaptiveFrameRate, DEFAULT_QUALITY_LEVELS } from 'maplibre-gl-shaders';

const afr = new AdaptiveFrameRate({
  targetFPS: 60,
  minFPS: 30,
  sampleSize: 30,              // Frames to average
  adjustmentCooldown: 1000,    // ms between changes
  increaseThreshold: 5,        // FPS above target to increase quality
  decreaseThreshold: 10,       // FPS below target to decrease quality
});
```

### Use in Render Loop

```typescript
function render() {
  const frameStart = performance.now();

  // Get current quality settings
  const quality = afr.getCurrentQuality();

  // Apply quality settings to your rendering
  lodManager.setSimplification(quality.lodSimplification);
  postProcessing.setEnabled(quality.enablePostProcessing);
  setMaxFeatures(quality.maxFeatures);

  // ... render scene ...

  // Record frame time
  afr.recordFrame(performance.now() - frameStart);

  requestAnimationFrame(render);
}
```

### Quality Change Callback

```typescript
afr.onQualityChange = (level, index) => {
  console.log(`Quality changed to: ${level.name} (${index})`);
  updateUI(level);
};
```

### Get Statistics

```typescript
const stats = afr.getStats();
console.log(`FPS: ${stats.fps.toFixed(1)}`);
console.log(`Avg frame time: ${stats.avgFrameTime.toFixed(2)}ms`);
console.log(`Quality: ${stats.qualityName}`);
console.log(`Dropped frames: ${stats.droppedFrames}`);
```

### Manual Control

```typescript
// Manually set quality level (0 = lowest, 4 = highest with default levels)
afr.setQualityLevel(2);

// Disable automatic adjustment
afr.setEnabled(false);

// Get current quality factor (0-1)
const qualityFactor = afr.getRecommendedQuality();
```

### Custom Quality Levels

```typescript
const customAFR = new AdaptiveFrameRate({
  targetFPS: 60,
  qualityLevels: [
    {
      name: 'Potato',
      quality: 0.1,
      lodSimplification: 0.1,
      maxFeatures: 100,
      enablePostProcessing: false,
      shadowQuality: 0,
    },
    {
      name: 'Normal',
      quality: 0.5,
      lodSimplification: 0.5,
      maxFeatures: 10000,
      enablePostProcessing: true,
      shadowQuality: 0.5,
    },
    {
      name: 'Epic',
      quality: 1.0,
      lodSimplification: 1.0,
      maxFeatures: 100000,
      enablePostProcessing: true,
      shadowQuality: 1.0,
    },
  ],
});
```

---

## Geometry Worker

Process geometry off the main thread using Web Workers.

### Setup

```typescript
import { GeometryWorker } from 'maplibre-gl-shaders';

const worker = new GeometryWorker({ timeout: 30000 });

// Check if workers are supported
if (!GeometryWorker.isSupported()) {
  console.warn('Workers not supported, using main thread');
}

// Initialize (creates inline worker)
await worker.initialize();

// Or with custom worker URL
await worker.initialize('/workers/geometry-worker.js');
```

### Process Geometry

```typescript
const features: GeoJSON.Feature[] = [...];

const result = await worker.processGeometry(features, {
  simplification: 0.5,
  computeBounds: true,
  generateBuffers: true,
  stride: 12,
});

console.log(`Features: ${result.featureCount}`);
console.log(`Vertices: ${result.vertexCount}`);

// Use generated buffers
gl.bufferData(gl.ARRAY_BUFFER, result.vertices, gl.STATIC_DRAW);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, result.indices, gl.STATIC_DRAW);
```

### Simplify Geometry

```typescript
// Simplify features using Douglas-Peucker algorithm
const simplified = await worker.simplify(features, 0.0001);
```

### Compute Bounds

```typescript
// Compute bounding boxes for all features
const bounds = await worker.computeBounds(features);

// Each bound: { minX, minY, maxX, maxY }
```

### Generate Vertex Buffers

```typescript
const buffers = await worker.generateBuffers(features, 12);
// buffers.vertices: Float32Array
// buffers.indices: Uint16Array
// buffers.vertexCount: number
```

### Error Handling

```typescript
worker.onError = (error) => {
  console.error('Worker error:', error);
};

try {
  const result = await worker.processGeometry(features, options);
} catch (error) {
  console.error('Processing failed:', error);
}
```

### Monitor Worker State

```typescript
// Check if worker is busy
if (worker.isBusy()) {
  console.log(`${worker.getPendingCount()} requests pending`);
}
```

### Cleanup

```typescript
worker.terminate(); // Stop worker
worker.dispose();   // Full cleanup
```

---

## Full Integration Example

Here's how to use multiple features together:

```typescript
import {
  wrapWebGLContext,
  AdaptiveFrameRate,
  FrustumCuller,
  LODManager,
  PostProcessingPipeline,
  InstancedRenderer,
  createQuadGeometry,
  GeometryWorker,
} from 'maplibre-gl-shaders';

class OptimizedRenderer {
  private ctx: IWebGLContext;
  private afr: AdaptiveFrameRate;
  private culler: FrustumCuller;
  private lod: LODManager;
  private postProcess: PostProcessingPipeline;
  private renderer: InstancedRenderer;
  private worker: GeometryWorker;

  async init(gl: WebGLRenderingContext) {
    this.ctx = wrapWebGLContext(gl);

    // Setup components
    this.afr = new AdaptiveFrameRate({ targetFPS: 60 });
    this.culler = new FrustumCuller();
    this.lod = new LODManager();
    this.postProcess = new PostProcessingPipeline(this.ctx);
    this.renderer = new InstancedRenderer(this.ctx);
    this.worker = new GeometryWorker();

    await this.worker.initialize();

    // Setup geometry
    const { vertices, indices, layout, stride } = createQuadGeometry();
    this.renderer.setIndexedGeometry(vertices, indices, layout, stride);

    // Add post-processing
    this.postProcess.addEffect(PostProcessingPipeline.createVignette(0.3));
  }

  async render(features: GeoJSON.Feature[], matrix: Float32Array, zoom: number) {
    const frameStart = performance.now();

    // Get quality settings
    const quality = this.afr.getCurrentQuality();

    // Update frustum
    this.culler.updateFrustum(matrix);

    // Compute bounds (on worker)
    const bounds = await this.worker.computeBounds(features);

    // Cull features
    const { indices, stats } = this.culler.cullFeaturesWithStats(features, bounds);
    const visibleFeatures = indices.map(i => features[i]);

    // Apply LOD
    const simplified = this.lod.applyLOD(visibleFeatures, zoom);
    const limited = simplified.slice(0, quality.maxFeatures);

    // Render
    if (quality.enablePostProcessing) {
      this.postProcess.begin();
    }

    // ... render limited features ...

    if (quality.enablePostProcessing) {
      this.postProcess.end();
    }

    // Record frame
    this.afr.recordFrame(performance.now() - frameStart);
  }

  dispose() {
    this.postProcess.dispose();
    this.renderer.dispose();
    this.worker.dispose();
  }
}
```

---

## API Reference

For complete API documentation, see the TypeScript type definitions in the source code or generate documentation using:

```bash
npm run docs
```

This will generate API documentation in the `docs/api` directory.
