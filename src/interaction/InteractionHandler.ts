/**
 * FeatureInteractionHandler - Handles MapLibre click/hover events
 *
 * Attaches to map events and dispatches interaction actions
 * to the FeatureAnimationStateManager.
 */

import type { Map as MapLibreMap, MapLayerMouseEvent, MapGeoJSONFeature } from 'maplibre-gl';
import type {
  InteractivityConfig,
  InteractionAction,
  InteractionHandler as InteractionHandlerFn,
  FeatureAnimationState,
} from '../types';
import type { FeatureAnimationStateManager } from './FeatureAnimationStateManager';

/**
 * Handles MapLibre click/hover events and dispatches to state manager
 */
export class FeatureInteractionHandler {
  private map: MapLibreMap;
  private layerId: string;
  private stateManager: FeatureAnimationStateManager;
  private config: InteractivityConfig;

  // Bound event handlers for cleanup
  private clickHandler?: (e: MapLayerMouseEvent) => void;
  private mouseEnterHandler?: (e: MapLayerMouseEvent) => void;
  private mouseLeaveHandler?: () => void;
  private cursorEnterHandler?: () => void;
  private cursorLeaveHandler?: () => void;

  // Track hovered feature for leave events
  private hoveredFeatureId: string | number | null = null;

  constructor(
    map: MapLibreMap,
    layerId: string,
    stateManager: FeatureAnimationStateManager,
    config: InteractivityConfig
  ) {
    this.map = map;
    this.layerId = layerId;
    this.stateManager = stateManager;
    this.config = config;

    this.attach();
  }

  /**
   * Attach event listeners to the map
   */
  private attach(): void {
    // Click handler
    if (this.config.onClick) {
      this.clickHandler = (e: MapLayerMouseEvent) => this.handleClick(e);
      this.map.on('click', this.layerId, this.clickHandler);
    }

    // Hover handlers
    if (this.config.onHover) {
      this.mouseEnterHandler = (e: MapLayerMouseEvent) => this.handleMouseEnter(e);
      this.mouseLeaveHandler = () => this.handleMouseLeave();

      this.map.on('mouseenter', this.layerId, this.mouseEnterHandler);
      this.map.on('mouseleave', this.layerId, this.mouseLeaveHandler);

      // Change cursor on hover
      this.cursorEnterHandler = () => {
        this.map.getCanvas().style.cursor = 'pointer';
      };
      this.cursorLeaveHandler = () => {
        this.map.getCanvas().style.cursor = '';
      };

      this.map.on('mouseenter', this.layerId, this.cursorEnterHandler);
      this.map.on('mouseleave', this.layerId, this.cursorLeaveHandler);
    }
  }

  /**
   * Handle click events
   */
  private handleClick(e: MapLayerMouseEvent): void {
    const features = e.features;
    const feature = features?.[0];
    if (!feature) return;

    const featureId = this.stateManager.getFeatureIdFromMapLibreFeature(feature);
    this.executeAction(this.config.onClick!, feature, featureId);
  }

  /**
   * Handle mouse enter events
   */
  private handleMouseEnter(e: MapLayerMouseEvent): void {
    const features = e.features;
    const feature = features?.[0];
    if (!feature) return;

    const featureId = this.stateManager.getFeatureIdFromMapLibreFeature(feature);
    this.hoveredFeatureId = featureId;

    if (this.config.onHover?.enter) {
      this.executeAction(this.config.onHover.enter, feature, featureId);
    }
  }

  /**
   * Handle mouse leave events
   */
  private handleMouseLeave(): void {
    if (this.hoveredFeatureId == null) return;

    if (this.config.onHover?.leave) {
      // Get the state for the hovered feature
      const state = this.stateManager.getState(this.hoveredFeatureId);

      // Create a minimal feature for the callback
      const dummyFeature: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      };

      this.executeAction(this.config.onHover.leave, dummyFeature, this.hoveredFeatureId, state);
    }

    this.hoveredFeatureId = null;
  }

  /**
   * Execute an interaction action
   */
  private executeAction(
    action: InteractionAction | InteractionHandlerFn,
    feature: GeoJSON.Feature | MapGeoJSONFeature,
    featureId: string | number,
    existingState?: FeatureAnimationState
  ): void {
    if (typeof action === 'function') {
      const state = existingState ?? this.stateManager.getState(featureId);
      if (state) {
        // Convert MapGeoJSONFeature to GeoJSON.Feature for the callback
        const geoJsonFeature: GeoJSON.Feature = {
          type: 'Feature',
          id: feature.id,
          properties: feature.properties ?? {},
          geometry: feature.geometry,
        };
        action(geoJsonFeature, state);
      }
    } else {
      switch (action) {
        case 'toggle':
          this.stateManager.toggleFeature(featureId);
          break;
        case 'play':
          this.stateManager.playFeature(featureId);
          break;
        case 'pause':
          this.stateManager.pauseFeature(featureId);
          break;
        case 'reset':
          this.stateManager.resetFeature(featureId);
          break;
        case 'playOnce':
          this.stateManager.playOnce(featureId);
          break;
      }
    }
  }

  /**
   * Cleanup event listeners
   */
  dispose(): void {
    if (this.clickHandler) {
      this.map.off('click', this.layerId, this.clickHandler);
    }
    if (this.mouseEnterHandler) {
      this.map.off('mouseenter', this.layerId, this.mouseEnterHandler);
    }
    if (this.mouseLeaveHandler) {
      this.map.off('mouseleave', this.layerId, this.mouseLeaveHandler);
    }
    if (this.cursorEnterHandler) {
      this.map.off('mouseenter', this.layerId, this.cursorEnterHandler);
    }
    if (this.cursorLeaveHandler) {
      this.map.off('mouseleave', this.layerId, this.cursorLeaveHandler);
    }
  }
}
