# MapLibre Animated Shaders — Roadmap

## Vue d'ensemble du plan

| Phase | Description | Tâches | Priorité | Statut |
|-------|-------------|--------|----------|--------|
| 0 | Infrastructure | 5 | 🔴 Critique | ✅ Terminé |
| 1 | Premier shader + Site de démo | 2 | 🔴 Critique | ✅ Terminé |
| 2 | Shaders Points | 5 | 🟠 Haute | ✅ Terminé |
| 3 | Shaders Lignes | 7 | 🟠 Haute | ✅ Terminé |
| 4 | Shaders Polygones | 8 | 🟡 Moyenne | ✅ Terminé |
| 5 | Effets Globaux | 5 | 🟢 Basse | ✅ Terminé |
| 6 | Finalisation | 3 | 🟠 Haute | 🔲 À faire |

**Total : 35 tâches** | **Complétées : 32/35**

> **Philosophie** : Le site de démo est créé dès le premier shader pour permettre le développement itératif avec un agent AI. Chaque nouveau shader peut être testé immédiatement.

---

## Phase 0 — Infrastructure ✅

### T0.1 — Setup projet et build system ✅ TERMINÉ
- ✅ Initialiser le projet npm/TypeScript
- ✅ Configurer Vite pour le build et la démo
- ✅ Setup ESLint, Prettier
- ✅ Configurer les exports ESM/CJS

**Livrable:** Projet buildable avec `npm run build`

---

### T0.2 — Core: ShaderManager ✅ TERMINÉ
- ✅ Implémenter la classe `ShaderManager`
- ✅ Gestion du cycle de vie (register/unregister)
- ✅ Méthodes play/pause/setSpeed
- ✅ Binding avec l'instance MapLibre

**Livrable:** Manager fonctionnel sans shaders

---

### T0.3 — Core: AnimationLoop ✅ TERMINÉ
- ✅ Implémenter la boucle `requestAnimationFrame`
- ✅ Gestion du temps global et par shader
- ✅ Start/stop/pause global
- ✅ Calcul du delta time

**Livrable:** Loop qui injecte le temps

---

### T0.4 — Core: ShaderRegistry & ConfigResolver ✅ TERMINÉ
- ✅ Registry pour stocker les définitions de shaders
- ✅ ConfigResolver pour merger configs
- ✅ Validation des paramètres avec schéma
- ✅ Types TypeScript complets

**Livrable:** Système de registration complet

---

### T0.5 — GLSL Commons ✅ TERMINÉ
- ✅ `noise.glsl` — Simplex noise 2D/3D, Perlin
- ✅ `easing.glsl` — easeInOut, bounce, elastic, etc.
- ✅ `shapes.glsl` — SDF cercle, carré, triangle
- ✅ `colors.glsl` — HSL↔RGB, blend modes

**Livrable:** Bibliothèque GLSL réutilisable

---

## Phase 1 — Premier Shader + Site de Démo ✅

> **Objectif** : Avoir un environnement de test fonctionnel dès que possible pour valider chaque shader développé par la suite.

### T1.1 — Shader: Pulse (Premier shader de référence) ✅ TERMINÉ

Cercles concentriques qui s'expandent depuis le point. Ce shader sert de référence pour l'architecture.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#3b82f6` | Couleur des anneaux |
| `speed` | number | `1.0` | Vitesse d'expansion |
| `rings` | number | `3` | Nombre d'anneaux visibles |
| `maxRadius` | number | `50` | Rayon maximum en pixels |
| `fadeOut` | boolean | `true` | Fondu en s'éloignant |
| `thickness` | number | `2` | Épaisseur des anneaux |

**Cas d'usage:** Alertes, POIs actifs, événements

---

### T1.2 — Site de démonstration (Playground) ✅ TERMINÉ

Site interactif pour tester chaque shader au fur et à mesure du développement.

#### Fonctionnalités implémentées

