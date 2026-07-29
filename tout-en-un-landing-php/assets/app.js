document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector("#navbar");
  const menuButton = document.querySelector("#menuButton");
  const mobileMenu = document.querySelector("#mobileMenu");

  const updateNavbar = () =>
    navbar?.classList.toggle("scrolled", window.scrollY > 24);
  updateNavbar();
  window.addEventListener("scroll", updateNavbar, { passive: true });

  menuButton?.addEventListener("click", () => {
    const open = !mobileMenu.classList.contains("open");
    mobileMenu.classList.toggle("open", open);
    menuButton.classList.toggle("open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute(
      "aria-label",
      open ? "Fermer le menu" : "Ouvrir le menu",
    );
  });

  mobileMenu?.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      menuButton.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }),
  );

  // Met en évidence la rubrique visible dans la navigation.
  const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const trackedSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  const updateActiveNavigation = () => {
    const current = [...trackedSections]
      .reverse()
      .find((section) => section.getBoundingClientRect().top <= 150);
    navLinks.forEach((link) => {
      const active = current && link.getAttribute("href") === `#${current.id}`;
      link.classList.toggle("active", Boolean(active));
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };
  updateActiveNavigation();
  window.addEventListener("scroll", updateActiveNavigation, { passive: true });

  // Étapes de la méthode.
  const methodCards = [...document.querySelectorAll("[data-method]")];
  const methodDetail = document.querySelector("#methodDetail");
  const chooseMethod = (card, index) => {
    methodCards.forEach((item) => {
      const active = item === card;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    methodDetail.querySelector("h3").textContent = card.dataset.method;
    methodDetail.querySelector("p").textContent = card.dataset.detail;
    methodDetail
      .querySelectorAll(".method-meter i")
      .forEach((item, itemIndex) =>
        item.classList.toggle("done", itemIndex <= index),
      );
  };
  methodCards.forEach((card, index) => {
    card.addEventListener("click", () => chooseMethod(card, index));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        chooseMethod(card, index);
      }
    });
  });
  if (methodCards[0]) chooseMethod(methodCards[0], 0);

  // Détails des fonctionnalités.
  document.querySelectorAll(".interactive-feature").forEach((feature) => {
    const button = feature.querySelector("button");
    button?.addEventListener("click", () => {
      const open = feature.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
      button.firstChild.textContent = open
        ? "Masquer les détails "
        : "Voir un exemple ";
    });
  });

  // Aperçu dynamique du dashboard.
  const subjectRows = [
    ...document.querySelectorAll(".subject-row[data-progress]"),
  ];
  const dashboardValue = document.querySelector(".dash-top strong");
  const dashboardBar = document.querySelector(".dash-top .progress i");
  const weakChapter = document.querySelector(
    ".quick-stats > div:first-child b",
  );
  const recommendation = document.querySelector("#dashboardRecommendation");
  subjectRows.forEach((row) => {
    row.addEventListener("click", () => {
      subjectRows.forEach((item) =>
        item.classList.toggle("active", item === row),
      );
      dashboardValue.textContent = `${row.dataset.progress}%`;
      dashboardBar.style.width = `${row.dataset.progress}%`;
      weakChapter.textContent = row.dataset.chapter;
      recommendation.textContent = row.dataset.recommendation;
    });
  });

  // Choix de filière.
  const trackCards = [...document.querySelectorAll("[data-track]")];
  const trackSelection = document.querySelector("#trackSelection span");
  const chooseTrack = (card) => {
    trackCards.forEach((item) => {
      const selected = item === card;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
      item.querySelector("small").textContent = selected
        ? "✓ Filière sélectionnée"
        : "Cliquer pour sélectionner →";
    });
    trackSelection.textContent = `${card.dataset.track} sélectionnée — les contenus seront adaptés à ta filière.`;
  };
  trackCards.forEach((card) => {
    card.addEventListener("click", () => chooseTrack(card));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        chooseTrack(card);
      }
    });
  });

  // Sélection d'une offre.
  const planCards = [...document.querySelectorAll("[data-plan]")];
  const planConfirmation = document.querySelector("#planConfirmation");
  const choosePlan = (card) => {
    planCards.forEach((item) =>
      item.classList.toggle("selected", item === card),
    );
    const plan = card.dataset.plan;
    planConfirmation.querySelector("span").textContent =
      `${plan} sélectionné. Contacte-nous pour finaliser ton inscription.`;
    const contactLink = planConfirmation.querySelector("a");
    contactLink.href = `mailto:contact@toutenun.ma?subject=${encodeURIComponent(`Inscription — ${plan}`)}`;
    contactLink.textContent = "Continuer →";
  };
  planCards.forEach((card) => {
    card
      .querySelector(".select-plan")
      ?.addEventListener("click", () => choosePlan(card));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter") choosePlan(card);
    });
  });

  // FAQ accordéon.
  document.querySelectorAll(".faq-item button").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      const answer = item.querySelector(".faq-answer");
      const isOpen = item.classList.toggle("open");
      button.setAttribute("aria-expanded", String(isOpen));
      answer.style.maxHeight = isOpen ? `${answer.scrollHeight}px` : "0px";
    });
  });

  // Prochain dimanche à 19 h, aperçu du live et fichier calendrier.
  const getNextLive = () => {
    const now = new Date();
    const live = new Date(now);
    let days = (7 - now.getDay()) % 7;
    live.setDate(now.getDate() + days);
    live.setHours(19, 0, 0, 0);
    if (live <= now) live.setDate(live.getDate() + 7);
    return live;
  };
  const liveDate = getNextLive();
  const countdown = document.querySelector("#liveCountdown");
  const updateCountdown = () => {
    const distance = Math.max(0, liveDate.getTime() - Date.now());
    const days = Math.floor(distance / 86400000);
    const hours = Math.floor((distance % 86400000) / 3600000);
    const minutes = Math.floor((distance % 3600000) / 60000);
    countdown.innerHTML = `<span><b>${days}</b>jours</span><span><b>${hours}</b>heures</span><span><b>${minutes}</b>minutes</span>`;
  };
  updateCountdown();
  window.setInterval(updateCountdown, 60000);
  document
    .querySelector("#playLive")
    ?.addEventListener("click", () =>
      document.querySelector("#livePreview")?.classList.toggle("open"),
    );
  document.querySelector("#calendarButton")?.addEventListener("click", () => {
    const endDate = new Date(liveDate.getTime() + 75 * 60000);
    const formatDate = (date) =>
      date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}Z$/, "Z");
    const calendar = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Tout en Un//Live//FR",
      "BEGIN:VEVENT",
      `DTSTART:${formatDate(liveDate)}`,
      `DTEND:${formatDate(endDate)}`,
      "SUMMARY:Live Tout en Un — Physique-Chimie",
      "DESCRIPTION:Cinétique chimique — Questions et exercices",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([calendar], { type: "text/calendar;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "live-tout-en-un.ics";
    link.click();
    URL.revokeObjectURL(url);
  });

  // Révélations au défilement et barres de progression.
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const revealItems = document.querySelectorAll(".reveal");
  const activateProgress = (root = document) =>
    root.querySelectorAll(".progress i[data-progress]").forEach((bar) => {
      bar.style.width = `${bar.dataset.progress}%`;
    });
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("visible"));
    activateProgress();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        activateProgress(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14 },
  );
  revealItems.forEach((item) => observer.observe(item));
});
