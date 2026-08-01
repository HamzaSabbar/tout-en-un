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
      `npm run test:e2e`, ce qui inclut `e2e/lot3-parcours-eleve.spec.ts`.
- [x] En cas d'échec, les traces, captures et rapports Playwright sont conservés
      sept jours comme artefact `playwright-report`.
- [ ] Le job `CI / ci` réussit sur la branche publiée ou la pull request.

Docker local n'est plus un prérequis de clôture. `.env.test` reste disponible
pour une exécution locale volontaire, mais GitHub Actions et sa base temporaire
sont la source de vérité pour la recette E2E.

## 2. Recette Playwright du parcours élève

- [x] Playwright collecte six scénarios dans
      `e2e/lot3-parcours-eleve.spec.ts` sans dépendre de Docker local.
- [ ] Un compte autorisé parcourt matière → chapitre → cours → ressources.
- [ ] Un compte non autorisé ne reçoit le contenu ni par l'interface ni par API.
- [ ] Sous profil 4G, le premier affichage utile reste inférieur à 2,5 secondes.
- [ ] Le lecteur vidéo ne charge ni route média, ni iframe, ni chunk lecteur avant
      le clic ; les trois apparaissent seulement après le clic.
- [ ] Une page contenant 31 vidéos et 31 PDF reste complète et navigable.
- [ ] Les réponses HTML, RSC et JSON ne contiennent aucune référence vidéo ni
      clé de stockage permanente.
- [ ] Le trafic réseau initial ne contacte ni YouTube ni Supabase Storage.
- [ ] La route PDF renvoie `403` sans accès et un statut différent de `403` avec
      accès.

Commande :

```sh
npm run test:e2e -- e2e/lot3-parcours-eleve.spec.ts
```

Preuve actuelle : scénarios écrits et workflow prêt ; résultat en attente de
l'exécution GitHub Actions après publication de la branche.

## 3. Stockage PDF privé

- [!] Un PDF de test est réellement ouvert via un bucket privé provisionné.
- [x] L'appel de signature impose exactement 600 secondes, vérifié par le test
      unitaire avec stockage moqué.
- [ ] Aucun nom de bucket ni clé de stockage ne figure dans le HTML/RSC.
- [x] Le téléchargement reste un droit distinct de la lecture et est refusé par
      défaut par sa source dédiée.

Preuve actuelle : `SUPABASE_STORAGE_URL`, `SUPABASE_STORAGE_KEY` et
`SUPABASE_STORAGE_BUCKET` sont absentes, conformément à l'arbitrage du Lot 3.
La durée de 600 secondes est couverte avec stockage moqué. L'ouverture réelle
d'un PDF n'est pas vérifiable tant que le bucket privé n'est pas provisionné ;
ce point est une limite d'environnement documentée, pas une raison d'utiliser
une URL permanente ni d'ajouter une table hors périmètre.

## 4. Qualité et performance

- [x] `npm run typecheck` réussit.
- [x] `npm run lint` réussit sans avertissement ESLint.
- [x] `npm test` réussit intégralement : 26 fichiers, 198 tests.
- [x] `npm run build` réussit ; la page élève la plus lourde est annoncée à
      121 Ko de First Load JS par Next.js.
- [x] Après `npm run build`, `npm run budget:js` confirme entre 100,6 Ko et
      118,3 Ko de JavaScript compressé selon la page élève, sous la limite de
      200 Ko. Le workflow CI exécute également ces deux commandes dans cet ordre.
- [x] `git diff --check` ne signale aucune erreur de diff.

## 5. Revue finale et clôture Git

- [ ] La recette GitHub Actions valide le viewport mobile à 375 px sans
      débordement horizontal, ainsi qu'une cible tactile de 44 px et son focus
      clavier sur le bouton de lecture.
- [x] `docs/roadmap.md` coche les cinq éléments implémentés, garde l'index futur
      non coché et documente explicitement les limites stockage/index.
- [x] Aucun changement de schéma hors périmètre du Lot 3 (`git diff --name-only
      -- prisma` est vide).
- [x] Le scan statique ne détecte aucun motif de secret ; `.env.test` et les
      répertoires de build restent ignorés par Git.
- [ ] L'absence d'URL média permanente dans le HTML/RSC et le trafic doit encore
      être prouvée par la recette Playwright.
- [x] `git status` ne contient que les fichiers attendus du Lot 3 et de sa
      checklist, sans fichier de test ou build accidentel.
- [ ] Le code, les tests et la roadmap sont prêts dans un même commit local.
- [ ] La branche n'est poussée qu'après validation explicite ; elle n'est
      fusionnée qu'après réussite du job `CI / ci` et revue des éventuels
      artefacts Playwright.

Preuve actuelle : la recette mobile et réseau est codée dans Playwright. Son
exécution de référence est désormais déléguée à GitHub Actions sur PostgreSQL
éphémère ; aucune réussite E2E n'est déclarée avant le verdict du job. La branche
locale pointe encore sur le même commit que `origin/main` et toutes les
modifications du Lot 3 sont non commitées : aucun run GitHub Actions ne peut donc
encore couvrir cet état du code.
