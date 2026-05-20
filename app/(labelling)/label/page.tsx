"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GESTURES, KEY_BINDINGS, NONE_CODE } from "@/lib/gestures";

interface TaskPayload {
  task: {
    id: string;
    task_type: string;
    match_id: string;
    frame_idx: number;
    anchor: string | null;
    anchor_time_s: number | null;
    offset_s: number | null;
    signed_url: string;
  };
  progress: {
    total_in_queue: number;
    labelled_by_me: number;
  };
}

export default function LabellingPage() {
  const [data, setData] = useState<TaskPayload | null>(null);
  const [empty, setEmpty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<"high" | "medium">("high");
  const [toast, setToast] = useState<string | null>(null);
  // Initialised to 0; reload() bumps it to Date.now() once the next task
  // is in hand. Lint rule `react-hooks/purity` rejects Date.now() called
  // during render (the useRef initialiser runs during render).
  const taskStartRef = useRef<number>(0);

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/next-task?task_type=gesture");
      if (res.status === 204) {
        setEmpty(true);
        setData(null);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = (await res.json()) as TaskPayload;
      setData(body);
      setEmpty(false);
      taskStartRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submit = useCallback(
    async (gesture: string) => {
      if (!data || busy) return;
      const taskId = data.task.id;
      const durationMs = Date.now() - taskStartRef.current;
      setBusy(true);
      try {
        const res = await fetch("/api/label", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task_id: taskId,
            gesture,
            confidence,
            duration_ms: durationMs,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setToast(gesture);
        setTimeout(() => setToast(null), 900);
        void reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
        setBusy(false);
      }
    },
    [data, busy, confidence, reload],
  );

  // Keyboard bindings: number/q/w for the 12 classes, n for none.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      if (k === "n") {
        e.preventDefault();
        void submit(NONE_CODE);
        return;
      }
      const idx = KEY_BINDINGS.indexOf(k);
      if (idx >= 0 && idx < GESTURES.length) {
        e.preventDefault();
        void submit(GESTURES[idx].code);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit]);

  const anchorPill = useMemo(() => {
    if (!data) return null;
    const a = data.task.anchor ?? "unknown";
    const tone = a === "whistle"
      ? "bg-blue-600/20 text-blue-300"
      : a === "score"
      ? "bg-green-600/20 text-green-300"
      : "bg-amber-600/20 text-amber-300";
    return (
      <span className={`inline-block rounded px-2 py-0.5 text-xs ${tone}`}>
        {a}
        {data.task.anchor_time_s != null
          ? `  t=${data.task.anchor_time_s.toFixed(1)}s`
          : ""}
        {data.task.offset_s != null
          ? `  +${data.task.offset_s.toFixed(1)}s`
          : ""}
      </span>
    );
  }, [data]);

  if (empty) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-[var(--accent)]">
          Queue empty
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          No more tasks for you right now. Check back later or ask Ces to
          push another batch.
        </p>
        <p className="mt-6">
          <form action="/api/auth/logout" method="post" className="inline">
            <button
              type="submit"
              className="text-xs text-[var(--muted)] underline"
            >
              Sign out
            </button>
          </form>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--accent)]">
          Label gestures
        </h1>
        <div className="text-xs text-[var(--muted)]">
          {data
            ? `${data.progress.labelled_by_me} done · ${data.progress.total_in_queue} in your queue`
            : ""}
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[3fr_1fr]">
        <div>
          <div className="rounded border border-[var(--muted)]/20 bg-[var(--panel)]">
            {data ? (
              <Image
                src={data.task.signed_url}
                alt={`frame ${data.task.frame_idx}`}
                width={1280}
                height={720}
                unoptimized
                className="block max-h-[70vh] w-full object-contain"
                priority
              />
            ) : (
              <div className="aspect-video animate-pulse bg-[var(--muted)]/10" />
            )}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-[var(--muted)]">
            {data && (
              <>
                <span>frame {data.task.frame_idx}</span>
                <span>·</span>
                <span>{data.task.match_id}</span>
                <span>·</span>
                {anchorPill}
              </>
            )}
          </div>
          {error && (
            <div className="mt-3 rounded bg-red-600/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
          <div className="mt-3 text-xs text-[var(--muted)]">
            Keys: <kbd>1-9</kbd> <kbd>0</kbd> <kbd>q</kbd> <kbd>w</kbd>{" "}
            label · <kbd>n</kbd> no gesture
          </div>
        </div>

        <aside>
          <div className="space-y-1.5">
            {GESTURES.map((g, i) => (
              <button
                key={g.code}
                onClick={() => submit(g.code)}
                disabled={busy}
                className="flex w-full items-start gap-2 rounded border border-[var(--muted)]/20 bg-[var(--panel)] p-2 text-left text-xs hover:border-[var(--accent)]/60 disabled:opacity-50"
              >
                <span className="inline-block min-w-[1.5em] rounded bg-[var(--accent)] px-1 text-center font-mono text-[var(--bg)]">
                  {KEY_BINDINGS[i]}
                </span>
                <span className="flex-1">
                  <span className="font-semibold text-[var(--accent)]">
                    {g.code}
                  </span>
                  <span className="block text-[var(--muted)]">
                    {g.description}
                  </span>
                  <span className="block text-[10px] text-[var(--muted)]/70">
                    {g.lawCitation}
                  </span>
                </span>
              </button>
            ))}
            <button
              onClick={() => submit(NONE_CODE)}
              disabled={busy}
              className="flex w-full items-start gap-2 rounded border border-[var(--muted)]/20 bg-[#2a2f3e] p-2 text-left text-xs hover:border-[var(--accent)]/60 disabled:opacity-50"
            >
              <span className="inline-block min-w-[1.5em] rounded bg-[var(--accent)] px-1 text-center font-mono text-[var(--bg)]">
                n
              </span>
              <span className="flex-1">
                <span className="font-semibold">none</span>
                <span className="block text-[var(--muted)]">
                  No referee gesture in this frame (random-negative
                  training signal).
                </span>
              </span>
            </button>
          </div>

          <label className="mt-4 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={confidence === "medium"}
              onChange={(e) =>
                setConfidence(e.target.checked ? "medium" : "high")
              }
            />
            Medium-confidence (ambiguous frame)
          </label>

          <form
            action="/api/auth/logout"
            method="post"
            className="mt-6 text-right"
          >
            <button
              type="submit"
              className="text-xs text-[var(--muted)] underline"
            >
              Sign out
            </button>
          </form>
        </aside>
      </div>

      {toast && (
        <div className="fixed top-6 right-6 rounded bg-[var(--accent)]/90 px-3 py-1.5 text-sm font-medium text-[var(--bg)]">
          {toast}
        </div>
      )}
    </main>
  );
}
