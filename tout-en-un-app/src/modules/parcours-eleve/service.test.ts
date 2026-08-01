import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstCours = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    matiere: { findMany: vi.fn(), findFirst: vi.fn() },
    chapitre: { findFirst: vi.fn() },
    cours: { findFirst: (...args: unknown[]) => findFirstCours(...args) },
  },
}));

import { obtenirPageCoursPubliee } from "@/modules/parcours-eleve/service";

beforeEach(() => findFirstCours.mockReset());

describe("requête agrégée de la page de cours", () => {
  it("charge toute la page en un appel et ne sélectionne aucun secret média", async () => {
    findFirstCours.mockResolvedValue({
      id: BigInt(30),
      titre: "Cinématique",
      description: null,
      chapitre: {
        id: BigInt(20),
        libelle: "Mécanique",
        matiere: { id: BigInt(10), libelle: "Physique" },
      },
      videos: [
        { id: BigInt(40), titre: "Vitesse", description: null, duree_secondes: 540 },
      ],
      documents: [{ id: BigInt(50), titre: "Cours PDF", type: "cours_pdf" }],
    });

    const resultat = await obtenirPageCoursPubliee(BigInt(10), BigInt(20), BigInt(30));

    expect(findFirstCours).toHaveBeenCalledOnce();
    const requete = findFirstCours.mock.calls[0][0];
    expect(requete.select.videos.select).not.toHaveProperty("video_ref");
    expect(requete.select.documents.select).not.toHaveProperty("fichier");
    expect(resultat).toMatchObject({
      id: "30",
      chapitre: { id: "20", matiere: { id: "10" } },
      videos: [{ id: "40" }],
      documents: [{ id: "50" }],
    });
  });

  it("filtre brouillons et suppressions dans la requête imbriquée", async () => {
    findFirstCours.mockResolvedValue(null);
    await obtenirPageCoursPubliee(BigInt(10), BigInt(20), BigInt(30));

    const requete = findFirstCours.mock.calls[0][0];
    expect(requete.where).toMatchObject({ statut: "publie", supprime_le: null });
    expect(requete.where.chapitre).toMatchObject({ statut: "publie", supprime_le: null });
    expect(requete.select.videos.where).toEqual({ statut: "publie", supprime_le: null });
    expect(requete.select.documents.where).toMatchObject({ statut: "publie", supprime_le: null });
  });
});
