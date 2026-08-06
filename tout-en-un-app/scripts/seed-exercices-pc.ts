import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { documentRicheSchema } from "../src/modules/exercice/document-riche.ts";

// Trois exercices réels de Physique-Chimie, 2e année du baccalauréat marocain,
// dans le style des examens nationaux. Ils existent pour la raison que la roadmap
// donne au lot 4 : « ne pas prototyper en abstrait, créer deux ou trois exercices
// réels avant d'industrialiser la saisie ». C'est en les écrivant qu'on voit ce
// que le modèle de contenu sait dire et ce qu'il ne sait pas encore dire.
//
//   COURS_ID=12 node scripts/seed-exercices-pc.ts
//
// Sans COURS_ID, le script prend le premier cours publié et le nomme avant
// d'écrire. Il est idempotent : un exercice dont le titre existe déjà sur ce
// cours est laissé tel quel, jamais dupliqué ni écrasé.
//
// Les exercices sont créés en **brouillon**. La publication reste un geste
// distinct, fait depuis le back-office, comme pour tout contenu.
//
// Imports relatifs volontaires : ce script tourne hors du bundler Next, qui seul
// résout l'alias `@/`. Il réutilise en revanche `documentRicheSchema`, pour que le
// contenu semé soit validé exactement comme celui saisi par le professeur.

// Sources du programme et du style des énoncés :
//   https://www.alloschool.com/course/physique-et-chimie-2eme-bac-sciences-physiques-biof
//   https://chtoukaphysique.com/exercices-corriges-2bac-biof/
// Les énoncés sont écrits pour ce projet, avec des valeurs numériques choisies
// pour tomber juste : rien n'est recopié d'un sujet ou d'un corrigé existant.

interface ExerciceSeme {
  titre: string;
  difficulte: number;
  ordre: number;
  enonce: unknown;
  aide: unknown;
  correction_texte: unknown;
}

