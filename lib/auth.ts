import { cookies } from "next/headers";
import { randomBytes } from "crypto";

import { getSupabase } from "@/lib/supabase";

/**
 * Session + magic-token helpers.
 *
 * The session model:
 *
 * - A labeller types their email at /login -> /api/auth/magic.
 * - That route inserts a magic_tokens row + emails the labeller a
 *   link to /magic?token=<token>.
 * - Clicking the link hits /api/auth/callback?token=<...>, which
 *   validates the token, creates a session row, and sets the
 *   ``scla_lbl`` cookie (HttpOnly, Secure, SameSite=Lax).
 * - Every protected route (middleware.ts + Route Handlers) calls
 *   requireSession() which reads the cookie, looks the session up,
 *   bumps last_active_at, and returns the labeller row.
 *
 * No external auth library. The plumbing is small and easier to audit
 * inline than to wire a Supabase Auth or NextAuth dependency.
 */

export const SESSION_COOKIE_NAME = "scla_lbl";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const MAGIC_TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes

export interface SessionLabeller {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
}

export function generateToken(byteLen = 32): string {
  return randomBytes(byteLen).toString("hex");
}

/**
 * Create a magic-link row for `labeller_id` and return the token.
 * Caller is responsible for emailing the actual link.
 */
export async function createMagicToken(labellerId: string): Promise<string> {
  const token = generateToken(32);
  const expires_at = new Date(Date.now() + MAGIC_TOKEN_TTL_MS).toISOString();
  const sb = getSupabase();
  const { error } = await sb
    .from("magic_tokens")
    .insert({ token, labeller_id: labellerId, expires_at });
  if (error) throw new Error(`magic_tokens insert failed: ${error.message}`);
  return token;
}

/**
 * Exchange a magic token for a session.
 *
 * Validates that the token exists, is unused, and unexpired. Marks
 * used_at on success. Returns the new session id (to be set as
 * the cookie) and the labeller. Rejects with `null` on any failure
 * mode so callers can return a single "Link expired or already used"
 * UI without leaking which case fired.
 */
export async function exchangeMagicToken(
  token: string,
): Promise<{ sessionId: string; labeller: SessionLabeller } | null> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  // Read the token row first so we can branch on the failure mode.
  const { data: row } = await sb
    .from("magic_tokens")
    .select("labeller_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  // Mark used + create session in a tight pair. Postgres-level
  // atomicity isn't critical: a token that hits this code path twice
  // would just create a second session, which is harmless.
  await sb
    .from("magic_tokens")
    .update({ used_at: now })
    .eq("token", token);

  const { data: labeller } = await sb
    .from("labellers")
    .select("id, email, display_name, is_admin")
    .eq("id", row.labeller_id)
    .single();
  if (!labeller) return null;

  const sessionId = generateToken(32);
  const expires_at = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const { error: sessErr } = await sb
    .from("sessions")
    .insert({
      id: sessionId,
      labeller_id: labeller.id,
      expires_at,
      last_active_at: now,
    });
  if (sessErr) throw new Error(`session insert failed: ${sessErr.message}`);

  // Stamp first_seen_at if this is the labeller's first sign-in.
  await sb
    .from("labellers")
    .update({
      first_seen_at: now,
      last_active_at: now,
    })
    .eq("id", labeller.id)
    .is("first_seen_at", null);

  return { sessionId, labeller };
}

/**
 * Look up the labeller for the current request's session cookie.
 * Returns null when there's no cookie, the cookie value isn't in the
 * sessions table, or the session has expired.
 */
export async function getSessionLabeller(): Promise<SessionLabeller | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const sb = getSupabase();
  const { data: session } = await sb
    .from("sessions")
    .select("labeller_id, expires_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  const { data: labeller } = await sb
    .from("labellers")
    .select("id, email, display_name, is_admin")
    .eq("id", session.labeller_id)
    .single();
  if (!labeller) return null;

  // Best-effort last_active bump; never blocks the request.
  void sb
    .from("sessions")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", sessionId);

  return labeller;
}

/** Delete the current session row + clear the cookie. */
export async function clearSession(): Promise<void> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    const sb = getSupabase();
    await sb.from("sessions").delete().eq("id", sessionId);
  }
  jar.delete(SESSION_COOKIE_NAME);
}

export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
