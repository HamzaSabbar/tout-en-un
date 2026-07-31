import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { storageService } from "@/lib/storage/storage";
import type { Resultat } from "@/lib/resultat";

const TYPES_DOCUMENT = [
  "cours_pdf",
  "resume_pdf",
  "correction_pdf",
  "sujet_pdf",
  "support_live",
] as const;

const TAILLE_MAX_OCTETS = 20 * 1024 * 1024;

export const televerserDocumentSchema = z.object({
  type: z.enum(TYPES_DOCUMENT),
  titre: z.string().trim().min(1).max(150),
  matiere_id: z.coerce.bigint().optional(),
  chapitre_id: z.coerce.bigint().optional(),
  cours_id: z.coerce.bigint().optional(),
  nom: z.string().trim().min(1).max(255),
  type_mime: z.literal("application/pdf"),
  taille: z.coerce.number().int().min(1).max(TAILLE_MAX_OCTETS),
});
export type TeleverserDocumentInput = z.infer<typeof televerserDocumentSchema>;

export const remplacerFichierSchema = z.object({
  nom: z.string().trim().min(1).max(255),
  type_mime: z.literal("application/pdf"),
  taille: z.coerce.number().int().min(1).max(TAILLE_MAX_OCTETS),
});
export type RemplacerFichierInput = z.infer<typeof remplacerFichierSchema>;

// Convention de nommage de l'architecture (section 8) : les segments de
// hiérarchie disponibles, puis un identifiant opaque — jamais le titre du
// document, pour ne rien exposer et ne rien casser si le titre change.
function construireCleStockage(params: {
  matiereId?: bigint;
  chapitreId?: bigint;
  coursId?: bigint;
  type: string;
}): string {
  const segments = [params.matiereId, params.chapitreId, params.coursId]
    .filter((id): id is bigint => id !== undefined)
    .map((id) => id.toString());
  const identifiant = randomBytes(8).toString("hex");
  return [...segments, `${params.type}-${identifiant}.pdf`].join("/");
}

export async function televerserDocument(
  input: unknown,
  contenu: Buffer,
  televersePar: bigint,
): Promise<Resultat> {
  const donnees = televerserDocumentSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const cle = construireCleStockage({
    matiereId: donnees.data.matiere_id,
    chapitreId: donnees.data.chapitre_id,
    coursId: donnees.data.cours_id,
    type: donnees.data.type,
  });

  try {
    await storageService.televerser({ cle, contenu, typeMime: donnees.data.type_mime });
  } catch (erreur) {
    return { succes: false, erreur: erreur instanceof Error ? erreur.message : "Échec du stockage." };
  }

  const fichier = await prisma.fichier.create({
    data: {
      nom: donnees.data.nom,
      cle_stockage: cle,
      type_mime: donnees.data.type_mime,
      taille: donnees.data.taille,
      televerse_par: televersePar,
    },
  });

  const document = await prisma.document.create({
    data: {
      type: donnees.data.type,
      titre: donnees.data.titre,
      matiere_id: donnees.data.matiere_id,
      chapitre_id: donnees.data.chapitre_id,
      cours_id: donnees.data.cours_id,
      fichier_id: fichier.id,
    },
  });

  return { succes: true, id: document.id.toString() };
}

// Remplace le contenu au même `cle_stockage` : ni `fichier.id` ni la clé ne
// changent, donc aucun `document.fichier_id` existant n'a besoin d'être mis à
// jour et aucune référence n'est cassée.
export async function remplacerFichier(
  fichierId: bigint,
  contenu: Buffer,
  input: unknown,
): Promise<Resultat> {
  const donnees = remplacerFichierSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  const fichier = await prisma.fichier.findUnique({ where: { id: fichierId } });
  if (!fichier || fichier.supprime_le) {
    return { succes: false, erreur: "Fichier introuvable." };
  }

  try {
    await storageService.televerser({
      cle: fichier.cle_stockage,
      contenu,
      typeMime: donnees.data.type_mime,
    });
  } catch (erreur) {
    return { succes: false, erreur: erreur instanceof Error ? erreur.message : "Échec du stockage." };
  }

  const misAJour = await prisma.fichier.update({
    where: { id: fichierId },
    data: {
      nom: donnees.data.nom,
      type_mime: donnees.data.type_mime,
      taille: donnees.data.taille,
    },
  });

  return { succes: true, id: misAJour.id.toString() };
}

export function listerMediatheque(recherche?: string) {
  return prisma.fichier.findMany({
    where: {
      supprime_le: null,
      ...(recherche ? { nom: { contains: recherche, mode: "insensitive" as const } } : {}),
    },
    orderBy: { cree_le: "desc" },
  });
}

export function listerDocumentsCours(coursId: bigint) {
  return prisma.document.findMany({
    where: { cours_id: coursId, supprime_le: null },
    include: { fichier: true },
  });
}

export async function supprimerDocument(id: bigint): Promise<void> {
  await prisma.document.update({ where: { id }, data: { supprime_le: new Date() } });
}
