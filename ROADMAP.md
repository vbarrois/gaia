# Gaïa — ROADMAP & état des lieux

Source de vérité boucle : [`BRIEF-LOOP.md`](./BRIEF-LOOP.md).  
Ce fichier = **suivi produit** (pas du code). Sauf demande explicite : discuter / préciser ici.

**Compétence non négociable :** voir la météo, agir *avant*.  
**Contrat :** Boun = SIG (montre & déplace) · Vincent = partie (1 geste → résolution → seuil).

**Docs companion :**
| Fichier | Rôle |
|---|---|
| [`FEATURES.md`](./FEATURES.md) | Inventaire capacités (Godot + legacy JS) |
| [`BACKLOG.md`](./BACKLOG.md) | Backlog technique Godot (`G-*`) |
| [`docs/godot/ARCHITECTURE.md`](./docs/godot/ARCHITECTURE.md) | Arborescence & managers Godot |

---

## 0. Migration Godot (2026-10-13) — **piste active**

Décision : le **jeu cible** se construit en **Godot 4.7** dans ce repo.  
Le proto **JS / Three.js** reste tant que la parité n’est pas là ; cleanup JS = fin de migration (`G4-2`).

| Domaine | Statut Godot | Note |
|---|---|---|
| Socle projet + arborescence | **done** | `scenes/`, `scripts/`, Autoloads |
| Managers | **done** | Game, World, Chunk, Input, Time |
| DrawMap + Perlin | **done** | port `perlinGaya` |
| Terrain **3D** chunké | **done** | mesh flat + orbit + eau + fog |
| Opti streaming | **done** | pool, LOD, budget build / frame |
| Chunks + map extensible | **done** | streaming `load_radius` — fit reconquête |
| Simu éco / boucle brief | todo | oasis, lessivage, sources |
| Cleanup `js/` | frozen | pas avant parité |

**Next tech :** `G0-10` (feel F5) → `G1-5` (Source + oasis marker) — détail dans [`BACKLOG.md`](./BACKLOG.md).

```
G0 socle + 3D ✓ → G1 SIG (source/arbres) → G2 chapitre Oasis → G3 tour/deck
                                         ↘ aligné P1–P5 produit
```

---

## 1. État des lieux proto JS (2026-10-12)

**Base code = ce repo** (`vbarrois/gaia`).  
On casse « importer depuis AllesLa » parce que le plateau Gaya est déjà ici. AllesLa n’est plus une dépendance de suivi.

### 1.1 Ce que le repo *était* / reste en JS (référence)

Prototype **atelier Gaya** + mini-simu éco temps réel (pas tour par tour).  
Pages : https://vbarrois.github.io/gaia/ · local `python3 -m http.server 4173`.  
**Nouveau runtime :** ouvrir `project.godot` dans Godot 4.7 → F5.

| Domaine | En place | Écart vs brief boucle v0 |
|---|---|---|
| **Produit** | Atelier relief + « créer un monde » + restaurer à la main | Pas de chapitre Oasis, pas de tours 8–12, pas de deck |
| **Compétence** | Réagir *pendant* le temps (1× / 3× / +1 j) | Brief : annonce J/J+1 → **1 action** → monde résout |
| **SIG / lecture** | Couches exclusives (select) | Brief : 5 layers **empilées** ; isolate = debug |
| **Plateau** | Relief procédural, eau, source, arbres, nuages | Pas de lisière ciblable, pas de naissance de source, pas de lessivage tour |

### 1.2 Features techniques & UX — OK (JS)

| Feature | Détail | Fichiers clés |
|---|---|---|
| Shell UI Gaya | Topbar, viewport sage, sidebar, dock, aide, tokens couleur | `index.html`, `css/style.css` |
| Atelier terrain | Seed, presets, curseurs, aperçu live, import/export JSON | `EditorManager`, `UiManager`, `config` |
| Monde 36×36 | Grille éco, Perlin, source oasis, stats / écoscore | `World.js`, `perlinGaya.js` |
| Rendu 3D | Mesh vertex colors, eau, brouillard `#bdcfc8`, lumières Gaya | `SceneManager`, `TerrainManager`, `colors.js` |
| Arbres | InstancedMesh (troncs / couronnes), règle veg Gaya | `trees.js` |
| Nuages | Champ Perlin, falloff bords, dérive bruit = vent | `clouds.js` |
| Pluie visuelle | Champ dérivant, liseré, couche Pluie, mini-carte | `World.driftWeather`, `buildRainOutline` |
| Couches affichage | Naturel, relief, Perlin, pluie, pollution, humidité, fertilité | `colors.js` + select UI |
| Actions pinceau | Observer, dépolluer, arroser, enrichir, planter, puiser | `actions.js`, `ActionManager`, `World.act` |
| Input Gaya | Tap vs drag, curseur zone (rayon), popup détail sélection | `InputManager`, `TerrainManager.setBrushCursor`, `#selectionPopup` |
| Ressources | Énergie / eau / compost / déchets isolés | `World` + HUD |
| Temps | Pause / 1× / 3× / +1 jour (~8 s/jour) | `TimeManager` |
| Persistance | Config + caméra + mute + couche — **pas** la progression | `userStore` |
| Tests | Suites Node (`node --test`) | `*.test.js` |

