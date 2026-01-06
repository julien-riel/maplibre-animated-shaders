/**
 * Deep Freeze Utility
 *
 * Provides utilities for creating deeply immutable objects.
 * Used to prevent accidental mutation of shader configurations.
 *
 * @module utils/deep-freeze
 */

import type { ShaderConfig } from '../types';

/**
 * Deeply freeze an object, making it and all nested objects immutable.
 * Handles circular references safely.
 *
 * @param obj - The object to freeze
 * @returns The frozen object (same reference)
 *
 * @example
 * ```typescript
 * const config = deepFreeze({
 *   color: '#ff0000',
 *   speed: 1.0,
 *   nested: { value: 10 }
 * });
 *
 * config.speed = 2.0; // TypeError in strict mode
 * config.nested.value = 20; // TypeError in strict mode
 * ```
 */
export function deepFreeze<T>(obj: T, seen: WeakSet<object> = new WeakSet()): Readonly<T> {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  // Check for circular references
  if (seen.has(obj as object)) {
    return obj;
  }
  seen.add(obj as object);

  // Handle arrays
  if (Array.isArray(obj)) {
    for (const item of obj) {
      deepFreeze(item, seen);
    }
    return Object.freeze(obj) as Readonly<T>;
  }

  // Handle typed arrays (don't freeze these, they're already immutable-ish)
  if (ArrayBuffer.isView(obj)) {
    return obj;
  }

  // Handle Date, Map, Set, etc.
  if (obj instanceof Date || obj instanceof Map || obj instanceof Set) {
    return Object.freeze(obj) as Readonly<T>;
  }

  // Handle plain objects
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = (obj as Record<string, unknown>)[name];
    if (value !== null && typeof value === 'object') {
      deepFreeze(value, seen);
    }
  }

  return Object.freeze(obj) as Readonly<T>;
}

/**
 * Create an immutable copy of an object.
 * Unlike deepFreeze, this creates a new object instead of modifying the original.
 * Handles circular references safely.
 *
 * @param obj - The object to copy and freeze
 * @returns A new frozen copy of the object
 *
 * @example
 * ```typescript
 * const original = { color: '#ff0000', speed: 1.0 };
 * const immutable = deepFreezeClone(original);
 *
 * original.speed = 2.0; // Works
 * immutable.speed = 2.0; // TypeError
 * ```
 */
export function deepFreezeClone<T>(obj: T, seen: Map<object, unknown> = new Map()): Readonly<T> {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  // Check for circular references
  if (seen.has(obj as object)) {
    return seen.get(obj as object) as Readonly<T>;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    const cloned: unknown[] = [];
    seen.set(obj as object, cloned);
    for (const item of obj) {
      cloned.push(deepFreezeClone(item, seen));
    }
    return Object.freeze(cloned) as unknown as Readonly<T>;
  }

  // Handle typed arrays
  if (ArrayBuffer.isView(obj)) {
    // Create a copy of typed array
    const TypedArrayConstructor = obj.constructor as new (buffer: ArrayBuffer) => typeof obj;
    const buffer = (obj as unknown as { buffer: ArrayBuffer }).buffer.slice(0);
    return new TypedArrayConstructor(buffer) as unknown as Readonly<T>;
  }

  // Handle Date
  if (obj instanceof Date) {
    return Object.freeze(new Date(obj.getTime())) as Readonly<T>;
  }

  // Handle Map
  if (obj instanceof Map) {
    const cloned = new Map();
    seen.set(obj as object, cloned);
    obj.forEach((value, key) => {
      cloned.set(deepFreezeClone(key, seen), deepFreezeClone(value, seen));
    });
    return Object.freeze(cloned) as Readonly<T>;
  }

  // Handle Set
  if (obj instanceof Set) {
    const cloned = new Set();
    seen.set(obj as object, cloned);
    obj.forEach((value) => {
      cloned.add(deepFreezeClone(value, seen));
    });
    return Object.freeze(cloned) as Readonly<T>;
  }

  // Handle plain objects
  const cloned: Record<string | symbol, unknown> = {};
  seen.set(obj as object, cloned);

  // Handle both string and symbol keys
  const propNames = Object.getOwnPropertyNames(obj);
  const propSymbols = Object.getOwnPropertySymbols(obj);

  for (const name of propNames) {
    const value = (obj as Record<string, unknown>)[name];
    cloned[name] = deepFreezeClone(value, seen);
  }

  for (const sym of propSymbols) {
    const value = (obj as Record<symbol, unknown>)[sym];
    cloned[sym] = deepFreezeClone(value, seen);
  }

  return Object.freeze(cloned) as Readonly<T>;
}

/**
 * Create an immutable shader configuration.
 * Specialized version of deepFreeze for ShaderConfig objects.
 *
 * @param config - The shader configuration to freeze
 * @returns Frozen shader configuration
 *
 * @example
 * ```typescript
 * const config = createImmutableConfig({
 *   color: '#ff0000',
 *   speed: 1.0,
 *   intensity: 0.8,
 * });
 *
 * // Attempting to modify will throw in strict mode
 * config.speed = 2.0; // TypeError
 * ```
 */
export function createImmutableConfig<T extends ShaderConfig>(config: T): Readonly<T> {
  return deepFreeze(config);
}

