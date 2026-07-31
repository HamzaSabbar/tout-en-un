import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/lib/resultat";
import { envoyerWhatsApp } from "@/lib/whatsapp/whatsapp";
import { consignerAction } from "@/modules/audit/journal";

export const activerAccesSchema = z.object({
  utilisateur_id: z.coerce.bigint(),
  matiere_id: z.coerce.bigint(),
  offre_id: z.coerce.bigint(),
  duree_jours: z.coerce.number().int().min(1).max(3650),
  montant: z.coerce.number().min(0).max(1000000),
  reference_paiement: z.string().trim().min(1).max(100),
  demande_id: z.coerce.bigint().optional(),
  note_admin: z.string().trim().max(500).optional(),
});
export type ActiverAccesInput = z.infer<typeof activerAccesSchema>;

export const modifierAbonnementSchema = z.object({
  note_admin: z.string().trim().max(500).optional(),
  reference_paiement: z.string().trim().max(100).optional(),
  date_fin: z.coerce.date().optional(),
});

function ajouterJours(depuis: Date, jours: number): Date {
  return new Date(depuis.getTime() + jours * 24 * 60 * 60 * 1000);
}

// Activation manuelle après encaissement hors ligne (architecture, section 13).
// Sert aussi bien la première activation que le renouvellement d'une matière :
// une seule implémentation, pour que la règle de calcul d'expiration soit unique.
export async function activerAcces(input: unknown, adminId: bigint): Promise<Resultat> {
  const donnees = activerAccesSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }
  const {
    utilisateur_id,
    matiere_id,
    offre_id,
    duree_jours,
    montant,
    reference_paiement,
    demande_id,
    note_admin,
  } = donnees.data;

  const eleve = await prisma.utilisateur.findUnique({
    where: { id: utilisateur_id },
    select: { telephone: true, prenom: true },
  });
  if (!eleve) {
    return { succes: false, erreur: "Élève introuvable." };
  }

  const matiere = await prisma.matiere.findFirst({
    where: { id: matiere_id, supprime_le: null },
    select: { libelle: true },
  });
  if (!matiere) {
    return { succes: false, erreur: "Matière introuvable." };
  }

  // Activer une matière hors de la filière de l'élève lui ferait payer un accès
  // que verifierAccesMatiere refuserait ensuite en hors_filiere.
  const matiereDansFiliere = await prisma.filiereMatiere.findFirst({
    where: { matiere_id, filiere: { eleves: { some: { id: utilisateur_id } } } },
    select: { id: true },
  });
  if (!matiereDansFiliere) {
    return {
      succes: false,
      erreur: "Cette matière n'appartient pas à la filière de l'élève.",
    };
  }

  const offre = await prisma.offre.findFirst({
    where: { id: offre_id, supprime_le: null },
    select: { id: true },
  });
  if (!offre) {
    return { succes: false, erreur: "Offre introuvable." };
  }

  const maintenant = new Date();
  const expiration = ajouterJours(maintenant, duree_jours);

  type ResultatActivation = { erreur: string } | { id: bigint };

  const resultatTransaction: ResultatActivation = await prisma.$transaction(async (tx) => {
    // La demande doit porter sur cet élève et cette matière, et ne pas être
    // déjà traitée : sinon un formulaire rejoué pourrait ouvrir un accès sur
    // l'abonnement d'un autre élève que celui indiqué.
    const demande = demande_id
      ? await tx.demandeMatiere.findFirst({
          where: {
            id: demande_id,
            utilisateur_id,
            matiere_id,
            statut: "en_attente",
          },
        })
      : null;
    if (demande_id && !demande) {
      return { erreur: "Demande introuvable ou déjà traitée." };
    }

    // Une demande porte déjà son abonnement en attente ; un renouvellement
    // réutilise l'abonnement actif de l'élève sur cette offre s'il existe.
    // Un abonnement annulé n'est jamais réactivé : les autres matières qu'il
    // couvre rouvriraient sans paiement.
    const existant = demande
      ? await tx.abonnement.findFirst({
          where: {
            id: demande.abonnement_id,
            utilisateur_id,
            statut: { in: ["en_attente", "actif"] },
          },
        })
      : await tx.abonnement.findFirst({
          where: { utilisateur_id, offre_id, statut: "actif" },
          orderBy: { cree_le: "desc" },
        });

    const abonnement = existant
      ? await tx.abonnement.update({
          where: { id: existant.id },
          data: {
            statut: "actif",
            paiement_statut: "paye",
            montant,
            reference_paiement,
            date_debut: existant.date_debut ?? maintenant,
            date_fin: expiration,
            ...(note_admin ? { note_admin } : {}),
          },
        })
      : await tx.abonnement.create({
          data: {
            utilisateur_id,
            offre_id,
            statut: "actif",
            paiement_statut: "paye",
            montant,
            reference_paiement,
            date_debut: maintenant,
            date_fin: expiration,
            note_admin,
          },
        });

    const ligne = await tx.abonnementMatiere.upsert({
      where: {
        abonnement_id_matiere_id: { abonnement_id: abonnement.id, matiere_id },
      },
      create: {
        abonnement_id: abonnement.id,
        matiere_id,
        date_activation: maintenant,
        date_expiration: expiration,
      },
      update: { date_expiration: expiration },
    });

    if (demande) {
      await tx.demandeMatiere.update({
        where: { id: demande.id },
        data: { statut: "traitee", traite_le: maintenant, traite_par: adminId },
      });
    }

    await consignerAction(
      {
        utilisateurId: adminId,
        action: "activation",
        entite: "abonnement_matiere",
        entiteId: ligne.id,
        apres: {
          utilisateur_id: utilisateur_id.toString(),
          matiere_id: matiere_id.toString(),
          date_expiration: expiration.toISOString(),
          reference_paiement,
        },
      },
      tx,
    );

    return { id: ligne.id };
  });

  if ("erreur" in resultatTransaction) {
    return { succes: false, erreur: resultatTransaction.erreur };
  }

  // La notification ne fait pas partie de la transaction : une panne du canal
  // ne doit jamais annuler un encaissement déjà constaté.
  try {
    await envoyerWhatsApp({
      destinataire: eleve.telephone,
      corps:
        `Bonjour ${eleve.prenom}, votre accès à ${matiere.libelle} est actif ` +
        `jusqu'au ${expiration.toLocaleDateString("fr-MA")}.`,
    });
  } catch (erreur) {
    console.error("[abonnement] confirmation WhatsApp non envoyée", erreur);
  }

  return { succes: true, id: resultatTransaction.id.toString() };
}

