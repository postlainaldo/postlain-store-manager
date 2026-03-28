/**
 * GET /api/odoo/debug?mode=product_fields|product_sample|categ_sample|advisor_group
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
  const mode = new URL(req.url).searchParams.get("mode") ?? "advisor_group";

  try {
    const cookie = await getSession();

    // Fields on product.product relevant to grouping
    if (mode === "product_fields") {
      const result = await callKw(cookie, "product.product", "fields_get", [], { attributes: ["string", "type"] }) as Record<string, { string: string; type: string }>;
      const interesting = Object.entries(result)
        .filter(([k, v]) => {
          const s = (v.string ?? "").toLowerCase();
          return s.includes("categ") || s.includes("group") || s.includes("type") || s.includes("mh") ||
                 k.includes("categ") || k.includes("group") || k.includes("pos_categ") || k.includes("attribute");
        })
        .map(([k, v]) => ({ field: k, label: v.string, type: v.type }));
      return NextResponse.json({ ok: true, mode, interesting });
    }

    // Sample 3 products with all category fields — use known product IDs from sa_lines
    if (mode === "product_sample") {
      const productIds = [545037, 557566, 560166]; // from sa_lines debug
      const result = await callKw(cookie, "product.product", "search_read",
        [[["id", "in", productIds]]],
        { fields: ["id", "name", "categ_id", "pos_category_id", "attribute_line_ids", "default_code", "product_tmpl_id"] }
      );
      // Also get product.template for same ids
      const tmplIds = (result as Array<{ product_tmpl_id: [number, string] }>).map(p => p.product_tmpl_id[0]);
      const tmpls = await callKw(cookie, "product.template", "search_read",
        [[["id", "in", tmplIds]]],
        { fields: ["id", "name", "categ_id", "pos_category_id", "type"] }
      );
      return NextResponse.json({ ok: true, mode, products: result, templates: tmpls });
    }

    // Sample product.category tree — find MH12001 etc
    if (mode === "categ_sample") {
      const result = await callKw(cookie, "product.category", "search_read",
        [[["name", "like", "MH1"]]],
        { fields: ["id", "name", "parent_id", "complete_name"], limit: 30 }
      );
      return NextResponse.json({ ok: true, mode, categories: result });
    }

    // mode === "advisor_group" — get recent lines with x_advisor + product category
    // Fetch lines with product detail to find which field holds MH12001..MH12006
    if (mode === "advisor_group") {
      // Get 10 recent lines with x_advisor set
      const lines = await callKw(cookie, "pos.order.line", "search_read",
        [[["x_advisor", "!=", false], ["order_id.state", "in", ["paid", "done", "invoiced"]]]],
        { fields: ["id", "product_id", "x_advisor", "qty", "price_subtotal_incl", "is_program_reward"], limit: 10, order: "id desc" }
      ) as Array<{ id: number; product_id: [number, string]; x_advisor: [number, string]; qty: number; price_subtotal_incl: number }>;

      const productIds = [...new Set(lines.map(l => Array.isArray(l.product_id) ? l.product_id[0] : 0).filter(Boolean))];

      // Get categories for these products
      const products = await callKw(cookie, "product.product", "search_read",
        [[["id", "in", productIds]]],
        { fields: ["id", "name", "categ_id", "pos_category_id"] }
      ) as Array<{ id: number; categ_id: [number, string]; pos_category_id: [number, string] | false }>;

      const categIds = [...new Set(products.map(p => Array.isArray(p.categ_id) ? p.categ_id[0] : 0).filter(Boolean))];
      const categories = await callKw(cookie, "product.category", "search_read",
        [[["id", "in", categIds]]],
        { fields: ["id", "name", "complete_name", "parent_id"] }
      );

      return NextResponse.json({ ok: true, mode, lines: lines.slice(0, 5), products, categories });
    }

    return NextResponse.json({ ok: false, error: "Unknown mode" }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
