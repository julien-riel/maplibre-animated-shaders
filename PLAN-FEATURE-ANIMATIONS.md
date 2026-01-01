# Plan: Animations par Feature et Interactivité

Ce document décrit le plan d'implémentation pour trois nouvelles fonctionnalités demandées par les utilisateurs.

## Résumé des Fonctionnalités

| # | Fonctionnalité | Complexité | Dépendances | Statut |
|---|----------------|------------|-------------|--------|
| 1 | Configuration par propriétés de feature | **Moyenne** ✨ | Aucune | ✅ Complété |
| 2 | Offset/randomisation des animations | Moyenne | Bénéficie de #1 | ✅ Complété |
| 3 | Contrôle interactif (clic/hover) | Haute | Bénéficie de #1 et #2 | 🔜 À venir |

> ✨ Complexité réduite grâce à la réutilisation de `@maplibre/maplibre-gl-style-spec`

---

## 1. Configuration d'Animation par Propriétés de Feature

### Objectif
Permettre aux utilisateurs de configurer les paramètres d'animation (couleur, vitesse, intensité, etc.) à partir des propriétés GeoJSON de chaque feature.

### État Actuel
- La configuration est **globale par couche** (`ShaderConfig`)
- Tous les features d'une même couche partagent les mêmes paramètres
- Les propriétés GeoJSON sont ignorées pour la configuration des shaders

### Solution Proposée

#### A. Réutilisation de `@maplibre/maplibre-gl-style-spec`

**Plutôt que de réinventer un parser d'expressions**, on réutilise directement le package officiel MapLibre qui expose:

```typescript
import { createExpression, isExpression, StyleExpression } from '@maplibre/maplibre-gl-style-spec';

// createExpression() - Parse une expression MapLibre
const expr = createExpression(['get', 'speed']);
// expr.result === 'success' | 'error'
// expr.value.evaluate(globals, feature) -> valeur évaluée

// isExpression() - Détecte si c'est une expression vs valeur statique
isExpression(5);                    // false
isExpression(['get', 'speed']);     // true
isExpression(['match', ...]);       // true
```

**Support complet des expressions MapLibre:**
- `['get', 'property']` - Lecture de propriété
- `['coalesce', expr, default]` - Fallback si null
- `['match', input, label1, output1, ..., default]` - Mapping conditionnel
- `['interpolate', ['linear'], ['get', 'prop'], stop1, val1, ...]` - Interpolation
- `['case', cond1, val1, cond2, val2, ..., default]` - Conditions
- Toutes les autres expressions MapLibre (math, string, color, etc.)

#### B. API Utilisateur

```typescript
// Exemple d'utilisation - syntaxe identique à MapLibre!
applyShader(map, 'points-layer', 'pulse', {
  // Valeur statique (comportement actuel)
  rings: 3,

  // Valeur depuis propriété du feature
  color: ['get', 'status_color'],

  // Avec fallback
  speed: ['coalesce', ['get', 'animation_speed'], 1.0],

  // Mapping conditionnel
  intensity: ['match', ['get', 'priority'],
    'high', 1.0,
    'medium', 0.6,
    'low', 0.3,
    0.5  // default
  ],

  // Interpolation numérique
  maxRadius: ['interpolate', ['linear'], ['get', 'magnitude'],
    0, 10,
    5, 50,
    10, 100
  ],
});
```

#### C. Wrapper Simplifié

**1. Nouveau module: `src/expressions/ExpressionEvaluator.ts`**
```typescript
import { createExpression, isExpression, StyleExpression } from '@maplibre/maplibre-gl-style-spec';

/**
 * Wrapper autour du système d'expressions MapLibre
 */
export class ExpressionEvaluator {
  private compiledExpressions: Map<string, StyleExpression> = new Map();

  /**
   * Compile et cache une expression pour une propriété de config
   */
  compile(configKey: string, expression: unknown): void {
    if (!isExpression(expression)) {
      return; // Valeur statique, pas besoin de compiler
    }

    const result = createExpression(expression);
    if (result.result === 'error') {
      throw new Error(`Invalid expression for ${configKey}: ${result.value[0].message}`);
    }

    this.compiledExpressions.set(configKey, result.value);
  }

  /**
   * Évalue toutes les expressions pour un feature donné
   */
  evaluateForFeature(
    config: Record<string, unknown>,
    feature: GeoJSON.Feature,
    zoom: number
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const globals = { zoom };

    for (const [key, value] of Object.entries(config)) {
      const compiled = this.compiledExpressions.get(key);
      if (compiled) {
        result[key] = compiled.evaluate(globals, feature as any);
      } else {
        result[key] = value; // Valeur statique
      }
    }

    return result;
  }

  /**
   * Vérifie si la config contient des expressions data-driven
   */
  hasDataDrivenProperties(config: Record<string, unknown>): boolean {
    return Object.values(config).some(v => isExpression(v));
  }
}
```

