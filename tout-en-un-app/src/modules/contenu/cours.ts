import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/modules/contenu/resultat";

export const creerCoursSchema = z.object({
  chapitre_id: z.coerce.bigint(),
  titre: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).optional(),
  ordre: z.number().int().min(0).default(0),
  professeur_id: z.coerce.bigint().optional(),
});
export type CreerCoursInput = z.infer<typeof creerCoursSchema>;

export const modifierCoursSchema = creerCoursSchema.omit({ chapitre_id: true }).partial();
export type ModifierCoursInput = z.infer<typeof modifierCoursSchema>;

export async function creerCours(input: unknown): Promise<Resultat> {
  const donnees = creerCoursSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const cours = await prisma.cours.create({ data: donnees.data });
  return { succes: true, id: cours.id.toString() };
}

export async function modifierCours(id: bigint, input: unknown): Promise<Resultat> {
  const donnees = modifierCoursSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const cours = await prisma.cours.update({ where: { id }, data: donnees.data });
  return { succes: true, id: cours.id.toString() };
}

export function listerCours(chapitreId: bigint) {
  return prisma.cours.findMany({
    where: { chapitre_id: chapitreId, supprime_le: null },
    orderBy: { ordre: "asc" },
  });
}

export async function reordonnerCours(idsOrdonnes: bigint[]): Promise<void> {
  await prisma.$transaction(
    idsOrdonnes.map((id, index) =>
      prisma.cours.update({ where: { id }, data: { ordre: index } }),
    ),
  );
}

export async function publierCours(id: bigint): Promise<void> {
  await prisma.cours.update({
    where: { id },
    data: { statut: "publie", publie_le: new Date() },
  });
}

export async function depublierCours(id: bigint): Promise<void> {
  await prisma.cours.update({ where: { id }, data: { statut: "brouillon" } });
}

export async function supprimerCours(id: bigint): Promise<void> {
  await prisma.cours.update({ where: { id }, data: { supprime_le: new Date() } });
}

// Duplique uniquement la fiche du cours (titre, description), pas les vidéos
// ni les documents rattachés : la saisie de leur contenu reste un geste
// délibéré du professeur sur la copie.
export async function dupliquerCours(id: bigint): Promise<Resultat> {
  const original = await prisma.cours.findUnique({ where: { id } });
  if (!original || original.supprime_le) {
    return { succes: false, erreur: "Cours introuvable." };
  }

  const dernier = await prisma.cours.findFirst({
    where: { chapitre_id: original.chapitre_id, supprime_le: null },
    orderBy: { ordre: "desc" },
  });

  const copie = await prisma.cours.create({
    data: {
      chapitre_id: original.chapitre_id,
      titre: `${original.titre} (copie)`,
      description: original.description,
      professeur_id: original.professeur_id,
      ordre: (dernier?.ordre ?? 0) + 1,
      statut: "brouillon",
    },
  });

  return { succes: true, id: copie.id.toString() };
}
