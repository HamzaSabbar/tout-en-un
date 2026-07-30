import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Prolonge cosmétiquement la durée de vie du cookie côté navigateur à chaque
// requête. Ne valide rien : la validité réelle de la session reste vérifiée
// uniquement côté serveur, dans requireAuth(), à chaque page protégée.
export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.next();
  }

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

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
