import { describe, expect, it, vi, beforeEach } from "vitest";

const findFirstExercice = vi.fn();
const upsertCarnetErreur = vi.fn();
const findUniqueCarnetErreur = vi.fn();
const deleteManyCarnetErreur = vi.fn();
const findManyCarnetErreur = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    exercice: { findFirst: (...args: unknown[]) => findFirstExercice(...args) },
    carnetErreur: {
      upsert: (...args: unknown[]) => upsertCarnetErreur(...args),
      findUnique: (...args: unknown[]) => findUniqueCarnetErreur(...args),
      deleteMany: (...args: unknown[]) => deleteManyCarnetErreur(...args),
      findMany: (...args: unknown[]) => findManyCarnetErreur(...args),
    },
  },
}));

import {
  enregistrerNote,
  listerNotes,
  matieresEtChapitresAvecNotes,
  obtenirNote,
  supprimerNote,
} from "@/modules/carnet/service";

beforeEach(() => {
  findFirstExercice.mockReset();
  upsertCarnetErreur.mockReset();
  findUniqueCarnetErreur.mockReset();
  deleteManyCarnetErreur.mockReset();
  findManyCarnetErreur.mockReset();
});

describe("enregistrerNote", () => {
  it("écrit la note quand l'exercice est visible pour cette matière", async () => {
    findFirstExercice.mockResolvedValue({ id: BigInt(5) });
    upsertCarnetErreur.mockResolvedValue({ erreur: "Erreur de signe", retenu: "Vérifier le signe" });

    const note = await enregistrerNote(BigInt(1), BigInt(10), BigInt(5), {
      erreur: "Erreur de signe",
      retenu: "Vérifier le signe",
    });

    expect(note).toEqual({ erreur: "Erreur de signe", retenu: "Vérifier le signe" });
    expect(upsertCarnetErreur).toHaveBeenCalledOnce();
    const appel = upsertCarnetErreur.mock.calls[0][0];
    expect(appel.where).toEqual({
      utilisateur_id_exercice_id: { utilisateur_id: BigInt(1), exercice_id: BigInt(5) },
    });
    expect(appel.create).toEqual({
      utilisateur_id: BigInt(1),
      exercice_id: BigInt(5),
      erreur: "Erreur de signe",
      retenu: "Vérifier le signe",
    });
  });

  it("convertit les champs vides en null plutôt qu'en chaîne vide", async () => {
    findFirstExercice.mockResolvedValue({ id: BigInt(5) });
    upsertCarnetErreur.mockResolvedValue({ erreur: null, retenu: null });

    await enregistrerNote(BigInt(1), BigInt(10), BigInt(5), { erreur: "   ", retenu: "" });

    const appel = upsertCarnetErreur.mock.calls[0][0];
    expect(appel.create.erreur).toBeNull();
    expect(appel.create.retenu).toBeNull();
  });

  it("refuse d'écrire si l'exercice n'est pas visible pour cette matière", async () => {
    findFirstExercice.mockResolvedValue(null);

    const note = await enregistrerNote(BigInt(1), BigInt(10), BigInt(5), { erreur: "x" });

    expect(note).toBeNull();
    expect(upsertCarnetErreur).not.toHaveBeenCalled();
  });

  it("refuse un champ trop long sans toucher la base", async () => {
    const note = await enregistrerNote(BigInt(1), BigInt(10), BigInt(5), {
      erreur: "a".repeat(2001),
    });

    expect(note).toBeNull();
    expect(findFirstExercice).not.toHaveBeenCalled();
    expect(upsertCarnetErreur).not.toHaveBeenCalled();
  });
});

describe("obtenirNote", () => {
  it("renvoie la note existante", async () => {
    findFirstExercice.mockResolvedValue({ id: BigInt(5) });
    findUniqueCarnetErreur.mockResolvedValue({ erreur: "Erreur de signe", retenu: null });

    const note = await obtenirNote(BigInt(1), BigInt(10), BigInt(5));

    expect(note).toEqual({ erreur: "Erreur de signe", retenu: null });
  });

  it("renvoie des champs vides quand aucune note n'existe encore, pas null", async () => {
    findFirstExercice.mockResolvedValue({ id: BigInt(5) });
    findUniqueCarnetErreur.mockResolvedValue(null);

    const note = await obtenirNote(BigInt(1), BigInt(10), BigInt(5));

    expect(note).toEqual({ erreur: null, retenu: null });
  });

  it("renvoie null si l'exercice n'est pas visible pour cette matière", async () => {
    findFirstExercice.mockResolvedValue(null);

    const note = await obtenirNote(BigInt(1), BigInt(10), BigInt(5));

    expect(note).toBeNull();
    expect(findUniqueCarnetErreur).not.toHaveBeenCalled();
  });
});

