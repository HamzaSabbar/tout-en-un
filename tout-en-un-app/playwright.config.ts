import "./e2e/support/env";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Seuls les scénarios sont des tests Playwright. Le support sous e2e/support/
  // est couvert par Vitest (`*.test.ts`) et ne doit pas être ramassé ici.
  testMatch: "**/*.spec.ts",
  // Les specs partagent une base de test et se nettoient entre elles : les faire
  // tourner en parallèle rendrait les assertions dépendantes de l'ordonnancement.
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
      ]
    : "list",
  // Le runner CI est partagé et à court de mémoire sous une suite désormais
  // longue (23 scénarios, un seul worker) : un clic "Créer"/"Publier" perd
  // parfois la course contre le délai d'expiration de 15 s par pure
  // contention de ressources, jamais au même endroit d'une exécution à
  // l'autre. Une nouvelle tentative isole la vraie régression du bruit
  // d'infrastructure sans masquer un échec qui se reproduirait.
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  globalSetup: "./e2e/support/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: process.env.CI ? "pnpm build && pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // Installation puis build de production complet avant le premier scénario :
    // 180 s ne laissaient aucune marge et tuaient le worker de build en cours de
    // collecte des pages.
    timeout: 600_000,
    env: {
      // `next start` fixe NODE_ENV=production, y compris ici. Sans cette
      // dérogation explicite, le stockage de secours sur disque resterait fermé
      // et aucun téléversement ne pourrait aboutir faute de bucket Supabase.
      // Posée ici plutôt que dans le workflow : la CI reste sans configuration de
      // stockage, et l'exception vit avec la recette qui en a besoin.
      STOCKAGE_LOCAL_AUTORISE: "oui",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});
