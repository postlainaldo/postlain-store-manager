/**
 * Debug probe — inspect Odoo product fields to find store/location filter.
 * DELETE THIS FILE after debugging is done.
 */
export const dynamic = "force-dynamic";

const ODOO_URL = (process.env.ODOO_URL ?? "").replace(/\/$/, "").replace(/#.*$/, "").replace(/\/web.*$/, "");
const ODOO_DB  = process.env.ODOO_DB ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY ?? process.env.ODOO_PASSWORD ?? "";

function val(v: unknown): string {
  if (v === null || v === undefined) return "<value><boolean>0</boolean></value>";
  if (typeof v === "boolean")  return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  if (typeof v === "number")   return Number.isInteger(v) ? `<value><int>${v}</int></value>` : `<value><double>${v}</double></value>`;
  if (typeof v === "string")   return `<value><string>${v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</string></value>`;
  if (Array.isArray(v))        return `<value><array><data>${v.map(val).join("")}</data></array></value>`;
  if (typeof v === "object") {
    const m = Object.entries(v as Record<string,unknown>).map(([k,x]) => `<member><name>${k}</name>${val(x)}</member>`).join("");
    return `<value><struct>${m}</struct></value>`;
  }
  return `<value><string>${String(v)}</string></value>`;
}
function callXml(method: string, params: unknown[]) {
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${params.map(p=>`<param>${val(p)}</param>`).join("")}</params></methodCall>`;
}
function parseVal(src: string, start: number): unknown {
  const s = src.slice(start);
  if (/<int>|<i4>/.test(s)) return parseInt(s.match(/<(?:int|i4)>(.*?)<\/(?:int|i4)>/)?.[1]??"0",10);
  if (/<double>/.test(s))   return parseFloat(s.match(/<double>(.*?)<\/double>/)?.[1]??"0");
  if (/<boolean>/.test(s))  return s.match(/<boolean>(.*?)<\/boolean>/)?.[1]==="1";
  if (/<nil\/>/.test(s))    return null;
  if (/<string>/.test(s))   return (s.match(/<string>([\s\S]*?)<\/string>/)?.[1]??"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
  if (/<array>/.test(s)) {
    const data = s.match(/<array>\s*<data>([\s\S]*?)<\/data>/)?.[1]??"";
    const items: unknown[] = []; let p=0;
    while(true){const vi=data.indexOf("<value>",p);if(vi===-1)break;items.push(parseVal(data,vi));p=vi+7;}
    return items;
  }
  if (/<struct>/.test(s)) {
    const body = s.match(/<struct>([\s\S]*?)<\/struct>/)?.[1]??"";
    const obj: Record<string,unknown> = {};
    for(const m of body.split("<member>")){const name=m.match(/<name>(.*?)<\/name>/)?.[1];const vi=m.indexOf("<value>");if(name&&vi!==-1)obj[name]=parseVal(m,vi);}
    return obj;
  }
  return s.match(/<value>([\s\S]*?)<\/value>/)?.[1]?.trim()??null;
}
function parseXml(xml: string): unknown {
  if(xml.includes("<fault>")){const msg=xml.match(/<name>faultString<\/name>\s*<value><string>([\s\S]*?)<\/string>/)?.[1]??"fault";throw new Error(msg);}
  const vi=xml.indexOf("<value>");return vi===-1?null:parseVal(xml,vi);
}
async function xmlRpc(endpoint: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(`${ODOO_URL}${endpoint}`,{method:"POST",headers:{"Content-Type":"text/xml; charset=utf-8"},body:callXml(method,params),cache:"no-store",signal:AbortSignal.timeout(15000)});
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseXml(await res.text());
}

export async function GET() {
  try {
    // Auth
    const uid = await xmlRpc("/xmlrpc/2/common","authenticate",[ODOO_DB,ODOO_USERNAME,ODOO_PASSWORD,{}]) as number;
    if(!uid) return Response.json({error:"auth failed"});

    const results: Record<string,unknown> = { uid };

    // Get all fields of product.product
    const fields = await xmlRpc("/xmlrpc/2/object","execute_kw",[
      ODOO_DB, uid, ODOO_PASSWORD,
      "product.product", "fields_get", [],
      { attributes: ["string","type"] }
    ]) as Record<string,{string:string;type:string}>;

    // Filter fields likely related to store/location/warehouse
    const storeFields: Record<string,unknown> = {};
    for(const [k,v] of Object.entries(fields)){
      const label = (v.string??"").toLowerCase();
      if(label.includes("store")||label.includes("location")||label.includes("warehouse")||label.includes("shop")||label.includes("cửa hàng")||label.includes("kho")||k.includes("pos")||k.includes("store")||k.includes("location")||k.includes("warehouse")){
        storeFields[k] = v;
      }
    }
    results["store_related_fields"] = storeFields;

    // Fetch 1 sample product with all fields to inspect
    const sample = await xmlRpc("/xmlrpc/2/object","execute_kw",[
      ODOO_DB, uid, ODOO_PASSWORD,
      "product.product","search_read",
      [[["default_code","like","47GDL"]]],
      { fields: Object.keys(fields), limit: 1 }
    ]);
    results["sample_47GDL_product"] = sample;

    // Also try stock.quant to see location structure
    const quantFields = await xmlRpc("/xmlrpc/2/object","execute_kw",[
      ODOO_DB, uid, ODOO_PASSWORD,
      "stock.quant","fields_get",[],
      { attributes: ["string","type"] }
    ]) as Record<string,{string:string;type:string}>;
    const quantLocationFields: Record<string,unknown> = {};
    for(const [k,v] of Object.entries(quantFields)){
      quantLocationFields[k] = v;
    }
    results["stock_quant_fields"] = quantLocationFields;

    // Fetch sample quant with location name containing "47" or "Dalat" or "Đà Lạt"
    const sampleQuant = await xmlRpc("/xmlrpc/2/object","execute_kw",[
      ODOO_DB, uid, ODOO_PASSWORD,
      "stock.location","search_read",
      [[["complete_name","ilike","dalat"]]],
      { fields:["id","name","complete_name","usage"], limit: 10 }
    ]);
    results["locations_dalat"] = sampleQuant;

    const sampleQuant2 = await xmlRpc("/xmlrpc/2/object","execute_kw",[
      ODOO_DB, uid, ODOO_PASSWORD,
      "stock.location","search_read",
      [[["complete_name","ilike","47"]]],
      { fields:["id","name","complete_name","usage"], limit: 10 }
    ]);
    results["locations_47"] = sampleQuant2;

    return Response.json(results);
  } catch(e) {
    return Response.json({ error: String(e) });
  }
}
