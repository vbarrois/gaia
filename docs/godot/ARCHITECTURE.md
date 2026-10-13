# Gaïa Godot — architecture & navigation

Guide pour démarrer dans le projet Godot (débutant OK).  
Le proto JS reste dans `js/` jusqu’à la fin de la migration.

---

## Arborescence

```
gaia/
├── project.godot
├── scenes/
│   ├── main/main.tscn           # F5 → DrawMap3D
│   ├── world/
│   │   ├── draw_map_3d.tscn     # Plateau 3D + caméra orbit + eau
│   │   ├── chunk_3d.tscn        # MeshInstance3D = 1 chunk
│   │   ├── draw_map.tscn        # (legacy 2D debug)
│   │   └── chunk.tscn           # (legacy TileMap 2D)
│   └── ui/debug_hud.tscn
├── scripts/
│   ├── autoload/
│   │   ├── game_manager.gd
│   │   ├── world_manager.gd
│   │   ├── chunk_manager.gd     # streaming + pool + LOD + budget
│   │   ├── input_manager.gd     # orbit / pan / zoom 3D
│   │   └── time_manager.gd
│   ├── world/                   # Perlin, biomes, config, cellules
│   ├── map/
│   │   ├── draw_map_3d.gd
│   │   ├── chunk_3d.gd
│   │   ├── terrain_mesh_builder.gd  # ArrayMesh flat-shaded
│   │   ├── terrain_colors.gd
│   │   ├── terrain_material.gd      # matériau partagé
│   │   ├── terrain_generator.gd
│   │   └── … 2D legacy …
│   └── ui/debug_hud.gd
└── resources/configs/world_defaults.tres
```

---

## Vue 3D (cible)

Équivalent JS : `SceneManager` + `TerrainManager`.

| Élément | Godot | JS |
|---|---|---|
| Relief | `ArrayMesh` / chunk, vertex colors | `BufferGeometry` |
| Caméra | orbit yaw/pitch + distance | `OrbitControls` |
| Eau | 1 `PlaneMesh` qui suit le focus | `PlaneGeometry` |
| Brouillard | `#bdcfc8` Environment | `Fog` |
| Streaming | chunks autour du focus | monde fixe 36×36 |

### Opti en place

1. **1 mesh / chunk** (pas 1 mesh / tuile)  
2. **Pool** de `MapChunk3D` (recycle, pas `queue_free` en boucle)  
3. **LOD** : résolution mesh selon distance Chebyshev au focus  
4. **Budget build** : N chunks / frame (`build_budget_per_frame`)  
5. **Matériau partagé** + `cast_shadow` off + GI off  
6. **Frustum culling** via `custom_aabb`  
7. **Eau unique** (pas d’eau par chunk)

Tweaks : `resources/configs/world_defaults.tres` → `mesh_resolution`, `lod_*`, `load_radius`, `build_budget_per_frame`.

---

## Qui fait quoi ? (managers)

| Autoload | Rôle |
|---|---|
| `GameManager` | États `BOOT` → `MAP` → `PLAYING` |
| `WorldManager` | Seed, config, Perlin, `build_cell` |
| `ChunkManager` | Load / unload / pool / LOD / file de build |
| `InputManager` | Orbit, pan, zoom, inspect |
| `TimeManager` | Pause / jours |

---

## Contrôles

| Input | Effet |
|---|---|
| Clic gauche + drag | Orbit |
| Clic droit + drag | Pan |
| Molette | Zoom |
| WASD / flèches | Déplacer le focus |
| Clic gauche court | Inspecter tuile |
| `T` | Vue dessus |
| `F` | Reset caméra |
| `R` | Nouvelle seed |
| `Espace` | Pause |

---

## Où ajouter la suite ?

| Feature | Où |
|---|---|
| Arbres MultiMesh | `chunk_3d` + `tree_scatter.gd` (**done**) |
| Vent lecture | boussole HUD + traits animés plan // tuiles (**done**) |
| Source / oasis marker | enfant de `DrawMap3D` |
| Layers SIG | 2ᵉ surface / overlay |
| Shadows proches | activer `cast_shadow` sur LOD near seulement |