**2. Modification des ShaderLayers**

Actuellement:
```typescript
// PointShaderLayer.ts - uniforms globaux
const uniforms = definition.getUniforms(config, time, deltaTime);
gl.uniform1f(loc.u_speed, uniforms.u_speed);
```

Nouveau:
```typescript
// Attributs per-vertex pour valeurs data-driven
attribute float a_speed;      // Vitesse par feature
attribute vec4 a_color;       // Couleur par feature
attribute float a_intensity;  // Intensité par feature

// Fallback uniforms pour valeurs statiques
uniform float u_speed_static;
uniform float u_use_per_feature_speed; // 0.0 ou 1.0
```

**3. Buffer de données per-feature**

```typescript
interface FeatureDataBuffer {
  // Crée/met à jour le buffer avec les valeurs évaluées
  updateFromFeatures(
    features: GeoJSON.Feature[],
    dataDrivenConfigs: Map<string, DataDrivenValue<unknown>>
  ): void;

  // Retourne les données pour le vertex buffer
  getAttributeData(attributeName: string): Float32Array;
}
```

#### D. Étapes d'Implémentation

1. **Ajouter la dépendance** `@maplibre/maplibre-gl-style-spec` (déjà fait!)

2. **Créer `ExpressionEvaluator`** - wrapper simple autour du package MapLibre
   - Compile et cache les expressions au démarrage
   - Évalue pour chaque feature lors du rendu

3. **Créer `FeatureDataBuffer`** pour gérer les attributs per-feature

4. **Modifier les vertex shaders** pour accepter les attributs optionnels

5. **Modifier les fragment shaders** pour utiliser les `varying` correspondants

6. **Mettre à jour les ShaderLayers** pour:
   - Détecter si la config est data-driven via `isExpression()`
   - Évaluer les expressions lors du chargement des features
   - Créer les buffers d'attributs appropriés

#### E. Fichiers à Modifier/Créer

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/expressions/ExpressionEvaluator.ts` | Créer | Wrapper MapLibre expressions |
| `src/expressions/index.ts` | Créer | Exports du module |
| `src/types.ts` | Modifier | Re-export `ExpressionSpecification` |
| `src/layers/PointShaderLayer.ts` | Modifier | Support attributs per-feature |
| `src/layers/LineShaderLayer.ts` | Modifier | Support attributs per-feature |
| `src/layers/PolygonShaderLayer.ts` | Modifier | Support attributs per-feature |

> **Note:** On n'a PAS besoin de créer un parser d'expressions custom - on réutilise directement `@maplibre/maplibre-gl-style-spec` qui gère tout!

---

## 2. Offset et Randomisation des Animations

### Objectif
Permettre de décaler les animations dans le temps pour éviter que tous les features soient synchronisés, créant un effet plus naturel.

### État Actuel
- Toutes les animations utilisent le même `u_time` global
- Pas de variation temporelle entre features
- Effet "robotique" quand plusieurs features sont visibles

### Solution Proposée

#### A. Nouvelle Option de Configuration

```typescript
interface AnimationTimingConfig {
  // Mode de calcul du décalage
  timeOffset?:
    | number                              // Décalage fixe en secondes
    | 'random'                            // Aléatoire [0, period]
    | ['get', string]                     // Depuis propriété
    | ['hash', string]                    // Hash stable d'une propriété
    | { min: number, max: number };       // Range aléatoire

