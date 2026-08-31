import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstCours = vi.fn();
const findFirstMatiere = vi.fn();
const findManyMatiere = vi.fn();
const findFirstChapitre = vi.fn();
const findFirstPartie = vi.fn();
const findFirstEvenement = vi.fn();
const findManyEvenement = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    matiere: {
      findMany: (...args: unknown[]) => findManyMatiere(...args),
      findFirst: (...args: unknown[]) => findFirstMatiere(...args),
    },
    chapitre: { findFirst: (...args: unknown[]) => findFirstChapitre(...args) },
    partie: { findFirst: (...args: unknown[]) => findFirstPartie(...args) },
    cours: { findFirst: (...args: unknown[]) => findFirstCours(...args) },
    evenementApprentissage: {
      findFirst: (...args: unknown[]) => findFirstEvenement(...args),
      findMany: (...args: unknown[]) => findManyEvenement(...args),
    },
  },
}));

import {
  listerMatieresPourEleve,
  obtenirActiviteSemaine,
  obtenirPageChapitrePubliee,
  obtenirPageCoursPubliee,
  obtenirPageMatierePubliee,
  obtenirPagePartiePubliee,
  obtenirRepriseGlobale,
  obtenirReprisePourMatiere,
} from "@/modules/parcours-eleve/service";

beforeEach(() => {
  findFirstCours.mockReset();
  findFirstMatiere.mockReset();
  findManyMatiere.mockReset();
  findFirstChapitre.mockReset();
  findFirstPartie.mockReset();
  findFirstEvenement.mockReset();
  findManyEvenement.mockReset();
});

describe("requête agrégée de la page de cours", () => {
  it("charge toute la page en un appel et ne sélectionne aucun secret média", async () => {
    findFirstCours.mockResolvedValue({
      id: BigInt(30),
      titre: "Cinématique",
      description: null,
      chapitre: {
        id: BigInt(20),
        libelle: "Mécanique",
        matiere: { id: BigInt(10), libelle: "Physique" },
        partie: { id: BigInt(100), libelle: "Physique" },
        cours: [{ id: BigInt(30), titre: "Cinématique" }],
      },
      videos: [
        { id: BigInt(40), titre: "Vitesse", description: null, duree_secondes: 540 },
      ],
      documents: [
        { id: BigInt(50), titre: "Cours PDF", type: "cours_pdf", fichier: { taille: 2516582 } },
      ],
      exercices: [{ id: BigInt(60), titre: "Chute libre", difficulte: 3 }],
      extraits_nationaux: [
        {
          id: BigInt(70),
          annee: 2024,
          session: "normale",
          enonce: "Chute libre : étude cinématique",
          difficulte: 3,
          duree_recommandee: 20,
          correction_video_ref: null,
          sujet_document_id: BigInt(80),
          correction_document_id: null,
        },
      ],
    });

    const resultat = await obtenirPageCoursPubliee(BigInt(10), BigInt(20), BigInt(30));

    expect(findFirstCours).toHaveBeenCalledOnce();
    const requete = findFirstCours.mock.calls[0][0];
    expect(requete.select.videos.select).not.toHaveProperty("video_ref");
    // La taille sert à l'affichage (« PDF · 2,4 Mo ») ; la clé de stockage,
    // elle, ne doit jamais quitter le serveur (invariant 3).
    expect(requete.select.documents.select.fichier.select).not.toHaveProperty("cle_stockage");
    // La liste des exercices ne transporte pas leur contenu riche : elle ne sert
    // qu'à proposer des liens, et les énoncés traverseraient le cache pour rien.
    expect(requete.select.exercices.select).not.toHaveProperty("enonce");
    expect(requete.select.exercices.select).not.toHaveProperty("aide");
    expect(requete.select.exercices.select).not.toHaveProperty("correction_texte");
    // Léger et non personnalisé : rejoint l'agrégat mis en cache, contrairement
    // au PDF lui-même, lu à la demande derrière le filigrane nominatif.
    expect(requete.select.extraits_nationaux.select).not.toHaveProperty("sujet_document");
    expect(resultat?.chapitre.cours).toEqual([{ id: "30", titre: "Cinématique" }]);
    expect(resultat?.documents).toEqual([
      { id: "50", titre: "Cours PDF", type: "cours_pdf", tailleOctets: 2516582 },
    ]);
    expect(resultat).toMatchObject({
      id: "30",
      chapitre: { id: "20", matiere: { id: "10" }, partie: { id: "100", libelle: "Physique" } },
      videos: [{ id: "40" }],
      documents: [{ id: "50" }],
      exercices: [{ id: "60", titre: "Chute libre", difficulte: 3 }],
      extraitsNationaux: [
        {
          id: "70",
          annee: 2024,
          session: "normale",
          sujetDisponible: true,
          correctionDisponible: false,
          correctionVideoDisponible: false,
        },
      ],
    });
    // Le champ brut ne doit pas fuiter à côté de sa version convertie : sinon
    // le résultat contient un BigInt, ce que `unstable_cache()` ne sait pas
    // sérialiser (bug réel, trouvé par le scénario e2e du lot 5, pas par un
    // test unitaire — d'où cette garde explicite).
    expect(resultat).not.toHaveProperty("extraits_nationaux");
    expect(() => JSON.stringify(resultat)).not.toThrow();
  });

  it("filtre brouillons et suppressions dans la requête imbriquée", async () => {
    findFirstCours.mockResolvedValue(null);
    await obtenirPageCoursPubliee(BigInt(10), BigInt(20), BigInt(30));

    const requete = findFirstCours.mock.calls[0][0];
    expect(requete.where).toMatchObject({ statut: "publie", supprime_le: null });
    expect(requete.where.chapitre).toMatchObject({ statut: "publie", supprime_le: null });
    // Une partie non publiée masque ses chapitres, même atteints depuis la
    // page de cours (accès direct par URL).
    expect(requete.where.chapitre.OR).toEqual([
      { partie_id: null },
      { partie: { statut: "publie", supprime_le: null } },
    ]);
    expect(requete.select.videos.where).toEqual({ statut: "publie", supprime_le: null });
    expect(requete.select.documents.where).toMatchObject({ statut: "publie", supprime_le: null });
    expect(requete.select.exercices.where).toEqual({ statut: "publie", supprime_le: null });
    expect(requete.select.extraits_nationaux.where).toEqual({
      statut: "publie",
      supprime_le: null,
    });
  });

  // Une image d'exercice est un `document` par sa mécanique de stockage, pas par
  // son usage : elle s'affiche dans l'énoncé et n'a rien à faire dans la liste
  // des PDF à ouvrir, même publiée.
  it("exclut les images d'exercice de la liste des documents", async () => {
    findFirstCours.mockResolvedValue(null);
    await obtenirPageCoursPubliee(BigInt(10), BigInt(20), BigInt(30));

    const requete = findFirstCours.mock.calls[0][0];
    expect(requete.select.documents.where.type).toEqual({ not: "image_exercice" });
  });
});

