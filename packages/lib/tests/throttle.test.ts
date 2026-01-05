/**
 * Tests for throttle and debounce utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle, debounce, DEFAULT_UPDATE_THROTTLE_MS } from '../src/utils/throttle';

describe('throttle', () => {
  it('should call function immediately on first invocation', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not call function again within interval (sync calls)', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    // Only first should execute immediately
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to the function', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('arg1', 'arg2');

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should eventually call with delayed scheduling', async () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 10); // Use short interval for real timing

    throttled('first');
    fn.mockClear();

    throttled('second');
    expect(fn).not.toHaveBeenCalled(); // Not called yet - scheduled

    // Wait for the scheduled call
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(fn).toHaveBeenCalledWith('second');
  });

  it('should call immediately after interval has passed', async () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 10);

    throttled();
    fn.mockClear();

    // Wait for interval to pass
    await new Promise((resolve) => setTimeout(resolve, 15));

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not call function immediately', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();

    expect(fn).not.toHaveBeenCalled();
  });

  it('should call function after wait time', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on each call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced(); // Reset timer
    vi.advanceTimersByTime(50);
    debounced(); // Reset timer again
    vi.advanceTimersByTime(50);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should only call once after rapid calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to the function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should use latest arguments', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');
    debounced('third');

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('third');
  });
});

describe('DEFAULT_UPDATE_THROTTLE_MS', () => {
  it('should be 100ms', () => {
    expect(DEFAULT_UPDATE_THROTTLE_MS).toBe(100);
  });
});