  // Seed pour la reproductibilité (optionnel)
  randomSeed?: number | string;

  // Période de l'animation (pour normaliser l'offset)
  period?: number;
}

// Exemples d'utilisation
applyShader(map, 'layer', 'pulse', {
  // Offset aléatoire entre 0 et 2 secondes
  timeOffset: { min: 0, max: 2 },

  // Offset basé sur l'ID du feature (stable entre rechargements)
  timeOffset: ['hash', 'id'],

  // Offset depuis une propriété
  timeOffset: ['get', 'animation_delay'],
});
```

#### B. Implémentation Technique

**1. Nouvel attribut `a_timeOffset`**
```glsl
// Vertex shader
attribute float a_timeOffset;
varying float v_timeOffset;

void main() {
  v_timeOffset = a_timeOffset;
  // ... reste du vertex shader
}

// Fragment shader
uniform float u_time;
varying float v_timeOffset;

void main() {
  float localTime = u_time + v_timeOffset;
  // Utiliser localTime au lieu de u_time
}
```

**2. Calcul de l'offset**
```typescript
class TimeOffsetCalculator {
  // Génère un offset pour chaque feature
  calculateOffsets(
    features: GeoJSON.Feature[],
    config: AnimationTimingConfig
  ): Float32Array {
    const offsets = new Float32Array(features.length);

    for (let i = 0; i < features.length; i++) {
      offsets[i] = this.calculateSingleOffset(features[i], config, i);
    }

    return offsets;
  }

  private calculateSingleOffset(
    feature: GeoJSON.Feature,
    config: AnimationTimingConfig,
    index: number
  ): number {
    if (typeof config.timeOffset === 'number') {
      return config.timeOffset;
    }

    if (config.timeOffset === 'random') {
      return this.seededRandom(config.randomSeed, index) * (config.period ?? 1);
    }

    if (Array.isArray(config.timeOffset)) {
      if (config.timeOffset[0] === 'get') {
        return feature.properties?.[config.timeOffset[1]] ?? 0;
      }
      if (config.timeOffset[0] === 'hash') {
        const prop = feature.properties?.[config.timeOffset[1]] ?? index;
        return this.stableHash(String(prop)) * (config.period ?? 1);
      }
    }

    if (typeof config.timeOffset === 'object' && 'min' in config.timeOffset) {
      const { min, max } = config.timeOffset;
      return min + this.seededRandom(config.randomSeed, index) * (max - min);
    }

    return 0;
  }

  // Hash stable pour reproductibilité
  private stableHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return (hash >>> 0) / 0xFFFFFFFF; // Normalise [0, 1]
  }

  // Random avec seed
  private seededRandom(seed: number | string | undefined, index: number): number {
    const s = typeof seed === 'string' ? this.stableHash(seed) : (seed ?? 12345);
    return this.stableHash(`${s}-${index}`);
  }
}
```

#### C. Étapes d'Implémentation

1. **Créer `TimeOffsetCalculator`** dans `src/timing/`

2. **Modifier les vertex shaders** pour passer `a_timeOffset` -> `v_timeOffset`

3. **Modifier les fragment shaders** pour utiliser `u_time + v_timeOffset`

4. **Mettre à jour les ShaderLayers** pour:
   - Accepter `timeOffset` dans la config
   - Calculer les offsets lors du chargement des features
   - Créer/mettre à jour le buffer d'attributs

5. **Mettre à jour `ShaderConfig` types**

#### D. Fichiers à Modifier/Créer

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/timing/TimeOffsetCalculator.ts` | Créer | Calcul des offsets |
| `src/timing/index.ts` | Créer | Exports |
| `src/types.ts` | Modifier | Types `AnimationTimingConfig` |
| Tous les vertex shaders | Modifier | Ajouter `a_timeOffset` |
| Tous les fragment shaders | Modifier | Utiliser temps local |
| Tous les ShaderLayers | Modifier | Gérer le buffer d'offset |

---

## 3. Contrôle d'Animation sur Interaction

### Objectif
Permettre aux utilisateurs de contrôler l'animation (play, pause, reset) de features individuels via des interactions (clic, hover).

### État Actuel
- Contrôle uniquement au niveau de la couche entière
- Pas de gestion d'état per-feature
- Pas d'intégration avec les événements MapLibre

