import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // La configuration à plat d'ESLint ne lit pas `.gitignore` : tout ce qui est
    // engendré doit être répété ici. Le rapport Playwright embarque du
    // JavaScript minifié, et sans cette ligne une exécution locale de la recette
    // faisait remonter des milliers de faux problèmes qui noyaient les vrais.
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-budget/**",
      "out/**",
      "build/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "src/generated/**",
    ],
  },
];

export default eslintConfig;
