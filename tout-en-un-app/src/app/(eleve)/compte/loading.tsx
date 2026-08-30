import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";

export default function CompteLoading() {
  return (
    <div
      className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-6 py-8`}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{ELEVE_FR.chargement}</span>
      <div className="h-8 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="h-40 animate-pulse rounded-2xl border bg-muted/60 motion-reduce:animate-none" />
      <div className="h-40 animate-pulse rounded-2xl border bg-muted/60 motion-reduce:animate-none" />
    </div>
  );
}
