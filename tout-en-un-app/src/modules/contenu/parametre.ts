import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Resultat } from "@/lib/resultat";

// Ligne unique (id fixe) : la date du prochain national. `upsert` plutôt que
// `create`/`update` séparés, l'admin ne connaît jamais l'id de la ligne — il
// n'y en a qu'une.
const ID_UNIQUE = BigInt(1);

export const definirDateExamenNationalSchema = z.object({
  date: z.coerce.date(),
  libelle: z.string().trim().min(1).max(150),
});
export type DefinirDateExamenNationalInput = z.infer<typeof definirDateExamenNationalSchema>;

export async function definirDateExamenNational(input: unknown): Promise<Resultat> {
  const donnees = definirDateExamenNationalSchema.safeParse(input);
  if (!donnees.success) {
    return { succes: false, erreur: "Formulaire invalide." };
  }

  await prisma.dateExamenNational.upsert({
    where: { id: ID_UNIQUE },
    create: { id: ID_UNIQUE, ...donnees.data },
    update: donnees.data,
  });
  return { succes: true, id: ID_UNIQUE.toString() };
}

export function obtenirDateExamenNational() {
  return prisma.dateExamenNational.findUnique({ where: { id: ID_UNIQUE } });
}