describe("listerMatieresPourEleve", () => {
  it("compte les chapitres publiés de chaque matière en un seul appel", async () => {
    findManyMatiere.mockResolvedValue([
      {
        id: BigInt(10),
        libelle: "Physique-Chimie",
        description: null,
        icone: null,
        couleur: null,
        _count: { chapitres: 3 },
      },
    ]);

    const matieres = await listerMatieresPourEleve(BigInt(1));

    expect(findManyMatiere).toHaveBeenCalledOnce();
    expect(matieres).toEqual([
      {
        id: "10",
        libelle: "Physique-Chimie",
        description: null,
        icone: null,
        couleur: null,
        nbChapitres: 3,
      },
    ]);
  });
});

describe("obtenirPageChapitrePubliee", () => {
  it("compte les exercices publiés de chaque cours, un hop direct sans somme", async () => {
    findFirstChapitre.mockResolvedValue({
      id: BigInt(20),
      libelle: "Cinétique chimique",
      description: null,
      matiere: { id: BigInt(10), libelle: "Physique-Chimie" },
      cours: [
        { id: BigInt(30), titre: "Suivi temporel", description: null, _count: { exercices: 3 } },
      ],
    });

    const resultat = await obtenirPageChapitrePubliee(BigInt(10), BigInt(20));

    expect(findFirstChapitre).toHaveBeenCalledOnce();
    expect(resultat?.cours).toEqual([
      { id: "30", titre: "Suivi temporel", description: null, nbExercices: 3 },
    ]);
    expect(resultat?.cours[0]).not.toHaveProperty("_count");
  });

  it("rend null quand le chapitre n'est pas visible", async () => {
    findFirstChapitre.mockResolvedValue(null);
    expect(await obtenirPageChapitrePubliee(BigInt(10), BigInt(20))).toBeNull();
  });

  it("rend partie: null pour un chapitre sans partie (Mathématiques)", async () => {
    findFirstChapitre.mockResolvedValue({
      id: BigInt(20),
      libelle: "Suites numériques",
      description: null,
      matiere: { id: BigInt(10), libelle: "Mathématiques" },
      partie: null,
      cours: [],
    });
    const resultat = await obtenirPageChapitrePubliee(BigInt(10), BigInt(20));
    expect(resultat?.partie).toBeNull();
  });

  it("convertit l'identifiant de la partie quand elle existe (Physique-Chimie)", async () => {
    findFirstChapitre.mockResolvedValue({
      id: BigInt(20),
      libelle: "Les ondes",
      description: null,
      matiere: { id: BigInt(10), libelle: "Physique-Chimie" },
      partie: { id: BigInt(100), libelle: "Physique" },
      cours: [],
    });
    const resultat = await obtenirPageChapitrePubliee(BigInt(10), BigInt(20));
    expect(resultat?.partie).toEqual({ id: "100", libelle: "Physique" });
  });
});

