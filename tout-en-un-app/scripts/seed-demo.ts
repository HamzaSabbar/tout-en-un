import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { hashPassword } from "../src/lib/auth/password.ts";

// Script jetable pour peupler la base locale de démonstration avec une
// structure minimale (filière, matière, chapitre, cours publiés, un admin et
// un élève abonné) avant d'y semer les exercices de scripts/seed-exercices-pc.ts.
// Pas destiné à être committé.

const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55432/e2e_lot4";
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const MOT_DE_PASSE = "Demo-1234!";

async function main() {
  const filiere = await prisma.filiere.create({
    data: { code: "DEMO-SP", libelle: "Sciences Physiques" },
  });
  const matiere = await prisma.matiere.create({
    data: { code: "DEMO-PC", libelle: "Physique-Chimie", statut: "publie" },
  });
  await prisma.filiereMatiere.create({
    data: { filiere_id: filiere.id, matiere_id: matiere.id },
  });
  const chapitre = await prisma.chapitre.create({
    data: { matiere_id: matiere.id, libelle: "Cinétique chimique", statut: "publie" },
  });
  const cours = await prisma.cours.create({
    data: {
      chapitre_id: chapitre.id,
      titre: "Suivi temporel d'une transformation chimique",
      statut: "publie",
      publie_le: new Date(),
    },
  });

  const admin = await prisma.utilisateur.create({
    data: {
      nom: "Sabbar",
      prenom: "Hamza",
      email: "admin@demo.local",
      telephone: "0600000000",
      mot_de_passe_hash: await hashPassword(MOT_DE_PASSE),
      role: "admin",
    },
  });

  const eleve = await prisma.utilisateur.create({
    data: {
      nom: "Alami",
      prenom: "Sara",
      email: "eleve@demo.local",
      telephone: "0612345678",
      filiere_id: filiere.id,
      mot_de_passe_hash: await hashPassword(MOT_DE_PASSE),
      role: "eleve",
    },
  });

  const offre = await prisma.offre.create({
    data: { libelle: "Offre demo", duree_jours: 365, nb_matieres: 5, prix: 600 },
  });
  const abonnement = await prisma.abonnement.create({
    data: {
      utilisateur_id: eleve.id,
      offre_id: offre.id,
      statut: "actif",
      montant: 600,
      date_debut: new Date(),
      date_fin: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    },
  });
  await prisma.abonnementMatiere.create({
    data: {
      abonnement_id: abonnement.id,
      matiere_id: matiere.id,
      date_expiration: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    },
  });

  console.log(`cours_id=${cours.id}`);
  console.log(`admin=${admin.email}`);
  console.log(`eleve=${eleve.email}`);
  console.log(`mot_de_passe=${MOT_DE_PASSE}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
