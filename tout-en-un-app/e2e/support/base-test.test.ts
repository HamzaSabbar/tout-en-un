import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// base-test.ts importe le client Prisma au chargement : on ne veut ni connexion
// ni validation d'environnement pour tester la garde elle-même.
vi.mock("@/lib/db", () => ({ prisma: {} }));

import { exigerBaseDeTest } from "./base-test";

const ENV_INITIAL = { ...process.env };

const HOTE_DISTANT = "aws-0-eu-north-1.pooler.supabase.com";
const URL_DISTANTE = `postgresql://postgres:motdepasse@${HOTE_DISTANT}:6543/postgres`;

beforeEach(() => {
  delete process.env.E2E_BASE_DISTANTE_AUTORISEE;
  delete process.env.E2E_CONFIRMER_HOTE;
});

afterEach(() => {
  process.env = { ...ENV_INITIAL };
  vi.restoreAllMocks();
});

describe("exigerBaseDeTest", () => {
  it.each([
    "postgresql://postgres:postgres@localhost:5432/postgres",
    "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    // Nom du service dans un réseau de conteneurs.
    "postgresql://postgres:postgres@postgres:5432/postgres",
  ])("accepte une base locale ou éphémère (%s)", (url) => {
    process.env.DATABASE_URL = url;
    expect(() => exigerBaseDeTest()).not.toThrow();
  });

  it("refuse une base Supabase distante par défaut", () => {
    process.env.DATABASE_URL = URL_DISTANTE;
    expect(() => exigerBaseDeTest()).toThrow(/refusent de tourner sur la base distante/);
  });

  it("indique les deux confirmations manquantes", () => {
    process.env.DATABASE_URL = URL_DISTANTE;
    let message = "";
    try {
      exigerBaseDeTest();
    } catch (erreur) {
      message = (erreur as Error).message;
    }
    expect(message).toContain("il en manque 2");
    expect(message).toContain("E2E_BASE_DISTANTE_AUTORISEE=oui");
    expect(message).toContain(`E2E_CONFIRMER_HOTE=${HOTE_DISTANT}`);
  });

  it("cite l'hôte refusé sans divulguer les identifiants", () => {
    process.env.DATABASE_URL =
      "postgresql://postgres.abcdef:motdepasse-secret@db.exemple.com:5432/postgres";
    let message = "";
    try {
      exigerBaseDeTest();
    } catch (erreur) {
      message = (erreur as Error).message;
    }
    expect(message).toContain("db.exemple.com");
    expect(message).not.toContain("motdepasse-secret");
  });

  it("refuse une DATABASE_URL absente", () => {
    delete process.env.DATABASE_URL;
    expect(() => exigerBaseDeTest()).toThrow(/DATABASE_URL est absent/);
  });

  it("refuse la première confirmation seule", () => {
    process.env.DATABASE_URL = URL_DISTANTE;
    process.env.E2E_BASE_DISTANTE_AUTORISEE = "oui";
    expect(() => exigerBaseDeTest()).toThrow(/il en manque 1/);
  });

  it("refuse la seconde confirmation seule", () => {
    process.env.DATABASE_URL = URL_DISTANTE;
    process.env.E2E_CONFIRMER_HOTE = HOTE_DISTANT;
    expect(() => exigerBaseDeTest()).toThrow(/il en manque 1/);
  });

  it("refuse une seconde confirmation qui nomme un autre hôte", () => {
    process.env.DATABASE_URL = URL_DISTANTE;
    process.env.E2E_BASE_DISTANTE_AUTORISEE = "oui";
    process.env.E2E_CONFIRMER_HOTE = "db.autre-projet.com";
    expect(() => exigerBaseDeTest()).toThrow(/refusent de tourner sur la base distante/);
  });

  it("laisse passer sur double confirmation nommant l'hôte visé", () => {
    process.env.DATABASE_URL = URL_DISTANTE;
    process.env.E2E_BASE_DISTANTE_AUTORISEE = "oui";
    process.env.E2E_CONFIRMER_HOTE = HOTE_DISTANT;
    const avertissement = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => exigerBaseDeTest()).not.toThrow();
    expect(avertissement).toHaveBeenCalledTimes(1);
  });

  it("ignore une première confirmation mal orthographiée", () => {
    process.env.DATABASE_URL = URL_DISTANTE;
    process.env.E2E_BASE_DISTANTE_AUTORISEE = "true";
    process.env.E2E_CONFIRMER_HOTE = HOTE_DISTANT;
    expect(() => exigerBaseDeTest()).toThrow(/refusent de tourner sur la base distante/);
  });

  it("n'exige aucune confirmation pour une base locale", () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";
    const avertissement = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => exigerBaseDeTest()).not.toThrow();
    expect(avertissement).not.toHaveBeenCalled();
  });
});
