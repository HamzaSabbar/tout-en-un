import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { documentRicheSchema } from "../src/modules/exercice/document-riche.ts";

// Dix exercices réels sur le cours « Ondes mécaniques progressives »
// (Physique > Les ondes), fournis par le professeur au format PDF et
// convertis ici en contenu riche interactif (énoncé, aide, correction).
//
//   npm run seed:exercices-ondes
//
// Idempotent, comme seed-exercices-pc.ts : un exercice dont le titre existe
// déjà sur ce cours est laissé tel quel. Créés **publiés** directement (choix
// du professeur), contrairement à seed-exercices-pc.ts qui sème en brouillon.
//
// Les schémas illustratifs du PDF (corde à deux instants, oscilloscope,
// sondeur, sonde d'échographie) ne sont pas reproduits : chaque énoncé porte
// déjà toutes les données numériques nécessaires dans son texte, rien n'est
// perdu à les omettre.

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
    titre: "Une perturbation se déplace sur une corde",
    difficulte: 2,
    ordre: 1,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Une perturbation se propage de gauche à droite le long d'une corde. À l'instant $t_1 = 0{,}10 \\ \\mathrm{s}$, le maximum de la perturbation se trouve à l'abscisse $x_1 = 2{,}0 \\ \\mathrm{m}$. À $t_2 = 0{,}25 \\ \\mathrm{s}$, ce même maximum est à $x_2 = 5{,}0 \\ \\mathrm{m}$. La longueur spatiale de la perturbation est $\\ell = 1{,}20 \\ \\mathrm{m}$.",
        },
        {
          type: "liste",
          ordonnee: true,
          elements: [
            "L'onde est-elle transversale ou longitudinale ? Justifier.",
            "Calculer sa célérité $v$.",
            "Déterminer la durée pendant laquelle un point fixe de la corde est en mouvement lors du passage de la perturbation.",
            "Où se trouvera le maximum de la perturbation à $t_3 = 0{,}40 \\ \\mathrm{s}$ ?",
            "Un point $M$ est situé à $SM = 6{,}50 \\ \\mathrm{m}$ de la source. Calculer son retard par rapport à la source.",
          ],
        },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Repère le déplacement du même point caractéristique de la perturbation entre $t_1$ et $t_2$. Pour la durée de passage, pense à la distance $\\ell$ que doit parcourir toute la perturbation devant un point fixe. Pour le retard, utilise directement la distance source–point.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "**1. Nature de l'onde.** Les points de la corde se déplacent verticalement alors que la perturbation se propage horizontalement. Les deux directions sont perpendiculaires : l'onde est donc **transversale**.",
        },
        { type: "paragraphe", texte: "**2. Célérité.**" },
        {
          type: "formule",
          latex: "\\Delta x = x_2 - x_1 = 5{,}0 - 2{,}0 = 3{,}0 \\ \\mathrm{m}, \\quad \\Delta t = t_2 - t_1 = 0{,}25 - 0{,}10 = 0{,}15 \\ \\mathrm{s}",
          bloc: true,
        },
        { type: "formule", latex: "v = \\dfrac{\\Delta x}{\\Delta t} = \\dfrac{3{,}0}{0{,}15} = 20 \\ \\mathrm{m \\cdot s^{-1}}", bloc: true },
        {
          type: "paragraphe",
          texte:
            "**3. Durée de la perturbation en un point.** Le point est en mouvement pendant le temps nécessaire à la perturbation de longueur $\\ell$ pour le traverser :",
        },
        { type: "formule", latex: "\\Delta t_p = \\dfrac{\\ell}{v} = \\dfrac{1{,}20}{20} = 6{,}0 \\times 10^{-2} \\ \\mathrm{s}", bloc: true },
        {
          type: "paragraphe",
          texte:
            "**4. Position à $t_3$.** Entre $t_2$ et $t_3$, $\\Delta t = 0{,}15 \\ \\mathrm{s}$, donc la perturbation avance de $v\\Delta t = 3{,}0 \\ \\mathrm{m}$ :",
        },
        { type: "formule", latex: "x_3 = 5{,}0 + 3{,}0 = 8{,}0 \\ \\mathrm{m}", bloc: true },
        { type: "paragraphe", texte: "**5. Retard de $M$.**" },
        { type: "formule", latex: "\\tau = \\dfrac{SM}{v} = \\dfrac{6{,}50}{20} = 0{,}325 \\ \\mathrm{s}", bloc: true },
      ],
    },
  },
  {
    titre: "Retard d'un point par rapport à la source",
    difficulte: 2,
    ordre: 2,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Une perturbation se propage le long d'une corde à la célérité $v = 10 \\ \\mathrm{m \\cdot s^{-1}}$. Un point $M$ est situé à $SM = 4{,}0 \\ \\mathrm{m}$ de la source $S$. L'élongation de la source $y_S(t)$ commence à $t = 0{,}10 \\ \\mathrm{s}$, atteint son maximum de $2{,}0 \\ \\mathrm{cm}$ à $t = 0{,}20 \\ \\mathrm{s}$, puis revient à zéro à $t = 0{,}40 \\ \\mathrm{s}$.",
        },
        {
          type: "liste",
          ordonnee: true,
          elements: [
            "Calculer le retard $\\tau$ de $M$ par rapport à $S$.",
            "À quelle date le point $M$ commence-t-il à se déplacer ?",
            "À quelle date son élongation est-elle maximale ?",
            "À quelle date revient-il définitivement à sa position d'équilibre ?",
            "Écrire la relation entre $y_M(t)$ et $y_S(t)$ puis décrire qualitativement $y_M(t)$.",
          ],
        },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Le signal en $M$ est exactement le signal de la source, simplement décalé dans le temps. Une fois $\\tau$ connu, ajoute ce retard à toutes les dates caractéristiques du signal de $S$.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        { type: "paragraphe", texte: "**1. Retard.**" },
        { type: "formule", latex: "\\tau = \\dfrac{SM}{v} = \\dfrac{4{,}0}{10} = 0{,}40 \\ \\mathrm{s}", bloc: true },
        {
          type: "paragraphe",
          texte: "**2–4. Dates caractéristiques.** Le signal en $M$ reproduit celui de $S$ avec $0{,}40 \\ \\mathrm{s}$ de retard.",
        },
        {
          type: "tableau",
          entetes: ["Étape", "S (s)", "M (s)"],
          lignes: [
            ["Début", "0,10", "0,50"],
            ["Maximum", "0,20", "0,60"],
            ["Fin", "0,40", "0,80"],
          ],
        },
        { type: "paragraphe", texte: "**5. Relation temporelle.**" },
        { type: "formule", latex: "y_M(t) = y_S(t - 0{,}40)", bloc: true },
        {
          type: "paragraphe",
          texte: "Le graphe de $y_M$ a exactement la même forme que celui de $y_S$, translaté de $0{,}40 \\ \\mathrm{s}$ vers la droite.",
        },
      ],
    },
  },
  {
    titre: "Un choc transmis par l'acier et par l'eau",
    difficulte: 3,
    ordre: 3,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Une canalisation en acier contient de l'eau. Un choc bref est produit à une extrémité. Un capteur situé à une distance inconnue $d$ reçoit deux signaux séparés par $\\tau = 1{,}40 \\ \\mathrm{s}$. Données : $v_{\\text{acier}} = 5{,}0 \\times 10^3 \\ \\mathrm{m \\cdot s^{-1}}$ et $v_{\\text{eau}} = 1{,}5 \\times 10^3 \\ \\mathrm{m \\cdot s^{-1}}$.",
        },
        {
          type: "liste",
          ordonnee: true,
          elements: [
            "Quel signal est reçu en premier ? Justifier sans calcul.",
            "Exprimer les durées de propagation $t_a$ dans l'acier et $t_e$ dans l'eau.",
            "Montrer que $\\tau = d\\left(\\dfrac{1}{v_{\\text{eau}}} - \\dfrac{1}{v_{\\text{acier}}}\\right)$.",
            "Calculer la distance $d$.",
            "Calculer ensuite $t_a$ et $t_e$ et vérifier la valeur de $\\tau$.",
          ],
        },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Pour une même distance, le signal associé à la plus grande célérité arrive le premier. Écris séparément $t = d/v$ dans chaque milieu, puis forme la différence des deux durées.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte: "**1. Premier signal.** Comme $v_{\\text{acier}} > v_{\\text{eau}}$, le signal propagé dans l'acier arrive en premier.",
        },
        { type: "paragraphe", texte: "**2. Durées.**" },
        { type: "formule", latex: "t_a = \\dfrac{d}{v_{\\text{acier}}}, \\qquad t_e = \\dfrac{d}{v_{\\text{eau}}}", bloc: true },
        { type: "paragraphe", texte: "**3. Retard.**" },
        { type: "formule", latex: "\\tau = t_e - t_a = d\\left(\\dfrac{1}{v_{\\text{eau}}} - \\dfrac{1}{v_{\\text{acier}}}\\right)", bloc: true },
        { type: "paragraphe", texte: "**4. Distance.**" },
        {
          type: "formule",
          latex: "d = \\dfrac{\\tau}{\\frac{1}{1500} - \\frac{1}{5000}} = 3{,}00 \\times 10^3 \\ \\mathrm{m} = 3{,}0 \\ \\mathrm{km}",
          bloc: true,
        },
        { type: "paragraphe", texte: "**5. Vérification.**" },
        { type: "formule", latex: "t_a = \\dfrac{3000}{5000} = 0{,}60 \\ \\mathrm{s}, \\qquad t_e = \\dfrac{3000}{1500} = 2{,}00 \\ \\mathrm{s}", bloc: true },
        { type: "paragraphe", texte: "Donc $t_e - t_a = 2{,}00 - 0{,}60 = 1{,}40 \\ \\mathrm{s}$, conforme à la donnée." },
      ],
    },
  },
  {
    titre: "Ultrasons dans l'air et dans l'eau de mer",
    difficulte: 3,
    ordre: 4,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Un émetteur produit simultanément deux salves ultrasonores : l'une se propage dans l'air, l'autre dans l'eau de mer. Pour plusieurs distances $d$, on mesure le retard $\\Delta t = t_{\\text{air}} - t_{\\text{eau}}$. La représentation $\\Delta t = f(d)$ est une droite passant par l'origine, de coefficient directeur $k = 2{,}274 \\ \\mathrm{ms \\cdot m^{-1}}$. On donne $v_{\\text{air}} = 340 \\ \\mathrm{m \\cdot s^{-1}}$.",
        },
        {
          type: "liste",
          ordonnee: true,
          elements: [
            "Quel signal arrive en premier ? Que peut-on en déduire sur les deux célérités ?",
            "Montrer que $\\Delta t = d\\left(\\dfrac{1}{v_{\\text{air}}} - \\dfrac{1}{v_{\\text{eau}}}\\right)$.",
            "Relier le coefficient directeur $k$ aux célérités.",
            "En déduire $v_{\\text{eau}}$.",
            "Calculer le retard attendu pour $d = 2{,}0 \\ \\mathrm{m}$.",
          ],
        },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "La pente d'une droite $\\Delta t = f(d)$ est le facteur qui multiplie $d$ dans l'expression littérale de $\\Delta t$. Attention à convertir les millisecondes en secondes avant d'inverser une grandeur.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte: "**1. Ordre d'arrivée.** L'onde arrive d'abord par l'eau : sa célérité y est donc supérieure à celle dans l'air.",
        },
        { type: "paragraphe", texte: "**2. Expression du retard.**" },
        {
          type: "formule",
          latex: "t_{\\text{air}} = \\dfrac{d}{v_{\\text{air}}}, \\quad t_{\\text{eau}} = \\dfrac{d}{v_{\\text{eau}}} \\quad \\Rightarrow \\quad \\Delta t = d\\left(\\dfrac{1}{v_{\\text{air}}} - \\dfrac{1}{v_{\\text{eau}}}\\right)",
          bloc: true,
        },
        { type: "paragraphe", texte: "**3. Coefficient directeur.** Puisque $\\Delta t = kd$ :" },
        { type: "formule", latex: "k = \\dfrac{1}{v_{\\text{air}}} - \\dfrac{1}{v_{\\text{eau}}}", bloc: true },
        { type: "paragraphe", texte: "**4. Célérité dans l'eau.** Avec $k = 2{,}274 \\times 10^{-3} \\ \\mathrm{s \\cdot m^{-1}}$ :" },
        { type: "formule", latex: "\\dfrac{1}{v_{\\text{eau}}} = \\dfrac{1}{340} - 2{,}274 \\times 10^{-3} \\quad \\Rightarrow \\quad v_{\\text{eau}} \\approx 1{,}50 \\times 10^3 \\ \\mathrm{m \\cdot s^{-1}}", bloc: true },
        { type: "paragraphe", texte: "**5. Pour $d = 2{,}0 \\ \\mathrm{m}$.**" },
        { type: "formule", latex: "\\Delta t = kd = 2{,}274 \\times 2{,}0 = 4{,}548 \\ \\mathrm{ms} \\approx 4{,}55 \\ \\mathrm{ms}", bloc: true },
      ],
    },
  },
  {
    titre: "Localiser un foyer sismique",
    difficulte: 3,
    ordre: 5,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Lors d'un séisme, deux types d'ondes sont enregistrés : les ondes $P$, de célérité $v_P = 6{,}0 \\ \\mathrm{km \\cdot s^{-1}}$, et les ondes $S$, de célérité $v_S = 3{,}5 \\ \\mathrm{km \\cdot s^{-1}}$. Une station mesure un retard de $\\Delta t = 20 \\ \\mathrm{s}$ entre l'arrivée de l'onde $P$ et celle de l'onde $S$.",
        },
        {
          type: "liste",
          ordonnee: true,
          elements: [
            "Associer les termes *longitudinale / compression* à l'onde $P$ et *transversale / cisaillement* à l'onde $S$.",
            "Exprimer les dates d'arrivée $t_P$ et $t_S$ en fonction de $d$.",
            "Établir l'expression $\\Delta t = d\\left(\\dfrac{1}{v_S} - \\dfrac{1}{v_P}\\right)$.",
            "Calculer la distance $d$ de la station au foyer.",
            "Déterminer $t_P$ et $t_S$.",
          ],
        },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte: "Les deux ondes parcourent la même distance depuis le foyer. Le retard mesuré est simplement la différence de leurs durées de parcours.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte: "**1. Nature.** L'onde $P$ est une onde longitudinale de compression. L'onde $S$ est une onde transversale de cisaillement.",
        },
        { type: "paragraphe", texte: "**2. Dates d'arrivée.**" },
        { type: "formule", latex: "t_P = \\dfrac{d}{v_P}, \\qquad t_S = \\dfrac{d}{v_S}", bloc: true },
        { type: "paragraphe", texte: "**3. Retard.**" },
        { type: "formule", latex: "\\Delta t = t_S - t_P = d\\left(\\dfrac{1}{v_S} - \\dfrac{1}{v_P}\\right)", bloc: true },
        { type: "paragraphe", texte: "**4. Distance.** En travaillant en kilomètres et secondes :" },
        { type: "formule", latex: "d = \\dfrac{20}{\\frac{1}{3{,}5} - \\frac{1}{6{,}0}} = 168 \\ \\mathrm{km}", bloc: true },
        { type: "paragraphe", texte: "**5. Dates.**" },
        { type: "formule", latex: "t_P = \\dfrac{168}{6} = 28 \\ \\mathrm{s}, \\qquad t_S = \\dfrac{168}{3{,}5} = 48 \\ \\mathrm{s}", bloc: true },
        { type: "paragraphe", texte: "On vérifie : $48 - 28 = 20 \\ \\mathrm{s}$." },
      ],
    },
  },
  {
    titre: "Éclair et tonnerre",
    difficulte: 2,
    ordre: 6,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Une personne voit un éclair puis entend le tonnerre $4{,}5 \\ \\mathrm{s}$ plus tard. On néglige le temps de propagation de la lumière devant celui du son. La célérité du son dans l'air vaut $340 \\ \\mathrm{m \\cdot s^{-1}}$. On suppose aussi que le son pourrait se propager dans le sol à $3{,}0 \\times 10^3 \\ \\mathrm{m \\cdot s^{-1}}$.",
        },
        {
          type: "liste",
          ordonnee: true,
          elements: [
            "Estimer la distance entre la personne et l'impact de la foudre.",
            "Expliquer pourquoi le tonnerre est reçu après l'éclair.",
            "Calculer la durée de propagation du son par le sol sur cette même distance.",
            "De combien de secondes le signal sonore transmis par le sol arriverait-il avant celui transmis par l'air ?",
          ],
        },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Dans la première question, $\\Delta t$ représente directement le temps de propagation du son. Pour comparer les milieux, garde la même distance et applique $t = d/v$ dans chacun.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        { type: "paragraphe", texte: "**1. Distance.** Le temps de propagation de la lumière est négligé :" },
        { type: "formule", latex: "d = v_{\\text{air}} \\Delta t = 340 \\times 4{,}5 = 1530 \\ \\mathrm{m} = 1{,}53 \\ \\mathrm{km}", bloc: true },
        {
          type: "paragraphe",
          texte:
            "**2. Pourquoi le décalage ?** La lumière se propage beaucoup plus vite que le son ; son temps de parcours sur quelques kilomètres est négligeable devant celui du son.",
        },
        { type: "paragraphe", texte: "**3. Propagation dans le sol.**" },
        { type: "formule", latex: "t_{\\text{sol}} = \\dfrac{1530}{3000} = 0{,}51 \\ \\mathrm{s}", bloc: true },
        { type: "paragraphe", texte: "**4. Avance du signal par le sol.**" },
        { type: "formule", latex: "4{,}50 - 0{,}51 = 3{,}99 \\ \\mathrm{s}", bloc: true },
        { type: "paragraphe", texte: "Le son transmis par le sol arriverait donc presque $4 \\ \\mathrm{s}$ avant celui transmis par l'air." },
      ],
    },
  },
  {
    titre: "Lire un retard sur l'oscilloscope",
    difficulte: 2,
    ordre: 7,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Deux récepteurs $R_1$ et $R_2$ sont placés dans l'air sur l'axe d'un émetteur ultrasonore. Ils sont séparés de $d = 1{,}70 \\ \\mathrm{m}$. Sur l'écran de l'oscilloscope, le signal de $R_2$ est décalé vers la droite de $n = 5{,}0$ divisions par rapport à celui de $R_1$. La sensibilité horizontale est $S_h = 1{,}0 \\ \\mathrm{ms/div}$.",
        },
        {
          type: "liste",
          ordonnee: true,
          elements: [
            "Quel récepteur est le plus éloigné de l'émetteur ? Justifier.",
            "Calculer le retard $\\tau$ entre les deux signaux.",
            "En déduire la célérité de l'onde dans l'air.",
            "Le résultat est-il cohérent avec la valeur usuelle de la célérité du son dans l'air ?",
          ],
        },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Le décalage horizontal se convertit en durée grâce à la sensibilité horizontale : une division correspond à $S_h$. Une fois le retard connu, la perturbation a parcouru la distance supplémentaire $d$ pendant $\\tau$.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte: "**1. Récepteur le plus éloigné.** Le signal de $R_2$ est décalé vers la droite : il arrive plus tard. Donc $R_2$ est plus éloigné.",
        },
        { type: "paragraphe", texte: "**2. Retard.**" },
        { type: "formule", latex: "\\tau = n S_h = 5{,}0 \\times 1{,}0 \\ \\mathrm{ms} = 5{,}0 \\times 10^{-3} \\ \\mathrm{s}", bloc: true },
        { type: "paragraphe", texte: "**3. Célérité.**" },
        { type: "formule", latex: "v = \\dfrac{d}{\\tau} = \\dfrac{1{,}70}{5{,}0 \\times 10^{-3}} = 340 \\ \\mathrm{m \\cdot s^{-1}}", bloc: true },
        {
          type: "paragraphe",
          texte: "**4. Cohérence.** Cette valeur est précisément de l'ordre de la célérité usuelle du son dans l'air à température ambiante. Le résultat est cohérent.",
        },
      ],
    },
  },
  {
    titre: "Localiser une source avec deux récepteurs",
    difficulte: 3,
    ordre: 8,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Deux microphones $A$ et $B$ sont alignés et séparés par $AB = L = 1{,}020 \\ \\mathrm{km}$. Une source sonore $S$ est située entre eux. Le microphone $A$ reçoit le signal $1{,}00 \\ \\mathrm{s}$ avant $B$. La célérité du son est $v = 340 \\ \\mathrm{m \\cdot s^{-1}}$.",
        },
        {
          type: "liste",
          ordonnee: true,
          elements: [
            "Poser $x = AS$. Exprimer $SB$ en fonction de $L$ et $x$.",
            "Exprimer $t_A$ et $t_B$.",
            "En utilisant $t_B - t_A = 1{,}00 \\ \\mathrm{s}$, établir une équation en $x$.",
            "Déterminer $AS$ et $SB$.",
            "Vérifier que le résultat est compatible avec le fait que $A$ reçoit le signal en premier.",
          ],
        },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "La source étant entre les deux microphones, les deux distances parcourues sont $x$ et $L - x$. Le récepteur qui reçoit le premier signal est nécessairement le plus proche de la source.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        { type: "paragraphe", texte: "**1. Distances.** On pose $AS = x$. Comme $S$ est entre $A$ et $B$ :" },
        { type: "formule", latex: "SB = L - x", bloc: true },
        { type: "paragraphe", texte: "**2. Durées.**" },
        { type: "formule", latex: "t_A = \\dfrac{x}{v}, \\qquad t_B = \\dfrac{L - x}{v}", bloc: true },
        { type: "paragraphe", texte: "**3. Équation.** Puisque $B$ reçoit le signal $1{,}00 \\ \\mathrm{s}$ après $A$ :" },
        { type: "formule", latex: "\\dfrac{L - x}{v} - \\dfrac{x}{v} = 1{,}00 \\quad \\Rightarrow \\quad L - 2x = v \\times 1{,}00", bloc: true },
        { type: "paragraphe", texte: "**4. Position.** Avec $L = 1020 \\ \\mathrm{m}$ et $v = 340 \\ \\mathrm{m \\cdot s^{-1}}$ :" },
        { type: "formule", latex: "x = \\dfrac{1020 - 340}{2} = 340 \\ \\mathrm{m} \\quad \\Rightarrow \\quad AS = 340 \\ \\mathrm{m}, \\ SB = 680 \\ \\mathrm{m}", bloc: true },
        { type: "paragraphe", texte: "**5. Vérification.** $AS < SB$, donc $A$ est bien plus proche et reçoit le signal en premier." },
      ],
    },
  },
  {
    titre: "Mesurer une profondeur par écho",
    difficulte: 2,
    ordre: 9,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Un sondeur placé à la surface de la mer émet une courte salve ultrasonore verticalement vers le fond. L'écho revient au sondeur $\\Delta t = 80 \\ \\mathrm{ms}$ après l'émission. La célérité des ultrasons dans l'eau de mer est $v = 1{,}50 \\times 10^3 \\ \\mathrm{m \\cdot s^{-1}}$.",
        },
        {
          type: "liste",
          ordonnee: true,
          elements: [
            "Quelle distance totale l'onde parcourt-elle entre l'émission et la réception ?",
            "Établir la relation entre $d$, $v$ et $\\Delta t$.",
            "Calculer la profondeur $d$.",
            "À un autre endroit, le retard vaut $96 \\ \\mathrm{ms}$. Calculer la nouvelle profondeur et préciser si le fond est plus profond ou moins profond.",
          ],
        },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte: "Le temps mesuré correspond à un aller-retour. La distance parcourue par l'onde n'est donc pas $d$, mais deux fois la profondeur.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte: "**1. Distance totale.** L'onde effectue un aller de profondeur $d$ puis un retour de même longueur : la distance totale est $2d$.",
        },
        { type: "paragraphe", texte: "**2. Relation.**" },
        { type: "formule", latex: "v = \\dfrac{2d}{\\Delta t} \\quad \\Rightarrow \\quad d = \\dfrac{v \\Delta t}{2}", bloc: true },
        { type: "paragraphe", texte: "**3. Profondeur.** $80 \\ \\mathrm{ms} = 8{,}0 \\times 10^{-2} \\ \\mathrm{s}$." },
        { type: "formule", latex: "d = \\dfrac{1500 \\times 0{,}080}{2} = 60 \\ \\mathrm{m}", bloc: true },
        { type: "paragraphe", texte: "**4. Nouveau point.** $96 \\ \\mathrm{ms} = 0{,}096 \\ \\mathrm{s}$." },
        { type: "formule", latex: "d' = \\dfrac{1500 \\times 0{,}096}{2} = 72 \\ \\mathrm{m}", bloc: true },
        { type: "paragraphe", texte: "Le retard est plus grand, donc le fond est plus profond de $72 - 60 = 12 \\ \\mathrm{m}$." },
      ],
    },
  },
  {
    titre: "Mesurer une épaisseur par deux échos",
    difficulte: 3,
    ordre: 10,
    enonce: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Une sonde d'échographie émet une salve ultrasonore. Deux échos sont enregistrés : le premier à $t_1 = 90 \\ \\mathrm{\\mu s}$, le second à $t_2 = 140 \\ \\mathrm{\\mu s}$. Le premier écho provient de la face avant de la zone étudiée, le second de sa face arrière. Dans le milieu, la célérité des ultrasons vaut $v = 1540 \\ \\mathrm{m \\cdot s^{-1}}$.",
        },
        {
          type: "liste",
          ordonnee: true,
          elements: [
            "Expliquer pourquoi deux échos sont observés.",
            "Calculer la distance $d_1$ entre la sonde et la face avant.",
            "Montrer que l'épaisseur $e$ vérifie $e = \\dfrac{v(t_2 - t_1)}{2}$.",
            "Calculer $e$ en centimètres.",
            "Calculer la distance entre la sonde et la face arrière et vérifier qu'elle vaut $d_1 + e$.",
          ],
        },
      ],
    },
    aide: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "Chaque date d'écho correspond à un aller-retour entre la sonde et l'interface concernée. Pour l'épaisseur, soustraire les deux trajets permet d'éliminer la partie commune entre la sonde et la face avant.",
        },
      ],
    },
    correction_texte: {
      version: 1,
      noeuds: [
        {
          type: "paragraphe",
          texte:
            "**1. Deux échos.** Une partie de l'onde est réfléchie par la face avant et une autre atteint la face arrière avant d'être réfléchie : le récepteur enregistre donc deux retours distincts.",
        },
        { type: "paragraphe", texte: "**2. Distance à la face avant.**" },
        { type: "formule", latex: "2d_1 = v t_1 \\quad \\Rightarrow \\quad d_1 = \\dfrac{v t_1}{2} = \\dfrac{1540 \\times 90 \\times 10^{-6}}{2} = 6{,}93 \\times 10^{-2} \\ \\mathrm{m} = 6{,}93 \\ \\mathrm{cm}", bloc: true },
        { type: "paragraphe", texte: "**3. Épaisseur.** Le trajet supplémentaire du second écho est exactement $2e$ :" },
        { type: "formule", latex: "v(t_2 - t_1) = 2e \\quad \\Rightarrow \\quad e = \\dfrac{v(t_2 - t_1)}{2}", bloc: true },
        { type: "paragraphe", texte: "**4. Valeur.**" },
        { type: "formule", latex: "e = \\dfrac{1540 \\times (140 - 90) \\times 10^{-6}}{2} = 3{,}85 \\times 10^{-2} \\ \\mathrm{m} = 3{,}85 \\ \\mathrm{cm}", bloc: true },
        { type: "paragraphe", texte: "**5. Face arrière.**" },
        { type: "formule", latex: "d_2 = \\dfrac{v t_2}{2} = \\dfrac{1540 \\times 140 \\times 10^{-6}}{2} = 10{,}78 \\ \\mathrm{cm}", bloc: true },
        { type: "paragraphe", texte: "Et $d_1 + e = 6{,}93 + 3{,}85 = 10{,}78 \\ \\mathrm{cm}$ : la vérification est correcte." },
      ],
    },
  },
];

