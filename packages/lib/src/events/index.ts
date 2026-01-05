/**
 * Centralized event system for maplibre-animated-shaders
 * Provides a typed EventEmitter for shader lifecycle events.
 */

import type { ShaderConfig } from '../types';

// ============================================
// Event Types
// ============================================

/**
 * All possible event types emitted by the shader system
 */
export type ShaderEventType =
  // Shader lifecycle events
  | 'shader:registered'
  | 'shader:unregistered'
  | 'shader:configUpdated'
  // Playback events
  | 'shader:play'
  | 'shader:pause'
  | 'shader:speedChanged'
  // Plugin events
  | 'plugin:registered'
  | 'plugin:unregistered'
  // Error events
  | 'error'
  // Performance events
  | 'performance:warning'
  | 'performance:frame'
  // Lifecycle events
  | 'destroyed';

// ============================================
// Event Payloads
// ============================================

export interface ShaderRegisteredEvent {
  type: 'shader:registered';
  layerId: string;
  shaderName: string;
  config: ShaderConfig;
}

export interface ShaderUnregisteredEvent {
  type: 'shader:unregistered';
  layerId: string;
}

export interface ShaderConfigUpdatedEvent {
  type: 'shader:configUpdated';
  layerId: string;
  previousConfig: ShaderConfig;
  newConfig: ShaderConfig;
}

export interface ShaderPlayEvent {
  type: 'shader:play';
  layerId?: string;
}

export interface ShaderPauseEvent {
  type: 'shader:pause';
  layerId?: string;
}

export interface ShaderSpeedChangedEvent {
  type: 'shader:speedChanged';
  layerId: string;
  speed: number;
}

export interface PluginRegisteredEvent {
  type: 'plugin:registered';
  pluginName: string;
  shaderCount: number;
}

export interface PluginUnregisteredEvent {
  type: 'plugin:unregistered';
  pluginName: string;
}

export interface ShaderErrorEvent {
  type: 'error';
  error: Error;
  layerId?: string;
  context?: string;
}

export interface PerformanceWarningEvent {
  type: 'performance:warning';
  warningType: string;
  message: string;
  value?: number;
  threshold?: number;
}

export interface PerformanceFrameEvent {
  type: 'performance:frame';
  fps: number;
  frameTime: number;
  activeShaders: number;
}

export interface DestroyedEvent {
  type: 'destroyed';
}

/**
 * Union type of all event payloads
 */
export type ShaderEvent =
  | ShaderRegisteredEvent
  | ShaderUnregisteredEvent
  | ShaderConfigUpdatedEvent
  | ShaderPlayEvent
  | ShaderPauseEvent
  | ShaderSpeedChangedEvent
  | PluginRegisteredEvent
  | PluginUnregisteredEvent
  | ShaderErrorEvent
  | PerformanceWarningEvent
  | PerformanceFrameEvent
  | DestroyedEvent;

/**
 * Event handler type
 */
export type ShaderEventHandler<T extends ShaderEvent = ShaderEvent> = (event: T) => void;

/**
 * Map of event types to their specific payload types
 */
export interface ShaderEventMap {
  'shader:registered': ShaderRegisteredEvent;
  'shader:unregistered': ShaderUnregisteredEvent;
  'shader:configUpdated': ShaderConfigUpdatedEvent;
  'shader:play': ShaderPlayEvent;
  'shader:pause': ShaderPauseEvent;
  'shader:speedChanged': ShaderSpeedChangedEvent;
  'plugin:registered': PluginRegisteredEvent;
  'plugin:unregistered': PluginUnregisteredEvent;
  error: ShaderErrorEvent;
  'performance:warning': PerformanceWarningEvent;
  'performance:frame': PerformanceFrameEvent;
  destroyed: DestroyedEvent;
}

// ============================================
// EventEmitter Class
// ============================================

