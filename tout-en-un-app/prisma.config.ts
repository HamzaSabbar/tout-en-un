import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Recrée le compte admin d'un environnement de développement. Idempotent, et
    // sans effet en intégration continue, qui utilise `migrate deploy`.
    seed: "node prisma/seed-admin.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
