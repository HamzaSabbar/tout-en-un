import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { LANDING_FR } from "@/lib/i18n/landing.fr";

const LIENS = [
  { href: "#plateforme", label: LANDING_FR.nav.plateforme },
  { href: "#accompagnement", label: LANDING_FR.nav.accompagnement },
  { href: "#professeurs", label: LANDING_FR.nav.professeurs },
  { href: "#tarifs", label: LANDING_FR.nav.tarifs },
] as const;

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex h-[78px] w-[min(1180px,calc(100%-48px))] items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-extrabold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_28px_-6px_rgba(10,19,235,0.45)]">
            <GraduationCap aria-hidden="true" className="size-5" />
          </span>
          Tout en Un
        </Link>

        <div className="hidden items-center gap-7 text-sm font-semibold md:flex">
          {LIENS.map((lien) => (
            <a key={lien.href} href={lien.href} className="text-foreground/80 hover:text-foreground">
              {lien.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/connexion"
            className="hidden text-sm font-semibold text-foreground/80 hover:text-foreground sm:block"
          >
            {LANDING_FR.nav.connexion}
          </Link>
          <Link
            href="/inscription"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_14px_32px_-10px_rgba(10,19,235,0.55)] transition-transform active:translate-y-px"
          >
            {LANDING_FR.nav.cta}
          </Link>
        </div>
      </div>
    </nav>
  );
}
