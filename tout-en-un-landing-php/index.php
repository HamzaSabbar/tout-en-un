<?php
$year = date('Y');
$plans = [
  ['name' => 'Mensuel', 'price' => '199 MAD', 'cadence' => 'par matière / mois', 'description' => 'Pour avancer matière par matière avec souplesse.', 'features' => ['Accès à une matière', 'Cours, PDF et exercices', 'Lives de la matière']],
  ['name' => 'Trimestre', 'price' => '499 MAD', 'cadence' => 'par matière / 3 mois', 'description' => 'Pour suivre un trimestre complet avec plus de continuité.', 'features' => ['Accès à une matière', 'Contenus du trimestre', 'Suivi de progression']],
  ['name' => 'Pack 2 matières', 'price' => '349 MAD', 'cadence' => 'par mois', 'description' => 'Pour travailler Mathématiques et Physique-Chimie dans le même parcours.', 'features' => ['Mathématiques', 'Physique-Chimie', 'Dashboard complet'], 'featured' => true],
];
$faqs = [
  ['Est-ce que Tout en Un remplace les cours particuliers ?', 'Tout en Un peut suffire à beaucoup d’élèves qui veulent un cadre clair et régulier. Pour un blocage très spécifique, un accompagnement individuel peut rester utile.'],
  ['Les explications sont en français ou en darija ?', 'Le contenu est pensé pour être clair pour les élèves marocains, avec une approche accessible et des explications adaptées au programme.'],
  ['Comment fonctionnent les lives ?', 'Les lives sont organisés chaque semaine autour des chapitres importants, d’exercices guidés et de questions fréquentes.'],
  ['Les PDF sont-ils téléchargeables ?', 'Oui, les supports PDF sont prévus pour accompagner les cours et faciliter les révisions hors ligne.'],
  ['Les chapitres sont-ils débloqués progressivement ?', 'Le parcours est organisé par chapitre pour garder une progression logique. Les modalités exactes peuvent dépendre de la matière et de l’offre choisie.'],
  ['À qui s’adresse la plateforme ?', 'Tout en Un s’adresse aux élèves de 2ème Bac PC et SVT qui veulent réviser Mathématiques et Physique-Chimie avec une méthode structurée.'],
];
?>
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tout en Un | Réviser le Bac avec une méthode claire</title>
  <meta name="description" content="Cours, exercices, corrections, lives et suivi de progression pour les élèves de 2ème Bac PC et SVT.">
  <link rel="icon" href="assets/logo.png" type="image/png">
  <link rel="stylesheet" href="assets/styles.css">
  <script src="assets/app.js" defer></script>
