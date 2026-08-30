import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenirMatiere } from "@/modules/contenu/matiere";
import { listerChapitres } from "@/modules/contenu/chapitre";
import { listerParties } from "@/modules/contenu/partie";
import {
  deplacerChapitreAction,
  deplacerPartieAction,
  depublierChapitreAction,
  depublierPartieAction,
  publierChapitreAction,
  publierPartieAction,
} from "@/modules/contenu/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreerChapitreForm } from "./creer-chapitre-form";
import { CreerPartieForm } from "./creer-partie-form";
import { requirePermission } from "@/modules/acces/require-auth";

type Chapitre = Awaited<ReturnType<typeof listerChapitres>>[number];

function ListeChapitres({
  chapitres,
  matiereId,
}: {
  chapitres: Chapitre[];
  matiereId: string;
}) {
  return (
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
                <input type="hidden" name="matiere_id" value={matiereId} />
                <input type="hidden" name="chapitre_id" value={chapitre.id.toString()} />
                <Button type="submit" size="sm">
                  Publier
                </Button>
              </form>
            ) : (
              <form action={depublierChapitreAction}>
                <input type="hidden" name="matiere_id" value={matiereId} />
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
  );
}

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

  const [chapitres, parties] = await Promise.all([
    listerChapitres(matiere.id),
    listerParties(matiere.id),
  ]);

  const chapitresSansPartie = chapitres.filter((chapitre) => chapitre.partie_id === null);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/contenu/matieres" className="text-sm text-muted-foreground hover:underline">
          ← Matières
        </Link>
        <h1 className="text-2xl font-semibold">{matiere.libelle}</h1>
      </div>

      {/* Certaines matières (Physique-Chimie) regroupent leurs chapitres par
          partie (Physique / Chimie) ; d'autres (Mathématiques) n'en ont aucune
          et gardent l'affichage plat ci-dessous, inchangé. */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Parties</h2>
        {parties.length > 0 && (
          <ul className="flex flex-col gap-3">
            {parties.map((partie, index) => (
              <li
                key={partie.id.toString()}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <span className="font-medium">{partie.libelle}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={partie.statut === "publie" ? "default" : "secondary"}>
                    {partie.statut}
                  </Badge>
                  <form action={deplacerPartieAction}>
                    <input type="hidden" name="matiere_id" value={matiereId} />
                    <input type="hidden" name="partie_id" value={partie.id.toString()} />
                    <input type="hidden" name="direction" value="monter" />
                    <Button type="submit" size="sm" variant="ghost" disabled={index === 0}>
                      ↑
                    </Button>
                  </form>
                  <form action={deplacerPartieAction}>
                    <input type="hidden" name="matiere_id" value={matiereId} />
                    <input type="hidden" name="partie_id" value={partie.id.toString()} />
                    <input type="hidden" name="direction" value="descendre" />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      disabled={index === parties.length - 1}
                    >
                      ↓
                    </Button>
                  </form>
                  {partie.statut === "brouillon" ? (
                    <form action={publierPartieAction}>
                      <input type="hidden" name="matiere_id" value={matiereId} />
                      <input type="hidden" name="partie_id" value={partie.id.toString()} />
                      <Button type="submit" size="sm">
                        Publier
                      </Button>
                    </form>
                  ) : (
                    <form action={depublierPartieAction}>
                      <input type="hidden" name="matiere_id" value={matiereId} />
                      <input type="hidden" name="partie_id" value={partie.id.toString()} />
                      <Button type="submit" size="sm" variant="outline">
                        Dépublier
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <CreerPartieForm matiereId={matiereId} />
      </section>

      <CreerChapitreForm
        matiereId={matiereId}
        parties={parties.map((partie) => ({ id: partie.id.toString(), libelle: partie.libelle }))}
      />

      {parties.length === 0 ? (
        <ListeChapitres chapitres={chapitres} matiereId={matiereId} />
      ) : (
        <div className="flex flex-col gap-8">
          {parties.map((partie) => (
            <section key={partie.id.toString()} className="flex flex-col gap-3">
              <h2 className="text-lg font-medium">{partie.libelle}</h2>
              <ListeChapitres
                chapitres={chapitres.filter((chapitre) => chapitre.partie_id === partie.id)}
                matiereId={matiereId}
              />
            </section>
          ))}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Sans partie</h2>
            <ListeChapitres chapitres={chapitresSansPartie} matiereId={matiereId} />
          </section>
        </div>
      )}
    </div>
  );
}
