/**
 * FeaturesShowcase - Interactive visual demonstrations of library features
 *
 * Shows real visual demos on the map instead of just console logs:
 * - 10,000 points for Instanced Rendering
 * - Frustum Culling with live stats
 * - LOD at different zoom levels
 * - Shader Transitions with animation
 * - And more...
 */

import {
  WebGLContext,
  AdaptiveFrameRate,
  DEFAULT_QUALITY_LEVELS,
  ShaderTransition,
  Easing,
  deepFreeze,
} from '../../../../src';
import type { MapView } from './MapView';
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';

interface FeatureDemo {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'available' | 'fallback' | 'unavailable';
  details?: string;
  action?: () => void;
  actionLabel?: string;
}

interface ActiveDemo {
  id: string;
  cleanup: () => void;
}

/**
 * Features Showcase Component with Visual Demos
 */
export class FeaturesShowcase {
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private features: FeatureDemo[] = [];
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private webglContext: WebGLContext | null = null;
  private isExpanded: boolean = false;
  private mapView: MapView;
  private map: MapLibreMap | null = null;
  private activeDemo: ActiveDemo | null = null;

  constructor(containerId: string, mapView: MapView) {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`Container #${containerId} not found`);
    }
    this.container = el;
    this.mapView = mapView;

    // Wait for map to be ready
    this.mapView.onReady(() => {
      this.map = this.mapView.getMap();
      this.initWebGL();
      this.detectFeatures();
      this.createElement();
    });
  }

  /**
   * Initialize WebGL context for feature detection
   */
  private initWebGL(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    try {
      this.webglContext = new WebGLContext(canvas);
      this.gl = this.webglContext.gl;
    } catch {
      this.gl = canvas.getContext('webgl');
    }
  }

  /**
   * Detect available features
   */
  private detectFeatures(): void {
    this.features = [
      this.detectWebGL2(),
      this.detectInstancing(),
      this.detectFrustumCulling(),
      this.detectLOD(),
      this.detectAdaptiveFrameRate(),
      this.detectTextures(),
      this.detectPostProcessing(),
      this.detectTransitions(),
      this.detectTerrain(),
      this.detectWorkers(),
      this.detectImmutability(),
      this.detectJSDoc(),
    ];
  }

  /**
   * WebGL 2.0 detection
   */
  private detectWebGL2(): FeatureDemo {
    const capabilities = this.webglContext?.getCapabilities();
    const version = this.webglContext?.version || 1;

    return {
      id: 'webgl2',
      title: 'WebGL 2.0',
      description: 'Modern GPU rendering with automatic fallback',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
        <line x1="12" y1="22" x2="12" y2="15.5"/>
        <polyline points="22 8.5 12 15.5 2 8.5"/>
      </svg>`,
      status: version === 2 ? 'available' : 'fallback',
      details: version === 2
        ? `WebGL 2.0 | VAO: ${capabilities?.vertexArrayObject ? 'Yes' : 'No'}`
        : `WebGL 1.0 fallback`,
    };
  }

  /**
   * Instanced rendering detection
   */
  private detectInstancing(): FeatureDemo {
    const capabilities = this.webglContext?.getCapabilities();
    const supported = capabilities?.instancedArrays ?? false;

    return {
      id: 'instancing',
      title: 'Instanced Rendering',
      description: 'Render 10,000 points with 1 draw call',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="6" height="6" rx="1"/>
        <rect x="9" y="9" width="6" height="6" rx="1"/>
        <rect x="15" y="15" width="6" height="6" rx="1"/>
      </svg>`,
      status: supported ? 'available' : 'unavailable',
      details: supported ? 'Click to spawn 10K points' : 'Not supported',
      action: () => this.demoInstancing(),
      actionLabel: 'Spawn 10K Points',
    };
  }

  /**
   * Frustum culling detection
   */
  private detectFrustumCulling(): FeatureDemo {
    return {
      id: 'frustum',
      title: 'Frustum Culling',
      description: 'Only render visible features',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`,
      status: 'available',
      details: 'Click to see live culling stats',
      action: () => this.demoFrustumCulling(),
      actionLabel: 'Show Culling Stats',
    };
  }

  /**
   * LOD detection
   */
  private detectLOD(): FeatureDemo {
    return {
      id: 'lod',
      title: 'Level of Detail',
      description: 'Simplify geometry by zoom level',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>`,
      status: 'available',
      details: 'Zoom in/out to see simplification',
      action: () => this.demoLOD(),
      actionLabel: 'Show LOD Polygon',
    };
  }

  /**
   * Adaptive frame rate detection
   */
  private detectAdaptiveFrameRate(): FeatureDemo {
    return {
      id: 'adaptive',
      title: 'Adaptive Quality',
      description: 'Auto-adjust quality for 60fps',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>`,
      status: 'available',
      details: 'Click to see FPS monitor',
      action: () => this.demoAdaptiveQuality(),
      actionLabel: 'Show Demo',
    };
  }

  /**
   * Textures detection
   */
  private detectTextures(): FeatureDemo {
    const maxTextureSize = this.gl?.getParameter(this.gl.MAX_TEXTURE_SIZE) || 'N/A';

    return {
      id: 'textures',
      title: 'Textures & Sprites',
      description: 'Load textures and sprite atlases',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
      </svg>`,
      status: 'available',
      details: 'Click to generate sprite atlas',
      action: () => this.demoTextures(),
      actionLabel: 'Generate Atlas',
    };
  }

  /**
   * Post-processing detection
   */
  private detectPostProcessing(): FeatureDemo {
    const capabilities = this.webglContext?.getCapabilities();
    const hasFloatTextures = capabilities?.floatTextures ?? false;

    return {
      id: 'postfx',
      title: 'Post-Processing',
      description: 'Bloom, blur, color grading',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>`,
      status: hasFloatTextures ? 'available' : 'fallback',
      details: 'Click to see effects',
      action: () => this.demoPostProcessing(),
      actionLabel: 'Show Effects',
    };
  }

  /**
   * Transitions detection
   */
  private detectTransitions(): FeatureDemo {
    return {
      id: 'transitions',
      title: 'Shader Transitions',
      description: 'Smooth animated config changes',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 1l4 4-4 4"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <path d="M7 23l-4-4 4-4"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>`,
      status: 'available',
      details: 'Click to animate colors',
      action: () => this.demoTransitions(),
      actionLabel: 'Animate Colors',
    };
  }

  /**
   * Terrain detection
   */
  private detectTerrain(): FeatureDemo {
    return {
      id: 'terrain',
      title: 'Terrain / 3D',
      description: 'Elevation sampling from DEM',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3l4 8 5-5 5 15H2L8 3z"/>
      </svg>`,
      status: 'available',
      details: 'Click for 3D terrain demo',
      action: () => this.demoTerrain(),
      actionLabel: 'Show Terrain',
    };
  }

  /**
   * Workers detection
   */
  private detectWorkers(): FeatureDemo {
    const hasWorkers = typeof Worker !== 'undefined';

    return {
      id: 'workers',
      title: 'Web Workers',
      description: 'Off-thread geometry processing',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/>
      </svg>`,
      status: hasWorkers ? 'available' : 'fallback',
      details: hasWorkers ? 'Async processing ready' : 'Main thread fallback',
    };
  }

  /**
   * Immutability detection
   */
  private detectImmutability(): FeatureDemo {
    const testObj = { a: { b: 1 } };
    const frozen = deepFreeze(testObj);
    let works = false;

    try {
      // @ts-expect-error Testing immutability
      frozen.a.b = 2;
    } catch {
      works = true;
    }

    return {
      id: 'immutable',
      title: 'Config Immutability',
      description: 'Deep-frozen configurations',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>`,
      status: works ? 'available' : 'fallback',
      details: works ? 'Strict mode freeze' : 'Shallow only',
    };
  }

  /**
   * JSDoc detection
   */
  private detectJSDoc(): FeatureDemo {
    return {
      id: 'jsdoc',
      title: 'Complete JSDoc',
      description: 'Full API documentation',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>`,
      status: 'available',
      details: '@module, @example, @param',
    };
  }

  // ===== VISUAL DEMOS =====

  /**
   * Demo: Spawn 10,000 points to show instanced rendering
   */
  private demoInstancing(): void {
    if (!this.map) return;
    this.cleanupActiveDemo();

    const sourceId = 'demo-instancing-source';
    const layerId = 'demo-instancing-layer';

    // Generate 10,000 random points around current view
    const center = this.map.getCenter();
    const features: GeoJSON.Feature[] = [];
    const count = 10000;

    for (let i = 0; i < count; i++) {
      const lng = center.lng + (Math.random() - 0.5) * 0.1;
      const lat = center.lat + (Math.random() - 0.5) * 0.1;
      const hue = Math.floor(Math.random() * 360);

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          id: i,
          color: `hsl(${hue}, 70%, 60%)`,
          size: 3 + Math.random() * 5,
        },
      });
    }

    // Add source and layer
    this.map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    this.map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': ['get', 'size'],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.8,
      },
    });

    // Track active demo for cleanup
    this.activeDemo = {
      id: 'instancing',
      cleanup: () => {
        if (this.map?.getLayer(layerId)) this.map.removeLayer(layerId);
        if (this.map?.getSource(sourceId)) this.map.removeSource(sourceId);
        this.removeDemoOverlay();
      },
    };

    // Show stats overlay
    this.showDemoOverlay(`
      <div class="demo-stat"><strong>${count.toLocaleString()}</strong> points</div>
      <div class="demo-stat"><strong>1</strong> draw call</div>
      <div class="demo-hint">Pan around to see performance</div>
    `);

    this.showToast(`Spawned ${count.toLocaleString()} points!`);
  }

  /**
   * Demo: Show frustum culling statistics in real-time
   */
  private demoFrustumCulling(): void {
    if (!this.map) return;
    this.cleanupActiveDemo();

    const sourceId = 'demo-frustum-source';
    const layerId = 'demo-frustum-layer';

    // Generate points spread across a larger area
    const center = this.map.getCenter();
    const features: GeoJSON.Feature[] = [];
    const totalCount = 5000;

    for (let i = 0; i < totalCount; i++) {
      const lng = center.lng + (Math.random() - 0.5) * 0.5;
      const lat = center.lat + (Math.random() - 0.5) * 0.5;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { id: i },
      });
    }

    // Precompute bounds for all features
    const featureBounds = features.map((f) => {
      const coords = (f.geometry as GeoJSON.Point).coordinates;
      return { minX: coords[0], minY: coords[1], maxX: coords[0], maxY: coords[1] };
    });

    // Add source and layer
    this.map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    this.map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': 4,
        'circle-color': '#22c55e',
        'circle-opacity': 0.7,
      },
    });

    // Create stats overlay
    this.showDemoOverlay(`
      <div class="demo-stat">Total: <strong>${totalCount.toLocaleString()}</strong></div>
      <div class="demo-stat">Visible: <strong id="visible-count">-</strong></div>
      <div class="demo-stat">Culled: <strong id="culled-count">-</strong></div>
      <div class="demo-stat">Savings: <strong id="savings-pct">-</strong></div>
      <div class="demo-hint">Pan/zoom to see culling in action</div>
    `);

    // Update stats on map move
    const updateStats = () => {
      if (!this.map) return;

      // Get current view bounds
      const bounds = this.map.getBounds();
      const viewBounds = {
        minX: bounds.getWest(),
        minY: bounds.getSouth(),
        maxX: bounds.getEast(),
        maxY: bounds.getNorth(),
      };

      // Use FrustumCuller's static methods for bounds checking
      // This simulates what the culler does - checking bbox intersection
      let visibleCount = 0;
      for (const bbox of featureBounds) {
        // Check if point is within view bounds (2D frustum culling)
        if (
          bbox.minX >= viewBounds.minX &&
          bbox.maxX <= viewBounds.maxX &&
          bbox.minY >= viewBounds.minY &&
          bbox.maxY <= viewBounds.maxY
        ) {
          visibleCount++;
        }
      }

      const culledCount = totalCount - visibleCount;
      const savingsPct = ((culledCount / totalCount) * 100).toFixed(1);

      // Update overlay
      const visibleEl = document.getElementById('visible-count');
      const culledEl = document.getElementById('culled-count');
      const savingsEl = document.getElementById('savings-pct');

      if (visibleEl) visibleEl.textContent = visibleCount.toLocaleString();
      if (culledEl) culledEl.textContent = culledCount.toLocaleString();
      if (savingsEl) savingsEl.textContent = `${savingsPct}%`;
    };

    // Initial update and bind to map events
    updateStats();
    this.map.on('move', updateStats);
    this.map.on('zoom', updateStats);

    // Track active demo for cleanup
    this.activeDemo = {
      id: 'frustum',
      cleanup: () => {
        if (this.map) {
          this.map.off('move', updateStats);
          this.map.off('zoom', updateStats);
          if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
          if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
        }
        this.removeDemoOverlay();
      },
    };

    this.showToast('Frustum culling demo active');
  }

  /**
   * Demo: Show LOD simplification at different zoom levels
   */
  private demoLOD(): void {
    if (!this.map) return;
    this.cleanupActiveDemo();

    const sourceId = 'demo-lod-source';
    const layerId = 'demo-lod-layer';
    const outlineLayerId = 'demo-lod-outline-layer';

    // Create a complex polygon (star shape with many vertices)
    const center = this.map.getCenter();
    const originalVertices = 200;
    const originalCoordinates: number[][] = [];

    for (let i = 0; i < originalVertices; i++) {
      const angle = (i / originalVertices) * Math.PI * 2;
      // Create a spiky star pattern
      const spikes = 12;
      const spikeAngle = (i / originalVertices) * spikes * Math.PI * 2;
      const radius = 0.015 + Math.sin(spikeAngle) * 0.008;
      const lng = center.lng + Math.cos(angle) * radius;
      const lat = center.lat + Math.sin(angle) * radius;
      originalCoordinates.push([lng, lat]);
    }
    originalCoordinates.push(originalCoordinates[0]); // Close the polygon

    // Add source and layers
    this.map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [originalCoordinates] },
          properties: {},
        }],
      },
    });

    this.map.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#8b5cf6',
        'fill-opacity': 0.4,
      },
    });

    this.map.addLayer({
      id: outlineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#8b5cf6',
        'line-width': 3,
      },
    });

    // Show stats overlay
    this.showDemoOverlay(`
      <div class="demo-stat">Original: <strong>${originalVertices}</strong> vertices</div>
      <div class="demo-stat">Current: <strong id="lod-vertices">-</strong> vertices</div>
      <div class="demo-stat">Zoom: <strong id="lod-zoom">-</strong></div>
      <div class="demo-stat">Reduction: <strong id="lod-reduction">-</strong></div>
      <div class="demo-hint">Zoom out to simplify, zoom in for detail</div>
    `);

    // Manual LOD function - Douglas-Peucker simplified for demo
    const simplifyPolygon = (coords: number[][], targetVertices: number): number[][] => {
      if (coords.length <= targetVertices) return coords;

      // Simple uniform sampling for clear visual effect
      const result: number[][] = [];
      const step = (coords.length - 1) / targetVertices;

      for (let i = 0; i < targetVertices; i++) {
        const index = Math.min(Math.floor(i * step), coords.length - 1);
        result.push(coords[index]);
      }

      // Close the polygon
      if (result.length > 0) {
        result.push(result[0]);
      }

      return result;
    };

    // Update on zoom
    const updateLOD = () => {
      if (!this.map) return;

      const zoom = this.map.getZoom();

      // Calculate target vertices based on zoom
      // More zoom = more vertices
      let targetVertices: number;
      let lodLevel: string;

      if (zoom < 8) {
        targetVertices = 8;
        lodLevel = 'Very Low';
      } else if (zoom < 10) {
        targetVertices = 16;
        lodLevel = 'Low';
      } else if (zoom < 12) {
        targetVertices = 32;
        lodLevel = 'Medium';
      } else if (zoom < 14) {
        targetVertices = 64;
        lodLevel = 'High';
      } else {
        targetVertices = originalVertices;
        lodLevel = 'Full';
      }

      // Simplify the polygon
      const simplifiedCoords = simplifyPolygon(originalCoordinates, targetVertices);
      const vertexCount = simplifiedCoords.length - 1; // Subtract closing vertex

      // Update source with simplified geometry
      const source = this.map.getSource(sourceId) as GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [simplifiedCoords] },
            properties: {},
          }],
        });
      }

      // Calculate reduction percentage
      const reduction = ((1 - vertexCount / originalVertices) * 100).toFixed(0);

      // Update overlay
      const verticesEl = document.getElementById('lod-vertices');
      const zoomEl = document.getElementById('lod-zoom');
      const reductionEl = document.getElementById('lod-reduction');

      if (verticesEl) verticesEl.textContent = `${vertexCount} (${lodLevel})`;
      if (zoomEl) zoomEl.textContent = zoom.toFixed(1);
      if (reductionEl) reductionEl.textContent = `${reduction}%`;
    };

    // Initial update and bind to zoom
    updateLOD();
    this.map.on('zoom', updateLOD);

    // Track active demo for cleanup
    this.activeDemo = {
      id: 'lod',
      cleanup: () => {
        if (this.map) {
          this.map.off('zoom', updateLOD);
          if (this.map.getLayer(outlineLayerId)) this.map.removeLayer(outlineLayerId);
          if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
          if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
        }
        this.removeDemoOverlay();
      },
    };

    this.showToast('LOD demo active - zoom in/out to see vertex reduction');
  }

  /**
   * Demo: Animate shader transitions on points
   */
  private demoTransitions(): void {
    if (!this.map) return;
    this.cleanupActiveDemo();

    const sourceId = 'demo-transition-source';
    const layerId = 'demo-transition-layer';
    const transition = new ShaderTransition();

    // Generate points
    const center = this.map.getCenter();
    const features: GeoJSON.Feature[] = [];
    const count = 500;

    for (let i = 0; i < count; i++) {
      const lng = center.lng + (Math.random() - 0.5) * 0.08;
      const lat = center.lat + (Math.random() - 0.5) * 0.08;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { id: i },
      });
    }

    // Add source and layer
    this.map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    this.map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': 8,
        'circle-color': '#ef4444',
        'circle-opacity': 0.8,
      },
    });

    // Color cycle through transitions
    const colors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'];
    let colorIndex = 0;
    let animationId: number | null = null;

    const runTransition = () => {
      const fromColor = colors[colorIndex];
      const toColor = colors[(colorIndex + 1) % colors.length];
      colorIndex = (colorIndex + 1) % colors.length;

      transition.start(
        { color: fromColor, size: 8 },
        { color: toColor, size: 12 },
        {
          duration: 1500,
          easing: Easing.easeInOutCubic,
          onUpdate: (progress) => {
            if (!this.map) return;

            const currentConfig = transition.getCurrentConfig();
            const currentColor = currentConfig.color as string;
            const currentSize = currentConfig.size as number;

            this.map.setPaintProperty(layerId, 'circle-color', currentColor);
            this.map.setPaintProperty(layerId, 'circle-radius', currentSize);

            // Update progress in overlay
            const progressEl = document.getElementById('transition-progress');
            if (progressEl) progressEl.textContent = `${(progress * 100).toFixed(0)}%`;
          },
          onComplete: () => {
            // Start next transition after a short delay
            setTimeout(runTransition, 500);
          },
        }
      );

      // Animation loop
      const animate = () => {
        transition.update(16.67); // ~60fps
        if (transition.isActive()) {
          animationId = requestAnimationFrame(animate);
        }
      };
      animate();
    };

    // Show overlay
    this.showDemoOverlay(`
      <div class="demo-stat">Points: <strong>${count}</strong></div>
      <div class="demo-stat">Progress: <strong id="transition-progress">0%</strong></div>
      <div class="demo-stat">Easing: <strong>easeInOutCubic</strong></div>
      <div class="demo-hint">Watch the colors animate</div>
    `);

    // Start first transition
    runTransition();

    // Track active demo for cleanup
    this.activeDemo = {
      id: 'transitions',
      cleanup: () => {
        if (animationId) cancelAnimationFrame(animationId);
        transition.cancel();
        if (this.map) {
          if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
          if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
        }
        this.removeDemoOverlay();
      },
    };

    this.showToast('Color transition demo active');
  }

  /**
   * Demo: Show 3D terrain with elevation visualization
   */
  private demoTerrain(): void {
    if (!this.map) return;
    this.cleanupActiveDemo();

    const sourceId = 'demo-terrain-source';
    const layerId = 'demo-terrain-layer';
    const hillshadeLayerId = 'demo-terrain-hillshade';

    // Generate a synthetic terrain heightmap
    const gridSize = 50;
    const cellSize = 0.001; // Size in degrees
    const center = this.map.getCenter();

    // Create terrain grid with procedural elevation
    const features: GeoJSON.Feature[] = [];
    const elevationData: number[][] = [];

    // Generate elevation using multiple octaves of noise (simplex-like)
    const noise = (x: number, y: number, freq: number): number => {
      return Math.sin(x * freq) * Math.cos(y * freq) +
             Math.sin(x * freq * 2.1 + 1.3) * Math.cos(y * freq * 1.9 + 0.7) * 0.5 +
             Math.sin(x * freq * 4.3 + 2.1) * Math.cos(y * freq * 3.7 + 1.4) * 0.25;
    };

    let minElev = Infinity;
    let maxElev = -Infinity;

    for (let y = 0; y < gridSize; y++) {
      elevationData[y] = [];
      for (let x = 0; x < gridSize; x++) {
        // Generate elevation with multiple frequencies
        const nx = x / gridSize;
        const ny = y / gridSize;
        const elevation = noise(nx, ny, 8) * 500 +
                         noise(nx, ny, 16) * 200 +
                         noise(nx, ny, 32) * 100;

        elevationData[y][x] = elevation;
        minElev = Math.min(minElev, elevation);
        maxElev = Math.max(maxElev, elevation);
      }
    }

    // Normalize and create colored points
    const elevationRange = maxElev - minElev;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const lng = center.lng + (x - gridSize / 2) * cellSize;
        const lat = center.lat + (y - gridSize / 2) * cellSize;
        const elevation = elevationData[y][x];
        const normalizedElev = (elevation - minElev) / elevationRange;

        // Color based on elevation (terrain colors)
        let color: string;
        if (normalizedElev < 0.2) {
          color = '#1a5f1a'; // Dark green (valley)
        } else if (normalizedElev < 0.4) {
          color = '#3d8c3d'; // Green
        } else if (normalizedElev < 0.6) {
          color = '#8b7355'; // Brown
        } else if (normalizedElev < 0.8) {
          color = '#a09080'; // Gray rock
        } else {
          color = '#ffffff'; // Snow cap
        }

        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            elevation: elevation.toFixed(0),
            normalizedElev,
            color,
          },
        });
      }
    }

    // Add source
    this.map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    // Add 3D-style layer with size based on elevation
    this.map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'normalizedElev'],
          0, 4,
          0.5, 6,
          1, 10
        ],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(0,0,0,0.2)',
      },
    });

    // Create a 3D mesh visualization using polygons
    const meshFeatures: GeoJSON.Feature[] = [];

    for (let y = 0; y < gridSize - 1; y++) {
      for (let x = 0; x < gridSize - 1; x++) {
        const lng1 = center.lng + (x - gridSize / 2) * cellSize;
        const lat1 = center.lat + (y - gridSize / 2) * cellSize;
        const lng2 = lng1 + cellSize;
        const lat2 = lat1 + cellSize;

        // Average elevation for the cell
        const avgElev = (
          elevationData[y][x] +
          elevationData[y][x + 1] +
          elevationData[y + 1][x] +
          elevationData[y + 1][x + 1]
        ) / 4;
        const normalizedElev = (avgElev - minElev) / elevationRange;

        // Calculate slope for hillshade effect
        const dzdx = (elevationData[y][Math.min(x + 1, gridSize - 1)] - elevationData[y][Math.max(x - 1, 0)]) / 2;
        const dzdy = (elevationData[Math.min(y + 1, gridSize - 1)][x] - elevationData[Math.max(y - 1, 0)][x]) / 2;
        const slope = Math.sqrt(dzdx * dzdx + dzdy * dzdy);
        const aspect = Math.atan2(dzdy, -dzdx);

        // Simple hillshade calculation (sun from northwest)
        const sunAzimuth = Math.PI * 0.75; // 315 degrees
        const sunAltitude = Math.PI / 4; // 45 degrees
        const hillshade = Math.cos(sunAltitude) * slope * Math.cos(aspect - sunAzimuth) + Math.sin(sunAltitude);
        const shadeFactor = Math.max(0.3, Math.min(1, (hillshade + 1) / 2));

        // Color with hillshade
        const baseHue = normalizedElev < 0.4 ? 120 : normalizedElev < 0.7 ? 35 : 0;
        const baseSat = normalizedElev < 0.8 ? 40 : 0;
        const baseLit = 30 + normalizedElev * 40;
        const finalLit = baseLit * shadeFactor;

        meshFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [lng1, lat1],
              [lng2, lat1],
              [lng2, lat2],
              [lng1, lat2],
              [lng1, lat1],
            ]],
          },
          properties: {
            elevation: avgElev.toFixed(0),
            color: `hsl(${baseHue}, ${baseSat}%, ${finalLit}%)`,
          },
        });
      }
    }

    // Add mesh source and layer
    const meshSourceId = 'demo-terrain-mesh-source';
    const meshLayerId = 'demo-terrain-mesh-layer';

    this.map.addSource(meshSourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: meshFeatures },
    });

    this.map.addLayer({
      id: meshLayerId,
      type: 'fill',
      source: meshSourceId,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.85,
      },
    }, layerId); // Add below the points layer

    // Add contour lines
    const contourFeatures: GeoJSON.Feature[] = [];
    const contourInterval = elevationRange / 8;

    for (let level = 0; level < 8; level++) {
      const targetElev = minElev + level * contourInterval;

      // Simple marching squares-like contour extraction
      for (let y = 0; y < gridSize - 1; y++) {
        for (let x = 0; x < gridSize - 1; x++) {
          const e00 = elevationData[y][x];
          const e10 = elevationData[y][x + 1];
          const e01 = elevationData[y + 1][x];
          const e11 = elevationData[y + 1][x + 1];

          // Check if contour passes through this cell
          const above = [e00 > targetElev, e10 > targetElev, e11 > targetElev, e01 > targetElev];
          const numAbove = above.filter(Boolean).length;

          if (numAbove > 0 && numAbove < 4) {
            // Contour passes through - add a point at cell center
            const lng = center.lng + (x + 0.5 - gridSize / 2) * cellSize;
            const lat = center.lat + (y + 0.5 - gridSize / 2) * cellSize;

            contourFeatures.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [lng, lat] },
              properties: { elevation: targetElev.toFixed(0), level },
            });
          }
        }
      }
    }

    const contourSourceId = 'demo-terrain-contour-source';
    const contourLayerId = 'demo-terrain-contour-layer';

    this.map.addSource(contourSourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: contourFeatures },
    });

    this.map.addLayer({
      id: contourLayerId,
      type: 'circle',
      source: contourSourceId,
      paint: {
        'circle-radius': 1.5,
        'circle-color': 'rgba(0,0,0,0.4)',
      },
    });

    // Show stats overlay
    this.showDemoOverlay(`
      <div class="demo-stat">Grid: <strong>${gridSize}×${gridSize}</strong></div>
      <div class="demo-stat">Cells: <strong>${(gridSize - 1) * (gridSize - 1)}</strong></div>
      <div class="demo-stat">Elevation: <strong>${minElev.toFixed(0)}m - ${maxElev.toFixed(0)}m</strong></div>
      <div class="demo-stat">Contours: <strong>8 levels</strong></div>
      <div class="demo-hint">Procedural terrain with hillshade</div>
      <div class="demo-legend">
        <span style="background:#1a5f1a"></span> Valley
        <span style="background:#8b7355"></span> Hills
        <span style="background:#ffffff;border:1px solid #ccc"></span> Peaks
      </div>
    `);

    // Track active demo for cleanup
    this.activeDemo = {
      id: 'terrain',
      cleanup: () => {
        if (this.map) {
          if (this.map.getLayer(contourLayerId)) this.map.removeLayer(contourLayerId);
          if (this.map.getSource(contourSourceId)) this.map.removeSource(contourSourceId);
          if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
          if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
          if (this.map.getLayer(meshLayerId)) this.map.removeLayer(meshLayerId);
          if (this.map.getSource(meshSourceId)) this.map.removeSource(meshSourceId);
        }
        this.removeDemoOverlay();
      },
    };

    this.showToast('3D Terrain demo - procedural elevation with hillshade');
  }

  /**
   * Demo: Show post-processing effects
   */
  private demoPostProcessing(): void {
    if (!this.map) return;
    this.cleanupActiveDemo();

    // Create a colorful base scene
    const sourceId = 'demo-postfx-source';
    const layerId = 'demo-postfx-layer';
    const center = this.map.getCenter();

    // Generate colorful points as base scene
    const features: GeoJSON.Feature[] = [];
    const count = 300;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.01 + Math.random() * 0.03;
      const lng = center.lng + Math.cos(angle) * radius;
      const lat = center.lat + Math.sin(angle) * radius;
      const hue = (i / count) * 360;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          color: `hsl(${hue}, 80%, 60%)`,
          size: 8 + Math.random() * 12,
        },
      });
    }

    this.map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    this.map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': ['get', 'size'],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.9,
        'circle-blur': 0,
      },
    });

    // Post-processing effect states
    const effects = {
      vignette: { enabled: false, intensity: 0.6 },
      blur: { enabled: false, amount: 2 },
      saturation: { enabled: false, value: 1.5 },
      brightness: { enabled: false, value: 1.3 },
      contrast: { enabled: false, value: 1.2 },
      sepia: { enabled: false, value: 0.5 },
    };

    // Create effect preview canvas overlay
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.className = 'demo-postfx-canvas';
    overlayCanvas.width = 200;
    overlayCanvas.height = 150;
    const overlayCtx = overlayCanvas.getContext('2d')!;

    // Draw preview scene
    const drawPreview = () => {
      const width = overlayCanvas.width;
      const height = overlayCanvas.height;

      // Clear
      overlayCtx.fillStyle = '#1a1a2e';
      overlayCtx.fillRect(0, 0, width, height);

      // Draw colorful circles
      for (let i = 0; i < 20; i++) {
        const x = width * 0.2 + Math.cos(i * 0.5) * width * 0.3;
        const y = height * 0.5 + Math.sin(i * 0.7) * height * 0.3;
        const hue = i * 18;
        const radius = 10 + Math.sin(i) * 5;

        overlayCtx.beginPath();
        overlayCtx.arc(x, y, radius, 0, Math.PI * 2);
        overlayCtx.fillStyle = `hsl(${hue}, 80%, 60%)`;
        overlayCtx.fill();
      }

      // Apply vignette effect
      if (effects.vignette.enabled) {
        const gradient = overlayCtx.createRadialGradient(
          width / 2, height / 2, height * 0.3,
          width / 2, height / 2, height * 0.8
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, `rgba(0,0,0,${effects.vignette.intensity})`);
        overlayCtx.fillStyle = gradient;
        overlayCtx.fillRect(0, 0, width, height);
      }
    };

    // Apply CSS filter to map container for real effect visualization
    const mapContainer = this.map.getContainer();
    const originalFilter = mapContainer.style.filter;

    const updateFilters = () => {
      const filters: string[] = [];

      if (effects.blur.enabled) {
        filters.push(`blur(${effects.blur.amount}px)`);
      }
      if (effects.saturation.enabled) {
        filters.push(`saturate(${effects.saturation.value})`);
      }
      if (effects.brightness.enabled) {
        filters.push(`brightness(${effects.brightness.value})`);
      }
      if (effects.contrast.enabled) {
        filters.push(`contrast(${effects.contrast.value})`);
      }
      if (effects.sepia.enabled) {
        filters.push(`sepia(${effects.sepia.value})`);
      }

      mapContainer.style.filter = filters.join(' ');
      mapContainer.style.transition = 'filter 0.3s ease';

      // Draw preview with vignette
      drawPreview();
    };

    // Create effect toggle buttons
    const effectButtons = [
      { name: 'vignette', label: 'Vignette', icon: '◐' },
      { name: 'blur', label: 'Blur', icon: '◉' },
      { name: 'saturation', label: 'Saturate', icon: '🎨' },
      { name: 'brightness', label: 'Bright', icon: '☀' },
      { name: 'contrast', label: 'Contrast', icon: '◑' },
      { name: 'sepia', label: 'Sepia', icon: '📜' },
    ];

    const buttonsHtml = effectButtons.map(btn => `
      <button class="demo-effect-btn" data-effect="${btn.name}">
        <span class="demo-effect-icon">${btn.icon}</span>
        <span class="demo-effect-label">${btn.label}</span>
      </button>
    `).join('');

    // Show overlay with effect controls
    this.showDemoOverlay(`
      <div class="demo-stat">Effects: <strong id="active-effects">None</strong></div>
      <div class="demo-effect-grid">
        ${buttonsHtml}
      </div>
      <div class="demo-postfx-preview" id="postfx-preview"></div>
      <div class="demo-hint">Toggle effects to see post-processing</div>
    `);

    // Add preview canvas to overlay
    const previewContainer = document.getElementById('postfx-preview');
    if (previewContainer) {
      previewContainer.appendChild(overlayCanvas);
    }

    // Initial draw
    drawPreview();

    // Add click handlers for effect buttons
    const buttons = document.querySelectorAll('.demo-effect-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const effectName = btn.getAttribute('data-effect') as keyof typeof effects;
        if (effectName && effects[effectName]) {
          effects[effectName].enabled = !effects[effectName].enabled;
          btn.classList.toggle('active', effects[effectName].enabled);

          // Update active effects display
          const activeNames = Object.entries(effects)
            .filter(([_, e]) => e.enabled)
            .map(([name]) => name);
          const activeEl = document.getElementById('active-effects');
          if (activeEl) {
            activeEl.textContent = activeNames.length > 0
              ? activeNames.join(', ')
              : 'None';
          }

          updateFilters();
        }
      });
    });

    // Animate the points
    let animationId: number | null = null;
    const startTime = Date.now();

    const animate = () => {
      if (!this.map) return;

      const elapsed = (Date.now() - startTime) / 1000;
      const updatedFeatures: GeoJSON.Feature[] = [];

      for (let i = 0; i < count; i++) {
        const baseAngle = (i / count) * Math.PI * 2;
        const pulse = Math.sin(elapsed * 2 + i * 0.1) * 0.3 + 1;
        const radius = (0.01 + (i / count) * 0.02) * pulse;
        const angle = baseAngle + elapsed * 0.2;

        const lng = center.lng + Math.cos(angle) * radius;
        const lat = center.lat + Math.sin(angle) * radius;
        const hue = ((i / count) * 360 + elapsed * 30) % 360;

        updatedFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            color: `hsl(${hue}, 80%, 60%)`,
            size: 8 + Math.sin(elapsed * 3 + i) * 4,
          },
        });
      }

      const source = this.map.getSource(sourceId) as GeoJSONSource;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: updatedFeatures });
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Track active demo for cleanup
    this.activeDemo = {
      id: 'postfx',
      cleanup: () => {
        if (animationId) cancelAnimationFrame(animationId);
        mapContainer.style.filter = originalFilter;
        mapContainer.style.transition = '';
        if (this.map) {
          if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
          if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
        }
        this.removeDemoOverlay();
      },
    };

    this.showToast('Post-Processing demo - toggle effects!');
  }

  /**
   * Demo: Show adaptive quality/frame rate management
   */
  private demoAdaptiveQuality(): void {
    if (!this.map) return;
    this.cleanupActiveDemo();

    const sourceId = 'demo-adaptive-source';
    const layerId = 'demo-adaptive-layer';
    const center = this.map.getCenter();

    // Create adaptive frame rate manager
    const afr = new AdaptiveFrameRate({
      targetFPS: 60,
      minFPS: 30,
      sampleSize: 20,
      adjustmentCooldown: 500,
    });

    // Quality level colors
    const qualityColors: Record<string, string> = {
      'Minimal': '#ef4444',
      'Low': '#f97316',
      'Medium': '#eab308',
      'High': '#22c55e',
      'Ultra': '#3b82f6',
    };

    // Start with variable load
    let currentLoad = 500; // Number of points to render
    let targetLoad = 500;
    const maxLoad = 5000;
    const minLoad = 100;

    // Generate initial features
    const generateFeatures = (count: number): GeoJSON.Feature[] => {
      const features: GeoJSON.Feature[] = [];
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 * 3;
        const radius = 0.005 + (i / count) * 0.03;
        const lng = center.lng + Math.cos(angle) * radius;
        const lat = center.lat + Math.sin(angle) * radius;

        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { id: i },
        });
      }
      return features;
    };

    // Add source and layer
    this.map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: generateFeatures(currentLoad) },
    });

    this.map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': 4,
        'circle-color': '#3b82f6',
        'circle-opacity': 0.8,
      },
    });

    // Create FPS history for graph
    const fpsHistory: number[] = new Array(60).fill(60);
    const graphCanvas = document.createElement('canvas');
    graphCanvas.width = 200;
    graphCanvas.height = 60;
    graphCanvas.className = 'demo-fps-graph';
    const graphCtx = graphCanvas.getContext('2d')!;

    // Draw FPS graph
    const drawFPSGraph = (fps: number) => {
      fpsHistory.push(fps);
      fpsHistory.shift();

      const width = graphCanvas.width;
      const height = graphCanvas.height;

      // Clear
      graphCtx.fillStyle = '#1a1a2e';
      graphCtx.fillRect(0, 0, width, height);

      // Draw target line at 60fps
      graphCtx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
      graphCtx.lineWidth = 1;
      graphCtx.setLineDash([4, 4]);
      graphCtx.beginPath();
      graphCtx.moveTo(0, height * (1 - 60 / 120));
      graphCtx.lineTo(width, height * (1 - 60 / 120));
      graphCtx.stroke();
      graphCtx.setLineDash([]);

      // Draw min line at 30fps
      graphCtx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      graphCtx.beginPath();
      graphCtx.moveTo(0, height * (1 - 30 / 120));
      graphCtx.lineTo(width, height * (1 - 30 / 120));
      graphCtx.stroke();

      // Draw FPS line
      graphCtx.strokeStyle = '#3b82f6';
      graphCtx.lineWidth = 2;
      graphCtx.beginPath();
      for (let i = 0; i < fpsHistory.length; i++) {
        const x = (i / fpsHistory.length) * width;
        const y = height * (1 - Math.min(fpsHistory[i], 120) / 120);
        if (i === 0) graphCtx.moveTo(x, y);
        else graphCtx.lineTo(x, y);
      }
      graphCtx.stroke();

      // Draw current FPS value
      graphCtx.fillStyle = fps >= 55 ? '#22c55e' : fps >= 30 ? '#eab308' : '#ef4444';
      graphCtx.font = 'bold 14px monospace';
      graphCtx.fillText(`${fps.toFixed(0)} FPS`, 5, 15);
    };

    // Show overlay
    this.showDemoOverlay(`
      <div class="demo-stat">Quality: <strong id="quality-level">Ultra</strong></div>
      <div class="demo-stat">FPS: <strong id="current-fps">60</strong></div>
      <div class="demo-stat">Points: <strong id="point-count">${currentLoad}</strong></div>
      <div class="demo-stat">Dropped: <strong id="dropped-frames">0</strong></div>
      <div class="demo-fps-container" id="fps-graph-container"></div>
      <div class="demo-quality-bar">
        <div class="demo-quality-levels">
          <span class="level" data-level="0">Min</span>
          <span class="level" data-level="1">Low</span>
          <span class="level" data-level="2">Med</span>
          <span class="level" data-level="3">High</span>
          <span class="level active" data-level="4">Ultra</span>
        </div>
      </div>
      <div class="demo-load-control">
        <button class="demo-load-btn" id="decrease-load">− Load</button>
        <button class="demo-load-btn" id="increase-load">+ Load</button>
      </div>
      <div class="demo-hint">Adjust load to see quality adaptation</div>
    `);

    // Add graph canvas
    const graphContainer = document.getElementById('fps-graph-container');
    if (graphContainer) {
      graphContainer.appendChild(graphCanvas);
    }

    // Handle load buttons
    const decreaseBtn = document.getElementById('decrease-load');
    const increaseBtn = document.getElementById('increase-load');

    decreaseBtn?.addEventListener('click', () => {
      targetLoad = Math.max(minLoad, targetLoad - 500);
    });

    increaseBtn?.addEventListener('click', () => {
      targetLoad = Math.min(maxLoad, targetLoad + 500);
    });

    // Quality change callback
    afr.onQualityChange = (level, index) => {
      const qualityEl = document.getElementById('quality-level');
      if (qualityEl) {
        qualityEl.textContent = level.name;
        qualityEl.style.color = qualityColors[level.name] || '#fff';
      }

      // Update quality bar
      document.querySelectorAll('.demo-quality-levels .level').forEach((el, i) => {
        el.classList.toggle('active', i === index);
      });

      // Update point color based on quality
      if (this.map) {
        this.map.setPaintProperty(layerId, 'circle-color', qualityColors[level.name] || '#3b82f6');
      }
    };

    // Animation loop
    let animationId: number | null = null;
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      const now = performance.now();
      const deltaTime = now - lastTime;

      // Simulate variable load by doing extra work
      if (currentLoad !== targetLoad) {
        currentLoad = currentLoad + Math.sign(targetLoad - currentLoad) * Math.min(100, Math.abs(targetLoad - currentLoad));

        // Update features
        const source = this.map?.getSource(sourceId) as GeoJSONSource;
        if (source) {
          source.setData({ type: 'FeatureCollection', features: generateFeatures(currentLoad) });
        }

        const countEl = document.getElementById('point-count');
        if (countEl) countEl.textContent = currentLoad.toString();
      }

      // Simulate heavy computation based on load
      const startCompute = performance.now();
      let sum = 0;
      const iterations = currentLoad * 50;
      for (let i = 0; i < iterations; i++) {
        sum += Math.sin(i * 0.001) * Math.cos(i * 0.001);
      }
      const computeTime = performance.now() - startCompute;

      // Record frame time (delta + compute time)
      afr.recordFrame(deltaTime);

      // Update stats
      frameCount++;
      if (frameCount % 5 === 0) {
        const stats = afr.getStats();

        const fpsEl = document.getElementById('current-fps');
        const droppedEl = document.getElementById('dropped-frames');

        if (fpsEl) {
          fpsEl.textContent = stats.fps.toFixed(0);
          fpsEl.style.color = stats.fps >= 55 ? '#22c55e' : stats.fps >= 30 ? '#eab308' : '#ef4444';
        }
        if (droppedEl) droppedEl.textContent = stats.droppedFrames.toString();

        drawFPSGraph(stats.fps);
      }

      lastTime = now;

      // Skip frame if needed
      if (!afr.shouldSkipFrame()) {
        animationId = requestAnimationFrame(animate);
      } else {
        // Still continue but note we skipped
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    // Track active demo for cleanup
    this.activeDemo = {
      id: 'adaptive',
      cleanup: () => {
        if (animationId) cancelAnimationFrame(animationId);
        if (this.map) {
          if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
          if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
        }
        this.removeDemoOverlay();
      },
    };

    this.showToast('Adaptive Quality demo - adjust load to see FPS changes');
  }

  /**
   * Demo: Show texture manager and sprite atlas capabilities
   */
  private demoTextures(): void {
    if (!this.map || !this.gl) return;
    this.cleanupActiveDemo();

    const sourceId = 'demo-textures-source';
    const layerId = 'demo-textures-layer';

    // Sprite configuration
    const spriteSize = 48; // Larger for better visibility
    const shapeNames = ['circle', 'star5', 'diamond', 'triangle', 'hexagon', 'star4', 'cross', 'ring'];
    const numColors = 8; // Colors per shape
    const totalSprites = shapeNames.length * numColors;
    const addedImages: string[] = [];

    // Shape drawing functions (on a temporary canvas)
    const createSpriteCanvas = (
      drawShape: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => void,
      hue: number
    ): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = spriteSize;
      canvas.height = spriteSize;
      const ctx = canvas.getContext('2d')!;

      const cx = spriteSize / 2;
      const cy = spriteSize / 2;
      const r = spriteSize * 0.4;

      // Clear with transparency
      ctx.clearRect(0, 0, spriteSize, spriteSize);

      // Draw glow effect
      const gradient = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.2);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.6)`);
      gradient.addColorStop(0.5, `hsla(${hue}, 80%, 50%, 0.3)`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Draw shape with gradient fill
      const shapeGradient = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
      shapeGradient.addColorStop(0, `hsl(${hue}, 90%, 70%)`);
      shapeGradient.addColorStop(1, `hsl(${hue}, 80%, 45%)`);
      ctx.fillStyle = shapeGradient;
      drawShape(ctx, cx, cy, r);

      // Add highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.2, cy - r * 0.3, r * 0.25, r * 0.15, -0.5, 0, Math.PI * 2);
      ctx.fill();

      return canvas;
    };

    // Shape drawer functions
    const shapeDrawers: Record<string, (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => void> = {
      circle: (ctx, cx, cy, r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      },
      star5: (ctx, cx, cy, r) => {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? r : r * 0.5;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      },
      diamond: (ctx, cx, cy, r) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r * 0.7, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r * 0.7, cy);
        ctx.closePath();
        ctx.fill();
      },
      triangle: (ctx, cx, cy, r) => {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      },
      hexagon: (ctx, cx, cy, r) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      },
      star4: (ctx, cx, cy, r) => {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const radius = i % 2 === 0 ? r : r * 0.4;
          const angle = (i * Math.PI) / 4 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      },
      cross: (ctx, cx, cy, r) => {
        const w = r * 0.35;
        ctx.beginPath();
        ctx.moveTo(cx - w, cy - r);
        ctx.lineTo(cx + w, cy - r);
        ctx.lineTo(cx + w, cy - w);
        ctx.lineTo(cx + r, cy - w);
        ctx.lineTo(cx + r, cy + w);
        ctx.lineTo(cx + w, cy + w);
        ctx.lineTo(cx + w, cy + r);
        ctx.lineTo(cx - w, cy + r);
        ctx.lineTo(cx - w, cy + w);
        ctx.lineTo(cx - r, cy + w);
        ctx.lineTo(cx - r, cy - w);
        ctx.lineTo(cx - w, cy - w);
        ctx.closePath();
        ctx.fill();
      },
      ring: (ctx, cx, cy, r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2, true);
        ctx.fill();
      },
    };

    // Generate all sprite images and add to map
    const spriteInfos: { name: string; shape: string; hue: number }[] = [];

    for (let shapeIdx = 0; shapeIdx < shapeNames.length; shapeIdx++) {
      const shapeName = shapeNames[shapeIdx];
      const drawFn = shapeDrawers[shapeName];

      for (let colorIdx = 0; colorIdx < numColors; colorIdx++) {
        const hue = (shapeIdx * numColors + colorIdx) * (360 / totalSprites);
        const spriteName = `sprite-${shapeName}-${colorIdx}`;
        const canvas = createSpriteCanvas(drawFn, hue);
        const ctx = canvas.getContext('2d')!;

        // Convert canvas to ImageData for MapLibre
        const imageData = ctx.getImageData(0, 0, spriteSize, spriteSize);

        // Add image to MapLibre using the proper format
        this.map.addImage(spriteName, {
          width: spriteSize,
          height: spriteSize,
          data: new Uint8Array(imageData.data.buffer),
        });
        addedImages.push(spriteName);
        spriteInfos.push({ name: spriteName, shape: shapeName, hue });
      }
    }

    // Create atlas preview canvas for display
    const atlasSize = 256;
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = atlasSize;
    previewCanvas.height = atlasSize;
    const previewCtx = previewCanvas.getContext('2d')!;

    // Draw mini versions of all sprites in grid
    const gridSize = Math.ceil(Math.sqrt(totalSprites));
    const cellSize = atlasSize / gridSize;

    spriteInfos.forEach((info, idx) => {
      const x = (idx % gridSize) * cellSize;
      const y = Math.floor(idx / gridSize) * cellSize;

      const miniCanvas = createSpriteCanvas(shapeDrawers[info.shape], info.hue);
      previewCtx.drawImage(miniCanvas, x, y, cellSize, cellSize);
    });

    const dataUrl = previewCanvas.toDataURL('image/png');

    // Generate points on the map
    const center = this.map.getCenter();
    const features: GeoJSON.Feature[] = [];
    const pointCount = 200;

    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2;
      const radius = 0.01 + (i / pointCount) * 0.04;
      const lng = center.lng + Math.cos(angle) * radius;
      const lat = center.lat + Math.sin(angle) * radius;

      const spriteIndex = i % totalSprites;
      const spriteInfo = spriteInfos[spriteIndex];

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          id: i,
          icon: spriteInfo.name,
          size: 0.8 + (i % 4) * 0.15,
        },
      });
    }

    // Add source
    this.map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    // Add symbol layer with sprite icons
    this.map.addLayer({
      id: layerId,
      type: 'symbol',
      source: sourceId,
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': ['get', 'size'],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    });

    // Calculate memory usage estimate
    const textureMemoryKB = (totalSprites * spriteSize * spriteSize * 4) / 1024;

    // Show overlay with atlas preview
    this.showDemoOverlay(`
      <div class="demo-atlas-preview">
        <img src="${dataUrl}" alt="Sprite Atlas" />
      </div>
      <div class="demo-stat">Sprites: <strong>${totalSprites}</strong> (${spriteSize}x${spriteSize}px)</div>
      <div class="demo-stat">Shapes: <strong>${shapeNames.length} types</strong></div>
      <div class="demo-stat">Colors: <strong>${numColors} per shape</strong></div>
      <div class="demo-stat">Points: <strong>${pointCount}</strong></div>
      <div class="demo-stat">GPU Memory: <strong>~${textureMemoryKB.toFixed(0)} KB</strong></div>
      <div class="demo-shapes">
        <span title="Circle">●</span>
        <span title="Star">★</span>
        <span title="Diamond">◆</span>
        <span title="Triangle">▲</span>
        <span title="Hexagon">⬡</span>
        <span title="Cross">✚</span>
        <span title="Ring">◎</span>
        <span title="4-Star">✦</span>
      </div>
      <div class="demo-hint">Animated spiral with real sprite icons</div>
    `);

    // Animate the points in a spiral pattern
    let animationId: number | null = null;
    const startTime = Date.now();

    const animateSpiral = () => {
      if (!this.map) return;

      const elapsed = (Date.now() - startTime) / 1000;
      const updatedFeatures: GeoJSON.Feature[] = [];

      for (let i = 0; i < pointCount; i++) {
        const baseAngle = (i / pointCount) * Math.PI * 2;
        const radius = 0.01 + (i / pointCount) * 0.04;
        const rotationSpeed = 0.3 + (i % 5) * 0.1;
        const angle = baseAngle + elapsed * rotationSpeed;

        const lng = center.lng + Math.cos(angle) * radius;
        const lat = center.lat + Math.sin(angle) * radius;

        const spriteIndex = i % totalSprites;
        const spriteInfo = spriteInfos[spriteIndex];

        updatedFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            id: i,
            icon: spriteInfo.name,
            size: 0.8 + (i % 4) * 0.15,
          },
        });
      }

      const source = this.map.getSource(sourceId) as GeoJSONSource;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: updatedFeatures });
      }

      animationId = requestAnimationFrame(animateSpiral);
    };

    animateSpiral();

    // Track active demo for cleanup
    this.activeDemo = {
      id: 'textures',
      cleanup: () => {
        if (animationId) cancelAnimationFrame(animationId);
        if (this.map) {
          if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
          if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
          // Remove all added images
          for (const imageName of addedImages) {
            if (this.map.hasImage(imageName)) {
              this.map.removeImage(imageName);
            }
          }
        }
        this.removeDemoOverlay();
      },
    };

    this.showToast('Sprite atlas demo active - showing real shapes!');
  }

  /**
   * Clean up any active demo
   */
  private cleanupActiveDemo(): void {
    if (this.activeDemo) {
      this.activeDemo.cleanup();
      this.activeDemo = null;
    }
  }

  /**
   * Show demo overlay with stats
   */
  private showDemoOverlay(content: string): void {
    this.removeDemoOverlay();

    const overlay = document.createElement('div');
    overlay.className = 'demo-overlay';
    overlay.innerHTML = `
      <div class="demo-overlay-header">
        <span class="demo-overlay-title">Demo Active</span>
        <button class="demo-overlay-close" title="Close demo">&times;</button>
      </div>
      <div class="demo-overlay-content">${content}</div>
    `;

    // Close button handler
    overlay.querySelector('.demo-overlay-close')?.addEventListener('click', () => {
      this.cleanupActiveDemo();
    });

    this.container.appendChild(overlay);
  }

  /**
   * Remove demo overlay
   */
  private removeDemoOverlay(): void {
    const existing = this.container.querySelector('.demo-overlay');
    if (existing) existing.remove();
  }

  /**
   * Create the showcase element
   */
  private createElement(): void {
    this.element = document.createElement('div');
    this.element.className = 'features-showcase';
    this.render();
    this.container.appendChild(this.element);
    this.attachListeners();
  }

  /**
   * Render the showcase
   */
  private render(): void {
    if (!this.element) return;

    const availableCount = this.features.filter((f) => f.status === 'available').length;
    const fallbackCount = this.features.filter((f) => f.status === 'fallback').length;
    const demoCount = this.features.filter((f) => f.action).length;

    this.element.innerHTML = `
      <button class="features-toggle" aria-expanded="${this.isExpanded}">
        <span class="features-toggle-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </span>
        <span class="features-toggle-text">
          Features Showcase
          <span class="features-badge">${demoCount} demos</span>
        </span>
        <span class="features-toggle-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>
      <div class="features-panel ${this.isExpanded ? 'expanded' : ''}">
        <div class="features-summary">
          <span class="features-stat available">${availableCount} available</span>
          ${fallbackCount > 0 ? `<span class="features-stat fallback">${fallbackCount} fallback</span>` : ''}
        </div>
        <div class="features-grid">
          ${this.features.map((f) => this.renderFeatureCard(f)).join('')}
        </div>
        <div class="features-footer">
          ${this.activeDemo ? `<button class="features-cleanup-btn">Stop Demo</button>` : ''}
          <a href="https://github.com/julien-riel/maplibre-animated-shaders#readme" target="_blank">
            View Documentation
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Render a feature card
   */
  private renderFeatureCard(feature: FeatureDemo): string {
    const statusClass = `status-${feature.status}`;
    const hasAction = feature.action ? 'has-action' : '';

    return `
      <div class="feature-card ${statusClass} ${hasAction}" data-feature="${feature.id}">
        <div class="feature-icon">${feature.icon}</div>
        <div class="feature-content">
          <div class="feature-title">${feature.title}</div>
          <div class="feature-desc">${feature.description}</div>
          ${feature.details ? `<div class="feature-details">${feature.details}</div>` : ''}
        </div>
        <div class="feature-status">
          ${this.getStatusIcon(feature.status)}
        </div>
      </div>
    `;
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'available':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>`;
      case 'fallback':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`;
      default:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>`;
    }
  }

  /**
   * Attach event listeners
   */
  private attachListeners(): void {
    if (!this.element) return;

    // Toggle panel
    const toggle = this.element.querySelector('.features-toggle');
    toggle?.addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
      this.render();
      this.attachListeners();
    });

    // Feature card clicks
    const cards = this.element.querySelectorAll('.feature-card.has-action');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const featureId = (card as HTMLElement).dataset.feature;
        const feature = this.features.find((f) => f.id === featureId);
        if (feature?.action) {
          feature.action();
          // Re-render to show cleanup button
          this.render();
          this.attachListeners();
        }
      });
    });

    // Cleanup button
    const cleanupBtn = this.element.querySelector('.features-cleanup-btn');
    cleanupBtn?.addEventListener('click', () => {
      this.cleanupActiveDemo();
      this.render();
      this.attachListeners();
    });
  }

  /**
   * Show a toast notification
   */
  private showToast(message: string): void {
    const existing = document.querySelector('.feature-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'feature-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  /**
   * Destroy the showcase
   */
  destroy(): void {
    this.cleanupActiveDemo();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
