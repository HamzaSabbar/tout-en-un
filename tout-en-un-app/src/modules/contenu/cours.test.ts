import { describe, expect, it, vi, beforeEach } from "vitest";

const create = vi.fn();
const update = vi.fn();
const findMany = vi.fn();
const findUnique = vi.fn();
const findFirst = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    cours: {
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
      findMany: (...args: unknown[]) => findMany(...args),
      findUnique: (...args: unknown[]) => findUnique(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

import {
  creerCours,
  depublierCours,
  dupliquerCours,
  listerCours,
  modifierCours,
  obtenirCours,
  publierCours,
  reordonnerCours,
  supprimerCours,
} from "@/modules/contenu/cours";

beforeEach(() => {
  create.mockReset();
  update.mockReset();
  findMany.mockReset();
  findUnique.mockReset();
  findFirst.mockReset();
  transaction.mockReset();
  transaction.mockResolvedValue(undefined);
});

describe("creerCours", () => {
  it("refuse un formulaire invalide", async () => {
    const resultat = await creerCours({ chapitre_id: "1", titre: "" });
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("crée un cours valide", async () => {
    create.mockResolvedValue({ id: BigInt(1) });
    const resultat = await creerCours({ chapitre_id: "1", titre: "La dérivée" });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });
});

describe("modifierCours", () => {
  it("modifie un cours existant", async () => {
    update.mockResolvedValue({ id: BigInt(1) });
    const resultat = await modifierCours(BigInt(1), { titre: "Nouveau titre" });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });
});

describe("listerCours", () => {
  it("filtre par chapitre et exclut les cours supprimés", async () => {
    findMany.mockResolvedValue([]);
    await listerCours(BigInt(1));
    expect(findMany).toHaveBeenCalledWith({
      where: { chapitre_id: BigInt(1), supprime_le: null },
      orderBy: { ordre: "asc" },
    });
  });
});

describe("obtenirCours", () => {
  it("exclut un cours supprimé", async () => {
    findFirst.mockResolvedValue(null);
    await obtenirCours(BigInt(1));
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: BigInt(1), supprime_le: null },
    });
  });
});

describe("reordonnerCours", () => {
  it("assigne l'ordre selon la position dans le tableau", async () => {
    await reordonnerCours([BigInt(2), BigInt(1)]);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenNthCalledWith(1, { where: { id: BigInt(2) }, data: { ordre: 0 } });
    expect(update).toHaveBeenNthCalledWith(2, { where: { id: BigInt(1) }, data: { ordre: 1 } });
  });
});

describe("publication et suppression", () => {
  it("publierCours passe le statut à publie et renseigne publie_le", async () => {
    update.mockResolvedValue(undefined);
    await publierCours(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { statut: "publie", publie_le: expect.any(Date) },
    });
  });

  it("depublierCours repasse le statut à brouillon", async () => {
    update.mockResolvedValue(undefined);
    await depublierCours(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { statut: "brouillon" },
    });
  });

  it("supprimerCours renseigne supprime_le", async () => {
    update.mockResolvedValue(undefined);
    await supprimerCours(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { supprime_le: expect.any(Date) },
    });
  });
});

describe("dupliquerCours", () => {
  it("refuse un cours introuvable", async () => {
    findUnique.mockResolvedValue(null);
    const resultat = await dupliquerCours(BigInt(99));
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("refuse un cours déjà supprimé", async () => {
    findUnique.mockResolvedValue({
      id: BigInt(1),
      chapitre_id: BigInt(1),
      titre: "La dérivée",
      description: null,
      professeur_id: null,
      supprime_le: new Date(),
    });
    const resultat = await dupliquerCours(BigInt(1));
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("crée une copie en brouillon à la fin de la liste", async () => {
    findUnique.mockResolvedValue({
      id: BigInt(1),
      chapitre_id: BigInt(5),
      titre: "La dérivée",
      description: "Introduction",
      professeur_id: null,
      supprime_le: null,
    });
    findFirst.mockResolvedValue({ id: BigInt(1), ordre: 3 });
    create.mockResolvedValue({ id: BigInt(2) });

    const resultat = await dupliquerCours(BigInt(1));

    expect(resultat).toEqual({ succes: true, id: "2" });
    expect(create).toHaveBeenCalledWith({
      data: {
        chapitre_id: BigInt(5),
        titre: "La dérivée (copie)",
        description: "Introduction",
        professeur_id: null,
        ordre: 4,
        statut: "brouillon",
      },
    });
  });
});
