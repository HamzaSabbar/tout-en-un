import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis").url(),
  DIRECT_URL: z.string().min(1, "DIRECT_URL est requis").url(),
  APP_URL: z.string().url().optional().default("http://localhost:3000"),
  // Stockage de fichiers (Supabase Storage) : pas encore provisionné, donc
  // volontairement optionnel. src/lib/storage/storage.ts échoue clairement à
  // l'appel si ces variables manquent, plutôt que de bloquer le build.
  SUPABASE_STORAGE_URL: z.string().url().optional(),
  SUPABASE_STORAGE_KEY: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).optional(),
});

function validerEnv() {
  const resultat = envSchema.safeParse(process.env);
  if (!resultat.success) {
    const manquants = resultat.error.issues
      .map((probleme) => `  - ${probleme.path.join(".")}: ${probleme.message}`)
      .join("\n");
    throw new Error(
      `Variables d'environnement invalides ou manquantes :\n${manquants}\n` +
        `Vérifie ton fichier .env (voir .env.example).`,
    );
  }
  return resultat.data;
}

export const env = validerEnv();
