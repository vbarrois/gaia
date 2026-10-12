# Gaïa — roadmap & backlog

Document de suivi pour les échanges (Vincent / Boun / agents).
Dernière mise à jour : 12 octobre 2026.

**Règle :** le SIG est le plateau. Le jeu, c’est le tour + le gagné / perdu.

---

## 1. Intention

Terre post-apo, polluée. Une **source** jaillit encore. Le joueur reprend la main en **plantant des espèces** et, parfois, en **forçant une pluie**. Les **villes** émettent. Les **routes** transportent. Le **vent** dirige. La **pluie** amplifie bénéfices et risques.

Compétence du joueur :

> Voir l’événement climatique, agir *avant*, pour optimiser l’effet de l’action choisie.

---

## 2. Contrat Vincent / Boun

| | Boun — SIG | Vincent — partie |
|---|---|---|
| Rôle | Le monde tourne juste | Le joueur *doit* choisir |
| Produit | Layers, flux, lecture fine | 1 action, puis résolution |
| Temps | Physique continue, cadencée en saisons | Coupé : météo → geste → résolution |
| Succès | « Je vois le lessivage » | « La source tient » / « elle est morte » |

Phrase partagée :

> Le SIG **montre et déplace**. Le tour **force un geste avant la météo**. Le seuil **arrête la partie**.

Ce qui n’est **pas** négociable pour la v0 gameplay :

1. Le monde s’arrête et attend **une** action.
2. La météo du prochain coup est **visible**.
3. Une action, puis **une saison** (vent → pluie → écoulement → espèces).
4. **Win / lose** après 8–12 tours.

Le mode atelier SIG (zoomer, tweaker, regarder 20 min sans enjeu) reste un outil de debug, pas la partie.

---

## 3. Décisions figées (v0)

À challenger seulement si ça casse le plaisir, pas par ajout de features.

### Boucle

```
Météo s’annonce (vent + pluie, J et J+1)
  → 1 action (sol / lac / cartouche)
    → vent déplace
      → pluie amplifie
        → eau coule
          → espèces mangent
            → villes + route ré-émettent
```

- Durée : **8–12 tours**.
- Main : 3 cartes, petite pioche. La cartouche est **rare** (une dans le deck).

### Actions

| Action | Rôle |
|---|---|
| Espèce de **sol** | Mange la pollution dans la terre (versant, bord de route, autour de la source) |
| Espèce de **lac** | Mange la pollution dans l’eau |
| **Cartouche de pluie** | Force une pluie locale (ensemencement). Ne dépollue pas : elle *lessive* |

v0 : cartouche **n’importe où**, mais unique dans le deck.

### Monde

- **Source** (haut) : émet de l’eau claire. Enjeu.
- **2 villes + 1 route** qui traverse le versant : émettent et transportent.
- **Lac** (bas) : reçoit, peut renvoyer.
- 3 zones de ciblage : **Source / Chemin / Lac** (pas de clic libre sur 100×100).

### Météo

- Vent **changeant**, 4 directions, force faible / fort.
- Vent déplace **nuages** et **pollution aérienne / de route**.
- Pluie = **intensité** du déplacement (bénéfices et risques).
- Panneau : maintenant + **saison suivante** (un tour de visibilité).
- Formule : **vent = direction, pluie = intensité, plante = absorption.**

### Win / lose

- **Victoire :** source encore claire **et** lac sous le seuil.
- **Défaite :** source contaminée, **ou** monde trop sale au 12ᵉ tour.
- Texte joueur :
  - Win — *« La source est claire. Le lac respire. »*
  - Lose — *« La source a bu la ville. »*

### Lecture (5 layers)

| Layer | Question | Affichage |
|---|---|---|
| Nuages | Où va pleuvoir ? | Toujours, translucide. J+1 en pointillés |
| Pollution | Où est le poison ? | Une layer, deux teintes terre / eau. Route = ruban |
| Végétation | Où sont *mes* filtres ? | Espèces joueur seulement (sol ≠ lac) |
| Humidité | Où l’eau peut porter ? | Sol plus sombre, jamais criard |
| Vent | Dans quel sens ? | Panneau + flèches, pas un tapis |

Plateau (pas une layer) : relief, source, villes, route, lac.

Pas en v0 : température, overlay types de sol, 3 calques air/sol/eau, jauge de risque par case.

Isolate d’un calque = diagnostic. La partie se joue sur **l’empilement**.

