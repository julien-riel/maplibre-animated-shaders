# Plan d'amélioration - maplibre-animated-shaders

Ce document détaille les améliorations à apporter suite au retour d'expérience d'un développeur créant un plugin "fire".

## Résumé

| Priorité | Amélioration | Effort | Impact |
|----------|--------------|--------|--------|
| 🔴 Haute | Documentation des varyings | Faible | Élevé |
| 🔴 Haute | Erreurs de linking shader améliorées | Moyen | Élevé |
| 🟡 Moyenne | Clarification precision float | Faible | Moyen |
| 🟡 Moyenne | Système d'includes GLSL | Moyen | Élevé |
| 🟢 Basse | Hot-reload des shaders | Élevé | Moyen |
| 🟢 Basse | Shader playground | Élevé | Moyen |
| 🟡 Moyenne | Validation du schéma | Moyen | Moyen |
| 🟡 Moyenne | Documentation textures | Faible | Moyen |

---

## 1. Documentation des varyings par géométrie

### Problème
Les développeurs doivent fouiller dans le code source pour découvrir quels varyings sont disponibles pour chaque type de géométrie. Le feedback mentionne que `v_uv` n'existe pas pour les points et que `v_pos.y` représente la distance perpendiculaire pour les lignes.

### Solution
Ajouter une section dédiée dans `docs/PLUGIN_PERFORMANCE_GUIDE.md.md` avec un tableau clair des varyings disponibles.

### Fichiers à modifier
- `docs/PLUGIN_PERFORMANCE_GUIDE.md`

### Contenu à ajouter

```markdown
## Varyings disponibles par géométrie

### Point (`geometry: 'point'`)

| Varying | Type | Description |
|---------|------|-------------|
| `v_pos` | `vec2` | Position dans le quad (-1 à 1). Utilisez `length(v_pos)` pour la distance au centre. |
| `v_index` | `float` | Index du point dans la source de données |
| `v_timeOffset` | `float` | Décalage temporel pour désynchroniser les animations |
| `v_effectiveTime` | `float` | Temps d'animation effectif (gère pause/play automatiquement) |
| `v_color` | `vec4` | Couleur data-driven (RGBA, valeurs 0-1) |
| `v_intensity` | `float` | Intensité data-driven |
| `v_useDataDrivenColor` | `float` | Flag (0.0 ou 1.0) indiquant si la couleur est data-driven |
| `v_useDataDrivenIntensity` | `float` | Flag (0.0 ou 1.0) indiquant si l'intensité est data-driven |

⚠️ **Note**: Les points n'ont PAS de `v_uv`. Utilisez `v_pos` à la place.

### Line (`geometry: 'line'`)

| Varying | Type | Description |
|---------|------|-------------|
| `v_pos` | `vec2` | Position dans le segment. `v_pos.x` = position le long (-1 à 1), `v_pos.y` = distance perpendiculaire (-1 à 1) |
| `v_progress` | `float` | Progression le long de la ligne complète (0 à 1) |
| `v_line_index` | `float` | Index de la ligne dans la source |
| `v_width` | `float` | Largeur de la ligne en pixels |
| `v_timeOffset` | `float` | Décalage temporel |
| `v_effectiveTime` | `float` | Temps d'animation effectif |
| `v_color` | `vec4` | Couleur data-driven |
| `v_intensity` | `float` | Intensité data-driven |
| `v_useDataDrivenColor` | `float` | Flag couleur data-driven |
| `v_useDataDrivenIntensity` | `float` | Flag intensité data-driven |

⚠️ **Note**: Pour les lignes, `v_pos.y` représente la distance perpendiculaire au centre de la ligne, pas la progression.

### Polygon (`geometry: 'polygon'`)

| Varying | Type | Description |
|---------|------|-------------|
| `v_pos` | `vec2` | Position du vertex en coordonnées Mercator |
| `v_uv` | `vec2` | Coordonnées UV normalisées dans les bounds du polygone (0 à 1) |
| `v_centroid` | `vec2` | Centre du polygone en coordonnées Mercator |
| `v_polygon_index` | `float` | Index du polygone |
| `v_screen_pos` | `vec2` | Position en pixels sur l'écran |
| `v_timeOffset` | `float` | Décalage temporel |
| `v_effectiveTime` | `float` | Temps d'animation effectif |
| `v_color` | `vec4` | Couleur data-driven |
| `v_intensity` | `float` | Intensité data-driven |
| `v_useDataDrivenColor` | `float` | Flag couleur data-driven |
| `v_useDataDrivenIntensity` | `float` | Flag intensité data-driven |

### Global (`geometry: 'global'`)

| Varying | Type | Description |
|---------|------|-------------|
| `v_uv` | `vec2` | Coordonnées UV du viewport (0 à 1) |
```

