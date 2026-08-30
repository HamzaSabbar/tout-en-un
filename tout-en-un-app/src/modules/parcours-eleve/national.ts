import "server-only";
import { prisma } from "@/lib/db";
import { storageService, type StorageService } from "@/lib/storage/storage";
import { apposerFiligrane, type IdentiteFiligrane } from "@/lib/pdf/filigrane";

// Fichier à part de `media.ts`, qui reste générique sur tout `document`/
// `video` : le vocabulaire des examens nationaux et le filigrane n'ont rien à
// y faire.

// Masque tous les chiffres sauf les 4 derniers, en conservant leur nombre :
// aucune convention de masquage n'existait dans le code avant ce lot.
export function deriverTelephonePartiel(telephone: string): string {
  const chiffres = telephone.replace(/\D/g, "");
  if (chiffres.length <= 4) return "•".repeat(chiffres.length);
  return "•".repeat(chiffres.length - 4) + chiffres.slice(-4);
}

// Relit `nom`/`prenom`/`telephone` en base plutôt que de faire confiance à la
// session : c'est le seul endroit de la plateforme qui a besoin du téléphone,
// pas de raison de l'ajouter à `UtilisateurSafe`/`ValidatedSession` pour ce
// seul usage (moindre surface pour une donnée personnelle).
export async function obtenirIdentiteFiligrane(
  utilisateurId: bigint,
): Promise<IdentiteFiligrane | null> {
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: utilisateurId },
    select: { nom: true, prenom: true, telephone: true },
  });
  if (!utilisateur) return null;
  return {
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    telephonePartiel: deriverTelephonePartiel(utilisateur.telephone),
  };
}

export async function genererPdfFiligrane(
  cle: string,
  identite: IdentiteFiligrane,
  stockage: Pick<StorageService, "telecharger"> = storageService,
): Promise<Buffer> {
  const original = await stockage.telecharger(cle);
  return apposerFiligrane(original, identite);
}
