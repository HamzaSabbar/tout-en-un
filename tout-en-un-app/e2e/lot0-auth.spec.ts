import "./support/env";
import { test, expect, type Page } from "@playwright/test";
import { prisma } from "@/lib/db";
import { nettoyerDonneesE2E, PREFIXE_E2E } from "./support/base-test";

test.afterEach(nettoyerDonneesE2E);

// La filière est obligatoire à l'inscription depuis le lot 2 : chaque test en
// crée une pour pouvoir la sélectionner dans le formulaire.
async function creerFiliere(suffixe: number): Promise<string> {
  const libelle = `${PREFIXE_E2E} Sciences Physiques ${suffixe}`;
  await prisma.filiere.create({
    data: { code: `${PREFIXE_E2E}-FA-${suffixe}`, libelle },
  });
  return libelle;
}

async function choisirFiliere(page: Page, libelle: string) {
  await page.getByLabel("Filière").selectOption({ label: libelle });
}

test("un élève peut être créé, se connecter et voir une page protégée", async ({
  page,
  context,
}) => {
  const suffixe = Date.now();
  const email = `e2e+${suffixe}@test.local`;
  const motDePasse = "mot-de-passe-de-test-123";
  const prenom = "Sara";
  const filiere = await creerFiliere(suffixe);

  await page.goto("/inscription");
  await page.getByLabel("Nom", { exact: true }).fill("Alami");
  await page.getByLabel("Prénom").fill(prenom);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Téléphone").fill("0612345678");
  await choisirFiliere(page, filiere);
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/connexion$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/compte$/);
  await expect(page.getByText(`Bonjour ${prenom}`)).toBeVisible();

  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === "session");
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.sameSite).toBe("Lax");

  const contexteSansCookie = await page.context().browser()!.newContext();
  const pageSansCookie = await contexteSansCookie.newPage();
  await pageSansCookie.goto("/compte");
  await expect(pageSansCookie).toHaveURL(/\/connexion$/);
  await contexteSansCookie.close();

  const contexteAvecCookie = await page.context().browser()!.newContext();
  await contexteAvecCookie.addCookies([sessionCookie!]);
  const pageAvecCookie = await contexteAvecCookie.newPage();
  const reponse = await pageAvecCookie.goto("/compte");
  expect(reponse?.status()).toBe(200);
  await expect(pageAvecCookie.getByText(`Bonjour ${prenom}`)).toBeVisible();
  await contexteAvecCookie.close();
});

test("la déconnexion révoque la session côté serveur", async ({
  page,
  context,
}) => {
  const suffixe = Date.now();
  const email = `e2e+${suffixe}@test.local`;
  const motDePasse = "mot-de-passe-de-test-123";
  const filiere = await creerFiliere(suffixe);

  await page.goto("/inscription");
  await page.getByLabel("Nom", { exact: true }).fill("Bennani");
  await page.getByLabel("Prénom").fill("Yassine");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Téléphone").fill("0612345678");
  await choisirFiliere(page, filiere);
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/connexion$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/compte$/);

  const cookiesAvant = await context.cookies();
  const sessionCookie = cookiesAvant.find((c) => c.name === "session");
  expect(sessionCookie).toBeDefined();

  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);

  const cookiesApres = await context.cookies();
  expect(cookiesApres.find((c) => c.name === "session")).toBeUndefined();

  // La session ne doit pas seulement être effacée du navigateur : le jeton
  // révoqué ne doit plus donner accès à /compte, même rejoué explicitement.
  const contexteAncienCookie = await page.context().browser()!.newContext();
  await contexteAncienCookie.addCookies([sessionCookie!]);
  const pageAncienCookie = await contexteAncienCookie.newPage();
  await pageAncienCookie.goto("/compte");
  await expect(pageAncienCookie).toHaveURL(/\/connexion$/);
  await contexteAncienCookie.close();
});
