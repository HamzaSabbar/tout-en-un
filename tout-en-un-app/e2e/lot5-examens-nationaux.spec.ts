import "./support/env";
import { inflateSync } from "node:zlib";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { test, expect, type Page } from "@playwright/test";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { nettoyerDonneesE2E, PREFIXE_E2E } from "./support/base-test";

// Critère de sortie du lot 5 : « depuis la fiche d'un cours, l'élève accède aux
// extraits de nationaux qui portent sur ce cours. Un PDF téléchargé porte le
// nom de l'élève, un téléphone partiel et la date. »
//
// Deux scénarios : le premier prouve l'accès à un extrait depuis la page de
// cours et le filigrane réellement apposé sur le PDF servi ; le second prouve
// que l'accès à un examen complet respecte la filière de l'élève, pas
// seulement son abonnement à la matière — c'est l'invariant que ce lot ajoute
// au-delà de ce que `verifierAccesMatiere()` couvre déjà.

const MOT_DE_PASSE = "mot-de-passe-eleve-123";

test.afterEach(nettoyerDonneesE2E);

async function connecter(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/compte$/);
}

async function pdfDeTest(texte: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 200]);
  const police = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(texte, { x: 20, y: 100, size: 14, font: police });
  return Buffer.from(await doc.save());
}

// Le texte d'un flux de contenu PDF est compressé (FlateDecode) : décompresser
// chaque `stream ... endstream` avant de chercher le filigrane, exactement
// comme `src/lib/pdf/filigrane.test.ts`.
function texteDecompresse(pdf: Buffer): string {
  const chaine = pdf.toString("latin1");
  const motif = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let morceau: RegExpExecArray | null;
  let texte = "";
  while ((morceau = motif.exec(chaine)) !== null) {
    const debut = pdf.indexOf("stream", morceau.index) + "stream".length;
    const offset = pdf[debut] === 0x0d ? debut + 2 : debut + 1;
    try {
      texte += inflateSync(pdf.subarray(offset, offset + morceau[1].length)).toString("latin1");
    } catch {
      // Flux non compressé : ignoré.
    }
  }
  return texte;
}

function contientFiligrane(pdf: Buffer, mot: string): boolean {
  const decompresse = texteDecompresse(pdf);
  const hex = Buffer.from(mot, "latin1").toString("hex");
  return decompresse.includes(mot) || decompresse.toLowerCase().includes(hex);
}

async function seedStructure(suffixe: number) {
  const filiere = await prisma.filiere.create({
    data: { code: `${PREFIXE_E2E}-N5-F-${suffixe}`, libelle: `${PREFIXE_E2E} Sciences ${suffixe}` },
  });
  const autreFiliere = await prisma.filiere.create({
    data: { code: `${PREFIXE_E2E}-N5-FB-${suffixe}`, libelle: `${PREFIXE_E2E} SVT ${suffixe}` },
  });
  const matiere = await prisma.matiere.create({
    data: { code: `${PREFIXE_E2E}-N5-M-${suffixe}`, libelle: `${PREFIXE_E2E} Physique ${suffixe}`, statut: "publie" },
  });
  await prisma.filiereMatiere.createMany({
    data: [
      { filiere_id: filiere.id, matiere_id: matiere.id },
      { filiere_id: autreFiliere.id, matiere_id: matiere.id },
    ],
  });
  const chapitre = await prisma.chapitre.create({
    data: { matiere_id: matiere.id, libelle: `${PREFIXE_E2E} Mécanique ${suffixe}`, statut: "publie" },
  });
  const cours = await prisma.cours.create({
    data: {
      chapitre_id: chapitre.id,
      titre: `${PREFIXE_E2E} Cinématique ${suffixe}`,
      statut: "publie",
      publie_le: new Date(),
    },
  });

  const emailAdmin = `e2e-lot5-admin+${suffixe}@test.local`;
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

  async function creerEleveAbonne(prefixeEmail: string, nom: string, prenom: string, telephone: string, filiereId: bigint) {
    const email = `${prefixeEmail}+${suffixe}@test.local`;
    const eleve = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email,
        telephone,
        filiere_id: filiereId,
        mot_de_passe_hash: await hashPassword(MOT_DE_PASSE),
        role: "eleve",
      },
    });
    const offre = await prisma.offre.create({
      data: { libelle: `${PREFIXE_E2E} Offre ${email}`, duree_jours: 90, nb_matieres: 1, prix: 600 },
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
    return { eleve, email };
  }

  // Élève A : filière du cours, celle visée par l'extrait et l'examen.
  const { eleve: eleveA, email: emailEleveA } = await creerEleveAbonne(
    "e2e-lot5-eleve-a",
    "Alami",
    "Sara",
    "0612345678",
    filiere.id,
  );
  // Élève B : abonné à la même matière, mais une autre filière — sert à
  // prouver le filtrage par filière de `examen_national`.
  const { eleve: eleveB, email: emailEleveB } = await creerEleveAbonne(
    "e2e-lot5-eleve-b",
    "Benali",
    "Yassine",
    "0698765432",
    autreFiliere.id,
  );

  return { filiere, autreFiliere, matiere, chapitre, cours, eleveA, emailEleveA, eleveB, emailEleveB, emailAdmin };
}

