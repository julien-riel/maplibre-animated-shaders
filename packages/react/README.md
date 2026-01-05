# @maplibre-animated-shaders/react

React bindings for [MapLibre Animated Shaders](https://github.com/julien-riel/maplibre-animated-shaders).

## Installation

```bash
npm install @maplibre-animated-shaders/react maplibre-animated-shaders maplibre-gl
```

## Quick Start

```tsx
import { AnimatedMap, ShaderLayer, ShaderProvider } from '@maplibre-animated-shaders/react';

function App() {
  return (
    <ShaderProvider useBuiltinShaders>
      <AnimatedMap
        center={[-74.5, 40]}
        zoom={9}
        style={{ width: '100vw', height: '100vh' }}
      >
        <ShaderLayer
          shaderName="plasma"
          config={{ speed: 1.5, intensity: 1.0 }}
        />
      </AnimatedMap>
    </ShaderProvider>
  );
}
```

## Components

### `<AnimatedMap>`

Complete map component with shader support.

```tsx
<AnimatedMap
  center={[-74.5, 40]}
  zoom={9}
  style="https://demotiles.maplibre.org/style.json"
  onMapReady={(map) => console.log('Map ready')}
  onError={(error) => console.error(error)}
>
  {/* ShaderLayer children */}
</AnimatedMap>
```

**Props:**
- `center` - Initial center `[lng, lat]`
- `zoom` - Initial zoom level
- `style` - Map style URL or object
- `className` - Container class name
- `containerStyle` - Container inline styles
- `mapOptions` - Additional MapLibre options
- `onMapReady` - Callback when map loads
- `onError` - Error callback

### `<ShaderLayer>`

Declarative shader layer component.

```tsx
<ShaderLayer
  shaderName="plasma"
  config={{ speed: 1.5, color: '#ff6600' }}
  visible={true}
  data={geoJsonFeatures}
/>
```

**Props:**
- `shaderName` - Name of registered shader
- `id` - Layer ID (auto-generated if not provided)
- `config` - Shader configuration
- `data` - GeoJSON data source
- `visible` - Layer visibility
- `playing` - Animation playing state
- `beforeId` - Insert layer before this ID
- `onAdd` / `onRemove` / `onError` - Callbacks

### `<ShaderProvider>`

Context provider for shader management.

```tsx
<ShaderProvider useBuiltinShaders shaders={customShaders}>
  <App />
</ShaderProvider>
```

**Props:**
- `useBuiltinShaders` - Register built-in shaders (default: true)
- `shaders` - Custom shader definitions

## Hooks

### `useShaderEffect`

Apply shader effects imperatively.

```tsx
function MyComponent() {
  const [map, setMap] = useState(null);

  const { isApplied, updateConfig, remove } = useShaderEffect({
    map,
    shaderName: 'plasma',
    config: { speed: 1.5 },
    enabled: true,
    onApply: (layerId) => console.log('Applied:', layerId),
  });

  return (
    <div>
      <button onClick={() => updateConfig({ speed: 2.0 })}>
        Speed Up
      </button>
      <button onClick={remove}>Remove</button>
    </div>
  );
}
```

### `useShaderManager`

Manage shader lifecycle.

```tsx
function MyComponent() {
  const { manager, isInitialized, listShaders, getShader } = useShaderManager();

  const shaders = listShaders();

  return (
    <select>
      {shaders.map(name => (
        <option key={name}>{getShader(name)?.displayName}</option>
      ))}
    </select>
  );
}
```

### `useShaderRegistry`

Access the global shader registry.

```tsx
function ShaderPicker() {
  const { list, get, has } = useShaderRegistry();

  const pointShaders = list('point');
  const fillShaders = list('fill');

  return (
    <div>
      <h3>Point Effects ({pointShaders.length})</h3>
      <h3>Fill Effects ({fillShaders.length})</h3>
    </div>
  );
}
```

### `usePerformanceMonitor`

Monitor shader performance.

```tsx
function PerformanceOverlay() {
  const { metrics, isMonitoring } = usePerformanceMonitor({
    enabled: true,
    updateInterval: 500,
    onWarning: (type, message) => console.warn(type, message),
  });

  if (!metrics) return null;

  return (
    <div className="fps-counter">
      {metrics.fps} FPS | {metrics.frameTime.toFixed(1)}ms
    </div>
  );
}
```

### `useShaderContext`

Access shader context from provider.

```tsx
function MyComponent() {
  const { listShaders, getShader, registerShader } = useShaderContext();

  // Must be within <ShaderProvider>
  return <div>{listShaders().length} shaders available</div>;
}
```

## TypeScript

Full TypeScript support with exported types:

```tsx
import type {
  ShaderLayerProps,
  AnimatedMapProps,
  UseShaderEffectOptions,
  UseShaderEffectReturn,
} from '@maplibre-animated-shaders/react';
```

## Examples

### Multiple Layers

```tsx
<AnimatedMap center={[-74.5, 40]} zoom={9}>
  <ShaderLayer
    shaderName="water-ripples"
    config={{ frequency: 2.0 }}
    data={waterFeatures}
  />
  <ShaderLayer
    shaderName="heat-distortion"
    config={{ intensity: 0.5 }}
    data={heatFeatures}
  />
</AnimatedMap>
```

### Dynamic Effects

```tsx
function DynamicEffects() {
  const [shaderName, setShaderName] = useState('plasma');
  const [config, setConfig] = useState({ speed: 1.0 });

  return (
    <>
      <AnimatedMap center={[-74.5, 40]} zoom={9}>
        <ShaderLayer shaderName={shaderName} config={config} />
      </AnimatedMap>
      <select onChange={(e) => setShaderName(e.target.value)}>
        <option value="plasma">Plasma</option>
        <option value="water-ripples">Water Ripples</option>
      </select>
      <input
        type="range"
        min="0.1"
        max="3"
        step="0.1"
        value={config.speed}
        onChange={(e) => setConfig({ speed: parseFloat(e.target.value) })}
      />
    </>
  );
}
```

### With External Map

```tsx
function ExternalMapExample() {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
    });
    map.on('load', () => setMap(map));
    return () => map.remove();
  }, []);

  const { isApplied } = useShaderEffect({
    map,
    shaderName: 'plasma',
    config: { speed: 1.5 },
  });

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
```

## License

MIT
