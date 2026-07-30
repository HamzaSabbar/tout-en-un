import { describe, expect, it, vi, beforeEach } from "vitest";

const createFichier = vi.fn();
const findUniqueFichier = vi.fn();
const updateFichier = vi.fn();
const findManyFichier = vi.fn();
const createDocument = vi.fn();
const updateDocument = vi.fn();
const findManyDocument = vi.fn();
const televerser = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    fichier: {
      create: (...args: unknown[]) => createFichier(...args),
      findUnique: (...args: unknown[]) => findUniqueFichier(...args),
      update: (...args: unknown[]) => updateFichier(...args),
      findMany: (...args: unknown[]) => findManyFichier(...args),
    },
    document: {
      create: (...args: unknown[]) => createDocument(...args),
      update: (...args: unknown[]) => updateDocument(...args),
      findMany: (...args: unknown[]) => findManyDocument(...args),
    },
  },
}));

vi.mock("@/lib/storage/storage", () => ({
  storageService: {
    televerser: (...args: unknown[]) => televerser(...args),
  },
}));

import {
  listerDocumentsCours,
  listerMediatheque,
  remplacerFichier,
  supprimerDocument,
  televerserDocument,
} from "@/modules/contenu/document";

beforeEach(() => {
  createFichier.mockReset();
  findUniqueFichier.mockReset();
  updateFichier.mockReset();
  findManyFichier.mockReset();
  createDocument.mockReset();
  updateDocument.mockReset();
  findManyDocument.mockReset();
  televerser.mockReset();
});

const contenu = Buffer.from("pdf-factice");

describe("televerserDocument", () => {
  it("refuse un formulaire invalide", async () => {
    const resultat = await televerserDocument(
      { type: "cours_pdf", titre: "", nom: "cours.pdf", type_mime: "application/pdf", taille: 10 },
      contenu,
      BigInt(1),
    );
    expect(resultat.succes).toBe(false);
    expect(televerser).not.toHaveBeenCalled();
  });

  it("refuse un type MIME différent de application/pdf", async () => {
    const resultat = await televerserDocument(
      {
        type: "cours_pdf",
        titre: "Cours 1",
        nom: "cours.exe",
        type_mime: "application/octet-stream",
        taille: 10,
      },
      contenu,
      BigInt(1),
    );
    expect(resultat.succes).toBe(false);
    expect(televerser).not.toHaveBeenCalled();
  });

  it("retourne une erreur normale (pas une exception) si le stockage n'est pas configuré", async () => {
    televerser.mockRejectedValue(new Error("Stockage de fichiers non configuré : ..."));

    const resultat = await televerserDocument(
      {
        type: "cours_pdf",
        titre: "Cours 1",
        nom: "cours.pdf",
        type_mime: "application/pdf",
        taille: 1024,
      },
      contenu,
      BigInt(1),
    );

    expect(resultat).toEqual({
      succes: false,
      erreur: "Stockage de fichiers non configuré : ...",
    });
    expect(createFichier).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
  });

  it("téléverse, crée le fichier puis le document avec une clé opaque", async () => {
    televerser.mockResolvedValue(undefined);
    createFichier.mockResolvedValue({ id: BigInt(10) });
    createDocument.mockResolvedValue({ id: BigInt(20) });

    const resultat = await televerserDocument(
      {
        type: "cours_pdf",
        titre: "Cours 1",
        matiere_id: "1",
        chapitre_id: "2",
        cours_id: "3",
        nom: "cours.pdf",
        type_mime: "application/pdf",
        taille: 1024,
      },
      contenu,
      BigInt(1),
    );

    expect(resultat).toEqual({ succes: true, id: "20" });
    expect(televerser).toHaveBeenCalledTimes(1);
    const appelTeleverser = televerser.mock.calls[0][0];
    expect(appelTeleverser.cle).toMatch(/^1\/2\/3\/cours_pdf-[0-9a-f]{16}\.pdf$/);
    expect(appelTeleverser.contenu).toBe(contenu);

    expect(createFichier).toHaveBeenCalledWith({
      data: {
        nom: "cours.pdf",
        cle_stockage: appelTeleverser.cle,
        type_mime: "application/pdf",
        taille: 1024,
        televerse_par: BigInt(1),
      },
    });
    expect(createDocument).toHaveBeenCalledWith({
      data: {
        type: "cours_pdf",
        titre: "Cours 1",
        matiere_id: BigInt(1),
        chapitre_id: BigInt(2),
        cours_id: BigInt(3),
        fichier_id: BigInt(10),
      },
    });
  });
});

