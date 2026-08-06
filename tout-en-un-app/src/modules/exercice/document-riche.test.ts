import { describe, expect, it } from "vitest";
import {
  analyserDocumentRiche,
  analyserDocumentRicheJson,
  champDocumentRicheSchema,
  decouperFormulesEnLigne,
  documentRicheSchema,
  fichiersReferences,
} from "@/modules/exercice/document-riche";

const documentComplet = {
  version: 1,
  noeuds: [
    { type: "paragraphe", texte: "Calculer la vitesse $v = d/t$." },
    { type: "liste", ordonnee: true, elements: ["Première étape", "Deuxième étape"] },
    { type: "formule", latex: "E = mc^2", bloc: true },
    { type: "image", fichier_id: "12", alt: "Schéma du circuit", legende: "Circuit RC" },
    { type: "code", texte: "print(42)", langage: "python" },
  ],
};

describe("documentRicheSchema", () => {
  it("accepte un document contenant les cinq types de nœuds", () => {
    const analyse = documentRicheSchema.safeParse(documentComplet);
    expect(analyse.success).toBe(true);
  });

  it("rejette un type de nœud inconnu", () => {
    const analyse = documentRicheSchema.safeParse({
      version: 1,
      noeuds: [{ type: "html", texte: "<script>alert(1)</script>" }],
    });
    expect(analyse.success).toBe(false);
  });

  // Le jeu de types est fermé : c'est le point qui remplace un assainisseur HTML
  // en sortie. Une clé en trop sur un nœud connu doit échouer aussi, sinon un
  // champ non prévu voyagerait jusqu'au rendu.
  it("rejette une clé inconnue sur un nœud connu", () => {
    const analyse = documentRicheSchema.safeParse({
      version: 1,
      noeuds: [{ type: "paragraphe", texte: "Bonjour", onClick: "alert(1)" }],
    });
    expect(analyse.success).toBe(false);
  });

  it("rejette un document vide", () => {
    expect(documentRicheSchema.safeParse({ version: 1, noeuds: [] }).success).toBe(false);
  });

  it("rejette une version inconnue", () => {
    expect(
      documentRicheSchema.safeParse({ version: 2, noeuds: [{ type: "paragraphe", texte: "a" }] })
        .success,
    ).toBe(false);
  });

  it("rejette une image sans alternative textuelle", () => {
    const analyse = documentRicheSchema.safeParse({
      version: 1,
      noeuds: [{ type: "image", fichier_id: "3", alt: "" }],
    });
    expect(analyse.success).toBe(false);
  });

  it("rejette une image qui porte une URL au lieu d'un identifiant", () => {
    const analyse = documentRicheSchema.safeParse({
      version: 1,
      noeuds: [
        { type: "image", url: "https://exemple.test/schema.png", alt: "Schéma" },
      ],
    });
    expect(analyse.success).toBe(false);
  });

  it("rejette un fichier_id non entier", () => {
    const analyse = documentRicheSchema.safeParse({
      version: 1,
      noeuds: [{ type: "image", fichier_id: "abc", alt: "Schéma" }],
    });
    expect(analyse.success).toBe(false);
  });

  it("rejette une formule dépassant le plafond de longueur", () => {
    const analyse = documentRicheSchema.safeParse({
      version: 1,
      noeuds: [{ type: "formule", latex: "x".repeat(501) }],
    });
    expect(analyse.success).toBe(false);
  });

  // Le plafond de la formule se contournerait en la glissant dans un paragraphe,
  // dont le texte est autorisé bien plus long.
  it("rejette une formule en ligne dépassant le plafond de longueur", () => {
    const analyse = documentRicheSchema.safeParse({
      version: 1,
      noeuds: [{ type: "paragraphe", texte: `Soit $${"x".repeat(501)}$ la valeur.` }],
    });
    expect(analyse.success).toBe(false);
  });

  it("rejette un document dépassant le nombre maximal de nœuds", () => {
    const noeuds = Array.from({ length: 201 }, () => ({
      type: "paragraphe" as const,
      texte: "Texte",
    }));
    expect(documentRicheSchema.safeParse({ version: 1, noeuds }).success).toBe(false);
  });

  it("donne à ordonnee et bloc une valeur par défaut", () => {
    const analyse = documentRicheSchema.parse({
      version: 1,
      noeuds: [
        { type: "liste", elements: ["a"] },
        { type: "formule", latex: "x" },
      ],
    });
    expect(analyse.noeuds[0]).toMatchObject({ ordonnee: false });
    expect(analyse.noeuds[1]).toMatchObject({ bloc: false });
  });
});

