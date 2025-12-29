# Recommandations d'amélioration

Ce document présente 10 recommandations d'amélioration identifiées lors d'une revue de code approfondie du projet maplibre-animated-shaders.

Chaque recommandation inclut :
- Le contexte et la problématique
- L'impact sur le projet
- Une solution proposée avec exemples de code

---

## 1. Éliminer la duplication dans ShaderManager

### Contexte

Les méthodes `registerPointShader`, `registerLineShader`, `registerPolygonShader` et `registerGlobalShader` dans `src/ShaderManager.ts` partagent environ 80% de leur code. Seules quelques lignes diffèrent :
- Le nom de la propriété d'opacité (`circle-opacity`, `line-opacity`, `fill-opacity`)
- La classe de layer utilisée (`PointShaderLayer`, `LineShaderLayer`, etc.)

### Impact

- **Maintenabilité** : Toute modification doit être répétée 4 fois
- **Risque de bugs** : Facile d'oublier de propager un fix à toutes les méthodes
- **Taille du code** : ~200 lignes qui pourraient être réduites à ~60

### Solution proposée

Créer une méthode générique et une map de configuration par type de géométrie :

```typescript
// src/ShaderManager.ts

interface GeometryConfig {
  LayerClass: new (...args: any[]) => CustomShaderLayer;
  opacityProperties: string[];
  customLayerSuffix: string;
}

const GEOMETRY_CONFIGS: Record<GeometryType, GeometryConfig> = {
  point: {
    LayerClass: PointShaderLayer,
    opacityProperties: ['circle-opacity', 'circle-stroke-opacity'],
    customLayerSuffix: '-shader',
  },
  line: {
    LayerClass: LineShaderLayer,
    opacityProperties: ['line-opacity'],
    customLayerSuffix: '-shader',
  },
  polygon: {
    LayerClass: PolygonShaderLayer,
    opacityProperties: ['fill-opacity'],
    customLayerSuffix: '-shader',
  },
  global: {
    LayerClass: GlobalShaderLayer,
    opacityProperties: [],
    customLayerSuffix: '-global-shader',
  },
};

private registerGeometryShader(
  layerId: string,
  definition: ShaderDefinition,
  config: ShaderConfig
): void {
  const geometryConfig = GEOMETRY_CONFIGS[definition.geometry];
  if (!geometryConfig) {
    throw new Error(`Unsupported geometry type: ${definition.geometry}`);
  }

  // Validation commune
  const existingLayer = this.map.getLayer(layerId);
  if (!existingLayer && definition.geometry !== 'global') {
    throw new Error(`[ShaderManager] Layer "${layerId}" not found on map`);
  }

  const sourceId = definition.geometry !== 'global'
    ? (existingLayer as { source?: string }).source
    : undefined;

  if (definition.geometry !== 'global' && !sourceId) {
    throw new Error(`[ShaderManager] Layer "${layerId}" has no source`);
  }

  // Gestion du custom layer
  const customLayerId = `${layerId}${geometryConfig.customLayerSuffix}`;

  if (this.map.getLayer(customLayerId)) {
    this.map.removeLayer(customLayerId);
  }

  // Masquer le layer original
  for (const prop of geometryConfig.opacityProperties) {
    this.map.setPaintProperty(layerId, prop, 0);
  }

  // Créer et ajouter le custom layer
  const customLayer = definition.geometry === 'global'
    ? new geometryConfig.LayerClass(customLayerId, definition, config)
    : new geometryConfig.LayerClass(customLayerId, sourceId!, definition, config);

  this.map.addLayer(customLayer, definition.geometry !== 'global' ? layerId : undefined);
  this.customLayers.set(layerId, customLayer);

  // Créer l'instance de tracking
  const instance: ShaderInstance = {
    layerId,
    definition,
    config,
    isPlaying: true,
    speed: config.speed ?? 1.0,
    localTime: 0,
  };

  this.instances.set(layerId, instance);
  this.log(`Registered ${definition.geometry} shader "${definition.name}" on layer "${layerId}"`);
}
```

---

## 2. Améliorer le typage des configurations

### Contexte

Dans `src/layers/PointShaderLayer.ts` (ligne 306-309), on trouve des castings vers `Record<string, unknown>` :

```typescript
const size = (this.config as Record<string, unknown>).maxRadius ??
             (this.config as Record<string, unknown>).radius ??
             (this.config as Record<string, unknown>).size ?? 50;
```

