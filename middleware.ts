import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth";

/**
 * Route gate.
 *
 * The middleware only checks whether the session cookie is PRESENT --
 * it does not validate the session against the DB (Postgres isn't
 * reachable from the Edge runtime, and the middleware is a hot path).
 * Server components and Route Handlers re-check the cookie via
 * `getSessionLabeller()` before returning data, so a stale cookie
 * gets rejected one layer in.
 *
 * Protected: /label, /admin, /api/next-task, /api/label, /api/admin/*
 * Public: /, /login, /magic, /api/auth/*, static assets.
 */

const PROTECTED_PREFIXES = [
  "/label",
  "/admin",
  "/api/next-task",
  "/api/label",
  "/api/admin",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookie) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 },
    );
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match every path except static files and Next.js internals so
     * we don't pay the middleware cost on every image request.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
