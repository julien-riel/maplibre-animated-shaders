/**
 * MapLibre Animated Shaders - React Example
 *
 * This example demonstrates how to integrate maplibre-animated-shaders
 * with React using hooks for lifecycle management.
 *
 * Installation:
 *   npm install maplibre-gl maplibre-animated-shaders react react-dom
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import {
  ShaderManager,
  globalRegistry,
  examplePlugin,
  PluginManager,
} from 'maplibre-animated-shaders';
import type { ShaderDefinition } from 'maplibre-animated-shaders';

import 'maplibre-gl/dist/maplibre-gl.css';

// Register built-in shaders once at module level
const pluginManager = new PluginManager(globalRegistry);
pluginManager.use(examplePlugin);

/**
 * Props for the AnimatedMap component
 */
interface AnimatedMapProps {
  /** Initial map center [lng, lat] */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  /** Map style URL */
  styleUrl?: string;
  /** Initial shader to apply */
  initialShader?: string;
  /** Shader configuration */
  shaderConfig?: Record<string, unknown>;
  /** Callback when map is ready */
  onMapReady?: (map: MapLibreMap) => void;
  /** Callback when shader changes */
  onShaderChange?: (shaderName: string) => void;
}

/**
 * Hook for managing shader effects on a MapLibre map
 */
function useShaderEffect(
  map: MapLibreMap | null,
  shaderName: string | null,
  config: Record<string, unknown> = {}
) {
  const shaderManagerRef = useRef<ShaderManager | null>(null);
  const currentLayerRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !shaderName) return;

    const shader = globalRegistry.get(shaderName);
    if (!shader) {
      console.error(`Shader "${shaderName}" not found`);
      return;
    }

    // Initialize shader manager
    if (!shaderManagerRef.current) {
      shaderManagerRef.current = new ShaderManager(globalRegistry);
    }

    const layerId = `shader-${shaderName}-${Date.now()}`;

    // Cleanup previous layer
    if (currentLayerRef.current) {
      if (map.getLayer(currentLayerRef.current)) {
        map.removeLayer(currentLayerRef.current);
      }
      if (map.getSource('shader-source')) {
        map.removeSource('shader-source');
      }
    }

    // Add shader source if not exists
    if (!map.getSource('shader-source')) {
      map.addSource('shader-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [-180, -85],
                    [180, -85],
                    [180, 85],
                    [-180, 85],
                    [-180, -85],
                  ],
                ],
              },
              properties: {},
            },
          ],
        },
      });
    }

    // Merge config with defaults
    const mergedConfig = { ...shader.defaultConfig, ...config };

    // Add the shader layer
    map.addLayer({
      id: layerId,
      type: 'fill',
      source: 'shader-source',
      paint: {
        'fill-color': (mergedConfig.color as string) || '#3388ff',
        'fill-opacity': (mergedConfig.opacity as number) || 0.7,
      },
    });

    currentLayerRef.current = layerId;
    shaderManagerRef.current.register(shaderName, shader);

    // Cleanup on unmount or shader change
    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    };
  }, [map, shaderName, JSON.stringify(config)]);

  return shaderManagerRef.current;
}

/**
 * AnimatedMap - A React component for MapLibre maps with animated shader effects
 *
 * @example
 * ```tsx
 * <AnimatedMap
 *   center={[-74.5, 40]}
 *   zoom={9}
 *   initialShader="plasma"
 *   shaderConfig={{ speed: 1.5, intensity: 1.2 }}
 * />
 * ```
 */
export function AnimatedMap({
  center = [-74.5, 40],
  zoom = 9,
  styleUrl = 'https://demotiles.maplibre.org/style.json',
  initialShader = 'plasma',
  shaderConfig = {},
  onMapReady,
  onShaderChange,
}: AnimatedMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentShader, setCurrentShader] = useState(initialShader);

  // Get available shaders
  const availableShaders = globalRegistry.list();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center,
      zoom,
    });

    map.on('load', () => {
      mapRef.current = map;
      setMapLoaded(true);
      onMapReady?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [styleUrl]);

  // Apply shader effect
  useShaderEffect(mapLoaded ? mapRef.current : null, currentShader, shaderConfig);

  // Handle shader change
  const handleShaderChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newShader = e.target.value;
      setCurrentShader(newShader);
      onShaderChange?.(newShader);
    },
    [onShaderChange]
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '100%' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'white',
          padding: 15,
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 1000,
        }}
      >
        <label htmlFor="shader-select" style={{ display: 'block', marginBottom: 5 }}>
          Select Effect:
        </label>
        <select
          id="shader-select"
          value={currentShader}
          onChange={handleShaderChange}
          style={{ width: '100%', padding: 5 }}
        >
          {availableShaders.map((name) => (
            <option key={name} value={name}>
              {globalRegistry.get(name)?.displayName || name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * Hook for direct shader management in custom components
 *
 * @example
 * ```tsx
 * function MyMap() {
 *   const { map, applyShader, removeShader } = useAnimatedShaders();
 *
 *   useEffect(() => {
 *     if (map) {
 *       applyShader('plasma', { speed: 2 });
 *     }
 *   }, [map]);
 *
 *   return <div ref={mapRef} />;
 * }
 * ```
 */
export function useAnimatedShaders() {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const shaderManagerRef = useRef<ShaderManager | null>(null);

  const applyShader = useCallback(
    (shaderName: string, config: Record<string, unknown> = {}) => {
      if (!map) return null;

      const shader = globalRegistry.get(shaderName);
      if (!shader) {
        console.error(`Shader "${shaderName}" not found`);
        return null;
      }

      if (!shaderManagerRef.current) {
        shaderManagerRef.current = new ShaderManager(globalRegistry);
      }

      shaderManagerRef.current.register(shaderName, shader);
      return shaderManagerRef.current;
    },
    [map]
  );

  const removeShader = useCallback(
    (shaderName: string) => {
      if (shaderManagerRef.current) {
        shaderManagerRef.current.unregister(shaderName);
      }
    },
    []
  );

  const listShaders = useCallback(() => {
    return globalRegistry.list();
  }, []);

  return {
    map,
    setMap,
    applyShader,
    removeShader,
    listShaders,
    shaderManager: shaderManagerRef.current,
  };
}

export default AnimatedMap;
