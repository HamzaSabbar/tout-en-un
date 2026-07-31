import { listerFilieresActives } from "@/modules/contenu/filiere";
import { InscriptionForm } from "@/app/(public)/inscription/inscription-form";

// La liste des filières vient de la base : sans ceci, Next prérend la page au
// build et une filière ajoutée ensuite n'apparaît jamais dans le formulaire.
export const dynamic = "force-dynamic";

export default async function InscriptionPage() {
  const filieres = await listerFilieresActives();
  const options = filieres.map((filiere) => ({
    id: filiere.id.toString(),
    libelle: filiere.libelle,
  }));

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <InscriptionForm filieres={options} />
    </div>
  );
}
