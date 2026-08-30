import { env } from "@/lib/env";
import type { StorageService } from "@/lib/storage/contrat";
import { adaptateurLocal, stockageLocalAutorise } from "@/lib/storage/local";
import {
  MESSAGE_CONFIGURATION_MANQUANTE,
  adaptateurSupabase,
} from "@/lib/storage/supabase";

export type { StorageService };

// Supabase dès que le bucket est configuré. Sinon un stockage disque, réservé au
// développement et aux tests, qui rend le parcours de téléversement et de lecture
// réellement exécutable sans provisionnement. Sinon l'échec explicite d'avant :
// une production sans stockage configuré doit se plaindre, pas écrire sur un
// disque éphémère.
function choisirAdaptateur(): StorageService {
  const { SUPABASE_STORAGE_URL, SUPABASE_STORAGE_KEY, SUPABASE_STORAGE_BUCKET } = env;
  if (SUPABASE_STORAGE_URL && SUPABASE_STORAGE_KEY && SUPABASE_STORAGE_BUCKET) {
    return adaptateurSupabase;
  }
  if (stockageLocalAutorise()) {
    return adaptateurLocal;
  }
  throw new Error(MESSAGE_CONFIGURATION_MANQUANTE);
}

// Le choix se fait à chaque appel, jamais au chargement du module : importer ce
// fichier reste sans effet de bord et sans lecture d'environnement. Les méthodes
// restent `async` pour que le refus de `choisirAdaptateur()` arrive à l'appelant
// en promesse rejetée, et non en exception synchrone.
export const storageService: StorageService = {
  async televerser(params) {
    return choisirAdaptateur().televerser(params);
  },

  async genererUrlSignee(cle, dureeSecondes) {
    return choisirAdaptateur().genererUrlSignee(cle, dureeSecondes);
  },

  async telecharger(cle) {
    return choisirAdaptateur().telecharger(cle);
  },

  async supprimer(cle) {
    return choisirAdaptateur().supprimer(cle);
  },
};
