import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";

// Remplace le contenu de démonstration (`npm run seed:contenu`) par le vrai
// programme de 2ème année du baccalauréat marocain, pour Mathématiques et
// Physique-Chimie : parties (Physique / Chimie), chapitres, cours — la
// structure de navigation uniquement, pas de contenu pédagogique (énoncés,
// vidéos, documents) au-delà des titres.
//
//   npm run seed:programme
//
// Idempotent, comme seed-contenu-demo.ts : une ligne dont la clé naturelle
// existe déjà est laissée telle quelle, jamais dupliquée ni écrasée. Les
// anciens chapitres de démonstration (`seed-contenu-demo.ts`) sont dépubliés
// et marqués `supprime_le`, jamais supprimés physiquement.

interface ChapitreSeme {
  libelle: string;
  cours: string[];
}

interface PartieSeme {
  libelle: string;
  chapitres: ChapitreSeme[];
}

// Anciens chapitres de démonstration à retirer (un par matière, issus de
// `seed-contenu-demo.ts`) : dépubliés et marqués `supprime_le`, avec leur
// cours, pour ne plus jamais apparaître côté élève.
const ANCIENS_CHAPITRES: Record<string, string[]> = {
  MATH: ["Limites et continuité", "Dérivation et étude de fonctions", "Suites numériques"],
  PC: [
    "Ondes mécaniques progressives",
    "Circuits électriques : dipôle RC",
    "Suivi temporel d'une transformation chimique",
  ],
};

const CHAPITRES_MATH: ChapitreSeme[] = [
  {
    libelle: "Analyse",
    cours: [
      "Limites et continuité",
      "Dérivation et étude des fonctions",
      "Suites numériques",
      "Fonctions primitives",
      "Fonctions logarithmiques",
      "Fonctions exponentielles",
      "Calcul intégral",
      "Équations différentielles",
    ],
  },
  {
    libelle: "Nombres complexes",
    cours: ["Nombres complexes – Partie 1", "Nombres complexes – Partie 2"],
  },
  {
    libelle: "Géométrie dans l'espace",
    cours: ["Produit scalaire dans l'espace", "Produit vectoriel dans l'espace"],
  },
  {
    libelle: "Dénombrement et probabilités",
    cours: ["Dénombrement", "Probabilités"],
  },
];

const PARTIES_PC: PartieSeme[] = [
  {
    libelle: "Physique",
    chapitres: [
      {
        libelle: "Les ondes",
        cours: [
          "Ondes mécaniques progressives",
          "Ondes mécaniques progressives périodiques",
          "Propagation des ondes lumineuses",
        ],
      },
      {
        libelle: "Nucléaire",
        cours: ["Décroissance radioactive", "Noyaux, masse et énergie"],
      },
      {
        libelle: "Électricité",
        cours: ["Dipôle RC", "Dipôle RL", "Oscillations libres d'un circuit RLC série", "Modulation d'amplitude"],
      },
      {
        libelle: "Mécanique",
        cours: [
          "Lois de Newton",
          "Chute verticale d'un solide",
          "Mouvements plans",
          "Mouvement des satellites et des planètes",
          "Mouvement de rotation d'un solide autour d'un axe fixe",
          "Systèmes mécaniques oscillants",
          "Aspects énergétiques des oscillations mécaniques",
          "Atome et mécanique de Newton",
        ],
      },
    ],
  },
  {
    libelle: "Chimie",
    chapitres: [
      {
        libelle: "Cinétique chimique",
        cours: [
          "Transformations lentes et transformations rapides",
          "Suivi temporel d'une transformation chimique – Vitesse de réaction",
        ],
      },
      {
        libelle: "Équilibres chimiques",
        cours: [
          "Transformations chimiques s'effectuant dans les deux sens",
          "État d'équilibre d'un système chimique",
          "Transformations liées aux réactions acide-base",
          "Dosage acido-basique",
        ],
      },
      {
        libelle: "Évolution des systèmes chimiques",
        cours: [
          "Évolution spontanée d'un système chimique",
          "Transformations spontanées dans les piles et production d'énergie",
          "Transformations forcées – Électrolyse",
        ],
      },
      {
        libelle: "Chimie organique",
        cours: ["Réactions d'estérification et d'hydrolyse", "Contrôle de l'évolution d'un système chimique"],
      },
    ],
  },
];

function urlBase(): string {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL ou DATABASE_URL est requis (voir .env.example).");
  return url;
}

function hote(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "hôte illisible";
  }
}

