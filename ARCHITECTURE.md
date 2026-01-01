# MapLibre Animated Shaders Library — Architecture

## Vue d'ensemble

**maplibre-animated-shaders** est une bibliothèque modulaire de shaders GLSL animés pour MapLibre GL JS. Elle permet d'ajouter des effets visuels dynamiques aux couches de carte avec une API déclarative et configurable.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application utilisateur                     │
├─────────────────────────────────────────────────────────────────┤
│                     maplibre-animated-shaders                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐    │
│  │ ShaderManager │  │ AnimationLoop │  │ ConfigResolver    │    │
│  └───────┬───────┘  └───────┬───────┘  └─────────┬─────────┘    │
│          │                  │                    │               │
│  ┌───────▼──────────────────▼────────────────────▼───────┐      │
│  │                    ShaderRegistry                      │      │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │      │
│  │  │ Points  │ │ Lines   │ │Polygons │ │ Global  │      │      │
│  │  │ Shaders │ │ Shaders │ │ Shaders │ │ Effects │      │      │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │      │
│  └───────────────────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────────────────┤
│                       MapLibre GL JS                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modules principaux

### 1. ShaderManager

Point d'entrée principal. Gère le cycle de vie des shaders sur une instance MapLibre.

```typescript
interface ShaderManager {
  // Enregistrement
  register(layerId: string, shaderName: string, config?: ShaderConfig): void;
  unregister(layerId: string): void;
  
  // Contrôle
  play(layerId?: string): void;
  pause(layerId?: string): void;
  setSpeed(layerId: string, speed: number): void;
  
  // Configuration runtime
  updateConfig(layerId: string, config: Partial<ShaderConfig>): void;
  
  // Lifecycle
  destroy(): void;
}
```

### 2. AnimationLoop

Gère la boucle d'animation globale avec `requestAnimationFrame`. Injecte le temps uniforme dans tous les shaders actifs.

```typescript
interface AnimationLoop {
  start(): void;
  stop(): void;
  addShader(id: string, updateFn: (time: number) => void): void;
  removeShader(id: string): void;
  setGlobalSpeed(speed: number): void;
}
```

### 3. ShaderRegistry

Catalogue de tous les shaders disponibles, organisés par géométrie.

```typescript
interface ShaderRegistry {
  register(name: string, definition: ShaderDefinition): void;
  get(name: string): ShaderDefinition | undefined;
  list(geometry?: GeometryType): string[];
}

type GeometryType = 'point' | 'line' | 'polygon' | 'global';
```

### 4. ConfigResolver

Fusionne la configuration utilisateur avec les valeurs par défaut du shader.

```typescript
interface ConfigResolver {
  resolve<T extends ShaderConfig>(
    defaults: T,
    userConfig?: Partial<T>
  ): T;

  validate(config: ShaderConfig, schema: ConfigSchema): ValidationResult;
}
```

### 5. ExpressionEvaluator (Data-Driven)

Wrapper autour du système d'expressions MapLibre pour les propriétés data-driven.

```typescript
interface ExpressionEvaluator {
  // Compile une expression MapLibre
  compile(key: string, expression: unknown, expectedType: string): CompiledExpression | null;

  // Compile toutes les expressions d'une config
  compileConfig(config: Record<string, unknown>, schema?: Record<string, { type: string }>): void;

  // Évalue une expression pour un feature
  evaluateExpression(key: string, feature: GeoJSON.Feature, zoom: number): unknown;

  // Évalue toutes les expressions pour un feature
  evaluateForFeature(config: Record<string, unknown>, feature: GeoJSON.Feature, zoom: number): EvaluatedConfig;

  // Vérifie si une config contient des expressions
  hasExpression(key: string): boolean;
  hasDataDrivenExpressions(): boolean;
}
```

### 6. TimeOffsetCalculator (Animation Timing)

Calcule les décalages temporels per-feature pour les animations.

```typescript
interface TimeOffsetCalculator {
  // Calcule les offsets pour tous les features
  calculateOffsets(features: GeoJSON.Feature[], config: AnimationTimingConfig): Float32Array;
}

// Modes de calcul supportés
type TimeOffsetValue =
  | number                        // Décalage fixe
  | 'random'                      // Aléatoire [0, period]
  | ['get', string]               // Depuis propriété
  | ['hash', string]              // Hash stable d'une propriété
  | { min: number; max: number }; // Range aléatoire
```

### 7. FeatureAnimationStateManager (Interactive Control)

Gère l'état d'animation per-feature pour le contrôle interactif (play/pause/toggle/reset).

