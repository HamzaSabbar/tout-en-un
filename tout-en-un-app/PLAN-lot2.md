# Plan — Lot 2. Accès et abonnements

## Contexte

Les lots 0 (socle, authentification, matrice de rôles) et 1 (contenu pédagogique
et back-office) sont livrés et fusionnés. Le lot 2 est le suivant dans
`docs/roadmap.md`, ses dépendances sont donc satisfaites.

Ce lot implémente la règle métier la plus sensible de la plateforme : qui a le
droit de lire quel contenu. Aujourd'hui rien ne protège le contenu pédagogique,
parce qu'aucun modèle d'abonnement n'existe et que `verifierAccesMatiere()` n'est
pas encore écrite. Tant que ce lot n'est pas fait, la plateforme ne peut accueillir
aucun élève payant : c'est le verrou du jalon J2.

Résultat attendu : un élève s'inscrit en choisissant sa filière, demande l'accès à
des matières, l'admin encaisse hors ligne puis active en un clic, et toute lecture
de contenu passe par une fonction d'autorisation unique côté serveur. Le contenu
non autorisé ne quitte pas le serveur, il n'est pas seulement masqué.

Références : `docs/architecture.md` sections 5.1, 5.9, 5.10, 6, 13, et les
invariants de la section 1, en particulier l'invariant 1 (une seule
implémentation de `verifierAccesMatiere`), l'invariant 2 (le contenu non
autorisé ne quitte pas le serveur), l'invariant 5 (une page ne parle jamais à
Prisma), l'invariant 7 (chaque route d'API se vérifie elle-même), l'invariant 8
(pas de suppression physique) et l'invariant 10 (pas de N+1).

Branche : `lot-2-acces-abonnements`. Le plan sera recopié dans `PLAN-lot2.md` à la
racine du projet au démarrage de l'implémentation, comme au lot 1.

## Décisions de conception

**1. Index d'accès : suivre `docs/architecture.md` §5.10, pas le libellé littéral
de la roadmap.** La checklist demande un index
`abonnement_matiere (utilisateur_id, matiere_id, statut)`, or cette table n'a ni
`utilisateur_id` ni `statut` dans le schéma de référence : le statut vit sur
`abonnement`. Dupliquer ces deux colonnes imposerait une double écriture à chaque
annulation, avec risque de statut périmé, exactement ce qu'un contrôle d'accès ne
peut pas se permettre. Trois index réels donnent le même plan d'exécution (deux
lookups indexés en cascade) :

- `abonnement (utilisateur_id, statut)`
- `abonnement_matiere (abonnement_id, matiere_id)`, l'unique déjà imposé par §5.9
- `abonnement_matiere (matiere_id, date_expiration)`, repris de `idx_acces_matiere`

L'expiration est toujours lue en direct sur `date_expiration`, jamais sur un
indicateur mis en cache. **Mettre à jour la ligne correspondante de
`docs/roadmap.md` et ajouter une note en §5.9 de `docs/architecture.md`** pour
acter la reformulation dans le même commit que le code.

**2. Parcours élève en deux étapes.** L'inscription reste courte (nom, prénom,
email, téléphone, ville, filière, mot de passe). Le choix des matières et de
l'offre se fait ensuite sur `/demande-acces`, page réutilisable pour tout ajout de
matière ou renouvellement ultérieur. L'architecture §13 décrit le parcours en une
passe, mais une page de demande séparée serait de toute façon nécessaire pour les
demandes ultérieures : autant n'en écrire qu'une.

**3. Surface de preuve minimale, page et API.** Le vrai parcours élève est le
lot 3. Ce lot livre une page `(eleve)/matieres/[matiereId]` volontairement pauvre
(liste des chapitres publiés) et une route `GET /api/matieres/[matiereId]/chapitres`,
toutes deux gardées par `verifierAccesMatiere()`. Le composant des trois écrans de
refus est écrit pour être réutilisé tel quel au lot 3.

## Conventions reprises des lots 0 et 1

- Service = entrée `unknown`, validation Zod `safeParse`, retour discriminé
  `Resultat`, comme `src/modules/contenu/matiere.ts`.
- Schémas Zod colocalisés avec leur service, pas de fichier `schemas.ts` géant.
- Service externe non branché = interface minimale plus stub explicite, jamais un
  no-op silencieux, comme [mailer.ts](tout-en-un-app/src/lib/mail/mailer.ts).
- Page = server component qui appelle un service, plus un sous-composant client
  `*-form.tsx` en `useActionState`, comme `src/app/(admin)/contenu/*`.
- Un fichier `*.test.ts` par service, Prisma mocké via `vi.mock("@/lib/db")`.
- Server actions regroupées dans un unique `actions.ts` par module, chaque action
  ouvrant sur `requirePermission(...)`.

## Modèle de données (une migration)

