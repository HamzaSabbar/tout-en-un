"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FolderOpen, Inbox, Layers, Tag, Users, type LucideIcon } from "lucide-react";
import { ADMIN_FR } from "@/lib/i18n/admin.fr";
import { cn } from "@/lib/utils";

const LIENS_CONTENU = [
  { href: "/contenu/matieres", label: ADMIN_FR.navigation.matieres, icone: BookOpen },
  { href: "/contenu/filieres", label: ADMIN_FR.navigation.filieres, icone: Layers },
  { href: "/contenu/fichiers", label: ADMIN_FR.navigation.mediatheque, icone: FolderOpen },
] as const;

const LIENS_ABONNEMENTS = [
  { href: "/abonnements", label: ADMIN_FR.navigation.demandes, icone: Inbox },
  { href: "/abonnements/eleves", label: ADMIN_FR.navigation.eleves, icone: Users },
  { href: "/abonnements/offres", label: ADMIN_FR.navigation.offres, icone: Tag },
] as const;

function GroupeLiens({
  titre,
  liens,
}: {
  titre: string;
  liens: readonly { href: string; label: string; icone: LucideIcon }[];
}) {
  const pathname = usePathname();

  return (
    <div>
      <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {titre}
      </p>
      <nav className="flex flex-col gap-1">
        {liens.map(({ href, label, icone: Icone }) => {
          const actif = href === "/abonnements" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={actif ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                actif ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted",
              )}
            >
              <Icone aria-hidden="true" className={cn("size-4", actif ? "text-primary" : "text-muted-foreground")} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AdminNav({
  gereContenu,
  gereAbonnements,
}: {
  gereContenu: boolean;
  gereAbonnements: boolean;
}) {
  return (
    <div className="flex flex-col gap-5 p-2">
      {gereContenu && <GroupeLiens titre={ADMIN_FR.navigation.contenu} liens={LIENS_CONTENU} />}
      {gereAbonnements && <GroupeLiens titre={ADMIN_FR.navigation.abonnements} liens={LIENS_ABONNEMENTS} />}
    </div>
  );
}
