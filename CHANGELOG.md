# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
