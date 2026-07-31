import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

const MOT_DE_PASSE = "mot-de-passe-eleve-123";

async function connecter(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/compte$/);
}

// Filière, matière publiée et chapitre publié : le contenu que l'élève ne doit
// pas obtenir tant qu'aucun abonnement actif ne couvre la matière.
async function seedContenu(suffixe: number) {
  const filiere = await prisma.filiere.create({
    data: { code: `F${suffixe}`, libelle: `Sciences Physiques ${suffixe}` },
  });
  const matiere = await prisma.matiere.create({
    data: { code: `M${suffixe}`, libelle: `Physique-Chimie ${suffixe}`, statut: "publie" },
  });
  await prisma.filiereMatiere.create({
    data: { filiere_id: filiere.id, matiere_id: matiere.id },
  });
  const chapitre = await prisma.chapitre.create({
    data: {
      matiere_id: matiere.id,
      libelle: `Mecanique-secrete-${suffixe}`,
      statut: "publie",
    },
  });
  return { filiere, matiere, chapitre };
}

async function seedEleve(suffixe: number, filiereId: bigint) {
  const email = `e2e-lot2-eleve+${suffixe}@test.local`;
  const eleve = await prisma.utilisateur.create({
    data: {
      nom: "Alami",
      prenom: "Sara",
      email,
      telephone: "0612345678",
      filiere_id: filiereId,
      mot_de_passe_hash: await hashPassword(MOT_DE_PASSE),
      role: "eleve",
    },
  });
  return { eleve, email };
}

test("un élève sans abonnement n'obtient aucune ressource, ni par l'interface ni par l'API", async ({
  page,
}) => {
  const suffixe = Date.now();
  const { filiere, matiere, chapitre } = await seedContenu(suffixe);
  const { email } = await seedEleve(suffixe, filiere.id);

  await connecter(page, email);

  // 1. Interface : écran d'accès contrôlé, motif non_souscrit. Le libellé du
  // chapitre est absent du HTML rendu et de la charge utile RSC, pas seulement
  // invisible à l'écran.
  await page.goto(`/matieres/${matiere.id}`);
  await expect(page.locator('[data-motif="non_souscrit"]')).toBeVisible();
  expect(await page.content()).not.toContain(chapitre.libelle);

  // 2. Appel direct à l'API avec la même session : le chapitre est absent de la
  // réponse du serveur, il n'est pas seulement masqué.
  const reponse = await page.request.get(`/api/matieres/${matiere.id}/chapitres`);
  expect(reponse.status()).toBe(403);
  const corps = await reponse.text();
  expect(corps).not.toContain(chapitre.libelle);
  expect(corps).not.toContain(chapitre.id.toString());
  expect(JSON.parse(corps)).toEqual({ motif: "non_souscrit" });
});

