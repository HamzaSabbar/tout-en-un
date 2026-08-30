"use server";

import { requirePermission } from "@/modules/acces/require-auth";
import * as filiereService from "@/modules/contenu/filiere";
import * as matiereService from "@/modules/contenu/matiere";
import * as chapitreService from "@/modules/contenu/chapitre";
import * as partieService from "@/modules/contenu/partie";
import * as coursService from "@/modules/contenu/cours";
import * as videoService from "@/modules/contenu/video";
import * as documentService from "@/modules/contenu/document";
import * as extraitNationalService from "@/modules/contenu/extrait-national";
import * as examenNationalService from "@/modules/contenu/examen-national";
import * as exerciceService from "@/modules/exercice/service";
import {
  invaliderChapitre,
  invaliderCours,
  invaliderExamensNationaux,
  invaliderMatiere,
} from "@/modules/parcours-eleve/invalidation";

export interface ActionState {
  erreur?: string;
}

function champsFormulaire(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function fichierEnBuffer(fichier: File): Promise<Buffer> {
  return Buffer.from(await fichier.arrayBuffer());
}

// --- Filières ---

export async function creerFiliereAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("contenu:gerer");
  const resultat = await filiereService.creerFiliere(champsFormulaire(formData));
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  return {};
}

export async function associerMatiereAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const filiereId = BigInt(formData.get("filiere_id") as string);
  const matiereId = BigInt(formData.get("matiere_id") as string);
  await filiereService.associerMatiere(filiereId, matiereId);
}

export async function dissocierMatiereAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const filiereId = BigInt(formData.get("filiere_id") as string);
  const matiereId = BigInt(formData.get("matiere_id") as string);
  await filiereService.dissocierMatiere(filiereId, matiereId);
}

// --- Matières ---

export async function creerMatiereAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("contenu:gerer");
  const resultat = await matiereService.creerMatiere(champsFormulaire(formData));
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  return {};
}

export async function publierMatiereAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  await matiereService.publierMatiere(matiereId);
  invaliderMatiere(matiereId);
}

export async function depublierMatiereAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  await matiereService.depublierMatiere(matiereId);
  invaliderMatiere(matiereId);
}

// --- Chapitres ---

export async function creerChapitreAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("contenu:gerer");
  const resultat = await chapitreService.creerChapitre(champsFormulaire(formData));
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  return {};
}

export async function publierChapitreAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  await chapitreService.publierChapitre(chapitreId);
  invaliderChapitre(matiereId, chapitreId);
}

export async function depublierChapitreAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  await chapitreService.depublierChapitre(chapitreId);
  invaliderChapitre(matiereId, chapitreId);
}

export async function deplacerChapitreAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  const direction = formData.get("direction") as "monter" | "descendre";

  const tousLesChapitres = await chapitreService.listerChapitres(matiereId);
  const chapitreActuel = tousLesChapitres.find((c) => c.id === chapitreId);
  if (!chapitreActuel) {
    return;
  }

  // Le déplacement ne doit jamais franchir une frontière de partie : on ne
  // réordonne qu'à l'intérieur du même groupe (y compris le groupe « sans
  // partie », où `partie_id` vaut `null` des deux côtés). Sans ce filtre, un
  // chapitre pourrait sauter silencieusement d'une partie à l'autre.
  const chapitres = tousLesChapitres.filter((c) => c.partie_id === chapitreActuel.partie_id);
  const ids = chapitres.map((c) => c.id);
  const index = ids.findIndex((id) => id === chapitreId);
  const cible = direction === "monter" ? index - 1 : index + 1;
  if (index === -1 || cible < 0 || cible >= ids.length) {
    return;
  }
  [ids[index], ids[cible]] = [ids[cible], ids[index]];
  await chapitreService.reordonnerChapitres(ids);
  invaliderMatiere(matiereId);
}

// --- Parties ---

export async function creerPartieAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("contenu:gerer");
  const resultat = await partieService.creerPartie(champsFormulaire(formData));
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  return {};
}

export async function publierPartieAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const partieId = BigInt(formData.get("partie_id") as string);
  await partieService.publierPartie(partieId);
  invaliderMatiere(matiereId);
}

export async function depublierPartieAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const partieId = BigInt(formData.get("partie_id") as string);
  await partieService.depublierPartie(partieId);
  invaliderMatiere(matiereId);
}

