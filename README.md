# Gaïa

Des siècles de surconsommation ont laissé une terre morte. Une source jaillit encore.  
Anticipe le vent et la pluie, dépollue, plante, fais naître de nouvelles sources — la nature reprend ses droits.

**Runtime cible : [Godot 4.7](https://godotengine.org/).**  
Le proto **HTML + JS / Three.js** reste dans le repo le temps de la migration (nettoyage à la fin).

| Doc | Pour quoi |
|---|---|
| [`BRIEF-LOOP.md`](./BRIEF-LOOP.md) | Spec boucle de jeu (produit) |
| [`ROADMAP.md`](./ROADMAP.md) | Suivi produit + état des lieux |
| [`FEATURES.md`](./FEATURES.md) | Inventaire features |
| [`BACKLOG.md`](./BACKLOG.md) | Backlog technique Godot (`G-*`) |
| [`docs/godot/ARCHITECTURE.md`](./docs/godot/ARCHITECTURE.md) | Arborescence & managers (débutants) |

---

## Godot (recommandé)

1. Ouvrir le dossier du repo dans **Godot 4.7**.
2. Scène principale : `scenes/main/main.tscn` (déjà configurée).
3. **F5** pour lancer.

### Contrôles proto (vue 3D)

| Input | Effet |
|---|---|
| Clic gauche + drag | Orbit |
| Clic droit + drag | Pan |
| Molette | Zoom |
| WASD / flèches | Déplacer le focus |
| Clic gauche court | Inspecter la tuile |
| `T` / `F` | Vue dessus / reset caméra |
| `R` | Nouvelle seed |
| `Espace` | Pause |

### Arborescence (résumé)

```
scenes/main/          → point d’entrée (DrawMap3D)
scenes/world/         → DrawMap3D + Chunk3D (+ legacy 2D)
scripts/autoload/     → Game / World / Chunk / Input / Time
scripts/world/        → Perlin, biomes, config, cellules
scripts/map/          → mesh builder, couleurs, chunks 3D
resources/configs/    → WorldConfig .tres (tweaks + LOD)
```

Détail : [`docs/godot/ARCHITECTURE.md`](./docs/godot/ARCHITECTURE.md).

---

## Proto JS (legacy)

Atelier relief Perlin + mini-simu éco temps réel (outil R&D, pas la boucle cible).

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Ouvrir [http://127.0.0.1:4173](http://127.0.0.1:4173).

```bash
node --test js/**/*.test.js
```

Découpage JS historique : `js/core/`, `js/world/`, `js/terrain/`, `js/ui/`.

> **Atelier ≠ boucle.** L’atelier (curseurs, presets, écoscore soft) est un outil plateau / R&D.  
> La boucle v0 (chapitre Oasis, tours, deck) est dans le brief — elle se construit **en Godot**.  
> Pas de villes ni de routes : les humains ont disparu ; la pollution est un héritage, le climat est l’antagoniste.

---

## Décisions figées

1. Le SIG est le **plateau**, jamais le jeu.  
2. Base code = **ce repo** (plus d’import AllesLa obligatoire).  
3. Godot = runtime cible ; JS = référence jusqu’à parité.  
4. **Pas de villes / routes** (humains disparus) — pollution héritée + climat.  
5. `BRIEF-LOOP.md` + `ROADMAP.md` / `BACKLOG.md` / `FEATURES.md` = suivi.
