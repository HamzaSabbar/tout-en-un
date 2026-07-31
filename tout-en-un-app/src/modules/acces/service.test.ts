import { describe, expect, it, vi, beforeEach } from "vitest";

const findUniqueUtilisateur = vi.fn();
const updateUtilisateur = vi.fn();
const createUtilisateur = vi.fn();
const findFirstFiliere = vi.fn();
const createJeton = vi.fn();
const findUniqueJeton = vi.fn();
const updateJeton = vi.fn();
const updateManySession = vi.fn();
const transaction = vi.fn();
const envoyerEmail = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    utilisateur: {
      findUnique: (...args: unknown[]) => findUniqueUtilisateur(...args),
      update: (...args: unknown[]) => updateUtilisateur(...args),
      create: (...args: unknown[]) => createUtilisateur(...args),
    },
    filiere: {
      findFirst: (...args: unknown[]) => findFirstFiliere(...args),
    },
    jetonReinitialisation: {
      create: (...args: unknown[]) => createJeton(...args),
      findUnique: (...args: unknown[]) => findUniqueJeton(...args),
      update: (...args: unknown[]) => updateJeton(...args),
    },
    sessionUtilisateur: {
      updateMany: (...args: unknown[]) => updateManySession(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

vi.mock("@/lib/mail/mailer", () => ({
  envoyerEmail: (...args: unknown[]) => envoyerEmail(...args),
}));

vi.mock("@/lib/env", () => ({
  env: { APP_URL: "http://localhost:3000" },
}));

import {
  demanderReinitialisation,
  register,
  reinitialiserMotDePasse,
} from "@/modules/acces/service";

const INSCRIPTION_SANS_FILIERE = {
  nom: "Alami",
  prenom: "Sara",
  email: "sara@example.com",
  telephone: "0612345678",
  mot_de_passe: "mot-de-passe-long",
};

const INSCRIPTION = { ...INSCRIPTION_SANS_FILIERE, filiere_id: "2" };

describe("register", () => {
  beforeEach(() => {
    findFirstFiliere.mockReset();
    createUtilisateur.mockReset();
    findFirstFiliere.mockResolvedValue({ id: BigInt(2) });
    createUtilisateur.mockResolvedValue({ id: BigInt(1) });
  });

  it("refuse une inscription sans filière", async () => {
    const resultat = await register(INSCRIPTION_SANS_FILIERE);

    expect(resultat).toEqual({ succes: false, erreur: "Formulaire invalide." });
    expect(createUtilisateur).not.toHaveBeenCalled();
  });

  it("refuse une filière inexistante ou désactivée", async () => {
    findFirstFiliere.mockResolvedValue(null);

    const resultat = await register(INSCRIPTION);

    expect(resultat).toEqual({ succes: false, erreur: "Filière invalide." });
    expect(createUtilisateur).not.toHaveBeenCalled();
  });

  it("rattache le compte créé à la filière choisie", async () => {
    const resultat = await register(INSCRIPTION);

    expect(resultat).toEqual({ succes: true, id: "1" });
    expect(findFirstFiliere).toHaveBeenCalledWith({
      where: { id: BigInt(2), actif: true },
      select: { id: true },
    });
    expect(createUtilisateur.mock.calls[0][0].data).toMatchObject({
      filiere_id: BigInt(2),
      role: "eleve",
    });
  });
});

function jetonFactice(
  overrides: Partial<{
    utilise_le: Date | null;
    expire_le: Date;
  }> = {},
) {
  return {
    id: BigInt(1),
    utilisateur_id: BigInt(1),
    jeton_hash: "peu-importe",
    expire_le: overrides.expire_le ?? new Date(Date.now() + 30 * 60 * 1000),
    utilise_le: overrides.utilise_le ?? null,
    cree_le: new Date(),
  };
}

describe("demanderReinitialisation", () => {
  beforeEach(() => {
    findUniqueUtilisateur.mockReset();
    createJeton.mockReset();
    envoyerEmail.mockReset();
  });

  it("ne crée aucun jeton si le compte n'existe pas", async () => {
    findUniqueUtilisateur.mockResolvedValue(null);

    await demanderReinitialisation({ email: "inconnu@example.com" });

    expect(createJeton).not.toHaveBeenCalled();
    expect(envoyerEmail).not.toHaveBeenCalled();
  });

  it("ne crée aucun jeton si le compte est inactif", async () => {
    findUniqueUtilisateur.mockResolvedValue({
      id: BigInt(1),
      email: "sara@example.com",
      actif: false,
    });

    await demanderReinitialisation({ email: "sara@example.com" });

    expect(createJeton).not.toHaveBeenCalled();
    expect(envoyerEmail).not.toHaveBeenCalled();
  });

  it("crée un jeton valable une heure et envoie un email pour un compte actif", async () => {
    findUniqueUtilisateur.mockResolvedValue({
      id: BigInt(1),
      email: "sara@example.com",
      actif: true,
    });
    createJeton.mockResolvedValue(undefined);
    envoyerEmail.mockResolvedValue(undefined);

    const avant = Date.now();
    await demanderReinitialisation({ email: "sara@example.com" });

    expect(createJeton).toHaveBeenCalledTimes(1);
    const donneesCreation = createJeton.mock.calls[0][0].data;
    expect(donneesCreation.utilisateur_id).toBe(BigInt(1));
    const dureeMs = donneesCreation.expire_le.getTime() - avant;
    expect(dureeMs).toBeGreaterThan(59 * 60 * 1000);
    expect(dureeMs).toBeLessThanOrEqual(60 * 60 * 1000 + 5000);

    expect(envoyerEmail).toHaveBeenCalledTimes(1);
    const email = envoyerEmail.mock.calls[0][0];
    expect(email.destinataire).toBe("sara@example.com");
    expect(email.corps).toContain("/reinitialiser-mot-de-passe?jeton=");
  });
});

describe("reinitialiserMotDePasse", () => {
  beforeEach(() => {
    findUniqueJeton.mockReset();
    updateUtilisateur.mockReset();
    updateJeton.mockReset();
    updateManySession.mockReset();
    transaction.mockReset();
    transaction.mockResolvedValue(undefined);
  });

  it("refuse un jeton inconnu", async () => {
    findUniqueJeton.mockResolvedValue(null);

    const resultat = await reinitialiserMotDePasse({
      jeton: "jeton-inexistant",
      mot_de_passe: "nouveau-mot-de-passe-123",
    });

    expect(resultat.succes).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuse un jeton expiré", async () => {
    findUniqueJeton.mockResolvedValue(
      jetonFactice({ expire_le: new Date(Date.now() - 1000) }),
    );

    const resultat = await reinitialiserMotDePasse({
      jeton: "jeton-expire",
      mot_de_passe: "nouveau-mot-de-passe-123",
    });

    expect(resultat.succes).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuse un jeton déjà utilisé", async () => {
    findUniqueJeton.mockResolvedValue(
      jetonFactice({ utilise_le: new Date() }),
    );

    const resultat = await reinitialiserMotDePasse({
      jeton: "jeton-deja-utilise",
      mot_de_passe: "nouveau-mot-de-passe-123",
    });

    expect(resultat.succes).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("met à jour le mot de passe, marque le jeton utilisé et révoque les sessions pour un jeton valide", async () => {
    findUniqueJeton.mockResolvedValue(jetonFactice());
    updateUtilisateur.mockResolvedValue(undefined);
    updateJeton.mockResolvedValue(undefined);
    updateManySession.mockResolvedValue(undefined);

    const resultat = await reinitialiserMotDePasse({
      jeton: "jeton-valide",
      mot_de_passe: "nouveau-mot-de-passe-123",
    });

    expect(resultat.succes).toBe(true);
    expect(updateUtilisateur).toHaveBeenCalledTimes(1);
    expect(updateUtilisateur.mock.calls[0][0].where).toEqual({
      id: BigInt(1),
    });
    expect(updateJeton).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { utilise_le: expect.any(Date) },
    });
    expect(updateManySession).toHaveBeenCalledWith({
      where: { utilisateur_id: BigInt(1) },
      data: { revoquee: true },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
