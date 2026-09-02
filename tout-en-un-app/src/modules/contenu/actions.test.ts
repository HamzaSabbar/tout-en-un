import { describe, expect, it, vi, beforeEach } from "vitest";

const requirePermission = vi.fn();
const listerChapitres = vi.fn();
const reordonnerChapitres = vi.fn();
const listerParties = vi.fn();
const reordonnerParties = vi.fn();
const invaliderMatiere = vi.fn();

vi.mock("@/modules/acces/require-auth", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));
vi.mock("@/modules/contenu/filiere", () => ({}));
vi.mock("@/modules/contenu/matiere", () => ({}));
vi.mock("@/modules/contenu/chapitre", () => ({
  listerChapitres: (...args: unknown[]) => listerChapitres(...args),
  reordonnerChapitres: (...args: unknown[]) => reordonnerChapitres(...args),
}));
vi.mock("@/modules/contenu/partie", () => ({
  listerParties: (...args: unknown[]) => listerParties(...args),
  reordonnerParties: (...args: unknown[]) => reordonnerParties(...args),
}));
vi.mock("@/modules/contenu/cours", () => ({}));
vi.mock("@/modules/contenu/video", () => ({}));
vi.mock("@/modules/contenu/document", () => ({}));
vi.mock("@/modules/contenu/extrait-national", () => ({}));
vi.mock("@/modules/contenu/examen-national", () => ({}));
vi.mock("@/modules/contenu/parametre", () => ({}));
vi.mock("@/modules/test/service", () => ({}));
vi.mock("@/modules/exercice/service", () => ({}));
vi.mock("@/modules/parcours-eleve/invalidation", () => ({
  invaliderChapitre: vi.fn(),
  invaliderCours: vi.fn(),
  invaliderExamensNationaux: vi.fn(),
  invaliderMatiere: (...args: unknown[]) => invaliderMatiere(...args),
}));

import { deplacerChapitreAction, deplacerPartieAction } from "@/modules/contenu/actions";

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [cle, valeur] of Object.entries(entries)) fd.set(cle, valeur);
  return fd;
}

beforeEach(() => {
  requirePermission.mockReset();
  requirePermission.mockResolvedValue({ id: "1", role: "admin" });
  listerChapitres.mockReset();
  reordonnerChapitres.mockReset();
  listerParties.mockReset();
  reordonnerParties.mockReset();
  invaliderMatiere.mockReset();
});

describe("deplacerChapitreAction", () => {
  // Régression : avant le correctif, le déplacement recalculait la position
  // dans TOUTE la liste de la matière, ce qui pouvait faire sauter un chapitre
  // d'une partie à l'autre en cliquant « monter »/« descendre ».
  it("ne déplace un chapitre qu'à l'intérieur de sa propre partie", async () => {
    listerChapitres.mockResolvedValue([
      { id: BigInt(1), partie_id: BigInt(10) },
      { id: BigInt(2), partie_id: BigInt(10) },
      { id: BigInt(3), partie_id: BigInt(20) },
      { id: BigInt(4), partie_id: BigInt(20) },
    ]);

    await deplacerChapitreAction(
      formData({ matiere_id: "1", chapitre_id: "1", direction: "descendre" }),
    );

    // Chapitre 1 (partie 10) descend : seuls les ids de la partie 10 doivent
    // être passés à reordonnerChapitres, jamais ceux de la partie 20.
    expect(reordonnerChapitres).toHaveBeenCalledWith([BigInt(2), BigInt(1)]);
  });

  it("scope aussi le groupe « sans partie » (partie_id null)", async () => {
    listerChapitres.mockResolvedValue([
      { id: BigInt(1), partie_id: null },
      { id: BigInt(2), partie_id: null },
      { id: BigInt(3), partie_id: BigInt(20) },
    ]);

    await deplacerChapitreAction(
      formData({ matiere_id: "1", chapitre_id: "1", direction: "descendre" }),
    );

    expect(reordonnerChapitres).toHaveBeenCalledWith([BigInt(2), BigInt(1)]);
  });

  it("ne fait rien si le chapitre est déjà en tête de sa partie", async () => {
    listerChapitres.mockResolvedValue([
      { id: BigInt(1), partie_id: BigInt(10) },
      { id: BigInt(2), partie_id: BigInt(10) },
    ]);

    await deplacerChapitreAction(
      formData({ matiere_id: "1", chapitre_id: "1", direction: "monter" }),
    );

    expect(reordonnerChapitres).not.toHaveBeenCalled();
    expect(invaliderMatiere).not.toHaveBeenCalled();
  });
});

describe("deplacerPartieAction", () => {
  it("échange la position de deux parties adjacentes", async () => {
    listerParties.mockResolvedValue([{ id: BigInt(10) }, { id: BigInt(20) }]);

    await deplacerPartieAction(formData({ matiere_id: "1", partie_id: "10", direction: "descendre" }));

    expect(reordonnerParties).toHaveBeenCalledWith([BigInt(20), BigInt(10)]);
    expect(invaliderMatiere).toHaveBeenCalledWith(BigInt(1));
  });
});
