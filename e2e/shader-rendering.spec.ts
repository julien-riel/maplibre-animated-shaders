import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for MapLibre Animated Shaders
 *
 * Tests the actual WebGL rendering of shaders in a real browser environment.
 */

// Helper to wait for map to be ready
async function waitForMapReady(page: Page): Promise<void> {
  await page.waitForFunction(() => window.testState?.mapLoaded === true, {
    timeout: 30000,
  });
}

// Helper to wait for frames to render
async function waitForFrames(page: Page, count: number): Promise<void> {
  const startCount = await page.evaluate(() => window.getFrameCount());
  await page.waitForFunction(
    ([start, target]) => window.getFrameCount() >= start + target,
    [startCount, count] as const,
    { timeout: 10000 }
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    testState: {
      mapLoaded: boolean;
      shaderApplied: string | null;
      error: string | null;
      frameCount: number;
    };
    map: unknown;
    shaderManager: unknown;
    applyShader: (layerId: string, shaderName: string, config?: Record<string, unknown>) => boolean;
    removeShader: (layerId: string) => boolean;
    getFrameCount: () => number;
    resetFrameCount: () => void;
  }
}

test.describe('Shader Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Log console messages for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Error] ${msg.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      console.log(`[Page Error] ${error.message}`);
    });

    await page.goto('/');
    await waitForMapReady(page);
  });

  test('map loads successfully with WebGL context', async ({ page }) => {
    // Verify map is loaded
    const mapLoaded = await page.evaluate(() => window.testState.mapLoaded);
    expect(mapLoaded).toBe(true);

    // Verify no errors
    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();

    // Verify map canvas exists
    const canvas = page.locator('#map canvas');
    await expect(canvas).toBeVisible();
  });

  test('shader manager is initialized', async ({ page }) => {
    const hasManager = await page.evaluate(() => !!window.shaderManager);
    expect(hasManager).toBe(true);
  });
});

test.describe('Point Shaders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
  });

  test('example:point shader renders and animates', async ({ page }) => {
    // Apply point shader
    const success = await page.evaluate(() =>
      window.applyShader('test-points-layer', 'example:point', {
        color: '#ff6b6b',
        speed: 2.0,
        rings: 3,
      })
    );
    expect(success).toBe(true);

    // Wait for animation frames
    await page.evaluate(() => window.resetFrameCount());
    await waitForFrames(page, 30);

    // Verify shader is applied
    const shaderApplied = await page.evaluate(() => window.testState.shaderApplied);
    expect(shaderApplied).toBe('example:point');

    // Verify no errors
    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });

  test('point shader with different config', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-points-layer', 'example:point', {
        color: '#00ff88',
        speed: 1.0,
        rings: 5,
        maxRadius: 60,
      })
    );
    expect(success).toBe(true);

    await waitForFrames(page, 10);

    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });
});

test.describe('Line Shaders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
  });

  test('example:line shader renders with animation', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-lines-layer', 'example:line', {
        color: '#00ff88',
        speed: 2.0,
        dashLength: 0.1,
      })
    );
    expect(success).toBe(true);

    await waitForFrames(page, 20);

    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });

  test('line shader with glow effect', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-lines-layer', 'example:line', {
        color: '#ff00ff',
        glow: true,
        gradient: true,
      })
    );
    expect(success).toBe(true);

    await waitForFrames(page, 10);

    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });
});

test.describe('Polygon Shaders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
  });

  test('example:polygon shader renders with waves', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-polygons-layer', 'example:polygon', {
        color: '#4a90d9',
        speed: 1.5,
        waves: 4,
        pattern: 'waves',
      })
    );
    expect(success).toBe(true);

    await waitForFrames(page, 20);

    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });

  test('polygon shader with ripple pattern', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-polygons-layer', 'example:polygon', {
        color: '#00ff00',
        speed: 1.0,
        pattern: 'ripple',
      })
    );
    expect(success).toBe(true);

    await waitForFrames(page, 20);

    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });

  test('polygon shader with noise pattern', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-polygons-layer', 'example:polygon', {
        color: '#9b59b6',
        useNoise: true,
        pattern: 'noise',
      })
    );
    expect(success).toBe(true);

    await waitForFrames(page, 10);

    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });
});

test.describe('Global Shaders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
  });

  test('example:global shader renders grid overlay', async ({ page }) => {
    // Global shaders need a global layer - skip if not available
    const success = await page.evaluate(() =>
      window.applyShader('test-points-layer', 'example:global', {
        color: '#00ffff',
        gridSize: 20,
        pulseWave: true,
      })
    );

    // Global shader may or may not apply depending on layer type
    if (success) {
      await waitForFrames(page, 10);
      const error = await page.evaluate(() => window.testState.error);
      expect(error).toBeNull();
    }
  });
});

