import { describe, expect, it, vi, beforeEach } from "vitest";

const obtenirDateExamenNational = vi.fn();

vi.mock("@/modules/contenu/parametre", () => ({
  obtenirDateExamenNational: (...args: unknown[]) => obtenirDateExamenNational(...args),
}));

import { obtenirCompteARebours } from "@/modules/parcours-eleve/compte-a-rebours";

beforeEach(() => {
  obtenirDateExamenNational.mockReset();
});

describe("obtenirCompteARebours", () => {
  it("est indisponible quand aucune date n'est définie", async () => {
    obtenirDateExamenNational.mockResolvedValue(null);
    await expect(obtenirCompteARebours()).resolves.toEqual({ etat: "indisponible" });
  });

  it("calcule les jours restants pour une date future", async () => {
    const dansDixJours = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 - 1000);
    obtenirDateExamenNational.mockResolvedValue({ date: dansDixJours, libelle: "Session normale 2027" });
    const resultat = await obtenirCompteARebours();
    expect(resultat).toEqual({ etat: "disponible", libelle: "Session normale 2027", joursRestants: 10 });
  });

  it("plafonne à zéro pour une date déjà passée", async () => {
    const hier = new Date(Date.now() - 24 * 60 * 60 * 1000);
    obtenirDateExamenNational.mockResolvedValue({ date: hier, libelle: "Session normale 2026" });
    const resultat = await obtenirCompteARebours();
    expect(resultat).toEqual({ etat: "disponible", libelle: "Session normale 2026", joursRestants: 0 });
  });
});