### 1.3 Gameplay actuel (boucle Gaya JS) — ce que le joueur fait

```
Aperçu (atelier) → Créer ce monde (pause)
  → choisir outil + rayon
    → clic court sur le terrain
      → optionnel : avancer le temps (jours)
        → viser écoscore ≥ 65
```

| Mécanique | Statut |
|---|---|
| Pollution / sol / humidité / végétation par case | Oui |
| Pluie aléatoire si nuages élevés ; zones `rains` | Oui (pas annoncé J+1) |
| Vent (force + angle lissé) pousse pluie & nuages | Oui (pas 4 dirs nommées, pas panneau) |
| Source ponctuelle + humidité oasis | Oui (pas enjeu win/lose dédié) |
| Win / lose narratifs brief | **Non** (objectif écoscore soft) |
| Deck / main 3 / 1 action par tour | **Non** |
| Naissance de nouvelles sources | **Non** |
| Lessivage tour-par-tour vers oasis | **Non** |
| Villes / routes | **Abandonné produit** (voir §1.5) |

### 1.4 Code legacy / hors boucle

| Élément | Note |
|---|---|
| `js/terrain/terrain.js`, `soil.js`, `perlin.js` | Ancien pipeline 100×100 / biomes — **peu ou pas branché** à la boucle Gaya actuelle |
| Mode atelier comme « la partie » | Explicitement **hors** brief (P6-3) — à garder comme outil plateau / R&D |

### 1.5 Décisions figées (ne pas casser sans écriture)

1. Le SIG est le **plateau**, jamais le jeu.  
2. v0 avant v1 (pollen / orage / feu).  
3. **Base code = ce repo** (plus d’import AllesLa obligatoire).  
4. `BRIEF-LOOP.md` + `ROADMAP.md` restent la doc de suivi (ne pas les écraser sans intention).  
5. **Godot = runtime cible** ; JS = référence jusqu’à parité.  
6. **On casse villes + routes** parce que les humains ont détruit puis disparu : pollution = héritage ; antagoniste = climat.  
7. **On casse le scénario Source→Lac urbain** parce que la progression = **étendre l’oasis** et **faire naître des sources**, pas sauver un lac de villes.  
8. **On casse Planter / Dépolluer séparés** parce que la dépollution = **phytoremédiation** : famille **Semis** à variantes (Mousses / Arbustes / Mycélium) ; pluie forcée hors famille.

---

## 2. Backlog (vers la boucle brief — reconquête)

Priorité haute → basse. IDs stables pour les chats agent.

### P0 — Socle dépôt

| ID | Statut | Item | Dépend |
|---|---|---|---|
| P0-1 | **done** | ~~Import AllesLa~~ — annulé : base = repo actuel | — |
| P0-2 | done | Inventaire plateau actuel vs boucle brief → §1 de ce fichier | — |
| P0-3 | **done** | README : atelier ≠ boucle ; liens brief + roadmap + Godot | — |
| P0-4 | done | **Q3** tranché : base visuelle / code = **ce repo** | — |
| P0-5 | wip | Socle Godot jouable (DrawMap + chunks) — voir `G0-*` | — |
| P0-6 | **done** | Brief reconquête sans villes/routes (2026-10-13) | — |

### P1 — Chapitre « Oasis » (tenir + 2ᵉ source)

| ID | Statut | Item |
|---|---|---|
| **P1-1** | **NEXT** | Carte départ : 1 source + oasis + hotspots pollution héritée |
| P1-2 | todo | Ciblage **autour sources / lisière vivante** seulement |
| P1-3 | todo | Sans joueur : oasis meurt en 4–5 saisons (lessivage et/ou sécheresse) |
| P1-4 | todo | Règle naissance 2ᵉ source (sol propre + humide + veg) |
| P1-5 | todo | Seuils win/lose (phrases du brief) |

### P2 — Météo tour par tour

| ID | Statut | Item |
|---|---|---|
| P2-1 | todo | Vent : 4 dirs × faible/fort ; déplace nuages (+ dérive poussière légère) |
| P2-2 | todo | Pluie : sec / fine / forte (humidifie + lessive) |
| **P2-3** | todo | Panneau **J + J+1** (bandeau une ligne) |
| P2-4 | todo | Résolution : vent → pluie → sol → arbres → check sources |

*Réemploi possible :* champs pluie/vent/nuages JS → à **rebrancher** sur annonce + résolution tour (Godot), pas sur le tick continu atelier.

### P3 — Tour joueur & deck

