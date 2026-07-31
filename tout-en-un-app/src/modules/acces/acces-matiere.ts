import { prisma } from "@/lib/db";

export type MotifAcces = "ok" | "hors_filiere" | "non_souscrit" | "expire";

export function obtenirFiliereEleve(utilisateurId: bigint) {
  return prisma.filiere.findFirst({
    where: { eleves: { some: { id: utilisateurId } } },
    select: { id: true, libelle: true },
  });
}

export interface AccesMatiere {
  autorise: boolean;
  motif: MotifAcces;
}

// Règle d'accès matière (architecture, section 6). Implémentation unique de
// toute la plateforme : toute lecture de contenu pédagogique passe par ici.
// La fonction relit l'état en base plutôt que de faire confiance à la session,
// pour qu'une révocation d'accès prenne effet immédiatement.
export async function verifierAccesMatiere(
  utilisateurId: bigint,
  matiereId: bigint,
): Promise<AccesMatiere> {
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: utilisateurId },
    select: {
      role: true,
      actif: true,
      filiere: {
        select: {
          matieres: {
            // Une matière supprimée ou repassée en brouillon ne donne plus
            // accès à rien, y compris par appel direct à l'API.
            where: {
              matiere_id: matiereId,
              matiere: { supprime_le: null, statut: "publie" },
            },
            select: { matiere_id: true },
          },
        },
      },
      abonnements: {
        where: { statut: "actif" },
        select: {
          matieres: {
            where: { matiere_id: matiereId },
            select: { date_expiration: true },
          },
        },
      },
    },
  });

  if (!utilisateur || !utilisateur.actif) {
    return { autorise: false, motif: "hors_filiere" };
  }

  if (utilisateur.role === "admin" || utilisateur.role === "professeur") {
    return { autorise: true, motif: "ok" };
  }

  const matiereDansFiliere = utilisateur.filiere?.matieres.length ?? 0;
  if (matiereDansFiliere === 0) {
    return { autorise: false, motif: "hors_filiere" };
  }

  const expirations = utilisateur.abonnements.flatMap((abonnement) =>
    abonnement.matieres.map((ligne) => ligne.date_expiration),
  );
  if (expirations.length === 0) {
    return { autorise: false, motif: "non_souscrit" };
  }

  const plusLointaine = expirations.reduce((a, b) => (a > b ? a : b));
  if (plusLointaine.getTime() <= Date.now()) {
    return { autorise: false, motif: "expire" };
  }

  return { autorise: true, motif: "ok" };
}
