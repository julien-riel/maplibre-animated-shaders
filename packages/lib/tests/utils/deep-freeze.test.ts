/**
 * Tests for deep-freeze utilities
 */

import { describe, it, expect } from 'vitest';
import {
  deepFreeze,
  deepFreezeClone,
  createImmutableConfig,
  isFrozen,
  isDeeplyFrozen,
  mergeConfigs,
  unfreeze,
} from '../../src/utils/deep-freeze';

describe('deepFreeze', () => {
  it('should freeze a simple object', () => {
    const obj = { a: 1, b: 2 };
    const frozen = deepFreeze(obj);

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(frozen).toBe(obj); // Same reference
  });

  it('should freeze nested objects', () => {
    const obj = {
      level1: {
        level2: {
          value: 'deep',
        },
      },
    };

    deepFreeze(obj);

    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(obj.level1)).toBe(true);
    expect(Object.isFrozen(obj.level1.level2)).toBe(true);
  });

  it('should freeze arrays', () => {
    const arr = [1, 2, { nested: true }];

    deepFreeze(arr);

    expect(Object.isFrozen(arr)).toBe(true);
    expect(Object.isFrozen(arr[2])).toBe(true);
  });

  it('should handle null and undefined', () => {
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(undefined)).toBe(undefined);
  });

  it('should handle primitives', () => {
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze('string')).toBe('string');
    expect(deepFreeze(true)).toBe(true);
  });

  it('should freeze Date objects', () => {
    const date = new Date();
    const frozen = deepFreeze(date);

    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it('should freeze Map objects', () => {
    const map = new Map([['key', 'value']]);
    const frozen = deepFreeze(map);

    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it('should freeze Set objects', () => {
    const set = new Set([1, 2, 3]);
    const frozen = deepFreeze(set);

    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it('should not freeze typed arrays (they are already effectively immutable)', () => {
    const arr = new Float32Array([1, 2, 3]);
    const frozen = deepFreeze(arr);

    // Typed arrays are returned as-is
    expect(frozen).toBe(arr);
  });
});

describe('deepFreezeClone', () => {
  it('should create a frozen copy', () => {
    const original = { a: 1, b: 2 };
    const clone = deepFreezeClone(original);

    expect(Object.isFrozen(clone)).toBe(true);
    expect(clone).not.toBe(original); // Different reference
    expect(clone).toEqual(original);
  });

  it('should not modify original', () => {
    const original = { value: 1 };
    deepFreezeClone(original);

    expect(Object.isFrozen(original)).toBe(false);
  });

  it('should deep clone nested objects', () => {
    const original = {
      nested: {
        value: 'test',
      },
    };

    const clone = deepFreezeClone(original);

    expect(clone.nested).not.toBe(original.nested);
    expect(clone.nested).toEqual(original.nested);
  });

  it('should deep clone arrays', () => {
    const original = [1, { a: 2 }, [3, 4]];
    const clone = deepFreezeClone(original);

    expect(clone).not.toBe(original);
    expect(clone[1]).not.toBe(original[1]);
    expect(clone[2]).not.toBe(original[2]);
  });

  it('should clone Date objects', () => {
    const original = new Date('2024-01-01');
    const clone = deepFreezeClone(original);

    expect(clone).not.toBe(original);
    expect(clone.getTime()).toBe(original.getTime());
  });

  it('should clone Map objects', () => {
    const original = new Map([['key', { value: 1 }]]);
    const clone = deepFreezeClone(original);

    expect(clone).not.toBe(original);
    expect(clone.get('key')).not.toBe(original.get('key'));
    expect(clone.get('key')).toEqual(original.get('key'));
  });

  it('should clone Set objects', () => {
    const original = new Set([1, 2, 3]);
    const clone = deepFreezeClone(original);

    expect(clone).not.toBe(original);
    expect([...clone]).toEqual([...original]);
  });

  it('should clone typed arrays', () => {
    const original = new Float32Array([1, 2, 3]);
    const clone = deepFreezeClone(original);

    expect(clone).not.toBe(original);
    expect([...clone]).toEqual([...original]);
  });
});

describe('createImmutableConfig', () => {
  it('should create immutable shader config', () => {
    const config = createImmutableConfig({
      color: '#ff0000',
      speed: 1.0,
      intensity: 0.8,
    });

    expect(Object.isFrozen(config)).toBe(true);
  });

  it('should freeze nested config properties', () => {
    const config = createImmutableConfig({
      options: {
        animate: true,
        blend: 'normal',
      },
    });

    expect(Object.isFrozen(config.options)).toBe(true);
  });
});

describe('isFrozen', () => {
  it('should return true for frozen objects', () => {
    const frozen = Object.freeze({ a: 1 });
    expect(isFrozen(frozen)).toBe(true);
  });

  it('should return false for unfrozen objects', () => {
    const obj = { a: 1 };
    expect(isFrozen(obj)).toBe(false);
  });

  it('should return true for null and undefined', () => {
    expect(isFrozen(null)).toBe(true);
    expect(isFrozen(undefined)).toBe(true);
  });

  it('should return true for primitives', () => {
    expect(isFrozen(42)).toBe(true);
    expect(isFrozen('string')).toBe(true);
    expect(isFrozen(true)).toBe(true);
  });
});

describe('isDeeplyFrozen', () => {
  it('should return true for deeply frozen objects', () => {
    const obj = deepFreeze({ nested: { value: 1 } });
    expect(isDeeplyFrozen(obj)).toBe(true);
  });

  it('should return false for shallowly frozen objects', () => {
    const obj = Object.freeze({
      nested: { value: 1 }, // Not frozen
    });

    expect(isDeeplyFrozen(obj)).toBe(false);
  });

  it('should return true for deeply frozen arrays', () => {
    const arr = deepFreeze([1, { a: 2 }, [3]]);
    expect(isDeeplyFrozen(arr)).toBe(true);
  });

  it('should return true for primitives', () => {
    expect(isDeeplyFrozen(42)).toBe(true);
    expect(isDeeplyFrozen('string')).toBe(true);
  });

  it('should treat typed arrays as effectively immutable', () => {
    // Typed arrays are treated as effectively immutable by deepFreeze
    // because their values can't be reassigned via Object.freeze
    // but they are not technically frozen by JavaScript
    const arr = new Float32Array([1, 2, 3]);
    const frozen = deepFreeze(arr);

    // The function returns the typed array as-is
    expect(frozen).toBe(arr);

    // isDeeplyFrozen should return true because it's a TypedArray
    // and we treat them as effectively immutable
    expect(isDeeplyFrozen(arr)).toBe(true);
  });
});

describe('mergeConfigs', () => {
  it('should merge base and overrides', () => {
    const base = createImmutableConfig({ color: '#ff0000', speed: 1.0 });
    const merged = mergeConfigs(base, { speed: 2.0 });

    expect(merged.color).toBe('#ff0000');
    expect(merged.speed).toBe(2.0);
  });

  it('should return frozen result', () => {
    const base = createImmutableConfig({ value: 1 });
    const merged = mergeConfigs(base, { value: 2 });

    expect(Object.isFrozen(merged)).toBe(true);
  });

  it('should not modify base config', () => {
    const base = createImmutableConfig({ value: 1 });
    mergeConfigs(base, { value: 2 });

    expect(base.value).toBe(1);
  });

  it('should add new properties from overrides', () => {
    const base = createImmutableConfig({ a: 1 });
    const merged = mergeConfigs(base, { b: 2 } as Partial<typeof base & { b: number }>);

    expect(merged.a).toBe(1);
    expect((merged as { b?: number }).b).toBe(2);
  });
});

describe('unfreeze', () => {
  it('should create mutable copy of frozen object', () => {
    const frozen = deepFreeze({ value: 1 });
    const mutable = unfreeze(frozen);

    expect(Object.isFrozen(mutable)).toBe(false);
    mutable.value = 2;
    expect(mutable.value).toBe(2);
  });

  it('should create mutable copy of nested objects', () => {
    const frozen = deepFreeze({
      nested: { value: 1 },
    });

    const mutable = unfreeze(frozen);

    expect(Object.isFrozen(mutable.nested)).toBe(false);
    mutable.nested.value = 2;
    expect(mutable.nested.value).toBe(2);
  });

  it('should create mutable copy of arrays', () => {
    const frozen = deepFreeze([1, 2, 3]);
    const mutable = unfreeze(frozen);

    expect(Object.isFrozen(mutable)).toBe(false);
    mutable.push(4);
    expect(mutable).toEqual([1, 2, 3, 4]);
  });

  it('should handle Date objects', () => {
    const frozen = deepFreeze(new Date('2024-01-01'));
    const mutable = unfreeze(frozen);

    expect(mutable).not.toBe(frozen);
    expect(mutable.getTime()).toBe(frozen.getTime());
  });

  it('should handle typed arrays', () => {
    const frozen = new Float32Array([1, 2, 3]);
    const mutable = unfreeze(frozen);

    expect(mutable).not.toBe(frozen);
    expect([...mutable]).toEqual([1, 2, 3]);
  });

  it('should handle null and undefined', () => {
    expect(unfreeze(null)).toBe(null);
    expect(unfreeze(undefined)).toBe(undefined);
  });

  it('should handle primitives', () => {
    expect(unfreeze(42)).toBe(42);
    expect(unfreeze('string')).toBe('string');
  });
});

describe('strict mode behavior', () => {
  it('should throw when modifying frozen object in strict mode', () => {
    'use strict';

    const frozen = deepFreeze({ value: 1 });

    expect(() => {
      // @ts-expect-error - Testing runtime error
      frozen.value = 2;
    }).toThrow(TypeError);
  });

  it('should throw when modifying frozen array in strict mode', () => {
    'use strict';

    const frozen = deepFreeze([1, 2, 3]);

    expect(() => {
      // @ts-expect-error - Testing runtime error
      frozen.push(4);
    }).toThrow(TypeError);
  });
});

describe('edge cases', () => {
  it('should handle objects with null prototype', () => {
    const obj = Object.create(null);
    obj.value = 1;

    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it('should handle symbols as keys', () => {
    const sym = Symbol('test');
    const obj = { [sym]: 'value' };

    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it('should handle empty objects', () => {
    const obj = {};
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it('should handle deeply nested objects', () => {
    const obj = { a: { b: { c: { d: { e: 1 } } } } };
    const frozen = deepFreeze(obj);
    expect(isDeeplyFrozen(frozen)).toBe(true);
  });
});
