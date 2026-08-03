import { z } from "zod";

// Modèle du contenu riche d'un exercice : énoncé, aide et correction écrite.
//
// Architecture 15 demande « le nettoyage du contenu riche avant affichage ». Le
// choix fait ici est de rendre le danger impossible en entrée plutôt que de le
// retirer en sortie : le jeu de types de nœuds est fermé, il n'existe aucun nœud
// portant du HTML, et le schéma est `.strict()` donc une clé inconnue fait échouer
// l'écriture. Un assainisseur en sortie resterait possible, mais il traiterait le
// symptôme d'un modèle trop permissif.
//
// Les images ne portent qu'un `fichier_id` : c'est l'invariant 3, aucune URL ni
// clé de stockage ne vit dans le contenu. L'URL signée est forgée à l'affichage,
// après vérification d'accès.

// Une formule dépassant cette longueur n'est pas une formule mais un vecteur de
// déni de service : KaTeX développe les macros, et une expression courte peut
// engendrer un arbre énorme. Le plafond est volontairement bas.
const LONGUEUR_MAX_FORMULE = 500;
const LONGUEUR_MAX_TEXTE = 5_000;
const LONGUEUR_MAX_CODE = 5_000;
const ELEMENTS_MAX_LISTE = 50;
const NOEUDS_MAX_DOCUMENT = 200;

// Formules en ligne dans le texte, délimitées par des dollars.
//
// Sans cela, une formule ne pourrait être qu'un nœud à part, donc sur sa propre
// ligne, et « la vitesse $v$ vaut » deviendrait impossible à écrire. En
// Physique-Chimie c'est la forme la plus courante, pas un cas limite : le modèle
// doit la porter. Le nœud `formule` reste, pour les formules centrées en bloc.
//
// Le texte hors formule reste rendu par React, donc échappé. Seules les portions
// entre dollars atteignent KaTeX.
export type FragmentTexte =
  | { type: "texte"; valeur: string }
  | { type: "latex"; valeur: string };

// Position du dollar fermant, en ignorant les dollars échappés. -1 s'il n'y en a
// pas : un dollar seul est alors du texte, jamais une erreur. Un professeur qui
// écrit « 50 $ » ne doit pas voir son énoncé refusé.
function trouverDollarFermant(texte: string, debut: number): number {
  for (let i = debut; i < texte.length; i += 1) {
    if (texte[i] === "\\") {
      i += 1;
      continue;
    }
    if (texte[i] === "$") return i;
  }
  return -1;
}

export function decouperFormulesEnLigne(texte: string): FragmentTexte[] {
  const fragments: FragmentTexte[] = [];
  let tampon = "";
  let i = 0;

  const viderTampon = () => {
    if (tampon !== "") fragments.push({ type: "texte", valeur: tampon });
    tampon = "";
  };

  while (i < texte.length) {
    // `\$` est un dollar littéral, la seule séquence d'échappement du modèle.
    if (texte[i] === "\\" && texte[i + 1] === "$") {
      tampon += "$";
      i += 2;
      continue;
    }
    if (texte[i] !== "$") {
      tampon += texte[i];
      i += 1;
      continue;
    }

    const fin = trouverDollarFermant(texte, i + 1);
    const latex = fin === -1 ? "" : texte.slice(i + 1, fin);
    if (fin === -1 || latex.trim() === "") {
      // Dollar non apparié, ou paire vide : du texte, pas une formule.
      tampon += "$";
      i += 1;
      continue;
    }

    viderTampon();
    fragments.push({ type: "latex", valeur: latex });
    i = fin + 1;
  }

  viderTampon();
  return fragments;
}

// Une formule en ligne est soumise au même plafond qu'une formule en bloc :
// autrement, la limite se contournerait en la glissant dans un paragraphe.
const texteSchema = z
  .string()
  .min(1)
  .max(LONGUEUR_MAX_TEXTE)
  .refine(
    (valeur) =>
      decouperFormulesEnLigne(valeur).every(
        (fragment) => fragment.type === "texte" || fragment.valeur.length <= LONGUEUR_MAX_FORMULE,
      ),
    { message: `Une formule en ligne dépasse ${LONGUEUR_MAX_FORMULE} caractères.` },
  );

