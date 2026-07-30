import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/modules/contenu/resultat";

export const creerFiliereSchema = z.object({
  code: z.string().trim().min(1).max(20),
  libelle: z.string().trim().min(1).max(100),
  ordre: z.number().int().min(0).default(0),
});
export type CreerFiliereInput = z.infer<typeof creerFiliereSchema>;

export const modifierFiliereSchema = z.object({
  code: z.string().trim().min(1).max(20).optional(),
  libelle: z.string().trim().min(1).max(100).optional(),
  ordre: z.number().int().min(0).optional(),
  actif: z.boolean().optional(),
});
export type ModifierFiliereInput = z.infer<typeof modifierFiliereSchema>;

function erreurCodeDoublon(erreur: unknown): erreur is Prisma.PrismaClientKnownRequestError {
  return (
    erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2002"
  );
}

export async function creerFiliere(input: unknown): Promise<Resultat> {
  const donnees = creerFiliereSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  try {
    const filiere = await prisma.filiere.create({ data: donnees.data });
    return { succes: true, id: filiere.id.toString() };
  } catch (erreur) {
    if (erreurCodeDoublon(erreur)) {
      return { succes: false, erreur: "Ce code de filière est déjà utilisé." };
    }
    throw erreur;
  }
}

export async function modifierFiliere(id: bigint, input: unknown): Promise<Resultat> {
  const donnees = modifierFiliereSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  try {
    const filiere = await prisma.filiere.update({ where: { id }, data: donnees.data });
    return { succes: true, id: filiere.id.toString() };
  } catch (erreur) {
    if (erreurCodeDoublon(erreur)) {
      return { succes: false, erreur: "Ce code de filière est déjà utilisé." };
    }
    throw erreur;
  }
}

export function listerFilieres() {
  return prisma.filiere.findMany({ orderBy: { ordre: "asc" } });
}

export async function associerMatiere(filiereId: bigint, matiereId: bigint): Promise<void> {
  await prisma.filiereMatiere.upsert({
    where: { filiere_id_matiere_id: { filiere_id: filiereId, matiere_id: matiereId } },
    create: { filiere_id: filiereId, matiere_id: matiereId },
    update: {},
  });
}

export async function dissocierMatiere(filiereId: bigint, matiereId: bigint): Promise<void> {
  await prisma.filiereMatiere.deleteMany({
    where: { filiere_id: filiereId, matiere_id: matiereId },
  });
}
