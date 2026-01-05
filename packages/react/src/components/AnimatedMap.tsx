/**
 * AnimatedMap - Complete map component with shader support
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  Children,
  cloneElement,
  isValidElement,
} from 'react';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import type { AnimatedMapProps } from '../types';
import { ShaderLayer } from './ShaderLayer';

import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Complete map component with built-in shader support
 *
 * Automatically passes the map instance to child ShaderLayer components.
 *
 * @example
 * ```tsx
 * function App() {
 *   const handleMapReady = (map) => {
 *     console.log('Map loaded:', map);
 *   };
 *
 *   return (
 *     <AnimatedMap
 *       center={[-74.5, 40]}
 *       zoom={9}
 *       onMapReady={handleMapReady}
 *     >
 *       <ShaderLayer
 *         shaderName="plasma"
 *         config={{ speed: 1.5 }}
 *       />
 *     </AnimatedMap>
 *   );
 * }
 * ```
 */
export function AnimatedMap({
  center = [-74.5, 40],
  zoom = 9,
  style = 'https://demotiles.maplibre.org/style.json',
  className,
  containerStyle,
  mapOptions = {},
  onMapReady,
  onError,
  children,
}: AnimatedMapProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center,
        zoom,
        ...mapOptions,
      });

      map.on('load', () => {
        mapRef.current = map;
        setMapLoaded(true);
        onMapReady?.(map);
      });

      map.on('error', (e) => {
        onError?.(new Error(e.error?.message ?? 'Map error'));
      });

      return () => {
        map.remove();
        mapRef.current = null;
        setMapLoaded(false);
      };
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [style]);

  // Update center
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.setCenter(center);
    }
  }, [center, mapLoaded]);

  // Update zoom
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.setZoom(zoom);
    }
  }, [zoom, mapLoaded]);

  // Clone children and pass map prop
  const childrenWithMap = mapLoaded
    ? Children.map(children, (child) => {
        if (isValidElement(child) && child.type === ShaderLayer) {
          return cloneElement(child, {
            map: mapRef.current,
          } as Partial<React.ComponentProps<typeof ShaderLayer>>);
        }
        return child;
      })
    : null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        ...containerStyle,
      }}
    >
      {childrenWithMap}
    </div>
  );
}
