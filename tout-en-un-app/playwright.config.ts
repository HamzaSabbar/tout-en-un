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
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
