import { NextRequest, NextResponse } from "next/server";
import { fetchPosOrders, fetchPosOrderLines, fetchOdooCustomers } from "@/lib/odoo";
import {
  dbBulkUpsertPosOrders,
  dbBulkUpsertPosOrderLines,
  dbBulkUpsertCustomers,
  type DBPosOrder,
  type DBPosOrderLine,
  type DBCustomer,
} from "@/lib/dbAdapter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Map Odoo partner → DBCustomer ────────────────────────────────────────────

function mapCustomer(p: Awaited<ReturnType<typeof fetchOdooCustomers>>[number]): DBCustomer {
  const now = new Date().toISOString();
  return {
    id: `partner-${p.id}`,
    odooId: p.id,
    name: p.name,
    phone: p.phone || null,
    email: p.email || null,
    street: p.street || null,
    totalOrders: 0,
    totalSpent: 0,
    lastOrderAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Map Odoo pos.order → DBPosOrder ─────────────────────────────────────────

function mapOrder(o: Awaited<ReturnType<typeof fetchPosOrders>>[number]): DBPosOrder {
  const now = new Date().toISOString();
  const sessionName = Array.isArray(o.session_id) ? o.session_id[1] : null;
  const partnerId = Array.isArray(o.partner_id) ? o.partner_id[0] : null;
  const partnerName = Array.isArray(o.partner_id) ? o.partner_id[1] : null;
  return {
    id: `pos-${o.id}`,
    odooId: o.id,
    name: o.name,
    sessionName,
    customerId: partnerId ? `partner-${partnerId}` : null,
    customerName: partnerName || null,
    state: o.state,
    amountTotal: o.amount_total ?? 0,
    amountTax: o.amount_tax ?? 0,
    amountPaid: o.amount_paid ?? 0,
    lineCount: o.lines?.length ?? 0,
    createdAt: o.date_order
      ? new Date(o.date_order.replace(" ", "T") + "Z").toISOString()
      : now,
    updatedAt: now,
  };
}

// ─── Map Odoo pos.order.line → DBPosOrderLine ─────────────────────────────────

function mapLine(l: Awaited<ReturnType<typeof fetchPosOrderLines>>[number]): DBPosOrderLine {
  const productId = Array.isArray(l.product_id) ? l.product_id[0] : null;
  return {
    id: `posline-${l.id}`,
    orderId: `pos-${(l.order_id as [number, string])[0]}`,
    odooId: l.id,
    productId: productId ? `odoo-${productId}` : null,
    productName: l.name,
    sku: null,
    qty: l.qty ?? 1,
    priceUnit: l.price_unit ?? 0,
    discount: l.discount ?? 0,
    priceSubtotal: l.price_subtotal_incl ?? 0,
  };
}

// ─── POST /api/odoo/pos-sync ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ODOO_URL) {
      return NextResponse.json({ ok: false, error: "ODOO_URL not set" }, { status: 400 });
    }

    let dateFrom: string | undefined;
    let syncCustomers = true;
    try {
      const body = await req.json();
      dateFrom = body?.dateFrom;
      if (typeof body?.syncCustomers === "boolean") syncCustomers = body.syncCustomers;
    } catch { /* no body */ }

    // Default: sync last 90 days of POS orders
    if (!dateFrom) {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      dateFrom = d.toISOString().slice(0, 19).replace("T", " ");
    }

    const results: Record<string, number> = {};

    // Sync customers
    if (syncCustomers) {
      const partners = await fetchOdooCustomers(2000);
      const customers = partners.map(mapCustomer);
      await dbBulkUpsertCustomers(customers);
      results.customers = customers.length;
      console.log(`[pos-sync] customers: ${customers.length}`);
    }

    // Sync POS orders
    const rawOrders = await fetchPosOrders(dateFrom, 1000);
    const orders = rawOrders.map(mapOrder);
    await dbBulkUpsertPosOrders(orders);
    results.orders = orders.length;
    console.log(`[pos-sync] orders: ${orders.length}`);

    // Sync order lines
    const allLineIds = rawOrders.flatMap(o => o.lines ?? []);
    console.log(`[pos-sync] fetching ${allLineIds.length} order lines...`);
    const rawLines = await fetchPosOrderLines(rawOrders.map(o => o.id));
    const lines = rawLines.map(mapLine);
    await dbBulkUpsertPosOrderLines(lines);
    results.lines = lines.length;
    console.log(`[pos-sync] lines: ${lines.length}`);

    return NextResponse.json({ ok: true, ...results, syncedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[pos-sync] error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}

// ─── GET /api/odoo/pos-sync — called by Vercel cron ─────────────────────────

export async function GET() {
  // Vercel cron calls GET — run a lightweight sync (last 7 days)
  if (!process.env.ODOO_URL) {
    return NextResponse.json({ ok: false, error: "ODOO_URL not set" }, { status: 400 });
  }
  try {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const dateFrom = d.toISOString().slice(0, 19).replace("T", " ");

    const rawOrders = await fetchPosOrders(dateFrom, 500);
    const orders = rawOrders.map(mapOrder);
    await dbBulkUpsertPosOrders(orders);

    const rawLines = await fetchPosOrderLines(rawOrders.map(o => o.id));
    const lines = rawLines.map(mapLine);
    await dbBulkUpsertPosOrderLines(lines);

    return NextResponse.json({ ok: true, orders: orders.length, lines: lines.length, syncedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[pos-sync cron] error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
