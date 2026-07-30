import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma";

const create = vi.fn();
const update = vi.fn();
const findMany = vi.fn();
const upsert = vi.fn();
const deleteMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    filiere: {
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
      findMany: (...args: unknown[]) => findMany(...args),
    },
    filiereMatiere: {
      upsert: (...args: unknown[]) => upsert(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
    },
  },
}));

import {
  associerMatiere,
  creerFiliere,
  dissocierMatiere,
  listerFilieres,
  modifierFiliere,
} from "@/modules/contenu/filiere";

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
  upsert.mockReset();
  deleteMany.mockReset();
});

describe("creerFiliere", () => {
  it("refuse un code manquant", async () => {
    const resultat = await creerFiliere({ libelle: "Sciences Physiques" });
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("crée une filière valide", async () => {
    create.mockResolvedValue({ id: BigInt(1) });
    const resultat = await creerFiliere({ code: "SP", libelle: "Sciences Physiques" });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });

  it("refuse un code déjà utilisé", async () => {
    create.mockRejectedValue(erreurDoublon());
    const resultat = await creerFiliere({ code: "SP", libelle: "Sciences Physiques" });
    expect(resultat.succes).toBe(false);
  });
});

describe("modifierFiliere", () => {
  it("modifie une filière existante", async () => {
    update.mockResolvedValue({ id: BigInt(1) });
    const resultat = await modifierFiliere(BigInt(1), { libelle: "Nouveau nom" });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });
});

describe("listerFilieres", () => {
  it("trie par ordre croissant", async () => {
    findMany.mockResolvedValue([]);
    await listerFilieres();
    expect(findMany).toHaveBeenCalledWith({ orderBy: { ordre: "asc" } });
  });
});

describe("associerMatiere / dissocierMatiere", () => {
  it("associe une matière à une filière de façon idempotente", async () => {
    upsert.mockResolvedValue(undefined);
    await associerMatiere(BigInt(1), BigInt(2));
    expect(upsert).toHaveBeenCalledWith({
      where: { filiere_id_matiere_id: { filiere_id: BigInt(1), matiere_id: BigInt(2) } },
      create: { filiere_id: BigInt(1), matiere_id: BigInt(2) },
      update: {},
    });
  });

  it("dissocie une matière d'une filière", async () => {
    deleteMany.mockResolvedValue(undefined);
    await dissocierMatiere(BigInt(1), BigInt(2));
    expect(deleteMany).toHaveBeenCalledWith({
      where: { filiere_id: BigInt(1), matiere_id: BigInt(2) },
    });
  });
});
