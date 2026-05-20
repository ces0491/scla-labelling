import { NextResponse } from "next/server";

import { getSessionLabeller } from "@/lib/auth";
import { isValidCode } from "@/lib/gestures";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

interface Body {
  task_id?: string;
  gesture?: string;
  confidence?: "high" | "medium";
  notes?: string | null;
  duration_ms?: number | null;
}

/**
 * POST /api/label
 *
 * Records one label for one task by the calling labeller. Idempotent
 * via the unique (task_id, labeller_id) constraint on `labels`:
 * re-submitting overwrites the value (upsert), so a labeller who
 * misclicks can simply re-press the right key.
 */
export async function POST(req: Request) {
  const me = await getSessionLabeller();
  if (!me) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Body;
  const taskId = body.task_id;
  const gesture = body.gesture;
  if (!taskId || !gesture) {
    return NextResponse.json(
      { error: "task_id + gesture required" },
      { status: 400 },
    );
  }
  if (!isValidCode(gesture)) {
    return NextResponse.json(
      { error: `Unknown gesture code: ${gesture}` },
      { status: 422 },
    );
  }

  const confidence = body.confidence === "medium" ? "medium" : "high";

  const sb = getSupabase();

  // Verify the task exists and is one the caller is allowed to label.
  const { data: task } = await sb
    .from("tasks")
    .select("id, task_type, assigned_to")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }
  if (task.assigned_to !== null && task.assigned_to !== me.id) {
    return NextResponse.json(
      { error: "task assigned to another labeller" },
      { status: 403 },
    );
  }
  if (task.task_type !== "gesture") {
    // v1 only ships the gesture endpoint; other task types arrive in
    // later sessions.
    return NextResponse.json(
      { error: `task_type ${task.task_type} not yet supported` },
      { status: 422 },
    );
  }

  const value = { gesture };
  const { error: upsertErr } = await sb
    .from("labels")
    .upsert(
      {
        task_id: taskId,
        labeller_id: me.id,
        value,
        confidence,
        notes: body.notes ?? null,
        duration_ms: body.duration_ms ?? null,
      },
      { onConflict: "task_id,labeller_id" },
    );
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