| Fonctionnalité | Description | Statut |
|----------------|-------------|--------|
| **Galerie de shaders** | Navigation par géométrie (points/lignes/polygones/global) avec preview animé | ✅ |
| **Contrôles temps réel** | Sliders, color pickers, toggles pour modifier tous les paramètres | ✅ |
| **Carte interactive** | MapLibre avec données de démo pour visualiser les effets en contexte | ✅ |
| **Générateur de code** | Affichage du code d'intégration correspondant à la configuration | ✅ |
| **Hot reload** | Rechargement automatique lors du développement | ✅ |
| **Performance monitor** | Affichage FPS et métriques WebGL | ✅ |

#### Structure du site

```
demo/
├── index.html              # Page principale ✅
├── vite.config.ts          # Configuration Vite ✅
├── src/
│   ├── main.ts             # Point d'entrée ✅
│   ├── types.d.ts          # Déclarations TypeScript ✅
│   ├── components/
│   │   ├── ShaderGallery.ts      # Liste des shaders par catégorie ✅
│   │   ├── ConfigPanel.ts        # Contrôles de configuration dynamiques ✅
│   │   ├── CodePreview.ts        # Générateur de code snippet ✅
│   │   ├── MapView.ts            # Wrapper MapLibre avec données démo ✅
│   │   └── PerformanceMonitor.ts # Compteur FPS et métriques ✅
│   ├── data/
│   │   ├── demo-points.geojson   # 50 POIs autour de Paris ✅
│   │   ├── demo-lines.geojson    # 40 lignes (routes, métro, vélo) ✅
│   │   └── demo-polygons.geojson # 15 zones/quartiers ✅
│   └── styles/
│       └── main.css              # Thème sombre complet ✅
└── public/
    └── og-image.png        # Image pour partage social (optionnel)
```

#### Design et UX

- ✅ **Layout 3 colonnes** : Sidebar shaders | Carte centrale | Panel configuration
- ✅ **Thème sombre** : Cohérent avec l'univers cartographique/dev
- ✅ **Responsive** : Adaptation mobile avec drawer pour les panneaux
- ✅ **URL shareable** : Paramètres encodés dans l'URL pour partager une configuration

#### Données de démonstration

Le site utilise des données GeoJSON représentatives :
- ✅ **Points** : 50 POIs variés autour de Paris (landmarks, musées, parcs, transport)
- ✅ **Lignes** : 40 segments (routes, métro, bus, pistes cyclables, chemins)
- ✅ **Polygones** : 15 zones/quartiers avec différentes tailles

#### Commandes disponibles

```bash
# Lancer le site de démo en développement
npm run dev:demo

# Build production du site de démo
npm run build:demo

# Preview du build production
npm run preview:demo
```

**Livrable:** Site de démo fonctionnel accessible en local + déployable ✅

---

## Phase 2 — Shaders Points (suite) ✅

### T2.1 — Shader: Heartbeat ✅ TERMINÉ
Variation de taille rythmique avec ease-in-out.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#ef4444` | Couleur du point |
| `speed` | number | `1.0` | BPM relatif |
| `minScale` | number | `0.8` | Échelle minimum |
| `maxScale` | number | `1.3` | Échelle maximum |
| `easing` | string | `'easeInOutQuad'` | Fonction d'easing |
| `restDuration` | number | `0.3` | Pause entre battements |

**Cas d'usage:** Données temps réel, capteurs, statuts live

---

### T2.2 — Shader: Radar ✅ TERMINÉ
Arc qui tourne autour du point.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#22c55e` | Couleur du sweep |
| `speed` | number | `1.0` | Tours par seconde |
| `arcAngle` | number | `60` | Angle de l'arc (degrés) |
| `radius` | number | `40` | Rayon du radar |
| `trail` | number | `0.5` | Longueur du trail (0-1) |
| `gridLines` | number | `3` | Cercles concentriques |

**Cas d'usage:** Zones de couverture, scanning, recherche

---

### T2.3 — Shader: Particle Burst ✅ TERMINÉ
Particules qui émanent du centre.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#f59e0b` | Couleur des particules |
| `speed` | number | `1.0` | Vitesse d'émission |
| `particleCount` | number | `12` | Nombre de particules |
| `spread` | number | `360` | Angle de dispersion |
| `particleSize` | number | `3` | Taille des particules |
| `lifetime` | number | `1.0` | Durée de vie (secondes) |
| `gravity` | number | `0` | Effet de gravité |

