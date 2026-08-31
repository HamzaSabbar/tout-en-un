import { describe, expect, it, vi, beforeEach } from "vitest";

const upsert = vi.fn();
const findUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    dateExamenNational: {
      upsert: (...args: unknown[]) => upsert(...args),
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
  },
}));

import { definirDateExamenNational, obtenirDateExamenNational } from "@/modules/contenu/parametre";

beforeEach(() => {
  upsert.mockReset();
  findUnique.mockReset();
});

describe("definirDateExamenNational", () => {
  it("refuse un formulaire invalide", async () => {
    const resultat = await definirDateExamenNational({ date: "", libelle: "" });
    expect(resultat.succes).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("upsert la ligne unique avec la date et le libellé fournis", async () => {
    upsert.mockResolvedValue({ id: BigInt(1) });
    const resultat = await definirDateExamenNational({
      date: "2027-06-05",
      libelle: "Session normale 2027",
    });
    expect(resultat).toEqual({ succes: true, id: "1" });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BigInt(1) },
        create: expect.objectContaining({ id: BigInt(1), libelle: "Session normale 2027" }),
        update: expect.objectContaining({ libelle: "Session normale 2027" }),
      }),
    );
  });
});

describe("obtenirDateExamenNational", () => {
  it("renvoie null quand aucune ligne n'existe", async () => {
    findUnique.mockResolvedValue(null);
    await expect(obtenirDateExamenNational()).resolves.toBeNull();
  });

  it("renvoie la ligne unique quand elle existe", async () => {
    const ligne = { id: BigInt(1), date: new Date("2027-06-05"), libelle: "Session normale 2027" };
    findUnique.mockResolvedValue(ligne);
    await expect(obtenirDateExamenNational()).resolves.toEqual(ligne);
  });
});
