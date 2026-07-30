import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/modules/contenu/resultat";

export const creerChapitreSchema = z.object({
  matiere_id: z.coerce.bigint(),
  libelle: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).optional(),
  icone: z.string().trim().max(50).optional(),
  ordre: z.number().int().min(0).default(0),
});
export type CreerChapitreInput = z.infer<typeof creerChapitreSchema>;

export const modifierChapitreSchema = creerChapitreSchema.omit({ matiere_id: true }).partial();
export type ModifierChapitreInput = z.infer<typeof modifierChapitreSchema>;

export async function creerChapitre(input: unknown): Promise<Resultat> {
  const donnees = creerChapitreSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const chapitre = await prisma.chapitre.create({ data: donnees.data });
  return { succes: true, id: chapitre.id.toString() };
}

export async function modifierChapitre(id: bigint, input: unknown): Promise<Resultat> {
  const donnees = modifierChapitreSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const chapitre = await prisma.chapitre.update({ where: { id }, data: donnees.data });
  return { succes: true, id: chapitre.id.toString() };
}

export function listerChapitres(matiereId: bigint) {
  return prisma.chapitre.findMany({
    where: { matiere_id: matiereId, supprime_le: null },
    orderBy: { ordre: "asc" },
  });
}

export async function reordonnerChapitres(idsOrdonnes: bigint[]): Promise<void> {
  await prisma.$transaction(
    idsOrdonnes.map((id, index) =>
      prisma.chapitre.update({ where: { id }, data: { ordre: index } }),
    ),
  );
}

export async function publierChapitre(id: bigint): Promise<void> {
  await prisma.chapitre.update({ where: { id }, data: { statut: "publie" } });
}

export async function depublierChapitre(id: bigint): Promise<void> {
  await prisma.chapitre.update({ where: { id }, data: { statut: "brouillon" } });
}

export async function supprimerChapitre(id: bigint): Promise<void> {
  await prisma.chapitre.update({ where: { id }, data: { supprime_le: new Date() } });
}
