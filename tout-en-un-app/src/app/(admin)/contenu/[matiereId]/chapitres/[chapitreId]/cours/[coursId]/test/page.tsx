import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenirCours } from "@/modules/contenu/cours";
import { analyserDocumentRiche } from "@/modules/exercice/document-riche";
import { listerQuestionsTest, obtenirTestAdmin } from "@/modules/test/service";
import {
  deplacerQuestionTestAction,
  depublierTestAction,
  publierTestAction,
  supprimerQuestionTestAction,
} from "@/modules/contenu/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/modules/acces/require-auth";
import { CreerTestForm } from "./creer-test-form";
import { CreerQuestionTestForm } from "./creer-question-test-form";

// Étiquette lisible d'une question dans la liste d'admin : le premier
// paragraphe de l'énoncé, tronqué. Une vraie prévisualisation existe déjà
// pour le formulaire de saisie (`ApercuContenuRiche`) ; ici il ne s'agit que
// d'identifier une question dans une liste, pas de la relire.
function etiquetteQuestion(enonceJson: unknown): string {
  const document = analyserDocumentRiche(enonceJson);
  const premierParagraphe = document?.noeuds.find((noeud) => noeud.type === "paragraphe");
  const texte = premierParagraphe?.texte ?? "Question sans énoncé lisible";
  return texte.length > 140 ? `${texte.slice(0, 140)}…` : texte;
}

export default async function TestPage({
  params,
}: {
  params: Promise<{ matiereId: string; chapitreId: string; coursId: string }>;
}) {
  await requirePermission("contenu:gerer");
  const { matiereId, chapitreId, coursId } = await params;
  const cours = await obtenirCours(BigInt(coursId));
  if (!cours) {
    notFound();
  }

  const test = await obtenirTestAdmin(cours.id);
  const questions = test ? await listerQuestionsTest(test.id) : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/contenu/${matiereId}/chapitres/${chapitreId}/cours/${coursId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {cours.titre}
        </Link>
        <h1 className="text-2xl font-semibold">Test de fin de cours</h1>
      </div>

      {!test ? (
        <CreerTestForm matiereId={matiereId} chapitreId={chapitreId} coursId={coursId} />
      ) : (
        <>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{test.titre}</p>
              <p className="text-sm text-muted-foreground">
                {test.duree_minutes} min · seuil de validation {test.seuil_validation} % ·{" "}
                {questions.length} question{questions.length > 1 ? "s" : ""}
              </p>
              {test.consigne && <p className="mt-1 text-sm">{test.consigne}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={test.statut === "publie" ? "default" : "secondary"}>
                {test.statut}
              </Badge>
              {test.statut === "brouillon" ? (
                <form action={publierTestAction}>
                  <input type="hidden" name="matiere_id" value={matiereId} />
                  <input type="hidden" name="chapitre_id" value={chapitreId} />
                  <input type="hidden" name="cours_id" value={coursId} />
                  <input type="hidden" name="test_id" value={test.id.toString()} />
                  <Button type="submit" size="sm">
                    Publier
                  </Button>
                </form>
              ) : (
                <form action={depublierTestAction}>
                  <input type="hidden" name="matiere_id" value={matiereId} />
                  <input type="hidden" name="chapitre_id" value={chapitreId} />
                  <input type="hidden" name="cours_id" value={coursId} />
                  <input type="hidden" name="test_id" value={test.id.toString()} />
                  <Button type="submit" size="sm" variant="outline">
                    Dépublier
                  </Button>
                </form>
              )}
            </div>
          </div>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Questions</h2>
            <ul className="flex flex-col gap-3">
              {questions.map((question, index) => (
                <li key={question.id.toString()} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{etiquetteQuestion(question.enonce)}</p>
                      <p className="text-sm text-muted-foreground">
                        {question.type} · {question.points} point{question.points > 1 ? "s" : ""}
                      </p>
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {question.options.map((option) => (
                          <li
                            key={option.id.toString()}
                            className={option.est_correcte ? "font-medium text-primary" : "text-sm"}
                          >
                            {option.est_correcte ? "✓ " : "· "}
                            {option.libelle}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <form action={deplacerQuestionTestAction}>
                        <input type="hidden" name="matiere_id" value={matiereId} />
                        <input type="hidden" name="chapitre_id" value={chapitreId} />
                        <input type="hidden" name="cours_id" value={coursId} />
                        <input type="hidden" name="test_id" value={test.id.toString()} />
                        <input type="hidden" name="question_id" value={question.id.toString()} />
                        <input type="hidden" name="direction" value="monter" />
                        <Button type="submit" size="sm" variant="ghost" disabled={index === 0}>
                          ↑
                        </Button>
                      </form>
                      <form action={deplacerQuestionTestAction}>
                        <input type="hidden" name="matiere_id" value={matiereId} />
                        <input type="hidden" name="chapitre_id" value={chapitreId} />
                        <input type="hidden" name="cours_id" value={coursId} />
                        <input type="hidden" name="test_id" value={test.id.toString()} />
                        <input type="hidden" name="question_id" value={question.id.toString()} />
                        <input type="hidden" name="direction" value="descendre" />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          disabled={index === questions.length - 1}
                        >
                          ↓
                        </Button>
                      </form>
                      <form action={supprimerQuestionTestAction}>
                        <input type="hidden" name="matiere_id" value={matiereId} />
                        <input type="hidden" name="chapitre_id" value={chapitreId} />
                        <input type="hidden" name="cours_id" value={coursId} />
                        <input type="hidden" name="question_id" value={question.id.toString()} />
                        <Button type="submit" size="sm" variant="outline">
                          Supprimer
                        </Button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
              {questions.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune question pour l&apos;instant.</p>
              )}
            </ul>
            <CreerQuestionTestForm
              matiereId={matiereId}
              chapitreId={chapitreId}
              coursId={coursId}
              testId={test.id.toString()}
            />
          </section>
        </>
      )}
    </div>
  );
}