export async function refuserDemande(
  demandeId: bigint,
  adminId: bigint,
  motif?: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.demandeMatiere.update({
      where: { id: demandeId },
      data: { statut: "refusee", traite_le: new Date(), traite_par: adminId },
    });
    await consignerAction(
      {
        utilisateurId: adminId,
        action: "refus",
        entite: "demande_matiere",
        entiteId: demandeId,
        apres: motif ? { motif } : undefined,
      },
      tx,
    );
  });
}

export async function annulerAbonnement(
  abonnementId: bigint,
  adminId: bigint,
  motif?: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const avant = await tx.abonnement.findUnique({
      where: { id: abonnementId },
      select: { statut: true },
    });
    await tx.abonnement.update({
      where: { id: abonnementId },
      data: { statut: "annule" },
    });
    await consignerAction(
      {
        utilisateurId: adminId,
        action: "annulation",
        entite: "abonnement",
        entiteId: abonnementId,
        avant: avant ? { statut: avant.statut } : undefined,
        apres: { statut: "annule", ...(motif ? { motif } : {}) },
      },
      tx,
    );
  });
}

export async function modifierAbonnement(
  abonnementId: bigint,
  adminId: bigint,
  input: unknown,
): Promise<Resultat> {
  const donnees = modifierAbonnementSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  await prisma.$transaction(async (tx) => {
    const avant = await tx.abonnement.findUnique({
      where: { id: abonnementId },
      select: { note_admin: true, reference_paiement: true, date_fin: true },
    });
    await tx.abonnement.update({ where: { id: abonnementId }, data: donnees.data });
    await consignerAction(
      {
        utilisateurId: adminId,
        action: "modification",
        entite: "abonnement",
        entiteId: abonnementId,
        avant: avant
          ? {
              note_admin: avant.note_admin,
              reference_paiement: avant.reference_paiement,
              date_fin: avant.date_fin?.toISOString() ?? null,
            }
          : undefined,
        apres: {
          ...donnees.data,
          date_fin: donnees.data.date_fin?.toISOString(),
        },
      },
      tx,
    );
  });

  return { succes: true, id: abonnementId.toString() };
}

export function listerAccesEleve(utilisateurId: bigint) {
  return prisma.abonnementMatiere.findMany({
    where: { abonnement: { utilisateur_id: utilisateurId } },
    orderBy: { date_expiration: "desc" },
    include: {
      matiere: { select: { id: true, libelle: true } },
      abonnement: {
        select: {
          id: true,
          statut: true,
          reference_paiement: true,
          offre: { select: { id: true, libelle: true, duree_jours: true, prix: true } },
        },
      },
    },
  });
}

export function rechercherEleves(recherche: string) {
  const terme = recherche.trim();
  return prisma.utilisateur.findMany({
    where: {
      role: "eleve",
      ...(terme
        ? {
            OR: [
              { nom: { contains: terme, mode: "insensitive" as const } },
              { prenom: { contains: terme, mode: "insensitive" as const } },
              { email: { contains: terme, mode: "insensitive" as const } },
              { telephone: { contains: terme } },
            ],
          }
        : {}),
    },
    orderBy: { cree_le: "desc" },
    take: 20,
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
      filiere: { select: { libelle: true } },
    },
  });
}
