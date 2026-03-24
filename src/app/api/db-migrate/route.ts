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

    await sql`
      CREATE TABLE IF NOT EXISTS daily_reports (
        id            TEXT PRIMARY KEY,
        date          TEXT NOT NULL,
        shift         TEXT NOT NULL DEFAULT 'end',
        "revTotal"    DOUBLE PRECISION NOT NULL DEFAULT 0,
        "revCash"     DOUBLE PRECISION NOT NULL DEFAULT 0,
        "revCard"     DOUBLE PRECISION NOT NULL DEFAULT 0,
        "revTransfer" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "revVnpay"    DOUBLE PRECISION NOT NULL DEFAULT 0,
        "revMomo"     DOUBLE PRECISION NOT NULL DEFAULT 0,
        "revUrbox"    DOUBLE PRECISION NOT NULL DEFAULT 0,
        "revNinja"    DOUBLE PRECISION NOT NULL DEFAULT 0,
        "revOther"    DOUBLE PRECISION NOT NULL DEFAULT 0,
        "revHB"       DOUBLE PRECISION NOT NULL DEFAULT 0,
        "revSC"       DOUBLE PRECISION NOT NULL DEFAULT 0,
        "revACC"      DOUBLE PRECISION NOT NULL DEFAULT 0,
        traffic       INTEGER NOT NULL DEFAULT 0,
        bills         INTEGER NOT NULL DEFAULT 0,
        "qtyTotal"    INTEGER NOT NULL DEFAULT 0,
        conversion    DOUBLE PRECISION NOT NULL DEFAULT 0,
        aov           DOUBLE PRECISION NOT NULL DEFAULT 0,
        ipt           DOUBLE PRECISION NOT NULL DEFAULT 0,
        "targetDay"   DOUBLE PRECISION NOT NULL DEFAULT 0,
        note          TEXT NOT NULL DEFAULT '',
        "preparedBy"  TEXT NOT NULL DEFAULT '',
        "createdAt"   TEXT NOT NULL,
        "updatedAt"   TEXT NOT NULL
      )
    `;

    await sql.end();

    // Verify tables exist via Supabase client
    const { getSupabase } = await import("@/lib/supabase");
    const sb = getSupabase();
    const status: Record<string, boolean> = {};
    for (const t of ["customers", "pos_orders", "pos_order_lines", "daily_reports"]) {
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