const paragrapheSchema = z
  .object({
    type: z.literal("paragraphe"),
    texte: texteSchema,
  })
  .strict();

const listeSchema = z
  .object({
    type: z.literal("liste"),
    ordonnee: z.boolean().default(false),
    elements: z.array(texteSchema).min(1).max(ELEMENTS_MAX_LISTE),
  })
  .strict();

const formuleSchema = z
  .object({
    type: z.literal("formule"),
    latex: z.string().min(1).max(LONGUEUR_MAX_FORMULE),
    // Une formule en bloc est centrée sur sa propre ligne, une formule en ligne
    // suit le texte. C'est la seule dimension de présentation que le modèle
    // accepte : tout le reste appartient à la feuille de style.
    bloc: z.boolean().default(false),
  })
  .strict();

const imageSchema = z
  .object({
    type: z.literal("image"),
    fichier_id: z.coerce.bigint(),
    // Obligatoire, et non optionnel : une image d'exercice sans alternative
    // textuelle est inaccessible, et rien ne pousse à en écrire une si le modèle
    // l'autorise à manquer.
    alt: z.string().trim().min(1).max(300),
    legende: z.string().trim().max(300).optional(),
  })
  .strict();

const codeSchema = z
  .object({
    type: z.literal("code"),
    texte: z.string().min(1).max(LONGUEUR_MAX_CODE),
    langage: z.string().trim().max(30).optional(),
  })
  .strict();

const noeudSchema = z.discriminatedUnion("type", [
  paragrapheSchema,
  listeSchema,
  formuleSchema,
  imageSchema,
  codeSchema,
]);

// Le document est une liste plate. Aucune imbrication, donc aucune profondeur à
// borner et aucune récursion à faire exploser : la seule limite utile est le
// nombre de nœuds.
export const documentRicheSchema = z
  .object({
    version: z.literal(1),
    noeuds: z.array(noeudSchema).min(1).max(NOEUDS_MAX_DOCUMENT),
  })
  .strict();

export type NoeudRiche = z.infer<typeof noeudSchema>;
export type DocumentRiche = z.infer<typeof documentRicheSchema>;

// Utilisé à la lecture : le JSON stocké en base a été validé à l'écriture, mais
// une ligne semée à la main ou antérieure à un changement de modèle ne doit pas
// faire tomber la page de l'élève. L'appelant décide quoi afficher à la place.
export function analyserDocumentRiche(valeur: unknown): DocumentRiche | null {
  const analyse = documentRicheSchema.safeParse(valeur);
  return analyse.success ? analyse.data : null;
}

// Les identifiants de fichier cités par un document, pour que l'appelant résolve
// les URL signées en une seule requête plutôt qu'une par image.
export function fichiersReferences(document: DocumentRiche): bigint[] {
  const vus = new Set<string>();
  const identifiants: bigint[] = [];
  for (const noeud of document.noeuds) {
    if (noeud.type !== "image") continue;
    const cle = noeud.fichier_id.toString();
    if (vus.has(cle)) continue;
    vus.add(cle);
    identifiants.push(noeud.fichier_id);
  }
  return identifiants;
}

// Le contenu riche est saisi au format JSON dans le back-office. Une chaîne
// invalide doit produire un message, jamais une exception qui remonte jusqu'à la
// page.
export function analyserDocumentRicheJson(brut: string): DocumentRiche | null {
  let valeur: unknown;
  try {
    valeur = JSON.parse(brut);
  } catch {
    return null;
  }
  return analyserDocumentRiche(valeur);
}

// Schéma de champ pour les formulaires : le back-office envoie du texte, le
// service veut un document validé. Un champ vide vaut « absent », ce qui sert
// l'aide et la correction, toutes deux facultatives.
export const champDocumentRicheSchema = z
  .string()
  .trim()
  .transform((brut, ctx) => {
    if (brut === "") return null;
    const document = analyserDocumentRicheJson(brut);
    if (!document) {
      ctx.addIssue({ code: "custom", message: "Contenu riche invalide." });
      return z.NEVER;
    }
    return document;
  });
