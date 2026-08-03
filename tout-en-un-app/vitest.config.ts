import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // `server-only` n'est pas un paquet installé : Next le résout vers un
      // module vide et fait échouer la compilation si un composant client
      // l'importe. Vitest n'a pas cet alias, il faut donc le reproduire, sinon
      // tout test qui touche un composant serveur échoue à la résolution.
      "server-only": path.resolve(
        dirname,
        "./node_modules/next/dist/compiled/server-only/empty.js",
      ),
    },
  },
  // `tsconfig.json` laisse le JSX intact (`"jsx": "preserve"`) parce que c'est le
  // compilateur de Next qui le transforme. Vitest, lui, n'a pas ce relais et
  // échoue sur « Unexpected JSX expression » : il faut lui demander la
  // transformation explicitement pour pouvoir tester le rendu d'un composant.
  oxc: {
    jsx: { runtime: "automatic", importSource: "react" },
  },
  // Un composant serveur peut importer une feuille de style — `Formule` importe
  // celle de KaTeX. Vitest la transforme quand même, et charge alors le PostCSS
  // du projet, dont le greffon Tailwind n'est pas prévu pour ce contexte. Aucun
  // test n'a besoin de CSS : la liste de greffons vide court-circuite le tout.
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: "node",
    // Les scénarios Playwright (`*.spec.ts`) sont exclus, mais le support de
    // test sous e2e/support/ a ses propres tests unitaires, qui tournent ici.
    exclude: ["**/node_modules/**", "e2e/**/*.spec.ts"],
  },
});
