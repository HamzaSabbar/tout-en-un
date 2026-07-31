import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Les scénarios Playwright (`*.spec.ts`) sont exclus, mais le support de
    // test sous e2e/support/ a ses propres tests unitaires, qui tournent ici.
    exclude: ["**/node_modules/**", "e2e/**/*.spec.ts"],
  },
});