Ce pattern indique que le système de types n'est pas assez précis pour représenter les différentes configurations de shaders.

### Impact

- **Sécurité du typage** : Les erreurs de type ne sont pas détectées à la compilation
- **Autocomplétion** : L'IDE ne peut pas suggérer les propriétés disponibles
- **Refactoring** : Renommer une propriété ne sera pas détecté par TypeScript

### Solution proposée

Définir une interface union pour les propriétés de taille communes :

```typescript
// src/types/index.ts

/**
 * Propriétés de taille supportées par les shaders de points.
 * Au moins une de ces propriétés doit être présente.
 */
interface SizeConfig {
  maxRadius?: number;
  radius?: number;
  size?: number;
  baseSize?: number;
}

/**
 * Configuration de base étendue avec les propriétés de taille
 */
export interface PointShaderConfig extends ShaderConfig, SizeConfig {}

/**
 * Helper pour extraire la taille d'une configuration
 */
export function extractSize(config: SizeConfig, defaultValue = 50): number {
  return config.maxRadius ?? config.radius ?? config.size ?? config.baseSize ?? defaultValue;
}
```

Utilisation dans `PointShaderLayer.ts` :

```typescript
import { extractSize, PointShaderConfig } from '../types';

// Dans la classe
private config: PointShaderConfig;

// Dans render()
const size = extractSize(this.config);
if (uSize) gl.uniform1f(uSize, size);
```

---

## 3. Extraire automatiquement les uniforms depuis les shaders

### Contexte

Dans `src/layers/PointShaderLayer.ts` (lignes 407-418), plus de 40 noms d'uniforms sont hardcodés :

```typescript
const allUniforms = new Set([
  'u_rings', 'u_maxRadius', 'u_fadeOut', 'u_thickness',
  'u_minScale', 'u_maxScale', 'u_easing', 'u_restDuration',
  // ... 30+ autres
]);
```

Chaque nouveau shader nécessite potentiellement de modifier cette liste.

### Impact

- **Maintenance** : Facile d'oublier d'ajouter un uniform
- **Erreurs silencieuses** : Un uniform manquant ne provoque pas d'erreur, juste un comportement incorrect
- **Couplage** : Les layers connaissent les détails de tous les shaders

### Solution proposée

Parser le code GLSL pour extraire automatiquement les uniforms :

```typescript
// src/utils/glsl-parser.ts

/**
 * Extrait les noms des uniforms depuis du code GLSL.
 * Supporte les formats :
 * - uniform float u_time;
 * - uniform vec4 u_color;
 * - uniform mat4 u_matrix;
 */
export function extractUniformsFromGLSL(glslCode: string): string[] {
  const uniformRegex = /uniform\s+\w+\s+(\w+)\s*;/g;
  const uniforms: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = uniformRegex.exec(glslCode)) !== null) {
    uniforms.push(match[1]);
  }

  return uniforms;
}

/**
 * Extrait les uniforms depuis une définition de shader complète.
 */
export function extractUniformsFromDefinition(definition: ShaderDefinition): string[] {
  const uniforms = new Set<string>();

  // Uniforms du fragment shader
  if (definition.fragmentShader) {
    for (const u of extractUniformsFromGLSL(definition.fragmentShader)) {
      uniforms.add(u);
    }
  }

  // Uniforms du vertex shader (si personnalisé)
  if (definition.vertexShader) {
    for (const u of extractUniformsFromGLSL(definition.vertexShader)) {
      uniforms.add(u);
    }
  }

  return Array.from(uniforms);
}
```

Utilisation dans `PointShaderLayer.ts` :

```typescript
import { extractUniformsFromDefinition } from '../utils/glsl-parser';

private cacheUniformLocations(gl: WebGLRenderingContext): void {
  if (!this.program) return;

  // Uniforms communs à tous les layers
  const commonUniforms = ['u_matrix', 'u_resolution', 'u_size', 'u_time'];

  // Uniforms extraits automatiquement du shader
  const shaderUniforms = extractUniformsFromDefinition(this.definition);

  const allUniforms = new Set([...commonUniforms, ...shaderUniforms]);

  for (const name of allUniforms) {
    this.uniforms.set(name, gl.getUniformLocation(this.program, name));
  }
}
```

---

