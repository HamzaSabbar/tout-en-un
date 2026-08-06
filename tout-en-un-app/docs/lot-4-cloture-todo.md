# Clôture du Lot 4 — checklist de vérification

Cette checklist est la preuve de clôture du Lot 4. Une case n'est cochée que si
la commande correspondante a réellement réussi dans l'environnement prévu.

Statuts : `[ ]` à faire, `[x]` vérifié, `[!]` bloqué avec cause et prochaine action.

## 1. Modèle de données

- [x] Migration `20260803115246_ajoute_exercices_et_journal_apprentissage` :
      tables `exercice` et `evenement_apprentissage`, énumérations
      `ressource_apprentissage` et `action_apprentissage`, valeur
      `image_exercice` ajoutée à `type_document`.
- [x] Les deux contraintes `CHECK` écrites à la main s'appliquent réellement :
      `difficulte BETWEEN 1 AND 5` et `duree_secondes IS NULL OR >= 0`. Vérifié
      par une insertion refusée, pas par la seule lecture du fichier de
      migration. Prisma ignore les `CHECK` existants, elles ne seront donc pas
      prises pour une dérive au prochain `migrate dev`.
- [x] Index `(cours_id, statut, ordre)` sur `exercice`, comme l'exige
      architecture 5.9, et `(ressource_type, ressource_id, action)` sur le
      journal, qui sert la statistique pédagogique de la section 9.
- [x] `cree_le` non nullable sur les deux tables : elles sont neuves, aucune
      ligne antérieure n'est à dater.
- [x] Migration générée et appliquée sur un cluster PostgreSQL 18 jetable, jamais
      sur la base de développement partagée.

## 2. Contenu riche, sûr par construction

- [x] Jeu de types de nœuds fermé : `paragraphe`, `liste`, `formule`, `image`,
      `code`. Aucun nœud ne porte de HTML.
- [x] Validation Zod `.strict()` à l'écriture : un type inconnu **et** une clé en
      trop sur un nœud connu font échouer la sauvegarde. Couvert par test.
- [x] Le rendu produit des éléments React, jamais une chaîne HTML. Prouvé par un
      test qui vérifie qu'un `<script>` saisi dans un paragraphe ressort échappé.
- [x] `dangerouslySetInnerHTML` n'est employé que pour la sortie de KaTeX, dans un
      seul composant, avec sa justification sur place.
- [x] Une image ne porte qu'un `fichier_id`, jamais une URL ni une clé de
      stockage. Un nœud image portant une `url` est rejeté par le schéma.
- [x] Les formules en ligne entre dollars sont découpées avant rendu, et le texte
      hors formule reste échappé par React. Un dollar non apparié reste du texte.

## 3. KaTeX sans coût pour la page élève

- [x] `npm run budget:js` après `npm run build` : la fiche d'exercice est la page
      élève la plus lourde à 122,4 Ko de JavaScript compressé, sous la limite de
      200 Ko.
- [x] Aucun chunk JavaScript de la page élève ne contient KaTeX. Vérifié chunk par
      chunk sur le build de production, à partir de `app-build-manifest.json` :
      seule la feuille de style apparaît.
- [x] `import "server-only"` dans le composant de formule : importer ce fichier
      depuis un composant client fait échouer la compilation, au lieu de faire
      grossir le bundle en silence.
- [x] La prévisualisation du back-office charge KaTeX en différé, au premier clic.
      Vérifié sur le build : le JavaScript de KaTeX n'est dans aucun chunk initial
      de la page d'administration.

## 4. Parcours élève à cinq étapes

- [x] Les cinq étapes écrivent cinq actions distinctes : `vue`, `aide_ouverte`,
      `correction_vue`, `terminee` pour la correction vidéo, puis `reussi` ou
      `a_refaire`.
- [x] L'aide et la correction ne sont pas renvoyées avant leur étape : le service
      ne les sélectionne pas, elles sont absentes du HTML comme de la charge RSC.
      Couvert par test unitaire et par la recette.