test("un extrait national créé au back-office est accessible depuis la page de cours, filigrane apposé", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const suffixe = Date.now();
  const fixture = await seedStructure(suffixe);
  const routeCoursAdmin = `/contenu/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}`;
  const routeCoursEleve = `/matieres/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}`;
  const sujetOriginal = await pdfDeTest(`Sujet ${suffixe}`);

  // 1. L'admin crée l'extrait par le vrai formulaire du back-office, sujet
  // PDF compris.
  await connecter(page, fixture.emailAdmin);
  await page.goto(routeCoursAdmin);
  const formulaireExtrait = page.locator("form", { has: page.locator('input[name="sujet"]') });
  await formulaireExtrait.getByLabel("Énoncé (bref descriptif)").fill(`${PREFIXE_E2E} Chute libre ${suffixe}`);
  await formulaireExtrait.getByLabel("Année").fill("2024");
  await formulaireExtrait.locator('input[name="sujet"]').setInputFiles({
    name: `${PREFIXE_E2E}-sujet-${suffixe}.pdf`,
    mimeType: "application/pdf",
    buffer: sujetOriginal,
  });
  await formulaireExtrait.getByRole("button", { name: "Ajouter" }).click();

  const ligneExtrait = page.getByRole("listitem").filter({ hasText: "2024" });
  await expect(ligneExtrait).toBeVisible();
  await expect(ligneExtrait.getByText("brouillon", { exact: true })).toBeVisible();

  // 2. Brouillon : rien côté élève.
  await connecter(page, fixture.emailEleveA);
  await page.goto(routeCoursEleve);
  await page.getByRole("tab", { name: "Nationaux" }).click();
  await expect(page.getByText("Aucun extrait d'examen national")).toBeVisible();

  // 3. L'admin publie.
  await connecter(page, fixture.emailAdmin);
  await page.goto(routeCoursAdmin);
  await ligneExtrait.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(ligneExtrait.getByText("publie", { exact: true })).toBeVisible();

  const extrait = await prisma.extraitNational.findFirstOrThrow({
    where: { cours_id: fixture.cours.id },
    select: { id: true },
  });

  // 4. Visible et accessible côté élève, immédiatement (invalidation de cache
  // ciblée, comme pour tout autre contenu).
  await connecter(page, fixture.emailEleveA);
  await page.goto(routeCoursEleve);
  await page.getByRole("tab", { name: "Nationaux" }).click();
  const urlSujet = `/api/matieres/${fixture.matiere.id}/nationaux/extraits/${extrait.id}/sujet`;
  await expect(page.locator(`a[href="${urlSujet}"]`)).toBeVisible();

  // 5. Le PDF réellement servi est un vrai PDF, différent de l'original, et
  // porte le nom, le prénom et une trace du téléphone de l'élève : c'est le
  // critère de sortie du lot.
  const reponse = await page.request.get(urlSujet);
  expect(reponse.status()).toBe(200);
  expect(reponse.headers()["content-type"]).toBe("application/pdf");
  const pdfServi = await reponse.body();

  const relu = await PDFDocument.load(pdfServi);
  expect(relu.getPageCount()).toBe(1);
  expect(pdfServi.byteLength).toBeGreaterThan(sujetOriginal.byteLength);
  expect(contientFiligrane(pdfServi, "Sara"), "le prénom de l'élève doit figurer dans le PDF servi").toBe(true);
  expect(contientFiligrane(pdfServi, "Alami"), "le nom de l'élève doit figurer dans le PDF servi").toBe(true);
  // Téléphone partiel : les 4 derniers chiffres restent lisibles (voir
  // `deriverTelephonePartiel`, src/modules/parcours-eleve/national.ts).
  expect(contientFiligrane(pdfServi, "5678"), "les 4 derniers chiffres du téléphone doivent figurer").toBe(true);

  // 6. Un élève sans accès à la matière ne reçoit rien.
  await page.context().clearCookies();
  const reponseAnonyme = await page.request.get(urlSujet);
  expect(reponseAnonyme.status()).toBe(401);
});

