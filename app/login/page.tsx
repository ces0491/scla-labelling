"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-[var(--accent)]">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Type the email Ces invited you with. We&apos;ll send you a one-time
        sign-in link.
      </p>

      {sent ? (
        <div className="mt-6 rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 text-sm">
          Check your inbox. The link is valid for 30 minutes.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-md border border-[var(--muted)]/30 bg-[var(--panel)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          {error && (
            <div className="rounded-md bg-red-600/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#0f1117] disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
      )}

      <p className="mt-8 text-xs text-[var(--muted)]">
        No account? Ask Ces for an invite. There&apos;s no public sign-up.
      </p>
    </main>
  );
}
