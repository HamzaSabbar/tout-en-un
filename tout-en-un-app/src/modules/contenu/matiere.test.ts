import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma";

const create = vi.fn();
const update = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    matiere: {
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

import {
  creerMatiere,
  depublierMatiere,
  listerMatieres,
  modifierMatiere,
  publierMatiere,
  supprimerMatiere,
} from "@/modules/contenu/matiere";

function erreurDoublon() {
  return new Prisma.PrismaClientKnownRequestError("doublon", {
    code: "P2002",
    clientVersion: "test",
  });
}

beforeEach(() => {
  create.mockReset();
  update.mockReset();
  findMany.mockReset();
});

describe("creerMatiere", () => {
  it("refuse un formulaire invalide", async () => {
    const resultat = await creerMatiere({ libelle: "" });
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("crée une matière valide", async () => {
    create.mockResolvedValue({ id: BigInt(1) });
    const resultat = await creerMatiere({ code: "PC", libelle: "Physique-Chimie" });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });

  it("refuse un code déjà utilisé", async () => {
    create.mockRejectedValue(erreurDoublon());
    const resultat = await creerMatiere({ code: "PC", libelle: "Physique-Chimie" });
    expect(resultat.succes).toBe(false);
  });
});

describe("modifierMatiere", () => {
  it("modifie une matière existante", async () => {
    update.mockResolvedValue({ id: BigInt(1) });
    const resultat = await modifierMatiere(BigInt(1), { libelle: "Nouveau nom" });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });
});

describe("listerMatieres", () => {
  it("exclut les matières supprimées", async () => {
    findMany.mockResolvedValue([]);
    await listerMatieres();
    expect(findMany).toHaveBeenCalledWith({
      where: { supprime_le: null },
      orderBy: { ordre: "asc" },
    });
  });
});

describe("publication et suppression", () => {
  it("publierMatiere passe le statut à publie", async () => {
    update.mockResolvedValue(undefined);
    await publierMatiere(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { statut: "publie" },
    });
  });

  it("depublierMatiere repasse le statut à brouillon", async () => {
    update.mockResolvedValue(undefined);
    await depublierMatiere(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { statut: "brouillon" },
    });
  });

  it("supprimerMatiere renseigne supprime_le sans supprimer la ligne", async () => {
    update.mockResolvedValue(undefined);
    await supprimerMatiere(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { supprime_le: expect.any(Date) },
    });
  });
});
