import { config } from "dotenv";

// `.env.test` d'abord : dotenv n'écrase jamais une variable déjà définie, donc la
// base de test l'emporte sur `.env` en local, et les variables du workflow CI
// l'emportent sur les deux. Importer ce fichier avant tout module qui lit
// process.env au chargement (notamment src/lib/db).
config({ path: ".env.test" });
config();
