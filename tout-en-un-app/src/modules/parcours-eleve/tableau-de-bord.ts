export type DonneeTableauDeBord = { etat: "indisponible" };

// Chaque carte possède une source unique et stable. Les lots propriétaires
// remplaceront uniquement le corps de leur fonction, sans modifier le rendu.
export async function obtenirProgressionMatiere(
  _utilisateurId: bigint,
  _matiereId: bigint,
): Promise<DonneeTableauDeBord> {
  void _utilisateurId;
  void _matiereId;
  return { etat: "indisponible" };
}

export async function obtenirProchainLive(
  _utilisateurId: bigint,
  _matiereId: bigint,
): Promise<DonneeTableauDeBord> {
  void _utilisateurId;
  void _matiereId;
  return { etat: "indisponible" };
}

export async function obtenirDerniereNote(
  _utilisateurId: bigint,
  _matiereId: bigint,
): Promise<DonneeTableauDeBord> {
  void _utilisateurId;
  void _matiereId;
  return { etat: "indisponible" };
}

export async function obtenirDateNational(
  _utilisateurId: bigint,
  _matiereId: bigint,
): Promise<DonneeTableauDeBord> {
  void _utilisateurId;
  void _matiereId;
  return { etat: "indisponible" };
}

export async function obtenirTableauDeBord(
  utilisateurId: bigint,
  matiereId: bigint,
) {
  const [progression, prochainLive, derniereNote, dateNational] = await Promise.all([
    obtenirProgressionMatiere(utilisateurId, matiereId),
    obtenirProchainLive(utilisateurId, matiereId),
    obtenirDerniereNote(utilisateurId, matiereId),
    obtenirDateNational(utilisateurId, matiereId),
  ]);

  return { progression, prochainLive, derniereNote, dateNational };
}
