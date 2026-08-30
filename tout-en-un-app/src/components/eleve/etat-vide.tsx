import type { LucideIcon } from "lucide-react";

interface EtatVideProps {
  icone: LucideIcon;
  titre: string;
  texte?: string;
}

// État vide compact et cohérent, réutilisé partout où une ressource ou une
// fonctionnalité n'a encore rien à montrer : jamais une grande zone blanche
// avec un seul mot, toujours une icône, un titre et une phrase courte.
export function EtatVide({ icone: Icone, titre, texte }: EtatVideProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed p-4">
      <Icone aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-body-sm font-medium">{titre}</p>
        {texte && <p className="text-caption text-muted-foreground">{texte}</p>}
      </div>
    </div>
  );
}
