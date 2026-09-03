import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { documentRicheSchema } from "../src/modules/exercice/document-riche.ts";

// Contenu de démonstration réel (pas des fixtures jetables) : une filière, ses
// deux matières, trois chapitres par matière, un cours par chapitre et un
// exercice réel par cours, dans le style des examens nationaux marocains.
//
//   npm run seed:contenu
//
// Idempotent, comme seed-admin.ts et seed-exercices-pc.ts : une ligne dont la
// clé naturelle (code, libellé, titre) existe déjà est laissée telle quelle,
// jamais dupliquée ni écrasée. Tout est créé publié, pour être immédiatement
// utilisable, contrairement à seed-exercices-pc.ts qui sème en brouillon —
// ici l'objectif est un jeu de données de démonstration prêt à parcourir, pas
// un contenu à relire avant publication.
//
// Sources et style des énoncés, comme pour seed-exercices-pc.ts : programme
// marocain de 2ème année du baccalauréat, énoncés écrits pour ce projet.

interface ExerciceSeme {
  titre: string;
  categorie: "comprehension" | "type_bac" | "approfondissement";
  enonce: unknown;
  aide: unknown;
  correction_texte: unknown;
}

interface CoursSeme {
  titre: string;
  description: string;
  exercice: ExerciceSeme;
}

interface ChapitreSeme {
  libelle: string;
  description: string;
  cours: CoursSeme;
}

interface MatiereSeme {
  code: string;
  libelle: string;
  description: string;
  icone: string;
  chapitres: ChapitreSeme[];
}

