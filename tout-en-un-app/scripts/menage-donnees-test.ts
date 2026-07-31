import "dotenv/config";
import { writeFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { classer, ORDRE_SUPPRESSION, type Entite, type Entrees, type Verdict } from "./donnees-test.ts";

// Propose la suppression des données laissées par les tests. Simulation par
// défaut : sans --supprimer, rien n'est écrit en base.
//
//   node scripts/menage-donnees-test.ts [--rapport chemin.md]
//   node scripts/menage-donnees-test.ts --supprimer --confirmer-suppression
//
// Deux drapeaux sont exigés pour écrire, comme la garde des tests de bout en
// bout : une suppression de données ne doit pas tenir à une seule frappe.

function drapeau(nom: string): boolean {
  return process.argv.includes(`--${nom}`);
}

function valeur(nom: string): string | undefined {
  const index = process.argv.indexOf(`--${nom}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function grouper(verdicts: Verdict[]): Map<Entite, Verdict[]> {
  const groupes = new Map<Entite, Verdict[]>();
  for (const verdict of verdicts) {
    const liste = groupes.get(verdict.entite) ?? [];
    liste.push(verdict);
    groupes.set(verdict.entite, liste);
  }
  return groupes;
}

function tableau(verdicts: Verdict[]): string {
  const lignes = verdicts.map(
    (v) => `| \`${v.entite}\` | ${v.id} | ${v.libelle.replace(/\|/g, "\\|")} | ${v.raison} |`,
  );
  return ["| Table | id | Libellé | Motif |", "| --- | --- | --- | --- |", ...lignes].join("\n");
}

async function principal(): Promise<void> {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DIRECT_URL ou DATABASE_URL est requis.");
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    const [filieres, matieres, chapitres, cours, videos, offres, liens] = await Promise.all([
      prisma.filiere.findMany({ orderBy: { id: "asc" } }),
      prisma.matiere.findMany({ orderBy: { id: "asc" } }),
      prisma.chapitre.findMany({ orderBy: { id: "asc" } }),
      prisma.cours.findMany({ orderBy: { id: "asc" } }),
      prisma.video.findMany({ orderBy: { id: "asc" } }),
      prisma.offre.findMany({ orderBy: { id: "asc" } }),
      prisma.filiereMatiere.findMany({ orderBy: { id: "asc" } }),
    ]);

    const entrees: Entrees = {
      filieres: filieres.map((f) => ({
        id: f.id.toString(),
        code: f.code,
        libelle: f.libelle,
        cree_le: f.cree_le?.toISOString() ?? null,
      })),
      matieres: matieres.map((m) => ({
        id: m.id.toString(),
        code: m.code,
        libelle: m.libelle,
        cree_le: m.cree_le?.toISOString() ?? null,
      })),
      chapitres: chapitres.map((c) => ({
        id: c.id.toString(),
        matiere_id: c.matiere_id.toString(),
        libelle: c.libelle,
        cree_le: c.cree_le?.toISOString() ?? null,
      })),
      cours: cours.map((c) => ({
        id: c.id.toString(),
        chapitre_id: c.chapitre_id.toString(),
        libelle: c.titre,
        cree_le: c.cree_le?.toISOString() ?? null,
      })),
      videos: videos.map((v) => ({
        id: v.id.toString(),
        cours_id: v.cours_id.toString(),
        libelle: v.titre,
        cree_le: v.cree_le?.toISOString() ?? null,
      })),
      offres: offres.map((o) => ({
        id: o.id.toString(),
        libelle: o.libelle,
        cree_le: o.cree_le?.toISOString() ?? null,
      })),
      liens: liens.map((l) => ({
        id: l.id.toString(),
        filiere_id: l.filiere_id.toString(),
        matiere_id: l.matiere_id.toString(),
      })),
    };

    const { aSupprimer, aConserver } = classer(entrees);

    // Garde-fou : documents et fichiers ne sont pas gérés ici. S'ils référencent
    // une ligne proposée à la suppression, on s'arrête plutôt que de casser une
    // clé étrangère ou de supprimer un média.
    const idsSupprimes = grouper(aSupprimer);
    const matiereIds = (idsSupprimes.get("matiere") ?? []).map((v) => BigInt(v.id));
    const chapitreIds = (idsSupprimes.get("chapitre") ?? []).map((v) => BigInt(v.id));
    const coursIds = (idsSupprimes.get("cours") ?? []).map((v) => BigInt(v.id));
    const documentsLies = await prisma.document.count({
      where: {
        OR: [
          { matiere_id: { in: matiereIds } },
          { chapitre_id: { in: chapitreIds } },
          { cours_id: { in: coursIds } },
        ],
      },
    });

    const sections = [
      "# Proposition de ménage des données de test",
      `Généré le ${new Date().toISOString()}.`,
      "",
      `**${aSupprimer.length} lignes** proposées à la suppression, ` +
        `**${aConserver.length} lignes** conservées.`,
      "",
      "## À conserver",
      "",
      aConserver.length === 0 ? "Aucune." : tableau(aConserver),
      "",
      "## Proposées à la suppression",
      "",
      aSupprimer.length === 0 ? "Aucune." : tableau(aSupprimer),
    ];
    const rapport = `${sections.join("\n")}\n`;

    const chemin = valeur("rapport");
    if (chemin) {
      writeFileSync(chemin, rapport, "utf8");
      console.log(`Rapport écrit dans ${chemin}`);
    }

    console.log(`À conserver  : ${aConserver.length} lignes`);
    for (const [entite, liste] of grouper(aConserver)) {
      console.log(`  ${entite.padEnd(16)} ${liste.length}`);
    }
    console.log(`À supprimer  : ${aSupprimer.length} lignes`);
    for (const [entite, liste] of grouper(aSupprimer)) {
      console.log(`  ${entite.padEnd(16)} ${liste.length}`);
    }

    if (documentsLies > 0) {
      console.log("");
      console.log(
        `ARRÊT : ${documentsLies} document(s) référencent des lignes proposées à la ` +
          "suppression. Traite-les d'abord, ce script ne touche pas aux médias.",
      );
      process.exitCode = 1;
      return;
    }

    if (!drapeau("supprimer")) {
      console.log("");
      console.log("Simulation : aucune ligne supprimée.");
      console.log(
        "Pour exécuter : --supprimer --confirmer-suppression (les deux sont exigés).",
      );
      return;
    }
    if (!drapeau("confirmer-suppression")) {
      console.log("");
      console.log("--supprimer demande aussi --confirmer-suppression. Rien n'a été supprimé.");
      process.exitCode = 1;
      return;
    }

    const parEntite = grouper(aSupprimer);
    await prisma.$transaction(async (tx) => {
      for (const entite of ORDRE_SUPPRESSION) {
        const ids = (parEntite.get(entite) ?? []).map((v) => BigInt(v.id));
        if (ids.length === 0) {
          continue;
        }
        const where = { id: { in: ids } };
        const compte =
          entite === "video"
            ? await tx.video.deleteMany({ where })
            : entite === "cours"
              ? await tx.cours.deleteMany({ where })
              : entite === "chapitre"
                ? await tx.chapitre.deleteMany({ where })
                : entite === "filiere_matiere"
                  ? await tx.filiereMatiere.deleteMany({ where })
                  : entite === "matiere"
                    ? await tx.matiere.deleteMany({ where })
                    : entite === "filiere"
                      ? await tx.filiere.deleteMany({ where })
                      : await tx.offre.deleteMany({ where });
        console.log(`supprimé ${entite.padEnd(16)} ${compte.count}`);
      }
    });
    console.log("");
    console.log("Suppression effectuée.");
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((erreur) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exit(1);
});
