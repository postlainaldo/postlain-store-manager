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

// ─── XML parser (recursive, tag-balanced) ────────────────────────────────────

/** Find the index just after the matching closing tag, handling nested same-name tags */
function findClose(xml: string, openTag: string, closeTag: string, from: number): number {
  let depth = 1, i = from;
  while (i < xml.length && depth > 0) {
    const o = xml.indexOf(openTag,  i);
    const c = xml.indexOf(closeTag, i);
    if (c === -1) break;
    if (o !== -1 && o < c) { depth++; i = o + openTag.length; }
    else                    { depth--; i = c + closeTag.length; }
  }
  return i;
}

function parseValue(xml: string, pos: number): [unknown, number] {
  // skip whitespace
  while (pos < xml.length && xml[pos] !== '<') pos++;
  if (xml.slice(pos, pos + 7) !== "<value>") return [null, pos];
  pos += 7; // past <value>
  // skip whitespace
  while (pos < xml.length && (xml[pos] === '\n' || xml[pos] === '\r' || xml[pos] === ' ')) pos++;

  const rest = xml.slice(pos);

  // <int> / <i4>
  if (rest.startsWith("<int>") || rest.startsWith("<i4>")) {
    const tag = rest.startsWith("<int>") ? "int" : "i4";
    const end = xml.indexOf(`</${tag}>`, pos);
    const n = parseInt(xml.slice(pos + tag.length + 2, end), 10);
    return [n, xml.indexOf("</value>", end) + 8];
  }
  // <double>
  if (rest.startsWith("<double>")) {
    const end = xml.indexOf("</double>", pos);
    return [parseFloat(xml.slice(pos + 8, end)), xml.indexOf("</value>", end) + 8];
  }
  // <boolean>
  if (rest.startsWith("<boolean>")) {
    const end = xml.indexOf("</boolean>", pos);
    return [xml.slice(pos + 9, end) === "1", xml.indexOf("</value>", end) + 8];
  }
  // <nil/>
  if (rest.startsWith("<nil/>")) {
    return [null, xml.indexOf("</value>", pos) + 8];
  }
  // <string>
  if (rest.startsWith("<string>")) {
    const end = xml.indexOf("</string>", pos);
    const raw = xml.slice(pos + 8, end).replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
    return [raw, xml.indexOf("</value>", end) + 8];
  }
  // <array>
  if (rest.startsWith("<array>")) {
    const dataStart = xml.indexOf("<data>", pos) + 6;
    const dataEnd   = xml.indexOf("</data>", dataStart);
    const items: unknown[] = [];
    let cur = dataStart;
    while (cur < dataEnd) {
      const vi = xml.indexOf("<value>", cur);
      if (vi === -1 || vi >= dataEnd) break;
      const [item, next] = parseValue(xml, vi);
      items.push(item);
      cur = next;
    }
    const afterArray = xml.indexOf("</array>", dataEnd) + 8;
    return [items, xml.indexOf("</value>", afterArray) + 8];
  }
  // <struct>
  if (rest.startsWith("<struct>")) {
    const structOpen  = pos; // points at <struct>
    const structEnd   = findClose(xml, "<struct>", "</struct>", pos + 8);
    // structEnd is index just after </struct>
    const obj: Record<string, unknown> = {};
    let cur = pos + 8; // inside struct
    const structClose = structEnd - 9; // start of </struct>
    while (cur < structClose) {
      const ms = xml.indexOf("<member>", cur);
      if (ms === -1 || ms >= structClose) break;
      const me = findClose(xml, "<member>", "</member>", ms + 8);
      const chunk = xml.slice(ms + 8, me - 9); // content of <member>
      const nameStart = chunk.indexOf("<name>") + 6;
      const nameEnd   = chunk.indexOf("</name>");
      const name = chunk.slice(nameStart, nameEnd);
      const vi   = chunk.indexOf("<value>");
      if (name && vi !== -1) {
        const [v] = parseValue(chunk, vi);
        obj[name] = v;
      }
      cur = me;
    }
    void structOpen; // suppress unused warning
    return [obj, xml.indexOf("</value>", structEnd) + 8];
  }
  // bare string (no type tag)
  const end = xml.indexOf("</value>", pos);
  return [xml.slice(pos, end).trim(), end + 8];
}

function parseXml(xml: string): unknown {
  if (xml.includes("<fault>")) {
    const msg = xml.match(/<name>faultString<\/name>\s*<value><string>([\s\S]*?)<\/string>/)?.[1] ?? "XML-RPC fault";
    throw new Error(`Odoo: ${msg}`);
  }
  const vi = xml.indexOf("<value>");
  if (vi === -1) return null;
  const [result] = parseValue(xml, vi);
  return result;
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

// ─── execute_kw via XML-RPC ───────────────────────────────────────────────────

async function execute(model: string, method: string, args: unknown[], kwargs: Record<string,unknown> = {}): Promise<unknown> {
  const uid = await getUid();
  return xmlRpc("/xmlrpc/2/object", "execute_kw", [ODOO_DB, uid, ODOO_PASSWORD, model, method, args, kwargs]);
}

// Location ID of 47GDL (Physical Locations/47GDL — parent view node)
// Using child_of to include all sub-locations (Stock, etc.)
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
  // Filter: storable products only (type=product), exclude consumables/services
  const allQuants: OdooQuant[] = [];
  let qOffset = 0;
  while (true) {
    const page = await execute(
      "stock.quant", "search_read",
      [[
        ["location_id", "child_of", LOCATION_47GDL],
        ["quantity", ">", 0],
        ["product_id.type", "=", "product"],          // storable only, excludes services/consumables
        ["product_id.categ_id.name", "not ilike", "bao bi"],
        ["product_id.categ_id.name", "not ilike", "packaging"],
        ["product_id.categ_id.name", "not ilike", "gwp"],
        ["product_id.categ_id.name", "not ilike", "gift"],
      ]],
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
    // product_id is [id, name] tuple from Odoo many2one field
    const pid = Array.isArray(q.product_id) ? (q.product_id as unknown[])[0] as number : q.product_id as unknown as number;
    const qty = typeof q.quantity === "number" ? q.quantity : parseFloat(String(q.quantity ?? 0));
    const res = typeof q.reserved_quantity === "number" ? q.reserved_quantity : parseFloat(String(q.reserved_quantity ?? 0));
    const avail = qty - res;
    if (avail > 0) qtyMap.set(pid, (qtyMap.get(pid) ?? 0) + avail);
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
      {
        fields: [...productFields, "qty_available"],
        limit: PAGE,
        offset: 0,
        context: { location: LOCATION_47GDL },
      }
    ) as (OdooProduct & { qty_available?: number })[];
    for (const p of page ?? []) {
      // Prefer qty from stock.quant map; fallback to context-scoped qty_available
      const qtyFromQuant = Math.floor(qtyMap.get(p.id) ?? 0);
      const qtyFromProduct = Math.floor(typeof p.qty_available === "number" ? p.qty_available : 0);
      const qty = qtyFromQuant > 0 ? qtyFromQuant : qtyFromProduct;
      if (qty > 0) allProducts.push({ ...p, qty_47gdl: qty });
    }
  }

  return allProducts;
}

export async function testOdooConnection(): Promise<{ uid: number; serverVersion: string }> {
  const version = await xmlRpc("/xmlrpc/2/common", "version", []) as { server_version?: string };
  const uid = await getUid();
  return { uid, serverVersion: version?.server_version ?? "unknown" };
}
