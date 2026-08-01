import { describe, expect, it } from "vitest";
import {
  obtenirDateNational,
  obtenirDerniereNote,
  obtenirProgressionMatiere,
  obtenirProchainLive,
  obtenirTableauDeBord,
} from "@/modules/parcours-eleve/tableau-de-bord";

describe("sources du tableau de bord élève", () => {
  it("expose quatre sources uniques encore indisponibles", async () => {
    const argumentsSource = [BigInt(1), BigInt(2)] as const;
    await expect(obtenirProgressionMatiere(...argumentsSource)).resolves.toEqual({ etat: "indisponible" });
    await expect(obtenirProchainLive(...argumentsSource)).resolves.toEqual({ etat: "indisponible" });
    await expect(obtenirDerniereNote(...argumentsSource)).resolves.toEqual({ etat: "indisponible" });
    await expect(obtenirDateNational(...argumentsSource)).resolves.toEqual({ etat: "indisponible" });
  });

  it("stabilise le contrat consommé par les quatre cartes", async () => {
    await expect(obtenirTableauDeBord(BigInt(1), BigInt(2))).resolves.toEqual({
      progression: { etat: "indisponible" },
      prochainLive: { etat: "indisponible" },
      derniereNote: { etat: "indisponible" },
      dateNational: { etat: "indisponible" },
    });
  });
});
