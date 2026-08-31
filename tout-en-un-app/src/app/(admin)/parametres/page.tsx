import { obtenirDateExamenNational } from "@/modules/contenu/parametre";
import { requirePermission } from "@/modules/acces/require-auth";
import { DefinirDateNationaleForm } from "./definir-date-nationale-form";

export default async function ParametresPage() {
  await requirePermission("contenu:gerer");
  const parametre = await obtenirDateExamenNational();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Paramètres</h1>
      <DefinirDateNationaleForm
        date={parametre ? parametre.date.toISOString().slice(0, 10) : null}
        libelle={parametre?.libelle ?? null}
      />
    </div>
  );
}