```typescript
interface FeatureAnimationStateManager {
  // Initialise l'état pour tous les features
  initializeFromFeatures(features: GeoJSON.Feature[]): void;

  // Contrôle d'un feature individuel
  playFeature(featureId: string | number): void;
  pauseFeature(featureId: string | number): void;
  toggleFeature(featureId: string | number): void;
  resetFeature(featureId: string | number): void;

  // Contrôle global
  playAll(): void;
  pauseAll(): void;
  resetAll(): void;

  // État
  getState(featureId: string | number): FeatureAnimationState | undefined;

  // Mise à jour par frame
  tick(globalTime: number, deltaTime: number): void;

  // Génération des données GPU
  generateBufferData(verticesPerFeature: number): {
    isPlayingData: Float32Array;  // 0.0 ou 1.0 par vertex
    localTimeData: Float32Array;  // Temps gelé quand en pause
  };

  // Dirty tracking pour optimisation
  isDirty(): boolean;
  clearDirty(): void;
}

interface FeatureAnimationState {
  featureId: string | number;
  isPlaying: boolean;       // true = animation active
  localTime: number;        // Temps local (gelé quand en pause)
  playCount: number;        // Nombre de lectures complètes
}
```

### 8. FeatureInteractionHandler (Event Handling)

Gère les événements MapLibre (click/hover) et les dispatch au state manager.

```typescript
interface FeatureInteractionHandler {
  constructor(
    map: MapLibreMap,
    layerId: string,  // Layer ID pour les événements
    stateManager: FeatureAnimationStateManager,
    config: InteractivityConfig
  );

  // Nettoie les event listeners
  dispose(): void;
}

interface InteractivityConfig {
  perFeatureControl?: boolean;
  initialState?: 'playing' | 'paused';
  onClick?: InteractionAction | InteractionHandler;
  onHover?: {
    enter?: InteractionAction | InteractionHandler;
    leave?: InteractionAction | InteractionHandler;
  };
  featureIdProperty?: string;
}

type InteractionAction = 'toggle' | 'play' | 'pause' | 'reset' | 'playOnce';
type InteractionHandler = (feature: GeoJSON.Feature, state: FeatureAnimationState) => void;
```

---

## Architecture Data-Driven

Le système data-driven permet de configurer les paramètres de shader (couleur, intensité, etc.) à partir des propriétés GeoJSON de chaque feature.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Configuration Shader                        │
│  {                                                               │
│    color: ['match', ['get', 'status'], 'high', '#f00', '#00f'], │
│    intensity: ['get', 'priority'],                              │
│    speed: 1.5  // valeur statique                               │
│  }                                                               │
├─────────────────────────────────────────────────────────────────┤
│                    ExpressionEvaluator                           │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ Compile via     │───▶│ CompiledExpr    │                     │
│  │ @maplibre/...   │    │ (cached)        │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                  │                               │
│                          evaluate(feature, zoom)                 │
│                                  ▼                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ { color: [1,0,0,1], intensity: 0.8, speed: 1.5 }        │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                      ShaderLayer (GPU)                           │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ Main Buffer     │    │ DataDriven      │                     │
│  │ (pos, uv, ...)  │    │ Buffer          │                     │
│  │                 │    │ (color, intens) │                     │
│  └─────────────────┘    └─────────────────┘                     │
│           │                      │                               │
│           ▼                      ▼                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Vertex Shader                         │    │
│  │  attribute vec4 a_color;     // per-vertex              │    │
│  │  attribute float a_intensity; // per-vertex             │    │
│  │  varying vec4 v_color;                                  │    │
│  │  varying float v_intensity;                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Fragment Shader                        │    │
│  │  // Utilise v_color et v_intensity si data-driven       │    │
│  │  vec4 finalColor = mix(u_color, v_color, u_useDD);      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Flux de données

1. **Configuration** — L'utilisateur fournit une config avec expressions ou valeurs statiques
2. **Compilation** — `ExpressionEvaluator` compile les expressions via `@maplibre/maplibre-gl-style-spec`
3. **Évaluation** — Pour chaque feature, les expressions sont évaluées
4. **Buffer GPU** — Les valeurs sont écrites dans un buffer séparé (dataDrivenBuffer)
5. **Rendu** — Le vertex shader lit les attributs per-vertex et les passe au fragment shader

### Propriétés supportées

| Propriété | Type | Description |
|-----------|------|-------------|
| `color` | `color` | Couleur RGBA per-feature |
| `intensity` | `number` | Intensité de l'effet (0-1) |

---

## Architecture Interactive Animation Control

