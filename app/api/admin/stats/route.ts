import { NextResponse } from "next/server";

import { getSessionLabeller } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * GET /api/admin/stats
 *
 * Admin-only. Returns per-labeller progress + per-class gesture
 * counts -- the data the /admin page renders. Reads from the
 * `labeller_progress` and `gesture_class_counts` SQL views defined
 * in supabase/migrations/001_init.sql.
 */
export async function GET() {
  const me = await getSessionLabeller();
  if (!me) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!me.is_admin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const sb = getSupabase();
  const [labellersRes, classCountsRes, totalRes] = await Promise.all([
    sb
      .from("labeller_progress")
      .select(
        "id, email, display_name, is_admin, invited_at, " +
          "first_seen_at, last_active_at, labels_count",
      )
      .order("labels_count", { ascending: false }),
    sb.from("gesture_class_counts").select("gesture, n"),
    sb
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("task_type", "gesture"),
  ]);

  if (labellersRes.error || classCountsRes.error || totalRes.error) {
    return NextResponse.json(
      {
        error:
          labellersRes.error?.message ??
          classCountsRes.error?.message ??
          totalRes.error?.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    labellers: labellersRes.data ?? [],
    class_counts: classCountsRes.data ?? [],
    total_tasks: totalRes.count ?? 0,
  });
}
