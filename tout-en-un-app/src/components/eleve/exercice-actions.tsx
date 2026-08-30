"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, CircleCheckBig, CircleHelp } from "lucide-react";
import { CorrectionVideo } from "@/components/eleve/correction-video";
import { MarqueurEtape } from "@/components/eleve/marqueur-etape";
import { Button } from "@/components/ui/button";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { analyserAutoEvaluation, type AutoEvaluation } from "@/modules/exercice/auto-evaluation";
import { demanderAideAction, demanderCorrectionAction } from "@/modules/exercice/actions";

interface ExerciceActionsProps {
  matiereId: string;
  chapitreId: string;
  coursId: string;
  exerciceId: string;
  titre: string;
}

// Un panneau (aide ou correction) : fermé au premier affichage, chargé au
// premier clic puis gardé en mémoire pour la suite de la visite — rouvrir ne
// refait jamais l'appel serveur ni la ligne de journal.
interface EtatPanneau {
  statut: "ferme" | "chargement" | "ouvert";
  contenu: ReactNode | null;
  indisponible: boolean;
}

const PANNEAU_INITIAL: EtatPanneau = { statut: "ferme", contenu: null, indisponible: false };

// Boutons Aide / Correction / Vidéo / Auto-évaluation d'un exercice, dépliés en
// place sur la page de cours — jamais de navigation vers une autre page.
//
// L'aide et la correction ne sont jamais envoyées avant ce clic : les Server
// Actions `demanderAideAction`/`demanderCorrectionAction` (`src/modules/exercice/actions.tsx`)
// ne composent l'élément React qu'à cet instant, avec `DocumentRicheVue`
// (`server-only`), donc sans qu'aucun script KaTeX ne quitte jamais le
// serveur. Ce composant se contente d'afficher l'élément déjà composé qu'elles
// renvoient.
export function ExerciceActions({
  matiereId,
  chapitreId,
  coursId,
  exerciceId,
  titre,
}: ExerciceActionsProps) {
  const [aide, setAide] = useState<EtatPanneau>(PANNEAU_INITIAL);
  const [correction, setCorrection] = useState<EtatPanneau>(PANNEAU_INITIAL);
  const [videoDisponible, setVideoDisponible] = useState(false);
  const [autoEvaluation, setAutoEvaluation] = useState<AutoEvaluation | null>(null);
  const [autoEvaluationEnCours, setAutoEvaluationEnCours] = useState<AutoEvaluation | null>(null);
  // Région d'annonce : le contenu change sans navigation, et sans elle le
  // changement passe inaperçu d'un lecteur d'écran.
  const [annonce, setAnnonce] = useState<string | null>(null);

  const urlEtape = `/api/matieres/${matiereId}/exercices/${exerciceId}/etape`;
  const contexteAction = { matiereId, exerciceId, chapitreId, coursId };

  async function basculer(
    panneau: EtatPanneau,
    setPanneau: (etat: EtatPanneau) => void,
    demander: (contexte: typeof contexteAction) => Promise<{
      autorise: boolean;
      disponible: boolean;
      contenu?: ReactNode;
      videoDisponible?: boolean;
    }>,
    messageAnnonce: string,
  ) {
    if (panneau.statut === "chargement") return;
    // Déjà chargé une fois cette visite : simple repli ou dépli, sans appel.
    if (panneau.contenu !== null || panneau.indisponible) {
      const ouvre = panneau.statut !== "ouvert";
      setPanneau({ ...panneau, statut: ouvre ? "ouvert" : "ferme" });
      if (ouvre) setAnnonce(messageAnnonce);
      return;
    }
    setPanneau({ ...panneau, statut: "chargement" });
    try {
      const reponse = await demander(contexteAction);
      if (!reponse.autorise) {
        // Session expirée ou accès révoqué entre-temps : on revient à l'état
        // fermé plutôt que d'afficher « pas d'aide », qui serait trompeur.
        setPanneau(PANNEAU_INITIAL);
        return;
      }
      if (!reponse.disponible) {
        setPanneau({ statut: "ouvert", contenu: null, indisponible: true });
        setAnnonce(messageAnnonce);
        return;
      }
      if (reponse.videoDisponible) setVideoDisponible(true);
      setPanneau({ statut: "ouvert", contenu: reponse.contenu ?? null, indisponible: false });
      setAnnonce(messageAnnonce);
    } catch {
      // Échec réseau : on revient à l'état fermé plutôt que de rester bloqué
      // sur « chargement », l'élève peut réessayer.
      setPanneau(PANNEAU_INITIAL);
    }
  }

  async function repondreAutoEvaluation(reponse: AutoEvaluation) {
    setAutoEvaluationEnCours(reponse);
    try {
      const resultat = await fetch(urlEtape, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapitre_id: chapitreId, cours_id: coursId, etape: reponse }),
      });
      if (resultat.ok) setAutoEvaluation(analyserAutoEvaluation(reponse));
    } finally {
      setAutoEvaluationEnCours(null);
    }
  }

  return (
    <div className="space-y-4">
      <MarqueurEtape url={urlEtape} chapitreId={chapitreId} coursId={coursId} etape="enonce" />
      <p role="status" aria-live="polite" className="sr-only">
        {annonce}
      </p>

      <div className="space-y-2">
        <button
          type="button"
          aria-expanded={aide.statut === "ouvert"}
          onClick={() =>
            basculer(aide, setAide, demanderAideAction, ELEVE_FR.exercice.annonceAide)
          }
          className="flex min-h-11 w-full items-center justify-between rounded-lg bg-secondary px-4 py-2.5 text-left text-body-sm font-medium text-secondary-foreground hover:bg-secondary/70"
        >
          <span className="flex items-center gap-2">
            <CircleHelp aria-hidden="true" className="size-4" />
            {aide.statut === "chargement" ? ELEVE_FR.exercice.chargementCourt : ELEVE_FR.exercice.aide}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 transition-transform ${aide.statut === "ouvert" ? "rotate-180" : ""}`}
          />
        </button>
        {aide.statut === "ouvert" && (
          <div data-etape="aide" className="animate-in fade-in-0 slide-in-from-top-1 rounded-lg border p-4 duration-200">
            {aide.indisponible ? (
              <p className="text-muted-foreground">{ELEVE_FR.exercice.aideIndisponible}</p>
            ) : (
              aide.contenu
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          aria-expanded={correction.statut === "ouvert"}
          onClick={() =>
            basculer(
              correction,
              setCorrection,
              demanderCorrectionAction,
              ELEVE_FR.exercice.annonceCorrection,
            )
          }
          className="flex min-h-11 w-full items-center justify-between rounded-lg bg-success/10 px-4 py-2.5 text-left text-body-sm font-medium text-success hover:bg-success/20"
        >
          <span className="flex items-center gap-2">
            <CircleCheckBig aria-hidden="true" className="size-4" />
            {correction.statut === "chargement"
              ? ELEVE_FR.exercice.chargementCourt
              : ELEVE_FR.exercice.correction}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 transition-transform ${correction.statut === "ouvert" ? "rotate-180" : ""}`}
          />
        </button>
        {correction.statut === "ouvert" && (
          <div
            data-etape="correction"
            className="animate-in fade-in-0 slide-in-from-top-1 space-y-4 rounded-lg border p-4 duration-200"
          >
            {correction.indisponible ? (
              <p className="text-muted-foreground">{ELEVE_FR.exercice.correctionIndisponible}</p>
            ) : (
              <>
                {correction.contenu}
                {videoDisponible && (
                  <div data-etape="correction-video" className="space-y-2">
                    <h3 className="text-body-sm font-semibold">{ELEVE_FR.exercice.correctionVideo}</h3>
                    <CorrectionVideo
                      urlLecture={`/api/matieres/${matiereId}/exercices/${exerciceId}/correction-video`}
                      urlEtape={urlEtape}
                      chapitreId={chapitreId}
                      coursId={coursId}
                      cle={`exercice-${exerciceId}`}
                      titre={`${ELEVE_FR.exercice.correctionVideo} — ${titre}`}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div
        data-etape="auto-evaluation"
        className="space-y-3 rounded-lg border bg-muted/30 p-4"
      >
        <p className="text-body-sm font-medium">{ELEVE_FR.exercice.autoEvaluation}</p>
        <p className="text-body-sm text-muted-foreground">
          {ELEVE_FR.exercice.autoEvaluationConsigne}
        </p>
        {autoEvaluation && (
          <p role="status" className="animate-in fade-in-0 text-body-sm font-medium duration-200">
            {autoEvaluation === "reussi"
              ? ELEVE_FR.exercice.reponseReussi
              : ELEVE_FR.exercice.reponseARefaire}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            className="min-h-11"
            disabled={autoEvaluationEnCours !== null}
            onClick={() => void repondreAutoEvaluation("reussi")}
          >
            {ELEVE_FR.exercice.reussi}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={autoEvaluationEnCours !== null}
            onClick={() => void repondreAutoEvaluation("a_refaire")}
          >
            {ELEVE_FR.exercice.aRefaire}
          </Button>
        </div>
      </div>
    </div>
  );
}
