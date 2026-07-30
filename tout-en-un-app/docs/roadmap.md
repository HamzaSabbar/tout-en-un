# Feuille de route de réalisation, Tout en Un

Séquencement du MVP en 12 lots livrables. Ce fichier est un document vivant :
coche les cases au fur et à mesure et garde-le à jour dans le même commit que le
code du lot.

Référence technique : `docs/architecture.md`. Les invariants de sa section 1
s'appliquent à tous les lots.

Hypothèse de chiffrage : un développeur à temps plein, charges en jours-homme de
développement, hors production de contenu pédagogique.

## Comment traiter un lot

1. **Explorer** en mode plan : lire la section concernée de
   `docs/architecture.md`, la fiche du lot ci-dessous, et le code existant.
2. **Planifier** : écrire le plan dans `PLAN-lot<N>.md`, avec les fichiers à
   créer, les migrations, et le test qui prouvera le critère de sortie.
3. **Implémenter** hors mode plan, en écrivant le test avant ou avec le code.
4. **Vérifier** : `npm run typecheck`, `npm run lint`, la suite de tests, et le
   critère de sortie du lot. Montrer la sortie des commandes, pas une affirmation.
5. **Relire** : faire relire le diff par un sous-agent dans un contexte neuf,
   contre le plan et contre les invariants de sécurité.
6. **Committer**, cocher les cases de ce fichier, puis `/clear` avant le lot
   suivant.

Un lot n'est terminé que lorsque son critère de sortie est vérifié en
préproduction. Un critère de sortie n'est pas une opinion : c'est un test qui
passe ou échoue.

## Vue d'ensemble

| Lot | Contenu | Charge | Priorité | Dépend de |
|---|---|---|---|---|
| 0 | Socle technique | 5 j | Critique | rien |
| 1 | Contenu et back-office | 10 j | Critique | 0 |
| 2 | Accès et abonnements | 7 j | Critique | 0, 1 |
| 3 | Parcours élève | 10 j | Critique | 1, 2 |
| 4 | Exercices interactifs | 8 j | Critique | 1, 3 |
| 5 | Examens nationaux | 5 j | Haute | 1, 4 |
| 6 | Tests et validation de cours | 6 j | Haute | 3, 4 |
| 7 | Progression et statistiques | 6 j | Haute | 3, 4, 6 |
| 8 | Lives et replays | 5 j | Haute | 2, 3 |
| 9 | Support pédagogique | 8 j | Haute | 3, 4 |
| 10 | Plan de travail personnel | 5 j | Moyenne | 3 |
| 11 | Durcissement et recette | 6 j | Critique | tous |

Total MVP : environ 81 jours, soit 16 à 18 semaines pour un développeur seul, ou
9 à 11 semaines à deux.

## Jalons

| Jalon | Lots | Délai cumulé | Ce qui devient possible |
|---|---|---|---|
| J1. Saisie ouverte | 0, 1 | 3 semaines | Le professeur produit du contenu en parallèle du développement |
| J2. Premiers élèves payants | 2, 3, 4, lot 11 allégé | 7 à 8 semaines | Une matière complète commercialisable |
| J3. MVP complet | 5 à 11 | 16 à 18 semaines | Nationaux, tests, progression, lives, support, plan de travail |

**J2 est le jalon qui compte.** Une seule matière, ses cours, ses vidéos, ses
PDF, ses exercices et l'accès contrôlé suffisent à ouvrir aux premiers élèves
payants. Ne pas attendre le MVP complet pour commercialiser.

Les lots 5 à 10 sont décalables. Les lots 0 à 4 et 11 ne le sont pas.

---

## Lot 0. Socle technique

5 j, critique. Mettre en place l'environnement et la chaîne de livraison avant
toute ligne de code métier.

- [ ] Dépôt Git unique, branche principale protégée, une branche par
      fonctionnalité
- [ ] Initialisation Next.js 15 en TypeScript, Tailwind CSS, shadcn/ui
- [ ] Schéma PostgreSQL 16 et Prisma, migrations versionnées
- [x] Auth.js : email et mot de passe, hachage Argon2id, sessions serveur
      révocables (cookie httpOnly, secure, SameSite Lax, 30 jours glissants)
- [x] Matrice des rôles (eleve, admin, professeur, support, commercial) et
      fonction unique de vérification des permissions
- [ ] Intégration continue GitHub Actions : types, analyse statique, tests,
      migrations
- [ ] Provisionnement des trois environnements sur le scénario A (Vercel,
      Supabase)