| ID | Statut | Item |
|---|---|---|
| P3-1 | todo | 8–12 saisons (**Q1**) |
| P3-2 | todo | Main 3, petite pioche (**Q2**) |
| P3-3 | todo | Une action, puis le monde joue |
| P3-4 | todo | Deck **Semis** (phyto) : variantes **Mousses** / **Arbustes** / **Mycélium** |
| P3-5 | cancelled | ~~Action Dépolluer~~ — fusionné dans P3-4 (famille Semis) |
| P3-6 | todo | Action **Forcer pluie** (×1 deck, hors famille Semis) (**Q5**) |

*Réemploi partiel :* `plant` / `clean` JS ≠ modèle brief ; mapper vers **Semis** (variantes), pas étendre le pinceau atelier.

### P4 — Lecture (5 layers empilées)

| ID | Statut | Item | vs actuel |
|---|---|---|---|
| P4-1 | todo | Nuages J + J+1 pointillés | Couche pluie exclusive (JS) |
| P4-2 | todo | Pollution héritée + hotspots | Couche pollution case |
| P4-3 | todo | Végétation = arbres / filtres joueur | Arbres veg auto |
| P4-4 | todo | Humidité sobre | Couche moisture |
| P4-5 | **done** | Vent = boussole HUD + traits animés (4 dirs × force) | `WindState` + WindCompass |
| P4-6 | todo | Plateau : relief, sources, oasis, cicatrices | Relief + source |
| P4-7 | todo | Isolate = debug | Select exclusif |

### P5 — Textes & validation v0

| ID | Statut | Item |
|---|---|---|
| P5-1 | todo | Intro 3 lignes (brief) |
| P5-2 | todo | Tour = bandeau |
| P5-3 | todo | Win : *« Une seconde source jaillit. La terre respire. »* |
| P5-4 | todo | Lose : *« La dernière source a bu le ciel sale. »* |
| P5-5 | todo | **Done quand** une partie se gagne **et** une se perd |

### P6 — Gelé (hors v0)

| ID | Statut | Item |
|---|---|---|
| P6-1 | frozen | Température, types de sol overlay, 3 calques air/sol/eau, risque/case |
| P6-2 | frozen | Combat, persos, inventaire, villes, routes, reconstruction humaine, gros deck |
| P6-3 | frozen | Atelier comme gameplay principal |
| P6-4 | frozen | Micro-gestion case à case en v0 |
| **P6-5** | frozen | v1 pollen / orage / feu — après P5-5 |
| P6-6 | frozen | Espèce lac / bassins naturels distincts — après v0 si besoin |

### v1 (après P5-5)

| ID | Statut | Item |
|---|---|---|
| V1-1 | frozen | Pollinisation + vent |
| V1-2 | frozen | Feu (orage + bois sec) ; humidité = garde-feu |
| V1-3 | frozen | Orage au panneau ; lose toujours par pollution / sécheresse |
| V1-4 | frozen | Front de reconquête 3ᵉ+ sources |

---

## 3. Backlog « dette / polish » du proto actuel (hors boucle)

Utile si on garde Gaya JS comme plateau SIG — **ne bloque pas** P1–P5.

| ID | Item |
|---|---|
| D1 | Ombres arbres (checkbox Gaya) — non porté |
| D2 | Rochers instanciés Gaya — non portés |
| D3 | Label sprite « SOURCE » — non porté |
| D4 | Shoreline mesh Gaya — non porté |
| D5 | Nettoyer / archiver `terrain.js` legacy 100×100 |
| D6 | Mute : icône SVG plutôt qu’emoji |

---

## 4. Questions ouvertes

| ID | Question | Impact |
|---|---|---|
| **Q1** | 8, 10 ou 12 saisons ? | P3-1 |
| **Q2** | Ratio deck Semis (Mousses / Arbustes / Mycélium) vs forcer pluie (×1) ? | P3-2 |
| Q3 | ~~Base visuelle Gaya vs AllesLa ?~~ | **Tranché : ce repo** |
| Q4 | ~~Chemin = route / lit d’eau ?~~ | **Caduc** (plus de route) |
| **Q5** | Forcer pluie : lisière seulement ou zone libre sous nuages ? | P3-6 |
| **Q6** | Seuils exacts naissance 2ᵉ source (pollution / humidité / veg) ? | P1-4 |

Décision figée : **« on casse X parce que Y »** (écrit §1.5).

---

## 5. Prochaine action

**Piste active = Godot** (`G0-6`) : valider le proto DrawMap+chunks dans l’éditeur.  
Ensuite enjeu produit : **P1-1 / G2-1** — chapitre Oasis (1 source, hotspots, pas de villes).

```
P0 (socle + Godot G0 + brief ✓) → G1 SIG → P1/G2 (Oasis + 2ᵉ source)
                                      ↘ P2 (météo) → P3 (deck)
                                      ↘ P4 (layers) ↗
                                               → P5 (textes + win/lose) → stop v0
                                                    → G4 cleanup JS
```