describe("supprimerNote", () => {
  it("supprime en la scopant par élève et exercice, jamais par id seul", async () => {
    await supprimerNote(BigInt(1), BigInt(5));

    expect(deleteManyCarnetErreur).toHaveBeenCalledWith({
      where: { utilisateur_id: BigInt(1), exercice_id: BigInt(5) },
    });
  });
});

const LIGNE_TYPE = (id: number) => ({
  id: BigInt(id),
  erreur: null,
  retenu: null,
  cree_le: new Date("2026-01-01"),
  exercice: {
    id: BigInt(100 + id),
    titre: `Exercice ${id}`,
    cours: {
      id: BigInt(200),
      titre: "Cours",
      chapitre: {
        id: BigInt(300),
        libelle: "Chapitre",
        matiere: { id: BigInt(400), libelle: "Matière" },
      },
    },
  },
});

describe("listerNotes", () => {
  it("ne renvoie pas de curseur suivant quand la page n'est pas pleine", async () => {
    findManyCarnetErreur.mockResolvedValue([LIGNE_TYPE(1), LIGNE_TYPE(2)]);

    const page = await listerNotes(BigInt(1));

    expect(page.notes).toHaveLength(2);
    expect(page.curseurSuivant).toBeNull();
  });

  it("détecte une page pleine et renvoie l'id de la dernière note comme curseur", async () => {
    // 21 lignes = TAILLE_PAGE (20) + 1 sentinelle.
    findManyCarnetErreur.mockResolvedValue(Array.from({ length: 21 }, (_, i) => LIGNE_TYPE(i)));

    const page = await listerNotes(BigInt(1));

    expect(page.notes).toHaveLength(20);
    expect(page.curseurSuivant).toBe(page.notes[19].id);
  });

  it("filtre par chapitre plutôt que par matière quand les deux sont fournis", async () => {
    findManyCarnetErreur.mockResolvedValue([]);

    await listerNotes(BigInt(1), { matiereId: BigInt(10), chapitreId: BigInt(30) });

    const appel = findManyCarnetErreur.mock.calls[0][0];
    expect(appel.where.exercice.cours).toEqual({ chapitre_id: BigInt(30) });
  });

  it("filtre par matière quand seule la matière est fournie", async () => {
    findManyCarnetErreur.mockResolvedValue([]);

    await listerNotes(BigInt(1), { matiereId: BigInt(10) });

    const appel = findManyCarnetErreur.mock.calls[0][0];
    expect(appel.where.exercice.cours).toEqual({ chapitre: { matiere_id: BigInt(10) } });
  });
});

describe("matieresEtChapitresAvecNotes", () => {
  it("déduplique les matières et chapitres des notes de l'élève", async () => {
    findManyCarnetErreur.mockResolvedValue([
      {
        exercice: {
          cours: {
            chapitre: { id: BigInt(1), libelle: "Ondes", matiere: { id: BigInt(9), libelle: "Physique" } },
          },
        },
      },
      {
        exercice: {
          cours: {
            chapitre: { id: BigInt(1), libelle: "Ondes", matiere: { id: BigInt(9), libelle: "Physique" } },
          },
        },
      },
      {
        exercice: {
          cours: {
            chapitre: { id: BigInt(2), libelle: "Optique", matiere: { id: BigInt(9), libelle: "Physique" } },
          },
        },
      },
    ]);

    const options = await matieresEtChapitresAvecNotes(BigInt(1));

    expect(options.matieres).toEqual([{ id: "9", libelle: "Physique" }]);
    expect(options.chapitres).toEqual([
      { id: "1", libelle: "Ondes", matiereId: "9" },
      { id: "2", libelle: "Optique", matiereId: "9" },
    ]);
  });
});
