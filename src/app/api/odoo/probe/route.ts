/**
 * Debug probe v5 — verify what sync actually fetches
 * DELETE THIS FILE after debugging.
 */
export const dynamic = "force-dynamic";

const ODOO_URL = (process.env.ODOO_URL ?? "").replace(/\/$/, "").replace(/#.*$/, "").replace(/\/web.*$/, "");
const ODOO_DB  = process.env.ODOO_DB ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY ?? process.env.ODOO_PASSWORD ?? "";

function enc(s: string) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function xv(x: unknown): string {
  if (x === null || x === undefined) return "<value><boolean>0</boolean></value>";
  if (typeof x === "number") return Number.isInteger(x) ? `<value><int>${x}</int></value>` : `<value><double>${x}</double></value>`;
  if (typeof x === "boolean") return `<value><boolean>${x?1:0}</boolean></value>`;
  if (typeof x === "string") return `<value><string>${enc(x)}</string></value>`;
  if (Array.isArray(x)) return `<value><array><data>${x.map(xv).join("")}</data></array></value>`;
  const m = Object.entries(x as Record<string,unknown>).map(([k,val])=>`<member><name>${k}</name>${xv(val)}</member>`).join("");
  return `<value><struct>${m}</struct></value>`;
}
function xmlCall(method: string, params: unknown[]) {
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${params.map(p=>`<param>${xv(p)}</param>`).join("")}</params></methodCall>`;
}
async function raw(endpoint: string, method: string, params: unknown[]): Promise<string> {
  const res = await fetch(`${ODOO_URL}${endpoint}`,{method:"POST",headers:{"Content-Type":"text/xml; charset=utf-8"},body:xmlCall(method,params),cache:"no-store",signal:AbortSignal.timeout(20000)});
  return res.text();
}
function ints(s: string): number[] { return [...s.matchAll(/<(?:int|i4)>(.*?)<\/(?:int|i4)>/g)].map(m=>parseInt(m[1],10)); }
function strs(s: string): string[] { return [...s.matchAll(/<string>([\s\S]*?)<\/string>/g)].map(m=>m[1]); }
function dbls(s: string): number[] { return [...s.matchAll(/<double>(.*?)<\/double>/g)].map(m=>parseFloat(m[1])); }

export async function GET() {
  const uid = ints(await raw("/xmlrpc/2/common","authenticate",[ODOO_DB,ODOO_USERNAME,ODOO_PASSWORD,{}]))[0];
  if (!uid) return Response.json({error:"auth failed"});

  const results: Record<string,unknown> = { uid };

  // 1. Count quants child_of 2027 with qty > 0
  const countXml = await raw("/xmlrpc/2/object","execute_kw",[
    ODOO_DB, uid, ODOO_PASSWORD,
    "stock.quant","search_count",
    [[["location_id","child_of",2027],["quantity",">",0]]],{}
  ]);
  results["count_qty_positive"] = ints(countXml)[0];

  // 2. Count all quants child_of 2027
  const countAllXml = await raw("/xmlrpc/2/object","execute_kw",[
    ODOO_DB, uid, ODOO_PASSWORD,
    "stock.quant","search_count",
    [[["location_id","child_of",2027]]],{}
  ]);
  results["count_all"] = ints(countAllXml)[0];

  // 3. Get 3 sample quants with qty > 0 — raw XML to see double values
  const sampleXml = await raw("/xmlrpc/2/object","execute_kw",[
    ODOO_DB, uid, ODOO_PASSWORD,
    "stock.quant","search_read",
    [[["location_id","child_of",2027],["quantity",">",0]]],
    { fields:["product_id","quantity","reserved_quantity","location_id"], limit:3 }
  ]);
  // Show raw XML snippet (first 1500 chars) to see what types Odoo returns
  results["sample_raw_xml_snippet"] = sampleXml.slice(0, 2000);
  results["sample_strs"] = strs(sampleXml).slice(0, 20);
  results["sample_ints"] = ints(sampleXml).slice(0, 20);
  results["sample_doubles"] = dbls(sampleXml).slice(0, 20);

  // 4. Get product.product fields for 1 product to check qty_available
  const prodXml = await raw("/xmlrpc/2/object","execute_kw",[
    ODOO_DB, uid, ODOO_PASSWORD,
    "product.product","search_read",
    [[["active","=",true]]],
    { fields:["id","default_code","name","qty_available"], limit:3, order:"id asc" }
  ]);
  results["prod_sample_raw"] = prodXml.slice(0, 2000);
  results["prod_strs"] = strs(prodXml).slice(0, 20);
  results["prod_ints"] = ints(prodXml).slice(0, 10);
  results["prod_doubles"] = dbls(prodXml).slice(0, 10);

  return Response.json(results);
}
