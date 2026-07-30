import { describe, expect, it, vi, beforeEach } from "vitest";

const create = vi.fn();
const update = vi.fn();
const findMany = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    chapitre: {
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
      findMany: (...args: unknown[]) => findMany(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

import {
  creerChapitre,
  depublierChapitre,
  listerChapitres,
  modifierChapitre,
  publierChapitre,
  reordonnerChapitres,
  supprimerChapitre,
} from "@/modules/contenu/chapitre";

beforeEach(() => {
  create.mockReset();
  update.mockReset();
  findMany.mockReset();
  transaction.mockReset();
  transaction.mockResolvedValue(undefined);
});

describe("creerChapitre", () => {
  it("refuse un formulaire invalide", async () => {
    const resultat = await creerChapitre({ matiere_id: "1", libelle: "" });
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("crée un chapitre valide", async () => {
    create.mockResolvedValue({ id: BigInt(1) });
    const resultat = await creerChapitre({ matiere_id: "1", libelle: "Mécanique" });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });
});

describe("modifierChapitre", () => {
  it("modifie un chapitre existant", async () => {
    update.mockResolvedValue({ id: BigInt(1) });
    const resultat = await modifierChapitre(BigInt(1), { libelle: "Nouveau titre" });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });
});

describe("listerChapitres", () => {
  it("filtre par matière et exclut les chapitres supprimés", async () => {
    findMany.mockResolvedValue([]);
    await listerChapitres(BigInt(1));
    expect(findMany).toHaveBeenCalledWith({
      where: { matiere_id: BigInt(1), supprime_le: null },
      orderBy: { ordre: "asc" },
    });
  });
});

describe("reordonnerChapitres", () => {
  it("assigne l'ordre selon la position dans le tableau", async () => {
    await reordonnerChapitres([BigInt(3), BigInt(1), BigInt(2)]);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenNthCalledWith(1, { where: { id: BigInt(3) }, data: { ordre: 0 } });
    expect(update).toHaveBeenNthCalledWith(2, { where: { id: BigInt(1) }, data: { ordre: 1 } });
    expect(update).toHaveBeenNthCalledWith(3, { where: { id: BigInt(2) }, data: { ordre: 2 } });
  });
});

describe("publication et suppression", () => {
  it("publierChapitre passe le statut à publie", async () => {
    update.mockResolvedValue(undefined);
    await publierChapitre(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { statut: "publie" },
    });
  });

  it("depublierChapitre repasse le statut à brouillon", async () => {
    update.mockResolvedValue(undefined);
    await depublierChapitre(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { statut: "brouillon" },
    });
  });

  it("supprimerChapitre renseigne supprime_le", async () => {
    update.mockResolvedValue(undefined);
    await supprimerChapitre(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { supprime_le: expect.any(Date) },
    });
  });
});