### Solution Proposée

#### A. Nouvelle API d'Interactivité

```typescript
// Configuration de l'interactivité
interface InteractivityConfig {
  // Activer le contrôle per-feature
  perFeatureControl?: boolean;

  // État initial des features
  initialState?: 'playing' | 'paused' | 'stopped';

  // Comportement sur clic
  onClick?:
    | 'toggle'           // Bascule play/pause
    | 'play'             // Joue l'animation
    | 'pause'            // Met en pause
    | 'reset'            // Remet à zéro
    | 'playOnce'         // Joue une fois puis pause
    | ((feature: GeoJSON.Feature, state: FeatureAnimationState) => void);

  // Comportement sur hover
  onHover?: {
    enter?: 'play' | 'pause' | 'highlight' | ((feature, state) => void);
    leave?: 'play' | 'pause' | 'reset' | ((feature, state) => void);
  };

  // Identifiant unique du feature (défaut: 'id' ou index)
  featureIdProperty?: string;
}

// État d'animation d'un feature
interface FeatureAnimationState {
  featureId: string | number;
  isPlaying: boolean;
  localTime: number;        // Temps écoulé depuis le dernier reset
  playCount: number;        // Nombre de lectures complètes
}

// Exemple d'utilisation
const controller = applyShader(map, 'alerts', 'pulse', {
  color: '#ff0000',
  perFeatureControl: true,
  initialState: 'paused',
  onClick: 'toggle',
  onHover: {
    enter: 'play',
    leave: 'pause'
  }
});

// API de contrôle programmatique
controller.playFeature(featureId);
controller.pauseFeature(featureId);
controller.resetFeature(featureId);
controller.setFeatureState(featureId, { isPlaying: true, localTime: 0 });
controller.getFeatureState(featureId);
controller.getAllFeatureStates();

// Contrôle groupé
controller.playAll();
controller.pauseAll();
controller.resetAll();
```

#### B. Architecture

**1. Gestionnaire d'état per-feature**
```typescript
class FeatureAnimationStateManager {
  private states: Map<string | number, FeatureAnimationState>;
  private config: InteractivityConfig;

  // Initialise l'état pour tous les features
  initializeFeatures(features: GeoJSON.Feature[]): void;

  // Met à jour l'état d'un feature
  updateState(featureId: string | number, updates: Partial<FeatureAnimationState>): void;

  // Avance le temps pour tous les features qui jouent
  tick(deltaTime: number): void;

  // Actions de contrôle
  play(featureId: string | number): void;
  pause(featureId: string | number): void;
  reset(featureId: string | number): void;
  toggle(featureId: string | number): void;

  // Génère les données pour le buffer shader
  getShaderData(): {
    isPlaying: Float32Array;   // 0.0 ou 1.0
    localTime: Float32Array;   // Temps local par feature
  };
}
```

**2. Gestionnaire d'événements**
```typescript
class InteractionHandler {
  private map: maplibregl.Map;
  private layerId: string;
  private stateManager: FeatureAnimationStateManager;
  private config: InteractivityConfig;

  // Attache les listeners
  attach(): void {
    this.map.on('click', this.layerId, this.handleClick);
    this.map.on('mouseenter', this.layerId, this.handleMouseEnter);
    this.map.on('mouseleave', this.layerId, this.handleMouseLeave);
  }

  // Détache les listeners
  detach(): void;

  private handleClick = (e: maplibregl.MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;

    const featureId = this.getFeatureId(feature);

    if (typeof this.config.onClick === 'function') {
      this.config.onClick(feature, this.stateManager.getState(featureId));
    } else {
      this.executeAction(featureId, this.config.onClick);
    }
  };

  private executeAction(featureId: string | number, action: string): void {
    switch (action) {
      case 'toggle': this.stateManager.toggle(featureId); break;
      case 'play': this.stateManager.play(featureId); break;
      case 'pause': this.stateManager.pause(featureId); break;
      case 'reset': this.stateManager.reset(featureId); break;
      case 'playOnce': this.stateManager.playOnce(featureId); break;
    }
  }
}
```

