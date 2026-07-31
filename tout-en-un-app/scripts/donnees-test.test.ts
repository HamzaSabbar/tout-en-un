import { describe, expect, it } from "vitest";
import {
  classer,
  dateEmbarquee,
  ORDRE_SUPPRESSION,
  raisonTest,
  type Entrees,
} from "./donnees-test";

const vide: Entrees = {
  filieres: [],
  matieres: [],
  chapitres: [],
  cours: [],
  videos: [],
  offres: [],
  liens: [],
};

describe("raisonTest", () => {
  it("reconnaît un code préfixé E2E", () => {
    expect(raisonTest({ id: "1", code: "E2E-F-1785498848172", libelle: "peu importe" })).toMatch(
      /code préfixé E2E/,
    );
  });

  it("reconnaît un libellé préfixé E2E", () => {
    expect(raisonTest({ id: "1", libelle: "E2E Sciences Physiques 1" })).toMatch(
      /libellé préfixé E2E/,
    );
  });

  it("reconnaît un horodatage de fixture et en donne la date", () => {
    const raison = raisonTest({ id: "1", libelle: "Physique-Chimie 1785499066202" });
    expect(raison).toContain("2026-07-31");
  });

  it("ne reconnaît pas une ligne sans marqueur", () => {
    expect(raisonTest({ id: "1", libelle: "Introduction" })).toBeNull();
    expect(raisonTest({ id: "2", code: "PC", libelle: "Physique-Chimie" })).toBeNull();
  });

  it("ne confond pas une année ni un nombre court avec un horodatage", () => {
    expect(raisonTest({ id: "1", libelle: "National 2024 session normale" })).toBeNull();
    expect(raisonTest({ id: "2", libelle: "Chapitre 12" })).toBeNull();
  });

  it("ne confond pas un nombre de 14 chiffres avec un horodatage", () => {
    expect(raisonTest({ id: "1", libelle: "Reference 17854990662021" })).toBeNull();
  });
});

describe("dateEmbarquee", () => {
  it("retourne la date du premier champ qui en porte une", () => {
    expect(dateEmbarquee(undefined, "Cours 1785499066202")).toBe("2026-07-31T11:57:46.202Z");
  });

  it("retourne null sans horodatage", () => {
    expect(dateEmbarquee("PC", "Physique-Chimie", null)).toBeNull();
  });
});

