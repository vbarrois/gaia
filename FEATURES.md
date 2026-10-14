# Gaïa — Features

Inventaire des capacités **produit / technique**.  
Statuts : `done` · `wip` · `todo` · `frozen` · `legacy-js` · `dropped`.

La boucle de jeu (win/lose, deck, météo tour) reste spécifiée dans [`BRIEF-LOOP.md`](./BRIEF-LOOP.md).  
Le suivi d’ordre d’implémentation : [`BACKLOG.md`](./BACKLOG.md) + [`ROADMAP.md`](./ROADMAP.md).  
Design éco riche (pollutions ×4, succession, graines) : [`docs/ECO-SYSTEM-ROADMAP.md`](./docs/ECO-SYSTEM-ROADMAP.md) (piste E / PDF).

---

## A. Runtime Godot (cible)

| ID | Statut | Feature | Notes |
|---|---|---|---|
| F-G0 | **done** | Projet Godot 4.7 + scène `main` | `project.godot`, F5 |
| F-G1 | **done** | Arborescence lisible (scenes / scripts / resources) | [`docs/godot/ARCHITECTURE.md`](./docs/godot/ARCHITECTURE.md) |
| F-G2 | **done** | Autoloads managers (Game, World, Chunk, Input, Time) | Miroir JS |
| F-G3 | **done** | Perlin seedé (port Gaya) | `scripts/world/perlin.gd` |
| F-G4 | **done** | DrawMap**3D** + caméra orbit | `draw_map_3d.tscn` (2D = legacy) |
| F-G5 | **done** | Chunks mesh 3D + streaming | pool + LOD + budget |
| F-G6 | **done** | Extension de map (Perlin continu) | Fit reconquête / front |
| F-G7 | **done** | Vertex colors natural (Gaya) | `terrain_colors.gd` |
| F-G8 | **done** | Inspect tuile + HUD debug (tris / queue) | clic / hover |
| F-G8b | **done** | Eau plane + fog `#bdcfc8` | port SceneManager |
| F-G9 | wip | Config monde éditable (Resource `.tres`) | + mesh_resolution / LOD |
| F-G10 | todo | TileSet art (PNG atlas) | remplace couleurs unies |
| F-G11 | wip | Couches SIG | Vent + overlays sol/humidité/pollution/fertilité (1–5) |
| F-G11b | **done** | Layer vent : boussole HUD + traits plan // tuiles | `WindState` / WindCompass |
| F-G12 | wip | Données éco live (jour) | moisture via source ; soil/pol baseline |
| F-G13 | **done** | Source + capillarité + fertilité dérivée | `WaterSource` / `EcoSim` |
| F-G14 | **done** | Hotspots pollution héritée | `PollutionHotspot` autour source |
| F-G15 | **done** | Arbres MultiMesh (fertilité ≥ seuil) | `tree_scatter.gd` / chunk 3D |
| F-G16 | wip | Migration pollution hydrique + particulaire (vent) | `EcoSim` ; pluie P2 ensuite |
| F-G17 | todo | Sécheresse (humidité ↓, arbres meurent) | pression sans villes |
| F-G18 | todo | Naissance nouvelle source | sol propre + humide + veg |
| F-G19 | todo | Météo tour (vent 4 dirs, pluie) | P2 |
| F-G20 | todo | Deck : Semis (Mousses / Arbustes / Mycélium) + forcer pluie | P3 |
| F-G21 | todo | Win / lose chapitre Oasis | P5 |
| F-G22 | todo | UI joueur (hors debug) | topbar, bandeau météo |
| F-G23 | todo | Persist save (config + partie) | |
| F-G24 | frozen | Atelier relief comme gameplay | hors brief (P6-3) |
| F-G25 | **dropped** | Villes + routes + lac urbain | cassé : humains disparus |
| F-G26 | todo | Système éco riche (biomasse / humus / 4 pol / graines) | piste E — [`ECO-SYSTEM-ROADMAP.md`](./docs/ECO-SYSTEM-ROADMAP.md) |

---

## B. Proto JS (legacy — à retirer en fin de migration)

| ID | Statut | Feature |
|---|---|---|
| F-J1 | legacy-js | Atelier Perlin + mesh Three.js |
| F-J2 | legacy-js | Monde 36×36 éco + actions pinceau |
| F-J3 | legacy-js | Temps réel 1×/3× + écoscore |
| F-J4 | legacy-js | Couches exclusives (select) |
| F-J5 | legacy-js | Nuages / pluie visuelle dérivante |

---

## C. Compétence produit (non négociable)

| ID | Statut | Feature |
|---|---|---|
| F-P1 | todo | Annonce météo J + J+1 **avant** l’action |
| F-P2 | todo | Une action puis résolution monde |
| F-P3 | todo | Lecture SIG ≠ micro-gestion case |
| F-P4 | todo | Progression = étendre zone vivante (pas nettoyer toute la map) |

---

## Légende rapide « où coder »

| Besoin | Dossier |
|---|---|
| Nouveau manager global | `scripts/autoload/` |
| Donnée / math pure | `scripts/world/` |
| Rendu carte / chunk | `scripts/map/` + `scenes/world/` |
| UI | `scripts/ui/` + `scenes/ui/` |
| Paramètres tweaks | `resources/configs/` |
