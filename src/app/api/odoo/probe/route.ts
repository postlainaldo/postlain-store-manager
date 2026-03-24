/**
 * Debug probe — tests raw connectivity to Odoo.
 * Visit GET /api/odoo/probe to see what Odoo returns.
 * DELETE THIS FILE after debugging is done.
 */
export const dynamic = "force-dynamic";

const ODOO_URL = (process.env.ODOO_URL ?? "").replace(/\/$/, "");
const ODOO_DB  = process.env.ODOO_DB ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY ?? process.env.ODOO_PASSWORD ?? "";

export async function GET() {
  const results: Record<string, unknown> = {
    env: {
      ODOO_URL: ODOO_URL || "(not set)",
      ODOO_DB: ODOO_DB || "(not set)",
      ODOO_USERNAME: ODOO_USERNAME || "(not set)",
      ODOO_PASSWORD: ODOO_PASSWORD ? `(set, ${ODOO_PASSWORD.length} chars)` : "(not set)",
    },
  };

  if (!ODOO_URL) {
    return Response.json({ error: "ODOO_URL not set", ...results });
  }

  // Test 1: plain GET to root
  try {
    const r = await fetch(ODOO_URL, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    results["GET /"] = { status: r.status, ok: r.ok };
  } catch (e) { results["GET /"] = { error: String(e) }; }

  // Test 2: XML-RPC version (no auth needed)
  try {
    const body = `<?xml version="1.0"?><methodCall><methodName>version</methodName><params></params></methodCall>`;
    const r = await fetch(`${ODOO_URL}/xmlrpc/2/common`, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    results["xmlrpc/2/common version"] = { status: r.status, body: text.slice(0, 500) };
  } catch (e) { results["xmlrpc/2/common version"] = { error: String(e) }; }

  // Test 3: XML-RPC authenticate
  try {
    const body = `<?xml version="1.0"?><methodCall><methodName>authenticate</methodName><params>
      <param><value><string>${ODOO_DB}</string></value></param>
      <param><value><string>${ODOO_USERNAME}</string></value></param>
      <param><value><string>${ODOO_PASSWORD}</string></value></param>
      <param><value><struct></struct></value></param>
    </params></methodCall>`;
    const r = await fetch(`${ODOO_URL}/xmlrpc/2/common`, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    results["xmlrpc/2/common authenticate"] = { status: r.status, body: text.slice(0, 500) };
  } catch (e) { results["xmlrpc/2/common authenticate"] = { error: String(e) }; }

  // Test 4: JSON-RPC version_info
  try {
    const r = await fetch(`${ODOO_URL}/web/webclient/version_info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: 1, params: {} }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    results["json /web/webclient/version_info"] = { status: r.status, body: text.slice(0, 500) };
  } catch (e) { results["json /web/webclient/version_info"] = { error: String(e) }; }

  return Response.json(results, { status: 200 });
}
