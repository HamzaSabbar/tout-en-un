import "./support/env";
import { test, expect, type Page } from "@playwright/test";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { nettoyerDonneesE2E, PREFIXE_E2E } from "./support/base-test";

// Critère de sortie : un élève qui répond « Non » sur un exercice ouvre le
// formulaire du carnet, sa note apparaît sur `/carnet` avec le bon fil
// matière/chapitre/cours, il peut la modifier et la supprimer, et répondre
// « Non » à nouveau après suppression rouvre un formulaire vide (pas de
// pré-remplissage d'une note qui n'existe plus).
//
// Contenu (filière, matière, chapitre, cours, exercice) créé directement via
// Prisma, comme `seedCoursAvecTest` dans lot6-test-qcm.spec.ts : ce scénario
// prouve le parcours élève du carnet, pas le formulaire d'auteur d'exercice
// du back-office (déjà couvert par lot4-exercices.spec.ts).

const MOT_DE_PASSE = "mot-de-passe-eleve-123";

test.afterEach(nettoyerDonneesE2E);

async function connecter(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/compte$/, { timeout: 30_000 });
}

async function seedCoursAvecExercice(suffixe: number) {
  const filiere = await prisma.filiere.create({
    data: { code: `${PREFIXE_E2E}-CN-F-${suffixe}`, libelle: `${PREFIXE_E2E} Filière ${suffixe}` },
  });
  const matiere = await prisma.matiere.create({
    data: { code: `${PREFIXE_E2E}-CN-M-${suffixe}`, libelle: `${PREFIXE_E2E} Physique ${suffixe}`, statut: "publie" },
  });
  await prisma.filiereMatiere.create({ data: { filiere_id: filiere.id, matiere_id: matiere.id } });
  const chapitre = await prisma.chapitre.create({
    data: { matiere_id: matiere.id, libelle: `${PREFIXE_E2E} Les ondes`, statut: "publie" },
  });
  const cours = await prisma.cours.create({
    data: { chapitre_id: chapitre.id, titre: `${PREFIXE_E2E} Ondes mécaniques`, statut: "publie" },
  });
  const exercice = await prisma.exercice.create({
    data: {
      cours_id: cours.id,
      titre: "Une perturbation se déplace sur une corde",
      enonce: { version: 1, noeuds: [{ type: "paragraphe", texte: "Calculer la célérité." }] },
      categorie: "comprehension",
      statut: "publie",
    },
  });

  const emailEleve = `e2e-carnet-eleve+${suffixe}@test.local`;
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

  return { matiere, chapitre, cours, exercice, emailEleve, eleveId: eleve.id };
}

test("un élève note une erreur depuis l'exercice, la retrouve sur son carnet, la modifie, la supprime", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const suffixe = Date.now();
  const fixture = await seedCoursAvecExercice(suffixe);
  const routeCours = `/matieres/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}`;

  await connecter(page, fixture.emailEleve);

  // 1. Répondre « Non » sur l'exercice ouvre le formulaire du carnet.
  await page.goto(routeCours);
  await page.getByRole("tab", { name: /Exercices/i }).click();
  const carte = page.locator("[data-exercice-card]").first();
  const bilan = carte.locator('[data-etape="auto-evaluation"]');
  await expect(bilan.getByText("Tu as réussi cet exercice ?")).toBeVisible();
  await bilan.getByRole("button", { name: "Non", exact: true }).click();
  const champErreur = bilan.getByLabel("Quelle erreur as-tu faite ?");
  await expect(champErreur).toBeVisible({ timeout: 30_000 });

  await champErreur.fill("J'ai confondu vitesse et célérité.");
  await bilan.getByLabel("Qu'est-ce que tu retiens ?").fill("La célérité est la vitesse de propagation.");
  await bilan.getByRole("button", { name: "Enregistrer dans mon carnet" }).click();
  await expect(bilan.getByText("Ajouté à ton carnet.")).toBeVisible({ timeout: 30_000 });

  const noteEnBase = await prisma.carnetErreur.findFirstOrThrow({
    where: { utilisateur_id: fixture.eleveId, exercice_id: fixture.exercice.id },
  });
  expect(noteEnBase.erreur).toBe("J'ai confondu vitesse et célérité.");
  expect(noteEnBase.retenu).toBe("La célérité est la vitesse de propagation.");

  // 2. La note apparaît sur /carnet avec le bon fil matière/chapitre/cours.
  // Scopée à la carte (le libellé de la matière apparaît aussi dans le
  // filtre) via le lien vers l'exercice, unique sur la page.
  await page.goto("/carnet");
  const lienExercice = page.getByRole("link", { name: fixture.exercice.titre });
  await expect(lienExercice).toBeVisible({ timeout: 30_000 });
  const carteCarnet = lienExercice.locator("..");
  await expect(carteCarnet.getByText(fixture.matiere.libelle, { exact: false })).toBeVisible();
  await expect(carteCarnet.getByText(fixture.chapitre.libelle, { exact: false })).toBeVisible();
  await expect(carteCarnet.getByText(fixture.cours.titre, { exact: false })).toBeVisible();

  // 3. Modifier depuis /carnet met à jour la ligne en base, pas une nouvelle.
  await page.getByRole("button", { name: "Modifier" }).click();
  await page.getByLabel("Quelle erreur as-tu faite ?").fill("Erreur modifiée depuis le carnet.");
  await page.getByRole("button", { name: "Enregistrer dans mon carnet" }).click();
  await expect(page.getByText("Erreur modifiée depuis le carnet.")).toBeVisible({ timeout: 30_000 });
  expect(await prisma.carnetErreur.count({ where: { utilisateur_id: fixture.eleveId } })).toBe(1);

  // 4. Supprimer retire la ligne et affiche l'état vide.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText(/carnet est vide/i)).toBeVisible({ timeout: 30_000 });
  expect(await prisma.carnetErreur.count({ where: { utilisateur_id: fixture.eleveId } })).toBe(0);

  // 5. Répondre « Non » à nouveau ouvre un formulaire vide, pas une note fantôme.
  await page.goto(routeCours);
  await page.getByRole("tab", { name: /Exercices/i }).click();
  await bilan.getByRole("button", { name: "Non", exact: true }).click();
  await expect(champErreur).toBeVisible({ timeout: 30_000 });
  await expect(champErreur).toHaveValue("");
});
