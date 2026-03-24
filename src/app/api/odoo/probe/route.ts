/**
 * Debug probe v4 — check stock.quant at location 2026
 * DELETE THIS FILE after debugging.
 */
export const dynamic = "force-dynamic";

const ODOO_URL = (process.env.ODOO_URL ?? "").replace(/\/$/, "").replace(/#.*$/, "").replace(/\/web.*$/, "");
const ODOO_DB  = process.env.ODOO_DB ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY ?? process.env.ODOO_PASSWORD ?? "";

function enc(s: string) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function v(x: unknown): string {
  if (x === null || x === undefined) return "<value><boolean>0</boolean></value>";
  if (typeof x === "number") return Number.isInteger(x) ? `<value><int>${x}</int></value>` : `<value><double>${x}</double></value>`;
  if (typeof x === "boolean") return `<value><boolean>${x?1:0}</boolean></value>`;
  if (typeof x === "string") return `<value><string>${enc(x)}</string></value>`;
  if (Array.isArray(x)) return `<value><array><data>${x.map(v).join("")}</data></array></value>`;
  const m = Object.entries(x as Record<string,unknown>).map(([k,val])=>`<member><name>${k}</name>${v(val)}</member>`).join("");
  return `<value><struct>${m}</struct></value>`;
}
function xmlCall(method: string, params: unknown[]) {
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${params.map(p=>`<param>${v(p)}</param>`).join("")}</params></methodCall>`;
}

async function raw(endpoint: string, method: string, params: unknown[]): Promise<string> {
  const res = await fetch(`${ODOO_URL}${endpoint}`,{method:"POST",headers:{"Content-Type":"text/xml; charset=utf-8"},body:xmlCall(method,params),cache:"no-store",signal:AbortSignal.timeout(20000)});
  return res.text();
}

// Extract all integers from XML
function ints(s: string): number[] { return [...s.matchAll(/<(?:int|i4)>(.*?)<\/(?:int|i4)>/g)].map(m=>parseInt(m[1],10)); }
// Extract all strings from XML
function strs(s: string): string[] { return [...s.matchAll(/<string>([\s\S]*?)<\/string>/g)].map(m=>m[1]); }
// Extract all doubles
function dbls(s: string): number[] { return [...s.matchAll(/<double>(.*?)<\/double>/g)].map(m=>parseFloat(m[1])); }

export async function GET() {
  const authXml = await raw("/xmlrpc/2/common","authenticate",[ODOO_DB,ODOO_USERNAME,ODOO_PASSWORD,{}]);
  const uid = ints(authXml)[0];
  if (!uid) return Response.json({error:"auth failed"});

  const results: Record<string,unknown> = { uid };

  // Count total quants at location 2026
  const countXml = await raw("/xmlrpc/2/object","execute_kw",[
    ODOO_DB, uid, ODOO_PASSWORD,
    "stock.quant","search_count",
    [[["location_id","=",2026]]],
    {}
  ]);
  results["quant_count_loc2026"] = ints(countXml)[0] ?? "parse error";

  // Get first 5 quants at 2026 — raw XML snippet
  const quantXml = await raw("/xmlrpc/2/object","execute_kw",[
    ODOO_DB, uid, ODOO_PASSWORD,
    "stock.quant","search_read",
    [[["location_id","=",2026]]],
    { fields:["product_id","quantity","reserved_quantity","location_id"], limit:5 }
  ]);
  results["quant_sample_strings"] = strs(quantXml).slice(0,30);
  results["quant_sample_ints"] = ints(quantXml).slice(0,30);
  results["quant_sample_doubles"] = dbls(quantXml).slice(0,20);

  // Count total quants where qty > 0
  const countPosXml = await raw("/xmlrpc/2/object","execute_kw",[
    ODOO_DB, uid, ODOO_PASSWORD,
    "stock.quant","search_count",
    [[["location_id","=",2026],["quantity",">",0]]],
    {}
  ]);
  results["quant_count_positive_qty"] = ints(countPosXml)[0] ?? "parse error";

  // Check if location 2026 is correct — get its details
  const locXml = await raw("/xmlrpc/2/object","execute_kw",[
    ODOO_DB, uid, ODOO_PASSWORD,
    "stock.location","read",
    [[2026]],
    { fields:["id","name","complete_name","usage"] }
  ]);
  results["location_2026_strings"] = strs(locXml);
  results["location_2026_ints"] = ints(locXml);

  return Response.json(results);
}