describe("decouperFormulesEnLigne", () => {
  it("sépare le texte des formules", () => {
    expect(decouperFormulesEnLigne("La vitesse $v$ vaut 3.")).toEqual([
      { type: "texte", valeur: "La vitesse " },
      { type: "latex", valeur: "v" },
      { type: "texte", valeur: " vaut 3." },
    ]);
  });

  it("traite un dollar non apparié comme du texte", () => {
    expect(decouperFormulesEnLigne("Le prix est 50 $ hors taxe.")).toEqual([
      { type: "texte", valeur: "Le prix est 50 $ hors taxe." },
    ]);
  });

  it("rend un dollar échappé littéral", () => {
    expect(decouperFormulesEnLigne("Coût \\$5 puis $x$")).toEqual([
      { type: "texte", valeur: "Coût $5 puis " },
      { type: "latex", valeur: "x" },
    ]);
  });

  it("ne coupe pas sur un dollar échappé à l'intérieur d'une formule", () => {
    expect(decouperFormulesEnLigne("$a \\$ b$ fin")).toEqual([
      { type: "latex", valeur: "a \\$ b" },
      { type: "texte", valeur: " fin" },
    ]);
  });

  it("traite une paire vide comme du texte", () => {
    expect(decouperFormulesEnLigne("un $$ deux")).toEqual([
      { type: "texte", valeur: "un $$ deux" },
    ]);
  });

  it("gère plusieurs formules dans la même phrase", () => {
    expect(decouperFormulesEnLigne("$a$ et $b$")).toEqual([
      { type: "latex", valeur: "a" },
      { type: "texte", valeur: " et " },
      { type: "latex", valeur: "b" },
    ]);
  });

  it("ne produit aucun fragment pour une chaîne vide", () => {
    expect(decouperFormulesEnLigne("")).toEqual([]);
  });
});

describe("fichiersReferences", () => {
  it("liste les identifiants d'image sans doublon et dans l'ordre", () => {
    const document = documentRicheSchema.parse({
      version: 1,
      noeuds: [
        { type: "image", fichier_id: "7", alt: "un" },
        { type: "paragraphe", texte: "Entre deux" },
        { type: "image", fichier_id: "3", alt: "deux" },
        { type: "image", fichier_id: "7", alt: "un bis" },
      ],
    });
    expect(fichiersReferences(document)).toEqual([BigInt(7), BigInt(3)]);
  });

  it("ne renvoie rien pour un document sans image", () => {
    const document = documentRicheSchema.parse({
      version: 1,
      noeuds: [{ type: "paragraphe", texte: "Sans image" }],
    });
    expect(fichiersReferences(document)).toEqual([]);
  });
});

describe("analyserDocumentRiche", () => {
  it("renvoie null plutôt que de lever sur une donnée invalide", () => {
    expect(analyserDocumentRiche({ version: 1, noeuds: [{ type: "video" }] })).toBeNull();
    expect(analyserDocumentRiche(null)).toBeNull();
    expect(analyserDocumentRiche("texte")).toBeNull();
  });

  it("renvoie le document validé", () => {
    expect(analyserDocumentRiche(documentComplet)).not.toBeNull();
  });
});

describe("analyserDocumentRicheJson", () => {
  it("renvoie null sur un JSON malformé", () => {
    expect(analyserDocumentRicheJson("{noeuds:")).toBeNull();
  });

  it("analyse un JSON valide", () => {
    expect(analyserDocumentRicheJson(JSON.stringify(documentComplet))).not.toBeNull();
  });
});

describe("champDocumentRicheSchema", () => {
  it("traite un champ vide comme absent", () => {
    expect(champDocumentRicheSchema.parse("   ")).toBeNull();
  });

  it("refuse un contenu invalide", () => {
    expect(champDocumentRicheSchema.safeParse("{\"version\":1}").success).toBe(false);
  });

  it("accepte un contenu valide", () => {
    const analyse = champDocumentRicheSchema.safeParse(JSON.stringify(documentComplet));
    expect(analyse.success).toBe(true);
  });
});
