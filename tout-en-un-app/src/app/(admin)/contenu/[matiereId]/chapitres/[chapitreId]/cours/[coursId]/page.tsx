import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenirCours } from "@/modules/contenu/cours";
import { listerVideos } from "@/modules/contenu/video";
import { listerDocumentsCours } from "@/modules/contenu/document";
import { depublierVideoAction, publierVideoAction } from "@/modules/contenu/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreerVideoForm } from "./creer-video-form";
import { TeleverserDocumentForm } from "./televerser-document-form";
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

  const [videos, documents] = await Promise.all([
    listerVideos(cours.id),
    listerDocumentsCours(cours.id),
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
                </p>
              </div>
              <Badge variant={document.statut === "publie" ? "default" : "secondary"}>
                {document.statut}
              </Badge>
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
    </div>
  );
}
