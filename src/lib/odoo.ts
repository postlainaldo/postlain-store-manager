/**
 * Odoo XML-RPC client — Odoo 13.0
 *
 * Uses /xmlrpc/2/common (auth) + /xmlrpc/2/object (data).
 * No CSRF needed for XML-RPC.
 *
 * Env vars:
 *   ODOO_URL      https://aldo-erp.vti-cl.com   (domain only)
 *   ODOO_DB       aldo_vn_prod
 *   ODOO_USERNAME sm47@vti-cl.com
 *   ODOO_API_KEY  password
 */

const ODOO_URL      = (process.env.ODOO_URL ?? "").replace(/\/$/, "").replace(/#.*$/, "").replace(/\/web.*$/, "");
const ODOO_DB       = process.env.ODOO_DB        ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME  ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY   ?? process.env.ODOO_PASSWORD ?? "";

// ─── XML builder ─────────────────────────────────────────────────────────────

function val(v: unknown): string {
  if (v === null || v === undefined) return "<value><boolean>0</boolean></value>";
  if (typeof v === "boolean")  return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  if (typeof v === "number")   return Number.isInteger(v)
    ? `<value><int>${v}</int></value>`
    : `<value><double>${v}</double></value>`;
  if (typeof v === "string")   return `<value><string>${v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</string></value>`;
  if (Array.isArray(v))        return `<value><array><data>${v.map(val).join("")}</data></array></value>`;
  if (typeof v === "object") {
    const members = Object.entries(v as Record<string,unknown>)
      .map(([k, x]) => `<member><name>${k}</name>${val(x)}</member>`).join("");
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${String(v)}</string></value>`;
}

function call(method: string, params: unknown[]): string {
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${
    params.map(p => `<param>${val(p)}</param>`).join("")
  }</params></methodCall>`;
}

// ─── XML parser ───────────────────────────────────────────────────────────────

function parseXml(xml: string): unknown {
  if (xml.includes("<fault>")) {
    const msg = xml.match(/<name>faultString<\/name>\s*<value><string>([\s\S]*?)<\/string>/)?.[1] ?? "XML-RPC fault";
    throw new Error(`Odoo: ${msg}`);
  }
  const vi = xml.indexOf("<value>");
  return vi === -1 ? null : parseVal(xml, vi);
}

function parseVal(src: string, start: number): unknown {
  const s = src.slice(start);
  if (/<int>|<i4>/.test(s)) return parseInt(s.match(/<(?:int|i4)>(.*?)<\/(?:int|i4)>/)?.[1] ?? "0", 10);
  if (/<double>/.test(s))   return parseFloat(s.match(/<double>(.*?)<\/double>/)?.[1] ?? "0");
  if (/<boolean>/.test(s))  return s.match(/<boolean>(.*?)<\/boolean>/)?.[1] === "1";
  if (/<string>/.test(s))   return (s.match(/<string>([\s\S]*?)<\/string>/)?.[1] ?? "").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
  if (/<nil\/>/.test(s))    return null;
  if (/<array>/.test(s)) {
    const data = s.match(/<array>\s*<data>([\s\S]*?)<\/data>/)?.[1] ?? "";
    const items: unknown[] = [];
    let p = 0;
    while (true) {
      const vi = data.indexOf("<value>", p);
      if (vi === -1) break;
      items.push(parseVal(data, vi));
      p = vi + 7;
    }
    return items;
  }
  if (/<struct>/.test(s)) {
    const body = s.match(/<struct>([\s\S]*?)<\/struct>/)?.[1] ?? "";
    const obj: Record<string, unknown> = {};
    for (const m of body.split("<member>")) {
      const name = m.match(/<name>(.*?)<\/name>/)?.[1];
      const vi   = m.indexOf("<value>");
      if (name && vi !== -1) obj[name] = parseVal(m, vi);
    }
    return obj;
  }
  return s.match(/<value>([\s\S]*?)<\/value>/)?.[1]?.trim() ?? null;
}

// ─── Transport ────────────────────────────────────────────────────────────────

async function xmlRpc(endpoint: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(`${ODOO_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body: call(method, params),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Odoo HTTP ${res.status}: ${res.statusText}`);
  return parseXml(await res.text());
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

let _uid: number | null = null;

async function getUid(): Promise<number> {
  if (_uid !== null) return _uid;
  const uid = await xmlRpc("/xmlrpc/2/common", "authenticate", [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD, {}]);
  if (typeof uid !== "number" || uid === 0) throw new Error("Odoo auth failed — kiểm tra ODOO_DB, ODOO_USERNAME, ODOO_API_KEY");
  _uid = uid;
  return uid;
}

// ─── execute_kw ───────────────────────────────────────────────────────────────

async function execute(model: string, method: string, args: unknown[], kwargs: Record<string,unknown> = {}): Promise<unknown> {
  const uid = await getUid();
  return xmlRpc("/xmlrpc/2/object", "execute_kw", [ODOO_DB, uid, ODOO_PASSWORD, model, method, args, kwargs]);
}

// Location ID of 47GDL Stock (Physical Locations/47GDL/Stock)
const LOCATION_47GDL = 2026;

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
  product_id: [number, string];
  quantity: number;
  reserved_quantity: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch products that have stock at 47GDL location.
 * Returns products joined with their 47GDL quantity.
 */
export async function fetchOdooProducts(limit = 0): Promise<(OdooProduct & { qty_47gdl: number })[]> {
  const PAGE = 500;
  const productFields = ["id", "default_code", "name", "list_price", "categ_id", "description_sale"];

  // Step 1: get all quants at 47GDL location
  const allQuants: OdooQuant[] = [];
  let qOffset = 0;
  while (true) {
    const page = await execute(
      "stock.quant", "search_read",
      [[["location_id", "=", LOCATION_47GDL]]],
      { fields: ["product_id", "quantity", "reserved_quantity"], limit: PAGE, offset: qOffset }
    ) as OdooQuant[];
    if (!page || page.length === 0) break;
    allQuants.push(...page);
    if (page.length < PAGE) break;
    qOffset += PAGE;
  }

  if (allQuants.length === 0) return [];

  // Build qty map: product_id → available qty (quantity - reserved)
  const qtyMap = new Map<number, number>();
  for (const q of allQuants) {
    const pid = q.product_id[0];
    const avail = (q.quantity ?? 0) - (q.reserved_quantity ?? 0);
    qtyMap.set(pid, (qtyMap.get(pid) ?? 0) + avail);
  }

  const productIds = [...qtyMap.keys()];

  // Step 2: fetch product details for those IDs (paginated)
  const allProducts: (OdooProduct & { qty_47gdl: number })[] = [];
  const effectiveLimit = limit > 0 ? Math.min(limit, productIds.length) : productIds.length;
  const idsToFetch = productIds.slice(0, effectiveLimit);

  for (let i = 0; i < idsToFetch.length; i += PAGE) {
    const chunk = idsToFetch.slice(i, i + PAGE);
    const page = await execute(
      "product.product", "search_read",
      [[["id", "in", chunk], ["active", "=", true]]],
      { fields: productFields, limit: PAGE, offset: 0 }
    ) as OdooProduct[];
    for (const p of page ?? []) {
      allProducts.push({ ...p, qty_47gdl: Math.max(0, Math.floor(qtyMap.get(p.id) ?? 0)) });
    }
  }

  return allProducts;
}

export async function testOdooConnection(): Promise<{ uid: number; serverVersion: string }> {
  const version = await xmlRpc("/xmlrpc/2/common", "version", []) as { server_version?: string };
  const uid = await getUid();
  return { uid, serverVersion: version?.server_version ?? "unknown" };
}
