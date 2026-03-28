/**
 * GET /api/odoo/debug?mode=fields_order|fields_line|order|line
 */
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ODOO_URL = (process.env.ODOO_URL ?? "").replace(/\/$/, "").replace(/#.*$/, "").replace(/\/web.*$/, "");
const ODOO_DB  = process.env.ODOO_DB  ?? "";
const ODOO_USR = process.env.ODOO_USERNAME ?? "";
const ODOO_PWD = process.env.ODOO_API_KEY ?? process.env.ODOO_PASSWORD ?? "";

async function getSession(): Promise<string> {
  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: 1,
      params: { db: ODOO_DB, login: ODOO_USR, password: ODOO_PWD } }),
    cache: "no-store",
  });
  return res.headers.get("set-cookie") ?? "";
}

async function callKw(cookie: string, model: string, method: string, args: unknown[], kwargs: Record<string, unknown>) {
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: 1,
      params: { model, method, args, kwargs } }),
    cache: "no-store",
  });
  const j = await res.json();
  return j?.result ?? j?.error ?? null;
}

export async function GET(req: NextRequest) {
  if (!ODOO_URL) return NextResponse.json({ error: "ODOO_URL not set" }, { status: 400 });
  const mode = new URL(req.url).searchParams.get("mode") ?? "order";

  try {
    const cookie = await getSession();

    // List fields on pos.order
    if (mode === "fields_order") {
      const result = await callKw(cookie, "pos.order", "fields_get", [], { attributes: ["string", "type"] });
      const interesting = Object.entries(result as Record<string, { string: string; type: string }>)
        .filter(([k, v]) => {
          const s = (v.string ?? "").toLowerCase();
          return s.includes("sale") || s.includes("advisor") || s.includes("employee") ||
                 s.includes("staff") || s.includes("cashier") || s.includes("seller") ||
                 k.includes("employee") || k.includes("sale") || k.includes("cashier") || k.includes("seller");
        })
        .map(([k, v]) => ({ field: k, label: v.string, type: v.type }));
      return NextResponse.json({ ok: true, mode, interesting });
    }

    // List fields on pos.order.line
    if (mode === "fields_line") {
      const result = await callKw(cookie, "pos.order.line", "fields_get", [], { attributes: ["string", "type"] });
      const interesting = Object.entries(result as Record<string, { string: string; type: string }>)
        .filter(([k, v]) => {
          const s = (v.string ?? "").toLowerCase();
          return s.includes("sale") || s.includes("advisor") || s.includes("employee") ||
                 s.includes("staff") || s.includes("cashier") || s.includes("seller") ||
                 k.includes("employee") || k.includes("sale") || k.includes("cashier") || k.includes("seller");
        })
        .map(([k, v]) => ({ field: k, label: v.string, type: v.type }));
      return NextResponse.json({ ok: true, mode, interesting });
    }

    // Fetch 5 recent order lines with all plausible fields
    if (mode === "line") {
      const result = await callKw(cookie, "pos.order.line", "search_read",
        [[["order_id.state", "in", ["paid", "done", "invoiced"]]]],
        { fields: ["id", "order_id", "product_id", "employee_id", "sale_advisor_id", "salesperson_id", "qty", "price_subtotal_incl"], limit: 5, order: "id desc" }
      );
      return NextResponse.json({ ok: true, mode, lines: result });
    }

    // Default: fetch recent orders with every plausible field
    const result = await callKw(cookie, "pos.order", "search_read",
      [[["state", "in", ["paid", "done", "invoiced"]]]],
      { fields: ["id", "name", "employee_id", "user_id", "cashier", "sale_advisor_id", "salesperson_id", "amount_total", "date_order"], limit: 5, order: "id desc" }
    );
    return NextResponse.json({ ok: true, mode, orders: result });

  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
