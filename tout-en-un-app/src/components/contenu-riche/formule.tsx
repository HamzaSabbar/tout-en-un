import "server-only";
import katex from "katex";
import "katex/dist/katex.min.css";
import { CONTENU_RICHE_FR } from "@/lib/i18n/contenu-riche.fr";

// Rendu LaTeX **côté serveur**, ce qu'exige architecture 9 pour la performance et
// l'indexation. Le navigateur reçoit du HTML déjà mis en forme et la feuille de
// style KaTeX ; aucun JavaScript KaTeX ne lui est envoyé. C'est la seule façon
// d'ajouter le LaTeX sans entamer les 200 Ko par page élève.
//
// `import "server-only"` est le garde-fou de cette promesse : si un composant
// client venait à importer ce fichier, la compilation échouerait au lieu de faire
// grossir silencieusement le bundle. La prévisualisation du back-office a son
// propre chemin, client et différé.
//
// La feuille de style est importée ici, pas dans la coquille élève : seules les
// routes qui rendent réellement une formule en paient le poids.

// `trust: false` (défaut, réaffirmé pour que le choix soit visible) désactive
// `\href`, `\url`, `\includegraphics` et `\htmlClass`, soit toutes les commandes
// capables d'émettre du balisage arbitraire. `throwOnError: false` fait rendre à
// KaTeX l'expression fautive en rouge au lieu de faire tomber la page.
const OPTIONS_KATEX = {
  throwOnError: false,
  trust: false,
  strict: false,
} as const;

interface FormuleProps {
  latex: string;
  bloc?: boolean;
}

export function Formule({ latex, bloc = false }: FormuleProps) {
  let html: string;
  try {
    html = katex.renderToString(latex, { ...OPTIONS_KATEX, displayMode: bloc });
  } catch {
    // `throwOnError: false` couvre les erreurs d'analyse, pas tout : une macro
    // trop développée lève encore. La formule est alors abandonnée, mais la page
    // reste servie. Le LaTeX fautif n'est pas réaffiché : il vient du
    // back-office, l'élève n'a rien à en faire.
    return (
      <span role="note" className="text-sm text-muted-foreground">
        {CONTENU_RICHE_FR.formuleIllisible}
      </span>
    );
  }

  // `dangerouslySetInnerHTML` est ici le seul usage autorisé par le lot : la
  // sortie de KaTeX est du balisage produit par KaTeX, à partir d'une chaîne
  // LaTeX validée en longueur et rendue sans `trust`. Aucune autre partie du
  // contenu riche ne passe par ce chemin, tout le reste devient des éléments
  // React et se trouve donc échappé par React.
  const Balise = bloc ? "div" : "span";
  return (
    <Balise
      className={bloc ? "overflow-x-auto py-2 text-center" : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
