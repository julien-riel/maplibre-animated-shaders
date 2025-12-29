# Plan Phase 1 — Ce qui reste à faire

## Statut actuel

### Terminé

- **T1.1 — Shader Pulse** : Implémenté et fonctionnel
  - `src/shaders/points/pulse.ts` — Définition du shader avec config et getUniforms
  - `src/shaders/points/pulse.glsl` — Code GLSL du fragment shader
  - `src/shaders/points/index.ts` — Export du shader
  - `src/shaders/index.ts` — Registration dans le registry global
  - Build vérifié : `npm run build` passe

- **Structure de base du site démo** : Partiellement créée
  - `demo/index.html` — Page HTML principale
  - `demo/src/main.ts` — Point d'entrée (incomplet)
  - `demo/src/styles/main.css` — Styles complets (dark theme, 3 colonnes)

---

## À faire par l'équipe Front-end

### 1. Composants à implémenter

#### `demo/src/components/ShaderGallery.ts`
Liste des shaders disponibles organisée par géométrie (points/lignes/polygones/global).

```typescript
interface ShaderGallery {
  onSelect(callback: (shaderName: string) => void): void;
  select(shaderName: string): void;
}
```

Fonctionnalités :
- Afficher les shaders groupés par `geometry` (point, line, polygon, global)
- Preview animé miniature pour chaque shader
- État actif/sélectionné
- Utiliser `globalRegistry.getAll()` pour récupérer les shaders

---

#### `demo/src/components/ConfigPanel.ts`
Panneau de configuration dynamique basé sur le `configSchema` du shader.

```typescript
interface ConfigPanel {
  setShader(shader: ShaderDefinition, config: Record<string, unknown>): void;
  onChange(callback: (key: string, value: unknown) => void): void;
  onPlayPause(callback: (playing: boolean) => void): void;
}
```

Fonctionnalités :
- Générer automatiquement les contrôles depuis `shader.configSchema`
- Types de contrôles :
  - `number` → slider avec min/max/step
  - `color` → color picker
  - `boolean` → checkbox/toggle
  - `select` → dropdown
- Afficher la valeur actuelle à côté du label
- Boutons Play/Pause pour l'animation

---

#### `demo/src/components/CodePreview.ts`
Générateur de code snippet pour l'intégration.

```typescript
interface CodePreview {
  update(shaderName: string, config: Record<string, unknown>): void;
}
```

Fonctionnalités :
- Générer le code d'exemple basé sur la config actuelle
- Bouton "Copy to clipboard"
- Syntaxe highlighting (optionnel)

Exemple de code généré :
```javascript
import { createShaderManager, registerAllShaders } from 'maplibre-gl-shaders';

registerAllShaders();

const manager = createShaderManager(map);
manager.register('my-layer', 'pulse', {
  color: '#3b82f6',
  speed: 1.0,
  rings: 3,
  maxRadius: 50,
  fadeOut: true,
  thickness: 2
});
```

---

#### `demo/src/components/MapView.ts`
Wrapper MapLibre avec données de démo.

```typescript
interface MapView {
  applyShader(shaderName: string, config: Record<string, unknown>): void;
  updateConfig(config: Record<string, unknown>): void;
  play(): void;
  pause(): void;
  onReady(callback: () => void): void;
}
```

Fonctionnalités :
- Initialiser MapLibre GL JS avec un style de base (ex: MapTiler streets dark)
- Charger les données GeoJSON de démo
- Créer les layers pour points, lignes, polygones
- Appliquer le shader sélectionné via `ShaderManager`
- Mettre à jour la config en temps réel

---

#### `demo/src/components/PerformanceMonitor.ts`
Compteur FPS et métriques WebGL.

```typescript
interface PerformanceMonitor {
  start(): void;
  stop(): void;
}
```

Fonctionnalités :
- Afficher FPS en overlay sur la carte
- Indicateur couleur (vert > 50fps, jaune 30-50, rouge < 30)
- Optionnel : memory usage, draw calls

---

### 2. Données GeoJSON de démo

#### `demo/src/data/demo-points.geojson`
~50 POIs variés autour de Paris (ou autre ville).

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [2.3522, 48.8566] },
      "properties": { "name": "Eiffel Tower", "category": "landmark" }
    }
  ]
}
```

#### `demo/src/data/demo-lines.geojson`
Réseau routier simplifié (~200 segments).

#### `demo/src/data/demo-polygons.geojson`
10-15 zones/quartiers avec différentes tailles.

---

### 3. Configuration Vite pour la démo

#### `demo/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname),
  resolve: {
    alias: {
      '@lib': resolve(__dirname, '../src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: resolve(__dirname, '../dist-demo'),
  },
});
```

#### Ajouter dans `package.json` racine :

```json
{
  "scripts": {
    "dev:demo": "vite --config demo/vite.config.ts",
    "build:demo": "vite build --config demo/vite.config.ts"
  }
}
```

---

### 4. Fonctionnalités bonus (optionnel)

- **URL shareable** : Encoder shader + config dans l'URL pour partager une configuration
- **Responsive** : Drawer mobile pour sidebar et config panel
- **Export image** : Capturer un screenshot de la carte avec l'effet

---

## Structure finale attendue

```
demo/
├── index.html
├── vite.config.ts
├── src/
│   ├── main.ts
│   ├── components/
│   │   ├── ShaderGallery.ts
│   │   ├── ConfigPanel.ts
│   │   ├── CodePreview.ts
│   │   ├── MapView.ts
│   │   └── PerformanceMonitor.ts
│   ├── data/
│   │   ├── demo-points.geojson
│   │   ├── demo-lines.geojson
│   │   └── demo-polygons.geojson
│   └── styles/
│       └── main.css          ✅ (déjà créé)
└── public/
    └── og-image.png
```

---

## Comment tester

```bash
# Installer les dépendances
npm install

# Lancer le dev server de la démo
npm run dev:demo

# Build la librairie
npm run build
```

---

## Notes importantes

1. **Import de la lib** : Les composants doivent importer depuis `../../src` en dev, mais le build final utilisera le package npm.

2. **Style MapLibre** : Utiliser un style gratuit comme :
   - `https://demotiles.maplibre.org/style.json`
   - Ou un style MapTiler avec clé API gratuite

3. **Le shader Pulse** fonctionne actuellement en mode "paint property animation" (un seul cercle qui pulse). Pour les vrais cercles concentriques GLSL, il faudra implémenter un custom layer MapLibre.
