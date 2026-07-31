import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/lib/resultat";

export const creerDemandeSchema = z.object({
  offre_id: z.coerce.bigint(),
  matiere_ids: z.array(z.coerce.bigint()).min(1).max(20),
  message: z.string().trim().max(500).optional(),
});
export type CreerDemandeInput = z.infer<typeof creerDemandeSchema>;

export async function creerDemande(
  utilisateurId: bigint,
  input: unknown,
): Promise<Resultat> {
  const donnees = creerDemandeSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }
  const { offre_id, matiere_ids, message } = donnees.data;

  const offre = await prisma.offre.findFirst({
    where: { id: offre_id, actif: true, supprime_le: null },
  });
  if (!offre) {
    return { succes: false, erreur: "Offre indisponible." };
  }
  if (matiere_ids.length > offre.nb_matieres) {
    return {
      succes: false,
      erreur: `Cette offre couvre ${offre.nb_matieres} matière(s).`,
    };
  }

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: utilisateurId },
    select: { filiere_id: true },
  });
  if (!utilisateur?.filiere_id) {
    return { succes: false, erreur: "Aucune filière n'est associée à ce compte." };
  }

  // Les matières demandées sont revalidées contre la filière de l'élève, et pas
  // seulement filtrées dans le formulaire : la liste vient du client.
  const matieresAutorisees = await prisma.filiereMatiere.findMany({
    where: {
      filiere_id: utilisateur.filiere_id,
      matiere_id: { in: matiere_ids },
      matiere: { supprime_le: null },
    },
    select: { matiere_id: true },
  });
  if (matieresAutorisees.length !== matiere_ids.length) {
    return { succes: false, erreur: "Une matière demandée n'appartient pas à votre filière." };
  }

  const dejaDemandees = await prisma.demandeMatiere.findMany({
    where: {
      utilisateur_id: utilisateurId,
      matiere_id: { in: matiere_ids },
      statut: "en_attente",
    },
    select: { matiere_id: true },
  });
  if (dejaDemandees.length > 0) {
    return { succes: false, erreur: "Une demande est déjà en attente pour cette matière." };
  }

  const abonnement = await prisma.$transaction(async (tx) => {
    const cree = await tx.abonnement.create({
      data: {
        utilisateur_id: utilisateurId,
        offre_id: offre.id,
        montant: offre.prix,
      },
    });
    await tx.demandeMatiere.createMany({
      data: matieresAutorisees.map((ligne) => ({
        utilisateur_id: utilisateurId,
        matiere_id: ligne.matiere_id,
        abonnement_id: cree.id,
        message,
      })),
    });
    return cree;
  });

  return { succes: true, id: abonnement.id.toString() };
}

export function listerDemandesEnAttente() {
  return prisma.demandeMatiere.findMany({
    where: { statut: "en_attente" },
    orderBy: { cree_le: "asc" },
    include: {
      utilisateur: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          telephone: true,
          filiere: { select: { libelle: true } },
        },
      },
      matiere: { select: { id: true, libelle: true } },
      abonnement: {
        select: {
          id: true,
          montant: true,
          offre: { select: { id: true, libelle: true, duree_jours: true, prix: true } },
        },
      },
    },
  });
}

export function listerDemandesEleve(utilisateurId: bigint) {
  return prisma.demandeMatiere.findMany({
    where: { utilisateur_id: utilisateurId },
    orderBy: { cree_le: "desc" },
    include: { matiere: { select: { libelle: true } } },
  });
}
