# Clôture du Lot 3 — checklist de vérification

Cette checklist est la preuve de clôture du Lot 3. Une case n'est cochée que si
la commande correspondante a réellement réussi dans l'environnement prévu.

Statuts : `[ ]` à faire, `[x]` vérifié, `[!]` bloqué avec cause et prochaine action.

## 1. Environnement E2E isolé dans GitHub Actions

- [x] `.github/workflows/ci.yml` provisionne un service PostgreSQL 16 éphémère,
      avec contrôle de santé, détruit automatiquement à la fin du job.
- [x] `DATABASE_URL` et `DIRECT_URL` sont imposées par le workflow vers
      `localhost:5432` ; aucune URL de base partagée ni aucun secret Supabase
      n'est transmis au job.
- [x] Le workflow exécute `prisma migrate deploy` avant Playwright.
- [x] La barrière `exigerBaseDeTest()` accepte cette cible locale et continue de
      refuser une base distante sans double confirmation explicite.
- [x] Le workflow installe Chromium puis lance toute la suite avec
      `npm run test:e2e`, ce qui inclut `e2e/lot3-parcours-eleve.spec.ts` et
      `e2e/lot3-back-office-pdf.spec.ts`.
- [x] En cas d'échec, les traces, captures et rapports Playwright sont conservés
      sept jours comme artefact `playwright-report`.
- [ ] Le job `CI / ci` réussit sur la pull request. Run #17 sur `7c7626d` avait
      réussi ; à revérifier après le commit de correction, qui touche au stockage
      et à la publication.

Un push sur la branche seule ne déclenche rien : le workflow n'écoute que `main`
et les pull requests vers `main`. La PR #7 est donc le seul déclencheur.

Docker local n'est plus un prérequis de clôture. `.env.test` reste disponible
pour une exécution locale volontaire, mais GitHub Actions et sa base temporaire
sont la source de vérité pour la recette E2E.

## 2. Recette Playwright du parcours élève

- [x] Playwright collecte sept scénarios dans `e2e/lot3-parcours-eleve.spec.ts` et
      `e2e/lot3-back-office-pdf.spec.ts`, sans dépendre de Docker local.
- [x] Un compte autorisé parcourt matière → chapitre → cours → ressources.
- [x] Un compte non autorisé ne reçoit le contenu ni par l'interface ni par API.
- [x] Sous profil 4G, le premier affichage utile reste inférieur à 2,5 secondes.
- [x] Le lecteur vidéo ne charge ni route média, ni iframe, ni chunk lecteur avant
      le clic ; les trois apparaissent seulement après le clic.
- [x] Une page contenant 31 vidéos et 31 PDF reste complète et navigable.
- [x] Les réponses HTML, RSC et JSON ne contiennent aucune référence vidéo ni
      clé de stockage permanente.
- [x] Le trafic réseau initial ne contacte ni YouTube ni Supabase Storage.
- [x] La route PDF renvoie `403` sans accès et `307` vers une URL signée avec accès.

Commande :

```sh
npm run test:e2e
```

Preuve : toute la suite passe contre un build de production
(`next build && next start`) sur une base PostgreSQL jetable et migrée.

Note d'implémentation : lire `response.body()` pendant une transition RSC a
empêché le routeur Next.js de finaliser cette transition dans GitHub Actions.
L'audit récupère donc séparément le HTML et le RSC avec la session authentifiée,
puis observe une navigation Playwright normale sans lire les réponses en vol.

## 3. Parcours PDF complet, du back-office à l'élève

- [x] Un document téléversé peut être publié. `publierDocument` et
      `depublierDocument` existent, `publierDocumentAction` vérifie
      `contenu:gerer`, et la fiche de cours du back-office porte le bouton.
      **C'était le défaut bloquant du lot** : sans chemin de publication, tout PDF
      téléversé restait invisible pour l'élève, la page de cours filtrant
      `statut = 'publie'`.
- [x] `e2e/lot3-back-office-pdf.spec.ts` prouve le parcours par l'interface
      réelle : téléversement par le formulaire, publication par le bouton, puis
      lecture par un élève abonné jusqu'aux **octets** du PDF. Aucun
      `statut: "publie"` n'est écrit directement en base.
