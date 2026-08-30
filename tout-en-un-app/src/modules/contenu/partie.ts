import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/lib/resultat";

export const creerPartieSchema = z.object({
  matiere_id: z.coerce.bigint(),
  libelle: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).optional(),
  icone: z.string().trim().max(50).optional(),
  ordre: z.number().int().min(0).default(0),
});
export type CreerPartieInput = z.infer<typeof creerPartieSchema>;

export const modifierPartieSchema = creerPartieSchema.omit({ matiere_id: true }).partial();
export type ModifierPartieInput = z.infer<typeof modifierPartieSchema>;

export async function creerPartie(input: unknown): Promise<Resultat> {
  const donnees = creerPartieSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const partie = await prisma.partie.create({ data: donnees.data });
  return { succes: true, id: partie.id.toString() };
}

export async function modifierPartie(id: bigint, input: unknown): Promise<Resultat> {
  const donnees = modifierPartieSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const partie = await prisma.partie.update({ where: { id }, data: donnees.data });
  return { succes: true, id: partie.id.toString() };
}

export function listerParties(matiereId: bigint) {
  return prisma.partie.findMany({
    where: { matiere_id: matiereId, supprime_le: null },
    orderBy: { ordre: "asc" },
  });
}

// Vue élève : les brouillons sont écartés dans la requête, jamais à l'affichage
// (invariant 6). L'appelant doit avoir vérifié l'accès à la matière en amont.
export function listerPartiesPubliees(matiereId: bigint) {
  return prisma.partie.findMany({
    where: { matiere_id: matiereId, supprime_le: null, statut: "publie" },
    orderBy: { ordre: "asc" },
    select: { id: true, libelle: true, description: true, ordre: true },
  });
}

export function obtenirPartie(id: bigint) {
  return prisma.partie.findFirst({ where: { id, supprime_le: null } });
}

export async function reordonnerParties(idsOrdonnes: bigint[]): Promise<void> {
  await prisma.$transaction(
    idsOrdonnes.map((id, index) =>
      prisma.partie.update({ where: { id }, data: { ordre: index } }),
    ),
  );
}

export async function publierPartie(id: bigint): Promise<void> {
  await prisma.partie.update({ where: { id }, data: { statut: "publie" } });
}

export async function depublierPartie(id: bigint): Promise<void> {
  await prisma.partie.update({ where: { id }, data: { statut: "brouillon" } });
}

// Détache d'abord les chapitres de cette partie (`partie_id: null`), dans la
// même transaction que la suppression logique : sans ça, un chapitre garderait
// un `partie_id` pointant vers une partie supprimée, invisible dans les deux
// vues qui groupent par partie active (back-office, page matière élève) au
// lieu de retomber dans « sans partie ».
export async function supprimerPartie(id: bigint): Promise<void> {
  await prisma.$transaction([
    prisma.chapitre.updateMany({ where: { partie_id: id }, data: { partie_id: null } }),
    prisma.partie.update({ where: { id }, data: { supprime_le: new Date() } }),
  ]);
}
