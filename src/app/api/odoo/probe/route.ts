/**
 * GET /api/odoo/probe?code=15838139
 * Debug: search Odoo directly by barcode or default_code and show raw result.
 * Remove this file after debugging.
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getSession(): Promise<string> {
  const ODOO_URL = process.env.ODOO_URL!;
  const ODOO_DB  = process.env.ODOO_DB!;
  const ODOO_USERNAME = process.env.ODOO_USERNAME!;
  const ODOO_PASSWORD = process.env.ODOO_PASSWORD!;

  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", method: "call", id: 1,
      params: { db: ODOO_DB, login: ODOO_USERNAME, password: ODOO_PASSWORD },
    }),
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const m = setCookie.match(/session_id=([^;]+)/);
  if (!m) throw new Error("No session_id in cookie");
  return m[1];
}

async function callOdoo(cookie: string, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
  const ODOO_URL = process.env.ODOO_URL!;
  const ODOO_DB  = process.env.ODOO_DB!;
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `session_id=${cookie}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0", method: "call", id: 1,
      params: {
        model, method,
        args, kwargs: { ...kwargs, context: { lang: "vi_VN", db: ODOO_DB } },
      },
    }),
  });
  const json = await res.json();
  return json.result;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim();
  if (!code) return NextResponse.json({ error: "?code= required" }, { status: 400 });

  try {
    const cookie = await getSession();

    // Search by barcode field
    const byBarcode = await callOdoo(cookie, "product.product", "search_read",
      [[["barcode", "=", code]]],
      { fields: ["id", "name", "default_code", "barcode", "list_price", "active", "categ_id"], limit: 5 }
    );

    // Search by default_code field
    const byDefaultCode = await callOdoo(cookie, "product.product", "search_read",
      [[["default_code", "=", code]]],
      { fields: ["id", "name", "default_code", "barcode", "list_price", "active", "categ_id"], limit: 5 }
    );

    // Check if product is in quants at 47GDL
    const LOCATION_47GDL = 2027;
    const allResults = [...(byBarcode ?? []), ...(byDefaultCode ?? [])];
    const productIds = allResults.map((p: { id: number }) => p.id);

    let quants: unknown[] = [];
    if (productIds.length > 0) {
      quants = await callOdoo(cookie, "stock.quant", "search_read",
        [[["product_id", "in", productIds], ["location_id", "child_of", LOCATION_47GDL]]],
        { fields: ["product_id", "quantity", "reserved_quantity", "location_id"], limit: 20 }
      ) ?? [];
    }

    // Also try: search by name contains the code
    const byName = await callOdoo(cookie, "product.product", "search_read",
      [[["name", "ilike", code]]],
      { fields: ["id", "name", "default_code", "barcode", "list_price", "active", "categ_id"], limit: 5 }
    );

    // Fetch OLOEN specifically to see its actual barcode/default_code
    const oloenRaw = await callOdoo(cookie, "product.product", "search_read",
      [[["name", "ilike", "OLOEN"]]],
      { fields: ["id", "name", "default_code", "barcode", "list_price", "active", "categ_id"], limit: 10 }
    ).catch(() => []);

    // Also try: search POS barcodes (pos.config or product.barcode)
    const byPosBarcode = await callOdoo(cookie, "barcode.nomenclature", "search_read",
      [[]],
      { fields: ["id", "name", "rule_ids"], limit: 3 }
    ).catch(() => []);

    // Check in product.barcode if model exists
    const byProductBarcode = await callOdoo(cookie, "product.product", "search_read",
      [[["barcode", "ilike", code]]],
      { fields: ["id", "name", "default_code", "barcode", "list_price", "active"], limit: 5 }
    ).catch(() => []);

    return NextResponse.json({
      searchCode: code,
      byBarcode: byBarcode ?? [],
      byDefaultCode: byDefaultCode ?? [],
      byName: byName ?? [],
      byProductBarcodeIlike: byProductBarcode ?? [],
      byPosNomenclature: byPosBarcode ?? [],
      oloenRaw: oloenRaw ?? [],
      quants_at_47GDL: quants,
      summary: {
        foundByBarcode: (byBarcode ?? []).length,
        foundByDefaultCode: (byDefaultCode ?? []).length,
        foundByName: (byName ?? []).length,
        hasQuantAt47GDL: (quants as unknown[]).length > 0,
      }
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
