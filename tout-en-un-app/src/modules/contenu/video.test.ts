import { describe, expect, it, vi, beforeEach } from "vitest";

const create = vi.fn();
const update = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    video: {
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

import {
  creerVideo,
  depublierVideo,
  listerVideos,
  modifierVideo,
  publierVideo,
  supprimerVideo,
} from "@/modules/contenu/video";

beforeEach(() => {
  create.mockReset();
  update.mockReset();
  findMany.mockReset();
});

describe("creerVideo", () => {
  it("refuse un formulaire invalide", async () => {
    const resultat = await creerVideo({ cours_id: "1", titre: "" });
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("crée une vidéo valide", async () => {
    create.mockResolvedValue({ id: BigInt(1) });
    const resultat = await creerVideo({
      cours_id: "1",
      titre: "Introduction",
      fournisseur: "youtube",
      video_ref: "abc123",
    });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });

  it("refuse une URL complète à la place d'une référence neutre", async () => {
    const resultat = await creerVideo({
      cours_id: "1",
      titre: "Introduction",
      fournisseur: "youtube",
      video_ref: "https://youtube.com/watch?v=abc123",
    });
    expect(resultat.succes).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("modifierVideo", () => {
  it("modifie une vidéo existante", async () => {
    update.mockResolvedValue({ id: BigInt(1) });
    const resultat = await modifierVideo(BigInt(1), { titre: "Nouveau titre" });
    expect(resultat).toEqual({ succes: true, id: "1" });
  });
});

describe("listerVideos", () => {
  it("filtre par cours et exclut les vidéos supprimées", async () => {
    findMany.mockResolvedValue([]);
    await listerVideos(BigInt(1));
    expect(findMany).toHaveBeenCalledWith({
      where: { cours_id: BigInt(1), supprime_le: null },
      orderBy: { ordre: "asc" },
    });
  });
});

describe("publication et suppression", () => {
  it("publierVideo passe le statut à publie", async () => {
    update.mockResolvedValue(undefined);
    await publierVideo(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { statut: "publie" },
    });
  });

  it("depublierVideo repasse le statut à brouillon", async () => {
    update.mockResolvedValue(undefined);
    await depublierVideo(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { statut: "brouillon" },
    });
  });

  it("supprimerVideo renseigne supprime_le", async () => {
    update.mockResolvedValue(undefined);
    await supprimerVideo(BigInt(1));
    expect(update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { supprime_le: expect.any(Date) },
    });
  });
});
