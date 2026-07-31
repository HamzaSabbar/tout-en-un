import { describe, expect, it, vi, beforeEach } from "vitest";

const findUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    utilisateur: {
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
  },
}));

import { verifierAccesMatiere } from "@/modules/acces/acces-matiere";

const DANS_UN_AN = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
const HIER = new Date(Date.now() - 24 * 60 * 60 * 1000);

function eleve(options: {
  matiereDansFiliere?: boolean;
  expirations?: Date[][];
}) {
  return {
    role: "eleve",
    actif: true,
    filiere: {
      matieres: options.matiereDansFiliere === false ? [] : [{ matiere_id: BigInt(1) }],
    },
    abonnements: (options.expirations ?? []).map((dates) => ({
      matieres: dates.map((date_expiration) => ({ date_expiration })),
    })),
  };
}

beforeEach(() => {
  findUnique.mockReset();
});

describe("verifierAccesMatiere", () => {
  it("autorise un admin sans regarder filière ni abonnement", async () => {
    findUnique.mockResolvedValue({
      role: "admin",
      actif: true,
      filiere: null,
      abonnements: [],
    });
    expect(await verifierAccesMatiere(BigInt(1), BigInt(1))).toEqual({
      autorise: true,
      motif: "ok",
    });
  });

  it("autorise un professeur sans abonnement", async () => {
    findUnique.mockResolvedValue({
      role: "professeur",
      actif: true,
      filiere: null,
      abonnements: [],
    });
    expect(await verifierAccesMatiere(BigInt(1), BigInt(1))).toEqual({
      autorise: true,
      motif: "ok",
    });
  });

  it("refuse en hors_filiere quand la matière n'est pas rattachée à la filière", async () => {
    findUnique.mockResolvedValue(eleve({ matiereDansFiliere: false }));
    expect(await verifierAccesMatiere(BigInt(1), BigInt(1))).toEqual({
      autorise: false,
      motif: "hors_filiere",
    });
  });

  it("refuse en hors_filiere quand l'élève n'a aucune filière", async () => {
    findUnique.mockResolvedValue({
      role: "eleve",
      actif: true,
      filiere: null,
      abonnements: [],
    });
    expect(await verifierAccesMatiere(BigInt(1), BigInt(1))).toEqual({
      autorise: false,
      motif: "hors_filiere",
    });
  });

  it("refuse en non_souscrit quand aucun abonnement actif ne couvre la matière", async () => {
    findUnique.mockResolvedValue(eleve({ expirations: [] }));
    expect(await verifierAccesMatiere(BigInt(1), BigInt(1))).toEqual({
      autorise: false,
      motif: "non_souscrit",
    });
  });

  it("refuse en expire quand la couverture est dépassée", async () => {
    findUnique.mockResolvedValue(eleve({ expirations: [[HIER]] }));
    expect(await verifierAccesMatiere(BigInt(1), BigInt(1))).toEqual({
      autorise: false,
      motif: "expire",
    });
  });

  it("autorise quand une couverture est encore valable", async () => {
    findUnique.mockResolvedValue(eleve({ expirations: [[DANS_UN_AN]] }));
    expect(await verifierAccesMatiere(BigInt(1), BigInt(1))).toEqual({
      autorise: true,
      motif: "ok",
    });
  });

  it("retient la couverture la plus lointaine quand plusieurs abonnements se chevauchent", async () => {
    findUnique.mockResolvedValue(eleve({ expirations: [[HIER], [DANS_UN_AN]] }));
    expect(await verifierAccesMatiere(BigInt(1), BigInt(1))).toEqual({
      autorise: true,
      motif: "ok",
    });
  });

  it("refuse une expiration atteinte à la seconde près", async () => {
    findUnique.mockResolvedValue(eleve({ expirations: [[new Date(Date.now() - 1)]] }));
    expect(await verifierAccesMatiere(BigInt(1), BigInt(1))).toEqual({
      autorise: false,
      motif: "expire",
    });
  });

  it("ne consulte que les abonnements au statut actif", async () => {
    findUnique.mockResolvedValue(eleve({ expirations: [[DANS_UN_AN]] }));
    await verifierAccesMatiere(BigInt(7), BigInt(3));
    const argument = findUnique.mock.calls[0][0];
    expect(argument.where).toEqual({ id: BigInt(7) });
    expect(argument.select.abonnements.where).toEqual({ statut: "actif" });
    expect(argument.select.abonnements.select.matieres.where).toEqual({
      matiere_id: BigInt(3),
    });
  });

  it("n'accorde l'accès que sur une matière publiée et non supprimée de la filière", async () => {
    findUnique.mockResolvedValue(eleve({ expirations: [[DANS_UN_AN]] }));
    await verifierAccesMatiere(BigInt(7), BigInt(3));
    const argument = findUnique.mock.calls[0][0];
    expect(argument.select.filiere.select.matieres.where).toEqual({
      matiere_id: BigInt(3),
      matiere: { supprime_le: null, statut: "publie" },
    });
  });

  it.each(["support", "commercial", "eleve"] as const)(
    "n'accorde aucun contournement au rôle %s",
    async (role) => {
      findUnique.mockResolvedValue({
        role,
        actif: true,
        filiere: { matieres: [{ matiere_id: BigInt(1) }] },
        abonnements: [],
      });
      expect(await verifierAccesMatiere(BigInt(1), BigInt(1))).toEqual({
        autorise: false,
        motif: "non_souscrit",
      });
    },
  );

  it("refuse un compte désactivé", async () => {
    findUnique.mockResolvedValue({
      role: "admin",
      actif: false,
      filiere: null,
      abonnements: [],
    });
    expect(await verifierAccesMatiere(BigInt(1), BigInt(1))).toEqual({
      autorise: false,
      motif: "hors_filiere",
    });
  });

  it("refuse un utilisateur inconnu", async () => {
    findUnique.mockResolvedValue(null);
    expect(await verifierAccesMatiere(BigInt(1), BigInt(1))).toEqual({
      autorise: false,
      motif: "hors_filiere",
    });
  });
});
