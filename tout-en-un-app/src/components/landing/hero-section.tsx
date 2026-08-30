import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Calculator,
  Flame,
  Home,
  Play,
  Radio,
  Trophy,
  Zap,
} from "lucide-react";
import { LANDING_FR } from "@/lib/i18n/landing.fr";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

const LIENS_SIDEBAR = [
  { label: "Accueil", icone: Home, actif: true },
  { label: "Mes matières", icone: BookOpen, actif: false },
  { label: LANDING_FR.hero.apercu.matieres, icone: Calculator, actif: false },
  { label: LANDING_FR.hero.apercu.seancesLive, icone: Radio, actif: false },
  { label: LANDING_FR.hero.apercu.progression, icone: BarChart3, actif: false },
] as const;

export function HeroSection() {
  return (
    <header className="relative overflow-hidden px-6 pb-10 pt-28 text-center sm:pt-32">
      <ScrollReveal className="flex justify-center">
        <span className="inline-block rounded-full bg-secondary px-3 py-2 text-[13px] font-extrabold text-secondary-foreground">
          {LANDING_FR.hero.tag}
        </span>
      </ScrollReveal>

      <ScrollReveal>
        <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.25rem,7vw,4.5rem)] font-medium leading-[0.98] tracking-tight">
          {LANDING_FR.hero.titre}
        </h1>
      </ScrollReveal>

      <ScrollReveal>
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {LANDING_FR.hero.texte}
        </p>
      </ScrollReveal>

      <ScrollReveal className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/inscription"
          className="inline-flex h-13 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_32px_-8px_rgba(10,19,235,0.5)]"
        >
          {LANDING_FR.hero.ctaPrincipal}
        </Link>
        <a
          href="#plateforme"
          className="inline-flex h-13 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-bold"
        >
          {LANDING_FR.hero.ctaSecondaire}
        </a>
      </ScrollReveal>

      <ScrollReveal className="mt-16">
        <div className="relative mx-auto w-full max-w-5xl [perspective:1200px]">
          <div className="pointer-events-none absolute inset-x-[8%] top-[8%] -z-10 h-64 rounded-full bg-primary/25 blur-[60px]" />

          <div className="overflow-hidden rounded-[28px] border border-border bg-card text-left shadow-[0_28px_80px_-20px_rgba(10,19,235,0.3)] [transform:rotateX(2deg)]">
            <div className="flex h-12 items-center gap-2 border-b border-border bg-muted/40 px-4">
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <div className="ml-3 h-6 flex-1 rounded-md bg-muted" />
            </div>

            <div className="grid min-h-[560px] bg-muted/20 md:grid-cols-[220px_1fr]">
              <aside className="hidden border-r border-border bg-card p-5 md:block">
                <div className="mb-6 flex items-center gap-2 text-sm font-extrabold">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Home aria-hidden="true" className="size-4" />
                  </span>
                  Tout en Un
                </div>
                <nav className="flex flex-col gap-1 text-sm">
                  {LIENS_SIDEBAR.map(({ label, icone: Icone, actif }) => (
                    <span
                      key={label}
                      className={
                        actif
                          ? "rounded-xl bg-secondary px-3 py-2.5 font-bold text-secondary-foreground"
                          : "rounded-xl px-3 py-2.5 text-muted-foreground"
                      }
                    >
                      <Icone aria-hidden="true" className="mr-2 inline size-4" />
                      {label}
                    </span>
                  ))}
                </nav>
              </aside>

              <main className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-extrabold tracking-tight">{LANDING_FR.hero.bonjour}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{LANDING_FR.hero.reprendre}</p>
                  </div>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">
                    HS
                  </span>
                </div>

                <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-3xl bg-gradient-to-br from-primary to-[#3140FF] p-6 text-primary-foreground sm:flex-row sm:items-center">
                  <div>
                    <h4 className="text-lg font-bold">{LANDING_FR.hero.resume.titre}</h4>
                    <p className="mt-1 text-sm text-primary-foreground/75">{LANDING_FR.hero.resume.texte}</p>
                  </div>
                  <div className="h-2.5 w-full max-w-[45%] overflow-hidden rounded-full bg-white/20 sm:w-60">
                    <span className="block h-full w-[68%] rounded-full bg-white" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <BarChart3 aria-hidden="true" className="size-4" />
                    </span>
                    <p className="mt-3 text-xs text-muted-foreground">Progression Maths</p>
                    <p className="mt-1 text-xl font-extrabold">68%</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <Trophy aria-hidden="true" className="size-4" />
                    </span>
                    <p className="mt-3 text-xs text-muted-foreground">Exercices terminés</p>
                    <p className="mt-1 text-xl font-extrabold">142</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <Flame aria-hidden="true" className="size-4" />
                    </span>
                    <p className="mt-3 text-xs text-muted-foreground">Série actuelle</p>
                    <p className="mt-1 text-xl font-extrabold">9 jours</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr]">
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <h5 className="mb-3 text-sm font-bold">{LANDING_FR.hero.aContinuer}</h5>
                    <div className="flex flex-col divide-y divide-border">
                      {[
                        { ...LANDING_FR.hero.derivation, icone: Play },
                        { ...LANDING_FR.hero.fonctions, icone: Calculator },
                        { ...LANDING_FR.hero.electricite, icone: Zap },
                      ].map((item) => (
                        <div key={item.titre} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                            <item.icone aria-hidden="true" className="size-4" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold">{item.titre}</p>
                            <p className="text-xs text-muted-foreground">{item.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-5">
                    <span className="inline-block rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-secondary-foreground">
                      {LANDING_FR.hero.prochaineSeance}
                    </span>
                    <p className="mt-3 text-sm font-bold">Mathématiques</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Mercredi · 19h00
                      <br />
                      Petit groupe · 1h30
                    </p>
                    <a
                      href="#accompagnement"
                      className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                    >
                      {LANDING_FR.hero.voirSeance}
                    </a>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </header>
  );
}
