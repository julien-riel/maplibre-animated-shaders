# Plugin Development Guide

This guide explains how to create custom shader plugins for `maplibre-animated-shaders`.

## Table of Contents

- [Overview](#overview)
- [Plugin Structure](#plugin-structure)
- [Creating Your First Plugin](#creating-your-first-plugin)
- [Writing Shaders](#writing-shaders)
- [Configuration Schema](#configuration-schema)
- [Presets](#presets)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Best Practices](#best-practices)
- [Publishing Your Plugin](#publishing-your-plugin)
- [Examples](#examples)

---

## Overview

A plugin is a collection of related shaders bundled together with metadata, configuration presets, and optional lifecycle hooks. Plugins enable:

- **Modular distribution** - Share shader collections via npm
- **Namespace isolation** - Avoid naming conflicts between plugins
- **Presets** - Provide ready-to-use configurations
- **Lifecycle control** - Hook into registration/unregistration events

### Built-in Plugins

The library includes 5 built-in plugins organized by theme:

| Plugin | Shaders | Use Case |
|--------|---------|----------|
| `datavizPlugin` | 7 | Data visualization, alerts, progress |
| `atmosphericPlugin` | 6 | Weather, fog, environmental effects |
| `scifiPlugin` | 5 | Futuristic, cyberpunk aesthetics |
| `organicPlugin` | 8 | Natural, living, breathing effects |
| `corePlugin` | 26 | All shaders bundled together |

---

## Plugin Structure

A plugin implements the `ShaderPlugin` interface:

```typescript
interface ShaderPlugin {
  // Required metadata
  name: string;           // Unique identifier (no colons allowed)
  version: string;        // Semantic version (e.g., "1.0.0")
  shaders: ShaderDefinition[];  // Array of shader definitions

  // Optional metadata
  author?: string;
  description?: string;
  license?: string;
  homepage?: string;

  // Optional features
  presets?: Record<string, ShaderPreset>;
  useNamespace?: boolean;  // Default: true

  // Optional lifecycle hooks
  onRegister?: (manager: IShaderManager) => void;
  onUnregister?: (manager: IShaderManager) => void;
  onBeforeApply?: (layerId: string, shaderName: string, config: ShaderConfig) => ShaderConfig | void;
  onAfterApply?: (layerId: string, shaderName: string, config: ShaderConfig) => void;
}
```

---

## Creating Your First Plugin

### Step 1: Set Up Your Project

```bash
mkdir maplibre-shader-plugin-awesome
cd maplibre-shader-plugin-awesome
npm init -y
npm install maplibre-animated-shaders maplibre-gl
npm install -D typescript
```

### Step 2: Create the Plugin File

```typescript
// src/index.ts
import type { ShaderPlugin, ShaderDefinition } from 'maplibre-animated-shaders';

// Define your shader
const awesomeGlowShader: ShaderDefinition = {
  name: 'awesome-glow',
  displayName: 'Awesome Glow',
  description: 'A beautiful glowing effect',
  geometry: 'point',
  tags: ['glow', 'effect', 'point'],

  fragmentShader: `
    precision mediump float;

    uniform float u_time;
    uniform float u_intensity;
    uniform vec3 u_color;

    varying vec2 v_position;

    void main() {
      float dist = length(v_position);
      float glow = exp(-dist * 3.0) * u_intensity;
      glow *= 0.5 + 0.5 * sin(u_time * 2.0);

      gl_FragColor = vec4(u_color * glow, glow);
    }
  `,

  defaultConfig: {
    speed: 1.0,
    intensity: 1.0,
    color: '#00ffff',
  },

  configSchema: {
    speed: {
      type: 'number',
      default: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      label: 'Animation Speed',
    },
    intensity: {
      type: 'number',
      default: 1.0,
      min: 0.1,
      max: 3.0,
      step: 0.1,
      label: 'Glow Intensity',
    },
    color: {
      type: 'color',
      default: '#00ffff',
      label: 'Glow Color',
    },
  },

  getUniforms: (config, time) => ({
    u_time: time * (config.speed ?? 1.0),
    u_intensity: config.intensity ?? 1.0,
    u_color: hexToRgb(config.color as string),
  }),
};

// Helper function
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [1, 1, 1];
}

// Create the plugin
export const awesomePlugin: ShaderPlugin = {
  name: 'awesome',
  version: '1.0.0',
  author: 'Your Name',
  description: 'Awesome shader effects for MapLibre',

  shaders: [awesomeGlowShader],

  presets: {
    'cyan-pulse': {
      shader: 'awesome-glow',
      config: { color: '#00ffff', intensity: 1.5, speed: 1.0 },
    },
    'fire': {
      shader: 'awesome-glow',
      config: { color: '#ff4400', intensity: 2.0, speed: 2.0 },
    },
  },
};

export default awesomePlugin;
```

### Step 3: Use Your Plugin

```typescript
import { createShaderManager } from 'maplibre-animated-shaders';
import { awesomePlugin } from 'maplibre-shader-plugin-awesome';

const manager = createShaderManager(map);
manager.use(awesomePlugin);

// Use with namespace
manager.register('my-layer', 'awesome:awesome-glow', { color: '#ff00ff' });

// Or use a preset
const preset = manager.getPreset('awesome', 'fire');
manager.register('my-layer', 'awesome:awesome-glow', preset?.config);
```

---

## Writing Shaders

### Shader Definition Structure

```typescript
interface ShaderDefinition {
  // Identity
  name: string;              // Unique name within the plugin
  displayName: string;       // Human-readable name
  description: string;       // What the shader does
  geometry: GeometryType;    // 'point' | 'line' | 'polygon' | 'global'
  tags: string[];            // For categorization

  // GLSL Code
  fragmentShader: string;    // Required: fragment shader code
  vertexShader?: string;     // Optional: custom vertex shader

  // Configuration
  defaultConfig: ShaderConfig;
  configSchema: ConfigSchema;

  // Uniforms
  getUniforms: (config: ShaderConfig, time: number, deltaTime: number) => Uniforms;

  // Optional MapLibre properties
  requiredPaint?: Record<string, unknown>;
  requiredLayout?: Record<string, unknown>;
}
```

### Geometry Types

| Type | Description | Use Case |
|------|-------------|----------|
| `point` | Circle/marker layers | Pulsing markers, glowing points |
| `line` | Line layers | Flowing dashes, electric effects |
| `polygon` | Fill layers | Ripples, scanning patterns |
| `global` | Full-screen overlay | Weather, fog, color grading |

### Available Uniforms

Your fragment shader receives these built-in uniforms:

```glsl
uniform float u_time;        // Current animation time (seconds)
uniform float u_speed;       // Animation speed multiplier
uniform vec2 u_resolution;   // Viewport size in pixels
uniform float u_zoom;        // Current map zoom level

// For geometry-based shaders:
varying vec2 v_position;     // Normalized position (-1 to 1)
varying vec2 v_texCoord;     // Texture coordinates (0 to 1)

// For data-driven properties:
varying vec4 v_color;        // Per-feature color
varying float v_intensity;   // Per-feature intensity

// For per-feature animation:
varying float v_timeOffset;  // Per-feature time offset
varying float v_isPlaying;   // Per-feature play state (0 or 1)
varying float v_localTime;   // Per-feature local time
```

### Fragment Shader Template

```glsl
precision mediump float;

// Built-in uniforms
uniform float u_time;
uniform float u_speed;
uniform vec2 u_resolution;

// Custom uniforms (from getUniforms)
uniform float u_intensity;
uniform vec3 u_color;

// Varyings from vertex shader
varying vec2 v_position;

void main() {
  // Your effect logic here
  float effect = /* ... */;

  // Output color with alpha
  gl_FragColor = vec4(u_color * effect, effect);
}
```

### Using GLSL Utilities

The library provides reusable GLSL functions:

```typescript
import { noiseGLSL, easingGLSL, shapesGLSL, colorsGLSL } from 'maplibre-animated-shaders';

const myShader: ShaderDefinition = {
  fragmentShader: `
    precision mediump float;

    ${noiseGLSL}    // Simplex/Perlin noise functions
    ${easingGLSL}   // Easing functions (easeInOut, etc.)
    ${shapesGLSL}   // SDF shapes (circle, square, etc.)
    ${colorsGLSL}   // Color utilities (hsl2rgb, etc.)

    uniform float u_time;
    varying vec2 v_position;

    void main() {
      float n = snoise(v_position * 5.0 + u_time);
      gl_FragColor = vec4(vec3(n), 1.0);
    }
  `,
  // ...
};
```

---

## Configuration Schema

Define user-configurable parameters with validation:

```typescript
configSchema: {
  speed: {
    type: 'number',
    default: 1.0,
    min: 0.1,
    max: 10.0,
    step: 0.1,
    label: 'Speed',
    description: 'Animation speed multiplier',
  },
  color: {
    type: 'color',
    default: '#ffffff',
    label: 'Color',
  },
  enabled: {
    type: 'boolean',
    default: true,
    label: 'Enabled',
  },
  mode: {
    type: 'select',
    default: 'normal',
    options: ['normal', 'additive', 'multiply'],
    label: 'Blend Mode',
  },
  rings: {
    type: 'number',
    default: 3,
    min: 1,
    max: 10,
    step: 1,
    label: 'Number of Rings',
  },
}
```

### Supported Types

| Type | Description | Additional Properties |
|------|-------------|----------------------|
| `number` | Numeric value | `min`, `max`, `step` |
| `color` | Hex color string | - |
| `boolean` | True/false | - |
| `string` | Text value | - |
| `select` | Dropdown | `options: string[]` |
| `array` | Array of values | - |

---

## Presets

Presets are pre-configured shader settings for common use cases:

```typescript
presets: {
  'alert-critical': {
    shader: 'pulse',  // References shader by name
    config: {
      color: '#ff0000',
      speed: 2.0,
      intensity: 1.5,
      rings: 3,
    },
  },
  'calm-water': {
    shader: 'ripple',
    config: {
      color: '#0066cc',
      speed: 0.5,
      intensity: 0.8,
    },
  },
}
```

### Using Presets

```typescript
// Get preset configuration
const preset = manager.pluginManager.getPreset('my-plugin', 'alert-critical');

if (preset) {
  manager.register('alerts', `my-plugin:${preset.shader}`, preset.config);
}

// Or list all available presets
const allPresets = manager.pluginManager.getAllPresets();
// Returns: [{ plugin: 'my-plugin', preset: 'alert-critical', shader: 'pulse' }, ...]
```

---

## Lifecycle Hooks

Hooks allow you to execute code at specific moments:

```typescript
const myPlugin: ShaderPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  shaders: [...],

  onRegister: (manager) => {
    console.log('Plugin registered!');
    // Initialize resources, set up event listeners, etc.
  },

  onUnregister: (manager) => {
    console.log('Plugin unregistered!');
    // Clean up resources
  },

  onBeforeApply: (layerId, shaderName, config) => {
    console.log(`Applying ${shaderName} to ${layerId}`);

    // Optionally modify config before applying
    return {
      ...config,
      intensity: Math.min(config.intensity ?? 1, 2.0), // Cap intensity
    };
  },

  onAfterApply: (layerId, shaderName, config) => {
    console.log(`Applied ${shaderName} to ${layerId}`);
    // Track analytics, update UI, etc.
  },
};
```

---

## Best Practices

### 1. Naming Conventions

```typescript
// Plugin name: lowercase, no colons
name: 'weather-effects'  // ✓
name: 'Weather:Effects'  // ✗

// Shader names: kebab-case
name: 'heavy-rain'      // ✓
name: 'heavyRain'       // Works but less consistent

// Preset names: descriptive kebab-case
'storm-warning'         // ✓
'preset1'               // ✗ Not descriptive
```

### 2. Performance

```glsl
// ✓ Good: Simple math operations
float glow = exp(-dist * 3.0);

// ✗ Avoid: Complex loops in fragment shader
for (int i = 0; i < 100; i++) { /* ... */ }

// ✓ Good: Use built-in functions
float s = smoothstep(0.0, 1.0, x);

// ✗ Avoid: Manual implementations of built-ins
float s = x * x * (3.0 - 2.0 * x);  // Use smoothstep instead
```

### 3. Configuration Validation

```typescript
getUniforms: (config, time) => {
  // Provide defaults for all values
  const speed = config.speed ?? 1.0;
  const intensity = Math.max(0, Math.min(config.intensity ?? 1.0, 5.0));

  return {
    u_time: time * speed,
    u_intensity: intensity,
  };
},
```

### 4. Documentation

```typescript
const myShader: ShaderDefinition = {
  name: 'my-effect',
  displayName: 'My Effect',
  description: `
    Creates a pulsing glow effect around points.

    Best used for:
    - Alert indicators
    - Selected items
    - Active status markers

    Performance: Low impact (simple math)
  `,
  // ...
};
```

### 5. Semantic Versioning

Follow [semver](https://semver.org/) for your plugin version:

- `1.0.0` → `1.0.1`: Bug fixes
- `1.0.0` → `1.1.0`: New shaders/presets (backwards compatible)
- `1.0.0` → `2.0.0`: Breaking changes (renamed shaders, changed configs)

---

## Publishing Your Plugin

### 1. Package Structure

```
maplibre-shader-plugin-awesome/
├── src/
│   ├── index.ts          # Main export
│   └── shaders/
│       ├── glow.ts
│       └── pulse.ts
├── dist/                  # Built files
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

### 2. Package.json

```json
{
  "name": "maplibre-shader-plugin-awesome",
  "version": "1.0.0",
  "description": "Awesome shader effects for MapLibre",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "keywords": [
    "maplibre",
    "maplibre-gl",
    "shader",
    "webgl",
    "animation"
  ],
  "peerDependencies": {
    "maplibre-animated-shaders": "^1.0.0",
    "maplibre-gl": "^3.0.0"
  },
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/you/maplibre-shader-plugin-awesome"
  }
}
```

### 3. README Template

````markdown
# maplibre-shader-plugin-awesome

Awesome shader effects for MapLibre GL JS.

## Installation

```bash
npm install maplibre-shader-plugin-awesome
```

## Usage

```typescript
import { createShaderManager } from 'maplibre-animated-shaders';
import { awesomePlugin } from 'maplibre-shader-plugin-awesome';

const manager = createShaderManager(map);
manager.use(awesomePlugin);

manager.register('my-layer', 'awesome:glow', {
  color: '#00ffff',
  intensity: 1.5,
});
```

## Available Shaders

| Shader | Geometry | Description |
|--------|----------|-------------|
| `glow` | point | Glowing effect |
| `pulse` | point | Pulsing rings |

## Presets

- `cyan-pulse` - Cyan pulsing glow
- `fire` - Orange fire effect

## License

MIT
```
````

### 4. Publish

```bash
npm run build
npm publish
```

---

## Examples

### Weather Plugin Example

```typescript
import type { ShaderPlugin } from 'maplibre-animated-shaders';

export const weatherPlugin: ShaderPlugin = {
  name: 'weather',
  version: '1.0.0',
  author: 'Weather Effects Team',
  description: 'Realistic weather effects for maps',

  shaders: [
    rainShader,
    snowShader,
    fogShader,
    lightningShader,
  ],

  presets: {
    'light-rain': { shader: 'rain', config: { intensity: 0.3, speed: 1.0 } },
    'heavy-rain': { shader: 'rain', config: { intensity: 1.0, speed: 1.5 } },
    'blizzard': { shader: 'snow', config: { intensity: 1.0, windSpeed: 2.0 } },
    'morning-fog': { shader: 'fog', config: { density: 0.3, color: '#ffffff' } },
  },

  onRegister: (manager) => {
    console.log('Weather plugin ready');
  },
};
```

### Gaming Plugin Example

```typescript
export const gamingPlugin: ShaderPlugin = {
  name: 'gaming',
  version: '1.0.0',
  description: 'Game-style visual effects',

  shaders: [
    healthBarShader,
    damageFlashShader,
    selectionRingShader,
    minimapPingShader,
  ],

  presets: {
    'low-health': { shader: 'health-bar', config: { percentage: 0.2, color: '#ff0000' } },
    'full-health': { shader: 'health-bar', config: { percentage: 1.0, color: '#00ff00' } },
    'enemy-select': { shader: 'selection-ring', config: { color: '#ff0000' } },
    'ally-select': { shader: 'selection-ring', config: { color: '#00ff00' } },
  },
};
```

---

## Support

- [GitHub Issues](https://github.com/julien-riel/maplibre-animated-shaders/issues)
- [Discussions](https://github.com/julien-riel/maplibre-animated-shaders/discussions)

## License

MIT © MapLibre Animated Shaders Contributors
