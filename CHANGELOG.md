# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Developer Experience
- **WebGL Capability Detection** - `detectWebGLCapabilities()` and `checkMinimumRequirements()` functions to detect browser WebGL support before initialization
- **GLSL Uniform Extractor** - `extractUniforms()` and `validateUniforms()` functions to parse GLSL code and extract uniform declarations
- **Configuration Helpers** - Type-safe `getConfigNumber()`, `getConfigString()`, `getConfigBoolean()` utilities for accessing shader config values
- **Throttle/Debounce Utilities** - `throttle()` and `debounce()` functions for rate limiting
- New `checkCapabilities` option in `ShaderManagerOptions` to enable/disable WebGL capability checks

### Changed

#### Performance Improvements
- Throttled `sourcedata` event handlers in PointShaderLayer, LineShaderLayer, and PolygonShaderLayer (max 10 updates/second)
- Replaced `setTimeout` delays with proper MapLibre event handling (`isSourceLoaded()` + `idle` event)

#### Code Quality
- Refactored ShaderManager: consolidated 4 duplicate register methods into single generic `registerWebGLShader()` method (~88 lines removed)
- Replaced unsafe `Record<string, unknown>` casts with type-safe config helper functions
- Added geometry configuration map for cleaner shader registration logic

### Fixed
- Fixed 2 failing tests in `layers.test.ts` (buffer count expectations updated from 2 to 3 for dataDriven buffer)
- Fixed WebGL validation warnings in tests by adding `VALIDATE_STATUS` constant to mock context
- Completed package.json metadata (author, homepage, bugs URL)
- Removed deprecated `removeShader()` function from public API

### Added

#### Interactive Animation Control (Phase 3)
- **FeatureAnimationStateManager** - Per-feature animation state management with dirty tracking
- **FeatureInteractionHandler** - MapLibre click/hover event handling for animation control
- Support for per-feature animation control via `perFeatureControl: true`
- Interaction actions: `toggle`, `play`, `pause`, `reset`, `playOnce`
- Custom interaction handlers with access to feature and animation state
- `InteractiveShaderController` interface with extended methods:
  - `playFeature(id)`, `pauseFeature(id)`, `toggleFeature(id)`, `resetFeature(id)`
  - `getFeatureState(id)` - Get animation state for a specific feature
  - `playAll()`, `pauseAll()`, `resetAll()` - Bulk control
- Hover interaction support with `onHover.enter` and `onHover.leave`
- Configurable feature ID property via `featureIdProperty`
- GPU buffer optimization with dirty tracking for minimal updates
- New shader attributes: `a_isPlaying`, `a_localTime`
- New varying: `v_effectiveTime` for per-feature animation timing

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
- Updated all ShaderLayers (Point, Line, Polygon) to support data-driven properties and interactive control
- Enhanced vertex shaders with data-driven attribute support and per-feature animation attributes
- Updated all 21 fragment shaders to use `v_effectiveTime` for per-feature animation timing
- Extended `applyShader()` to return `InteractiveShaderController` when `perFeatureControl` is enabled

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
