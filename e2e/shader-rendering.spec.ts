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

  test('pulse shader renders and animates', async ({ page }) => {
    // Apply pulse shader
    const success = await page.evaluate(() =>
      window.applyShader('test-points-layer', 'pulse', {
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
    expect(shaderApplied).toBe('pulse');

    // Verify no errors
    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });

  test('glow shader renders correctly', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-points-layer', 'glow', {
        color: '#00ff88',
        intensity: 1.5,
      })
    );
    expect(success).toBe(true);

    await waitForFrames(page, 10);

    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });

  test('radar shader renders with sweep animation', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-points-layer', 'radar', {
        color: '#3b82f6',
        speed: 1.0,
      })
    );
    expect(success).toBe(true);

    await waitForFrames(page, 20);

    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });
});

test.describe('Line Shaders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
  });

  test('flow shader renders with moving dashes', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-lines-layer', 'flow', {
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

  test('neon shader renders with glow effect', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-lines-layer', 'neon', {
        color: '#ff00ff',
        glowIntensity: 2.0,
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

  test('ripple shader renders with expanding circles', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-polygons-layer', 'ripple', {
        color: '#4a90d9',
        speed: 1.5,
        rings: 4,
      })
    );
    expect(success).toBe(true);

    await waitForFrames(page, 20);

    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
  });

  test('scan-lines shader renders with moving lines', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-polygons-layer', 'scan-lines', {
        color: '#00ff00',
        speed: 1.0,
        lineCount: 10,
      })
    );
    expect(success).toBe(true);

    await waitForFrames(page, 20);

    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeNull();
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
      window.applyShader('test-points-layer', 'pulse', {})
    );
    expect(success).toBe(true);

    // Verify applied
    let shaderApplied = await page.evaluate(() => window.testState.shaderApplied);
    expect(shaderApplied).toBe('pulse');

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
    // Apply first shader
    await page.evaluate(() =>
      window.applyShader('test-points-layer', 'pulse', {})
    );

    let shader = await page.evaluate(() => window.testState.shaderApplied);
    expect(shader).toBe('pulse');

    // Apply different shader (should replace)
    await page.evaluate(() =>
      window.applyShader('test-points-layer', 'glow', {})
    );

    shader = await page.evaluate(() => window.testState.shaderApplied);
    expect(shader).toBe('glow');
  });
});

test.describe('Animation Control', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
  });

  test('animation continues after shader applied', async ({ page }) => {
    await page.evaluate(() =>
      window.applyShader('test-points-layer', 'pulse', { speed: 2.0 })
    );

    // Reset frame count
    await page.evaluate(() => window.resetFrameCount());

    // Wait a bit
    await page.waitForTimeout(500);

    // Should have rendered multiple frames
    const frameCount = await page.evaluate(() => window.getFrameCount());
    expect(frameCount).toBeGreaterThan(10);
  });
});

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
    // Wait for initial render to stabilize
    await page.waitForTimeout(500);
  });

  test('map renders without shader', async ({ page }) => {
    // Take screenshot of map without any shader
    const mapContainer = page.locator('#map');
    await expect(mapContainer).toHaveScreenshot('map-no-shader.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  // Note: Animated shaders are difficult to test visually due to timing
  // These tests verify the shader is applied without errors
  test('pulse shader visual check', async ({ page }) => {
    await page.evaluate(() =>
      window.applyShader('test-points-layer', 'pulse', {
        color: '#ff6b6b',
        speed: 0, // Pause animation for consistent screenshot
      })
    );

    // Wait for render
    await page.waitForTimeout(200);

    const mapContainer = page.locator('#map');
    // This will create a baseline on first run
    await expect(mapContainer).toHaveScreenshot('pulse-shader.png', {
      maxDiffPixelRatio: 0.15, // Higher tolerance for WebGL variations
    });
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
      window.applyShader('nonexistent-layer', 'pulse', {})
    );

    expect(success).toBe(false);

    const error = await page.evaluate(() => window.testState.error);
    expect(error).toBeTruthy();
  });
});