## 4. Remplacer setTimeout par une gestion événementielle robuste

### Contexte

Dans `src/layers/PointShaderLayer.ts` (lignes 216-219), un délai arbitraire est utilisé :

```typescript
setTimeout(() => {
  this.safeUpdatePointData(gl);
  map.triggerRepaint();
}, 100);
```

Ce délai de 100ms est une "magic number" qui peut être insuffisant sur des connexions lentes ou excessif sur des connexions rapides.

### Impact

- **Fiabilité** : Les données peuvent ne pas être chargées après 100ms
- **Performance** : Attente inutile si les données sont déjà disponibles
- **UX** : Flash de contenu vide puis apparition soudaine

### Solution proposée

Utiliser uniquement les événements MapLibre et implémenter un mécanisme de retry :

```typescript
// src/layers/PointShaderLayer.ts

onAdd(map: MapLibreMap, gl: WebGLRenderingContext): void {
  this.map = map;
  // ... initialization code ...

  // Gestionnaire pour les mises à jour de source
  this.handleSourceData = (e: { sourceId: string; isSourceLoaded?: boolean }) => {
    if (e.sourceId === this.sourceId) {
      this.safeUpdatePointData(gl);
      map.triggerRepaint();
    }
  };

  // Écouter les changements de données
  map.on('sourcedata', this.handleSourceData);

  // Tenter de charger immédiatement si la source est déjà prête
  this.tryInitialLoad(gl, map);
}

private tryInitialLoad(gl: WebGLRenderingContext, map: MapLibreMap): void {
  const source = map.getSource(this.sourceId);

  if (source && map.isSourceLoaded(this.sourceId)) {
    // Source déjà chargée, mise à jour immédiate
    this.safeUpdatePointData(gl);
    map.triggerRepaint();
  } else {
    // Attendre que la carte soit idle (toutes les tuiles chargées)
    map.once('idle', () => {
      this.safeUpdatePointData(gl);
      map.triggerRepaint();
    });
  }
}

onRemove(map: MapLibreMap, gl: WebGLRenderingContext): void {
  // Nettoyer les listeners
  if (this.handleSourceData) {
    map.off('sourcedata', this.handleSourceData);
  }
  // ... reste du cleanup ...
}
```

---

## 5. Ajouter des tests d'intégration visuels

### Contexte

Les tests actuels dans `tests/` mockent entièrement WebGL et MapLibre. Bien que cela permette de tester la logique métier, cela ne garantit pas que les shaders s'affichent correctement.

### Impact

- **Régressions visuelles** : Un changement de shader peut casser le rendu sans faire échouer les tests
- **Compatibilité** : Pas de vérification du comportement réel sur différents navigateurs
- **Confiance** : Difficile de valider que les effets visuels sont corrects

### Solution proposée

Ajouter Playwright pour les tests visuels avec comparaison de screenshots :

```bash
npm install -D @playwright/test
```

```typescript
// tests/visual/shaders.visual.test.ts

import { test, expect } from '@playwright/test';

test.describe('Point Shaders Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Charger la page de démo avec un état connu
    await page.goto('http://localhost:5173/demo');
    // Attendre que la carte soit chargée
    await page.waitForSelector('.maplibregl-canvas');
    await page.waitForTimeout(1000); // Attendre le rendu initial
  });

  test('pulse shader renders correctly', async ({ page }) => {
    // Activer le shader pulse
    await page.selectOption('#shader-select', 'pulse');
    await page.waitForTimeout(500); // Laisser l'animation démarrer

    // Capturer et comparer
    await expect(page.locator('.maplibregl-canvas')).toHaveScreenshot(
      'pulse-shader.png',
      { maxDiffPixels: 100 } // Tolérance pour l'animation
    );
  });

  test('pulse shader respects color config', async ({ page }) => {
    await page.selectOption('#shader-select', 'pulse');
    await page.fill('#color-input', '#ff0000');
    await page.waitForTimeout(500);

    await expect(page.locator('.maplibregl-canvas')).toHaveScreenshot(
      'pulse-shader-red.png',
      { maxDiffPixels: 100 }
    );
  });
});
```

Configuration Playwright :

