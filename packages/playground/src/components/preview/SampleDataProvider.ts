/**
 * SampleDataProvider - Provides sample GeoJSON data for preview
 */

import type { FeatureCollection } from 'geojson';
import type { GeometryType } from 'maplibre-animated-shaders';
import { samplePoints, sampleLines, samplePolygons } from '../../data/sample-geojson';

/**
 * Sample data provider
 */
export class SampleDataProvider {
  /**
   * Get sample data for a geometry type
   */
  getData(geometry: GeometryType): FeatureCollection | null {
    switch (geometry) {
      case 'point':
        return samplePoints;
      case 'line':
        return sampleLines;
      case 'polygon':
        return samplePolygons;
      case 'global':
        // Global layers don't need data
        return null;
      default:
        return null;
    }
  }

  /**
   * Get source ID for a geometry type
   */
  getSourceId(geometry: GeometryType): string {
    return `sample-${geometry}`;
  }

  /**
   * Get layer ID for a geometry type
   */
  getLayerId(geometry: GeometryType): string {
    return `preview-${geometry}`;
  }

  /**
   * Get appropriate zoom level for sample data
   */
  getZoomLevel(geometry: GeometryType): number {
    switch (geometry) {
      case 'point':
        return 1.5;
      case 'line':
        return 1;
      case 'polygon':
        return 2;
      case 'global':
        return 2;
      default:
        return 2;
    }
  }

  /**
   * Get center coordinates for sample data
   */
  getCenter(geometry: GeometryType): [number, number] {
    switch (geometry) {
      case 'point':
        return [20, 30];
      case 'line':
        return [40, 35];
      case 'polygon':
        return [30, 30];
      case 'global':
        return [0, 20];
      default:
        return [0, 20];
    }
  }
}
