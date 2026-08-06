import "./support/env";
import { test, expect, type Page } from "@playwright/test";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { nettoyerDonneesE2E, PREFIXE_E2E } from "./support/base-test";

// Critère de sortie du lot 4 : « le professeur crée un exercice contenant formules
// LaTeX et image, et l'élève le traite étape par étape, sur écran large comme
// depuis un téléphone. Chaque étape franchie produit une ligne dans
// `evenement_apprentissage`. »
//
// Tout passe par le vrai back-office : téléversement de l'image par le
// formulaire, création de l'exercice par le formulaire, publication par le
// bouton. Rien n'est écrit directement en base côté exercice — c'est la leçon du
// lot 3, où une fixture qui forçait `statut: "publie"` avait masqué l'absence de
// tout chemin de publication.

const MOT_DE_PASSE = "mot-de-passe-eleve-123";

// PNG 1×1 valide, construit en mémoire plutôt que stocké en binaire dans le
// dépôt.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

const REFERENCE_VIDEO = "e2eVideo01";

// Textes-témoins. Ils servent deux fois : à voir apparaître le contenu de
// l'étape, et à prouver qu'il était absent avant. Des chaînes improbables pour
// que l'assertion d'absence ait un sens.
const TEMOIN_AIDE = "IndiceReserveALEtapeAide";
const TEMOIN_CORRECTION = "ResultatReserveALEtapeCorrection";

test.afterEach(nettoyerDonneesE2E);

async function connecter(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/compte$/);
}

