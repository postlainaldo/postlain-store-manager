/**
 * Odoo Reports — real-time data fetch for daily report views
 *
 * Pulls directly from Odoo (not SQLite cache) so we get:
 *  - x_productgroup (MH category)
 *  - payment method breakdown
 *  - per-employee (cashier) breakdown
 */

const ODOO_URL = (process.env.ODOO_URL ?? "").replace(/\/$/, "").replace(/#.*$/, "").replace(/\/web.*$/, "");
const ODOO_DB  = process.env.ODOO_DB  ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY  ?? process.env.ODOO_PASSWORD ?? "";

// Store 47 config name filter
const STORE_FILTER = "47";

// ─── Session ──────────────────────────────────────────────────────────────────

let _cookie = "";
let _cookieTs = 0;

async function getSession(): Promise<string> {
  // refresh every 50 minutes
  if (_cookie && Date.now() - _cookieTs < 50 * 60 * 1000) return _cookie;
  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", method: "call", id: 1,
      params: { db: ODOO_DB, login: ODOO_USERNAME, password: ODOO_PASSWORD },
    }),
    cache: "no-store",
  });
  const sc = res.headers.get("set-cookie") ?? "";
  const m = sc.match(/session_id=([^;]+)/);
  if (m) { _cookie = `session_id=${m[1]}`; _cookieTs = Date.now(); }
  return _cookie;
}

async function rpc<T>(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<T> {
  const cookie = await getSession();
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      jsonrpc: "2.0", method: "call", id: 1,
      params: { model, method, args, kwargs },
    }),
    cache: "no-store",
  });
  const json = await res.json() as { result?: T; error?: unknown };
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OdooOrder {
  id: number;
  name: string;
  amount_total: number;
  cashier: string;
  date_order: string;
  lines: number[];
}

export interface OdooOrderLine {
  id: number;
  order_id: [number, string];
  product_id: [number, string];
  qty: number;
  price_subtotal_incl: number;
}

export interface OdooPayment {
  id: number;
  pos_order_id: [number, string];
  payment_method_id: [number, string];
  amount: number;
}

export interface OdooProductInfo {
  id: number;
  default_code: string;
  x_productgroup: string; // e.g. "MH12001"
  x_class: string;        // e.g. "MC14003"
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Convert Vietnam date YYYY-MM-DD → UTC range for Odoo queries */
export function vnDateToOdooRange(date: string): [string, string] {
  // Vietnam is UTC+7, so midnight VN = 17:00 UTC previous day
  const from = new Date(date + "T00:00:00+07:00");
  const to   = new Date(date + "T23:59:59+07:00");
  const fmt = (d: Date) => d.toISOString().replace("T", " ").slice(0, 19);
  return [fmt(from), fmt(to)];
}

// ─── Fetch orders for a date ──────────────────────────────────────────────────

export async function fetchOrdersForDate(date: string): Promise<{
  orders: OdooOrder[];
  lines: OdooOrderLine[];
  payments: OdooPayment[];
  productInfo: Map<number, OdooProductInfo>;
}> {
  const [from, to] = vnDateToOdooRange(date);
  const baseFilter = [
    ["config_id.name", "ilike", STORE_FILTER],
    ["state", "in", ["paid", "done", "invoiced"]],
    ["date_order", ">=", from],
    ["date_order", "<=", to],
  ];

  // Fetch orders, lines, and payments in parallel
  const [orders, payments] = await Promise.all([
    rpc<OdooOrder[]>("pos.order", "search_read", [baseFilter], {
      fields: ["id", "name", "amount_total", "cashier", "date_order", "lines"],
      limit: 500,
      order: "date_order asc",
    }),
    rpc<OdooPayment[]>("pos.payment", "search_read", [[
      ["pos_order_id.config_id.name", "ilike", STORE_FILTER],
      ["pos_order_id.date_order", ">=", from],
      ["pos_order_id.date_order", "<=", to],
    ]], {
      fields: ["id", "pos_order_id", "payment_method_id", "amount"],
      limit: 1000,
    }),
  ]);

  if (!orders.length) {
    return { orders: [], lines: [], payments, productInfo: new Map() };
  }

  // Fetch all order lines for these orders
  const orderIds = orders.map(o => o.id);
  const lines = await rpc<OdooOrderLine[]>("pos.order.line", "search_read",
    [[["order_id", "in", orderIds]]],
    { fields: ["id", "order_id", "product_id", "qty", "price_subtotal_incl"], limit: 2000 }
  );

  // Fetch product info for all unique products
  const productIds = [...new Set(lines.map(l => l.product_id[0]))];
  const products = productIds.length > 0
    ? await rpc<OdooProductInfo[]>("product.product", "search_read",
        [[["id", "in", productIds]]],
        { fields: ["id", "default_code", "x_productgroup", "x_class"], limit: productIds.length + 10 }
      )
    : [];

  const productInfo = new Map<number, OdooProductInfo>(products.map(p => [p.id, p]));

  return { orders, lines, payments, productInfo };
}

// ─── BUILD MORNING REPORT ─────────────────────────────────────────────────────

export interface MorningReport {
  date: string;
  revTotal: number;
  bills: number;
  qtyTotal: number;
  aov: number;
  ipt: number;

