# Architecture technique, Tout en Un

Référence technique de la plateforme. Ce fichier est la source de vérité pour les
décisions d'architecture, le modèle de données et les conventions. En cas de
divergence entre ce document et le code, le document a raison : corrige le code
ou mets le document à jour explicitement.

**Lecture ciblée.** Ne lis pas ce fichier en entier. Va à la section dont tu as
besoin via le sommaire. Les sections 1 et 2 sont les seules à lire
systématiquement avant d'écrire du code.

Version 1.0, juillet 2026. Feuille de route de réalisation : `docs/roadmap.md`.

## Sommaire

1. [Invariants non négociables](#1-invariants-non-négociables)
2. [Contexte et contraintes](#2-contexte-et-contraintes)
3. [Pile technologique](#3-pile-technologique)
4. [Organisation du code](#4-organisation-du-code)
5. [Modèle de données](#5-modèle-de-données)
6. [Règle d'accès matière](#6-règle-daccès-matière)
7. [Authentification et rôles](#7-authentification-et-rôles)
8. [Médias, fichiers et vidéos](#8-médias-fichiers-et-vidéos)
9. [Exercices et tests](#9-exercices-et-tests)
10. [Progression](#10-progression)
11. [Lives et replays](#11-lives-et-replays)
12. [Support pédagogique](#12-support-pédagogique)
13. [Abonnements et paiement](#13-abonnements-et-paiement)
14. [Notifications](#14-notifications)
15. [Sécurité et conformité](#15-sécurité-et-conformité)
16. [Performance](#16-performance)
17. [Conventions techniques](#17-conventions-techniques)
18. [Environnements et déploiement](#18-environnements-et-déploiement)
19. [Hors périmètre du MVP](#19-hors-périmètre-du-mvp)

---

## 1. Invariants non négociables

Ces règles ne se discutent pas dans une session de code. Si une tâche semble
exiger d'en violer une, arrête-toi et signale le conflit.

1. **Toute lecture de contenu pédagogique passe par `verifierAccesMatiere()`.**
   Une seule implémentation, côté serveur, dans `src/modules/acces/`. Ne la
   duplique jamais, ne la contourne jamais, ne la réimplémente pas en ligne.
2. **Le contenu non autorisé ne quitte pas le serveur.** Les pages protégées
   sont rendues côté serveur. Un masquage côté client n'est pas un contrôle
   d'accès.
3. **Aucune URL de fichier ou de vidéo en clair.** Ni en base, ni dans le HTML,
   ni dans une réponse d'API. Uniquement des URL signées de courte durée,
   générées après vérification d'accès.
4. **La bonne réponse d'une question de test ne sort jamais du serveur avant
   soumission.** Les options sont envoyées sans le champ `est_correcte`. La
   correction est calculée côté serveur.
5. **Une page ne parle jamais à la base directement.** Elle appelle un service
   de son module. L'accès aux données reste privé à l'intérieur du module.
6. **Les brouillons sont filtrés au niveau de la requête**, pas de l'affichage.
7. **Chaque route d'API vérifie l'autorisation**, indépendamment de ce que fait
   l'interface.
8. **Pas de suppression physique de contenu.** Suppression logique via
   `supprime_le`, pour ne jamais casser un historique de progression.
9. **Pas de modification manuelle du schéma en production.** Migrations Prisma
   versionnées uniquement.
10. **Pas de schéma N+1.** Une page de cours se charge en une requête agrégée,
    pas une requête par ressource.

## 2. Contexte et contraintes

La plateforme adresse les élèves de 2e année du Baccalauréat marocain, filières
Sciences Physiques, SVT, Sciences Maths A et Sciences Maths B. Elle regroupe :
cours structurés en grands chapitres, vidéos courtes, cours et résumés en PDF,
exercices interactifs notés par difficulté, extraits et sujets complets des
examens nationaux, tests, lives, replays, plan de travail personnel avec
chronomètre, et un canal de support pédagogique question / réponse.

**Contrainte structurante : un seul opérateur.** Le professeur est l'unique
administrateur. Trois conséquences d'architecture :

- Un seul déployable, une seule base de données. Pas de microservices.
- Le back-office est optimisé pour la vitesse de saisie, pas pour la
  délégation : formulaires courts, duplication d'éléments, publication en un
  clic, file de travail unique sur le tableau de bord.
- Les rôles et la notion d'auteur existent dès maintenant dans le modèle, même
  si un seul compte les porte. Ouvrir un rôle sera une attribution, pas une
  migration.

**Dimensionnement cible.**

| Paramètre | Année 1 | Horizon 3 ans |
|---|---|---|
| Élèves actifs | 100 à 500 | 3 000 à 5 000 |
| Simultanés en pointe (19h-23h) | 50 à 150 | 600 à 1 000 |
| Vidéos | 300 à 600 | 2 000 et plus |
| PDF et sujets | 500 à 1 500 | 5 000 et plus |
| Lives | 2 à 4 par semaine | 10 à 20 par semaine |
| Questions support | 10 à 40 par jour | 200 et plus par jour |

**Terminal dominant : ordinateur à grand écran.** L'élève travaille le plus
souvent assis, sur un écran large. Le téléphone est un usage secondaire mais
pleinement pris en charge : réviser en déplacement, revoir une correction, suivre
un live. L'interface est donc conçue pour l'écran large d'abord, puis repliée
proprement jusqu'à 360 px de largeur.

Trois conséquences d'architecture :

- Les pages élève **exploitent la largeur disponible** plutôt que de rester dans
  une colonne étroite : listes en plusieurs colonnes, sommaire et contenu côte à
  côte quand la place le permet, tableaux lisibles sans défilement horizontal.
- Les contraintes de poids et de latence du cas mobile **restent des plafonds
  fermes**, vérifiés en intégration continue. Ce sont elles qui font que « le
  téléphone reste possible » demeure vrai dans la durée plutôt qu'une intention :
  un budget qu'on ne mesure plus est un budget déjà perdu. Elles sont
  aujourd'hui tenues avec de la marge, ce qui laisse de la place pour enrichir
  l'expérience sur grand écran.
- Le rendu reste tolérant à une bande passante irrégulière et économe en coût
  d'infrastructure : ces qualités servent les deux terminaux, pas seulement le
  téléphone.

Une base relationnelle unique correctement indexée couvre confortablement ces
volumes.

Historique : le projet a démarré sur l'hypothèse inverse, mobile-first avec un
terminal Android dominant. L'arbitrage a été révisé après le lot 3 sur constat
d'usage. Les décisions prises sous l'ancienne hypothèse restent valides, elles
n'étaient pas dictées par elle seule, mais leur justification a changé de poids.

**Principes retenus.**

| Principe | Traduction concrète |
|---|---|
| Monolithe modulaire | Une application, découpée en modules métier étanches |
| Rendu serveur par défaut | Les pages sensibles sont rendues côté serveur |
| Autorisation centralisée | Une fonction unique répond à la question d'accès |
| Contenu comme donnée | Aucune mise en production pour ajouter un cours |
| Médias hors base | La base ne stocke que métadonnées et références |
| Traçage par événements | La progression découle d'événements horodatés |
| Manuel avant automatique | Paiement et activation restent des gestes admin |

Le découpage en services distincts n'apporterait aucun gain de disponibilité ni
de performance à ces volumes : lectures massivement dominantes, écritures peu
fréquentes. Le découpage se fait à l'intérieur du code, par modules à frontières
explicites, ce qui permet d'extraire un module en service autonome le jour où un
besoin réel le justifie.

## 3. Pile technologique

| Couche | Technologie | Note |
|---|---|---|
| Frontend et backend | Next.js 15 (App Router), TypeScript | Un seul projet, rendu serveur natif |
| Interface | Tailwind CSS, shadcn/ui | Composants accessibles, bundle maîtrisé |
| Base de données | PostgreSQL 16 | JSONB pour le contenu souple, recherche plein texte incluse |
| Accès données | Prisma ORM | Schéma typé, migrations versionnées |
| Authentification | Auth.js (NextAuth), session serveur | Sessions révocables, plafond d'appareils |
| Stockage fichiers | Supabase Storage ou Cloudflare R2 | Compatible S3, URL signées |
| Vidéo | YouTube non répertorié au MVP, puis Bunny Stream ou Cloudflare Stream | Voir section 8 |
| Formules | KaTeX (rendu LaTeX) | Rendu côté serveur |
| Emails | Resend ou Brevo | Transactionnels |
| Notifications | WhatsApp Cloud API | Canal réellement utilisé au Maroc |
| Supervision | Sentry, Plausible ou Umami | Erreurs et usage |
| Hébergement | Vercel + Supabase (scénario A retenu) | Voir section 18 |

Alternatives écartées : Laravel + Filament (front élève moins fluide sur mobile),
Django + React séparé (deux dépôts, double authentification), backend Node
séparé (complexité opérationnelle injustifiée à ce stade), solutions sans code
(exercices interactifs, extraits reliés aux cours, plan de travail et support
contextualisé non modélisables, donc perte du cœur de la valeur).

## 4. Organisation du code

```
src/
  app/
    (public)/          inscription, connexion, offres
    (eleve)/
      matieres/        choix de la matière
      [matiere]/
        dashboard/     4 cartes du tableau de bord
        chapitres/     chapitre, cours, ressources
        nationaux/     par année et par chapitre
        lives/  replays/
        plan/          plan de travail et chronomètre
        support/       poser une question, mes questions
      compte/
    (admin)/
      dashboard/  eleves/  abonnements/  contenu/
      exercices/  nationaux/  tests/  lives/  replays/
      support/  progression/  fichiers/  parametres/
    api/               points d'entrée REST et webhooks
  modules/
    acces/             règle d'accès matière, rôles, permissions
    contenu/           matières, chapitres, cours, médias
    evaluation/        exercices, extraits, examens, tests
    progression/       événements et agrégats
    live/              lives et replays
    support/           questions et messages
    abonnement/        offres, activations, demandes
    notification/      file d'envoi, gabarits
  lib/                 base de données, stockage, authentification
  ui/                  composants partagés
prisma/schema.prisma   modèle de données et migrations
```

Chaque module expose une interface de services et garde son accès aux données
privé. C'est cette discipline, et non le découpage en microservices, qui garantit
la maintenabilité.

## 5. Modèle de données

Noms de tables et de colonnes en français, sans accent, au singulier, en
minuscules avec tirets bas. Cette cohérence avec le vocabulaire métier évite les
erreurs de traduction entre spécification et code.

### 5.1 Identité et accès

| Table | Champs principaux | Relations |
|---|---|---|
| `utilisateur` | id, nom, prenom, email (unique), telephone, ville, mot_de_passe_hash, role, filiere_id, actif, derniere_connexion, cree_le | appartient à `filiere` |
| `filiere` | id, code, libelle, ordre, actif | matières via `filiere_matiere` |
| `filiere_matiere` | filiere_id, matiere_id | liaison, définit les matières visibles par filière |
| `abonnement` | id, utilisateur_id, offre_id, date_debut, date_fin, statut, montant, paiement_statut, reference_paiement, note_admin | appartient à `utilisateur` |
| `abonnement_matiere` | abonnement_id, matiere_id, date_activation, date_expiration | définit l'accès réel, matière par matière |
| `offre` | id, libelle, description, duree_jours, nb_matieres, prix, actif | référencé par `abonnement` |
| `demande_matiere` | id, utilisateur_id, matiere_id, statut, message, cree_le, traite_le, traite_par | généré par le parcours d'accès contrôlé |
| `session_utilisateur` | id, utilisateur_id, jeton_hash, appareil, ip, expire_le, revoquee | limite le partage de compte |

Énumérations : `utilisateur.role` = eleve, admin, professeur, support, commercial.
`abonnement.statut` = en_attente, actif, expire, annule.
`demande_matiere.statut` = en_attente, traitee, refusee.

**Point critique.** L'accès se joue au niveau de `abonnement_matiere`, pas de
`abonnement`. Un élève peut avoir la Physique-Chimie active et les Mathématiques
expirées dans le même abonnement.

### 5.2 Contenu pédagogique

| Table | Champs principaux | Relations |
|---|---|---|
| `matiere` | id, code, libelle, description, icone, couleur, statut, ordre | liée aux filières |
| `chapitre` | id, matiere_id, libelle, description, icone, ordre, statut | appartient à `matiere` |
| `cours` | id, chapitre_id, titre, description, ordre, statut, professeur_id, publie_le | appartient à `chapitre` |
| `video` | id, cours_id, titre, description, duree_secondes, fournisseur, video_ref, ordre, statut | appartient à `cours` |
| `document` | id, type, titre, matiere_id, chapitre_id, cours_id, fichier_id, statut | appartient à `cours` ou `chapitre` |
| `fichier` | id, nom, cle_stockage, type_mime, taille, televerse_par, cree_le | média physique, référencé par `document` |

`document.type` = cours_pdf, resume_pdf, correction_pdf, sujet_pdf, support_live.
`statut` = brouillon, publie, partout où le champ existe.

La hiérarchie filière → matière → chapitre → cours → ressource est stricte et
matérialisée par des clés étrangères. Chaque niveau porte un champ `ordre`
(entier) pour l'affichage et un champ `statut` pour séparer brouillon et publié :
le professeur prépare un cours entier sans qu'aucun élève ne le voie, puis publie
en une action.

### 5.3 Évaluation

| Table | Champs principaux | Relations |
|---|---|---|
| `exercice` | id, cours_id, titre, enonce (riche, LaTeX), difficulte (1 à 5), aide, correction_texte, correction_video_ref, ordre, statut | appartient à `cours` |
| `extrait_national` | id, matiere_id, chapitre_id, cours_id, annee, session, enonce, sujet_document_id, correction_document_id, correction_video_ref, duree_recommandee, difficulte, statut | relie un extrait au cours concerné |
| `examen_national` | id, matiere_id, filiere_id, annee, session, sujet_document_id, correction_document_id, correction_video_ref, statut | examen complet, consultation par année |
| `test` | id, cours_id, titre, consigne, seuil_validation, duree_minutes, statut | un test par cours au MVP |
| `question_test` | id, test_id, type, enonce, image_fichier_id, points, explication, ordre | appartient à `test` |
| `option_reponse` | id, question_test_id, libelle, est_correcte, ordre | options de QCM |
| `tentative_test` | id, test_id, utilisateur_id, score, score_max, valide, demarre_le, termine_le | résultat d'un passage |
| `reponse_tentative` | id, tentative_id, question_test_id, reponse (JSONB), correcte | détail des réponses |

`session` = normale, rattrapage. `question_test.type` = qcm, vrai_faux,
reponse_courte, avec_image.

### 5.4 Sessions en direct

| Table | Champs principaux | Relations |
|---|---|---|
| `live` | id, titre, matiere_id, chapitre_id, cours_id, professeur_id, date_heure, duree_prevue, plateforme, lien, description, statut | alimente la carte prochain live |
| `replay` | id, live_id, titre, matiere_id, chapitre_id, cours_id, date, duree, video_ref, support_document_id, statut | rattaché au live et au chapitre |
| `replay_exercice` | replay_id, exercice_id | exercices corrigés pendant la séance |

`live.plateforme` = meet, teams. `live.statut` = a_venir, termine, annule.

### 5.5 Progression

| Table | Champs principaux | Rôle |
|---|---|---|
| `evenement_apprentissage` | id, utilisateur_id, matiere_id, chapitre_id, cours_id, ressource_type, ressource_id, action, valeur, duree_secondes, cree_le | journal immuable de toute l'activité |
| `progression_cours` | utilisateur_id, cours_id, pourcentage, videos_terminees, exercices_reussis, test_valide, maj_le | agrégat, lecture rapide |
| `progression_chapitre` | utilisateur_id, chapitre_id, pourcentage, maj_le | agrégat pour les cartes de chapitre |
| `progression_matiere` | utilisateur_id, matiere_id, pourcentage, derniere_note, maj_le | alimente le tableau de bord élève |

`ressource_type` = video, exercice, extrait, examen, test.
`action` = vue, terminee, reussi, a_refaire, test_valide.

### 5.6 Plan de travail

| Table | Champs principaux | Relations |
|---|---|---|
| `tache` | id, utilisateur_id, titre, ressource_type, ressource_id, matiere_id, chapitre_id, date_prevue, duree_estimee, bucket, statut, ordre | créée par le bouton « Ajouter à mon plan de travail » |
| `session_travail` | id, utilisateur_id, tache_id, duree_choisie, demarre_le, termine_le, complete | sessions de chronomètre Pomodoro |

`tache.bucket` = aujourdhui, cette_semaine, plus_tard, termine, a_refaire.
`tache.statut` = a_faire, en_cours, termine, a_refaire.

### 5.7 Support

| Table | Champs principaux | Relations |
|---|---|---|
| `question_support` | id, utilisateur_id, matiere_id, chapitre_id, cours_id, exercice_id, difficulte, type_probleme, contenu, statut, assignee_a, cree_le, premiere_reponse_le, ferme_le | clé du canal pédagogique |
| `message_support` | id, question_id, auteur_id, auteur_role, contenu, video_ref, cree_le | fil de discussion |
| `piece_jointe_support` | id, message_id, fichier_id | photos, captures, brouillons, PDF |

`question_support.statut` = en_attente, en_cours, repondu, ferme.
`type_probleme` = enonce_non_compris, ne_sait_pas_commencer,
correction_incomprise, erreur_suspectee, autre.

### 5.8 Configuration

| Table | Champs principaux | Rôle |
|---|---|---|
| `parametre` | cle, valeur (JSONB), description | nom de plateforme, logo, couleur, année scolaire, pondérations de progression, messages automatiques |
| `date_national` | id, matiere_id, filiere_id, date, libelle | alimente le compte à rebours, une date par matière |
| `journal_admin` | id, utilisateur_id, action, entite, entite_id, avant, apres, cree_le | traçabilité des actions sensibles |

### 5.9 Index et contraintes obligatoires

- Chemin d'accès matière, requête la plus fréquente de toute l'application :
  `abonnement (utilisateur_id, statut)`, puis l'unique
  `abonnement_matiere (abonnement_id, matiere_id)`, plus
  `abonnement_matiere (matiere_id, date_expiration)`. Décision du lot 2 :
  `abonnement_matiere` ne porte ni `utilisateur_id` ni `statut`, conformément au
  schéma de référence en 5.10. Dupliquer le statut du parent imposerait une
  double écriture à chaque annulation, avec un risque de statut périmé qu'un
  contrôle d'accès ne peut pas accepter. Ces trois index donnent le même plan
  d'exécution en deux lookups indexés.
- Index sur `(cours_id, statut, ordre)` pour `video`, `exercice` et
  `extrait_national` : affichage d'un cours en une seule passe.
- Index sur `evenement_apprentissage (utilisateur_id, cree_le)` pour les vues
  d'activité.
- Index partiel sur `question_support` filtré sur le statut en attente, pour la
  file admin.
- Unicité sur `examen_national (matiere_id, annee, session)`.
- Unicité sur `abonnement_matiere (abonnement_id, matiere_id)`.
- Suppression logique via `supprime_le` sur les contenus.

### 5.10 Extrait de schéma de référence

```sql
-- Table pivot de toute l'autorisation
CREATE TABLE abonnement_matiere (
  id              BIGSERIAL PRIMARY KEY,
  abonnement_id   BIGINT NOT NULL REFERENCES abonnement(id),
  matiere_id      BIGINT NOT NULL REFERENCES matiere(id),
  date_activation DATE NOT NULL DEFAULT CURRENT_DATE,
  date_expiration DATE NOT NULL,
  UNIQUE (abonnement_id, matiere_id)
);

CREATE INDEX idx_acces_matiere
  ON abonnement_matiere (matiere_id, date_expiration);

-- Vue de commodité : accès effectif d'un élève
CREATE VIEW acces_effectif AS
SELECT a.utilisateur_id, am.matiere_id, am.date_expiration
FROM abonnement a
JOIN abonnement_matiere am ON am.abonnement_id = a.id
WHERE a.statut = 'actif'
  AND am.date_expiration >= CURRENT_DATE;
```

## 6. Règle d'accès matière

La règle métier la plus sensible de la plateforme. Implémentée une seule fois,
côté serveur, dans `src/modules/acces/`, et appelée par toute lecture de contenu
pédagogique.

```ts
async function verifierAccesMatiere(utilisateurId, matiereId) {
  // 1. Un admin ou professeur voit tout, y compris les brouillons
  // 2. La matière doit appartenir à la filière de l'élève
  // 3. Un abonnement actif doit couvrir cette matière
  //    et sa date d'expiration doit être future
  // Retour : { autorise: bool, motif: 'ok' | 'hors_filiere'
  //            | 'non_souscrit' | 'expire' }
}

// Utilisation systématique en amont du chargement
const acces = await verifierAccesMatiere(session.userId, matiereId);
if (!acces.autorise) return ecranAccesControle(acces.motif);
```

**Le motif du refus conditionne l'écran affiché** :

| Motif | Écran |
|---|---|
| `non_souscrit` | Proposition de demander l'inscription à la matière |
| `expire` | Invitation au renouvellement |
| `hors_filiere` | Message neutre, la matière ne concerne pas la filière |

Cette distinction améliore nettement la conversion par rapport à un écran unique.

## 7. Authentification et rôles

- Email et mot de passe, hachage Argon2id (ou bcrypt à coût élevé).
- Session serveur avec cookie `httpOnly`, `secure`, `SameSite=Lax`, durée
  30 jours avec renouvellement glissant.
- Réinitialisation par jeton à usage unique valable une heure.
- Limitation de débit sur la connexion : 5 tentatives par identifiant et par
  tranche de 15 minutes.
- Le téléphone est obligatoire à l'inscription : c'est le canal de contact réel
  pour l'activation de l'abonnement et le support.

| Rôle | Statut MVP | Périmètre |
|---|---|---|
| `eleve` | Actif | Son propre contenu, selon ses matières actives |
| `admin` | Actif, porté par le professeur | Accès total |
| `professeur` | Défini, non attribué | Contenu, exercices, lives, replays, questions |
| `support` | Défini, non attribué | Questions et réponses uniquement |
| `commercial` | Défini, non attribué | Demandes, abonnements, paiements, relances |

Les permissions sont déclarées dans une matrice unique (rôle vers permissions) et
vérifiées par une fonction unique. Ouvrir un rôle revient à créer un compte et à
lui attribuer sa valeur, sans toucher au code métier.

## 8. Médias, fichiers et vidéos

### Vidéos

| Phase | Solution | Protection |
|---|---|---|
| MVP | YouTube non répertorié, lecteur intégré avec restriction de domaine | Faible : un lien partagé reste lisible. Coût nul. |
| Phase 2 | Bunny Stream ou Cloudflare Stream | URL signées, restriction de domaine et de référent, filigrane dynamique au nom de l'élève, statistiques de visionnage |

Le champ `video_ref` est volontairement neutre (identifiant plus fournisseur).
Changer d'hébergeur se limite à mettre à jour ces références et un composant de
lecture, sans toucher au modèle de données.

Les vidéos de cours suivent un découpage en segments de 8 à 11 minutes. Ce
découpage sert d'abord le suivi fin de progression et la reprise après
interruption, quel que soit le terminal ; il reste par ailleurs adapté à une
consultation au téléphone.

### Documents PDF

- Bucket privé, jamais accessible publiquement. Toute lecture passe par une URL
  signée de 10 minutes générée après vérification d'accès.
- Lecture en ligne par défaut avec un lecteur intégré. Le téléchargement est un
  droit distinct, activable par offre ou par type de document.
- Filigrane à la volée (nom, téléphone partiel, date) sur les sujets et
  corrections sensibles : mesure dissuasive la plus efficace contre la
  rediffusion.
- Convention de nommage des clés de stockage :
  `matiere/chapitre/cours/type-identifiant.pdf`.
- Un document téléversé naît en brouillon. La publication est un geste distinct,
  au même titre que pour un chapitre, un cours ou une vidéo : la page de cours
  élève filtre `statut = 'publie'` dans sa requête.

#### Stockage de secours sur disque, développement et tests

Sans bucket provisionné, le stockage bascule sur un répertoire local
`.stockage-local/`. Sans lui, aucun téléversement ne pourrait aboutir hors
production, donc aucune recette ne pourrait prouver le parcours PDF de bout en
bout. En production sans configuration de stockage, l'appel échoue clairement
plutôt que d'écrire sur un disque éphémère.

`next start` fixe `NODE_ENV=production`, y compris pour la recette de bout en
bout : ouvrir le stockage local dans ce mode demande la dérogation explicite
`STOCKAGE_LOCAL_AUTORISE=oui`, posée par `playwright.config.ts` pour sa propre
exécution et absente de tout environnement réel.

L'adaptateur sert ses fichiers par `/api/stockage-local/[...cle]`, qui renvoie 404
dès que le stockage local n'est pas autorisé. Cette route **n'appelle pas**
`verifierAccesMatiere()`, et ce n'est pas une entorse à l'invariant 7 : elle
vérifie son autorisation elle-même, sous forme de **capacité**. La signature
HMAC-SHA256 porte sur la clé et une expiration à 600 secondes, elle n'est
forgeable que par le serveur, et elle n'est émise que par
`/api/matieres/[matiereId]/documents/[documentId]/lecture`, en aval d'un appel
autorisé à l'implémentation unique de la règle d'accès. Redériver l'accès depuis
l'identité exigerait un second chemin clé vers matière, soit la duplication que
l'invariant 1 interdit. C'est le modèle des URL signées Supabase, où le second
saut sort simplement de notre surface d'API.

Conséquence à connaître : une URL signée contient la clé de stockage par
construction, ici comme chez Supabase. Elle n'apparaît que dans l'en-tête
`Location` d'une redirection au corps vide, jamais dans un HTML, un RSC ou un
corps JSON. L'invariant 3 porte sur ces corps, pas sur l'en-tête de redirection.

### Images et pièces jointes

- Images d'exercices et de questions : conversion automatique en WebP, deux
  tailles générées, service via CDN.
- Pièces jointes de support : limite de 10 Mo, compression côté client avant
  envoi, types restreints aux images et au PDF.

### Lutte contre le partage de compte

Le partage d'identifiants est le principal risque de perte de revenu. Trois
mesures proportionnées au MVP :

- Limiter à deux ou trois appareils actifs simultanés par compte, avec
  déconnexion du plus ancien.
- Journaliser les connexions (IP, appareil) et alerter l'admin sur les
  comportements anormaux, par exemple plus de cinq appareils distincts sur sept
  jours.
- Apposer un filigrane nominatif sur les documents téléchargeables.

## 9. Exercices et tests

### Modèle de contenu d'un exercice

Un exercice n'est pas un PDF. Son énoncé, son aide et sa correction sont stockés
en contenu riche structuré (JSON de type document) autorisant paragraphes,
formules LaTeX, images et listes. Ce choix rend le contenu interrogeable,
réutilisable, et affichable proprement à toute largeur d'écran : c'est le rendu
qui s'adapte, pas le contenu qui est saisi deux fois.

Le parcours élève suit une progression à étapes, chaque étape franchie étant
journalisée :

1. Énoncé seul
2. Aide, sur demande
3. Correction écrite
4. Correction vidéo, si disponible
5. Auto-évaluation : réussi ou à refaire

La journalisation fournit une information pédagogique exploitable : un exercice
dont l'aide est ouverte par 80 pour cent des élèves est mal calibré ou mal énoncé.

### Formules scientifiques

Saisie en LaTeX dans le back-office avec prévisualisation en direct, rendu par
KaTeX côté serveur pour la performance et l'indexation. Support des unités et
notations de physique et chimie, et des schémas en image.

### Déroulement d'un test

1. Ouverture : création d'une `tentative_test`, envoi des questions **sans** les
   bonnes réponses.
2. Sauvegarde progressive des réponses, pour qu'une coupure réseau ne fasse rien
   perdre.
3. Soumission : correction intégralement côté serveur, calcul du score,
   comparaison au `seuil_validation`.
4. Restitution : score, réponses justes et fausses, explication par question,
   mention cours validé ou cours à revoir.
5. Émission d'un `evenement_apprentissage` qui met à jour la progression et la
   carte dernière note.

Le MVP se limite aux QCM et aux questions vrai ou faux, corrigeables
automatiquement sans ambiguïté. Les réponses courtes sont modélisées mais
activées plus tard, car elles imposent une correction manuelle ou une
normalisation de texte fragile.

## 10. Progression

La progression n'est pas un champ mis à jour en place mais une conséquence
d'événements. Cette approche permet de recalculer l'historique, de changer la
formule sans perdre de données, et d'alimenter les statistiques admin sans
requêtes coûteuses.

```
progression_cours =
      0.40 x (vidéos terminées / vidéos publiées)
    + 0.35 x (exercices réussis / exercices publiés)
    + 0.15 x (extraits nationaux traités / extraits publiés)
    + 0.10 x (1 si test validé sinon 0)

progression_chapitre = moyenne des progressions des cours publiés
progression_matiere  = moyenne pondérée par le nombre de cours
```

Les pondérations sont stockées dans `parametre`, jamais codées en dur, afin
d'être ajustées après observation de l'usage réel.

Deux mécanismes de recalcul complémentaires :

- Mise à jour immédiate et ciblée du cours concerné après chaque événement, pour
  que l'élève voie sa progression bouger instantanément.
- Recalcul complet nocturne par tâche planifiée, qui corrige toute dérive et
  prend en compte les publications de contenu (ajouter une vidéo à un cours
  modifie mécaniquement le dénominateur de tous les élèves).

Les vues admin (progression globale, par matière, par chapitre, par élève,
chapitres les plus faibles) lisent uniquement les tables d'agrégats et des vues
matérialisées rafraîchies chaque nuit. Aucune statistique n'est calculée à la
volée sur le journal d'événements.

## 11. Lives et replays

Au MVP la diffusion reste externe : le professeur anime sur Google Meet ou Teams,
la plateforme gère la planification, l'annonce et l'archivage.

- Le lien de réunion n'est révélé qu'aux élèves ayant accès à la matière, et
  seulement dans une fenêtre allant de 15 minutes avant le début à la fin de la
  séance.
- La carte prochain live résulte d'une requête filtrée sur les matières actives
  de l'élève, triée par date.
- Notification WhatsApp ou email la veille, puis une heure avant, aux élèves
  concernés uniquement.
- Après la séance, l'admin crée le replay depuis la fiche du live : matière,
  chapitre et cours sont préremplis, il reste à déposer le lien vidéo, le support
  PDF et à cocher les exercices corrigés. Cette action ne doit pas dépasser deux
  minutes.
- Passage automatique du statut à `termine` par tâche planifiée, une fois la
  durée prévue écoulée.

## 12. Support pédagogique

Le canal de support est un différenciateur produit majeur : il transforme une
bibliothèque de contenu en accompagnement. Le point technique décisif est le
contexte.

### Préremplissage contextuel

Lorsque l'élève clique sur « Poser une question » depuis un exercice, la matière,
le chapitre, le cours, l'exercice, la difficulté et le lien profond vers la
ressource sont transmis dans l'appel et non ressaisis. L'élève ne rédige que sa
question et joint éventuellement une photo.

Côté professeur, le contexte complet est affiché à côté de la réponse, avec
l'énoncé et la correction officielle. C'est ce qui rend une réponse possible en
deux ou trois minutes plutôt qu'en dix.

### Cycle de vie

```
en_attente ---> en_cours ---> repondu ---> ferme
     |              |            |
     |              |            +--> relance élève (retour en_cours)
     +--------------+--> demande de précision
```

Le champ `type_probleme` permet de détecter les ressources problématiques : un
exercice qui concentre les signalements d'erreur doit remonter automatiquement
dans la file admin.

## 13. Abonnements et paiement

### MVP : activation manuelle assumée

Le paiement reste hors plateforme au démarrage (virement, versement en agence,
espèces, transfert mobile). Circuit :

1. L'élève s'inscrit, choisit sa filière, ses matières souhaitées et une offre.
2. Une `demande_matiere` apparaît dans la file du back-office avec nom, téléphone
   et filière.
3. Le professeur contacte l'élève, encaisse hors ligne, puis active la matière en
   un clic en saisissant la durée et la référence de paiement.
4. L'accès s'ouvre immédiatement, une confirmation part par WhatsApp.

Ce choix évite l'intégration d'une passerelle avant validation du modèle
économique, tout en conservant une trace structurée de chaque encaissement.

### Préparation du paiement en ligne

Le modèle prévoit déjà `offre`, `montant`, `paiement_statut` et
`reference_paiement` : brancher une passerelle n'exigera aucune migration.
Options locales à étudier en phase 2 : CMI, YouCan Pay, PayZone, Naps. Stripe
n'est pas disponible pour l'encaissement local. Prévoir dès le départ la gestion
des reconductions, remboursements et factures, même si le geste reste manuel.

## 14. Notifications

| Événement | Canal | Destinataire |
|---|---|---|
| Réponse à une question support | WhatsApp et email | Élève |
| Live à venir (veille, une heure avant) | WhatsApp | Élèves de la matière |
| Nouveau cours ou replay publié | Email hebdomadaire groupé | Élèves de la matière |
| Abonnement expirant sous 7 jours | WhatsApp et email | Élève |
| Nouvelle question support | Email et tableau de bord | Professeur-admin |
| Demande d'accès à une matière | Email et tableau de bord | Professeur-admin |
| Inactivité de 7 jours | WhatsApp, à activer prudemment | Élève |

Les envois passent par une file de traitement avec réessais, afin qu'une
indisponibilité du fournisseur ne bloque jamais une action utilisateur. Toute
notification de masse doit être limitée en débit et désactivable par l'élève.

## 15. Sécurité et conformité

| Domaine | Mesures |
|---|---|
| Authentification | Argon2id, limitation de débit, sessions révocables, plafond d'appareils |
| Autorisation | Vérification systématique côté serveur, fonction d'accès unique, filtrage des brouillons en requête |
| Données | Chiffrement en transit et au repos, aucun mot de passe ni donnée sensible dans les journaux |
| Fichiers | Bucket privé, URL signées de courte durée, validation du type MIME réel, analyse antivirus des téléversements |
| Injections | ORM paramétré, validation de tout ce qui entre (schémas Zod), nettoyage du contenu riche avant affichage |
| Abus | Limitation de débit par IP et par compte sur inscription, connexion, support et téléversement |
| Mineurs | Données limitées au strict nécessaire, pas de messagerie entre élèves, aucune donnée revendue |
| Conformité | Loi 09-08 et déclaration CNDP, mentions légales, politique de confidentialité, droit d'accès et de suppression |
| Sauvegardes | Base sauvegardée quotidiennement avec restauration à un instant donné, fichiers répliqués, test de restauration trimestriel |
| Journalisation | Journal d'audit des actions admin sensibles : activation d'accès, suppression, modification d'abonnement |

**Point de vigilance.** La plateforme traite des données de mineurs (nom,
téléphone, ville, résultats scolaires). La déclaration CNDP et une politique de
confidentialité claire ne sont pas optionnelles.

## 16. Performance

Deux cibles, toutes deux contraignantes. La première décrit l'usage courant, la
seconde est le plancher qui garantit que le téléphone reste utilisable.

| Cible | Contrainte | Vérification |
|---|---|---|
| Ordinateur, écran large, connexion fixe | Premier affichage utile sous 1 seconde | Mesure manuelle en préproduction |
| Téléphone, 4G marocaine irrégulière | Premier affichage utile sous 2,5 secondes, **200 Ko de JavaScript par page élève** | Scénario Playwright sous profil 4G et `npm run budget:js`, tous deux en intégration continue |

Le budget de 200 Ko n'est pas un objectif de confort mobile : c'est la seule chose
qui empêche l'expérience téléphone de se dégrader silencieusement à mesure que
l'interface pour grand écran s'enrichit. Il reste donc mesuré et bloquant en
intégration continue, même si l'ordinateur est le terminal dominant.

Corollaire pour les mises en page larges : ce qui est ajouté pour le grand écran
ne doit pas être téléchargé par le téléphone pour être ensuite masqué. Un panneau
latéral, un tableau dense ou un lecteur enrichi se chargent en différé selon la
largeur réelle, ils ne sont pas cachés en CSS.

- Rendu serveur avec mise en cache des pages de structure (liste des chapitres,
  fiche de cours) et invalidation ciblée à la publication.
- Chargement différé des lecteurs vidéo et des composants lourds, images en WebP
  dimensionnées, polices auto-hébergées.
- Requêtes cataloguées : une page de cours se charge en une requête agrégée. Les
  schémas N+1 sont interdits de fait.
- Réserve de montée en charge : lecture dominante, donc mise en cache applicative
  (Redis) puis réplique de lecture PostgreSQL si nécessaire. Deux leviers
  largement suffisants à l'horizon trois ans.
- Pointe prévisible en soirée et avant les examens : l'hébergement doit absorber
  un facteur 5 sans intervention manuelle.

## 17. Conventions techniques

- Tables et colonnes en français sans accent, au singulier, en minuscules avec
  tirets bas, alignées sur le vocabulaire métier (`filiere`, `matiere`,
  `chapitre`, `cours`).
- Code, variables et commentaires en anglais, sauf les entités métier qui gardent
  leur nom français.
- Toute donnée entrante validée par un schéma déclaratif côté serveur, y compris
  pour les formulaires du back-office.
- Réponses d'API paginées par défaut (curseur), jamais de liste non bornée.
- Horodatages stockés en UTC, affichés en heure du Maroc. Point critique pour les
  lives et le compte à rebours du national.
- Interface entièrement en français au MVP, mais tous les libellés externalisés
  dès le départ pour permettre une version arabe ultérieure.
- Identifiants de ressources opaques côté public, pour éviter l'énumération
  séquentielle.

## 18. Environnements et déploiement

**Scénario retenu (A) :** services managés, Vercel pour l'application et Supabase
pour base, authentification et stockage. Coût 0 à 45 dollars par mois selon le
trafic, exploitation quasi nulle. Le scénario B (VPS unique avec Docker, Coolify,
PostgreSQL, MinIO, Caddy) reste une bascule possible si le trafic rend le coût
managé pénalisant. La portabilité est préservée : PostgreSQL et un stockage
compatible S3 sont identiques dans les deux scénarios.

| Environnement | Usage | Données |
|---|---|---|
| Local | Développement | Base de démonstration anonymisée |
| Préproduction | Validation par le professeur avant mise en ligne | Copie anonymisée de la production |
| Production | Service aux élèves | Données réelles, sauvegardes quotidiennes |

Chaîne de livraison :

- Dépôt Git unique, branche principale protégée, une branche par fonctionnalité.
- Intégration continue GitHub Actions : vérification des types, analyse statique,
  tests, migrations vérifiées.
- Déploiement automatique en préproduction à chaque fusion, mise en production
  sur validation manuelle.
- Migrations versionnées et jouées automatiquement.
- Supervision : Sentry pour les erreurs, sonde de disponibilité externe, alerte
  WhatsApp ou email en cas d'incident.

## 19. Hors périmètre du MVP

À ne pas implémenter sans décision explicite. L'architecture les prépare sans
migration de schéma.

| Horizon | Évolution | Prérequis déjà en place |
|---|---|---|
| Phase 2 | Paiement en ligne (CMI ou YouCan Pay) | Offres, montants, statuts et références modélisés |
| Phase 2 | Rôles multiples (professeurs, support, commercial) | Rôles et matrice de permissions définis, contenu attribuable |
| Phase 2 | Hébergeur vidéo avec URL signées et filigrane | `video_ref` neutre, composant de lecture isolé |
| Phase 3 | Application mobile (React Native ou Expo) | Logique métier derrière des services, pas dans les pages |
| Phase 3 | Statistiques avancées et alertes de décrochage | Journal d'événements horodaté exhaustif |
| Phase 3 | Recommandation de révisions assistée | Progression fine par cours, difficulté, historique |
| Phase 4 | Assistance pédagogique par IA sur le contenu | Énoncés et corrections en contenu structuré, donc exploitables |
| Phase 4 | Version arabe de l'interface | Libellés externalisés dès le MVP |

Également hors périmètre au MVP : diffusion vidéo en direct intégrée, messagerie
entre élèves, questions à réponse courte corrigées automatiquement, plusieurs
tests par cours.