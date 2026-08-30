import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";

export default function ExamensLoading() {
  return (
    <div
      className={`${COQUILLE_ELEVE} flex min-h-screen flex-col gap-8 py-8`}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{ELEVE_FR.chargement}</span>
      <div className="h-5 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="h-28 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none sm:h-32" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-28 animate-pulse rounded-xl border bg-muted/60 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
