import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const validateSessionToken = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  validateSessionToken: (...args: unknown[]) => validateSessionToken(...args),
}));

import { middleware } from "@/middleware";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

// Défense en profondeur sur les préfixes du back-office : le middleware
// attrape la route qu'une page oublierait de protéger elle-même via
// requirePermission(). Ce test prouve les trois cas, indépendamment des
// pages : sans session, avec une session sans permission admin, avec une
// session admin.

const SESSION_ADMIN = {
  utilisateurId: BigInt(1),
  nom: "Admin",
  prenom: "Test",
  email: "admin@test.local",
  role: "admin",
};
const SESSION_ELEVE = {
  utilisateurId: BigInt(2),
  nom: "Eleve",
  prenom: "Test",
  email: "eleve@test.local",
  role: "eleve",
};

function requete(pathname: string, token?: string): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  const headers = token ? { cookie: `${SESSION_COOKIE_NAME}=${token}` } : undefined;
  return new NextRequest(url, { headers });
}

beforeEach(() => {
  validateSessionToken.mockReset();
});

describe("middleware — garde du back-office", () => {
  it("redirige vers /connexion une requête sans cookie de session", async () => {
    const reponse = await middleware(requete("/contenu/matieres"));
    expect(reponse.status).toBe(307);
    expect(reponse.headers.get("location")).toBe("http://localhost:3000/connexion");
    // Pas de jeton du tout : inutile d'appeler la base pour le savoir.
    expect(validateSessionToken).not.toHaveBeenCalled();
  });

  it("redirige un élève authentifié, sans permission admin", async () => {
    validateSessionToken.mockResolvedValue(SESSION_ELEVE);
    const reponse = await middleware(requete("/contenu/matieres", "un-jeton"));
    expect(reponse.status).toBe(307);
    expect(reponse.headers.get("location")).toBe("http://localhost:3000/connexion");
  });

  it("laisse passer un admin authentifié", async () => {
    validateSessionToken.mockResolvedValue(SESSION_ADMIN);
    const reponse = await middleware(requete("/contenu/matieres", "un-jeton"));
    expect(reponse.status).not.toBe(307);
  });

  it("laisse passer /abonnements et /parametres pour un admin, comme /contenu", async () => {
    validateSessionToken.mockResolvedValue(SESSION_ADMIN);
    for (const chemin of ["/abonnements/eleves", "/parametres"]) {
      const reponse = await middleware(requete(chemin, "un-jeton"));
      expect(reponse.status, chemin).not.toBe(307);
    }
  });

  it("ne touche pas aux routes hors back-office, même sans session", async () => {
    const reponse = await middleware(requete("/matieres"));
    expect(reponse.status).not.toBe(307);
    expect(validateSessionToken).not.toHaveBeenCalled();
  });

  it("ne redirige pas une session invalide/expirée hors back-office (comportement inchangé)", async () => {
    validateSessionToken.mockResolvedValue(null);
    const reponse = await middleware(requete("/compte", "un-jeton-expire"));
    expect(reponse.status).not.toBe(307);
    // Hors préfixe admin, le middleware ne consulte pas la session : seule
    // requireAuth(), côté page, la revalide.
    expect(validateSessionToken).not.toHaveBeenCalled();
  });
});
