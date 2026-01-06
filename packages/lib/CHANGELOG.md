# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-05

### ⚠️ BREAKING CHANGES

- move shaders into plugins, remove registerAllShaders ([3283ccb])

### Added

- add core infrastructure modules ([7cd8210])
- **shaders:** introduce new sci-fi shaders including Holographic Grid, Neon, and Radar ([22c7025])
- enhance documentation and architecture for shader plugin system ([7156c86])
- add package.json files for temporary Vite dependencies and update logging in ShaderManager, PluginManager, and WebGL utilities ([dfde12e])
- add thematic shader plugins for modular loading ([ce2fad1])
- add plugin system for custom shader extensions ([f979b23])
- add data-driven color and intensity support to polygon shaders ([2c03daa])
- add per-feature interactive animation support to PointShaderLayer and PolygonShaderLayer ([da32696])
- **animation:** add per-feature time offset for animation desynchronization ([8b5eba4])
- implement stacked effects system with dynamic configuration ([2f5a12e])
- implement mobile navigation and overlay for improved user experience ([7734720])
- complete project and prepare for npm publication ([1b1c3f0])
- add changelog, contributing guide, license, and README; implement TypeScript documentation and testing configuration ([a64fb17])
- **demo:** add interactive shader demo with MapLibre GL integration ([4313304])
- **core:** implement Phase 0 infrastructure for MapLibre shader library ([f38d003])
- Add comprehensive architecture documentation for MapLibre Animated Shaders Library ([a79c3e0])

### Changed

- update ARCHITECTURE.md with core/ module structure ([e5bb08e])
- extract ShaderManager into modular core components ([dce91d1])
- add comprehensive project documentation ([3b9b6bc])
- add architecture analysis and recommendations ([2f8aa89])
- disable dependabot temporarily ([3164661])
- remove unused doc ([7df9925])
- implement object pooling to reduce GC pressure ([a5620e7])
- add E2E testing to CHANGELOG and include audit report ([1d25216])
- add E2E testing with Playwright ([a073d7a])
- update CHANGELOG with recent fixes and improvements ([aa93726])
- reduce duplication and improve code quality ([5eb278a])

### Fixed

- update e2e tests to use namespaced shader names and add visual regression baselines ([5ad44d8])
- update e2e test app to use plugin system ([dfb409a])
- improve reliability and add WebGL capability detection ([142d801])
- update tests for data-driven buffers and clean up package metadata ([bff9604])