Le système de contrôle interactif permet de gérer l'état d'animation de chaque feature individuellement via des événements click/hover.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Configuration Shader                        │
│  {                                                               │
│    perFeatureControl: true,                                      │
│    initialState: 'paused',                                       │
│    onClick: 'toggle',                                            │
│    onHover: { enter: 'play', leave: 'pause' }                    │
│  }                                                               │
├─────────────────────────────────────────────────────────────────┤
│               FeatureInteractionHandler                          │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ MapLibre Events │───▶│ Event Dispatch  │                     │
│  │ click/mouseenter│    │ to StateManager │                     │
│  │ mouseleave      │    │                 │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                  │                               │
│                          action: 'toggle' | 'play' | etc.        │
│                                  ▼                               │
├─────────────────────────────────────────────────────────────────┤
│            FeatureAnimationStateManager                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ states: Map<featureId, FeatureAnimationState>           │    │
│  │                                                         │    │
│  │ Feature 1: { isPlaying: true,  localTime: 2.5 }        │    │
│  │ Feature 2: { isPlaying: false, localTime: 1.2 }        │    │
│  │ Feature 3: { isPlaying: true,  localTime: 0.8 }        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                       │
│              tick(globalTime, deltaTime)                         │
│              generateBufferData(verticesPerFeature)              │
│                          ▼                                       │
├─────────────────────────────────────────────────────────────────┤
│                      ShaderLayer (GPU)                           │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ Main Buffer     │    │ Interaction     │                     │
│  │ (pos, uv, ...)  │    │ Buffer          │                     │
│  │                 │    │ (isPlaying,     │                     │
│  │                 │    │  localTime)     │                     │
│  └─────────────────┘    └─────────────────┘                     │
│           │                      │                               │
│           ▼                      ▼                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Vertex Shader                         │    │
│  │  attribute float a_isPlaying;   // 0.0 ou 1.0           │    │
│  │  attribute float a_localTime;   // Temps gelé si pause  │    │
│  │  attribute float a_timeOffset;  // Offset de timing     │    │
│  │  varying float v_effectiveTime;                         │    │
│  │                                                         │    │
│  │  // Calcul du temps effectif                            │    │
│  │  float globalAnimTime = u_time + a_timeOffset;          │    │
│  │  v_effectiveTime = mix(a_localTime, globalAnimTime,     │    │
│  │                        a_isPlaying);                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Fragment Shader                        │    │
│  │  // Utilise v_effectiveTime pour l'animation            │    │
│  │  float phase = fract(v_effectiveTime * u_speed);        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Flux d'interaction

1. **Événement** — L'utilisateur clique ou survole un feature sur la carte
2. **Dispatch** — `FeatureInteractionHandler` reçoit l'événement via MapLibre
3. **Action** — L'action configurée (toggle/play/pause/reset) est exécutée
4. **State Update** — `FeatureAnimationStateManager` met à jour l'état du feature
5. **Dirty Flag** — Le buffer est marqué comme nécessitant une mise à jour
6. **Buffer Update** — Lors du prochain frame, les données sont uploadées au GPU
7. **Rendu** — Le shader utilise `v_effectiveTime` pour l'animation

### Gestion du temps effectif

Le temps effectif (`v_effectiveTime`) combine plusieurs composantes:

| État | Calcul |
|------|--------|
| **Playing** | `u_time + a_timeOffset` (temps global + offset) |
| **Paused** | `a_localTime` (temps gelé au moment de la pause) |

La formule GLSL: `mix(a_localTime, u_time + a_timeOffset, a_isPlaying)`

### Optimisation avec dirty tracking

Pour éviter les mises à jour GPU inutiles:

1. `FeatureAnimationStateManager` maintient un flag `dirty`
2. Le flag devient `true` uniquement lors d'un changement d'état
3. Le buffer n'est mis à jour que si `isDirty() === true`
4. Après upload, `clearDirty()` est appelé

---

## Structure d'un Shader

Chaque shader est défini comme un module autonome :

```typescript
interface ShaderDefinition {
  // Métadonnées
  name: string;
  displayName: string;
  description: string;
  geometry: GeometryType;
  tags: string[];
  
  // Code GLSL
  vertexShader?: string;      // Override optionnel
  fragmentShader: string;     // Requis
  
  // Configuration
  defaultConfig: ShaderConfig;
  configSchema: ConfigSchema;
  
  // Uniforms dynamiques
  getUniforms(config: ShaderConfig, time: number): Record<string, any>;
  
  // Style MapLibre requis
  requiredPaint?: Record<string, any>;
  requiredLayout?: Record<string, any>;
}
```

### Configuration d'un shader