- [x] Le document reste invisible pour l'élève tant qu'il est en brouillon et
      apparaît immédiatement après publication : la même assertion prouve
      l'invalidation ciblée du cache.
- [x] L'appel de signature impose exactement 600 secondes, vérifié par le test
      unitaire avec stockage moqué et par celui de l'adaptateur local.
- [x] Une signature altérée ou périmée est refusée par un `403` au corps vide,
      indistinguable d'une clé invalide.
- [x] Aucun nom de bucket ni clé de stockage ne figure dans le HTML ni dans le RSC.
- [x] Le téléchargement reste un droit distinct de la lecture et est refusé par
      défaut par sa source dédiée.
- [!] Le bucket privé Supabase de production n'est pas provisionné.
      `SUPABASE_STORAGE_URL`, `SUPABASE_STORAGE_KEY` et
      `SUPABASE_STORAGE_BUCKET` restent absentes.

Sur ce dernier point : ce n'est plus un obstacle à la vérification. Hors
production, le stockage bascule sur un répertoire local `.stockage-local/` qui
sert ses fichiers par URL signée de 600 secondes, ce qui rend le parcours réel
exécutable et prouvé en développement comme en intégration continue. En
production sans configuration, l'appel échoue clairement plutôt que d'écrire sur
un disque éphémère, et la route locale renvoie 404. Provisionner le bucket reste
une tâche d'exploitation à mener avant l'ouverture commerciale, pas une inconnue
de conception. Voir architecture section 8, y compris pour la raison pour laquelle
la route locale autorise par capacité signée plutôt qu'en rappelant
`verifierAccesMatiere()`.

## 4. Qualité et performance

- [x] `npm run typecheck` réussit.
- [x] `npm run lint` réussit sans avertissement ESLint.
- [x] `npm test` réussit intégralement : 27 fichiers, 244 tests.
- [x] `npm run build` réussit ; la page élève la plus lourde est annoncée à
      121 Ko de First Load JS par Next.js.
- [x] Après `npm run build`, `npm run budget:js` confirme entre 100,6 Ko et
      118,3 Ko de JavaScript compressé selon la page élève, sous la limite de
      200 Ko. Le workflow CI exécute également ces deux commandes dans cet ordre.
- [x] `git diff --check` ne signale aucune erreur de diff.

## 5. Revue finale et clôture Git

- [x] La recette valide le viewport mobile à 375 px sans débordement horizontal,
      ainsi qu'une cible tactile de 44 px et son focus clavier sur le bouton de
      lecture.
- [x] `docs/roadmap.md` coche les éléments implémentés, garde l'index futur non
      coché, précise que les quatre cartes du tableau de bord sont des
      emplacements réservés dont les sources appartiennent aux lots 5 à 8, et
      documente le stockage local.
- [x] Aucun changement de schéma hors périmètre du Lot 3 (`git diff --name-only
      -- prisma` est vide).
- [x] Le scan statique ne détecte aucun motif de secret ; `.env.test`,
      `.stockage-local/`, `supabase/.temp/` et les répertoires de build restent
      ignorés par Git.
- [x] L'absence d'URL média permanente dans le HTML, le RSC et le trafic est
      prouvée par la recette Playwright.
- [x] `git status` ne contient que les fichiers attendus du Lot 3 et de sa
      checklist, sans fichier de test ou build accidentel. La fixture PDF
      inutilisée `e2e/fixtures/` a été supprimée : le scénario construit son PDF
      en mémoire.
- [ ] Le code, les tests et la roadmap sont prêts dans un même commit.
- [ ] La branche n'est fusionnée qu'après réussite du job `CI / ci` sur la PR #7
      et revue des éventuels artefacts Playwright.

## 6. Écarts connus, hors périmètre du Lot 3

Signalés pour ne pas être perdus, volontairement non corrigés ici.

- La table `document` n'a pas de colonne `cree_le` : la migration
  `20260731181043_ajoute_cree_le_contenu` a couvert `chapitre`, `cours`,
  `filiere`, `matiere`, `offre` et `video`, mais l'a omise. Une ligne de document
  n'est donc pas datable.
- `/api/matieres/[matiereId]/chapitres` renvoie une liste non bornée, contre la
  convention de pagination par curseur.
