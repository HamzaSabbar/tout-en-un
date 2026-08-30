import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenirCours } from "@/modules/contenu/cours";
import { listerVideos } from "@/modules/contenu/video";
import { listerDocumentsCours } from "@/modules/contenu/document";
import { listerExercices } from "@/modules/exercice/service";
import { listerExtraitsNationaux } from "@/modules/contenu/extrait-national";
import {
  depublierDocumentAction,
  depublierExerciceAction,
  depublierExtraitNationalAction,
  depublierVideoAction,
  publierDocumentAction,
  publierExerciceAction,
  publierExtraitNationalAction,
  publierVideoAction,
} from "@/modules/contenu/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreerVideoForm } from "./creer-video-form";
import { TeleverserDocumentForm } from "./televerser-document-form";
import { CreerExerciceForm } from "./creer-exercice-form";
import { CreerExtraitNationalForm } from "./creer-extrait-national-form";
import { requirePermission } from "@/modules/acces/require-auth";

export default async function CoursDetailPage({
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

  const [videos, documents, exercices, extraitsNationaux] = await Promise.all([
    listerVideos(cours.id),
    listerDocumentsCours(cours.id),
    listerExercices(cours.id),
    listerExtraitsNationaux(cours.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/contenu/${matiereId}/chapitres/${chapitreId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Cours
        </Link>
        <h1 className="text-2xl font-semibold">{cours.titre}</h1>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Vidéos</h2>
        <ul className="flex flex-col gap-3">
          {videos.map((video) => (
            <li
              key={video.id.toString()}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{video.titre}</p>
                <p className="text-sm text-muted-foreground">
                  {video.fournisseur} · {video.video_ref}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={video.statut === "publie" ? "default" : "secondary"}>
                  {video.statut}
                </Badge>
                {video.statut === "brouillon" ? (
                  <form action={publierVideoAction}>
                    <input type="hidden" name="matiere_id" value={matiereId} />
                    <input type="hidden" name="chapitre_id" value={chapitreId} />
                    <input type="hidden" name="cours_id" value={coursId} />
                    <input type="hidden" name="video_id" value={video.id.toString()} />
                    <Button type="submit" size="sm">
                      Publier
                    </Button>
                  </form>
                ) : (
                  <form action={depublierVideoAction}>
                    <input type="hidden" name="matiere_id" value={matiereId} />
                    <input type="hidden" name="chapitre_id" value={chapitreId} />
                    <input type="hidden" name="cours_id" value={coursId} />
                    <input type="hidden" name="video_id" value={video.id.toString()} />
                    <Button type="submit" size="sm" variant="outline">
                      Dépublier
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
          {videos.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune vidéo pour l&apos;instant.</p>
          )}
        </ul>
        <CreerVideoForm coursId={coursId} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Documents</h2>
        <ul className="flex flex-col gap-3">
          {documents.map((document) => (
            <li
              key={document.id.toString()}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{document.titre}</p>
                <p className="text-sm text-muted-foreground">
                  {document.type} · {document.fichier.nom}
                  {/* L'identifiant n'est affiché que pour une image : c'est lui
                      que le professeur recopie dans un nœud `image` du contenu
                      riche, le contenu ne portant jamais d'URL. */}
                  {document.type === "image_exercice" &&
                    ` · fichier_id ${document.fichier.id.toString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={document.statut === "publie" ? "default" : "secondary"}>
                  {document.statut}
                </Badge>
                {document.statut === "brouillon" ? (
                  <form action={publierDocumentAction}>
                    <input type="hidden" name="matiere_id" value={matiereId} />
                    <input type="hidden" name="chapitre_id" value={chapitreId} />
                    <input type="hidden" name="cours_id" value={coursId} />
                    <input type="hidden" name="document_id" value={document.id.toString()} />
                    <Button type="submit" size="sm">
                      Publier
                    </Button>
                  </form>
                ) : (
                  <form action={depublierDocumentAction}>
                    <input type="hidden" name="matiere_id" value={matiereId} />
                    <input type="hidden" name="chapitre_id" value={chapitreId} />
                    <input type="hidden" name="cours_id" value={coursId} />
                    <input type="hidden" name="document_id" value={document.id.toString()} />
                    <Button type="submit" size="sm" variant="outline">
                      Dépublier
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
          {documents.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun document pour l&apos;instant.</p>
          )}
        </ul>
        <TeleverserDocumentForm
          matiereId={matiereId}
          chapitreId={chapitreId}
          coursId={coursId}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Exercices</h2>
        <ul className="flex flex-col gap-3">
          {exercices.map((exercice) => (
            <li
              key={exercice.id.toString()}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{exercice.titre}</p>
                <p className="text-sm text-muted-foreground">
                  Difficulté {exercice.difficulte}
                  {exercice.aide ? " · aide" : ""}
                  {exercice.correction_texte ? " · correction écrite" : ""}
                  {exercice.correction_video_ref ? " · correction vidéo" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={exercice.statut === "publie" ? "default" : "secondary"}>
                  {exercice.statut}
                </Badge>
                {exercice.statut === "brouillon" ? (
                  <form action={publierExerciceAction}>
                    <input type="hidden" name="matiere_id" value={matiereId} />
                    <input type="hidden" name="chapitre_id" value={chapitreId} />
                    <input type="hidden" name="cours_id" value={coursId} />
                    <input type="hidden" name="exercice_id" value={exercice.id.toString()} />
                    <Button type="submit" size="sm">
                      Publier
                    </Button>
                  </form>
                ) : (
                  <form action={depublierExerciceAction}>
                    <input type="hidden" name="matiere_id" value={matiereId} />
                    <input type="hidden" name="chapitre_id" value={chapitreId} />
                    <input type="hidden" name="cours_id" value={coursId} />
                    <input type="hidden" name="exercice_id" value={exercice.id.toString()} />
                    <Button type="submit" size="sm" variant="outline">
                      Dépublier
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
          {exercices.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun exercice pour l&apos;instant.</p>
          )}
        </ul>
        <CreerExerciceForm
          matiereId={matiereId}
          chapitreId={chapitreId}
          coursId={coursId}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Extraits nationaux</h2>
        <ul className="flex flex-col gap-3">
          {extraitsNationaux.map((extrait) => (
            <li
              key={extrait.id.toString()}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">
                  {extrait.annee} · {extrait.session}
                </p>
                <p className="text-sm text-muted-foreground">
                  {extrait.enonce}
                  {extrait.correction_document ? " · correction PDF" : ""}
                  {extrait.correction_video_ref ? " · correction vidéo" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={extrait.statut === "publie" ? "default" : "secondary"}>
                  {extrait.statut}
                </Badge>
                {extrait.statut === "brouillon" ? (
                  <form action={publierExtraitNationalAction}>
                    <input type="hidden" name="matiere_id" value={matiereId} />
                    <input type="hidden" name="chapitre_id" value={chapitreId} />
                    <input type="hidden" name="cours_id" value={coursId} />
                    <input type="hidden" name="extrait_id" value={extrait.id.toString()} />
                    <Button type="submit" size="sm">
                      Publier
                    </Button>
                  </form>
                ) : (
                  <form action={depublierExtraitNationalAction}>
                    <input type="hidden" name="matiere_id" value={matiereId} />
                    <input type="hidden" name="chapitre_id" value={chapitreId} />
                    <input type="hidden" name="cours_id" value={coursId} />
                    <input type="hidden" name="extrait_id" value={extrait.id.toString()} />
                    <Button type="submit" size="sm" variant="outline">
                      Dépublier
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
          {extraitsNationaux.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun extrait national pour l&apos;instant.</p>
          )}
        </ul>
        <CreerExtraitNationalForm
          matiereId={matiereId}
          chapitreId={chapitreId}
          coursId={coursId}
        />
      </section>
    </div>
  );
}
