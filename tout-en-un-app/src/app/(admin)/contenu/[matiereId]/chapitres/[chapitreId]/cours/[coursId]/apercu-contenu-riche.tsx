"use client";

import { useState } from "react";
// La feuille de style est importée statiquement : un `import()` dynamique de CSS
// n'est pas un chemin fiable côté bundler, et ce n'est de toute façon pas elle qui
// pèse. C'est le JavaScript de KaTeX qui est différé, juste en dessous.
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";
import {
  analyserDocumentRicheJson,
  decouperFormulesEnLigne,
} from "@/modules/exercice/document-riche";

// Prévisualisation du back-office. Elle est nécessairement cliente : le
// professeur corrige son LaTeX sans recharger la page. KaTeX est donc chargé
// **en différé, au premier clic**, et la feuille de style avec lui. Le
// back-office n'est pas soumis au plafond de 200 Ko de la page élève, mais rien
// ne justifie d'imposer ce poids à qui ne prévisualise pas.
//
// Elle ne rejoue pas le rendu complet du document : ce serait une deuxième
// implémentation du même affichage, donc deux vérités. Elle traite les deux
// seules choses qui échouent vraiment à la saisie : le document est-il valide,
// et chaque formule se compile-t-elle.

type Etat =
  | { statut: "repos" }
  | { statut: "invalide" }
  | { statut: "pret"; formules: Array<{ latex: string; html: string; erreur: boolean }> };

function formulesDuDocument(json: string): string[] | null {
  const document = analyserDocumentRicheJson(json);
  if (!document) return null;

  const formules: string[] = [];
  for (const noeud of document.noeuds) {
    if (noeud.type === "formule") {
      formules.push(noeud.latex);
      continue;
    }
    const textes =
      noeud.type === "paragraphe"
        ? [noeud.texte]
        : noeud.type === "liste"
          ? noeud.elements
          : noeud.type === "tableau"
            ? [...noeud.entetes, ...noeud.lignes.flat()]
            : [];
    for (const texte of textes) {
      for (const fragment of decouperFormulesEnLigne(texte)) {
        if (fragment.type === "latex") formules.push(fragment.valeur);
      }
    }
  }
  return formules;
}

export function ApercuContenuRiche({ valeur, libelle }: { valeur: string; libelle: string }) {
  const [etat, setEtat] = useState<Etat>({ statut: "repos" });

  async function previsualiser() {
    const formules = formulesDuDocument(valeur);
    if (formules === null) {
      setEtat({ statut: "invalide" });
      return;
    }

    // Import différé : c'est ce `await import` qui garde KaTeX hors du chargement
    // initial de la page d'administration.
    const { default: katex } = await import("katex");

    setEtat({
      statut: "pret",
      formules: formules.map((latex) => {
        try {
          return {
            latex,
            html: katex.renderToString(latex, { throwOnError: true, trust: false }),
            erreur: false,
          };
        } catch {
          return { latex, html: "", erreur: true };
        }
      }),
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={previsualiser}>
        Prévisualiser {libelle}
      </Button>

      {etat.statut === "invalide" && (
        <p className="text-sm text-destructive">
          Contenu invalide : JSON mal formé, type de nœud inconnu ou champ en trop.
        </p>
      )}

      {etat.statut === "pret" && etat.formules.length === 0 && (
        <p className="text-sm text-muted-foreground">Contenu valide, aucune formule.</p>
      )}

      {etat.statut === "pret" && etat.formules.length > 0 && (
        <ul className="space-y-1 rounded-md border p-3">
          {etat.formules.map((formule, index) => (
            <li key={index} className="flex items-center gap-3 text-sm">
              <code className="text-muted-foreground">{formule.latex}</code>
              {formule.erreur ? (
                <span className="text-destructive">formule invalide</span>
              ) : (
                // Sortie de KaTeX, produite à partir d'un LaTeX rendu sans
                // `trust`. Même justification que le composant serveur.
                <span dangerouslySetInnerHTML={{ __html: formule.html }} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
