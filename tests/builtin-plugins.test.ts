/**
 * Tests for Built-in Example Plugin
 *
 * Verifies that the example plugin is correctly structured,
 * contains the expected shaders, and can be registered with the plugin system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { examplePlugin } from '../src/plugins/builtin';
import { PluginManager, validatePlugin } from '../src/plugins';
import { ShaderRegistry } from '../src/ShaderRegistry';

describe('Built-in Example Plugin', () => {
  describe('examplePlugin', () => {
    it('should be a valid plugin', () => {
      const result = validatePlugin(examplePlugin);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct metadata', () => {
      expect(examplePlugin.name).toBe('example');
      expect(examplePlugin.version).toBe('1.0.0');
      expect(examplePlugin.author).toBeDefined();
      expect(examplePlugin.description).toContain('Example plugin');
    });

    it('should contain 4 shaders (one per geometry type)', () => {
      expect(examplePlugin.shaders).toHaveLength(4);
    });

    it('should contain expected shaders', () => {
      const shaderNames = examplePlugin.shaders.map((s) => s.name);
      expect(shaderNames).toContain('point');
      expect(shaderNames).toContain('line');
      expect(shaderNames).toContain('polygon');
      expect(shaderNames).toContain('global');
    });

    it('should have one shader per geometry type', () => {
      const geometries = examplePlugin.shaders.map((s) => s.geometry);
      expect(geometries).toContain('point');
      expect(geometries).toContain('line');
      expect(geometries).toContain('polygon');
      expect(geometries).toContain('global');
    });

    it('should have presets defined', () => {
      expect(examplePlugin.presets).toBeDefined();
      expect(Object.keys(examplePlugin.presets!).length).toBe(12);
    });

    it('should have point presets', () => {
      expect(examplePlugin.presets!['point-alert']).toBeDefined();
      expect(examplePlugin.presets!['point-notification']).toBeDefined();
      expect(examplePlugin.presets!['point-beacon']).toBeDefined();
    });

    it('should have line presets', () => {
      expect(examplePlugin.presets!['line-traffic']).toBeDefined();
      expect(examplePlugin.presets!['line-pipeline']).toBeDefined();
      expect(examplePlugin.presets!['line-electricity']).toBeDefined();
    });

    it('should have polygon presets', () => {
      expect(examplePlugin.presets!['polygon-water']).toBeDefined();
      expect(examplePlugin.presets!['polygon-selection']).toBeDefined();
      expect(examplePlugin.presets!['polygon-energy']).toBeDefined();
    });

    it('should have global presets', () => {
      expect(examplePlugin.presets!['global-radar']).toBeDefined();
      expect(examplePlugin.presets!['global-holographic']).toBeDefined();
      expect(examplePlugin.presets!['global-measurement']).toBeDefined();
    });
  });

  describe('Shader Definitions', () => {
    it('point shader should have correct structure', () => {
      const pointShader = examplePlugin.shaders.find((s) => s.name === 'point');
      expect(pointShader).toBeDefined();
      expect(pointShader!.displayName).toBe('Pulse Marker');
      expect(pointShader!.geometry).toBe('point');
      expect(pointShader!.fragmentShader).toContain('precision highp float');
      expect(pointShader!.defaultConfig).toBeDefined();
      expect(pointShader!.configSchema).toBeDefined();
      expect(pointShader!.getUniforms).toBeDefined();
    });

    it('line shader should have correct structure', () => {
      const lineShader = examplePlugin.shaders.find((s) => s.name === 'line');
      expect(lineShader).toBeDefined();
      expect(lineShader!.displayName).toBe('Flow Line');
      expect(lineShader!.geometry).toBe('line');
      expect(lineShader!.fragmentShader).toContain('precision highp float');
      expect(lineShader!.defaultConfig).toBeDefined();
      expect(lineShader!.configSchema).toBeDefined();
      expect(lineShader!.getUniforms).toBeDefined();
    });

    it('polygon shader should have correct structure', () => {
      const polygonShader = examplePlugin.shaders.find((s) => s.name === 'polygon');
      expect(polygonShader).toBeDefined();
      expect(polygonShader!.displayName).toBe('Wave Polygon');
      expect(polygonShader!.geometry).toBe('polygon');
      expect(polygonShader!.fragmentShader).toContain('precision highp float');
      expect(polygonShader!.defaultConfig).toBeDefined();
      expect(polygonShader!.configSchema).toBeDefined();
      expect(polygonShader!.getUniforms).toBeDefined();
    });

    it('global shader should have correct structure', () => {
      const globalShader = examplePlugin.shaders.find((s) => s.name === 'global');
      expect(globalShader).toBeDefined();
      expect(globalShader!.displayName).toBe('Grid Overlay');
      expect(globalShader!.geometry).toBe('global');
      expect(globalShader!.fragmentShader).toContain('precision highp float');
      expect(globalShader!.defaultConfig).toBeDefined();
      expect(globalShader!.configSchema).toBeDefined();
      expect(globalShader!.getUniforms).toBeDefined();
    });
  });

  describe('GLSL Features', () => {
    it('point shader should demonstrate easing functions', () => {
      const pointShader = examplePlugin.shaders.find((s) => s.name === 'point');
      expect(pointShader!.fragmentShader).toContain('easeLinear');
      expect(pointShader!.fragmentShader).toContain('easeOutQuad');
      expect(pointShader!.fragmentShader).toContain('easeOutElastic');
    });

    it('point shader should demonstrate SDF', () => {
      const pointShader = examplePlugin.shaders.find((s) => s.name === 'point');
      expect(pointShader!.fragmentShader).toContain('sdRing');
    });

    it('polygon shader should demonstrate simplex noise', () => {
      const polygonShader = examplePlugin.shaders.find((s) => s.name === 'polygon');
      expect(polygonShader!.fragmentShader).toContain('snoise');
      expect(polygonShader!.fragmentShader).toContain('permute');
    });

    it('polygon shader should demonstrate FBM', () => {
      const polygonShader = examplePlugin.shaders.find((s) => s.name === 'polygon');
      expect(polygonShader!.fragmentShader).toContain('fbm');
    });

    it('global shader should demonstrate hash functions', () => {
      const globalShader = examplePlugin.shaders.find((s) => s.name === 'global');
      expect(globalShader!.fragmentShader).toContain('hash');
    });

    it('all shaders should support per-feature timing', () => {
      const shadersWithTiming = examplePlugin.shaders.filter(
        (s) => s.fragmentShader.includes('v_effectiveTime') || s.fragmentShader.includes('v_timeOffset')
      );
      // point, line, polygon support per-feature timing
      expect(shadersWithTiming.length).toBeGreaterThanOrEqual(3);
    });

    it('all shaders should support data-driven expressions', () => {
      const shadersWithDataDriven = examplePlugin.shaders.filter(
        (s) => s.fragmentShader.includes('v_useDataDrivenColor') || s.fragmentShader.includes('v_color')
      );
      // point, line, polygon support data-driven
      expect(shadersWithDataDriven.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Plugin Registration', () => {
    let registry: ShaderRegistry;
    let pluginManager: PluginManager;

    beforeEach(() => {
      registry = new ShaderRegistry();
      pluginManager = new PluginManager(registry, { debug: false });
    });

    afterEach(() => {
      pluginManager.clear();
    });

    it('should register example plugin successfully', () => {
      pluginManager.use(examplePlugin);
      expect(pluginManager.hasPlugin('example')).toBe(true);
      expect(registry.has('example:point')).toBe(true);
      expect(registry.has('example:line')).toBe(true);
      expect(registry.has('example:polygon')).toBe(true);
      expect(registry.has('example:global')).toBe(true);
    });

    it('should register all 4 shaders', () => {
      pluginManager.use(examplePlugin);
      expect(registry.list().length).toBe(4);
    });

    it('should resolve short shader names when unambiguous', () => {
      pluginManager.use(examplePlugin);

      const resolved = pluginManager.resolveShaderName('point');
      expect(resolved).toBe('example:point');
    });

    it('should get preset from plugin', () => {
      pluginManager.use(examplePlugin);

      const preset = pluginManager.getPreset('example', 'point-alert');
      expect(preset).toBeDefined();
      expect(preset?.shader).toBe('point');
      expect(preset?.config.color).toBe('#ef4444');
    });

    it('should have all presets accessible', () => {
      pluginManager.use(examplePlugin);

      // Verify all 12 presets are accessible via getPreset
      const presetNames = Object.keys(examplePlugin.presets!);
      expect(presetNames).toHaveLength(12);

      for (const presetName of presetNames) {
        const preset = pluginManager.getPreset('example', presetName);
        expect(preset).toBeDefined();
      }
    });
  });

  describe('getUniforms', () => {
    it('point shader getUniforms should return expected values', () => {
      const pointShader = examplePlugin.shaders.find((s) => s.name === 'point');
      const uniforms = pointShader!.getUniforms(pointShader!.defaultConfig, 1.0, 0.016);

      expect(uniforms.u_time).toBeDefined();
      expect(uniforms.u_rings).toBeDefined();
      expect(uniforms.u_maxRadius).toBeDefined();
      expect(uniforms.u_intensity).toBeDefined();
    });

    it('line shader getUniforms should return expected values', () => {
      const lineShader = examplePlugin.shaders.find((s) => s.name === 'line');
      const uniforms = lineShader!.getUniforms(lineShader!.defaultConfig, 1.0, 0.016);

      expect(uniforms.u_time).toBeDefined();
      expect(uniforms.u_dashLength).toBeDefined();
      expect(uniforms.u_direction).toBeDefined();
      expect(uniforms.u_intensity).toBeDefined();
    });

    it('polygon shader getUniforms should return expected values', () => {
      const polygonShader = examplePlugin.shaders.find((s) => s.name === 'polygon');
      const uniforms = polygonShader!.getUniforms(polygonShader!.defaultConfig, 1.0, 0.016);

      expect(uniforms.u_time).toBeDefined();
      expect(uniforms.u_waves).toBeDefined();
      expect(uniforms.u_scale).toBeDefined();
      expect(uniforms.u_intensity).toBeDefined();
    });

    it('global shader getUniforms should return expected values', () => {
      const globalShader = examplePlugin.shaders.find((s) => s.name === 'global');
      const uniforms = globalShader!.getUniforms(globalShader!.defaultConfig, 1.0, 0.016);

      expect(uniforms.u_time).toBeDefined();
      expect(uniforms.u_gridSize).toBeDefined();
      expect(uniforms.u_pulseWave).toBeDefined();
      expect(uniforms.u_intensity).toBeDefined();
    });
  });
});
