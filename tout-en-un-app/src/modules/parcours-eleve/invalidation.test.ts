import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
}));

import {
  invaliderChapitre,
  invaliderCours,
  invaliderMatiere,
} from "@/modules/parcours-eleve/invalidation";

beforeEach(() => revalidateTag.mockReset());

describe("invalidation ciblée du parcours élève", () => {
  it("invalide une matière seule", () => {
    invaliderMatiere(BigInt(1));
    expect(revalidateTag).toHaveBeenCalledWith("matiere:1");
  });

  it("remonte du cours à toute sa structure parente", () => {
    invaliderCours(BigInt(1), BigInt(2), BigInt(3));
    expect(revalidateTag.mock.calls).toEqual([
      ["matiere:1"],
      ["chapitre:2"],
      ["cours:3"],
    ]);
  });

  it("remonte du chapitre à sa matière", () => {
    invaliderChapitre(BigInt(1), BigInt(2));
    expect(revalidateTag.mock.calls).toEqual([["matiere:1"], ["chapitre:2"]]);
  });
});
