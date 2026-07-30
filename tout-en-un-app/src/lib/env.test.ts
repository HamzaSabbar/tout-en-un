import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const ENV_ORIGINAL = { ...process.env };

describe("validation des variables d'environnement", () => {
  beforeEach(() => {
    process.env = { ...ENV_ORIGINAL };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ENV_ORIGINAL };
  });

  it("charge l'environnement quand les variables obligatoires sont présentes", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.DIRECT_URL = "postgresql://user:pass@localhost:5432/db";

    const { env } = await import("@/lib/env");
    expect(env.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/db");
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("échoue avec un message clair si DATABASE_URL est absent", async () => {
    delete process.env.DATABASE_URL;
    process.env.DIRECT_URL = "postgresql://user:pass@localhost:5432/db";

    await expect(import("@/lib/env")).rejects.toThrow(/DATABASE_URL/);
  });

  it("échoue avec un message clair si DIRECT_URL est absent", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    delete process.env.DIRECT_URL;

    await expect(import("@/lib/env")).rejects.toThrow(/DIRECT_URL/);
  });

  it("échoue si une variable obligatoire n'est pas une URL valide", async () => {
    process.env.DATABASE_URL = "pas-une-url";
    process.env.DIRECT_URL = "postgresql://user:pass@localhost:5432/db";

    await expect(import("@/lib/env")).rejects.toThrow(/DATABASE_URL/);
  });
});
