# Gaïa

Prototype de validation du modèle 3D : une grille **100×100** élevée au **bruit de Perlin**, rendue **low-poly** avec Three.js.

Pages (après activation) : https://vbarrois.github.io/gaia/

## Règles de dev

- **HTML + JavaScript** (modules ES, pas de bundler / framework)
- **localStorage** pour toutes les données utilisateur (monde, panneau, caméra, mute)
- Three.js chargé depuis un CDN via import map
- Logique testable isolée des managers Three.js

## Découpage

```
js/
├── app.js                 # bootstrap
├── core/
│   ├── GameManager.js     # orchestration, persist, boucle
│   ├── SceneManager.js    # caméra, lumières, render
│   ├── InputManager.js    # clavier → actions
│   └── SoundManager.js    # Web Audio (cues courts)
├── terrain/
│   ├── TerrainManager.js  # mesh, eau, nuages
│   ├── soil.js            # roche / terre / végétation
│   ├── clouds.js          # calque nuageux
│   ├── terrain.js         # heightmap / biomes
│   └── perlin.js          # bruit de Perlin
├── ui/
│   ├── UiManager.js       # panneau propriétés
│   └── panel.js           # mode réduit
└── store/
    └── userStore.js       # localStorage
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

## Contrôles

| Action | Effet |
| --- | --- |
| Glisser / pincer | Caméra |
| `R` | Nouvelle graine |
| `W` | Fil de fer |
| `P` | Panneau réduit / ouvert |
| `M` | Son on / off |
| Réinitialiser | Efface le localStorage |
