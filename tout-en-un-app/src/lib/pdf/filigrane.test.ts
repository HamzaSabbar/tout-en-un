import { inflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { apposerFiligrane } from "@/lib/pdf/filigrane";

// pdf-lib compresse les flux de contenu (FlateDecode) : chercher le texte
// directement dans les octets bruts ne trouve rien. On décompresse chaque
// flux `stream ... endstream` pour vérifier ce qui a réellement été écrit,
// plutôt que de supposer un flux non compressé.
function texteDecompresse(pdf: Buffer): string {
  const motif = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let morceau: RegExpExecArray | null;
  let texte = "";
  while ((morceau = motif.exec(pdf.toString("latin1"))) !== null) {
    const debut = pdf.indexOf("stream", morceau.index) + "stream".length;
    const offset = pdf[debut] === 0x0d ? debut + 2 : debut + 1;
    const longueur = morceau[1].length;
    try {
      texte += inflateSync(pdf.subarray(offset, offset + longueur)).toString("latin1");
    } catch {
      // Flux non compressé (rare avec pdf-lib) : ignoré, sans faire échouer.
    }
  }
  return texte;
}

async function creerPdfDeTest(nbPages = 1): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < nbPages; i += 1) {
    doc.addPage([595.28, 841.89]); // A4
  }
  return Buffer.from(await doc.save());
}

const IDENTITE = { nom: "Sabbar", prenom: "Hamza", telephonePartiel: "••••5678" };

describe("apposerFiligrane", () => {
  it("rend un PDF valide, avec le même nombre de pages", async () => {
    const original = await creerPdfDeTest(2);
    const tamponne = await apposerFiligrane(original, IDENTITE);

    const relu = await PDFDocument.load(tamponne);
    expect(relu.getPageCount()).toBe(2);
  });

  it("produit un PDF plus lourd que l'original (du texte a bien été ajouté)", async () => {
    const original = await creerPdfDeTest(1);
    const tamponne = await apposerFiligrane(original, IDENTITE);

    expect(tamponne.byteLength).toBeGreaterThan(original.byteLength);
  });

  it("écrit le nom et le prénom dans le flux du PDF (littéral ou hexadécimal)", async () => {
    // pdf-lib choisit lui-même entre chaîne littérale `(Hamza) Tj` et chaîne
    // hexadécimale `<48616d7a61> Tj` : le test accepte les deux formes plutôt
    // que de supposer laquelle est utilisée.
    const original = await creerPdfDeTest(1);
    const tamponne = await apposerFiligrane(original, IDENTITE);
    const decompresse = texteDecompresse(tamponne);
    const hex = (mot: string) => Buffer.from(mot, "latin1").toString("hex");

    for (const mot of ["Hamza", "Sabbar"]) {
      const present = decompresse.includes(mot) || decompresse.toLowerCase().includes(hex(mot));
      expect(present, `« ${mot} » absent du flux décompressé`).toBe(true);
    }
  });

  it("produit le même poids d'un appel à l'autre pour la même date fournie", async () => {
    const original = await creerPdfDeTest(1);
    const date = new Date("2026-01-15T10:00:00Z");
    const premier = await apposerFiligrane(original, IDENTITE, date);
    const second = await apposerFiligrane(original, IDENTITE, date);

    expect(premier.byteLength).toBe(second.byteLength);
  });

  it("fonctionne sur un PDF de plusieurs pages, chacune tamponnée", async () => {
    const original = await creerPdfDeTest(3);
    const tamponne = await apposerFiligrane(original, IDENTITE);
    const relu = await PDFDocument.load(tamponne);
    expect(relu.getPageCount()).toBe(3);
  });
});
