"use client";

import { signalerEtape } from "@/components/eleve/marqueur-etape";
import { VideoFacade } from "@/components/eleve/video-facade";

// Enveloppe cliente de la façade vidéo pour la correction d'un exercice.
//
// Elle existe pour une seule raison : la page est un composant serveur, elle ne
// peut donc pas passer de fonction à la façade. Plutôt que d'apprendre à la façade
// ce qu'est une étape d'exercice — elle sert aussi les vidéos de cours, qui n'en
// ont pas — le rattachement au journal d'apprentissage est isolé ici.
export function CorrectionVideo({
  urlLecture,
  urlEtape,
  chapitreId,
  coursId,
  cle,
  titre,
}: {
  urlLecture: string;
  urlEtape: string;
  chapitreId: string;
  coursId: string;
  cle: string;
  titre: string;
}) {
  return (
    <VideoFacade
      urlLecture={urlLecture}
      cle={cle}
      titre={titre}
      signalerOuverture={() =>
        void signalerEtape(urlEtape, { chapitreId, coursId, etape: "correction_video" })
      }
    />
  );
}
