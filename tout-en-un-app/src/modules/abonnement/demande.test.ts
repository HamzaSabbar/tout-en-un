import { describe, expect, it, vi, beforeEach } from "vitest";

const offreFindFirst = vi.fn();
const utilisateurFindUnique = vi.fn();
const filiereMatiereFindMany = vi.fn();
const demandeFindMany = vi.fn();
const abonnementCreate = vi.fn();
const demandeCreateMany = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    offre: { findFirst: (...args: unknown[]) => offreFindFirst(...args) },
    utilisateur: { findUnique: (...args: unknown[]) => utilisateurFindUnique(...args) },
    filiereMatiere: { findMany: (...args: unknown[]) => filiereMatiereFindMany(...args) },
    demandeMatiere: { findMany: (...args: unknown[]) => demandeFindMany(...args) },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

import { creerDemande } from "@/modules/abonnement/demande";

const ENTREE = { offre_id: "1", matiere_ids: ["3", "4"] };

beforeEach(() => {
  offreFindFirst.mockReset();
  utilisateurFindUnique.mockReset();
  filiereMatiereFindMany.mockReset();
  demandeFindMany.mockReset();
  abonnementCreate.mockReset();
  demandeCreateMany.mockReset();
  transaction.mockReset();

  offreFindFirst.mockResolvedValue({ id: BigInt(1), prix: 600, nb_matieres: 2 });
  utilisateurFindUnique.mockResolvedValue({ filiere_id: BigInt(2) });
  filiereMatiereFindMany.mockResolvedValue([
    { matiere_id: BigInt(3) },
    { matiere_id: BigInt(4) },
  ]);
  demandeFindMany.mockResolvedValue([]);
  abonnementCreate.mockResolvedValue({ id: BigInt(10) });
  transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({
      abonnement: { create: abonnementCreate },
      demandeMatiere: { createMany: demandeCreateMany },
    }),
  );
});

describe("creerDemande", () => {
  it("refuse une demande sans matière", async () => {
    const resultat = await creerDemande(BigInt(1), { offre_id: "1", matiere_ids: [] });
    expect(resultat.succes).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuse une offre inactive ou inconnue", async () => {
    offreFindFirst.mockResolvedValue(null);
    const resultat = await creerDemande(BigInt(1), ENTREE);
    expect(resultat).toEqual({ succes: false, erreur: "Offre indisponible." });
  });

  it("refuse un compte sans filière", async () => {
    utilisateurFindUnique.mockResolvedValue({ filiere_id: null });
    const resultat = await creerDemande(BigInt(1), ENTREE);
    expect(resultat.succes).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuse une matière hors de la filière de l'élève", async () => {
    filiereMatiereFindMany.mockResolvedValue([{ matiere_id: BigInt(3) }]);
    const resultat = await creerDemande(BigInt(1), ENTREE);
    expect(resultat).toEqual({
      succes: false,
      erreur: "Une matière demandée n'appartient pas à votre filière.",
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuse un doublon de demande déjà en attente, pour ce seul élève", async () => {
    demandeFindMany.mockResolvedValue([{ matiere_id: BigInt(3) }]);
    const resultat = await creerDemande(BigInt(1), ENTREE);
    expect(resultat.succes).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
    expect(demandeFindMany).toHaveBeenCalledWith({
      where: {
        utilisateur_id: BigInt(1),
        matiere_id: { in: [BigInt(3), BigInt(4)] },
        statut: "en_attente",
      },
      select: { matiere_id: true },
    });
  });

  it("refuse un panier plus large que l'offre choisie", async () => {
    offreFindFirst.mockResolvedValue({ id: BigInt(1), prix: 600, nb_matieres: 1 });
    const resultat = await creerDemande(BigInt(1), ENTREE);
    expect(resultat).toEqual({
      succes: false,
      erreur: "Cette offre couvre 1 matière(s).",
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("crée un abonnement en attente et une demande par matière", async () => {
    const resultat = await creerDemande(BigInt(7), ENTREE);

    expect(resultat).toEqual({ succes: true, id: "10" });
    expect(abonnementCreate).toHaveBeenCalledWith({
      data: { utilisateur_id: BigInt(7), offre_id: BigInt(1), montant: 600 },
    });
    expect(demandeCreateMany).toHaveBeenCalledWith({
      data: [
        {
          utilisateur_id: BigInt(7),
          matiere_id: BigInt(3),
          abonnement_id: BigInt(10),
          message: undefined,
        },
        {
          utilisateur_id: BigInt(7),
          matiere_id: BigInt(4),
          abonnement_id: BigInt(10),
          message: undefined,
        },
      ],
    });
  });

  it("ne retient que les matières de la filière pour la vérification serveur", async () => {
    await creerDemande(BigInt(7), ENTREE);
    expect(filiereMatiereFindMany).toHaveBeenCalledWith({
      where: {
        filiere_id: BigInt(2),
        matiere_id: { in: [BigInt(3), BigInt(4)] },
        matiere: { supprime_le: null },
      },
      select: { matiere_id: true },
    });
  });
});
