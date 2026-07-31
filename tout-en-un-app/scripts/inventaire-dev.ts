import "dotenv/config";
import { writeFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";

// Inventaire en lecture seule de la base visée. Aucune écriture, aucune
// suppression : sert à décider quoi conserver, pas à agir.
//
//   node scripts/inventaire-dev.ts [chemin/rapport.md]
//
// Les tables de contenu portent `cree_le` depuis la migration
// `ajoute_cree_le_contenu`, mais elle est nulle pour les lignes antérieures :
// leur donner l'heure de la migration aurait affirmé une date fausse. Pour ces
// lignes, deux substituts, tous deux signalés comme tels :
//   - l'horodatage que les fixtures de test embarquent dans leur libellé ou leur
//     code (les scénarios utilisent Date.now()), qui donne la date réelle ;
//   - l'ordre des identifiants, qui donne une chronologie relative.

const HORODATAGE_EMBARQUE = /(?<!\d)(1[6-9]\d{11})(?!\d)/;

function dateEmbarquee(...champs: (string | null)[]): string | null {
  for (const champ of champs) {
    const trouve = champ?.match(HORODATAGE_EMBARQUE);
    if (trouve) {
      return new Date(Number(trouve[1])).toISOString();
    }
  }
  return null;
}

function tableau(entetes: string[], lignes: string[][]): string {
  const separateur = entetes.map(() => "---");
  return [entetes, separateur, ...lignes]
    .map((ligne) => `| ${ligne.join(" | ")} |`)
    .join("\n");
}

function echapper(valeur: string): string {
  return valeur.replace(/\|/g, "\\|");
}

async function principal(): Promise<void> {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DIRECT_URL ou DATABASE_URL est requis.");
  }
  const destination = process.argv[2] ?? "inventaire-dev.md";
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    const [
      utilisateurs,
      filieres,
      matieres,
      chapitres,
      cours,
      videos,
      offres,
      liens,
      documents,
      fichiers,
      abonnements,
      demandes,
      journal,
      migrations,
    ] = await Promise.all([
      prisma.utilisateur.findMany({
        select: { id: true, email: true, role: true, cree_le: true },
        orderBy: { id: "asc" },
      }),
      prisma.filiere.findMany({ orderBy: { id: "asc" } }),
      prisma.matiere.findMany({ orderBy: { id: "asc" } }),
      prisma.chapitre.findMany({ orderBy: { id: "asc" } }),
      prisma.cours.findMany({
        include: { chapitre: { select: { libelle: true, matiere_id: true } } },
        orderBy: { id: "asc" },
      }),
      prisma.video.findMany({ orderBy: { id: "asc" } }),
      prisma.offre.findMany({ orderBy: { id: "asc" } }),
      prisma.filiereMatiere.count(),
      prisma.document.count(),
      prisma.fichier.count(),
      prisma.abonnement.count(),
      prisma.demandeMatiere.count(),
      prisma.journalAdmin.count(),
      prisma.$queryRaw<
        { migration_name: string; finished_at: Date | null }[]
      >`SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at ASC`,
    ]);

    const sections: string[] = [];
    sections.push("# Inventaire de la base de développement");
    sections.push(
      `Généré le ${new Date().toISOString()}. Lecture seule, aucune donnée modifiée.`,
    );

    sections.push("## Volumes");
    sections.push(
      tableau(
        ["Table", "Lignes", "Colonne de date"],
        [
          ["utilisateur", String(utilisateurs.length), "`cree_le`"],
          ["filiere", String(filieres.length), "`cree_le`"],
          ["matiere", String(matieres.length), "`cree_le`"],
          ["chapitre", String(chapitres.length), "`cree_le`"],
          ["cours", String(cours.length), "`cree_le`, `publie_le`"],
          ["video", String(videos.length), "`cree_le`"],
          ["offre", String(offres.length), "`cree_le`"],
          ["filiere_matiere", String(liens), "aucune"],
          ["document", String(documents), "aucune"],
          ["fichier", String(fichiers), "`cree_le`"],
          ["abonnement", String(abonnements), "`cree_le`"],
          ["demande_matiere", String(demandes), "`cree_le`"],
          ["journal_admin", String(journal), "`cree_le`"],
        ],
      ),
    );

    sections.push("## Migrations appliquées");
    sections.push(
      tableau(
        ["Migration", "Appliquée le"],
        migrations.map((m) => [
          `\`${m.migration_name}\``,
          m.finished_at ? m.finished_at.toISOString() : "inconnue",
        ]),
      ),
    );

    sections.push("## Filières");
    sections.push(
      tableau(
        ["id", "code", "libellé", "actif", "cree_le", "date déduite du libellé"],
        filieres.map((f) => [
          String(f.id),
          `\`${echapper(f.code)}\``,
          echapper(f.libelle),
          f.actif ? "oui" : "non",
          f.cree_le ? f.cree_le.toISOString() : "inconnue",
          dateEmbarquee(f.code, f.libelle) ?? "—",
        ]),
      ),
    );

    sections.push("## Matières");
    sections.push(
      tableau(
        ["id", "code", "libellé", "statut", "supprimée le", "cree_le", "date déduite"],
        matieres.map((m) => [
          String(m.id),
          `\`${echapper(m.code)}\``,
          echapper(m.libelle),
          m.statut,
          m.supprime_le ? m.supprime_le.toISOString() : "—",
          m.cree_le ? m.cree_le.toISOString() : "inconnue",
          dateEmbarquee(m.code, m.libelle) ?? "—",
        ]),
      ),
    );

    sections.push("## Chapitres");
    sections.push(
      tableau(
        ["id", "matiere_id", "libellé", "statut", "cree_le", "date déduite"],
        chapitres.map((c) => [
          String(c.id),
          String(c.matiere_id),
          echapper(c.libelle),
          c.statut,
          c.cree_le ? c.cree_le.toISOString() : "inconnue",
          dateEmbarquee(c.libelle) ?? "—",
        ]),
      ),
    );

    sections.push("## Cours");
    sections.push(
      tableau(
        ["id", "chapitre", "titre", "statut", "professeur_id", "publié le", "cree_le", "date déduite"],
        cours.map((c) => [
          String(c.id),
          echapper(c.chapitre.libelle),
          echapper(c.titre),
          c.statut,
          c.professeur_id === null ? "**null**" : String(c.professeur_id),
          c.publie_le ? c.publie_le.toISOString() : "—",
          c.cree_le ? c.cree_le.toISOString() : "inconnue",
          dateEmbarquee(c.titre, c.chapitre.libelle) ?? "—",
        ]),
      ),
    );

    sections.push("## Vidéos");
    sections.push(
      tableau(
        ["id", "cours_id", "titre", "fournisseur", "video_ref", "statut", "cree_le", "date déduite"],
        videos.map((v) => [
          String(v.id),
          String(v.cours_id),
          echapper(v.titre),
          echapper(v.fournisseur),
          `\`${echapper(v.video_ref)}\``,
          v.statut,
          v.cree_le ? v.cree_le.toISOString() : "inconnue",
          dateEmbarquee(v.titre) ?? "—",
        ]),
      ),
    );

    sections.push("## Offres");
    sections.push(
      tableau(
        ["id", "libellé", "durée (j)", "nb matières", "prix", "actif", "cree_le", "date déduite"],
        offres.map((o) => [
          String(o.id),
          echapper(o.libelle),
          String(o.duree_jours),
          String(o.nb_matieres),
          o.prix.toString(),
          o.actif ? "oui" : "non",
          o.cree_le ? o.cree_le.toISOString() : "inconnue",
          dateEmbarquee(o.libelle) ?? "—",
        ]),
      ),
    );

    sections.push("## Utilisateurs");
    sections.push(
      utilisateurs.length === 0
        ? "Aucun utilisateur en base."
        : tableau(
            ["id", "email", "rôle", "créé le"],
            utilisateurs.map((u) => [
              String(u.id),
              echapper(u.email),
              u.role,
              u.cree_le.toISOString(),
            ]),
          ),
    );

    writeFileSync(destination, `${sections.join("\n\n")}\n`, "utf8");
    console.log(`Inventaire écrit dans ${destination}`);
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((erreur) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exit(1);
});