```typescript
// playwright.config.ts

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotDir: './tests/visual/snapshots',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev:demo',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

Ajouter au `package.json` :

```json
{
  "scripts": {
    "test:visual": "playwright test",
    "test:visual:update": "playwright test --update-snapshots"
  }
}
```

---

## 6. Implémenter le pooling pour les gros datasets

### Contexte

Dans `src/layers/PointShaderLayer.ts`, la méthode `processFeatures` crée de nouveaux objets pour chaque feature à chaque mise à jour :

```typescript
private processFeatures(features: GeoJSON.Feature[]): void {
  this.points = []; // Nouvelle allocation
  for (let i = 0; i < features.length; i++) {
    this.points.push({  // Nouvel objet à chaque itération
      mercatorX: mercator[0],
      mercatorY: mercator[1],
      index: i,
    });
  }
}
```

### Impact

- **GC Pressure** : Pour 10,000 points, création de 10,000 objets à chaque update
- **Stuttering** : Le garbage collector peut causer des micro-freezes
- **Mémoire** : Pics de mémoire lors des mises à jour fréquentes

### Solution proposée

Implémenter un système de pooling d'objets :

```typescript
// src/utils/object-pool.ts

/**
 * Pool d'objets réutilisables pour éviter les allocations répétées.
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize = 100) {
    this.factory = factory;
    this.reset = reset;

    // Pré-allouer des objets
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }

  releaseAll(objects: T[]): void {
    for (const obj of objects) {
      this.release(obj);
    }
  }
}
```

Utilisation dans `PointShaderLayer.ts` :

```typescript
// src/layers/PointShaderLayer.ts

import { ObjectPool } from '../utils/object-pool';

interface PointData {
  mercatorX: number;
  mercatorY: number;
  index: number;
}

export class PointShaderLayer implements CustomLayerInterface {
  private pointPool = new ObjectPool<PointData>(
    () => ({ mercatorX: 0, mercatorY: 0, index: 0 }),
    (p) => { p.mercatorX = 0; p.mercatorY = 0; p.index = 0; },
    1000 // Taille initiale du pool
  );

  private processFeatures(
    features: GeoJSON.Feature[],
    gl: WebGLRenderingContext
  ): void {
    // Retourner les anciens points au pool
    this.pointPool.releaseAll(this.points);
    this.points = [];

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (feature.geometry.type !== 'Point') continue;

      const coords = (feature.geometry as GeoJSON.Point).coordinates;
      const mercator = this.lngLatToMercator(coords[0], coords[1]);

      // Réutiliser un objet du pool
      const point = this.pointPool.acquire();
      point.mercatorX = mercator[0];
      point.mercatorY = mercator[1];
      point.index = i;

      this.points.push(point);
    }

    this.buildBuffers(gl);
  }
}
```

---

## 7. Ajouter du throttling sur les mises à jour de données

### Contexte

Chaque événement `sourcedata` déclenche une reconstruction complète des buffers WebGL. Pour des sources GeoJSON dynamiques (ex: positions GPS en temps réel), cela peut générer des dizaines d'updates par seconde.

### Impact

- **CPU** : Reconstruction inutile des buffers
- **GPU** : Uploads fréquents vers la mémoire GPU
- **Batterie** : Consommation excessive sur mobile

### Solution proposée

Implémenter un throttle avec fusion des updates :

```typescript
// src/utils/throttle.ts

/**
 * Throttle une fonction pour qu'elle ne s'exécute qu'une fois par intervalle.
 * Les appels pendant l'intervalle sont fusionnés, et la fonction est appelée
 * avec les derniers arguments à la fin de l'intervalle.
 */
export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  intervalMs: number
): T & { cancel: () => void; flush: () => void } {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttled = ((...args: Parameters<T>) => {
    lastArgs = args;
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= intervalMs) {
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        if (lastArgs) {
          fn(...lastArgs);
        }
      }, intervalMs - timeSinceLastCall);
    }
  }) as T & { cancel: () => void; flush: () => void };

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  throttled.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastCall = Date.now();
      fn(...lastArgs);
    }
  };

  return throttled;
}
```

Utilisation dans `PointShaderLayer.ts` :

```typescript
import { throttle } from '../utils/throttle';

export class PointShaderLayer implements CustomLayerInterface {
  private throttledUpdatePointData: ReturnType<typeof throttle>;

