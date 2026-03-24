"use client";

import { useEffect, useState, useCallback } from "react";
import { ShoppingBag, TrendingUp, Receipt, RefreshCw, BarChart2, Users, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type Summary = { totalRevenue: number; orderCount: number; avgOrderValue: number };
type PeriodSummary = { today: Summary; week: Summary; month: Summary };

type PosOrder = {
  id: string;
  name: string;
  customerName: string | null;
  amountTotal: number;
  lineCount: number;
  state: string;
  createdAt: string;
};

type TopProduct = {
  productName: string;
  sku: string | null;
  totalQty: number;
  totalRevenue: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any; color: string;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalesPage() {
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderLines, setOrderLines] = useState<Record<string, unknown[]>>({});
  const [syncMsg, setSyncMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, ordersRes, topRes] = await Promise.all([
        fetch("/api/pos?action=summary").then(r => r.json()),
        fetch("/api/pos?action=orders&limit=50").then(r => r.json()),
        fetch(`/api/pos?action=top-products&period=${period}`).then(r => r.json()),
      ]);
      if (sumRes.ok) setSummary(sumRes);
      if (ordersRes.ok) setOrders(ordersRes.orders ?? []);
      if (topRes.ok) setTopProducts(topRes.topProducts ?? []);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const syncPos = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/odoo/pos-sync", { method: "POST" }).then(r => r.json());
      if (res.ok) {
        setSyncMsg(`Sync xong: ${res.orders ?? 0} đơn, ${res.customers ?? 0} KH, ${res.lines ?? 0} dòng`);
        load();
      } else {
        setSyncMsg("Lỗi: " + (res.error ?? "unknown"));
      }
    } catch (e) {
      setSyncMsg("Lỗi: " + String(e));
    } finally {
      setSyncing(false);
    }
  };

  const toggleOrder = async (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    setExpandedOrder(orderId);
    if (!orderLines[orderId]) {
      const res = await fetch(`/api/pos?action=lines&orderId=${orderId}`).then(r => r.json());
      if (res.ok) setOrderLines(prev => ({ ...prev, [orderId]: res.lines ?? [] }));
    }
  };

  const cur = summary ? summary[period] : null;

  return (
    <div style={{ padding: "24px 16px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingBag size={22} color="#C9A55A" /> Bán Hàng
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>
            Dữ liệu POS từ Odoo • Tự động sync mỗi 2 giờ
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/customers" style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.8)", fontSize: 13, textDecoration: "none",
          }}>
            <Users size={14} /> Khách hàng
          </Link>
          <button
            onClick={syncPos}
            disabled={syncing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              background: syncing ? "rgba(201,165,90,0.1)" : "rgba(201,165,90,0.15)",
              border: "1px solid rgba(201,165,90,0.3)",
              color: "#C9A55A", fontSize: 13, cursor: syncing ? "default" : "pointer",
            }}
          >
            <RefreshCw size={14} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
            {syncing ? "Đang sync..." : "Sync POS"}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: syncMsg.startsWith("Lỗi") ? "rgba(220,38,38,0.1)" : "rgba(22,163,74,0.1)",
          border: `1px solid ${syncMsg.startsWith("Lỗi") ? "rgba(220,38,38,0.2)" : "rgba(22,163,74,0.2)"}`,
          color: syncMsg.startsWith("Lỗi") ? "#f87171" : "#4ade80",
          fontSize: 13,
        }}>
          {syncMsg}
        </div>
      )}

      {/* Period Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {(["today", "week", "month"] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "6px 16px", borderRadius: 8, fontSize: 13,
              background: period === p ? "rgba(201,165,90,0.15)" : "transparent",
              border: period === p ? "1px solid rgba(201,165,90,0.35)" : "1px solid rgba(255,255,255,0.06)",
              color: period === p ? "#C9A55A" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
            }}
          >
            {p === "today" ? "Hôm nay" : p === "week" ? "7 ngày" : "Tháng này"}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 28 }}>
        <StatCard
          label="Doanh thu" icon={TrendingUp} color="#C9A55A"
          value={cur ? `${fmt(cur.totalRevenue)} ₫` : "—"}
        />
        <StatCard
          label="Số đơn" icon={Receipt} color="#0ea5e9"
          value={cur ? String(cur.orderCount) : "—"}
        />
        <StatCard
          label="Giá trị TB" icon={BarChart2} color="#7c3aed"
          value={cur ? `${fmt(cur.avgOrderValue)} ₫` : "—"}
        />
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 40 }}>Đang tải...</div>
      )}

      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Recent Orders */}
          <div style={{ gridColumn: "1 / -1" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 12 }}>
              Đơn hàng gần đây
            </h2>
            {orders.length === 0 ? (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", padding: 40, background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                Chưa có đơn hàng. Bấm &quot;Sync POS&quot; để tải dữ liệu.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {orders.map(o => (
                  <div key={o.id} style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 10, overflow: "hidden",
                  }}>
                    <div
                      style={{
                        display: "grid", gridTemplateColumns: "1fr auto auto auto",
                        gap: 12, alignItems: "center", padding: "10px 14px", cursor: "pointer",
                      }}
                      onClick={() => toggleOrder(o.id)}
                    >
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{o.name}</span>
                        {o.customerName && (
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>
                            {o.customerName}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                        {o.lineCount} sản phẩm
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#C9A55A", whiteSpace: "nowrap" }}>
                        {fmt(o.amountTotal)} ₫
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                          {fmtDate(o.createdAt)}
                        </span>
                        {expandedOrder === o.id ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
                      </div>
                    </div>
                    {expandedOrder === o.id && (
                      <div style={{ padding: "0 14px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        {(orderLines[o.id] as Array<{ id: string; productName: string; qty: number; priceUnit: number; discount: number; priceSubtotal: number }> ?? []).map((l) => (
                          <div key={l.id} style={{
                            display: "grid", gridTemplateColumns: "1fr 50px 80px 80px",
                            gap: 8, padding: "6px 0", fontSize: 12, color: "rgba(255,255,255,0.6)",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}>
                            <span>{l.productName}</span>
                            <span style={{ textAlign: "center" }}>{l.qty}</span>
                            <span style={{ textAlign: "right" }}>{fmt(l.priceUnit)} ₫</span>
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

          {/* Top Products */}
          <div style={{ gridColumn: "1 / -1" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 12 }}>
              Sản phẩm bán chạy
            </h2>
            {topProducts.length === 0 ? (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", padding: 30, background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                Chưa có dữ liệu
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {topProducts.map((p, i) => (
                  <div key={p.productName} style={{
                    display: "grid", gridTemplateColumns: "28px 1fr 60px 100px",
                    gap: 10, alignItems: "center",
                    padding: "8px 14px", borderRadius: 8,
                    background: i < 3 ? "rgba(201,165,90,0.04)" : "rgba(255,255,255,0.02)",
                    border: i < 3 ? "1px solid rgba(201,165,90,0.1)" : "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: i < 3 ? "#C9A55A" : "rgba(255,255,255,0.25)", textAlign: "center" }}>
                      #{i + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{p.productName}</div>
                      {p.sku && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{p.sku}</div>}
                    </div>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "right" }}>
                      {p.totalQty} đôi
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#C9A55A", textAlign: "right" }}>
                      {fmt(p.totalRevenue)} ₫
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