**3. Nouveaux attributs shader**
```glsl
// Vertex shader
attribute float a_isPlaying;    // 0.0 = paused, 1.0 = playing
attribute float a_localTime;    // Temps local du feature
attribute float a_timeOffset;   // De la fonctionnalité #2

varying float v_isPlaying;
varying float v_effectiveTime;

void main() {
  v_isPlaying = a_isPlaying;

  // Le temps effectif combine: temps global + offset + temps local si en pause
  // Quand isPlaying = 1.0: utilise temps global + offset
  // Quand isPlaying = 0.0: utilise temps local gelé
  v_effectiveTime = mix(a_localTime, u_time + a_timeOffset, a_isPlaying);

  // ... reste du shader
}

// Fragment shader
varying float v_isPlaying;
varying float v_effectiveTime;

void main() {
  // Optionnel: effet visuel différent quand en pause
  float alpha = mix(0.5, 1.0, v_isPlaying); // Plus transparent si en pause

  // Utiliser v_effectiveTime pour l'animation
  float animPhase = fract(v_effectiveTime * u_speed);

  // ... reste du shader
}
```

**4. Mise à jour du buffer en temps réel**
```typescript
// Dans ShaderLayer.render()
if (this.hasPerFeatureControl) {
  // Avance le temps pour les features qui jouent
  this.stateManager.tick(deltaTime);

  // Met à jour le buffer GPU
  const { isPlaying, localTime } = this.stateManager.getShaderData();
  this.updateAttributeBuffer('a_isPlaying', isPlaying);
  this.updateAttributeBuffer('a_localTime', localTime);
}
```

#### C. Intégration avec MapLibre Feature State

Pour une meilleure intégration avec l'écosystème MapLibre:

```typescript
// Synchronisation bidirectionnelle avec feature-state
class MapLibreStateSync {
  syncToMapLibre(featureId: string | number, state: FeatureAnimationState): void {
    this.map.setFeatureState(
      { source: this.sourceId, id: featureId },
      {
        animationPlaying: state.isPlaying,
        animationTime: state.localTime
      }
    );
  }

  syncFromMapLibre(featureId: string | number): FeatureAnimationState {
    const state = this.map.getFeatureState({ source: this.sourceId, id: featureId });
    return {
      featureId,
      isPlaying: state?.animationPlaying ?? true,
      localTime: state?.animationTime ?? 0,
      playCount: 0
    };
  }
}
```

#### D. Étapes d'Implémentation

1. **Créer `FeatureAnimationStateManager`** dans `src/interaction/`

2. **Créer `InteractionHandler`** pour gérer les événements

3. **Créer `MapLibreStateSync`** (optionnel) pour l'intégration feature-state

4. **Modifier les vertex shaders** pour accepter `a_isPlaying`, `a_localTime`

5. **Modifier les fragment shaders** pour utiliser le temps effectif

6. **Modifier `ShaderController`** pour exposer l'API per-feature

7. **Mettre à jour les ShaderLayers** pour:
   - Gérer le state manager
   - Mettre à jour les buffers chaque frame
   - Attacher/détacher les event handlers

8. **Créer des composants demo** pour montrer l'utilisation

