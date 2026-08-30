// Libellé du filigrane apposé sur les PDF sensibles (lot 5, architecture 8).
// Une fonction plutôt qu'une chaîne fixe : le texte est interpolé, mais reste
// externalisé du module de rendu, comme l'exige CLAUDE.md.
export const FILIGRANE_FR = {
  ligne: (prenom: string, nom: string, telephonePartiel: string, date: string): string =>
    `${prenom} ${nom} · ${telephonePartiel} · ${date}`,
} as const;
