# Instanced Rendering - Roadmap d'intégration

## État actuel

### Ce qui existe déjà ✅

| Composant | Fichier | Status |
|-----------|---------|--------|
| `InstancedRenderer` | `src/webgl/InstancedRenderer.ts` | Complet (559 lignes) |
| `WebGLContext` | `src/webgl/WebGLContext.ts` | Complet avec support WebGL 1/2 |
| Support VAO | `WebGLContext` | Complet |
| Support `ANGLE_instanced_arrays` | `WebGLContext` | Complet (fallback WebGL 1) |
| Geometry helpers | `createQuadGeometry()`, `createLineGeometry()` | Complet |

### Ce qui N'est PAS utilisé ❌

Les layers actuels utilisent `gl.drawElements()` standard au lieu de `drawElementsInstanced()`:

```
PointShaderLayer.ts:466   → gl.drawElements(gl.TRIANGLES, ...)
LineShaderLayer.ts:580    → gl.drawElements(gl.TRIANGLES, ...)
PolygonShaderLayer.ts:703 → gl.drawElements(gl.TRIANGLES, ...)
```

---

## Tâches à réaliser

### Phase 1: PointShaderLayer (Candidat idéal)

#### 1.1 Refactorer le vertex shader
**Fichier:** `src/layers/PointShaderLayer.ts`

**Avant (actuel):**
```glsl
attribute vec2 a_pos;      // Position du point (dupliqué 4x par point)
attribute vec2 a_offset;   // Offset du quad (-1,-1 à 1,1)
attribute float a_index;   // Index du feature
```

**Après (instancé):**
```glsl
// Per-vertex (géométrie partagée)
attribute vec2 a_vertex;   // Quad unit (-0.5 à 0.5)
attribute vec2 a_uv;       // Coordonnées UV

// Per-instance (données de chaque point)
attribute vec2 a_position;     // Position Mercator du point
attribute float a_index;       // Index du feature
attribute float a_timeOffset;  // Décalage temporel
attribute vec4 a_color;        // Couleur (data-driven)
attribute float a_intensity;   // Intensité (data-driven)
```

#### 1.2 Modifier `buildBuffers()`
**Tâche:** Séparer les données de géométrie et d'instance

```typescript
// AVANT: vertexData contient 4 vertices × N points = 4N vertices
const vertexData = new Float32Array(this.points.length * 4 * 6);

// APRÈS:
// geometryData: 4 vertices (quad partagé) - STATIC
// instanceData: N points × attributs - DYNAMIC
private geometryBuffer: WebGLBuffer;  // Quad partagé
private instanceBuffer: WebGLBuffer;  // Données par point
```

#### 1.3 Intégrer `InstancedRenderer`

```typescript
import { InstancedRenderer, createQuadGeometry } from '../webgl/InstancedRenderer';
import { WebGLContext } from '../webgl/WebGLContext';

// Dans onAdd():
this.ctx = new WebGLContext(gl);
this.instancedRenderer = new InstancedRenderer(this.ctx);

const { vertices, indices, layout, stride } = createQuadGeometry();
this.instancedRenderer.setIndexedGeometry(vertices, indices, layout, stride);

// Dans buildBuffers():
const instanceData = this.buildInstanceData();
this.instancedRenderer.setInstanceData(instanceData, {
  stride: INSTANCE_STRIDE,
  attributes: [
    { name: 'a_position', location: 2, size: 2, type: gl.FLOAT, offset: 0 },
    { name: 'a_index', location: 3, size: 1, type: gl.FLOAT, offset: 8 },
    // ...
  ]
});

// Dans render():
this.instancedRenderer.draw(this.points.length);
```

#### 1.4 Conserver le fallback non-instancé

```typescript
private useInstancing: boolean;

constructor() {
  this.useInstancing = InstancedRenderer.isSupported(this.ctx);
}

render() {
  if (this.useInstancing) {
    this.renderInstanced(gl, matrix);
  } else {
    this.renderStandard(gl, matrix);  // Code actuel
  }
}
```

