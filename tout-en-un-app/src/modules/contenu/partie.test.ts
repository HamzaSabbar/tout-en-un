import { describe, expect, it, vi, beforeEach } from "vitest";

const create = vi.fn();
const update = vi.fn();
const findMany = vi.fn();
const findFirst = vi.fn();
const transaction = vi.fn();
const chapitreUpdateMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    partie: {
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
      findMany: (...args: unknown[]) => findMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
    chapitre: {
      updateMany: (...args: unknown[]) => chapitreUpdateMany(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

import {
  creerPartie,
  depublierPartie,
  listerParties,
  listerPartiesPubliees,
  modifierPartie,
  obtenirPartie,
  publierPartie,
  reordonnerParties,
  supprimerPartie,
} from "@/modules/contenu/partie";

beforeEach(() => {
  create.mockReset();
  update.mockReset();
  findMany.mockReset();
  findFirst.mockReset();
  transaction.mockReset();
  chapitreUpdateMany.mockReset();
  transaction.mockResolvedValue(undefined);
});

describe("creerPartie", () => {
  it("refuse un formulaire invalide", async () => {
    const resultat = await creerPartie({ matiere_id: "1", libelle: "" });
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("crée une partie valide", async () => {
    create.mockResolvedValue({ id: BigInt(1) });
    const resultat = await creerPartie({ matiere_id: "1", libelle: "Physique" });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });
});

describe("modifierPartie", () => {
  it("modifie une partie existante", async () => {
    update.mockResolvedValue({ id: BigInt(1) });
    const resultat = await modifierPartie(BigInt(1), { libelle: "Chimie" });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });
});

describe("listerParties", () => {
  it("filtre par matière et exclut les parties supprimées", async () => {
    findMany.mockResolvedValue([]);
    await listerParties(BigInt(1));
    expect(findMany).toHaveBeenCalledWith({
      where: { matiere_id: BigInt(1), supprime_le: null },
      orderBy: { ordre: "asc" },
    });
  });
});

describe("listerPartiesPubliees", () => {
  it("filtre par matière, statut publié et exclut les supprimées", async () => {
    findMany.mockResolvedValue([]);
    await listerPartiesPubliees(BigInt(1));
    expect(findMany).toHaveBeenCalledWith({
      where: { matiere_id: BigInt(1), supprime_le: null, statut: "publie" },
      orderBy: { ordre: "asc" },
      select: { id: true, libelle: true, description: true, ordre: true },
    });
  });
});

describe("obtenirPartie", () => {
  it("exclut une partie supprimée", async () => {
    findFirst.mockResolvedValue(null);
    await obtenirPartie(BigInt(1));
    expect(findFirst).toHaveBeenCalledWith({ where: { id: BigInt(1), supprime_le: null } });
  });
});

describe("reordonnerParties", () => {
  it("assigne l'ordre selon la position dans le tableau", async () => {
    await reordonnerParties([BigInt(3), BigInt(1), BigInt(2)]);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenNthCalledWith(1, { where: { id: BigInt(3) }, data: { ordre: 0 } });
    expect(update).toHaveBeenNthCalledWith(2, { where: { id: BigInt(1) }, data: { ordre: 1 } });
    expect(update).toHaveBeenNthCalledWith(3, { where: { id: BigInt(2) }, data: { ordre: 2 } });
  });
});

describe("publication et suppression", () => {
  it("publierPartie passe le statut à publie", async () => {
    update.mockResolvedValue(undefined);
    await publierPartie(BigInt(1));
    expect(update).toHaveBeenCalledWith({ where: { id: BigInt(1) }, data: { statut: "publie" } });
  });

  it("depublierPartie repasse le statut à brouillon", async () => {
    update.mockResolvedValue(undefined);
    await depublierPartie(BigInt(1));
    expect(update).toHaveBeenCalledWith({ where: { id: BigInt(1) }, data: { statut: "brouillon" } });
  });

  it("supprimerPartie détache ses chapitres et se marque supprimée, dans une même transaction", async () => {
    await supprimerPartie(BigInt(1));
    expect(transaction).toHaveBeenCalledTimes(1);
    // Les deux opérations doivent être passées ensemble à $transaction : sans
    // ça, un chapitre pourrait rester attaché à une partie déjà supprimée.
    const operations = transaction.mock.calls[0][0];
    expect(operations).toHaveLength(2);
    expect(chapitreUpdateMany).toHaveBeenCalledWith({
      where: { partie_id: BigInt(1) },
      data: { partie_id: null },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { supprime_le: expect.any(Date) },
    });
  });
});
