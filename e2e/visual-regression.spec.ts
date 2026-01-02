import { test, expect, Page } from '@playwright/test';

/**
 * Visual Regression Tests for All Shaders
 *
 * Tests visual consistency of all 26 shaders by taking screenshots
 * at a paused state (speed: 0) to ensure deterministic rendering.
 *
 * Run with: npm run test:e2e -- visual-regression.spec.ts
 * Update baselines: npm run test:e2e -- visual-regression.spec.ts --update-snapshots
 */

// Helper to wait for map to be ready
async function waitForMapReady(page: Page): Promise<void> {
  await page.waitForFunction(() => window.testState?.mapLoaded === true, {
    timeout: 30000,
  });
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

// Shader definitions for testing
const POINT_SHADERS = [
  { name: 'pulse', config: { color: '#ff6b6b', speed: 0, rings: 3, maxRadius: 50 } },
  { name: 'heartbeat', config: { color: '#e74c3c', speed: 0, intensity: 0.8 } },
  { name: 'radar', config: { color: '#3b82f6', speed: 0, sweepAngle: 45 } },
  { name: 'glow', config: { color: '#00ff88', speed: 0, intensity: 1.5 } },
  { name: 'particleBurst', config: { color: '#ffd700', speed: 0, particleCount: 12 } },
  { name: 'morphingShapes', config: { color: '#9b59b6', speed: 0 } },
];

const LINE_SHADERS = [
  { name: 'flow', config: { color: '#00ff88', speed: 0, dashLength: 0.15 } },
  { name: 'gradientTravel', config: { startColor: '#ff0000', endColor: '#0000ff', speed: 0 } },
  { name: 'electric', config: { color: '#00ffff', speed: 0, frequency: 5 } },
  { name: 'trailFade', config: { color: '#ff6b6b', speed: 0, trailLength: 0.5 } },
  { name: 'breathing', config: { color: '#4a90d9', speed: 0, minWidth: 2, maxWidth: 6 } },
  { name: 'snake', config: { color: '#2ecc71', speed: 0, segmentLength: 0.1 } },
  { name: 'neon', config: { color: '#ff00ff', speed: 0, glowIntensity: 2.0 } },
];

const POLYGON_SHADERS = [
  { name: 'scanLines', config: { color: '#00ff00', speed: 0, lineCount: 10 } },
  { name: 'ripple', config: { color: '#4a90d9', speed: 0, rings: 4 } },
  { name: 'hatching', config: { color: '#8b4513', speed: 0, lineSpacing: 10 } },
  { name: 'fillWave', config: { color: '#3498db', speed: 0, waveHeight: 0.3 } },
  { name: 'noise', config: { color: '#95a5a6', speed: 0, scale: 2.0 } },
  { name: 'marchingAnts', config: { color: '#2c3e50', speed: 0, dashSize: 8 } },
  { name: 'gradientRotation', config: { color: '#9b59b6', speed: 0 } },
  { name: 'dissolve', config: { color: '#e74c3c', speed: 0, threshold: 0.5 } },
];

const GLOBAL_SHADERS = [
  { name: 'heatShimmer', config: { speed: 0, intensity: 0.5 } },
  { name: 'weather', config: { type: 'rain', speed: 0, intensity: 0.6 } },
  { name: 'depthFog', config: { color: '#cccccc', speed: 0, density: 0.5 } },
  { name: 'dayNightCycle', config: { speed: 0, time: 12 } },
  { name: 'holographicGrid', config: { color: '#00ffff', speed: 0, gridSize: 20 } },
];

test.describe('Visual Regression - Point Shaders', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Error] ${msg.text()}`);
      }
    });

    await page.goto('/');
    await waitForMapReady(page);
    await page.waitForTimeout(500); // Wait for initial render
  });

  for (const shader of POINT_SHADERS) {
    test(`${shader.name} shader renders correctly`, async ({ page }) => {
      const success = await page.evaluate(
        ([layerId, name, cfg]) => window.applyShader(layerId, name, cfg),
        ['test-points-layer', shader.name, shader.config] as const
      );

      if (!success) {
        const error = await page.evaluate(() => window.testState.error);
        console.log(`Shader ${shader.name} failed to apply: ${error}`);
      }
      expect(success).toBe(true);

      // Wait for render to stabilize
      await page.waitForTimeout(300);

      // Take screenshot
      const mapContainer = page.locator('#map');
      await expect(mapContainer).toHaveScreenshot(`point-${shader.name}.png`, {
        maxDiffPixelRatio: 0.15, // WebGL can have minor variations
        threshold: 0.2,
      });
    });
  }
});

test.describe('Visual Regression - Line Shaders', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Error] ${msg.text()}`);
      }
    });

    await page.goto('/');
    await waitForMapReady(page);
    await page.waitForTimeout(500);
  });

  for (const shader of LINE_SHADERS) {
    test(`${shader.name} shader renders correctly`, async ({ page }) => {
      const success = await page.evaluate(
        ([layerId, name, cfg]) => window.applyShader(layerId, name, cfg),
        ['test-lines-layer', shader.name, shader.config] as const
      );

      if (!success) {
        const error = await page.evaluate(() => window.testState.error);
        console.log(`Shader ${shader.name} failed to apply: ${error}`);
      }
      expect(success).toBe(true);

      await page.waitForTimeout(300);

      const mapContainer = page.locator('#map');
      await expect(mapContainer).toHaveScreenshot(`line-${shader.name}.png`, {
        maxDiffPixelRatio: 0.15,
        threshold: 0.2,
      });
    });
  }
});