**Cas d'usage:** Événements, impacts, notifications

---

### T2.4 — Shader: Glow ✅ TERMINÉ
Halo lumineux avec intensité variable.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#8b5cf6` | Couleur du glow |
| `speed` | number | `0.5` | Vitesse de pulsation |
| `intensity` | number | `1.0` | Intensité lumineuse |
| `radius` | number | `30` | Rayon du halo |
| `softness` | number | `0.5` | Douceur du dégradé |
| `pulseRange` | [number, number] | `[0.6, 1.0]` | Range d'intensité |

**Cas d'usage:** Points d'intérêt, hotspots, sélection

---

### T2.5 — Shader: Morphing Shapes ✅ TERMINÉ
Transition fluide entre formes géométriques.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#06b6d4` | Couleur de la forme |
| `speed` | number | `0.3` | Vitesse de morphing |
| `shapes` | string[] | `['circle','square','triangle']` | Séquence de formes |
| `size` | number | `20` | Taille de base |
| `easing` | string | `'easeInOutCubic'` | Fonction d'easing |
| `holdDuration` | number | `0.5` | Pause sur chaque forme |

**Cas d'usage:** Catégorisation dynamique, statuts multiples

---

## Phase 3 — Shaders Lignes ✅

### T3.1 — Shader: Flow ✅ TERMINÉ
Tirets animés qui "coulent" le long de la ligne.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#3b82f6` | Couleur des tirets |
| `speed` | number | `1.0` | Vitesse du flux |
| `dashLength` | number | `10` | Longueur des tirets |
| `gapLength` | number | `10` | Longueur des espaces |
| `direction` | `'forward'` \| `'backward'` | `'forward'` | Direction du flux |
| `gradient` | boolean | `false` | Dégradé sur chaque tiret |

**Cas d'usage:** Flux de trafic, direction, pipelines

---

### T3.2 — Shader: Gradient Travel ✅ TERMINÉ
Dégradé de couleur qui se déplace le long de la ligne.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `colorStart` | color | `#3b82f6` | Couleur de début |
| `colorEnd` | color | `#8b5cf6` | Couleur de fin |
| `speed` | number | `0.5` | Vitesse de déplacement |
| `wavelength` | number | `100` | Longueur d'onde (pixels) |
| `mode` | `'linear'` \| `'wave'` | `'linear'` | Mode de progression |

**Cas d'usage:** Réseaux, transfert de données, énergie

---

### T3.3 — Shader: Electric ✅ TERMINÉ
Distorsion sinusoïdale avec effet plasma/électrique.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#facc15` | Couleur principale |
| `speed` | number | `2.0` | Vitesse de l'animation |
| `amplitude` | number | `5` | Amplitude de distorsion |
| `frequency` | number | `0.1` | Fréquence des ondulations |
| `noiseScale` | number | `0.05` | Échelle du bruit |
| `glow` | boolean | `true` | Effet lumineux |

**Cas d'usage:** Lignes électriques, énergie, effets sci-fi

---

### T3.4 — Shader: Trail Fade ✅ TERMINÉ
Opacité décroissante vers l'arrière de la ligne.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#10b981` | Couleur du trail |
| `speed` | number | `1.0` | Vitesse de déplacement |
| `headLength` | number | `0.2` | Longueur de la tête (0-1) |
| `fadeLength` | number | `0.8` | Longueur du fade (0-1) |
| `minOpacity` | number | `0.1` | Opacité minimum |
| `loop` | boolean | `true` | Boucle continue |

**Cas d'usage:** Trajectoires, historique GPS, animations

---

### T3.5 — Shader: Breathing ✅ TERMINÉ
Épaisseur qui pulse rythmiquement.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#f43f5e` | Couleur de la ligne |
| `speed` | number | `0.5` | Vitesse de respiration |
| `minWidth` | number | `2` | Épaisseur minimum |
| `maxWidth` | number | `8` | Épaisseur maximum |
| `easing` | string | `'easeInOutSine'` | Fonction d'easing |
| `syncToData` | boolean | `false` | Sync avec propriété data |

