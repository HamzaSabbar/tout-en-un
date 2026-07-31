import { describe, expect, it } from "vitest";
import { analyserIdentifiant } from "@/lib/identifiant";

describe("analyserIdentifiant", () => {
  it("accepte un entier positif", () => {
    expect(analyserIdentifiant("42")).toBe(BigInt(42));
  });

  it.each([
    ["texte", "abc"],
    ["hexadécimal", "0x10"],
    ["chaîne vide", ""],
    ["espaces", " 12 "],
    ["négatif", "-5"],
    ["décimal", "1.5"],
    ["zéro", "0"],
    ["au-delà de int8", "9223372036854775808"],
  ])("refuse un identifiant %s", (_libelle, valeur) => {
    expect(analyserIdentifiant(valeur)).toBeNull();
  });

  it.each([undefined, null, 42, {}])("refuse une valeur non textuelle", (valeur) => {
    expect(analyserIdentifiant(valeur)).toBeNull();
  });

  it("accepte la borne haute de int8", () => {
    expect(analyserIdentifiant("9223372036854775807")).toBe(
      BigInt("9223372036854775807"),
    );
  });
});
