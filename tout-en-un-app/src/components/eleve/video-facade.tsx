"use client";

import { useState, type ComponentType } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";

// La façade ne connaît pas la route qui l'alimente : elle reçoit son URL. Le lot
// 4 lui a ajouté un deuxième appelant, la correction vidéo d'un exercice, servie
// par une autre route mais avec le même contrat de réponse
// (`{ fournisseur, reference }` après contrôle d'accès). Une seconde façade aurait
// dupliqué le chargement différé du lecteur et la gestion d'erreur.
interface VideoFacadeProps {
  // Route qui rend la référence neutre, après vérification d'accès.
  urlLecture: string;
  // Sert l'attribut `data-video-facade`, sur lequel s'appuie la recette : le
  // lecteur ne doit apparaître qu'après le clic.
  cle: string;
  titre: string;
  // Appelé au clic, s'il est fourni. Sert au parcours d'exercice, où demander la
  // correction vidéo est une étape franchie qui doit laisser une ligne dans le
  // journal d'apprentissage.
  signalerOuverture?: () => void;
}

interface LecteurProps {
  reference: string;
  titre: string;
}

export function VideoFacade({
  urlLecture,
  cle,
  titre,
  signalerOuverture,
}: VideoFacadeProps) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string>();
  const [reference, setReference] = useState<string>();
  const [Lecteur, setLecteur] = useState<ComponentType<LecteurProps>>();

  async function ouvrir() {
    setChargement(true);
    setErreur(undefined);
    // Enregistrement au plus tôt et sans attente : perdre le fait ne doit pas
    // empêcher la lecture, et l'attendre retarderait l'affichage du lecteur.
    signalerOuverture?.();
    try {
      const [reponse, moduleLecteur] = await Promise.all([
        fetch(urlLecture),
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
    <div className="relative aspect-video overflow-hidden rounded-xl bg-muted" data-video-facade={cle}>
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
