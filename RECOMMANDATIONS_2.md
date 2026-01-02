# Rapport d'Audit Architectural - maplibre-animated-shaders

**Date**: 2 janvier 2026
**Version analysée**: 1.0.0
**Auteur**: Audit par développeur senior / architecte solutions

---

## Sommaire Exécutif

Ce rapport présente une analyse approfondie du projet `maplibre-animated-shaders`, une bibliothèque TypeScript offrant 26 shaders GLSL animés pour MapLibre GL JS.

**Verdict global**: Le projet démontre une **architecture solide et une qualité professionnelle**, avec quelques axes d'amélioration identifiés pour atteindre un niveau de maturité production-ready.

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| Architecture | 8/10 | Bien structurée, séparation des responsabilités claire |
| Qualité du code | 7.5/10 | TypeScript strict, mais quelques dettes techniques |
| Tests | 6.5/10 | Couverture correcte, mais 2 tests échouent actuellement |
| Documentation | 9/10 | Excellente, multilingue, complète |
| Performance | 8/10 | Bonne optimisation WebGL, pistes d'amélioration identifiées |
| Maintenabilité | 7/10 | Duplication à éliminer, patterns à harmoniser |
| Sécurité | 8/10 | Pas de vulnérabilités majeures, gestion erreurs WebGL robuste |

---

## 1. FORCES DU PROJET

### 1.1 Architecture Exemplaire

#### Séparation des responsabilités bien définie

```
ShaderManager (orchestration)
    ├── AnimationLoop (temps global)
    ├── ShaderRegistry (catalogue)
    ├── ConfigResolver (validation)
    └── *ShaderLayer (rendu WebGL)
            ├── TimeOffsetCalculator (timing)
            ├── ExpressionEvaluator (data-driven)
            └── FeatureAnimationStateManager (interaction)
```

**Points forts**:
- **Single Responsibility Principle**: Chaque classe a une responsabilité unique et claire
- **Interface-driven**: Utilisation d'interfaces TypeScript (`IShaderManager`, `IAnimationLoop`) pour le découplage
- **Injection de dépendances implicite**: Le `ShaderManager` coordonne sans créer de couplages forts

#### Pattern Custom Layer MapLibre

L'implémentation des `CustomLayerInterface` de MapLibre est particulièrement bien réalisée:

```typescript
// Exemple de PointShaderLayer.ts:411-584
render(gl: WebGLRenderingContext, matrix: mat4): void {
  // Gestion complète du cycle de rendu WebGL
  // - Validation de l'état
  // - Update du temps
  // - Setup des uniforms
  // - Binding des buffers
  // - Draw calls
  // - Restauration de l'état GL
}
```

### 1.2 TypeScript de Qualité Production

#### Typage strict activé

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

#### Types exhaustifs (524 lignes de définitions)

```typescript
// src/types/index.ts - Exemples de types bien définis
type GeometryType = 'point' | 'line' | 'polygon' | 'global';

interface ShaderDefinition<T extends ShaderConfig = ShaderConfig> {
  name: string;
  displayName: string;
  geometry: GeometryType;
  fragmentShader: string;
  defaultConfig: T;
  configSchema: ConfigSchema;
  getUniforms: (config: T, time: number, deltaTime: number) => Uniforms;
}

type TimeOffsetValue =
  | number
  | 'random'
  | ['get', string]
  | ['hash', string]
  | { min: number; max: number };
```

### 1.3 Documentation Professionnelle

| Document | Qualité | Points forts |
|----------|---------|--------------|
| README.md | Excellent | Quick start, API complète, exemples React |
| ARCHITECTURE.md | Très bon | Diagrammes, flux de données, interfaces |
| CONTRIBUTING.md | Bon | Guide pour nouveaux contributeurs |
| CHANGELOG.md | Bon | Historique versioning sémantique |
| Code comments | Bon | JSDoc sur les fonctions publiques |

### 1.4 Build System Moderne

#### Double output ESM + CJS

```json
{
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

#### Tree-shaking optimal

```json
{
  "sideEffects": false
}
```

### 1.5 Gestion d'Erreurs WebGL Robuste

Le module `webgl-error-handler.ts` implémente des patterns professionnels:

```typescript
// Compilation avec messages d'erreur détaillés
compileShaderWithErrorHandling(gl, type, source, layerId)

// Détection de contexte perdu
isContextLost(gl)

