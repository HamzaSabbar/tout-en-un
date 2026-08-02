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

function auditerReponsesApplicatives(page: Page, secrets: string[]) {
  const urls: string[] = [];
  const corpsTextuels: Array<{ url: string; corps: string }> = [];
  const lecturesEnCours: Promise<void>[] = [];
  const origineApplication = new URL(page.url()).origin;

  page.on("request", (requete) => urls.push(requete.url()));
  page.on("response", (reponse) => {
    if (!reponse.url().startsWith(origineApplication)) return;
    const typeContenu = reponse.headers()["content-type"] ?? "";
    if (!/(text\/html|text\/x-component|application\/json)/i.test(typeContenu)) return;
    const lecture = reponse
      .finished()
      .then(async (erreur) => {
        // Les préchargements RSC annulés par une navigation n'ont pas de corps
        // lisible. Attendre leur fin évite de concurrencer la transition Next.js.
        if (erreur) return;
        const contenu = await reponse.body();
        corpsTextuels.push({ url: reponse.url(), corps: contenu.toString("utf8") });
      })
      .catch(() => {
        // Une navigation peut annuler une réponse précédente. Les autres corps
        // restent inspectés et les URL sont toujours enregistrées.
      });
    lecturesEnCours.push(lecture);
  });

  return {
    urls,
    async verifier() {
      await page.waitForLoadState("networkidle");
      await Promise.all(lecturesEnCours);
      const corpsCumule = corpsTextuels.map(({ corps }) => corps).join("\n");
      for (const secret of secrets) {
        expect(corpsCumule).not.toContain(secret);
      }
      expect(corpsCumule).not.toMatch(
        /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i,
      );
      expect(corpsCumule).not.toMatch(/https?:\/\/[^\s"']*supabase[^\s"']*\/storage\//i);
      expect(urls.some((url) => /youtube|supabase.*storage/i.test(url))).toBe(false);
      return { corpsTextuels };
    },
  };
}

test("un élève abonné parcourt une matière complète sur mobile sans fuite média", async ({
  page,
}) => {
  const fixture = await seedParcoursComplet(Date.now());
  await page.setViewportSize({ width: 375, height: 812 });
  await connecter(page, fixture.email);

  await page.goto("/matieres");
  await page.getByRole("link", { name: new RegExp(fixture.matiere.libelle) }).click();
  await expect(page.locator("[data-dashboard-card]")).toHaveCount(4);
  await expect(page.getByText("Pas encore disponible")).toHaveCount(4);

  await page.getByRole("link", { name: fixture.chapitre.libelle }).click();
  await page.getByRole("link", { name: fixture.cours.titre }).click();
  await expect(page.getByText(fixture.video.titre)).toBeVisible();
  await expect(page.getByText(fixture.document.titre)).toBeVisible();

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
  // Sans bucket provisionné, la signature échoue en 503 ; l'essentiel ici est
  // de prouver que l'abonné a franchi la garde et n'obtient donc pas 403.
  expect(avecAcces.status()).not.toBe(403);
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

  await expect(page.locator("[data-video-facade]")).toHaveCount(31);
  await expect(page.locator("[data-document-card]")).toHaveCount(31);
  await expect(page.getByText(`${PREFIXE_E2E} Vidéo dense 29`)).toBeVisible();
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
  const audit = auditerReponsesApplicatives(page, [
    fixture.referenceVideo,
    fixture.cleStockage,
    ...ressources.referencesVideo,
    ...ressources.clesStockage,
  ]);

  const routeChapitre = `/matieres/${fixture.matiere.id}/chapitres/${fixture.chapitre.id}`;
  const routeCours = `${routeChapitre}/cours/${fixture.cours.id}`;

  // Le parcours complet est couvert plus haut. Cet audit part d'un chapitre
  // stable pour ne mesurer que la transition RSC vers le cours.
  await page.goto(routeChapitre);
  await expect(page.getByRole("heading", { name: fixture.chapitre.libelle })).toBeVisible();
  await page.getByRole("link", { name: fixture.cours.titre }).click();
  await expect(page).toHaveURL(routeCours);
  await expect(page.getByRole("heading", { name: fixture.cours.titre })).toBeVisible();

  const { corpsTextuels } = await audit.verifier();
  expect(corpsTextuels.some(({ url }) => url.includes("/matieres"))).toBe(true);
  expect(audit.urls.some((url) => url.includes("/videos/") && url.endsWith("/lecture"))).toBe(false);
  await expect(page.locator("iframe")).toHaveCount(0);
});
