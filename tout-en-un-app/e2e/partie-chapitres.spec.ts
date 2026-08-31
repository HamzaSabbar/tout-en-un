import "./support/env";
import { test, expect, type Page } from "@playwright/test";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { nettoyerDonneesE2E, PREFIXE_E2E } from "./support/base-test";

// Certaines matières (Physique-Chimie) regroupent leurs chapitres par partie
// (Physique / Chimie) : côté élève, la matière propose un choix de partie
// (comme le choix de matière), et seule la partie ouverte affiche ses
// chapitres. D'autres matières (Mathématiques) n'ont aucune partie et gardent
// l'affichage plat. Deux scénarios : le premier prouve l'écran de choix de
// bout en bout (back-office réel, formulaire de création de chapitre avec
// sélecteur de partie), le second prouve la non-régression pour une matière
// sans partie.

const MOT_DE_PASSE = "mot-de-passe-eleve-123";

test.afterEach(nettoyerDonneesE2E);

async function connecter(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  // Le premier login de chaque exécution compile /compte à froid : sur cette
  // machine, observé entre 10 s et 20 s. Le délai par défaut (15 s) suffit la
  // plupart du temps mais pas toujours ; élargi ici plutôt que de dépendre de
  // la chance d'un cache déjà chaud.
  await expect(page).toHaveURL(/\/compte$/, { timeout: 30_000 });
}