`npx prisma migrate dev --name ajoute_acces_et_abonnements`, puis
`npx prisma generate`.

Modifications de [schema.prisma](tout-en-un-app/prisma/schema.prisma) :

- **`Utilisateur`** : ajouter `filiere_id BigInt?` (nullable : seuls les élèves ont
  une filière, et les comptes existants n'en ont pas), relation vers `Filiere`,
  `@@index([filiere_id])`, plus les back-relations `abonnements`,
  `demandes_matiere`, `demandes_traitees`, `actions_admin`.
- **`Filiere`** : back-relation `eleves Utilisateur[]`.
- **`Matiere`** : back-relations `abonnements_matiere`, `demandes`.
- **Enums** : `StatutAbonnement { en_attente actif expire annule }`,
  `StatutPaiement { en_attente paye }`,
  `StatutDemande { en_attente traitee refusee }`, chacun avec son `@@map`.
- **`Offre`** : `libelle`, `description?`, `duree_jours Int`, `nb_matieres Int`,
  `prix Decimal @db.Decimal(10,2)`, `actif`, `supprime_le?`.
- **`Abonnement`** : `utilisateur_id`, `offre_id`, `date_debut?`, `date_fin?`,
  `statut StatutAbonnement @default(en_attente)`, `montant Decimal`,
  `paiement_statut StatutPaiement @default(en_attente)`, `reference_paiement?`,
  `note_admin?`, `cree_le`. `@@index([utilisateur_id, statut])`.
- **`AbonnementMatiere`** : `abonnement_id`, `matiere_id`, `date_activation`,
  `date_expiration`. `@@unique([abonnement_id, matiere_id])` et
  `@@index([matiere_id, date_expiration])`. Ni `utilisateur_id` ni `statut`, voir
  décision 1.
- **`DemandeMatiere`** : `utilisateur_id`, `matiere_id`, `abonnement_id`,
  `statut StatutDemande @default(en_attente)`, `message?`, `cree_le`,
  `traite_le?`, `traite_par?`. `@@index([statut, cree_le])` pour la file admin.
  L'ajout de `abonnement_id` par rapport à la liste de §5.1 est assumé : sans lui,
  la file ne sait pas à quel panier (donc quelle offre et quel montant par défaut)
  rattacher une demande quand un élève en soumet plusieurs.
- **`JournalAdmin`** : `utilisateur_id`, `action String`, `entite String`,
  `entite_id BigInt`, `avant Json?`, `apres Json?`, `cree_le`.
  `@@index([entite, entite_id])`, `@@index([utilisateur_id, cree_le])`.

Cardinalité retenue : un `Abonnement` est créé au moment de la demande (statut
`en_attente`, montant préempli depuis l'offre, dates nulles), une `DemandeMatiere`
par matière du panier. La première activation bascule l'abonnement en `actif` et
fixe `date_debut`, `reference_paiement` et `paiement_statut` ; les activations
suivantes ne font qu'ajouter une ligne `abonnement_matiere`. Chaque matière porte
sa propre `date_expiration`, ce qui autorise le cas décrit en §5.1 : Physique-Chimie
active et Mathématiques expirée dans le même abonnement.

## Phase 1 — Fondations du module `acces`

- Déplacer `src/modules/contenu/resultat.ts` vers `src/lib/resultat.ts` et corriger
  les imports dans les six services de `contenu/`. Le module `abonnement` a besoin
  du même type, et l'importer depuis `contenu/` violerait l'étanchéité des modules.
- `src/modules/acces/acces-matiere.ts` : type
  `MotifAcces = "ok" | "hors_filiere" | "non_souscrit" | "expire"` et
  `verifierAccesMatiere(utilisateurId: bigint, matiereId: bigint)` renvoyant
  `{ autorise, motif }`. Une seule requête `prisma.utilisateur.findUnique`
  sélectionne le rôle, la `filiere_id`, la liaison `filiere_matiere` filtrée sur
  `matiereId`, et les `abonnement_matiere` de cette matière sous les abonnements
  au statut `actif`. Décision en mémoire ensuite : rôle `admin` ou `professeur`
  → `ok` (voit tout, brouillons compris) ; sinon filière absente ou matière non
  rattachée → `hors_filiere` ; sinon aucune ligne d'abonnement → `non_souscrit` ;
  sinon `date_expiration` la plus lointaine dépassée → `expire` ; sinon `ok`.
  La fonction refait sa propre lecture en base plutôt que de faire confiance à la
  session, conformément à la signature de §6.
- `src/modules/acces/require-auth.ts` : ajouter `requireAnyPermission(permissions)`,
  même forme que `requirePermission`, pour le layout admin partagé.
- Tests `acces-matiere.test.ts` : un cas par motif, les deux bypass de rôle, et le
  cas limite d'une expiration exactement à l'instant courant.

## Phase 2 — Module `abonnement`

Nouveau `src/modules/abonnement/`, un fichier par entité :

- `offre.ts` : `creerOffre`, `modifierOffre`, `listerOffres`,
  `listerOffresActives` (pour le formulaire élève), `supprimerOffre` (logique).
- `demande.ts` : `creerDemande(utilisateurId, input)` crée dans une `$transaction`
  l'`Abonnement` en attente puis une `DemandeMatiere` par matière. Les matières
  sont revalidées côté serveur contre la filière de l'élève, pas seulement filtrées
  dans le formulaire. `listerDemandesEnAttente()` charge en une requête agrégée
  l'élève (nom, téléphone, filière), la matière et l'offre.
- `abonnement.ts` : `activerAcces({ utilisateurId, matiereId, offreId, dureeJours,
  montant, referencePaiement, adminId, demandeId? })`, fonction unique servant à la
  fois l'activation initiale et le renouvellement. Dans une `$transaction` :
  réutilise ou crée l'abonnement, `upsert` de `abonnement_matiere`
  (`date_expiration = now + dureeJours`), marque la demande `traitee` si
  `demandeId` est fourni, écrit le journal. Hors transaction, après commit :
  confirmation WhatsApp, dont l'échec est journalisé mais jamais fatal.
  Également `refuserDemande`, `annulerAbonnement` (statut `annule`, jamais de
  suppression physique), `modifierAbonnement`, `listerAccesEleve`.
- Tests : une branche par cas (activation initiale, activation sur abonnement déjà
  actif, renouvellement sans demande, refus, annulation, modification), journal et
  WhatsApp mockés.

## Phase 3 — Journal d'audit

`src/modules/audit/journal.ts` : `consignerAction({ utilisateurId, action, entite,
entiteId, avant?, apres? })`, appelable **à l'intérieur** des mêmes `$transaction`
que la mutation qu'il trace, pour qu'aucun crash ne puisse produire une activation
sans trace.

Points d'appel, tous dans les services et jamais dans les server actions (qui
restent de simples adaptateurs) : `activerAcces` → `activation`,
`modifierAbonnement` → `modification`, `refuserDemande` → `refus`,
`annulerAbonnement` → `annulation`, `supprimerOffre` → `suppression`.

## Phase 4 — WhatsApp et inscription

- `src/lib/whatsapp/whatsapp.ts` : interface `MessageWhatsAppAEnvoyer
  { destinataire, corps }` et `envoyerWhatsApp()`, calqué sur
  [mailer.ts](tout-en-un-app/src/lib/mail/mailer.ts) mais toujours visible en
  console, y compris en production : rien de sensible n'y transite, contrairement
  aux jetons de réinitialisation. Aucune variable d'environnement pour l'instant.
- [inscription/page.tsx](tout-en-un-app/src/app/(public)/inscription/page.tsx)
  devient un server component qui appelle `listerFilieres()` (actives seulement) et
  passe les options à un nouveau `inscription-form.tsx` client reprenant le
  formulaire actuel, augmenté d'un `Select` de filière (`select.tsx` est déjà
  installé).
