# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Data-Driven Expressions (Phase 2)
- **ExpressionEvaluator** - Wrapper around MapLibre's expression system for data-driven shader properties
- **FeatureDataBuffer** - GPU buffer manager for per-feature attribute data
- Support for MapLibre-style expressions in shader configuration:
  - `['get', 'property']` - Read property from GeoJSON feature
  - `['match', ...]` - Conditional value mapping
  - `['interpolate', ...]` - Numeric interpolation
  - `['coalesce', ...]` - Fallback values
  - All other MapLibre expressions via `@maplibre/maplibre-gl-style-spec`
- Data-driven `color` and `intensity` properties for all shader types (Point, Line, Polygon)
- Per-vertex color and intensity attributes in vertex shaders

#### Animation Timing (Phase 1)
- **TimeOffsetCalculator** - Calculate per-feature time offsets for animation variety
- Support for multiple offset modes:
  - Fixed offset (`timeOffset: 0.5`)
  - Random offset (`timeOffset: 'random'`)
  - Property-based (`timeOffset: ['get', 'delay']`)
  - Hash-based stable offset (`timeOffset: ['hash', 'id']`)
  - Range-based (`timeOffset: { min: 0, max: 2 }`)
- `a_timeOffset` vertex attribute and `v_timeOffset` varying in all shaders

### Changed
- Moved `@maplibre/maplibre-gl-style-spec` from devDependencies to dependencies
- Updated all ShaderLayers (Point, Line, Polygon) to support data-driven properties
- Enhanced vertex shaders with data-driven attribute support

---

## [1.0.0] - 2024-12-28

### Added

#### Core Infrastructure
- `ShaderManager` class for managing shader lifecycle
- `AnimationLoop` for optimized requestAnimationFrame handling
- `ShaderRegistry` for shader registration and lookup
- `ConfigResolver` for configuration validation and merging
- Full TypeScript support with comprehensive type definitions

#### Point Shaders (6)
- `pulse` - Expanding concentric rings from point center
- `heartbeat` - Rhythmic size pulsation with easing
- `radar` - Rotating sweep arc with trail effect
- `particleBurst` - Particles emanating from center
- `glow` - Luminous halo with variable intensity
- `morphingShapes` - Fluid transitions between geometric shapes

#### Line Shaders (7)
- `flow` - Animated dashes flowing along the line
- `gradientTravel` - Moving color gradient along path
- `electric` - Sinusoidal plasma/electric distortion
- `trailFade` - Decreasing opacity trail effect
- `breathing` - Rhythmically pulsing line width
- `snake` - Colored segment progressing along path
- `neon` - Neon glow effect with flicker

#### Polygon Shaders (8)
- `scanLines` - Scanning horizontal/vertical lines
- `ripple` - Ripples expanding from centroid
- `hatching` - Animated hatch pattern
- `fillWave` - Progressive liquid fill effect
- `noise` - Animated Simplex/Perlin noise texture
- `marchingAnts` - Animated dotted border (selection style)
- `gradientRotation` - Rotating radial/linear/conic gradient
- `dissolve` - Dissolution appear/disappear effect

#### Global Shaders (5)
- `heatShimmer` - Heat distortion effect
- `dayNightCycle` - Day/night lighting variation
- `depthFog` - Animated fog based on zoom level
- `weather` - Rain/snow/leaves particle effects
- `holographicGrid` - Pulsing sci-fi grid overlay

#### GLSL Utilities
- `noise.glsl` - Simplex 2D/3D and Perlin noise functions
- `easing.glsl` - Complete set of easing functions
- `shapes.glsl` - SDF primitives (circle, square, triangle)
- `colors.glsl` - HSL/RGB conversion and blend modes

#### Demo Site
- Interactive playground with all 26 shaders
- Real-time configuration panel
- Code snippet generator
- Performance monitoring (FPS, GPU metrics)
- Dark theme optimized for maps
- GeoJSON demo data (points, lines, polygons)

### Technical Details
- ESM and CommonJS dual build
- Tree-shakeable exports
- WebGL 2.0 based rendering
- MapLibre GL JS 3.0+ support
- Zero runtime dependencies

## [0.1.0] - 2024-12-15

### Added
- Initial project setup
- Basic infrastructure (ShaderManager, AnimationLoop)
- First shader implementation (pulse)
- Demo site foundation
