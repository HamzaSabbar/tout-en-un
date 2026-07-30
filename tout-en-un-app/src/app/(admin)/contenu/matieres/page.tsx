import Link from "next/link";
import { listerMatieres } from "@/modules/contenu/matiere";
import { depublierMatiereAction, publierMatiereAction } from "@/modules/contenu/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreerMatiereForm } from "./creer-matiere-form";

export default async function MatieresPage() {
  const matieres = await listerMatieres();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Matières</h1>
      <CreerMatiereForm />
      <ul className="flex flex-col gap-3">
        {matieres.map((matiere) => (
          <li
            key={matiere.id.toString()}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <Link
                href={`/contenu/${matiere.id}/chapitres`}
                className="font-medium hover:underline"
              >
                {matiere.libelle}
              </Link>
              <p className="text-sm text-muted-foreground">{matiere.code}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={matiere.statut === "publie" ? "default" : "secondary"}>
                {matiere.statut}
              </Badge>
              {matiere.statut === "brouillon" ? (
                <form action={publierMatiereAction}>
                  <input type="hidden" name="matiere_id" value={matiere.id.toString()} />
                  <Button type="submit" size="sm">
                    Publier
                  </Button>
                </form>
              ) : (
                <form action={depublierMatiereAction}>
                  <input type="hidden" name="matiere_id" value={matiere.id.toString()} />
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