describe("classer", () => {
  it("propose la suppression d'une chaîne entièrement marquée", () => {
    const entrees: Entrees = {
      ...vide,
      filieres: [{ id: "1", code: "E2E-F-1", libelle: "E2E Sciences" }],
      matieres: [{ id: "1", code: "E2E-M-1", libelle: "Physique 1785499066202" }],
      chapitres: [{ id: "1", matiere_id: "1", libelle: "Mécanique 1785499066202" }],
      cours: [{ id: "1", chapitre_id: "1", libelle: "La dérivée 1785499066202" }],
      liens: [{ id: "1", filiere_id: "1", matiere_id: "1" }],
    };

    const { aSupprimer, aConserver } = classer(entrees);

    expect(aConserver).toEqual([]);
    expect(aSupprimer.map((v) => `${v.entite}:${v.id}`).sort()).toEqual([
      "chapitre:1",
      "cours:1",
      "filiere:1",
      "filiere_matiere:1",
      "matiere:1",
    ]);
  });

  // Le cas qui motive tout ce script : la vidéo « Introduction » n'a aucun
  // marqueur, donc son origine n'est pas établie. La conserver oblige à conserver
  // le cours qui la porte, et toute la chaîne au-dessus.
  it("conserve une vidéo sans marqueur et toute sa chaîne de parents", () => {
    const entrees: Entrees = {
      ...vide,
      filieres: [{ id: "1", code: "E2E-F-1", libelle: "E2E Sciences" }],
      matieres: [{ id: "1", code: "E2E-M-1", libelle: "Physique 1785499066202" }],
      chapitres: [{ id: "1", matiere_id: "1", libelle: "Chapitre 1785443062243" }],
      cours: [{ id: "3", chapitre_id: "1", libelle: "Cours 1785443062243" }],
      videos: [{ id: "1", cours_id: "3", libelle: "Introduction" }],
      liens: [{ id: "1", filiere_id: "1", matiere_id: "1" }],
    };

    const { aSupprimer, aConserver } = classer(entrees);

    expect(aSupprimer).toEqual([]);
    const conserves = aConserver.map((v) => `${v.entite}:${v.id}`).sort();
    expect(conserves).toEqual([
      "chapitre:1",
      "cours:3",
      "filiere:1",
      "filiere_matiere:1",
      "matiere:1",
      "video:1",
    ]);
    expect(aConserver.find((v) => v.entite === "video")?.raison).toMatch(
      /origine non établie/,
    );
    expect(aConserver.find((v) => v.entite === "cours")?.raison).toMatch(
      /porte la vidéo/,
    );
  });

  it("supprime les frères d'une ligne protégée sans la toucher", () => {
    const entrees: Entrees = {
      ...vide,
      matieres: [{ id: "1", code: "E2E-M-1", libelle: "Physique 1785499066202" }],
      chapitres: [
        { id: "1", matiere_id: "1", libelle: "Chapitre 1785443062243" },
        { id: "2", matiere_id: "1", libelle: "Mécanique 1785499329516" },
      ],
      cours: [
        { id: "3", chapitre_id: "1", libelle: "Cours 1785443062243" },
        { id: "6", chapitre_id: "2", libelle: "La dérivée 1785499329516" },
      ],
      videos: [{ id: "1", cours_id: "3", libelle: "Introduction" }],
    };

    const { aSupprimer, aConserver } = classer(entrees);

    expect(aSupprimer.map((v) => `${v.entite}:${v.id}`).sort()).toEqual([
      "chapitre:2",
      "cours:6",
    ]);
    expect(aConserver.map((v) => `${v.entite}:${v.id}`)).toContain("matiere:1");
  });

  it("conserve un lien dont les deux extrémités restent", () => {
    const entrees: Entrees = {
      ...vide,
      filieres: [{ id: "1", code: "PC", libelle: "Sciences Physiques" }],
      matieres: [{ id: "1", code: "PC-PH", libelle: "Physique-Chimie" }],
      liens: [{ id: "1", filiere_id: "1", matiere_id: "1" }],
    };

    const { aSupprimer, aConserver } = classer(entrees);

    expect(aSupprimer).toEqual([]);
    // Le lien est protégé par la matière conservée, qui protège ses liens avant
    // que la passe sur les liens ne s'exécute. Les deux motifs sont exacts ;
    // seule la conservation est garantie.
    expect(aConserver.map((v) => `${v.entite}:${v.id}`)).toContain("filiere_matiere:1");
  });

  it("conserve un lien entre deux lignes hors contenu marqué, sans parent protégé", () => {
    const entrees: Entrees = {
      ...vide,
      liens: [{ id: "9", filiere_id: "404", matiere_id: "404" }],
    };

    const { aSupprimer, aConserver } = classer(entrees);

    expect(aSupprimer).toEqual([]);
    expect(aConserver.find((v) => v.entite === "filiere_matiere")?.raison).toMatch(
      /deux extrémités sont conservées/,
    );
  });

  it("supprime un lien dont une seule extrémité part", () => {
    const entrees: Entrees = {
      ...vide,
      filieres: [{ id: "1", code: "PC", libelle: "Sciences Physiques" }],
      matieres: [{ id: "1", code: "E2E-M-1", libelle: "Physique 1785499066202" }],
      liens: [{ id: "1", filiere_id: "1", matiere_id: "1" }],
    };

    const { aSupprimer } = classer(entrees);

    expect(aSupprimer.map((v) => `${v.entite}:${v.id}`).sort()).toEqual([
      "filiere_matiere:1",
      "matiere:1",
    ]);
  });

  it("classe les offres indépendamment du contenu", () => {
    const entrees: Entrees = {
      ...vide,
      offres: [
        { id: "1", libelle: "Trimestre 1785498903358" },
        { id: "2", libelle: "Trimestre, 2 matières" },
      ],
    };

    const { aSupprimer, aConserver } = classer(entrees);

    expect(aSupprimer.map((v) => v.id)).toEqual(["1"]);
    expect(aConserver.map((v) => v.id)).toEqual(["2"]);
  });

  it("ne propose jamais une ligne à la fois en suppression et en conservation", () => {
    const entrees: Entrees = {
      ...vide,
      matieres: [{ id: "1", code: "E2E-M-1", libelle: "Physique 1785499066202" }],
      chapitres: [{ id: "1", matiere_id: "1", libelle: "Chapitre 1785443062243" }],
      cours: [{ id: "3", chapitre_id: "1", libelle: "Cours 1785443062243" }],
      videos: [{ id: "1", cours_id: "3", libelle: "Introduction" }],
    };

    const { aSupprimer, aConserver } = classer(entrees);
    const doublons = aSupprimer
      .map((v) => `${v.entite}:${v.id}`)
      .filter((k) => aConserver.some((c) => `${c.entite}:${c.id}` === k));

    expect(doublons).toEqual([]);
  });
});

describe("ORDRE_SUPPRESSION", () => {
  it("place chaque enfant avant son parent", () => {
    const position = (entite: string) => ORDRE_SUPPRESSION.indexOf(entite as never);
    expect(position("video")).toBeLessThan(position("cours"));
    expect(position("cours")).toBeLessThan(position("chapitre"));
    expect(position("chapitre")).toBeLessThan(position("matiere"));
    expect(position("filiere_matiere")).toBeLessThan(position("matiere"));
    expect(position("filiere_matiere")).toBeLessThan(position("filiere"));
  });
});
