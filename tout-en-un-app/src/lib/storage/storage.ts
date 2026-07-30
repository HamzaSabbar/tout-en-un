import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export interface StorageService {
  televerser(params: { cle: string; contenu: Buffer; typeMime: string }): Promise<void>;
  genererUrlSignee(cle: string, dureeSecondes: number): Promise<string>;
  supprimer(cle: string): Promise<void>;
}

function obtenirConfiguration() {
  const { SUPABASE_STORAGE_URL, SUPABASE_STORAGE_KEY, SUPABASE_STORAGE_BUCKET } = env;
  if (!SUPABASE_STORAGE_URL || !SUPABASE_STORAGE_KEY || !SUPABASE_STORAGE_BUCKET) {
    throw new Error(
      "Stockage de fichiers non configuré : SUPABASE_STORAGE_URL, " +
        "SUPABASE_STORAGE_KEY et SUPABASE_STORAGE_BUCKET sont requis (voir .env.example).",
    );
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

export const storageService: StorageService = {
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
