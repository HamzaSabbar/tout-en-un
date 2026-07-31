import "./support/env";
import { test, expect, type Page } from "@playwright/test";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { nettoyerDonneesE2E, PREFIXE_E2E } from "./support/base-test";

test.afterEach(nettoyerDonneesE2E);

async function connecter(page: Page, email: string, motDePasse: string) {
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/compte$/);
}

test("un élève sans permission n'accède pas au back-office contenu", async ({ page }) => {
  const suffixe = Date.now();
  const email = `e2e-eleve+${suffixe}@test.local`;
  const motDePasse = "mot-de-passe-eleve-123";
  const libelleFiliere = `${PREFIXE_E2E} Sciences Physiques ${suffixe}`;

  await prisma.filiere.create({
    data: { code: `${PREFIXE_E2E}-FE-${suffixe}`, libelle: libelleFiliere },
  });

  await page.goto("/inscription");
  await page.getByLabel("Nom", { exact: true }).fill("Alami");
  await page.getByLabel("Prénom").fill("Sara");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Téléphone").fill("0612345678");
  await page.getByLabel("Filière").selectOption({ label: libelleFiliere });
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/connexion$/);

  await connecter(page, email, motDePasse);

  await page.goto("/contenu/matieres");
  await expect(page).toHaveURL(/\/connexion$/);
});

test("le professeur saisit une matière complète de bout en bout en brouillon, puis publie", async ({
  page,
}) => {
  const suffixe = Date.now();
  const email = `e2e-admin+${suffixe}@test.local`;
  const motDePasse = "mot-de-passe-admin-123";
  const codeMatiere = `${PREFIXE_E2E}-M-${suffixe}`;
  const libelleMatiere = `Physique-Chimie ${suffixe}`;
  const libelleChapitre = `Mécanique ${suffixe}`;
  const titreCours = `La dérivée ${suffixe}`;

  await prisma.utilisateur.create({
    data: {
      nom: "Admin",
      prenom: "Test",
      email,
      telephone: "0600000000",
      mot_de_passe_hash: await hashPassword(motDePasse),
      role: "admin",
    },
  });

  await connecter(page, email, motDePasse);

  // Matière, créée en brouillon par défaut.
  await page.goto("/contenu/matieres");
  await page.getByLabel("Code").fill(codeMatiere);
  await page.getByLabel("Libellé").fill(libelleMatiere);
  await page.getByRole("button", { name: "Créer" }).click();
  const ligneMatiere = page.getByRole("listitem").filter({ hasText: libelleMatiere });
  await expect(ligneMatiere.getByText("brouillon")).toBeVisible();

  // Chapitre, dans la matière.
  await ligneMatiere.getByRole("link", { name: libelleMatiere }).click();
  await expect(page).toHaveURL(/\/contenu\/\d+\/chapitres$/);
  await page.getByLabel("Libellé").fill(libelleChapitre);
  await page.getByRole("button", { name: "Créer" }).click();
  const ligneChapitre = page.getByRole("listitem").filter({ hasText: libelleChapitre });
  await expect(ligneChapitre.getByText("brouillon")).toBeVisible();

  // Cours, dans le chapitre.
  await ligneChapitre.getByRole("link", { name: libelleChapitre }).click();
  await expect(page).toHaveURL(/\/contenu\/\d+\/chapitres\/\d+$/);
  await page.getByLabel("Titre").fill(titreCours);
  await page.getByRole("button", { name: "Créer" }).click();
  const ligneCours = page.getByRole("listitem").filter({ hasText: titreCours });
  await expect(ligneCours.getByText("brouillon")).toBeVisible();

  // Publication en un clic depuis la liste des matières : le statut change,
  // le chapitre et le cours déjà créés restent accessibles.
  await page.goto("/contenu/matieres");
  await ligneMatiere.getByRole("button", { name: "Publier" }).click();
  await expect(ligneMatiere.getByText("publie")).toBeVisible();

  await ligneMatiere.getByRole("link", { name: libelleMatiere }).click();
  await expect(page.getByText(libelleChapitre)).toBeVisible();
  await page.getByRole("link", { name: libelleChapitre }).click();
  await expect(page.getByText(titreCours)).toBeVisible();
});
