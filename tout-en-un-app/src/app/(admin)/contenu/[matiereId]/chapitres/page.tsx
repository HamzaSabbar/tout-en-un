import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenirMatiere } from "@/modules/contenu/matiere";
import { listerChapitres } from "@/modules/contenu/chapitre";
import {
  deplacerChapitreAction,
  depublierChapitreAction,
  publierChapitreAction,
} from "@/modules/contenu/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreerChapitreForm } from "./creer-chapitre-form";
import { requirePermission } from "@/modules/acces/require-auth";

export default async function ChapitresPage({
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

  const chapitres = await listerChapitres(matiere.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/contenu/matieres" className="text-sm text-muted-foreground hover:underline">
          ← Matières
        </Link>
        <h1 className="text-2xl font-semibold">{matiere.libelle}</h1>
      </div>
      <CreerChapitreForm matiereId={matiereId} />
      <ul className="flex flex-col gap-3">
        {chapitres.map((chapitre, index) => (
          <li
            key={chapitre.id.toString()}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <Link
              href={`/contenu/${matiereId}/chapitres/${chapitre.id}`}
              className="font-medium hover:underline"
            >
              {chapitre.libelle}
            </Link>
            <div className="flex items-center gap-2">
              <Badge variant={chapitre.statut === "publie" ? "default" : "secondary"}>
                {chapitre.statut}
              </Badge>
              <form action={deplacerChapitreAction}>
                <input type="hidden" name="matiere_id" value={matiereId} />
                <input type="hidden" name="chapitre_id" value={chapitre.id.toString()} />
                <input type="hidden" name="direction" value="monter" />
                <Button type="submit" size="sm" variant="ghost" disabled={index === 0}>
                  ↑
                </Button>
              </form>
              <form action={deplacerChapitreAction}>
                <input type="hidden" name="matiere_id" value={matiereId} />
                <input type="hidden" name="chapitre_id" value={chapitre.id.toString()} />
                <input type="hidden" name="direction" value="descendre" />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  disabled={index === chapitres.length - 1}
                >
                  ↓
                </Button>
              </form>
              {chapitre.statut === "brouillon" ? (
                <form action={publierChapitreAction}>
                  <input type="hidden" name="matiere_id" value={matiere.id.toString()} />
                  <input type="hidden" name="chapitre_id" value={chapitre.id.toString()} />
                  <Button type="submit" size="sm">
                    Publier
                  </Button>
                </form>
              ) : (
                <form action={depublierChapitreAction}>
                  <input type="hidden" name="matiere_id" value={matiere.id.toString()} />
                  <input type="hidden" name="chapitre_id" value={chapitre.id.toString()} />
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
