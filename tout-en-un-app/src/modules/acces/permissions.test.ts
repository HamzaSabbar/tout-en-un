import { describe, expect, it } from "vitest";
import { hasPermission } from "@/modules/acces/permissions";

describe("hasPermission", () => {
  it("un admin a toutes les permissions", () => {
    expect(hasPermission("admin", "contenu:gerer")).toBe(true);
    expect(hasPermission("admin", "abonnements:gerer")).toBe(true);
  });

  it("un élève n'a aucune permission de back-office", () => {
    expect(hasPermission("eleve", "contenu:gerer")).toBe(false);
  });

  it("un professeur gère le contenu mais pas les abonnements", () => {
    expect(hasPermission("professeur", "contenu:gerer")).toBe(true);
    expect(hasPermission("professeur", "abonnements:gerer")).toBe(false);
  });

  it("le support répond aux questions mais ne gère pas le contenu", () => {
    expect(hasPermission("support", "support:repondre")).toBe(true);
    expect(hasPermission("support", "contenu:gerer")).toBe(false);
  });

  it("le commercial gère les abonnements mais pas le contenu", () => {
    expect(hasPermission("commercial", "abonnements:gerer")).toBe(true);
    expect(hasPermission("commercial", "contenu:gerer")).toBe(false);
  });
});
