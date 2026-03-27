/**
 * GET /api/odoo/probe?code=15838139
 * Debug: search Odoo directly by barcode or default_code and show raw result.
 * Uses the same auth (getSession + execute) as the main sync route.
 * Remove this file after debugging.
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ODOO_URL      = process.env.ODOO_URL!;
const ODOO_DB       = process.env.ODOO_DB!;
const ODOO_USERNAME = process.env.ODOO_USERNAME!;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD ?? process.env.ODOO_API_KEY ?? "";

async function getSession(): Promise<string> {
  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", method: "call", id: 1,
      params: { db: ODOO_DB, login: ODOO_USERNAME, password: ODOO_PASSWORD },
    }),
    cache: "no-store",
  });
  // Log full response to diagnose auth
  const body = await res.json() as { result?: { uid?: number; session_token?: string }; error?: unknown };
  const sc = res.headers.get("set-cookie") ?? "";
  const m = sc.match(/session_id=([^;]+)/);
  const cookie = m ? m[1] : "";
  return JSON.stringify({ uid: body.result?.uid, session_token: body.result?.session_token, cookie_found: !!cookie, cookie, error: body.error });
}

async function callOdoo(cookie: string, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: `session_id=${cookie}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0", method: "call", id: 1,
      params: {
        model, method, args,
        kwargs: { context: { lang: "vi_VN" }, ...kwargs },
      },
    }),
    cache: "no-store",
  });
  const json = await res.json() as { result?: unknown; error?: { data?: { message: string }; message: string } };
  if (json.error) return { rpc_error: json.error.data?.message ?? json.error.message };
  return json.result;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim() ?? "OLOEN";

  // Step 1: authenticate and get raw session info
  const sessionDebug = await getSession().catch(e => `auth_exception: ${e}`);
  let sessionInfo: { uid?: number; cookie_found?: boolean; cookie?: string; error?: unknown };
  try { sessionInfo = JSON.parse(sessionDebug as string); } catch { sessionInfo = { error: sessionDebug }; }

  const cookie = sessionInfo.cookie ?? "";

  // Step 2: sanity — count all active products
  const totalProducts = await callOdoo(cookie, "product.product", "search_count",
    [[["active", "=", true]]]
  ).catch(e => `error: ${e}`);

  // Step 3: search by barcode exact
  const byBarcode = await callOdoo(cookie, "product.product", "search_read",
    [[["barcode", "=", code]]],
    { fields: ["id", "name", "default_code", "barcode", "list_price", "active", "categ_id"], limit: 5 }
  );

  // Step 4: search by default_code exact
  const byDefaultCode = await callOdoo(cookie, "product.product", "search_read",
    [[["default_code", "=", code]]],
    { fields: ["id", "name", "default_code", "barcode", "list_price", "active", "categ_id"], limit: 5 }
  );

  // Step 5: search by name ilike
  const byName = await callOdoo(cookie, "product.product", "search_read",
    [[["name", "ilike", code]]],
    { fields: ["id", "name", "default_code", "barcode", "list_price", "active", "categ_id"], limit: 5 }
  );

  // Step 6: first 3 products ever (sanity check data exists)
  const sampleProducts = await callOdoo(cookie, "product.product", "search_read",
    [[["active", "=", true]]],
    { fields: ["id", "name", "default_code", "barcode"], limit: 3, offset: 0 }
  );

  // Step 7: total quants at 47GDL with qty>0 (same filter as fetchOdooProducts step 1)
  const total47Quants = await callOdoo(cookie, "stock.quant", "search_count",
    [[["location_id", "child_of", 2027], ["quantity", ">", 0]]]
  );

  // Step 8: does OLOEN appear in 47GDL quants WITH qty>0 filter?
  const oloen47WithFilter = await callOdoo(cookie, "stock.quant", "search_read",
    [[["product_id", "=", 440615], ["location_id", "child_of", 2027], ["quantity", ">", 0]]],
    { fields: ["product_id", "quantity", "reserved_quantity", "location_id"], limit: 5 }
  );

  // Step 9: without filter — raw quant at 47GDL
  const oloen47Raw = await callOdoo(cookie, "stock.quant", "search_read",
    [[["product_id", "=", 440615], ["location_id", "child_of", 2027]]],
    { fields: ["product_id", "quantity", "reserved_quantity", "location_id"], limit: 5 }
  );

  // Step 10: check what page OLOEN falls on (its position in the full quant list)
  const oloenPositionInAllQuants = await callOdoo(cookie, "stock.quant", "search",
    [[["location_id", "child_of", 2027], ["quantity", ">", 0], ["product_id", "=", 440615]]],
    { limit: 1 }
  );

  return NextResponse.json({
    env: { ODOO_URL, ODOO_DB, ODOO_USERNAME },
    auth: sessionInfo,
    totalActiveProducts: totalProducts,
    sampleProducts,
    searchCode: code,
    byBarcode,
    byDefaultCode,
    byName,
    total47QuantsWithQtyFilter: total47Quants,
    oloen47WithQtyFilter: oloen47WithFilter,
    oloen47Raw,
    oloenInFullQuantList: oloenPositionInAllQuants,
  });
}
