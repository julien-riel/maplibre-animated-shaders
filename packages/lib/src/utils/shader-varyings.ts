/**
 * Shader Varyings Reference
 *
 * Defines the available varyings for each geometry type.
 * Used for improved error messages and documentation.
 *
 * @module utils/shader-varyings
 */

import type { GeometryType } from '../types';

/**
 * Varying information with type and description
 */
export interface VaryingInfo {
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4';
  description: string;
}

/**
 * Available varyings for each geometry type
 *
 * These varyings are defined in the vertex shaders and available
 * for use in fragment shaders.
 */
export const AVAILABLE_VARYINGS: Record<GeometryType, VaryingInfo[]> = {
  point: [
    {
      name: 'v_pos',
      type: 'vec2',
      description: 'Position within the quad (-1 to 1). Use length(v_pos) for distance to center.',
    },
    {
      name: 'v_index',
      type: 'float',
      description: 'Index of the point in the data source',
    },
    {
      name: 'v_timeOffset',
      type: 'float',
      description: 'Time offset for desynchronized animations',
    },
    {
      name: 'v_effectiveTime',
      type: 'float',
      description: 'Effective animation time (handles pause/play automatically)',
    },
    {
      name: 'v_color',
      type: 'vec4',
      description: 'Data-driven color (RGBA, values 0-1)',
    },
    {
      name: 'v_intensity',
      type: 'float',
      description: 'Data-driven intensity',
    },
    {
      name: 'v_useDataDrivenColor',
      type: 'float',
      description: 'Flag (0.0 or 1.0) indicating if color is data-driven',
    },
    {
      name: 'v_useDataDrivenIntensity',
      type: 'float',
      description: 'Flag (0.0 or 1.0) indicating if intensity is data-driven',
    },
  ],

  line: [
    {
      name: 'v_pos',
      type: 'vec2',
      description:
        'Position in segment. v_pos.x = position along (-1 to 1), v_pos.y = perpendicular distance (-1 to 1)',
    },
    {
      name: 'v_progress',
      type: 'float',
      description: 'Progress along the complete line (0 to 1)',
    },
    {
      name: 'v_line_index',
      type: 'float',
      description: 'Index of the line in the source',
    },
    {
      name: 'v_width',
      type: 'float',
      description: 'Line width in pixels',
    },
    {
      name: 'v_timeOffset',
      type: 'float',
      description: 'Time offset for desynchronized animations',
    },
    {
      name: 'v_effectiveTime',
      type: 'float',
      description: 'Effective animation time (handles pause/play automatically)',
    },
    {
      name: 'v_color',
      type: 'vec4',
      description: 'Data-driven color (RGBA, values 0-1)',
    },
    {
      name: 'v_intensity',
      type: 'float',
      description: 'Data-driven intensity',
    },
    {
      name: 'v_useDataDrivenColor',
      type: 'float',
      description: 'Flag (0.0 or 1.0) indicating if color is data-driven',
    },
    {
      name: 'v_useDataDrivenIntensity',
      type: 'float',
      description: 'Flag (0.0 or 1.0) indicating if intensity is data-driven',
    },
  ],

  polygon: [
    {
      name: 'v_pos',
      type: 'vec2',
      description: 'Vertex position in Mercator coordinates',
    },
    {
      name: 'v_uv',
      type: 'vec2',
      description: 'Normalized UV coordinates within polygon bounds (0 to 1)',
    },
    {
      name: 'v_centroid',
      type: 'vec2',
      description: 'Polygon center in Mercator coordinates',
    },
    {
      name: 'v_polygon_index',
      type: 'float',
      description: 'Index of the polygon',
    },
    {
      name: 'v_screen_pos',
      type: 'vec2',
      description: 'Position in screen pixels',
    },
    {
      name: 'v_timeOffset',
      type: 'float',
      description: 'Time offset for desynchronized animations',
    },
    {
      name: 'v_effectiveTime',
      type: 'float',
      description: 'Effective animation time (handles pause/play automatically)',
    },
    {
      name: 'v_color',
      type: 'vec4',
      description: 'Data-driven color (RGBA, values 0-1)',
    },
    {
      name: 'v_intensity',
      type: 'float',
      description: 'Data-driven intensity',
    },
    {
      name: 'v_useDataDrivenColor',
      type: 'float',
      description: 'Flag (0.0 or 1.0) indicating if color is data-driven',
    },
    {
      name: 'v_useDataDrivenIntensity',
      type: 'float',
      description: 'Flag (0.0 or 1.0) indicating if intensity is data-driven',
    },
  ],

  global: [
    {
      name: 'v_uv',
      type: 'vec2',
      description: 'Viewport UV coordinates (0 to 1)',
    },
    {
      name: 'v_screen_pos',
      type: 'vec2',
      description: 'Position in screen pixels',
    },
    {
      name: 'v_map_center',
      type: 'vec2',
      description: 'Map center coordinates (lng, lat)',
    },
    {
      name: 'v_zoom',
      type: 'float',
      description: 'Current map zoom level',
    },
  ],
};

/**
 * Get list of varying names for a geometry type
 */
export function getVaryingNames(geometryType: GeometryType): string[] {
  return AVAILABLE_VARYINGS[geometryType].map((v) => v.name);
}

/**
 * Check if a varying is available for a geometry type
 */
export function isVaryingAvailable(geometryType: GeometryType, varyingName: string): boolean {
  return AVAILABLE_VARYINGS[geometryType].some((v) => v.name === varyingName);
}

/**
 * Get a formatted string listing available varyings for a geometry type
 */
export function formatAvailableVaryings(geometryType: GeometryType): string {
  const varyings = AVAILABLE_VARYINGS[geometryType];
  const lines = varyings.map((v) => `  - ${v.name} (${v.type}): ${v.description}`);
  return lines.join('\n');
}

/**
 * Suggest a replacement varying when a wrong one is used
 * Returns null if no suggestion is available
 */
export function suggestVaryingReplacement(
  geometryType: GeometryType,
  missingVarying: string
): string | null {
  // Common mistakes and their suggestions
  const suggestions: Record<string, Record<GeometryType, string | null>> = {
    v_uv: {
      point: "Use 'v_pos' instead. v_pos ranges from -1 to 1 within the point quad.",
      line: "Use 'v_pos' instead. v_pos.x = along line, v_pos.y = perpendicular distance.",
      polygon: null, // v_uv is available for polygon
      global: null, // v_uv is available for global
    },
    v_progress: {
      point: "Use 'v_index' for feature identification or 'v_effectiveTime' for animation.",
      polygon:
        "Use 'v_uv' for normalized position within polygon bounds (0 to 1), or 'v_effectiveTime' for animation.",
      line: null, // v_progress is available for line
      global: "Use 'v_uv' for normalized viewport position (0 to 1).",
    },
    v_screen_pos: {
      point: "Screen position is not available for points. Use 'v_pos' for local quad position.",
      line: "Screen position is not available for lines. Use 'v_pos' for local segment position.",
      polygon: null, // v_screen_pos is available for polygon
      global: null, // v_screen_pos is available for global
    },
    v_centroid: {
      point: 'Centroid is not available for points. The point center is at v_pos = (0, 0).',
      line: "Centroid is not available for lines. Use 'v_progress' for position along the line.",
      polygon: null, // v_centroid is available for polygon
      global: "Centroid is not available for global shaders. Use 'v_map_center' for map center.",
    },
  };

  const variantSuggestions = suggestions[missingVarying];
  if (variantSuggestions) {
    return variantSuggestions[geometryType] ?? null;
  }

  return null;
}
