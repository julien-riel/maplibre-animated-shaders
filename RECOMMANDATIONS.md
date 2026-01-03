# Recommandations d'Amélioration

Ce document présente des recommandations pour améliorer le projet MapLibre Animated Shaders, basées sur une analyse approfondie du code source.

## Table des Matières

1. [Fonctionnalités](#fonctionnalités)
2. [Architecture](#architecture)
3. [Qualité de Code](#qualité-de-code)
4. [Performance](#performance)
5. [Tests](#tests)
6. [Documentation](#documentation)
7. [DevEx (Developer Experience)](#devex-developer-experience)
8. [Écosystème](#écosystème)

---

## Fonctionnalités

### Haute Priorité

#### 1. Support WebGL 2.0
**Problème actuel**: Le projet utilise uniquement WebGL 1.0, limitant les fonctionnalités disponibles.

**Recommandation**:
- Détecter WebGL 2.0 et l'utiliser si disponible
- Exploiter les nouvelles fonctionnalités : instanced rendering, transform feedback, integer textures
- Fallback gracieux vers WebGL 1.0

**Impact**: Performance améliorée sur les navigateurs modernes, particulièrement pour les grandes quantités de features.

```typescript
// Exemple d'implémentation
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
const isWebGL2 = gl instanceof WebGL2RenderingContext;
```

#### 2. Shaders 3D / Terrain
**Problème actuel**: Tous les shaders sont en `renderingMode: '2d'`.

**Recommandation**:
- Ajouter le support `renderingMode: '3d'` pour les shaders
- Intégration avec le terrain MapLibre (extrusion, ombres)
- Z-fighting prevention automatique

**Impact**: Permet des effets visuels 3D comme des bâtiments animés, des effets de hauteur.

#### 3. Post-Processing Pipeline
**Problème actuel**: Les GlobalShaders sont indépendants, pas de chaînage.

**Recommandation**:
- Créer un pipeline de post-processing chainable
- Support du multi-pass rendering
- Effets combinables : bloom, blur, color grading, vignette

```typescript
manager.addPostEffect('bloom', { threshold: 0.8, intensity: 1.5 });
manager.addPostEffect('vignette', { radius: 0.5 });
// L'ordre compte - appliqués séquentiellement
```

### Moyenne Priorité

#### 4. Textures et Sprites
**Problème actuel**: Pas de support natif pour les textures dans les shaders.

**Recommandation**:
- API pour charger et binder des textures
- Support des sprite sheets animées
- Texture atlas automatique pour performance

```typescript
const shader = defineShader({
  textures: {
    u_noiseTexture: { type: 'texture2D', src: 'noise.png' },
    u_spriteSheet: { type: 'texture2D', src: 'sprites.png', frames: 16 }
  }
});
```

#### 5. Transitions et Morphing
**Problème actuel**: Changement de shader abrupt.

**Recommandation**:
- Transitions fluides entre shaders différents
- Morphing de configuration animé
- Easing personnalisable pour les transitions

```typescript
manager.transitionTo('layer', 'newShader', newConfig, {
  duration: 500,
  easing: 'easeInOutCubic'
});
```

#### 6. Audio Reactivity
**Problème actuel**: Pas d'intégration audio.

**Recommandation**:
- Analyser audio via Web Audio API
- Exposer des uniforms réactifs (bass, mid, high, beat detection)
- Mode "beat sync" pour synchroniser les animations

```typescript
manager.connectAudio(audioElement);
// Automatiquement disponible dans les shaders:
// uniform float u_audioBass;
// uniform float u_audioMid;
// uniform float u_audioHigh;
// uniform float u_audioBeat;
```

### Basse Priorité

#### 7. Export Vidéo/GIF
**Problème actuel**: Pas de moyen d'exporter les animations.

**Recommandation**:
- Capturer les frames via canvas.toDataURL()
- Intégration avec des encodeurs (gif.js, ffmpeg.wasm)
- API simple pour l'export

```typescript
const recorder = manager.createRecorder({ fps: 30, duration: 5000 });
recorder.start();
// ... après 5 secondes
const blob = await recorder.export('gif'); // ou 'webm', 'mp4'
```

#### 8. Shader Editor Runtime
**Problème actuel**: Pas d'édition en temps réel des shaders.

**Recommandation**:
- Mode développement avec hot-reload des shaders GLSL
- Éditeur in-browser avec syntax highlighting
- Visualisation des erreurs inline

---

## Architecture

### Haute Priorité

#### 1. Découplage MapLibre
**Problème actuel**: Couplage fort avec MapLibre GL JS.

**Recommandation**:
- Créer une couche d'abstraction `MapAdapter`
- Permettre d'autres targets : Mapbox GL, deck.gl, Three.js
- Core shader engine indépendant de la carte

```typescript
// Abstraction proposée
interface MapAdapter {
  addCustomLayer(layer: CustomLayer): void;
  removeLayer(id: string): void;
  getCanvas(): HTMLCanvasElement;
  getGL(): WebGLRenderingContext;
  triggerRepaint(): void;
  on(event: string, handler: Function): void;
}

class MapLibreAdapter implements MapAdapter { ... }
class MapboxAdapter implements MapAdapter { ... }
```

**Impact**: Élargit considérablement l'audience potentielle.

#### 2. Système d'Événements Centralisé
**Problème actuel**: Événements dispersés, pas de bus d'événements.

**Recommandation**:
- EventEmitter centralisé dans ShaderManager
- Événements typés et documentés
- Support des middlewares

```typescript
manager.on('shader:registered', ({ layerId, shaderName }) => { });
manager.on('shader:error', ({ error, layerId }) => { });
manager.on('frame', ({ time, deltaTime, fps }) => { });
manager.on('performance:warning', ({ type, details }) => { });
```

#### 3. State Management Amélioré
**Problème actuel**: État dispersé entre plusieurs classes.

**Recommandation**:
- Store centralisé pour l'état des shaders
- Immutabilité pour faciliter le debug
- DevTools integration (Redux-like)

```typescript
interface ShaderState {
  layers: Map<string, LayerState>;
  globalTime: number;
  isPlaying: boolean;
  globalSpeed: number;
}

// Permettrait des snapshots, undo/redo, time travel debugging
```

### Moyenne Priorité

#### 4. Dependency Injection
**Problème actuel**: Instanciation directe des dépendances.

**Recommandation**:
- Container IoC léger
- Facilite les tests et le mocking
- Permet la personnalisation des composants

```typescript
const container = createContainer({
  registry: CustomShaderRegistry,
  animationLoop: CustomAnimationLoop,
  expressionEvaluator: CustomEvaluator
});

const manager = createShaderManager(map, { container });
```

#### 5. Worker Thread Support
**Problème actuel**: Tout s'exécute sur le main thread.

**Recommandation**:
- Déplacer les calculs lourds vers des Web Workers
- Expression evaluation en parallèle
- Buffer building off-thread

**Impact**: UI plus fluide, surtout avec beaucoup de features.

#### 6. Streaming / Chunking
**Problème actuel**: Toutes les features sont chargées d'un coup.

**Recommandation**:
- Charger les features par chunks
- Progressive rendering
- Virtual scrolling pour les layers avec beaucoup de features

---

## Qualité de Code

### Haute Priorité

#### 1. Réduire la Taille des Fichiers
**Problème actuel**: Certains fichiers sont très longs (ShaderManager: 926 lignes, PolygonShaderLayer: 716 lignes).

**Recommandation**:
- Extraire les responsabilités en modules plus petits
- ShaderManager → ShaderRegistration, ShaderPlayback, ShaderConfiguration
- Maximum ~300 lignes par fichier

```
src/
  ShaderManager/
    index.ts              # Facade
    registration.ts       # register/unregister
    playback.ts          # play/pause/speed
    configuration.ts     # updateConfig
    lifecycle.ts         # destroy/cleanup
```

#### 2. Constantes Magiques
**Problème actuel**: Nombres magiques dans le code.

**Recommandation**:
- Extraire toutes les constantes dans un fichier dédié
- Documenter leur signification

```typescript
// src/constants.ts
export const DEFAULTS = {
  MAX_FPS: 60,
  DEFAULT_SPEED: 1.0,
  ANIMATION_PRECISION: 0.001,
  MAX_FEATURES_PER_CHUNK: 10000,
  BUFFER_GROWTH_FACTOR: 1.5
} as const;

export const GEOMETRY_CONFIGS = { ... } as const;
```

#### 3. Error Handling Cohérent
**Problème actuel**: Mix de throw, console.error, et silent failures.

**Recommandation**:
- Hiérarchie d'erreurs personnalisées
- Logging centralisé avec niveaux
- Recovery strategies documentées

```typescript
// src/errors.ts
export class ShaderError extends Error {
  constructor(message: string, public code: string, public recoverable: boolean) {
    super(message);
  }
}

export class ShaderCompilationError extends ShaderError { }
export class PluginValidationError extends ShaderError { }
export class ConfigurationError extends ShaderError { }
```

### Moyenne Priorité

#### 4. Immutabilité des Configurations
**Problème actuel**: Les configs peuvent être mutées après passage.

**Recommandation**:
- Deep freeze des configurations
- Utiliser `readonly` partout où applicable
- Retourner des copies, pas des références

```typescript
function register(layerId: string, shaderName: string, config: Readonly<ShaderConfig>) {
  const frozenConfig = Object.freeze(structuredClone(config));
  // ...
}
```

#### 5. Validation Runtime Plus Stricte
**Problème actuel**: Certaines validations manquantes.

**Recommandation**:
- Valider les uniform values avant envoi au GPU
- Vérifier les ranges des paramètres
- Assertions en mode development

```typescript
// En mode dev uniquement
if (process.env.NODE_ENV === 'development') {
  assertValidUniformValue('u_time', value, 'float');
  assertInRange('u_rings', value, 1, 10);
}
```

#### 6. Documentation Inline (JSDoc)
**Problème actuel**: JSDoc inégal dans le code.

**Recommandation**:
- JSDoc complet pour toutes les fonctions publiques
- Exemples d'utilisation dans les commentaires
- @throws documentation

```typescript
/**
 * Registers a shader effect on a MapLibre layer.
 *
 * @param layerId - The ID of the existing MapLibre layer
 * @param shaderName - Qualified shader name (e.g., 'example:point')
 * @param config - Shader configuration options
 * @param interactivityConfig - Optional per-feature interaction settings
 *
 * @throws {LayerNotFoundError} If the layer doesn't exist
 * @throws {ShaderNotFoundError} If the shader isn't registered
 * @throws {ConfigurationError} If config validation fails
 *
 * @example
 * ```typescript
 * manager.register('my-points', 'example:point', {
 *   color: '#ff0000',
 *   speed: 1.5
 * });
 * ```
 */
register(layerId: string, shaderName: string, config?: Partial<ShaderConfig>): void
```

---

## Performance

### Haute Priorité

#### 1. Instanced Rendering
**Problème actuel**: Chaque feature est rendue individuellement avec des quads.

**Recommandation**:
- Utiliser le instanced rendering (WebGL 2 ou extension)
- Réduire drastiquement les draw calls
- Un seul draw call pour N features identiques

**Impact**: 10-100x amélioration pour les layers avec beaucoup de points.

```typescript
// Avec instancing
gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, featureCount);
// Au lieu de
for (let i = 0; i < featureCount; i++) {
  gl.drawArrays(gl.TRIANGLE_STRIP, i * 4, 4);
}
```

#### 2. Frustum Culling
**Problème actuel**: Toutes les features sont rendues, même hors écran.

**Recommandation**:
- Calculer le bounding box visible
- Filtrer les features hors viewport
- Utiliser un spatial index (R-tree)

**Impact**: Performance linéaire avec les features visibles, pas totales.

#### 3. Level of Detail (LOD)
**Problème actuel**: Même complexité quel que soit le zoom.

**Recommandation**:
- Simplifier les effets à faible zoom
- Réduire le nombre de rings/waves selon la taille à l'écran
- Skip des features trop petites

```typescript
configSchema: {
  rings: {
    type: 'number',
    // Ou expression data-driven basée sur le zoom
    default: ['interpolate', ['linear'], ['zoom'],
      5, 1,   // 1 ring à zoom 5
      10, 3,  // 3 rings à zoom 10
      15, 5   // 5 rings à zoom 15
    ]
  }
}
```

### Moyenne Priorité

#### 4. Shader Caching
**Problème actuel**: Les programs sont recompilés à chaque instanciation de layer.

**Recommandation**:
- Cache global des WebGLProgram par hash du code
- Réutiliser les programs entre layers
- Lazy compilation

```typescript
class ProgramCache {
  private cache = new Map<string, WebGLProgram>();

  getOrCreate(gl: WebGL, vertex: string, fragment: string): WebGLProgram {
    const hash = hashCode(vertex + fragment);
    if (!this.cache.has(hash)) {
      this.cache.set(hash, compileProgram(gl, vertex, fragment));
    }
    return this.cache.get(hash)!;
  }
}
```

#### 5. Buffer Streaming
**Problème actuel**: Buffers recréés entièrement lors des updates.

**Recommandation**:
- Double/triple buffering pour éviter les stalls
- bufferSubData pour les updates partielles
- Pré-allouer avec marge de croissance

#### 6. Adaptive Frame Rate
**Problème actuel**: Target FPS fixe.

**Recommandation**:
- Détecter les drops de FPS
- Réduire automatiquement la qualité
- Mode "battery saver" pour mobile

```typescript
manager.setAdaptiveQuality({
  targetFPS: 60,
  minFPS: 30,
  degradationSteps: [
    { threshold: 45, action: 'reduce_rings' },
    { threshold: 35, action: 'disable_glow' },
    { threshold: 25, action: 'reduce_features' }
  ]
});
```

---

## Tests

### Haute Priorité

#### 1. Tests de Snapshot pour Shaders
**Problème actuel**: Pas de tests visuels automatisés pour les shaders individuels.

**Recommandation**:
- Screenshot tests pour chaque shader
- Comparaison pixel-perfect avec tolérance
- CI integration avec artifacts

```typescript
test('point shader renders correctly', async () => {
  const canvas = await renderShader('example:point', {
    color: '#ff0000',
    rings: 3
  });
  expect(canvas).toMatchImageSnapshot({
    failureThreshold: 0.01
  });
});
```

#### 2. Tests de Performance Automatisés
**Problème actuel**: Benchmarks manuels.

**Recommandation**:
- Benchmarks dans CI avec seuils de régression
- Alertes si performance diminue de >10%
- Tracking historique des métriques

```yaml
# .github/workflows/benchmark.yml
- name: Run benchmarks
  run: npm run bench:ci
- name: Compare with baseline
  uses: benchmark-action/github-action-benchmark@v1
  with:
    alert-threshold: '110%'
    fail-on-alert: true
```

#### 3. Tests d'Intégration MapLibre
**Problème actuel**: Tests E2E limités.

**Recommandation**:
- Tests avec différentes versions de MapLibre
- Tests de compatibilité navigateur
- Tests de memory leaks

```typescript
describe.each(['3.0.0', '4.0.0', '5.0.0'])('MapLibre %s', (version) => {
  test('basic shader registration works', async () => {
    // ...
  });
});
```

### Moyenne Priorité

#### 4. Fuzzing des Configurations
**Problème actuel**: Pas de tests avec des configurations aléatoires.

**Recommandation**:
- Property-based testing avec fast-check
- Générer des configs aléatoires valides
- Trouver les edge cases

```typescript
import fc from 'fast-check';

test('shader handles any valid config', () => {
  fc.assert(
    fc.property(
      fc.record({
        color: fc.hexaString(),
        speed: fc.float({ min: 0.1, max: 10 }),
        rings: fc.integer({ min: 1, max: 10 })
      }),
      (config) => {
        expect(() => manager.register('test', 'example:point', config)).not.toThrow();
      }
    )
  );
});
```

#### 5. Tests de Stress
**Problème actuel**: Pas de tests avec beaucoup de features.

**Recommandation**:
- Tests avec 10k, 100k, 1M features
- Mesurer la dégradation de performance
- Identifier les goulots d'étranglement

---

## Documentation

### Haute Priorité

#### 1. Interactive Playground
**Problème actuel**: Pas de moyen d'expérimenter en ligne.

**Recommandation**:
- Site web avec éditeur interactif
- Modifier configs en temps réel
- Exemples live pour chaque shader

**Outils**: CodeSandbox templates, Storybook, ou custom playground

#### 2. Tutoriels Vidéo
**Problème actuel**: Documentation uniquement textuelle.

**Recommandation**:
- Vidéos courtes (2-5 min) pour les concepts clés
- Getting started screencast
- "Making of" pour les shaders complexes

#### 3. Cookbook / Recipes
**Problème actuel**: Manque d'exemples pratiques.

**Recommandation**:
- Collection de recettes pour cas d'usage courants
- "Comment faire X" format
- Code copiable directement

```markdown
## Recipe: Alert Marker with Sound
## Recipe: Traffic Flow Animation
## Recipe: Weather Radar Overlay
## Recipe: Heatmap with Pulse
```

### Moyenne Priorité

#### 4. Diagrammes d'Architecture
**Problème actuel**: Architecture en texte uniquement.

**Recommandation**:
- Diagrammes Mermaid/D2 dans la doc
- Flowcharts pour les processus complexes
- Schémas du pipeline de rendu

#### 5. Changelog Automatique
**Problème actuel**: Script de changelog existe mais pas intégré.

**Recommandation**:
- Conventional commits enforced
- Changelog généré automatiquement
- Release notes détaillées

---

## DevEx (Developer Experience)

### Haute Priorité

#### 1. CLI Tool
**Problème actuel**: Pas d'outil en ligne de commande.

**Recommandation**:
- Scaffolding de plugins : `npx maplibre-shaders create-plugin my-plugin`
- Validation : `npx maplibre-shaders validate ./my-plugin`
- Preview local : `npx maplibre-shaders preview ./my-shader.ts`

```bash
npx maplibre-shaders create-plugin weather-effects
# Creates:
# weather-effects/
#   src/
#     index.ts
#     shaders/
#       rain.ts
#   package.json
#   tsconfig.json
#   README.md
```

#### 2. VS Code Extension
**Problème actuel**: Pas d'intégration IDE.

**Recommandation**:
- Syntax highlighting pour GLSL inline
- Autocomplete pour les configs
- Preview inline des shaders
- Snippets pour les patterns courants

#### 3. Hot Module Replacement (HMR)
**Problème actuel**: Rechargement complet nécessaire.

**Recommandation**:
- HMR pour les shaders GLSL
- Rechargement à chaud des configs
- Préservation de l'état d'animation

```typescript
if (import.meta.hot) {
  import.meta.hot.accept('./shaders/rain.glsl', (newShader) => {
    manager.updateShaderSource('weather:rain', newShader);
  });
}
```

### Moyenne Priorité

#### 4. Debug Mode Amélioré
**Problème actuel**: Debug basique avec console.log.

**Recommandation**:
- Visualisation des buffers
- Affichage des uniforms en temps réel
- Frame-by-frame stepping
- GPU timing queries

```typescript
const manager = createShaderManager(map, {
  debug: {
    showBuffers: true,
    showUniforms: true,
    showFPS: true,
    gpuTiming: true
  }
});
```

#### 5. Error Recovery
**Problème actuel**: Erreurs peuvent casser l'état.

**Recommandation**:
- Mode "safe" avec fallback automatique
- Retry logic pour les erreurs transitoires
- État de récupération documenté

---

## Écosystème

### Haute Priorité

#### 1. Plugin Registry / Marketplace
**Problème actuel**: Pas de moyen de découvrir des plugins tiers.

**Recommandation**:
- Site web listant les plugins communautaires
- Tags, ratings, downloads
- Intégration npm

#### 2. Plugins Officiels Thématiques
**Problème actuel**: Un seul plugin d'exemple.

**Recommandation**:
- `@maplibre-shaders/weather` - Pluie, neige, brouillard
- `@maplibre-shaders/data-viz` - Heatmaps, flows, clusters
- `@maplibre-shaders/effects` - Glow, neon, holographic
- `@maplibre-shaders/gaming` - Particules, explosions

#### 3. React/Vue/Svelte Bindings
**Problème actuel**: Intégration manuelle avec les frameworks.

**Recommandation**:
- `@maplibre-shaders/react` avec hooks
- `@maplibre-shaders/vue` avec composables
- `@maplibre-shaders/svelte` avec actions

```tsx
// React example
function MapComponent() {
  const { register, play, pause } = useShaderManager();

  useEffect(() => {
    register('points', 'example:point', { color: '#ff0000' });
    play();
  }, []);

  return <Map />;
}
```

### Moyenne Priorité

#### 4. Deck.gl Integration
**Problème actuel**: MapLibre only.

**Recommandation**:
- Créer un deck.gl Layer personnalisé
- Réutiliser le core shader engine
- Exemple d'intégration

#### 5. Server-Side Rendering
**Problème actuel**: Client-side uniquement.

**Recommandation**:
- Support de headless-gl pour Node.js
- Génération d'images statiques côté serveur
- Useful pour thumbnails, exports

---

## Priorisation Suggérée

### Phase 1 (Court terme - 1-2 mois)
1. Réduire la taille des fichiers (refactoring)
2. Tests de snapshot pour shaders
3. Hot Module Replacement
4. Documentation JSDoc complète
5. Constantes magiques extraites

### Phase 2 (Moyen terme - 3-6 mois)
1. WebGL 2.0 support
2. Instanced rendering
3. Plugin registry site
4. CLI tool
5. React bindings

### Phase 3 (Long terme - 6-12 mois)
1. Post-processing pipeline
2. Textures et sprites
3. 3D / Terrain support
4. VS Code extension
5. Plugins officiels thématiques

---

## Métriques de Succès

| Métrique | Actuel | Objectif |
|----------|--------|----------|
| Bundle size (gzipped) | ~50KB | <40KB |
| Time to first shader | ~100ms | <50ms |
| Max features @60fps | ~10,000 | >50,000 |
| Test coverage | 80% | >90% |
| Documentation coverage | 60% | 100% |
| Lighthouse perf score | N/A | >90 |

---

*Document généré le 3 janvier 2026*
