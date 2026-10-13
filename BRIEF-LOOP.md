# Gaïa — brief agent (boucle de jeu)
Injecte ce fichier tel quel dans le contexte de l’agent. C’est la spec de la **boucle**, pas un brief d’implémentation.
Sauf demande explicite : **ne code pas**. Discute, précise, mets à jour `ROADMAP.md`.

**Base code = ce repo** (`vbarrois/gaia`).  
Runtime cible : **Godot 4.7**. Le proto JS reste jusqu’à parité ; cleanup en fin de migration.
---
## Teaser
Des siècles de surconsommation, de destruction et de réchauffement ont laissé une terre morte. Les humains ont disparu. Plus rien ne pousse — sauf là où l’eau jaillit encore.
Une **source**, un **oasis**. Le vent pousse les nuages ; la pluie fertilise… ou lessive le poison vers ce qui reste vivant.
Dépollue, laisse pousser, fais naître de nouvelles sources. La nature reprend ses droits — si tu anticipes le ciel.
---
## Produit
Jeu **tour par tour**, reconquête progressive d’une Terre polluée **sans habitants**.
La pollution est un **héritage** (cicatrices / hotspots), pas une usine qui crache encore.
L’antagoniste vivant, c’est le **climat** : vent → nuages → pluie → humidité / lessivage.
Le joueur **plante**, **dépollue**, et rarement **force une pluie**, pour étendre la zone vivante et faire naître de nouvelles sources.
## Compétence (non négociable)
> Voir l’événement climatique, agir *avant*, pour optimiser l’effet de l’action choisie.
Si le joueur pense « je joue −pollution », on a raté.  
S’il pense « pluie d’ouest demain, je dépollue *maintenant* en amont de l’oasis », on a réussi.
## Contrat Vincent / Boun
| | Boun — SIG | Vincent — partie |
|---|---|---|
| Rôle | Le monde tourne juste | Le joueur *doit* choisir |
| Produit | Layers, flux, lecture | 1 action, puis résolution |
| Succès | « Je vois le lessivage » | Oasis tient / 2ᵉ source naît |
> Le SIG **montre et déplace**. Le tour **force un geste avant la météo**. Le seuil **arrête la partie**.
Le SIG est le **plateau**, jamais le jeu. Pas de mode atelier (zoomer, tweaker 20 min) comme partie.
---
## Décision figée (ne pas recaser sans écriture)
**On casse villes + routes** parce que les humains ont détruit puis disparu : plus d’émetteurs actifs ni de rubans de transport.
---
## Systèmes du monde
| Couche | Rôle |
|---|---|
| **Sol** | Pollution résiduelle + fertilité / humidité |
| **Végétation** | Arbres d’abord ; spawn / croissent si sol assez propre + humide |
| **Eau** | Sources (points d’espoir) + humidité locale (oasis) |
| **Climat** | Vent (direction + force) → déplace nuages → pluie |
| **Pluie** | Humidifie / fertilise ; peut aussi **lessiver** la pollution vers l’aval / les sources |

Hotspots toxiques = cicatrices du passé (générés / placés), pas des bâtiments jouables.
---
## Boucle v0 — chapitre « Oasis »
```
Météo s’annonce (vent + pluie, J et J+1)
  → 1 action (planter / dépolluer / forcer pluie)
    → vent déplace nuages (+ poussière toxique légère)
      → pluie humidifie / lessive
        → sol évolue
          → arbres poussent ou meurent
            → source tient, meurt, ou une nouvelle naît
```
- **8–12 saisons** (voir Q1).
- Main de **3**. Pioche petite.
- **Une** action, puis le monde joue tout seul. Le joueur ne micro-gère pas.
Formule : **vent = direction, pluie = intensité, plante / dépolluer = absorption & préparation.**

### Progression
Le joueur n’a pas à nettoyer toute la map. Il **étend la zone vivante** :
sol dépollué + humide → arbres → chance de **faire naître une nouvelle source** → nouveau front (chunks Godot).

### Actions
| Action | Fait | Ne fait pas |
|---|---|---|
| **Planter** (filtre sol) | Pose / renforce végétation qui absorbe pollution dans la terre | N’humidifie pas seule ; faible effet si sol sec |
| **Dépolluer** | Baisse nette pollution sur une **zone ciblée** (coût / rare) | Ne crée pas d’eau ; prépare le terrain pour une future source |
| **Forcer une pluie** | Lessive / humidifie une zone (sous nuages ou ciblée) | Peut **pousser le poison** vers une source mal placée. Rare : **1** dans le deck |

