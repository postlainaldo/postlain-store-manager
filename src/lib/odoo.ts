/**
 * Odoo JSON-RPC 2.0 client
 *
 * Authenticates with ODOO_USERNAME + ODOO_PASSWORD (password login).
 * ODOO_API_KEY is used as password if set, otherwise falls back to ODOO_PASSWORD.
 *
 * Env vars required:
 *   ODOO_URL      e.g. https://aldo-erp.vti-cl.com
 *   ODOO_DB       e.g. aldo_vn_prod
 *   ODOO_USERNAME e.g. sm47@vti-cl.com
 *   ODOO_API_KEY  password (rename this var to ODOO_PASSWORD if you prefer)
 */

const ODOO_URL      = process.env.ODOO_URL       ?? "";
const ODOO_DB       = process.env.ODOO_DB         ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME   ?? "";
// Accept either ODOO_API_KEY or ODOO_PASSWORD — whichever is set
const ODOO_PASSWORD = process.env.ODOO_API_KEY    ?? process.env.ODOO_PASSWORD ?? "";

// ─── Low-level JSON-RPC ───────────────────────────────────────────────────────

async function rpc(path: string, params: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${ODOO_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      id: 1,
      params,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Odoo HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json() as { result?: unknown; error?: { message: string; data?: { message: string } } };
  if (json.error) {
    throw new Error(json.error.data?.message ?? json.error.message ?? "Odoo RPC error");
  }
  return json.result;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

let _uid: number | null = null;

async function getUid(): Promise<number> {
  if (_uid !== null) return _uid;
  const result = await rpc("/web/session/authenticate", {
    db: ODOO_DB,
    login: ODOO_USERNAME,
    password: ODOO_PASSWORD,
  });
  const uid = (result as { uid?: number })?.uid;
  if (!uid) throw new Error("Odoo auth failed — check ODOO_USERNAME and ODOO_API_KEY");
  _uid = uid;
  return uid;
}

// ─── Model call helper ────────────────────────────────────────────────────────

async function callKw(
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
): Promise<unknown> {
  const uid = await getUid();
  return rpc("/web/dataset/call_kw", {
    model,
    method,
    args,
    kwargs: {
      context: { lang: "vi_VN", uid },
      ...kwargs,
    },
  });
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

/**
 * Fetch all active products with their available stock quantity.
 */
export async function fetchOdooProducts(): Promise<OdooProduct[]> {
  const fields = [
    "id", "default_code", "name", "list_price",
    "categ_id", "qty_available", "description_sale", "active",
  ];

  const result = await callKw(
    "product.product",
    "search_read",
    [[["active", "=", true]]],
    {
      fields,
      limit: 0,  // 0 = no limit
      order: "default_code asc",
    }
  );

  return (result as OdooProduct[]) ?? [];
}

/**
 * Fetch product categories from Odoo.
 * Returns a map: id → name string
 */
export async function fetchOdooCategories(): Promise<Map<number, string>> {
  const result = await callKw(
    "product.category",
    "search_read",
    [[]],
    { fields: ["id", "name", "complete_name"] }
  ) as Array<{ id: number; name: string; complete_name: string }>;

  const map = new Map<number, string>();
  for (const c of result ?? []) {
    map.set(c.id, c.complete_name || c.name);
  }
  return map;
}

/**
 * Test the connection and return the Odoo version info.
 */
export async function testOdooConnection(): Promise<{ uid: number; serverVersion: string }> {
  const versionResult = await rpc("/web/webclient/version_info", {}) as {
    server_version?: string;
  };
  const uid = await getUid();
  return {
    uid,
    serverVersion: versionResult?.server_version ?? "unknown",
  };
}
