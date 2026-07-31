const MAX_BIGINT_POSTGRES = BigInt("9223372036854775807");
const ZERO = BigInt(0);

// Les identifiants viennent d'une URL ou d'un formulaire. BigInt() accepte
// "0x10" et lève sur "abc" ; une valeur hors bornes int8 ferait échouer Prisma
// en cours de requête. Un identifiant invalide se traite comme absent.
export function analyserIdentifiant(valeur: unknown): bigint | null {
  if (typeof valeur !== "string" || !/^[0-9]+$/.test(valeur)) {
    return null;
  }
  const identifiant = BigInt(valeur);
  if (identifiant <= ZERO || identifiant > MAX_BIGINT_POSTGRES) {
    return null;
  }
  return identifiant;
}
