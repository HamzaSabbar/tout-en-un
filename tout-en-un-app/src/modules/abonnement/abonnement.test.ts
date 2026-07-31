import { describe, expect, it, vi, beforeEach } from "vitest";

const utilisateurFindUnique = vi.fn();
const matiereFindFirst = vi.fn();
const filiereMatiereFindFirst = vi.fn();
const offreFindFirst = vi.fn();
const transaction = vi.fn();
const demandeFindFirst = vi.fn();
const demandeUpdate = vi.fn();
const abonnementFindUnique = vi.fn();
const abonnementFindFirst = vi.fn();
const abonnementCreate = vi.fn();
const abonnementUpdate = vi.fn();
const abonnementMatiereUpsert = vi.fn();
const consigner = vi.fn();
const envoyer = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    utilisateur: { findUnique: (...args: unknown[]) => utilisateurFindUnique(...args) },
    matiere: { findFirst: (...args: unknown[]) => matiereFindFirst(...args) },
    filiereMatiere: { findFirst: (...args: unknown[]) => filiereMatiereFindFirst(...args) },
    offre: { findFirst: (...args: unknown[]) => offreFindFirst(...args) },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

vi.mock("@/modules/audit/journal", () => ({
  consignerAction: (...args: unknown[]) => consigner(...args),
}));

vi.mock("@/lib/whatsapp/whatsapp", () => ({
  envoyerWhatsApp: (...args: unknown[]) => envoyer(...args),
}));

import {
  activerAcces,
  annulerAbonnement,
  refuserDemande,
} from "@/modules/abonnement/abonnement";

const ENTREE = {
  utilisateur_id: "7",
  matiere_id: "3",
  offre_id: "1",
  duree_jours: "90",
  montant: "600",
  reference_paiement: "VIR-2026-014",
};

beforeEach(() => {
  utilisateurFindUnique.mockReset();
  matiereFindFirst.mockReset();
  filiereMatiereFindFirst.mockReset();
  offreFindFirst.mockReset();
  demandeFindFirst.mockReset();
  demandeUpdate.mockReset();
  abonnementFindUnique.mockReset();
  abonnementFindFirst.mockReset();
  abonnementCreate.mockReset();
  abonnementUpdate.mockReset();
  abonnementMatiereUpsert.mockReset();
  consigner.mockReset();
  envoyer.mockReset();
  transaction.mockReset();

  utilisateurFindUnique.mockResolvedValue({ telephone: "0612345678", prenom: "Sara" });
  matiereFindFirst.mockResolvedValue({ libelle: "Physique-Chimie" });
  filiereMatiereFindFirst.mockResolvedValue({ id: BigInt(50) });
  offreFindFirst.mockResolvedValue({ id: BigInt(1) });
  demandeFindFirst.mockResolvedValue(null);
  abonnementFindUnique.mockResolvedValue(null);
  abonnementFindFirst.mockResolvedValue(null);
  abonnementCreate.mockResolvedValue({ id: BigInt(20) });
  abonnementUpdate.mockResolvedValue({ id: BigInt(20) });
  abonnementMatiereUpsert.mockResolvedValue({ id: BigInt(30) });
  envoyer.mockResolvedValue(undefined);
  transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({
      demandeMatiere: { findFirst: demandeFindFirst, update: demandeUpdate },
      abonnement: {
        findUnique: abonnementFindUnique,
        findFirst: abonnementFindFirst,
        create: abonnementCreate,
        update: abonnementUpdate,
      },
      abonnementMatiere: { upsert: abonnementMatiereUpsert },
    }),
  );
});

