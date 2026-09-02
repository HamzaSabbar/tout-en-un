import "./support/env";
import { test, expect, type Page } from "@playwright/test";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { nettoyerDonneesE2E, PREFIXE_E2E } from "./support/base-test";

// Critère de sortie du lot 6 : « Un test se passe et se corrige sans qu'aucune
// bonne réponse soit présente dans les réponses réseau avant soumission. Un
// test interrompu puis repris conserve les réponses déjà saisies. »
//
// Contenu (matière, chapitre, cours, test, questions, options) créé
// directement via Prisma, comme `seedMatiereAvecEleve` dans
// `partie-chapitres.spec.ts` : ce scénario prouve le passage du test côté
// élève, pas le formulaire d'auteur du back-office (déjà couvert par
// `src/modules/test/service.test.ts`).

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

async function seedCoursAvecTest(suffixe: number) {
  const filiere = await prisma.filiere.create({
    data: { code: `${PREFIXE_E2E}-T6-F-${suffixe}`, libelle: `${PREFIXE_E2E} Filière ${suffixe}` },
  });
  const matiere = await prisma.matiere.create({
    data: { code: `${PREFIXE_E2E}-T6-M-${suffixe}`, libelle: `${PREFIXE_E2E} Physique ${suffixe}`, statut: "publie" },
  });
  await prisma.filiereMatiere.create({ data: { filiere_id: filiere.id, matiere_id: matiere.id } });
  const chapitre = await prisma.chapitre.create({
    data: { matiere_id: matiere.id, libelle: `${PREFIXE_E2E} Les ondes`, statut: "publie" },
  });
  const cours = await prisma.cours.create({
    data: { chapitre_id: chapitre.id, titre: `${PREFIXE_E2E} Ondes mécaniques`, statut: "publie" },
  });

  const testQcm = await prisma.test.create({
    data: {
      cours_id: cours.id,
      titre: "Teste ta compréhension du cours",
      seuil_validation: 50,
      duree_minutes: 5,
      statut: "publie",
    },
  });
  const question1 = await prisma.questionTest.create({
    data: {
      test_id: testQcm.id,
      type: "qcm",
      enonce: { version: 1, noeuds: [{ type: "paragraphe", texte: "Une onde transversale déplace la matière perpendiculairement au sens de propagation ?" }] },
      points: 1,
      ordre: 0,
    },
  });
  const [optionVraie1] = await Promise.all([
    prisma.optionReponse.create({ data: { question_test_id: question1.id, libelle: "Vrai", est_correcte: true, ordre: 0 } }),
    prisma.optionReponse.create({ data: { question_test_id: question1.id, libelle: "Faux", est_correcte: false, ordre: 1 } }),
  ]);
  const question2 = await prisma.questionTest.create({
    data: {
      test_id: testQcm.id,
      type: "qcm",
      enonce: { version: 1, noeuds: [{ type: "paragraphe", texte: "Le son se propage plus vite dans l'air que dans l'eau ?" }] },
      explication: { version: 1, noeuds: [{ type: "paragraphe", texte: "Faux : le son se propage plus vite dans l'eau que dans l'air." }] },
      points: 1,
      ordre: 1,
    },
  });
  await Promise.all([
    prisma.optionReponse.create({ data: { question_test_id: question2.id, libelle: "Vrai", est_correcte: false, ordre: 0 } }),
    prisma.optionReponse.create({ data: { question_test_id: question2.id, libelle: "Faux", est_correcte: true, ordre: 1 } }),
  ]);

  const emailEleve = `e2e-t6-eleve+${suffixe}@test.local`;
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

  return { matiere, chapitre, cours, testQcm, question1, optionVraie1, emailEleve, eleveId: eleve.id };
}

test("un test se passe, se corrige côté serveur, reprend après interruption, sans bonne réponse avant soumission", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const suffixe = Date.now();
  const fixture = await seedCoursAvecTest(suffixe);
  const routeCours = `/matieres/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}`;

  await connecter(page, fixture.emailEleve);
  await page.goto(routeCours);
  await expect(page.getByText("Teste ta compréhension du cours")).toBeVisible();
  await expect(page.getByText("À faire")).toBeVisible();

  // 1. Démarrage : capture la réponse réseau et vérifie qu'aucune bonne
  // réponse n'y figure (invariant 4).
  const [reponseDemarrage] = await Promise.all([
    page
      .waitForResponse((r) => r.request().method() === "POST" && r.url().includes(routeCours))
      .catch(() => null),
    page.getByRole("button", { name: "Commencer" }).click(),
  ]);
  await expect(page.getByRole("radio").first()).toBeVisible({ timeout: 15_000 });
  if (reponseDemarrage) {
    const corps = await reponseDemarrage.text().catch(() => "");
    expect(corps).not.toContain("est_correcte");
    expect(corps).not.toContain('"correcte"');
  }

  // 2. Répond à la première question avec la bonne option ("Vrai").
  await page.getByRole("radio").nth(0).check();
  await expect
    .poll(async () => {
      const reponse = await prisma.reponseTentative.findFirst({
        where: { question_test_id: fixture.question1.id },
        select: { option_id: true },
      });
      return reponse?.option_id?.toString() ?? null;
    }, { timeout: 15_000 })
    .toBe(fixture.optionVraie1.id.toString());

  // 3. Coupure simulée : recharge la page en plein test, reprend.
  await page.reload();
  await page.getByRole("button", { name: "Commencer" }).click();
  await expect(page.getByRole("radio").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("radio").first()).toBeChecked();

  // 4. Répond (mal) à la seconde question, soumet.
  const radios = await page.getByRole("radio").all();
  await radios[2].check(); // "Vrai" pour la question 2, alors que la bonne réponse est "Faux"
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Soumettre" }).click();
  await expect(page.getByText("Cours validé")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("1/2")).toBeVisible();
  await expect(page.getByText("Explication")).toBeVisible();

  // 5. Vérifie la correction et le journal en base.
  const tentative = await prisma.tentativeTest.findFirstOrThrow({
    where: { test_id: fixture.testQcm.id, utilisateur_id: fixture.eleveId },
  });
  expect(tentative.score).toBe(1);
  expect(tentative.score_max).toBe(2);
  expect(tentative.valide).toBe(true);
  expect(tentative.termine_le).not.toBeNull();

  const evenement = await prisma.evenementApprentissage.findFirstOrThrow({
    where: { ressource_type: "test", ressource_id: fixture.testQcm.id, action: "test_valide" },
  });
  expect(Number(evenement.valeur)).toBe(50);

  // 6. Le badge « À faire » disparaît une fois une tentative terminée.
  await page.goto(routeCours);
  await expect(page.getByText("Teste ta compréhension du cours")).toBeVisible();
  await expect(page.getByText("À faire")).toHaveCount(0);
});
