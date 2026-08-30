import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: { utilisateur: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));
vi.mock("@/lib/storage/storage", () => ({
  storageService: { telecharger: vi.fn() },
}));

async function pdfMinimal(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  return Buffer.from(await doc.save());
}

import {
  deriverTelephonePartiel,
  genererPdfFiligrane,
  obtenirIdentiteFiligrane,
} from "@/modules/parcours-eleve/national";

describe("deriverTelephonePartiel", () => {
  it("masque tous les chiffres sauf les 4 derniers", () => {
    expect(deriverTelephonePartiel("0612345678")).toBe("••••••5678");
  });

  it("ignore les séparateurs non numériques", () => {
    expect(deriverTelephonePartiel("06 12 34 56 78")).toBe("••••••5678");
  });

  it("masque entièrement un numéro trop court pour être partiellement révélé", () => {
    expect(deriverTelephonePartiel("123")).toBe("•••");
  });

  it("rend une chaîne vide pour un numéro sans chiffre", () => {
    expect(deriverTelephonePartiel("")).toBe("");
  });
});

describe("obtenirIdentiteFiligrane", () => {
  it("relit nom, prénom et téléphone masqué depuis la base, pas la session", async () => {
    findUnique.mockResolvedValue({ nom: "Sabbar", prenom: "Hamza", telephone: "0612345678" });

    const identite = await obtenirIdentiteFiligrane(BigInt(74));

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: BigInt(74) },
      select: { nom: true, prenom: true, telephone: true },
    });
    expect(identite).toEqual({ nom: "Sabbar", prenom: "Hamza", telephonePartiel: "••••••5678" });
  });

  it("rend null si l'utilisateur n'existe plus", async () => {
    findUnique.mockResolvedValue(null);
    await expect(obtenirIdentiteFiligrane(BigInt(1))).resolves.toBeNull();
  });
});

describe("genererPdfFiligrane", () => {
  it("télécharge les octets à la clé donnée puis les tamponne", async () => {
    const original = await pdfMinimal();
    const telecharger = vi.fn().mockResolvedValue(original);
    const identite = { nom: "Sabbar", prenom: "Hamza", telephonePartiel: "••••5678" };

    const resultat = await genererPdfFiligrane("1/2/3/sujet_pdf-abc.pdf", identite, {
      telecharger,
    });

    expect(telecharger).toHaveBeenCalledWith("1/2/3/sujet_pdf-abc.pdf");
    expect(resultat.byteLength).toBeGreaterThan(original.byteLength);
    const relu = await PDFDocument.load(resultat);
    expect(relu.getPageCount()).toBe(1);
  });
});