---

## 2. Amélioration des erreurs de linking shader

### Problème
Le message `FRAGMENT varying v_uv does not match any VERTEX varying` est clair mais ne liste pas les varyings disponibles.

### Solution
Enrichir les messages d'erreur pour inclure la liste des varyings disponibles selon le type de géométrie.

### Fichiers à modifier
- `packages/lib/src/layers/BaseShaderLayer.ts` (ou le fichier qui gère la compilation des shaders)

### Implémentation proposée

```typescript
// Dans BaseShaderLayer.ts ou ShaderCompiler.ts

const AVAILABLE_VARYINGS: Record<GeometryType, string[]> = {
  point: [
    'v_pos', 'v_index', 'v_timeOffset', 'v_effectiveTime',
    'v_color', 'v_intensity', 'v_useDataDrivenColor', 'v_useDataDrivenIntensity'
  ],
  line: [
    'v_pos', 'v_progress', 'v_line_index', 'v_width', 'v_timeOffset', 'v_effectiveTime',
    'v_color', 'v_intensity', 'v_useDataDrivenColor', 'v_useDataDrivenIntensity'
  ],
  polygon: [
    'v_pos', 'v_uv', 'v_centroid', 'v_polygon_index', 'v_screen_pos', 'v_timeOffset', 'v_effectiveTime',
    'v_color', 'v_intensity', 'v_useDataDrivenColor', 'v_useDataDrivenIntensity'
  ],
  global: ['v_uv']
};

private handleShaderError(gl: WebGLRenderingContext, error: string, geometryType: GeometryType): void {
  // Détecter les erreurs de varying manquant
  const varyingMatch = error.match(/varying\s+(\w+)\s+does not match/i);

  if (varyingMatch) {
    const missingVarying = varyingMatch[1];
    const available = AVAILABLE_VARYINGS[geometryType];

    console.error(`Shader error: '${missingVarying}' is not available for ${geometryType} geometry.`);
    console.error(`Available varyings for ${geometryType}:`);
    console.error(available.map(v => `  - ${v}`).join('\n'));

    // Suggestion de remplacement
    if (missingVarying === 'v_uv' && geometryType === 'point') {
      console.error(`Hint: For points, use 'v_pos' instead of 'v_uv'. v_pos ranges from -1 to 1.`);
    }
  }

  throw new Error(`Shader compilation failed: ${error}`);
}
```

### Mode debug optionnel

```typescript
// Option de configuration pour activer le mode debug
interface ShaderManagerOptions {
  debug?: boolean;
}

// En mode debug, logger les varyings au moment de la compilation
if (this.options.debug) {
  console.log(`[ShaderLayer] Compiling shader for ${geometryType}`);
  console.log(`[ShaderLayer] Available varyings:`, AVAILABLE_VARYINGS[geometryType]);
}
```

---

## 3. Clarification precision float (mediump vs highp)

### Problème
Le guide recommande `mediump` pour la performance mais les exemples utilisent `highp`. Des problèmes de précision surviennent sur certains calculs de distance.

### Solution
Documenter clairement quand utiliser chaque niveau de précision.

### Fichiers à modifier
- `docs/PLUGIN_PERFORMANCE_GUIDE.md`

### Contenu à ajouter

```markdown
## Précision float : mediump vs highp

### Recommandation générale

```glsl
// Recommandé pour la plupart des shaders
precision highp float;
```

### Quand utiliser highp (recommandé par défaut)

Utilisez `highp` quand votre shader effectue :
- Calculs de distance (`length()`, `distance()`)
- Opérations sur les coordonnées géographiques
- Calculs impliquant de petits incréments (ex: animations précises)
- Fonctions de bruit avec de nombreuses itérations
- Tout calcul où la précision impacte le rendu visuel

```glsl
precision highp float;

