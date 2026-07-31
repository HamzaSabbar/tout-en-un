import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";

export type ActionAdmin =
  | "activation"
  | "modification"
  | "refus"
  | "annulation"
  | "suppression";

export interface ActionAConsigner {
  utilisateurId: bigint;
  action: ActionAdmin;
  entite: string;
  entiteId: bigint;
  avant?: Prisma.InputJsonValue;
  apres?: Prisma.InputJsonValue;
}

// Passer le client de transaction quand la mutation tracée en ouvre une : la
// trace est alors validée avec la mutation, et un échec ne peut pas produire
// une activation sans journal.
export async function consignerAction(
  action: ActionAConsigner,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await client.journalAdmin.create({
    data: {
      utilisateur_id: action.utilisateurId,
      action: action.action,
      entite: action.entite,
      entite_id: action.entiteId,
      avant: action.avant,
      apres: action.apres,
    },
  });
}
