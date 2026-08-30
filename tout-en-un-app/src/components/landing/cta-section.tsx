import Link from "next/link";
import { LANDING_FR } from "@/lib/i18n/landing.fr";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

export function CtaSection() {
  const f = LANDING_FR.cta;
  return (
    <section className="px-6 pb-24 pt-8 sm:pb-32">
      <ScrollReveal className="mx-auto w-[min(1180px,calc(100%-48px))]">
        <div
          className="rounded-[34px] px-6 py-20 text-center text-primary-foreground sm:py-24"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(145deg,var(--blue-800),var(--primary))",
            backgroundSize: "38px 38px,38px 38px,auto",
          }}
        >
          <h2 className="mx-auto max-w-3xl text-[clamp(2rem,6vw,4rem)] font-medium leading-[1.02] tracking-tight">
            {f.titre}
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-primary-foreground/80">{f.texte}</p>
          <Link
            href="/inscription"
            className="mt-8 inline-flex h-13 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-primary"
          >
            {f.bouton}
          </Link>
        </div>
      </ScrollReveal>
    </section>
  );
}
