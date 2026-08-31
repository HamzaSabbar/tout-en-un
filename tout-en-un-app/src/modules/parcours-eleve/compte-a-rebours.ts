import { obtenirDateExamenNational } from "@/modules/contenu/parametre";

const MILLISECONDES_PAR_JOUR = 24 * 60 * 60 * 1000;

export type CompteARebours =
  | { etat: "disponible"; libelle: string; joursRestants: number }
  | { etat: "indisponible" };

// Lecture directe, sans cache : c'est une seule ligne, bon marché, et une
// date changée par l'admin doit se refléter immédiatement sur l'accueil, pas
// dans l'heure suivante.
export async function obtenirCompteARebours(): Promise<CompteARebours> {
  const parametre = await obtenirDateExamenNational();
  if (!parametre) return { etat: "indisponible" };

  const joursRestants = Math.max(
    0,
    Math.ceil((parametre.date.getTime() - Date.now()) / MILLISECONDES_PAR_JOUR),
  );
  return { etat: "disponible", libelle: parametre.libelle, joursRestants };
}
