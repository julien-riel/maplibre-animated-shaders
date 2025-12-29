# Contributing to MapLibre GL Shaders

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Development Setup

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Git

### Getting Started

1. Fork and clone the repository:

```bash
git clone https://github.com/your-username/maplibre-animated-shaders.git
cd maplibre-animated-shaders
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
# Start the demo playground
npm run dev:demo

# Or start the library dev server
npm run dev
```

4. Run tests:

```bash
npm test
```

## Project Structure

```
maplibre-animated-shaders/
├── src/
│   ├── index.ts              # Main exports
│   ├── ShaderManager.ts      # Core shader management
│   ├── AnimationLoop.ts      # Animation frame handling
│   ├── ShaderRegistry.ts     # Shader registration
│   ├── ConfigResolver.ts     # Configuration validation
│   ├── types/                # TypeScript definitions
│   ├── utils/                # Utility functions
│   ├── glsl/                 # GLSL common functions
│   ├── layers/               # Custom WebGL layers
│   └── shaders/              # Shader implementations
│       ├── points/           # Point geometry shaders
│       ├── lines/            # Line geometry shaders
│       ├── polygons/         # Polygon geometry shaders
│       └── global/           # Global effect shaders
├── demo/                     # Interactive playground
├── tests/                    # Test files
└── docs/                     # Documentation
```

## Creating a New Shader

### 1. Choose the Geometry Type

Shaders are organized by geometry type:
- `points/` - For point/marker data
- `lines/` - For line/path data
- `polygons/` - For polygon/area data
- `global/` - For map-wide effects

### 2. Create the Shader File

Create a new file in the appropriate directory:

```typescript
// src/shaders/points/myShader.ts
import type { ShaderDefinition } from '../../types';

export interface MyShaderConfig {
  color: string;
  speed: number;
  intensity: number;
}

export const myShaderDefaults: MyShaderConfig = {
  color: '#3b82f6',
  speed: 1.0,
  intensity: 0.5,
};

export const myShaderSchema = {
  color: { type: 'color' as const },
  speed: { type: 'number' as const, min: 0.1, max: 5.0, default: 1.0 },
  intensity: { type: 'number' as const, min: 0, max: 1, default: 0.5 },
};

export const myShader: ShaderDefinition<MyShaderConfig> = {
  name: 'myShader',
  geometry: 'point',
  description: 'Brief description of what the shader does',
  tags: ['animation', 'effect'],
  defaultConfig: myShaderDefaults,
  configSchema: myShaderSchema,

  fragmentShader: `
    precision mediump float;

    uniform vec3 u_color;
    uniform float u_time;
    uniform float u_intensity;

    varying vec2 v_position;

    void main() {
      float effect = sin(u_time) * u_intensity;
      gl_FragColor = vec4(u_color * effect, 1.0);
    }
  `,

  getUniforms(config: MyShaderConfig, time: number) {
    return {
      u_color: hexToRgb(config.color),
      u_time: time * config.speed,
      u_intensity: config.intensity,
    };
  },
};

export default myShader;
```

### 3. Register the Shader

Add your shader to the index file:

```typescript
// src/shaders/points/index.ts
export { myShader, myShaderDefaults, myShaderSchema } from './myShader';

// src/shaders/index.ts
import { myShader } from './points/myShader';

export function registerAllShaders(): void {
  // ... existing registrations
  globalRegistry.register(myShader);
}
```

### 4. Add to Demo

Update the demo to include your new shader for testing.

### 5. Write Tests

Add tests for your shader:

```typescript
// tests/shaders/myShader.test.ts
import { describe, it, expect } from 'vitest';
import { myShader, myShaderDefaults, myShaderSchema } from '../../src/shaders/points/myShader';

describe('myShader', () => {
  it('should have correct name and geometry', () => {
    expect(myShader.name).toBe('myShader');
    expect(myShader.geometry).toBe('point');
  });

  it('should generate valid uniforms', () => {
    const uniforms = myShader.getUniforms(myShaderDefaults, 1.0);
    expect(uniforms.u_time).toBeDefined();
    expect(uniforms.u_color).toBeDefined();
  });
});
```

## Code Style

This project uses ESLint and Prettier for code formatting.

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

### Guidelines

- Use TypeScript for all code
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use descriptive variable names
- Prefer `const` over `let`

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test

# Run with coverage
npm run test:coverage
```

### Test Guidelines

- Write tests for all new functionality
- Aim for 80%+ code coverage
- Test both success and error cases
- Mock external dependencies

## Git Workflow

### Branch Naming

- `feature/shader-name` - New shaders
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(shaders): add new pulse shader
fix(animation): resolve timing issue on pause
docs: update README with examples
test: add ConfigResolver unit tests
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure tests pass: `npm test`
4. Ensure code is formatted: `npm run format`
5. Update documentation if needed
6. Submit a pull request

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changelog updated (for user-facing changes)
- [ ] Code formatted (`npm run format`)
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)

## Shader Development Tips

### Performance

- Minimize texture lookups
- Avoid complex branching in shaders
- Use built-in GLSL functions when possible
- Test on lower-end devices

### GLSL Best Practices

- Use `precision mediump float;` for compatibility
- Leverage the common GLSL utilities in `src/glsl/common/`
- Keep fragment shaders simple
- Use uniforms for all configurable values

### Using Common GLSL

```glsl
// Import noise functions
#include "../glsl/common/noise.glsl"

// Import easing functions
#include "../glsl/common/easing.glsl"

// Use in your shader
float n = snoise(position * 0.01 + time);
float e = easeInOutQuad(progress);
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

Thank you for contributing!
