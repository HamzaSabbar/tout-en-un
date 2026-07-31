import { listerFilieresAvecMatieres } from "@/modules/contenu/filiere";
import { listerMatieres } from "@/modules/contenu/matiere";
import { associerMatiereAction, dissocierMatiereAction } from "@/modules/contenu/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreerFiliereForm } from "./creer-filiere-form";
import { requirePermission } from "@/modules/acces/require-auth";

export default async function FilieresPage() {
  await requirePermission("contenu:gerer");
  const [filieres, matieres] = await Promise.all([
    listerFilieresAvecMatieres(),
    listerMatieres(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Filières</h1>
      <CreerFiliereForm />
      <div className="flex flex-col gap-4">
        {filieres.map((filiere) => {
          const matieresAssociees = new Set(
            filiere.matieres.map((liaison) => liaison.matiere.id.toString()),
          );

          return (
            <Card key={filiere.id.toString()}>
              <CardHeader>
                <CardTitle>
                  {filiere.libelle} <span className="text-muted-foreground">({filiere.code})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {filiere.matieres.map((liaison) => (
                    <form key={liaison.matiere.id.toString()} action={dissocierMatiereAction}>
                      <input type="hidden" name="filiere_id" value={filiere.id.toString()} />
                      <input
                        type="hidden"
                        name="matiere_id"
                        value={liaison.matiere.id.toString()}
                      />
                      <Button type="submit" variant="secondary" size="sm" className="gap-1">
                        <Badge variant="outline">{liaison.matiere.libelle}</Badge>
                        <span aria-hidden>×</span>
                      </Button>
                    </form>
                  ))}
                  {filiere.matieres.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucune matière associée.</p>
                  )}
                </div>
                <form action={associerMatiereAction} className="flex items-center gap-2">
                  <input type="hidden" name="filiere_id" value={filiere.id.toString()} />
                  <select
                    name="matiere_id"
                    required
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="">Associer une matière…</option>
                    {matieres
                      .filter((matiere) => !matieresAssociees.has(matiere.id.toString()))
                      .map((matiere) => (
                        <option key={matiere.id.toString()} value={matiere.id.toString()}>
                          {matiere.libelle}
                        </option>
                      ))}
                  </select>
                  <Button type="submit" size="sm" variant="outline">
                    Associer
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
