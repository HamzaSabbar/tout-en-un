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
  // Lot 4 : les images du contenu riche d'un exercice passent par cette même
  // machinerie, donc par une URL signée. Le contenu riche ne stocke qu'un
  // `fichier_id` (invariant 3).
  "image_exercice",
] as const;

const TAILLE_MAX_OCTETS = 20 * 1024 * 1024;

// Une image d'exercice est affichée dans le fil de l'énoncé, pas ouverte à la
// demande comme un PDF : son poids est subi par l'élève. Architecture 8 prévoit
// une conversion WebP et deux tailles générées, hors périmètre du lot 4 ; d'ici
// là ce plafond est la seule protection du téléphone.
const TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024;

// L'extension du nom stocké est déduite du type MIME validé, jamais du nom de
// fichier envoyé par le navigateur. La table est aussi la liste blanche : ajouter
// un format se fait ici, et `src/lib/storage/local.ts` porte la table inverse
// pour servir le bon `Content-Type`.
const EXTENSION_PAR_MIME = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

type TypeMimeAccepte = keyof typeof EXTENSION_PAR_MIME;

const typeMimeSchema = z.enum(
  Object.keys(EXTENSION_PAR_MIME) as [TypeMimeAccepte, ...TypeMimeAccepte[]],
);

function estImage(typeMime: TypeMimeAccepte): boolean {
  return typeMime !== "application/pdf";
}

// Le type de document et le type MIME doivent s'accorder. Sans ce contrôle, un
// PDF téléversé comme `image_exercice` finirait dans une balise `img`, et une
// image téléversée comme `cours_pdf` serait proposée à l'élève comme un PDF.
function verifierAccordTypeEtMime(
  donnees: { type: string; type_mime: TypeMimeAccepte; taille: number },
  ctx: z.RefinementCtx,
): void {
  const image = estImage(donnees.type_mime);
  if (donnees.type === "image_exercice" && !image) {
    ctx.addIssue({ code: "custom", message: "Une image est attendue." });
  }
  if (donnees.type !== "image_exercice" && image) {
    ctx.addIssue({ code: "custom", message: "Un PDF est attendu." });
  }
  if (image && donnees.taille > TAILLE_MAX_IMAGE_OCTETS) {
    ctx.addIssue({ code: "custom", message: "Image trop lourde." });
  }
}

export const televerserDocumentSchema = z
  .object({
    type: z.enum(TYPES_DOCUMENT),
    titre: z.string().trim().min(1).max(150),
    matiere_id: z.coerce.bigint().optional(),
    chapitre_id: z.coerce.bigint().optional(),
    cours_id: z.coerce.bigint().optional(),
    nom: z.string().trim().min(1).max(255),
    type_mime: typeMimeSchema,
    taille: z.coerce.number().int().min(1).max(TAILLE_MAX_OCTETS),
  })
  .superRefine(verifierAccordTypeEtMime);
export type TeleverserDocumentInput = z.infer<typeof televerserDocumentSchema>;

export const remplacerFichierSchema = z.object({
  nom: z.string().trim().min(1).max(255),
  type_mime: typeMimeSchema,
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
  typeMime: TypeMimeAccepte;
}): string {
  const segments = [params.matiereId, params.chapitreId, params.coursId]
    .filter((id): id is bigint => id !== undefined)
    .map((id) => id.toString());
  const identifiant = randomBytes(8).toString("hex");
  const extension = EXTENSION_PAR_MIME[params.typeMime];
  return [...segments, `${params.type}-${identifiant}.${extension}`].join("/");
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
    typeMime: donnees.data.type_mime,
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

  // Le remplacement garde la même `cle_stockage`, donc la même extension, et
  // c'est cette extension qui détermine le `Content-Type` servi. Changer de
  // format sans changer de clé ferait servir un PNG comme PDF. Le remplacement
  // remplace le contenu, jamais le format.
  if (donnees.data.type_mime !== fichier.type_mime) {
    return { succes: false, erreur: "Le format du fichier doit rester identique." };
  }

  if (estImage(donnees.data.type_mime) && donnees.data.taille > TAILLE_MAX_IMAGE_OCTETS) {
    return { succes: false, erreur: "Image trop lourde." };
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

// Un document téléversé naît en brouillon, comme tout contenu. Sans ces deux
// fonctions il n'existait aucun chemin pour le rendre visible à un élève, et la
// page de cours élève filtre `statut = 'publie'` : un PDF téléversé restait
// invisible pour toujours. `Document` n'a pas de colonne `publie_le`, donc rien
// à horodater ici, contrairement à `publierCours`.
export async function publierDocument(id: bigint): Promise<void> {
  await prisma.document.update({ where: { id }, data: { statut: "publie" } });
}

export async function depublierDocument(id: bigint): Promise<void> {
  await prisma.document.update({ where: { id }, data: { statut: "brouillon" } });
}

export async function supprimerDocument(id: bigint): Promise<void> {
  await prisma.document.update({ where: { id }, data: { supprime_le: new Date() } });
}

// Sert l'invalidation de cache après remplacement d'un fichier : les pages de
// cours qui montrent ce fichier doivent être purgées, et un fichier peut être
// référencé par plusieurs documents.
export function listerRattachementsDocumentsDuFichier(fichierId: bigint) {
  return prisma.document.findMany({
    where: { fichier_id: fichierId, supprime_le: null },
    select: {
      matiere_id: true,
      chapitre_id: true,
      cours_id: true,
      chapitre: { select: { matiere_id: true } },
      cours: { select: { chapitre_id: true, chapitre: { select: { matiere_id: true } } } },
    },
  });
}
