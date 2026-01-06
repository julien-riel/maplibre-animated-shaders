/**
 * Tests for FeatureInteractionHandler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeatureInteractionHandler } from '../src/interaction/InteractionHandler';
import { FeatureAnimationStateManager } from '../src/interaction/FeatureAnimationStateManager';
import type { InteractivityConfig, FeatureAnimationState } from '../src/types';
import type { Map as MapLibreMap, MapLayerMouseEvent, MapGeoJSONFeature } from 'maplibre-gl';

/**
 * Create a mock MapLibre map
 */
function createMockMap(): MapLibreMap & {
  _handlers: Record<string, Map<string, Array<(e?: unknown) => void>>>;
  _trigger: (event: string, layerId: string, eventData?: unknown) => void;
  _canvas: { style: { cursor: string } };
} {
  const handlers: Record<string, Map<string, Array<(e?: unknown) => void>>> = {};
  const canvas = { style: { cursor: '' } };

  const map = {
    on: vi.fn((event: string, layerIdOrHandler: string | ((e: unknown) => void), handler?: (e: unknown) => void) => {
      if (typeof layerIdOrHandler === 'string' && handler) {
        const layerId = layerIdOrHandler;
        if (!handlers[event]) handlers[event] = new Map();
        if (!handlers[event].get(layerId)) handlers[event].set(layerId, []);
        handlers[event].get(layerId)!.push(handler);
      }
    }),
    off: vi.fn((event: string, layerIdOrHandler: string | ((e: unknown) => void), handler?: (e: unknown) => void) => {
      if (typeof layerIdOrHandler === 'string' && handler && handlers[event]) {
        const layerId = layerIdOrHandler;
        const layerHandlers = handlers[event].get(layerId);
        if (layerHandlers) {
          const idx = layerHandlers.indexOf(handler);
          if (idx !== -1) layerHandlers.splice(idx, 1);
        }
      }
    }),
    getCanvas: vi.fn(() => canvas),
    _handlers: handlers,
    _canvas: canvas,
    _trigger: (event: string, layerId: string, eventData?: unknown) => {
      const layerHandlers = handlers[event]?.get(layerId);
      if (layerHandlers) {
        layerHandlers.forEach((h) => h(eventData));
      }
    },
  };

  return map as unknown as MapLibreMap & typeof map;
}

/**
 * Create a mock state manager
 */
function createMockStateManager(): FeatureAnimationStateManager {
  const states = new Map<string | number, FeatureAnimationState>();

  return {
    getFeatureIdFromMapLibreFeature: vi.fn((feature: MapGeoJSONFeature) => feature.id ?? 0),
    getState: vi.fn((featureId: string | number) => states.get(featureId)),
    toggleFeature: vi.fn((featureId: string | number) => {
      const state = states.get(featureId);
      if (state) state.isPlaying = !state.isPlaying;
    }),
    playFeature: vi.fn((featureId: string | number) => {
      const state = states.get(featureId);
      if (state) state.isPlaying = true;
    }),
    pauseFeature: vi.fn((featureId: string | number) => {
      const state = states.get(featureId);
      if (state) state.isPlaying = false;
    }),
    resetFeature: vi.fn(),
    playOnce: vi.fn(),
    // Helper for tests
    _setState: (id: string | number, state: FeatureAnimationState) => states.set(id, state),
  } as unknown as FeatureAnimationStateManager & {
    _setState: (id: string | number, state: FeatureAnimationState) => void;
  };
}

/**
 * Create a mock click event
 */
function createMockMouseEvent(
  feature?: Partial<MapGeoJSONFeature>
): MapLayerMouseEvent {
  const defaultFeature: MapGeoJSONFeature = {
    id: 1,
    type: 'Feature',
    properties: { name: 'Test' },
    geometry: { type: 'Point', coordinates: [0, 0] },
    layer: { id: 'test-layer', type: 'circle' },
    source: 'test-source',
    sourceLayer: '',
    state: {},
    ...feature,
  } as MapGeoJSONFeature;

  return {
    features: feature ? [{ ...defaultFeature, ...feature }] : [defaultFeature],
    point: { x: 100, y: 100 },
    lngLat: { lng: 0, lat: 0 },
    originalEvent: {} as MouseEvent,
    target: {} as MapLibreMap,
    type: 'click',
    defaultPrevented: false,
    preventDefault: vi.fn(),
  } as unknown as MapLayerMouseEvent;
}