const MATIERES: MatiereSeme[] = [
  {
    code: "MATH",
    libelle: "Mathématiques",
    description: "Analyse et suites numériques, 2ème année du baccalauréat.",
    icone: "Calculator",
    chapitres: [
      {
        libelle: "Limites et continuité",
        description: "Calcul de limites, formes indéterminées, prolongement par continuité.",
        cours: {
          titre: "Limite en un point, prolongement par continuité",
          description: "Lever une forme indéterminée par quantité conjuguée et étudier la continuité.",
          exercice: {
            titre: "Étude d'une fonction en x = 1",
            categorie: "type_bac",
            enonce: {
              version: 1,
              noeuds: [
                {
                  type: "paragraphe",
                  texte:
                    "On considère la fonction $f$ définie sur $[-3 ; +\\infty[\\ \\setminus\\{1\\}$ par $f(x) = \\dfrac{\\sqrt{x+3} - 2}{x - 1}$.",
                },
                { type: "liste", ordonnee: true, elements: [
                  "Montrer que pour tout $x \\neq 1$ du domaine, $f(x) = \\dfrac{1}{\\sqrt{x+3} + 2}$.",
                  "En déduire $\\displaystyle\\lim_{x \\to 1} f(x)$.",
                  "$f$ est-elle prolongeable par continuité en $1$ ? Si oui, préciser le prolongement $g$.",
                  "Calculer $\\displaystyle\\lim_{x \\to +\\infty} f(x)$ et interpréter graphiquement le résultat.",
                ] },
              ],
            },
            aide: {
              version: 1,
              noeuds: [
                {
                  type: "paragraphe",
                  texte:
                    "Pour lever l'indétermination en $1$, multiplie numérateur et dénominateur par la quantité conjuguée $\\sqrt{x+3} + 2$.",
                },
                { type: "formule", latex: "(\\sqrt{x+3} - 2)(\\sqrt{x+3} + 2) = (x+3) - 4 = x - 1", bloc: true },
                {
                  type: "paragraphe",
                  texte:
                    "Une limite finie en un point où $f$ n'est pas définie est exactement ce qui permet un prolongement par continuité.",
                },
              ],
            },
            correction_texte: {
              version: 1,
              noeuds: [
                {
                  type: "paragraphe",
                  texte:
                    "1. En multipliant par la quantité conjuguée : $f(x) = \\dfrac{(\\sqrt{x+3}-2)(\\sqrt{x+3}+2)}{(x-1)(\\sqrt{x+3}+2)} = \\dfrac{x - 1}{(x-1)(\\sqrt{x+3}+2)} = \\dfrac{1}{\\sqrt{x+3}+2}$ pour $x \\neq 1$.",
                },
                {
                  type: "paragraphe",
                  texte:
                    "2. Cette écriture est continue en $1$, donc $\\displaystyle\\lim_{x \\to 1} f(x) = \\dfrac{1}{\\sqrt{4}+2} = \\dfrac{1}{4}$.",
                },
                {
                  type: "paragraphe",
                  texte:
                    "3. La limite en $1$ est finie : **$f$ est prolongeable par continuité en $1$**. Le prolongement $g$ est défini par $g(x) = f(x)$ pour $x \\neq 1$ et $g(1) = \\dfrac{1}{4}$.",
                },
                {
                  type: "paragraphe",
                  texte:
                    "4. Quand $x \\to +\\infty$, $\\sqrt{x+3} \\to +\\infty$ donc $\\sqrt{x+3}+2 \\to +\\infty$, d'où $\\displaystyle\\lim_{x \\to +\\infty} f(x) = 0$. La courbe de $f$ admet donc l'axe des abscisses comme **asymptote horizontale** au voisinage de $+\\infty$.",
                },
              ],
            },
          },
        },
      },
      {
        libelle: "Dérivation et étude de fonctions",
        description: "Signe de la dérivée, tableau de variations, résolution d'équations par factorisation.",
        cours: {
          titre: "Tableau de variations et résolution d'équations",
          description: "Étudier une fonction polynôme du troisième degré et résoudre f(x) = 0.",
          exercice: {
            titre: "Étude complète de f(x) = x³ − 3x + 2",
            categorie: "type_bac",
            enonce: {
              version: 1,
              noeuds: [
                {
                  type: "paragraphe",
                  texte:
                    "On considère la fonction $f$ définie sur $\\mathbb{R}$ par $f(x) = x^3 - 3x + 2$.",
                },
                { type: "liste", ordonnee: true, elements: [
                  "Calculer $f'(x)$ et étudier son signe sur $\\mathbb{R}$.",
                  "Calculer $\\displaystyle\\lim_{x \\to -\\infty} f(x)$ et $\\displaystyle\\lim_{x \\to +\\infty} f(x)$, puis dresser le tableau de variations de $f$.",
                  "Vérifier que $1$ est une racine de l'équation $f(x) = 0$, puis factoriser entièrement $f(x)$.",
                  "Résoudre l'équation $f(x) = 0$ dans $\\mathbb{R}$.",
                ] },
              ],
            },
            aide: {
              version: 1,
              noeuds: [
                {
                  type: "paragraphe",
                  texte: "La dérivée d'un polynôme du troisième degré est un polynôme du second degré, à factoriser.",
                },
                {
                  type: "paragraphe",
                  texte:
                    "Une fois une racine évidente trouvée, $f(x) = (x - 1)(ax^2 + bx + c)$ : identifie $a$, $b$, $c$ en développant, puis factorise le second facteur à son tour.",
                },
              ],
            },
            correction_texte: {
              version: 1,
              noeuds: [
                {
                  type: "paragraphe",
                  texte:
                    "1. $f'(x) = 3x^2 - 3 = 3(x-1)(x+1)$. Un trinôme du second degré est du signe de son coefficient dominant à l'extérieur de ses racines : $f'(x) > 0$ sur $]-\\infty ; -1[$ et $]1 ; +\\infty[$, et $f'(x) < 0$ sur $]-1 ; 1[$.",
                },
                {
                  type: "paragraphe",
                  texte:
                    "2. Le terme de plus haut degré $x^3$ impose $\\displaystyle\\lim_{x \\to -\\infty} f(x) = -\\infty$ et $\\displaystyle\\lim_{x \\to +\\infty} f(x) = +\\infty$. Avec $f(-1) = 4$ et $f(1) = 0$ :",
                },
                {
                  type: "tableau",
                  legende: "Signe de f'(x) et variations de f.",
                  entetes: ["Intervalle", "]-∞ ; -1[", "]-1 ; 1[", "]1 ; +∞["],
                  lignes: [
                    ["Signe de f'(x)", "+", "-", "+"],
                    ["Variations de f", "croissante", "décroissante", "croissante"],
                  ],
                },
                {
                  type: "paragraphe",
                  texte:
                    "$f$ admet donc un maximum local $f(-1) = 4$ et un minimum local $f(1) = 0$.",
                },
                {
                  type: "paragraphe",
                  texte:
                    "3. $f(1) = 1 - 3 + 2 = 0$ : **$1$ est bien racine**. En posant $f(x) = (x-1)(x^2 + x - 2)$ et en développant pour identifier les coefficients, on retrouve $x^3 - 3x + 2$. Le second facteur se factorise à son tour : $x^2 + x - 2 = (x-1)(x+2)$, donc :",
                },
                { type: "formule", latex: "f(x) = (x - 1)^2 (x + 2)", bloc: true },
                {
                  type: "paragraphe",
                  texte:
                    "4. $f(x) = 0 \\iff (x-1)^2(x+2) = 0 \\iff x = 1 \\text{ (racine double)} \\text{ ou } x = -2$. L'ensemble des solutions est $S = \\{-2 ; 1\\}$, cohérent avec le minimum local nul trouvé en $x=1$ à la question 2.",
                },
              ],
            },
          },
        },
      },
      {
        libelle: "Suites numériques",
        description: "Suites arithmético-géométriques : expression explicite, monotonie, convergence.",
        cours: {
          titre: "Suites arithmético-géométriques",
          description: "Ramener une suite récurrente à une suite géométrique auxiliaire.",
          exercice: {
            titre: "Étude d'une suite définie par récurrence",
            categorie: "type_bac",
            enonce: {
              version: 1,
              noeuds: [
                {
                  type: "paragraphe",
                  texte:
                    "On considère la suite $(u_n)_{n \\in \\mathbb{N}}$ définie par $u_0 = 1$ et, pour tout entier naturel $n$, $u_{n+1} = \\dfrac{1}{3} u_n + 2$.",
                },
                { type: "liste", ordonnee: true, elements: [
                  "Calculer $u_1$ et $u_2$.",
                  "On pose, pour tout $n$, $v_n = u_n - 3$. Montrer que $(v_n)$ est une suite géométrique dont on précisera la raison et le premier terme.",
                  "Exprimer $v_n$ puis $u_n$ en fonction de $n$.",
                  "Étudier le sens de variation de $(u_n)$, puis déterminer sa limite quand $n \\to +\\infty$.",
                ] },
              ],
            },
            aide: {
              version: 1,
              noeuds: [
                {
                  type: "paragraphe",
                  texte:
                    "Pour la question 2, calcule $v_{n+1} = u_{n+1} - 3$ et remplace $u_{n+1}$ par son expression en fonction de $u_n$, puis fais réapparaître $v_n = u_n - 3$.",
                },
                {
                  type: "paragraphe",
                  texte:
                    "Le point fixe de la récurrence, $\\ell$ tel que $\\ell = \\dfrac{1}{3}\\ell + 2$, donne directement le décalage à soustraire.",
                },
              ],
            },
            correction_texte: {
              version: 1,
              noeuds: [
                {
                  type: "paragraphe",
                  texte:
                    "1. $u_1 = \\dfrac{1}{3} \\times 1 + 2 = \\dfrac{7}{3}$, puis $u_2 = \\dfrac{1}{3} \\times \\dfrac{7}{3} + 2 = \\dfrac{25}{9}$.",
                },
                {
                  type: "paragraphe",
                  texte:
                    "2. Pour tout $n$, $v_{n+1} = u_{n+1} - 3 = \\dfrac{1}{3}u_n + 2 - 3 = \\dfrac{1}{3}u_n - 1 = \\dfrac{1}{3}(u_n - 3) = \\dfrac{1}{3} v_n$. **$(v_n)$ est donc géométrique de raison $q = \\dfrac{1}{3}$**, de premier terme $v_0 = u_0 - 3 = -2$.",
                },
                {
                  type: "paragraphe",
                  texte:
                    "3. Pour tout $n$, $v_n = v_0 \\, q^n = -2 \\left(\\dfrac{1}{3}\\right)^n$, d'où $u_n = v_n + 3 = 3 - 2\\left(\\dfrac{1}{3}\\right)^n$.",
                },
                {
                  type: "paragraphe",
                  texte:
                    "4. Comme $0 < \\dfrac{1}{3} < 1$, la suite $\\left(\\left(\\dfrac{1}{3}\\right)^n\\right)$ est positive et décroissante vers $0$, donc $v_n = -2\\left(\\dfrac{1}{3}\\right)^n$ est négative et **croissante** vers $0$. Il en résulte que $(u_n)$ est **croissante**, majorée par $3$, et $\\displaystyle\\lim_{n \\to +\\infty} u_n = 3$.",
                },
              ],
            },
          },
        },
      },
    ],
  },
  {
    code: "PC",
    libelle: "Physique-Chimie",
    description: "Ondes, électricité et cinétique chimique, 2ème année du baccalauréat.",
    icone: "Atom",
    chapitres: [
      {
        libelle: "Ondes mécaniques progressives",
        description: "Célérité, longueur d'onde et retard le long d'une onde périodique.",
        cours: {
          titre: "Ondes à la surface de l'eau",
          description: "Exploiter une photographie de la surface pour déterminer la célérité de l'onde.",
          exercice: {
            titre: "Ondes à la surface de l'eau : célérité et retard",
            categorie: "comprehension",
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
                  texte: "La célérité, la longueur d'onde et la fréquence sont liées par une seule relation :",
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
                  texte: "3. Le retard vaut $\\tau = \\dfrac{D}{v} = \\dfrac{4{,}5 \\times 10^{-2}}{0{,}30} = 0{,}15 \\ \\mathrm{s}$.",
                },
                {
                  type: "paragraphe",
                  texte:
                    "4. On compare $D$ à $\\lambda$ : $\\dfrac{D}{\\lambda} = \\dfrac{4{,}5}{0{,}60} = 7{,}5$. Ce rapport n'est pas entier, donc $A$ et $B$ ne vibrent pas en phase. Il vaut un demi-entier, ils vibrent donc en opposition de phase.",
                },
              ],
            },
          },
        },
      },
      {
        libelle: "Circuits électriques : dipôle RC",
        description: "Charge d'un condensateur, équation différentielle et constante de temps.",
        cours: {
          titre: "Dipôle RC : charge d'un condensateur",
          description: "Établir puis exploiter l'équation différentielle de la charge d'un condensateur.",
          exercice: {
            titre: "Dipôle RC : charge d'un condensateur",
            categorie: "type_bac",
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
                  texte: "Pars de la loi des mailles, puis remplace l'intensité par son expression en fonction de la charge du condensateur :",
                },
                { type: "formule", latex: "i = \\dfrac{\\mathrm{d}q}{\\mathrm{d}t} \\quad \\text{et} \\quad q = C \\, u_C", bloc: true },
                {
                  type: "paragraphe",
                  texte: "La constante de temps a la dimension d'un temps : c'est le seul produit de $R$ et $C$ qui donne des secondes.",
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
                { type: "formule", latex: "RC \\, \\dfrac{\\mathrm{d}u_C}{\\mathrm{d}t} + u_C = E", bloc: true },
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
        },
      },
      {
        libelle: "Suivi temporel d'une transformation chimique",
        description: "Tableau d'avancement, réactif limitant, vitesse et temps de demi-réaction.",
        cours: {
          titre: "Cinétique chimique",
          description: "Exploiter un suivi de volume gazeux pour caractériser l'avancement d'une réaction.",
          exercice: {
            titre: "Cinétique : attaque du zinc par l'acide chlorhydrique",
            categorie: "type_bac",
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
                  latex: "\\mathrm{Zn}_{(s)} + 2\\,\\mathrm{H_3O^+}_{(aq)} \\longrightarrow \\mathrm{Zn^{2+}}_{(aq)} + \\mathrm{H_2}_{(g)} + 2\\,\\mathrm{H_2O}_{(l)}",
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
                  texte: "Le réactif limitant n'est pas celui dont la quantité de matière est la plus faible, mais celui dont le rapport $\\dfrac{n}{\\text{coefficient}}$ est le plus petit.",
                },
                {
                  type: "paragraphe",
                  texte: "La vitesse volumique de réaction se lit sur le graphe : elle est proportionnelle à la pente de la tangente à la courbe.",
                },
                { type: "formule", latex: "v = \\dfrac{1}{V} \\cdot \\dfrac{\\mathrm{d}x}{\\mathrm{d}t}", bloc: true },
                {
                  type: "paragraphe",
                  texte: "Le temps de demi-réaction est la date à laquelle l'avancement atteint la moitié de sa valeur finale, et non la moitié de la durée de l'expérience.",
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
        },
      },
    ],
  },
];