describe("remplacerFichier", () => {
  it("refuse un fichier introuvable", async () => {
    findUniqueFichier.mockResolvedValue(null);
    const resultat = await remplacerFichier(BigInt(99), contenu, {
      nom: "nouveau.pdf",
      type_mime: "application/pdf",
      taille: 10,
    });
    expect(resultat.succes).toBe(false);
    expect(televerser).not.toHaveBeenCalled();
  });

  it("retourne une erreur normale si le stockage échoue, sans modifier le fichier", async () => {
    findUniqueFichier.mockResolvedValue({
      id: BigInt(10),
      cle_stockage: "1/2/3/cours_pdf-abc123.pdf",
      supprime_le: null,
    });
    televerser.mockRejectedValue(new Error("Stockage de fichiers non configuré : ..."));

    const resultat = await remplacerFichier(BigInt(10), contenu, {
      nom: "nouveau.pdf",
      type_mime: "application/pdf",
      taille: 2048,
    });

    expect(resultat).toEqual({
      succes: false,
      erreur: "Stockage de fichiers non configuré : ...",
    });
    expect(updateFichier).not.toHaveBeenCalled();
  });

  it("réutilise la même clé de stockage et le même identifiant de fichier", async () => {
    findUniqueFichier.mockResolvedValue({
      id: BigInt(10),
      cle_stockage: "1/2/3/cours_pdf-abc123.pdf",
      supprime_le: null,
    });
    televerser.mockResolvedValue(undefined);
    updateFichier.mockResolvedValue({ id: BigInt(10) });

    const resultat = await remplacerFichier(BigInt(10), contenu, {
      nom: "nouveau.pdf",
      type_mime: "application/pdf",
      taille: 2048,
    });

    expect(resultat).toEqual({ succes: true, id: "10" });
    expect(televerser).toHaveBeenCalledWith({
      cle: "1/2/3/cours_pdf-abc123.pdf",
      contenu,
      typeMime: "application/pdf",
    });
    expect(updateFichier).toHaveBeenCalledWith({
      where: { id: BigInt(10) },
      data: { nom: "nouveau.pdf", type_mime: "application/pdf", taille: 2048 },
    });
  });
});

describe("listerMediatheque", () => {
  it("exclut les fichiers supprimés sans filtre de recherche", async () => {
    findManyFichier.mockResolvedValue([]);
    await listerMediatheque();
    expect(findManyFichier).toHaveBeenCalledWith({
      where: { supprime_le: null },
      orderBy: { cree_le: "desc" },
    });
  });

  it("filtre par nom quand une recherche est fournie", async () => {
    findManyFichier.mockResolvedValue([]);
    await listerMediatheque("cours");
    expect(findManyFichier).toHaveBeenCalledWith({
      where: { supprime_le: null, nom: { contains: "cours", mode: "insensitive" } },
      orderBy: { cree_le: "desc" },
    });
  });
});

describe("listerDocumentsCours", () => {
  it("filtre par cours et inclut le fichier", async () => {
    findManyDocument.mockResolvedValue([]);
    await listerDocumentsCours(BigInt(3));
    expect(findManyDocument).toHaveBeenCalledWith({
      where: { cours_id: BigInt(3), supprime_le: null },
      include: { fichier: true },
    });
  });
});

describe("supprimerDocument", () => {
  it("renseigne supprime_le sans toucher au fichier", async () => {
    updateDocument.mockResolvedValue(undefined);
    await supprimerDocument(BigInt(20));
    expect(updateDocument).toHaveBeenCalledWith({
      where: { id: BigInt(20) },
      data: { supprime_le: expect.any(Date) },
    });
    expect(updateFichier).not.toHaveBeenCalled();
  });
});
