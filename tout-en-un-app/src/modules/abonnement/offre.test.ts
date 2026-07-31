import { describe, expect, it, vi, beforeEach } from "vitest";

const create = vi.fn();
const update = vi.fn();
const findMany = vi.fn();
const findFirst = vi.fn();
const transaction = vi.fn();
const consigner = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    offre: {
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
      findMany: (...args: unknown[]) => findMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

vi.mock("@/modules/audit/journal", () => ({
  consignerAction: (...args: unknown[]) => consigner(...args),
}));

import {
  basculerOffre,
  creerOffre,
  listerOffres,
  listerOffresActives,
  supprimerOffre,
} from "@/modules/abonnement/offre";

const OFFRE_VALIDE = {
  libelle: "Trimestre, 2 matières",
  duree_jours: "90",
  nb_matieres: "2",
  prix: "600",
};

beforeEach(() => {
  create.mockReset();
  update.mockReset();
  findMany.mockReset();
  findFirst.mockReset();
  consigner.mockReset();
  transaction.mockReset();
  transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({ offre: { update } }),
  );
});

describe("creerOffre", () => {
  it("refuse un formulaire invalide", async () => {
    const resultat = await creerOffre({ ...OFFRE_VALIDE, duree_jours: "0" });
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("crée une offre et convertit les champs numériques", async () => {
    create.mockResolvedValue({ id: BigInt(1) });
    const resultat = await creerOffre(OFFRE_VALIDE);
    expect(resultat).toEqual({ succes: true, id: "1" });
    expect(create).toHaveBeenCalledWith({
      data: {
        libelle: "Trimestre, 2 matières",
        duree_jours: 90,
        nb_matieres: 2,
        prix: 600,
      },
    });
  });
});

describe("listage", () => {
  it("listerOffres exclut les offres supprimées", async () => {
    findMany.mockResolvedValue([]);
    await listerOffres();
    expect(findMany).toHaveBeenCalledWith({
      where: { supprime_le: null },
      orderBy: { prix: "asc" },
    });
  });

  it("listerOffresActives exclut aussi les offres désactivées", async () => {
    findMany.mockResolvedValue([]);
    await listerOffresActives();
    expect(findMany).toHaveBeenCalledWith({
      where: { supprime_le: null, actif: true },
      orderBy: { prix: "asc" },
    });
  });
});

describe("basculerOffre", () => {
  it("désactive une offre sans la supprimer", async () => {
    update.mockResolvedValue(undefined);
    await basculerOffre(BigInt(1), false);
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { actif: false },
    });
  });
});

describe("supprimerOffre", () => {
  it("supprime logiquement et consigne l'action dans la transaction", async () => {
    update.mockResolvedValue(undefined);
    await supprimerOffre(BigInt(4), BigInt(9));

    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(4) },
      data: { supprime_le: expect.any(Date) },
    });
    expect(consigner).toHaveBeenCalledWith(
      {
        utilisateurId: BigInt(9),
        action: "suppression",
        entite: "offre",
        entiteId: BigInt(4),
      },
      expect.anything(),
    );
  });
});
