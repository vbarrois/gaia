# Gaïa — ROADMAP (suivi produit)

Source de vérité boucle : [`BRIEF-LOOP.md`](./BRIEF-LOOP.md).  
Ce fichier = **suivi**, pas code. Sauf demande explicite : discuter / préciser ici, ne pas implémenter.

Compétence non négociable : **voir la météo, agir avant**.  
Contrat : Boun = SIG (montre & déplace) · Vincent = partie (1 geste, puis résolution, seuil).

---

## État du dépôt (figé au 2026-10-12)

| Élément | État |
|---|---|
| Repo suivi | `vbarrois/gaia` (local `/home/vbarrois/Projets/gaia`) |
| Brief boucle | `BRIEF-LOOP.md` (ne pas écraser) |
| Proto visuel attendu | `vbarrois/allesla` → `gaia/` — **absent** de cette machine |
| Contenu actuel du repo | Atelier / terrain procédural type Gaya (chrome, Perlin, pluie dérivante) — **plateau / R&D**, pas la boucle v0 |
| Décision | L’atelier n’est **pas** la partie. Le SIG est le plateau. |

---

## Phases

### P0 — Socle dépôt & proto

| ID | Statut | Item |
|---|---|---|
| **P0-1** | **NEXT** | Importer le proto AllesLa `gaia/` à la racine de ce repo **sans écraser** `ROADMAP.md` ni `BRIEF-LOOP.md`. Depuis un env qui a les deux repos (ou portable). Ne pas cloner AllesLa si le token ne le voit pas. |
| P0-2 | todo | Après import : inventaire clair « ce qui est plateau SIG » vs « à jeter / ignorer pour la partie ». |
| P0-3 | todo | Pages / README : pointer brief + roadmap ; dire explicitement que l’atelier ≠ boucle. |

### P1 — Scénario « La Source » (monde unique)

| ID | Statut | Item |
|---|---|---|
| P1-1 | todo | Carte figée : Source (haut), 2 villes + 1 route (versant), Lac (bas). |
| P1-2 | todo | Zones de ciblage v0 : **Source / Chemin / Lac** uniquement (pas de clic libre 100×100). |
| P1-3 | todo | Baseline sans joueur : source meurt en **4–5 saisons**. |
| P1-4 | todo | Seuils win/lose (source claire + lac sous seuil / source morte ou monde trop sale au tour 12). |

### P2 — Météo (annonce → résolution)

| ID | Statut | Item |
|---|---|---|
| P2-1 | todo | Vent : 4 directions × faible/fort. Déplace nuages + pollution aérienne / de route. |
| P2-2 | todo | Pluie : sec / fine / forte (= intensité du lessivage, bénéfices et risques). |
| **P2-3** | todo | Panneau **J + J+1** seulement. Bandeau une ligne (ex. saison, source, lac, vent, pluie demain + zone). |
| P2-4 | todo | Ordre de résolution figé : vent → pluie → eau coule → espèces → villes/route ré-émettent. |

### P3 — Tour joueur (deck minimal)

| ID | Statut | Item |
|---|---|---|
| P3-1 | todo | 8–12 tours / saisons. |
| P3-2 | todo | Main de **3**, petite pioche. |
| P3-3 | todo | **Une** action par tour, puis le monde joue. |
| P3-4 | todo | Action espèce **sol** (mange pollution terre ; pas l’amont ni le lac). |
| P3-5 | todo | Action espèce **lac** (mange pollution eau ; inutile si rien n’arrive). |
| P3-6 | todo | **Cartouche de pluie** : 1 dans le deck ; force lessivage ; zone libre en v0 ; ne soigne pas. |

### P4 — Lecture (5 layers empilées)

| ID | Statut | Item |
|---|---|---|
| P4-1 | todo | Nuages (J translucide, J+1 pointillés). |
| P4-2 | todo | Pollution (une layer, teinte terre/eau ; route = ruban). |
| P4-3 | todo | Végétation = **espèces joueur seulement**. |
| P4-4 | todo | Humidité (sol plus sombre, jamais criard). |
| P4-5 | todo | Vent = panneau + flèches (pas un tapis). |
| P4-6 | todo | Plateau (hors layer) : relief, source, villes, route, lac. |
| P4-7 | todo | Isolate layer = **debug**, pas mode de jeu. |

### P5 — Textes & fin de partie

| ID | Statut | Item |
|---|---|---|
| P5-1 | todo | Intro écran début (3 lignes du brief). |
| P5-2 | todo | Tour = bandeau une ligne. |
| P5-3 | todo | Win : *« La source est claire. Le lac respire. »* |
| P5-4 | todo | Lose : *« La source a bu la ville. »* |
| P5-5 | todo | Critère « v0 jouable » : une partie se **gagne** et une se **perd**. |

### P6 — Hors v0 (gelé)

| ID | Statut | Item |
|---|---|---|
| P6-1 | frozen | Température, overlay types de sol, 3 calques air/sol/eau, jauge risque / case. |
| P6-2 | frozen | Combat, persos, inventaire, ville constructible, gros deck. |
| P6-3 | frozen | Mode atelier / tweaker comme gameplay. |
| P6-4 | frozen | Clic case à case / micro-gestion. |
| **P6-5** | frozen | **v1** pollen / orage / feu — seulement après P5-5. |

### v1 (rappel — après premier win/lose)

| ID | Statut | Item |
|---|---|---|
| V1-1 | frozen | Pollinisation si forêt assez développée ; voyage dans le vent. |
| V1-2 | frozen | Feu si orage + foudre + bois sec ; voyage si sécheresse ; humidité = garde-feu. |
| V1-3 | frozen | Orage annoncé au panneau comme la pluie. Feu détruit filtres ; lose toujours par pollution. |

---

## Questions ouvertes

| ID | Question | Notes |
|---|---|---|
| **Q1** | Combien de saisons exactes en v0 : 8, 10 ou 12 ? | Brief : plage 8–12. |
| Q2 | Composition exacte du deck (ratio sol / lac / 1 cartouche) ? | Main 3, pioche petite. |
| Q3 | Le proto AllesLa `gaia/` est-il encore le bon plateau SIG, ou le Gaya actuel du repo sert de base visuelle ? | P0-1 tranche à l’import. |
| Q4 | « Chemin » = uniquement la route villes→lac, ou aussi lit de ruissellement ? | Impact P1-2 / P2. |
| Q5 | Cartouche : zone libre = parmi Source/Chemin/Lac, ou n’importe où sur le plateau ? | Brief : zone libre en v0. |

Décision figée ne se casse que : **« on casse X parce que Y »** (écrit ici).

---

## Prochaine action

**P0-1** — Importer le proto AllesLa à la racine, préserver `BRIEF-LOOP.md` + `ROADMAP.md`.  
Prérequis : environnement avec accès aux deux repos (ici : `allesla/gaia` introuvable).
