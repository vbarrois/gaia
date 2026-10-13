# Gaïa — Backlog technique (Godot)

Backlog **implémentation**. Les IDs `G-*` sont stables pour les chats agent.  
Produit / boucle brief : voir aussi [`ROADMAP.md`](./ROADMAP.md) (P0–P5).  
Features inventaire : [`FEATURES.md`](./FEATURES.md).

Priorité : **haute → basse**. Statuts : `todo` · `wip` · `done` · `blocked` · `frozen` · `dropped`.

---

## G0 — Socle Godot

| ID | Statut | Item | Dépend |
|---|---|---|---|
| G0-1 | **done** | Arborescence scenes/scripts/resources + ARCHITECTURE | — |
| G0-2 | **done** | Autoloads Game / World / Chunk / Input / Time | G0-1 |
| G0-3 | **done** | Perlin + WorldConfig + biomes + CellData | G0-1 |
| G0-4 | **done** | DrawMap 2D legacy + streaming | G0-2, G0-3 |
| G0-5 | **done** | HUD debug + inspect / reseed | G0-4 |
| G0-6 | **done** | Terrain **3D** chunké (mesh Perlin + orbit + eau) | G0-4 |
| G0-7 | **done** | Opti 3D : pool, LOD, budget build, mat partagé, AABB | G0-6 |
| G0-8 | **done** | README / ARCHITECTURE alignés vue 3D | G0-6 |
| G0-9 | todo | Tests GDScript (GUT ou headless) Perlin / mesh builder | G0-3 |
| **G0-10** | **NEXT** | Feel caméra F5 (distances, fog, résolution) | G0-7 |

---

## G1 — Carte jouable (SIG plateau)

| ID | Statut | Item | Dépend |
|---|---|---|---|
| G1-1 | todo | Art / texture optionnelle (vertex color OK) | G0-6 |
| G1-2 | **done** | Hauteur / relief 3D lisible | G0-6 |
| G1-3 | todo | Layer pollution (héritage + hotspots) | G1-2 |
| G1-4 | todo | Layer humidité | G1-2 |
| G1-5 | todo | Placement Source + oasis (marker 3D) | G0-6 |
| G1-6 | **done** | Arbres MultiMesh conditionnels (veg > 25) | G0-6 |
| G1-7 | todo | Mini-carte / HUD non-debug | G0-5 |
| G1-8 | todo | Persistance seed + camera (ConfigFile / user://) | G0-2 |
| G1-9 | todo | Shadows LOD near seulement | G0-7 |

---

## G2 — Chapitre « Oasis » (aligné P1)

| ID | Statut | Item | Dépend |
|---|---|---|---|
| G2-1 | todo | Départ : 1 source + oasis + hotspots pollution | G1-5 |
| G2-2 | todo | Zones ciblables : sources / lisière vivante | G2-1 |
| G2-3 | todo | Lessivage pluie → migration pollution vers oasis | G1-3, G2-1 |
| G2-4 | todo | Sécheresse : humidité ↓, arbres meurent | G1-6 |
| G2-5 | todo | Naissance 2ᵉ source (seuils sol / humidité / veg) | G2-1, G1-6 |
| G2-6 | todo | Seuils win/lose chapitre (sans deck encore) | G2-5 |
| G2-7 | **dropped** | ~~Villes + route + lac urbain~~ | cassé produit |

---

## G3 — Boucle tour (aligné P2–P3)

| ID | Statut | Item | Dépend |
|---|---|---|---|
| G3-1 | todo | `TurnManager` : annonce → action → résolution | G2 |
| G3-2 | todo | Vent 4 dirs × faible/fort (+ dérive poussière légère) | G3-1 |
| G3-3 | todo | Pluie sec / fine / forte + bandeau J/J+1 | G3-1 |
| G3-4 | todo | Deck + main 3 + 1 action | G3-1 |
| G3-5 | todo | Deck Semis (Mousses / Arbustes / Mycélium) + forcer pluie | G3-4 |

---

## G4 — Migration & cleanup

| ID | Statut | Item | Dépend |
|---|---|---|---|
| G4-1 | todo | Parité features critiques JS → Godot | G1–G3 |
| G4-2 | frozen | Supprimer / archiver `js/`, `index.html`, Three CDN | **fin** migration |
| G4-3 | todo | CI : export Godot ou lint GDScript | G0-9 |
| G4-4 | todo | Pages GitHub → build Godot web (option) | G4-1 |

---

## Dettes connues (proto actuel)

| ID | Item |
|---|---|
| GD1 | Vue 2D TileMap = legacy debug (`draw_map.tscn`) |
| GD2 | Monde infini OK pour chunks ; chapitre Oasis peut borner un « front » jouable |
| GD3 | TimeManager avance les jours mais aucune simu éco branchée |
| GD4 | Input WASD peut conflictuer plus tard avec hotkeys outils |
| GD5 | Nuages 3D pas encore portés (arbres = G1-6 done) |
| GD6 | Seam chunks : hauteur OK ; couleurs = sample monde continu (plus de marches pollution/tuile) |

---

## Prochaine action

1. **G0-10** — F5 : valider feel orbit / fog / perf (tris HUD).  
2. Enchaîner **G1-5** (Source + oasis marker). Arbres = **G1-6 done**.  
3. Ne pas réintroduire villes/routes.  
4. Ne pas toucher au cleanup JS (`G4-2`) tant que la parité n’est pas là.