describe("activerAcces", () => {
  it("refuse un formulaire sans référence de paiement", async () => {
    const resultat = await activerAcces({ ...ENTREE, reference_paiement: "" }, BigInt(9));
    expect(resultat.succes).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("crée l'abonnement, ouvre l'accès et consigne l'activation", async () => {
    const resultat = await activerAcces(ENTREE, BigInt(9));

    expect(resultat).toEqual({ succes: true, id: "30" });
    expect(abonnementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        utilisateur_id: BigInt(7),
        offre_id: BigInt(1),
        statut: "actif",
        paiement_statut: "paye",
        montant: 600,
        reference_paiement: "VIR-2026-014",
      }),
    });
    expect(abonnementMatiereUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          abonnement_id_matiere_id: { abonnement_id: BigInt(20), matiere_id: BigInt(3) },
        },
      }),
    );
    expect(consigner).toHaveBeenCalledWith(
      expect.objectContaining({
        utilisateurId: BigInt(9),
        action: "activation",
        entite: "abonnement_matiere",
        entiteId: BigInt(30),
      }),
      expect.anything(),
    );
  });

  it("fixe une expiration cohérente avec la durée saisie", async () => {
    const avant = Date.now();
    await activerAcces(ENTREE, BigInt(9));
    const argument = abonnementMatiereUpsert.mock.calls[0][0];
    const attendu = avant + 90 * 24 * 60 * 60 * 1000;
    for (const date of [
      argument.create.date_expiration,
      argument.update.date_expiration,
    ]) {
      expect(date.getTime()).toBeGreaterThanOrEqual(attendu);
      expect(date.getTime()).toBeLessThan(attendu + 60_000);
    }
  });

  it("refuse une matière hors de la filière de l'élève", async () => {
    filiereMatiereFindFirst.mockResolvedValue(null);
    const resultat = await activerAcces(ENTREE, BigInt(9));
    expect(resultat).toEqual({
      succes: false,
      erreur: "Cette matière n'appartient pas à la filière de l'élève.",
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuse une offre inconnue avant toute écriture", async () => {
    offreFindFirst.mockResolvedValue(null);
    const resultat = await activerAcces(ENTREE, BigInt(9));
    expect(resultat).toEqual({ succes: false, erreur: "Offre introuvable." });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("n'accepte qu'une demande du même élève, sur la même matière, non traitée", async () => {
    await activerAcces({ ...ENTREE, demande_id: "5" }, BigInt(9));
    expect(demandeFindFirst).toHaveBeenCalledWith({
      where: {
        id: BigInt(5),
        utilisateur_id: BigInt(7),
        matiere_id: BigInt(3),
        statut: "en_attente",
      },
    });
  });

  it("refuse une demande qui ne correspond pas à l'élève ou à la matière annoncés", async () => {
    demandeFindFirst.mockResolvedValue(null);

    const resultat = await activerAcces({ ...ENTREE, demande_id: "903" }, BigInt(9));

    expect(resultat).toEqual({
      succes: false,
      erreur: "Demande introuvable ou déjà traitée.",
    });
    expect(abonnementMatiereUpsert).not.toHaveBeenCalled();
    expect(demandeUpdate).not.toHaveBeenCalled();
    expect(consigner).not.toHaveBeenCalled();
  });

  it("ne réactive pas un abonnement annulé en traitant une demande restante", async () => {
    demandeFindFirst.mockResolvedValue({
      id: BigInt(5),
      abonnement_id: BigInt(20),
      utilisateur_id: BigInt(7),
      matiere_id: BigInt(3),
    });
    await activerAcces({ ...ENTREE, demande_id: "5" }, BigInt(9));

    const recherche = abonnementFindFirst.mock.calls[0][0];
    expect(recherche.where).toEqual({
      id: BigInt(20),
      utilisateur_id: BigInt(7),
      statut: { in: ["en_attente", "actif"] },
    });
  });

  it("réutilise l'abonnement de la demande et la marque traitée", async () => {
    demandeFindFirst.mockResolvedValue({
      id: BigInt(5),
      abonnement_id: BigInt(20),
      utilisateur_id: BigInt(7),
      matiere_id: BigInt(3),
    });
    abonnementFindFirst.mockResolvedValue({ id: BigInt(20), date_debut: null });

    await activerAcces({ ...ENTREE, demande_id: "5" }, BigInt(9));

    expect(abonnementCreate).not.toHaveBeenCalled();
    expect(abonnementUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: BigInt(20) } }),
    );
    expect(demandeUpdate).toHaveBeenCalledWith({
      where: { id: BigInt(5) },
      data: {
        statut: "traitee",
        traite_le: expect.any(Date),
        traite_par: BigInt(9),
      },
    });
  });

  it("préserve la date de début lors d'un renouvellement", async () => {
    const debutInitial = new Date("2026-01-15T00:00:00.000Z");
    abonnementFindFirst.mockResolvedValue({ id: BigInt(20), date_debut: debutInitial });

    await activerAcces(ENTREE, BigInt(9));

    expect(abonnementUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ date_debut: debutInitial }),
      }),
    );
  });

  it("envoie la confirmation WhatsApp après activation", async () => {
    await activerAcces(ENTREE, BigInt(9));
    expect(envoyer).toHaveBeenCalledWith(
      expect.objectContaining({ destinataire: "0612345678" }),
    );
  });

  it("réussit même si la confirmation WhatsApp échoue", async () => {
    envoyer.mockRejectedValue(new Error("canal indisponible"));
    const erreurConsole = vi.spyOn(console, "error").mockImplementation(() => {});

    const resultat = await activerAcces(ENTREE, BigInt(9));

    expect(resultat).toEqual({ succes: true, id: "30" });
    erreurConsole.mockRestore();
  });

  it("refuse une matière inconnue avant toute écriture", async () => {
    matiereFindFirst.mockResolvedValue(null);
    const resultat = await activerAcces(ENTREE, BigInt(9));
    expect(resultat).toEqual({ succes: false, erreur: "Matière introuvable." });
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("refuserDemande", () => {
  it("marque la demande refusée et consigne le refus", async () => {
    await refuserDemande(BigInt(5), BigInt(9), "Paiement non reçu");

    expect(demandeUpdate).toHaveBeenCalledWith({
      where: { id: BigInt(5) },
      data: { statut: "refusee", traite_le: expect.any(Date), traite_par: BigInt(9) },
    });
    expect(consigner).toHaveBeenCalledWith(
      expect.objectContaining({ action: "refus", entiteId: BigInt(5) }),
      expect.anything(),
    );
  });
});

describe("annulerAbonnement", () => {
  it("passe le statut à annule sans supprimer la ligne", async () => {
    abonnementFindUnique.mockResolvedValue({ statut: "actif" });

    await annulerAbonnement(BigInt(20), BigInt(9));

    expect(abonnementUpdate).toHaveBeenCalledWith({
      where: { id: BigInt(20) },
      data: { statut: "annule" },
    });
    expect(consigner).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "annulation",
        avant: { statut: "actif" },
      }),
      expect.anything(),
    );
  });
});