void main() {
  float dist = length(v_pos);  // highp nécessaire pour précision
  float noise = fbm(v_uv * 100.0);  // highp pour éviter les artefacts
}
```

### Quand utiliser mediump

`mediump` peut être utilisé pour :
- Calculs simples de couleur
- Opérations avec des valeurs bornées (0-1)
- Shaders très simples sans calculs géométriques

```glsl
// Acceptable pour un shader très simple
precision mediump float;

void main() {
  vec3 color = mix(vec3(1,0,0), vec3(0,0,1), v_uv.x);
  gl_FragColor = vec4(color, 1.0);
}
```

### Performance

La différence de performance entre `mediump` et `highp` est négligeable sur la plupart des appareils modernes. Privilégiez `highp` pour éviter les bugs visuels difficiles à diagnostiquer.

### Problèmes courants avec mediump

| Symptôme | Cause | Solution |
|----------|-------|----------|
| Cercles deviennent des polygones | Précision insuffisante pour `length()` | Passer à `highp` |
| Bruit qui "saute" | Accumulation d'erreurs de précision | Passer à `highp` |
| Animations saccadées | Temps avec décimales perdues | Passer à `highp` |
```

---

## 4. Système d'includes GLSL

### Problème
Les utilitaires GLSL (noise, easing, SDF) doivent être inclus manuellement via des template literals, ce qui est verbeux.

### Solution actuelle (documentation)
La documentation montre déjà l'utilisation de `${glsl.noise}` etc. Mais le développeur souhaite un système type `#include`.

### Solution proposée : Préprocesseur GLSL simplifié

### Fichiers à créer/modifier
- `packages/lib/src/glsl/preprocessor.ts` (nouveau)
- `packages/lib/src/glsl/index.ts` (export)

### Implémentation

```typescript
// packages/lib/src/glsl/preprocessor.ts

import { noise, easing, colors, shapes } from './libraries';

const GLSL_LIBRARIES: Record<string, string> = {
  noise,
  easing,
  colors,
  shapes,
  // Combinaisons courantes
  all: [noise, easing, colors, shapes].join('\n'),
};

/**
 * Préprocesseur GLSL simplifié
 * Supporte: #include <library_name>
 */
export function preprocessGLSL(source: string): string {
  return source.replace(
    /#include\s*<(\w+)>/g,
    (match, libraryName) => {
      const library = GLSL_LIBRARIES[libraryName];
      if (!library) {
        console.warn(`Unknown GLSL library: ${libraryName}`);
        console.warn(`Available libraries: ${Object.keys(GLSL_LIBRARIES).join(', ')}`);
        return `// Unknown library: ${libraryName}`;
      }
      return `// --- Begin ${libraryName} ---\n${library}\n// --- End ${libraryName} ---`;
    }
  );
}

// Exemple d'utilisation dans defineShader
export function defineShader<T extends ShaderConfig>(definition: ShaderDefinition<T>): ShaderDefinition<T> {
  return {
    ...definition,
    fragmentShader: preprocessGLSL(definition.fragmentShader),
    vertexShader: definition.vertexShader ? preprocessGLSL(definition.vertexShader) : undefined,
  };
}
```

### Exemple d'utilisation

```glsl
precision highp float;

#include <noise>
#include <shapes>

uniform float u_time;
varying vec2 v_pos;

void main() {
  float n = fbm(v_pos * 4.0 + u_time, 4);  // fbm disponible via noise
  float circle = sdCircle(v_pos, 0.5);      // sdCircle disponible via shapes
  gl_FragColor = vec4(vec3(n), fillAA(circle, 0.01));
}
```

---

## 5. Hot-reload des shaders (optionnel, effort élevé)

### Problème
Modifier un shader nécessite un refresh complet de la page.

### Solution proposée
Implémenter un mécanisme de hot-reload pour les shaders en mode développement.

### Approche

```typescript
// packages/lib/src/dev/hot-reload.ts

export class ShaderHotReload {
  private watcher: FileWatcher | null = null;
  private manager: IShaderManager;

