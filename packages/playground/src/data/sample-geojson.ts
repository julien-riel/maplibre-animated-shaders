/**
 * Sample GeoJSON data for preview
 */

import type { FeatureCollection, Point, LineString, Polygon } from 'geojson';

/**
 * Sample points (major world cities)
 */
export const samplePoints: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'New York', severity: 'high', value: 95 },
      geometry: { type: 'Point', coordinates: [-74.006, 40.7128] },
    },
    {
      type: 'Feature',
      properties: { name: 'London', severity: 'medium', value: 72 },
      geometry: { type: 'Point', coordinates: [-0.1276, 51.5074] },
    },
    {
      type: 'Feature',
      properties: { name: 'Tokyo', severity: 'low', value: 45 },
      geometry: { type: 'Point', coordinates: [139.6917, 35.6895] },
    },
    {
      type: 'Feature',
      properties: { name: 'Paris', severity: 'high', value: 88 },
      geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
    },
    {
      type: 'Feature',
      properties: { name: 'Sydney', severity: 'medium', value: 60 },
      geometry: { type: 'Point', coordinates: [151.2093, -33.8688] },
    },
    {
      type: 'Feature',
      properties: { name: 'Dubai', severity: 'critical', value: 100 },
      geometry: { type: 'Point', coordinates: [55.2708, 25.2048] },
    },
    {
      type: 'Feature',
      properties: { name: 'Singapore', severity: 'low', value: 35 },
      geometry: { type: 'Point', coordinates: [103.8198, 1.3521] },
    },
    {
      type: 'Feature',
      properties: { name: 'San Francisco', severity: 'medium', value: 68 },
      geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] },
    },
  ],
};

/**
 * Sample lines (flight routes)
 */
export const sampleLines: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { route: 'NYC-LON', type: 'major', traffic: 90 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-74.006, 40.7128],
          [-40, 50],
          [-0.1276, 51.5074],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { route: 'LON-TYO', type: 'major', traffic: 75 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-0.1276, 51.5074],
          [60, 55],
          [100, 50],
          [139.6917, 35.6895],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { route: 'TYO-SYD', type: 'regional', traffic: 50 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [139.6917, 35.6895],
          [145, 10],
          [151.2093, -33.8688],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { route: 'NYC-SFO', type: 'domestic', traffic: 85 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-74.006, 40.7128],
          [-100, 40],
          [-122.4194, 37.7749],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { route: 'PAR-DXB', type: 'major', traffic: 65 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.3522, 48.8566],
          [30, 40],
          [55.2708, 25.2048],
        ],
      },
    },
  ],
};

/**
 * Sample polygons (countries/regions)
 */
export const samplePolygons: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Region A', density: 80, status: 'active' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-10, 45],
            [10, 45],
            [10, 55],
            [-10, 55],
            [-10, 45],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Region B', density: 45, status: 'warning' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [100, 30],
            [120, 30],
            [120, 45],
            [100, 45],
            [100, 30],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Region C', density: 95, status: 'critical' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-80, 25],
            [-70, 25],
            [-70, 35],
            [-80, 35],
            [-80, 25],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Region D', density: 30, status: 'inactive' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [140, -35],
            [155, -35],
            [155, -20],
            [140, -20],
            [140, -35],
          ],
        ],
      },
    },
  ],
};

/**
 * Get sample data by geometry type
 */
export function getSampleData(geometry: 'point' | 'line' | 'polygon'): FeatureCollection {
  switch (geometry) {
    case 'point':
      return samplePoints;
    case 'line':
      return sampleLines;
    case 'polygon':
      return samplePolygons;
    default:
      return samplePoints;
  }
}
