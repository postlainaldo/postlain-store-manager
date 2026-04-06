/**
 * GET /api/odoo/advisor-sales?month=2026-03
 * Returns aggregated sales per advisor (x_advisor) directly from Odoo.
 * No DB sync needed — reads live from Odoo pos.order.line.
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchAdvisorSales } from "@/lib/odoo";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  setActiveStore(getStoreId(req));
  if (!process.env.ODOO_URL) {
    return NextResponse.json({ ok: false, error: "ODOO_URL not set" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7); // "2026-03"

  const [y, m] = month.split("-").map(Number);
  // Odoo stores date_order in UTC. VN is UTC+7, so to query a Vietnamese calendar
  // month we subtract 7 hours: VN 00:00 = UTC prev-day 17:00.
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const vnStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)); // 1st of month, midnight VN
  const lastDay = new Date(y, m, 0).getDate();
  const vnEnd   = new Date(Date.UTC(y, m - 1, lastDay, 23, 59, 59)); // last day 23:59:59 VN
  const toOdoo  = (d: Date) => new Date(d.getTime() - VN_OFFSET_MS).toISOString().slice(0, 19).replace("T", " ");
  const dateFrom = toOdoo(vnStart);
  const dateTo   = toOdoo(vnEnd);

  try {
    const rows = await fetchAdvisorSales(dateFrom, dateTo);
    return NextResponse.json({ ok: true, month, rows });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
