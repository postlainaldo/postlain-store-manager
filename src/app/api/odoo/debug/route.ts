/**
 * GET /api/odoo/debug
 * Returns raw Odoo pos.order fields for the 5 most recent orders.
 * Use this to discover which field holds the salesperson name.
 */
import { NextResponse } from "next/server";
import { fetchPosOrders } from "@/lib/odoo";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.ODOO_URL) {
    return NextResponse.json({ error: "ODOO_URL not set" }, { status: 400 });
  }
  try {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const dateFrom = d.toISOString().slice(0, 19).replace("T", " ");
    const orders = await fetchPosOrders(dateFrom, 5);
    // Return raw fields for inspection
    const sample = orders.slice(0, 5).map(o => ({
      id: o.id,
      name: o.name,
      employee_id: o.employee_id,
      user_id: o.user_id,
      partner_id: o.partner_id,
      amount_total: o.amount_total,
      date_order: o.date_order,
    }));
    return NextResponse.json({ ok: true, sample, count: orders.length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