</head>
<body>
  <header class="navbar" id="navbar">
    <nav class="nav-inner" aria-label="Navigation principale">
      <a class="brand" href="#top"><span class="logo"><img src="assets/logo.png" alt="Logo Tout en Un"></span><span>TOUT EN UN</span><small>Bac Maroc</small></a>
      <div class="nav-links">
        <a href="#fonctionnalites">Fonctionnalités</a><a href="#methode">Méthode</a><a href="#matieres">Matières</a><a href="#tarifs">Tarifs</a><a href="#faq">FAQ</a>
      </div>
      <div class="nav-actions"><a href="connexion.php">Connexion</a><a class="btn btn-small" href="#tarifs">Commencer <span>→</span></a></div>
      <button class="menu-button" id="menuButton" aria-expanded="false" aria-controls="mobileMenu" aria-label="Ouvrir le menu"><span></span><span></span><span></span></button>
    </nav>
    <div class="mobile-menu" id="mobileMenu">
      <a href="#fonctionnalites">Fonctionnalités</a><a href="#methode">Méthode</a><a href="#matieres">Matières</a><a href="#tarifs">Tarifs</a><a href="#faq">FAQ</a>
      <div><a class="btn btn-outline" href="connexion.php">Connexion</a><a class="btn" href="#tarifs">Commencer</a></div>
    </div>
  </header>

  <main id="top">
    <section class="hero section">
      <div class="hero-glow glow-one"></div><div class="hero-glow glow-two"></div>
      <div class="container hero-grid">
        <div class="hero-copy reveal">
          <div class="badge"><i></i> Pour les élèves de 2ème Bac PC &amp; SVT</div>
          <h1>Réussis ton Bac avec une méthode claire, <span>pas avec du hasard.</span></h1>
          <p class="lead">Tout en Un réunit cours, exercices, corrections, lives et suivi de progression pour t’aider à savoir exactement quoi travailler.</p>
          <div class="hero-actions"><a class="btn" href="#tarifs">Commencer maintenant <span>→</span></a><a class="btn btn-outline" href="#methode">Voir comment ça marche</a></div>
          <div class="trust"><span>✓ Mathématiques</span><span>✓ Physique-Chimie</span><span>✓ PC &amp; SVT</span><span>✓ Lives chaque semaine</span></div>
        </div>
        <div class="hero-visual reveal delay-1">
          <div class="visual-card"><img src="assets/hero-tout-en-un.png" alt="Aperçu de la plateforme Tout en Un"></div>
          <div class="floating-card float-progress"><b>68%</b><span>Progression globale</span></div>
          <div class="floating-card float-live"><i></i><span><b>Prochain live</b>Dimanche · 19h</span></div>
        </div>
      </div>
    </section>

    <section class="section soft">
      <div class="container">
        <div class="section-heading split reveal"><div><span class="eyebrow">Le vrai blocage</span><h2>Le problème n’est pas le manque de contenu. C’est le manque de méthode.</h2></div><p>Quand les ressources sont partout, il devient difficile de savoir quoi apprendre, dans quel ordre, et comment mesurer ses progrès.</p></div>
        <div class="cards three">
          <article class="card reveal"><span class="card-icon">€</span><h3>Les cours particuliers coûtent cher</h3><p>Un bon accompagnement peut vite devenir lourd pour la famille, surtout quand plusieurs matières sont concernées.</p></article>
          <article class="card reveal delay-1"><span class="card-icon">◎</span><h3>Les centres ne sont pas toujours personnalisés</h3><p>Le rythme collectif ne laisse pas toujours le temps de revenir sur tes vrais points faibles.</p></article>
          <article class="card reveal delay-2"><span class="card-icon">⌕</span><h3>Les ressources gratuites sont dispersées</h3><p>Vidéos, PDF et exercices existent, mais sans parcours clair, tu perds du temps à chercher au lieu de travailler.</p></article>
        </div>
      </div>
    </section>

    <section class="section" id="methode">
      <div class="container">
        <div class="section-heading split reveal"><div><span class="eyebrow">La méthode Tout en Un</span><h2>Tout en Un transforme tes révisions en parcours clair.</h2></div><p>Chaque chapitre suit une progression simple pour comprendre, pratiquer, corriger et avancer avec plus de visibilité.</p></div>
        <div class="method-grid" role="list" aria-label="Étapes de la méthode">
          <article class="step-card interactive-card reveal active" tabindex="0" role="button" aria-pressed="true" data-method="Comprendre" data-detail="Commence par une vidéo courte et une fiche claire pour maîtriser les notions essentielles du chapitre."><b>01</b><span class="card-icon dark">◉</span><h3>Comprendre</h3><p>Des cours structurés pour poser les bases essentielles.</p></article>
          <article class="step-card interactive-card reveal delay-1" tabindex="0" role="button" aria-pressed="false" data-method="S’entraîner" data-detail="Passe aux exercices progressifs : application directe, niveau intermédiaire, puis problèmes de type Bac."><b>02</b><span class="card-icon dark">✎</span><h3>S’entraîner</h3><p>Des exercices gradués pour appliquer chaque notion.</p></article>
          <article class="step-card interactive-card reveal delay-2" tabindex="0" role="button" aria-pressed="false" data-method="Corriger" data-detail="Compare ta démarche aux solutions écrites et vidéo pour comprendre précisément chaque erreur."><b>03</b><span class="card-icon dark">✓</span><h3>Corriger</h3><p>Des corrections détaillées pour identifier tes erreurs.</p></article>
          <article class="step-card interactive-card reveal delay-3" tabindex="0" role="button" aria-pressed="false" data-method="Progresser" data-detail="Ton tableau de bord met à jour ton niveau et te propose automatiquement la prochaine priorité."><b>04</b><span class="card-icon dark">↗</span><h3>Progresser</h3><p>Un suivi clair pour savoir quoi revoir ensuite.</p></article>
        </div>
        <div class="method-detail reveal" id="methodDetail" aria-live="polite"><span>Étape sélectionnée</span><h3>Comprendre</h3><p>Commence par une vidéo courte et une fiche claire pour maîtriser les notions essentielles du chapitre.</p><div class="method-meter"><i></i><i></i><i></i><i></i></div></div>
      </div>
    </section>

    <section class="section dark-section" id="fonctionnalites">
      <div class="container">
        <div class="center-heading reveal"><span class="eyebrow light">Une méthode complète</span><h2>Tout ce qu’il faut pour réviser avec <span>méthode.</span></h2><p>Cours, exercices, corrections, lives et suivi de progression : Tout en Un organise ton travail chapitre après chapitre.</p></div>
        <div class="feature-grid">
          <article class="feature interactive-feature reveal" tabindex="0"><span>01</span><div class="feature-art roadmap"><i></i><i></i><i></i><i></i></div><h3>Un parcours clair chapitre par chapitre</h3><p>Suis les chapitres dans l’ordre du programme marocain, sans te disperser.</p><button type="button" aria-expanded="false">Voir un exemple <i>+</i></button><div class="feature-extra">Programme organisé par prérequis, avec validation de chaque étape avant de continuer.</div></article>
          <article class="feature interactive-feature reveal delay-1" tabindex="0"><span>02</span><div class="feature-art play">▶</div><h3>Des cours vidéo pour comprendre</h3><p>Chaque notion importante est expliquée clairement avant de passer aux exercices.</p><button type="button" aria-expanded="false">Voir un exemple <i>+</i></button><div class="feature-extra">Vidéos ciblées, points-clés à retenir et résumé PDF disponible après chaque leçon.</div></article>
          <article class="feature interactive-feature reveal" tabindex="0"><span>03</span><div class="feature-art exercise">f(x) = x² + 3x</div><h3>Des exercices pour t’entraîner</h3><p>Travaille avec des exercices organisés par chapitre et par niveau de difficulté.</p><button type="button" aria-expanded="false">Voir un exemple <i>+</i></button><div class="feature-extra">Trois niveaux de difficulté et des séries inspirées des examens nationaux.</div></article>
          <article class="feature interactive-feature reveal delay-1" tabindex="0"><span>04</span><div class="feature-art correction">✓ Solution détaillée</div><h3>Des corrections pour progresser</h3><p>Comprends tes erreurs grâce aux corrections écrites et vidéo.</p><button type="button" aria-expanded="false">Voir un exemple <i>+</i></button><div class="feature-extra">Chaque correction explique le raisonnement, les pièges fréquents et la méthode attendue.</div></article>
          <article class="feature interactive-feature reveal" tabindex="0"><span>05</span><div class="feature-art live-art"><i></i> LIVE · Dimanche 19h</div><h3>Des lives pour poser tes questions</h3><p>Participe chaque semaine pour revoir les points difficiles.</p><button type="button" aria-expanded="false">Voir un exemple <i>+</i></button><div class="feature-extra">Pose tes questions, vote pour les exercices à corriger et retrouve le replay.</div></article>
          <article class="feature interactive-feature reveal delay-1" tabindex="0"><span>06</span><div class="feature-art mini-chart"><i style="height:40%"></i><i style="height:65%"></i><i style="height:85%"></i><i style="height:72%"></i></div><h3>Un dashboard pour savoir quoi faire ensuite</h3><p>Suis ton niveau, tes prochains cours et tes priorités de révision.</p><button type="button" aria-expanded="false">Voir un exemple <i>+</i></button><div class="feature-extra">Scores, progression et recommandations sont réunis dans une seule vue claire.</div></article>
        </div>
      </div>
    </section>

    <section class="section dashboard-section">
      <div class="container dashboard-grid">
        <div class="reveal"><span class="eyebrow">Suivi de progression</span><h2>Un tableau de bord pour savoir où concentrer tes efforts</h2><p class="lead small">Visualise tes avancées par matière, tes scores récents et les chapitres qui méritent encore du travail.</p><div class="quick-stats"><div><span>◎</span><small>Chapitre faible</small><b>Fonctions logarithmiques</b></div><div><span>◷</span><small>Prochain live</small><b>Physique-Chimie · Dimanche 19h</b></div></div></div>
        <div class="dashboard reveal delay-1">
          <div class="dash-top"><div><small>Progression globale</small><strong>68%</strong></div><span>▥</span><div class="progress"><i data-progress="68"></i></div></div>
          <button class="subject-row active" type="button" data-progress="72" data-chapter="Fonctions logarithmiques" data-recommendation="Faire 8 exercices sur les dérivées"><b>Mathématiques</b><em>72%</em><div class="progress dark"><i data-progress="72"></i></div></button>
          <button class="subject-row" type="button" data-progress="61" data-chapter="Cinétique chimique" data-recommendation="Revoir la vitesse volumique de réaction"><b>Physique-Chimie</b><em>61%</em><div class="progress dark"><i data-progress="61"></i></div></button>
          <div class="recommend"><span>✦</span><div><small>Recommandation du jour</small><b id="dashboardRecommendation">Faire 8 exercices sur les dérivées</b></div></div>
        </div>
      </div>
    </section>

    <section class="section soft" id="matieres">
      <div class="container"><div class="center-heading dark-text reveal"><span class="badge">🎓 Filières</span><h2>Conçu pour les élèves de 2ème Bac PC &amp; SVT</h2></div>
        <div class="cards two subject-cards">
          <article class="card track-card interactive-card reveal" tabindex="0" role="button" aria-pressed="false" data-track="2ème Bac PC"><span class="eyebrow">Parcours</span><h3>2ème Bac PC</h3><p>Un parcours adapté aux chapitres essentiels de la filière Sciences Physiques.</p><div class="subject-tags"><span>∑ Mathématiques</span><span>⚗ Physique-Chimie</span></div><small>Cliquer pour sélectionner →</small></article>
          <article class="card track-card interactive-card reveal delay-1" tabindex="0" role="button" aria-pressed="false" data-track="2ème Bac SVT"><span class="eyebrow">Parcours</span><h3>2ème Bac SVT</h3><p>Un accompagnement structuré pour consolider les matières clés de la filière SVT.</p><div class="subject-tags"><span>∑ Mathématiques</span><span>⚗ Physique-Chimie</span></div><small>Cliquer pour sélectionner →</small></article>
        </div>
        <div class="selection-banner" id="trackSelection" aria-live="polite"><span>Choisis ta filière pour personnaliser ton parcours.</span><a href="#tarifs">Voir les tarifs →</a></div>
      </div>
    </section>

    <section class="section live-section">
      <div class="container live-grid"><div class="live-card reveal"><div class="live-badge"><i></i> Prochain direct</div><div class="live-screen"><button class="play-live" id="playLive" type="button" aria-label="Afficher l’aperçu du live">▶</button><b>Physique-Chimie</b><small>Cinétique chimique · Questions &amp; exercices</small><div class="live-preview" id="livePreview">Aperçu disponible bientôt — prépare tes questions !</div></div><div class="attendees"><span>+24 élèves intéressés</span><b>Dimanche · 19h</b></div></div><div class="reveal delay-1"><span class="eyebrow">Lives hebdomadaires</span><h2>Des lives chaque semaine pour garder le rythme</h2><p class="lead small">Revois les notions importantes, traite des exercices et pose les questions qui te bloquent.</p><div class="countdown" id="liveCountdown" aria-live="polite"></div><button class="btn btn-outline calendar-button" id="calendarButton" type="button">+ Ajouter au calendrier</button><ul class="check-list"><li>Séances planifiées chaque semaine</li><li>Focus sur les chapitres importants</li><li>Replays disponibles selon le programme</li></ul></div></div>
    </section>

    <section class="section pricing" id="tarifs">
      <div class="container"><div class="center-heading dark-text reveal"><span class="eyebrow">Tarifs simples</span><h2>Choisis le rythme qui te convient</h2><p>Commence par une matière ou prends le pack complet pour travailler Mathématiques et Physique-Chimie ensemble.</p></div>
        <div class="pricing-grid">
          <?php foreach ($plans as $index => $plan): ?><article class="price-card selectable-plan reveal delay-<?= min($index, 3) ?> <?= !empty($plan['featured']) ? 'featured' : '' ?>" data-plan="<?= htmlspecialchars($plan['name']) ?>" tabindex="0">
            <?php if (!empty($plan['featured'])): ?><span class="popular">Le plus choisi</span><?php endif; ?>
            <h3><?= htmlspecialchars($plan['name']) ?></h3><div class="price"><?= htmlspecialchars($plan['price']) ?></div><small><?= htmlspecialchars($plan['cadence']) ?></small><p><?= htmlspecialchars($plan['description']) ?></p>
            <ul><?php foreach ($plan['features'] as $item): ?><li>✓ <?= htmlspecialchars($item) ?></li><?php endforeach; ?></ul><button class="btn <?= empty($plan['featured']) ? 'btn-outline' : '' ?> select-plan" type="button">Choisir ce plan</button>
          </article><?php endforeach; ?>
        </div>
        <div class="plan-confirmation" id="planConfirmation" aria-live="polite"><span>Sélectionne une offre pour continuer.</span><a class="btn btn-small" href="mailto:contact@toutenun.ma">Nous contacter</a></div>
      </div>
    </section>

    <section class="section soft" id="faq">
      <div class="container faq-wrap"><div class="faq-intro reveal"><span class="eyebrow">Besoin d’aide ?</span><h2>Questions fréquentes</h2><p>Tout ce qu’il faut savoir avant de commencer ton parcours.</p><a href="mailto:contact@toutenun.ma">Une autre question ? Écris-nous →</a></div><div class="accordion reveal delay-1">
        <?php foreach ($faqs as $index => $faq): ?><div class="faq-item"><button aria-expanded="false" aria-controls="answer-<?= $index ?>"><span><?= htmlspecialchars($faq[0]) ?></span><i>+</i></button><div class="faq-answer" id="answer-<?= $index ?>"><p><?= htmlspecialchars($faq[1]) ?></p></div></div><?php endforeach; ?>
      </div></div>
    </section>

    <section class="section final-cta"><div class="container reveal"><div class="cta-box"><span class="eyebrow light">Prêt à commencer ?</span><h2>Commence avec une méthode claire dès aujourd’hui.</h2><p>Choisis ton plan, suis les chapitres dans l’ordre et garde une vue simple sur tes priorités de révision.</p><a class="btn white" href="#tarifs">Commencer maintenant →</a></div></div></section>
  </main>

  <footer id="contact"><div class="container footer-grid"><div><a class="brand" href="#top"><span class="logo"><img src="assets/logo.png" alt="Logo Tout en Un"></span><span>Tout en Un</span></a><p>Une méthode claire pour réviser le Bac avec plus de sérénité.</p><a class="mail" href="mailto:contact@toutenun.ma">✉ contact@toutenun.ma</a></div><div class="footer-links"><div><b>Navigation</b><a href="#fonctionnalites">Fonctionnalités</a><a href="#matieres">Matières</a><a href="#tarifs">Tarifs</a><a href="#faq">FAQ</a></div><div><b>Légal</b><a href="confidentialite.php">Confidentialité</a><a href="conditions.php">Conditions</a></div></div></div><div class="container copyright">© <?= $year ?> Tout en Un. Tous droits réservés.</div></footer>
</body>
</html>
