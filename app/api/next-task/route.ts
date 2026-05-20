import { NextResponse } from "next/server";

import { getSessionLabeller } from "@/lib/auth";
import { signFrameUrl } from "@/lib/r2";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

interface TaskRow {
  id: string;
  task_type: string;
  match_id: string;
  frame_idx: number;
  anchor: string | null;
  anchor_time_s: number | null;
  offset_s: number | null;
  r2_frame_key: string;
  required_labels: number;
  assigned_to: string | null;
  created_at: string;
}

/**
 * GET /api/next-task?task_type=gesture
 *
 * Returns the next task the calling labeller should label, OR a 204
 * if the queue is empty. The next task is:
 *
 *   - Either explicitly assigned to this labeller (assigned_to = me),
 *   - OR open (assigned_to IS NULL),
 *
 * AND has no `labels` row from this labeller yet (so a labeller never
 * re-sees a frame they already labelled), AND has fewer existing
 * labels than `required_labels` (so once enough other labellers
 * cover a frame it leaves the queue).
 *
 * Ordering: prefer assigned tasks, then by creation time. Stable
 * within a labeller so reloading the page returns the same frame.
 */
export async function GET(req: Request) {
  const me = await getSessionLabeller();
  if (!me) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const taskType = url.searchParams.get("task_type") ?? "gesture";

  const sb = getSupabase();

  // Subquery: tasks already labelled by me. Postgres rejects
  // .not("id", "in", subselect) in supabase-js, so we pull task_ids
  // explicitly first and then filter.
  const { data: doneRows, error: doneErr } = await sb
    .from("labels")
    .select("task_id")
    .eq("labeller_id", me.id);
  if (doneErr) {
    return NextResponse.json({ error: doneErr.message }, { status: 500 });
  }
  const doneTaskIds = new Set((doneRows ?? []).map((r) => r.task_id));

  // Pull a small batch of candidate tasks. assigned_to = me first,
  // then open tasks. Filter the "already labelled by me" set out in
  // JS (small list, cheap).
  const { data: candidates, error: candErr } = await sb
    .from("tasks")
    .select(
      "id, task_type, match_id, frame_idx, anchor, anchor_time_s, " +
        "offset_s, r2_frame_key, required_labels, assigned_to, created_at",
    )
    .eq("task_type", taskType)
    .or(`assigned_to.eq.${me.id},assigned_to.is.null`)
    .order("assigned_to", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(50)
    .returns<TaskRow[]>();
  if (candErr) {
    return NextResponse.json({ error: candErr.message }, { status: 500 });
  }

  const fresh: TaskRow[] = (candidates ?? []).filter(
    (c) => !doneTaskIds.has(c.id),
  );
  if (fresh.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  // For each candidate, check label count vs required_labels. The
  // count check could be a single GROUP BY query, but the candidate
  // pool is tiny (<= 50) so an N-query check is fine and keeps the
  // SQL simple to read.
  let chosen: TaskRow | null = null;
  for (const c of fresh) {
    const { count } = await sb
      .from("labels")
      .select("id", { count: "exact", head: true })
      .eq("task_id", c.id);
    if ((count ?? 0) < c.required_labels) {
      chosen = c;
      break;
    }
  }
  if (!chosen) {
    return new NextResponse(null, { status: 204 });
  }

  // Aggregate progress for the labeller's UI.
  const totalQueueQuery = sb
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("task_type", taskType)
    .or(`assigned_to.eq.${me.id},assigned_to.is.null`);
  const myLabelledQuery = sb
    .from("labels")
    .select("id", { count: "exact", head: true })
    .eq("labeller_id", me.id);
  const [totalRes, myRes] = await Promise.all([
    totalQueueQuery,
    myLabelledQuery,
  ]);

  const signed_url = await signFrameUrl(chosen.r2_frame_key);

  return NextResponse.json({
    task: {
      id: chosen.id,
      task_type: chosen.task_type,
      match_id: chosen.match_id,
      frame_idx: chosen.frame_idx,
      anchor: chosen.anchor,
      anchor_time_s: chosen.anchor_time_s,
      offset_s: chosen.offset_s,
      signed_url,
    },
    progress: {
      total_in_queue: totalRes.count ?? 0,
      labelled_by_me: myRes.count ?? 0,
    },
  });
}