async function retirerAnciensChapitres(
  prisma: PrismaClient,
  matiereId: bigint,
  matiereLibelle: string,
  libelles: string[],
): Promise<void> {
  const chapitres = await prisma.chapitre.findMany({
    where: { matiere_id: matiereId, libelle: { in: libelles }, supprime_le: null },
    select: { id: true, libelle: true },
  });
  for (const chapitre of chapitres) {
    await prisma.cours.updateMany({
      where: { chapitre_id: chapitre.id, supprime_le: null },
      data: { statut: "brouillon", supprime_le: new Date() },
    });
    await prisma.chapitre.update({
      where: { id: chapitre.id },
      data: { statut: "brouillon", supprime_le: new Date() },
    });
    console.log(`  - ancien chapitre de démo « ${chapitre.libelle} » (${matiereLibelle}) retiré.`);
  }
}

async function creerChapitreEtCours(
  prisma: PrismaClient,
  matiereId: bigint,
  partieId: bigint | null,
  ordre: number,
  chapitreSeme: ChapitreSeme,
): Promise<void> {
  let chapitre = await prisma.chapitre.findFirst({
    where: { matiere_id: matiereId, partie_id: partieId, libelle: chapitreSeme.libelle, supprime_le: null },
  });
  if (!chapitre) {
    chapitre = await prisma.chapitre.create({
      data: {
        matiere_id: matiereId,
        partie_id: partieId ?? undefined,
        libelle: chapitreSeme.libelle,
        ordre,
        statut: "publie",
      },
    });
    console.log(`  + chapitre « ${chapitre.libelle} » créé (id ${chapitre.id}), publié.`);
  } else {
    console.log(`  = chapitre « ${chapitre.libelle} » existe déjà (id ${chapitre.id}).`);
  }

  for (const [indexCours, titreCours] of chapitreSeme.cours.entries()) {
    const existant = await prisma.cours.findFirst({
      where: { chapitre_id: chapitre.id, titre: titreCours, supprime_le: null },
    });
    if (!existant) {
      const cree = await prisma.cours.create({
        data: {
          chapitre_id: chapitre.id,
          titre: titreCours,
          ordre: indexCours,
          statut: "publie",
          publie_le: new Date(),
        },
      });
      console.log(`    + cours « ${cree.titre} » créé (id ${cree.id}), publié.`);
    } else {
      console.log(`    = cours « ${titreCours} » existe déjà (id ${existant.id}).`);
    }
  }
}

async function principal(): Promise<void> {
  const url = urlBase();
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  console.log(`Base visée : ${hote(url)}`);
  console.log("");

  try {
    const math = await prisma.matiere.findUnique({ where: { code: "MATH" } });
    if (!math) throw new Error("Matière MATH introuvable : lance d'abord `npm run seed:contenu`.");
    const pc = await prisma.matiere.findUnique({ where: { code: "PC" } });
    if (!pc) throw new Error("Matière PC introuvable : lance d'abord `npm run seed:contenu`.");

    console.log(`Mathématiques (id ${math.id})`);
    await retirerAnciensChapitres(prisma, math.id, math.libelle, ANCIENS_CHAPITRES.MATH);
    for (const [index, chapitreSeme] of CHAPITRES_MATH.entries()) {
      await creerChapitreEtCours(prisma, math.id, null, index, chapitreSeme);
    }

    console.log("");
    console.log(`Physique-Chimie (id ${pc.id})`);
    await retirerAnciensChapitres(prisma, pc.id, pc.libelle, ANCIENS_CHAPITRES.PC);
    for (const [indexPartie, partieSeme] of PARTIES_PC.entries()) {
      let partie = await prisma.partie.findFirst({
        where: { matiere_id: pc.id, libelle: partieSeme.libelle, supprime_le: null },
      });
      if (!partie) {
        partie = await prisma.partie.create({
          data: { matiere_id: pc.id, libelle: partieSeme.libelle, ordre: indexPartie, statut: "publie" },
        });
        console.log(`+ partie « ${partie.libelle} » créée (id ${partie.id}), publiée.`);
      } else {
        console.log(`= partie « ${partie.libelle} » existe déjà (id ${partie.id}).`);
      }

      for (const [indexChapitre, chapitreSeme] of partieSeme.chapitres.entries()) {
        await creerChapitreEtCours(prisma, pc.id, partie.id, indexChapitre, chapitreSeme);
      }
    }

    console.log("");
    console.log("Programme réel prêt.");
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((erreur) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exit(1);
});
