import { describe, expect, it, vi, beforeEach } from "vitest";
import { validateSessionToken, hashSessionToken } from "@/lib/auth/session";

const findUnique = vi.fn();
const update = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    sessionUtilisateur: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

function sessionFactice(overrides: Partial<{
  revoquee: boolean;
  expire_le: Date;
  actif: boolean;
}> = {}) {
  return {
    id: BigInt(1),
    utilisateur_id: BigInt(1),
    jeton_hash: hashSessionToken("jeton-de-test"),
    appareil: null,
    ip: null,
    expire_le: overrides.expire_le ?? new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    revoquee: overrides.revoquee ?? false,
    cree_le: new Date(),
    utilisateur: {
      id: BigInt(1),
      nom: "Alami",
      prenom: "Sara",
      email: "sara@example.com",
      role: "eleve",
      actif: overrides.actif ?? true,
    },
  };
}

describe("validateSessionToken", () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
  });

  it("retourne null si la session est révoquée", async () => {
    findUnique.mockResolvedValue(sessionFactice({ revoquee: true }));
    const resultat = await validateSessionToken("jeton-de-test");
    expect(resultat).toBeNull();
  });

  it("retourne null si la session est expirée", async () => {
    findUnique.mockResolvedValue(
      sessionFactice({ expire_le: new Date(Date.now() - 1000) }),
    );
    const resultat = await validateSessionToken("jeton-de-test");
    expect(resultat).toBeNull();
  });

  it("retourne null si l'utilisateur n'est plus actif", async () => {
    findUnique.mockResolvedValue(sessionFactice({ actif: false }));
    const resultat = await validateSessionToken("jeton-de-test");
    expect(resultat).toBeNull();
  });

  it("ne prolonge pas une session encore loin de son expiration", async () => {
    findUnique.mockResolvedValue(
      sessionFactice({ expire_le: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) }),
    );
    const resultat = await validateSessionToken("jeton-de-test");
    expect(resultat).not.toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it("prolonge une session à moins de 15 jours de son expiration", async () => {
    findUnique.mockResolvedValue(
      sessionFactice({ expire_le: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }),
    );
    const resultat = await validateSessionToken("jeton-de-test");
    expect(resultat).not.toBeNull();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
