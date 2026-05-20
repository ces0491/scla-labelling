import { NextResponse } from "next/server";

import { getSessionLabeller } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

interface Body {
  email?: string;
  display_name?: string | null;
}

/**
 * POST /api/admin/invite
 *
 * Admin-only. Adds a `labellers` row so the named email can request
 * a magic link. Does NOT auto-send the link -- the labeller types
 * their email at /login when they're ready to start, which then
 * sends the link. Idempotent: a second invite with the same email
 * is a no-op.
 */
export async function POST(req: Request) {
  const me = await getSessionLabeller();
  if (!me) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!me.is_admin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Body;
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const sb = getSupabase();
  const { error } = await sb.from("labellers").upsert(
    {
      email,
      display_name: body.display_name?.trim() || null,
      is_admin: false,
    },
    { onConflict: "email", ignoreDuplicates: true },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
