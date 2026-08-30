import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";

export default function MatieresLoading() {
  return (
    <div
      className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-8 py-8`}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{ELEVE_FR.chargement}</span>
      <div className="h-28 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none sm:h-32" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-32 animate-pulse rounded-xl border bg-muted/60 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
