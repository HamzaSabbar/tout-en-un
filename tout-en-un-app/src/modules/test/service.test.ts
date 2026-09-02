import { describe, expect, it, vi, beforeEach } from "vitest";

const createTest = vi.fn();
const updateTest = vi.fn();
const findFirstTest = vi.fn();
const createQuestionTest = vi.fn();
const createManyOptionReponse = vi.fn();
const findManyQuestionTest = vi.fn();
const updateQuestionTest = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    test: {
      create: (...args: unknown[]) => createTest(...args),
      update: (...args: unknown[]) => updateTest(...args),
      findFirst: (...args: unknown[]) => findFirstTest(...args),
    },
    questionTest: {
      create: (...args: unknown[]) => createQuestionTest(...args),
      findMany: (...args: unknown[]) => findManyQuestionTest(...args),
      update: (...args: unknown[]) => updateQuestionTest(...args),
    },
    optionReponse: {
      createMany: (...args: unknown[]) => createManyOptionReponse(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

import {
  creerQuestionTest,
  creerTest,
  depublierTest,
  listerQuestionsTest,
  obtenirTestPublie,
  publierTest,
} from "@/modules/test/service";

beforeEach(() => {
  createTest.mockReset();
  updateTest.mockReset();
  findFirstTest.mockReset();
  createQuestionTest.mockReset();
  createManyOptionReponse.mockReset();
  findManyQuestionTest.mockReset();
  updateQuestionTest.mockReset();
  transaction.mockReset();
});

const ENONCE = JSON.stringify({
  version: 1,
  noeuds: [{ type: "paragraphe", texte: "Quelle est la nature de l'onde ?" }],
});

describe("creerTest", () => {
  it("refuse un formulaire sans durée", async () => {
    const resultat = await creerTest({ cours_id: "1", titre: "Test", duree_minutes: "" });
    expect(resultat.succes).toBe(false);
    expect(createTest).not.toHaveBeenCalled();
  });

  it("refuse un seuil de validation hors de 0..100", async () => {
    const resultat = await creerTest({
      cours_id: "1",
      titre: "Test",
      duree_minutes: "20",
      seuil_validation: "150",
    });
    expect(resultat.succes).toBe(false);
  });

  it("crée un test valide, seuil par défaut à 50", async () => {
    createTest.mockResolvedValue({ id: BigInt(1) });
    const resultat = await creerTest({ cours_id: "1", titre: "Test de fin de cours", duree_minutes: "20" });
    expect(resultat).toEqual({ succes: true, id: "1" });
    expect(createTest).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ seuil_validation: 50 }) }),
    );
  });
});

describe("publierTest / depublierTest", () => {
  it("publie un test", async () => {
    await publierTest(BigInt(5));
    expect(updateTest).toHaveBeenCalledWith({ where: { id: BigInt(5) }, data: { statut: "publie" } });
  });

  it("dépublie un test", async () => {
    await depublierTest(BigInt(5));
    expect(updateTest).toHaveBeenCalledWith({ where: { id: BigInt(5) }, data: { statut: "brouillon" } });
  });
});

describe("creerQuestionTest", () => {
  it("refuse un formulaire sans option correcte marquée avec du texte", async () => {
    const resultat = await creerQuestionTest({
      test_id: "1",
      enonce: ENONCE,
      option_a: "Transversale",
      option_b: "",
      option_correcte: "b",
    });
    expect(resultat.succes).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("crée la question et seulement les options renseignées, la bonne marquée est_correcte", async () => {
    transaction.mockImplementation(async (fn) => fn({
      questionTest: { create: createQuestionTest },
      optionReponse: { createMany: createManyOptionReponse },
    }));
    createQuestionTest.mockResolvedValue({ id: BigInt(9) });

    const resultat = await creerQuestionTest({
      test_id: "1",
      enonce: ENONCE,
      option_a: "Transversale",
      option_b: "Longitudinale",
      option_c: "",
      option_correcte: "a",
    });

    expect(resultat).toEqual({ succes: true, id: "9" });
    expect(createManyOptionReponse).toHaveBeenCalledWith({
      data: [
        { question_test_id: BigInt(9), libelle: "Transversale", est_correcte: true, ordre: 0 },
        { question_test_id: BigInt(9), libelle: "Longitudinale", est_correcte: false, ordre: 1 },
      ],
    });
  });
});

describe("listerQuestionsTest", () => {
  it("inclut les options avec est_correcte (vue admin, rien à masquer)", async () => {
    await listerQuestionsTest(BigInt(1));
    expect(findManyQuestionTest).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { options: { orderBy: { ordre: "asc" } } },
      }),
    );
  });
});

describe("obtenirTestPublie", () => {
  it("rend null quand aucun test publié n'existe pour ce cours", async () => {
    findFirstTest.mockResolvedValue(null);
    expect(await obtenirTestPublie(BigInt(10), BigInt(20))).toBeNull();
  });

  it("rend un résumé léger, sans les questions", async () => {
    findFirstTest.mockResolvedValue({
      id: BigInt(3),
      titre: "Test de fin de cours",
      duree_minutes: 20,
      _count: { questions: 4 },
    });
    const resultat = await obtenirTestPublie(BigInt(10), BigInt(20));
    expect(resultat).toEqual({ id: "3", titre: "Test de fin de cours", dureeMinutes: 20, nbQuestions: 4 });
  });
});
