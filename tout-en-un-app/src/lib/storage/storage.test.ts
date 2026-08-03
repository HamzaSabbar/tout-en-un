import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { APP_URL: "http://localhost:3000" },
}));

import { storageService } from "@/lib/storage/storage";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sélection de l'adaptateur de stockage", () => {
  // Sans bucket configuré, une production doit se plaindre plutôt que d'écrire
  // sur un disque éphémère. C'est le seul cas où le stockage refuse de servir.
  it("échoue avec un message clair en production sans configuration Supabase", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      storageService.televerser({
        cle: "x",
        contenu: Buffer.from(""),
        typeMime: "application/pdf",
      }),
    ).rejects.toThrow(/SUPABASE_STORAGE_URL/);
    await expect(storageService.genererUrlSignee("x", 600)).rejects.toThrow(
      /SUPABASE_STORAGE_URL/,
    );
    await expect(storageService.supprimer("x")).rejects.toThrow(/SUPABASE_STORAGE_URL/);
  });

  it("bascule sur le stockage local hors production", async () => {
    // NODE_ENV vaut « test » sous vitest : c'est déjà le cas nominal.
    await expect(
      storageService.genererUrlSignee("1/2/3/cours_pdf-0123456789abcdef.pdf", 600),
    ).resolves.toMatch(
      /^http:\/\/localhost:3000\/api\/stockage-local\/1\/2\/3\/cours_pdf-0123456789abcdef\.pdf\?/,
    );
  });

  it("n'accepte le stockage local en production que sur dérogation explicite", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STOCKAGE_LOCAL_AUTORISE", "oui");

    await expect(
      storageService.genererUrlSignee("1/2/3/cours_pdf-0123456789abcdef.pdf", 600),
    ).resolves.toContain("/api/stockage-local/");
  });

  it("ignore une dérogation mal orthographiée", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STOCKAGE_LOCAL_AUTORISE", "true");

    await expect(storageService.genererUrlSignee("1/2/3/x.pdf", 600)).rejects.toThrow(
      /SUPABASE_STORAGE_URL/,
    );
  });
});
