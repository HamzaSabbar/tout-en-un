import "server-only";
import { Fragment } from "react";
import { Formule } from "@/components/contenu-riche/formule";
import { ImageExercice } from "@/components/contenu-riche/image-exercice";
import {
  decouperTexteRiche,
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
  return (
    <>
      {decouperTexteRiche(texte).map((segment, index) => {
        const contenu = segment.fragments.map((fragment, rang) =>
          fragment.type === "texte" ? (
            <Fragment key={rang}>{fragment.valeur}</Fragment>
          ) : (
            <Formule key={rang} latex={fragment.valeur} />
          ),
        );
        return segment.emphase ? (
          <strong key={index}>{contenu}</strong>
        ) : (
          <Fragment key={index}>{contenu}</Fragment>
        );
      })}
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
    case "tableau":
      return (
        // `overflow-x-auto` sur le conteneur, jamais sur la page : un tableau
        // large sur téléphone doit défiler dans sa boîte, sinon la page entière
        // déborde.
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            {noeud.legende && (
              <caption className="caption-bottom pt-2 text-sm text-muted-foreground">
                {noeud.legende}
              </caption>
            )}
            <thead>
              <tr>
                {noeud.entetes.map((entete, rang) => (
                  <th key={rang} scope="col" className="border-b px-3 py-2 text-left font-semibold">
                    <TexteRiche texte={entete} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {noeud.lignes.map((ligne, rangLigne) => (
                <tr key={rangLigne}>
                  {ligne.map((cellule, rangCellule) => (
                    <td key={rangCellule} className="border-b px-3 py-2 align-top">
                      <TexteRiche texte={cellule} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
