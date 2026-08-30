import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";

export default function ChapitreLoading() {
  return (
    <div
      className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-8 py-8`}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{ELEVE_FR.chargement}</span>
      <div className="h-6 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="h-10 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-20 animate-pulse rounded-xl border bg-muted/60 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
