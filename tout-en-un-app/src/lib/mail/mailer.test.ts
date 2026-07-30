import { describe, expect, it, vi, afterEach } from "vitest";
import { envoyerEmail } from "@/lib/mail/mailer";

describe("envoyerEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("ne journalise jamais le corps du message en production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await envoyerEmail({
      destinataire: "sara@example.com",
      sujet: "Réinitialisation de votre mot de passe",
      corps: "https://exemple.test/reinitialiser-mot-de-passe?jeton=secret-a-ne-pas-fuiter",
    });

    const sortie = spy.mock.calls.map((appel) => appel.join(" ")).join("\n");
    expect(sortie).not.toContain("secret-a-ne-pas-fuiter");
  });

  it("journalise le corps complet en dehors de la production, pour le débogage local", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await envoyerEmail({
      destinataire: "sara@example.com",
      sujet: "Réinitialisation de votre mot de passe",
      corps: "https://exemple.test/reinitialiser-mot-de-passe?jeton=secret-a-ne-pas-fuiter",
    });

    const sortie = spy.mock.calls.map((appel) => appel.join(" ")).join("\n");
    expect(sortie).toContain("secret-a-ne-pas-fuiter");
  });
});
