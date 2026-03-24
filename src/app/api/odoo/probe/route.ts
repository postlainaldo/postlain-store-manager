/**
 * Debug probe — tests raw connectivity to Odoo.
 * DELETE THIS FILE after debugging is done.
 */
export const dynamic = "force-dynamic";

const RAW_URL = process.env.ODOO_URL ?? "";
const ODOO_URL = RAW_URL.replace(/\/$/, "").replace(/#.*$/, "").replace(/\/web$/, "");
const ODOO_DB  = process.env.ODOO_DB ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY ?? process.env.ODOO_PASSWORD ?? "";

export async function GET() {
  const results: Record<string, unknown> = {
    env: {
      ODOO_URL_raw: RAW_URL || "(not set)",
      ODOO_URL_cleaned: ODOO_URL || "(not set)",
      ODOO_DB: ODOO_DB || "(not set)",
      ODOO_USERNAME: ODOO_USERNAME || "(not set)",
      ODOO_PASSWORD: ODOO_PASSWORD ? `(set, ${ODOO_PASSWORD.length} chars)` : "(not set)",
    },
  };

  if (!ODOO_URL) return Response.json({ error: "ODOO_URL not set", ...results });

  // Test 1: GET login page + grab session cookie + CSRF token
  let sessionCookie = "";
  let csrfToken = "";
  try {
    const r = await fetch(`${ODOO_URL}/web/login`, {
      cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    const setCookie = r.headers.get("set-cookie") ?? "";
    const sm = setCookie.match(/session_id=([^;]+)/);
    if (sm) sessionCookie = `session_id=${sm[1]}`;
    const html = await r.text();
    const cm = html.match(/csrf_token['":\s]+['"]([a-f0-9]+)['"]/);
    if (cm) csrfToken = cm[1];
    results["GET /web/login"] = { status: r.status, sessionCookie: sessionCookie || "(none)", csrfFromHtml: csrfToken || "(none)" };
  } catch (e) { results["GET /web/login"] = { error: String(e) }; }

  // Test 2: GET /web/csrf/token
  try {
    const r = await fetch(`${ODOO_URL}/web/csrf/token`, {
      headers: sessionCookie ? { Cookie: sessionCookie } : {},
      cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    results["GET /web/csrf/token"] = { status: r.status, body: text.slice(0, 300) };
    try {
      const j = JSON.parse(text) as { csrf_token?: string; result?: string };
      if (j.csrf_token) csrfToken = j.csrf_token;
      else if (j.result) csrfToken = j.result;
    } catch { /* not json */ }
  } catch (e) { results["GET /web/csrf/token"] = { error: String(e) }; }

  // Test 3: authenticate with CSRF token
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (csrfToken) headers["X-CSRFToken"] = csrfToken;
    if (sessionCookie) headers["Cookie"] = sessionCookie;
    const r = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: 1, params: { db: ODOO_DB, login: ODOO_USERNAME, password: ODOO_PASSWORD } }),
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    const text = await r.text();
    results["POST /web/session/authenticate"] = { status: r.status, body: text.slice(0, 600), csrfUsed: csrfToken || "(none)" };
  } catch (e) { results["POST /web/session/authenticate"] = { error: String(e) }; }

  return Response.json(results, { status: 200 });
}