async function seedMatiereAvecEleve(suffixe: number, libelleMatiere: string) {
  const filiere = await prisma.filiere.create({
    data: { code: `${PREFIXE_E2E}-PT-F-${suffixe}`, libelle: `${PREFIXE_E2E} Filière ${suffixe}` },
  });
  const matiere = await prisma.matiere.create({
    data: { code: `${PREFIXE_E2E}-PT-M-${suffixe}`, libelle: `${PREFIXE_E2E} ${libelleMatiere}`, statut: "publie" },
  });
  await prisma.filiereMatiere.create({ data: { filiere_id: filiere.id, matiere_id: matiere.id } });

  const emailAdmin = `e2e-partie-admin+${suffixe}@test.local`;
  await prisma.utilisateur.create({
    data: {
      nom: "Admin",
      prenom: "Test",
      email: emailAdmin,
      telephone: "0600000000",
      mot_de_passe_hash: await hashPassword(MOT_DE_PASSE),
      role: "admin",
    },
  });

  const emailEleve = `e2e-partie-eleve+${suffixe}@test.local`;
  const eleve = await prisma.utilisateur.create({
    data: {
      nom: "Test",
      prenom: "Élève",
      email: emailEleve,
      telephone: "0612345678",
      filiere_id: filiere.id,
      mot_de_passe_hash: await hashPassword(MOT_DE_PASSE),
      role: "eleve",
    },
  });
  const offre = await prisma.offre.create({
    data: { libelle: `${PREFIXE_E2E} Offre ${emailEleve}`, duree_jours: 90, nb_matieres: 1, prix: 600 },
  });
  const abonnement = await prisma.abonnement.create({
    data: { utilisateur_id: eleve.id, offre_id: offre.id, statut: "actif", montant: 600, date_debut: new Date() },
  });
  await prisma.abonnementMatiere.create({
    data: {
      abonnement_id: abonnement.id,
      matiere_id: matiere.id,
      date_expiration: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  return { matiere, emailAdmin, emailEleve };
}

test("un chapitre affecté à une partie apparaît groupé sous elle côté élève", async ({ page }) => {
  test.setTimeout(180_000);
  const suffixe = Date.now();
  const { matiere, emailAdmin, emailEleve } = await seedMatiereAvecEleve(suffixe, "Physique-Chimie");
  const routeChapitresAdmin = `/contenu/${matiere.id}/chapitres`;

  await connecter(page, emailAdmin);
  await page.goto(routeChapitresAdmin);

  // Créer une partie « Physique ». `#partie-libelle` : id propre au
  // formulaire partie, `getByLabel("Libellé")` seul serait ambigu (le
  // formulaire chapitre porte le même intitulé de champ).
  const champLibellePartie = page.locator("#partie-libelle");
  await champLibellePartie.fill("Physique");
  await champLibellePartie.locator("xpath=ancestor::form[1]").getByRole("button", { name: "Ajouter" }).click();

  const lignePartie = page.getByText("Physique", { exact: true }).locator("xpath=ancestor::li[1]");
  await expect(lignePartie).toBeVisible();
  await lignePartie.getByRole("button", { name: "Publier", exact: true }).click();

  // Créer un chapitre rattaché à cette partie.
  await page.goto(routeChapitresAdmin);
  const champLibelleChapitre = page.locator("#libelle");
  await champLibelleChapitre.fill("Les ondes");
  const formulaireChapitre = champLibelleChapitre.locator("xpath=ancestor::form[1]");
  await formulaireChapitre.locator('select[name="partie_id"]').selectOption({ label: "Physique" });
  await formulaireChapitre.getByRole("button", { name: "Créer" }).click();

  const ligneChapitre = page.getByRole("link", { name: "Les ondes" }).locator("xpath=ancestor::li[1]");
  await expect(ligneChapitre).toBeVisible();
  await ligneChapitre.getByRole("button", { name: "Publier", exact: true }).click();

  // Côté élève : la matière propose un choix de partie, pas les chapitres à
  // plat. Choisir « Physique » mène à une page qui n'affiche que ses
  // chapitres.
  await connecter(page, emailEleve);
  await page.goto(`/matieres/${matiere.id}`);
  await expect(page.getByRole("heading", { name: "Choisis une partie" })).toBeVisible();
  const cartePartie = page.getByRole("link", { name: /^Ouvrir la partie : Physique$/ });
  await expect(cartePartie).toBeVisible();
  await expect(page.getByRole("link", { name: /Les ondes/ })).toHaveCount(0);

  await cartePartie.click();
  await expect(page).toHaveURL(/\/matieres\/\d+\/parties\/\d+$/);
  await expect(page.getByRole("link", { name: /Les ondes/ })).toBeVisible();

  const chapitre = await prisma.chapitre.findFirstOrThrow({ where: { matiere_id: matiere.id } });
  expect(chapitre.partie_id).not.toBeNull();
});

test("une matière sans partie garde l'affichage plat (non-régression)", async ({ page }) => {
  test.setTimeout(120_000);
  const suffixe = Date.now();
  const { matiere, emailAdmin, emailEleve } = await seedMatiereAvecEleve(suffixe, "Mathématiques");
  const routeChapitresAdmin = `/contenu/${matiere.id}/chapitres`;

  await connecter(page, emailAdmin);
  await page.goto(routeChapitresAdmin);

  // Aucune partie créée : le formulaire de chapitre ne doit proposer aucun
  // sélecteur de partie.
  await expect(page.locator('select[name="partie_id"]')).toHaveCount(0);

  // Le formulaire « Nouvelle partie » est toujours affiché, même sans aucune
  // partie : `#libelle` (le champ du formulaire chapitre) est le seul ancrage
  // non ambigu, `getByLabel("Libellé")` seul matcherait les deux formulaires.
  const champLibelleChapitre = page.locator("#libelle");
  await champLibelleChapitre.fill("Limites et continuité");
  const formulaireChapitre = champLibelleChapitre.locator("xpath=ancestor::form[1]");
  await formulaireChapitre.getByRole("button", { name: "Créer" }).click();

  const ligneChapitre = page
    .getByRole("link", { name: "Limites et continuité" })
    .locator("xpath=ancestor::li[1]");
  await expect(ligneChapitre).toBeVisible();
  await ligneChapitre.getByRole("button", { name: "Publier", exact: true }).click();

  await connecter(page, emailEleve);
  await page.goto(`/matieres/${matiere.id}`);
  // Aucun écran de choix de partie, le chapitre apparaît directement.
  await expect(page.getByRole("heading", { name: "Choisis une partie" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Chapitres", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Limites et continuité/ })).toBeVisible();
});
