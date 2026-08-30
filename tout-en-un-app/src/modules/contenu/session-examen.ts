// Les deux sessions d'un examen national. Partagé entre `extrait-national.ts`
// et `examen-national.ts` pour ne pas taper les deux valeurs deux fois.
export const SESSIONS_EXAMEN = ["normale", "rattrapage"] as const;
export type SessionExamenValeur = (typeof SESSIONS_EXAMEN)[number];
