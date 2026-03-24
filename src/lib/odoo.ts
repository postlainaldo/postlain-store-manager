/**
 * Odoo XML-RPC client
 *
 * Uses Odoo's standard XML-RPC API (/xmlrpc/2/common + /xmlrpc/2/object).
 * This is the officially supported external API — no session/cookie needed.
 *
 * Env vars required:
 *   ODOO_URL      e.g. https://aldo-erp.vti-cl.com
 *   ODOO_DB       e.g. aldo_vn_prod
 *   ODOO_USERNAME e.g. sm47@vti-cl.com
 *   ODOO_API_KEY  password (or API key if available)
 */

const ODOO_URL      = (process.env.ODOO_URL      ?? "").replace(/\/$/, "");
const ODOO_DB       = process.env.ODOO_DB         ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME   ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY    ?? process.env.ODOO_PASSWORD ?? "";

// ─── XML-RPC helpers ──────────────────────────────────────────────────────────

function xmlVal(v: unknown): string {
  if (v === null || v === undefined) return "<value><boolean>0</boolean></value>";
  if (typeof v === "boolean") return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  if (typeof v === "number") return Number.isInteger(v)
    ? `<value><int>${v}</int></value>`
    : `<value><double>${v}</double></value>`;
  if (typeof v === "string") return `<value><string>${v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</string></value>`;
  if (Array.isArray(v)) return `<value><array><data>${v.map(xmlVal).join("")}</data></array></value>`;
  if (typeof v === "object") {
    const members = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `<member><name>${k}</name>${xmlVal(val)}</member>`)
      .join("");
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${String(v)}</string></value>`;
}

function buildXmlRpc(method: string, params: unknown[]): string {
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${
    params.map(p => `<param>${xmlVal(p)}</param>`).join("")
  }</params></methodCall>`;
}

// Very minimal XML-RPC response parser (handles the shapes Odoo returns)
function parseXmlRpc(xml: string): unknown {
  // Check for fault
  if (xml.includes("<fault>")) {
    const msg = xml.match(/<name>faultString<\/name>\s*<value><string>([\s\S]*?)<\/string>/)?.[1] ?? "XML-RPC fault";
    throw new Error(`Odoo fault: ${msg}`);
  }
  return parseValue(xml, xml.indexOf("<value>"));
}

function parseValue(xml: string, start: number): unknown {
  const inner = xml.slice(start);
  if (inner.includes("<int>") || inner.includes("<i4>")) {
    const tag = inner.includes("<int>") ? "int" : "i4";
    return parseInt(inner.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] ?? "0", 10);
  }
  if (inner.includes("<double>")) return parseFloat(inner.match(/<double>(.*?)<\/double>/)?.[1] ?? "0");
  if (inner.includes("<boolean>")) return (inner.match(/<boolean>(.*?)<\/boolean>/)?.[1] ?? "0") === "1";
  if (inner.includes("<string>")) return (inner.match(/<string>([\s\S]*?)<\/string>/)?.[1] ?? "").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
  if (inner.includes("<array>")) {
    const dataMatch = inner.match(/<array>\s*<data>([\s\S]*?)<\/data>\s*<\/array>/);
    if (!dataMatch) return [];
    const items: unknown[] = [];
    let pos = 0;
    const data = dataMatch[1];
    while (true) {
      const vi = data.indexOf("<value>", pos);
      if (vi === -1) break;
      items.push(parseValue(data, vi));
      pos = vi + 7;
    }
    return items;
  }
  if (inner.includes("<struct>")) {
    const structMatch = inner.match(/<struct>([\s\S]*?)<\/struct>/);
    if (!structMatch) return {};
    const obj: Record<string, unknown> = {};
    const members = structMatch[1].split("<member>");
    for (const m of members) {
      const name = m.match(/<name>(.*?)<\/name>/)?.[1];
      if (!name) continue;
      const vi = m.indexOf("<value>");
      if (vi === -1) continue;
      obj[name] = parseValue(m, vi);
    }
    return obj;
  }
  // fallback: raw text between <value> tags
  return inner.match(/<value>([\s\S]*?)<\/value>/)?.[1]?.trim() ?? null;
}

async function xmlRpc(endpoint: string, method: string, params: unknown[]): Promise<unknown> {
  const body = buildXmlRpc(method, params);
  const res = await fetch(`${ODOO_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Odoo HTTP ${res.status}: ${res.statusText}`);
  const text = await res.text();
  return parseXmlRpc(text);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

let _uid: number | null = null;

async function getUid(): Promise<number> {
  if (_uid !== null) return _uid;
  const uid = await xmlRpc("/xmlrpc/2/common", "authenticate", [
    ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD, {},
  ]);
  if (!uid || typeof uid !== "number") {
    throw new Error("Odoo auth failed — kiểm tra ODOO_DB, ODOO_USERNAME, ODOO_API_KEY");
  }
  _uid = uid;
  return uid;
}

// ─── Model execute helper ─────────────────────────────────────────────────────

async function execute(
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
): Promise<unknown> {
  const uid = await getUid();
  return xmlRpc("/xmlrpc/2/object", "execute_kw", [
    ODOO_DB, uid, ODOO_PASSWORD,
    model, method, args, kwargs,
  ]);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OdooProduct {
  id: number;
  default_code: string | false;
  name: string;
  list_price: number;
  categ_id: [number, string] | false;
  qty_available: number;
  description_sale: string | false;
  active: boolean;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchOdooProducts(): Promise<OdooProduct[]> {
  const result = await execute(
    "product.product",
    "search_read",
    [[["active", "=", true]]],
    {
      fields: ["id", "default_code", "name", "list_price", "categ_id", "qty_available", "description_sale"],
      limit: 0,
      order: "default_code asc",
    }
  );
  return (result as OdooProduct[]) ?? [];
}

export async function testOdooConnection(): Promise<{ uid: number; serverVersion: string }> {
  const version = await xmlRpc("/xmlrpc/2/common", "version", []) as { server_version?: string };
  const uid = await getUid();
  return { uid, serverVersion: version?.server_version ?? "unknown" };
}
