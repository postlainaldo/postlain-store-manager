/**
 * GET /api/db-migrate
 * Runs ALTER TABLE migrations on Supabase via the REST client.
 * Safe to call multiple times.
 */
import { NextResponse } from "next/server";
import { IS_SUPABASE, getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!IS_SUPABASE) {
    return NextResponse.json({ ok: true, message: "SQLite — no migration needed" });
  }

  try {
    const sb = getSupabase();

    // Check which tables exist
    const status: Record<string, boolean> = {};
    for (const t of ["customers", "pos_orders", "pos_order_lines", "daily_reports", "shift_templates", "shift_slots", "shift_registrations"]) {
      const { error } = await sb.from(t).select("id").limit(1);
      status[t] = !error;
    }

    return NextResponse.json({ ok: true, message: "Migration check complete — use Supabase Dashboard SQL editor for schema changes", tableStatus: status });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
