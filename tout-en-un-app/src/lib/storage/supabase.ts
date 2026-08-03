import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { StorageService } from "@/lib/storage/contrat";

// Texte unique de l'erreur de configuration : le sélecteur de `storage.ts` le
// réutilise, pour qu'un même défaut ne se raconte pas de deux façons.
export const MESSAGE_CONFIGURATION_MANQUANTE =
  "Stockage de fichiers non configuré : SUPABASE_STORAGE_URL, " +
  "SUPABASE_STORAGE_KEY et SUPABASE_STORAGE_BUCKET sont requis (voir .env.example).";

// Le sélecteur ne retient cet adaptateur qu'avec les trois variables
// renseignées. La revérification reste défensive : rien ne garantit qu'un futur
// appelant passe par le sélecteur.
function obtenirConfiguration() {
  const { SUPABASE_STORAGE_URL, SUPABASE_STORAGE_KEY, SUPABASE_STORAGE_BUCKET } = env;
  if (!SUPABASE_STORAGE_URL || !SUPABASE_STORAGE_KEY || !SUPABASE_STORAGE_BUCKET) {
    throw new Error(MESSAGE_CONFIGURATION_MANQUANTE);
  }
  return { SUPABASE_STORAGE_URL, SUPABASE_STORAGE_KEY, SUPABASE_STORAGE_BUCKET };
}

function bucket() {
  const { SUPABASE_STORAGE_URL, SUPABASE_STORAGE_KEY, SUPABASE_STORAGE_BUCKET } =
    obtenirConfiguration();
  return createClient(SUPABASE_STORAGE_URL, SUPABASE_STORAGE_KEY).storage.from(
    SUPABASE_STORAGE_BUCKET,
  );
}

export const adaptateurSupabase: StorageService = {
  async televerser({ cle, contenu, typeMime }) {
    const { error } = await bucket().upload(cle, contenu, {
      contentType: typeMime,
      upsert: true,
    });
    if (error) {
      throw new Error(`Échec du téléversement (${cle}) : ${error.message}`);
    }
  },

  async genererUrlSignee(cle, dureeSecondes) {
    const { data, error } = await bucket().createSignedUrl(cle, dureeSecondes);
    if (error || !data) {
      throw new Error(
        `Échec de la génération de l'URL signée (${cle}) : ${error?.message}`,
      );
    }
    return data.signedUrl;
  },

  async supprimer(cle) {
    const { error } = await bucket().remove([cle]);
    if (error) {
      throw new Error(`Échec de la suppression (${cle}) : ${error.message}`);
    }
  },
};
