import { describe, expect, it, vi, beforeEach } from "vitest";

const create = vi.fn();
const update = vi.fn();
const findMany = vi.fn();
const findFirst = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    extraitNational: {
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
      findMany: (...args: unknown[]) => findMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
  },
}));

import {
  creerExtraitNational,
  depublierExtraitNational,
  listerExtraitsNationaux,
  modifierExtraitNational,
  obtenirCorrectionExtraitNational,
  obtenirCorrectionVideoRefExtraitNational,
  obtenirExtraitNational,
  obtenirSujetExtraitNational,
  publierExtraitNational,
  supprimerExtraitNational,
} from "@/modules/contenu/extrait-national";

const ENTREE_VALIDE = {
  matiere_id: "1",
  chapitre_id: "2",
  cours_id: "3",
  annee: 2024,
  session: "normale",
  enonce: "Étude d'une fonction",
  sujet_document_id: "10",
};

beforeEach(() => {
  create.mockReset();
  update.mockReset();
  findMany.mockReset();
  findFirst.mockReset();
});

describe("creerExtraitNational", () => {
  it("refuse un formulaire invalide", async () => {
    const resultat = await creerExtraitNational({ ...ENTREE_VALIDE, session: "vacances" });
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("refuse une année hors bornes", async () => {
    const resultat = await creerExtraitNational({ ...ENTREE_VALIDE, annee: 1900 });
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("refuse une absence de sujet PDF", async () => {
    const { sujet_document_id: _ignore, ...sansSujet } = ENTREE_VALIDE;
    void _ignore;
    const resultat = await creerExtraitNational(sansSujet);
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("crée un extrait valide, correction absente", async () => {
    create.mockResolvedValue({ id: BigInt(1) });
    const resultat = await creerExtraitNational(ENTREE_VALIDE);
    expect(resultat).toEqual({ succes: true, id: "1" });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        matiere_id: BigInt(1),
        chapitre_id: BigInt(2),
        cours_id: BigInt(3),
        annee: 2024,
        session: "normale",
        sujet_document_id: BigInt(10),
        difficulte: 3,
        ordre: 0,
      }),
    });
    expect(create.mock.calls[0][0].data.correction_document_id).toBeUndefined();
  });

  it("traite un champ facultatif laissé vide comme absent", async () => {
    create.mockResolvedValue({ id: BigInt(1) });
    await creerExtraitNational({ ...ENTREE_VALIDE, correction_video_ref: "" });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ correction_video_ref: undefined }),
    });
  });
});

describe("modifierExtraitNational", () => {
  it("n'exige plus matiere_id/chapitre_id/cours_id", async () => {
    update.mockResolvedValue({ id: BigInt(1) });
    const resultat = await modifierExtraitNational(BigInt(1), { enonce: "Nouvel énoncé" });
    expect(resultat).toEqual({ succes: true, id: "1" });
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { enonce: "Nouvel énoncé" },
    });
  });
});

describe("listerExtraitsNationaux", () => {
  it("filtre par cours, exclut les supprimés, inclut les documents", async () => {
    findMany.mockResolvedValue([]);
    await listerExtraitsNationaux(BigInt(3));
    expect(findMany).toHaveBeenCalledWith({
      where: { cours_id: BigInt(3), supprime_le: null },
      orderBy: [{ ordre: "asc" }, { id: "asc" }],
      include: {
        sujet_document: { include: { fichier: true } },
        correction_document: { include: { fichier: true } },
      },
    });
  });
});

describe("obtenirExtraitNational", () => {
  it("exclut un extrait supprimé", async () => {
    findFirst.mockResolvedValue(null);
    await obtenirExtraitNational(BigInt(1));
    expect(findFirst).toHaveBeenCalledWith({ where: { id: BigInt(1), supprime_le: null } });
  });
});

describe("publication et suppression", () => {
  it("publierExtraitNational passe le statut à publie", async () => {
    update.mockResolvedValue(undefined);
    await publierExtraitNational(BigInt(1));
    expect(update).toHaveBeenCalledWith({ where: { id: BigInt(1) }, data: { statut: "publie" } });
  });

  it("depublierExtraitNational repasse le statut à brouillon", async () => {
    update.mockResolvedValue(undefined);
    await depublierExtraitNational(BigInt(1));
    expect(update).toHaveBeenCalledWith({ where: { id: BigInt(1) }, data: { statut: "brouillon" } });
  });

  it("supprimerExtraitNational renseigne supprime_le", async () => {
    update.mockResolvedValue(undefined);
    await supprimerExtraitNational(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { supprime_le: expect.any(Date) },
    });
  });
});

describe("lecture élève", () => {
  it("obtenirSujetExtraitNational rend null si le document est absent", async () => {
    findFirst.mockResolvedValue({ sujet_document: null });
    const resultat = await obtenirSujetExtraitNational(BigInt(1), BigInt(1));
    expect(resultat).toBeNull();
  });

  it("obtenirSujetExtraitNational rend null si le fichier est supprimé", async () => {
    findFirst.mockResolvedValue({
      sujet_document: { supprime_le: null, fichier: { cle_stockage: "x", nom: "x.pdf", supprime_le: new Date() } },
    });
    const resultat = await obtenirSujetExtraitNational(BigInt(1), BigInt(1));
    expect(resultat).toBeNull();
  });

  it("obtenirSujetExtraitNational rend la clé et le nom quand tout est lisible", async () => {
    findFirst.mockResolvedValue({
      sujet_document: { supprime_le: null, fichier: { cle_stockage: "1/2/3/sujet_pdf-abc.pdf", nom: "sujet.pdf", supprime_le: null } },
    });
    const resultat = await obtenirSujetExtraitNational(BigInt(1), BigInt(1));
    expect(resultat).toEqual({ cle_stockage: "1/2/3/sujet_pdf-abc.pdf", nom: "sujet.pdf" });
  });

  it("obtenirSujetExtraitNational filtre par matière et visibilité en cascade", async () => {
    findFirst.mockResolvedValue(null);
    await obtenirSujetExtraitNational(BigInt(5), BigInt(9));
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: BigInt(9),
        matiere_id: BigInt(5),
        statut: "publie",
        supprime_le: null,
        cours: {
          statut: "publie",
          supprime_le: null,
          chapitre: {
            statut: "publie",
            supprime_le: null,
            matiere: { id: BigInt(5), statut: "publie", supprime_le: null },
          },
        },
      },
      select: expect.anything(),
    });
  });

  it("obtenirCorrectionExtraitNational rend null si aucune correction n'est attachée", async () => {
    findFirst.mockResolvedValue({ correction_document: null });
    const resultat = await obtenirCorrectionExtraitNational(BigInt(1), BigInt(1));
    expect(resultat).toBeNull();
  });

  it("obtenirCorrectionVideoRefExtraitNational rend la référence ou null", async () => {
    findFirst.mockResolvedValue({ correction_video_ref: "abcdefgh" });
    await expect(obtenirCorrectionVideoRefExtraitNational(BigInt(1), BigInt(1))).resolves.toBe(
      "abcdefgh",
    );

    findFirst.mockResolvedValue(null);
    await expect(obtenirCorrectionVideoRefExtraitNational(BigInt(1), BigInt(1))).resolves.toBeNull();
  });
});