const EXERCICES: ExerciceSeme[] = [
  {
    // Partie 1 du programme : ondes et lumière.
    titre: "Ondes à la surface de l'eau : célérité et retard",
    difficulte: 2,
    ordre: 1,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Une cuve à ondes est alimentée par un vibreur dont la fréquence vaut $N = 50 \\ \\mathrm{Hz}$. La pointe du vibreur touche la surface libre de l'eau au repos et y crée une onde mécanique progressive périodique.",
        },
        {
          type: "paragraphe",
          texte:
            "Sur une photographie de la surface, on mesure la distance qui sépare la première crête de la sixième : $d = 3{,}0 \\ \\mathrm{cm}$.",
        },
        { type: "liste", ordonnee: true, elements: [
          "Déterminer la longueur d'onde $\\lambda$ de cette onde.",
          "En déduire la célérité $v$ de l'onde à la surface de l'eau.",
          "Deux points $A$ et $B$ de la surface sont distants de $D = 4{,}5 \\ \\mathrm{cm}$, alignés avec la source. Calculer le retard $\\tau$ du mouvement de $B$ par rapport à celui de $A$.",
          "Les deux points $A$ et $B$ vibrent-ils en phase ? Justifier.",
        ] },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Entre la première et la sixième crête, il y a cinq intervalles, et non six. C'est l'erreur la plus fréquente sur ce type de mesure.",
        },
        {
          type: "paragraphe",
          texte:
            "La célérité, la longueur d'onde et la fréquence sont liées par une seule relation :",
        },
        { type: "formule", latex: "\\lambda = v \\, T = \\dfrac{v}{N}", bloc: true },
        {
          type: "paragraphe",
          texte:
            "Deux points vibrent en phase lorsque la distance qui les sépare est un multiple entier de $\\lambda$.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "1. Cinq intervalles séparent la première crête de la sixième, donc $\\lambda = \\dfrac{d}{5} = \\dfrac{3{,}0}{5} = 0{,}60 \\ \\mathrm{cm} = 6{,}0 \\times 10^{-3} \\ \\mathrm{m}$.",
        },
        { type: "paragraphe", texte: "2. De $\\lambda = \\dfrac{v}{N}$ on tire :" },
        {
          type: "formule",
          latex: "v = \\lambda \\, N = 6{,}0 \\times 10^{-3} \\times 50 = 0{,}30 \\ \\mathrm{m \\cdot s^{-1}}",
          bloc: true,
        },
        {
          type: "paragraphe",
          texte:
            "3. Le retard vaut $\\tau = \\dfrac{D}{v} = \\dfrac{4{,}5 \\times 10^{-2}}{0{,}30} = 0{,}15 \\ \\mathrm{s}$.",
        },
        {
          type: "paragraphe",
          texte:
            "4. On compare $D$ à $\\lambda$ : $\\dfrac{D}{\\lambda} = \\dfrac{4{,}5}{0{,}60} = 7{,}5$. Ce rapport n'est pas entier, donc $A$ et $B$ ne vibrent pas en phase. Il vaut un demi-entier, ils vibrent donc en opposition de phase.",
        },
      ],
    },
  },
  {
    // Partie 3 du programme : électricité.
    titre: "Dipôle RC : charge d'un condensateur",
    difficulte: 3,
    ordre: 2,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "On réalise un circuit série comprenant un générateur de tension continue de force électromotrice $E = 6{,}0 \\ \\mathrm{V}$, un conducteur ohmique de résistance $R = 1{,}0 \\ \\mathrm{k\\Omega}$, un condensateur de capacité $C$ inconnue et un interrupteur. Le condensateur est initialement déchargé.",
        },
        {
          type: "paragraphe",
          texte:
            "À l'instant $t = 0$, on ferme l'interrupteur. Un système d'acquisition enregistre la tension $u_C(t)$ aux bornes du condensateur. L'exploitation de la courbe donne une constante de temps $\\tau = 20 \\ \\mathrm{ms}$.",
        },
        { type: "liste", ordonnee: true, elements: [
          "Établir l'équation différentielle vérifiée par $u_C(t)$.",
          "Vérifier que $u_C(t) = E\\left(1 - e^{-t/\\tau}\\right)$ est solution de cette équation, et préciser l'expression de $\\tau$.",
          "Déterminer la valeur de la capacité $C$.",
          "Calculer la tension aux bornes du condensateur à l'instant $t = 3\\tau$, et conclure quant à l'état de charge.",
        ] },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Pars de la loi des mailles, puis remplace l'intensité par son expression en fonction de la charge du condensateur :",
        },
        { type: "formule", latex: "i = \\dfrac{\\mathrm{d}q}{\\mathrm{d}t} \\quad \\text{et} \\quad q = C \\, u_C", bloc: true },
        {
          type: "paragraphe",
          texte:
            "La constante de temps a la dimension d'un temps : c'est le seul produit de $R$ et $C$ qui donne des secondes.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "1. La loi des mailles donne $E = u_R + u_C = R\\,i + u_C$. Or $i = \\dfrac{\\mathrm{d}q}{\\mathrm{d}t}$ et $q = C\\,u_C$, d'où $i = C \\dfrac{\\mathrm{d}u_C}{\\mathrm{d}t}$. En reportant :",
        },
        {
          type: "formule",
          latex: "RC \\, \\dfrac{\\mathrm{d}u_C}{\\mathrm{d}t} + u_C = E",
          bloc: true,
        },
        {
          type: "paragraphe",
          texte:
            "2. En dérivant la solution proposée, $\\dfrac{\\mathrm{d}u_C}{\\mathrm{d}t} = \\dfrac{E}{\\tau} e^{-t/\\tau}$. En reportant dans l'équation, elle est vérifiée pour tout $t$ à condition que $\\tau = RC$. La condition initiale $u_C(0) = 0$ est bien satisfaite.",
        },
        {
          type: "paragraphe",
          texte:
            "3. De $\\tau = RC$ on tire $C = \\dfrac{\\tau}{R} = \\dfrac{20 \\times 10^{-3}}{1{,}0 \\times 10^{3}} = 2{,}0 \\times 10^{-5} \\ \\mathrm{F} = 20 \\ \\mathrm{\\mu F}$.",
        },
        {
          type: "paragraphe",
          texte:
            "4. À $t = 3\\tau$ : $u_C = 6{,}0 \\times \\left(1 - e^{-3}\\right) = 6{,}0 \\times 0{,}95 = 5{,}7 \\ \\mathrm{V}$, soit 95 pour cent de $E$. Le condensateur est pratiquement chargé : en pratique on considère la charge terminée au bout de quelques $\\tau$.",
        },
      ],
    },
  },
  {
    // Partie 2 du programme : chimie générale, suivi temporel.
    titre: "Cinétique : attaque du zinc par l'acide chlorhydrique",
    difficulte: 3,
    ordre: 3,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "On fait réagir une masse $m = 0{,}20 \\ \\mathrm{g}$ de zinc en poudre avec un volume $V = 50{,}0 \\ \\mathrm{mL}$ d'une solution d'acide chlorhydrique de concentration $C_A = 0{,}20 \\ \\mathrm{mol \\cdot L^{-1}}$. L'équation de la réaction s'écrit :",
        },
        {
          type: "formule",
          latex:
            "\\mathrm{Zn}_{(s)} + 2\\,\\mathrm{H_3O^+}_{(aq)} \\longrightarrow \\mathrm{Zn^{2+}}_{(aq)} + \\mathrm{H_2}_{(g)} + 2\\,\\mathrm{H_2O}_{(l)}",
          bloc: true,
        },
        {
          type: "paragraphe",
          texte:
            "On suit la réaction en mesurant le volume $V(\\mathrm{H_2})$ de dihydrogène dégagé, dans les conditions où le volume molaire vaut $V_m = 24{,}0 \\ \\mathrm{L \\cdot mol^{-1}}$. On donne $M(\\mathrm{Zn}) = 65{,}4 \\ \\mathrm{g \\cdot mol^{-1}}$.",
        },
        {
          type: "tableau",
          entetes: ["$t$ (min)", "0", "2", "4", "6", "8", "10", "15", "20"],
          lignes: [["$V(\\mathrm{H_2})$ (mL)", "0", "18", "32", "43", "51", "57", "65", "68"]],
          legende: "Volume de dihydrogène dégagé au cours du temps.",
        },
        {
          type: "tableau",
          legende: "Tableau d'avancement de la réaction (avancement en mol). Compléter l'état final.",
          entetes: ["État du système", "Avancement", "$\\mathrm{Zn}_{(s)}$", "$\\mathrm{H_3O^+}_{(aq)}$", "$\\mathrm{Zn^{2+}}_{(aq)}$", "$\\mathrm{H_2}_{(g)}$"],
          lignes: [
            ["État initial", "0", "$n_i(\\mathrm{Zn})$", "$n_i(\\mathrm{H_3O^+})$", "0", "0"],
            ["État final", "", "", "", "", ""],
          ],
        },
        { type: "liste", ordonnee: true, elements: [
          "Calculer les quantités de matière initiales de zinc et d'ions oxonium, puis déterminer le réactif limitant.",
          "En déduire le volume maximal de dihydrogène que la réaction peut dégager.",
          "Définir la vitesse volumique de réaction, puis comparer sans calcul sa valeur à $t = 2 \\ \\mathrm{min}$ et à $t = 15 \\ \\mathrm{min}$.",
          "Déterminer graphiquement le temps de demi-réaction $t_{1/2}$.",
        ] },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Le réactif limitant n'est pas celui dont la quantité de matière est la plus faible, mais celui dont le rapport $\\dfrac{n}{\\text{coefficient}}$ est le plus petit.",
        },
        {
          type: "paragraphe",
          texte:
            "La vitesse volumique de réaction se lit sur le graphe : elle est proportionnelle à la pente de la tangente à la courbe.",
        },
        { type: "formule", latex: "v = \\dfrac{1}{V} \\cdot \\dfrac{\\mathrm{d}x}{\\mathrm{d}t}", bloc: true },
        {
          type: "paragraphe",
          texte:
            "Le temps de demi-réaction est la date à laquelle l'avancement atteint la moitié de sa valeur finale, et non la moitié de la durée de l'expérience.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "1. $n_i(\\mathrm{Zn}) = \\dfrac{m}{M} = \\dfrac{0{,}20}{65{,}4} = 3{,}1 \\times 10^{-3} \\ \\mathrm{mol}$, et $n_i(\\mathrm{H_3O^+}) = C_A \\, V = 0{,}20 \\times 50{,}0 \\times 10^{-3} = 1{,}0 \\times 10^{-2} \\ \\mathrm{mol}$.",
        },
        {
          type: "paragraphe",
          texte:
            "On compare $\\dfrac{3{,}1 \\times 10^{-3}}{1} = 3{,}1 \\times 10^{-3}$ et $\\dfrac{1{,}0 \\times 10^{-2}}{2} = 5{,}0 \\times 10^{-3}$. Le premier rapport est le plus petit, donc **le zinc est le réactif limitant**, et $x_{max} = 3{,}1 \\times 10^{-3} \\ \\mathrm{mol}$.",
        },
        {
          type: "paragraphe",
          texte:
            "2. La stœchiométrie donne une mole de dihydrogène par mole de zinc consommé, donc $V_{max}(\\mathrm{H_2}) = x_{max} \\, V_m = 3{,}1 \\times 10^{-3} \\times 24{,}0 = 7{,}3 \\times 10^{-2} \\ \\mathrm{L} \\approx 73 \\ \\mathrm{mL}$, ce que confirment les mesures qui plafonnent vers 70 mL. Le tableau d'avancement se complète donc ainsi :",
        },
        {
          type: "tableau",
          legende: "Tableau d'avancement complété.",
          entetes: ["État du système", "Avancement", "$\\mathrm{Zn}_{(s)}$", "$\\mathrm{H_3O^+}_{(aq)}$", "$\\mathrm{Zn^{2+}}_{(aq)}$", "$\\mathrm{H_2}_{(g)}$"],
          lignes: [
            ["État initial", "0", "$n_i(\\mathrm{Zn})$", "$n_i(\\mathrm{H_3O^+})$", "0", "0"],
            ["État final", "$x_{max}$", "0", "$n_i(\\mathrm{H_3O^+}) - 2x_{max}$", "$x_{max}$", "$x_{max}$"],
          ],
        },
        {
          type: "paragraphe",
          texte:
            "3. La vitesse volumique de réaction est proportionnelle à la pente de la tangente à la courbe $x(t)$. Cette pente est nettement plus forte à $t = 2 \\ \\mathrm{min}$ qu'à $t = 15 \\ \\mathrm{min}$ : **la vitesse diminue** au cours du temps, parce que les concentrations des réactifs diminuent.",
        },
        {
          type: "paragraphe",
          texte:
            "4. Le volume final vaut environ $70 \\ \\mathrm{mL}$, sa moitié $35 \\ \\mathrm{mL}$. En lisant le tableau entre 4 min (32 mL) et 6 min (43 mL), on obtient $t_{1/2} \\approx 4{,}5 \\ \\mathrm{min}$.",
        },
      ],
    },
  },
];

