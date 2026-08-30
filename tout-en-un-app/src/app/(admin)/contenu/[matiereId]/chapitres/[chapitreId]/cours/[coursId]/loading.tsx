import { ADMIN_FR } from "@/lib/i18n/admin.fr";

export default function CoursAdminLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">{ADMIN_FR.chargement}</span>
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      </div>
      {Array.from({ length: 4 }, (_, section) => (
        <section key={section} className="flex flex-col gap-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-16 animate-pulse rounded-lg border bg-muted/60 motion-reduce:animate-none" />
        </section>
      ))}
    </div>
  );
}
