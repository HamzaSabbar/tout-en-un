import "server-only";
import { Fragment } from "react";
import { Formule } from "@/components/contenu-riche/formule";
import { ImageExercice } from "@/components/contenu-riche/image-exercice";
import {
  decouperFormulesEnLigne,
  type DocumentRiche,
  type NoeudRiche,
} from "@/modules/exercice/document-riche";

// Rendu du contenu riche en éléments React, jamais en chaîne HTML. Tout ce qui
// vient du back-office traverse donc l'échappement de React. La seule exception
// est la sortie de KaTeX, isolée dans `Formule` et justifiée sur place.
//
// Le jeu de types de nœuds est fermé et validé par Zod à l'écriture : ce fichier
// n'a pas de branche « type inconnu » à afficher, il ne peut pas en recevoir. Le
// `default` du `switch` existe pour que TypeScript vérifie l'exhaustivité, pas
// pour rattraper une donnée douteuse.

interface DocumentRicheVueProps {
  document: DocumentRiche;
  // Base de la route de lecture des images, sans l'identifiant du fichier.
  baseUrlImages: string;
}

function TexteRiche({ texte }: { texte: string }) {
  const fragments = decouperFormulesEnLigne(texte);
  return (
    <>
      {fragments.map((fragment, index) =>
        fragment.type === "texte" ? (
          <Fragment key={index}>{fragment.valeur}</Fragment>
        ) : (
          <Formule key={index} latex={fragment.valeur} />
        ),
      )}
    </>
  );
}

function Noeud({ noeud, baseUrlImages }: { noeud: NoeudRiche; baseUrlImages: string }) {
  switch (noeud.type) {
    case "paragraphe":
      return (
        <p className="leading-relaxed">
          <TexteRiche texte={noeud.texte} />
        </p>
      );
    case "liste": {
      const Balise = noeud.ordonnee ? "ol" : "ul";
      return (
        <Balise className={noeud.ordonnee ? "list-decimal space-y-1 pl-6" : "list-disc space-y-1 pl-6"}>
          {noeud.elements.map((element, index) => (
            <li key={index}>
              <TexteRiche texte={element} />
            </li>
          ))}
        </Balise>
      );
    }
    case "formule":
      return <Formule latex={noeud.latex} bloc={noeud.bloc} />;
    case "image":
      return (
        <ImageExercice
          baseUrl={baseUrlImages}
          fichierId={noeud.fichier_id}
          alt={noeud.alt}
          legende={noeud.legende}
        />
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-sm">
          <code>{noeud.texte}</code>
        </pre>
      );
    default: {
      const jamais: never = noeud;
      void jamais;
      return null;
    }
  }
}

export function DocumentRicheVue({ document, baseUrlImages }: DocumentRicheVueProps) {
  return (
    <div className="space-y-4">
      {document.noeuds.map((noeud, index) => (
        <Noeud key={index} noeud={noeud} baseUrlImages={baseUrlImages} />
      ))}
    </div>
  );
}
