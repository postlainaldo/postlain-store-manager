/**
 * Odoo JSON-RPC client (with CSRF token support)
 *
 * This Odoo instance requires a CSRF token. Flow:
 *   1. GET /web/csrf/token → get csrf_token
 *   2. POST /web/session/authenticate with X-CSRFToken header
 *   3. POST /web/dataset/call_kw for data calls
 *
 * Env vars:
 *   ODOO_URL      https://aldo-erp.vti-cl.com   (domain only, no path)
 *   ODOO_DB       aldo_vn_prod
 *   ODOO_USERNAME sm47@vti-cl.com
 *   ODOO_API_KEY  password
 */

const ODOO_URL      = (process.env.ODOO_URL ?? "").replace(/\/$/, "").replace(/#.*$/, "").replace(/\/web$/, "");
const ODOO_DB       = process.env.ODOO_DB        ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME  ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY   ?? process.env.ODOO_PASSWORD ?? "";

// ─── Session state ────────────────────────────────────────────────────────────
// On Vercel, each serverless invocation is stateless — we re-auth every call.
// Cache within a single request chain using module-level vars (same warm instance).

let _uid: number | null = null;
let _sessionCookie: string | null = null;
let _csrfToken: string | null = null;

// ─── CSRF token ───────────────────────────────────────────────────────────────

async function fetchCsrfToken(): Promise<string> {
  // First get a session cookie from the login page
  const homeRes = await fetch(`${ODOO_URL}/web/login`, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  });
  // Extract session_id cookie
  const setCookie = homeRes.headers.get("set-cookie") ?? "";
  const sessionMatch = setCookie.match(/session_id=([^;]+)/);
  if (sessionMatch) _sessionCookie = `session_id=${sessionMatch[1]}`;

  // Get CSRF token via dedicated endpoint (Odoo 14+)
  const csrfRes = await fetch(`${ODOO_URL}/web/csrf/token`, {
    method: "GET",
    headers: _sessionCookie ? { Cookie: _sessionCookie } : {},
    cache: "no-store",
  });

  if (csrfRes.ok) {
    const data = await csrfRes.json() as { csrf_token?: string; result?: string };
    const token = data.csrf_token ?? data.result;
    if (token) return token;
  }

  // Fallback: parse csrf_token from login page HTML
  const html = await homeRes.text();
  const match = html.match(/csrf_token['":\s]+['"]([a-f0-9]+)['"]/);
  if (match) return match[1];

  // Last resort: use "1" which some older Odoo versions accept
  return "1";
}

// ─── JSON-RPC call ────────────────────────────────────────────────────────────

async function rpc(path: string, params: Record<string, unknown>): Promise<unknown> {
  if (!_csrfToken) _csrfToken = await fetchCsrfToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-CSRFToken": _csrfToken,
  };
  if (_sessionCookie) headers["Cookie"] = _sessionCookie;

  const res = await fetch(`${ODOO_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: 1, params }),
    cache: "no-store",
  });

  // Capture session cookie from response
  const sc = res.headers.get("set-cookie");
  if (sc?.includes("session_id=")) {
    const m = sc.match(/session_id=([^;]+)/);
    if (m) _sessionCookie = `session_id=${m[1]}`;
  }

  if (!res.ok) throw new Error(`Odoo HTTP ${res.status}: ${res.statusText}`);

  const json = await res.json() as {
    result?: unknown;
    error?: { message: string; data?: { message: string } };
  };
  if (json.error) {
    throw new Error(json.error.data?.message ?? json.error.message ?? "Odoo RPC error");
  }
  return json.result;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getUid(): Promise<number> {
  if (_uid !== null) return _uid;

  const result = await rpc("/web/session/authenticate", {
    db: ODOO_DB,
    login: ODOO_USERNAME,
    password: ODOO_PASSWORD,
  });

  const uid = (result as { uid?: number })?.uid;
  if (!uid) throw new Error("Odoo auth failed — kiểm tra ODOO_DB, ODOO_USERNAME, ODOO_API_KEY");
  _uid = uid;
  return uid;
}

// ─── Model call ───────────────────────────────────────────────────────────────

async function callKw(
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
): Promise<unknown> {
  await getUid(); // ensure authenticated
  return rpc("/web/dataset/call_kw", {
    model,
    method,
    args,
    kwargs: { context: { lang: "vi_VN" }, ...kwargs },
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

export async function fetchOdooProducts(): Promise<OdooProduct[]> {
  const result = await callKw(
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
  const uid = await getUid();
  // Get server version via session info
  const info = await rpc("/web/session/get_session_info", {}) as { server_version?: string };
  return { uid, serverVersion: info?.server_version ?? "unknown" };
}
