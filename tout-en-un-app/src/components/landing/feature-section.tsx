import { Check, Play } from "lucide-react";
import { LANDING_FR } from "@/lib/i18n/landing.fr";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { cn } from "@/lib/utils";

function MockPanel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[32px] border border-border bg-muted/30 p-6">
      <div className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-primary/10 blur-[65px]" />
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_65px_-24px_rgba(28,36,88,0.35)]">
        <div className="flex h-12 items-center justify-between border-b border-border px-4 text-xs text-muted-foreground">
          <span>{eyebrow}</span>
          <span>{title}</span>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function VideosMock() {
  const f = LANDING_FR.features.apprendre;
  return (
    <MockPanel eyebrow="Mathématiques" title="Chapitre 3 / 8">
      <p className="mb-3 text-lg font-extrabold">Vidéos du chapitre</p>
      {[f.video1, f.video2].map((video, i) => (
        <div key={video.titre} className="mb-3 overflow-hidden rounded-2xl border border-border last:mb-0">
          <div
            className={cn(
              "flex h-28 items-center justify-center text-primary-foreground",
              i === 0 ? "bg-gradient-to-br from-primary to-[#6670FF]" : "bg-gradient-to-br from-[#11131A] to-[#2E3242]",
            )}
          >
            <Play aria-hidden="true" className="size-7" />
          </div>
          <div className="p-3">
            <p className="text-sm font-bold">{video.titre}</p>
            <p className="mt-1 text-xs text-muted-foreground">{video.detail}</p>
          </div>
        </div>
      ))}
    </MockPanel>
  );
}

function ExercicesMock() {
  const f = LANDING_FR.features.pratiquer;
  return (
    <MockPanel eyebrow="Exercices" title="Limites">
      <p className="mb-3 text-lg font-extrabold">Série d&apos;entraînement</p>
      {[
        { titre: "Exercice 01", niveau: 3, texte: f.exercice1 },
        { titre: "Exercice 02", niveau: 4, texte: f.exercice2 },
        { titre: "Exercice 03", niveau: 5, texte: f.exercice3 },
      ].map((exercice) => (
        <div key={exercice.titre} className="mb-3 rounded-2xl border border-border p-4 last:mb-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{exercice.titre}</p>
            <span className="text-xs tracking-widest text-primary">
              {"●".repeat(exercice.niveau)}
              {"○".repeat(5 - exercice.niveau)}
            </span>
          </div>
          <p className="mt-3 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">{exercice.texte}</p>
        </div>
      ))}
    </MockPanel>
  );
}

function CalendrierMock() {
  const f = LANDING_FR.features.accompagnement;
  const jours = ["L", "M", "M", "J", "V", "S", "D", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25"];
  const actifs = new Set(["14", "21"]);
  return (
    <MockPanel eyebrow="Séances live" title="Ce mois-ci">
      <p className="mb-3 text-lg font-extrabold">{f.calendrier}</p>
      <div className="grid grid-cols-7 gap-2">
        {jours.map((jour, i) => (
          <div
            key={`${jour}-${i}`}
            className={cn(
              "flex h-11 items-center justify-center rounded-xl text-xs",
              actifs.has(jour) ? "bg-primary font-bold text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {jour}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-secondary p-4">
        <p className="text-sm font-bold text-secondary-foreground">{f.prochaineSeance}</p>
        <p className="mt-1 text-xs text-secondary-foreground/70">{f.creneau}</p>
      </div>
    </MockPanel>
  );
}

function ProgressionMock() {
  const f = LANDING_FR.features.progression;
  return (
    <MockPanel eyebrow="Ma progression" title="Cette semaine">
      <p className="mb-4 text-lg font-extrabold">{f.apercu}</p>
      {[
        { label: f.matieres.maths, valeur: 68 },
        { label: f.matieres.physique, valeur: 52 },
      ].map((matiere) => (
        <div key={matiere.label} className="mb-4">
          <div className="mb-2 flex justify-between text-xs">
            <span>{matiere.label}</span>
            <span className="font-bold">{matiere.valeur}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${matiere.valeur}%` }} />
          </div>
        </div>
      ))}
      <div className="mt-2 flex flex-col divide-y divide-border text-xs">
        {[
          [f.serie, "9 jours"],
          [f.exercicesTermines, "142"],
          [f.objectifSemaine, "7 / 10"],
          [f.prochaineSeance, "Mer. 19h"],
        ].map(([label, valeur]) => (
          <div key={label} className="flex justify-between py-2.5 first:pt-0 last:pb-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-bold">{valeur}</span>
          </div>
        ))}
      </div>
    </MockPanel>
  );
}

export const FEATURE_VISUALS = {
  apprendre: VideosMock,
  pratiquer: ExercicesMock,
  accompagnement: CalendrierMock,
  progression: ProgressionMock,
} as const;

export function FeatureSection({
  id,
  contenu,
  reverse = false,
  visual: Visual,
}: {
  id?: string;
  contenu: {
    label: string;
    titre: string;
    texte: string;
    points?: readonly { titre: string; texte: string }[];
  };
  reverse?: boolean;
  visual: React.ComponentType;
}) {
  return (
    <section id={id} className="py-24 sm:py-32">
      <div
        className={cn(
          "mx-auto grid w-[min(1180px,calc(100%-48px))] items-center gap-16 lg:grid-cols-2 lg:gap-20",
        )}
      >
        <ScrollReveal className={cn(reverse ? "lg:order-2" : undefined)}>
          <p className="mb-4 text-[13px] font-extrabold uppercase tracking-wide text-primary">
            {contenu.label}
          </p>
          <h2 className="text-[clamp(1.75rem,5vw,3.25rem)] font-medium leading-[1.05] tracking-tight">
            {contenu.titre}
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">{contenu.texte}</p>

          {contenu.points && (
            <div className="mt-7 flex flex-col gap-4">
              {contenu.points.map((point) => (
                <div key={point.titre} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <Check aria-hidden="true" className="size-4" />
                  </span>
                  <div className="text-sm">
                    <p className="font-bold">{point.titre}</p>
                    <p className="text-muted-foreground">{point.texte}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollReveal>

        <ScrollReveal className={cn(reverse ? "lg:order-1" : undefined)}>
          <Visual />
        </ScrollReveal>
      </div>
    </section>
  );
}
