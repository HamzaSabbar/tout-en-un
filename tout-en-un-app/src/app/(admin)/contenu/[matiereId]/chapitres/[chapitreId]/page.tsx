import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenirChapitre } from "@/modules/contenu/chapitre";
import { listerCours } from "@/modules/contenu/cours";
import {
  deplacerCoursAction,
  depublierCoursAction,
  dupliquerCoursAction,
  publierCoursAction,
} from "@/modules/contenu/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreerCoursForm } from "./creer-cours-form";

export default async function CoursListePage({
  params,
}: {
  params: Promise<{ matiereId: string; chapitreId: string }>;
}) {
  const { matiereId, chapitreId } = await params;
  const chapitre = await obtenirChapitre(BigInt(chapitreId));
  if (!chapitre) {
    notFound();
  }

  const cours = await listerCours(chapitre.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/contenu/${matiereId}/chapitres`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Chapitres
        </Link>
        <h1 className="text-2xl font-semibold">{chapitre.libelle}</h1>
      </div>
      <CreerCoursForm chapitreId={chapitreId} />
      <ul className="flex flex-col gap-3">
        {cours.map((unCours, index) => (
          <li
            key={unCours.id.toString()}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <Link
              href={`/contenu/${matiereId}/chapitres/${chapitreId}/cours/${unCours.id}`}
              className="font-medium hover:underline"
            >
              {unCours.titre}
            </Link>
            <div className="flex items-center gap-2">
              <Badge variant={unCours.statut === "publie" ? "default" : "secondary"}>
                {unCours.statut}
              </Badge>
              <form action={deplacerCoursAction}>
                <input type="hidden" name="chapitre_id" value={chapitreId} />
                <input type="hidden" name="cours_id" value={unCours.id.toString()} />
                <input type="hidden" name="direction" value="monter" />
                <Button type="submit" size="sm" variant="ghost" disabled={index === 0}>
                  ↑
                </Button>
              </form>
              <form action={deplacerCoursAction}>
                <input type="hidden" name="chapitre_id" value={chapitreId} />
                <input type="hidden" name="cours_id" value={unCours.id.toString()} />
                <input type="hidden" name="direction" value="descendre" />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  disabled={index === cours.length - 1}
                >
                  ↓
                </Button>
              </form>
              <form action={dupliquerCoursAction}>
                <input type="hidden" name="cours_id" value={unCours.id.toString()} />
                <Button type="submit" size="sm" variant="outline">
                  Dupliquer
                </Button>
              </form>
              {unCours.statut === "brouillon" ? (
                <form action={publierCoursAction}>
                  <input type="hidden" name="cours_id" value={unCours.id.toString()} />
                  <Button type="submit" size="sm">
                    Publier
                  </Button>
                </form>
              ) : (
                <form action={depublierCoursAction}>
                  <input type="hidden" name="cours_id" value={unCours.id.toString()} />
                  <Button type="submit" size="sm" variant="outline">
                    Dépublier
                  </Button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
