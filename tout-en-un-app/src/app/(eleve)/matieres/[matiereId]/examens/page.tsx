import Link from "next/link";
import { notFound } from "next/navigation";
import { Award } from "lucide-react";
import { AccesRefuse } from "@/components/acces-refuse";
import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { EtatVide } from "@/components/eleve/etat-vide";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";
import { analyserIdentifiant } from "@/lib/identifiant";
import { obtenirFiliereEleve, verifierAccesMatiere } from "@/modules/acces/acces-matiere";
import { requireAuth } from "@/modules/acces/require-auth";
import { obtenirExamensNationauxEnCache, obtenirPageMatiereEnCache } from "@/modules/parcours-eleve/cache";

interface ExamensPageProps {
  params: Promise<{ matiereId: string }>;
}

export default async function ExamensNationauxPage({ params }: ExamensPageProps) {
  const utilisateur = await requireAuth();
  const { matiereId } = await params;
  const id = analyserIdentifiant(matiereId);
  if (id === null) notFound();

  const utilisateurId = BigInt(utilisateur.id);
  const acces = await verifierAccesMatiere(utilisateurId, id);
  if (!acces.autorise) {
    return <AccesRefuse motif={acces.motif as Exclude<typeof acces.motif, "ok">} />;
  }

  const matiere = await obtenirPageMatiereEnCache(id);
  if (!matiere) notFound();

  // Dérivée du profil de l'élève, jamais de l'URL : c'est ce qui borne la
  // visibilité d'un examen à la bonne filière (voir la décision de conception
  // du lot 5, `docs/architecture.md` 5.3).
  const filiere = await obtenirFiliereEleve(utilisateurId);
  const examens = filiere ? await obtenirExamensNationauxEnCache(id, filiere.id) : [];

  return (
    <div className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-8 py-8`}>
      <Link
        href={`/matieres/${id}`}
        className="inline-flex min-h-11 w-fit items-center text-sm font-medium hover:underline"
      >
        {ELEVE_FR.examensNationaux.retourMatiere}
      </Link>

      <header className="relative overflow-hidden rounded-2xl bg-secondary p-6 sm:p-8">
        <Award
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 size-40 text-primary/10"
        />
        <h1 className="relative text-h1 font-bold tracking-tight text-secondary-foreground">
          {matiere.libelle} · {ELEVE_FR.examensNationaux.titre}
        </h1>
      </header>

      {examens.length === 0 ? (
        <EtatVide icone={Award} titre={ELEVE_FR.examensNationaux.vide} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {examens.map((examen) => (
            <li key={examen.id.toString()}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {examen.annee} · {examen.session === "normale" ? "Session normale" : "Rattrapage"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {examen.sujet_document_id && (
                    <a
                      href={`/api/matieres/${id}/nationaux/examens/${examen.id}/sujet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", className: "h-9" })}
                    >
                      {ELEVE_FR.examensNationaux.sujet}
                    </a>
                  )}
                  {examen.correction_document_id && (
                    <a
                      href={`/api/matieres/${id}/nationaux/examens/${examen.id}/correction`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", className: "h-9" })}
                    >
                      {ELEVE_FR.examensNationaux.correction}
                    </a>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
