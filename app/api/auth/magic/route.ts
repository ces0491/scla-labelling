import { NextResponse } from "next/server";

import { createMagicToken } from "@/lib/auth";
import { sendMagicLink } from "@/lib/email";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

interface Body {
  email?: string;
}

/**
 * POST /api/auth/magic
 *
 * Issues a magic-link email to an invited labeller. To avoid leaking
 * which addresses are invited, the response is the same regardless of
 * whether the email matches a `labellers` row -- only the labeller
 * actually invited will get an email.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const sb = getSupabase();
  const { data: labeller } = await sb
    .from("labellers")
    .select("id, display_name")
    .eq("email", email)
    .maybeSingle();

  if (labeller) {
    try {
      const token = await createMagicToken(labeller.id);
      const link = `${process.env.APP_BASE_URL}/magic?token=${token}`;
      await sendMagicLink({
        to: email,
        link,
        displayName: labeller.display_name,
      });
    } catch (err) {
      console.error("magic-link send failed", err);
      // Mirror the "no info leak" stance -- still 200 to the client.
    }
  }

  return NextResponse.json({ ok: true });
}
