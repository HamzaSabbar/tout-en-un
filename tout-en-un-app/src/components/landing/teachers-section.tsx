import { LANDING_FR } from "@/lib/i18n/landing.fr";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

export function TeachersSection() {
  const f = LANDING_FR.professeurs;
  return (
    <section id="professeurs" className="bg-muted/20 py-24 sm:py-32">
      <div className="mx-auto w-[min(1180px,calc(100%-48px))]">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(1.75rem,5vw,3.25rem)] font-medium leading-[1.05] tracking-tight">
            {f.titre}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">{f.texte}</p>
        </ScrollReveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {f.liste.map((professeur) => (
            <ScrollReveal key={professeur.nom}>
              <article className="overflow-hidden rounded-3xl border border-border bg-card">
                <div className="relative h-72 bg-gradient-to-br from-blue-100 to-blue-200">
                  <div className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-[42%] rounded-full bg-card shadow-[0_0_0_28px_rgba(10,19,235,0.08)]" />
                </div>
                <div className="p-5">
                  <p className="font-bold">{professeur.nom}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{professeur.role}</p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