test("un examen national est scopé à la filière de l'élève, pas seulement à son abonnement", async ({ page }) => {
  test.setTimeout(120_000);

  const suffixe = Date.now();
  const fixture = await seedStructure(suffixe);
  const routeExamensAdmin = `/contenu/${fixture.matiere.id}/examens`;
  const sujetOriginal = await pdfDeTest(`Examen ${suffixe}`);

  await connecter(page, fixture.emailAdmin);
  await page.goto(routeExamensAdmin);
  const formulaireExamen = page.locator("form", { has: page.locator('input[name="sujet"]') });
  await formulaireExamen.getByLabel("Filière").selectOption({ label: fixture.filiere.libelle });
  await formulaireExamen.getByLabel("Année").fill("2024");
  await formulaireExamen.locator('input[name="sujet"]').setInputFiles({
    name: `${PREFIXE_E2E}-examen-${suffixe}.pdf`,
    mimeType: "application/pdf",
    buffer: sujetOriginal,
  });
  await formulaireExamen.getByRole("button", { name: "Ajouter" }).click();

  const ligneExamen = page.getByRole("listitem").filter({ hasText: fixture.filiere.libelle });
  await expect(ligneExamen).toBeVisible();
  await ligneExamen.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(ligneExamen.getByText("publie", { exact: true })).toBeVisible();

  const examen = await prisma.examenNational.findFirstOrThrow({
    where: { matiere_id: fixture.matiere.id },
    select: { id: true },
  });
  const urlSujet = `/api/matieres/${fixture.matiere.id}/nationaux/examens/${examen.id}/sujet`;
  const routeExamensEleve = `/matieres/${fixture.matiere.id}/examens`;

  // Élève A, même filière que l'examen : le voit et peut ouvrir le sujet.
  await connecter(page, fixture.emailEleveA);
  await page.goto(routeExamensEleve);
  await expect(page.getByText("2024")).toBeVisible();
  const reponseA = await page.request.get(urlSujet);
  expect(reponseA.status()).toBe(200);

  // Élève B, abonné à la même matière mais une autre filière : la page ne le
  // montre pas, et l'accès direct à la route est refusé — c'est l'invariant
  // que `examen_national` ajoute au-delà du simple contrôle d'accès matière.
  await connecter(page, fixture.emailEleveB);
  await page.goto(routeExamensEleve);
  await expect(page.getByText("2024")).toHaveCount(0);
  const reponseB = await page.request.get(urlSujet);
  expect(reponseB.status()).toBe(404);
});
