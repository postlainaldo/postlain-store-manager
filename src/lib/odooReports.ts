/**
 * Odoo Reports — real-time fetch for daily reports
 * Key fields:
 *   - x_productgroup on product.product = MH category (MH12001 etc)
 *   - x_advisor on pos.order.line = Sale Advisor (nhân viên bán hàng)
 *   - payment_method_id on pos.payment = hình thức thanh toán
 */

const ODOO_URL = (process.env.ODOO_URL ?? "").replace(/\/$/, "").replace(/#.*$/, "").replace(/\/web.*$/, "");
const ODOO_DB  = process.env.ODOO_DB  ?? "";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? "";
const ODOO_PASSWORD = process.env.ODOO_API_KEY  ?? process.env.ODOO_PASSWORD ?? "";
const STORE_FILTER  = "47";

// ─── Auth (no cache — Vercel is stateless) ────────────────────────────────────

async function getSession(): Promise<string> {
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
  if (!m) throw new Error("Odoo auth failed — no session cookie");
  return `session_id=${m[1]}`;
}

async function rpc<T>(cookie: string, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: 1, params: { model, method, args, kwargs } }),
    cache: "no-store",
  });
  const json = await res.json() as { result?: T; error?: { message?: string } };
  if (json.error) throw new Error(json.error?.message ?? JSON.stringify(json.error));
  return json.result as T;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** YYYY-MM-DD (VN) → [utcFrom, utcTo] strings for Odoo */
