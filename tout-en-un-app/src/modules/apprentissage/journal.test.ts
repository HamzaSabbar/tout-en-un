import { describe, expect, it, vi, beforeEach } from "vitest";

const create = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    evenementApprentissage: {
      create: (...args: unknown[]) => create(...args),
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

import { actionsPosees, enregistrerEvenement } from "@/modules/apprentissage/journal";

beforeEach(() => {
  create.mockReset();
  findMany.mockReset();
});

const BASE = {
  utilisateurId: BigInt(5),
  matiereId: BigInt(1),
  chapitreId: BigInt(2),
  coursId: BigInt(3),
  ressourceType: "exercice" as const,
  ressourceId: BigInt(9),
  action: "vue" as const,
};

describe("enregistrerEvenement", () => {
  it("écrit une ligne avec le contexte complet", async () => {
    create.mockResolvedValue(undefined);

    const ecrit = await enregistrerEvenement(BASE);

    expect(ecrit).toBe(true);
    expect(create).toHaveBeenCalledWith({
      data: {
        utilisateur_id: BigInt(5),
        matiere_id: BigInt(1),
        chapitre_id: BigInt(2),
        cours_id: BigInt(3),
        ressource_type: "exercice",
        ressource_id: BigInt(9),
        action: "vue",
        valeur: undefined,
        duree_secondes: undefined,
      },
    });
  });

  // Une ressource n'appartient pas forcément à un cours : un examen national ou
  // un test de matière n'en a pas. La matière, elle, est toujours connue.
  it("accepte un événement sans chapitre ni cours", async () => {
    create.mockResolvedValue(undefined);

    const ecrit = await enregistrerEvenement({
      utilisateurId: BigInt(5),
      matiereId: BigInt(1),
      ressourceType: "examen",
      ressourceId: BigInt(4),
      action: "terminee",
    });

    expect(ecrit).toBe(true);
    const donnees = create.mock.calls[0][0].data;
    expect(donnees.chapitre_id).toBeUndefined();
    expect(donnees.cours_id).toBeUndefined();
  });

  // Le point qui compte pour le lot 7 : le journal est ajout seul. Deux
  // franchissements de la même étape font deux lignes, pas une ligne mise à jour.
  it("écrit deux lignes pour deux fois la même action, sans mise à jour", async () => {
    create.mockResolvedValue(undefined);

    await enregistrerEvenement(BASE);
    await enregistrerEvenement(BASE);

    expect(create).toHaveBeenCalledTimes(2);
  });

  it("porte les deux actions d'une auto-évaluation revue", async () => {
    create.mockResolvedValue(undefined);

    await enregistrerEvenement({ ...BASE, action: "a_refaire" });
    await enregistrerEvenement({ ...BASE, action: "reussi" });

    expect(create.mock.calls.map((appel) => appel[0].data.action)).toEqual([
      "a_refaire",
      "reussi",
    ]);
  });

  it("accepte les deux actions ajoutées au lot 4", async () => {
    create.mockResolvedValue(undefined);

    for (const action of ["aide_ouverte", "correction_vue"] as const) {
      expect(await enregistrerEvenement({ ...BASE, action })).toBe(true);
    }
  });

  it("refuse une action inconnue sans rien écrire", async () => {
    const ecrit = await enregistrerEvenement({
      ...BASE,
      // @ts-expect-error valeur volontairement hors de l'énumération
      action: "abandonnee",
    });
    expect(ecrit).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("refuse un type de ressource inconnu sans rien écrire", async () => {
    const ecrit = await enregistrerEvenement({
      ...BASE,
      // @ts-expect-error valeur volontairement hors de l'énumération
      ressourceType: "podcast",
    });
    expect(ecrit).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  // La contrainte CHECK en base refuse déjà une durée négative ; le schéma évite
  // d'aller jusqu'à l'erreur SQL.
  it("refuse une durée négative", async () => {
    const ecrit = await enregistrerEvenement({ ...BASE, dureeSecondes: -1 });
    expect(ecrit).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("transmet valeur et durée quand elles sont fournies", async () => {
    create.mockResolvedValue(undefined);

    await enregistrerEvenement({ ...BASE, action: "test_valide", valeur: 17.5, dureeSecondes: 90 });

    const donnees = create.mock.calls[0][0].data;
    expect(donnees.valeur).toBe(17.5);
    expect(donnees.duree_secondes).toBe(90);
  });
});

describe("actionsPosees", () => {
  it("rend l'ensemble des actions déjà posées sur la ressource", async () => {
    findMany.mockResolvedValue([{ action: "vue" }, { action: "aide_ouverte" }, { action: "vue" }]);

    const actions = await actionsPosees(BigInt(5), "exercice", BigInt(9));

    expect(actions).toEqual(new Set(["vue", "aide_ouverte"]));
    expect(findMany).toHaveBeenCalledWith({
      where: {
        utilisateur_id: BigInt(5),
        ressource_type: "exercice",
        ressource_id: BigInt(9),
      },
      // Ordre décroissant : c'est lui qui permet de savoir laquelle de deux
      // auto-évaluations contradictoires est la plus récente.
      orderBy: [{ cree_le: "desc" }, { id: "desc" }],
      select: { action: true },
    });
  });

  it("rend un ensemble vide quand rien n'a été posé", async () => {
    findMany.mockResolvedValue([]);
    expect(await actionsPosees(BigInt(5), "exercice", BigInt(9))).toEqual(new Set());
  });
});