  onAdd(map: MapLibreMap, gl: WebGLRenderingContext): void {
    // ... initialization ...

    // Throttle les updates à max 10 fois par seconde
    this.throttledUpdatePointData = throttle(
      () => {
        this.safeUpdatePointData(gl);
        map.triggerRepaint();
      },
      100 // 100ms = max 10 updates/seconde
    );

    map.on('sourcedata', (e) => {
      if (e.sourceId === this.sourceId) {
        this.throttledUpdatePointData();
      }
    });
  }

  onRemove(map: MapLibreMap, gl: WebGLRenderingContext): void {
    // Annuler les updates en attente
    if (this.throttledUpdatePointData) {
      this.throttledUpdatePointData.cancel();
    }
    // ... reste du cleanup ...
  }
}
```

---

## 8. Compléter les métadonnées du package

### Contexte

Le fichier `package.json` contient des champs incomplets :

```json
{
  "author": "",
  "repository": {
    "url": "https://github.com/[username]/maplibre-animated-shaders"
  }
}
```

### Impact

- **Crédibilité** : Un package sans auteur semble abandonné
- **Découvrabilité** : npm utilise ces champs pour le référencement
- **Contribution** : Les contributeurs ne savent pas où soumettre des issues

### Solution proposée

Compléter les métadonnées :

```json
{
  "author": {
    "name": "Votre Nom",
    "email": "email@example.com",
    "url": "https://votre-site.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/votre-username/maplibre-animated-shaders.git"
  },
  "bugs": {
    "url": "https://github.com/votre-username/maplibre-animated-shaders/issues"
  },
  "homepage": "https://github.com/votre-username/maplibre-animated-shaders#readme",
  "funding": {
    "type": "github",
    "url": "https://github.com/sponsors/votre-username"
  }
}
```

---

## 9. Supprimer ou implémenter les fonctions deprecated

### Contexte

La fonction `removeShader` dans `src/ShaderManager.ts` (lignes 733-737) est marquée deprecated mais existe toujours dans l'API publique :

```typescript
/**
 * @deprecated Use the controller returned by applyShader instead
 */
export function removeShader(_map: MapLibreMapInstance, _layerId: string): void {
  console.warn('[removeShader] This function is deprecated...');
}
```

### Impact

- **Confusion** : Les utilisateurs peuvent essayer de l'utiliser
- **Bundle size** : Code mort inclus dans le build
- **API surface** : Pollue l'API publique

### Solution proposée

Option A - Supprimer complètement (recommandé pour v1.0) :

```typescript
// Supprimer la fonction et son export de src/index.ts
```

Option B - Implémenter une vraie fonctionnalité (si rétrocompatibilité requise) :

```typescript
// Stocker une référence globale aux managers
const activeManagers = new WeakMap<MapLibreMapInstance, ShaderManager>();

export function applyShader(
  map: MapLibreMapInstance,
  layerId: string,
  shaderName: string,
  config?: Partial<ShaderConfig>
): ShaderController {
  // Réutiliser un manager existant ou en créer un nouveau
  let manager = activeManagers.get(map);
  if (!manager) {
    manager = new ShaderManager(map, { autoStart: true });
    activeManagers.set(map, manager);
  }

  manager.register(layerId, shaderName, config);

  return {
    pause: () => manager!.pause(layerId),
    play: () => manager!.play(layerId),
    update: (newConfig) => manager!.updateConfig(layerId, newConfig),
    remove: () => manager!.unregister(layerId),
    isPlaying: () => manager!.getInstance(layerId)?.isPlaying ?? false,
  };
}

/**
 * Remove a shader from a layer.
 * Note: Prefer using the controller returned by applyShader().remove()
 */
export function removeShader(map: MapLibreMapInstance, layerId: string): void {
  const manager = activeManagers.get(map);
  if (manager) {
    manager.unregister(layerId);
  }
}
```

---

## 10. Ajouter la détection des capacités WebGL

### Contexte

Le code assume que WebGL est disponible et que `precision highp float` est supporté. Sur certains appareils mobiles anciens, ces hypothèses peuvent être fausses.

### Impact

- **Compatibilité** : Crash silencieux sur appareils non supportés
- **Debugging** : Difficile de comprendre pourquoi rien ne s'affiche
- **UX** : Pas de fallback ou message d'erreur clair

### Solution proposée

Créer un module de détection des capacités :

```typescript
// src/utils/webgl-capabilities.ts