  constructor(manager: IShaderManager) {
    this.manager = manager;
  }

  /**
   * Active le hot-reload pour un plugin
   * Note: Nécessite un bundler avec HMR (Vite, Webpack)
   */
  enable(plugin: ShaderPlugin): void {
    if (import.meta.hot) {
      import.meta.hot.accept(() => {
        // Recharger les shaders sans refresh page
        this.reloadShaders(plugin);
      });
    }
  }

  private reloadShaders(plugin: ShaderPlugin): void {
    // Pour chaque layer enregistré avec ce plugin
    const registeredLayers = this.manager.getRegisteredLayers();

    for (const layer of registeredLayers) {
      if (layer.plugin === plugin.name) {
        // Recompiler le shader
        this.manager.recompileShader(layer.layerId);
      }
    }

    console.log(`[HotReload] Reloaded ${plugin.name} shaders`);
  }
}
```

### Intégration Vite

```typescript
// vite.config.ts pour le développement de plugins
export default defineConfig({
  plugins: [
    glslHotReload()  // Plugin Vite custom pour .glsl files
  ]
});
```

---

## 6. Shader Playground (optionnel, effort élevé)

### Problème
Pas d'outil pour tester les shaders en temps réel.

### Solution proposée
Créer une application web dédiée dans `packages/playground`.

### Structure proposée

```
packages/playground/
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── ShaderEditor.tsx      # Monaco editor pour GLSL
│   │   ├── PreviewPanel.tsx      # Canvas WebGL avec preview
│   │   ├── ConfigPanel.tsx       # Contrôles pour les uniforms
│   │   └── GeometrySelector.tsx  # Choix point/line/polygon
│   ├── presets/
│   │   ├── point-examples.ts
│   │   ├── line-examples.ts
│   │   └── polygon-examples.ts
│   └── utils/
│       └── shader-compiler.ts
├── index.html
└── package.json
```

### Fonctionnalités clés

1. **Éditeur GLSL** avec syntax highlighting
2. **Preview temps réel** pour les 3 types de géométrie
3. **Panneau de configuration** généré depuis le configSchema
4. **Erreurs en ligne** avec highlighting
5. **Export du code** pour copier/coller dans un plugin
6. **Exemples pré-chargés** pour chaque type de géométrie

---

## 7. Validation du schéma et génération UI

### Problème
Le `configSchema` ne génère pas automatiquement de validations TypeScript ni de contrôles UI.

### Solution
Ajouter des utilitaires pour générer des types et composants UI depuis le schema.

### Fichiers à créer
- `packages/lib/src/utils/schema-validator.ts`
- `packages/lib/src/utils/schema-to-type.ts`

### Implémentation

```typescript
// packages/lib/src/utils/schema-validator.ts

