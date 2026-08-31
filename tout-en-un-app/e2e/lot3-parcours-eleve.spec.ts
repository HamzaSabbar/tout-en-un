import "./support/env";
import { test, expect, type Page } from "@playwright/test";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { nettoyerDonneesE2E, PREFIXE_E2E } from "./support/base-test";

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

async function seedParcoursComplet(suffixe: number) {
  const filiere = await prisma.filiere.create({
    data: {
      code: `${PREFIXE_E2E}-L3-F-${suffixe}`,
      libelle: `${PREFIXE_E2E} Sciences ${suffixe}`,
    },
  });
  const matiere = await prisma.matiere.create({
    data: {
      code: `${PREFIXE_E2E}-L3-M-${suffixe}`,
      libelle: `${PREFIXE_E2E} Physique ${suffixe}`,
      description: "Réviser la physique sur mobile.",
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
  const referenceVideo = `E2Evideo${suffixe}`;
  const video = await prisma.video.create({
    data: {
      cours_id: cours.id,
      titre: `${PREFIXE_E2E} Vitesse ${suffixe}`,
      fournisseur: "youtube",
      video_ref: referenceVideo,
      statut: "publie",
    },
  });
  const email = `e2e-lot3-eleve+${suffixe}@test.local`;
  const eleve = await prisma.utilisateur.create({
    data: {
      nom: "Alami",
      prenom: "Sara",
      email,
      telephone: "0612345678",
      filiere_id: filiere.id,
      mot_de_passe_hash: await hashPassword(MOT_DE_PASSE),
      role: "eleve",
    },
  });
  const cleStockage = `${matiere.id}/${chapitre.id}/${cours.id}/cours-e2e-${suffixe}.pdf`;
  const fichier = await prisma.fichier.create({
    data: {
      nom: `${PREFIXE_E2E}-cours-${suffixe}.pdf`,
      cle_stockage: cleStockage,
      type_mime: "application/pdf",
      taille: 1024,
      televerse_par: eleve.id,
    },
  });
  const document = await prisma.document.create({
    data: {
      type: "cours_pdf",
      titre: `${PREFIXE_E2E} Cours PDF ${suffixe}`,
      cours_id: cours.id,
      fichier_id: fichier.id,
      statut: "publie",
    },
  });
  const offre = await prisma.offre.create({
    data: {
      libelle: `${PREFIXE_E2E} Lot 3 ${suffixe}`,
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

  return {
    filiere,
    matiere,
    chapitre,
    cours,
    video,
    document,
    eleve,
    email,
    referenceVideo,
    cleStockage,
  };
}

async function ajouterRessourcesEnNombre(
  fixture: Awaited<ReturnType<typeof seedParcoursComplet>>,
  nombre: number,
) {
  const prefixeCle = `${fixture.matiere.id}/${fixture.chapitre.id}/${fixture.cours.id}/lot-${Date.now()}`;
  const referencesVideo = Array.from(
    { length: nombre },
    (_, index) => `E2Ebulk${fixture.cours.id}V${index}`,
  );
  const clesStockage = Array.from(
    { length: nombre },
    (_, index) => `${prefixeCle}-document-${index}.pdf`,
  );

  await prisma.video.createMany({
    data: referencesVideo.map((video_ref, index) => ({
      cours_id: fixture.cours.id,
      titre: `${PREFIXE_E2E} Vidéo dense ${index}`,
      fournisseur: "youtube",
      video_ref,
      ordre: index + 1,
      statut: "publie",
    })),
  });
  await prisma.fichier.createMany({
    data: clesStockage.map((cle_stockage, index) => ({
      nom: `${PREFIXE_E2E}-dense-${index}.pdf`,
      cle_stockage,
      type_mime: "application/pdf",
      taille: 1024 + index,
      televerse_par: fixture.eleve.id,
    })),
  });

  const fichiers = await prisma.fichier.findMany({
    where: { cle_stockage: { startsWith: prefixeCle } },
    orderBy: { cle_stockage: "asc" },
    select: { id: true },
  });
  await prisma.document.createMany({
    data: fichiers.map((fichier, index) => ({
      type: "cours_pdf",
      titre: `${PREFIXE_E2E} Document dense ${index}`,
      cours_id: fixture.cours.id,
      fichier_id: fichier.id,
      statut: "publie",
    })),
  });

  return { referencesVideo, clesStockage };
}

// Périmètre volontaire : le corps des réponses HTML, RSC et JSON, plus le trafic
// de la navigation initiale. Pas l'en-tête Location d'une redirection signée, qui
// contient la clé de stockage par construction, exactement comme une URL signée
// Supabase. Élargir ces assertions aux en-têtes les ferait échouer par nature.
function verifierAbsenceLiensMedias(
  corpsTextuels: Array<{ source: string; corps: string }>,
  secrets: string[],
) {
  for (const { source, corps } of corpsTextuels) {
    for (const secret of secrets) {
      expect(corps, `${source} contient une référence média interne`).not.toContain(secret);
    }
    expect(corps, `${source} contient une URL vidéo permanente`).not.toMatch(
      /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i,
    );
    expect(corps, `${source} contient une URL Supabase Storage permanente`).not.toMatch(
      /https?:\/\/[^\s"']*supabase[^\s"']*\/storage\//i,
    );
  }
}

test("un élève abonné parcourt une matière complète sur mobile sans fuite média", async ({
  page,
}) => {
  const fixture = await seedParcoursComplet(Date.now());
  await page.setViewportSize({ width: 375, height: 812 });
  await connecter(page, fixture.email);

  await page.goto("/matieres");
  await page.getByRole("link", { name: new RegExp(fixture.matiere.libelle) }).click();
  // Chaque carte du tableau de bord affiche désormais un message d'état vide
  // spécifique (pas un « Pas encore disponible » générique répété) : on
  // vérifie que les trois cartes existent et qu'aucune n'est restée vide.
  // Le compte à rebours du national (quatrième carte à l'origine) vit
  // maintenant sur l'accueil, pas dans le tableau de bord d'une matière.
  const cartesTableauDeBord = page.locator("[data-dashboard-card]");
  await expect(cartesTableauDeBord).toHaveCount(3);
  for (const carte of await cartesTableauDeBord.all()) {
    await expect(carte.locator("p")).not.toBeEmpty();
  }

  await page.getByRole("link", { name: fixture.chapitre.libelle }).click();
  await page.getByRole("link", { name: fixture.cours.titre }).click();
  await expect(page.getByText(fixture.video.titre)).toBeVisible();

  const largeur = await page.evaluate(() => ({
    contenu: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(largeur.contenu).toBeLessThanOrEqual(largeur.viewport);

  const boutonRegarder = page.getByRole("button", { name: "Regarder" });
  const dimensionsBouton = await boutonRegarder.boundingBox();
  expect(dimensionsBouton?.height ?? 0).toBeGreaterThanOrEqual(44);
  await boutonRegarder.focus();
  await expect(boutonRegarder).toBeFocused();

  const htmlInitial = await page.content();
  expect(htmlInitial).not.toContain(fixture.referenceVideo);
  expect(htmlInitial).not.toContain(fixture.cleStockage);
  expect(htmlInitial).not.toContain("youtube.com/embed");

  await boutonRegarder.click();
  const lecteur = page.locator("iframe");
  await expect(lecteur).toBeVisible();
  await expect(lecteur).toHaveAttribute("src", new RegExp(fixture.referenceVideo));

  // Onglet Documents (voir onglets-cours.tsx) : bascule sans rechargement.
  await page.getByRole("tab", { name: "Documents" }).click();
  await expect(page.getByText(fixture.document.titre)).toBeVisible();
});

test("la route PDF refuse sans accès et franchit la garde avec accès", async ({ page }) => {
  const fixture = await seedParcoursComplet(Date.now());
  const emailSansAcces = `e2e-lot3-sans-acces+${Date.now()}@test.local`;
  await prisma.utilisateur.create({
    data: {
      nom: "Bennani",
      prenom: "Yasmine",
      email: emailSansAcces,
      telephone: "0699999999",
      filiere_id: fixture.filiere.id,
      mot_de_passe_hash: await hashPassword(MOT_DE_PASSE),
      role: "eleve",
    },
  });
  const route = `/api/matieres/${fixture.matiere.id}/documents/${fixture.document.id}/lecture`;

  await connecter(page, emailSansAcces);
  const sansAcces = await page.request.get(route, { maxRedirects: 0 });
  expect(sansAcces.status()).toBe(403);
  expect(await sansAcces.text()).not.toContain(fixture.cleStockage);

  await connecter(page, fixture.email);
  const avecAcces = await page.request.get(route, { maxRedirects: 0 });
  // L'abonné franchit la garde et reçoit une URL signée, même si cette fixture
  // n'a jamais déposé d'octets derrière sa clé : signer un chemin sans objet doit
  // rendre une redirection, pas une erreur. Le parcours complet jusqu'aux octets
  // est prouvé par lot3-back-office-pdf.spec.ts.
  expect(avecAcces.status()).toBe(307);
  expect(await avecAcces.text()).not.toContain(fixture.cleStockage);
});

test("les routes média directes ne livrent rien à un élève sans accès", async ({ page }) => {
  const fixture = await seedParcoursComplet(Date.now());
  const email = `e2e-lot3-routes+${Date.now()}@test.local`;
  await prisma.utilisateur.create({
    data: {
      nom: "Tazi",
      prenom: "Adam",
      email,
      telephone: "0688888888",
      filiere_id: fixture.filiere.id,
      mot_de_passe_hash: await hashPassword(MOT_DE_PASSE),
      role: "eleve",
    },
  });
  await connecter(page, email);

  await page.goto(`/matieres/${fixture.matiere.id}`);
  await expect(page.locator('[data-motif="non_souscrit"]')).toBeVisible();
  const htmlRefuse = await page.content();
  expect(htmlRefuse).not.toContain(fixture.chapitre.libelle);
  expect(htmlRefuse).not.toContain(fixture.referenceVideo);
  expect(htmlRefuse).not.toContain(fixture.cleStockage);

  const video = await page.request.get(
    `/api/matieres/${fixture.matiere.id}/videos/${fixture.video.id}/lecture`,
  );
  expect(video.status()).toBe(403);
  expect(await video.text()).not.toContain(fixture.referenceVideo);

  const pdf = await page.request.get(
    `/api/matieres/${fixture.matiere.id}/documents/${fixture.document.id}/lecture`,
    { maxRedirects: 0 },
  );
  expect(pdf.status()).toBe(403);
  expect(await pdf.text()).not.toContain(fixture.cleStockage);
});

test("le premier affichage utile reste sous 2,5 secondes sur un profil 4G", async ({
  page,
}) => {
  const fixture = await seedParcoursComplet(Date.now());
  await connecter(page, fixture.email);

  const routeCours = `/matieres/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}`;
  // Le serveur de développement compile à la demande, contrairement au serveur
  // de production de CI. Ce premier passage retire ce coût de compilation de la
  // mesure réseau sans précharger le cache navigateur mesuré ensuite.
  await page.goto(routeCours);
  await expect(page.getByRole("heading", { name: fixture.cours.titre })).toBeVisible();

  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 200_000,
    uploadThroughput: 93_750,
  });

  const requetes: string[] = [];
  page.on("request", (requete) => requetes.push(requete.url()));
  await page.route("https://www.youtube-nocookie.com/**", (route) => route.abort());

  await page.goto(routeCours);
  await expect(page.getByRole("heading", { name: fixture.cours.titre })).toBeVisible();
  const premierAffichage = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return navigation.domContentLoadedEventEnd;
  });
  expect(premierAffichage).toBeLessThan(2_500);

  await expect(page.locator("iframe")).toHaveCount(0);
  expect(requetes.some((url) => url.includes("/videos/") || url.includes("youtube"))).toBe(false);
  const scriptsAvant = new Set(
    requetes.filter((url) => new URL(url).pathname.endsWith(".js")),
  );

  await page.getByRole("button", { name: "Regarder" }).click();
  await expect(page.locator("iframe")).toBeVisible();
  await expect.poll(() => requetes.some((url) => url.includes("/videos/") && url.endsWith("/lecture"))).toBe(true);
  await expect.poll(() => requetes.some((url) => url.includes("youtube-nocookie.com"))).toBe(true);
  const nouveauxScripts = requetes.filter(
    (url) => new URL(url).pathname.endsWith(".js") && !scriptsAvant.has(url),
  );
  expect(nouveauxScripts.length).toBeGreaterThan(0);
});

test("une page de cours reste complète avec beaucoup de ressources", async ({ page }) => {
  test.setTimeout(120_000);
  const fixture = await seedParcoursComplet(Date.now());
  const ressources = await ajouterRessourcesEnNombre(fixture, 30);
  await connecter(page, fixture.email);

  await page.goto(
    `/matieres/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}`,
  );

  // Deux onglets distincts (voir onglets-cours.tsx), démontés quand ils ne sont
  // pas actifs : les vidéos sont dans le DOM par défaut, les documents
  // seulement après avoir basculé sur l'onglet Documents.
  await expect(page.locator("[data-video-facade]")).toHaveCount(31);
  await expect(page.getByText(`${PREFIXE_E2E} Vidéo dense 29`)).toBeVisible();

  await page.getByRole("tab", { name: "Documents" }).click();
  await expect(page.locator("[data-document-card]")).toHaveCount(31);
  await expect(page.getByText(`${PREFIXE_E2E} Document dense 29`)).toBeVisible();

  const html = await page.content();
  for (const secret of [...ressources.referencesVideo, ...ressources.clesStockage]) {
    expect(html).not.toContain(secret);
  }
});

test("le HTML, les réponses RSC et le réseau initial ne révèlent aucun lien média permanent", async ({
  page,
}) => {
  const fixture = await seedParcoursComplet(Date.now());
  const ressources = await ajouterRessourcesEnNombre(fixture, 5);
  await connecter(page, fixture.email);
  const secrets = [
    fixture.referenceVideo,
    fixture.cleStockage,
    ...ressources.referencesVideo,
    ...ressources.clesStockage,
  ];

  const routeCours = `/matieres/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}/cours/${fixture.cours.id}`;
  const reponseHtml = await page.request.get(routeCours, {
    headers: { Accept: "text/html" },
  });
  const reponseRsc = await page.request.get(routeCours, {
    headers: { Accept: "text/x-component", RSC: "1" },
  });

  expect(reponseHtml.status()).toBe(200);
  expect(reponseHtml.headers()["content-type"]).toContain("text/html");
  expect(reponseRsc.status()).toBe(200);
  expect(reponseRsc.headers()["content-type"]).toContain("text/x-component");
  verifierAbsenceLiensMedias(
    [
      { source: "HTML authentifié", corps: await reponseHtml.text() },
      { source: "RSC authentifié", corps: await reponseRsc.text() },
    ],
    secrets,
  );

  const urlsInitiales: string[] = [];
  page.on("request", (requete) => urlsInitiales.push(requete.url()));

  // `response.body()` appelé pendant une transition RSC empêchait le routeur
  // Next.js de la finaliser en CI. La navigation reste donc normale et son
  // audit réseau n'observe que les URL, sans lire les réponses en vol.
  await page.goto(routeCours);
  await expect(page.getByRole("heading", { name: fixture.cours.titre })).toBeVisible();
  await page.waitForLoadState("networkidle");

  verifierAbsenceLiensMedias(
    [{ source: "DOM après navigation", corps: await page.content() }],
    secrets,
  );

  expect(urlsInitiales.some((url) => url.includes(routeCours))).toBe(true);
  expect(
    urlsInitiales.some((url) =>
      /\/api\/matieres\/[^/]+\/(?:videos|documents)\//i.test(new URL(url).pathname),
    ),
  ).toBe(false);
  expect(urlsInitiales.some((url) => /youtube|supabase.*storage/i.test(url))).toBe(false);
  await expect(page.locator("iframe")).toHaveCount(0);
});
