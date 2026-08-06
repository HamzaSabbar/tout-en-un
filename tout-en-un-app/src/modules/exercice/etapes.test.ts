import { describe, expect, it, vi, beforeEach } from "vitest";

const findMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    evenementApprentissage: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

import { analyserAutoEvaluation, etatEtapesExercice } from "@/modules/exercice/etapes";

beforeEach(() => findMany.mockReset());

// `historiqueRessource` rend les actions du plus récent au plus ancien : les
// tableaux ci-dessous sont écrits dans cet ordre.
function historique(...actions: string[]) {
  findMany.mockResolvedValue(actions.map((action) => ({ action })));
}

describe("etatEtapesExercice", () => {
  it("part de toutes les étapes non franchies", async () => {
    historique();
    expect(await etatEtapesExercice(BigInt(5), BigInt(9))).toEqual({
      enonceVu: false,
      aideOuverte: false,
      correctionVue: false,
      correctionVideoVue: false,
      autoEvaluation: null,
    });
  });

  it("dérive chaque étape de l'action correspondante", async () => {
    historique("terminee", "correction_vue", "aide_ouverte", "vue");
    expect(await etatEtapesExercice(BigInt(5), BigInt(9))).toMatchObject({
      enonceVu: true,
      aideOuverte: true,
      correctionVue: true,
      correctionVideoVue: true,
    });
  });

  // Le journal étant ajout seul, une auto-évaluation revue laisse les deux
  // lignes. C'est la plus récente qui vaut, sinon un élève ne pourrait jamais
  // corriger un « à refaire » cliqué par erreur.
  it("retient la plus récente de deux auto-évaluations contradictoires", async () => {
    historique("reussi", "a_refaire", "vue");
    expect((await etatEtapesExercice(BigInt(5), BigInt(9))).autoEvaluation).toBe("reussi");

    historique("a_refaire", "reussi", "vue");
    expect((await etatEtapesExercice(BigInt(5), BigInt(9))).autoEvaluation).toBe("a_refaire");
  });

  it("ignore une action qui n'est pas une auto-évaluation", async () => {
    historique("correction_vue", "vue");
    expect((await etatEtapesExercice(BigInt(5), BigInt(9))).autoEvaluation).toBeNull();
  });

  it("interroge le journal pour cette ressource et cet élève", async () => {
    historique();
    await etatEtapesExercice(BigInt(5), BigInt(9));
    expect(findMany.mock.calls[0][0].where).toEqual({
      utilisateur_id: BigInt(5),
      ressource_type: "exercice",
      ressource_id: BigInt(9),
    });
  });
});

describe("analyserAutoEvaluation", () => {
  it("accepte les deux valeurs d'auto-évaluation", () => {
    expect(analyserAutoEvaluation("reussi")).toBe("reussi");
    expect(analyserAutoEvaluation("a_refaire")).toBe("a_refaire");
  });

  it("refuse toute autre valeur", () => {
    for (const valeur of ["vue", "termine", "", null, undefined, 3]) {
      expect(analyserAutoEvaluation(valeur)).toBeNull();
    }
  });
});
