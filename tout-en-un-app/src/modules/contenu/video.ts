import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/lib/resultat";

export const creerVideoSchema = z.object({
  cours_id: z.coerce.bigint(),
  titre: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).optional(),
  duree_secondes: z.coerce.number().int().min(0).optional(),
  fournisseur: z.string().trim().min(1).max(50),
  video_ref: z.string().trim().min(1).max(200),
  ordre: z.number().int().min(0).default(0),
});
export type CreerVideoInput = z.infer<typeof creerVideoSchema>;

export const modifierVideoSchema = creerVideoSchema.omit({ cours_id: true }).partial();
export type ModifierVideoInput = z.infer<typeof modifierVideoSchema>;

export async function creerVideo(input: unknown): Promise<Resultat> {
  const donnees = creerVideoSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const video = await prisma.video.create({ data: donnees.data });
  return { succes: true, id: video.id.toString() };
}

export async function modifierVideo(id: bigint, input: unknown): Promise<Resultat> {
  const donnees = modifierVideoSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const video = await prisma.video.update({ where: { id }, data: donnees.data });
  return { succes: true, id: video.id.toString() };
}

export function listerVideos(coursId: bigint) {
  return prisma.video.findMany({
    where: { cours_id: coursId, supprime_le: null },
    orderBy: { ordre: "asc" },
  });
}

export async function publierVideo(id: bigint): Promise<void> {
  await prisma.video.update({ where: { id }, data: { statut: "publie" } });
}

export async function depublierVideo(id: bigint): Promise<void> {
  await prisma.video.update({ where: { id }, data: { statut: "brouillon" } });
}

export async function supprimerVideo(id: bigint): Promise<void> {
  await prisma.video.update({ where: { id }, data: { supprime_le: new Date() } });
}
