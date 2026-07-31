import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// base-test.ts importe le client Prisma au chargement : on ne veut ni connexion
// ni validation d'environnement pour tester la garde elle-même.
vi.mock("@/lib/db", () => ({ prisma: {} }));

import { exigerBaseDeTest } from "./base-test";

const ENV_INITIAL = { ...process.env };

beforeEach(() => {
  delete process.env.E2E_BASE_DISTANTE_AUTORISEE;
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

  it("refuse une base Supabase distante", () => {
    process.env.DATABASE_URL =
      "postgresql://postgres.abcdef:motdepasse@aws-0-eu-north-1.pooler.supabase.com:6543/postgres";
    expect(() => exigerBaseDeTest()).toThrow(/refusent de tourner sur la base distante/);
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

  it("laisse passer une base distante seulement sur dérogation explicite", () => {
    process.env.DATABASE_URL =
      "postgresql://postgres:motdepasse@aws-0-eu-north-1.pooler.supabase.com:6543/postgres";
    process.env.E2E_BASE_DISTANTE_AUTORISEE = "oui";
    const avertissement = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => exigerBaseDeTest()).not.toThrow();
    expect(avertissement).toHaveBeenCalledTimes(1);
  });

  it("ignore une dérogation mal orthographiée", () => {
    process.env.DATABASE_URL =
      "postgresql://postgres:motdepasse@aws-0-eu-north-1.pooler.supabase.com:6543/postgres";
    process.env.E2E_BASE_DISTANTE_AUTORISEE = "true";
    expect(() => exigerBaseDeTest()).toThrow(/refusent de tourner sur la base distante/);
  });
});
