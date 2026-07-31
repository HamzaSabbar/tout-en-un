import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/lib/resultat";
import { consignerAction } from "@/modules/audit/journal";

export const creerOffreSchema = z.object({
  libelle: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  duree_jours: z.coerce.number().int().min(1).max(3650),
  nb_matieres: z.coerce.number().int().min(1).max(20),
  prix: z.coerce.number().min(0).max(1000000),
});
export type CreerOffreInput = z.infer<typeof creerOffreSchema>;

export const modifierOffreSchema = creerOffreSchema.partial().extend({
  actif: z.boolean().optional(),
});

export async function creerOffre(input: unknown): Promise<Resultat> {
  const donnees = creerOffreSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const offre = await prisma.offre.create({ data: donnees.data });
  return { succes: true, id: offre.id.toString() };
}

export async function modifierOffre(id: bigint, input: unknown): Promise<Resultat> {
  const donnees = modifierOffreSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const offre = await prisma.offre.update({ where: { id }, data: donnees.data });
  return { succes: true, id: offre.id.toString() };
}

export function listerOffres() {
  return prisma.offre.findMany({
    where: { supprime_le: null },
    orderBy: { prix: "asc" },
  });
}

export function listerOffresActives() {
  return prisma.offre.findMany({
    where: { supprime_le: null, actif: true },
    orderBy: { prix: "asc" },
  });
}

export function obtenirOffre(id: bigint) {
  return prisma.offre.findFirst({ where: { id, supprime_le: null } });
}

export async function basculerOffre(id: bigint, actif: boolean): Promise<void> {
  await prisma.offre.update({ where: { id }, data: { actif } });
}

export async function supprimerOffre(id: bigint, adminId: bigint): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.offre.update({ where: { id }, data: { supprime_le: new Date() } });
    await consignerAction(
      { utilisateurId: adminId, action: "suppression", entite: "offre", entiteId: id },
      tx,
    );
  });
}