**Cas d'usage:** Congestion, charge réseau, importance variable

---

### T3.6 — Shader: Snake ✅ TERMINÉ
Segment coloré qui progresse sur le tracé.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `headColor` | color | `#3b82f6` | Couleur de la tête |
| `tailColor` | color | `#1e3a8a` | Couleur de la queue |
| `speed` | number | `0.3` | Vitesse de progression |
| `length` | number | `0.2` | Longueur du snake (0-1) |
| `baseColor` | color | `#cbd5e1` | Couleur de la ligne inactive |
| `loop` | boolean | `true` | Revenir au début |

**Cas d'usage:** Itinéraires, progression, chargement

---

### T3.7 — Shader: Neon ✅ TERMINÉ
Effet néon avec légère instabilité/flicker.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#f0abfc` | Couleur du néon |
| `speed` | number | `1.0` | Vitesse du flicker |
| `glowRadius` | number | `10` | Rayon du glow |
| `flickerIntensity` | number | `0.3` | Intensité du scintillement |
| `flickerSpeed` | number | `5.0` | Fréquence du flicker |
| `layers` | number | `3` | Couches de glow |

**Cas d'usage:** Style cyberpunk, données live, UI futuriste

---

## Phase 4 — Shaders Polygones ✅

### T4.1 — Shader: Scan Lines ✅ TERMINÉ
Lignes horizontales/verticales qui balayent la zone.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#22d3ee` | Couleur des lignes |
| `speed` | number | `1.0` | Vitesse du scan |
| `direction` | `'horizontal'` \| `'vertical'` \| `'diagonal'` | `'horizontal'` | Direction |
| `lineWidth` | number | `3` | Épaisseur des lignes |
| `spacing` | number | `20` | Espacement |
| `fade` | boolean | `true` | Fondu aux bords |

**Cas d'usage:** Analyse en cours, processing, sélection

---

### T4.2 — Shader: Ripple ✅ TERMINÉ
Ondulations depuis le centroïde du polygone.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#6366f1` | Couleur des ondulations |
| `speed` | number | `1.0` | Vitesse de propagation |
| `waves` | number | `3` | Nombre d'ondulations |
| `decay` | number | `0.5` | Atténuation |
| `origin` | `'centroid'` \| `'click'` \| `[number, number]` | `'centroid'` | Point d'origine |

**Cas d'usage:** Sélection, impact, zone d'effet

---

### T4.3 — Shader: Hatching ✅ TERMINÉ
Pattern de hachures animées.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#78716c` | Couleur des hachures |
| `speed` | number | `0.5` | Vitesse de déplacement |
| `angle` | number | `45` | Angle des hachures (degrés) |
| `spacing` | number | `8` | Espacement |
| `thickness` | number | `2` | Épaisseur |
| `crossHatch` | boolean | `false` | Double hachure croisée |

**Cas d'usage:** Zones en construction, terrains, indisponible

---

### T4.4 — Shader: Fill Wave ✅ TERMINÉ
Remplissage progressif comme un liquide.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#0ea5e9` | Couleur du liquide |
| `speed` | number | `0.3` | Vitesse de remplissage |
| `level` | number | `0.5` | Niveau de remplissage (0-1) |
| `waveHeight` | number | `5` | Hauteur des vagues |
| `waveFrequency` | number | `0.05` | Fréquence des vagues |
| `direction` | `'up'` \| `'down'` | `'up'` | Direction du remplissage |

**Cas d'usage:** Inondation, progression, niveaux

---

### T4.5 — Shader: Noise ✅ TERMINÉ
Texture bruitée animée.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#a3a3a3` | Couleur de base |
| `speed` | number | `1.0` | Vitesse d'animation |
| `scale` | number | `0.01` | Échelle du bruit |
| `octaves` | number | `3` | Niveaux de détail |
| `intensity` | number | `0.5` | Intensité du bruit |
| `type` | `'simplex'` \| `'perlin'` \| `'static'` | `'simplex'` | Type de bruit |

**Cas d'usage:** Incertitude, zones floues, terrains

---