**Critère de sortie.** Un utilisateur peut être créé, se connecter et voir une
page vide protégée. Un commit sur la branche principale se déploie
automatiquement en préproduction.

Architecture : sections 3, 4, 7, 18.

---

## Lot 1. Contenu et back-office

10 j, critique. Livrer l'outil de saisie en priorité, car la production de
contenu pédagogique est le vrai chemin critique du projet.

- [ ] Filières, matières, table de liaison `filiere_matiere`
- [ ] Arborescence chapitre puis cours, avec `ordre` et `statut` (brouillon,
      publie) à chaque niveau
- [ ] Vidéos rattachées à un cours, champ `video_ref` neutre (identifiant plus
      fournisseur)
- [ ] Téléversement de documents PDF (cours, résumés, corrections, sujets) et
      convention de nommage des clés :
      `matiere/chapitre/cours/type-identifiant.pdf`
- [ ] Médiathèque : recherche, réutilisation, remplacement d'un fichier sans
      casser les références
- [ ] Publication en un clic et duplication d'éléments

**Critère de sortie.** Le professeur saisit une matière complète de bout en bout
et la garde en brouillon, sans qu'aucun élève ne la voie. La saisie de contenu
peut démarrer en parallèle du développement.

Architecture : sections 5.2, 8.

---

## Lot 2. Accès et abonnements

7 j, critique. Implémenter la règle métier la plus sensible de la plateforme, une
seule fois, côté serveur.

- [ ] Inscription élève avec téléphone obligatoire et choix de la filière
- [ ] Modèle `offre`, `abonnement`, `abonnement_matiere` : l'accès se joue
      matière par matière, pas au niveau de l'abonnement
- [ ] Parcours de demande d'accès (`demande_matiere`) et file de traitement dans
      le back-office
- [ ] Activation manuelle par l'admin : durée, montant, référence de paiement,
      confirmation WhatsApp
- [ ] `verifierAccesMatiere()` dans `src/modules/acces/`, appelée en amont de
      toute lecture de contenu pédagogique
- [ ] Écrans d'accès contrôlé différenciés par motif : `hors_filiere`,
      `non_souscrit`, `expire`
- [ ] Index composite `abonnement_matiere (utilisateur_id, matiere_id, statut)`
- [ ] `journal_admin` sur les actions sensibles (activation, modification,
      suppression)

**Critère de sortie.** Un test d'intégration prouve qu'un élève sans abonnement
actif sur une matière n'obtient aucune ressource de cette matière, ni par
l'interface ni par appel direct à l'API. Le contenu non autorisé ne figure pas
dans la réponse du serveur : il n'est pas seulement masqué.

Architecture : sections 5.1, 6, 13.

---

## Lot 3. Parcours élève

10 j, critique. Ouvrir l'espace élève en rendu serveur, mobile-first sur réseau
4G irrégulier.

- [ ] Choix de la matière, puis tableau de bord à quatre cartes : progression,
      prochain live, dernière note, compte à rebours du national
- [ ] Navigation chapitres puis cours puis ressources, en une requête agrégée par
      page
- [ ] Lecteur vidéo en chargement différé, avec restriction de domaine
- [ ] Lecture des PDF par URL signée de 10 minutes, téléchargement traité comme
      un droit distinct
- [ ] Mise en cache des pages de structure, invalidation ciblée à la publication
- [ ] Index `(cours_id, statut, ordre)` sur `video`, `exercice`,
      `extrait_national`

**Critère de sortie.** Un élève abonné parcourt une matière complète sur mobile,
regarde une vidéo et ouvre un PDF. Aucune URL de fichier ou de vidéo n'apparaît
en clair dans le HTML. Le premier affichage utile tient sous 2,5 secondes en 4G
et le budget de 200 Ko de JavaScript par page est respecté.

Architecture : sections 8, 16.

---

## Lot 4. Exercices interactifs

8 j, critique. Le premier élément de valeur qu'aucune solution sans code ne sait
modéliser.

- [ ] Contenu riche structuré (JSON de type document) pour l'énoncé, l'aide et la
      correction
- [ ] Saisie LaTeX dans le back-office avec prévisualisation, rendu KaTeX côté
      serveur
- [ ] Parcours à étapes : énoncé, aide sur demande, correction écrite, correction
      vidéo, auto-évaluation
- [ ] Journalisation de chaque étape franchie
- [ ] Difficulté de 1 à 5, rattachement au cours

**Critère de sortie.** Le professeur crée un exercice contenant formules LaTeX et
image, et l'élève le traite étape par étape depuis un téléphone. Chaque étape
franchie produit une ligne dans `evenement_apprentissage`.

