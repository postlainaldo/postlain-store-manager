import { NextResponse } from "next/server";
import { IS_SUPABASE } from "@/lib/supabase";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export async function GET() {
  const info: Record<string, unknown> = {
    ok: true,
    ts: Date.now(),
    mode: IS_SUPABASE ? "supabase" : "sqlite",
    dataDir: process.env.DATA_DIR ?? "(not set — using default)",
    nodeEnv: process.env.NODE_ENV,
  };

  // Test DB connectivity
  if (!IS_SUPABASE) {
    try {
      const getDb = (await import("@/lib/database")).default;
      const db = getDb();
      const row = db.prepare("SELECT sqlite_version() as v").get() as { v: string };
      info.sqlite = row.v;
      // Test shift tables exist
      const tables = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('shift_templates','shift_slots','shift_registrations')`
      ).all() as { name: string }[];
      info.shiftTables = tables.map(t => t.name);
    } catch (err) {
      info.dbError = String(err);
    }
  }

  return NextResponse.json(info);
}
