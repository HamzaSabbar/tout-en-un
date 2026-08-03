# Plan — Lot 4. Exercices interactifs

## Contexte

Premier élément de valeur qu'aucune solution sans code ne sait modéliser. Un
exercice n'est pas un PDF : son énoncé, son aide et sa correction sont du contenu
riche structuré, interrogeable et réutilisable.

Référence : architecture sections 5.3 (modèle), 5.5 (journal d'apprentissage),
8 (images), 9 (exercices), 15 (nettoyage du contenu riche), 16 (performance).
Fiche du lot : `docs/roadmap.md`.

**Critère de sortie.** Le professeur crée un exercice contenant formules LaTeX et
image, et l'élève le traite étape par étape, sur écran large comme depuis un
téléphone. Chaque étape franchie produit une ligne dans
`evenement_apprentissage`.

Dépendances : lots 1 et 3, tous deux terminés et fusionnés.

**Charge.** La roadmap annonce 8 jours. L'intégration du chantier de mise en page
grand écran (voir décision G) porte l'estimation à 10 jours. Ce n'est pas un
dépassement : c'est une dette du lot 3 qu'on solde ici plutôt qu'à part, parce que
refaire les mises en page maintenant puis les refaire pour accueillir les
exercices serait le même travail deux fois.

## Décisions de conception

### A. `evenement_apprentissage` naît ici, pas au lot 7

La roadmap liste ce journal sous le lot 7, mais le critère de sortie du lot 4 en
dépend, et `CLAUDE.md` en fait une règle non négociable : la progression se dérive
d'événements, on n'écrit jamais un pourcentage directement.

Le lot 4 crée donc la table et l'alimente. Il ne calcule **aucun** pourcentage et
ne crée **aucun** agrégat : `progression_cours`, `progression_chapitre`,
`progression_matiere` et la table `parametre` restent au lot 7. La frontière est
nette et vaut d'être tenue : lot 4 écrit des faits, lot 7 en dérive des chiffres.

### B. L'énumération `action` doit être élargie, donc l'architecture aussi

Architecture 5.5 fixe `action` = `vue`, `terminee`, `reussi`, `a_refaire`,
`test_valide`. Or la section 9 exige de savoir qu'« un exercice dont l'aide est
ouverte par 80 pour cent des élèves est mal calibré » : aucune de ces valeurs ne
porte l'ouverture de l'aide ni la consultation d'une correction.

Décision : ajouter `aide_ouverte` et `correction_vue`, et **mettre à jour
architecture 5.5 dans le même commit**. `CLAUDE.md` demande que le document et le
code ne divergent pas ; inventer une valeur non documentée créerait exactement
l'écart que le lot 3 a passé du temps à réparer ailleurs.

### C. Le contenu riche est sûr par construction, pas par nettoyage a posteriori

Architecture 15 demande le « nettoyage du contenu riche avant affichage ». Plutôt
qu'un assainisseur HTML en sortie, le modèle interdit le danger en entrée :

- Un jeu **fermé** de types de nœuds : `paragraphe`, `liste`, `formule`, `image`,
  `code`. Aucun nœud `html` brut, jamais.
- Validation Zod du document **à l'écriture**, avec `.strict()` : un type inconnu
  fait échouer la sauvegarde, il n'arrive jamais à l'affichage.
- Rendu en éléments React, pas en chaîne HTML. Aucun
  `dangerouslySetInnerHTML` sauf pour la sortie de KaTeX.
- KaTeX appelé avec `trust: false` (défaut) et `throwOnError: false`, ce qui
  désactive `\htmlClass`, `\url` et les commandes capables d'émettre du balisage
  arbitraire.

Un assainisseur en sortie reste possible plus tard, mais il traiterait le symptôme
d'un modèle trop permissif. Autant ne pas avoir ce modèle.

### D. Les images passent par `fichier_id`, jamais par une URL

L'invariant 3 vaut pour les images autant que pour les PDF. Le JSON du document
stocke donc `{ type: "image", fichier_id, alt, legende }`, jamais une URL ni une
clé de stockage. L'affichage passe par une route de lecture signée, calquée sur
`/api/matieres/[matiereId]/documents/[documentId]/lecture` et gardée par
`verifierAccesMatiere()`.

Le téléversement d'images réutilise la machinerie du lot 1 : `televerserDocument`
et son schéma acceptent aujourd'hui `z.literal("application/pdf")`, à élargir à
`image/png`, `image/jpeg` et `image/webp`. `TypeDocument` gagne
`image_exercice`.

**Hors périmètre, assumé :** architecture 8 prévoit la conversion automatique en
WebP et deux tailles générées. La fiche du lot 4 ne le demande pas, cela réclame
`sharp` et un pipeline de traitement. À inscrire au lot 11 ou à un lot médias
dédié. Les images sont servies telles que téléversées, avec un plafond de taille.

### E. KaTeX côté serveur uniquement, pour ne rien coûter au budget

Le rendu KaTeX se fait dans le composant serveur. Le client reçoit du HTML déjà
mis en forme plus la feuille de style KaTeX. **Aucun JavaScript KaTeX n'est
envoyé au navigateur**, ce qui est la seule façon d'ajouter le LaTeX sans entamer
les 200 Ko par page élève. C'est aussi ce que demande architecture 9, « rendu par
KaTeX côté serveur pour la performance et l'indexation ».

La prévisualisation du back-office, elle, est nécessairement cliente. Elle charge
KaTeX en différé, et le back-office n'est pas soumis au budget élève.

### F. Le journal reste strictement append-only

Une étape franchie deux fois écrit deux lignes. Aucune déduplication, aucun
`upsert`. Deux raisons : architecture 5.5 qualifie ce journal d'immuable, et la
statistique utile (« quelle proportion d'élèves ouvre l'aide ») se calcule par un
`COUNT(DISTINCT utilisateur_id)`, pas en écrasant des lignes.

Conséquence pour l'auto-évaluation : un élève qui passe de `a_refaire` à `reussi`
produit deux lignes, et c'est la plus récente qui compte. Le lot 7 en tirera le
pourcentage ; le lot 4 n'a pas à trancher.

### G. Mise en page grand écran, intégrée à ce lot

Dette ouverte par la révision du terminal cible (architecture section 2, PR #8) :
les pages élève sont contenues dans `max-w-3xl`, soit 768 px, et la recette ne
valide que 375 px.

Traité ici parce que la fiche d'exercice est précisément l'écran qui gagne le plus
à la largeur : énoncé d'un côté, étapes et correction de l'autre, sans défilement
qui fait perdre l'énoncé de vue.

- Coquille élève élargie, et mise en deux colonnes là où elle sert : liste des
  ressources d'un cours, et fiche d'exercice.
- **Ce qui est ajouté pour le grand écran est chargé en différé selon la largeur
  réelle, pas masqué en CSS.** Sinon le téléphone télécharge ce qu'il n'affiche
  pas, et le budget se dégrade en silence pendant que la CI reste verte.
- Recette Playwright à deux viewports, 1440 px et 375 px, la première assertant
  que la largeur est réellement exploitée.

## Conventions reprises des lots 0 à 3

- Tables et colonnes en français, sans accent, au singulier. `cree_le` sur toute
  nouvelle table.
- Une page ou une route ne parle jamais à Prisma : elle appelle un service de
  `src/modules/<domaine>/`.
- Toute lecture de contenu pédagogique passe par `verifierAccesMatiere()`.
- Brouillons filtrés dans la requête, pas à l'affichage.
- Validation Zod côté serveur de toute donnée entrante, formulaires du
  back-office compris.
- Une page se charge en une requête agrégée. Pas de N+1.
- Libellés d'interface externalisés dans `src/lib/i18n/`.
- Publication distincte de la création, avec invalidation ciblée du cache, comme
  le lot 3 l'a établi pour les documents.
- Fixtures E2E préfixées `E2E` dans leur code, leur libellé ou leur email.

## Modèle de données (une migration)

Migration `20260803115246_ajoute_exercices_et_journal_apprentissage`, appliquée et
vérifiée sur un cluster PostgreSQL 18 jetable. Le schéma effectif est
`prisma/schema.prisma` ; ce qui suit en donne l'intention.

```prisma
enum RessourceApprentissage {
  video
  exercice
  extrait
  examen
  test
  @@map("ressource_apprentissage")
}

enum ActionApprentissage {
  vue
  terminee
  aide_ouverte      // ajout, voir décision B
  correction_vue    // ajout, voir décision B
  reussi
  a_refaire
  test_valide
  @@map("action_apprentissage")
}

model Exercice {
  id                    BigInt    @id @default(autoincrement())
  cours_id              BigInt
  titre                 String
  enonce                Json                 // document riche, voir décision C
  aide                  Json?
  correction_texte      Json?
  correction_video_ref  String?
  difficulte            Int       @default(3) // 1 à 5, contrainte en SQL
  ordre                 Int       @default(0)
  statut                Statut    @default(brouillon)
  cree_le               DateTime  @default(now())
  supprime_le           DateTime?

  cours Cours @relation(fields: [cours_id], references: [id])

  @@index([cours_id, statut, ordre])
  @@map("exercice")
}

model EvenementApprentissage {
  id             BigInt   @id @default(autoincrement())
  utilisateur_id BigInt
  matiere_id     BigInt
  chapitre_id    BigInt?
  cours_id       BigInt?
  ressource_type RessourceApprentissage
  ressource_id   BigInt
  action         ActionApprentissage
  valeur         Decimal? @db.Decimal(6, 2)
  duree_secondes Int?
  cree_le        DateTime @default(now())

  utilisateur Utilisateur @relation(fields: [utilisateur_id], references: [id])

  @@index([utilisateur_id, cree_le])
  @@index([ressource_type, ressource_id, action])
  @@map("evenement_apprentissage")
}
```

- `TypeDocument` gagne `image_exercice` (décision D).
- Deux contraintes `CHECK` ajoutées à la main dans la migration, Prisma ne sachant
  pas les exprimer : `difficulte BETWEEN 1 AND 5`, et
  `duree_secondes IS NULL OR duree_secondes >= 0`. Prisma ignore les `CHECK`
  qu'il trouve en base, donc elles ne seront pas signalées comme une dérive et
  survivront aux migrations suivantes. Vérifiées par une insertion refusée, pas
  seulement par la lecture du fichier.
- `cree_le` est **non nullable** sur les deux tables, y compris `exercice` qui est
  pourtant une table de contenu. La nullabilité des autres tables de contenu vient
  des lignes antérieures à leur migration, dont la date est réellement inconnue.
  Ces deux tables sont neuves et n'en ont aucune : les rendre nullables
  n'exprimerait rien et laisserait un `null` à traiter pour toujours.
- Le second index sert la statistique pédagogique de la décision F. À confirmer
  utile au lot 7 plutôt que de l'ajouter par précaution : à garder seulement si
  une vue admin le requête vraiment.
- L'index `(cours_id, statut, ordre)` sur `exercice` coche une partie de la case
  restée ouverte au lot 3. `extrait_national` reste au lot 5, donc la case ne se
  coche pas encore entièrement.

## Phase 1 — Contenu riche et rendu

Fondation : tout le reste en dépend.

| Fichier | Rôle |
|---|---|
| `src/modules/exercice/document-riche.ts` | Types et schémas Zod `.strict()` du document |
| `src/modules/exercice/document-riche.test.ts` | Rejet des types inconnus, des profondeurs excessives, des `fichier_id` non numériques |
| `src/components/contenu-riche/document.tsx` | Rendu serveur en éléments React |
| `src/components/contenu-riche/formule.tsx` | KaTeX serveur, `trust: false` |
| `src/components/contenu-riche/image-exercice.tsx` | Rend une balise `img` pointant la route signée |

Dépendance à ajouter : `katex` et `@types/katex`. Feuille de style importée une
fois dans la coquille élève.

Tests : un document contenant les cinq types de nœuds rend sans erreur ; un nœud
inconnu est rejeté à la validation ; une formule invalide rend un message plutôt
que de faire échouer la page ; le rendu ne contient jamais `cle_stockage`.

## Phase 2 — Service et back-office

| Fichier | Rôle |
|---|---|
| `src/modules/exercice/service.ts` | CRUD, `publierExercice`, `depublierExercice`, `listerExercicesCours` |
| `src/modules/exercice/schemas.ts` | Schémas Zod des formulaires |
| `src/modules/contenu/actions.ts` | Actions serveur, `requirePermission("contenu:gerer")` en première instruction, invalidation du cours |
| `src/app/(admin)/contenu/.../cours/[coursId]/creer-exercice-form.tsx` | Saisie, avec prévisualisation LaTeX cliente en différé |
| `src/app/(admin)/contenu/.../cours/[coursId]/page.tsx` | Liste des exercices avec badge de statut et boutons Publier et Dépublier |

Le bouton de publication suit exactement le patron établi au lot 3 pour les
documents : formulaire serveur inline, entrées cachées, jamais de `onClick`.

Élargissement du téléversement aux images (décision D), dans
`src/modules/contenu/document.ts`.

## Phase 3 — Journal d'apprentissage

| Fichier | Rôle |
|---|---|
| `src/modules/apprentissage/journal.ts` | `enregistrerEvenement()`, seul point d'écriture |
| `src/modules/apprentissage/journal.test.ts` | Append-only, aucun `upsert`, contexte complet renseigné |

`enregistrerEvenement()` exige matière, ressource, action, et déduit
`chapitre_id` et `cours_id` du contexte fourni par l'appelant. Une seule
implémentation, comme `verifierAccesMatiere()` : c'est de ce journal que dépendra
toute la progression du lot 7.

## Phase 4 — Parcours élève à étapes

| Fichier | Rôle |
|---|---|
| `src/app/(eleve)/matieres/[matiereId]/chapitres/[chapitreId]/cours/[coursId]/exercices/[exerciceId]/page.tsx` | Fiche d'exercice, rendu serveur, gardée par `verifierAccesMatiere()` |
| `src/modules/exercice/etapes.ts` | Machine des cinq étapes et actions serveur associées |
| `src/components/eleve/exercice-etapes.tsx` | Progression cliente minimale, chaque franchissement appelant une action serveur |

Les cinq étapes d'architecture 9 : énoncé, aide sur demande, correction écrite,
correction vidéo si disponible, auto-évaluation réussi ou à refaire.

L'aide et la correction ne sont **pas** envoyées au client avant leur étape. Même
raisonnement que l'invariant 4 sur les bonnes réponses d'un test : ce qui n'est pas
encore dû à l'élève ne quitte pas le serveur. La révélation se fait par navigation
ou par action serveur, pas en masquant du contenu déjà chargé.

La correction vidéo réutilise `VideoFacade` et la route de lecture du lot 3.

## Phase 5 — Mise en page grand écran

Décision G. Chantier transverse aux pages élève existantes plus la nouvelle.

- Coquille élargie, deux colonnes sur la fiche de cours et la fiche d'exercice.
- Composants lourds réservés au grand écran chargés en différé selon la largeur.
- `src/lib/i18n/eleve.fr.ts` complété.

## Vérification

Dans cet ordre, en montrant la sortie de chaque commande.

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`
5. `npm run budget:js` — **le point de vigilance du lot.** KaTeX côté serveur ne
   doit rien ajouter au JavaScript élève. Si le budget bouge, c'est que du rendu
   a fui vers le client.
6. `npm run test:e2e`

### Le test qui prouve le critère de sortie

`e2e/lot4-exercices.spec.ts`, un scénario par le back-office réel, sur le modèle
de `lot3-back-office-pdf.spec.ts` :

1. Admin connecté, création d'un exercice avec une formule LaTeX et une image
   téléversée par le formulaire, puis publication par le bouton.
2. Élève abonné : l'exercice n'apparaît pas tant qu'il est en brouillon, apparaît
   après publication. Prouve aussi l'invalidation du cache.
3. La formule est rendue côté serveur : le HTML contient le balisage KaTeX, et
   aucune requête réseau ne charge de JavaScript KaTeX.
4. Les cinq étapes sont franchies. Après chacune, **une requête en base vérifie la
   ligne correspondante dans `evenement_apprentissage`**, avec son action et son
   contexte. C'est l'assertion littérale du critère de sortie.
5. L'aide et la correction sont absentes du HTML et du RSC avant leur étape.
6. Ni `cle_stockage` ni URL d'image permanente dans le HTML, le RSC ou le trafic.
7. À 1440 px, les deux colonnes sont présentes et la largeur est exploitée. À
   375 px, une seule colonne, aucun débordement horizontal, cibles tactiles de
   44 px.

Le nettoyage `nettoyerDonneesE2E()` doit apprendre à supprimer les `exercice` et
les `evenement_apprentissage` des fixtures, et `compterResiduE2E()` à les
compter, sinon le test « les scénarios ne laissent aucune donnée derrière eux »
donnera une fausse assurance.

### Contenu réel avant industrialisation

La roadmap insiste : ne pas prototyper en abstrait, créer deux ou trois exercices
réels de Physique-Chimie avant d'industrialiser la saisie. À faire entre les
phases 2 et 4, pendant que le back-office existe et que le parcours élève n'est
pas figé. C'est le moment où une lacune du modèle de contenu coûte encore peu.

## Clôture du lot

- Cocher les cases du lot 4 dans `docs/roadmap.md`, dans le même commit que le
  code.
- Mettre à jour architecture 5.5 pour les deux valeurs d'`action` ajoutées
  (décision B), et 5.9 si le second index est conservé.
- Noter en section 6 de `docs/lot-3-cloture-todo.md` que la dette de mise en page
  est soldée, ou ouvrir la fiche de clôture du lot 4.
- Branche `lot-4-exercices-interactifs`, PR vers `main`, fusion après CI verte.

## Écarts connus, à trancher avant de commencer

1. **Conversion WebP et deux tailles d'image** (architecture 8) non traitée, voir
   décision D. À inscrire explicitement dans un lot, sinon elle sera oubliée.
2. **La table `document` n'a pas de `cree_le`**, oubliée par la migration
   `ajoute_cree_le_contenu`. Tranché : **non corrigé ici.** Le lot 4 ouvre bien une
   migration, mais la mêler à ce correctif rendrait les deux plus difficiles à
   relire et à revenir en arrière séparément. L'écart reste inscrit en section 6 de
   `docs/lot-3-cloture-todo.md`. Il vaut une migration à lui seul,
   `ajoute_cree_le_document`, en deux temps `ADD COLUMN` puis `SET DEFAULT` comme
   l'exige `CLAUDE.md` pour une table déjà peuplée.
3. **`/api/matieres/[matiereId]/chapitres` renvoie une liste non bornée**, contre
   la convention de pagination par curseur. Indépendant du lot 4.
