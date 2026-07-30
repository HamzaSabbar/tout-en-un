import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { APP_URL: "http://localhost:3000" },
}));

import { storageService } from "@/lib/storage/storage";

describe("storageService sans configuration", () => {
  it("televerser échoue avec un message clair", async () => {
    await expect(
      storageService.televerser({
        cle: "x",
        contenu: Buffer.from(""),
        typeMime: "application/pdf",
      }),
    ).rejects.toThrow(/SUPABASE_STORAGE_URL/);
  });

  it("genererUrlSignee échoue avec un message clair", async () => {
    await expect(storageService.genererUrlSignee("x", 600)).rejects.toThrow(
      /SUPABASE_STORAGE_URL/,
    );
  });

  it("supprimer échoue avec un message clair", async () => {
    await expect(storageService.supprimer("x")).rejects.toThrow(/SUPABASE_STORAGE_URL/);
  });
});