// Cleanup sécurisé des ressources
safeCleanup(gl, { program, buffers })
```

### 1.6 Features Avancées

#### Support des expressions MapLibre (Data-driven)

```typescript
// Couleur dynamique basée sur les propriétés
shaderManager.register('layer', 'pulse', {
  color: ['match', ['get', 'status'],
    'active', '#00ff00',
    'warning', '#ffaa00',
    '#ff0000'
  ]
});
```

#### Animation interactive par feature

```typescript
const controller = applyShader(map, 'layer', 'pulse', {
  perFeatureControl: true,
  onClick: 'toggle'
});

controller.playFeature('feature-123');
controller.pauseFeature('feature-456');
```

### 1.7 Zero Runtime Dependencies

```json
{
  "dependencies": {
    "@maplibre/maplibre-gl-style-spec": "^24.4.1"  // Uniquement pour les expressions
  },
  "peerDependencies": {
    "maplibre-gl": ">=3.0.0"
  }
}
```

---

## 2. FAIBLESSES ET DETTES TECHNIQUES

### 2.1 Tests en Échec (Critique)

**État actuel**: 2 tests échouent sur 161

```
❯ tests/layers.test.ts > PointShaderLayer > onAdd > should create vertex and index buffers
  → expected "spy" to be called 2 times, but got 3 times

❯ tests/layers.test.ts > PointShaderLayer > onRemove > should clean up WebGL resources
  → expected "spy" to be called 2 times, but got 3 times
```

**Impact**:
- CI/CD potentiellement bloqué
- Perte de confiance dans la suite de tests
- Possible régression non détectée

**Recommandation**: Corriger immédiatement ces tests avant toute release.

### 2.2 Duplication de Code dans ShaderManager

**Localisation**: `src/ShaderManager.ts:120-347`

Les méthodes `registerPointShader`, `registerLineShader`, `registerPolygonShader`, `registerGlobalShader` partagent ~80% de code identique.

```typescript
// Exemple de duplication (simplifié)
private registerPointShader(layerId, definition, config) {
  const existingLayer = this.map.getLayer(layerId);  // Dupliqué 4x
  if (!existingLayer) throw new Error(...);          // Dupliqué 4x
  const sourceId = existingLayer.source;             // Dupliqué 4x
  if (!sourceId) throw new Error(...);               // Dupliqué 4x
  // ... 20 lignes quasi-identiques
}

private registerLineShader(layerId, definition, config) {
  const existingLayer = this.map.getLayer(layerId);  // Même code
  // ...
}
```

**Impact**:
- ~200 lignes de code dupliqué
- Risque de bugs asymétriques (fix appliqué à une méthode mais pas aux autres)
- Maintenance coûteuse

**Solution**: Voir RECOMMENDATIONS.md #1 pour la refactorisation proposée.

### 2.3 Magic Number et setTimeout

**Localisation**: `src/layers/PointShaderLayer.ts:350-354`

```typescript
// Initial data load (after a small delay to let source load)
setTimeout(() => {
  this.safeUpdatePointData(gl);
  map.triggerRepaint();
}, 100);  // Magic number arbitraire
```

**Problèmes**:
- 100ms peut être insuffisant sur connexions lentes
- 100ms est excessif si les données sont déjà chargées
- Pas de gestion de race conditions

### 2.4 Castings TypeScript Forcés

**Localisation**: `src/layers/PointShaderLayer.ts:475-478`

```typescript
const size = (this.config as Record<string, unknown>).maxRadius ??
             (this.config as Record<string, unknown>).radius ??
             (this.config as Record<string, unknown>).size ??
             (this.config as Record<string, unknown>).baseSize ?? 50;
```

**Impact**:
- Perte de type safety
- L'IDE ne peut pas aider avec l'autocomplétion
- Refactoring risqué

### 2.5 Métadonnées Package Incomplètes

```json
{
  "author": "",  // Vide
  "repository": {
    "url": "https://github.com/julien-riel/maplibre-animated-shaders"
    // Manque: "type": "git"
  }
  // Manque: "bugs", "homepage", "funding"
}
```

### 2.6 Fonction Deprecated Non Supprimée

```typescript
// src/ShaderManager.ts:785-789
/**
 * @deprecated Use the controller returned by applyShader instead
 */
