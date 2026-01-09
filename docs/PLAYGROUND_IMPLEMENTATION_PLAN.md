# Plan de réalisation - Shader Plugin Playground

> Document de planification pour la création d'un environnement de développement de plugins shader.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Objectifs](#objectifs)
3. [Architecture technique](#architecture-technique)
4. [Structure du package](#structure-du-package)
5. [Format de sauvegarde](#format-de-sauvegarde)
6. [Phases de développement](#phases-de-développement)
7. [Spécifications détaillées](#spécifications-détaillées)
8. [Dépendances](#dépendances)
9. [Déploiement](#déploiement)
10. [Critères de succès](#critères-de-succès)

---

## Vue d'ensemble

Le **Shader Plugin Playground** est une application web permettant aux développeurs de :
- Créer des shaders GLSL avec un éditeur avancé (Monaco)
- Prévisualiser en temps réel sur une carte MapLibre
- Définir visuellement les paramètres de configuration
- Exporter un package npm complet et prêt à publier

### Décisions techniques

| Aspect | Choix | Justification |
|--------|-------|---------------|
| **Package** | `packages/playground/` (séparé) | Isolation, déploiement indépendant |
| **Éditeur** | Monaco Editor | VS Code intégré, autocomplete, erreurs inline |
| **Framework** | Vanilla TypeScript | Cohérence avec `packages/demo/` |
| **Build** | Vite | Rapide, HMR, support Monaco |
| **Export** | ZIP téléchargeable | Package npm-ready sans backend |

---

## Objectifs

### Objectif principal
Permettre à la communauté de créer et publier facilement des plugins pour maplibre-animated-shaders.

### Objectifs spécifiques

| # | Objectif | Mesure de succès |
|---|----------|------------------|
| 1 | Éditeur GLSL professionnel | Syntax highlighting, autocomplete, erreurs inline |
| 2 | Preview temps réel | Compilation < 100ms, 60 FPS |
| 3 | Workflow complet | De l'idée au npm publish en 1 session |
| 4 | Export fonctionnel | Package généré compile sans erreur |
| 5 | Documentation intégrée | Aide contextuelle pour varyings et fonctions |

---

## Architecture technique

### Diagramme de flux de données

```
┌─────────────────────────────────────────────────────────────────┐
│                        PluginStore                               │
│                    (État central du plugin)                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ ShaderEditor  │    │ ConfigSchema  │    │   Metadata    │
│    Panel      │    │    Editor     │    │    Editor     │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    Monaco     │    │  Drag/Drop   │    │     Form      │
│    Editor     │    │     List      │    │   Controls    │
└───────┬───────┘    └───────────────┘    └───────────────┘
        │
        ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│     GLSL      │    │   MapLibre    │    │     Code      │
│ Completions   │───▶│   Preview     │    │  Generator    │
└───────────────┘    └───────────────┘    └───────────────┘
```

### État de l'application (PluginStore)

```typescript
interface PlaygroundState {
  // Métadonnées du plugin
  metadata: {
    name: string;
    version: string;
    author: string;
    description: string;
    homepage: string;
    license: string;
    keywords: string[];
  };

  // Shader en cours d'édition
  currentShader: {
    geometry: 'point' | 'line' | 'polygon' | 'global';
    name: string;
    displayName: string;
    description: string;
    tags: string[];
    vertexShader: string;
    fragmentShader: string;
  };

  // Tous les shaders du plugin
  shaders: Map<GeometryType, ShaderDraft>;

  // Schema de configuration
  configSchema: ConfigSchema;
  defaultConfig: Record<string, unknown>;

  // Presets
  presets: Record<string, PresetConfig>;

  // État UI
  ui: {
    activeTab: 'editor' | 'schema' | 'metadata' | 'presets' | 'export';
    previewPlaying: boolean;
    previewSpeed: number;
    compilationErrors: CompilationError[];
    isDirty: boolean;
  };
}
```

---

## Structure du package

```
packages/playground/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── README.md
│
├── src/
│   ├── main.ts                          # Point d'entrée
│   ├── vite-env.d.ts
│   │
│   ├── state/                           # Gestion d'état
│   │   ├── index.ts
│   │   ├── PluginStore.ts               # Store central
│   │   └── types.ts                     # Types d'état
│   │
│   ├── components/                      # Composants UI
│   │   ├── App.ts                       # Layout principal
│   │   │
│   │   ├── editor/                      # Éditeur Monaco GLSL
│   │   │   ├── MonacoEditor.ts          # Wrapper Monaco
│   │   │   ├── GLSLLanguage.ts          # Définition langage
│   │   │   ├── GLSLCompletions.ts       # Autocomplete
│   │   │   ├── GLSLHoverProvider.ts     # Documentation survol
│   │   │   └── ShaderEditorPanel.ts     # Container tabs
│   │   │
│   │   ├── preview/                     # Preview carte
│   │   │   ├── MapPreview.ts            # MapLibre container
│   │   │   ├── SampleDataProvider.ts    # GeoJSON fixtures
│   │   │   ├── PlaybackControls.ts      # Play/pause/speed
│   │   │   └── GeometrySelector.ts      # Sélecteur géométrie
│   │   │
│   │   ├── schema/                      # Éditeur ConfigSchema
│   │   │   ├── ConfigSchemaEditor.ts    # Éditeur principal
│   │   │   ├── ParameterCard.ts         # Carte paramètre
│   │   │   ├── ParameterTypeSelector.ts # Sélecteur type
│   │   │   ├── DragDropList.ts          # Liste réordonnable
│   │   │   └── SchemaPreview.ts         # Preview contrôles
│   │   │
│   │   ├── metadata/                    # Éditeur métadonnées
│   │   │   ├── MetadataEditor.ts        # Formulaire principal
│   │   │   ├── LicenseSelector.ts       # Sélecteur licence
│   │   │   └── KeywordInput.ts          # Input tags
│   │   │
│   │   ├── presets/                     # Gestionnaire presets
│   │   │   ├── PresetsManager.ts        # Liste presets
│   │   │   ├── PresetCard.ts            # Carte preset
│   │   │   └── PresetPreview.ts         # Preview sur carte
│   │   │
│   │   ├── export/                      # Système d'export
│   │   │   ├── ExportPanel.ts           # Interface export
│   │   │   ├── CodeGenerator.ts         # Génération TS
│   │   │   ├── PackageGenerator.ts      # package.json, README
│   │   │   └── ZipExporter.ts           # Export ZIP
│   │   │
│   │   ├── templates/                   # Templates démarrage
│   │   │   ├── TemplateGallery.ts       # Galerie templates
│   │   │   └── templates.ts             # Définitions
│   │   │
│   │   └── shared/                      # Composants partagés
│   │       ├── TabPanel.ts
│   │       ├── SplitPane.ts
│   │       ├── Toast.ts
│   │       ├── Modal.ts
│   │       └── IconButton.ts
│   │
│   ├── services/                        # Services métier
│   │   ├── ShaderCompiler.ts            # Compilation WebGL
│   │   ├── GLSLPreprocessor.ts          # Gestion #include
│   │   ├── LibraryRegistry.ts           # Registre fonctions
│   │   └── LocalStorageService.ts       # Persistance locale
│   │
│   ├── utils/                           # Utilitaires
│   │   ├── webgl-utils.ts               # Helpers WebGL
│   │   ├── code-formatter.ts            # Formatage code
│   │   └── zip-utils.ts                 # Création ZIP
│   │
│   ├── data/                            # Données statiques
│   │   ├── sample-geojson.ts            # GeoJSON par géométrie
│   │   ├── glsl-functions.ts            # DB fonctions autocomplete
│   │   └── licenses.ts                  # Templates licences
│   │
│   └── styles/
│       ├── main.css
│       ├── editor.css
│       ├── preview.css
│       └── components.css
```

---

## Format de sauvegarde

### Objectif

Permettre de sauvegarder et charger un plugin en cours de développement dans un format :
- **Lisible par humain** : JSON formaté
- **Manipulable par LLM** : Structure claire et documentée
- **Portable** : Un seul fichier `.json`
- **Versionné** : Schéma avec numéro de version

### Schéma JSON du projet (`.shader-plugin.json`)

```json
{
  "$schema": "https://maplibre-animated-shaders.dev/schemas/plugin-project.json",
  "version": "1.0",
  "lastModified": "2026-01-07T14:30:00Z",

  "metadata": {
    "name": "my-awesome-plugin",
    "version": "1.0.0",
    "author": "Developer Name",
    "description": "A beautiful animated shader effect",
    "homepage": "https://github.com/user/my-plugin",
    "license": "MIT",
    "keywords": ["maplibre", "shader", "pulse", "animation"]
  },

  "shaders": {
    "point": {
      "name": "pulse",
      "displayName": "Pulse Marker",
      "description": "Expanding rings animation for point markers",
      "tags": ["pulse", "alert", "marker"],

      "fragmentShader": "precision highp float;\n\n#include <shapes>\n#include <easing>\n\nvarying vec2 v_pos;\nvarying float v_effectiveTime;\nvarying vec4 v_color;\n\nuniform float u_speed;\nuniform float u_rings;\nuniform float u_maxRadius;\n\nvoid main() {\n    float dist = length(v_pos);\n    float phase = fract(v_effectiveTime * u_speed);\n    float ring = fract(dist * u_rings - phase);\n    float alpha = smoothstep(1.0, 0.0, dist) * smoothstep(0.0, 0.3, ring);\n    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);\n}",

      "vertexShader": null,

      "configSchema": {
        "color": {
          "type": "color",
          "default": "#3b82f6",
          "label": "Color",
          "description": "Color of the pulse rings"
        },
        "speed": {
          "type": "number",
          "default": 1.0,
          "min": 0.1,
          "max": 5.0,
          "step": 0.1,
          "label": "Speed",
          "description": "Animation speed multiplier"
        },
        "rings": {
          "type": "number",
          "default": 3,
          "min": 1,
          "max": 10,
          "step": 1,
          "label": "Rings",
          "description": "Number of visible rings"
        },
        "maxRadius": {
          "type": "number",
          "default": 30,
          "min": 10,
          "max": 100,
          "step": 5,
          "label": "Max Radius",
          "description": "Maximum radius in pixels"
        },
        "fadeOut": {
          "type": "boolean",
          "default": true,
          "label": "Fade Out",
          "description": "Fade rings as they expand"
        }
      },

      "defaultConfig": {
        "color": "#3b82f6",
        "speed": 1.0,
        "rings": 3,
        "maxRadius": 30,
        "fadeOut": true,
        "intensity": 1.0,
        "enabled": true
      },

      "uniformsMapping": {
        "u_speed": "config.speed",
        "u_rings": "config.rings",
        "u_maxRadius": "config.maxRadius",
        "u_fadeOut": "config.fadeOut ? 1.0 : 0.0",
        "u_color": "hexToRgba(config.color)",
        "u_intensity": "config.intensity"
      }
    },

    "line": null,
    "polygon": null,
    "global": null
  },

  "presets": {
    "alert": {
      "shader": "point",
      "config": {
        "color": "#ef4444",
        "speed": 2.0,
        "rings": 3,
        "maxRadius": 40
      }
    },
    "subtle": {
      "shader": "point",
      "config": {
        "color": "#6366f1",
        "speed": 0.5,
        "rings": 2,
        "maxRadius": 25,
        "fadeOut": true
      }
    }
  },

  "editorState": {
    "activeShader": "point",
    "activeTab": "editor",
    "editorFile": "fragment",
    "previewPlaying": true,
    "previewSpeed": 1.0
  }
}
```

### Description des champs

| Champ | Type | Description |
|-------|------|-------------|
| `$schema` | string | URL du schéma JSON pour validation |
| `version` | string | Version du format de fichier |
| `lastModified` | ISO8601 | Date de dernière modification |
| `metadata` | object | Métadonnées du plugin npm |
| `shaders` | object | Map des shaders par géométrie (point/line/polygon/global) |
| `shaders.*.fragmentShader` | string | Code GLSL du fragment shader |
| `shaders.*.vertexShader` | string\|null | Code vertex shader custom (null = défaut) |
| `shaders.*.configSchema` | object | Schéma des paramètres de configuration |
| `shaders.*.defaultConfig` | object | Valeurs par défaut |
| `shaders.*.uniformsMapping` | object | Mapping config → uniforms (expressions JS) |
| `presets` | object | Presets nommés avec config partielle |
| `editorState` | object | État UI pour restaurer la session |

### Fonctionnalités de persistance

#### Sauvegarde locale (localStorage)

```typescript
// Auto-save toutes les 30 secondes si dirty
interface AutoSaveService {
  save(state: PlaygroundState): void;
  load(): PlaygroundState | null;
  getLastSaveTime(): Date | null;
  clearAutoSave(): void;
}
```

#### Export/Import fichier

```typescript
interface ProjectFileService {
  // Export vers fichier JSON
  exportProject(state: PlaygroundState): Blob;

  // Import depuis fichier JSON
  importProject(file: File): Promise<PlaygroundState>;

  // Validation du schéma
  validateProject(json: unknown): ValidationResult;
}
```

### Cas d'utilisation LLM

Le format JSON est optimisé pour permettre à un LLM de :

1. **Lire et comprendre** un projet existant :
   ```
   "Voici mon projet shader : [coller le JSON]
   Peux-tu m'aider à améliorer l'effet de pulse ?"
   ```

2. **Modifier le code** et renvoyer le JSON mis à jour :
   ```
   "Modifie le fragmentShader pour ajouter un effet de glow"
   ```

3. **Générer un nouveau projet** à partir d'une description :
   ```
   "Crée-moi un shader de type 'fire' pour les points
   avec paramètres: intensity, flameHeight, color"
   ```

4. **Analyser et suggérer** des améliorations :
   ```
   "Analyse ce shader et suggère des optimisations de performance"
   ```

### Fichiers générés

| Fichier | Usage |
|---------|-------|
| `my-plugin.shader-plugin.json` | Projet sauvegardé (éditable) |
| `my-plugin.zip` | Export npm-ready (publication) |

### Structure du service

```
src/services/
├── ProjectService.ts        # Gestion projet (save/load/export)
├── AutoSaveService.ts       # Auto-save localStorage
├── ProjectValidator.ts      # Validation schéma JSON
└── MigrationService.ts      # Migration versions schéma
```

### Fichiers à ajouter à la structure

```
src/
├── schemas/
│   └── plugin-project.schema.json    # JSON Schema pour validation
├── services/
│   ├── ProjectService.ts
│   ├── AutoSaveService.ts
│   └── ProjectValidator.ts
└── components/
    └── project/
        ├── SaveLoadPanel.ts          # UI save/load
        ├── ProjectInfo.ts            # Affichage infos projet
        └── ImportExportButtons.ts    # Boutons export
```

---

## Phases de développement

### Phase 1 : MVP - Éditeur + Preview

**Durée estimée** : 2-3 semaines
**Complexité** : Haute

#### Objectif
Éditeur Monaco fonctionnel avec preview temps réel sur MapLibre.

#### Livrables

| # | Tâche | Fichiers | Complexité |
|---|-------|----------|------------|
| 1.1 | Setup package | `package.json`, `vite.config.ts`, `tsconfig.json` | Basse |
| 1.2 | Layout application | `App.ts`, `main.ts` | Basse |
| 1.3 | Intégration Monaco | `MonacoEditor.ts`, `GLSLLanguage.ts` | Haute |
| 1.4 | Panel éditeur | `ShaderEditorPanel.ts` | Moyenne |
| 1.5 | Sélecteur géométrie | `GeometrySelector.ts` | Basse |
| 1.6 | Preview MapLibre | `MapPreview.ts`, `SampleDataProvider.ts` | Moyenne |
| 1.7 | Compilation WebGL | `ShaderCompiler.ts` | Moyenne |
| 1.8 | Affichage erreurs | Markers Monaco | Moyenne |
| 1.9 | Contrôles playback | `PlaybackControls.ts` | Basse |
| 1.10 | Save/Load projet JSON | `ProjectService.ts`, `SaveLoadPanel.ts` | Moyenne |
| 1.11 | Auto-save localStorage | `AutoSaveService.ts` | Basse |

#### Critères d'acceptation Phase 1
- [ ] L'éditeur Monaco affiche du code GLSL avec syntax highlighting
- [ ] Le sélecteur permet de choisir point/line/polygon/global
- [ ] La carte affiche des données sample pour chaque géométrie
- [ ] Les modifications de code recompilent le shader en temps réel
- [ ] Les erreurs de compilation s'affichent dans l'éditeur
- [ ] Play/pause/speed contrôlent l'animation
- [ ] Export projet vers fichier `.shader-plugin.json`
- [ ] Import projet depuis fichier `.shader-plugin.json`
- [ ] Auto-save restaure le travail après refresh

---

### Phase 2 : Éditeur ConfigSchema

**Durée estimée** : 1-2 semaines
**Complexité** : Moyenne-Haute

#### Objectif
Éditeur visuel pour définir les paramètres du shader.

#### Livrables

| # | Tâche | Fichiers | Complexité |
|---|-------|----------|------------|
| 2.1 | Éditeur schema | `ConfigSchemaEditor.ts` | Haute |
| 2.2 | Carte paramètre | `ParameterCard.ts` | Moyenne |
| 2.3 | Sélecteur type | `ParameterTypeSelector.ts` | Basse |
| 2.4 | Drag-and-drop | `DragDropList.ts` | Moyenne |
| 2.5 | Preview contrôles | `SchemaPreview.ts` | Moyenne |

#### Types de paramètres supportés

| Type | Propriétés | Widget UI |
|------|------------|-----------|
| `number` | min, max, step, default | Slider |
| `color` | default | Color picker |
| `boolean` | default | Toggle |
| `string` | default | Text input |
| `select` | options[], default | Dropdown |

#### Critères d'acceptation Phase 2
- [ ] Ajout/suppression de paramètres fonctionne
- [ ] Tous les types sont supportés avec leurs propriétés
- [ ] Drag-and-drop réordonne les paramètres
- [ ] Preview montre les contrôles générés
- [ ] Les valeurs par défaut sont éditables

---

### Phase 3 : Autocomplete avancé

**Durée estimée** : 1 semaine
**Complexité** : Moyenne-Haute

#### Objectif
Autocomplete intelligent contextuel pour GLSL.

#### Livrables

| # | Tâche | Fichiers | Complexité |
|---|-------|----------|------------|
| 3.1 | Completions varyings | `GLSLCompletions.ts` | Moyenne |
| 3.2 | Completions fonctions | `GLSLCompletions.ts` | Moyenne |
| 3.3 | Hover documentation | `GLSLHoverProvider.ts` | Moyenne |
| 3.4 | Completion #include | `GLSLCompletions.ts` | Basse |
| 3.5 | Base de données | `glsl-functions.ts` | Basse |

#### Base de données autocomplete

**Varyings par géométrie** :

| Géométrie | Varyings disponibles |
|-----------|---------------------|
| `point` | `v_pos`, `v_index`, `v_timeOffset`, `v_effectiveTime`, `v_color`, `v_intensity`, `v_useDataDrivenColor`, `v_useDataDrivenIntensity` |
| `line` | `v_pos`, `v_progress`, `v_line_index`, `v_width`, `v_timeOffset`, `v_effectiveTime`, `v_color`, `v_intensity` |
| `polygon` | `v_pos`, `v_uv`, `v_centroid`, `v_polygon_index`, `v_screen_pos`, `v_timeOffset`, `v_effectiveTime`, `v_color`, `v_intensity` |
| `global` | `v_uv` |

**Fonctions GLSL par bibliothèque** :

| Bibliothèque | Fonctions |
|--------------|-----------|
| `noise` | `snoise(vec2)`, `snoise(vec3)`, `fbm(vec2, int)`, `random(vec2)`, `voronoi(vec2)` |
| `easing` | `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeInElastic`, `easeOutBounce`, etc. |
| `shapes` | `sdCircle`, `sdBox`, `sdRing`, `sdTriangle`, `sdPolygon`, `sdStar`, `fillAA`, `strokeAA` |
| `colors` | `rgb2hsv`, `hsv2rgb`, `rgb2hsl`, `hsl2rgb`, `hueShift`, `palette` |

#### Critères d'acceptation Phase 3
- [ ] Typing `v_` suggère les varyings selon la géométrie
- [ ] Typing après `#include <noise>` suggère `snoise`, `fbm`, etc.
- [ ] Hover sur une fonction affiche sa documentation
- [ ] `#include <` suggère les bibliothèques disponibles

---

### Phase 4 : Metadata & Presets

**Durée estimée** : 1 semaine
**Complexité** : Moyenne

#### Objectif
Compléter les métadonnées plugin et gérer les presets.

#### Livrables

| # | Tâche | Fichiers | Complexité |
|---|-------|----------|------------|
| 4.1 | Éditeur métadonnées | `MetadataEditor.ts` | Basse |
| 4.2 | Sélecteur licence | `LicenseSelector.ts` | Basse |
| 4.3 | Input keywords | `KeywordInput.ts` | Basse |
| 4.4 | Gestionnaire presets | `PresetsManager.ts` | Moyenne |
| 4.5 | Carte preset | `PresetCard.ts` | Basse |
| 4.6 | Preview preset | `PresetPreview.ts` | Moyenne |

#### Champs métadonnées

| Champ | Type | Validation |
|-------|------|------------|
| `name` | string | slug valide (a-z, 0-9, -) |
| `version` | string | semver (x.y.z) |
| `author` | string | requis |
| `description` | string | requis, 10-200 chars |
| `homepage` | string | URL valide (optionnel) |
| `license` | select | MIT, Apache-2.0, GPL-3.0, ISC |
| `keywords` | string[] | 1-10 tags |

#### Critères d'acceptation Phase 4
- [ ] Tous les champs métadonnées sont éditables
- [ ] Validation temps réel avec messages d'erreur
- [ ] Création de preset depuis config actuelle
- [ ] Édition/suppression de presets
- [ ] Clic sur preset l'applique au preview

---

### Phase 5 : Système d'export

**Durée estimée** : 1 semaine
**Complexité** : Moyenne-Haute

#### Objectif
Générer un package npm complet téléchargeable.

#### Livrables

| # | Tâche | Fichiers | Complexité |
|---|-------|----------|------------|
| 5.1 | Générateur code | `CodeGenerator.ts` | Haute |
| 5.2 | Générateur package | `PackageGenerator.ts` | Moyenne |
| 5.3 | Export ZIP | `ZipExporter.ts` | Basse |
| 5.4 | Panel export | `ExportPanel.ts` | Moyenne |
| 5.5 | Copie clipboard | UI | Basse |

#### Structure du package généré

```
my-shader-plugin/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
└── src/
    ├── index.ts              # Export plugin
    ├── types.ts              # Interface config
    └── shaders/
        ├── index.ts          # Barrel export
        ├── point.ts          # Shader point (si défini)
        ├── line.ts           # Shader line (si défini)
        ├── polygon.ts        # Shader polygon (si défini)
        └── global.ts         # Shader global (si défini)
```

#### Exemple de fichier généré (index.ts)

```typescript
import type { ShaderPlugin } from 'maplibre-animated-shaders';
import { pointShader } from './shaders/point';

export const myPlugin: ShaderPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  author: 'Developer Name',
  description: 'My awesome shader plugin',
  homepage: 'https://github.com/user/my-plugin',
  license: 'MIT',
  keywords: ['maplibre', 'shader', 'animation'],

  shaders: [pointShader],

  presets: {
    'fast': {
      shader: 'point',
      config: { speed: 2.0, intensity: 0.8 }
    },
    'slow': {
      shader: 'point',
      config: { speed: 0.5, intensity: 1.0 }
    }
  }
};

export default myPlugin;
```

#### Critères d'acceptation Phase 5
- [ ] Le code TypeScript généré compile sans erreur
- [ ] package.json contient les bonnes dépendances
- [ ] README.md contient instructions d'installation/usage
- [ ] LICENSE contient le texte correct
- [ ] ZIP téléchargeable en un clic
- [ ] Copie fichier individuel fonctionne

---

### Phase 6 : Templates & Finitions

**Durée estimée** : 1 semaine
**Complexité** : Basse-Moyenne

#### Objectif
Templates de démarrage, auto-save, polish UI.

#### Livrables

| # | Tâche | Fichiers | Complexité |
|---|-------|----------|------------|
| 6.1 | Galerie templates | `TemplateGallery.ts` | Moyenne |
| 6.2 | Templates par géométrie | `templates.ts` | Basse |
| 6.3 | Auto-save localStorage | `LocalStorageService.ts` | Basse |
| 6.4 | Raccourcis clavier | Global | Basse |
| 6.5 | Design responsive | CSS | Moyenne |
| 6.6 | Charger exemple existant | UI | Basse |

#### Templates de démarrage

| Template | Géométrie | Description |
|----------|-----------|-------------|
| `pulse` | point | Cercle pulsant basique |
| `glow` | point | Point avec halo lumineux |
| `flow` | line | Ligne animée (dash flow) |
| `electric` | line | Effet électrique |
| `wave` | polygon | Ondulation dans le polygone |
| `gradient` | polygon | Dégradé animé |
| `vignette` | global | Effet vignette |

#### Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl+S` | Sauvegarder (auto-save explicite) |
| `Ctrl+Enter` | Recompiler shader |
| `Space` | Play/Pause preview |
| `Ctrl+E` | Ouvrir export |
| `Ctrl+1-5` | Changer d'onglet |

#### Critères d'acceptation Phase 6
- [ ] Templates disponibles au démarrage
- [ ] Travail restauré après refresh
- [ ] Raccourcis clavier fonctionnels
- [ ] UI responsive (mobile/tablet)
- [ ] Chargement plugins exemple possible

---

## Spécifications détaillées

### Autocomplete Monaco - Configuration

```typescript
// GLSLCompletions.ts
class GLSLCompletionProvider implements monaco.languages.CompletionItemProvider {
  private geometryType: GeometryType;
  private includedLibraries: Set<string>;

  provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.languages.CompletionList {
    const lineContent = model.getLineContent(position.lineNumber);

    // Détection contexte
    if (this.isIncludeContext(lineContent)) {
      return this.getLibraryCompletions();
    }

    if (this.isVaryingContext(lineContent)) {
      return this.getVaryingCompletions(this.geometryType);
    }

    // Fonctions des bibliothèques incluses
    return this.getFunctionCompletions(this.includedLibraries);
  }
}
```

### ShaderCompiler - Validation

```typescript
// ShaderCompiler.ts
class ShaderCompiler {
  private gl: WebGLRenderingContext;

  compile(
    fragmentShader: string,
    vertexShader: string
  ): CompilationResult {
    // Préprocesser #include
    const processedFragment = this.preprocess(fragmentShader);
    const processedVertex = this.preprocess(vertexShader);

    // Compiler
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, processedFragment);
    const vertShader = this.compileShader(gl.VERTEX_SHADER, processedVertex);

    // Extraire erreurs avec numéros de ligne
    return {
      success: fragShader.success && vertShader.success,
      errors: [...fragShader.errors, ...vertShader.errors],
      warnings: [...fragShader.warnings, ...vertShader.warnings]
    };
  }

  private parseError(log: string): CompilationError[] {
    // Parse "ERROR: 0:15: 'v_uv' : undeclared identifier"
    const regex = /ERROR:\s*\d+:(\d+):\s*(.+)/g;
    // ...
  }
}
```

### CodeGenerator - Génération TypeScript

```typescript
// CodeGenerator.ts
class CodeGenerator {
  generateShaderFile(shader: ShaderDraft): string {
    return `
import type { ShaderDefinition, ConfigSchema } from 'maplibre-animated-shaders';
import type { ${shader.name}Config } from '../types';

const defaultConfig: ${shader.name}Config = ${JSON.stringify(shader.defaultConfig, null, 2)};

const configSchema: ConfigSchema = ${JSON.stringify(shader.configSchema, null, 2)};

export const ${shader.name}Shader: ShaderDefinition<${shader.name}Config> = {
  name: '${shader.name}',
  displayName: '${shader.displayName}',
  description: '${shader.description}',
  geometry: '${shader.geometry}',
  tags: ${JSON.stringify(shader.tags)},

  fragmentShader: \`
${shader.fragmentShader}
  \`,

  defaultConfig,
  configSchema,

  getUniforms: (config, time) => ({
    u_time: time * config.speed,
    // ... autres uniforms
  }),
};
`.trim();
  }
}
```

---

## Dépendances

### package.json

```json
{
  "name": "@maplibre-animated-shaders/playground",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "monaco-editor": "^0.45.0",
    "jszip": "^3.10.1"
  },
  "devDependencies": {
    "vite": "^5.0.10",
    "typescript": "^5.3.0"
  },
  "peerDependencies": {
    "maplibre-gl": ">=3.0.0"
  }
}
```

### Workspace dependency

```json
{
  "dependencies": {
    "maplibre-animated-shaders": "workspace:*"
  }
}
```

---

## Déploiement

### Build

```bash
# Développement
npm run dev:playground

# Production build
npm run build:playground

# Preview production
npm run preview:playground
```

### Configuration Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

export default defineConfig({
  base: '/playground/',
  plugins: [
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService'],
      customWorkers: []
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
```

### Hébergement

- **GitHub Pages** : `/playground/` sur le site principal
- **Netlify/Vercel** : Déploiement statique automatique
- **NPM** : Optionnel, package publishable séparément

---

## Critères de succès

### Métriques fonctionnelles

| Métrique | Objectif |
|----------|----------|
| Temps compilation shader | < 100ms |
| FPS preview | 60 FPS stable |
| Taille bundle | < 3MB (Monaco inclus) |
| Temps chargement initial | < 2s |

### Métriques utilisateur

| Métrique | Objectif |
|----------|----------|
| Temps création premier plugin | < 30 min |
| Plugins exportés compilent | 100% |
| Utilisateurs satisfaits | > 80% |

### Checklist finale

- [ ] L'application fonctionne offline (après chargement initial)
- [ ] Pas de backend requis
- [ ] Export génère du code TypeScript valide
- [ ] Documentation intégrée (varyings, fonctions)
- [ ] Auto-save évite la perte de travail
- [ ] Responsive mobile/tablet

---

## Fichiers de référence

Ces fichiers de la bibliothèque principale doivent être consultés pour la génération de code :

| Fichier | Usage |
|---------|-------|
| `packages/lib/src/types/plugin.ts` | Interface ShaderPlugin |
| `packages/lib/src/types/core.ts` | ShaderDefinition, ConfigSchema |
| `packages/lib/src/utils/shader-varyings.ts` | Varyings par géométrie |
| `packages/lib/src/glsl/preprocessor.ts` | Logique #include |
| `packages/lib/src/plugins/builtin/example/` | Format sortie référence |

---

## Historique des modifications

| Date | Version | Changements |
|------|---------|-------------|
| 2026-01-07 | 1.0 | Création du document |
