"use client";

import { useCallback, useEffect, useState } from "react";

interface LabellerRow {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  invited_at: string;
  first_seen_at: string | null;
  last_active_at: string | null;
  labels_count: number;
}

interface ClassCount {
  gesture: string;
  n: number;
}

interface Stats {
  labellers: LabellerRow[];
  class_counts: ClassCount[];
  total_tasks: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) {
        setError(
          "You're not an admin. Set is_admin = true on your labellers row.",
        );
        return;
      }
      if (!res.ok) {
        throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      }
      setStats((await res.json()) as Stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          display_name: inviteName.trim() || null,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      }
      setInviteEmail("");
      setInviteName("");
      void reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-[var(--accent)]">Admin</h1>
        <p className="mt-4 text-sm text-red-400">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-[var(--accent)]">Admin</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Invite labellers, see who&apos;s contributed what, watch class
        balance.
      </p>

      <section className="mt-8 rounded border border-[var(--muted)]/20 bg-[var(--panel)] p-4">
        <h2 className="text-lg font-semibold">Invite a labeller</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Adds an email to the allowlist. The labeller types the same
          email at /login when they&apos;re ready to start; the magic link
          goes out then.
        </p>
        <form onSubmit={invite} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            className="rounded border border-[var(--muted)]/30 bg-[var(--bg)] px-3 py-2 text-sm"
          />
          <input
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Display name (optional)"
            className="rounded border border-[var(--muted)]/30 bg-[var(--bg)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg)] disabled:opacity-60"
          >
            Invite
          </button>
        </form>
      </section>

      <section className="mt-6 rounded border border-[var(--muted)]/20 bg-[var(--panel)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Per-class counts</h2>
          <span className="text-xs text-[var(--muted)]">
            {stats?.total_tasks ?? "—"} total tasks
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats?.class_counts.map((c) => (
            <div
              key={c.gesture}
              className="rounded border border-[var(--muted)]/20 bg-[var(--bg)] px-3 py-2"
            >
              <div className="font-mono text-xs text-[var(--muted)]">
                {c.gesture}
              </div>
              <div className="text-lg font-semibold">{c.n}</div>
            </div>
          ))}
          {stats && stats.class_counts.length === 0 && (
            <div className="col-span-full text-sm text-[var(--muted)]">
              No labels yet.
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded border border-[var(--muted)]/20 bg-[var(--panel)] p-4">
        <h2 className="text-lg font-semibold">Labellers</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="text-left font-medium">Email</th>
              <th className="text-left font-medium">Name</th>
              <th className="text-left font-medium">Invited</th>
              <th className="text-left font-medium">Last active</th>
              <th className="text-right font-medium">Labels</th>
            </tr>
          </thead>
          <tbody>
            {stats?.labellers.map((l) => (
              <tr key={l.id} className="border-t border-[var(--muted)]/10">
                <td className="py-2">
                  {l.email}{" "}
                  {l.is_admin && (
                    <span className="ml-1 rounded bg-[var(--accent)]/20 px-1.5 text-[10px] text-[var(--accent)]">
                      admin
                    </span>
                  )}
                </td>
                <td>{l.display_name ?? "—"}</td>
                <td className="text-[var(--muted)]">
                  {l.invited_at
                    ? new Date(l.invited_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="text-[var(--muted)]">
                  {l.last_active_at
                    ? new Date(l.last_active_at).toLocaleString()
                    : "—"}
                </td>
                <td className="text-right font-semibold">{l.labels_count}</td>
              </tr>
            ))}
            {stats && stats.labellers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-sm text-[var(--muted)]">
                  No labellers yet. Seed yourself via the SQL editor first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <form action="/api/auth/logout" method="post" className="mt-8 text-right">
        <button
          type="submit"
          className="text-xs text-[var(--muted)] underline"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