describe("obtenirPagePartiePubliee", () => {
  it("convertit les identifiants et compte les chapitres de la partie", async () => {
    findFirstPartie.mockResolvedValue({
      id: BigInt(100),
      libelle: "Physique",
      matiere: { id: BigInt(10), libelle: "Physique-Chimie" },
      chapitres: [
        {
          id: BigInt(20),
          libelle: "Les ondes",
          description: null,
          _count: { cours: 1 },
          cours: [{ _count: { exercices: 2 } }],
        },
      ],
    });

    const resultat = await obtenirPagePartiePubliee(BigInt(10), BigInt(100));

    expect(findFirstPartie).toHaveBeenCalledOnce();
    expect(resultat).toEqual({
      id: "100",
      libelle: "Physique",
      matiere: { id: "10", libelle: "Physique-Chimie" },
      chapitres: [
        { id: "20", libelle: "Les ondes", description: null, nbCours: 1, nbExercices: 2 },
      ],
    });
  });

  it("rend null quand la partie n'est pas visible (non publiée, supprimée, ou d'une autre matière)", async () => {
    findFirstPartie.mockResolvedValue(null);
    expect(await obtenirPagePartiePubliee(BigInt(10), BigInt(100))).toBeNull();
  });
});

describe("obtenirPageMatierePubliee", () => {
  it("compte les cours et additionne les exercices par chapitre, matière sans partie (Mathématiques)", async () => {
    findFirstMatiere.mockResolvedValue({
      id: BigInt(10),
      libelle: "Mathématiques",
      description: null,
      parties: [],
      chapitres: [
        {
          id: BigInt(20),
          libelle: "Suites numériques",
          description: null,
          _count: { cours: 2 },
          cours: [{ _count: { exercices: 3 } }, { _count: { exercices: 5 } }],
        },
      ],
    });

    const resultat = await obtenirPageMatierePubliee(BigInt(10));

    expect(findFirstMatiere).toHaveBeenCalledOnce();
    // Une matière sans partie retombe exactement sur le comportement d'avant
    // ce lot : `parties` vide, tout dans `chapitresSansPartie`.
    expect(resultat?.parties).toEqual([]);
    expect(resultat?.chapitresSansPartie).toEqual([
      {
        id: "20",
        libelle: "Suites numériques",
        description: null,
        nbCours: 2,
        nbExercices: 8,
      },
    ]);
    // Le tableau brut des cours ne doit pas fuiter dans la valeur mise en cache :
    // seuls les compteurs en sortent.
    expect(resultat?.chapitresSansPartie[0]).not.toHaveProperty("cours");
  });

  it("groupe les chapitres par partie et garde à part ceux sans partie (Physique-Chimie)", async () => {
    findFirstMatiere.mockResolvedValue({
      id: BigInt(10),
      libelle: "Physique-Chimie",
      description: null,
      parties: [
        {
          id: BigInt(100),
          libelle: "Physique",
          chapitres: [
            {
              id: BigInt(20),
              libelle: "Les ondes",
              description: null,
              _count: { cours: 1 },
              cours: [{ _count: { exercices: 2 } }],
            },
          ],
        },
      ],
      chapitres: [
        {
          id: BigInt(21),
          libelle: "Révisions générales",
          description: null,
          _count: { cours: 0 },
          cours: [],
        },
      ],
    });

    const resultat = await obtenirPageMatierePubliee(BigInt(10));

    expect(resultat?.parties).toEqual([
      { id: "100", libelle: "Physique", chapitres: [{ id: "20", libelle: "Les ondes", description: null, nbCours: 1, nbExercices: 2 }] },
    ]);
    expect(resultat?.chapitresSansPartie).toEqual([
      { id: "21", libelle: "Révisions générales", description: null, nbCours: 0, nbExercices: 0 },
    ]);
    // Passe par `unstable_cache()` : un BigInt non converti ferait échouer la
    // sérialisation (même défaut que celui trouvé par l'e2e du lot 5).
    expect(() => JSON.stringify(resultat)).not.toThrow();
  });

  it("une partie non publiée n'apparaît pas, pas plus que ses chapitres", async () => {
    // `parties` est déjà filtré côté requête (`where: { statut: "publie" }`),
    // donc une partie en brouillon n'atteint jamais cette fonction : ce test
    // documente que le mapping ne réintroduit rien pour un tableau vide.
    findFirstMatiere.mockResolvedValue({
      id: BigInt(10),
      libelle: "Physique-Chimie",
      description: null,
      parties: [],
      chapitres: [],
    });

    const resultat = await obtenirPageMatierePubliee(BigInt(10));
    expect(resultat?.parties).toEqual([]);
    expect(resultat?.chapitresSansPartie).toEqual([]);
  });

  it("rend null quand la matière n'est pas visible", async () => {
    findFirstMatiere.mockResolvedValue(null);
    expect(await obtenirPageMatierePubliee(BigInt(10))).toBeNull();
  });
});