export function vnDateToOdooRange(date: string): [string, string] {
  const from = new Date(date + "T00:00:00+07:00");
  const to   = new Date(date + "T23:59:59+07:00");
  const fmt = (d: Date) => d.toISOString().replace("T", " ").slice(0, 19);
  return [fmt(from), fmt(to)];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OdooLine {
  id: number;
  order_id: [number, string];
  product_id: [number, string];
  qty: number;
  price_subtotal_incl: number;
  x_advisor: [number, string] | false;
}

interface OdooPayment {
  pos_order_id: [number, string];
  payment_method_id: [number, string];
  amount: number;
}

interface OdooProd {
  id: number;
  x_productgroup: string;
}

interface OdooOrder {
  id: number;
  name: string;
  amount_total: number;
  date_order: string;
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function fetchDay(date: string) {
  const [from, to] = vnDateToOdooRange(date);
  const cookie = await getSession();

  const orderFilter = [
    ["config_id.name", "ilike", STORE_FILTER],
    ["state", "in", ["paid", "done", "invoiced"]],
    ["date_order", ">=", from],
    ["date_order", "<=", to],
  ];

  // Parallel: orders + payments + lines (lines filter by order date)
  const [orders, payments, lines] = await Promise.all([
    rpc<OdooOrder[]>(cookie, "pos.order", "search_read", [orderFilter], {
      fields: ["id", "name", "amount_total", "date_order"],
      limit: 500, order: "date_order asc",
    }),
    rpc<OdooPayment[]>(cookie, "pos.payment", "search_read", [[
      ["pos_order_id.config_id.name", "ilike", STORE_FILTER],
      ["pos_order_id.date_order", ">=", from],
      ["pos_order_id.date_order", "<=", to],
    ]], {
      fields: ["pos_order_id", "payment_method_id", "amount"],
      limit: 1000,
    }),
    rpc<OdooLine[]>(cookie, "pos.order.line", "search_read", [[
      ["order_id.config_id.name", "ilike", STORE_FILTER],
      ["order_id.date_order", ">=", from],
      ["order_id.date_order", "<=", to],
    ]], {
      fields: ["order_id", "product_id", "qty", "price_subtotal_incl", "x_advisor"],
      limit: 2000,
    }),
  ]);

  // Fetch product groups for unique products
  const productIds = [...new Set(lines.map(l => l.product_id[0]))];
  const products = productIds.length > 0
    ? await rpc<OdooProd[]>(cookie, "product.product", "search_read",
        [[["id", "in", productIds]]],
        { fields: ["id", "x_productgroup"], limit: productIds.length + 10 }
      )
    : [];

  const prodGroup = new Map(products.map(p => [p.id, p.x_productgroup || "Khác"]));

  return { orders, payments, lines, prodGroup };
}

// ─── Payment method → canonical key ──────────────────────────────────────────

const PM_MAP: [string, string][] = [
  ["vnpay", "vnpay"], ["momo", "momo"], ["cash", "cash"],
  ["credit", "card"], ["card", "card"], ["urbox", "urbox"],
  ["payoo", "payoo"], ["return", "return"], ["voucher", "voucher"],
];
function pmKey(name: string): string {
  const l = name.toLowerCase();
  for (const [k, v] of PM_MAP) if (l.includes(k)) return v;
  return "other";
}

// ─── MORNING REPORT ───────────────────────────────────────────────────────────

export interface MorningReport {
  date: string;
  revTotal: number; bills: number; qtyTotal: number; aov: number; ipt: number;
  traffic: number | null;
  byGroup: { group: string; rev: number; qty: number; bills: number }[];
  byAdvisor: {
    name: string; rev: number; bills: number; qty: number;
    byGroup: { group: string; rev: number; qty: number }[];
  }[];
}

export async function buildMorningReport(date: string, traffic: number | null): Promise<MorningReport> {
  const { orders, lines, prodGroup } = await fetchDay(date);

  const groupMap: Record<string, { rev: number; qty: number; orderIds: Set<number> }> = {};
  const advisorMap: Record<string, {
    id: number; name: string; rev: number; qty: number; orderIds: Set<number>;
    groups: Record<string, { rev: number; qty: number }>;
  }> = {};

  for (const line of lines) {
    const rev = line.price_subtotal_incl;
    const qty = line.qty;
    // Skip full return lines (qty < 0 AND rev < 0 = returned product)
    // Keep discount lines (rev < 0, qty > 0 = promotion/voucher row)
    if (qty < 0 && rev < 0) continue;

    const group = prodGroup.get(line.product_id[0]) ?? "Khác";
    const advisorId = line.x_advisor ? line.x_advisor[0] : 0;
    const advisorName = line.x_advisor ? line.x_advisor[1] : "Chưa xác định";
    const advisorKey = String(advisorId);
    const ordId = line.order_id[0];

    // by group
    if (!groupMap[group]) groupMap[group] = { rev: 0, qty: 0, orderIds: new Set() };
    groupMap[group].rev += rev;
    groupMap[group].qty += qty;
    groupMap[group].orderIds.add(ordId);

    // by advisor
    if (!advisorMap[advisorKey]) advisorMap[advisorKey] = { id: advisorId, name: advisorName, rev: 0, qty: 0, orderIds: new Set(), groups: {} };
    advisorMap[advisorKey].rev += rev;
    advisorMap[advisorKey].qty += qty;
    advisorMap[advisorKey].orderIds.add(ordId);
    if (!advisorMap[advisorKey].groups[group]) advisorMap[advisorKey].groups[group] = { rev: 0, qty: 0 };
    advisorMap[advisorKey].groups[group].rev += rev;
    advisorMap[advisorKey].groups[group].qty += qty;
  }

  const revTotal = Object.values(groupMap).reduce((s, g) => s + g.rev, 0);
  const bills = orders.filter(o => o.amount_total > 0).length;

  const byGroup = Object.entries(groupMap)
    .map(([group, g]) => ({ group, rev: g.rev, qty: g.qty, bills: g.orderIds.size }))
    .sort((a, b) => b.rev - a.rev);

  const byAdvisor = Object.values(advisorMap)
    // exclude store-level "47-ALDO GO!DALAT" advisor (id 2220)
    .filter(a => a.id !== 2220)
    .map(a => ({
      name: a.name,
      rev: a.rev,
      bills: a.orderIds.size,
      qty: a.qty,
      byGroup: Object.entries(a.groups)
        .map(([group, g]) => ({ group, rev: g.rev, qty: g.qty }))
        .sort((a, b) => b.rev - a.rev),
    }))
    .sort((a, b) => b.rev - a.rev);

  const qtyTotal = Object.values(groupMap).reduce((s, g) => s + g.qty, 0);

  return {
    date, revTotal, bills, qtyTotal,
    aov: bills > 0 ? revTotal / bills : 0,
    ipt: bills > 0 ? qtyTotal / bills : 0,
    traffic,
    byGroup,
    byAdvisor,
  };
}

// ─── EVENING REPORT ───────────────────────────────────────────────────────────

export interface EveningReport {
  date: string;
  revTotal: number; bills: number; qtyTotal: number; aov: number; ipt: number;
  payments: Record<string, number>;
  byGroup: { group: string; rev: number; qty: number; pct: number }[];
}

export async function buildEveningReport(date: string): Promise<EveningReport> {
  const { orders, payments, lines, prodGroup } = await fetchDay(date);

  let revTotal = 0, qtyTotal = 0;
  const pmTotals: Record<string, number> = {};
  const groupMap: Record<string, { rev: number; qty: number }> = {};

  for (const line of lines) {
    // Skip full return lines only (qty < 0 AND rev < 0)
    if (line.qty < 0 && line.price_subtotal_incl < 0) continue;
    revTotal += line.price_subtotal_incl;
    if (line.qty > 0) qtyTotal += line.qty;
    const group = prodGroup.get(line.product_id[0]) ?? "Khác";
    if (!groupMap[group]) groupMap[group] = { rev: 0, qty: 0 };
    groupMap[group].rev += line.price_subtotal_incl;
    if (line.qty > 0) groupMap[group].qty += line.qty;
  }

  for (const p of payments) {
    const key = pmKey(p.payment_method_id[1]);
    pmTotals[key] = (pmTotals[key] ?? 0) + p.amount;
  }

  const bills = orders.filter(o => o.amount_total > 0).length;

  const byGroup = Object.entries(groupMap)
    .map(([group, g]) => ({ group, rev: g.rev, qty: g.qty, pct: revTotal > 0 ? g.rev / revTotal * 100 : 0 }))
    .sort((a, b) => b.rev - a.rev);

  return {
    date, revTotal, bills, qtyTotal,
    aov: bills > 0 ? revTotal / bills : 0,
    ipt: bills > 0 ? qtyTotal / bills : 0,
    payments: pmTotals,
    byGroup,
  };
}

// ─── OVERVIEW REPORT ──────────────────────────────────────────────────────────

export interface OverviewDay {
  date: string;
  revTotal: number; bills: number; qtyTotal: number;
  aov: number; ipt: number;
  traffic: number | null; conversion: number | null;
  byGroup: Record<string, number>;
}

export async function buildOverviewReport(dates: string[], trafficMap: Map<string, number | null>): Promise<{
  days: OverviewDay[];
  totals: { revTotal: number; bills: number; qtyTotal: number };
  insights: string[];
}> {
  // Fetch all dates sequentially to avoid hammering Odoo
  const days: OverviewDay[] = [];

  for (const date of dates) {
    try {
      const { orders, lines, prodGroup } = await fetchDay(date);
      let revTotal = 0, qtyTotal = 0;
      const byGroup: Record<string, number> = {};

      for (const line of lines) {
        if (line.qty < 0 && line.price_subtotal_incl < 0) continue;
        revTotal += line.price_subtotal_incl;
        if (line.qty > 0) qtyTotal += line.qty;
        if (line.price_subtotal_incl !== 0) {
          const group = prodGroup.get(line.product_id[0]) ?? "Khác";
          byGroup[group] = (byGroup[group] ?? 0) + line.price_subtotal_incl;
        }
      }

      const bills = orders.filter(o => o.amount_total > 0).length;
      const traffic = trafficMap.get(date) ?? null;
      days.push({
        date, revTotal, bills, qtyTotal,
        aov: bills > 0 ? revTotal / bills : 0,
        ipt: bills > 0 ? qtyTotal / bills : 0,
        traffic,
        conversion: traffic && bills > 0 ? bills / traffic * 100 : null,
        byGroup,
      });
    } catch {
      days.push({ date, revTotal: 0, bills: 0, qtyTotal: 0, aov: 0, ipt: 0, traffic: null, conversion: null, byGroup: {} });
    }
  }

  const totals = days.reduce((acc, d) => ({
    revTotal: acc.revTotal + d.revTotal,
    bills: acc.bills + d.bills,
    qtyTotal: acc.qtyTotal + d.qtyTotal,
  }), { revTotal: 0, bills: 0, qtyTotal: 0 });

  return { days, totals, insights: generateInsights(days, totals) };
}

function fmtK(n: number): string {
  return n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + "M" : new Intl.NumberFormat("vi-VN").format(Math.round(n));
}
const DOW = ["CN","T2","T3","T4","T5","T6","T7"];

function generateInsights(days: OverviewDay[], totals: { revTotal: number; bills: number }): string[] {
  const tips: string[] = [];
  const active = days.filter(d => d.bills > 0);
  if (!active.length) return ["Chưa có đủ dữ liệu để phân tích."];

  const best = active.reduce((a, b) => a.revTotal > b.revTotal ? a : b);
  tips.push(`📈 Ngày cao nhất: ${DOW[new Date(best.date+"T12:00:00").getDay()]} ${best.date.slice(5)} — ${fmtK(best.revTotal)} ₫`);

  const avgAov = active.reduce((s, d) => s + d.aov, 0) / active.length;
  const avgIpt = active.reduce((s, d) => s + d.ipt, 0) / active.length;

  const lowAov = active.filter(d => d.aov < avgAov * 0.85 && d.bills >= 2);
  if (lowAov.length) tips.push(`💡 AOV thấp (TB: ${fmtK(avgAov)} ₫) vào ${lowAov.map(d => d.date.slice(5)).join(", ")} — nên đẩy upsell`);

  if (avgIpt < 1.5 && active.length >= 3)
    tips.push(`💡 IPT trung bình ${avgIpt.toFixed(2)} — cross-sell để tăng số món/bill`);

  const withTraffic = active.filter(d => d.conversion != null);
  if (withTraffic.length) {
    const avgConv = withTraffic.reduce((s, d) => s + d.conversion!, 0) / withTraffic.length;
    const lowConv = withTraffic.filter(d => d.conversion! < avgConv * 0.8);
    if (lowConv.length)
      tips.push(`⚠️ Conversion thấp vào ${lowConv.map(d => d.date.slice(5)).join(", ")} (TB: ${avgConv.toFixed(1)}%) — tập trung chuyển đổi khách vào`);
    else
      tips.push(`✅ Conversion ổn định ~${avgConv.toFixed(1)}%`);
  }

  const groupTotals: Record<string, number> = {};
  for (const d of active) for (const [g, v] of Object.entries(d.byGroup)) groupTotals[g] = (groupTotals[g] ?? 0) + v;
  const topGroup = Object.entries(groupTotals).sort((a, b) => b[1] - a[1])[0];
  if (topGroup) tips.push(`🏆 Nhóm đóng góp nhiều nhất: ${topGroup[0]} — ${fmtK(topGroup[1])} ₫`);

  if (totals.bills > 0)
    tips.push(`📊 Tổng ${active.length} ngày: ${totals.bills} bill · TB ${fmtK(totals.revTotal / active.length)} ₫/ngày`);

  return tips;
}
