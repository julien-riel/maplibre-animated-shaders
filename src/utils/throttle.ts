/**
 * Throttle Utility
 *
 * Limits the rate at which a function can be called.
 */

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per specified interval.
 *
 * @param fn - The function to throttle
 * @param intervalMs - Minimum time between invocations in milliseconds
 * @returns Throttled function
 *
 * @example
 * ```typescript
 * const throttledUpdate = throttle(() => {
 *   updateBuffers();
 *   map.triggerRepaint();
 * }, 100); // Max 10 updates per second
 *
 * map.on('sourcedata', throttledUpdate);
 * ```
 */
export function throttle<T extends (...args: unknown[]) => void>(fn: T, intervalMs: number): T {
  let lastCall = 0;
  let scheduledCall: ReturnType<typeof setTimeout> | null = null;

  return ((...args: unknown[]) => {
    const now = performance.now();
    const timeSinceLastCall = now - lastCall;

    // If enough time has passed, call immediately
    if (timeSinceLastCall >= intervalMs) {
      lastCall = now;
      fn(...args);
      return;
    }

    // Otherwise, schedule a call at the end of the interval
    // (only if one isn't already scheduled)
    if (scheduledCall === null) {
      const delay = intervalMs - timeSinceLastCall;
      scheduledCall = setTimeout(() => {
        lastCall = performance.now();
        scheduledCall = null;
        fn(...args);
      }, delay);
    }
  }) as T;
}

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last call.
 *
 * @param fn - The function to debounce
 * @param waitMs - Time to wait in milliseconds
 * @returns Debounced function
 *
 * @example
 * ```typescript
 * const debouncedUpdate = debounce(() => {
 *   updateBuffers();
 * }, 100);
 *
 * // Multiple rapid calls will only trigger one update
 * debouncedUpdate();
 * debouncedUpdate();
 * debouncedUpdate();
 * ```
 */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, waitMs: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: unknown[]) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, waitMs);
  }) as T;
}

// Re-export from constants for backward compatibility
export { DEFAULT_UPDATE_THROTTLE_MS } from '../constants';
