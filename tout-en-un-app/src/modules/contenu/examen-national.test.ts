import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma";

const create = vi.fn();
const update = vi.fn();
const findMany = vi.fn();
const findFirst = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    examenNational: {
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
      findMany: (...args: unknown[]) => findMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
  },
}));

function erreurDoublon() {
  return new Prisma.PrismaClientKnownRequestError("doublon", {
    code: "P2002",
    clientVersion: "test",
  });
}

import {
  creerExamenNational,
  depublierExamenNational,
  listerExamensNationaux,
  listerExamensNationauxPublies,
  modifierExamenNational,
  obtenirCorrectionExamenNational,
  obtenirCorrectionVideoRefExamenNational,
  obtenirExamenNational,
  obtenirSujetExamenNational,
  publierExamenNational,
  supprimerExamenNational,
} from "@/modules/contenu/examen-national";

const ENTREE_VALIDE = {
  matiere_id: "1",
  filiere_id: "2",
  annee: 2024,
  session: "normale",
  sujet_document_id: "10",
};

beforeEach(() => {
  create.mockReset();
  update.mockReset();
  findMany.mockReset();
  findFirst.mockReset();
});

describe("creerExamenNational", () => {
  it("refuse un formulaire invalide", async () => {
    const resultat = await creerExamenNational({ ...ENTREE_VALIDE, session: "vacances" });
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("crée un examen valide", async () => {
    create.mockResolvedValue({ id: BigInt(1) });
    const resultat = await creerExamenNational(ENTREE_VALIDE);
    expect(resultat).toEqual({ succes: true, id: "1" });
  });

  it("rejette poliment le doublon (matiere_id, annee, session)", async () => {
    create.mockRejectedValue(erreurDoublon());
    const resultat = await creerExamenNational(ENTREE_VALIDE);
    expect(resultat).toEqual({
      succes: false,
      erreur: "Un examen existe déjà pour cette matière, cette année et cette session.",
    });
  });

  it("laisse remonter une autre erreur Prisma", async () => {
    create.mockRejectedValue(new Error("panne base"));
    await expect(creerExamenNational(ENTREE_VALIDE)).rejects.toThrow("panne base");
  });
});

describe("modifierExamenNational", () => {
  it("n'exige plus matiere_id/filiere_id", async () => {
    update.mockResolvedValue({ id: BigInt(1) });
    const resultat = await modifierExamenNational(BigInt(1), { annee: 2025 });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });

  it("rejette poliment le doublon en modification aussi", async () => {
    update.mockRejectedValue(erreurDoublon());
    const resultat = await modifierExamenNational(BigInt(1), { annee: 2025 });
    expect(resultat.succes).toBe(false);
  });
});

describe("listerExamensNationaux", () => {
  it("filtre par matière, exclut les supprimés, trie par année décroissante", async () => {
    findMany.mockResolvedValue([]);
    await listerExamensNationaux(BigInt(1));
    expect(findMany).toHaveBeenCalledWith({
      where: { matiere_id: BigInt(1), supprime_le: null },
      orderBy: [{ annee: "desc" }, { session: "asc" }],
      include: expect.anything(),
    });
  });
});

describe("obtenirExamenNational", () => {
  it("exclut un examen supprimé", async () => {
    findFirst.mockResolvedValue(null);
    await obtenirExamenNational(BigInt(1));
    expect(findFirst).toHaveBeenCalledWith({ where: { id: BigInt(1), supprime_le: null } });
  });
});

describe("publication et suppression", () => {
  it("publierExamenNational passe le statut à publie", async () => {
    update.mockResolvedValue(undefined);
    await publierExamenNational(BigInt(1));
    expect(update).toHaveBeenCalledWith({ where: { id: BigInt(1) }, data: { statut: "publie" } });
  });

  it("depublierExamenNational repasse le statut à brouillon", async () => {
    update.mockResolvedValue(undefined);
    await depublierExamenNational(BigInt(1));
    expect(update).toHaveBeenCalledWith({ where: { id: BigInt(1) }, data: { statut: "brouillon" } });
  });

  it("supprimerExamenNational renseigne supprime_le", async () => {
    update.mockResolvedValue(undefined);
    await supprimerExamenNational(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { supprime_le: expect.any(Date) },
    });
  });
});

describe("lecture élève", () => {
  it("listerExamensNationauxPublies filtre par matière ET par filière", async () => {
    findMany.mockResolvedValue([]);
    await listerExamensNationauxPublies(BigInt(1), BigInt(2));
    expect(findMany).toHaveBeenCalledWith({
      where: {
        matiere_id: BigInt(1),
        filiere_id: BigInt(2),
        statut: "publie",
        supprime_le: null,
        matiere: { statut: "publie", supprime_le: null },
      },
      orderBy: [{ annee: "desc" }, { session: "asc" }],
      select: expect.anything(),
    });
  });

  it("convertit les identifiants BigInt en chaînes (le résultat traverse unstable_cache)", async () => {
    findMany.mockResolvedValue([
      {
        id: BigInt(5),
        annee: 2024,
        session: "normale",
        correction_video_ref: null,
        sujet_document_id: BigInt(11),
        correction_document_id: null,
      },
    ]);
    const resultat = await listerExamensNationauxPublies(BigInt(1), BigInt(2));
    expect(resultat).toEqual([
      {
        id: "5",
        annee: 2024,
        session: "normale",
        correction_video_ref: null,
        sujet_document_id: "11",
        correction_document_id: null,
      },
    ]);
    expect(() => JSON.stringify(resultat)).not.toThrow();
  });

  it("obtenirSujetExamenNational rend null si le fichier est supprimé", async () => {
    findFirst.mockResolvedValue({
      sujet_document: { supprime_le: null, fichier: { cle_stockage: "x", nom: "x.pdf", supprime_le: new Date() } },
    });
    const resultat = await obtenirSujetExamenNational(BigInt(1), BigInt(2), BigInt(3));
    expect(resultat).toBeNull();
  });

  it("obtenirSujetExamenNational rend la clé et le nom quand tout est lisible", async () => {
    findFirst.mockResolvedValue({
      sujet_document: { supprime_le: null, fichier: { cle_stockage: "1/sujet_pdf-abc.pdf", nom: "sujet.pdf", supprime_le: null } },
    });
    const resultat = await obtenirSujetExamenNational(BigInt(1), BigInt(2), BigInt(3));
    expect(resultat).toEqual({ cle_stockage: "1/sujet_pdf-abc.pdf", nom: "sujet.pdf" });
  });

  it("obtenirCorrectionExamenNational rend null si aucune correction n'est attachée", async () => {
    findFirst.mockResolvedValue({ correction_document: null });
    const resultat = await obtenirCorrectionExamenNational(BigInt(1), BigInt(2), BigInt(3));
    expect(resultat).toBeNull();
  });

  it("obtenirCorrectionVideoRefExamenNational rend la référence ou null", async () => {
    findFirst.mockResolvedValue({ correction_video_ref: "abcdefgh" });
    await expect(
      obtenirCorrectionVideoRefExamenNational(BigInt(1), BigInt(2), BigInt(3)),
    ).resolves.toBe("abcdefgh");

    findFirst.mockResolvedValue(null);
    await expect(
      obtenirCorrectionVideoRefExamenNational(BigInt(1), BigInt(2), BigInt(3)),
    ).resolves.toBeNull();
  });
});