describe("obtenirReprisePourMatiere", () => {
  it("rend le dernier cours où l'élève a franchi une étape d'exercice", async () => {
    findFirstEvenement.mockResolvedValue({ cours_id: BigInt(30), chapitre_id: BigInt(20) });
    findFirstCours.mockResolvedValue({ id: BigInt(30), titre: "Cinétique" });

    const reprise = await obtenirReprisePourMatiere(BigInt(1), BigInt(10));

    expect(findFirstEvenement.mock.calls[0][0].where).toMatchObject({
      utilisateur_id: BigInt(1),
      matiere_id: BigInt(10),
      cours_id: { not: null },
    });
    expect(reprise).toEqual({ coursId: "30", chapitreId: "20", titre: "Cinétique" });
  });

  it("rend null quand l'élève n'a encore rien fait dans cette matière", async () => {
    findFirstEvenement.mockResolvedValue(null);
    expect(await obtenirReprisePourMatiere(BigInt(1), BigInt(10))).toBeNull();
  });

  // Le cours retrouvé dans le journal peut avoir été dépublié ou supprimé
  // depuis : ne jamais proposer un lien mort.
  it("rend null quand le cours retrouvé n'est plus publié", async () => {
    findFirstEvenement.mockResolvedValue({ cours_id: BigInt(30), chapitre_id: BigInt(20) });
    findFirstCours.mockResolvedValue(null);
    expect(await obtenirReprisePourMatiere(BigInt(1), BigInt(10))).toBeNull();
  });
});

describe("obtenirRepriseGlobale", () => {
  it("rend le dernier cours vu, toutes matières confondues", async () => {
    findFirstEvenement.mockResolvedValue({ cours_id: BigInt(30) });
    findFirstCours.mockResolvedValue({
      id: BigInt(30),
      titre: "Cinétique",
      chapitre: {
        id: BigInt(20),
        libelle: "Cinétique chimique",
        matiere: { id: BigInt(10), libelle: "Physique-Chimie", statut: "publie", supprime_le: null },
      },
    });

    const reprise = await obtenirRepriseGlobale(BigInt(1));

    expect(findFirstEvenement.mock.calls[0][0].where).toMatchObject({
      utilisateur_id: BigInt(1),
      cours_id: { not: null },
    });
    expect(reprise).toEqual({
      coursId: "30",
      coursTitre: "Cinétique",
      chapitreId: "20",
      chapitreLibelle: "Cinétique chimique",
      matiereId: "10",
      matiereLibelle: "Physique-Chimie",
    });
  });

  it("rend null quand l'élève n'a encore rien fait", async () => {
    findFirstEvenement.mockResolvedValue(null);
    expect(await obtenirRepriseGlobale(BigInt(1))).toBeNull();
  });

  it("rend null quand la matière du cours retrouvé n'est plus publiée", async () => {
    findFirstEvenement.mockResolvedValue({ cours_id: BigInt(30) });
    findFirstCours.mockResolvedValue({
      id: BigInt(30),
      titre: "Cinétique",
      chapitre: {
        id: BigInt(20),
        libelle: "Cinétique chimique",
        matiere: { id: BigInt(10), libelle: "Physique-Chimie", statut: "brouillon", supprime_le: null },
      },
    });
    expect(await obtenirRepriseGlobale(BigInt(1))).toBeNull();
  });
});

describe("obtenirActiviteSemaine", () => {
  it("compte les cours et exercices distincts touchés sur 7 jours", async () => {
    findManyEvenement
      .mockResolvedValueOnce([{ cours_id: BigInt(30) }, { cours_id: BigInt(31) }])
      .mockResolvedValueOnce([{ ressource_id: BigInt(60) }]);

    const activite = await obtenirActiviteSemaine(BigInt(1));

    expect(activite).toEqual({ nbCoursActifs: 2, nbExercicesTraites: 1 });
    expect(findManyEvenement).toHaveBeenCalledTimes(2);
    expect(findManyEvenement.mock.calls[1][0].where).toMatchObject({ ressource_type: "exercice" });
  });
});
