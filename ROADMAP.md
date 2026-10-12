# Gaïa — ROADMAP & état des lieux

Source de vérité boucle : [`BRIEF-LOOP.md`](./BRIEF-LOOP.md).  
Ce fichier = **suivi produit** (pas du code). Sauf demande explicite : discuter / préciser ici.

**Compétence non négociable :** voir la météo, agir *avant*.  
**Contrat :** Boun = SIG (montre & déplace) · Vincent = partie (1 geste → résolution → seuil).

---

## 1. État des lieux (2026-10-12)

**Base code = ce repo** (`vbarrois/gaia`).  
On casse « importer depuis AllesLa » parce que le plateau Gaya est déjà ici. AllesLa n’est plus une dépendance de suivi.

### 1.1 Ce que le repo *est* aujourd’hui

Prototype **atelier Gaya** + mini-simu éco temps réel (pas tour par tour).  
Pages : https://vbarrois.github.io/gaia/ · local `python3 -m http.server 4173`.

| Domaine | En place | Écart vs brief boucle v0 |
|---|---|---|
| **Produit** | Atelier relief + « créer un monde » + restaurer à la main | Pas de scénario « La Source », pas de tours 8–12, pas de deck |
| **Compétence** | Réagir *pendant* le temps (1× / 3× / +1 j) | Brief : annonce J/J+1 → **1 action** → monde résout |
| **SIG / lecture** | Couches exclusives (select) | Brief : 5 layers **empilées** ; isolate = debug |
| **Plateau** | Relief procédural, eau, source, arbres, nuages | Pas de 2 villes + route + lac scénarisé ; ciblage libre case |

### 1.2 Features techniques & UX — OK

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
| Ressources | Énergie / eau / compost / déchets isolés | `World` + HUD |
| Temps | Pause / 1× / 3× / +1 jour (~8 s/jour) | `TimeManager` |
| Persistance | Config + caméra + mute + couche — **pas** la progression | `userStore` |
| Tests | Suites Node (`node --test`) | `*.test.js` |

### 1.3 Gameplay actuel (boucle Gaya) — ce que le joueur fait

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
| Villes, route, lessivage vers lac | **Non** |
| Cartouche de pluie | **Non** |
| Espèces sol vs lac distinctes | **Non** (un seul « Planter ») |

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

---

## 2. Backlog (vers la boucle brief)

Priorité haute → basse. IDs stables pour les chats agent.

### P0 — Socle dépôt

| ID | Statut | Item | Dépend |
|---|---|---|---|
| P0-1 | **done** | ~~Import AllesLa~~ — annulé : base = repo actuel | — |
| P0-2 | done | Inventaire plateau actuel vs boucle brief → §1 de ce fichier | — |
| **P0-3** | **NEXT** | README : atelier ≠ boucle ; liens brief + roadmap | — |
| P0-4 | done | **Q3** tranché : base visuelle / code = **ce repo** | — |

### P1 — Scénario « La Source »

| ID | Statut | Item |
|---|---|---|
| P1-1 | todo | Carte figée : Source (haut), 2 villes + 1 route, Lac (bas) |
| P1-2 | todo | Ciblage **Source / Chemin / Lac** seulement |
| P1-3 | todo | Sans joueur : source meurt en 4–5 saisons |
| P1-4 | todo | Seuils win/lose (phrases du brief) |

### P2 — Météo tour par tour

| ID | Statut | Item |
|---|---|---|
| P2-1 | todo | Vent : 4 dirs × faible/fort ; déplace nuages + pollution air/route |
| P2-2 | todo | Pluie : sec / fine / forte |
| **P2-3** | todo | Panneau **J + J+1** (bandeau une ligne) |
| P2-4 | todo | Résolution : vent → pluie → eau → espèces → ré-émission |

*Réemploi possible :* champs pluie/vent/nuages actuels → à **rebrancher** sur annonce + résolution tour, pas sur le tick continu atelier.

### P3 — Tour joueur & deck

| ID | Statut | Item |
|---|---|---|
| P3-1 | todo | 8–12 saisons (**Q1**) |
| P3-2 | todo | Main 3, petite pioche (**Q2**) |
| P3-3 | todo | Une action, puis le monde joue |
| P3-4 | todo | Espèce **sol** |
| P3-5 | todo | Espèce **lac** |
| P3-6 | todo | **Cartouche pluie** (×1 deck) (**Q5**) |

*Réemploi partiel :* `plant` / `clean` / coûts énergie ≠ modèle brief ; à remplacer ou mapper, pas à « étendre » aveuglément.

### P4 — Lecture (5 layers empilées)

| ID | Statut | Item | vs actuel |
|---|---|---|---|
| P4-1 | todo | Nuages J + J+1 pointillés | Couche pluie exclusive |
| P4-2 | todo | Pollution terre/eau + route ruban | Couche pollution case |
| P4-3 | todo | Végétation = espèces joueur | Arbres veg auto |
| P4-4 | todo | Humidité sobre | Couche moisture |
| P4-5 | todo | Vent = panneau + flèches | Vent interne, pas UI |
| P4-6 | todo | Plateau : relief, source, villes, route, lac | Relief + source |
| P4-7 | todo | Isolate = debug | Select exclusif |

### P5 — Textes & validation v0

| ID | Statut | Item |
|---|---|---|
| P5-1 | todo | Intro 3 lignes |
| P5-2 | todo | Tour = bandeau |
| P5-3 | todo | Win : *« La source est claire. Le lac respire. »* |
| P5-4 | todo | Lose : *« La source a bu la ville. »* |
| P5-5 | todo | **Done quand** une partie se gagne **et** une se perd |

### P6 — Gelé (hors v0)

| ID | Statut | Item |
|---|---|---|
| P6-1 | frozen | Température, types de sol overlay, 3 calques air/sol/eau, risque/case |
| P6-2 | frozen | Combat, persos, inventaire, ville constructible, gros deck |
| P6-3 | frozen | Atelier comme gameplay principal |
| P6-4 | frozen | Micro-gestion case à case en v0 |
| **P6-5** | frozen | v1 pollen / orage / feu — après P5-5 |

### v1 (après P5-5)

| ID | Statut | Item |
|---|---|---|
| V1-1 | frozen | Pollinisation + vent |
| V1-2 | frozen | Feu (orage + bois sec) ; humidité = garde-feu |
| V1-3 | frozen | Orage au panneau ; lose toujours par pollution |

---

## 3. Backlog « dette / polish » du proto actuel (hors boucle)

Utile si on garde Gaya comme plateau SIG — **ne bloque pas** P1–P5.

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
| **Q2** | Ratio deck sol / lac / cartouche ? | P3-2 |
| Q3 | ~~Base visuelle Gaya vs AllesLa ?~~ | **Tranché : ce repo** |
| **Q4** | Chemin = route seule ou + lit d’eau ? | P1-2, P2 |
| **Q5** | Cartouche : zones Source/Chemin/Lac seulement ou libre ? | P3-6 |

Décision figée : **« on casse X parce que Y »** (écrit ici).

---

## 5. Prochaine action

**P0-3** — Mettre le README au clair (atelier ≠ boucle, liens brief/roadmap).  
Ensuite enjeu produit : **P1-1** — scénario carte « La Source » (villes, route, lac) sur la base actuelle.

```
P0 (socle ✓ / README) → P1 (carte Source) → P2 (météo tour) → P3 (deck)
                           ↘ P4 (layers) ↗
                                    → P5 (textes + win/lose) → stop v0
```