/**
 * Check if an object is frozen (shallowly).
 *
 * @param obj - The object to check
 * @returns true if the object is frozen
 */
export function isFrozen(obj: unknown): boolean {
  if (obj === null || obj === undefined) {
    return true;
  }
  if (typeof obj !== 'object') {
    return true;
  }
  return Object.isFrozen(obj);
}

/**
 * Check if an object is deeply frozen.
 * Handles circular references safely.
 *
 * @param obj - The object to check
 * @returns true if the object and all nested objects are frozen
 *
 * @example
 * ```typescript
 * const partial = Object.freeze({ nested: { value: 1 } });
 * console.log(isDeeplyFrozen(partial)); // false
 *
 * const full = deepFreeze({ nested: { value: 1 } });
 * console.log(isDeeplyFrozen(full)); // true
 * ```
 */
export function isDeeplyFrozen(obj: unknown, seen: WeakSet<object> = new WeakSet()): boolean {
  if (obj === null || obj === undefined) {
    return true;
  }

  if (typeof obj !== 'object') {
    return true;
  }

  // Check for circular references
  if (seen.has(obj as object)) {
    return true; // Already checked this object
  }
  seen.add(obj as object);

  // Typed arrays are effectively immutable (check before isFrozen)
  if (ArrayBuffer.isView(obj)) {
    return true;
  }

  if (!Object.isFrozen(obj)) {
    return false;
  }

  // Arrays
  if (Array.isArray(obj)) {
    return obj.every((item) => isDeeplyFrozen(item, seen));
  }

  // Check all properties
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = (obj as Record<string, unknown>)[name];
    if (!isDeeplyFrozen(value, seen)) {
      return false;
    }
  }

  return true;
}

/**
 * Merge configurations immutably.
 * Creates a new frozen configuration from base and overrides.
 *
 * @param base - Base configuration
 * @param overrides - Configuration overrides
 * @returns New frozen configuration with overrides applied
 *
 * @example
 * ```typescript
 * const base = createImmutableConfig({ color: '#ff0000', speed: 1.0 });
 * const updated = mergeConfigs(base, { speed: 2.0 });
 *
 * console.log(updated); // { color: '#ff0000', speed: 2.0 }
 * console.log(isFrozen(updated)); // true
 * console.log(base.speed); // 1.0 (unchanged)
 * ```
 */
export function mergeConfigs<T extends ShaderConfig>(
  base: Readonly<T>,
  overrides: Partial<T>
): Readonly<T> {
  const merged = { ...base, ...overrides } as T;
  return deepFreeze(merged);
}

/**
 * Safely get a mutable copy of a frozen configuration.
 * Use this when you need to modify a configuration temporarily.
 * Handles circular references and Map/Set objects safely.
 *
 * @param config - The frozen configuration
 * @returns A mutable deep copy
 *
 * @example
 * ```typescript
 * const frozen = createImmutableConfig({ color: '#ff0000', speed: 1.0 });
 * const mutable = unfreeze(frozen);
 *
 * mutable.speed = 2.0; // Works!
 * const newFrozen = createImmutableConfig(mutable);
 * ```
 */
export function unfreeze<T>(config: Readonly<T>, seen: Map<object, unknown> = new Map()): T {
  if (config === null || config === undefined) {
    return config as T;
  }

  if (typeof config !== 'object') {
    return config as T;
  }

  // Check for circular references
  if (seen.has(config as object)) {
    return seen.get(config as object) as T;
  }

  // Handle arrays
  if (Array.isArray(config)) {
    const unfrozen: unknown[] = [];
    seen.set(config as object, unfrozen);
    for (const item of config) {
      unfrozen.push(unfreeze(item, seen));
    }
    return unfrozen as unknown as T;
  }

  // Handle typed arrays
  if (ArrayBuffer.isView(config)) {
    const TypedArrayConstructor = config.constructor as new (arg: typeof config) => typeof config;
    return new TypedArrayConstructor(config) as T;
  }

  // Handle Date
  if (config instanceof Date) {
    return new Date(config.getTime()) as T;
  }

  // Handle Map
  if (config instanceof Map) {
    const unfrozen = new Map();
    seen.set(config as object, unfrozen);
    config.forEach((value, key) => {
      unfrozen.set(unfreeze(key, seen), unfreeze(value, seen));
    });
    return unfrozen as T;
  }

  // Handle Set
  if (config instanceof Set) {
    const unfrozen = new Set();
    seen.set(config as object, unfrozen);
    config.forEach((value) => {
      unfrozen.add(unfreeze(value, seen));
    });
    return unfrozen as T;
  }

  // Handle plain objects
  const unfrozen: Record<string | symbol, unknown> = {};
  seen.set(config as object, unfrozen);

  // Handle both string and symbol keys
  const propNames = Object.getOwnPropertyNames(config);
  const propSymbols = Object.getOwnPropertySymbols(config);

  for (const name of propNames) {
    const value = (config as Record<string, unknown>)[name];
    unfrozen[name] = unfreeze(value as Readonly<unknown>, seen);
  }

  for (const sym of propSymbols) {
    const value = (config as Record<symbol, unknown>)[sym];
    unfrozen[sym] = unfreeze(value as Readonly<unknown>, seen);
  }

  return unfrozen as T;
}