// La structure est semée : sa création par le back-office est déjà couverte par
// lot1-contenu.spec.ts. Le sujet ici est l'exercice.
async function seedStructure(suffixe: number) {
  const filiere = await prisma.filiere.create({
    data: {
      code: `${PREFIXE_E2E}-EX-F-${suffixe}`,
      libelle: `${PREFIXE_E2E} Sciences ${suffixe}`,
    },
  });
  const matiere = await prisma.matiere.create({
    data: {
      code: `${PREFIXE_E2E}-EX-M-${suffixe}`,
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

  // Minuscules et préfixe « e2e » obligatoires : le nettoyage supprime les
  // fichiers par `televerse_par`, avec un `startsWith` sensible à la casse.
  const emailAdmin = `e2e-lot4-admin+${suffixe}@test.local`;
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

  const emailEleve = `e2e-lot4-eleve+${suffixe}@test.local`;
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

  return { matiere, chapitre, cours, eleve, emailAdmin, emailEleve };
}

function contenuRiche(noeuds: unknown[]): string {
  return JSON.stringify({ version: 1, noeuds });
}

// Téléverse l'image par le formulaire du back-office, puis relit l'identifiant de
// fichier **tel que le back-office l'affiche**. C'est ce nombre que le professeur
// recopie dans son contenu riche : le lire sur la page prouve que le parcours de
// saisie se tient, plutôt que de court-circuiter par la base.
async function televerserImage(page: Page, routeCoursAdmin: string, suffixe: number) {
  const titreImage = `${PREFIXE_E2E} Schema ${suffixe}`;
  await page.goto(routeCoursAdmin);

  const formulaire = page.locator("form", { has: page.locator('input[name="fichier"]') });
  await formulaire.getByLabel("Titre").fill(titreImage);
  await formulaire.getByLabel("Type").selectOption("image_exercice");
  await formulaire.getByLabel("Image").setInputFiles({
    name: `${PREFIXE_E2E}-schema-${suffixe}.png`,
    mimeType: "image/png",
    buffer: PNG,
  });
  await formulaire.getByRole("button", { name: "Téléverser" }).click();

  const ligne = page.getByRole("listitem").filter({ hasText: titreImage });
  await expect(ligne).toBeVisible();
  const texte = (await ligne.textContent()) ?? "";
  const trouve = texte.match(/fichier_id (\d+)/);
  expect(trouve, "le back-office doit afficher l'identifiant du fichier image").not.toBeNull();
  return trouve![1];
}

async function evenements(matiereId: bigint, exerciceId: bigint) {
  return prisma.evenementApprentissage.findMany({
    where: {
      matiere_id: matiereId,
      ressource_type: "exercice",
      ressource_id: exerciceId,
    },
    orderBy: { id: "asc" },
    select: {
      action: true,
      utilisateur_id: true,
      chapitre_id: true,
      cours_id: true,
    },
  });
}

async function actionsJournalisees(matiereId: bigint, exerciceId: bigint) {
  return (await evenements(matiereId, exerciceId)).map((ligne) => ligne.action);
}

test("un exercice créé au back-office est traité étape par étape par l'élève", async ({
  page,
}) => {
  // Deux téléversements par formulaire, six connexions, cinq franchissements
  // d'étape et autant de rendus serveur : le budget de 60 s par défaut est très
  // loin du compte. Écrit pour le build de production, celui que lance
  // l'intégration continue.
  //
  // Les franchissements portent en plus un délai explicite : chacun est une
  // redirection suivie d'un rendu serveur, et sur une machine à court de mémoire
  // ce cycle a été mesuré à plusieurs secondes. Le délai par défaut de 15 s
  // faisait alors échouer la recette à un endroit variable, ce qui ressemblait à
  // un défaut alors que c'était une attente trop courte.
  test.setTimeout(300_000);
  const DELAI_ETAPE = { timeout: 45_000 };

  const suffixe = Date.now();
  const fixture = await seedStructure(suffixe);
  const titreExercice = `${PREFIXE_E2E} Chute libre ${suffixe}`;
  const routeCoursAdmin = `/contenu/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}`;
  const routeCoursEleve = `/matieres/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}`;

  // Aucun **script** KaTeX ne doit partir vers une page élève : le rendu est fait
  // sur le serveur, et c'est ce qui permet d'ajouter le LaTeX sans entamer les
  // 200 Ko par page.
  //
  // Le filtre porte sur le type de ressource, pas sur l'extension. Une première
  // version rejetait « tout ce qui n'est pas .css » et échouait sur les polices
  // `KaTeX_Math-Italic.woff2` : une feuille de style et ses polices sont
  // précisément ce que le navigateur est censé recevoir. Ce qui est interdit,
  // c'est du JavaScript.
  const scriptsKatex: string[] = [];
  page.on("request", (requete) => {
    const url = requete.url();
    if (!/katex/i.test(url)) return;
    if (requete.resourceType() === "script" || /\.m?js(\?|$)/.test(url)) {
      scriptsKatex.push(url);
    }
  });

  // 1. L'admin téléverse l'image, puis crée l'exercice par le formulaire réel.
  await connecter(page, fixture.emailAdmin);
  const fichierId = await televerserImage(page, routeCoursAdmin, suffixe);

  const formulaireExercice = page.locator("form", {
    has: page.locator('textarea[name="enonce"]'),
  });
  await formulaireExercice.getByLabel("Titre").fill(titreExercice);
  await formulaireExercice.getByLabel("Énoncé (contenu riche JSON)").fill(
    contenuRiche([
      { type: "paragraphe", texte: "Un mobile tombe et sa vitesse $v$ augmente." },
      { type: "formule", latex: "v = g \\times t", bloc: true },
      { type: "image", fichier_id: fichierId, alt: "Schéma de la chute" },
    ]),
  );
  await formulaireExercice
    .getByLabel("Aide (facultative)")
    .fill(contenuRiche([{ type: "paragraphe", texte: TEMOIN_AIDE }]));
  await formulaireExercice
    .getByLabel("Correction écrite (facultative)")
    .fill(contenuRiche([{ type: "paragraphe", texte: TEMOIN_CORRECTION }]));
  await formulaireExercice
    .getByLabel("Référence de la vidéo de correction (facultative)")
    .fill(REFERENCE_VIDEO);
  await formulaireExercice.getByLabel("Difficulté (1 à 5)").fill("4");
  await formulaireExercice.getByRole("button", { name: "Ajouter" }).click();

  const ligneExercice = page.getByRole("listitem").filter({ hasText: titreExercice });
  await expect(ligneExercice).toBeVisible();
  // Créer ne publie pas : la publication reste un geste distinct. `exact` parce
  // que le libellé « Dépublier » contient « publie ».
  await expect(ligneExercice.getByText("brouillon", { exact: true })).toBeVisible();

  // 2. En brouillon, l'élève ne voit rien. Cette visite met aussi la page de cours
  // en cache dans son état vide, ce qui fait de l'étape 4 un vrai test de
  // l'invalidation ciblée.
  await connecter(page, fixture.emailEleve);
  await page.goto(routeCoursEleve);
  await expect(page.getByText("Aucun exercice publié pour ce cours.")).toBeVisible();
  await expect(page.getByText(titreExercice)).toHaveCount(0);

  // 3. L'admin publie par le bouton.
  await connecter(page, fixture.emailAdmin);
  await page.goto(routeCoursAdmin);
  await ligneExercice.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(ligneExercice.getByText("publie", { exact: true })).toBeVisible();

  const exercice = await prisma.exercice.findFirstOrThrow({
    where: { titre: titreExercice },
    select: { id: true },
  });

  // 4. L'exercice apparaît immédiatement chez l'élève : sans invalidation du
  // cache à la publication, la page resterait vide une heure.
  await connecter(page, fixture.emailEleve);
  await page.goto(routeCoursEleve);
  await expect(page.getByText(titreExercice)).toBeVisible();
  await page.getByRole("link", { name: "Traiter l'exercice" }).click();
  await expect(page.locator(`[data-exercice="${exercice.id}"]`)).toBeVisible();

  // 5. Étape 1 franchie du seul fait de l'affichage.
  await expect
    .poll(() => actionsJournalisees(fixture.matiere.id, exercice.id), { timeout: 20_000 })
    .toContain("vue");

  // Le contexte complet est renseigné : c'est de lui que le lot 7 dérivera la
  // progression par cours et par chapitre.
  const premier = (await evenements(fixture.matiere.id, exercice.id))[0];
  expect(premier.utilisateur_id).toBe(fixture.eleve.id);
  expect(premier.chapitre_id).toBe(fixture.chapitre.id);
  expect(premier.cours_id).toBe(fixture.cours.id);

  // 6. La formule est rendue par le serveur, et aucun JavaScript KaTeX n'est
  // demandé.
  const htmlExercice = await page.content();
  expect(htmlExercice).toContain("katex");
  expect(htmlExercice).toContain("<math");
  expect(scriptsKatex, "aucun JavaScript KaTeX ne doit être chargé").toEqual([]);

  // 7. Ni l'aide ni la correction n'ont quitté le serveur : elles sont absentes du
  // HTML **et** de la charge RSC, pas seulement masquées.
  const urlExercice = new URL(page.url()).pathname;
  const rscAvant = await page.request.get(urlExercice, {
    headers: { Accept: "text/x-component", RSC: "1" },
  });
  const corpsRscAvant = await rscAvant.text();
  for (const [source, corps] of [
    ["HTML", htmlExercice],
    ["RSC", corpsRscAvant],
  ] as const) {
    expect(corps, `${source} livre l'aide avant son étape`).not.toContain(TEMOIN_AIDE);
    expect(corps, `${source} livre la correction avant son étape`).not.toContain(
      TEMOIN_CORRECTION,
    );
    // La référence de la vidéo ne part jamais avec la page : elle passe par sa
    // route, après un nouveau contrôle d'accès.
    expect(corps, `${source} livre la référence vidéo`).not.toContain(REFERENCE_VIDEO);
  }

  // 8. L'image passe par une route de notre API et par une URL signée. Aucune clé
  // de stockage n'apparaît dans le corps des réponses.
  const image = page.getByAltText("Schéma de la chute");
  const source = await image.getAttribute("src");
  expect(source).toBe(
    `/api/matieres/${fixture.matiere.id}/exercices/${exercice.id}/images/${fichierId}`,
  );

  const cleStockage = (
    await prisma.fichier.findFirstOrThrow({
      where: { id: BigInt(fichierId) },
      select: { cle_stockage: true },
    })
  ).cle_stockage;
  expect(htmlExercice).not.toContain(cleStockage);
  expect(corpsRscAvant).not.toContain(cleStockage);

  const redirection = await page.request.get(source!, { maxRedirects: 0 });
  expect(redirection.status()).toBe(307);
  const urlSignee = redirection.headers()["location"];
  expect(urlSignee).toContain("signature=");
  const octets = await page.request.get(urlSignee);
  expect(octets.status()).toBe(200);
  expect(octets.headers()["content-type"]).toBe("image/png");
  expect((await octets.body()).equals(PNG)).toBe(true);

  // 9. Étape 2 : l'aide sur demande.
  // Franchir une étape redirige vers une adresse qui nomme l'étape : attendre
  // cette adresse, plutôt que d'observer le contenu tout de suite, synchronise
  // l'assertion sur le mécanisme réel au lieu de courir contre lui.
  await page.getByRole("button", { name: "J'ai besoin d'un coup de main" }).click();
  await page.waitForURL(/etape=aide$/, DELAI_ETAPE);
  await expect(page.getByText(TEMOIN_AIDE)).toBeVisible(DELAI_ETAPE);
  expect(await actionsJournalisees(fixture.matiere.id, exercice.id)).toContain("aide_ouverte");
  // La correction, elle, n'est toujours pas partie.
  expect(await page.content()).not.toContain(TEMOIN_CORRECTION);

  // 10. Étape 3 : la correction écrite.
  await page.getByRole("button", { name: "Voir la correction" }).click();
  await page.waitForURL(/etape=correction$/, DELAI_ETAPE);
  await expect(page.getByText(TEMOIN_CORRECTION)).toBeVisible(DELAI_ETAPE);
  expect(await actionsJournalisees(fixture.matiere.id, exercice.id)).toContain("correction_vue");

  // 11. Étape 4 : la correction vidéo, qui n'apparaît qu'après la correction
  // écrite. Le lecteur ne se charge qu'au clic.
  const bloc = page.locator('[data-etape="correction-video"]');
  await expect(bloc).toBeVisible(DELAI_ETAPE);
  await expect(page.locator("iframe")).toHaveCount(0);
  await bloc.getByRole("button", { name: "Regarder" }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect
    .poll(() => actionsJournalisees(fixture.matiere.id, exercice.id), { timeout: 20_000 })
    .toContain("terminee");

  // 12. Étape 5 : l'auto-évaluation. Le journal étant ajout seul, changer d'avis
  // ajoute une ligne et c'est la plus récente qui vaut.
  // Assertions portées par la région d'auto-évaluation : la région d'annonce
  // pour lecteur d'écran peut porter un texte proche, et une correspondance sur
  // la page entière dépendrait alors de l'ordre de rendu.
  const bilan = page.locator('[data-etape="auto-evaluation"]');
  await page.getByRole("button", { name: "À refaire" }).click();
  await page.waitForURL(/etape=a_refaire$/, DELAI_ETAPE);
  await expect(bilan.getByText("Noté comme à refaire.", { exact: false })).toBeVisible(DELAI_ETAPE);

  // Le fait d'abord, l'affichage ensuite : c'est la ligne en base qui porte le
  // critère de sortie, et distinguer les deux dit tout de suite si un échec
  // vient de l'écriture ou du rendu.
  await page.getByRole("button", { name: "J'ai réussi" }).click();
  await page.waitForURL(/etape=reussi$/, DELAI_ETAPE);
  await expect
    .poll(() => actionsJournalisees(fixture.matiere.id, exercice.id), { timeout: 20_000 })
    .toContain("reussi");
  await expect(bilan.getByText("Noté comme réussi.", { exact: false })).toBeVisible(DELAI_ETAPE);

  const actions = await actionsJournalisees(fixture.matiere.id, exercice.id);
  expect(actions.filter((action) => action === "a_refaire")).toHaveLength(1);
  expect(actions.filter((action) => action === "reussi")).toHaveLength(1);
  expect(actions.indexOf("reussi")).toBeGreaterThan(actions.indexOf("a_refaire"));

  // Les cinq étapes ont chacune laissé leur trace.
  for (const attendue of ["vue", "aide_ouverte", "correction_vue", "terminee", "reussi"]) {
    expect(actions, `l'étape ${attendue} n'a pas été journalisée`).toContain(attendue);
  }
});

test("la fiche d'exercice exploite le grand écran et reste utilisable à 375 px", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const suffixe = Date.now();
  const fixture = await seedStructure(suffixe);
  const titreExercice = `${PREFIXE_E2E} Largeur ${suffixe}`;
  const routeCoursAdmin = `/contenu/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}`;

  // Création puis publication par le back-office, comme le premier scénario : la
  // mise en page se vérifie sur un exercice réellement publié.
  await connecter(page, fixture.emailAdmin);
  await page.goto(routeCoursAdmin);
  const formulaireExercice = page.locator("form", {
    has: page.locator('textarea[name="enonce"]'),
  });
  await formulaireExercice.getByLabel("Titre").fill(titreExercice);
  await formulaireExercice.getByLabel("Énoncé (contenu riche JSON)").fill(
    contenuRiche([
      { type: "paragraphe", texte: "Calculer la vitesse finale $v_f$ du mobile." },
      { type: "formule", latex: "v_f^2 = v_0^2 + 2 a d", bloc: true },
    ]),
  );
  await formulaireExercice
    .getByLabel("Correction écrite (facultative)")
    .fill(contenuRiche([{ type: "paragraphe", texte: TEMOIN_CORRECTION }]));
  await formulaireExercice.getByRole("button", { name: "Ajouter" }).click();

  const ligneExercice = page.getByRole("listitem").filter({ hasText: titreExercice });
  await ligneExercice.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(ligneExercice.getByText("publie", { exact: true })).toBeVisible();

  const exercice = await prisma.exercice.findFirstOrThrow({
    where: { titre: titreExercice },
    select: { id: true },
  });
  const routeExercice = `/matieres/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}/exercices/${exercice.id}`;

  await connecter(page, fixture.emailEleve);

  // Écran de bureau : deux colonnes réellement côte à côte, et la largeur
  // disponible réellement occupée.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(routeExercice);
  const enonce = page.locator('[data-etape="enonce"]');
  const etapes = page.locator('[data-etape="correction"]');
  // `boundingBox()` rend null tant que l'élément n'est pas rendu et visible :
  // attendre les deux avant de mesurer, sinon la mesure dépend de la vitesse de
  // la machine.
  await expect(enonce).toBeVisible();
  await expect(etapes).toBeVisible();

  const boiteEnonce = (await enonce.boundingBox())!;
  const boiteEtapes = (await etapes.boundingBox())!;
  expect(
    boiteEtapes.x,
    "la correction doit être à droite de l'énoncé, pas en dessous",
  ).toBeGreaterThan(boiteEnonce.x + boiteEnonce.width - 1);

  const largeurUtilisee = boiteEtapes.x + boiteEtapes.width - boiteEnonce.x;
  expect(largeurUtilisee, "la largeur du grand écran doit être exploitée").toBeGreaterThan(900);

  // Téléphone : une seule colonne, dans le même ordre, sans débordement
  // horizontal, avec des cibles tactiles d'au moins 44 px.
  await page.setViewportSize({ width: 375, height: 800 });
  await page.reload();
  await expect(enonce).toBeVisible();
  await expect(etapes).toBeVisible();
  const boiteEnonceMobile = (await enonce.boundingBox())!;
  const boiteEtapesMobile = (await etapes.boundingBox())!;
  expect(boiteEtapesMobile.y).toBeGreaterThan(
    boiteEnonceMobile.y + boiteEnonceMobile.height - 1,
  );

  const debordement = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(debordement, "aucun débordement horizontal à 375 px").toBeLessThanOrEqual(0);

  const bouton = page.getByRole("button", { name: "Voir la correction" });
  const boiteBouton = (await bouton.boundingBox())!;
  expect(boiteBouton.height).toBeGreaterThanOrEqual(44);
});
