import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  exchangeMagicToken,
} from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/callback?token=<token>
 *
 * Validates the magic token, creates a session, sets the
 * ``scla_lbl`` HttpOnly cookie. The login flow's client-side magic
 * page calls this and then router.replace()s to /label.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const result = await exchangeMagicToken(token);
  if (!result) {
    return NextResponse.json(
      { error: "Link expired or already used." },
      { status: 401 },
    );
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, result.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return NextResponse.json({
    ok: true,
    labeller: {
      id: result.labeller.id,
      email: result.labeller.email,
      display_name: result.labeller.display_name,
      is_admin: result.labeller.is_admin,
    },
  });
}