test("un abonnement expiré donne le motif expire et ferme l'API", async ({ page }) => {
  const suffixe = Date.now();
  const { filiere, matiere, chapitre } = await seedContenu(suffixe);
  const { eleve, email } = await seedEleve(suffixe, filiere.id);

  const offre = await prisma.offre.create({
    data: { libelle: `Offre ${suffixe}`, duree_jours: 90, nb_matieres: 1, prix: 600 },
  });
  const abonnement = await prisma.abonnement.create({
    data: {
      utilisateur_id: eleve.id,
      offre_id: offre.id,
      statut: "actif",
      montant: 600,
      date_debut: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.abonnementMatiere.create({
    data: {
      abonnement_id: abonnement.id,
      matiere_id: matiere.id,
      date_expiration: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  await connecter(page, email);

  await page.goto(`/matieres/${matiere.id}`);
  await expect(page.locator('[data-motif="expire"]')).toBeVisible();
  await expect(page.getByText(chapitre.libelle)).toHaveCount(0);

  const reponse = await page.request.get(`/api/matieres/${matiere.id}/chapitres`);
  expect(reponse.status()).toBe(403);
  expect(await reponse.text()).not.toContain(chapitre.libelle);
});

test("une matière hors filière donne le motif hors_filiere", async ({ page }) => {
  const suffixe = Date.now();
  const { matiere, chapitre } = await seedContenu(suffixe);
  const autreFiliere = await prisma.filiere.create({
    data: { code: `FB${suffixe}`, libelle: `SVT ${suffixe}` },
  });
  const { email } = await seedEleve(suffixe, autreFiliere.id);

  await connecter(page, email);

  await page.goto(`/matieres/${matiere.id}`);
  await expect(page.locator('[data-motif="hors_filiere"]')).toBeVisible();
  await expect(page.getByText(chapitre.libelle)).toHaveCount(0);

  const reponse = await page.request.get(`/api/matieres/${matiere.id}/chapitres`);
  expect(reponse.status()).toBe(403);
  expect(await reponse.text()).not.toContain(chapitre.libelle);
});

test("le rôle commercial gère les abonnements mais n'entre pas dans le back-office contenu", async ({
  page,
}) => {
  const suffixe = Date.now();
  const email = `e2e-lot2-commercial+${suffixe}@test.local`;
  await prisma.utilisateur.create({
    data: {
      nom: "Idrissi",
      prenom: "Karim",
      email,
      telephone: "0611111111",
      mot_de_passe_hash: await hashPassword(MOT_DE_PASSE),
      role: "commercial",
    },
  });

  await connecter(page, email);

  await page.goto("/abonnements");
  await expect(page.getByRole("heading", { name: /Demandes d'accès/ })).toBeVisible();

  // Le contenu pédagogique n'est pas de son périmètre, y compris en tapant
  // l'URL directement : masquer le lien de navigation ne suffirait pas.
  for (const route of ["/contenu/matieres", "/contenu/filieres", "/contenu/fichiers"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/connexion$/);
  }
});

test("l'activation manuelle par l'admin ouvre l'accès immédiatement", async ({ page }) => {
  test.setTimeout(180_000);
  const suffixe = Date.now();
  const { filiere, matiere, chapitre } = await seedContenu(suffixe);
  const { email } = await seedEleve(suffixe, filiere.id);

  const emailAdmin = `e2e-lot2-admin+${suffixe}@test.local`;
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

  // L'admin publie une offre.
  await connecter(page, emailAdmin);
  await page.goto("/abonnements/offres");
  await page.getByLabel("Libellé").fill(`Trimestre ${suffixe}`);
  await page.getByLabel("Durée (jours)").fill("90");
  await page.getByLabel("Nb matières").fill("1");
  await page.getByLabel("Prix (MAD)").fill("600");
  await page.getByRole("button", { name: "Créer" }).click();
  await expect(page.getByText(`Trimestre ${suffixe}`)).toBeVisible();

  // L'élève demande l'accès à la matière.
  await connecter(page, email);
  await page.goto("/demande-acces");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page.getByText("Ta demande est enregistrée.")).toBeVisible();

  // Tant que rien n'est activé, l'accès reste fermé.
  const avant = await page.request.get(`/api/matieres/${matiere.id}/chapitres`);
  expect(avant.status()).toBe(403);

  // L'admin encaisse hors ligne puis active en un clic.
  await connecter(page, emailAdmin);
  await page.goto("/abonnements");
  const ligne = page.getByRole("listitem").filter({ hasText: matiere.libelle });
  await expect(ligne).toBeVisible();
  await ligne.getByLabel("Référence de paiement").fill(`VIR-${suffixe}`);
  await ligne.getByRole("button", { name: "Activer" }).click();
  await expect(page.getByText("Aucune demande en attente.")).toBeVisible();

  // L'accès est ouvert, par l'interface comme par l'API.
  await connecter(page, email);
  await page.goto(`/matieres/${matiere.id}`);
  await expect(page.getByText(chapitre.libelle)).toBeVisible();

  const apres = await page.request.get(`/api/matieres/${matiere.id}/chapitres`);
  expect(apres.status()).toBe(200);
  expect(await apres.text()).toContain(chapitre.libelle);

  // L'activation laisse une trace d'audit.
  const trace = await prisma.journalAdmin.findFirst({
    where: { action: "activation", entite: "abonnement_matiere" },
    orderBy: { cree_le: "desc" },
  });
  expect(trace).not.toBeNull();
});
