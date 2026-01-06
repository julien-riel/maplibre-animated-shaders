# MapLibre GL Compatibility

This document explains how the library maintains compatibility across MapLibre GL versions 3.x, 4.x, and 5.x.

## Breaking Change in MapLibre 5.0

MapLibre 5.0 introduced a breaking change to the `CustomLayerInterface.render()` method signature:

### Before (MapLibre 3.x/4.x)
```typescript
render(gl: WebGLRenderingContext, matrix: mat4): void
```

### After (MapLibre 5.x)
```typescript
render(gl: WebGLRenderingContext, options: CustomRenderMethodInput): void

interface CustomRenderMethodInput {
  farZ: number;
  nearZ: number;
  fov: number;
  modelViewProjectionMatrix: Float32Array;
  projectionMatrix: Float32Array;
  // ...
}
```

## Our Solution

### 1. Runtime Detection

We use a helper function `extractMatrix()` that detects the format at runtime:

```typescript
// packages/lib/src/types/core.ts
export function extractMatrix(matrixOrOptions: RenderMatrixOrOptions): Float32Array | number[] {
  // MapLibre 5.x passes an options object with modelViewProjectionMatrix
  if (
    matrixOrOptions !== null &&
    typeof matrixOrOptions === 'object' &&
    'modelViewProjectionMatrix' in matrixOrOptions
  ) {
    return matrixOrOptions.modelViewProjectionMatrix;
  }
  // MapLibre 3.x/4.x passes the matrix directly
  return matrixOrOptions as Float32Array | number[];
}
```

### 2. Type Definitions

We define types that accommodate both signatures:

```typescript
// packages/lib/src/types/core.ts
export interface CustomRenderMethodInput {
  farZ: number;
  nearZ: number;
  fov: number;
  modelViewProjectionMatrix: Float32Array | number[];
  projectionMatrix: Float32Array | number[];
  [key: string]: unknown;
}

export type RenderMatrixOrOptions = Float32Array | number[] | CustomRenderMethodInput;
```

### 3. Class Implementation

Our layer classes (`BaseShaderLayer`, `GlobalShaderLayer`) do NOT use `implements CustomLayerInterface` because the TypeScript types differ between MapLibre versions. Instead:

- The classes implement all required properties and methods
- Type casting is done when adding layers to the map in `ShaderRegistration.ts`

```typescript
// packages/lib/src/core/ShaderRegistration.ts
state.map.addLayer(customLayer as unknown as CustomLayerInterface, layerId);
```

## CI Testing

The `.github/workflows/maplibre-compat.yml` workflow tests against multiple MapLibre versions:

- 3.6.0 (minimum supported)
- 4.0.0
- 4.5.0
- 5.0.0
- latest

## Maintenance Notes

### When MapLibre Releases a New Major Version

1. Add the new version to the test matrix in `.github/workflows/maplibre-compat.yml`
2. Check if the `CustomLayerInterface` signature changed
3. If changed, update `CustomRenderMethodInput` and `extractMatrix()` in `packages/lib/src/types/core.ts`
4. Run the compatibility tests locally: `npm run build && node test-import.mjs`

### Files to Update for Render Signature Changes

- `packages/lib/src/types/core.ts` - Type definitions and `extractMatrix()`
- `packages/lib/src/types/index.ts` - Type exports
- `packages/lib/src/layers/BaseShaderLayer.ts` - Base render method
- `packages/lib/src/layers/GlobalShaderLayer.ts` - Global layer render method
- `packages/lib/src/core/ShaderRegistration.ts` - Type casting when adding layers

### Minimum Supported Version

The library requires MapLibre GL >= 3.0.0 as specified in `packages/lib/package.json`:

```json
{
  "peerDependencies": {
    "maplibre-gl": ">=3.0.0"
  }
}
```
