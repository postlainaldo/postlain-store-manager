import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

// ── same DB path logic as database.ts ────────────────────────────────────────
const isVercel = process.env.VERCEL === "1";
const DB_PATH = isVercel
  ? "/tmp/postlain.db"
  : path.join(process.cwd(), "data", "postlain.db");

// Tables to backup — order matters for restore (FK dependencies)
const TABLES = [
  "users",
  "products",
  "shelves",
  "slots",
  "placements",
  "chat_rooms",
  "chat_messages",
  "notifications",
  "push_subs",
  "movements",
  "activity",
  "customers",
  "pos_orders",
  "pos_order_lines",
  "daily_reports",
];

// ── GET /api/backup — dump all tables as JSON ─────────────────────────────────
export async function GET(req: NextRequest) {
  // Admin-only: check Authorization header carries user id of an admin
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = new Database(DB_PATH, { readonly: true });

  // Verify admin role
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
  if (!user || user.role !== "admin") {
    db.close();
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const backup: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    try {
      backup[table] = db.prepare(`SELECT * FROM ${table}`).all();
    } catch {
      backup[table] = []; // table may not exist yet (older schema)
    }
  }
  db.close();

  const now = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const filename = `postlain-backup-${now}.json`;

  return new NextResponse(JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), tables: backup }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ── POST /api/backup — restore from JSON body ─────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = OFF"); // disable during restore to avoid FK order issues

  // Verify admin role
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
  if (!user || user.role !== "admin") {
    db.close();
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let payload: { version?: number; tables: Record<string, unknown[]> };
  try {
    payload = await req.json();
  } catch {
    db.close();
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.tables || typeof payload.tables !== "object") {
    db.close();
    return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
  }

  const stats: Record<string, number> = {};

  const restore = db.transaction(() => {
    // Delete in reverse order to respect FK constraints
    for (const table of [...TABLES].reverse()) {
      try { db.prepare(`DELETE FROM ${table}`).run(); } catch { /* table may not exist */ }
    }

    for (const table of TABLES) {
      const rows = payload.tables[table];
      if (!Array.isArray(rows) || rows.length === 0) { stats[table] = 0; continue; }

      // Build INSERT from first row's keys
      const cols = Object.keys(rows[0] as object);
      const placeholders = cols.map(() => "?").join(", ");
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`
      );

      let count = 0;
      for (const row of rows) {
        try {
          stmt.run(cols.map(c => (row as Record<string, unknown>)[c]));
          count++;
        } catch { /* skip bad rows */ }
      }
      stats[table] = count;
    }
  });

  try {
    restore();
    db.pragma("foreign_keys = ON");
    db.close();
    return NextResponse.json({ ok: true, restored: stats });
  } catch (err) {
    db.close();
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
