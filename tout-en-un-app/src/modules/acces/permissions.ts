import { Role } from "@/generated/prisma";

export type Permission =
  | "contenu:gerer"
  | "exercices:gerer"
  | "lives:gerer"
  | "support:repondre"
  | "abonnements:gerer";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  eleve: [],
  admin: [
    "contenu:gerer",
    "exercices:gerer",
    "lives:gerer",
    "support:repondre",
    "abonnements:gerer",
  ],
  professeur: ["contenu:gerer", "exercices:gerer", "lives:gerer", "support:repondre"],
  support: ["support:repondre"],
  commercial: ["abonnements:gerer"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === "admin") {
    return true;
  }
  return ROLE_PERMISSIONS[role].includes(permission);
}
