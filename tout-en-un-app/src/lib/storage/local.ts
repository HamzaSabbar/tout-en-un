import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import type { StorageService } from "@/lib/storage/contrat";

// Stockage de secours sur disque, pour le développement et les tests de bout en
// bout : il rend le téléversement du back-office et la lecture d'un PDF par
// l'élève réellement exécutables sans bucket Supabase provisionné. Il n'est
// jamais un chemin de production.
//
// `next start` fixe NODE_ENV=production, et l'intégration continue lance
// justement `next build && next start`. Le seul test sur NODE_ENV fermerait donc
// la porte exactement là où la recette en a besoin. La dérogation est explicite
// et nommée, comme `E2E_BASE_DISTANTE_AUTORISEE` pour la base de test : une
// variable qu'il faut poser sciemment, greppable, et absente de tout
// environnement réel.
export function stockageLocalAutorise(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.STOCKAGE_LOCAL_AUTORISE === "oui";
}

const NOM_REPERTOIRE = ".stockage-local";

export function racineStockageLocal(): string {
  return path.join(process.cwd(), NOM_REPERTOIRE);
}

const SEGMENTS_MAX = 8;
const LONGUEUR_MAX = 200;
const SEGMENT_VALIDE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// La clé revient du chemin d'URL, donc elle est traitée comme hostile même
// signée. Le motif interdit `/`, `\`, l'octet nul, `..` et tout segment
// commençant par un point : la traversée est refusée à la forme, avant toute
// résolution de chemin. Il interdit aussi le saut de ligne, ce qui garantit
// qu'aucune clé ne peut enjamber un séparateur de la charge signée.
//
// Volontairement plus permissif que le format de `construireCleStockage` : lier
// le lecteur au format de l'écrivain casserait à la première évolution du nom.
export function cleValide(cle: string): boolean {
  if (cle.length === 0 || cle.length > LONGUEUR_MAX) return false;
  const segments = cle.split("/");
  if (segments.length > SEGMENTS_MAX) return false;
  if (!segments.every((segment) => SEGMENT_VALIDE.test(segment))) return false;
  return segments[segments.length - 1].toLowerCase().endsWith(".pdf");
}

// Deuxième barrière, indépendante de la première : même si le motif laissait
// passer une forme inattendue, le chemin résolu doit rester sous la racine.
export function resoudreCheminLocal(cle: string, racine = racineStockageLocal()): string | null {
  if (!cleValide(cle)) return null;
  const base = path.resolve(racine);
  const chemin = path.resolve(base, ...cle.split("/"));
  if (chemin !== base && !chemin.startsWith(base + path.sep)) return null;
  return chemin;
}

// Le secret vit sur `globalThis`, comme le client Prisma de `src/lib/db.ts`.
// Deux raisons, toutes deux silencieuses si on l'oublie : en développement le
// rechargement à chaud réévalue le module et invaliderait les URL déjà émises ;
// dans le build de production, la route qui signe et la route qui sert sont deux
// points d'entrée distincts, et si le bundler duplique ce module au lieu de le
// hisser, chaque route obtiendrait son propre secret et toutes les signatures
// seraient refusées.
const globalPourStockage = globalThis as unknown as { secretStockageLocal?: Buffer };

function secretStockageLocal(): Buffer {
  globalPourStockage.secretStockageLocal ??= randomBytes(32);
  return globalPourStockage.secretStockageLocal;
}

const VERSION_CHARGE = "v1";

function chargeASigner(cle: string, expire: number): string {
  return `${VERSION_CHARGE}\n${cle}\n${expire}`;
}

function signer(cle: string, expire: number): string {
  return createHmac("sha256", secretStockageLocal())
    .update(chargeASigner(cle, expire))
    .digest("hex");
}

// `timingSafeEqual` lève sur des longueurs différentes : une signature malformée
// deviendrait une erreur serveur au lieu d'un refus. La longueur est donc
// contrôlée avant, et les chaînes hexadécimales ne sont jamais comparées
// directement.
function signaturesEgales(attendue: string, fournie: string): boolean {
  const a = Buffer.from(attendue, "hex");
  const b = Buffer.from(fournie, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifierSignatureLocale(
  cle: string,
  expire: number,
  signature: string,
): boolean {
  if (!cleValide(cle)) return false;
  if (!Number.isSafeInteger(expire) || expire <= 0) return false;
  if (!signaturesEgales(signer(cle, expire), signature)) return false;
  return expire > Math.floor(Date.now() / 1000);
}

export const CHEMIN_ROUTE_LOCALE = "/api/stockage-local";

function construireUrlSignee(cle: string, dureeSecondes: number): string {
  const expire = Math.floor(Date.now() / 1000) + dureeSecondes;
  const segments = cle.split("/").map(encodeURIComponent).join("/");
  const url = new URL(`${CHEMIN_ROUTE_LOCALE}/${segments}`, env.APP_URL);
  url.searchParams.set("expire", expire.toString());
  url.searchParams.set("signature", signer(cle, expire));
  return url.toString();
}

// Fabrique plutôt qu'objet unique : les tests unitaires visent une racine
// temporaire sans avoir à inventer une variable d'environnement.
export function creerAdaptateurLocal(racine: () => string): StorageService {
  function resoudreOuEchouer(cle: string): string {
    const chemin = resoudreCheminLocal(cle, racine());
    if (chemin === null) {
      // Le message ne répète pas la clé : elle n'a rien à faire dans un journal.
      throw new Error("Clé de stockage invalide.");
    }
    return chemin;
  }

  return {
    async televerser({ cle, contenu }) {
      const chemin = resoudreOuEchouer(cle);
      await mkdir(path.dirname(chemin), { recursive: true });
      // Écriture puis renommage : `remplacerFichier` réécrit la même clé, et un
      // lecteur simultané ne doit jamais voir un PDF tronqué.
      const provisoire = `${chemin}.${randomBytes(6).toString("hex")}.tmp`;
      await writeFile(provisoire, contenu);
      await rename(provisoire, chemin);
    },

    // Aucun contrôle d'existence, comme `createSignedUrl` de Supabase : signer
    // un chemin sans objet derrière doit rendre une URL, pas une erreur.
    async genererUrlSignee(cle, dureeSecondes) {
      if (!cleValide(cle)) throw new Error("Clé de stockage invalide.");
      return construireUrlSignee(cle, dureeSecondes);
    },

    async supprimer(cle) {
      await rm(resoudreOuEchouer(cle), { force: true });
    },
  };
}

export const adaptateurLocal = creerAdaptateurLocal(racineStockageLocal);

// Appelé une fois avant la suite de bout en bout. Le nettoyage de base ne touche
// pas au disque et `supprimer()` n'est appelé nulle part, donc sans cela chaque
// exécution laisserait ses octets derrière elle. Même paranoïa que
// `exigerBaseDeTest()` : refuser d'effacer un répertoire qui n'est pas exactement
// celui attendu.
export async function viderStockageLocal(
  racineDemandee: string = racineStockageLocal(),
): Promise<void> {
  const racine = path.resolve(racineDemandee);
  if (path.basename(racine) !== NOM_REPERTOIRE) {
    throw new Error(`Refus de vider un répertoire inattendu : ${racine}`);
  }
  await rm(racine, { recursive: true, force: true });
}
