import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { APP_URL: "http://localhost:3000" },
}));

import {
  cleValide,
  creerAdaptateurLocal,
  resoudreCheminLocal,
  stockageLocalAutorise,
  verifierSignatureLocale,
  viderStockageLocal,
} from "@/lib/storage/local";

const CLE = "10/20/30/cours_pdf-0123456789abcdef.pdf";

let racine: string;
const adaptateur = creerAdaptateurLocal(() => racine);

beforeEach(async () => {
  racine = await mkdtemp(path.join(os.tmpdir(), "stockage-local-"));
});

afterEach(async () => {
  await rm(racine, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

function parametresDe(url: string) {
  const analysee = new URL(url);
  return {
    chemin: analysee.pathname,
    expire: Number(analysee.searchParams.get("expire")),
    signature: analysee.searchParams.get("signature") ?? "",
  };
}

describe("autorisation du stockage local", () => {
  it("est ouvert hors production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(stockageLocalAutorise()).toBe(true);
  });

  it("est fermé en production sans dérogation", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(stockageLocalAutorise()).toBe(false);
  });

  it("s'ouvre en production sur la dérogation exacte", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STOCKAGE_LOCAL_AUTORISE", "oui");
    expect(stockageLocalAutorise()).toBe(true);
  });
});

describe("validation des clés de stockage", () => {
  it("accepte une clé produite par le back-office", () => {
    expect(cleValide(CLE)).toBe(true);
  });

  it("accepte la forme utilisée par les fixtures de bout en bout", () => {
    expect(cleValide("10/20/30/cours-e2e-1785000000.pdf")).toBe(true);
  });

  it.each([
    ["une remontée d'un niveau", "../secret.pdf"],
    ["une remontée au milieu", "10/../../secret.pdf"],
    ["un séparateur Windows", "10\\20\\secret.pdf"],
    ["un segment caché", "10/.secret.pdf"],
    ["un chemin absolu POSIX", "/etc/passwd.pdf"],
    ["une extension absente", "10/20/30/cours_pdf-0123456789abcdef"],
    ["une autre extension", "10/20/30/cours.txt"],
    ["une clé vide", ""],
    ["un saut de ligne", "10/20/30/x\ny.pdf"],
    ["trop de segments", "1/2/3/4/5/6/7/8/9/x.pdf"],
  ])("refuse %s", (_libelle, cle) => {
    expect(cleValide(cle)).toBe(false);
  });

  it("refuse une clé trop longue", () => {
    expect(cleValide(`${"a".repeat(250)}.pdf`)).toBe(false);
  });
});

describe("résolution du chemin local", () => {
  it("reste sous la racine pour une clé valide", () => {
    const chemin = resoudreCheminLocal(CLE, racine);
    expect(chemin).not.toBeNull();
    expect(chemin?.startsWith(path.resolve(racine) + path.sep)).toBe(true);
  });

  it("rend null pour toute clé refusée à la forme", () => {
    expect(resoudreCheminLocal("../../package.json", racine)).toBeNull();
    expect(resoudreCheminLocal("10/../../../secret.pdf", racine)).toBeNull();
  });

  it("ne laisse aucune clé sortir de la racine", () => {
    // Filet : même si le motif évoluait, le confinement doit tenir.
    const base = path.resolve(racine);
    for (const cle of ["a/b/c.pdf", "z.pdf", "10/20/30/cours_pdf-0123456789abcdef.pdf"]) {
      const chemin = resoudreCheminLocal(cle, racine);
      expect(chemin === base || chemin?.startsWith(base + path.sep)).toBe(true);
    }
  });
});

describe("URL signée du stockage local", () => {
  it("est absolue, sur APP_URL, et porte la clé dans son chemin", async () => {
    const url = await adaptateur.genererUrlSignee(CLE, 600);

    expect(url.startsWith("http://localhost:3000/api/stockage-local/")).toBe(true);
    expect(parametresDe(url).chemin).toBe(`/api/stockage-local/${CLE}`);
  });

  it("expire exactement après la durée demandée", async () => {
    const maintenant = Math.floor(Date.now() / 1000);
    const { expire } = parametresDe(await adaptateur.genererUrlSignee(CLE, 600));

    expect(expire - maintenant).toBeGreaterThanOrEqual(599);
    expect(expire - maintenant).toBeLessThanOrEqual(601);
  });

  it("produit une signature que la vérification accepte", async () => {
    const { expire, signature } = parametresDe(await adaptateur.genererUrlSignee(CLE, 600));
    expect(verifierSignatureLocale(CLE, expire, signature)).toBe(true);
  });

  it("garde le même secret d'un appel à l'autre", async () => {
    const premiere = parametresDe(await adaptateur.genererUrlSignee(CLE, 600));
    expect(verifierSignatureLocale(CLE, premiere.expire, premiere.signature)).toBe(true);

    const autre = parametresDe(
      await adaptateur.genererUrlSignee("10/20/30/autre-0000000000000000.pdf", 600),
    );
    expect(autre.signature).not.toBe(premiere.signature);
  });

  it("refuse une clé invalide plutôt que de la signer", async () => {
    await expect(adaptateur.genererUrlSignee("../secret.pdf", 600)).rejects.toThrow(
      /invalide/,
    );
  });

  it("signe une clé sans octets derrière elle", async () => {
    // Supabase signe un chemin même sans objet : la route de lecture doit
    // continuer à rediriger, pas à échouer.
    await expect(
      adaptateur.genererUrlSignee("10/20/30/jamais-televerse.pdf", 600),
    ).resolves.toContain("signature=");
  });
});