export async function deplacerPartieAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const partieId = BigInt(formData.get("partie_id") as string);
  const direction = formData.get("direction") as "monter" | "descendre";

  const parties = await partieService.listerParties(matiereId);
  const ids = parties.map((p) => p.id);
  const index = ids.findIndex((id) => id === partieId);
  const cible = direction === "monter" ? index - 1 : index + 1;
  if (index === -1 || cible < 0 || cible >= ids.length) {
    return;
  }
  [ids[index], ids[cible]] = [ids[cible], ids[index]];
  await partieService.reordonnerParties(ids);
  invaliderMatiere(matiereId);
}

// --- Cours ---

export async function creerCoursAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("contenu:gerer");
  const resultat = await coursService.creerCours(champsFormulaire(formData));
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  return {};
}

export async function publierCoursAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  const coursId = BigInt(formData.get("cours_id") as string);
  await coursService.publierCours(coursId);
  invaliderCours(matiereId, chapitreId, coursId);
}

export async function depublierCoursAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  const coursId = BigInt(formData.get("cours_id") as string);
  await coursService.depublierCours(coursId);
  invaliderCours(matiereId, chapitreId, coursId);
}

export async function dupliquerCoursAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  await coursService.dupliquerCours(BigInt(formData.get("cours_id") as string));
}

export async function deplacerCoursAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  const coursId = BigInt(formData.get("cours_id") as string);
  const direction = formData.get("direction") as "monter" | "descendre";

  const cours = await coursService.listerCours(chapitreId);
  const ids = cours.map((c) => c.id);
  const index = ids.findIndex((id) => id === coursId);
  const cible = direction === "monter" ? index - 1 : index + 1;
  if (index === -1 || cible < 0 || cible >= ids.length) {
    return;
  }
  [ids[index], ids[cible]] = [ids[cible], ids[index]];
  await coursService.reordonnerCours(ids);
  const matiereId = BigInt(formData.get("matiere_id") as string);
  invaliderChapitre(matiereId, chapitreId);
}

// --- Vidéos ---

export async function creerVideoAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("contenu:gerer");
  const resultat = await videoService.creerVideo(champsFormulaire(formData));
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  return {};
}

export async function publierVideoAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  const coursId = BigInt(formData.get("cours_id") as string);
  await videoService.publierVideo(BigInt(formData.get("video_id") as string));
  invaliderCours(matiereId, chapitreId, coursId);
}

export async function depublierVideoAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  const coursId = BigInt(formData.get("cours_id") as string);
  await videoService.depublierVideo(BigInt(formData.get("video_id") as string));
  invaliderCours(matiereId, chapitreId, coursId);
}

// --- Documents et médiathèque ---

// Un document peut être rattaché à une matière, à un chapitre ou à un cours :
// n'invalide que le niveau réellement fourni, sans supposer les trois.
function invaliderRattachement(rattachement: {
  matiereId?: bigint | null;
  chapitreId?: bigint | null;
  coursId?: bigint | null;
}): void {
  const { matiereId, chapitreId, coursId } = rattachement;
  if (matiereId && chapitreId && coursId) {
    invaliderCours(matiereId, chapitreId, coursId);
  } else if (matiereId && chapitreId) {
    invaliderChapitre(matiereId, chapitreId);
  } else if (matiereId) {
    invaliderMatiere(matiereId);
  }
}

function identifiantOptionnel(valeur: FormDataEntryValue | null): bigint | undefined {
  return valeur ? BigInt(valeur as string) : undefined;
}

export async function televerserDocumentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const utilisateur = await requirePermission("contenu:gerer");
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { erreur: "Choisis un fichier PDF." };
  }

  const resultat = await documentService.televerserDocument(
    {
      type: formData.get("type"),
      titre: formData.get("titre"),
      matiere_id: formData.get("matiere_id") || undefined,
      chapitre_id: formData.get("chapitre_id") || undefined,
      cours_id: formData.get("cours_id") || undefined,
      nom: fichier.name,
      type_mime: fichier.type,
      taille: fichier.size,
    },
    await fichierEnBuffer(fichier),
    BigInt(utilisateur.id),
  );

  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }

  // Seulement en cas de succès : rien n'a changé côté élève si le stockage a
  // refusé le fichier.
  invaliderRattachement({
    matiereId: identifiantOptionnel(formData.get("matiere_id")),
    chapitreId: identifiantOptionnel(formData.get("chapitre_id")),
    coursId: identifiantOptionnel(formData.get("cours_id")),
  });
  return {};
}