describe('FeatureInteractionHandler', () => {
  let map: ReturnType<typeof createMockMap>;
  let stateManager: ReturnType<typeof createMockStateManager>;

  beforeEach(() => {
    map = createMockMap();
    stateManager = createMockStateManager();
  });

  describe('constructor and attach', () => {
    it('should attach click handler when onClick is configured', () => {
      const config: InteractivityConfig = {
        onClick: 'toggle',
      };

      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      expect(map.on).toHaveBeenCalledWith('click', 'test-layer', expect.any(Function));
    });

    it('should attach hover handlers when onHover is configured', () => {
      const config: InteractivityConfig = {
        onHover: {
          enter: 'play',
          leave: 'pause',
        },
      };

      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      expect(map.on).toHaveBeenCalledWith('mouseenter', 'test-layer', expect.any(Function));
      expect(map.on).toHaveBeenCalledWith('mouseleave', 'test-layer', expect.any(Function));
    });

    it('should change cursor on hover', () => {
      const config: InteractivityConfig = {
        onHover: { enter: 'play' },
      };

      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      // Trigger mouseenter
      map._trigger('mouseenter', 'test-layer', createMockMouseEvent());

      expect(map._canvas.style.cursor).toBe('pointer');
    });

    it('should not attach handlers when no interactions configured', () => {
      const config: InteractivityConfig = {};

      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      expect(map.on).not.toHaveBeenCalled();
    });
  });

  describe('click handling', () => {
    it('should toggle feature on click when action is "toggle"', () => {
      const config: InteractivityConfig = { onClick: 'toggle' };
      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      const event = createMockMouseEvent({ id: 5 });
      map._trigger('click', 'test-layer', event);

      expect(stateManager.getFeatureIdFromMapLibreFeature).toHaveBeenCalled();
      expect(stateManager.toggleFeature).toHaveBeenCalledWith(5);
    });

    it('should play feature on click when action is "play"', () => {
      const config: InteractivityConfig = { onClick: 'play' };
      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      map._trigger('click', 'test-layer', createMockMouseEvent({ id: 3 }));

      expect(stateManager.playFeature).toHaveBeenCalledWith(3);
    });

    it('should pause feature on click when action is "pause"', () => {
      const config: InteractivityConfig = { onClick: 'pause' };
      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      map._trigger('click', 'test-layer', createMockMouseEvent({ id: 7 }));

      expect(stateManager.pauseFeature).toHaveBeenCalledWith(7);
    });

    it('should reset feature on click when action is "reset"', () => {
      const config: InteractivityConfig = { onClick: 'reset' };
      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      map._trigger('click', 'test-layer', createMockMouseEvent({ id: 2 }));

      expect(stateManager.resetFeature).toHaveBeenCalledWith(2);
    });

    it('should playOnce on click when action is "playOnce"', () => {
      const config: InteractivityConfig = { onClick: 'playOnce' };
      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      map._trigger('click', 'test-layer', createMockMouseEvent({ id: 4 }));

      expect(stateManager.playOnce).toHaveBeenCalledWith(4);
    });

    it('should call custom function on click', () => {
      const customHandler = vi.fn();
      const config: InteractivityConfig = { onClick: customHandler };

      stateManager._setState(1, {
        featureId: 1,
        isPlaying: true,
        localTime: 0,
        playCount: 0,
      });

      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      map._trigger('click', 'test-layer', createMockMouseEvent({ id: 1 }));

      expect(customHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'Feature', id: 1 }),
        expect.objectContaining({ featureId: 1, isPlaying: true })
      );
    });

    it('should not call handler if no features in event', () => {
      const config: InteractivityConfig = { onClick: 'toggle' };
      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      const event = { features: [] } as unknown as MapLayerMouseEvent;
      map._trigger('click', 'test-layer', event);

      expect(stateManager.toggleFeature).not.toHaveBeenCalled();
    });

    it('should not call handler if features is undefined', () => {
      const config: InteractivityConfig = { onClick: 'toggle' };
      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      const event = { features: undefined } as unknown as MapLayerMouseEvent;
      map._trigger('click', 'test-layer', event);

      expect(stateManager.toggleFeature).not.toHaveBeenCalled();
    });
  });

  describe('hover handling', () => {
    it('should call enter action on mouseenter', () => {
      const config: InteractivityConfig = {
        onHover: { enter: 'play' },
      };
      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      map._trigger('mouseenter', 'test-layer', createMockMouseEvent({ id: 10 }));

      expect(stateManager.playFeature).toHaveBeenCalledWith(10);
    });

    it('should call leave action on mouseleave', () => {
      const config: InteractivityConfig = {
        onHover: { enter: 'play', leave: 'pause' },
      };

      stateManager._setState(10, {
        featureId: 10,
        isPlaying: true,
        localTime: 0,
        playCount: 0,
      });

      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      // First enter to track the hovered feature
      map._trigger('mouseenter', 'test-layer', createMockMouseEvent({ id: 10 }));
      // Then leave
      map._trigger('mouseleave', 'test-layer');

      expect(stateManager.pauseFeature).toHaveBeenCalledWith(10);
    });

    it('should not call leave action if no feature was hovered', () => {
      const config: InteractivityConfig = {
        onHover: { leave: 'pause' },
      };
      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      map._trigger('mouseleave', 'test-layer');

      expect(stateManager.pauseFeature).not.toHaveBeenCalled();
    });

    it('should call custom function on hover enter', () => {
      const enterHandler = vi.fn();
      const config: InteractivityConfig = {
        onHover: { enter: enterHandler },
      };

      stateManager._setState(5, {
        featureId: 5,
        isPlaying: false,
        localTime: 0,
        playCount: 0,
      });

      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      map._trigger('mouseenter', 'test-layer', createMockMouseEvent({ id: 5 }));

      expect(enterHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'Feature', id: 5 }),
        expect.objectContaining({ featureId: 5 })
      );
    });

    it('should call custom function on hover leave', () => {
      const leaveHandler = vi.fn();
      const config: InteractivityConfig = {
        onHover: { enter: 'play', leave: leaveHandler },
      };

      stateManager._setState(8, {
        featureId: 8,
        isPlaying: true,
        localTime: 5,
        playCount: 1,
      });

      new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      map._trigger('mouseenter', 'test-layer', createMockMouseEvent({ id: 8 }));
      map._trigger('mouseleave', 'test-layer');

      expect(leaveHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'Feature' }),
        expect.objectContaining({ featureId: 8 })
      );
    });
  });

  describe('dispose', () => {
    it('should remove all event listeners on dispose', () => {
      const config: InteractivityConfig = {
        onClick: 'toggle',
        onHover: { enter: 'play', leave: 'pause' },
      };

      const handler = new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      handler.dispose();

      expect(map.off).toHaveBeenCalledWith('click', 'test-layer', expect.any(Function));
      expect(map.off).toHaveBeenCalledWith('mouseenter', 'test-layer', expect.any(Function));
      expect(map.off).toHaveBeenCalledWith('mouseleave', 'test-layer', expect.any(Function));
    });

    it('should only remove listeners that were attached', () => {
      const config: InteractivityConfig = {
        onClick: 'toggle',
      };

      const handler = new FeatureInteractionHandler(map, 'test-layer', stateManager, config);

      handler.dispose();

      expect(map.off).toHaveBeenCalledWith('click', 'test-layer', expect.any(Function));
      expect(map.off).not.toHaveBeenCalledWith('mouseenter', 'test-layer', expect.any(Function));
    });
  });
});
