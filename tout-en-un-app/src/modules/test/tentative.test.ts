import { describe, expect, it, vi, beforeEach } from "vitest";

const findFirstTest = vi.fn();
const findFirstTentativeTest = vi.fn();
const createTentativeTest = vi.fn();
const findManyQuestionTest = vi.fn();
const findManyReponseTentative = vi.fn();
const findFirstOptionReponse = vi.fn();
const upsertReponseTentative = vi.fn();
const updateReponseTentative = vi.fn();
const updateTentativeTest = vi.fn();
const transaction = vi.fn();
const enregistrerEvenement = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    test: { findFirst: (...args: unknown[]) => findFirstTest(...args) },
    tentativeTest: {
      findFirst: (...args: unknown[]) => findFirstTentativeTest(...args),
      create: (...args: unknown[]) => createTentativeTest(...args),
      update: (...args: unknown[]) => updateTentativeTest(...args),
    },
    questionTest: {
      findMany: (...args: unknown[]) => findManyQuestionTest(...args),
    },
    optionReponse: {
      findFirst: (...args: unknown[]) => findFirstOptionReponse(...args),
    },
    reponseTentative: {
      findMany: (...args: unknown[]) => findManyReponseTentative(...args),
      upsert: (...args: unknown[]) => upsertReponseTentative(...args),
      update: (...args: unknown[]) => updateReponseTentative(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

vi.mock("@/modules/apprentissage/journal", () => ({
  enregistrerEvenement: (...args: unknown[]) => enregistrerEvenement(...args),
}));

import {
  aUneTentativeTerminee,
  demarrerOuReprendreTentative,
  enregistrerReponse,
  soumettreTentative,
} from "@/modules/test/tentative";

beforeEach(() => {
  findFirstTest.mockReset();
  findFirstTentativeTest.mockReset();
  createTentativeTest.mockReset();
  findManyQuestionTest.mockReset();
  findManyReponseTentative.mockReset();
  findFirstOptionReponse.mockReset();
  upsertReponseTentative.mockReset();
  updateReponseTentative.mockReset();
  updateTentativeTest.mockReset();
  transaction.mockReset();
  transaction.mockImplementation(async (ops: unknown[]) => ops);
  enregistrerEvenement.mockReset();
});

describe("demarrerOuReprendreTentative", () => {
  it("rend null quand aucun test publié n'existe pour ce cours", async () => {
    findFirstTest.mockResolvedValue(null);
    const resultat = await demarrerOuReprendreTentative(BigInt(1), BigInt(10), BigInt(20));
    expect(resultat).toBeNull();
  });

  it("ne renvoie jamais est_correcte dans les questions envoyées au client", async () => {
    findFirstTest.mockResolvedValue({ id: BigInt(3), duree_minutes: 20 });
    findFirstTentativeTest.mockResolvedValue({ id: BigInt(7), demarre_le: new Date() });
    findManyQuestionTest.mockResolvedValue([
      {
        id: BigInt(1),
        type: "qcm",
        enonce: { version: 1, noeuds: [{ type: "paragraphe", texte: "Question ?" }] },
        points: 1,
        options: [
          { id: BigInt(10), libelle: "A" },
          { id: BigInt(11), libelle: "B" },
        ],
      },
    ]);
    findManyReponseTentative.mockResolvedValue([]);

    const resultat = await demarrerOuReprendreTentative(BigInt(1), BigInt(10), BigInt(20));

    expect(resultat).not.toBeNull();
    // Vérifie que la requête elle-même ne sélectionne pas est_correcte : pas
    // un filtre a posteriori sur la réponse, la garantie que le champ n'a
    // jamais quitté la base.
    const appelQuestions = findManyQuestionTest.mock.calls[0][0];
    expect(appelQuestions.select.options.select).toEqual({ id: true, libelle: true });
    // Et vérifie que la sérialisation réseau réelle ne contient jamais la
    // sous-chaîne, même indirectement.
    expect(JSON.stringify(resultat)).not.toContain("est_correcte");
    expect(JSON.stringify(resultat)).not.toContain("correcte");
  });

  it("reprend une tentative déjà en cours plutôt que d'en créer une nouvelle", async () => {
    findFirstTest.mockResolvedValue({ id: BigInt(3), duree_minutes: 20 });
    findFirstTentativeTest.mockResolvedValue({ id: BigInt(7), demarre_le: new Date() });
    findManyQuestionTest.mockResolvedValue([]);
    findManyReponseTentative.mockResolvedValue([
      { question_test_id: BigInt(1), option_id: BigInt(10) },
    ]);

    const resultat = await demarrerOuReprendreTentative(BigInt(1), BigInt(10), BigInt(20));

    expect(createTentativeTest).not.toHaveBeenCalled();
    expect(resultat?.tentativeId).toBe("7");
    expect(resultat?.reponses).toEqual([{ questionId: "1", optionId: "10" }]);
  });

  it("crée une nouvelle tentative si aucune n'est en cours", async () => {
    findFirstTest.mockResolvedValue({ id: BigInt(3), duree_minutes: 20 });
    findFirstTentativeTest.mockResolvedValue(null);
    createTentativeTest.mockResolvedValue({ id: BigInt(8), demarre_le: new Date() });
    findManyQuestionTest.mockResolvedValue([]);
    findManyReponseTentative.mockResolvedValue([]);

    const resultat = await demarrerOuReprendreTentative(BigInt(1), BigInt(10), BigInt(20));

    expect(createTentativeTest).toHaveBeenCalledWith({
      data: { test_id: BigInt(3), utilisateur_id: BigInt(1) },
    });
    expect(resultat?.tentativeId).toBe("8");
  });
});

describe("enregistrerReponse", () => {
  it("refuse si la tentative n'appartient pas à cet élève ou est déjà terminée", async () => {
    findFirstTentativeTest.mockResolvedValue(null);
    const ok = await enregistrerReponse(BigInt(1), BigInt(7), BigInt(1), BigInt(10));
    expect(ok).toBe(false);
    expect(upsertReponseTentative).not.toHaveBeenCalled();
  });

  it("refuse si l'option n'appartient pas à la question du même test", async () => {
    findFirstTentativeTest.mockResolvedValue({ id: BigInt(7), test_id: BigInt(3) });
    findFirstOptionReponse.mockResolvedValue(null);
    const ok = await enregistrerReponse(BigInt(1), BigInt(7), BigInt(1), BigInt(999));
    expect(ok).toBe(false);
    expect(upsertReponseTentative).not.toHaveBeenCalled();
  });

  it("upsert la réponse : répondre à nouveau à la même question met à jour, ne duplique pas", async () => {
    findFirstTentativeTest.mockResolvedValue({ id: BigInt(7), test_id: BigInt(3) });
    findFirstOptionReponse.mockResolvedValue({ id: BigInt(10) });

    const ok = await enregistrerReponse(BigInt(1), BigInt(7), BigInt(1), BigInt(10));

    expect(ok).toBe(true);
    expect(upsertReponseTentative).toHaveBeenCalledWith({
      where: { tentative_id_question_test_id: { tentative_id: BigInt(7), question_test_id: BigInt(1) } },
      create: { tentative_id: BigInt(7), question_test_id: BigInt(1), option_id: BigInt(10) },
      update: { option_id: BigInt(10) },
    });
  });
});

describe("soumettreTentative", () => {
  function questionsMock() {
    return [
      {
        id: BigInt(1),
        points: 2,
        enonce: { version: 1, noeuds: [{ type: "paragraphe", texte: "Q1" }] },
        explication: null,
        options: [
          { id: BigInt(10), libelle: "Vrai", est_correcte: true },
          { id: BigInt(11), libelle: "Faux", est_correcte: false },
        ],
      },
      {
        id: BigInt(2),
        points: 1,
        enonce: { version: 1, noeuds: [{ type: "paragraphe", texte: "Q2" }] },
        explication: null,
        options: [
          { id: BigInt(20), libelle: "A", est_correcte: false },
          { id: BigInt(21), libelle: "B", est_correcte: true },
        ],
      },
    ];
  }

  it("rend null si la tentative n'appartient pas à cet élève", async () => {
    findFirstTentativeTest.mockResolvedValue(null);
    const resultat = await soumettreTentative(BigInt(1), BigInt(10), undefined, BigInt(20), BigInt(7));
    expect(resultat).toBeNull();
  });

  it("corrige côté serveur : bonne réponse à Q1, mauvaise à Q2, calcule le score et valide contre le seuil", async () => {
    findFirstTentativeTest.mockResolvedValue({
      id: BigInt(7),
      test_id: BigInt(3),
      termine_le: null,
      demarre_le: new Date(Date.now() - 60_000),
    });
    findFirstTest.mockResolvedValue({ seuil_validation: 50 });
    findManyQuestionTest.mockResolvedValue(questionsMock());
    findManyReponseTentative.mockResolvedValue([
      { id: BigInt(100), question_test_id: BigInt(1), option_id: BigInt(10) }, // correcte
      { id: BigInt(101), question_test_id: BigInt(2), option_id: BigInt(20) }, // incorrecte
    ]);

    const resultat = await soumettreTentative(BigInt(1), BigInt(10), BigInt(15), BigInt(20), BigInt(7));

    expect(resultat).not.toBeNull();
    expect(resultat?.score).toBe(2);
    expect(resultat?.scoreMax).toBe(3);
    expect(resultat?.pourcentage).toBe(67);
    expect(resultat?.valide).toBe(true);
    expect(resultat?.questions.find((q) => q.id === "1")?.correcte).toBe(true);
    expect(resultat?.questions.find((q) => q.id === "2")?.correcte).toBe(false);

    expect(enregistrerEvenement).toHaveBeenCalledWith(
      expect.objectContaining({
        ressourceType: "test",
        ressourceId: BigInt(3),
        action: "test_valide",
        valeur: 67,
      }),
    );
  });

  it("ne recorrige pas et ne réémet pas d'événement pour une tentative déjà terminée (soumission rejouée)", async () => {
    findFirstTentativeTest.mockResolvedValue({
      id: BigInt(7),
      test_id: BigInt(3),
      termine_le: new Date(),
      demarre_le: new Date(Date.now() - 60_000),
    });
    findFirstTest.mockResolvedValue({ seuil_validation: 50 });
    findManyQuestionTest.mockResolvedValue(questionsMock());
    findManyReponseTentative.mockResolvedValue([
      { id: BigInt(100), question_test_id: BigInt(1), option_id: BigInt(10), correcte: true },
      { id: BigInt(101), question_test_id: BigInt(2), option_id: BigInt(20), correcte: false },
    ]);

    const resultat = await soumettreTentative(BigInt(1), BigInt(10), undefined, BigInt(20), BigInt(7));

    expect(resultat?.score).toBe(2);
    expect(transaction).not.toHaveBeenCalled();
    expect(enregistrerEvenement).not.toHaveBeenCalled();
  });
});

describe("aUneTentativeTerminee", () => {
  it("rend false quand aucun test publié n'existe", async () => {
    findFirstTest.mockResolvedValue(null);
    expect(await aUneTentativeTerminee(BigInt(1), BigInt(10), BigInt(20))).toBe(false);
  });

  it("rend true quand une tentative terminée existe", async () => {
    findFirstTest.mockResolvedValue({ id: BigInt(3) });
    findFirstTentativeTest.mockResolvedValue({ id: BigInt(7) });
    expect(await aUneTentativeTerminee(BigInt(1), BigInt(10), BigInt(20))).toBe(true);
  });
});
