import "./env";
import { exigerBaseDeTest, nettoyerDonneesE2E } from "./base-test";

// Exécuté une fois avant la suite, avant même le démarrage du serveur web : si la
// base visée n'est pas une base de test, rien ne doit tourner.
export default async function globalSetup() {
  exigerBaseDeTest();
  // Repart d'une base sans résidu, au cas où une exécution précédente a été
  // interrompue avant son nettoyage.
  await nettoyerDonneesE2E();
}
