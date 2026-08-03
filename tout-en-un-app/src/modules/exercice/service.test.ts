import { describe, expect, it, vi, beforeEach } from "vitest";

const createExercice = vi.fn();
const updateExercice = vi.fn();
const findManyExercice = vi.fn();
const findFirstExercice = vi.fn();
const findFirstFichier = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    exercice: {
      create: (...args: unknown[]) => createExercice(...args),
      update: (...args: unknown[]) => updateExercice(...args),
      findMany: (...args: unknown[]) => findManyExercice(...args),
      findFirst: (...args: unknown[]) => findFirstExercice(...args),
    },
    fichier: {
      findFirst: (...args: unknown[]) => findFirstFichier(...args),
    },
  },
}));

import {
  creerExercice,
  depublierExercice,
  listerExercices,
  obtenirImageExercice,
  publierExercice,
  supprimerExercice,
} from "@/modules/exercice/service";

beforeEach(() => {
  createExercice.mockReset();
  updateExercice.mockReset();
  findManyExercice.mockReset();
  findFirstExercice.mockReset();
  findFirstFichier.mockReset();
});

const ENONCE = JSON.stringify({
  version: 1,
  noeuds: [{ type: "paragraphe", texte: "Calculer $v$." }],
});

const ENONCE_AVEC_IMAGE = JSON.stringify({
  version: 1,
  noeuds: [{ type: "image", fichier_id: "42", alt: "Schéma" }],
});

describe("creerExercice", () => {
  it("refuse un formulaire sans énoncé", async () => {
    const resultat = await creerExercice({ cours_id: "1", titre: "Exercice 1", enonce: "" });
    expect(resultat.succes).toBe(false);
    expect(createExercice).not.toHaveBeenCalled();
  });

  it("refuse un énoncé qui n'est pas un contenu riche valide", async () => {
    const resultat = await creerExercice({
      cours_id: "1",
      titre: "Exercice 1",
      enonce: JSON.stringify({ version: 1, noeuds: [{ type: "html", texte: "<b>x</b>" }] }),
    });
    expect(resultat.succes).toBe(false);
    expect(createExercice).not.toHaveBeenCalled();
  });

  // La même borne existe en contrainte CHECK : le schéma permet de répondre
  // « formulaire invalide » au lieu de laisser PostgreSQL lever.
  it("refuse une difficulté hors de l'intervalle 1 à 5", async () => {
    for (const difficulte of ["0", "6"]) {
      const resultat = await creerExercice({
        cours_id: "1",
        titre: "Exercice 1",
        enonce: ENONCE,
        difficulte,
      });
      expect(resultat.succes).toBe(false);
    }
    expect(createExercice).not.toHaveBeenCalled();
  });

  it("refuse une URL complète comme référence de vidéo de correction", async () => {
    const resultat = await creerExercice({
      cours_id: "1",
      titre: "Exercice 1",
      enonce: ENONCE,
      correction_video_ref: "https://youtube.com/watch?v=abc123",
    });
    expect(resultat.succes).toBe(false);
  });

  it("crée un exercice valide en brouillon, difficulté 3 par défaut", async () => {
    createExercice.mockResolvedValue({ id: BigInt(7) });

    const resultat = await creerExercice({
      cours_id: "1",
      titre: "Exercice 1",
      enonce: ENONCE,
    });

    expect(resultat).toEqual({ succes: true, id: "7" });
    const donnees = createExercice.mock.calls[0][0].data;
    expect(donnees.cours_id).toBe(BigInt(1));
    expect(donnees.difficulte).toBe(3);
    expect(donnees.enonce).toEqual({
      version: 1,
      noeuds: [{ type: "paragraphe", texte: "Calculer $v$." }],
    });
    // Aucun statut n'est écrit : la valeur par défaut du schéma est `brouillon`,
    // et la publication est un geste distinct.
    expect(donnees.statut).toBeUndefined();
  });

  // Un champ facultatif vide doit devenir un NULL SQL, pas le littéral JSON
  // `null`, que Prisma traiterait comme une valeur.
  it("écrit un NULL SQL pour une aide laissée vide", async () => {
    createExercice.mockResolvedValue({ id: BigInt(7) });

    await creerExercice({ cours_id: "1", titre: "Exercice 1", enonce: ENONCE, aide: "" });

    const donnees = createExercice.mock.calls[0][0].data;
    expect(donnees.aide).not.toBeNull();
    expect(String(donnees.aide)).toContain("DbNull");
  });
});