- [x] La référence de la vidéo de correction ne part jamais avec la page : elle
      passe par sa route, après un nouveau contrôle d'accès et au clic seulement.
- [x] Chaque action serveur revalide ses identifiants et rappelle
      `verifierAccesMatiere()` avant d'écrire.
- [x] `enregistrerEvenement()` est le seul point d'écriture du journal, et le
      journal est strictement ajout seul.
- [x] L'étape atteinte se dérive du journal : aucun état d'avancement n'est stocké
      ailleurs, donc rien ne peut le contredire.

## 5. Images du contenu riche

- [x] Téléversement par le formulaire du back-office, avec accord imposé entre le
      type de document et le type MIME.
- [x] L'extension de la clé de stockage vient du type MIME validé, jamais du nom
      envoyé par le navigateur, et c'est elle qui détermine le `Content-Type`
      servi.
- [x] Le remplacement d'un fichier refuse un changement de format : la clé étant
      conservée, un PNG écrit sous une clé `.pdf` serait servi en
      `application/pdf`.
- [x] La route de lecture d'une image refuse un fichier que l'exercice ne cite
      pas : sans cela, un identifiant d'exercice suffirait à lire n'importe quelle
      ligne de `fichier`.
- [x] Une image d'exercice n'apparaît pas dans la liste des documents de l'élève.
- [!] Conversion WebP et deux tailles générées (architecture 8) : **hors
      périmètre assumé**, à inscrire au lot 11 ou à un lot médias dédié. D'ici là
      un plafond de 5 Mo par image protège le téléphone.

## 6. Mise en page grand écran

- [x] Coquille élève à 1152 px, définie à un seul endroit.
- [x] Listes en grilles, quatre cartes du tableau de bord sur une ligne, fiche
      d'exercice à deux colonnes à partir de 1024 px.
- [x] Rien n'est ajouté pour le grand écran : même contenu réparti autrement, en
      grilles CSS. Le téléphone ne télécharge donc rien de plus, et rien n'est
      masqué en CSS.

## 7. Qualité, recette et clôture

- [x] `npm run typecheck` réussit.
- [x] `npm run lint` réussit sans avertissement. Les répertoires engendrés par
      Playwright ont dû être ajoutés aux exclusions : la configuration à plat
      d'ESLint ne lit pas `.gitignore`, et le rapport HTML embarque du JavaScript
      minifié qui produisait des milliers de faux problèmes.
- [x] `npm test` réussit intégralement : 32 fichiers, 343 tests.
- [x] `npm run build` puis `npm run budget:js` réussissent. La fiche d'exercice,
      page élève la plus lourde, est à 122,6 Ko sur 200.
- [x] `npm run test:e2e` réussit intégralement : **19 scénarios**, lots 0 à 4.
- [x] `e2e/lot4-exercices.spec.ts` prouve le critère de sortie par le back-office
      réel, avec une requête en base après chaque étape franchie. Trois exécutions
      consécutives vertes avant clôture.
- [x] `nettoyerDonneesE2E()` supprime les exercices et le journal, et
      `compterResiduE2E()` les compte.
- [x] `docs/roadmap.md` coche les éléments implémentés dans le même commit que le
      code, et `docs/architecture.md` sections 5.5, 5.9 et 9 sont à jour.
- [x] Le job `CI / ci` réussit sur la pull request. PR #9, exécution verte,
      fusionnée en `606c635`. La CI post-fusion sur `main` est verte elle aussi,
      comme celle de la PR #8 (`759a76e`) sur laquelle le lot était empilé.

### Ce que la recette a trouvé, et que les tests unitaires ne pouvaient pas voir

Trois défauts réels, tous corrigés. Ils valent d'être notés : chacun aurait été
rencontré par un élève ou par le professeur dès la première utilisation.

