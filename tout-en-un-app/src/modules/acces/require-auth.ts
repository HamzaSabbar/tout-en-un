import { redirect } from "next/navigation";
import { getCurrentUser, type UtilisateurSafe } from "@/lib/auth/current-user";
import { hasPermission, type Permission } from "@/modules/acces/permissions";

export async function requireAuth(): Promise<UtilisateurSafe> {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) {
    redirect("/connexion");
  }
  return utilisateur;
}

export async function requirePermission(
  permission: Permission,
): Promise<UtilisateurSafe> {
  const utilisateur = await requireAuth();
  if (!hasPermission(utilisateur.role, permission)) {
    redirect("/connexion");
  }
  return utilisateur;
}

// Pour un layout partagé par plusieurs sections du back-office. Chaque page
// garde sa propre vérification exacte via requirePermission (invariant 7).
export async function requireAnyPermission(
  permissions: Permission[],
): Promise<UtilisateurSafe> {
  const utilisateur = await requireAuth();
  const autorise = permissions.some((permission) =>
    hasPermission(utilisateur.role, permission),
  );
  if (!autorise) {
    redirect("/connexion");
  }
  return utilisateur;
}