---

## 4. État technique (aujourd’hui)

Le proto visuel / physique vit encore dans `vbarrois/allesla` (PR #21, dossier `gaia/`, Three.js, relief Perlin 100×100).

Déjà là (à confirmer à l’import) :

- Relief low-poly, panel propriétés, localStorage
- Types de sol, hydrométrie, pollution, couche nuages
- Pluie (nuages + vent), écoulement depuis le lac et la pluie
- Diffusion de pollution par terre et par eau

**Blocage actuel :** `vbarrois/Gaia` est vide (README). L’import `gaia/` → racine de ce repo attend un agent qui a **AllesLa + Gaia** dans l’environnement Cloud Agent. À faire depuis le desktop.

---

## 5. Roadmap

```
P0 Import          proto dans ce repo, jouable en local
P1 Lecture         5 layers + panneau météo (SIG lisible)
P2 Tour            pause → 1 action → 1 saison
P3 Émetteurs       source vs villes + route
P4 Gestes          2 espèces + cartouche
P5 Partie          scénario « La Source » + win/lose
P6 Ensuite         plus d’espèces, plus de villes, équilibrage
```

Chaque phase a un **résultat visible** et un **critère “c’est jouable / c’est fini”**. On ne commence pas P3 si P2 n’arrête pas le temps.

---

## 6. Backlog

Statuts : `todo` · `now` · `blocked` · `done`

### P0 — Repo & proto

| ID | Item | Qui | Statut | Notes |
|---|---|---|---|---|
| P0-1 | Importer `gaia/` depuis AllesLa vers la **racine** de ce repo | Desktop / agent | `blocked` | Branche source `cursor/gaia-html-game-df03`. Relancer un agent **après** ajout de `allesla` à l’environnement |
| P0-2 | Vérifier pluie, vent, écoulement, diffusion pollution | Boun | `todo` | Recette SIG sur le proto importé |
| P0-3 | Servir la démo (Pages ou local `:4173`) | Partagé | `todo` | Après P0-1 |

### P1 — Lecture (SIG au service du tour)

| ID | Item | Qui | Statut | Notes |
|---|---|---|---|---|
| P1-1 | Séparer l’affichage : nuages ≠ humidité ≠ pollution ≠ végétation joueur | Boun | `todo` | 5 layers, empilées par défaut |
| P1-2 | Pollution : une layer, teinte terre / teinte eau | Boun | `todo` | Route = même teinte, en ruban |
| P1-3 | Nuage J+1 en pointillés | Boun | `todo` | Anticipation |
| P1-4 | Vent visible (panneau + flèches) | Boun | `todo` | 4 directions, faible / fort |
| P1-5 | Toggle isolate (un calque) | Boun | `todo` | Debug + pédagogie, pas le mode de jeu |
| P1-6 | Palette stricte 5 teintes | Vincent + Boun | `todo` | Pollution et humidité ne doivent jamais se confondre |

**Fini quand :** en 2 secondes on répond aux 4 questions (où pleut, où sale, où mes plantes, où ça va couler).

### P2 — Boucle de tour

| ID | Item | Qui | Statut | Notes |
|---|---|---|---|---|
| P2-1 | Couper le temps : le monde **attend** une action | Vincent | `todo` | Le continu SIG devient une « saison » |
| P2-2 | Ordre de saison figé : vent → pluie → écoulement → espèces | Partagé | `todo` | |
| P2-3 | Panneau météo J et J+1 | Vincent | `todo` | Ex. `→ Ouest fort · pluie forte demain · nuage sur le Chemin` |
| P2-4 | Vent changeant d’une saison à l’autre | Boun | `todo` | Prévisible, pas caché |
| P2-5 | Intensité de pluie = ampli des transports (bénéfices et risques) | Boun | `todo` | Sec / fine / forte |

**Fini quand :** on peut passer 3 saisons à la main (même sans cartes) et voir un événement annoncé *puis* résolu.

### P3 — Source vs villes

| ID | Item | Qui | Statut | Notes |
|---|---|---|---|---|
| P3-1 | Source = émetteur d’eau claire | Boun | `todo` | Symétrique des villes |
| P3-2 | 1 puis 2 villes = émetteurs de pollution chaque saison | Boun | `todo` | |
| P3-3 | Route entre villes : suinte toujours un peu ; la pluie en fait une crue | Boun | `todo` | Transport + fuite vers le sol |
| P3-4 | 3 zones cliquables : Source / Chemin / Lac | Vincent | `todo` | Ciblage v0, pas le mesh 100×100 |

**Fini quand :** sans le joueur, la source meurt en 4–5 saisons.

### P4 — Gestes joueur

| ID | Item | Qui | Statut | Notes |
|---|---|---|---|---|
| P4-1 | Espèce de sol (absorption terre, lente) | Vincent | `todo` | |
| P4-2 | Espèce de lac (absorption eau, lente) | Vincent | `todo` | |
| P4-3 | Cartouche de pluie, 1 dans le deck, zone libre | Vincent | `todo` | Ensemencement ; moinsive, ne soigne pas |
| P4-4 | Main 3, piocher après le geste | Vincent | `todo` | |
| P4-5 | Même action, 3 météos = 3 forces (doc + tweak) | Partagé | `todo` | C’est *le* skill à sentir au playtest |

**Fini quand :** le playtest dit « je plante *maintenant* sur le chemin, pas au lac » — pas « je joue −pollution ».

### P5 — Une partie (win / lose)

| ID | Item | Qui | Statut | Notes |
|---|---|---|---|---|
| P5-1 | Scénario unique « La Source » (même map) | Partagé | `todo` | Source haut, route sur versant, lac bas |
| P5-2 | Compteurs : clarté source, seuil lac, tour 8–12 | Vincent | `todo` | Une phrase, pas 12 jauges |
| P5-3 | Écran début / tour / fin (textes win & lose) | Vincent | `todo` | Voir §7 |
| P5-4 | Playtest 15 min : on comprend, on peut gagner, on peut perdre | Partagé | `todo` | Critère v0 shippable |

**Fini quand :** une partie a un début, un milieu, une fin binaire, sans ouvrir le panel SIG.

### P6 — Plus tard (pas avant P5)

| ID | Item | Qui | Statut | Notes |
|---|---|---|---|---|
| P6-1 | Plus d’espèces (vent, route, source) | Vincent | `todo` | |
| P6-2 | Cartouche seulement sur un nuage déjà là | Vincent | `todo` | Variante plus puzzle |
| P6-3 | Clic libre sur le terrain | Vincent | `todo` | Desktop ; zones restent le défaut mobile |
| P6-4 | Plusieurs scénarios / seeds | Partagé | `todo` | |
| P6-5 | Mode atelier SIG (temps continu, pas de win) | Boun | `todo` | Derrière un toggle debug |
| P6-6 | Équilibrage chiffres (émission, absorption, lessivage) | Partagé | `todo` | Après que la boucle se *sente* |

---

## 7. Écrans v0 (texte)

### Début

> La terre est sale. Une source jaillit encore.  
> Les villes crachent. Le vent va tourner.  
> Plante avant la pluie. Sauve la source.

### Pendant le tour

Bandeau météo + 3 actions + 3 zones.  
Pas de paragraphe. Une ligne :

`Saison 4/12 · Source claire · Lac trouble · → Ouest fort · pluie demain sur le Chemin`

### Fin

- Win : *« La source est claire. Le lac respire. »*
- Lose : *« La source a bu la ville. »*

---

## 8. Questions ouvertes

À trancher en playtest, pas en spec.

| # | Question | Pente actuelle |
|---|---|---|
| Q1 | La route est-elle déjà sale par temps sec ? | Oui, un suintement ; la pluie = crue |
| Q2 | Cartouche : zone libre ou nuage obligatoire ? | Libre, 1 exemplaire (v0) |
| Q3 | Le panneau montre-t-il aussi l’origine de la pollution (ville / route) ? | Non en v0, les layers suffisent |
| Q4 | 1 ou 2 villes dès le premier scénario ? | 2 + 1 route, pour que le Chemin existe |

---

## 9. Comment on suit

- Ce fichier est la **source de vérité** pour le gameplay v0.
- Pour un échange : citer l’**ID** (`P2-3`, `Q1`…) plutôt que reformuler.
- Changer une décision figée (§3) = une phrase « on casse X parce que Y », pas un ajout silencieux.
- Le proto AllesLa reste la référence physique jusqu’à **P0-1**.

Prochaine action concrète : **P0-1** (desktop) — importer le proto. En parallèle, Boun peut déjà lister comment ses layers actuelles mappingent P1-1. Vincent peut playtester le scénario « La Source » sur papier (12 tours, 3 cartes, panneau météo écrit).
