import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { validateSessionToken } from "@/lib/auth/session";
import { hasPermission } from "@/modules/acces/permissions";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Préfixes réels du back-office : les groupes de routes `(admin)` ne créent
// aucun segment d'URL, ce sont directement /contenu, /abonnements et
// /parametres. Aucune route /api/admin/* n'existe : les mutations passent par
// des Server Actions postées sur la page elle-même, donc déjà couvertes par
// ces mêmes préfixes.
const PREFIXES_ADMIN = ["/contenu", "/abonnements", "/parametres"];

// Défense en profondeur, en plus (pas à la place) de requirePermission() sur
// chaque page : celui-ci attrape la route qu'on aurait oublié de protéger,
// requirePermission() garde les cas fins qu'un simple préfixe ne peut pas
// connaître (ex. un professeur qui n'a pas accès à cette matière précise).
// Le contrôle réel (validateSessionToken, appel Prisma) exige le runtime
// Node.js : Edge n'a ni `node:crypto` ni le driver Postgres.
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const pathname = request.nextUrl.pathname;

  if (PREFIXES_ADMIN.some((prefixe) => pathname.startsWith(prefixe))) {
    const session = token ? await validateSessionToken(token) : null;
    const autorise =
      session !== null &&
      (hasPermission(session.role, "contenu:gerer") ||
        hasPermission(session.role, "abonnements:gerer"));
    if (!autorise) {
      return NextResponse.redirect(new URL("/connexion", request.url));
    }
  }

  if (!token) {
    return NextResponse.next();
  }

  // Prolonge cosmétiquement la durée de vie du cookie côté navigateur à
  // chaque requête. Ne revalide rien de plus ici : la validité réelle de la
  // session reste vérifiée côté serveur dans requireAuth(), à chaque page
  // protégée (et ci-dessus pour le back-office).
  const response = NextResponse.next();
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export const runtime = "nodejs";

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
