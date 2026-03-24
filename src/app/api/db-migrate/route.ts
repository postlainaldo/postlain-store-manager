/**
 * GET /api/db-migrate
 * Creates missing tables in Supabase via direct SQL through RPC.
 * Safe to call multiple times (IF NOT EXISTS).
 */
import { NextResponse } from "next/server";
import { IS_SUPABASE, getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS customers (
  id            TEXT PRIMARY KEY,
  "odooId"      INTEGER UNIQUE,
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  street        TEXT,
  "totalOrders" INTEGER NOT NULL DEFAULT 0,
  "totalSpent"  REAL NOT NULL DEFAULT 0,
  "lastOrderAt" TEXT,
  "createdAt"   TEXT NOT NULL,
  "updatedAt"   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_orders (
  id              TEXT PRIMARY KEY,
  "odooId"        INTEGER UNIQUE,
  name            TEXT NOT NULL,
  "sessionName"   TEXT,
  "customerId"    TEXT,
  "customerName"  TEXT,
  state           TEXT NOT NULL DEFAULT 'done',
  "amountTotal"   REAL NOT NULL DEFAULT 0,
  "amountTax"     REAL NOT NULL DEFAULT 0,
  "amountPaid"    REAL NOT NULL DEFAULT 0,
  "lineCount"     INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TEXT NOT NULL,
  "updatedAt"     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_order_lines (
  id               TEXT PRIMARY KEY,
  "orderId"        TEXT NOT NULL,
  "odooId"         INTEGER UNIQUE,
  "productId"      TEXT,
  "productName"    TEXT NOT NULL,
  sku              TEXT,
  qty              REAL NOT NULL DEFAULT 1,
  "priceUnit"      REAL NOT NULL DEFAULT 0,
  discount         REAL NOT NULL DEFAULT 0,
  "priceSubtotal"  REAL NOT NULL DEFAULT 0
);
`;

export async function GET() {
  if (!IS_SUPABASE) {
    return NextResponse.json({ ok: true, message: "SQLite — no migration needed" });
  }

  const sb = getSupabase();
  const errors: string[] = [];

  // Try each statement individually
  const stmts = MIGRATION_SQL
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 10);

  for (const sql of stmts) {
    const { error } = await sb.rpc("exec_sql", { sql: sql + ";" });
    if (error) errors.push(`${sql.slice(0, 60)}... → ${error.message}`);
  }

  if (errors.length) {
    // Try alternate approach: just check if tables exist by selecting from them
    const tables = ["customers", "pos_orders", "pos_order_lines"];
    const status: Record<string, boolean> = {};
    for (const t of tables) {
      const { error } = await sb.from(t).select("id").limit(1);
      status[t] = !error;
    }
    return NextResponse.json({ ok: false, errors, tableStatus: status });
  }

  return NextResponse.json({ ok: true, message: "Migration complete" });
}
