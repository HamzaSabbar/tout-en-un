import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenirMatiere } from "@/modules/contenu/matiere";
import { listerFilieresActives } from "@/modules/contenu/filiere";
import { listerExamensNationaux } from "@/modules/contenu/examen-national";
import {
  depublierExamenNationalAction,
  publierExamenNationalAction,
} from "@/modules/contenu/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/modules/acces/require-auth";
import { CreerExamenNationalForm } from "./creer-examen-national-form";

export default async function ExamensNationauxPage({
  params,
}: {
  params: Promise<{ matiereId: string }>;
}) {
  await requirePermission("contenu:gerer");
  const { matiereId } = await params;
  const matiere = await obtenirMatiere(BigInt(matiereId));
  if (!matiere) {
    notFound();
  }

  const [filieres, examens] = await Promise.all([
    listerFilieresActives(),
    listerExamensNationaux(matiere.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/contenu/${matiereId}/chapitres`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {matiere.libelle}
        </Link>
        <h1 className="text-2xl font-semibold">Examens nationaux</h1>
      </div>

      <ul className="flex flex-col gap-3">
        {examens.map((examen) => (
          <li
            key={examen.id.toString()}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">
                {examen.annee} · {examen.session} · {examen.filiere.libelle}
              </p>
              <p className="text-sm text-muted-foreground">
                {examen.sujet_document ? "sujet PDF" : "sans sujet"}
                {examen.correction_document ? " · correction PDF" : ""}
                {examen.correction_video_ref ? " · correction vidéo" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={examen.statut === "publie" ? "default" : "secondary"}>
                {examen.statut}
              </Badge>
              {examen.statut === "brouillon" ? (
                <form action={publierExamenNationalAction}>
                  <input type="hidden" name="matiere_id" value={matiereId} />
                  <input type="hidden" name="examen_id" value={examen.id.toString()} />
                  <Button type="submit" size="sm">
                    Publier
                  </Button>
                </form>
              ) : (
                <form action={depublierExamenNationalAction}>
                  <input type="hidden" name="matiere_id" value={matiereId} />
                  <input type="hidden" name="examen_id" value={examen.id.toString()} />
                  <Button type="submit" size="sm" variant="outline">
                    Dépublier
                  </Button>
                </form>
              )}
            </div>
          </li>
        ))}
        {examens.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun examen national pour l&apos;instant.</p>
        )}
      </ul>

      <CreerExamenNationalForm matiereId={matiereId} filieres={filieres} />
    </div>
  );
}