describe("listerExercices", () => {
  it("montre les brouillons mais exclut les exercices supprimés", async () => {
    findManyExercice.mockResolvedValue([]);
    await listerExercices(BigInt(3));
    expect(findManyExercice).toHaveBeenCalledWith({
      where: { cours_id: BigInt(3), supprime_le: null },
      orderBy: [{ ordre: "asc" }, { id: "asc" }],
    });
  });
});

describe("publication et suppression", () => {
  it("publierExercice passe le statut à publie", async () => {
    updateExercice.mockResolvedValue(undefined);
    await publierExercice(BigInt(7));
    expect(updateExercice).toHaveBeenCalledWith({
      where: { id: BigInt(7) },
      data: { statut: "publie" },
    });
  });

  it("depublierExercice repasse le statut à brouillon", async () => {
    updateExercice.mockResolvedValue(undefined);
    await depublierExercice(BigInt(7));
    expect(updateExercice).toHaveBeenCalledWith({
      where: { id: BigInt(7) },
      data: { statut: "brouillon" },
    });
  });

  it("supprimerExercice renseigne supprime_le sans effacer la ligne", async () => {
    updateExercice.mockResolvedValue(undefined);
    await supprimerExercice(BigInt(7));
    expect(updateExercice).toHaveBeenCalledWith({
      where: { id: BigInt(7) },
      data: { supprime_le: expect.any(Date) },
    });
  });
});

describe("obtenirImageExercice", () => {
  it("n'interroge la table fichier que si l'exercice existe et est publié", async () => {
    findFirstExercice.mockResolvedValue(null);
    const image = await obtenirImageExercice(BigInt(1), BigInt(9), BigInt(42));
    expect(image).toBeNull();
    expect(findFirstFichier).not.toHaveBeenCalled();
  });

  // Sans ce contrôle, un identifiant d'exercice suffirait à lire n'importe quelle
  // ligne de `fichier` : la route deviendrait un lecteur universel du stockage.
  it("refuse un fichier que l'exercice ne cite pas", async () => {
    findFirstExercice.mockResolvedValue({
      enonce: JSON.parse(ENONCE_AVEC_IMAGE),
      aide: null,
      correction_texte: null,
    });

    const image = await obtenirImageExercice(BigInt(1), BigInt(9), BigInt(43));
    expect(image).toBeNull();
    expect(findFirstFichier).not.toHaveBeenCalled();
  });

  it("rend la clé de stockage d'une image citée par l'énoncé", async () => {
    findFirstExercice.mockResolvedValue({
      enonce: JSON.parse(ENONCE_AVEC_IMAGE),
      aide: null,
      correction_texte: null,
    });
    findFirstFichier.mockResolvedValue({
      cle_stockage: "1/2/3/image_exercice-abc.png",
      type_mime: "image/png",
    });

    const image = await obtenirImageExercice(BigInt(1), BigInt(9), BigInt(42));
    expect(image).toEqual({
      cle_stockage: "1/2/3/image_exercice-abc.png",
      type_mime: "image/png",
    });
  });

  it("accepte aussi une image citée par l'aide", async () => {
    findFirstExercice.mockResolvedValue({
      enonce: JSON.parse(ENONCE),
      aide: JSON.parse(ENONCE_AVEC_IMAGE),
      correction_texte: null,
    });
    findFirstFichier.mockResolvedValue({
      cle_stockage: "1/2/3/image_exercice-abc.png",
      type_mime: "image/png",
    });

    const image = await obtenirImageExercice(BigInt(1), BigInt(9), BigInt(42));
    expect(image).not.toBeNull();
  });

  it("ne lève pas si un champ riche stocké est illisible", async () => {
    findFirstExercice.mockResolvedValue({
      enonce: { version: 99 },
      aide: "texte brut",
      correction_texte: null,
    });

    const image = await obtenirImageExercice(BigInt(1), BigInt(9), BigInt(42));
    expect(image).toBeNull();
  });

  it("exige un exercice, un cours, un chapitre et une matière publiés", async () => {
    findFirstExercice.mockResolvedValue(null);
    await obtenirImageExercice(BigInt(1), BigInt(9), BigInt(42));

    const where = findFirstExercice.mock.calls[0][0].where;
    expect(where.statut).toBe("publie");
    expect(where.supprime_le).toBeNull();
    expect(where.cours.statut).toBe("publie");
    expect(where.cours.chapitre.statut).toBe("publie");
    expect(where.cours.chapitre.matiere_id).toBe(BigInt(1));
    expect(where.cours.chapitre.matiere.statut).toBe("publie");
  });
});