**Estimation:** ~200-300 lignes modifiées

---

### Phase 2: LineShaderLayer

#### Complexité supplémentaire
Les lignes sont plus complexes car:
- Chaque segment a 2 points (début/fin)
- Tessellation pour l'épaisseur
- Caps et joins

#### Approche recommandée
Utiliser l'instancing par **segment** plutôt que par ligne complète:

```glsl
// Per-instance: un segment de ligne
attribute vec2 a_startPos;   // Point de départ
attribute vec2 a_endPos;     // Point d'arrivée
attribute float a_progress;  // Position le long de la ligne (0-1)
```

**Estimation:** ~400-500 lignes modifiées (plus complexe)

---

### Phase 3: PolygonShaderLayer

#### Complexité
Les polygones sont les plus complexes:
- Triangulation dynamique (earcut)
- Nombre variable de triangles par polygone
- Pas de géométrie partageable

#### Approche recommandée
L'instancing est **moins bénéfique** pour les polygones car:
- Chaque polygone a une géométrie unique
- Pas de "forme de base" réutilisable

**Alternative:** Optimiser avec:
- Batching par groupes de polygones similaires
- Utiliser les VAO pour réduire les changements d'état

**Priorité:** Basse (gain minimal)

---

## Checklist détaillée

### PointShaderLayer

- [x] Créer une branche `feature/instanced-points`
- [x] Ajouter `WebGLContext` wrapper dans `BaseShaderLayer`
- [x] Modifier le vertex shader pour les attributs instancés
- [x] Créer `buildInstanceData()` séparé de `buildBuffers()`
- [x] Intégrer `InstancedRenderer` dans `onAdd()`
- [x] Modifier `render()` pour utiliser `instancedRenderer.draw()`
- [x] Conserver le fallback pour appareils sans support instancing
- [x] Mettre à jour les attributs data-driven pour l'instancing
- [x] Mettre à jour les attributs d'interaction pour l'instancing
- [x] Ajouter des tests unitaires
- [ ] Ajouter des benchmarks comparatifs
- [ ] Documenter les changements

### LineShaderLayer

- [ ] Analyser la faisabilité de l'instancing par segment
- [ ] Prototyper le shader instancé
- [ ] Évaluer l'impact sur les caps/joins
- [ ] Implémenter si le gain est significatif

### Infrastructure

- [ ] Exporter `InstancedRenderer` dans l'API publique
- [ ] Documenter l'utilisation pour les plugins custom
- [ ] Ajouter des métriques de performance pour l'instancing

---

## Gains de performance attendus

### PointShaderLayer (10,000 points)

| Métrique | Standard | Instancé | Gain |
|----------|----------|----------|------|
| Vertices uploadés | 40,000 | 4 + 10,000 | ~75% |
| Mémoire GPU | ~960 KB | ~240 KB | ~75% |
| Draw calls | 1 | 1 | = |
| Attribute setup/frame | Élevé | Faible (VAO) | ~50% |

### LineShaderLayer (1,000 lignes × 10 segments)

| Métrique | Standard | Instancé | Gain |
|----------|----------|----------|------|
| Vertices uploadés | ~80,000 | 6 + 10,000 | ~87% |
| Mémoire GPU | ~1.9 MB | ~240 KB | ~87% |

---

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Appareils sans support instancing | Moyen | Fallback automatique vers rendu standard |
| Régression visuelle | Élevé | Tests visuels automatisés |
| Performance pire sur petits datasets | Faible | Seuil minimum (ex: >100 features) |
| Complexité du code | Moyen | Abstraction via `InstancedRenderer` |

---

## Références

- [WebGL Instanced Rendering](https://webgl2fundamentals.org/webgl/lessons/webgl-instanced-drawing.html)
- [ANGLE_instanced_arrays Extension](https://developer.mozilla.org/en-US/docs/Web/API/ANGLE_instanced_arrays)
- Code existant: `src/webgl/InstancedRenderer.ts`
- Tests: `tests/webgl/InstancedRenderer.test.ts`