1. **Un exercice sans vidéo de correction était refusé**, avec pour seul retour
   « Formulaire invalide ». Un champ de formulaire laissé vide arrive en chaîne
   vide, pas en `undefined` : `.optional()` ne le traitait donc pas comme absent.
2. **L'aide révélée disparaissait de l'écran**, par intermittence. Les deux
   étapes passives passaient par des actions serveur, dont la réponse embarque un
   rendu complet de la page ; arrivant à contretemps, elle réappliquait un arbre
   calculé avant le franchissement.
3. **Franchir une étape ne changeait rien à l'écran** quand l'élève arrivait par
   un lien depuis la page de cours — le chemin normal. L'événement était écrit et
   la réponse du serveur était juste, mais le routeur client ne l'appliquait pas.
   **En arrivant par une URL saisie à la main, tout fonctionnait** : c'est ce qui
   a rendu le défaut si long à cerner. Corrigé en passant les franchissements en
   POST-redirection-GET vers une route d'API (architecture section 9).

Le troisième mérite une leçon de méthode : la recette a d'abord été accusée d'être
instable, parce que le point d'échec se déplaçait d'une exécution à l'autre. Il
fallait descendre jusqu'à la trace réseau et aux instantanés du DOM pour voir que
le serveur répondait juste et que le client jetait la réponse.

## 8. Écarts connus, hors périmètre du Lot 4

Signalés pour ne pas être perdus, volontairement non corrigés ici.

- **La saisie du contenu riche se fait en JSON** dans un champ de texte, avec
  prévisualisation des formules et validation à l'enregistrement. C'est utilisable
  par le professeur mais austère. Un éditeur assisté reste à décider.

- **La table `document` n'a toujours pas de colonne `cree_le`**, oubliée par la
  migration `20260731181043_ajoute_cree_le_contenu`. Non corrigé ici pour ne pas
  mêler un correctif sans rapport à la migration du lot : il vaut une migration à
  lui seul, en deux temps `ADD COLUMN` puis `SET DEFAULT`.
- **`/api/matieres/[matiereId]/chapitres` renvoie une liste non bornée**, contre
  la convention de pagination par curseur. Indépendant du lot 4.
- **Le bucket privé Supabase de production n'est pas provisionné.** Inchangé
  depuis le lot 3 : tâche d'exploitation à mener avant l'ouverture commerciale.

### Ce que trois exercices réels ont appris au modèle de contenu

La roadmap demandait d'écrire deux ou trois exercices réels de Physique-Chimie
avant d'industrialiser la saisie. C'est fait : `scripts/seed-exercices-pc.ts` en
porte trois, dans le style des examens nationaux, sur trois parties distinctes du
programme (ondes, dipôle RC, cinétique chimique). Les 76 formules qu'ils
contiennent compilent toutes sous KaTeX.

L'exercice a payé : il manque **deux types de nœuds** au modèle, et aucun test
unitaire ne pouvait le dire, puisqu'ils testent ce que le modèle sait faire.

1. **Aucun tableau.** Un suivi temporel donne un tableau de mesures, et une
   étude de réaction un tableau d'avancement : ce sont des figures imposées du
   programme, pas des cas limites. Faute de mieux, le tableau de mesures est
   aujourd'hui un nœud `code`. Le rendu est acceptable — police à chasse fixe,
   colonnes alignées — mais la sémantique est fausse : un lecteur d'écran annonce
   du code, et la mise en forme ne s'adapte pas à la largeur. Il faut un nœud
   `tableau` avec en-têtes et lignes.
2. **Aucune emphase.** Écrire `**le réactif limitant**` par réflexe affiche les
   astérisques telles quelles. Le professeur le rencontrera à son premier
   exercice. Une emphase en ligne, dans la même grammaire que les formules entre
   dollars, réglerait le cas sans ouvrir la porte au HTML.

Aucun des deux n'est corrigé ici : ce sont des évolutions du modèle de contenu,
donc du schéma, du rendu et de la documentation. Elles méritent leur propre
décision plutôt qu'un ajout discret en fin de lot.