Ciblage v0 : **autour des sources / de la lisière vivante** (pas paintbrush libre sur toute la map).

### Monde (chapitre 1)
- **1 source** + petit oasis de verdure au départ.
- Pollution héritée + hotspots autour.
- Sans le joueur : oasis meurt en **4–5 saisons** (lessivage et/ou sécheresse).
- Objectif chapitre : oasis tient **et** une **2ᵉ source** naît.

### Météo
- Vent changeant, 4 directions, faible / fort.
- Vent déplace **nuages** (et une dérive légère de pollution aérienne / poussière).
- Pluie = sec / fine / forte : **combien** ça humidifie et **combien** ça lessive.
- Panneau : **maintenant + saison suivante** (un tour de visibilité). Pas trois.
Exemple de bandeau :
`Saison 4/12 · Oasis claire · → Ouest fort · pluie demain sur la lisière est`

### Pression (comment on perd)
1. **Lessivage** : pluie sur sol sale → pollution migre vers l’oasis / sources aval.  
2. **Sécheresse** : pas de pluie + vent fort → humidité chute → arbres meurent → oasis se referme.  
3. **Contamination de source** : seuil → source morte (plus d’oasis, plus de front).

### Win / lose
- **Win (chapitre 1) :** oasis initiale encore claire **et** une 2ᵉ source est née.  
  *« Une seconde source jaillit. La terre respire. »*
- **Lose :** dernière source contaminée ou oasis morte avant l’objectif.  
  *« La dernière source a bu le ciel sale. »*
Une phrase, pas 12 jauges.
---
## Lecture — 5 layers
Chaque question du joueur = une layer. Empilement par défaut. Isolate = debug, pas le mode de jeu.
| Layer | Question | Affichage |
|---|---|---|
| Nuages | Où va pleuvoir ? | Translucide. J+1 en pointillés |
| Pollution | Où est le poison ? | Teinte terre (héritage + hotspots) |
| Végétation | Où sont *mes* filtres ? | Arbres / espèces joueur |
| Humidité | Où l’eau peut porter ? | Sol plus sombre, jamais criard |
| Vent | Dans quel sens ? | Panneau + flèches, pas un tapis |
Plateau (pas une layer) : relief, sources, oasis, cicatrices toxiques.
**Pas en v0 :** température, overlay types de sol, 3 calques air/sol/eau, jauge de risque par case, villes, routes, reconstruction humaine.
---
## v1 (après qu’une partie v0 se gagne et se perde) — ne pas implémenter maintenant
Même vent, deux flux de plus ; front de reconquête plus large (3ᵉ+ sources).
| | Vie | Feu |
|---|---|---|
| Condition | Forêt assez développée | Orage + foudre + bois **sec** |
| Effet | **Pollinisation** : la végétation s’étend toute seule | Zone boisée **brûle** (filtres perdus) |
| Voyage | Pollen dans le vent | Feu dans le vent si **sécheresse** |
- L’humidité existante est le garde-feu. Pas de layer « risque incendie ».
- L’orage s’annonce au panneau, comme la pluie.
- Le feu ne gagne pas la partie à lui seul : il détruit tes filtres. Les sources meurent encore par **pollution** / sécheresse.
Formule v1 : le vent dirige aussi pollen et feu.
---
## Ce que tu ne fais pas
- Ne code pas le jeu, les layers, ni le deck, sauf demande explicite.
- N’invente pas de combat, persos, inventaire, villes, routes, reconstruction humaine.
- N’ouvre pas le SIG comme gameplay (pas de 12 jauges, pas de clic case à case en v0).
- Ne mélange pas v0 et v1. Pollen / orage / feu = après le premier win/lose.
- Ne recentre pas le travail sur un import AllesLa : la base est ce repo.
## Si on te demande d’avancer
1. Citer les IDs du `ROADMAP.md` (`P2-3`, `P6-5`, `Q1`…) ou `BACKLOG.md` (`G1-5`…).
2. Une décision figée ne se casse que si on écrit « on casse X parce que Y ».
3. Prochaine action concrète hors spec : voir `ROADMAP.md` § Prochaine action.
## Textes d’écran v0
**Début**
> La terre est sale. Une source jaillit encore.  
> Le vent va tourner. La pluie peut tuer ou guérir.  
> Dépollue, plante, anticipes. Fais naître la suivante.
**Tour** — une ligne, voir bandeau météo plus haut.
**Fin** — win / lose ci-dessus.