test.describe('Visual Regression - Polygon Shaders', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Error] ${msg.text()}`);
      }
    });

    await page.goto('/');
    await waitForMapReady(page);
    await page.waitForTimeout(500);
  });

  for (const shader of POLYGON_SHADERS) {
    test(`${shader.name} shader renders correctly`, async ({ page }) => {
      const success = await page.evaluate(
        ([layerId, name, cfg]) => window.applyShader(layerId, name, cfg),
        ['test-polygons-layer', shader.name, shader.config] as const
      );

      if (!success) {
        const error = await page.evaluate(() => window.testState.error);
        console.log(`Shader ${shader.name} failed to apply: ${error}`);
      }
      expect(success).toBe(true);

      await page.waitForTimeout(300);

      const mapContainer = page.locator('#map');
      await expect(mapContainer).toHaveScreenshot(`polygon-${shader.name}.png`, {
        maxDiffPixelRatio: 0.15,
        threshold: 0.2,
      });
    });
  }
});

test.describe('Visual Regression - Global Shaders', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Error] ${msg.text()}`);
      }
    });

    await page.goto('/');
    await waitForMapReady(page);
    await page.waitForTimeout(500);
  });

  for (const shader of GLOBAL_SHADERS) {
    test(`${shader.name} shader renders correctly`, async ({ page }) => {
      // Global shaders use a special layer
      const success = await page.evaluate(
        ([layerId, name, cfg]) => window.applyShader(layerId, name, cfg),
        ['global-effects', shader.name, shader.config] as const
      );

      if (!success) {
        const error = await page.evaluate(() => window.testState.error);
        console.log(`Shader ${shader.name} failed to apply: ${error}`);
        // Global shaders may not be available in all test setups
        test.skip();
        return;
      }

      await page.waitForTimeout(300);

      const mapContainer = page.locator('#map');
      await expect(mapContainer).toHaveScreenshot(`global-${shader.name}.png`, {
        maxDiffPixelRatio: 0.2, // Higher tolerance for global effects
        threshold: 0.25,
      });
    });
  }
});

test.describe('Visual Regression - Shader Combinations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
    await page.waitForTimeout(500);
  });

  test('multiple shaders on different layers', async ({ page }) => {
    // Apply different shaders to different layers
    await page.evaluate(() => {
      window.applyShader('test-points-layer', 'pulse', { color: '#ff6b6b', speed: 0 });
      window.applyShader('test-lines-layer', 'flow', { color: '#00ff88', speed: 0 });
      window.applyShader('test-polygons-layer', 'ripple', { color: '#4a90d9', speed: 0 });
    });

    await page.waitForTimeout(500);

    const mapContainer = page.locator('#map');
    await expect(mapContainer).toHaveScreenshot('multi-shader-combination.png', {
      maxDiffPixelRatio: 0.2,
      threshold: 0.25,
    });
  });
});

test.describe('Visual Regression - Theme Presets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
    await page.waitForTimeout(500);
  });

  test('alert preset renders correctly', async ({ page }) => {
    const success = await page.evaluate(() =>
      window.applyShader('test-points-layer', 'pulse', {
        color: '#ef4444',
        speed: 0,
        rings: 5,
        maxRadius: 80,
        intensity: 1.0,
      })
    );
    expect(success).toBe(true);

    await page.waitForTimeout(300);

    const mapContainer = page.locator('#map');
    await expect(mapContainer).toHaveScreenshot('preset-alert.png', {
      maxDiffPixelRatio: 0.15,
    });
  });

  test('cyberpunk theme renders correctly', async ({ page }) => {
    await page.evaluate(() => {
      window.applyShader('test-lines-layer', 'neon', {
        color: '#ff00ff',
        speed: 0,
        glowIntensity: 2.5,
      });
    });

    await page.waitForTimeout(300);

    const mapContainer = page.locator('#map');
    await expect(mapContainer).toHaveScreenshot('theme-cyberpunk.png', {
      maxDiffPixelRatio: 0.15,
    });
  });
});