/**
 * Type-safe event emitter for shader events.
 * Provides a centralized way to listen to and emit events throughout the shader system.
 *
 * @example
 * ```typescript
 * const emitter = new ShaderEventEmitter();
 *
 * // Subscribe to events
 * const unsubscribe = emitter.on('shader:registered', (event) => {
 *   console.log(`Shader registered on layer: ${event.layerId}`);
 * });
 *
 * // Emit events
 * emitter.emit('shader:registered', {
 *   type: 'shader:registered',
 *   layerId: 'my-layer',
 *   shaderName: 'example:point',
 *   config: { color: '#ff0000' }
 * });
 *
 * // Unsubscribe when done
 * unsubscribe();
 * ```
 */
export class ShaderEventEmitter {
  private listeners: Map<ShaderEventType, Set<ShaderEventHandler>> = new Map();
  private onceListeners: Map<ShaderEventType, Set<ShaderEventHandler>> = new Map();

  /**
   * Subscribe to an event type.
   * @param type - The event type to listen for
   * @param handler - The handler function to call when the event is emitted
   * @returns A function to unsubscribe the handler
   */
  on<K extends ShaderEventType>(
    type: K,
    handler: ShaderEventHandler<ShaderEventMap[K]>
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler as ShaderEventHandler);

    // Return unsubscribe function
    return () => this.off(type, handler);
  }

  /**
   * Subscribe to an event type for a single emission only.
   * @param type - The event type to listen for
   * @param handler - The handler function to call when the event is emitted
   */
  once<K extends ShaderEventType>(
    type: K,
    handler: ShaderEventHandler<ShaderEventMap[K]>
  ): void {
    if (!this.onceListeners.has(type)) {
      this.onceListeners.set(type, new Set());
    }
    this.onceListeners.get(type)!.add(handler as ShaderEventHandler);
  }

  /**
   * Unsubscribe from an event type.
   * @param type - The event type to unsubscribe from
   * @param handler - The handler function to remove
   */
  off<K extends ShaderEventType>(
    type: K,
    handler: ShaderEventHandler<ShaderEventMap[K]>
  ): void {
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.delete(handler as ShaderEventHandler);
    }

    const onceHandlers = this.onceListeners.get(type);
    if (onceHandlers) {
      onceHandlers.delete(handler as ShaderEventHandler);
    }
  }

  /**
   * Emit an event to all subscribers.
   * @param type - The event type to emit
   * @param event - The event payload
   */
  emit<K extends ShaderEventType>(type: K, event: ShaderEventMap[K]): void {
    // Call regular listeners
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[ShaderEventEmitter] Error in event handler for "${type}":`, error);
        }
      });
    }

    // Call and remove once listeners
    const onceHandlers = this.onceListeners.get(type);
    if (onceHandlers) {
      onceHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[ShaderEventEmitter] Error in once handler for "${type}":`, error);
        }
      });
      this.onceListeners.delete(type);
    }
  }

  /**
   * Remove all listeners for a specific event type, or all listeners if no type is specified.
   * @param type - Optional event type to clear listeners for
   */
  removeAllListeners(type?: ShaderEventType): void {
    if (type) {
      this.listeners.delete(type);
      this.onceListeners.delete(type);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Get the number of listeners for a specific event type.
   * @param type - The event type to check
   * @returns The number of listeners
   */
  listenerCount(type: ShaderEventType): number {
    const regularCount = this.listeners.get(type)?.size ?? 0;
    const onceCount = this.onceListeners.get(type)?.size ?? 0;
    return regularCount + onceCount;
  }

  /**
   * Check if there are any listeners for a specific event type.
   * @param type - The event type to check
   * @returns True if there are listeners
   */
  hasListeners(type: ShaderEventType): boolean {
    return this.listenerCount(type) > 0;
  }
}

/**
 * Global event emitter instance for the shader system.
 * Can be used for cross-component communication.
 */
export const globalEventEmitter = new ShaderEventEmitter();
