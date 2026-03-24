/**
 * Debug probe v3 — use JSON-RPC (no CSRF needed for read-only after auth via XML-RPC uid)
 * Actually use XML-RPC but with simpler targeted queries.
 * DELETE THIS FILE after debugging.
 */
export const dynamic = "force-dynamic";

const ODOO_URL = (process.env.ODOO_URL ?? "").replace(/\/$/, "").replace(/#.*$/, "").replace(/\/web.*$/, "");
const ODOO_DB  = process.env.ODOO_DB ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY ?? process.env.ODOO_PASSWORD ?? "";

// Minimal XML-RPC
function v(x: unknown): string {
  if (x === null || x === undefined) return "<value><boolean>0</boolean></value>";
  if (typeof x === "number") return Number.isInteger(x) ? `<value><int>${x}</int></value>` : `<value><double>${x}</double></value>`;
  if (typeof x === "boolean") return `<value><boolean>${x?1:0}</boolean></value>`;
  if (typeof x === "string") return `<value><string>${x.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</string></value>`;
  if (Array.isArray(x)) return `<value><array><data>${x.map(v).join("")}</data></array></value>`;
  const m = Object.entries(x as Record<string,unknown>).map(([k,val])=>`<member><name>${k}</name>${v(val)}</member>`).join("");
  return `<value><struct>${m}</struct></value>`;
}
function xml(method: string, params: unknown[]) {
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${params.map(p=>`<param>${v(p)}</param>`).join("")}</params></methodCall>`;
}

// Simple text-based extractor — just grab all int values and string values
function extractInts(s: string): number[] {
  return [...s.matchAll(/<(?:int|i4)>(.*?)<\/(?:int|i4)>/g)].map(m=>parseInt(m[1],10));
}
function extractStrings(s: string): string[] {
  return [...s.matchAll(/<string>([\s\S]*?)<\/string>/g)].map(m=>m[1].replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">"));
}

async function xrpc(endpoint: string, method: string, params: unknown[]): Promise<string> {
  const res = await fetch(`${ODOO_URL}${endpoint}`,{method:"POST",headers:{"Content-Type":"text/xml; charset=utf-8"},body:xml(method,params),cache:"no-store",signal:AbortSignal.timeout(15000)});
  return res.text();
}

export async function GET() {
  // Auth
  const authXml = await xrpc("/xmlrpc/2/common","authenticate",[ODOO_DB,ODOO_USERNAME,ODOO_PASSWORD,{}]);
  const uid = extractInts(authXml)[0];
  if (!uid) return Response.json({error:"auth failed", raw: authXml.slice(0,200)});

  const results: Record<string,unknown> = { uid };

  // Get location details for ID 3324 and 2038
  const locXml = await xrpc("/xmlrpc/2/object","execute_kw",[
    ODOO_DB, uid, ODOO_PASSWORD,
    "stock.location","search_read",
    [[["id","in",[2038,3324]]]],
    { fields:["id","name","complete_name","usage","active"], limit:10 }
  ]);
  results["location_details_raw_strings"] = extractStrings(locXml);
  results["location_details_raw_ints"] = extractInts(locXml);

  // Search locations with "47" in name
  const loc47Xml = await xrpc("/xmlrpc/2/object","execute_kw",[
    ODOO_DB, uid, ODOO_PASSWORD,
    "stock.location","search_read",
    [[["complete_name","ilike","47"]]],
    { fields:["id","name","complete_name","usage"], limit:20 }
  ]);
  results["loc_47_strings"] = extractStrings(loc47Xml);
  results["loc_47_ints"] = extractInts(loc47Xml);

  // Search locations with "dalat" or "đà lạt"
  const locDalatXml = await xrpc("/xmlrpc/2/object","execute_kw",[
    ODOO_DB, uid, ODOO_PASSWORD,
    "stock.location","search_read",
    [[["complete_name","ilike","dalat"]]],
    { fields:["id","name","complete_name","usage"], limit:20 }
  ]);
  results["loc_dalat_strings"] = extractStrings(locDalatXml);
  results["loc_dalat_ints"] = extractInts(locDalatXml);

  // stock.quant: get qty for location 2038 (sample 5 records)
  const quantXml = await xrpc("/xmlrpc/2/object","execute_kw",[
    ODOO_DB, uid, ODOO_PASSWORD,
    "stock.quant","search_read",
    [[["location_id","=",2038]]],
    { fields:["product_id","qty_available","quantity","location_id","reserved_quantity"], limit:5 }
  ]);
  results["quant_loc2038_strings"] = extractStrings(quantXml);
  results["quant_loc2038_ints"] = extractInts(quantXml);

  return Response.json(results);
}