Ne pas prototyper en abstrait : créer deux ou trois exercices réels de
Physique-Chimie avant d'industrialiser la saisie. Le contenu riche est le point
le plus sous-estimé du projet.

Architecture : sections 5.3, 9.

---

## Lot 5. Examens nationaux

5 j, haute. Relier les annales au cours concerné, différenciateur produit fort.

- [ ] Extraits rattachés à un chapitre et à un cours, avec année et session
      (normale, rattrapage)
- [ ] Examens complets consultables par année et par filière
- [ ] Sujets et corrections en PDF, correction vidéo optionnelle
- [ ] Unicité sur `examen_national (matiere_id, annee, session)`
- [ ] Filigrane nominatif à la volée sur les sujets et corrections sensibles

**Critère de sortie.** Depuis la fiche d'un cours, l'élève accède aux extraits de
nationaux qui portent sur ce cours. Un PDF téléchargé porte le nom de l'élève, un
téléphone partiel et la date.

Architecture : sections 5.3, 8.

---

## Lot 6. Tests et validation de cours

6 j, haute. Permettre à l'élève de valider un cours et alimenter la carte
dernière note.

- [ ] Types `qcm` et `vrai_faux` au MVP. `reponse_courte` modélisée mais
      désactivée
- [ ] Envoi des questions **sans** le champ `est_correcte`
- [ ] Sauvegarde progressive des réponses, résistante à une coupure réseau
- [ ] Correction intégralement côté serveur, comparaison au `seuil_validation`
- [ ] Restitution : score, réponses justes et fausses, explication par question,
      mention cours validé ou à revoir
- [ ] Émission d'un `evenement_apprentissage` à la soumission

**Critère de sortie.** Un test se passe et se corrige sans qu'aucune bonne
réponse soit présente dans les réponses réseau avant soumission. Un test
interrompu puis reprise conserve les réponses déjà saisies.

Architecture : sections 5.3, 9.

---

## Lot 7. Progression et statistiques

6 j, haute. Calculer la progression à partir d'événements horodatés plutôt que
d'un pourcentage écrasé.

- [ ] Journal immuable `evenement_apprentissage` écrit en temps réel
- [ ] Agrégats `progression_cours`, `progression_chapitre`,
      `progression_matiere`
- [ ] Mise à jour immédiate et ciblée après chaque événement
- [ ] Recalcul complet nocturne par tâche planifiée
- [ ] Pondérations de la formule stockées dans `parametre`, jamais codées en dur
- [ ] Vues admin en lecture seule sur les agrégats et des vues matérialisées
      rafraîchies chaque nuit
- [ ] Index `evenement_apprentissage (utilisateur_id, cree_le)`

**Critère de sortie.** La progression d'un cours bouge dès qu'une vidéo est
terminée. Ajouter une vidéo à un cours publié fait baisser la progression de tous
les élèves concernés après le recalcul nocturne, sans perte d'historique. Aucune
vue admin ne requête le journal d'événements à la volée.

Architecture : section 10.

---

## Lot 8. Lives et replays

5 j, haute. La diffusion reste externe (Meet ou Teams) ; la plateforme gère
planification, annonce et archivage.

- [ ] Planification d'un live rattaché à une matière, un chapitre, un cours
- [ ] Lien de réunion révélé aux seuls élèves ayant accès, et seulement de 15
      minutes avant la séance à sa fin
- [ ] Carte prochain live filtrée sur les matières actives de l'élève
- [ ] Notifications WhatsApp ou email la veille puis une heure avant
- [ ] Création du replay depuis la fiche du live, avec préremplissage
- [ ] Passage automatique du statut à `termine` par tâche planifiée

**Critère de sortie.** Le lien de réunion est absent de la réponse serveur en
dehors de la fenêtre autorisée, et pour un élève non abonné à la matière. La
création d'un replay depuis un live existant ne dépasse pas deux minutes de
saisie.

Architecture : sections 5.4, 11, 14.

---

## Lot 9. Support pédagogique

8 j, haute. Transformer une bibliothèque de contenu en accompagnement. Le
préremplissage du contexte est l'élément déterminant.

- [ ] Bouton « Poser une question » sur chaque ressource, transmettant matière,
      chapitre, cours, exercice, difficulté et lien profond
- [ ] Typologie `type_probleme` (énoncé non compris, ne sait pas commencer,
      correction incomprise, erreur suspectée, autre)
- [ ] Pièces jointes limitées à 10 Mo, compression côté client, images et PDF
      uniquement
