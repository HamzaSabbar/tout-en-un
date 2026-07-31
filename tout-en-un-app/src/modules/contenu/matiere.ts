import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/lib/resultat";

export const creerMatiereSchema = z.object({
  code: z.string().trim().min(1).max(20),
  libelle: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional(),
  icone: z.string().trim().max(50).optional(),
  couleur: z.string().trim().max(20).optional(),
  ordre: z.number().int().min(0).default(0),
});
export type CreerMatiereInput = z.infer<typeof creerMatiereSchema>;

export const modifierMatiereSchema = creerMatiereSchema.partial();
export type ModifierMatiereInput = z.infer<typeof modifierMatiereSchema>;

function erreurCodeDoublon(erreur: unknown): erreur is Prisma.PrismaClientKnownRequestError {
  return (
    erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2002"
  );
}

export async function creerMatiere(input: unknown): Promise<Resultat> {
  const donnees = creerMatiereSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  try {
    const matiere = await prisma.matiere.create({ data: donnees.data });
    return { succes: true, id: matiere.id.toString() };
  } catch (erreur) {
    if (erreurCodeDoublon(erreur)) {
      return { succes: false, erreur: "Ce code de matière est déjà utilisé." };
    }
    throw erreur;
  }
}

export async function modifierMatiere(id: bigint, input: unknown): Promise<Resultat> {
  const donnees = modifierMatiereSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  try {
    const matiere = await prisma.matiere.update({ where: { id }, data: donnees.data });
    return { succes: true, id: matiere.id.toString() };
  } catch (erreur) {
    if (erreurCodeDoublon(erreur)) {
      return { succes: false, erreur: "Ce code de matière est déjà utilisé." };
    }
    throw erreur;
  }
}

export function listerMatieres() {
  return prisma.matiere.findMany({
    where: { supprime_le: null },
    orderBy: { ordre: "asc" },
  });
}

// Catalogue proposé à un élève : matières publiées de sa filière.
export function listerMatieresDeFiliere(filiereId: bigint) {
  return prisma.matiere.findMany({
    where: {
      supprime_le: null,
      statut: "publie",
      filieres: { some: { filiere_id: filiereId } },
    },
    orderBy: { ordre: "asc" },
    select: { id: true, libelle: true },
  });
}

export function obtenirMatiere(id: bigint) {
  return prisma.matiere.findFirst({ where: { id, supprime_le: null } });
}

export async function publierMatiere(id: bigint): Promise<void> {
  await prisma.matiere.update({ where: { id }, data: { statut: "publie" } });
}

export async function depublierMatiere(id: bigint): Promise<void> {
  await prisma.matiere.update({ where: { id }, data: { statut: "brouillon" } });
}

export async function supprimerMatiere(id: bigint): Promise<void> {
  await prisma.matiere.update({ where: { id }, data: { supprime_le: new Date() } });
}
