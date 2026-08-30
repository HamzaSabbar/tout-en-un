import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/lib/resultat";

// Un champ de formulaire laissé vide arrive en chaîne vide, pas en `undefined` :
// sans ce préprocesseur, `.optional()` ne le traite pas comme absent. Même motif
// que `src/modules/contenu/extrait-national.ts`.
function absentSiVide<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (valeur) => (typeof valeur === "string" && valeur.trim() === "" ? undefined : valeur),
    schema,
  );
}

export const creerChapitreSchema = z.object({
  matiere_id: z.coerce.bigint(),
  // Niveau optionnel : une matière comme Mathématiques n'a aucune partie, une
  // matière comme Physique-Chimie regroupe ses chapitres par partie. Un
  // chapitre garde toujours son `matiere_id` propre, avec ou sans partie.
  partie_id: absentSiVide(z.coerce.bigint().optional()),
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

// Vue élève : les brouillons sont écartés dans la requête, jamais à l'affichage
// (invariant 6). L'appelant doit avoir vérifié l'accès à la matière en amont.
// Même garde que `obtenirPageChapitrePubliee`/`obtenirPageCoursPubliee` : une
// partie non publiée masque ses chapitres.
export function listerChapitresPublies(matiereId: bigint) {
  return prisma.chapitre.findMany({
    where: {
      matiere_id: matiereId,
      supprime_le: null,
      statut: "publie",
      OR: [{ partie_id: null }, { partie: { statut: "publie", supprime_le: null } }],
    },
    orderBy: { ordre: "asc" },
    select: { id: true, libelle: true, description: true, ordre: true },
  });
}

export function obtenirChapitre(id: bigint) {
  return prisma.chapitre.findFirst({ where: { id, supprime_le: null } });
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