- `inscriptionSchema` gagne `filiere_id`, et `register()` vérifie que la filière
  existe et est active avant de créer le compte.

## Phase 5 — Back-office abonnements

- [layout.tsx](tout-en-un-app/src/app/(admin)/layout.tsx) : remplacer
  `requirePermission("contenu:gerer")` par
  `requireAnyPermission(["contenu:gerer", "abonnements:gerer"])`, et n'afficher que
  les liens de navigation correspondant aux permissions réelles. Chaque page garde
  sa propre vérification exacte (défense en profondeur, invariant #7).
- `src/app/(admin)/abonnements/page.tsx` : la file de traitement. Une ligne par
  demande en attente avec nom, téléphone, filière, matière et offre, un formulaire
  d'activation inline (durée, montant, référence de paiement) et un bouton de refus.
- `src/app/(admin)/abonnements/eleves/page.tsx` : accès d'un élève et
  renouvellement matière par matière, réutilisant `activerAcces` sans `demandeId`.
- `src/app/(admin)/abonnements/offres/page.tsx` : CRUD minimal des offres, même
  gabarit que `contenu/matieres`.
- `src/modules/abonnement/actions.ts` : `activerDemandeAction`,
  `refuserDemandeAction`, `renouvelerAccesAction`, `modifierAbonnementAction`,
  `annulerAbonnementAction`, `creerOffreAction`, `basculerOffreAction`.

## Phase 6 — Surface élève minimale

- `src/components/acces-refuse.tsx` : les trois écrans différenciés par motif.
  `non_souscrit` propose la demande d'accès, `expire` invite au renouvellement,
  `hors_filiere` affiche un message neutre. Composant pensé pour être repris tel
  quel au lot 3.
- `src/app/(eleve)/demande-acces/page.tsx` : `requireAuth()`, charge les matières
  de la filière de l'élève et les offres actives, rend un formulaire client relié à
  `creerDemandeAction`. Lien ajouté depuis la page compte.
- `src/app/(eleve)/matieres/[matiereId]/page.tsx` : `requireAuth()` puis
  `verifierAccesMatiere()`. Si refusé, la page rend `<AccesRefuse />` et rien
  d'autre, sans exécuter la moindre requête de contenu. Si autorisé, elle liste les
  chapitres publiés, via une variante `listerChapitresPublies(matiereId)` filtrant
  `statut: "publie"` dans la requête (invariant #6).
- `src/app/api/matieres/[matiereId]/chapitres/route.ts` : `GET`, 401 sans session,
  403 avec le seul `{ motif }` si l'accès est refusé, 200 avec les chapitres sinon.
  La route revérifie l'accès elle-même, indépendamment de la page.

Aucune modification de [middleware.ts](tout-en-un-app/src/middleware.ts) : il ne
fait que rafraîchir le cookie, toute autorisation reste server-side par page et par
action.

## Vérification

Test `e2e/lot2-acces.spec.ts`, sur le modèle de
[lot1-contenu.spec.ts](tout-en-un-app/e2e/lot1-contenu.spec.ts) (seed Prisma direct
plus parcours Playwright) :

1. Seed : filière A, matière M rattachée à A avec un chapitre publié, élève en
   filière A sans aucun abonnement.
2. Page `/matieres/{M}` → écran `non_souscrit` affiché, et assertion négative
   explicite : le libellé du chapitre seedé n'apparaît nulle part.
3. `page.request.get("/api/matieres/{M}/chapitres")` avec le même cookie de session
   → statut 403, et le corps JSON ne contient ni le titre ni l'identifiant du
   chapitre. C'est le cœur du critère de sortie : absence littérale de la ressource
   dans la réponse, pas seulement un code d'erreur.
4. Contre-scénario positif : l'admin crée une offre, l'élève soumet sa demande,
   l'admin l'active depuis la file → la page affiche le chapitre et l'API renvoie
   200 avec le chapitre.
5. Motif `expire` : `abonnement_matiere` seedé avec une expiration passée → écran
   `expire` et 403.
6. Motif `hors_filiere` : élève d'une filière B → écran neutre et 403.

Commandes de clôture, sortie à montrer et non à affirmer : `npm run typecheck`,
`npm run lint`, `npx vitest run`, `npm run test:e2e` en `CI=true`, et un
`next build` propre.

## Corrections issues de la relecture

La relecture du diff par un sous-agent en contexte neuf a trouvé deux défauts
bloquants, corrigés avant commit :

1. **Le back-office contenu n'était plus gardé.** Assouplir le layout `(admin)`
   en `requireAnyPermission` a suffi à ouvrir `/contenu/*` au rôle `commercial`,
   parce qu'aucune page de cette section ne se vérifiait elle-même : masquer les
   liens de navigation n'est pas un contrôle d'accès. Les six pages
   `(admin)/contenu/**` appellent désormais `requirePermission("contenu:gerer")`
   en première ligne, et `e2e/lot2-acces.spec.ts` le prouve en tapant les URL
   directement avec un compte `commercial`.
2. **`activerAcces()` faisait confiance au `demande_id` du formulaire.** La
   demande n'était vérifiée ni sur son élève, ni sur sa matière, ni sur son
   statut : un formulaire rejoué pouvait ouvrir un accès sur l'abonnement d'un
   autre élève, fausser le journal d'audit et clore une demande non honorée. La
   demande est maintenant chargée avec `utilisateur_id`, `matiere_id` et
   `statut: "en_attente"` dans le `where`.

Corrections secondaires du même passage : un abonnement `annule` n'est plus
réactivé par une demande restante (sinon ses autres matières rouvraient sans
paiement) ; `verifierAccesMatiere` refuse une matière supprimée ou repassée en
brouillon (l'API la servait encore) ; `activerAcces` vérifie que la matière
appartient à la filière de l'élève et que l'offre existe ; `creerDemande`
refuse un panier plus large que `offre.nb_matieres` ; les identifiants d'URL et
de formulaire passent par `src/lib/identifiant.ts` (bornes int8, refus de
`"0x10"` et de la chaîne vide) au lieu d'un `BigInt()` nu qui produisait des
500. Les tests qui laissaient passer ces défauts ont été renforcés.

## Clôture du lot

Dans le même commit que le code : cocher les huit cases du lot 2 dans
`docs/roadmap.md`, y reformuler la ligne d'index conformément à la décision 1, et
ajouter la note correspondante en §5.9 de `docs/architecture.md`.
