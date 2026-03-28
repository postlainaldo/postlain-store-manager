/**
 * GET /api/odoo/advisor-sales?month=2026-03
 * Returns aggregated sales per advisor (x_advisor) directly from Odoo.
 * No DB sync needed — reads live from Odoo pos.order.line.
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchAdvisorSales } from "@/lib/odoo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!process.env.ODOO_URL) {
    return NextResponse.json({ ok: false, error: "ODOO_URL not set" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7); // "2026-03"

  const [y, m] = month.split("-").map(Number);
  // Odoo stores date_order in UTC — use first/last day of month
  const dateFrom = `${month}-01 00:00:00`;
  const lastDay = new Date(y, m, 0).getDate();
  const dateTo   = `${month}-${String(lastDay).padStart(2, "0")} 23:59:59`;

  try {
    const rows = await fetchAdvisorSales(dateFrom, dateTo);
    return NextResponse.json({ ok: true, month, rows });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