### T4.6 — Shader: Marching Ants ✅ TERMINÉ
Pointillés animés sur le contour (style sélection).

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#000000` | Couleur des tirets |
| `speed` | number | `2.0` | Vitesse de défilement |
| `dashLength` | number | `5` | Longueur des tirets |
| `gapLength` | number | `5` | Longueur des espaces |
| `width` | number | `2` | Épaisseur du contour |
| `alternateColor` | color \| null | `#ffffff` | Couleur alternée |

**Cas d'usage:** Sélection active, édition, focus

---

### T4.7 — Shader: Gradient Rotation ✅ TERMINÉ
Dégradé radial ou linéaire qui tourne.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `colors` | color[] | `['#3b82f6', '#8b5cf6', '#ec4899']` | Couleurs du dégradé |
| `speed` | number | `0.2` | Vitesse de rotation |
| `type` | `'radial'` \| `'linear'` \| `'conic'` | `'conic'` | Type de dégradé |
| `center` | `'centroid'` \| `[number, number]` | `'centroid'` | Centre de rotation |

**Cas d'usage:** Zones d'influence, visualisation d'orientation

---

### T4.8 — Shader: Dissolve ✅ TERMINÉ
Apparition/disparition avec effet de dissolution.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#84cc16` | Couleur visible |
| `speed` | number | `0.5` | Vitesse de transition |
| `progress` | number | `1.0` | État (0=invisible, 1=visible) |
| `noiseScale` | number | `0.02` | Échelle du pattern |
| `edgeColor` | color \| null | `#ffffff` | Couleur du bord de dissolution |
| `edgeWidth` | number | `0.05` | Épaisseur du bord |

**Cas d'usage:** Transitions, reveal, apparition progressive

---

## Phase 5 — Effets Globaux ✅

### T5.1 — Shader: Heat Shimmer ✅ TERMINÉ
Distorsion comme la chaleur sur l'asphalte.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `speed` | number | `1.0` | Vitesse de l'ondulation |
| `intensity` | number | `0.5` | Force de la distorsion |
| `scale` | number | `0.005` | Échelle du pattern |
| `direction` | `'vertical'` \| `'horizontal'` | `'vertical'` | Direction principale |
| `bounds` | BBox \| null | `null` | Zone d'application |

**Cas d'usage:** Effet de chaleur, désert, routes chaudes

---

### T5.2 — Shader: Day Night Cycle ✅ TERMINÉ
Variation d'éclairage simulant le cycle jour/nuit.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `speed` | number | `0.1` | Vitesse du cycle |
| `timeOfDay` | number | `0.5` | Position (0=minuit, 0.5=midi) |
| `ambientDay` | color | `#ffffff` | Lumière ambiante jour |
| `ambientNight` | color | `#1e3a5f` | Lumière ambiante nuit |
| `sunColor` | color | `#fef3c7` | Couleur du soleil |
| `shadowIntensity` | number | `0.3` | Intensité des ombres |

**Cas d'usage:** Simulation temporelle, ambiance

---

### T5.3 — Shader: Depth Fog ✅ TERMINÉ
Brouillard animé basé sur le niveau de zoom.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#e5e7eb` | Couleur du brouillard |
| `speed` | number | `0.3` | Vitesse d'animation |
| `density` | number | `0.5` | Densité du brouillard |
| `minZoom` | number | `8` | Zoom de début |
| `maxZoom` | number | `14` | Zoom de disparition |
| `animated` | boolean | `true` | Animation du brouillard |

**Cas d'usage:** Atmosphère, profondeur, niveaux

---

### T5.4 — Shader: Weather ✅ TERMINÉ
Particules de pluie/neige sur la carte.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `type` | `'rain'` \| `'snow'` \| `'leaves'` | `'rain'` | Type de particules |
| `speed` | number | `1.0` | Vitesse de chute |
| `density` | number | `100` | Nombre de particules |
| `color` | color | `#94a3b8` | Couleur des particules |
| `wind` | number | `0` | Angle du vent |
| `particleSize` | number | `2` | Taille des particules |

**Cas d'usage:** Méteo, ambiance, saisons

---

