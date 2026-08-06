"use client";

import { useEffect, useRef } from "react";

// Signale au serveur qu'une étape passive a été franchie, une seule fois par
// affichage.
//
// Pourquoi un composant client pour un simple enregistrement : Next précharge les
// pages au survol d'un lien, et un préchargement exécute bien le rendu serveur.
// Écrire l'événement pendant le rendu compterait donc des consultations qui n'ont
// pas eu lieu. Un effet, lui, ne se déclenche que lorsque la page est réellement
// affichée.
//
// L'appel passe par une route d'API et non par une action serveur : voir la route
// `etape`, qui explique pourquoi une réponse d'action arrivant à contretemps
// pouvait faire disparaître de l'écran l'aide qui venait d'être révélée.
export function MarqueurEtape({
  url,
  chapitreId,
  coursId,
  etape,
}: {
  url: string;
  chapitreId: string;
  coursId: string;
  etape: "enonce" | "correction_video";
}) {
  // Le mode strict du développement monte deux fois : sans ce garde, chaque
  // ouverture écrirait deux lignes en local et une seule en production.
  const dejaSignale = useRef(false);

  useEffect(() => {
    if (dejaSignale.current) return;
    dejaSignale.current = true;
    // Un échec d'enregistrement ne doit rien casser côté élève : l'exercice
    // s'affiche, le fait est simplement perdu.
    void signalerEtape(url, { chapitreId, coursId, etape });
  }, [url, chapitreId, coursId, etape]);

  return null;
}

export function signalerEtape(
  url: string,
  valeurs: { chapitreId: string; coursId: string; etape: "enonce" | "correction_video" },
): Promise<void> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chapitre_id: valeurs.chapitreId,
      cours_id: valeurs.coursId,
      etape: valeurs.etape,
    }),
  })
    .then(() => undefined)
    .catch(() => undefined);
}