describe("vérification de signature", () => {
  let expire: number;
  let signature: string;

  beforeEach(async () => {
    ({ expire, signature } = parametresDe(await adaptateur.genererUrlSignee(CLE, 600)));
  });

  it("refuse une signature dont un caractère a changé", () => {
    const altere = `${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`;
    expect(verifierSignatureLocale(CLE, expire, altere)).toBe(false);
  });

  it("refuse une signature tronquée", () => {
    expect(verifierSignatureLocale(CLE, expire, signature.slice(0, 32))).toBe(false);
  });

  it("refuse une signature vide ou non hexadécimale", () => {
    expect(verifierSignatureLocale(CLE, expire, "")).toBe(false);
    expect(verifierSignatureLocale(CLE, expire, "zzzz")).toBe(false);
  });

  it("refuse une expiration repoussée sans nouvelle signature", () => {
    expect(verifierSignatureLocale(CLE, expire + 3600, signature)).toBe(false);
  });

  it("refuse une clé changée sans nouvelle signature", () => {
    expect(verifierSignatureLocale("10/20/30/autre.pdf", expire, signature)).toBe(false);
  });

  it("refuse une expiration dépassée", async () => {
    const passee = parametresDe(await adaptateur.genererUrlSignee(CLE, -1));
    expect(verifierSignatureLocale(CLE, passee.expire, passee.signature)).toBe(false);
  });

  it("refuse une expiration non entière ou négative", () => {
    expect(verifierSignatureLocale(CLE, Number.NaN, signature)).toBe(false);
    expect(verifierSignatureLocale(CLE, -5, signature)).toBe(false);
  });

  it("ne lève jamais, quelle que soit l'entrée", () => {
    for (const mauvaise of ["", "zz", "a".repeat(63), "a".repeat(65)]) {
      expect(() => verifierSignatureLocale(CLE, expire, mauvaise)).not.toThrow();
    }
  });
});

describe("écriture, lecture et suppression", () => {
  it("écrit les octets à l'identique et crée l'arborescence", async () => {
    const contenu = Buffer.from("%PDF-1.4\nprincipal\n%%EOF\n", "latin1");
    await adaptateur.televerser({ cle: CLE, contenu, typeMime: "application/pdf" });

    const relu = await readFile(path.join(racine, ...CLE.split("/")));
    expect(relu.equals(contenu)).toBe(true);
  });

  it("écrase la même clé, ce dont dépend le remplacement de fichier", async () => {
    await adaptateur.televerser({
      cle: CLE,
      contenu: Buffer.from("premier"),
      typeMime: "application/pdf",
    });
    await adaptateur.televerser({
      cle: CLE,
      contenu: Buffer.from("second"),
      typeMime: "application/pdf",
    });

    const relu = await readFile(path.join(racine, ...CLE.split("/")));
    expect(relu.toString()).toBe("second");
  });

  it("ne laisse aucun fichier provisoire derrière lui", async () => {
    await adaptateur.televerser({
      cle: CLE,
      contenu: Buffer.from("%PDF-1.4\n"),
      typeMime: "application/pdf",
    });

    const { readdir } = await import("node:fs/promises");
    const restants = await readdir(path.dirname(path.join(racine, ...CLE.split("/"))));
    expect(restants.filter((nom) => nom.endsWith(".tmp"))).toEqual([]);
  });

  it("supprime un fichier et reste silencieux sur une clé absente", async () => {
    await adaptateur.televerser({
      cle: CLE,
      contenu: Buffer.from("x"),
      typeMime: "application/pdf",
    });
    await adaptateur.supprimer(CLE);

    await expect(readFile(path.join(racine, ...CLE.split("/")))).rejects.toThrow();
    await expect(adaptateur.supprimer(CLE)).resolves.toBeUndefined();
  });

  it("refuse d'écrire ou de supprimer hors de la racine", async () => {
    const temoin = path.join(racine, "..", "temoin-a-preserver.txt");
    await writeFile(temoin, "intact");

    await expect(
      adaptateur.televerser({
        cle: "../temoin-a-preserver.txt",
        contenu: Buffer.from("ecrase"),
        typeMime: "application/pdf",
      }),
    ).rejects.toThrow(/invalide/);
    await expect(adaptateur.supprimer("../temoin-a-preserver.txt")).rejects.toThrow(
      /invalide/,
    );

    expect((await readFile(temoin)).toString()).toBe("intact");
    await rm(temoin, { force: true });
  });
});

describe("purge du stockage local", () => {
  it("refuse d'effacer un répertoire dont le nom n'est pas le sien", async () => {
    // La garde existe pour qu'une racine mal calculée ne déclenche pas un
    // effacement récursif ailleurs.
    await expect(viderStockageLocal(racine)).rejects.toThrow(/inattendu/);
    await expect(viderStockageLocal(os.tmpdir())).rejects.toThrow(/inattendu/);
  });

  it("efface le répertoire correctement nommé et son contenu", async () => {
    const cible = path.join(racine, ".stockage-local");
    const adaptateurCible = creerAdaptateurLocal(() => cible);
    await adaptateurCible.televerser({
      cle: CLE,
      contenu: Buffer.from("%PDF-1.4\n"),
      typeMime: "application/pdf",
    });

    await viderStockageLocal(cible);

    await expect(readFile(path.join(cible, ...CLE.split("/")))).rejects.toThrow();
  });
});
