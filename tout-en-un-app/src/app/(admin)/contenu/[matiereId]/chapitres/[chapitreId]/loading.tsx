import { ADMIN_FR } from "@/lib/i18n/admin.fr";

export default function ChapitreAdminLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">{ADMIN_FR.chargement}</span>
      <div className="h-8 w-56 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-16 animate-pulse rounded-lg border bg-muted/60 motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-xl border bg-muted/60 motion-reduce:animate-none" />
    </div>
  );
}
