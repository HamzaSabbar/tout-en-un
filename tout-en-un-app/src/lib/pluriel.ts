// Accord simple d'un nom compté : singulier à partir de 0 ou 1, pluriel
// au-delà. Les mots invariants (« cours », « pas ») n'en ont pas besoin.
export function accorder(nombre: number, singulier: string, pluriel: string): string {
  return nombre > 1 ? pluriel : singulier;
}
