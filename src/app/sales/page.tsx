"use client";

import { useEffect, useState, useCallback } from "react";
import { ShoppingBag, TrendingUp, Receipt, RefreshCw, BarChart2, Users, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

type Summary = { totalRevenue: number; orderCount: number; avgOrderValue: number };
type PeriodSummary = { today: Summary; week: Summary; month: Summary };
type PosOrder = { id: string; name: string; customerName: string | null; amountTotal: number; lineCount: number; createdAt: string };
type OrderLine = { id: string; productName: string; qty: number; priceUnit: number; priceSubtotal: number };
type TopProduct = { productName: string; sku: string | null; totalQty: number; totalRevenue: number };

function fmt(n: number) { return new Intl.NumberFormat("vi-VN").format(Math.round(n)); }
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) + " " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function SalesPage() {
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderLines, setOrderLines] = useState<Record<string, OrderLine[]>>({});
  const [syncMsg, setSyncMsg] = useState("");

  const load = useCallback(async (p = period) => {
    setLoading(true);
    try {
      const [sumRes, ordersRes, topRes] = await Promise.all([
        fetch("/api/pos?action=summary").then(r => r.json()),
        fetch("/api/pos?action=orders&limit=50").then(r => r.json()),
        fetch(`/api/pos?action=top-products&period=${p}`).then(r => r.json()),
      ]);
      if (sumRes.ok) setSummary(sumRes);
      if (ordersRes.ok) setOrders(ordersRes.orders ?? []);
      if (topRes.ok) setTopProducts(topRes.topProducts ?? []);
    } finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(period); }, [period]);

  const syncPos = async () => {
    setSyncing(true); setSyncMsg("");
    try {
      const res = await fetch("/api/odoo/pos-sync", { method: "POST" }).then(r => r.json());
      setSyncMsg(res.ok
        ? `Sync xong: ${res.orders ?? 0} đơn, ${res.customers ?? 0} KH`
        : "Lỗi: " + (res.error ?? "unknown"));
      if (res.ok) load(period);
    } catch (e) { setSyncMsg("Lỗi: " + String(e)); }
    finally { setSyncing(false); }
  };

  const toggleOrder = async (id: string) => {
    if (expandedOrder === id) { setExpandedOrder(null); return; }
    setExpandedOrder(id);
    if (!orderLines[id]) {
      const res = await fetch(`/api/pos?action=lines&orderId=${id}`).then(r => r.json());
      if (res.ok) setOrderLines(p => ({ ...p, [id]: res.lines ?? [] }));
    }
  };

  const cur = summary?.[period];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0c1a2e 0%, #0f2035 100%)",
      padding: "24px 16px 80px",
    }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <ShoppingBag size={20} color="#C9A55A" />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Bán Hàng</h1>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              Dữ liệu POS từ Odoo • Auto-sync 2:00 SA hàng ngày
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/customers" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 8, background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none",
            }}>
              <Users size={14} /> Khách hàng
            </Link>
            <button onClick={syncPos} disabled={syncing} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 8, background: "rgba(201,165,90,0.12)",
              border: "1px solid rgba(201,165,90,0.25)",
              color: "#C9A55A", fontSize: 13, cursor: syncing ? "default" : "pointer",
              opacity: syncing ? 0.7 : 1,
            }}>
              <RefreshCw size={14} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
              {syncing ? "Đang sync..." : "Sync POS"}
            </button>
          </div>
        </div>

        {syncMsg && (
          <div style={{
            padding: "9px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13,
            background: syncMsg.startsWith("Lỗi") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
            border: `1px solid ${syncMsg.startsWith("Lỗi") ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
            color: syncMsg.startsWith("Lỗi") ? "#f87171" : "#86efac",
          }}>{syncMsg}</div>
        )}

        {/* Period tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {(["today", "week", "month"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "6px 16px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              background: period === p ? "rgba(201,165,90,0.15)" : "rgba(255,255,255,0.04)",
              border: period === p ? "1px solid rgba(201,165,90,0.35)" : "1px solid rgba(255,255,255,0.08)",
              color: period === p ? "#C9A55A" : "rgba(255,255,255,0.4)",
              fontWeight: period === p ? 600 : 400,
            }}>
              {p === "today" ? "Hôm nay" : p === "week" ? "7 ngày" : "Tháng này"}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 28 }}>
          {[
            { label: "Doanh thu", value: cur ? `${fmt(cur.totalRevenue)} ₫` : "—", icon: TrendingUp, color: "#C9A55A" },
            { label: "Số đơn", value: cur ? String(cur.orderCount) : "—", icon: Receipt, color: "#38bdf8" },
            { label: "Trung bình", value: cur ? `${fmt(cur.avgOrderValue)} ₫` : "—", icon: BarChart2, color: "#a78bfa" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Icon size={14} color={color} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", padding: 60 }}>Đang tải...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Recent orders */}
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Đơn hàng gần đây
              </h2>
              {orders.length === 0 ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", padding: 40, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                  Chưa có dữ liệu — bấm Sync POS
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {orders.map(o => (
                    <div key={o.id} style={{
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 10, overflow: "hidden",
                    }}>
                      <div onClick={() => toggleOrder(o.id)} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px", cursor: "pointer", gap: 12,
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{o.name}</span>
                          {o.customerName && (
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginLeft: 8 }}>{o.customerName}</span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{o.lineCount} SP</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#C9A55A" }}>{fmt(o.amountTotal)} ₫</span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{fmtDate(o.createdAt)}</span>
                          {expandedOrder === o.id ? <ChevronUp size={13} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={13} color="rgba(255,255,255,0.3)" />}
                        </div>
                      </div>
                      {expandedOrder === o.id && (
                        <div style={{ padding: "0 14px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          {(orderLines[o.id] ?? []).map(l => (
                            <div key={l.id} style={{
                              display: "grid", gridTemplateColumns: "1fr 40px 80px",
                              gap: 8, padding: "5px 0", fontSize: 12,
                              color: "rgba(255,255,255,0.55)",
                              borderBottom: "1px solid rgba(255,255,255,0.04)",
                            }}>
                              <span>{l.productName}</span>
                              <span style={{ textAlign: "center" }}>×{l.qty}</span>
                              <span style={{ textAlign: "right", color: "#C9A55A" }}>{fmt(l.priceSubtotal)} ₫</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top products */}
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Sản phẩm bán chạy
              </h2>
              {topProducts.length === 0 ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", padding: 30, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                  Chưa có dữ liệu
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {topProducts.map((p, i) => (
                    <div key={p.productName} style={{
                      display: "grid", gridTemplateColumns: "28px 1fr 60px 100px",
                      gap: 10, alignItems: "center", padding: "8px 14px", borderRadius: 8,
                      background: i < 3 ? "rgba(201,165,90,0.05)" : "rgba(255,255,255,0.02)",
                      border: i < 3 ? "1px solid rgba(201,165,90,0.12)" : "1px solid rgba(255,255,255,0.05)",
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: i < 3 ? "#C9A55A" : "rgba(255,255,255,0.2)", textAlign: "center" }}>
                        #{i + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{p.productName}</div>
                        {p.sku && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{p.sku}</div>}
                      </div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "right" }}>{p.totalQty} đôi</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#C9A55A", textAlign: "right" }}>{fmt(p.totalRevenue)} ₫</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      <style jsx global>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
