# MapLibre Animated Shaders Library — Architecture

## Vue d'ensemble

**maplibre-animated-shaders** est une bibliothèque modulaire de shaders GLSL animés pour MapLibre GL JS. Elle permet d'ajouter des effets visuels dynamiques aux couches de carte avec une API déclarative et configurable.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application utilisateur                     │
├─────────────────────────────────────────────────────────────────┤
│                     maplibre-gl-shaders                          │
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
maplibre-gl-shaders/
├── src/
│   ├── index.ts                    # Export principal
│   ├── ShaderManager.ts
│   ├── AnimationLoop.ts
│   ├── ShaderRegistry.ts
│   ├── ConfigResolver.ts
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
npm install maplibre-gl-shaders
```

### Intégration en 3 lignes

```typescript
import { applyShader } from 'maplibre-gl-shaders';

const map = new maplibregl.Map({ container: 'map', style: '...' });

// Appliquer un shader à une couche existante
applyShader(map, 'my-layer', 'pulse');
```

C'est tout ! Le shader est actif et animé.

### Usage avec configuration

```typescript
import { applyShader } from 'maplibre-gl-shaders';

applyShader(map, 'traffic-layer', 'flow', {
  speed: 2.0,
  color: '#ff6b6b',
  dashLength: 15,
  direction: 'forward'
});
```

### Usage avancé avec contrôle

```typescript
import { createShaderManager } from 'maplibre-gl-shaders';

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
import { applyShader, removeShader, listShaders } from 'maplibre-gl-shaders';

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
import { useShader } from 'maplibre-gl-shaders/react';

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
import { applyShader, presets } from 'maplibre-gl-shaders';

// Presets prédéfinis pour cas d'usage courants
applyShader(map, 'traffic', 'flow', presets.traffic.congestion);
applyShader(map, 'alerts', 'pulse', presets.alerts.critical);
applyShader(map, 'selection', 'ripple', presets.ui.selection);
```

### Création de shader custom

```typescript
import { defineShader, registerShader, applyShader } from 'maplibre-gl-shaders';

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
