import "server-only";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { FILIGRANE_FR } from "@/lib/i18n/filigrane.fr";

// Filigrane nominatif à la volée (architecture 8) : mesure dissuasive contre la
// rediffusion des sujets/corrections d'examens nationaux. Module serveur pur
// (`import "server-only"`), jamais atteint par le bundle élève — même
// raisonnement que le rendu KaTeX côté serveur.
export interface IdentiteFiligrane {
  nom: string;
  prenom: string;
  telephonePartiel: string;
}

function formatDateMaroc(date: Date): string {
  return new Intl.DateTimeFormat("fr-MA", {
    timeZone: "Africa/Casablanca",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const TAILLE_TUILE = 12;
const TAILLE_PIED_DE_PAGE = 9;
const PAS_Y = 90;
const MARGE_TUILE_X = 60;

// Deux éléments par page : une tuile répétée en diagonale à faible opacité
// (le vrai frein — une tuile ne se recadre pas sans perdre le contenu de la
// page), et une ligne lisible en pied de page (pour qu'un humain identifie la
// copie d'un coup d'œil, sans avoir à déchiffrer la tuile).
export async function apposerFiligrane(
  pdfOriginal: Buffer,
  identite: IdentiteFiligrane,
  maintenant: Date = new Date(),
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfOriginal);
  const police = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const texte = FILIGRANE_FR.ligne(
    identite.prenom,
    identite.nom,
    identite.telephonePartiel,
    formatDateMaroc(maintenant),
  );
  const largeurTuile = police.widthOfTextAtSize(texte, TAILLE_TUILE);
  const pasX = largeurTuile + MARGE_TUILE_X;

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();

    for (let y = -height; y < height * 2; y += PAS_Y) {
      for (let x = -width; x < width * 2; x += pasX) {
        page.drawText(texte, {
          x,
          y,
          size: TAILLE_TUILE,
          font: police,
          color: rgb(0.55, 0.55, 0.55),
          opacity: 0.16,
          rotate: degrees(45),
        });
      }
    }

    page.drawText(texte, {
      x: 20,
      y: 14,
      size: TAILLE_PIED_DE_PAGE,
      font: police,
      color: rgb(0.25, 0.25, 0.25),
      opacity: 0.9,
    });
  }

  return Buffer.from(await pdfDoc.save());
}
