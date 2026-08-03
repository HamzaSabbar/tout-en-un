# Tout en Un

Plateforme de révision pour les élèves de 2e année du Baccalauréat marocain.
Next.js 15 (App Router) en TypeScript, PostgreSQL 16, Prisma. Un seul déployable,
une seule base. Le professeur est l'unique administrateur.

Référence technique : `docs/architecture.md`. Lis la section utile, pas le fichier
entier. Ses invariants (section 1) s'appliquent à tout le code.
Lots de développement et critères de sortie : `docs/roadmap.md`.

## Commandes

- `npm run dev` : serveur de développement
- `npm run typecheck` et `npm run lint` : à lancer après chaque série de
  changements
- `npm test` : suite de tests. Préfère lancer un seul fichier de test pendant le
  développement
- `npx prisma migrate dev --name <nom>` : toute évolution du schéma. Jamais de
  SQL manuel, jamais de `db push` sur une base partagée
- `npx prisma studio` : inspection de la base locale

## Règles non négociables

- IMPORTANT : toute lecture de contenu pédagogique passe par
  `verifierAccesMatiere()` dans `src/modules/acces/`. Une seule implémentation.
  Ne la duplique pas, ne la contourne pas.
- L'accès se joue sur `abonnement_matiere`, matière par matière, jamais au niveau
  de `abonnement`.
- Aucune URL de fichier ou de vidéo en clair, ni en base, ni dans le HTML, ni
  dans une réponse d'API. URL signée de courte durée générée après vérification
  d'accès.
- Les options de réponse d'un test partent au client SANS le champ
  `est_correcte`. La correction est calculée côté serveur.
- Les brouillons (`statut = 'brouillon'`) sont filtrés dans la requête, pas à
  l'affichage.
- Chaque route d'API vérifie l'autorisation elle-même, indépendamment de ce que
  fait l'interface.
- Pas de suppression physique de contenu : renseigne `supprime_le`.
- La progression se dérive de `evenement_apprentissage`. N'écris jamais un
  pourcentage directement sans passer par un événement.

## Conventions

- Tables et colonnes en français, sans accent, au singulier, minuscules avec
  tirets bas : `filiere`, `matiere`, `chapitre`, `cours`, `abonnement_matiere`.
- Code, variables et commentaires en anglais. Seules les entités métier gardent
  leur nom français.
- Une page ou une route ne parle jamais à Prisma directement : elle appelle un
  service de `src/modules/<domaine>/`. L'accès aux données reste privé au module.
- Validation de toute donnée entrante par un schéma Zod côté serveur, y compris
  pour les formulaires du back-office.
- Réponses de liste paginées par curseur, jamais de liste non bornée.
- Horodatages stockés en UTC, affichés en heure du Maroc.
- Libellés d'interface externalisés, jamais en dur dans les composants.

## Pièges connus

- Une page de cours se charge en une requête agrégée. Un `include` Prisma
  imbriqué est préférable à une boucle de requêtes. Les schémas N+1 sont un
  défaut bloquant, pas une optimisation à faire plus tard.
- L'élève travaille surtout sur un écran large : les pages élève exploitent la
  largeur disponible. Le téléphone reste pris en charge jusqu'à 360 px.
- Plafond ferme de 200 Ko de JavaScript par page élève, mesuré par
  `npm run budget:js` et bloquant en intégration continue. Ce n'est pas un
  objectif mobile mais le garde-fou qui empêche l'expérience téléphone de se
  dégrader quand l'interface grand écran s'enrichit. Le lecteur vidéo et les
  composants lourds sont chargés en différé. Ce qui est ajouté pour le grand
  écran ne doit pas être téléchargé par le téléphone puis masqué en CSS.
- Le champ `video_ref` est neutre (identifiant plus fournisseur) pour permettre
  de changer d'hébergeur vidéo sans migration. Ne code pas d'URL YouTube en dur.
- Les pondérations de la formule de progression vivent dans la table
  `parametre`, pas dans le code.

## Workflow

- Une branche par lot, nommée `lot-<N>-<slug>`.
- Écris ou mets à jour le test qui prouve le critère de sortie du lot avant de le
  déclarer terminé, et montre la sortie de la commande plutôt que d'affirmer que
  ça passe.
- Coche les cases du lot dans `docs/roadmap.md` dans le même commit que le code.
- Ne commence pas un lot dont les dépendances listées dans `docs/roadmap.md` ne
  sont pas terminées.