### T5.5 — Shader: Holographic Grid ✅ TERMINÉ
Grille sci-fi qui pulse sur les features.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `color` | color | `#22d3ee` | Couleur de la grille |
| `speed` | number | `0.5` | Vitesse de pulsation |
| `gridSize` | number | `50` | Taille des cellules |
| `lineWidth` | number | `1` | Épaisseur des lignes |
| `pulseWave` | boolean | `true` | Onde de pulsation |
| `glowIntensity` | number | `0.5` | Intensité du glow |

**Cas d'usage:** Interface futuriste, visualisation tech

---

## Phase 6 — Finalisation

### T6.1 — Documentation
- README.md complet avec exemples
- Documentation API (TypeDoc)
- Guide de contribution
- Exemples de code pour chaque shader

**Livrable:** Documentation publiée

---

### T6.2 — Tests
- Tests unitaires pour ConfigResolver
- Tests d'intégration avec MapLibre
- Tests visuels (snapshots)
- Tests de performance

**Livrable:** Coverage > 80%

---

### T6.3 — Publication npm

Préparation et publication du package sur le registre npm.

#### Configuration package.json

```json
{
  "name": "maplibre-gl-shaders",
  "version": "1.0.0",
  "description": "Animated GLSL shaders for MapLibre GL JS",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./shaders/*": "./dist/shaders/*"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "keywords": [
    "maplibre",
    "maplibre-gl",
    "webgl",
    "glsl",
    "shaders",
    "animation",
    "maps",
    "gis",
    "visualization"
  ],
  "peerDependencies": {
    "maplibre-gl": ">=3.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/[username]/maplibre-gl-shaders"
  },
  "license": "MIT"
}
```

#### Checklist pré-publication

- [ ] Version sémantique appropriée (1.0.0 pour release stable)
- [ ] README.md complet avec badges, installation, quick start
- [ ] CHANGELOG.md avec historique des versions
- [ ] LICENSE (MIT recommandé)
- [ ] Types TypeScript exportés et fonctionnels
- [ ] Build ESM + CJS fonctionnel
- [ ] Tree-shaking vérifié (import individuel des shaders)
- [ ] Taille du bundle optimisée (<50KB gzipped pour le core)
- [ ] Tests passants
- [ ] Lien vers le playground dans le README

#### Processus de release

```bash
# 1. Bump version
npm version patch|minor|major

# 2. Build production
npm run build

# 3. Test le package localement
npm pack
# Installer le .tgz dans un projet test

# 4. Publish
npm publish --access public

# 5. Tag git
git push --tags
```

#### Post-publication

- Créer une GitHub Release avec notes de version
- Annoncer sur Twitter/X, Reddit r/gis, r/webdev
- Soumettre à awesome-maplibre
- Article de blog sur le site personnel

**Livrable:** Package `maplibre-gl-shaders` disponible sur npmjs.com

---

## Progression

```
Phase 0 (Infrastructure)         ████████████████████████████████  TERMINÉ ✅
Phase 1 (Pulse + Site démo)      ████████████████████████████████  TERMINÉ ✅
Phase 2 (Points suite)           ████████████████████████████████  TERMINÉ ✅
Phase 3 (Lignes)                 ████████████████████████████████  TERMINÉ ✅
Phase 4 (Polygones)              ████████████████████████████████  TERMINÉ ✅
Phase 5 (Global)                 ████████████████████████████████  TERMINÉ ✅
Phase 6 (Final + npm)            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  À faire
```

---

## Priorisation MVP

Pour une v1.0 minimale viable, prioriser :

1. **Infrastructure complète** (Phase 0)
2. **Premier shader + Site de démo** (Phase 1) — permet de tester tous les shaders suivants
3. **2 shaders points** : Heartbeat, Glow
4. **3 shaders lignes** : Flow, Breathing, Trail Fade
5. **2 shaders polygones** : Ripple, Marching Ants
6. **Publication npm**

Cela représente ~12 tâches pour un MVP fonctionnel et publiable.

---

## Évolutions futures (post-v1)

- **v1.1** : Shaders restants (particules, morphing, weather)
- **v1.2** : Presets thématiques (trafic, météo, cyberpunk)
- **v2.0** : Support deck.gl, combinaison de shaders, système de plugins
