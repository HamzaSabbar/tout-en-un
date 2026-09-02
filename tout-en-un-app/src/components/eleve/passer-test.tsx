"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { accorder } from "@/lib/pluriel";
import { cn } from "@/lib/utils";
import {
  demarrerTestAction,
  soumettreTestAction,
  type ReponseDemarrage,
  type ReponseSoumission,
} from "@/modules/test/actions";

interface PasserTestProps {
  matiereId: string;
  chapitreId: string;
  coursId: string;
  titre: string;
  dureeMinutes: number;
  nbQuestions: number;
  dejaTermine: boolean;
}

type Phase =
  | { etape: "presentation" }
  | { etape: "chargement" }
  | {
      etape: "en_cours";
      tentativeId: string;
      finLe: number;
      questions: NonNullable<ReponseDemarrage["questions"]>;
      reponses: Record<string, string>;
    }
  | { etape: "soumission" }
  | { etape: "restitution"; donnees: NonNullable<ReponseSoumission["questions"]>; resume: ReponseSoumission };

function formaterChrono(secondes: number): string {
  const min = Math.floor(secondes / 60);
  const sec = secondes % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// Premier minuteur seconde par seconde de la plateforme (le compte à rebours
// du national est jour par jour, sans intervalle). Ancré sur une date de fin
// absolue (`demarreLe + dureeMinutes`), jamais un simple décompte de
// secondes : un décompte naïf dérive si l'onglet est mis en veille, une
// horloge murale ne dérive jamais.
export function PasserTest({
  matiereId,
  chapitreId,
  coursId,
  titre,
  dureeMinutes,
  nbQuestions,
  dejaTermine,
}: PasserTestProps) {
  const [phase, setPhase] = useState<Phase>({ etape: "presentation" });
  const [secondesRestantes, setSecondesRestantes] = useState<number | null>(null);
  const soumissionDemarree = useRef(false);
  const contexte = { matiereId, chapitreId, coursId };

  useEffect(() => {
    if (phase.etape !== "en_cours") return;
    soumissionDemarree.current = false;

    function tick() {
      if (phase.etape !== "en_cours") return;
      const restant = Math.max(0, Math.round((phase.finLe - Date.now()) / 1000));
      setSecondesRestantes(restant);
      if (restant === 0 && !soumissionDemarree.current) {
        soumissionDemarree.current = true;
        void soumettre(phase.tentativeId);
      }
    }

    tick();
    const intervalle = setInterval(tick, 1000);
    return () => clearInterval(intervalle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.etape === "en_cours" ? phase.tentativeId : null]);

  async function commencer() {
    setPhase({ etape: "chargement" });
    const reponse = await demarrerTestAction(contexte);
    if (!reponse.autorise || !reponse.questions || !reponse.tentativeId || !reponse.demarreLe) {
      setPhase({ etape: "presentation" });
      return;
    }
    const reponses: Record<string, string> = {};
    for (const { questionId, optionId } of reponse.reponses ?? []) {
      if (optionId) reponses[questionId] = optionId;
    }
    setPhase({
      etape: "en_cours",
      tentativeId: reponse.tentativeId,
      finLe: new Date(reponse.demarreLe).getTime() + (reponse.dureeMinutes ?? dureeMinutes) * 60_000,
      questions: reponse.questions,
      reponses,
    });
  }

  function choisir(questionId: string, optionId: string) {
    if (phase.etape !== "en_cours") return;
    const reponses = { ...phase.reponses, [questionId]: optionId };
    setPhase({ ...phase, reponses });
    // Sauvegarde progressive : fait sans bloquer l'interface, une coupure ne
    // doit rien faire perdre côté serveur, mais l'élève doit pouvoir
    // continuer à répondre sans attendre l'aller-retour.
    void fetch(`/api/matieres/${matiereId}/tests/${phase.tentativeId}/reponse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tentative_id: phase.tentativeId,
        question_test_id: questionId,
        option_id: optionId,
      }),
    }).catch(() => {});
  }

  async function soumettre(tentativeId: string) {
    setPhase({ etape: "soumission" });
    const reponse = await soumettreTestAction(contexte, tentativeId);
    if (!reponse.autorise || !reponse.questions) {
      setPhase({ etape: "presentation" });
      return;
    }
    setPhase({ etape: "restitution", donnees: reponse.questions, resume: reponse });
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap aria-hidden="true" className="size-4" />
        </span>
        <div className="flex-1">
          <CardTitle className="flex items-center gap-2 text-base">
            {titre}
            {!dejaTermine && phase.etape === "presentation" && (
              <Badge variant="secondary">{ELEVE_FR.test.aFaire}</Badge>
            )}
          </CardTitle>
          {phase.etape === "presentation" && (
            <p className="text-caption text-muted-foreground">
              {nbQuestions} {accorder(nbQuestions, ELEVE_FR.test.nbQuestions, ELEVE_FR.test.nbQuestionsPluriel)} ·{" "}
              {dureeMinutes} {ELEVE_FR.test.duree}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {(phase.etape === "presentation" || phase.etape === "chargement") && (
          <Button type="button" className="min-h-11" disabled={phase.etape === "chargement"} onClick={() => void commencer()}>
            {ELEVE_FR.test.commencer}
          </Button>
        )}

        {phase.etape === "en_cours" && (
          <div className="space-y-6">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-body-sm font-medium",
                secondesRestantes !== null && secondesRestantes < 60
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "bg-muted/40",
              )}
              role="timer"
              aria-live="polite"
            >
              <Clock aria-hidden="true" className="size-4" />
              {ELEVE_FR.test.tempsRestant} :{" "}
              {secondesRestantes !== null ? formaterChrono(secondesRestantes) : "…"}
            </div>

            {phase.questions.map((question, index) => (
              <fieldset key={question.id} className="space-y-3 rounded-lg border p-4">
                <legend className="px-1 text-body-sm font-medium text-muted-foreground">
                  {ELEVE_FR.test.question} {index + 1}/{phase.questions.length}
                </legend>
                <div>{question.enonce}</div>
                <div className="flex flex-col gap-2">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2",
                        phase.reponses[question.id] === option.id
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted",
                      )}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        checked={phase.reponses[question.id] === option.id}
                        onChange={() => choisir(question.id, option.id)}
                        className="size-4"
                      />
                      <span>{option.libelle}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <Button type="button" className="min-h-11" onClick={() => void soumettre(phase.tentativeId)}>
              {ELEVE_FR.test.soumettre}
            </Button>
          </div>
        )}

        {phase.etape === "soumission" && (
          <p className="text-body-sm text-muted-foreground">{ELEVE_FR.test.soumission}</p>
        )}

        {phase.etape === "restitution" && (
          <Restitution donnees={phase.donnees} resume={phase.resume} />
        )}
      </CardContent>
    </Card>
  );
}

function Restitution({
  donnees,
  resume,
}: {
  donnees: NonNullable<ReponseSoumission["questions"]>;
  resume: ReponseSoumission;
}) {
  return (
    <div className="space-y-6">
      <div
        className={cn(
          "rounded-lg border p-4",
          resume.valide ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10",
        )}
      >
        <p className={cn("text-h3 font-semibold", resume.valide ? "text-success" : "text-destructive")}>
          {resume.valide ? ELEVE_FR.test.coursValide : ELEVE_FR.test.coursARevoir}
        </p>
        <p className="text-body-sm text-muted-foreground">
          {resume.score}/{resume.scoreMax} · {resume.pourcentage} % ({ELEVE_FR.test.score}, {ELEVE_FR.test.seuil}{" "}
          {resume.seuilValidation} %)
        </p>
      </div>

      {donnees.map((question, index) => (
        <div
          key={question.id}
          className={cn(
            "space-y-2 rounded-lg border p-4",
            question.correcte ? "border-success/40" : "border-destructive/40",
          )}
        >
          <p className="text-body-sm font-medium text-muted-foreground">
            {ELEVE_FR.test.question} {index + 1}
          </p>
          <div>{question.enonce}</div>
          <ul className="flex flex-col gap-1 text-body-sm">
            {question.options.map((option) => (
              <li
                key={option.id}
                className={cn(
                  option.estCorrecte
                    ? "font-medium text-success"
                    : option.id === question.optionChoisieId
                      ? "font-medium text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {option.estCorrecte ? "✓ " : option.id === question.optionChoisieId ? "✗ " : "· "}
                {option.libelle}
                {option.id === question.optionChoisieId && ` (${ELEVE_FR.test.tonChoix})`}
              </li>
            ))}
          </ul>
          {question.explication && (
            <div className="border-t pt-2 text-body-sm">
              <p className="font-medium text-muted-foreground">{ELEVE_FR.test.explication}</p>
              {question.explication}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
