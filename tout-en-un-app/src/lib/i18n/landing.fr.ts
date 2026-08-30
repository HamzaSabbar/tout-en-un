// Tout le texte statique de la page vitrine publique (`src/app/page.tsx` et
// `src/components/landing/`). Les données réellement dynamiques (les offres)
// ne vivent pas ici : voir `listerOffresActives()`.
export const LANDING_FR = {
  nav: {
    plateforme: "La plateforme",
    accompagnement: "Accompagnement",
    professeurs: "Professeurs",
    tarifs: "Tarifs",
    connexion: "Se connecter",
    cta: "Commencer",
  },
  hero: {
    tag: "La plateforme pensée pour ton année",
    titre: "Tout ce qu'il te faut pour réussir ton année.",
    texte:
      "Cours, exercices, documents et accompagnement réunis au même endroit. Une expérience claire, structurée et pensée pour avancer sans te disperser.",
    ctaPrincipal: "Commencer maintenant",
    ctaSecondaire: "Découvrir la plateforme",
    apercu: {
      matieres: "Exercices",
      seancesLive: "Séances live",
      progression: "Ma progression",
      documents: "Documents",
    },
    bonjour: "Bonjour 👋",
    reprendre: "Continue là où tu t'es arrêté.",
    resume: {
      titre: "Mathématiques · Limites et continuité",
      texte: "Chapitre 3 · 8 leçons sur 12 terminées",
    },
    aContinuer: "À continuer",
    derivation: { titre: "Dérivation", detail: "Vidéo · 12 min" },
    fonctions: { titre: "Fonctions numériques", detail: "6 exercices à faire" },
    electricite: { titre: "Électricité", detail: "Document de synthèse" },
    prochaineSeance: "Prochaine séance",
    voirSeance: "Voir la séance",
  },
  features: {
    apprendre: {
      label: "Apprendre",
      titre: "Des cours clairs. À ton rythme.",
      texte:
        "Chaque chapitre est découpé en vidéos courtes et structurées, pour comprendre vite et reprendre exactement là où tu t'es arrêté.",
      points: [
        { titre: "Organisés par chapitre", texte: "Un parcours simple, sans contenu perdu." },
        { titre: "Progression sauvegardée", texte: "Tu reprends toujours au bon endroit." },
        { titre: "Accessible partout", texte: "Ordinateur, tablette ou mobile." },
      ],
      video1: { titre: "Comprendre les limites", detail: "08:42 · Terminé à 100%" },
      video2: { titre: "Continuité d'une fonction", detail: "11:16 · À regarder" },
    },
    pratiquer: {
      label: "Pratiquer",
      titre: "Comprendre, pratiquer, maîtriser.",
      texte:
        "Regarder un cours ne suffit pas. Tout en Un te fait pratiquer immédiatement avec des exercices progressifs et des corrections détaillées.",
      points: [
        { titre: "Exercices progressifs", texte: "Du plus accessible au plus exigeant." },
        { titre: "Indices intelligents", texte: "De l'aide sans donner directement la réponse." },
        { titre: "Corrections détaillées", texte: "Comprends la méthode, pas seulement le résultat." },
      ],
      exercice1: "Calculer la limite lorsque x tend vers +∞.",
      exercice2: "Étudier la continuité de f sur ℝ.",
      exercice3: "Exercice type contrôle · 15 min",
    },
    accompagnement: {
      label: "Accompagnement",
      titre: "Tu n'es jamais seul face à un exercice.",
      texte:
        "Chaque semaine, retrouve ton professeur en petit groupe pour poser tes questions, travailler les exercices difficiles et préparer les contrôles.",
      points: [
        { titre: "Petits groupes", texte: "Un accompagnement vraiment interactif." },
        { titre: "1 séance chaque semaine", texte: "Une vraie régularité dans le suivi." },
        { titre: "Replay disponible", texte: "Tu ne perds jamais une séance." },
      ],
      calendrier: "Ton calendrier",
      prochaineSeance: "Prochaine séance · Mathématiques",
      creneau: "Mercredi 19h00 · 1h30 · Petit groupe",
    },
    progression: {
      label: "Progression",
      titre: "Sais toujours où tu en es.",
      texte:
        "Tout en Un te montre ta progression réelle, tes objectifs de la semaine et les chapitres qui nécessitent encore du travail.",
      apercu: "Ton année en un coup d'œil",
      matieres: { maths: "Mathématiques", physique: "Physique" },
      serie: "Série actuelle",
      exercicesTermines: "Exercices terminés",
      objectifSemaine: "Objectif semaine",
      prochaineSeance: "Prochaine séance",
    },
  },
  professeurs: {
    titre: "Apprends avec ceux qui sont déjà passés par là.",
    texte:
      "Des étudiants et jeunes diplômés sélectionnés pour leur niveau académique, mais surtout pour leur capacité à expliquer simplement.",
    liste: [
      { nom: "Hamza", role: "ENSIAS · Mathématiques & Physique" },
      { nom: "Yassine", role: "EMI · Mathématiques" },
      { nom: "Sara", role: "Médecine · Sciences" },
    ],
  },
  tarifs: {
    label: "Tarifs",
    titre: "Choisis l'accompagnement qui te correspond.",
    texte:
      "Accède à toute la plateforme en autonomie, ou ajoute un accompagnement hebdomadaire en petit groupe avec un professeur.",
    unite: "MAD",
    valable: "valable",
    jours: "jours",
    matiereUnite: "matière incluse",
    matieresUnite: "matières incluses",
    badgePhare: "Le plus complet",
    badgeStandard: "Offre",
    cta: "Choisir cette offre",
    note: "Tu peux changer de formule selon tes besoins.",
    vide: "Les offres seront bientôt disponibles ici.",
  },
  cta: {
    titre: "Ton année. Tes cours. Tes exercices. Tout en un.",
    texte: "Une seule plateforme pour apprendre, pratiquer, poser tes questions et progresser.",
    bouton: "Commencer maintenant",
  },
  footer: {
    texte: "Cours, exercices et accompagnement pour aider chaque élève à avancer avec clarté.",
    plateforme: "Plateforme",
    compte: "Compte",
    cours: "Cours",
    seancesLive: "Séances live",
    professeurs: "Professeurs",
    connexion: "Se connecter",
    inscription: "Créer un compte",
  },
} as const;
