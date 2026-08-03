// Largeur et marges de la coquille élève, en un seul endroit.
//
// L'ordinateur à grand écran est le terminal dominant (architecture section 2).
// Les pages élève étaient contenues dans `max-w-3xl`, soit 768 px : sur un écran
// de bureau, les deux tiers de la largeur restaient vides et une liste de cours
// obligeait à défiler alors que la place était là. La coquille passe à
// `max-w-6xl`, 1152 px, ce qui laisse environ 560 px par colonne dans les mises en
// page à deux colonnes — une longueur de ligne encore confortable à lire.
//
// Le téléphone n'y perd rien : `w-full` et les marges progressives gardent le
// rendu à 360 px, et **l'élargissement ne fait rien télécharger de plus**. Tout
// se joue en grilles CSS sur le même contenu, jamais en composants réservés au
// grand écran. La règle de `CLAUDE.md` reste à respecter si un tel composant
// apparaissait un jour : il devrait être chargé selon la largeur réelle, pas
// envoyé au téléphone puis masqué.
export const COQUILLE_ELEVE = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";
