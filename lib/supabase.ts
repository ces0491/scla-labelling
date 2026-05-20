import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client.
 *
 * Talks to Postgres with the service-role key; the browser never gets
 * this key. Every Next.js Route Handler that touches the DB calls
 * getSupabase() and runs its query through this client.
 *
 * RLS is intentionally NOT enabled on the DB -- tenancy is enforced
 * at the API-route layer because every protected query scopes by
 * session.labeller_id. Service-role auth bypasses RLS anyway, so
 * enabling RLS would give a false sense of security.
 */

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL + " +
        "SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
