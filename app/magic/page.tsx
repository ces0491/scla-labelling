"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Magic-link landing.
 *
 * The link in the email points here with `?token=...`. We forward to
 * the server callback which validates the token, sets the session
 * cookie, and bounces us to /label (or wherever `next` says).
 *
 * Done as a client component so the cookie set by /api/auth/callback
 * is available on the subsequent /label page load -- Next 16 sets
 * cookies on the response that the redirect's TARGET request reads.
 */
export default function MagicPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    const next = params.get("next") ?? "/label";
    if (!token) {
      setStatus("error");
      setError("Missing sign-in token. The link may have been truncated.");
      return;
    }
    void (async () => {
      try {
        const res = await fetch(
          `/api/auth/callback?token=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Link expired or already used.");
        }
        router.replace(next);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Sign-in failed");
      }
    })();
  }, [params, router]);

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-[var(--accent)]">
        {status === "verifying" ? "Signing you in…" : "Sign-in failed"}
      </h1>
      {status === "error" && (
        <>
          <p className="mt-4 text-sm text-red-400">{error}</p>
          <p className="mt-6 text-sm">
            <a href="/login" className="underline">
              Request a new sign-in link
            </a>
          </p>
        </>
      )}
    </main>
  );
}
