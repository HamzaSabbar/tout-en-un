import { chromium } from "./node_modules/.pnpm/playwright@1.62.0/node_modules/playwright/index.mjs";

const OUT = "C:/Users/pc/AppData/Local/Temp/claude/c--Users-pc-Desktop-tout-en-un/e6def95e-2546-4ccd-b9cc-b22402a40ebd/scratchpad";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

await page.context().clearCookies();
await page.goto("http://localhost:3000/connexion");
await page.getByLabel("Email").fill("admin@demo.local");
await page.getByLabel("Mot de passe", { exact: true }).fill("Demo-1234!");
await page.getByRole("button", { name: "Se connecter" }).click();
await page.waitForURL((url) => !url.pathname.includes("/connexion"), { timeout: 20000 });

await page.goto("http://localhost:3000/abonnements", { timeout: 30000 });
await page.getByRole("heading", { name: "Demandes d'accès" }).waitFor({ timeout: 20000 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/run-abonnements.png`, fullPage: true });

console.log("URL:", page.url());
console.log("Titre visible:", await page.getByRole("heading", { name: "Demandes d'accès" }).isVisible());

await browser.close();
console.log("done");
