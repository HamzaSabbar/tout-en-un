import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const LIMITE_OCTETS = 200 * 1024;
const REPERTOIRE_BUILD = ".next";
let manifeste;
try {
  manifeste = JSON.parse(
    readFileSync(`${REPERTOIRE_BUILD}/app-build-manifest.json`, "utf8"),
  );
} catch {
  throw new Error(
    "Aucun build de production exploitable. Lance `npm run build` avant ce contrôle.",
  );
}
const pagesEleve = Object.entries(manifeste.pages).filter(([route]) =>
  route.startsWith("/(eleve)/matieres"),
);

if (pagesEleve.length === 0) {
  throw new Error("Aucune page élève trouvée dans le manifeste de production.");
}

let depassement = false;
for (const [route, fichiers] of pagesEleve) {
  const octets = [...new Set(fichiers)].reduce((total, fichier) => {
    const contenu = readFileSync(`${REPERTOIRE_BUILD}/${fichier}`);
    return total + gzipSync(contenu).byteLength;
  }, 0);
  const kiloOctets = (octets / 1024).toFixed(1);
  console.log(`${route}: ${kiloOctets} Ko de JavaScript compressé`);
  if (octets > LIMITE_OCTETS) depassement = true;
}

if (depassement) {
  throw new Error("Le budget de 200 Ko de JavaScript est dépassé sur une page élève.");
}
