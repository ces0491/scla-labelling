import { NextResponse } from "next/server";

import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

interface TaskInput {
  match_id: string;
  frame_idx: number;
  task_type?: string;
  anchor?: string | null;
  anchor_time_s?: number | null;
  offset_s?: number | null;
  r2_frame_key: string;
  required_labels?: number;
  assigned_to?: string | null;
}

interface Body {
  tasks?: TaskInput[];
}

/**
 * POST /api/admin/tasks
 *
 * Bulk-insert tasks. Authenticates via the ADMIN_API_KEY shared
 * secret (passed in the ``X-Admin-Key`` header) rather than a
 * labeller session, because this endpoint is called from
 * server-to-server jobs (the SCLA repo's push_labelling_tasks.py)
 * and a magic-link session isn't appropriate there.
 *
 * Idempotent via the unique(task_type, match_id, frame_idx)
 * constraint -- re-pushing the same batch is a no-op (rows with
 * existing keys are ignored).
 */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "server misconfigured: ADMIN_API_KEY not set" },
      { status: 503 },
    );
  }
  if (req.headers.get("x-admin-key") !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const tasks = body.tasks ?? [];
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json(
      { error: "tasks array required" },
      { status: 400 },
    );
  }

  const rows = tasks.map((t) => ({
    task_type: t.task_type ?? "gesture",
    match_id: t.match_id,
    frame_idx: t.frame_idx,
    anchor: t.anchor ?? null,
    anchor_time_s: t.anchor_time_s ?? null,
    offset_s: t.offset_s ?? null,
    r2_frame_key: t.r2_frame_key,
    required_labels: t.required_labels ?? 1,
    assigned_to: t.assigned_to ?? null,
  }));

  const sb = getSupabase();
  const { error } = await sb
    .from("tasks")
    .upsert(rows, {
      onConflict: "task_type,match_id,frame_idx",
      ignoreDuplicates: true,
    });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, received: rows.length });
}
