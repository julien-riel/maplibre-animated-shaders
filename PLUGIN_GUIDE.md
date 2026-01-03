# Plugin Development Guide

This guide walks you through creating custom shader plugins for MapLibre Animated Shaders.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Plugin Structure](#plugin-structure)
3. [Creating Shaders](#creating-shaders)
4. [Configuration Schema](#configuration-schema)
5. [Writing GLSL Shaders](#writing-glsl-shaders)
6. [Data-Driven Properties](#data-driven-properties)
7. [Presets](#presets)
8. [Lifecycle Hooks](#lifecycle-hooks)
9. [Best Practices](#best-practices)
10. [Complete Example](#complete-example)

---

## Quick Start

Here's a minimal plugin with a single shader:

```typescript
import { ShaderPlugin, defineShader } from 'maplibre-animated-shaders';

// Define a shader
const glowShader = defineShader({
  name: 'glow',
  displayName: 'Glowing Points',
  description: 'Points with a pulsing glow effect',
  geometry: 'point',
  tags: ['glow', 'pulse', 'simple'],

  fragmentShader: `
    precision mediump float;
    uniform float u_time;
    uniform vec4 u_color;
    varying vec2 v_pos;

    void main() {
      float dist = length(v_pos);
      float glow = 0.5 + 0.5 * sin(u_time * 3.0);
      float alpha = (1.0 - dist) * glow;
      gl_FragColor = vec4(u_color.rgb, alpha * u_color.a);
    }
  `,

  defaultConfig: {
    color: '#3b82f6',
    speed: 1.0
  },

  configSchema: {
    color: { type: 'color', label: 'Color' },
    speed: { type: 'number', label: 'Speed', min: 0.1, max: 5, step: 0.1 }
  },

  getUniforms: (config, time) => ({
    u_time: time * config.speed,
    u_color: hexToRgba(config.color)
  })
});

// Create the plugin
export const myPlugin: ShaderPlugin = {
  name: 'my-effects',
  version: '1.0.0',
  author: 'Your Name',
  description: 'Custom visual effects',
  shaders: [glowShader]
};
```

Usage:

```typescript
import { createShaderManager } from 'maplibre-animated-shaders';
import { myPlugin } from './my-plugin';

const manager = createShaderManager(map);
manager.use(myPlugin);

manager.register('points-layer', 'my-effects:glow', {
  color: '#ef4444',
  speed: 2.0
});
```

---

## Plugin Structure

### Required Fields

```typescript
interface ShaderPlugin {
  name: string;          // Unique identifier (no ':' allowed)
  version: string;       // Semver format (e.g., '1.0.0', '1.0.0-beta.1')
  shaders: ShaderDefinition[];  // At least one shader required
}
```

### Optional Fields

```typescript
interface ShaderPlugin {
  // ... required fields

  // Metadata
  author?: string;
  description?: string;
  homepage?: string;
  license?: string;
  keywords?: string[];

  // Configuration
  presets?: Record<string, PresetConfig>;
  useNamespace?: boolean;  // Default: true

  // Lifecycle hooks
  onRegister?: (manager: IShaderManager) => void;
  onUnregister?: (manager: IShaderManager) => void;
  onBeforeApply?: (layerId: string, shaderName: string, config: ShaderConfig) => ShaderConfig | void;
  onAfterApply?: (layerId: string, shaderName: string, config: ShaderConfig) => void;
}
```

### Naming Conventions

- **Plugin name**: kebab-case, no colons (e.g., `'weather-effects'`, `'sci-fi-ui'`)
- **Shader name**: camelCase or kebab-case (e.g., `'rain'`, `'pulse-ring'`)
- **Qualified name**: `pluginName:shaderName` (e.g., `'weather-effects:rain'`)

---

## Creating Shaders

### Shader Definition

Use `defineShader()` helper for type safety:

```typescript
import { defineShader, ShaderConfig } from 'maplibre-animated-shaders';

// Define your config interface
interface RainConfig extends ShaderConfig {
  color: string;
  speed: number;
  density: number;
  dropLength: number;
}

const rainShader = defineShader<RainConfig>({
  name: 'rain',
  displayName: 'Rain Effect',
  description: 'Animated rain drops falling across the viewport',
  geometry: 'global',  // Full-screen effect
  tags: ['weather', 'rain', 'atmosphere'],

  fragmentShader: `/* GLSL code */`,

  defaultConfig: {
    color: '#6b7280',
    speed: 1.0,
    density: 50,
    dropLength: 0.1
  },

  configSchema: {
    color: { type: 'color', label: 'Drop Color' },
    speed: { type: 'number', label: 'Fall Speed', min: 0.1, max: 5 },
    density: { type: 'number', label: 'Drop Density', min: 10, max: 200 },
    dropLength: { type: 'number', label: 'Drop Length', min: 0.01, max: 0.5 }
  },

  getUniforms: (config, time, deltaTime) => ({
    u_time: time * config.speed,
    u_color: hexToRgba(config.color),
    u_density: config.density,
    u_dropLength: config.dropLength
  })
});
```

### Geometry Types

| Type | Use Case | Source Required | Layer Type |
|------|----------|-----------------|------------|
| `'point'` | Effects on point markers | Yes | `circle` |
| `'line'` | Effects along lines | Yes | `line` |
| `'polygon'` | Effects on filled areas | Yes | `fill` |
| `'global'` | Full-screen overlays | No | N/A |

### Custom Vertex Shader

By default, each geometry type uses a built-in vertex shader. You can provide a custom one:

```typescript
const customShader = defineShader({
  // ... other fields

  vertexShader: `
    attribute vec2 a_pos;
    attribute vec2 a_offset;
    uniform mat4 u_matrix;
    uniform float u_size;
    varying vec2 v_pos;

    void main() {
      v_pos = a_offset;
      vec4 projected = u_matrix * vec4(a_pos, 0.0, 1.0);
      gl_Position = projected + vec4(a_offset * u_size / projected.w, 0.0, 0.0);
    }
  `,

  fragmentShader: `/* ... */`
});
```

---

## Configuration Schema

### Parameter Types

```typescript
interface ConfigSchema {
  [key: string]: ConfigParamSchema;
}

interface ConfigParamSchema {
  type: 'number' | 'boolean' | 'color' | 'select' | 'string';
  label: string;
  description?: string;

  // For 'number' type
  min?: number;
  max?: number;
  step?: number;

  // For 'select' type
  options?: Array<{ value: string | number; label: string }>;

  // For all types
  default?: unknown;
}
```

### Examples

```typescript
const configSchema: ConfigSchema = {
  // Color picker
  color: {
    type: 'color',
    label: 'Effect Color',
    description: 'The primary color of the effect'
  },

  // Numeric slider
  speed: {
    type: 'number',
    label: 'Animation Speed',
    min: 0.1,
    max: 5.0,
    step: 0.1
  },

  // Boolean toggle
  enabled: {
    type: 'boolean',
    label: 'Enable Effect'
  },

  // Dropdown select
  pattern: {
    type: 'select',
    label: 'Pattern Type',
    options: [
      { value: 'waves', label: 'Waves' },
      { value: 'ripples', label: 'Ripples' },
      { value: 'noise', label: 'Noise' }
    ]
  },

  // Text input
  label: {
    type: 'string',
    label: 'Label Text'
  }
};
```

---

## Writing GLSL Shaders

### Available Uniforms

These uniforms are automatically provided:

```glsl
// Always available
uniform mat4 u_matrix;        // MapLibre projection matrix
uniform float u_time;         // Animation time (seconds)
uniform vec2 u_resolution;    // Viewport size in pixels

// For point shaders
uniform float u_size;         // Point size

// For line shaders
uniform float u_width;        // Line width
```

### Available Attributes

For **point** shaders:

```glsl
attribute vec2 a_pos;         // Point position (Mercator)
attribute vec2 a_offset;      // Quad corner offset (-1 to 1)
attribute float a_timeOffset; // Per-feature time offset
attribute vec4 a_color;       // Data-driven color
attribute float a_intensity;  // Data-driven intensity
attribute float a_isPlaying;  // Animation state (0 or 1)
attribute float a_localTime;  // Frozen time when paused
```

For **line** shaders:

```glsl
attribute vec2 a_pos;         // Vertex position
attribute vec2 a_normal;      // Line normal
attribute float a_progress;   // Progress along line (0 to 1)
attribute float a_timeOffset;
attribute vec4 a_color;
```

For **polygon** shaders:

```glsl
attribute vec2 a_pos;         // Vertex position
attribute vec2 a_uv;          // UV coordinates
attribute float a_timeOffset;
attribute vec4 a_color;
```

For **global** shaders:

```glsl
attribute vec2 a_pos;         // Full-screen quad position
varying vec2 v_uv;            // UV coordinates (0 to 1)
```

### Using Built-in GLSL Libraries

Import and use the provided GLSL utilities:

```typescript
import { glsl } from 'maplibre-animated-shaders';

const fragmentShader = `
  precision mediump float;

  // Include GLSL libraries
  ${glsl.noise}
  ${glsl.easing}
  ${glsl.colors}
  ${glsl.shapes}

  uniform float u_time;
  varying vec2 v_uv;

  void main() {
    // Use noise functions
    float n = snoise(v_uv * 10.0 + u_time);

    // Use easing
    float t = fract(u_time);
    float eased = easeOutQuad(t);

    // Use SDF shapes
    float d = sdCircle(v_uv - 0.5, 0.3);
    float circle = fillAA(d, 0.01);

    // Use color functions
    vec3 color = hsl2rgb(vec3(n * 0.5 + 0.5, 0.8, 0.5));

    gl_FragColor = vec4(color, circle);
  }
`;
```

### Available GLSL Functions

**Noise** (`glsl.noise`):
```glsl
float snoise(vec2 v)              // Simplex noise 2D
float snoise(vec3 v)              // Simplex noise 3D
float fbm(vec2 p, int octaves)    // Fractal Brownian Motion
float random(vec2 st)             // Hash-based random
vec2 random2(vec2 st)             // 2D random vector
```

**Easing** (`glsl.easing`):
```glsl
float linear(float t)
float easeInQuad(float t)
float easeOutQuad(float t)
float easeInOutQuad(float t)
float easeInCubic(float t)
float easeOutCubic(float t)
float easeInOutCubic(float t)
float easeOutElastic(float t)
float easeOutBounce(float t)
// ... and more
```

**Colors** (`glsl.colors`):
```glsl
vec3 rgb2hsl(vec3 c)
vec3 hsl2rgb(vec3 c)
vec3 rgb2hsv(vec3 c)
vec3 hsv2rgb(vec3 c)
vec3 adjustBrightness(vec3 c, float amount)
vec3 adjustSaturation(vec3 c, float amount)
vec3 blendOverlay(vec3 base, vec3 blend)
vec3 blendScreen(vec3 base, vec3 blend)
// ... and more
```

**Shapes/SDF** (`glsl.shapes`):
```glsl
float sdCircle(vec2 p, float r)
float sdBox(vec2 p, vec2 b)
float sdRing(vec2 p, float r, float w)
float sdTriangle(vec2 p, float r)
float sdStar(vec2 p, float r, float n, float m)
float opUnion(float d1, float d2)
float opSmoothUnion(float d1, float d2, float k)
float fill(float d)
float fillAA(float d, float aa)
float stroke(float d, float width)
vec2 rotate2D(vec2 p, float angle)
// ... and more
```

---

## Data-Driven Properties

Support MapLibre expressions for per-feature values:

```typescript
const shader = defineShader({
  // ...

  // Mark which properties support expressions
  // (handled automatically if using a_color, a_intensity attributes)

  getUniforms: (config, time) => {
    // Handle both static and expression values
    const color = typeof config.color === 'string'
      ? hexToRgba(config.color)
      : [1, 1, 1, 1];  // Fallback, actual value comes from attribute

    return {
      u_time: time,
      u_color: color,
      u_useDataDrivenColor: isExpression(config.color) ? 1.0 : 0.0
    };
  }
});
```

In your fragment shader:

```glsl
uniform vec4 u_color;
uniform float u_useDataDrivenColor;

varying vec4 v_color;  // From vertex attribute

void main() {
  // Mix between uniform and per-feature color
  vec4 finalColor = mix(u_color, v_color, u_useDataDrivenColor);
  // ...
}
```

Usage:

```typescript
manager.register('layer', 'plugin:shader', {
  // Static value
  speed: 1.5,

  // Expression - evaluated per feature
  color: ['get', 'status_color'],

  // Complex expression
  intensity: ['match', ['get', 'priority'],
    'high', 1.0,
    'medium', 0.6,
    0.3
  ]
});
```

---

## Presets

Define preset configurations for common use cases:

```typescript
export const myPlugin: ShaderPlugin = {
  name: 'effects',
  version: '1.0.0',
  shaders: [pulseShader, glowShader],

  presets: {
    // Preset for pulse shader
    'pulse-alert': {
      shader: 'pulse',
      config: {
        color: '#ef4444',
        speed: 2.0,
        rings: 3,
        maxRadius: 50
      }
    },

    'pulse-notification': {
      shader: 'pulse',
      config: {
        color: '#3b82f6',
        speed: 1.0,
        rings: 2,
        maxRadius: 30
      }
    },

    // Preset for glow shader
    'glow-warning': {
      shader: 'glow',
      config: {
        color: '#f59e0b',
        intensity: 1.5
      }
    }
  }
};
```

Usage:

```typescript
// Get all presets
const presets = manager.getAllPresets();
// [
//   { plugin: 'effects', preset: 'pulse-alert', shader: 'pulse' },
//   { plugin: 'effects', preset: 'pulse-notification', shader: 'pulse' },
//   { plugin: 'effects', preset: 'glow-warning', shader: 'glow' }
// ]

// Apply a preset
manager.registerPreset('my-layer', 'effects:pulse-alert');

// Or get preset config to customize
const preset = manager.getPreset('effects', 'pulse-alert');
manager.register('my-layer', `effects:${preset.shader}`, {
  ...preset.config,
  speed: 3.0  // Override one property
});
```

---

## Lifecycle Hooks

Respond to plugin and shader events:

```typescript
export const myPlugin: ShaderPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  shaders: [...],

  // Called when plugin is registered
  onRegister: (manager) => {
    console.log('Plugin registered!');
    // Initialize resources, set up global state
  },

  // Called when plugin is unregistered
  onUnregister: (manager) => {
    console.log('Plugin unregistered!');
    // Clean up resources
  },

  // Called before a shader is applied to a layer
  onBeforeApply: (layerId, shaderName, config) => {
    console.log(`Applying ${shaderName} to ${layerId}`);

    // You can modify the config
    return {
      ...config,
      _appliedAt: Date.now()
    };

    // Or return void to use original config
  },

  // Called after a shader is applied
  onAfterApply: (layerId, shaderName, config) => {
    console.log(`Applied ${shaderName} to ${layerId}`);
    // Track usage, analytics, etc.
  }
};
```

---

## Best Practices

### 1. Shader Performance

```glsl
// Good: Compute values once in vertex shader, pass as varyings
varying float v_animatedValue;
void main() {
  v_animatedValue = sin(u_time) * 0.5 + 0.5;
  // ...
}

// Bad: Computing per-pixel what could be per-vertex
void main() {
  float value = sin(u_time) * 0.5 + 0.5;  // Same for all pixels!
  // ...
}
```

### 2. Use `precision mediump float`

```glsl
// Always declare precision at the start of fragment shaders
precision mediump float;
```

### 3. Avoid Branching

```glsl
// Good: Use mix() instead of if/else
float result = mix(valueA, valueB, condition);

// Bad: Branches hurt GPU performance
float result;
if (condition > 0.5) {
  result = valueA;
} else {
  result = valueB;
}
```

### 4. Optimize SDF Operations

```glsl
// Good: Combine SDFs efficiently
float d = min(sdCircle(p, 0.3), sdBox(p, vec2(0.2)));
float shape = fillAA(d, 0.01);

// Bad: Multiple fillAA calls
float c1 = fillAA(sdCircle(p, 0.3), 0.01);
float c2 = fillAA(sdBox(p, vec2(0.2)), 0.01);
float shape = max(c1, c2);
```

### 5. Version Your Plugin

Follow semantic versioning:

```typescript
{
  version: '1.0.0',      // Initial release
  version: '1.1.0',      // New feature (backward compatible)
  version: '1.1.1',      // Bug fix
  version: '2.0.0',      // Breaking change
  version: '2.0.0-beta.1'  // Pre-release
}
```

### 6. Document Your Shaders

```typescript
const shader = defineShader({
  name: 'particle-burst',
  displayName: 'Particle Burst',
  description: `
    Creates an explosion of particles radiating from the center.
    Best used with point geometries for alert or notification effects.
    Supports data-driven color and intensity.
  `,
  tags: ['particles', 'explosion', 'alert', 'notification'],
  // ...
});
```

### 7. Handle Edge Cases

```typescript
getUniforms: (config, time) => {
  // Clamp values to safe ranges
  const speed = Math.max(0.1, Math.min(10, config.speed || 1));

  // Handle missing/invalid colors
  let color: number[];
  try {
    color = hexToRgba(config.color || '#ffffff');
  } catch {
    color = [1, 1, 1, 1];
  }

  return {
    u_time: time * speed,
    u_color: color
  };
}
```

---

## Complete Example

Here's a complete plugin with multiple shaders:

```typescript
// weather-effects-plugin.ts
import {
  ShaderPlugin,
  ShaderConfig,
  defineShader,
  glsl
} from 'maplibre-animated-shaders';
import { hexToRgba } from 'maplibre-animated-shaders/utils';

// ============================================
// Rain Shader (Global)
// ============================================

interface RainConfig extends ShaderConfig {
  color: string;
  speed: number;
  density: number;
  angle: number;
  dropLength: number;
}

const rainShader = defineShader<RainConfig>({
  name: 'rain',
  displayName: 'Rain',
  description: 'Animated rain drops falling across the viewport',
  geometry: 'global',
  tags: ['weather', 'rain', 'atmosphere', 'overlay'],

  fragmentShader: `
    precision mediump float;

    ${glsl.noise}

    uniform float u_time;
    uniform vec4 u_color;
    uniform float u_density;
    uniform float u_angle;
    uniform float u_dropLength;
    uniform vec2 u_resolution;

    varying vec2 v_uv;

    float rain(vec2 uv, float t) {
      // Rotate for angle
      float s = sin(u_angle);
      float c = cos(u_angle);
      uv = mat2(c, -s, s, c) * uv;

      // Create rain grid
      vec2 grid = uv * vec2(u_density, u_density * 0.5);
      vec2 id = floor(grid);
      vec2 st = fract(grid) - 0.5;

      // Randomize per column
      float n = random(vec2(id.x, floor(id.x * 0.123)));
      float speed = 1.0 + n * 0.5;
      float offset = n * 10.0;

      // Animate
      float y = fract(st.y + t * speed + offset);

      // Drop shape
      float drop = smoothstep(0.0, u_dropLength, y)
                 * smoothstep(u_dropLength + 0.01, u_dropLength, y);
      drop *= smoothstep(0.03, 0.0, abs(st.x));

      return drop;
    }

    void main() {
      float r = rain(v_uv, u_time);
      gl_FragColor = vec4(u_color.rgb, r * u_color.a);
    }
  `,

  defaultConfig: {
    color: '#a0a0a0',
    speed: 1.0,
    density: 30,
    angle: 0.1,
    dropLength: 0.15
  },

  configSchema: {
    color: { type: 'color', label: 'Drop Color' },
    speed: { type: 'number', label: 'Fall Speed', min: 0.1, max: 5, step: 0.1 },
    density: { type: 'number', label: 'Density', min: 10, max: 100, step: 1 },
    angle: { type: 'number', label: 'Wind Angle', min: -0.5, max: 0.5, step: 0.05 },
    dropLength: { type: 'number', label: 'Drop Length', min: 0.05, max: 0.3, step: 0.01 }
  },

  getUniforms: (config, time) => ({
    u_time: time * config.speed,
    u_color: hexToRgba(config.color),
    u_density: config.density,
    u_angle: config.angle,
    u_dropLength: config.dropLength
  })
});

// ============================================
// Snowflake Shader (Point)
// ============================================

interface SnowflakeConfig extends ShaderConfig {
  color: string;
  speed: number;
  rotationSpeed: number;
  sparkle: boolean;
}

const snowflakeShader = defineShader<SnowflakeConfig>({
  name: 'snowflake',
  displayName: 'Snowflake',
  description: 'Rotating snowflake pattern on points',
  geometry: 'point',
  tags: ['weather', 'snow', 'winter', 'point'],

  fragmentShader: `
    precision mediump float;

    ${glsl.shapes}

    uniform float u_time;
    uniform vec4 u_color;
    uniform float u_rotationSpeed;
    uniform float u_sparkle;

    varying vec2 v_pos;
    varying float v_effectiveTime;

    void main() {
      vec2 p = v_pos;

      // Rotate
      float angle = v_effectiveTime * u_rotationSpeed;
      p = rotate2D(p, angle);

      // Create 6-fold symmetry
      float a = atan(p.y, p.x);
      float r = length(p);
      a = mod(a + 3.14159, 3.14159 / 3.0) - 3.14159 / 6.0;
      p = vec2(cos(a), sin(a)) * r;

      // Draw branch
      float branch = smoothstep(0.02, 0.0, abs(p.y));
      branch *= smoothstep(0.8, 0.0, p.x);
      branch *= step(0.0, p.x);

      // Add sparkle
      float sparkle = 0.0;
      if (u_sparkle > 0.5) {
        sparkle = sin(v_effectiveTime * 10.0 + r * 20.0) * 0.5 + 0.5;
        sparkle *= smoothstep(0.5, 0.2, r);
      }

      float alpha = branch + sparkle * 0.3;
      gl_FragColor = vec4(u_color.rgb, alpha * u_color.a);
    }
  `,

  defaultConfig: {
    color: '#ffffff',
    speed: 1.0,
    rotationSpeed: 0.5,
    sparkle: true
  },

  configSchema: {
    color: { type: 'color', label: 'Color' },
    speed: { type: 'number', label: 'Animation Speed', min: 0.1, max: 3, step: 0.1 },
    rotationSpeed: { type: 'number', label: 'Rotation Speed', min: 0, max: 2, step: 0.1 },
    sparkle: { type: 'boolean', label: 'Enable Sparkle' }
  },

  getUniforms: (config, time) => ({
    u_time: time * config.speed,
    u_color: hexToRgba(config.color),
    u_rotationSpeed: config.rotationSpeed,
    u_sparkle: config.sparkle ? 1.0 : 0.0
  })
});

// ============================================
// Export Plugin
// ============================================

export const weatherEffectsPlugin: ShaderPlugin = {
  name: 'weather-effects',
  version: '1.0.0',
  author: 'Your Name',
  description: 'Weather visual effects for MapLibre maps',
  homepage: 'https://github.com/yourusername/weather-effects',
  license: 'MIT',
  keywords: ['weather', 'rain', 'snow', 'atmosphere'],

  shaders: [rainShader, snowflakeShader],

  presets: {
    'rain-light': {
      shader: 'rain',
      config: {
        color: '#b0b0b0',
        speed: 0.8,
        density: 20,
        angle: 0,
        dropLength: 0.1
      }
    },
    'rain-heavy': {
      shader: 'rain',
      config: {
        color: '#808080',
        speed: 1.5,
        density: 60,
        angle: 0.2,
        dropLength: 0.2
      }
    },
    'snow-gentle': {
      shader: 'snowflake',
      config: {
        color: '#ffffff',
        speed: 0.5,
        rotationSpeed: 0.3,
        sparkle: true
      }
    }
  },

  onRegister: (manager) => {
    console.log('Weather effects plugin loaded');
  }
};

// Default export for convenience
export default weatherEffectsPlugin;
```

### Usage

```typescript
import { createShaderManager } from 'maplibre-animated-shaders';
import { weatherEffectsPlugin } from './weather-effects-plugin';

const manager = createShaderManager(map);
manager.use(weatherEffectsPlugin);

// Apply rain overlay
manager.register('_rain', 'weather-effects:rain', {
  color: '#9ca3af',
  speed: 1.2,
  density: 40
});

// Apply snowflake to points
manager.register('mountain-peaks', 'weather-effects:snowflake', {
  color: '#e0f2fe',
  sparkle: true
});

// Or use a preset
manager.registerPreset('_rain', 'weather-effects:rain-heavy');
```

---

## Troubleshooting

### Shader Compilation Errors

Check the browser console for GLSL errors. Common issues:

```glsl
// Missing precision declaration
precision mediump float;  // Add this at the top

// Undeclared variable
uniform float u_myVar;  // Declare before using

// Type mismatch
float x = 1;    // Error: use 1.0 for float
float x = 1.0;  // Correct
```

### Plugin Not Loading

```typescript
// Check plugin is valid
import { validatePlugin } from 'maplibre-animated-shaders';

const result = validatePlugin(myPlugin);
if (!result.valid) {
  console.error('Plugin errors:', result.errors);
  console.warn('Plugin warnings:', result.warnings);
}
```

### Shader Not Visible

1. Check the layer exists before registering
2. Verify the geometry type matches the layer type
3. Check the shader's alpha/opacity values
4. Ensure `manager.play()` is called

```typescript
// Debug
console.log('Available shaders:', manager.listShaders());
console.log('Registered layers:', manager.getRegisteredLayers());
```

---

## Next Steps

- Explore the [example plugin source](../src/plugins/builtin/example/) for more complex examples
- Check the [Architecture documentation](./ARCHITECTURE.md) for technical details
- See the [API reference](https://julien-riel.github.io/maplibre-animated-shaders/) for complete type definitions