  /** Breakdown by MH group: { MH12001: { name, rev, qty, bills } } */
  byGroup: Record<string, { group: string; rev: number; qty: number; bills: number }>;

  /** Per-cashier breakdown */
  byCashier: Record<string, {
    name: string; rev: number; bills: number; qtyTotal: number;
    byGroup: Record<string, { group: string; rev: number; qty: number }>;
  }>;

  traffic: number | null;
}

export async function buildMorningReport(date: string, traffic: number | null): Promise<MorningReport> {
  const { orders, lines, productInfo } = await fetchOrdersForDate(date);

  const byGroup: MorningReport["byGroup"] = {};
  const byCashier: MorningReport["byCashier"] = {};
  let revTotal = 0, qtyTotal = 0;

  // Map orderId → cashier
  const orderCashier = new Map(orders.map(o => [o.id, o.cashier || "Chưa xác định"]));

  for (const line of lines) {
    const cashier = orderCashier.get(line.order_id[0]) ?? "Chưa xác định";
    const prod = productInfo.get(line.product_id[0]);
    const group = prod?.x_productgroup || "Khác";
    const rev = line.price_subtotal_incl;
    const qty = line.qty;

    if (rev < 0 || qty < 0) continue; // skip refund lines

    revTotal += rev;
    qtyTotal += qty;

    // by group
    if (!byGroup[group]) byGroup[group] = { group, rev: 0, qty: 0, bills: 0 };
    byGroup[group].rev += rev;
    byGroup[group].qty += qty;

    // by cashier
    if (!byCashier[cashier]) byCashier[cashier] = { name: cashier, rev: 0, bills: 0, qtyTotal: 0, byGroup: {} };
    byCashier[cashier].rev += rev;
    byCashier[cashier].qtyTotal += qty;
    if (!byCashier[cashier].byGroup[group]) byCashier[cashier].byGroup[group] = { group, rev: 0, qty: 0 };
    byCashier[cashier].byGroup[group].rev += rev;
    byCashier[cashier].byGroup[group].qty += qty;
  }

  // Count bills per cashier & group
  for (const o of orders) {
    const cashier = o.cashier || "Chưa xác định";
    if (byCashier[cashier]) byCashier[cashier].bills++;
    // group bills: from lines of this order
    const orderLines = lines.filter(l => l.order_id[0] === o.id && l.price_subtotal_incl > 0);
    const groups = new Set(orderLines.map(l => productInfo.get(l.product_id[0])?.x_productgroup ?? "Khác"));
    groups.forEach(g => {
      if (byGroup[g]) byGroup[g].bills++;
    });
  }

  const bills = orders.filter(o => o.amount_total > 0).length;
  const aov = bills > 0 ? revTotal / bills : 0;
  const ipt = bills > 0 ? qtyTotal / bills : 0;

  return { date, revTotal, bills, qtyTotal, aov, ipt, byGroup, byCashier, traffic };
}

// ─── BUILD EVENING REPORT ─────────────────────────────────────────────────────

// Payment method name → canonical key
const PM_MAP: Record<string, string> = {
  "cash": "cash",
  "vnpay": "vnpay",
  "momo": "momo",
  "credit": "card",
  "card": "card",
  "urbox": "urbox",
  "payoo": "payoo",
  "return": "return",
  "voucher": "voucher",
};

function canonicalPM(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(PM_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "other";
}

export interface EveningReport {
  date: string;
  revTotal: number;
  bills: number;
  qtyTotal: number;
  aov: number;
  ipt: number;

  /** Payment breakdown */
  payments: {
    cash: number; vnpay: number; momo: number; card: number;
    urbox: number; payoo: number; return: number; voucher: number; other: number;
  };

  /** Category breakdown */
  byGroup: Record<string, { group: string; rev: number; qty: number; pct: number }>;
}

export async function buildEveningReport(date: string): Promise<EveningReport> {
  const { orders, lines, payments, productInfo } = await fetchOrdersForDate(date);

  let revTotal = 0, qtyTotal = 0;
  const pmTotals = { cash: 0, vnpay: 0, momo: 0, card: 0, urbox: 0, payoo: 0, return: 0, voucher: 0, other: 0 };
  const byGroup: EveningReport["byGroup"] = {};

  for (const line of lines) {
    if (line.price_subtotal_incl < 0 || line.qty < 0) continue;
    revTotal += line.price_subtotal_incl;
    qtyTotal += line.qty;

    const prod = productInfo.get(line.product_id[0]);
    const group = prod?.x_productgroup || "Khác";
    if (!byGroup[group]) byGroup[group] = { group, rev: 0, qty: 0, pct: 0 };
    byGroup[group].rev += line.price_subtotal_incl;
    byGroup[group].qty += line.qty;
  }

  for (const p of payments) {
    const key = canonicalPM(p.payment_method_id[1]) as keyof typeof pmTotals;
    pmTotals[key] = (pmTotals[key] ?? 0) + p.amount;
  }

  // Compute % per group
  if (revTotal > 0) {
    for (const g of Object.values(byGroup)) {
      g.pct = g.rev / revTotal * 100;
    }
  }

  const bills = orders.filter(o => o.amount_total > 0).length;
  const aov = bills > 0 ? revTotal / bills : 0;
  const ipt = bills > 0 ? qtyTotal / bills : 0;

  return { date, revTotal, bills, qtyTotal, aov, ipt, payments: pmTotals, byGroup };
}

// ─── BUILD OVERVIEW REPORT ────────────────────────────────────────────────────

export interface OverviewDay {
  date: string;
  revTotal: number;
  bills: number;
  qtyTotal: number;
  aov: number;
  ipt: number;
  traffic: number | null;
  conversion: number | null;
  byGroup: Record<string, number>; // group → revenue
}

export async function buildOverviewReport(dates: string[], trafficMap: Map<string, number | null>): Promise<{
  days: OverviewDay[];
  totals: { revTotal: number; bills: number; qtyTotal: number };
  insights: string[];
}> {
  const days: OverviewDay[] = [];

  for (const date of dates) {
    const { orders, lines, productInfo } = await fetchOrdersForDate(date);
    let revTotal = 0, qtyTotal = 0;
    const byGroup: Record<string, number> = {};

    for (const line of lines) {
      if (line.price_subtotal_incl < 0 || line.qty < 0) continue;
      revTotal += line.price_subtotal_incl;
      qtyTotal += line.qty;
      const group = productInfo.get(line.product_id[0])?.x_productgroup || "Khác";
      byGroup[group] = (byGroup[group] ?? 0) + line.price_subtotal_incl;
    }

    const bills = orders.filter(o => o.amount_total > 0).length;
    const traffic = trafficMap.get(date) ?? null;
    days.push({
      date,
      revTotal,
      bills,
      qtyTotal,
      aov: bills > 0 ? revTotal / bills : 0,
      ipt: bills > 0 ? qtyTotal / bills : 0,
      traffic,
      conversion: traffic && bills > 0 ? bills / traffic * 100 : null,
      byGroup,
    });
  }

  const totals = days.reduce((acc, d) => ({
    revTotal: acc.revTotal + d.revTotal,
    bills: acc.bills + d.bills,
    qtyTotal: acc.qtyTotal + d.qtyTotal,
  }), { revTotal: 0, bills: 0, qtyTotal: 0 });

  const insights = generateInsights(days, totals);

  return { days, totals, insights };
}

function generateInsights(days: OverviewDay[], totals: { revTotal: number; bills: number; qtyTotal: number }): string[] {
  const tips: string[] = [];
  const validDays = days.filter(d => d.bills > 0);
  if (!validDays.length) return ["Chưa có đủ dữ liệu để phân tích."];

  const avgRev = totals.revTotal / validDays.length;
  const avgAov = validDays.reduce((s, d) => s + d.aov, 0) / validDays.length;
  const avgIpt = validDays.reduce((s, d) => s + d.ipt, 0) / validDays.length;

  // Best day
  const best = validDays.reduce((a, b) => a.revTotal > b.revTotal ? a : b);
  const dayNames = ["CN","T2","T3","T4","T5","T6","T7"];
  const bestDay = dayNames[new Date(best.date + "T12:00:00").getDay()];
  tips.push(`📈 Ngày doanh thu cao nhất: ${bestDay} ${best.date.slice(5)} — ${fmtM(best.revTotal)} ₫`);

  // Conversion insight
  const withTraffic = validDays.filter(d => d.conversion != null);
  if (withTraffic.length > 0) {
    const avgConv = withTraffic.reduce((s, d) => s + d.conversion!, 0) / withTraffic.length;
    const low = withTraffic.filter(d => d.conversion! < avgConv * 0.8);
    if (low.length > 0) {
      tips.push(`⚠️ Conversion thấp dưới trung bình (${avgConv.toFixed(1)}%) vào: ${low.map(d => d.date.slice(5)).join(", ")} — cần tập trung chào hỏi và chuyển đổi khách vào`);
    } else {
      tips.push(`✅ Conversion ổn định quanh ${avgConv.toFixed(1)}%`);
    }
  }

  // AOV insight
  if (avgAov > 0) {
    const lowAov = validDays.filter(d => d.aov < avgAov * 0.85 && d.bills > 2);
    if (lowAov.length > 0) {
      tips.push(`💡 AOV thấp vào ${lowAov.map(d => d.date.slice(5)).join(", ")} — thử đẩy upsell / add-on`);
    }
  }

  // IPT insight
  if (avgIpt < 1.5 && validDays.length >= 3) {
    tips.push(`💡 IPT trung bình ${avgIpt.toFixed(2)} — cần cross-sell để tăng số món/bill`);
  }

  // Best performing group
  const groupTotals: Record<string, number> = {};
  for (const d of validDays) {
    for (const [g, v] of Object.entries(d.byGroup)) {
      groupTotals[g] = (groupTotals[g] ?? 0) + v;
    }
  }
  const topGroup = Object.entries(groupTotals).sort((a, b) => b[1] - a[1])[0];
  if (topGroup) {
    tips.push(`🏆 Nhóm hàng đóng góp nhiều nhất: ${topGroup[0]} — ${fmtM(topGroup[1])} ₫`);
  }

  return tips;
}

function fmtM(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}
