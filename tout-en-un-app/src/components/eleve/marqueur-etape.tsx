"use client";

import { useEffect, useRef } from "react";

// Signale au serveur qu'une étape passive a été franchie, une seule fois par
// affichage.
//
// Pourquoi un composant client pour un simple enregistrement : Next précharge les
// pages au survol d'un lien, et un précharge exécute bien le rendu serveur. Écrire
// l'événement pendant le rendu compterait donc des consultations qui n'ont pas eu
// lieu. Un effet, lui, ne se déclenche que lorsque la page est réellement
// affichée.
//
// Le composant ne rend rien et n'ajoute aucun état : c'est le plus petit morceau
// de client possible pour obtenir un fait exact plutôt qu'un fait approximatif.
export function MarqueurEtape({ signaler }: { signaler: () => Promise<void> }) {
  // Le mode strict du développement monte deux fois : sans ce garde, chaque
  // ouverture écrirait deux lignes en local et une seule en production.
  const dejaSignale = useRef(false);

  useEffect(() => {
    if (dejaSignale.current) return;
    dejaSignale.current = true;
    // Un échec d'enregistrement ne doit rien casser côté élève : l'exercice
    // s'affiche, le fait est simplement perdu.
    void signaler().catch(() => undefined);
  }, [signaler]);

  return null;
}
