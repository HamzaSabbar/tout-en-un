export interface ResultatSucces {
  succes: true;
  id: string;
}

export interface ResultatErreur {
  succes: false;
  erreur: string;
}

export type Resultat = ResultatSucces | ResultatErreur;