```typescript
interface ShaderConfig {
  // Communs à tous les shaders
  speed?: number;           // Multiplicateur de vitesse (défaut: 1.0)
  intensity?: number;       // Intensité de l'effet (défaut: 1.0)
  enabled?: boolean;        // Activer/désactiver (défaut: true)
  
  // Spécifiques au shader (exemples)
  color?: string | [number, number, number, number];
  frequency?: number;
  amplitude?: number;
  // ... autres paramètres selon le shader
}
```

---

## Organisation des fichiers

```
maplibre-animated-shaders/
├── src/
│   ├── index.ts                    # Export principal
│   ├── ShaderManager.ts
│   ├── AnimationLoop.ts
│   ├── ShaderRegistry.ts
│   ├── ConfigResolver.ts
│   │
│   ├── expressions/                # Data-driven expressions (Phase 2)
│   │   ├── index.ts                # Exports du module
│   │   ├── ExpressionEvaluator.ts  # Wrapper MapLibre expressions
│   │   └── FeatureDataBuffer.ts    # Buffer GPU per-feature
│   │
│   ├── timing/                     # Animation timing (Phase 1)
│   │   ├── index.ts                # Exports du module
│   │   └── TimeOffsetCalculator.ts # Calcul des offsets
│   │
│   ├── interaction/                # Interactive control (Phase 3)
│   │   ├── index.ts                # Exports du module
│   │   ├── FeatureAnimationStateManager.ts  # État per-feature
│   │   └── InteractionHandler.ts   # Gestion événements click/hover
│   │
│   ├── layers/                     # WebGL Custom Layers
│   │   ├── index.ts
│   │   ├── PointShaderLayer.ts     # Points avec data-driven
│   │   ├── LineShaderLayer.ts      # Lignes avec data-driven
│   │   └── PolygonShaderLayer.ts   # Polygones avec data-driven
│   │
│   ├── shaders/
│   │   ├── index.ts                # Export tous les shaders
│   │   │
│   │   ├── points/
│   │   │   ├── pulse.ts
│   │   │   ├── heartbeat.ts
│   │   │   ├── radar.ts
│   │   │   ├── particle-burst.ts
│   │   │   ├── glow.ts
│   │   │   └── morphing.ts
│   │   │
│   │   ├── lines/
│   │   │   ├── flow.ts
│   │   │   ├── gradient-travel.ts
│   │   │   ├── electric.ts
│   │   │   ├── trail-fade.ts
│   │   │   ├── breathing.ts
│   │   │   ├── snake.ts
│   │   │   └── neon.ts
│   │   │
│   │   ├── polygons/
│   │   │   ├── scan-lines.ts
│   │   │   ├── ripple.ts
│   │   │   ├── hatching.ts
│   │   │   ├── fill-wave.ts
│   │   │   ├── noise.ts
│   │   │   ├── marching-ants.ts
│   │   │   ├── gradient-rotation.ts
│   │   │   └── dissolve.ts
│   │   │
│   │   └── global/
│   │       ├── heat-shimmer.ts
│   │       ├── day-night.ts
│   │       ├── depth-fog.ts
│   │       ├── weather.ts
│   │       └── holographic.ts
│   │
│   ├── glsl/
│   │   ├── common/
│   │   │   ├── noise.glsl          # Fonctions de bruit (simplex, perlin)
│   │   │   ├── easing.glsl         # Fonctions d'easing
│   │   │   ├── shapes.glsl         # SDF pour formes géométriques
│   │   │   └── colors.glsl         # Manipulation de couleurs
│   │   │
│   │   └── includes/
│   │       └── ... (fragments réutilisables)
│   │
│   ├── utils/
│   │   ├── color.ts                # Conversion couleurs
│   │   ├── glsl-loader.ts          # Chargement/compilation GLSL
│   │   └── maplibre-helpers.ts     # Utilitaires MapLibre
│   │
│   └── types/
│       └── index.ts                # Types TypeScript
│
├── demo/
│   ├── index.html
│   ├── demo.ts
│   └── styles.css
│
├── tests/
│   └── ...
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── ARCHITECTURE.md
└── ROADMAP.md
```

---

## API publique

L'API est conçue pour être **simple à intégrer** dans n'importe quel projet MapLibre existant. Aucune modification de code existant n'est nécessaire.

### Installation

```bash
npm install maplibre-animated-shaders
```

### Intégration en 3 lignes

```typescript
import { applyShader } from 'maplibre-animated-shaders';

const map = new maplibregl.Map({ container: 'map', style: '...' });

// Appliquer un shader à une couche existante
applyShader(map, 'my-layer', 'pulse');
```

C'est tout ! Le shader est actif et animé.

### Usage avec configuration