export interface WebGLCapabilities {
  supported: boolean;
  version: 1 | 2 | null;
  maxTextureSize: number;
  maxVertexUniforms: number;
  maxFragmentUniforms: number;
  highPrecisionSupported: boolean;
  extensions: {
    floatTextures: boolean;
    instancedArrays: boolean;
    vertexArrayObjects: boolean;
  };
}

/**
 * Détecte les capacités WebGL du navigateur.
 */
export function detectWebGLCapabilities(): WebGLCapabilities {
  const canvas = document.createElement('canvas');

  // Essayer WebGL 2 d'abord, puis WebGL 1
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null =
    canvas.getContext('webgl2') || canvas.getContext('webgl');

  if (!gl) {
    return {
      supported: false,
      version: null,
      maxTextureSize: 0,
      maxVertexUniforms: 0,
      maxFragmentUniforms: 0,
      highPrecisionSupported: false,
      extensions: {
        floatTextures: false,
        instancedArrays: false,
        vertexArrayObjects: false,
      },
    };
  }

  const version = gl instanceof WebGL2RenderingContext ? 2 : 1;

  // Vérifier le support de highp dans le fragment shader
  const highPrecision = gl.getShaderPrecisionFormat(
    gl.FRAGMENT_SHADER,
    gl.HIGH_FLOAT
  );
  const highPrecisionSupported = highPrecision !== null && highPrecision.precision > 0;

  return {
    supported: true,
    version,
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    highPrecisionSupported,
    extensions: {
      floatTextures: !!gl.getExtension('OES_texture_float'),
      instancedArrays: version === 2 || !!gl.getExtension('ANGLE_instanced_arrays'),
      vertexArrayObjects: version === 2 || !!gl.getExtension('OES_vertex_array_object'),
    },
  };
}

/**
 * Vérifie si les capacités minimales sont présentes.
 */
export function checkMinimumRequirements(): { ok: boolean; errors: string[] } {
  const caps = detectWebGLCapabilities();
  const errors: string[] = [];

  if (!caps.supported) {
    errors.push('WebGL is not supported in this browser');
  }

  if (!caps.highPrecisionSupported) {
    errors.push('High precision floats are not supported in fragment shaders');
  }

  if (caps.maxTextureSize < 2048) {
    errors.push(`Max texture size (${caps.maxTextureSize}) is below minimum (2048)`);
  }

  return { ok: errors.length === 0, errors };
}
```

Utilisation dans `ShaderManager.ts` :

```typescript
import { checkMinimumRequirements } from './utils/webgl-capabilities';

export class ShaderManager implements IShaderManager {
  constructor(map: MapLibreMapInstance, options: ShaderManagerOptions = {}) {
    // Vérifier les capacités WebGL au démarrage
    const requirements = checkMinimumRequirements();
    if (!requirements.ok) {
      const errorMsg = `WebGL requirements not met:\n${requirements.errors.join('\n')}`;
      if (options.debug) {
        console.error(`[ShaderManager] ${errorMsg}`);
      }
      throw new Error(errorMsg);
    }

    // ... reste de l'initialisation ...
  }
}
```

---

## Priorité de mise en oeuvre suggérée

| # | Recommandation | Effort | Impact | Priorité |
|---|----------------|--------|--------|----------|
| 8 | Métadonnées package | Faible | Moyen | **Immédiat** |
| 9 | Fonctions deprecated | Faible | Faible | **Immédiat** |
| 4 | Remplacer setTimeout | Moyen | Élevé | **Court terme** |
| 10 | Détection WebGL | Moyen | Élevé | **Court terme** |
| 1 | Éliminer duplication | Moyen | Moyen | **Moyen terme** |
| 3 | Extraction uniforms | Moyen | Moyen | **Moyen terme** |
| 7 | Throttling updates | Moyen | Élevé | **Moyen terme** |
| 2 | Améliorer typage | Élevé | Moyen | **Long terme** |
| 5 | Tests visuels | Élevé | Élevé | **Long terme** |
| 6 | Object pooling | Élevé | Moyen | **Long terme** |

---

## Notes finales

Ces recommandations visent à améliorer la maintenabilité, la robustesse et les performances du projet. Elles ne sont pas bloquantes pour une publication v1.0, mais devraient être considérées pour les versions futures.

L'ordre de priorité suggéré privilégie les changements à faible risque et fort impact en premier, suivis des améliorations architecturales plus profondes.
