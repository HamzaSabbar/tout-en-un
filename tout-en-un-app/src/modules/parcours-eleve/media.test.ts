import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    video: { findFirst: vi.fn() },
    document: { findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/storage/storage", () => ({
  storageService: { genererUrlSignee: vi.fn() },
}));
vi.mock("@/lib/env", () => ({
  env: { APP_URL: "http://localhost:3000" },
}));

import {
  genererLecturePdf,
  verifierOrigineLectureVideo,
  verifierDroitTelechargementDocument,
} from "@/modules/parcours-eleve/media";

describe("médias du parcours élève", () => {
  it("génère une URL de lecture PDF qui expire exactement après 600 secondes", async () => {
    const genererUrlSignee = vi.fn().mockResolvedValue("https://stockage.test/signe");

    await expect(
      genererLecturePdf("matiere/chapitre/cours/cours-abc.pdf", { genererUrlSignee }),
    ).resolves.toBe("https://stockage.test/signe");
    expect(genererUrlSignee).toHaveBeenCalledOnce();
    expect(genererUrlSignee).toHaveBeenCalledWith(
      "matiere/chapitre/cours/cours-abc.pdf",
      600,
    );
  });

  it("ne confond jamais droit de lecture et droit de téléchargement", async () => {
    await expect(
      verifierDroitTelechargementDocument(BigInt(1), BigInt(2)),
    ).resolves.toBe(false);
  });

  it("ne livre une référence vidéo qu'au domaine de l'application", () => {
    expect(
      verifierOrigineLectureVideo(
        new Request("http://localhost:3000/api/video", {
          headers: { "sec-fetch-site": "same-origin" },
        }),
      ),
    ).toBe(true);
    expect(
      verifierOrigineLectureVideo(
        new Request("http://localhost:3000/api/video", {
          headers: { origin: "https://site-tiers.example" },
        }),
      ),
    ).toBe(false);
  });
});
