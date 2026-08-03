import { ELEVE_FR } from "@/lib/i18n/eleve.fr";

export default function MatieresLoading() {
  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{ELEVE_FR.chargement}</span>
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-28 animate-pulse rounded-xl border bg-muted/60 motion-reduce:animate-none"
          />
        ))}
      </div>
    </main>
  );
}
