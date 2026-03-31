"use client";

import { useEffect, useState, useCallback } from "react";
import { ShoppingBag, TrendingUp, Receipt, RefreshCw, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
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
  const cardBg = "rgba(255,255,255,0.88)";
  const cardBorder = "rgba(186,230,253,0.55)";
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
    <div style={{ minHeight: "100vh", padding: "24px 16px 80px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <ShoppingBag size={20} color="var(--gold)" />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Bán Hàng</h1>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Dữ liệu POS từ Odoo • Auto-sync 2:00 SA hàng ngày
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

            <button onClick={syncPos} disabled={syncing} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 8, background: "rgba(201,165,90,0.08)",
              border: "1px solid rgba(201,165,90,0.3)",
              color: "var(--gold)", fontSize: 13, cursor: syncing ? "default" : "pointer",
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
            background: syncMsg.startsWith("Lỗi") ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)",
            border: `1px solid ${syncMsg.startsWith("Lỗi") ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
            color: syncMsg.startsWith("Lỗi") ? "#dc2626" : "#16a34a",
          }}>{syncMsg}</div>
        )}

        {/* Period tabs */}
        <div className="tab-nav" style={{ marginBottom: 20, maxWidth: 320 }}>
          {(["today", "week", "month"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`tab-nav-item${period === p ? " active-gold" : ""}`}>
              {p === "today" ? "Hôm nay" : p === "week" ? "7 ngày" : "Tháng này"}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 28 }}>
          {[
            { label: "Doanh thu", value: cur ? `${fmt(cur.totalRevenue)} ₫` : "—", icon: TrendingUp, color: "#C9A55A", accent: "linear-gradient(90deg,#C9A55A,#E2C07A)" },
            { label: "Số đơn", value: cur ? String(cur.orderCount) : "—", icon: Receipt, color: "#0ea5e9", accent: "linear-gradient(90deg,#0ea5e9,#38bdf8)" },
            { label: "Trung bình", value: cur ? `${fmt(cur.avgOrderValue)} ₫` : "—", icon: BarChart2, color: "#7c3aed", accent: "linear-gradient(90deg,#7c3aed,#a78bfa)" },
          ].map(({ label, value, icon: Icon, color, accent }) => (
            <div key={label} className="card-kpi" style={{ padding: "12px 10px", minWidth: 0, "--kpi-accent": accent } as React.CSSProperties}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                <div style={{ width:20, height:20, borderRadius:6, background:`${color}14`, border:`1px solid ${color}28`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon size={10} color={color} />
                </div>
                <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>Đang tải...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Recent orders */}
            <div>
              <div className="section-accent" style={{ marginBottom: 10 }}>
                <h2 style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
                  Đơn hàng gần đây
                </h2>
              </div>
              {orders.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40, background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  Chưa có dữ liệu — bấm Sync POS
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {orders.map(o => (
                    <div key={o.id} style={{
                      background: cardBg,
                      backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                      border: `1px solid ${cardBorder}`,
                      borderRadius: 12, overflow: "hidden",
                      boxShadow: "0 1px 6px rgba(12,26,46,0.05)",
                    }}>
                      <div onClick={() => toggleOrder(o.id)} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px", cursor: "pointer", gap: 12,
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{o.name}</span>
                          {o.customerName && (
                            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{o.customerName}</span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.lineCount} SP</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", whiteSpace: "nowrap" }}>{fmt(o.amountTotal)} ₫</span>
                          <span className="hidden sm:inline" style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{fmtDate(o.createdAt)}</span>
                          {expandedOrder === o.id
                            ? <ChevronUp size={13} color="var(--text-muted)" />
                            : <ChevronDown size={13} color="var(--text-muted)" />}
                        </div>
                      </div>
                      {expandedOrder === o.id && (
                        <div style={{ padding: "0 14px 10px", borderTop: "1px solid var(--border-subtle)" }}>
                          {(orderLines[o.id] ?? []).map(l => (
                            <div key={l.id} style={{
                              display: "grid", gridTemplateColumns: "1fr 40px 80px",
                              gap: 8, padding: "5px 0", fontSize: 12,
                              color: "var(--text-secondary)",
                              borderBottom: "1px solid var(--border-subtle)",
                            }}>
                              <span>{l.productName}</span>
                              <span style={{ textAlign: "center" }}>×{l.qty}</span>
                              <span style={{ textAlign: "right", color: "var(--gold)" }}>{fmt(l.priceSubtotal)} ₫</span>
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
              <div className="section-accent" style={{ marginBottom: 10 }}>
                <h2 style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
                  Sản phẩm bán chạy
                </h2>
              </div>
              {topProducts.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 30, background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  Chưa có dữ liệu
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {topProducts.map((p, i) => (
                    <div key={p.productName} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 14px", borderRadius: 8,
                      background: i < 3 ? "rgba(201,165,90,0.06)" : "var(--bg-surface)",
                      border: i < 3 ? "1px solid rgba(201,165,90,0.2)" : "1px solid var(--border)",
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: i < 3 ? "var(--gold)" : "var(--text-muted)", width: 24, flexShrink: 0, textAlign: "center" }}>
                        #{i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.productName}</div>
                        {p.sku && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.sku}</div>}
                      </div>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>{p.totalQty} đôi</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", flexShrink: 0, whiteSpace: "nowrap" }}>{fmt(p.totalRevenue)} ₫</span>
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
