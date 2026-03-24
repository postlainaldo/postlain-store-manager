/**
 * GET /api/db-migrate
 * Creates missing tables in Supabase via direct Postgres connection.
 * Safe to call multiple times (IF NOT EXISTS).
 */
import { NextResponse } from "next/server";
import { IS_SUPABASE } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!IS_SUPABASE) {
    return NextResponse.json({ ok: true, message: "SQLite — no migration needed" });
  }

  const pgUrl = process.env.POSTGRES_URL_NON_POOLING;
  if (!pgUrl) {
    return NextResponse.json({ ok: false, error: "POSTGRES_URL_NON_POOLING not set" }, { status: 500 });
  }

  try {
    // Dynamic import to avoid bundling issues
    const postgres = (await import("postgres")).default;
    const sql = postgres(pgUrl, { ssl: "require", max: 1 });

    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id            TEXT PRIMARY KEY,
        "odooId"      INTEGER UNIQUE,
        name          TEXT NOT NULL,
        phone         TEXT,
        email         TEXT,
        street        TEXT,
        "totalOrders" INTEGER NOT NULL DEFAULT 0,
        "totalSpent"  DOUBLE PRECISION NOT NULL DEFAULT 0,
        "lastOrderAt" TEXT,
        "createdAt"   TEXT NOT NULL,
        "updatedAt"   TEXT NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS pos_orders (
        id              TEXT PRIMARY KEY,
        "odooId"        INTEGER UNIQUE,
        name            TEXT NOT NULL,
        "sessionName"   TEXT,
        "customerId"    TEXT,
        "customerName"  TEXT,
        state           TEXT NOT NULL DEFAULT 'done',
        "amountTotal"   DOUBLE PRECISION NOT NULL DEFAULT 0,
        "amountTax"     DOUBLE PRECISION NOT NULL DEFAULT 0,
        "amountPaid"    DOUBLE PRECISION NOT NULL DEFAULT 0,
        "lineCount"     INTEGER NOT NULL DEFAULT 0,
        "createdAt"     TEXT NOT NULL,
        "updatedAt"     TEXT NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS pos_order_lines (
        id               TEXT PRIMARY KEY,
        "orderId"        TEXT NOT NULL,
        "odooId"         INTEGER UNIQUE,
        "productId"      TEXT,
        "productName"    TEXT NOT NULL,
        sku              TEXT,
        qty              DOUBLE PRECISION NOT NULL DEFAULT 1,
        "priceUnit"      DOUBLE PRECISION NOT NULL DEFAULT 0,
        discount         DOUBLE PRECISION NOT NULL DEFAULT 0,
        "priceSubtotal"  DOUBLE PRECISION NOT NULL DEFAULT 0
      )
    `;

    await sql.end();

    // Verify tables exist via Supabase client
    const { getSupabase } = await import("@/lib/supabase");
    const sb = getSupabase();
    const status: Record<string, boolean> = {};
    for (const t of ["customers", "pos_orders", "pos_order_lines"]) {
      const { error } = await sb.from(t).select("id").limit(1);
      status[t] = !error;
    }

    return NextResponse.json({ ok: true, message: "Migration complete", tableStatus: status });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
