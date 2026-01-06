# Guide de Performance pour Plugins

Ce guide explique comment écrire des plugins performants pour MapLibre Animated Shaders, en exploitant les optimisations existantes et celles à venir.

## Table des matières

1. [Concepts GLSL fondamentaux](#concepts-glsl-fondamentaux)
2. [Comprendre le pipeline de rendu](#comprendre-le-pipeline-de-rendu)
3. [Flux de données : per-feature et data-driven](#flux-de-données--per-feature-et-data-driven)
4. [Optimisations automatiques](#optimisations-automatiques)
5. [Configurer un shader (ConfigSchema)](#configurer-un-shader-configschema)
6. [Écrire des shaders performants](#écrire-des-shaders-performants)
7. [Utiliser des textures](#utiliser-des-textures)
8. [Gérer les données efficacement](#gérer-les-données-efficacement)
9. [Utiliser les presets](#utiliser-les-presets)
10. [Instanced Rendering](#instanced-rendering)
11. [Diagnostiquer les problèmes](#diagnostiquer-les-problèmes)

---

## Concepts GLSL fondamentaux

Avant d'écrire des shaders performants, il faut comprendre comment les données circulent entre JavaScript et le GPU.

### Les trois types de variables GLSL

```
┌─────────────────────────────────────────────────────────────────────┐
│                         JAVASCRIPT (CPU)                            │
│                                                                     │
│  config = { color: '#ff0000', speed: 1.5 }                         │
│                          │                                          │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐ ┌─────────────┐ ┌───────────────┐
│    UNIFORM      │ │  ATTRIBUTE  │ │   VARYING     │
│  (par frame)    │ │ (par vertex)│ │(vertex→frag)  │
└─────────────────┘ └─────────────┘ └───────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      VERTEX SHADER (GPU)                            │
│                                                                     │
│  uniform float u_time;        // Même valeur pour tous les vertices │
│  attribute vec2 a_position;   // Différent pour chaque vertex       │
│  varying vec2 v_uv;           // Passé au fragment shader           │
│                                                                     │
│  void main() {                                                      │
│    v_uv = a_position;         // Copie dans varying                 │
│    gl_Position = ...;                                               │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │ varying (interpolé)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FRAGMENT SHADER (GPU)                           │
│                                                                     │
│  uniform float u_time;        // Toujours accessible                │
│  varying vec2 v_uv;           // Interpolé entre les vertices       │
│                                                                     │
│  void main() {                                                      │
│    gl_FragColor = vec4(v_uv, sin(u_time), 1.0);                    │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1. `uniform` - Valeurs globales par frame

**Ce que c'est:** Une valeur envoyée depuis JavaScript, identique pour tous les pixels/vertices d'un draw call.

**Quand l'utiliser:** Pour des paramètres de configuration qui ne varient pas par feature.

```glsl
// Dans le shader
uniform float u_time;        // Temps d'animation (change chaque frame)
uniform float u_speed;       // Vitesse (change quand l'utilisateur modifie)
uniform vec4 u_color;        // Couleur globale
uniform mat4 u_matrix;       // Matrice de projection (fournie par MapLibre)
uniform vec2 u_resolution;   // Taille de l'écran
```

```typescript
// Dans getUniforms() de votre ShaderDefinition
getUniforms: (config, time) => ({
  u_time: time * config.speed,
  u_speed: config.speed,
  u_color: hexToRgba(config.color),
  // u_matrix et u_resolution sont fournis automatiquement
})
```

**Performance:** Les uniforms sont rapides à mettre à jour (1 appel GPU par uniform).

### 2. `attribute` - Données par vertex

**Ce que c'est:** Des données stockées dans un buffer GPU, différentes pour chaque vertex.

**Quand l'utiliser:** Pour des données qui varient par feature ou par vertex (position, couleur par feature, etc.)

```glsl
// Attributs standards (fournis automatiquement)
attribute vec2 a_pos;           // Position du vertex en Mercator
attribute vec2 a_offset;        // Offset du quad (-1 à 1)
attribute float a_index;        // Index du feature (0, 1, 2, ...)
attribute float a_timeOffset;   // Décalage temporel per-feature

// Attributs data-driven (si configurés)
attribute vec4 a_color;         // Couleur per-feature
attribute float a_intensity;    // Intensité per-feature

// Attributs d'interaction
attribute float a_isPlaying;    // 0.0 = pause, 1.0 = play
attribute float a_localTime;    // Temps figé quand en pause
```

**Performance:** Les attributes sont chargés dans le GPU une fois, puis réutilisés.
Le coût est à l'upload, pas à chaque frame.

### 3. `varying` - Pont vertex → fragment

**Ce que c'est:** Une variable qui passe du vertex shader au fragment shader, **interpolée** entre les vertices.

**Quand l'utiliser:** Pour transmettre des données calculées dans le vertex shader au fragment shader.

```glsl
// === VERTEX SHADER ===
attribute vec2 a_pos;
attribute float a_timeOffset;
attribute vec4 a_color;

varying vec2 v_pos;              // Position pour le fragment
varying float v_effectiveTime;   // Temps avec offset
varying vec4 v_color;            // Couleur interpolée

void main() {
  // Calculer le temps effectif avec l'offset per-feature
  v_effectiveTime = u_time + a_timeOffset;

  // Passer la position et couleur au fragment
  v_pos = a_offset;
  v_color = a_color;

  gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
}

// === FRAGMENT SHADER ===
varying vec2 v_pos;
varying float v_effectiveTime;
varying vec4 v_color;

void main() {
  // v_pos est interpolé : au centre du triangle = moyenne des 3 vertices
  float dist = length(v_pos);
  float pulse = sin(v_effectiveTime * 3.0) * 0.5 + 0.5;

  gl_FragColor = v_color * pulse;
}
```

**Point clé:** L'interpolation est automatique. Entre deux vertices de couleur rouge et bleu, les pixels intermédiaires seront violets.

### Résumé : quoi utiliser quand ?

| Type | Fréquence de changement | Exemple | Performance |
|------|------------------------|---------|-------------|
| `uniform` | Par frame ou rarement | `u_time`, `u_color`, `u_speed` | Très rapide |
| `attribute` | Par vertex/feature | `a_position`, `a_color`, `a_timeOffset` | Upload unique |
| `varying` | Interpolé automatiquement | `v_pos`, `v_color`, `v_effectiveTime` | Gratuit |

---

## Comprendre le pipeline de rendu

### Flux de données simplifié

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   GeoJSON    │────▶│   Buffers    │────▶│     GPU      │
│  (Features)  │     │   (WebGL)    │     │  (Shaders)   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
  Évaluation          Upload GPU           Exécution
  expressions         (coûteux)            par frame
```

### Ce qui coûte cher

| Opération | Fréquence | Coût |
|-----------|-----------|------|
| Compilation shader | 1x (init) | Très élevé |
| Upload buffer | Sur changement | Élevé |
| Uniform update | Chaque frame | Faible |
| Fragment shader | Par pixel | Variable |

---

## Flux de données : per-feature et data-driven

### Comprendre la différence

| Concept | Définition | Où ça vit | Exemple |
|---------|------------|-----------|---------|
| **Per-feature** | Chaque feature GeoJSON a sa propre valeur | `attribute` | Position, index, timeOffset |
| **Data-driven** | Valeur calculée depuis les propriétés du feature | `attribute` (évalué) | Couleur basée sur `severity` |
| **Global** | Même valeur pour tous les features | `uniform` | Temps, vitesse globale |

### Flux complet d'une propriété data-driven

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. CONFIGURATION (JavaScript)                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  shaderManager.register('alerts', 'pulse', {                       │
│    color: ['match', ['get', 'severity'],  // Expression MapLibre   │
│      'critical', '#ff0000',                                        │
│      'warning', '#ffaa00',                                         │
│      '#00ff00'                                                     │
│    ]                                                                │
│  });                                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. ÉVALUATION (ExpressionEvaluator)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Pour chaque feature GeoJSON:                                       │
│                                                                     │
│  feature1 = { properties: { severity: 'critical' } }               │
│    → color évalué = [1.0, 0.0, 0.0, 1.0]  // Rouge                 │
│                                                                     │
│  feature2 = { properties: { severity: 'warning' } }                │
│    → color évalué = [1.0, 0.67, 0.0, 1.0]  // Orange               │
│                                                                     │
│  feature3 = { properties: { severity: 'info' } }                   │
│    → color évalué = [0.0, 1.0, 0.0, 1.0]  // Vert (default)        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. BUFFER CONSTRUCTION (FeatureDataBuffer)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  // Chaque point = 4 vertices (quad), chaque vertex a la couleur   │
│  Float32Array [                                                     │
│    // Feature 1 - 4 vertices × (r,g,b,a,intensity)                 │
│    1.0, 0.0, 0.0, 1.0, 1.0,  // vertex 0                           │
│    1.0, 0.0, 0.0, 1.0, 1.0,  // vertex 1                           │
│    1.0, 0.0, 0.0, 1.0, 1.0,  // vertex 2                           │
│    1.0, 0.0, 0.0, 1.0, 1.0,  // vertex 3                           │
│    // Feature 2 - 4 vertices                                        │
│    1.0, 0.67, 0.0, 1.0, 1.0, // vertex 0                           │
│    ...                                                              │
│  ]                                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. GPU (Shaders)                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  // VERTEX SHADER                                                   │
│  attribute vec4 a_color;          // Depuis le buffer              │
│  uniform float u_useDataDrivenColor;  // Flag: 1.0 si data-driven  │
│  varying vec4 v_color;                                              │
│                                                                     │
│  void main() {                                                      │
│    v_color = a_color;             // Passer au fragment            │
│  }                                                                  │
│                                                                     │
│  // FRAGMENT SHADER                                                 │
│  uniform vec4 u_color;            // Couleur globale (fallback)    │
│  varying vec4 v_color;            // Couleur per-feature           │
│  varying float v_useDataDrivenColor;                               │
│                                                                     │
│  void main() {                                                      │
│    // Choisir entre global et per-feature                          │
│    vec4 finalColor = mix(u_color, v_color, v_useDataDrivenColor);  │
│    gl_FragColor = finalColor;                                       │
│  }                                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Expressions MapLibre supportées

```typescript
// Lecture de propriété
color: ['get', 'status_color']

// Valeur par défaut si null
intensity: ['coalesce', ['get', 'priority'], 0.5]

// Conditions multiples
color: ['match', ['get', 'type'],
  'error', '#ff0000',
  'warning', '#ffaa00',
  'success', '#00ff00',
  '#888888'  // default
]

// Interpolation numérique
size: ['interpolate', ['linear'], ['get', 'magnitude'],
  0, 10,    // magnitude 0 → size 10
  5, 30,    // magnitude 5 → size 30
  10, 60    // magnitude 10 → size 60
]

// Conditions booléennes
opacity: ['case',
  ['>', ['get', 'value'], 100], 1.0,
  ['>', ['get', 'value'], 50], 0.7,
  0.3
]

// Opérations mathématiques
speed: ['*', ['get', 'urgency'], 2.0]

// Zoom-dependent (évalué par MapLibre)
size: ['interpolate', ['linear'], ['zoom'],
  5, 2,
  15, 20
]
```

### Performance des data-driven properties

| Approche | Coût CPU | Coût GPU | Quand utiliser |
|----------|----------|----------|----------------|
| **uniform** (global) | Très bas | Très bas | Même valeur pour tous |
| **data-driven simple** (`['get', 'x']`) | Bas | Bas | Propriétés directes |
| **data-driven complexe** (interpolate, match) | Moyen | Bas | Logique conditionnelle |
| **Recalcul par frame** | Élevé | - | À éviter ! |

**Règle d'or:** Les expressions sont évaluées **une seule fois** lors de la construction des buffers, pas à chaque frame.

---

## Optimisations automatiques

Le système applique automatiquement ces optimisations. **Vous n'avez rien à faire** pour en bénéficier.

### 1. Cache des programmes shader

```typescript
// Votre code
shaderManager.register('layer1', 'pulse', config1);
shaderManager.register('layer2', 'pulse', config2);  // Même shader

// En interne: le programme WebGL est réutilisé (pas recompilé)
```

### 2. Object Pooling

Les objets temporaires (points, segments, polygones) sont réutilisés pour éviter le garbage collector.

**Pools disponibles:**
- `pointPool`: 1,000 - 50,000 points
- `segmentPool`: 1,000 - 50,000 segments
- `polygonPool`: 500 - 20,000 polygones

### 3. Frustum Culling

Les features hors de l'écran ne sont pas rendues.

```
┌─────────────────────────────────┐
│  Viewport visible               │
│  ┌───────────────────┐          │
│  │                   │          │
│  │   Rendu actif     │  ← Hors écran = ignoré
│  │                   │          │
│  └───────────────────┘          │
└─────────────────────────────────┘
```

### 4. Level of Detail (LOD)

La géométrie est simplifiée automatiquement selon le zoom.

#### Configuration par défaut

| Zoom | Simplification | Max features | Min vertices |
|------|----------------|--------------|--------------|
| 0-5 | 90% réduit | 1,000 | 3 |
| 5-10 | 70% réduit | 5,000 | 4 |
| 10-14 | 40% réduit | 20,000 | 6 |
| 14-18 | 10% réduit | 50,000 | 8 |
| 18-24 | 0% (plein détail) | 100,000 | 10 |

#### Utilisation du LODManager

```typescript
import { LODManager, DEFAULT_LOD_CONFIG } from 'maplibre-animated-shaders';

// Utiliser la config par défaut
const lodManager = new LODManager();

// Ou personnaliser
const customLOD = new LODManager({
  enabled: true,
  levels: [
    { minZoom: 0, maxZoom: 8, simplification: 0.05, maxFeatures: 500, minVertices: 3 },
    { minZoom: 8, maxZoom: 14, simplification: 0.3, maxFeatures: 5000, minVertices: 5 },
    { minZoom: 14, maxZoom: 24, simplification: 1.0, maxFeatures: 50000, minVertices: 10 },
  ],
  defaultSimplification: 1.0,
  defaultMaxFeatures: 10000,
});

// Obtenir le niveau LOD pour le zoom actuel
const level = lodManager.getLODLevel(map.getZoom());
console.log(`Zoom ${map.getZoom()}: simplification=${level.simplification}, max=${level.maxFeatures}`);

// Simplifier une géométrie (ligne ou polygone)
const simplifiedCoords = lodManager.simplifyGeometry(originalCoords, level);

// Traiter un tableau de features avec LOD
const processedFeatures = lodManager.processFeatures(features, map.getZoom());
```

#### Algorithme de simplification Douglas-Peucker

Le LOD utilise l'algorithme Douglas-Peucker pour réduire les points d'une ligne/polygone :

```
Original (20 points):      Simplifié (6 points):
    •--•                       •
   /    \                     / \
  •      •--•                •   •
 /          \               /     \
•            •             •       •
```

```typescript
// La tolérance est calculée automatiquement :
// tolérance = (1 - simplification) * facteur_échelle

// Zoom 0-5 : simplification = 0.1 → tolérance haute → peu de points
// Zoom 18+ : simplification = 1.0 → tolérance = 0 → tous les points
```

#### Exemple concret : 10,000 polygones

```typescript
// Sans LOD (zoom 3)
// → 10,000 polygones × ~100 vertices = 1,000,000 vertices
// → GPU surchargé, FPS < 10

// Avec LOD (zoom 3)
// → max 1,000 features (culling)
// → simplification 90% → ~10 vertices/polygone
// → 1,000 × 10 = 10,000 vertices
// → GPU content, FPS > 60
```

### 5. Adaptive Frame Rate

Le système ajuste automatiquement la qualité si les FPS chutent:

```
Ultra (100%) ──▶ High (75%) ──▶ Medium (50%) ──▶ Low (25%) ──▶ Minimal (10%)
```

---

## Configurer un shader (ConfigSchema)

Le `ConfigSchema` définit les paramètres de votre shader pour la validation et la génération d'UI.

### Structure d'une ShaderDefinition complète

```typescript
import type { ShaderDefinition, ConfigSchema, ShaderConfig } from 'maplibre-animated-shaders';

// 1. Interface TypeScript pour la config
interface MyShaderConfig extends ShaderConfig {
  color: string;
  speed: number;
  rings: number;
  fadeOut: boolean;
  easing: 'linear' | 'easeOut' | 'elastic';
}

// 2. Valeurs par défaut
const defaultConfig: MyShaderConfig = {
  color: '#3b82f6',
  speed: 1.0,
  rings: 3,
  fadeOut: true,
  easing: 'easeOut',
  intensity: 1.0,  // Hérité de ShaderConfig
  enabled: true,   // Hérité de ShaderConfig
};

// 3. Schema pour validation et UI
const configSchema: ConfigSchema = {
  color: {
    type: 'color',
    default: '#3b82f6',
    label: 'Couleur',
    description: 'Couleur des anneaux',
  },
  speed: {
    type: 'number',
    default: 1.0,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    label: 'Vitesse',
    description: 'Multiplicateur de vitesse',
  },
  rings: {
    type: 'number',
    default: 3,
    min: 1,
    max: 10,
    step: 1,
    label: 'Anneaux',
    description: 'Nombre d\'anneaux visibles',
  },
  fadeOut: {
    type: 'boolean',
    default: true,
    label: 'Fondu',
    description: 'Estomper les anneaux en s\'éloignant',
  },
  easing: {
    type: 'select',
    default: 'easeOut',
    options: ['linear', 'easeOut', 'elastic'],
    label: 'Courbe',
    description: 'Fonction d\'interpolation',
  },
  intensity: {
    type: 'number',
    default: 1.0,
    min: 0,
    max: 1,
    step: 0.1,
    label: 'Intensité',
    description: 'Intensité globale de l\'effet',
  },
};

// 4. Définition complète du shader
const myShader: ShaderDefinition<MyShaderConfig> = {
  name: 'pulse',
  displayName: 'Pulse Marker',
  description: 'Anneaux concentriques qui s\'étendent',
  geometry: 'point',
  tags: ['point', 'pulse', 'alert'],

  fragmentShader: `
    precision mediump float;
    uniform float u_time;
    uniform vec4 u_color;
    uniform float u_rings;
    // ... reste du shader
  `,

  defaultConfig,
  configSchema,

  // 5. Conversion config → uniforms
  getUniforms: (config, time, deltaTime) => ({
    u_time: time * config.speed,
    u_color: hexToRgba(config.color),
    u_rings: config.rings,
    u_fadeOut: config.fadeOut ? 1.0 : 0.0,
    u_intensity: config.intensity,
  }),

  // 6. Propriétés MapLibre requises (optionnel)
  requiredPaint: {
    'circle-pitch-alignment': 'map',
  },
};
```

### Types de paramètres disponibles

| Type | Widget UI | Propriétés | Exemple |
|------|-----------|------------|---------|
| `number` | Slider | `min`, `max`, `step` | Vitesse, rayon, intensité |
| `color` | Color picker | - | Couleur de l'effet |
| `boolean` | Toggle | - | Activer/désactiver une option |
| `string` | Text input | - | Labels, identifiants |
| `select` | Dropdown | `options: string[]` | Mode, type d'easing |
| `array` | Custom | - | Coordonnées, vecteurs |

### Conversion config → uniforms

La fonction `getUniforms` est appelée **à chaque frame** car le temps d'animation change constamment.

> **Pourquoi c'est OK ?** Les appels `gl.uniform*()` sont très rapides (quelques microsecondes).
> Ce qui coûte cher, c'est la reconstruction des buffers (quand les données GeoJSON changent),
> pas la mise à jour des uniforms.

```typescript
getUniforms: (config, time, deltaTime) => {
  // ✅ BON - Calculs simples, c'est ce qui est attendu
  return {
    u_time: time * config.speed,              // Nécessaire pour l'animation
    u_color: hexToRgba(config.color),         // Conversion légère
    u_fadeOut: config.fadeOut ? 1.0 : 0.0,    // Ternaire simple
  };
}

// ❌ MAUVAIS - Calculs lourds à chaque frame
getUniforms: (config, time) => {
  const complexValue = expensiveCalculation(config);  // Parsing JSON, fetch, etc.
  const noise = generateNoiseArray(1000);             // Allocation mémoire
  return { u_complex: complexValue };
}

// ✅ BON - Pré-calculer les valeurs lourdes une seule fois
let cachedNoise: Float32Array | null = null;
getUniforms: (config, time) => {
  if (!cachedNoise) {
    cachedNoise = generateNoiseArray(1000);  // Une seule fois
  }
  return { u_time: time, u_noise: cachedNoise };
}
```

### Uniforms automatiques

Ces uniforms sont fournis automatiquement, pas besoin de les déclarer dans `getUniforms`:

| Uniform | Type | Description |
|---------|------|-------------|
| `u_matrix` | `mat4` | Matrice de projection MapLibre |
| `u_resolution` | `vec2` | Taille du canvas en pixels |
| `u_time` | `float` | Temps (si vous ne le surchargez pas) |

---

## Écrire des shaders performants

### Règle #1: Minimiser les calculs par pixel

Le fragment shader s'exécute pour **chaque pixel** de chaque feature. Un calcul cher × millions de pixels = lenteur.

```glsl
// ❌ MAUVAIS - Bruit fractal à 8 octaves par pixel
float pattern = 0.0;
for (int i = 0; i < 8; i++) {
    pattern += noise(uv * pow(2.0, float(i))) / pow(2.0, float(i));
}

// ✅ BON - Limiter les octaves
float pattern = 0.0;
for (int i = 0; i < 3; i++) {  // 3 octaves suffisent souvent
    pattern += noise(uv * pow(2.0, float(i))) / pow(2.0, float(i));
}

// ✅ ENCORE MIEUX - Pré-calculer dans une texture
uniform sampler2D u_noiseTexture;
float pattern = texture2D(u_noiseTexture, uv).r;
```

### Règle #2: Éviter les branches conditionnelles

Le GPU exécute les deux branches et jette le résultat non utilisé.

```glsl
// ❌ MAUVAIS - Branchement
if (u_mode == 1.0) {
    color = vec4(1.0, 0.0, 0.0, 1.0);
} else if (u_mode == 2.0) {
    color = vec4(0.0, 1.0, 0.0, 1.0);
} else {
    color = vec4(0.0, 0.0, 1.0, 1.0);
}

// ✅ BON - Utiliser mix/step
vec4 red = vec4(1.0, 0.0, 0.0, 1.0);
vec4 green = vec4(0.0, 1.0, 0.0, 1.0);
vec4 blue = vec4(0.0, 0.0, 1.0, 1.0);

color = mix(blue, mix(red, green, step(1.5, u_mode)), step(0.5, u_mode));
```

### Règle #3: Utiliser les fonctions built-in

Les fonctions GLSL sont optimisées en hardware.

```glsl
// ❌ MAUVAIS - Implémentation manuelle
float myLength = sqrt(v.x * v.x + v.y * v.y);

// ✅ BON - Fonction built-in
float myLength = length(v);

// Fonctions à préférer:
// length(), distance(), dot(), cross(), normalize()
// mix(), clamp(), smoothstep(), step()
// sin(), cos(), pow(), exp(), log()
```

### Règle #4: Précision appropriée

```glsl
// Mobile-friendly: utiliser mediump quand possible
precision mediump float;

// Pour les calculs de position: highp
highp vec2 position = u_matrix * a_pos;

// Pour les couleurs/effets: mediump suffit
mediump vec4 color = mix(colorA, colorB, t);
```

### Exemple de shader optimisé

```glsl
// Fragment shader optimisé pour un effet pulse
precision mediump float;

varying vec2 v_pos;
varying float v_effectiveTime;
varying vec4 v_color;

uniform float u_speed;
uniform float u_rings;

void main() {
    // Distance au centre (built-in)
    float dist = length(v_pos);

    // Animation pulse (calculs simples)
    float phase = fract(v_effectiveTime * u_speed);
    float ring = fract(dist * u_rings - phase);

    // Fade-out avec smoothstep (built-in)
    float alpha = smoothstep(1.0, 0.0, dist) * smoothstep(0.0, 0.3, ring);

    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
}
```

---

## Utiliser des textures

Les textures permettent d'afficher des images, des patterns ou des données pré-calculées dans vos shaders.

### Charger une texture

```typescript
// Chargement basique d'une texture
function loadTexture(gl: WebGLRenderingContext, url: string): Promise<WebGLTexture> {
  return new Promise((resolve, reject) => {
    const texture = gl.createTexture();
    if (!texture) {
      reject(new Error('Failed to create texture'));
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';  // Important pour les images cross-origin

    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

      // Configurer le filtrage et le wrapping
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      resolve(texture);
    };

    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}
```

### Utiliser une texture dans un shader

```glsl
// Fragment shader
precision mediump float;

uniform sampler2D u_texture;    // La texture
varying vec2 v_uv;              // Coordonnées UV (0-1)

void main() {
    vec4 texColor = texture2D(u_texture, v_uv);
    gl_FragColor = texColor;
}
```

```typescript
// Dans getUniforms de votre ShaderDefinition
getUniforms: (config, time) => ({
  u_texture: myTexture,  // WebGLTexture
  u_time: time,
})
```

### Bonnes pratiques de performance

#### 1. Dimensions Power-of-Two (POT)

Les textures avec des dimensions en puissance de 2 sont plus performantes:

```
✅ 256×256, 512×512, 1024×1024, 2048×2048
❌ 300×300, 500×400, 1920×1080
```

```typescript
// Si votre image n'est pas POT, redimensionnez-la
function resizeToPowerOfTwo(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = nearestPowerOfTwo(image.width);
  canvas.height = nearestPowerOfTwo(image.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function nearestPowerOfTwo(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}
```

#### 2. Utiliser les mipmaps pour les textures zoomables

Les mipmaps améliorent la qualité et la performance quand la texture est affichée à différentes tailles:

```typescript
function loadTextureWithMipmaps(gl: WebGLRenderingContext, url: string): Promise<WebGLTexture> {
  return new Promise((resolve, reject) => {
    const texture = gl.createTexture();
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

      // Générer les mipmaps (nécessite texture POT)
      gl.generateMipmap(gl.TEXTURE_2D);

      // Utiliser le filtrage trilinéaire pour une qualité optimale
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      resolve(texture!);
    };

    image.onerror = () => reject(new Error(`Failed to load: ${url}`));
    image.src = url;
  });
}
```

| Filtrage | Performance | Qualité | Cas d'usage |
|----------|-------------|---------|-------------|
| `NEAREST` | Très rapide | Pixelisé | Pixel art, données |
| `LINEAR` | Rapide | Lissé | Textures fixes |
| `LINEAR_MIPMAP_LINEAR` | Moyen | Excellente | Textures zoomables |

#### 3. Limiter la taille des textures

| Taille | Mémoire GPU | Recommandation |
|--------|-------------|----------------|
| 256×256 | ~256 KB | Icônes, patterns |
| 512×512 | ~1 MB | Sprites, marqueurs |
| 1024×1024 | ~4 MB | Images détaillées |
| 2048×2048 | ~16 MB | Maximum recommandé |
| 4096×4096 | ~64 MB | À éviter (mobile) |

```typescript
// Vérifier la taille maximale supportée
const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
console.log(`Max texture size: ${maxSize}×${maxSize}`);
// Typiquement: 4096-16384 selon le GPU
```

#### 4. Utiliser un atlas de textures

Pour plusieurs images, combinez-les en une seule texture:

```
┌─────────────────────────────────┐
│  Icon 1  │  Icon 2  │  Icon 3  │
├──────────┼──────────┼──────────┤
│  Icon 4  │  Icon 5  │  Icon 6  │
├──────────┼──────────┼──────────┤
│  Icon 7  │  Icon 8  │  Icon 9  │
└─────────────────────────────────┘
Atlas 512×512 (9 icônes 170×170)
```

```glsl
// Lire une icône spécifique dans l'atlas
uniform sampler2D u_atlas;
uniform vec2 u_atlasSize;     // ex: vec2(3.0, 3.0) pour 3×3 icônes
uniform float u_iconIndex;    // 0-8

void main() {
    // Calculer les UV de l'icône dans l'atlas
    float col = mod(u_iconIndex, u_atlasSize.x);
    float row = floor(u_iconIndex / u_atlasSize.x);

    vec2 iconUV = v_uv / u_atlasSize;
    vec2 iconOffset = vec2(col, row) / u_atlasSize;

    vec4 texColor = texture2D(u_atlas, iconOffset + iconUV);
    gl_FragColor = texColor;
}
```

**Avantages de l'atlas:**
- Un seul changement de texture (bind) au lieu de plusieurs
- Moins de draw calls
- Meilleure utilisation du cache GPU

#### 5. Compresser les textures

Pour les applications web, utilisez des formats optimisés:

| Format | Taille | Support | Usage |
|--------|--------|---------|-------|
| PNG | 100% | Universel | Textures avec transparence |
| JPEG | ~20% | Universel | Photos, sans transparence |
| WebP | ~30% | Moderne | Meilleur compromis |
| AVIF | ~20% | Limité | Futur (meilleure compression) |

```typescript
// Charger avec fallback
async function loadOptimizedTexture(gl: WebGLRenderingContext, basePath: string) {
  const formats = ['avif', 'webp', 'png'];

  for (const format of formats) {
    try {
      return await loadTexture(gl, `${basePath}.${format}`);
    } catch {
      continue;  // Essayer le format suivant
    }
  }
  throw new Error('No supported format');
}
```

### Libérer la mémoire

Les textures consomment de la mémoire GPU. Libérez-les quand elles ne sont plus nécessaires:

```typescript
// Dans onRemove() de votre layer
onRemove() {
  if (this.texture) {
    this.gl.deleteTexture(this.texture);
    this.texture = null;
  }
}
```

### Textures pour données pré-calculées

Utilisez des textures pour stocker des données complexes pré-calculées:

```typescript
// Créer une texture de bruit 256×256
function createNoiseTexture(gl: WebGLRenderingContext, size: number = 256): WebGLTexture {
  const data = new Uint8Array(size * size * 4);

  for (let i = 0; i < size * size; i++) {
    const noise = Math.random() * 255;
    data[i * 4 + 0] = noise;     // R
    data[i * 4 + 1] = noise;     // G
    data[i * 4 + 2] = noise;     // B
    data[i * 4 + 3] = 255;       // A
  }

  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
}
```

```glsl
// Utiliser la texture de bruit dans le shader (beaucoup plus rapide que calculer le bruit)
uniform sampler2D u_noiseTexture;

float noise(vec2 uv) {
    return texture2D(u_noiseTexture, uv).r;
}

// Au lieu de: float n = complexNoiseFunction(uv);
float n = noise(uv * 4.0);  // Lecture texture = quelques cycles GPU
```

### Résumé des performances textures

| Pratique | Impact | Priorité |
|----------|--------|----------|
| Dimensions POT | Critique | Haute |
| Taille ≤ 2048 | Élevé | Haute |
| Mipmaps pour zoom | Moyen | Moyenne |
| Atlas pour multiples | Élevé | Moyenne |
| Compression (WebP) | Moyen | Basse |
| Libérer mémoire | Critique | Haute |

---

## Gérer les données efficacement

### Propriétés data-driven

Utilisez les expressions MapLibre pour des propriétés dynamiques **sans recompiler le shader**:

```typescript
shaderManager.register('alerts', 'pulse', {
  // Couleur basée sur les propriétés du feature
  color: ['match', ['get', 'severity'],
    'critical', '#ff0000',
    'warning', '#ffaa00',
    '#00ff00'  // default
  ],

  // Intensité basée sur une valeur numérique
  intensity: ['interpolate', ['linear'], ['get', 'priority'],
    0, 0.3,
    10, 1.0
  ]
});
```

### Time offsets pour désynchroniser

Évitez que toutes les animations soient synchronisées:

```typescript
shaderManager.register('points', 'pulse', {
  timeOffset: {
    type: 'random',       // 'fixed' | 'random' | 'hash'
    range: [0, 2]         // Décalage entre 0 et 2 secondes
  }
});
```

### Limiter les features actives

```typescript
// Si vous avez beaucoup de données, filtrez côté source
map.addSource('alerts', {
  type: 'geojson',
  data: geojson,
  filter: ['==', ['get', 'active'], true]  // Seulement les actifs
});
```

---

## Utiliser les presets

Les presets sont des configurations optimisées et testées.

### Définir des presets dans votre plugin

```typescript
const myPlugin: ShaderPlugin = {
  name: 'my-effects',
  version: '1.0.0',
  shaders: [myShader],

  presets: {
    // Preset haute performance
    'fast': {
      shader: 'myShader',
      config: {
        complexity: 0.3,
        samples: 2,
        quality: 'low'
      }
    },

    // Preset haute qualité
    'beautiful': {
      shader: 'myShader',
      config: {
        complexity: 1.0,
        samples: 8,
        quality: 'high'
      }
    },

    // Preset équilibré (recommandé par défaut)
    'balanced': {
      shader: 'myShader',
      config: {
        complexity: 0.6,
        samples: 4,
        quality: 'medium'
      }
    }
  }
};
```

### Utiliser les presets

```typescript
// Utilisation directe du preset
shaderManager.register('layer', 'my-effects:fast');

// Ou via la config
shaderManager.register('layer', 'my-effects:myShader', {
  preset: 'fast'
});
```

---

## Instanced Rendering

L'instanced rendering est **activé automatiquement** pour `PointShaderLayer` lorsque les conditions sont remplies.

### Qu'est-ce que l'Instanced Rendering?

Au lieu de dupliquer la géométrie pour chaque feature:

```
Standard (4 vertices × N points):     Instancé (4 vertices + N instances):
Point 1: □ (4 vertices)               Géométrie: □ (4 vertices partagés)
Point 2: □ (4 vertices)               Instances: [pos1, pos2, pos3, ...]
Point 3: □ (4 vertices)
...
Total: 4N vertices                    Total: 4 + N données d'instance
```

### Gains de performance (10,000 points)

| Métrique | Standard | Instancié | Gain |
|----------|----------|-----------|------|
| Vertices uploadés | 40,000 | 4 + 10,000 | **~75%** |
| Mémoire GPU | ~960 KB | ~240 KB | **~75%** |
| Setup attributs/frame | Élevé | Faible (VAO) | **~50%** |

### Activation automatique

L'instanced rendering s'active automatiquement si:

1. **WebGL supporte l'instancing** (WebGL 2 ou extension `ANGLE_instanced_arrays`)
2. **Plus de 100 features** (seuil configurable via `INSTANCING_MIN_FEATURES`)

```typescript
// Vérifier si l'instancing est actif
const layer = new PointShaderLayer('id', 'source', shaderDef, config);
map.addLayer(layer);

// Après l'ajout au map
console.log(layer.isInstancingEnabled()); // true si actif
```

### Structure du shader instancié

Le système utilise automatiquement un vertex shader optimisé pour l'instancing:

```glsl
// ===== Per-vertex (géométrie partagée - 4 vertices) =====
attribute vec2 a_vertex;     // Position dans le quad unit (-0.5 à 0.5)
attribute vec2 a_uv;         // Coordonnées de texture (0 à 1)

// ===== Per-instance (données de chaque point) =====
attribute vec2 a_position;      // Position Mercator du point
attribute float a_index;        // Index du feature
attribute float a_timeOffset;   // Décalage temporel
attribute vec4 a_color;         // Couleur (data-driven)
attribute float a_intensity;    // Intensité (data-driven)
attribute float a_isPlaying;    // État interactif (0=pause, 1=play)
attribute float a_localTime;    // Temps local quand en pause

void main() {
    // Transformer le vertex par l'instance
    vec4 projected = u_matrix * vec4(a_position, 0.0, 1.0);
    vec2 pixelOffset = a_vertex * 2.0 * u_size;
    vec2 clipOffset = pixelOffset / u_resolution * 2.0 * projected.w;
    gl_Position = projected + vec4(clipOffset, 0.0, 0.0);
}
```

### Fallback automatique

Si l'instancing n'est pas supporté ou si le nombre de features est faible, le système utilise automatiquement le rendu standard. **Aucune action requise de votre part.**

### Support par type de géométrie

| Layer | Instancing | Notes |
|-------|------------|-------|
| `PointShaderLayer` | ✅ Implémenté | Activé automatiquement |
| `LineShaderLayer` | ❌ Non implémenté | Complexité géométrique élevée |
| `PolygonShaderLayer` | ❌ Non implémenté | Géométrie variable par feature |
| `GlobalShaderLayer` | N/A | Effet plein écran |

---

## Diagnostiquer les problèmes

### Utiliser les métriques intégrées

```typescript
// Obtenir les métriques de performance
const metrics = shaderManager.getMetrics();

console.log({
  fps: metrics.currentFPS,
  frameTime: metrics.averageFrameTime,
  droppedFrames: metrics.droppedFrames,
  activeShaders: metrics.activeShaderCount,
  features: metrics.featureCount
});
```

### Seuils d'alerte automatiques

Le système émet des warnings automatiques:

| Problème | Seuil | Action suggérée |
|----------|-------|-----------------|
| FPS bas | < 30 | Réduire la complexité shader |
| Frame time élevé | > 50ms | Activer le LOD plus agressif |
| Trop de features | > 50,000 | Filtrer les données |
| Frames perdues | > 10% | Réduire le niveau de qualité |

### Écouter les événements de performance

```typescript
import { globalEventEmitter } from 'maplibre-animated-shaders';

globalEventEmitter.on('performance:warning', (event) => {
  console.warn(`Performance issue: ${event.type}`);
  console.warn(`Suggestion: ${event.suggestion}`);
});

globalEventEmitter.on('performance:frame', (event) => {
  if (event.frameTime > 32) {  // Plus de 2 frames à 60fps
    // Votre logique d'adaptation
  }
});
```

### Profiler avec les DevTools

1. **Chrome DevTools > Performance**
   - Enregistrez pendant l'animation
   - Cherchez les "Long tasks" (> 50ms)

2. **Spector.js** (extension pour WebGL)
   - Inspectez les draw calls
   - Vérifiez la taille des buffers
   - Analysez les shaders compilés

---

## Résumé des bonnes pratiques

### À faire ✅

```
✓ Limiter les octaves de bruit à 3-4
✓ Utiliser mix/step au lieu de if/else
✓ Préférer les fonctions GLSL built-in
✓ Utiliser les expressions data-driven
✓ Définir des presets pour différents niveaux de qualité
✓ Écouter les métriques de performance
✓ Séparer attributs vertex/instance pour le futur
✓ Utiliser des textures POT (256, 512, 1024...)
✓ Générer des mipmaps pour les textures zoomables
✓ Utiliser un atlas pour plusieurs images
✓ Libérer les textures dans onRemove()
```

### À éviter ❌

```
✗ Boucles avec beaucoup d'itérations dans le fragment shader
✗ Branches conditionnelles complexes
✗ Calculs de précision highp non nécessaires
✗ Uniforms qui changent à chaque feature (utiliser attributs)
✗ Ignorer les warnings de performance
✗ Textures > 2048×2048 (surtout sur mobile)
✗ Textures NPOT sans CLAMP_TO_EDGE
✗ Oublier de supprimer les textures inutilisées
```

---

## Ressources supplémentaires

- [WebGL Best Practices (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [The Book of Shaders](https://thebookofshaders.com/)
- [Instanced Rendering TODO](./INSTANCED_RENDERING_TODO.md)
- [Architecture du projet](../ARCHITECTURE.md)