const OFFRES = [
  { libelle: "Accès 1 matière — mensuel", description: "Accès à une matière pendant 30 jours.", duree_jours: 30, nb_matieres: 1, prix: 199 },
  { libelle: "Accès 1 matière — trimestre", description: "Accès à une matière pendant 90 jours, le meilleur tarif au mois.", duree_jours: 90, nb_matieres: 1, prix: 499 },
];

const FILIERE = { code: "SP", libelle: "Sciences Physiques", ordre: 0 };

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

async function principal(): Promise<void> {
  const url = urlBase();
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  console.log(`Base visée : ${hote(url)}`);
  console.log("");

  try {
    for (const offre of OFFRES) {
      const existante = await prisma.offre.findFirst({ where: { libelle: offre.libelle, supprime_le: null } });
      if (existante) {
        console.log(`= offre « ${offre.libelle} » existe déjà.`);
        continue;
      }
      await prisma.offre.create({ data: offre });
      console.log(`+ offre « ${offre.libelle} » créée.`);
    }

    let filiere = await prisma.filiere.findUnique({ where: { code: FILIERE.code } });
    if (!filiere) {
      filiere = await prisma.filiere.create({ data: FILIERE });
      console.log(`+ filière « ${filiere.libelle} » créée (id ${filiere.id}).`);
    } else {
      console.log(`= filière « ${filiere.libelle} » existe déjà (id ${filiere.id}).`);
    }

    for (const [indexMatiere, matiereSeme] of MATIERES.entries()) {
      let matiere = await prisma.matiere.findUnique({ where: { code: matiereSeme.code } });
      if (!matiere) {
        matiere = await prisma.matiere.create({
          data: {
            code: matiereSeme.code,
            libelle: matiereSeme.libelle,
            description: matiereSeme.description,
            icone: matiereSeme.icone,
            ordre: indexMatiere,
            statut: "publie",
          },
        });
        console.log(`+ matière « ${matiere.libelle} » créée (id ${matiere.id}), publiée.`);
      } else if (matiere.statut !== "publie") {
        matiere = await prisma.matiere.update({ where: { id: matiere.id }, data: { statut: "publie" } });
        console.log(`= matière « ${matiere.libelle} » existait déjà, publiée.`);
      } else {
        console.log(`= matière « ${matiere.libelle} » existe déjà (id ${matiere.id}).`);
      }

      await prisma.filiereMatiere.upsert({
        where: { filiere_id_matiere_id: { filiere_id: filiere.id, matiere_id: matiere.id } },
        create: { filiere_id: filiere.id, matiere_id: matiere.id },
        update: {},
      });

      for (const [indexChapitre, chapitreSeme] of matiereSeme.chapitres.entries()) {
        let chapitre = await prisma.chapitre.findFirst({
          where: { matiere_id: matiere.id, libelle: chapitreSeme.libelle, supprime_le: null },
        });
        if (!chapitre) {
          chapitre = await prisma.chapitre.create({
            data: {
              matiere_id: matiere.id,
              libelle: chapitreSeme.libelle,
              description: chapitreSeme.description,
              ordre: indexChapitre,
              statut: "publie",
            },
          });
          console.log(`  + chapitre « ${chapitre.libelle} » créé (id ${chapitre.id}), publié.`);
        } else {
          console.log(`  = chapitre « ${chapitre.libelle} » existe déjà (id ${chapitre.id}).`);
        }

        const coursSeme = chapitreSeme.cours;
        let cours = await prisma.cours.findFirst({
          where: { chapitre_id: chapitre.id, titre: coursSeme.titre, supprime_le: null },
        });
        if (!cours) {
          cours = await prisma.cours.create({
            data: {
              chapitre_id: chapitre.id,
              titre: coursSeme.titre,
              description: coursSeme.description,
              ordre: 0,
              statut: "publie",
              publie_le: new Date(),
            },
          });
          console.log(`    + cours « ${cours.titre} » créé (id ${cours.id}), publié.`);
        } else {
          console.log(`    = cours « ${cours.titre} » existe déjà (id ${cours.id}).`);
        }

        const exerciceSeme = coursSeme.exercice;
        for (const [champ, valeur] of [
          ["enonce", exerciceSeme.enonce],
          ["aide", exerciceSeme.aide],
          ["correction_texte", exerciceSeme.correction_texte],
        ] as const) {
          const analyse = documentRicheSchema.safeParse(valeur);
          if (!analyse.success) {
            throw new Error(
              `Contenu invalide dans « ${exerciceSeme.titre} », champ ${champ} : ` +
                analyse.error.issues.map((probleme) => `${probleme.path.join(".")}: ${probleme.message}`).join(", "),
            );
          }
        }

        const exerciceExistant = await prisma.exercice.findFirst({
          where: { cours_id: cours.id, titre: exerciceSeme.titre, supprime_le: null },
        });
        if (!exerciceExistant) {
          const cree = await prisma.exercice.create({
            data: {
              cours_id: cours.id,
              titre: exerciceSeme.titre,
              enonce: exerciceSeme.enonce as object,
              aide: exerciceSeme.aide as object,
              correction_texte: exerciceSeme.correction_texte as object,
              categorie: exerciceSeme.categorie,
              ordre: 0,
              statut: "publie",
            },
          });
          console.log(`      + exercice « ${exerciceSeme.titre} » créé (id ${cree.id}), publié.`);
        } else if (exerciceExistant.statut !== "publie") {
          await prisma.exercice.update({ where: { id: exerciceExistant.id }, data: { statut: "publie" } });
          console.log(`      = exercice « ${exerciceSeme.titre} » existait déjà, publié.`);
        } else {
          console.log(`      = exercice « ${exerciceSeme.titre} » existe déjà (id ${exerciceExistant.id}).`);
        }
      }
    }

    console.log("");
    console.log("Contenu de démonstration prêt.");
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((erreur) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exit(1);
});
