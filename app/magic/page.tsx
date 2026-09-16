"use client";

import { Suspense, useEffect, useState } from "react";
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
 *
 * `useSearchParams()` opts the subtree into client-side rendering, so it
 * MUST sit under a Suspense boundary or prerendering this route fails the
 * production build outright ("should be wrapped in a suspense boundary").
 * That is why the reader is a child component rather than the page body.
 */
function MagicInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const next = params.get("next") ?? "/label";

  // Derived at render, not set from inside the effect: a missing token is
  // knowable immediately, and setting state synchronously in an effect
  // costs an extra render pass (react-hooks/set-state-in-effect).
  const [error, setError] = useState<string | null>(
    token ? null : "Missing sign-in token. The link may have been truncated.",
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
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
        if (!cancelled) router.replace(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Sign-in failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, next, router]);

  return <MagicShell error={error} />;
}

function MagicShell({ error }: { error: string | null }) {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-[var(--accent)]">
        {error === null ? "Signing you in…" : "Sign-in failed"}
      </h1>
      {error !== null && (
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

export default function MagicPage() {
  return (
    <Suspense fallback={<MagicShell error={null} />}>
      <MagicInner />
    </Suspense>
  );
}
