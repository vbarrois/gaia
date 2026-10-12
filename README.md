# Gaïa

Atelier du vivant : sculpte un relief Perlin, crée un monde, puis restaure-le (énergie, eau, compost, écoscore).

Pages : https://vbarrois.github.io/gaia/

## Règles de dev

- **HTML + JavaScript** (modules ES, pas de bundler / framework)
- **localStorage** pour la config monde, caméra, panneau, mute — **pas** la progression de partie
- Three.js via CDN (import map)
- Logique testable isolée des managers Three.js

## Découpage

```
js/
├── app.js
├── core/
│   ├── GameManager.js      # orchestration
│   ├── EditorManager.js    # editing / playing, presets, import-export
│   ├── ActionManager.js    # outils pinceau
│   ├── TimeManager.js      # pause / 1× / 3× / +1 jour
│   ├── SceneManager.js     # caméra, lumières, picking
│   ├── InputManager.js
│   └── SoundManager.js
├── world/
│   ├── World.js            # grille éco 36×36 (GayaCore)
│   ├── WorldManager.js
│   ├── config.js           # DEFAULTS, PRESETS, sanitize
│   ├── perlinGaya.js
│   ├── actions.js
│   ├── colors.js           # couches + mesh
│   └── math.js
├── terrain/
│   ├── TerrainManager.js   # mesh, eau, nuages, source
│   └── …                   # utilitaires Perlin/sol/nuages historiques
├── ui/
│   ├── UiManager.js
│   └── panel.js
└── store/
    └── userStore.js
```

## Lancer

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Ouvrir [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Tests

```bash
node --test js/**/*.test.js
```

## Boucle de jeu

1. **Aperçu** — curseurs / presets sculptent le terrain en direct.
2. **Créer ce monde** — démarre une partie en pause.
3. **Actions** — Observer, Dépolluer, Arroser, Enrichir, Planter, Puiser (clic court).
4. **Temps** — II / 1× / 3× / +1 jour (1 jour ≈ 8 s à 1×).
5. Objectif : **écoscore ≥ 65**.

## Contrôles

| Action | Effet |
| --- | --- |
| Glisser | Caméra |
| Clic court | Observer / agir |
| Couche (select) | Naturel, relief, Perlin, pluie, pollution, humidité, fertilité |
| `R` | Nouvelle graine (éditeur) |
| `W` | Fil de fer |
| `P` | Panneau réduit / ouvert |
| `M` | Son on / off |
