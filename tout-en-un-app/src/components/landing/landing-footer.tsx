import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { LANDING_FR } from "@/lib/i18n/landing.fr";

export function LandingFooter() {
  const f = LANDING_FR.footer;
  return (
    <footer className="border-t border-border py-11">
      <div className="mx-auto grid w-[min(1180px,calc(100%-48px))] grid-cols-1 gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5 text-lg font-extrabold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap aria-hidden="true" className="size-5" />
            </span>
            Tout en Un
          </Link>
          <p className="mt-3.5 max-w-xs text-sm leading-relaxed text-muted-foreground">{f.texte}</p>
        </div>

        <div>
          <p className="mb-3.5 text-sm font-bold">{f.plateforme}</p>
          <a href="#plateforme" className="my-2 block text-sm text-muted-foreground hover:text-foreground">
            {f.cours}
          </a>
          <a href="#accompagnement" className="my-2 block text-sm text-muted-foreground hover:text-foreground">
            {f.seancesLive}
          </a>
          <a href="#professeurs" className="my-2 block text-sm text-muted-foreground hover:text-foreground">
            {f.professeurs}
          </a>
        </div>

        <div>
          <p className="mb-3.5 text-sm font-bold">{f.compte}</p>
          <Link href="/connexion" className="my-2 block text-sm text-muted-foreground hover:text-foreground">
            {f.connexion}
          </Link>
          <Link href="/inscription" className="my-2 block text-sm text-muted-foreground hover:text-foreground">
            {f.inscription}
          </Link>
        </div>
      </div>
    </footer>
  );
}