function urlBase(): string {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL ou DATABASE_URL est requis (voir .env.example).");
  return url;
}

async function principal(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: urlBase() });
  const prisma = new PrismaClient({ adapter });

  try {
    const cours = await prisma.cours.findFirst({
      where: { titre: "Ondes mécaniques progressives", supprime_le: null },
    });
    if (!cours) {
      throw new Error(
        "Cours « Ondes mécaniques progressives » introuvable : lance d'abord `npm run seed:programme`.",
      );
    }
    console.log(`Cours visé : « Ondes mécaniques progressives » (id ${cours.id}).`);

    for (const exerciceSeme of EXERCICES) {
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

      const existant = await prisma.exercice.findFirst({
        where: { cours_id: cours.id, titre: exerciceSeme.titre, supprime_le: null },
      });
      if (existant) {
        console.log(`= exercice « ${exerciceSeme.titre} » existe déjà (id ${existant.id}).`);
        continue;
      }

      const cree = await prisma.exercice.create({
        data: {
          cours_id: cours.id,
          titre: exerciceSeme.titre,
          enonce: exerciceSeme.enonce as object,
          aide: exerciceSeme.aide as object,
          correction_texte: exerciceSeme.correction_texte as object,
          difficulte: exerciceSeme.difficulte,
          ordre: exerciceSeme.ordre,
          statut: "publie",
        },
      });
      console.log(`+ exercice « ${exerciceSeme.titre} » créé (id ${cree.id}), publié.`);
    }

    console.log("");
    console.log("Exercices « Ondes mécaniques progressives » prêts.");
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((erreur) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exit(1);
});
