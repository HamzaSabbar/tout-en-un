import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword / verifyPassword", () => {
  it("vérifie un mot de passe correct après hachage", async () => {
    const hash = await hashPassword("mot-de-passe-super-secret");
    await expect(verifyPassword(hash, "mot-de-passe-super-secret")).resolves.toBe(
      true,
    );
  });

  it("rejette un mot de passe incorrect", async () => {
    const hash = await hashPassword("mot-de-passe-super-secret");
    await expect(verifyPassword(hash, "autre-mot-de-passe")).resolves.toBe(
      false,
    );
  });

  it("produit un hash différent à chaque appel (sel aléatoire)", async () => {
    const hash1 = await hashPassword("mot-de-passe-super-secret");
    const hash2 = await hashPassword("mot-de-passe-super-secret");
    expect(hash1).not.toBe(hash2);
  });
});
