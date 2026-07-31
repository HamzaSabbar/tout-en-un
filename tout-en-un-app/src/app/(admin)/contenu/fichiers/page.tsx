import { listerMediatheque } from "@/modules/contenu/document";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RemplacerFichierForm } from "./remplacer-fichier-form";
import { requirePermission } from "@/modules/acces/require-auth";

export default async function MediathequePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission("contenu:gerer");
  const { q } = await searchParams;
  const fichiers = await listerMediatheque(q);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Médiathèque</h1>
      <form method="get">
        <Input name="q" defaultValue={q} placeholder="Rechercher un fichier…" />
      </form>
      <div className="flex flex-col gap-3">
        {fichiers.map((fichier) => (
          <Card key={fichier.id.toString()}>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{fichier.nom}</p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(fichier.taille / 1024)} Ko
                </p>
              </div>
              <RemplacerFichierForm fichierId={fichier.id.toString()} />
            </CardContent>
          </Card>
        ))}
        {fichiers.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun fichier trouvé.</p>
        )}
      </div>
    </div>
  );
}