#### E. Fichiers à Modifier/Créer

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/interaction/FeatureAnimationStateManager.ts` | Créer | Gestion d'état per-feature |
| `src/interaction/InteractionHandler.ts` | Créer | Événements click/hover |
| `src/interaction/MapLibreStateSync.ts` | Créer | Sync avec feature-state |
| `src/interaction/index.ts` | Créer | Exports |
| `src/types.ts` | Modifier | Nouveaux types |
| `src/ShaderController.ts` | Modifier | API per-feature |
| Tous les shaders | Modifier | Nouveaux attributs |
| Tous les ShaderLayers | Modifier | Intégration complète |
| `demo/src/components/InteractiveDemo.tsx` | Créer | Démo interactive |

---

## Ordre d'Implémentation Recommandé

### Phase 1: Fondations (Fonctionnalité #2 - Offset) ✅ COMPLÉTÉ
**Pourquoi commencer par là:**
- Plus simple à implémenter
- Introduit le concept d'attribut per-feature (`a_timeOffset`)
- Pose les bases pour les autres fonctionnalités
- Valeur immédiate pour les utilisateurs

**Livrables:**
- [x] `TimeOffsetCalculator` avec modes: fixe, random, hash, range
- [x] Attribut `a_timeOffset` dans tous les shaders
- [ ] Tests unitaires
- [x] Documentation
- [ ] Démo mise à jour

### Phase 2: Expressions Data-Driven (Fonctionnalité #1) ✅ COMPLÉTÉ
**Pourquoi ensuite:**
- Réutilise l'infrastructure d'attributs de la Phase 1
- Généralise le concept à tous les paramètres
- **Simplifié** grâce à la réutilisation de `@maplibre/maplibre-gl-style-spec`

**Livrables:**
- [x] `ExpressionEvaluator` wrapper autour de MapLibre (simple!)
- [x] `FeatureDataBuffer` pour attributs dynamiques
- [x] Modification du système de config
- [x] Support dans tous les shaders existants (Point, Line, Polygon)
- [ ] Tests unitaires
- [x] Documentation
- [ ] Démo mise à jour

> **Avantage:** En réutilisant le package MapLibre, on supporte automatiquement TOUTES les expressions MapLibre (match, interpolate, case, math, string, color, etc.) sans avoir à les implémenter nous-mêmes!

### Phase 3: Interactivité (Fonctionnalité #3)
**Pourquoi en dernier:**
- Dépend des deux phases précédentes
- Plus complexe (gestion d'état, événements)
- Peut utiliser les expressions pour la config d'interaction

**Livrables:**
- [ ] `FeatureAnimationStateManager`
- [ ] `InteractionHandler`
- [ ] `MapLibreStateSync` (optionnel)
- [ ] API `ShaderController` étendue
- [ ] Tests unitaires
- [ ] Documentation
- [ ] Démo interactive complète

---

## Considérations Techniques

### Performance

1. **Buffers GPU**
   - Utiliser `DYNAMIC_DRAW` pour les attributs qui changent fréquemment
   - Grouper les mises à jour de buffer (pas à chaque frame si pas nécessaire)
   - Considérer les Uniform Buffer Objects pour les configs statiques

2. **Évaluation des Expressions**
   - Compiler les expressions en fonctions JavaScript au premier appel
   - Cache des résultats pour les features statiques
   - Évaluation paresseuse (lazy) si possible

3. **Gestion d'État**
   - Structure de données plate (pas d'objets imbriqués)
   - TypedArrays pour les données shader
   - Dirty flags pour éviter les mises à jour inutiles

### Rétrocompatibilité

- Toutes les nouvelles fonctionnalités sont **opt-in**
- Les configs existantes continuent de fonctionner
- Les valeurs statiques restent le comportement par défaut
- Pas de breaking changes dans l'API publique

### Tests

Pour chaque phase:
- Tests unitaires des nouveaux modules
- Tests d'intégration avec MapLibre
- Tests de performance (1000+ features)
- Tests visuels (snapshots de rendu)

---

## Timeline Estimée

| Phase | Effort | Dépendances | Statut |
|-------|--------|-------------|--------|
| Phase 1 (Offset) | Modéré | Aucune | ✅ Complété |
| Phase 2 (Data-Driven) | Élevé | Phase 1 (bénéficie de) | ✅ Complété |
| Phase 3 (Interactivité) | Élevé | Phase 1 + 2 (bénéficie de) | 🔜 À venir |

---

## Questions Ouvertes

1. ~~**Expressions**: Faut-il supporter la syntaxe MapLibre complète ou une version simplifiée?~~ ✅ Résolu: On réutilise `@maplibre/maplibre-gl-style-spec` pour un support complet!
2. **Feature ID**: Comment gérer les features sans ID explicite?
3. **Performance**: Quelle est la limite de features supportés avec per-feature control?
4. **Mobile**: Le hover doit-il être remplacé par long-press sur mobile?
5. **Curseur**: Faut-il changer le curseur sur hover des features interactifs?

---

## Références

- [MapLibre Expressions](https://maplibre.org/maplibre-style-spec/expressions/)
- [MapLibre Feature State](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#setfeaturestate)
- [WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