export function validateConfig<T>(
  config: T,
  schema: ConfigSchema
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, param] of Object.entries(schema)) {
    const value = (config as Record<string, unknown>)[key];

    if (value === undefined && param.default === undefined) {
      errors.push(`Missing required field: ${key}`);
      continue;
    }

    switch (param.type) {
      case 'number':
        if (typeof value !== 'number') {
          errors.push(`${key} must be a number`);
        } else {
          if (param.min !== undefined && value < param.min) {
            errors.push(`${key} must be >= ${param.min}`);
          }
          if (param.max !== undefined && value > param.max) {
            errors.push(`${key} must be <= ${param.max}`);
          }
        }
        break;

      case 'color':
        if (typeof value !== 'string' || !isValidColor(value)) {
          errors.push(`${key} must be a valid color string`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${key} must be a boolean`);
        }
        break;

      case 'select':
        if (param.options && !param.options.some(o => o.value === value)) {
          errors.push(`${key} must be one of: ${param.options.map(o => o.value).join(', ')}`);
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

// Génération de type TypeScript (pour documentation/dev tools)
export function generateTypeDefinition(schema: ConfigSchema): string {
  const lines = ['interface Config {'];

  for (const [key, param] of Object.entries(schema)) {
    const tsType = paramToTsType(param);
    const comment = param.description ? `  /** ${param.description} */\n` : '';
    lines.push(`${comment}  ${key}: ${tsType};`);
  }

  lines.push('}');
  return lines.join('\n');
}

function paramToTsType(param: ConfigParamSchema): string {
  switch (param.type) {
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'color': return 'string';
    case 'string': return 'string';
    case 'select':
      return param.options?.map(o => `'${o.value}'`).join(' | ') || 'string';
    default:
      return 'unknown';
  }
}
```

---

## 8. Documentation des textures

### Problème
Le guide mentionne les textures mais pas d'exemple concret.

### Solution
Ajouter une section dédiée aux textures dans le [PLUGIN_GUIDE](PLUGIN_PERFORMANCE_GUIDE.md).

### Contenu à ajouter dans PLUGIN_PERFORMANCE_GUIDE.md

```markdown
## Utilisation des textures

### Créer un shader avec texture

```typescript
const texturedShader = defineShader({
  name: 'textured',
  geometry: 'polygon',

  fragmentShader: `
    precision highp float;

    uniform sampler2D u_texture;
    uniform float u_time;

    varying vec2 v_uv;
    varying float v_effectiveTime;

    void main() {
      // Échantillonner la texture
      vec4 texColor = texture2D(u_texture, v_uv);

      // Animer
      float wave = sin(v_effectiveTime + v_uv.x * 10.0) * 0.5 + 0.5;

      gl_FragColor = texColor * wave;
    }
  `,

  // Déclarer les textures requises
  textures: ['u_texture'],

  defaultConfig: {
    textureUrl: '/textures/pattern.png',
    speed: 1.0
  },

  getUniforms: (config, time) => ({
    u_time: time * config.speed
  }),

  // Callback pour charger les textures
  loadTextures: async (config, gl) => {
    const texture = await loadTexture(gl, config.textureUrl);
    return {
      u_texture: texture
    };
  }
});
```

### Utilitaire de chargement de texture

```typescript
// Fonction utilitaire fournie par la librairie
import { loadTexture } from 'maplibre-animated-shaders/utils';

async function loadTexture(
  gl: WebGLRenderingContext,
  url: string
): Promise<WebGLTexture> {
  return new Promise((resolve, reject) => {
    const texture = gl.createTexture();
    const image = new Image();

    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      resolve(texture);
    };

    image.onerror = reject;
    image.src = url;
  });
}
```

### Bonnes pratiques pour les textures

1. **Tailles en puissance de 2** : Préférez 256x256, 512x512, etc.
2. **Format** : PNG pour transparence, JPEG pour photos
3. **Répétition** : Utilisez `gl.REPEAT` pour les patterns
4. **Mipmaps** : Générez des mipmaps pour les textures zoomables
5. **Mémoire** : Libérez les textures non utilisées avec `gl.deleteTexture()`
```

---

## Plan d'exécution

### Phase 1 : Documentation (priorité haute, 1-2 jours) ✅
1. [x] Ajouter tableau des varyings dans PLUGIN_PERFORMANCE_GUIDE.md
2. [x] Clarifier mediump vs highp
3. [x] Ajouter section textures

### Phase 2 : Erreurs améliorées (priorité haute, 2-3 jours) ✅
1. [x] Créer constante AVAILABLE_VARYINGS
2. [x] Améliorer messages d'erreur shader
3. [x] Ajouter mode debug optionnel

### Phase 3 : Préprocesseur GLSL (priorité moyenne, 2-3 jours) ✅
1. [x] Créer preprocessor.ts
2. [x] Intégrer dans defineShader()
3. [x] Documenter la syntaxe #include

### Phase 4 : Validation schema (priorité moyenne, 1-2 jours) ✅
1. [x] Créer schema-validator.ts
2. [x] Ajouter validation automatique
3. [x] Générer types TypeScript

### Phase 5 : Hot-reload et Playground (priorité basse, optionnel)
1. [ ] Implémenter hot-reload basique
2. [ ] Créer structure playground
3. [ ] MVP fonctionnel

---

## Métriques de succès

- [ ] Un nouveau développeur peut créer un plugin sans lire le code source
- [ ] Les erreurs de shader indiquent clairement les varyings disponibles
- [ ] Le temps de développement itératif est réduit de 50%
- [ ] Note de satisfaction développeur : 8+/10
