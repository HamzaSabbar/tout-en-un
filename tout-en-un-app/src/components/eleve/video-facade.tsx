"use client";

import { useState, type ComponentType } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";

interface VideoFacadeProps {
  matiereId: string;
  videoId: string;
  titre: string;
}

interface LecteurProps {
  reference: string;
  titre: string;
}

export function VideoFacade({ matiereId, videoId, titre }: VideoFacadeProps) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string>();
  const [reference, setReference] = useState<string>();
  const [Lecteur, setLecteur] = useState<ComponentType<LecteurProps>>();

  async function ouvrir() {
    setChargement(true);
    setErreur(undefined);
    try {
      const [reponse, moduleLecteur] = await Promise.all([
        fetch(`/api/matieres/${matiereId}/videos/${videoId}/lecture`),
        import("./lecteur-video"),
      ]);
      if (!reponse.ok) throw new Error("lecture_refusee");
      const donnees = (await reponse.json()) as {
        fournisseur?: string;
        reference?: string;
      };
      if (donnees.fournisseur !== "youtube" || !donnees.reference) {
        throw new Error("reponse_invalide");
      }
      setLecteur(() => moduleLecteur.default);
      setReference(donnees.reference);
    } catch {
      setErreur(ELEVE_FR.ressources.erreurVideo);
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-muted" data-video-facade={videoId}>
      {Lecteur && reference ? (
        <Lecteur reference={reference} titre={titre} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
          <Play aria-hidden="true" className="size-9 text-muted-foreground" />
          <Button className="min-h-11 px-5" onClick={ouvrir} disabled={chargement}>
            {chargement ? ELEVE_FR.ressources.chargementVideo : ELEVE_FR.ressources.regarder}
          </Button>
          {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
        </div>
      )}
    </div>
  );
}
