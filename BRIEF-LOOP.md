# Gaïa — brief agent (boucle de jeu)
Injecte ce fichier tel quel dans le contexte de l’agent. C’est la spec de la **boucle**, pas un brief d’implémentation.
Sauf demande explicite : **ne code pas**. Discute, précise, mets à jour `ROADMAP.md`. Le proto visuel est encore dans `vbarrois/allesla` (`gaia/`). Ce repo (`vbarrois/Gaia`) porte le suivi.
---
## Produit
Jeu tour par tour, terre post-apocalyptique polluée. Une **source** jaillit encore. Le joueur reprend la main.
Les **villes** émettent de la pollution. Les **routes** la transportent. Le **vent** dirige. La **pluie** amplifie bénéfices et risques. Le joueur **plante** (sol / lac) et, rarement, **force une pluie**.
## Compétence (non négociable)
> Voir l’événement climatique, agir *avant*, pour optimiser l’effet de l’action choisie.
Si le joueur pense « je joue −pollution », on a raté.  
S’il pense « pluie d’ouest demain, je plante *maintenant* sur le chemin », on a réussi.
## Contrat Vincent / Boun
| | Boun — SIG | Vincent — partie |
|---|---|---|
| Rôle | Le monde tourne juste | Le joueur *doit* choisir |
| Produit | Layers, flux, lecture | 1 action, puis résolution |
| Succès | « Je vois le lessivage » | Source tient / source morte |
> Le SIG **montre et déplace**. Le tour **force un geste avant la météo**. Le seuil **arrête la partie**.
Le SIG est le **plateau**, jamais le jeu. Pas de mode atelier (zoomer, tweaker 20 min) comme partie.
---
## Boucle v0
```
Météo s’annonce (vent + pluie, J et J+1)
  → 1 action (espèce sol / espèce lac / cartouche)
    → vent déplace
      → pluie amplifie
        → eau coule
          → espèces mangent
            → villes + route ré-émettent
```
- **8–12 tours.**
- Main de **3**. Pioche petite.
- **Une** action, puis le monde joue tout seul. Le joueur ne micro-gère pas.
Formule : **vent = direction, pluie = intensité, plante = absorption.**
### Actions
| Action | Fait | Ne fait pas |
|---|---|---|
| Espèce de **sol** | Mange la pollution dans la terre | N’arrête pas l’amont ni le lac |
| Espèce de **lac** | Mange la pollution dans l’eau | Inutile si rien n’arrive à l’eau |
| **Cartouche de pluie** | Force un lessivage sur une zone | Ne soigne pas. Rare : **1** dans le deck. Zone libre en v0 |
### Monde (scénario unique « La Source »)
- **Source** (haut) : eau claire. Enjeu.
- **2 villes + 1 route** sur le versant : émettent, transportent.
- **Lac** (bas) : reçoit, peut renvoyer.
- Ciblage v0 : **Source / Chemin / Lac** (pas de clic libre sur le 100×100).
Sans le joueur, la source meurt en 4–5 saisons.
### Météo
- Vent changeant, 4 directions, faible / fort.
- Vent déplace **nuages** et **pollution aérienne / de route**.
- Pluie = sec / fine / forte : **combien** ça bouge (bénéfices et risques).
- Panneau : **maintenant + saison suivante** (un tour de visibilité). Pas trois.
Exemple de bandeau :
`Saison 4/12 · Source claire · Lac trouble · → Ouest fort · pluie demain sur le Chemin`
### Win / lose
- **Win :** source encore claire **et** lac sous le seuil.  
  *« La source est claire. Le lac respire. »*
- **Lose :** source contaminée, **ou** monde trop sale au 12ᵉ tour.  
  *« La source a bu la ville. »*
Une phrase, pas 12 jauges.
---
## Lecture — 5 layers
Chaque question du joueur = une layer. Empilement par défaut. Isolate = debug, pas le mode de jeu.
| Layer | Question | Affichage |
|---|---|---|
| Nuages | Où va pleuvoir ? | Translucide. J+1 en pointillés |
| Pollution | Où est le poison ? | Une layer, teinte terre / teinte eau. Route = ruban |
| Végétation | Où sont *mes* filtres ? | Espèces joueur seulement |
| Humidité | Où l’eau peut porter ? | Sol plus sombre, jamais criard |
| Vent | Dans quel sens ? | Panneau + flèches, pas un tapis |
Plateau (pas une layer) : relief, source, villes, route, lac.
**Pas en v0 :** température, overlay types de sol, 3 calques air/sol/eau, jauge de risque par case.
---
## v1 (après qu’une partie v0 se gagne et se perde) — ne pas implémenter maintenant
Même vent, deux flux de plus.
| | Vie | Feu |
|---|---|---|
| Condition | Forêt assez développée | Orage + foudre + bois **sec** |
| Effet | **Pollinisation** : la végétation s’étend toute seule | Zone boisée **brûle** (filtres perdus) |
| Voyage | Pollen dans le vent | Feu dans le vent si **sécheresse** |
- L’humidité existante est le garde-feu. Pas de layer « risque incendie ».
- L’orage s’annonce au panneau, comme la pluie.
- Le feu ne gagne pas la partie à lui seul : il détruit tes filtres. La source meurt encore par **pollution**.
Formule v1 : le vent dirige aussi pollen et feu.
---
## Ce que tu ne fais pas
- Ne code pas le jeu, les layers, ni le deck, sauf demande explicite.
- N’invente pas de combat, persos, inventaire, ville constructible, 40 cartes.
- N’ouvre pas le SIG comme gameplay (pas de 12 jauges, pas de clic case à case en v0).
- Ne mélange pas v0 et v1. Pollen / orage / feu = après le premier win/lose.
- Ne clone pas `vbarrois/allesla` si le token ne le voit pas. L’import `gaia/` → racine de ce repo est **P0-1**, à faire depuis un environnement qui a **les deux** repos, ou depuis le portable.
## Si on te demande d’avancer
1. Citer les IDs du `ROADMAP.md` (`P2-3`, `P6-5`, `Q1`…).
2. Une décision figée ne se casse que si on écrit « on casse X parce que Y ».
3. Prochaine action concrète hors spec : **P0-1** — importer le proto AllesLa à la racine de Gaia, **sans écraser** `ROADMAP.md` ni ce brief.
## Textes d’écran v0
**Début**
> La terre est sale. Une source jaillit encore.  
> Les villes crachent. Le vent va tourner.  
> Plante avant la pluie. Sauve la source.
**Tour** — une ligne, voir bandeau météo plus haut.
**Fin** — win / lose ci-dessus.
