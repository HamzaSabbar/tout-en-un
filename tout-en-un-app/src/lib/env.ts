import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis").url(),
  DIRECT_URL: z.string().min(1, "DIRECT_URL est requis").url(),
  APP_URL: z.string().url().optional().default("http://localhost:3000"),
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