function urlBase(): string {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DIRECT_URL ou DATABASE_URL est requis (voir .env.example).");
  }
  return url;
}

function hote(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "hôte illisible";
  }
}

async function principal(): Promise<void> {
  const url = urlBase();
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  // La cible est annoncée avant toute écriture : ce script ajoute du contenu, et
  // il vaut mieux voir qu'on vise la base partagée avant de le découvrir après.
  console.log(`Base visée : ${hote(url)}`);

  try {
    const cours = process.env.COURS_ID
      ? await prisma.cours.findFirst({
          where: { id: BigInt(process.env.COURS_ID), supprime_le: null },
          select: { id: true, titre: true },
        })
      : await prisma.cours.findFirst({
          where: { statut: "publie", supprime_le: null },
          orderBy: { id: "asc" },
          select: { id: true, titre: true },
        });

    if (!cours) {
      throw new Error(
        process.env.COURS_ID
          ? `Aucun cours d'identifiant ${process.env.COURS_ID}.`
          : "Aucun cours publié : crée-en un dans le back-office, ou passe COURS_ID.",
      );
    }
    console.log(`Cours de rattachement : « ${cours.titre} » (id ${cours.id})`);
    console.log("");

    for (const exercice of EXERCICES) {
      // Validation par le schéma du back-office : un contenu que le professeur
      // ne pourrait pas saisir n'a rien à faire en base non plus.
      for (const [champ, valeur] of [
        ["enonce", exercice.enonce],
        ["aide", exercice.aide],
        ["correction_texte", exercice.correction_texte],
      ] as const) {
        const analyse = documentRicheSchema.safeParse(valeur);
        if (!analyse.success) {
          throw new Error(
            `Contenu invalide dans « ${exercice.titre} », champ ${champ} : ` +
              analyse.error.issues.map((probleme) => probleme.message).join(", "),
          );
        }
      }

      const existant = await prisma.exercice.findFirst({
        where: { cours_id: cours.id, titre: exercice.titre, supprime_le: null },
        select: { id: true },
      });
      if (existant) {
        console.log(`= « ${exercice.titre} » existe déjà (id ${existant.id}), inchangé.`);
        continue;
      }

      const cree = await prisma.exercice.create({
        data: {
          cours_id: cours.id,
          titre: exercice.titre,
          enonce: exercice.enonce as object,
          aide: exercice.aide as object,
          correction_texte: exercice.correction_texte as object,
          difficulte: exercice.difficulte,
          ordre: exercice.ordre,
        },
        select: { id: true },
      });
      console.log(`+ « ${exercice.titre} » créé (id ${cree.id}), en brouillon.`);
    }

    console.log("");
    console.log("Les exercices sont en brouillon : publie-les depuis le back-office.");
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((erreur) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exit(1);
});
