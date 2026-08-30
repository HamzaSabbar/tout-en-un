import { COQUILLE_ELEVE } from "@/components/eleve/coquille";
import { ELEVE_FR } from "@/lib/i18n/eleve.fr";

export default function CoursLoading() {
  return (
    <div className={`${COQUILLE_ELEVE} py-8`} aria-busy="true" aria-live="polite">
      <span className="sr-only">{ELEVE_FR.chargement}</span>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="h-5 w-56 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-10 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="flex gap-2 border-b pb-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className="h-8 w-20 animate-pulse rounded-full bg-muted motion-reduce:animate-none"
              />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className="h-40 animate-pulse rounded-xl border bg-muted/60 motion-reduce:animate-none"
              />
            ))}
          </div>
        </div>
        <div className="hidden h-64 animate-pulse rounded-xl border bg-muted/60 motion-reduce:animate-none lg:block" />
      </div>
    </div>
  );
}
