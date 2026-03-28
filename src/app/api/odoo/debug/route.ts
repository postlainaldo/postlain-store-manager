/**
 * GET /api/odoo/debug?mode=fields_order|fields_line|fields_sa|sa_sample|order
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
  const mode = new URL(req.url).searchParams.get("mode") ?? "sa_sample";

  try {
    const cookie = await getSession();

    // Get all fields of the sa_lines model (pos.sale.advisor.line or similar)
    if (mode === "fields_sa") {
      // First find what model sa_lines points to by reading the field definition
      const orderFields = await callKw(cookie, "pos.order", "fields_get", [], { attributes: ["string", "type", "relation"] }) as Record<string, { string: string; type: string; relation?: string }>;
      const saField = orderFields["sa_lines"];
      const relation = saField?.relation ?? "unknown";

      // Now get fields of that model
      const saFields = await callKw(cookie, relation, "fields_get", [], { attributes: ["string", "type"] });
      return NextResponse.json({ ok: true, mode, sa_lines_relation: relation, fields: saFields });
    }

    // Sample actual sa_lines records — find orders with sa_lines then read them
    if (mode === "sa_sample") {
      // Get the relation model name first
      const orderFields = await callKw(cookie, "pos.order", "fields_get", [], { attributes: ["string", "type", "relation"] }) as Record<string, { string: string; type: string; relation?: string }>;
      const relation = orderFields["sa_lines"]?.relation ?? null;

      // Read 5 recent orders with sa_lines IDs
      const orders = await callKw(cookie, "pos.order", "search_read",
        [[["state", "in", ["paid", "done", "invoiced"]]]],
        { fields: ["id", "name", "sa_lines", "amount_total", "date_order"], limit: 20, order: "id desc" }
      ) as Array<{ id: number; name: string; sa_lines: number[]; amount_total: number }>;

      // Find first order that has sa_lines
      const withLines = orders.filter((o) => Array.isArray(o.sa_lines) && o.sa_lines.length > 0);

      if (!relation || withLines.length === 0) {
        return NextResponse.json({ ok: true, mode, relation, orders_checked: orders.length, withLines: withLines.length, note: "No sa_lines found in recent orders" });
      }

      // Read sa_lines records
      const lineIds = withLines.slice(0, 3).flatMap((o) => o.sa_lines).slice(0, 20);
      const saLines = await callKw(cookie, relation, "search_read",
        [[["id", "in", lineIds]]],
        { fields: [] } // get all fields
      );

      return NextResponse.json({ ok: true, mode, relation, sample_orders: withLines.slice(0, 3), sa_lines: saLines });
    }

    return NextResponse.json({ ok: false, error: "Unknown mode" }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
