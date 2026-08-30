import Link from "next/link";
import { listerOffresActives } from "@/modules/abonnement/offre";
import { LANDING_FR } from "@/lib/i18n/landing.fr";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { cn } from "@/lib/utils";

export async function PricingSection() {
  const f = LANDING_FR.tarifs;
  const offres = await listerOffresActives();
  const idOffrePhare = offres.length > 1 ? offres[offres.length - 1].id : null;

  return (
    <section id="tarifs" className="py-24 sm:py-32">
      <div className="mx-auto w-[min(1180px,calc(100%-48px))]">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-[13px] font-extrabold uppercase tracking-wide text-primary">{f.label}</p>
          <h2 className="text-[clamp(1.75rem,5vw,3.25rem)] font-medium leading-[1.05] tracking-tight">
            {f.titre}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">{f.texte}</p>
        </ScrollReveal>

        {offres.length === 0 ? (
          <p className="mt-14 text-center text-sm text-muted-foreground">{f.vide}</p>
        ) : (
          <div
            className={cn(
              "mx-auto mt-14 grid max-w-4xl gap-5",
              offres.length === 1 ? "max-w-md" : "sm:grid-cols-2",
            )}
          >
            {offres.map((offre) => {
              const phare = offre.id === idOffrePhare;
              return (
                <ScrollReveal key={offre.id.toString()}>
                  <article
                    className={cn(
                      "flex h-full flex-col rounded-[30px] border p-8",
                      phare
                        ? "border-primary/30 bg-[radial-gradient(circle_at_100%_0%,rgba(10,19,235,0.08),transparent_34%)] shadow-[0_28px_80px_-24px_rgba(10,19,235,0.35)]"
                        : "border-border",
                    )}
                  >
                    <span className="mb-5 inline-flex w-fit rounded-full bg-secondary px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-secondary-foreground">
                      {phare ? f.badgePhare : f.badgeStandard}
                    </span>
                    <h3 className="text-xl font-bold tracking-tight">{offre.libelle}</h3>
                    {offre.description && (
                      <p className="mt-2 min-h-11 text-sm leading-relaxed text-muted-foreground">
                        {offre.description}
                      </p>
                    )}

                    <div className="mt-5 flex items-end gap-2">
                      <strong className="text-5xl font-semibold tracking-tight">
                        {offre.prix.toString()}
                      </strong>
                      <span className="mb-1.5 text-sm text-muted-foreground">{f.unite}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {f.valable} {offre.duree_jours} {f.jours} ·{" "}
                      {offre.nb_matieres > 1 ? `${offre.nb_matieres} ${f.matieresUnite}` : f.matiereUnite}
                    </p>

                    <Link
                      href="/inscription"
                      className={cn(
                        "mt-7 inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-bold",
                        phare
                          ? "bg-primary text-primary-foreground shadow-[0_14px_32px_-10px_rgba(10,19,235,0.5)]"
                          : "border border-border",
                      )}
                    >
                      {f.cta}
                    </Link>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        )}

        <ScrollReveal>
          <p className="mt-8 text-center text-xs text-muted-foreground">{f.note}</p>
        </ScrollReveal>
      </div>
    </section>
  );
}