export function removeShader(_map: MapLibreMapInstance, _layerId: string): void {
  console.warn('[removeShader] This function is deprecated...');
}
```

**Impact**:
- Pollue l'API publique
- Augmente le bundle size
- Confusion pour les utilisateurs

### 2.7 Absence de Tests E2E/Visuels

Les tests actuels mockent WebGL entièrement:

```typescript
// tests/setup.ts - Mock complet de WebGL
const mockGL = {
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  // ... tous mockés
};
```

**Impact**:
- Pas de validation du rendu visuel réel
- Régressions visuelles non détectées
- Comportement réel non testé

### 2.8 Warnings de Validation WebGL dans les Tests

```
[WebGL] Program validation warning for layer "test-point-layer": Validation failed
```

Ces warnings (22 occurrences dans les tests) indiquent un problème avec les mocks ou la validation.

---

## 3. RECOMMANDATIONS PRIORISÉES

### Priorité 1: Corrections Immédiates (avant release)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1.1 | Corriger les 2 tests en échec | 2h | Critique |
| 1.2 | Compléter les métadonnées package.json | 30min | Publication npm |
| 1.3 | Supprimer ou implémenter `removeShader` | 1h | API propre |

### Priorité 2: Court Terme (sprint suivant)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 2.1 | Remplacer setTimeout par événements MapLibre | 4h | Fiabilité |
| 2.2 | Ajouter détection des capacités WebGL | 4h | Compatibilité |
| 2.3 | Corriger les warnings de validation WebGL | 2h | Qualité tests |

### Priorité 3: Moyen Terme (prochain cycle)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 3.1 | Refactoriser duplication ShaderManager | 8h | Maintenabilité |
| 3.2 | Améliorer le typage des configurations | 8h | Type safety |
| 3.3 | Extraire automatiquement les uniforms GLSL | 6h | DX |
| 3.4 | Implémenter throttling des updates | 4h | Performance |

### Priorité 4: Long Terme (roadmap)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 4.1 | Ajouter tests E2E avec Playwright | 16h | Qualité |
| 4.2 | Implémenter object pooling | 12h | Performance |
| 4.3 | Créer un système de plugins pour shaders custom | 20h | Extensibilité |

---

## 4. ANALYSE DE SÉCURITÉ

### 4.1 Points Positifs

- **Pas de eval()** ou de code dynamique dangereux
- **Validation des configurations** via ConfigResolver
- **Gestion des erreurs WebGL** pour éviter les crashs silencieux
- **Pas d'accès réseau** direct (utilise les sources MapLibre)

### 4.2 Points d'Attention

#### Injection GLSL (risque faible)

Les shaders GLSL sont intégrés au build, pas injectés dynamiquement:

```typescript
// Le fragmentShader vient de la définition statique
this.definition.fragmentShader  // Pas d'interpolation de strings utilisateur
```

**Verdict**: Pas de vulnérabilité d'injection.

#### Expressions MapLibre

Les expressions data-driven sont parsées par MapLibre:

```typescript
this.expressionEvaluator.compile('color', colorValue, 'color');
```

**Verdict**: Délègue la sécurité à MapLibre (qui est audité).

---

## 5. ANALYSE DE PERFORMANCE

### 5.1 Bonnes Pratiques Observées

| Pratique | Implémentation | Fichier |
|----------|----------------|---------|
| Animation loop unique | `AnimationLoop.ts` gère tous les shaders | AnimationLoop.ts |
| Dirty flag pour updates | `stateManager.isDirty()` | FeatureAnimationStateManager.ts |
| Buffer WebGL réutilisés | Buffers créés une fois, updatés ensuite | *ShaderLayer.ts |
| FPS throttling | Configurable via `targetFPS` | AnimationLoop.ts |

### 5.2 Axes d'Amélioration Performance

#### 5.2.1 Object Pooling Absent

```typescript
// Allocation actuelle (crée des objets à chaque update)
this.points = [];
for (let i = 0; i < features.length; i++) {
  this.points.push({
    mercatorX: mercator[0],
    mercatorY: mercator[1],
    index: i,
  });
}
```

**Impact**: GC pressure sur gros datasets (10k+ points).

#### 5.2.2 Pas de Throttling sur sourcedata

Chaque événement `sourcedata` déclenche une reconstruction complète des buffers.

```typescript
map.on('sourcedata', (e) => {
  if (e.sourceId === this.sourceId && e.isSourceLoaded) {
    this.safeUpdatePointData(gl);  // Peut être appelé N fois/seconde
  }
});
```

**Recommandation**: Throttle à 10 updates/seconde maximum.

### 5.3 Benchmarks Recommandés

Pour valider les performances, implémenter:

```typescript
// Métriques à capturer
interface PerformanceMetrics {
  fps: number;
  drawCalls: number;
  vertexCount: number;
  bufferUpdateTimeMs: number;
  memoryUsageMB: number;
}

