import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DocumentRicheVue } from "@/components/contenu-riche/document";
import { documentRicheSchema } from "@/modules/exercice/document-riche";

const BASE_IMAGES = "/api/matieres/5/exercices/9/images";

function rendre(noeuds: unknown[]): string {
  const document = documentRicheSchema.parse({ version: 1, noeuds });
  return renderToStaticMarkup(
    <DocumentRicheVue document={document} baseUrlImages={BASE_IMAGES} />,
  );
}

describe("DocumentRicheVue", () => {
  it("rend les cinq types de nœuds sans erreur", () => {
    const html = rendre([
      { type: "paragraphe", texte: "Un énoncé." },
      { type: "liste", elements: ["premier", "deuxième"] },
      { type: "formule", latex: "E = mc^2", bloc: true },
      { type: "image", fichier_id: "12", alt: "Schéma", legende: "Circuit" },
      { type: "code", texte: "print(42)" },
    ]);
    expect(html).toContain("Un énoncé.");
    expect(html).toContain("<li>premier</li>");
    expect(html).toContain("Circuit");
    expect(html).toContain("print(42)");
  });

  // Le rendu KaTeX se fait sur le serveur : le balisage doit être présent dans le
  // HTML, sinon c'est que le client aurait à le calculer, donc à télécharger
  // KaTeX, ce que le budget de 200 Ko interdit.
  it("rend la formule côté serveur, balisage KaTeX inclus", () => {
    const html = rendre([{ type: "formule", latex: "\\frac{1}{2}", bloc: true }]);
    expect(html).toContain("katex");
    expect(html).toContain("<math");
  });

  it("rend une formule en ligne au milieu d'un paragraphe", () => {
    const html = rendre([{ type: "paragraphe", texte: "La vitesse $v$ vaut 3." }]);
    expect(html).toContain("La vitesse ");
    expect(html).toContain("katex");
    expect(html).toContain(" vaut 3.");
  });

  it("échappe le texte au lieu de l'interpréter comme du balisage", () => {
    const html = rendre([{ type: "paragraphe", texte: "<script>alert(1)</script>" }]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("échappe aussi le contenu d'un nœud code", () => {
    const html = rendre([{ type: "code", texte: "<img onerror=alert(1)>" }]);
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&lt;img");
  });

  // Le contenu d'un bloc de code est du code, pas des mathématiques : un dollar
  // n'y ouvre pas de formule.
  it("ne cherche pas de formule dans un bloc de code", () => {
    const html = rendre([{ type: "code", texte: "prix=$total" }]);
    expect(html).toContain("prix=$total");
    expect(html).not.toContain("katex");
  });

  it("pointe l'image vers la route de lecture et jamais vers une clé de stockage", () => {
    const html = rendre([{ type: "image", fichier_id: "12", alt: "Schéma du circuit" }]);
    expect(html).toContain(`src="${BASE_IMAGES}/12"`);
    expect(html).toContain('alt="Schéma du circuit"');
    expect(html).not.toContain("cle_stockage");
    expect(html).not.toContain("supabase");
    expect(html).not.toContain(".png");
  });

  // `throwOnError: false` fait rendre à KaTeX l'expression fautive plutôt que de
  // lever : une faute de frappe du professeur ne doit pas rendre la page de
  // l'élève inaccessible.
  it("ne fait pas échouer le rendu sur une formule invalide", () => {
    expect(() => rendre([{ type: "formule", latex: "\\frac{" }])).not.toThrow();
  });

  it("rend une liste ordonnée en ol et une liste simple en ul", () => {
    expect(rendre([{ type: "liste", ordonnee: true, elements: ["a"] }])).toContain("<ol");
    expect(rendre([{ type: "liste", elements: ["a"] }])).toContain("<ul");
  });
});
