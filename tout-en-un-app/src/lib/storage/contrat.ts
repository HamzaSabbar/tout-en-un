// Contrat partagé par les adaptateurs de stockage. Dans un fichier à part pour
// que `storage.ts` puisse importer les adaptateurs sans que les adaptateurs
// aient à réimporter `storage.ts`.
export interface StorageService {
  televerser(params: { cle: string; contenu: Buffer; typeMime: string }): Promise<void>;
  genererUrlSignee(cle: string, dureeSecondes: number): Promise<string>;
  // Lit les octets, plutôt qu'une URL signée : sert au filigrane à la volée
  // (lot 5), qui doit tenir le PDF en mémoire pour le tamponner avant de le
  // servir.
  telecharger(cle: string): Promise<Buffer>;
  supprimer(cle: string): Promise<void>;
}