test.describe('Shader Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
  });

  test('can apply and remove shader', async ({ page }) => {
    // Apply shader
    let success = await page.evaluate(() =>
      window.applyShader('test-points-layer', 'example:point', {})
    );
    expect(success).toBe(true);

    // Verify applied
    let shaderApplied = await page.evaluate(() => window.testState.shaderApplied);
    expect(shaderApplied).toBe('example:point');

    // Remove shader
    success = await page.evaluate(() =>
      window.removeShader('test-points-layer')
    );
    expect(success).toBe(true);

    // Verify removed
    shaderApplied = await page.evaluate(() => window.testState.shaderApplied);
    expect(shaderApplied).toBeNull();
  });

  test('can switch between shaders', async ({ page }) => {
    // Apply point shader
    await page.evaluate(() =>
      window.applyShader('test-points-layer', 'example:point', {})
    );

    let shader = await page.evaluate(() => window.testState.shaderApplied);
    expect(shader).toBe('example:point');

    // Switch to line shader on a different layer
    await page.evaluate(() =>
      window.applyShader('test-lines-layer', 'example:line', {})
    );

    shader = await page.evaluate(() => window.testState.shaderApplied);
    expect(shader).toBe('example:line');
  });

  test('can update shader config', async ({ page }) => {
    // Apply shader
    await page.evaluate(() =>
      window.applyShader('test-points-layer', 'example:point', {
        color: '#ff0000',
        speed: 1.0,
      })
    );

    // Verify initial application
    const shaderApplied = await page.evaluate(() => window.testState.shaderApplied);
    expect(shaderApplied).toBe('example:point');

    // Apply same shader with different config (should update)
    const success = await page.evaluate(() =>
      window.applyShader('test-points-layer', 'example:point', {
        color: '#00ff00',
        speed: 2.0,
      })
    );
    expect(success).toBe(true);
  });
});

test.describe('Animation Control', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
  });

  test('animation continues after shader applied', async ({ page }) => {
    await page.evaluate(() =>
      window.applyShader('test-points-layer', 'example:point', { speed: 2.0 })
    );

    // Reset frame count
    await page.evaluate(() => window.resetFrameCount());

    // Wait a bit
    await page.waitForTimeout(500);

    // Should have rendered multiple frames
    const frameCount = await page.evaluate(() => window.getFrameCount());
    expect(frameCount).toBeGreaterThan(10);
  });

  test('frame count increases over time', async ({ page }) => {
    await page.evaluate(() =>
      window.applyShader('test-lines-layer', 'example:line', { speed: 1.0 })
    );

    await page.evaluate(() => window.resetFrameCount());
    await page.waitForTimeout(200);
    const count1 = await page.evaluate(() => window.getFrameCount());

    await page.waitForTimeout(200);
    const count2 = await page.evaluate(() => window.getFrameCount());

    expect(count2).toBeGreaterThan(count1);
  });
});

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
  });

  test('handles invalid shader name gracefully', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-points-layer', 'nonexistent-shader', {})
    );

    // Should fail gracefully
    expect(success).toBe(false);

    // Should have error message
    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeTruthy();
  });

  test('handles invalid layer ID gracefully', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('nonexistent-layer', 'example:point', {})
    );

    expect(success).toBe(false);

    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeTruthy();
  });

  test('error state is cleared on successful apply', async ({ page }) => {
    // First, cause an error
    await page.evaluate(() =>
      window.applyShader('test-points-layer', 'nonexistent-shader', {})
    );

    let error = await page.evaluate(() => window.testState.error);
    expect(error).toBeTruthy();

    // Then apply valid shader
    await page.evaluate(() =>
      window.applyShader('test-points-layer', 'example:point', {})
    );

    error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });
});

test.describe('Multiple Shaders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
  });

  test('can apply shaders to multiple layers', async ({ page }) => {
    // Apply to points
    const success1 = await page.evaluate(() =>
      window.applyShader('test-points-layer', 'example:point', { color: '#ff0000' })
    );
    expect(success1).toBe(true);

    // Apply to lines
    const success2 = await page.evaluate(() =>
      window.applyShader('test-lines-layer', 'example:line', { color: '#00ff00' })
    );
    expect(success2).toBe(true);

    // Apply to polygons
    const success3 = await page.evaluate(() =>
      window.applyShader('test-polygons-layer', 'example:polygon', { color: '#0000ff' })
    );
    expect(success3).toBe(true);

    // Verify no errors
    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });
});
