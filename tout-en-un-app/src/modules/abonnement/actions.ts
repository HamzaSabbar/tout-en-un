"use server";

import { analyserIdentifiant } from "@/lib/identifiant";
import { requireAuth, requirePermission } from "@/modules/acces/require-auth";
import * as abonnementService from "@/modules/abonnement/abonnement";
import * as demandeService from "@/modules/abonnement/demande";
import * as offreService from "@/modules/abonnement/offre";

export interface ActionState {
  erreur?: string;
  succes?: boolean;
}

function champsFormulaire(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function identifiantRequis(formData: FormData, champ: string): bigint {
  const identifiant = analyserIdentifiant(formData.get(champ));
  if (identifiant === null) {
    throw new Error(`Champ ${champ} invalide.`);
  }
  return identifiant;
}

function texteFacultatif(formData: FormData, champ: string): string | undefined {
  const valeur = formData.get(champ);
  if (typeof valeur !== "string") {
    return undefined;
  }
  const nettoye = valeur.trim().slice(0, 500);
  return nettoye.length > 0 ? nettoye : undefined;
}

// --- Côté élève ---

export async function creerDemandeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const utilisateur = await requireAuth();
  const resultat = await demandeService.creerDemande(BigInt(utilisateur.id), {
    offre_id: formData.get("offre_id"),
    matiere_ids: formData.getAll("matiere_ids"),
    message: formData.get("message") || undefined,
  });
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  return { succes: true };
}

// --- Côté back-office ---

export async function activerDemandeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requirePermission("abonnements:gerer");
  const resultat = await abonnementService.activerAcces(
    champsFormulaire(formData),
    BigInt(admin.id),
  );
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  return { succes: true };
}

export async function refuserDemandeAction(formData: FormData): Promise<void> {
  const admin = await requirePermission("abonnements:gerer");
  await abonnementService.refuserDemande(
    identifiantRequis(formData, "demande_id"),
    BigInt(admin.id),
    texteFacultatif(formData, "motif"),
  );
}

export async function annulerAbonnementAction(formData: FormData): Promise<void> {
  const admin = await requirePermission("abonnements:gerer");
  await abonnementService.annulerAbonnement(
    identifiantRequis(formData, "abonnement_id"),
    BigInt(admin.id),
  );
}

export async function modifierAbonnementAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requirePermission("abonnements:gerer");
  const resultat = await abonnementService.modifierAbonnement(
    identifiantRequis(formData, "abonnement_id"),
    BigInt(admin.id),
    {
      note_admin: texteFacultatif(formData, "note_admin"),
      reference_paiement: texteFacultatif(formData, "reference_paiement"),
    },
  );
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  return { succes: true };
}

export async function creerOffreAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("abonnements:gerer");
  const resultat = await offreService.creerOffre(champsFormulaire(formData));
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  return { succes: true };
}

export async function basculerOffreAction(formData: FormData): Promise<void> {
  await requirePermission("abonnements:gerer");
  await offreService.basculerOffre(
    identifiantRequis(formData, "offre_id"),
    formData.get("actif") === "true",
  );
}

export async function supprimerOffreAction(formData: FormData): Promise<void> {
  const admin = await requirePermission("abonnements:gerer");
  await offreService.supprimerOffre(
    identifiantRequis(formData, "offre_id"),
    BigInt(admin.id),
  );
}
