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
// Un tableau d'avancement fait trois ou quatre colonnes, un suivi temporel une
// dizaine de mesures. Ces bornes laissent la place aux deux sans permettre de
// coller une feuille de calcul entière dans un énoncé.
const COLONNES_MAX_TABLEAU = 12;
const LIGNES_MAX_TABLEAU = 60;

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
    // `\$` et `\*` sont les deux seules séquences d'échappement du modèle : un
    // dollar ou une astérisque littérale.
    if (texte[i] === "\\" && (texte[i + 1] === "$" || texte[i + 1] === "*")) {
      tampon += texte[i + 1];
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

// Emphase en ligne, même grammaire que les formules entre dollars : une paire
// non appariée ou vide reste du texte, `\*` rend une astérisque littérale. Une
// seule forme, le gras — l'italique n'a pas d'usage propre ici, les grandeurs et
// variables relèvent des formules, où le rendu mathématique les met déjà en
// italique.
//
// Le découpage se fait en deux temps : les segments d'emphase d'abord, puis les
// fragments de formule à l'intérieur de chacun. L'inverse serait faux, une
// formule est opaque et ce qu'elle contient n'ouvre pas d'emphase.
export interface SegmentTexte {
  emphase: boolean;
  fragments: FragmentTexte[];
}

const MARQUEUR_EMPHASE = "**";

// Cherche la fermeture en sautant les échappements ET les portions entre
// dollars : sans cela, `**` à l'intérieur d'une formule couperait la formule.
function trouverFermetureEmphase(texte: string, debut: number): number {
  let i = debut;
  while (i < texte.length) {
    if (texte[i] === "\\") {
      i += 2;
      continue;
    }
    if (texte[i] === "$") {
      const fin = trouverDollarFermant(texte, i + 1);
      i = fin === -1 ? i + 1 : fin + 1;
      continue;
    }
    if (texte.startsWith(MARQUEUR_EMPHASE, i)) return i;
    i += 1;
  }
  return -1;
}

export function decouperTexteRiche(texte: string): SegmentTexte[] {
  const segments: SegmentTexte[] = [];
  let tampon = "";
  let i = 0;

  const viderTampon = () => {
    if (tampon !== "") segments.push({ emphase: false, fragments: decouperFormulesEnLigne(tampon) });
    tampon = "";
  };

  while (i < texte.length) {
    // Une séquence d'échappement traverse ce découpage sans être interprétée :
    // c'est `decouperFormulesEnLigne`, appelé plus bas sur chaque segment, qui
    // rend le caractère littéral.
    if (texte[i] === "\\") {
      tampon += texte.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (texte[i] === "$") {
      const fin = trouverDollarFermant(texte, i + 1);
      const fermeture = fin === -1 ? i + 1 : fin + 1;
      tampon += texte.slice(i, fermeture);
      i = fermeture;
      continue;
    }
    if (!texte.startsWith(MARQUEUR_EMPHASE, i)) {
      tampon += texte[i];
      i += 1;
      continue;
    }

    const fin = trouverFermetureEmphase(texte, i + 2);
    const interieur = fin === -1 ? "" : texte.slice(i + 2, fin);
    if (fin === -1 || interieur === "") {
      // Marqueur non apparié, ou paire vide : reste du texte.
      tampon += MARQUEUR_EMPHASE;
      i += 2;
      continue;
    }

    viderTampon();
    segments.push({ emphase: true, fragments: decouperFormulesEnLigne(interieur) });
    i = fin + 2;
  }

  viderTampon();
  return segments;
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

// L'identifiant de fichier est stocké en **chaîne de chiffres**, pas en `bigint`
// ni en nombre. En `bigint`, `JSON.stringify` lève et le document deviendrait
// impossible à écrire dans une colonne `Json`. En nombre, un identifiant
// au-delà de 2^53 perdrait de la précision alors que la colonne est un BIGINT.
// La chaîne est la seule des trois formes qui traverse JSON sans rien perdre.
const identifiantFichierSchema = z.string().regex(/^[1-9][0-9]{0,18}$/);

const imageSchema = z
  .object({
    type: z.literal("image"),
    fichier_id: identifiantFichierSchema,
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

// Sans `min(1)`, contrairement à `texteSchema` : un tableau d'avancement a des
// cellules vides par nature (état initial ou final d'une espèce non concernée).
const celluleSchema = z
  .string()
  .max(LONGUEUR_MAX_TEXTE)
  .refine(
    (valeur) =>
      decouperFormulesEnLigne(valeur).every(
        (fragment) => fragment.type === "texte" || fragment.valeur.length <= LONGUEUR_MAX_FORMULE,
      ),
    { message: `Une formule en ligne dépasse ${LONGUEUR_MAX_FORMULE} caractères.` },
  );

// Pas de `.refine()` ni `.superRefine()` ici : cela ferait de ce schéma un
// `ZodEffects`, que l'union discriminée juste en dessous refuse d'accepter comme
// membre. La régularité des lignes (autant de cellules que d'en-têtes) se
// contrôle donc plus bas, au niveau du document entier.
const tableauSchema = z
  .object({
    type: z.literal("tableau"),
    entetes: z.array(celluleSchema).min(1).max(COLONNES_MAX_TABLEAU),
    lignes: z
      .array(z.array(celluleSchema).min(1).max(COLONNES_MAX_TABLEAU))
      .min(1)
      .max(LIGNES_MAX_TABLEAU),
    legende: z.string().trim().max(300).optional(),
  })
  .strict();

const noeudSchema = z.discriminatedUnion("type", [
  paragrapheSchema,
  listeSchema,
  formuleSchema,
  imageSchema,
  codeSchema,
  tableauSchema,
]);

// Le document est une liste plate. Aucune imbrication, donc aucune profondeur à
// borner et aucune récursion à faire exploser : la seule limite utile est le
// nombre de nœuds.
export const documentRicheSchema = z
  .object({
    version: z.literal(1),
    noeuds: z.array(noeudSchema).min(1).max(NOEUDS_MAX_DOCUMENT),
  })
  .strict()
  // Un tableau irrégulier se rend de travers : mieux vaut refuser l'écriture
  // qu'afficher des colonnes décalées à l'élève.
  .superRefine((document, ctx) => {
    document.noeuds.forEach((noeud, indexNoeud) => {
      if (noeud.type !== "tableau") return;
      noeud.lignes.forEach((ligne, indexLigne) => {
        if (ligne.length !== noeud.entetes.length) {
          ctx.addIssue({
            code: "custom",
            message: "Chaque ligne d'un tableau doit avoir autant de cellules que d'en-têtes.",
            path: ["noeuds", indexNoeud, "lignes", indexLigne],
          });
        }
      });
    });
  });

export type NoeudRiche = z.infer<typeof noeudSchema>;
export type DocumentRiche = z.infer<typeof documentRicheSchema>;

// Utilisé à la lecture : le JSON stocké en base a été validé à l'écriture, mais
// une ligne semée à la main ou antérieure à un changement de modèle ne doit pas
// faire tomber la page de l'élève. L'appelant décide quoi afficher à la place.
export function analyserDocumentRiche(valeur: unknown): DocumentRiche | null {
  const analyse = documentRicheSchema.safeParse(valeur);
  return analyse.success ? analyse.data : null;
}

// Les identifiants de fichier cités par un document. Rendus en `bigint`, forme
// attendue par Prisma : la conversion est sûre, le schéma a déjà vérifié que ce
// sont des chiffres. Sert à autoriser la lecture d'une image, et à la résoudre
// en une requête plutôt qu'une par image.
export function fichiersReferences(document: DocumentRiche): bigint[] {
  const vus = new Set<string>();
  const identifiants: bigint[] = [];
  for (const noeud of document.noeuds) {
    if (noeud.type !== "image") continue;
    if (vus.has(noeud.fichier_id)) continue;
    vus.add(noeud.fichier_id);
    identifiants.push(BigInt(noeud.fichier_id));
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

// Schémas de champ pour les formulaires : le back-office envoie du texte, le
// service veut un document validé.
//
// Deux variantes, parce que les trois champs d'un exercice n'ont pas le même
// statut : l'énoncé est obligatoire, l'aide et la correction écrite sont
// facultatives. Pour ces dernières, un champ vide vaut « absent » et non
// « invalide ».
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

export const champDocumentRicheObligatoireSchema = z
  .string()
  .trim()
  .transform((brut, ctx) => {
    const document = brut === "" ? null : analyserDocumentRicheJson(brut);
    if (!document) {
      ctx.addIssue({ code: "custom", message: "Contenu riche invalide ou vide." });
      return z.NEVER;
    }
    return document;
  });
