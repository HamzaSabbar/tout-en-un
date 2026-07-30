# Plan — Lot 1. Contenu et back-office

Référence : `docs/architecture.md` sections 4, 5.2, 6, 8. `docs/roadmap.md`
lot 1. Invariants de la section 1 de l'architecture, notamment : filtrage des
brouillons en requête (pas à l'affichage), suppression logique uniquement
(`supprime_le`), une page ne parle jamais à Prisma directement.

Décisions de conception :
- **Stockage fichiers** : interface de stockage construite maintenant (comme
  `src/lib/mail/mailer.ts` pour l'email), implémentation Supabase Storage
  réelle mais sans identifiants pour l'instant — brancher les credentials plus
  tard ne demandera aucun changement de code appelant.
- **Découpage** : un seul plan, exécuté en phases séquentielles sur cette
  branche, avec vérification à la fin de chaque phase.

## Conventions à reprendre du lot 0

- Chaque service exporte des fonctions qui prennent une entrée `unknown`,
  valident avec un schéma Zod, et retournent un type résultat discriminé
  (`{ succes: true; ... } | { succes: false; erreur: string }`), comme
  `src/modules/acces/service.ts`.
- Les schémas Zod vivent à côté du service qui les utilise (pas un fichier
  `schemas.ts` géant).
- Un service externe pas encore configuré s'implémente derrière une interface
  minimale avec un stub explicite (voir `src/lib/mail/mailer.ts`), jamais en
  bloquant la fonctionnalité ni en la simulant silencieusement sans le dire.
- `requireAuth()` / `requirePermission()` de `src/modules/acces/require-auth.ts`
  gardent toute page et toute server action du back-office. La permission
  `contenu:gerer` existe déjà dans `permissions.ts` (admin + professeur) —
  aucun changement à cette matrice n'est nécessaire pour ce lot.
- Tests unitaires par fichier de service, sur le modèle de
  `src/modules/acces/service.test.ts` (Prisma mocké via `vi.mock("@/lib/db")`).

## Modèle de données (une migration)

Ajouter au schéma, dans l'esprit de `abonnement_matiere` déjà documenté en
5.10 :

- `Filiere` (code unique, libelle, ordre, actif)
- `Matiere` (code unique, libelle, description, icone, couleur, statut, ordre)
- `FiliereMatiere` (id, filiere_id, matiere_id, `@@unique([filiere_id, matiere_id])`)
- `Chapitre` (matiere_id, libelle, description, icone, ordre, statut)
- `Cours` (chapitre_id, titre, description, ordre, statut, professeur_id
  nullable → `Utilisateur`, publie_le)
- `Video` (cours_id, titre, description, duree_secondes, fournisseur en
  `String` libre — pas d'enum, pour changer d'hébergeur sans migration —,
  video_ref, ordre, statut)
- `Fichier` (nom, cle_stockage, type_mime, taille, televerse_par → `Utilisateur`,
  cree_le)
- `Document` (type enum `cours_pdf | resume_pdf | correction_pdf | sujet_pdf |
  support_live`, titre, matiere_id / chapitre_id / cours_id optionnels,
  fichier_id, statut)
- Enum partagé `Statut { brouillon publie }` réutilisé par matiere, chapitre,
  cours, video, document.
- `supprime_le DateTime?` sur matiere, chapitre, cours, video, document,
  fichier (invariant 8 : pas de suppression physique).
- Index `(cours_id, statut, ordre)` sur `Video` (affichage d'un cours en une
  passe, invariant 10).

Une seule migration Prisma pour tout le modèle du lot
(`npx prisma migrate dev --name ajoute_contenu_pedagogique`), suivie de
`npx prisma generate`.

## Phase 1 — Services de contenu (arborescence)

`src/modules/contenu/`, un fichier par entité (même granularité que
`src/lib/auth/*.ts`) :

- `filiere.ts` — CRUD filière + gestion des liens `filiere_matiere`
- `matiere.ts` — CRUD matière
- `chapitre.ts` — CRUD chapitre, réordonnancement (`ordre`), publier/dépublier
- `cours.ts` — CRUD cours, réordonnancement, publier/dépublier, dupliquer
- `video.ts` — CRUD vidéo (métadonnées seulement — pas de lecture vidéo, c'est
  le lot 3)

Chaque fichier expose les mêmes formes : `creerX`, `listerX`, `modifierX`,
`publierX` / `depublierX`, `dupliquerX` (copie en `brouillon`, `ordre` en fin
de liste), `supprimerX` (logique, `supprime_le`).

Tests : un fichier `*.test.ts` par entité, Prisma mocké, un test par branche
(création valide, validation refusée, publication, duplication, suppression
logique qui ne touche pas `supprime_le` des autres lignes).

## Phase 2 — Stockage et documents

- `src/lib/storage/storage.ts` : interface (`televerser`, `genererUrlSignee`,
  `supprimer`) + implémentation Supabase Storage. Variables d'env optionnelles
  ajoutées à `src/lib/env.ts` (`SUPABASE_STORAGE_URL`,
  `SUPABASE_STORAGE_KEY`, `SUPABASE_STORAGE_BUCKET`) : absentes du schéma
  obligatoire (le build ne doit pas échouer sans elles maintenant), mais
  l'implémentation lève une erreur claire si on l'appelle sans qu'elles soient
  configurées.
- `src/modules/contenu/document.ts` : `televerserDocument` (valide le
  fichier — type MIME, taille —, appelle le stockage avec la convention de clé
  `matiere/chapitre/cours/type-identifiant.pdf`, crée `Fichier` puis
  `Document`), `remplacerFichier` (même `fichier.id`, nouvelle clé de
  stockage — ne casse aucune référence existante), `listerMediatheque`
  (recherche par nom/type sur `Fichier`), `supprimerDocument` (logique).

Tests avec le stockage mocké (`vi.mock("@/lib/storage/storage")`), sur le
modèle de `service.test.ts` avec le mailer mocké.

## Phase 3 — Back-office

Nouveau groupe de routes `src/app/(admin)/contenu/`, chaque page appelant
`requirePermission("contenu:gerer")` en première ligne (comme `compte/page.tsx`
appelle `requireAuth()`) :

- `filieres/` — liste, création, association des matières
- `matieres/` — liste, création
- `[matiereId]/chapitres/` — liste des chapitres d'une matière, créer,
  réordonner, publier
- `[matiereId]/chapitres/[chapitreId]/` — liste des cours, créer, réordonner,
  publier, dupliquer
- `[matiereId]/chapitres/[chapitreId]/cours/[coursId]/` — détail d'un cours :
  vidéos rattachées, documents rattachés, formulaire de téléversement
- `fichiers/` — médiathèque : recherche, remplacement

Formulaires courts avec les composants shadcn déjà installés
(`Input`, `Label`, `Button`, `Card`, `Select`), `useActionState` + `FormData`
comme `inscription/page.tsx`. Un seul fichier `src/modules/contenu/actions.ts`
regroupant les server actions, comme `src/modules/acces/actions.ts`.

## Phase 4 — Vérification du critère de sortie

Test E2E `e2e/lot1-contenu.spec.ts` : un compte admin crée une filière, une
matière, l'associe, crée un chapitre puis un cours, ajoute une vidéo et
téléverse un document — le tout reste en `brouillon`. Vérifier :
- la page reste accessible seulement à un rôle avec `contenu:gerer`
- publier en un clic change le statut sans perte des données liées

Puis, comme pour le lot 0 : `npm run typecheck`, `npm run lint`,
`npx vitest run`, `npm run test:e2e`, et un `next build` propre.

## Clôture du lot

Mêmes commandes que pour la clôture du lot 0 (typecheck, lint, tests unitaires,
build, e2e en mode `CI=true` pour matcher le pipeline). Cocher les cases du lot
1 dans `docs/roadmap.md` dans le même commit que le code, comme documenté dans
« Comment traiter un lot ».