```typescript
import { applyShader } from 'maplibre-animated-shaders';

applyShader(map, 'traffic-layer', 'flow', {
  speed: 2.0,
  color: '#ff6b6b',
  dashLength: 15,
  direction: 'forward'
});
```

### Usage avancé avec contrôle

```typescript
import { createShaderManager } from 'maplibre-animated-shaders';

const shaders = createShaderManager(map);

// Enregistrer plusieurs shaders
shaders.register('alerts', 'pulse', { speed: 1.5, rings: 3 });
shaders.register('roads', 'flow', { speed: 2.0 });
shaders.register('zones', 'ripple');

// Contrôle runtime
shaders.pause('alerts');
shaders.play('alerts');
shaders.setSpeed('roads', 3.0);

// Mise à jour de config
shaders.updateConfig('alerts', { color: '#22c55e' });

// Retirer un shader
shaders.unregister('zones');

// Nettoyage complet
shaders.destroy();
```

### API fonctionnelle (one-liners)

```typescript
import { applyShader, removeShader, listShaders } from 'maplibre-animated-shaders';

// Appliquer
const controller = applyShader(map, 'layer', 'heartbeat', { speed: 1.2 });

// Contrôler
controller.pause();
controller.play();
controller.update({ speed: 2.0 });

// Retirer
controller.remove();
// ou
removeShader(map, 'layer');

// Lister les shaders disponibles
console.log(listShaders());          // tous
console.log(listShaders('point'));   // par géométrie
```

### Avec React

```tsx
import { useShader } from 'maplibre-animated-shaders/react';

function MapComponent() {
  const mapRef = useRef(null);
  
  useShader(mapRef, 'my-layer', 'pulse', {
    speed: 1.5,
    color: '#3b82f6'
  });
  
  return <Map ref={mapRef} />;
}
```

### Presets thématiques

```typescript
import { applyShader, presets } from 'maplibre-animated-shaders';

// Presets prédéfinis pour cas d'usage courants
applyShader(map, 'traffic', 'flow', presets.traffic.congestion);
applyShader(map, 'alerts', 'pulse', presets.alerts.critical);
applyShader(map, 'selection', 'ripple', presets.ui.selection);
```

### Création de shader custom

```typescript
import { defineShader, registerShader, applyShader } from 'maplibre-animated-shaders';

const myShader = defineShader({
  name: 'my-custom-effect',
  geometry: 'point',
  fragmentShader: `
    uniform float u_time;
    uniform float u_intensity;
    
    void main() {
      // Custom GLSL...
    }
  `,
  defaultConfig: {
    intensity: 1.0
  },
  getUniforms: (config, time) => ({
    u_time: time,
    u_intensity: config.intensity
  })
});

registerShader(myShader);

// Utiliser comme n'importe quel autre shader
applyShader(map, 'layer', 'my-custom-effect', { intensity: 0.8 });
```

---

## Intégration MapLibre

La bibliothèque s'intègre avec MapLibre via plusieurs mécanismes :

### 1. Custom Layers (effets globaux)

Pour les effets post-processing et overlays globaux.

```typescript
map.addLayer({
  id: 'shader-overlay',
  type: 'custom',
  onAdd: (map, gl) => { /* init WebGL */ },
  render: (gl, matrix) => { /* render */ }
});
```

### 2. Paint Properties Animation

Pour les propriétés animables des couches standard.

```typescript
// Interpolation via setInterval/requestAnimationFrame
map.setPaintProperty('layer', 'circle-radius', animatedValue);
```

### 3. Expressions avec feature-state (avancé)

Pour les animations par feature individuelle.

```typescript
map.setFeatureState({ source: 'src', id: featureId }, { phase: 0.5 });
```

---

## Considérations de performance

1. **Batching des updates** — Les uniforms sont mis à jour une fois par frame, pas par shader
2. **Shader compilation cache** — Les programmes WebGL sont compilés une seule fois et réutilisés
3. **Lazy loading** — Les shaders sont chargés à la demande
4. **LOD automatique** — Réduction de complexité à bas zoom levels
5. **Throttling configurable** — Limite du FPS pour économiser les ressources

---

## Compatibilité

- MapLibre GL JS >= 3.0
- Navigateurs avec WebGL 2.0+
- TypeScript >= 5.0 (types inclus)
- ESM et CommonJS

---

## Extensibilité

La bibliothèque est conçue pour être étendue :

- **Plugins** — Système de plugins pour ajouter des catégories de shaders
- **Themes** — Presets de configuration thématiques
- **Hooks** — Callbacks sur les événements d'animation
- **Adapters** — Support futur pour deck.gl ou d'autres renderers