// Scénarios de test
const scenarios = [
  { points: 100, name: 'small' },
  { points: 1000, name: 'medium' },
  { points: 10000, name: 'large' },
  { points: 100000, name: 'stress' }
];
```

---

## 6. RECOMMANDATIONS ARCHITECTURALES

### 6.1 Proposition: Plugin System pour Shaders Custom

Pour améliorer l'extensibilité sans modifier le core:

```typescript
// API proposée
interface ShaderPlugin {
  name: string;
  version: string;
  shaders: ShaderDefinition[];

  // Hooks optionnels
  onRegister?: (manager: ShaderManager) => void;
  onUnregister?: (manager: ShaderManager) => void;
}

// Utilisation
import { weatherPack } from 'maplibre-shaders-weather';

shaderManager.use(weatherPack);
shaderManager.register('layer', 'weather:storm', config);
```

### 6.2 Proposition: Mode Debug Visuel

Ajouter un mode debug pour le développement:

```typescript
const manager = createShaderManager(map, {
  debug: true,
  debugOverlay: true  // Affiche FPS, draw calls, mémoire
});
```

### 6.3 Proposition: Presets par Cas d'Usage

```typescript
import { presets } from 'maplibre-animated-shaders';

// Au lieu de configurer manuellement
shaderManager.register('layer', 'pulse', presets.emergency.pulse);
shaderManager.register('layer', 'flow', presets.traffic.flow);
shaderManager.register('layer', 'weather', presets.rain.weather);
```

---

## 7. COMPARAISON AVEC L'ÉCOSYSTÈME

### 7.1 Alternatives Analysées

| Solution | Points forts | Points faibles vs. ce projet |
|----------|--------------|------------------------------|
| deck.gl | Très performant, large écosystème | Plus lourd, learning curve |
| mapbox-gl-draw | Officiel Mapbox | Pas d'animations, Mapbox-only |
| threebox | 3D complet | Overhead important, complexité |
| **Ce projet** | Léger, API simple, 26 shaders | Moins flexible que deck.gl |

### 7.2 Positionnement Unique

Ce projet comble un gap spécifique:
- **Plus simple** que deck.gl pour des effets visuels basiques
- **Plus riche** que les paint properties natives MapLibre
- **Zero-config** pour démarrer rapidement

---

## 8. CONCLUSION

### Forces Majeures
1. Architecture propre et bien documentée
2. TypeScript strict avec types exhaustifs
3. 26 shaders prêts à l'emploi
4. API intuitive avec plusieurs niveaux (simple → avancé)
5. Gestion WebGL professionnelle

### Faiblesses à Corriger
1. Tests en échec (bloquant pour release)
2. Duplication de code significative
3. Absence de tests visuels E2E
4. Quelques patterns anti-DRY

### Verdict Final

**Le projet est dans un état de maturité pré-production.**

Avec la correction des tests en échec et quelques améliorations de qualité (métadonnées, fonction deprecated), il peut être publié sur npm.

Les recommandations de moyen/long terme amélioreront la maintenabilité et les performances pour des usages intensifs.

---

## Annexe A: Commandes Utiles

```bash
# Exécuter les tests avec couverture
npm run test:coverage

# Vérifier le typage
npm run typecheck

# Valider les shaders GLSL
npm run validate:glsl

# Build production
npm run build:lib

# Démo locale
npm run dev:demo
```

## Annexe B: Métriques du Projet

| Métrique | Valeur |
|----------|--------|
| Lignes de TypeScript | ~14,500 |
| Fichiers source | 62 |
| Shaders disponibles | 26 |
| Tests | 161 (159 passing) |
| Couverture cible | 80% |
| Dépendances runtime | 1 |
| Taille bundle (min) | ~45KB |

## Annexe C: Références

- [RECOMMENDATIONS.md](./RECOMMENDATIONS.md) - Recommandations techniques détaillées (existant)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Documentation d'architecture
- [MapLibre Custom Layers](https://maplibre.org/maplibre-gl-js-docs/api/custom-layer/)
- [WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
