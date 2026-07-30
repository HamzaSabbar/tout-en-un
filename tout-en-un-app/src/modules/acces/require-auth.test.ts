import { describe, expect, it, vi, beforeEach } from "vitest";

const getCurrentUser = vi.fn();
const redirectMock = vi.fn();

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
}));

// Le vrai redirect() de Next.js interrompt le rendu en lançant une exception
// spéciale. On reproduit ce comportement plutôt qu'un mock inerte, sinon le
// code testé continue après l'appel comme si de rien n'était.
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    redirectMock(...args);
    throw new Error(`REDIRECT:${args[0]}`);
  },
}));

import { requireAuth, requirePermission } from "@/modules/acces/require-auth";
import type { UtilisateurSafe } from "@/lib/auth/current-user";
import type { Role } from "@/generated/prisma";

function utilisateurFactice(role: Role): UtilisateurSafe {
  return {
    id: "1",
    nom: "Alami",
    prenom: "Sara",
    email: "sara@example.com",
    role,
  };
}

describe("requireAuth", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    redirectMock.mockReset();
  });

  it("redirige vers la connexion si aucun utilisateur n'est authentifié", async () => {
    getCurrentUser.mockResolvedValue(null);

    await expect(requireAuth()).rejects.toThrow("REDIRECT:/connexion");

    expect(redirectMock).toHaveBeenCalledWith("/connexion");
  });

  it("retourne l'utilisateur sans redirection s'il est authentifié", async () => {
    const utilisateur = utilisateurFactice("eleve");
    getCurrentUser.mockResolvedValue(utilisateur);

    const resultat = await requireAuth();

    expect(resultat).toEqual(utilisateur);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("requirePermission", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    redirectMock.mockReset();
  });

  it("redirige un utilisateur non authentifié", async () => {
    getCurrentUser.mockResolvedValue(null);

    await expect(requirePermission("contenu:gerer")).rejects.toThrow(
      "REDIRECT:/connexion",
    );

    expect(redirectMock).toHaveBeenCalledWith("/connexion");
  });

  it("redirige un élève qui n'a pas la permission demandée", async () => {
    getCurrentUser.mockResolvedValue(utilisateurFactice("eleve"));

    await expect(requirePermission("contenu:gerer")).rejects.toThrow(
      "REDIRECT:/connexion",
    );

    expect(redirectMock).toHaveBeenCalledWith("/connexion");
  });

  it("laisse passer un professeur autorisé sur le contenu", async () => {
    const utilisateur = utilisateurFactice("professeur");
    getCurrentUser.mockResolvedValue(utilisateur);

    const resultat = await requirePermission("contenu:gerer");

    expect(resultat).toEqual(utilisateur);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("refuse un professeur sur une permission réservée aux abonnements", async () => {
    getCurrentUser.mockResolvedValue(utilisateurFactice("professeur"));

    await expect(requirePermission("abonnements:gerer")).rejects.toThrow(
      "REDIRECT:/connexion",
    );

    expect(redirectMock).toHaveBeenCalledWith("/connexion");
  });

  it("laisse passer un commercial autorisé sur les abonnements", async () => {
    const utilisateur = utilisateurFactice("commercial");
    getCurrentUser.mockResolvedValue(utilisateur);

    const resultat = await requirePermission("abonnements:gerer");

    expect(resultat).toEqual(utilisateur);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("laisse passer un admin sur n'importe quelle permission", async () => {
    const utilisateur = utilisateurFactice("admin");
    getCurrentUser.mockResolvedValue(utilisateur);

    const resultat = await requirePermission("abonnements:gerer");

    expect(resultat).toEqual(utilisateur);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
