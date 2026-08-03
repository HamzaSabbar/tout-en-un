import "./support/env";
import { test, expect, type Page } from "@playwright/test";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { nettoyerDonneesE2E, PREFIXE_E2E } from "./support/base-test";

// Ce scénario prouve le parcours PDF de bout en bout **par le vrai back-office** :
// téléversement par le formulaire, publication par le bouton, puis lecture par un
// élève abonné jusqu'aux octets du fichier. Aucun `statut: "publie"` n'est écrit
// directement en base : c'est précisément le défaut que ce test verrouille, un
// document téléversé restait invisible pour toujours faute de chemin de
// publication.

const MOT_DE_PASSE = "mot-de-passe-eleve-123";

// PDF minimal mais structurellement valide. Construit en mémoire plutôt que
// stocké en binaire dans le dépôt.
const PDF = Buffer.from(
  "%PDF-1.4\n" +
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n" +
    "trailer<</Root 1 0 R>>\n" +
    "%%EOF\n",
  "latin1",
);

test.afterEach(nettoyerDonneesE2E);

async function connecter(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/compte$/);
}

// La structure est semée en base : sa création par le back-office est déjà
// couverte par lot1-contenu.spec.ts. Le sujet de ce scénario est le document, et
// c'est la seule chose qui passe par l'interface.
async function seedStructure(suffixe: number) {
  const filiere = await prisma.filiere.create({
    data: {
      code: `${PREFIXE_E2E}-BO-F-${suffixe}`,
      libelle: `${PREFIXE_E2E} Sciences ${suffixe}`,
    },
  });
  const matiere = await prisma.matiere.create({
    data: {
      code: `${PREFIXE_E2E}-BO-M-${suffixe}`,
      libelle: `${PREFIXE_E2E} Physique ${suffixe}`,
      statut: "publie",
    },
  });
  await prisma.filiereMatiere.create({
    data: { filiere_id: filiere.id, matiere_id: matiere.id },
  });
  const chapitre = await prisma.chapitre.create({
    data: {
      matiere_id: matiere.id,
      libelle: `${PREFIXE_E2E} Mécanique ${suffixe}`,
      statut: "publie",
    },
  });
  const cours = await prisma.cours.create({
    data: {
      chapitre_id: chapitre.id,
      titre: `${PREFIXE_E2E} Cinématique ${suffixe}`,
      statut: "publie",
      publie_le: new Date(),
    },
  });

  // Minuscules et préfixe « e2e » obligatoires : nettoyerDonneesE2E() supprime
  // les fichiers téléversés par `televerse_par`, avec un startsWith sensible à la
  // casse. Un admin nommé autrement laisserait sa ligne `fichier` derrière lui.
  const emailAdmin = `e2e-lot3-bo-admin+${suffixe}@test.local`;
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

  const emailEleve = `e2e-lot3-bo-eleve+${suffixe}@test.local`;
  const eleve = await prisma.utilisateur.create({
    data: {
      nom: "Alami",
      prenom: "Sara",
      email: emailEleve,
      telephone: "0612345678",
      filiere_id: filiere.id,
      mot_de_passe_hash: await hashPassword(MOT_DE_PASSE),
      role: "eleve",
    },
  });

  const offre = await prisma.offre.create({
    data: {
      libelle: `${PREFIXE_E2E} Offre ${suffixe}`,
      duree_jours: 90,
      nb_matieres: 1,
      prix: 600,
    },
  });
  const abonnement = await prisma.abonnement.create({
    data: {
      utilisateur_id: eleve.id,
      offre_id: offre.id,
      statut: "actif",
      montant: 600,
      date_debut: new Date(),
    },
  });
  await prisma.abonnementMatiere.create({
    data: {
      abonnement_id: abonnement.id,
      matiere_id: matiere.id,
      date_expiration: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  return { matiere, chapitre, cours, emailAdmin, emailEleve };
}

test("un PDF téléversé et publié par le back-office est réellement ouvert par l'élève", async ({
  page,
}) => {
  // Deux connexions, un téléversement et plusieurs rendus serveur : le budget de
  // 60 s par défaut est trop court.
  //
  // Ce scénario est écrit pour le build de production, celui que lance
  // l'intégration continue. Sur un serveur de développement, la compilation à la
  // demande des quatre routes visitées peut dépasser le délai des assertions,
  // exactement comme le note le scénario de performance de lot3-parcours-eleve.
  test.setTimeout(120_000);

  const suffixe = Date.now();
  const fixture = await seedStructure(suffixe);
  const titreDocument = `${PREFIXE_E2E} Cours PDF ${suffixe}`;
  const routeCoursEleve = `/matieres/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}`;
  const routeCoursAdmin = `/contenu/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}`;

  // 1. L'admin téléverse par le formulaire réel du back-office. Le formulaire de
  // création de vidéo, sur la même page, porte aussi un champ « Titre » : le
  // périmètre est donc réduit au formulaire de téléversement.
  await connecter(page, fixture.emailAdmin);
  await page.goto(routeCoursAdmin);
  const formulaire = page.locator("form", {
    has: page.locator('input[name="fichier"]'),
  });
  await formulaire.getByLabel("Titre").fill(titreDocument);
  await formulaire.getByLabel("Type").selectOption("cours_pdf");
  await formulaire.getByLabel("Fichier PDF").setInputFiles({
    name: `${PREFIXE_E2E}-cours-${suffixe}.pdf`,
    mimeType: "application/pdf",
    buffer: PDF,
  });
  await formulaire.getByRole("button", { name: "Téléverser" }).click();

  const ligneDocument = page.getByRole("listitem").filter({ hasText: titreDocument });
  await expect(ligneDocument).toBeVisible();
  // Un téléversement ne publie rien : la publication reste un geste distinct.
  // `exact` partout sur les statuts : le libellé du bouton « Dépublier »
  // contient « publie », et une correspondance partielle rendrait l'assertion
  // dépendante de l'ordre de rendu.
  await expect(ligneDocument.getByText("brouillon", { exact: true })).toBeVisible();

  // 2. Tant que le document est en brouillon, l'élève ne le voit pas. Cette
  // visite met aussi la page de cours en cache dans son état vide, ce qui rend
  // l'étape 4 un vrai test de l'invalidation ciblée.
  await connecter(page, fixture.emailEleve);
  await page.goto(routeCoursEleve);
  await expect(page.getByText("Aucun document publié pour ce cours.")).toBeVisible();
  await expect(page.getByText(titreDocument)).toHaveCount(0);

  // 3. L'admin publie par le bouton.
  await connecter(page, fixture.emailAdmin);
  await page.goto(routeCoursAdmin);
  await ligneDocument.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(ligneDocument.getByText("publie", { exact: true })).toBeVisible();

  // 4. Le document apparaît immédiatement chez l'élève. Sans invalidation du
  // cache à la publication, la page resterait vide une heure : pas de boucle de
  // reprise ici, une reprise ne sauverait rien et masquerait le diagnostic.
  await connecter(page, fixture.emailEleve);
  await page.goto(routeCoursEleve);
  await expect(page.getByText(titreDocument)).toBeVisible();

  // 5. Le lien ne porte que des identifiants publics, et la clé de stockage
  // réellement attribuée par le back-office n'apparaît ni dans le HTML ni dans le
  // RSC. Le périmètre de cette règle est le corps des réponses, pas l'en-tête
  // Location d'une redirection signée, qui contient la clé par construction, y
  // compris avec un vrai Supabase.
  const enregistre = await relireDocument(titreDocument);
  const lien = page.getByRole("link", { name: "Lire le PDF" });
  const href = await lien.getAttribute("href");
  expect(href).toBe(
    `/api/matieres/${fixture.matiere.id}/documents/${enregistre.id}/lecture`,
  );

  const reponseRsc = await page.request.get(routeCoursEleve, {
    headers: { Accept: "text/x-component", RSC: "1" },
  });
  for (const [source, corps] of [
    ["HTML", await page.content()],
    ["RSC", await reponseRsc.text()],
  ] as const) {
    expect(corps, `${source} contient la clé de stockage`).not.toContain(
      enregistre.cleStockage,
    );
  }

  // 6. La route de lecture redirige vers une URL signée de courte durée.
  const redirection = await page.request.get(href!, { maxRedirects: 0 });
  expect(redirection.status()).toBe(307);
  expect(await redirection.text()).toBe("");

  const urlSignee = redirection.headers()["location"];
  expect(urlSignee).toMatch(/^http:\/\/localhost:3000\/api\/stockage-local\//);
  expect(urlSignee).toContain("expire=");
  expect(urlSignee).toContain("signature=");

  // 7. Et l'élève obtient réellement les octets téléversés.
  const pdf = await page.request.get(urlSignee);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect(pdf.headers()["x-content-type-options"]).toBe("nosniff");
  const octets = await pdf.body();
  expect(octets.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(octets.equals(PDF)).toBe(true);

  // 8. Une signature altérée ou périmée ne donne rien, sans distinguer les deux.
  const alteree = new URL(urlSignee);
  const signature = alteree.searchParams.get("signature")!;
  alteree.searchParams.set(
    "signature",
    `${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`,
  );
  const refusee = await page.request.get(alteree.toString());
  expect(refusee.status()).toBe(403);
  expect(await refusee.text()).toBe("");

  const perimee = new URL(urlSignee);
  perimee.searchParams.set("expire", "1000000000");
  const expiree = await page.request.get(perimee.toString());
  expect(expiree.status()).toBe(403);
  expect(await expiree.text()).toBe("");
});

// L'identifiant et la clé de stockage ne sont connus qu'après le téléversement,
// et le back-office ne les expose pas : on les relit par le titre, qui porte le
// préfixe E2E. La clé sert uniquement d'aiguille pour vérifier qu'elle ne fuit
// nulle part.
async function relireDocument(titre: string) {
  const document = await prisma.document.findFirstOrThrow({
    where: { titre },
    select: { id: true, fichier: { select: { cle_stockage: true } } },
  });
  return {
    id: document.id.toString(),
    cleStockage: document.fichier.cle_stockage,
  };
}
