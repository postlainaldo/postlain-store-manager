/**
 * Odoo client — Odoo 13.0
 *
 * Auth:  XML-RPC /xmlrpc/2/common  (regex extract UID — no XML parser needed)
 * Data:  JSON-RPC /web/dataset/call_kw  (plain JSON, no XML parsing)
 *
 * Env vars:
 *   ODOO_URL      https://aldo-erp.vti-cl.com
 *   ODOO_DB       aldo_vn_prod
 *   ODOO_USERNAME sm47@vti-cl.com
 *   ODOO_API_KEY  password
 */

const ODOO_URL      = (process.env.ODOO_URL ?? "").replace(/\/$/, "").replace(/#.*$/, "").replace(/\/web.*$/, "");
const ODOO_DB       = process.env.ODOO_DB       ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY  ?? process.env.ODOO_PASSWORD ?? "";

// Location ID of 47GDL (Physical Locations/47GDL — parent view node)
const LOCATION_47GDL = 2027;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OdooProduct {
  id: number;
  default_code: string | false;
  name: string;
  list_price: number;
  categ_id: [number, string] | false;
  description_sale: string | false;
  active: boolean;
}

export interface OdooQuant {
  product_id: [number, string] | number;
  quantity: number;
  reserved_quantity: number;
}

// ─── Auth — XML-RPC (regex only, no XML parser) ───────────────────────────────

let _uid: number | null = null;

async function getUid(): Promise<number> {
  if (_uid !== null) return _uid;
  const body = [
    `<?xml version="1.0"?>`,
    `<methodCall><methodName>authenticate</methodName><params>`,
    `<param><value><string>${ODOO_DB}</string></value></param>`,
    `<param><value><string>${ODOO_USERNAME}</string></value></param>`,
    `<param><value><string>${ODOO_PASSWORD}</string></value></param>`,
    `<param><value><struct></struct></value></param>`,
    `</params></methodCall>`,
  ].join("");

  const res = await fetch(`${ODOO_URL}/xmlrpc/2/common`, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Odoo auth HTTP ${res.status}`);
  const xml = await res.text();
  // Response contains exactly one integer — the UID (or 0 on failure)
  const match = xml.match(/<(?:int|i4)>(\d+)<\/(?:int|i4)>/);
  const uid = match ? parseInt(match[1], 10) : 0;
  if (!uid) throw new Error("Odoo auth failed — kiểm tra ODOO_DB, ODOO_USERNAME, ODOO_API_KEY");
  _uid = uid;
  return uid;
}

// ─── Session — JSON-RPC web auth (get cookie) ─────────────────────────────────

let _cookie = "";

async function getSession(): Promise<string> {
  if (_cookie) return _cookie;
  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", method: "call", id: 1,
      params: { db: ODOO_DB, login: ODOO_USERNAME, password: ODOO_PASSWORD },
    }),
    cache: "no-store",
  });
  const sc = res.headers.get("set-cookie") ?? "";
  const m = sc.match(/session_id=([^;]+)/);
  if (m) _cookie = `session_id=${m[1]}`;
  return _cookie;
}

// ─── JSON-RPC data execute ────────────────────────────────────────────────────

async function execute(
  cookie: string,
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
): Promise<unknown> {
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0", method: "call", id: 1,
      params: {
        model, method, args,
        kwargs: { context: { lang: "vi_VN" }, ...kwargs },
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Odoo HTTP ${res.status}: ${res.statusText}`);
  const j = await res.json() as {
    result?: unknown;
    error?: { data?: { message: string }; message: string };
  };
  if (j.error) throw new Error(j.error.data?.message ?? j.error.message);
  return j.result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch products that have stock at 47GDL location.
 * Returns products joined with their 47GDL available quantity.
 */
export async function fetchOdooProducts(limit = 0): Promise<(OdooProduct & { qty_47gdl: number })[]> {
  const cookie = await getSession();
  const PAGE = 500;

  // Step 1: get all quants at 47GDL with qty > 0
  const allQuants: OdooQuant[] = [];
  let offset = 0;
  while (true) {
    const page = await execute(
      cookie,
      "stock.quant", "search_read",
      [[
        ["location_id", "child_of", LOCATION_47GDL],
        ["quantity", ">", 0],
      ]],
      { fields: ["product_id", "quantity", "reserved_quantity"], limit: PAGE, offset }
    ) as OdooQuant[];
    console.log(`[odoo] quants offset=${offset}: ${page?.length ?? 0} records`);
    if (!page?.length) break;
    allQuants.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  console.log(`[odoo] total quants: ${allQuants.length}`);

  if (allQuants.length === 0) return [];

  // Step 2: build qty map — product_id → available qty (quantity - reserved)
  const qtyMap = new Map<number, number>();
  for (const q of allQuants) {
    const pid = Array.isArray(q.product_id)
      ? (q.product_id as [number, string])[0]
      : q.product_id as unknown as number;
    const qty = typeof q.quantity === "number" ? q.quantity : parseFloat(String(q.quantity ?? 0));
    const res = typeof q.reserved_quantity === "number" ? q.reserved_quantity : parseFloat(String(q.reserved_quantity ?? 0));
    const avail = qty - res;
    if (avail > 0) qtyMap.set(pid, (qtyMap.get(pid) ?? 0) + avail);
  }

  const productIds = [...qtyMap.keys()];
  console.log(`[odoo] distinct products with avail qty: ${productIds.length}`);

  // Step 3: fetch product details (paginated by chunk)
  const effectiveIds = limit > 0 ? productIds.slice(0, limit) : productIds;
  const allProducts: (OdooProduct & { qty_47gdl: number })[] = [];

  for (let i = 0; i < effectiveIds.length; i += PAGE) {
    const chunk = effectiveIds.slice(i, i + PAGE);
    const page = await execute(
      cookie,
      "product.product", "search_read",
      [[["id", "in", chunk], ["active", "=", true]]],
      {
        fields: ["id", "default_code", "name", "list_price", "categ_id", "description_sale"],
        limit: PAGE,
        offset: 0,
      }
    ) as OdooProduct[];
    for (const p of page ?? []) {
      const qty = Math.floor(qtyMap.get(p.id) ?? 0);
      if (qty > 0) allProducts.push({ ...p, qty_47gdl: qty });
    }
  }

  console.log(`[odoo] final products: ${allProducts.length}`);
  return allProducts;
}

export async function testOdooConnection(): Promise<{ uid: number; serverVersion: string }> {
  const uid = await getUid();
  return { uid, serverVersion: "Odoo 13" };
}

// ─── POS Orders ───────────────────────────────────────────────────────────────

export interface OdooPosOrder {
  id: number;
  name: string;
  session_id: [number, string] | false;
  partner_id: [number, string] | false;
  state: string;
  amount_total: number;
  amount_tax: number;
  amount_paid: number;
  date_order: string;
  lines: number[];
}

export interface OdooPosOrderLine {
  id: number;
  order_id: [number, string];
  product_id: [number, string] | false;
  name: string;
  qty: number;
  price_unit: number;
  discount: number;
  price_subtotal_incl: number;
}

/**
 * Fetch POS orders from Odoo.
 * dateFrom: ISO string e.g. "2025-01-01T00:00:00"
 */
export async function fetchPosOrders(dateFrom?: string, limit = 500): Promise<OdooPosOrder[]> {
  const cookie = await getSession();
  const PAGE = 200;
  const domain: unknown[] = [["state", "=", "done"]];
  if (dateFrom) domain.push(["date_order", ">=", dateFrom]);

  const all: OdooPosOrder[] = [];
  let offset = 0;
  while (all.length < limit) {
    const page = await execute(
      cookie,
      "pos.order", "search_read",
      [domain],
      {
        fields: ["id", "name", "session_id", "partner_id", "state",
                 "amount_total", "amount_tax", "amount_paid", "date_order", "lines"],
        limit: PAGE,
        offset,
        order: "date_order desc",
      }
    ) as OdooPosOrder[];
    console.log(`[odoo-pos] orders offset=${offset}: ${page?.length ?? 0}`);
    if (!page?.length) break;
    all.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  console.log(`[odoo-pos] total orders: ${all.length}`);
  return all;
}

export async function fetchPosOrderLines(orderIds: number[]): Promise<OdooPosOrderLine[]> {
  if (!orderIds.length) return [];
  const cookie = await getSession();
  const PAGE = 500;
  const all: OdooPosOrderLine[] = [];

  for (let i = 0; i < orderIds.length; i += PAGE) {
    const chunk = orderIds.slice(i, i + PAGE);
    const page = await execute(
      cookie,
      "pos.order.line", "search_read",
      [[["order_id", "in", chunk]]],
      {
        fields: ["id", "order_id", "product_id", "name",
                 "qty", "price_unit", "discount", "price_subtotal_incl"],
        limit: PAGE * 20,
      }
    ) as OdooPosOrderLine[];
    all.push(...(page ?? []));
  }
  return all;
}

// ─── Customers (res.partner) ──────────────────────────────────────────────────

export interface OdooPartner {
  id: number;
  name: string;
  phone: string | false;
  email: string | false;
  street: string | false;
  customer_rank: number;
}

export async function fetchOdooCustomers(limit = 2000): Promise<OdooPartner[]> {
  const cookie = await getSession();
  const PAGE = 500;
  const all: OdooPartner[] = [];
  let offset = 0;

  while (all.length < limit) {
    const page = await execute(
      cookie,
      "res.partner", "search_read",
      [[["customer_rank", ">", 0], ["active", "=", true]]],
      {
        fields: ["id", "name", "phone", "email", "street", "customer_rank"],
        limit: PAGE,
        offset,
      }
    ) as OdooPartner[];
    console.log(`[odoo-customers] offset=${offset}: ${page?.length ?? 0}`);
    if (!page?.length) break;
    all.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  console.log(`[odoo-customers] total: ${all.length}`);
  return all;
}
