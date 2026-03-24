/**
 * Probe v6 — show exact JSON from stock.quant child_of 2027
 * DELETE after debugging.
 */
export const dynamic = "force-dynamic";

const ODOO_URL = (process.env.ODOO_URL ?? "").replace(/\/$/, "").replace(/#.*$/, "").replace(/\/web.*$/, "");
const ODOO_DB  = process.env.ODOO_DB ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY ?? "";

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
async function rawXml(endpoint: string, method: string, params: unknown[]): Promise<string> {
  const res = await fetch(`${ODOO_URL}${endpoint}`,{method:"POST",headers:{"Content-Type":"text/xml; charset=utf-8"},body:xmlCall(method,params),cache:"no-store",signal:AbortSignal.timeout(15000)});
  return res.text();
}
function ints(s: string) { return [...s.matchAll(/<(?:int|i4)>(.*?)<\/(?:int|i4)>/g)].map(m=>parseInt(m[1],10)); }

export async function GET() {
  // Auth via XML-RPC
  const uid = ints(await rawXml("/xmlrpc/2/common","authenticate",[ODOO_DB,ODOO_USERNAME,ODOO_PASSWORD,{}]))[0];
  if (!uid) return Response.json({error:"auth failed"});

  // Get session cookie via JSON-RPC
  let cookie = "";
  const authRes = await fetch(`${ODOO_URL}/web/session/authenticate`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",method:"call",id:1,params:{db:ODOO_DB,login:ODOO_USERNAME,password:ODOO_PASSWORD}}),
    cache:"no-store",
  });
  const sc = authRes.headers.get("set-cookie");
  if (sc?.includes("session_id=")) { const m=sc.match(/session_id=([^;]+)/); if(m) cookie=`session_id=${m[1]}`; }

  async function jrpc(model: string, method: string, args: unknown[], kwargs: unknown = {}) {
    const r = await fetch(`${ODOO_URL}/web/dataset/call_kw`,{
      method:"POST",
      headers:{"Content-Type":"application/json", ...(cookie?{Cookie:cookie}:{})},
      body:JSON.stringify({jsonrpc:"2.0",method:"call",id:1,params:{model,method,args,kwargs:{context:{lang:"vi_VN"},...(kwargs as object)}}}),
      cache:"no-store",signal:AbortSignal.timeout(15000),
    });
    const j = await r.json() as {result?:unknown;error?:{message:string;data?:{message:string}}};
    if(j.error) throw new Error(j.error.data?.message??j.error.message);
    return j.result;
  }

  // Count quants child_of 2027
  const countAll  = await jrpc("stock.quant","search_count",[[["location_id","child_of",2027]]]);
  const countPos  = await jrpc("stock.quant","search_count",[[["location_id","child_of",2027],["quantity",">",0]]]);

  // Get 5 sample quants with qty > 0 — show exact JSON
  const sample = await jrpc("stock.quant","search_read",
    [[["location_id","child_of",2027],["quantity",">",0]]],
    {fields:["product_id","quantity","reserved_quantity","location_id"],limit:5}
  );

  // Count with on_hand filter
  const countOnHand = await jrpc("stock.quant","search_count",
    [[["location_id","child_of",2027],["on_hand","=",true]]]
  );

  // Try product.product with location context
  const prodSample = await jrpc("product.product","search_read",
    [[["active","=",true]]],
    {fields:["id","default_code","name","qty_available"],limit:5,context:{lang:"vi_VN",location:2027}}
  );

  return Response.json({
    uid, cookie: cookie?"set":"missing",
    countAll, countPos, countOnHand,
    quantSample: sample,
    productSampleWithContext: prodSample,
  });
}