- [ ] Fil de discussion, cycle de vie en_attente, en_cours, repondu, ferme
- [ ] Vue professeur affichant le contexte complet, l'énoncé et la correction
      officielle à côté de la réponse
- [ ] File triée, index partiel sur les questions en attente
- [ ] Remontée automatique des ressources qui concentrent les signalements
      d'erreur
- [ ] Notifications WhatsApp et email à la réponse

**Critère de sortie.** Une question posée depuis un exercice arrive avec son
contexte complet sans que l'élève ait saisi autre chose que son texte. Le
professeur répond depuis un seul écran, sans naviguer pour retrouver l'énoncé.

Architecture : sections 5.7, 12, 14.

---

## Lot 10. Plan de travail personnel

5 j, moyenne. Outil d'organisation alimenté depuis n'importe quelle ressource.

- [ ] Bouton « Ajouter à mon plan de travail » sur chaque ressource
- [ ] Listes par bucket : aujourdhui, cette_semaine, plus_tard, termine,
      a_refaire
- [ ] Statuts de tâche et réordonnancement
- [ ] Chronomètre Pomodoro, avec journalisation dans `session_travail`

**Critère de sortie.** Une tâche se crée en un clic depuis une vidéo, un exercice
ou un extrait, et le temps passé est enregistré.

Architecture : section 5.6.

---

## Lot 11. Durcissement et recette

6 j, critique. Protéger le contenu et le revenu avant toute ouverture
commerciale. Ce lot n'est pas optionnel et ne se repousse pas.

- [ ] URL signées généralisées, aucune URL en clair dans le HTML
- [ ] Filigrane nominatif (nom, téléphone partiel, date) sur les documents
      téléchargeables
- [ ] Plafond de deux à trois appareils actifs simultanés, déconnexion du plus
      ancien
- [ ] Journalisation des connexions et alerte admin sur les comportements
      anormaux (plus de cinq appareils distincts sur sept jours)
- [ ] Limitation de débit sur inscription, connexion, support, téléversement
- [ ] Validation du type MIME réel et analyse antivirus des téléversements
- [ ] Identifiants de ressources opaques côté public
- [ ] Sauvegardes quotidiennes avec restauration à un instant donné, et test de
      restauration effectué
- [ ] Supervision Sentry, sonde de disponibilité externe, alerte WhatsApp ou
      email
- [ ] Déclaration CNDP (loi 09-08), mentions légales, politique de
      confidentialité
- [ ] Documentation d'exploitation et accès administratif de secours
- [ ] Recette fonctionnelle complète par le professeur en préproduction

**Critère de sortie.** Une revue de sécurité sur le diff complet ne trouve aucune
URL de fichier exposée, aucune route sans vérification d'autorisation, et aucun
téléversement non validé. Le test de restauration de sauvegarde a été exécuté et
documenté. La déclaration CNDP est déposée.

**Version allégée pour le jalon J2**, avant les premiers élèves payants : URL
signées, filigrane, plafond d'appareils, limitation de débit, sauvegardes. Le
reste peut attendre J3.

Architecture : sections 8, 15.

---

## Chantiers en parallèle

Le développement n'est pas le seul chemin critique.

| Chantier | Démarrage | Responsable |
|---|---|---|
| Production du contenu pédagogique (cours, vidéos, PDF, exercices) | Dès la fin du lot 1 | Professeur |
| Déclaration CNDP, mentions légales, politique de confidentialité | Pendant les lots 5 à 9 | Professeur, appui juridique |
| Choix du prestataire de paiement local (CMI, YouCan Pay, PayZone, Naps) | Après validation du modèle | Professeur |
| Documentation d'exploitation et accès de secours | Pendant le lot 11 | Développeur |

Prioriser une seule matière complète plutôt que quatre matières incomplètes.

## Risques de réalisation

| Risque | Impact | Mitigation |
|---|---|---|
| Retard de production de contenu, plateforme vide au lancement | Élevé | Livrer le back-office dès le lot 1, saisir en parallèle, une seule matière d'abord |
| Lot 11 repoussé faute de temps | Élevé, fuite de contenu dès l'ouverture | Version allégée du lot 11 dans le jalon J2, avant tout élève payant |
| Périmètre élargi en cours de route | Moyen, glissement du calendrier | Lots 5 à 10 décalables, lots 0 à 4 et 11 non |
| Contenu riche des exercices sous-estimé (LaTeX, images) | Moyen | Prototyper deux ou trois exercices réels dès le lot 4 |
| Opérateur unique indisponible pendant la recette | Moyen | Documentation d'exploitation, accès de secours, rôles prêts à attribuer |