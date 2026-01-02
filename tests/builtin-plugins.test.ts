/**
 * Tests for Built-in Thematic Plugins
 *
 * Verifies that all thematic plugins are correctly structured,
 * contain the expected shaders, and can be registered with the plugin system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  datavizPlugin,
  atmosphericPlugin,
  scifiPlugin,
  organicPlugin,
  corePlugin,
} from '../src/plugins/builtin';
import { PluginManager, validatePlugin } from '../src/plugins';
import { ShaderRegistry } from '../src/ShaderRegistry';
import type { ShaderPlugin } from '../src/types';

describe('Built-in Thematic Plugins', () => {
  describe('datavizPlugin', () => {
    it('should be a valid plugin', () => {
      const result = validatePlugin(datavizPlugin);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct metadata', () => {
      expect(datavizPlugin.name).toBe('dataviz');
      expect(datavizPlugin.version).toBe('1.0.0');
      expect(datavizPlugin.author).toBeDefined();
      expect(datavizPlugin.description).toContain('data visualization');
    });

    it('should contain 7 shaders', () => {
      expect(datavizPlugin.shaders).toHaveLength(7);
    });

    it('should contain expected shaders', () => {
      const shaderNames = datavizPlugin.shaders.map((s) => s.name);
      expect(shaderNames).toContain('pulse');
      expect(shaderNames).toContain('flow');
      expect(shaderNames).toContain('gradientTravel');
      expect(shaderNames).toContain('snake');
      expect(shaderNames).toContain('scan-lines');
      expect(shaderNames).toContain('fill-wave');
      expect(shaderNames).toContain('marching-ants');
    });

    it('should have presets defined', () => {
      expect(datavizPlugin.presets).toBeDefined();
      expect(Object.keys(datavizPlugin.presets!).length).toBeGreaterThan(0);
    });

    it('should have alert presets', () => {
      expect(datavizPlugin.presets!['alert-critical']).toBeDefined();
      expect(datavizPlugin.presets!['alert-warning']).toBeDefined();
      expect(datavizPlugin.presets!['alert-info']).toBeDefined();
    });
  });

  describe('atmosphericPlugin', () => {
    it('should be a valid plugin', () => {
      const result = validatePlugin(atmosphericPlugin);
      expect(result.valid).toBe(true);
    });

    it('should have correct metadata', () => {
      expect(atmosphericPlugin.name).toBe('atmospheric');
      expect(atmosphericPlugin.version).toBe('1.0.0');
    });

    it('should contain 6 shaders', () => {
      expect(atmosphericPlugin.shaders).toHaveLength(6);
    });

    it('should contain expected shaders', () => {
      const shaderNames = atmosphericPlugin.shaders.map((s) => s.name);
      expect(shaderNames).toContain('heatShimmer');
      expect(shaderNames).toContain('weather');
      expect(shaderNames).toContain('depthFog');
      expect(shaderNames).toContain('dayNightCycle');
      expect(shaderNames).toContain('ripple');
      expect(shaderNames).toContain('noise');
    });

    it('should have weather presets', () => {
      expect(atmosphericPlugin.presets!['rain-light']).toBeDefined();
      expect(atmosphericPlugin.presets!['rain-heavy']).toBeDefined();
      expect(atmosphericPlugin.presets!['snow-gentle']).toBeDefined();
      expect(atmosphericPlugin.presets!['snow-blizzard']).toBeDefined();
    });
  });

  describe('scifiPlugin', () => {
    it('should be a valid plugin', () => {
      const result = validatePlugin(scifiPlugin);
      expect(result.valid).toBe(true);
    });

    it('should have correct metadata', () => {
      expect(scifiPlugin.name).toBe('scifi');
      expect(scifiPlugin.version).toBe('1.0.0');
    });

    it('should contain 5 shaders', () => {
      expect(scifiPlugin.shaders).toHaveLength(5);
    });

    it('should contain expected shaders', () => {
      const shaderNames = scifiPlugin.shaders.map((s) => s.name);
      expect(shaderNames).toContain('holographicGrid');
      expect(shaderNames).toContain('electric');
      expect(shaderNames).toContain('neon');
      expect(shaderNames).toContain('radar');
      expect(shaderNames).toContain('glow');
    });

    it('should have cyberpunk presets', () => {
      expect(scifiPlugin.presets!['cyberpunk']).toBeDefined();
      expect(scifiPlugin.presets!['matrix']).toBeDefined();
      expect(scifiPlugin.presets!['plasma']).toBeDefined();
    });
  });

  describe('organicPlugin', () => {
    it('should be a valid plugin', () => {
      const result = validatePlugin(organicPlugin);
      expect(result.valid).toBe(true);
    });

    it('should have correct metadata', () => {
      expect(organicPlugin.name).toBe('organic');
      expect(organicPlugin.version).toBe('1.0.0');
    });

    it('should contain 8 shaders', () => {
      expect(organicPlugin.shaders).toHaveLength(8);
    });

    it('should contain expected shaders', () => {
      const shaderNames = organicPlugin.shaders.map((s) => s.name);
      expect(shaderNames).toContain('heartbeat');
      expect(shaderNames).toContain('breathing');
      expect(shaderNames).toContain('particle-burst');
      expect(shaderNames).toContain('morphing-shapes');
      expect(shaderNames).toContain('dissolve');
      expect(shaderNames).toContain('trailFade');
      expect(shaderNames).toContain('hatching');
      expect(shaderNames).toContain('gradient-rotation');
    });

    it('should have organic presets', () => {
      expect(organicPlugin.presets!['heartbeat-slow']).toBeDefined();
      expect(organicPlugin.presets!['celebration']).toBeDefined();
      expect(organicPlugin.presets!['rainbow-spin']).toBeDefined();
    });
  });

  describe('corePlugin', () => {
    it('should be a valid plugin', () => {
      const result = validatePlugin(corePlugin);
      expect(result.valid).toBe(true);
    });

    it('should have correct metadata', () => {
      expect(corePlugin.name).toBe('core');
      expect(corePlugin.version).toBe('1.0.0');
    });

    it('should contain all 26 shaders', () => {
      expect(corePlugin.shaders).toHaveLength(26);
    });

    it('should contain all point shaders (6)', () => {
      const shaderNames = corePlugin.shaders.map((s) => s.name);
      expect(shaderNames).toContain('pulse');
      expect(shaderNames).toContain('heartbeat');
      expect(shaderNames).toContain('radar');
      expect(shaderNames).toContain('particle-burst');
      expect(shaderNames).toContain('glow');
      expect(shaderNames).toContain('morphing-shapes');
    });

    it('should contain all line shaders (7)', () => {
      const shaderNames = corePlugin.shaders.map((s) => s.name);
      expect(shaderNames).toContain('flow');
      expect(shaderNames).toContain('gradientTravel');
      expect(shaderNames).toContain('electric');
      expect(shaderNames).toContain('trailFade');
      expect(shaderNames).toContain('breathing');
      expect(shaderNames).toContain('snake');
      expect(shaderNames).toContain('neon');
    });

    it('should contain all polygon shaders (8)', () => {
      const shaderNames = corePlugin.shaders.map((s) => s.name);
      expect(shaderNames).toContain('scan-lines');
      expect(shaderNames).toContain('ripple');
      expect(shaderNames).toContain('hatching');
      expect(shaderNames).toContain('fill-wave');
      expect(shaderNames).toContain('noise');
      expect(shaderNames).toContain('marching-ants');
      expect(shaderNames).toContain('gradient-rotation');
      expect(shaderNames).toContain('dissolve');
    });

    it('should contain all global shaders (5)', () => {
      const shaderNames = corePlugin.shaders.map((s) => s.name);
      expect(shaderNames).toContain('heatShimmer');
      expect(shaderNames).toContain('dayNightCycle');
      expect(shaderNames).toContain('depthFog');
      expect(shaderNames).toContain('weather');
      expect(shaderNames).toContain('holographicGrid');
    });

    it('should have presets from all thematic plugins', () => {
      const presetKeys = Object.keys(corePlugin.presets!);
      // Check a preset from each thematic plugin
      expect(presetKeys).toContain('alert-critical'); // dataviz
      expect(presetKeys).toContain('rain-heavy'); // atmospheric
      expect(presetKeys).toContain('cyberpunk'); // scifi
      expect(presetKeys).toContain('celebration'); // organic
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

    it('should register dataviz plugin successfully', () => {
      pluginManager.use(datavizPlugin);
      expect(pluginManager.hasPlugin('dataviz')).toBe(true);
      expect(registry.has('dataviz:pulse')).toBe(true);
      expect(registry.has('dataviz:flow')).toBe(true);
    });

    it('should register atmospheric plugin successfully', () => {
      pluginManager.use(atmosphericPlugin);
      expect(pluginManager.hasPlugin('atmospheric')).toBe(true);
      expect(registry.has('atmospheric:weather')).toBe(true);
      expect(registry.has('atmospheric:depthFog')).toBe(true);
    });

    it('should register scifi plugin successfully', () => {
      pluginManager.use(scifiPlugin);
      expect(pluginManager.hasPlugin('scifi')).toBe(true);
      expect(registry.has('scifi:neon')).toBe(true);
      expect(registry.has('scifi:holographicGrid')).toBe(true);
    });

    it('should register organic plugin successfully', () => {
      pluginManager.use(organicPlugin);
      expect(pluginManager.hasPlugin('organic')).toBe(true);
      expect(registry.has('organic:heartbeat')).toBe(true);
      expect(registry.has('organic:dissolve')).toBe(true);
    });

    it('should register core plugin successfully', () => {
      pluginManager.use(corePlugin);
      expect(pluginManager.hasPlugin('core')).toBe(true);
      expect(registry.list().length).toBe(26);
    });

    it('should register multiple thematic plugins together', () => {
      pluginManager.use(datavizPlugin);
      pluginManager.use(scifiPlugin);

      expect(pluginManager.listPlugins()).toHaveLength(2);
      expect(registry.has('dataviz:pulse')).toBe(true);
      expect(registry.has('scifi:neon')).toBe(true);
    });

    it('should allow registering all thematic plugins without conflicts', () => {
      // Each plugin uses namespaces, so no conflicts should occur
      pluginManager.use(datavizPlugin);
      pluginManager.use(atmosphericPlugin);
      pluginManager.use(scifiPlugin);
      pluginManager.use(organicPlugin);

      expect(pluginManager.listPlugins()).toHaveLength(4);
      expect(registry.list().length).toBe(26);
    });

    it('should resolve short shader names when unambiguous', () => {
      pluginManager.use(datavizPlugin);

      const resolved = pluginManager.resolveShaderName('pulse');
      expect(resolved).toBe('dataviz:pulse');
    });

    it('should get preset from plugin', () => {
      pluginManager.use(datavizPlugin);

      const preset = pluginManager.getPreset('dataviz', 'alert-critical');
      expect(preset).toBeDefined();
      expect(preset?.shader).toBe('pulse');
      expect(preset?.config.color).toBe('#ff0000');
    });
  });

  describe('Shader Coverage', () => {
    it('should cover all 26 shaders exactly once across thematic plugins', () => {
      const allShaders = new Set<string>();

      const addShaders = (plugin: ShaderPlugin) => {
        plugin.shaders.forEach((s) => allShaders.add(s.name));
      };

      addShaders(datavizPlugin);
      addShaders(atmosphericPlugin);
      addShaders(scifiPlugin);
      addShaders(organicPlugin);

      expect(allShaders.size).toBe(26);
    });

    it('should have no duplicate shaders across thematic plugins', () => {
      const shaderCounts = new Map<string, number>();

      const countShaders = (plugin: ShaderPlugin) => {
        plugin.shaders.forEach((s) => {
          shaderCounts.set(s.name, (shaderCounts.get(s.name) ?? 0) + 1);
        });
      };

      countShaders(datavizPlugin);
      countShaders(atmosphericPlugin);
      countShaders(scifiPlugin);
      countShaders(organicPlugin);

      const duplicates = Array.from(shaderCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([name]) => name);

      expect(duplicates).toHaveLength(0);
    });

    it('should match core plugin shader count', () => {
      const thematicTotal =
        datavizPlugin.shaders.length +
        atmosphericPlugin.shaders.length +
        scifiPlugin.shaders.length +
        organicPlugin.shaders.length;

      expect(thematicTotal).toBe(corePlugin.shaders.length);
    });
  });
});