export async function publierDocumentAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  const coursId = BigInt(formData.get("cours_id") as string);
  await documentService.publierDocument(BigInt(formData.get("document_id") as string));
  invaliderCours(matiereId, chapitreId, coursId);
}

export async function depublierDocumentAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  const coursId = BigInt(formData.get("cours_id") as string);
  await documentService.depublierDocument(BigInt(formData.get("document_id") as string));
  invaliderCours(matiereId, chapitreId, coursId);
}

// --- Exercices ---

export async function creerExerciceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("contenu:gerer");
  const resultat = await exerciceService.creerExercice(champsFormulaire(formData));
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }
  // Un exercice naît en brouillon, donc rien ne change encore pour l'élève. Le
  // cours est invalidé quand même : la page de cours du back-office et celle de
  // l'élève partagent les mêmes étiquettes de cache.
  invaliderCours(
    BigInt(formData.get("matiere_id") as string),
    BigInt(formData.get("chapitre_id") as string),
    BigInt(formData.get("cours_id") as string),
  );
  return {};
}

export async function publierExerciceAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  const coursId = BigInt(formData.get("cours_id") as string);
  await exerciceService.publierExercice(BigInt(formData.get("exercice_id") as string));
  invaliderCours(matiereId, chapitreId, coursId);
}

export async function depublierExerciceAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  const coursId = BigInt(formData.get("cours_id") as string);
  await exerciceService.depublierExercice(BigInt(formData.get("exercice_id") as string));
  invaliderCours(matiereId, chapitreId, coursId);
}

export async function remplacerFichierAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("contenu:gerer");
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { erreur: "Choisis un fichier PDF de remplacement." };
  }

  const fichierId = BigInt(formData.get("fichier_id") as string);
  const resultat = await documentService.remplacerFichier(
    fichierId,
    await fichierEnBuffer(fichier),
    { nom: fichier.name, type_mime: fichier.type, taille: fichier.size },
  );

  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }

  // Le remplacement réutilise la même clé de stockage, donc aucune référence ne
  // bouge, mais le contenu servi change : les pages qui exposent ce fichier
  // doivent être purgées. Un fichier peut porter plusieurs documents.
  const rattachements =
    await documentService.listerRattachementsDocumentsDuFichier(fichierId);
  for (const document of rattachements) {
    invaliderRattachement({
      matiereId:
        document.matiere_id ??
        document.chapitre?.matiere_id ??
        document.cours?.chapitre.matiere_id,
      chapitreId: document.chapitre_id ?? document.cours?.chapitre_id,
      coursId: document.cours_id,
    });
  }
  return {};
}

// --- Extraits nationaux ---
//
// Le(s) PDF sont téléversés via `documentService.televerserDocument()`, sans
// rattachement à un chapitre/cours (seul `matiere_id` est passé, pour une clé
// de stockage lisible) : sinon ces documents fuiteraient dans la liste
// générique des documents du cours. L'extrait est l'unique propriétaire de
// leurs identifiants, jamais `Document.statut` (voir
// `src/modules/contenu/extrait-national.ts`).

export async function creerExtraitNationalAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const utilisateur = await requirePermission("contenu:gerer");
  const matiereId = formData.get("matiere_id") as string;
  const chapitreId = formData.get("chapitre_id") as string;
  const coursId = formData.get("cours_id") as string;
  const annee = formData.get("annee") as string;
  const session = formData.get("session") as string;

  const sujet = formData.get("sujet");
  if (!(sujet instanceof File) || sujet.size === 0) {
    return { erreur: "Choisis le PDF du sujet." };
  }
  const sujetResultat = await documentService.televerserDocument(
    {
      type: "sujet_pdf",
      titre: `Sujet ${annee} ${session}`,
      matiere_id: matiereId,
      nom: sujet.name,
      type_mime: sujet.type,
      taille: sujet.size,
    },
    await fichierEnBuffer(sujet),
    BigInt(utilisateur.id),
  );
  if (!sujetResultat.succes) {
    return { erreur: sujetResultat.erreur };
  }

  let correctionDocumentId: string | undefined;
  const correction = formData.get("correction");
  if (correction instanceof File && correction.size > 0) {
    const correctionResultat = await documentService.televerserDocument(
      {
        type: "correction_pdf",
        titre: `Correction ${annee} ${session}`,
        matiere_id: matiereId,
        nom: correction.name,
        type_mime: correction.type,
        taille: correction.size,
      },
      await fichierEnBuffer(correction),
      BigInt(utilisateur.id),
    );
    if (!correctionResultat.succes) {
      return { erreur: correctionResultat.erreur };
    }
    correctionDocumentId = correctionResultat.id;
  }

  const resultat = await extraitNationalService.creerExtraitNational({
    matiere_id: matiereId,
    chapitre_id: chapitreId,
    cours_id: coursId,
    annee,
    session,
    // Champ de formulaire nommé `extrait_enonce`, pas `enonce` : les deux
    // formulaires (extrait national et exercice) coexistent sur la même page
    // de cours admin, et `enonce` y est déjà pris par l'exercice — un même nom
    // aurait rendu les deux formulaires indiscernables pour un sélecteur qui
    // scope par ce champ (et ambigu pour un lecteur d'écran).
    enonce: formData.get("extrait_enonce"),
    sujet_document_id: sujetResultat.id,
    correction_document_id: correctionDocumentId,
    correction_video_ref: formData.get("correction_video_ref") || undefined,
    duree_recommandee: formData.get("duree_recommandee") || undefined,
    difficulte: formData.get("difficulte") || undefined,
  });
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }

  invaliderCours(BigInt(matiereId), BigInt(chapitreId), BigInt(coursId));
  return {};
}

