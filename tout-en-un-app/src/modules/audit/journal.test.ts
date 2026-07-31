import { describe, expect, it, vi, beforeEach } from "vitest";

const create = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    journalAdmin: {
      create: (...args: unknown[]) => create(...args),
    },
  },
}));

import { consignerAction } from "@/modules/audit/journal";

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue(undefined);
});

describe("consignerAction", () => {
  it("écrit la ligne de journal avec son avant et son après", async () => {
    await consignerAction({
      utilisateurId: BigInt(9),
      action: "activation",
      entite: "abonnement_matiere",
      entiteId: BigInt(4),
      avant: { statut: "en_attente" },
      apres: { statut: "actif" },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        utilisateur_id: BigInt(9),
        action: "activation",
        entite: "abonnement_matiere",
        entite_id: BigInt(4),
        avant: { statut: "en_attente" },
        apres: { statut: "actif" },
      },
    });
  });

  it("utilise le client de transaction fourni plutôt que le client global", async () => {
    const createTransaction = vi.fn().mockResolvedValue(undefined);
    const client = { journalAdmin: { create: createTransaction } };

    await consignerAction(
      {
        utilisateurId: BigInt(1),
        action: "refus",
        entite: "demande_matiere",
        entiteId: BigInt(2),
      },
      client as never,
    );

    expect(createTransaction).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
  });
});
