// Formatage lisible d'une taille de fichier réelle (`Fichier.taille`, en
// octets) : jamais une estimation, la valeur vient toujours de la base.
export function formaterTailleFichier(octets: number): string {
  const mo = octets / (1024 * 1024);
  if (mo >= 0.1) return `${mo.toFixed(1)} Mo`;
  const ko = octets / 1024;
  return `${Math.max(1, Math.round(ko))} Ko`;
}