export async function publierExtraitNationalAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  const coursId = BigInt(formData.get("cours_id") as string);
  await extraitNationalService.publierExtraitNational(
    BigInt(formData.get("extrait_id") as string),
  );
  invaliderCours(matiereId, chapitreId, coursId);
}

export async function depublierExtraitNationalAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  const chapitreId = BigInt(formData.get("chapitre_id") as string);
  const coursId = BigInt(formData.get("cours_id") as string);
  await extraitNationalService.depublierExtraitNational(
    BigInt(formData.get("extrait_id") as string),
  );
  invaliderCours(matiereId, chapitreId, coursId);
}

// --- Examens nationaux ---

export async function creerExamenNationalAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const utilisateur = await requirePermission("contenu:gerer");
  const matiereId = formData.get("matiere_id") as string;
  const filiereId = formData.get("filiere_id") as string;
  const annee = formData.get("annee") as string;
  const session = formData.get("session") as string;

  const sujet = formData.get("sujet");
  if (!(sujet instanceof File) || sujet.size === 0) {
    return { erreur: "Choisis le PDF du sujet." };
  }
  const sujetResultat = await documentService.televerserDocument(
    {
      type: "sujet_pdf",
      titre: `Examen ${annee} ${session}`,
      matiere_id: matiereId,
      nom: sujet.name,
      type_mime: sujet.type,
      taille: sujet.size,
    },
    await fichierEnBuffer(sujet),
    BigInt(utilisateur.id),
  );
  if (!sujetResultat.succes) {
    return { erreur: sujetResultat.erreur };
  }

  let correctionDocumentId: string | undefined;
  const correction = formData.get("correction");
  if (correction instanceof File && correction.size > 0) {
    const correctionResultat = await documentService.televerserDocument(
      {
        type: "correction_pdf",
        titre: `Correction examen ${annee} ${session}`,
        matiere_id: matiereId,
        nom: correction.name,
        type_mime: correction.type,
        taille: correction.size,
      },
      await fichierEnBuffer(correction),
      BigInt(utilisateur.id),
    );
    if (!correctionResultat.succes) {
      return { erreur: correctionResultat.erreur };
    }
    correctionDocumentId = correctionResultat.id;
  }

  const resultat = await examenNationalService.creerExamenNational({
    matiere_id: matiereId,
    filiere_id: filiereId,
    annee,
    session,
    sujet_document_id: sujetResultat.id,
    correction_document_id: correctionDocumentId,
    correction_video_ref: formData.get("correction_video_ref") || undefined,
  });
  if (!resultat.succes) {
    return { erreur: resultat.erreur };
  }

  invaliderExamensNationaux(BigInt(matiereId));
  return {};
}

export async function publierExamenNationalAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  await examenNationalService.publierExamenNational(
    BigInt(formData.get("examen_id") as string),
  );
  invaliderExamensNationaux(matiereId);
}

export async function depublierExamenNationalAction(formData: FormData): Promise<void> {
  await requirePermission("contenu:gerer");
  const matiereId = BigInt(formData.get("matiere_id") as string);
  await examenNationalService.depublierExamenNational(
    BigInt(formData.get("examen_id") as string),
  );
  invaliderExamensNationaux(matiereId);
}
