import { vi } from 'vitest';

// Mock requestAnimationFrame and cancelAnimationFrame for Node.js environment
let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback): number => {
  const id = ++rafId;
  rafCallbacks.set(id, callback);
  // Execute callback on next tick to simulate async behavior
  setTimeout(() => {
    const cb = rafCallbacks.get(id);
    if (cb) {
      rafCallbacks.delete(id);
      cb(performance.now());
    }
  }, 16); // ~60fps
  return id;
});

global.cancelAnimationFrame = vi.fn((id: number): void => {
  rafCallbacks.delete(id);
});

// Mock performance.now if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
  } as Performance;
}
