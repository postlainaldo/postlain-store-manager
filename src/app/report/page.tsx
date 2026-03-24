"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardList, TrendingUp, Receipt, Package, BarChart2,
  Users, ChevronDown, ChevronUp, RefreshCw, History,
  ChevronRight, Save, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useStore } from "@/store/useStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type OdooData = {
  revTotal: number;
  bills: number;
  qtyTotal: number;
  aov: number;
  ipt: number;
};

type TopProduct = { productName: string; sku: string | null; totalQty: number; totalRevenue: number };

type Order = {
  id: string; name: string; customerName: string | null;
  amountTotal: number; lineCount: number; createdAt: string;
};

type DailyData = {
  date: string;
  odoo: OdooData;
  topProducts: TopProduct[];
  orders: Order[];
  saved: {
    traffic: number; targetDay: number;
    revHB: number; revSC: number; revACC: number; note: string; preparedBy: string;
  } | null;
};

type SavedReport = {
  id: string; date: string; traffic: number; targetDay: number;
  revHB: number; revSC: number; revACC: number; note: string; preparedBy: string;
  revTotal: number; bills: number; qtyTotal: number; conversion: number; aov: number; ipt: number;
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (!n) return "0";
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function todayStr() {
  const d = new Date();
  const offset = 7 * 60; // UTC+7
  const local = new Date(d.getTime() + (offset - d.getTimezoneOffset()) * 60000);
  return local.toISOString().slice(0, 10);
}
function fmtDateVN(dateStr: string) {
  const [y, m, day] = dateStr.split("-");
  return `${day}/${m}/${y}`;
}
function dayOfWeek(dateStr: string) {
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return days[new Date(dateStr + "T12:00:00").getDay()];
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = "#C9A55A", large = false }: {
  label: string; value: string; sub?: string; color?: string; large?: boolean;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: large ? "16px" : "12px 14px",
    }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 6,
        textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: large ? 22 : 16, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─── Mini input (only for manual fields) ─────────────────────────────────────

function InlineInput({ label, value, onChange, unit = "₫" }: {
  label: string; value: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 14px", borderRadius: 8,
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          inputMode="numeric"
          value={value || ""}
          onChange={e => onChange(parseInt(e.target.value.replace(/\D/g,"")) || 0)}
          style={{
            width: 100, background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
            padding: "4px 8px", fontSize: 13, color: "#fff",
            textAlign: "right", outline: "none", fontFamily: "inherit",
          }}
          placeholder="0"
        />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", width: 14 }}>{unit}</span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const currentUser = useStore(s => s.currentUser);
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Manual-only fields
  const [traffic, setTraffic]       = useState(0);
  const [targetDay, setTargetDay]   = useState(0);
  const [revHB, setRevHB]           = useState(0);
  const [revSC, setRevSC]           = useState(0);
  const [revACC, setRevACC]         = useState(0);
  const [note, setNote]             = useState("");
  const [preparedBy, setPreparedBy] = useState("");

  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [history, setHistory] = useState<SavedReport[]>([]);
  const [showHistory, setShowHistory]   = useState(false);
  const [showOrders, setShowOrders]     = useState(false);
  const [showProducts, setShowProducts] = useState(true);

  // Load daily data from Odoo
  const load = useCallback(async (d: string) => {
    setLoading(true); setError(""); setData(null);
    try {
      const res = await fetch(`/api/reports?date=${d}&action=daily`).then(r => r.json());
      if (!res.ok) throw new Error(res.error);
      setData(res);
      // Pre-fill manual fields from last saved report
      if (res.saved) {
        setTraffic(res.saved.traffic ?? 0);
        setTargetDay(res.saved.targetDay ?? 0);
        setRevHB(res.saved.revHB ?? 0);
        setRevSC(res.saved.revSC ?? 0);
        setRevACC(res.saved.revACC ?? 0);
        setNote(res.saved.note ?? "");
        setPreparedBy(res.saved.preparedBy ?? "");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(date); }, [date]);
  useEffect(() => {
    if (!preparedBy && currentUser?.name) setPreparedBy(currentUser.name);
  }, [currentUser]);

  const loadHistory = async () => {
    const res = await fetch("/api/reports").then(r => r.json());
    if (res.ok) setHistory(res.reports ?? []);
    setShowHistory(s => !s);
  };

  const saveReport = async () => {
    if (!data) return;
    setSaving(true); setSaved(false);
    const revTotal = data.odoo.revTotal;
    const conversion = traffic > 0 ? data.odoo.bills / traffic : 0;
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date, shift: "end",
          revTotal, bills: data.odoo.bills, qtyTotal: data.odoo.qtyTotal,
          aov: data.odoo.aov, ipt: data.odoo.ipt,
          traffic, targetDay, conversion,
          revHB, revSC, revACC, note, preparedBy,
          revCash: 0, revCard: 0, revTransfer: 0, revVnpay: 0,
          revMomo: 0, revUrbox: 0, revNinja: 0, revOther: 0,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const odoo = data?.odoo;
  const vsTarget = targetDay > 0 && odoo ? (odoo.revTotal / targetDay * 100) : null;
  const conversion = traffic > 0 && odoo ? (odoo.bills / traffic * 100) : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0c1a2e 0%, #0f2035 100%)",
      padding: "24px 16px 90px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <ClipboardList size={20} color="#C9A55A" />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Báo Cáo Ngày</h1>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>
              Dữ liệu tự động từ Odoo POS · Tích hợp Palexy sắp có
            </p>
          </div>
          <button onClick={loadHistory} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 12px", borderRadius: 8,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer",
          }}>
            <History size={13} /> Lịch sử
          </button>
        </div>

        {/* Date picker */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10, padding: "10px 12px", fontSize: 15, fontWeight: 600,
                color: "#fff", outline: "none", colorScheme: "dark",
              }}
            />
          </div>
          <div style={{
            padding: "10px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 14, fontWeight: 700, color: "#C9A55A", minWidth: 36, textAlign: "center",
          }}>
            {dayOfWeek(date)}
          </div>
          <button onClick={() => load(date)} style={{
            padding: "10px 12px", borderRadius: 10,
            background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.2)",
            color: "#38bdf8", cursor: "pointer",
          }}>
            <RefreshCw size={15} style={{ display: "block", animation: loading ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>

        {/* Loading / error state */}
        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
            Đang tải dữ liệu Odoo...
          </div>
        )}
        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 12,
            display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Main dashboard — only shown when data loaded */}
        {data && odoo && !loading && (
          <>
            {/* ── Revenue hero ── */}
            <div style={{
              background: odoo.revTotal > 0
                ? "linear-gradient(135deg, rgba(201,165,90,0.12) 0%, rgba(201,165,90,0.05) 100%)"
                : "rgba(255,255,255,0.02)",
              border: "1px solid rgba(201,165,90,0.2)", borderRadius: 16, padding: "20px",
            }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4,
                textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Doanh thu — {fmtDateVN(date)}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#C9A55A", marginBottom: 8 }}>
                {fmt(odoo.revTotal)} ₫
              </div>

              {/* vs target bar */}
              {targetDay > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      Chỉ tiêu: {fmt(targetDay)} ₫
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700,
                      color: vsTarget! >= 100 ? "#86efac" : "#fca5a5" }}>
                      {vsTarget!.toFixed(1)}%
                      {vsTarget! >= 100
                        ? ` · Vượt ${fmt(odoo.revTotal - targetDay)} ₫`
                        : ` · Còn thiếu ${fmt(targetDay - odoo.revTotal)} ₫`}
                    </span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                    <div style={{
                      height: 4, borderRadius: 2, transition: "width 0.6s ease",
                      width: Math.min(100, vsTarget!) + "%",
                      background: vsTarget! >= 100
                        ? "linear-gradient(90deg, #22c55e, #86efac)"
                        : "linear-gradient(90deg, #f97316, #C9A55A)",
                    }} />
                  </div>
                </div>
              )}

              {/* KPI grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {[
                  { label: "Số bill", value: String(odoo.bills), icon: Receipt, color: "#38bdf8" },
                  { label: "SL hàng", value: String(odoo.qtyTotal), icon: Package, color: "#a78bfa" },
                  { label: "AOV", value: fmt(odoo.aov) + " ₫", icon: TrendingUp, color: "#C9A55A" },
                  { label: "IPT", value: odoo.ipt.toFixed(2), icon: BarChart2, color: "#fb923c" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} style={{
                    background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                      <Icon size={11} color={color} />
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Traffic + Conversion (manual) ── */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase", letterSpacing: "0.08em", display: "flex",
                alignItems: "center", gap: 6 }}>
                <Users size={12} />
                Traffic & Conversion
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontWeight: 400,
                  marginLeft: "auto" }}>← nhập từ Palexy</span>
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <InlineInput label="Traffic (lượt khách vào)" value={traffic} onChange={setTraffic} unit="KH" />
                {traffic > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <KpiCard label="Conversion" value={(odoo.bills / traffic * 100).toFixed(1) + "%"} color="#38bdf8" />
                    <KpiCard label="Khách / giờ" value="—" sub="Cần giờ mở cửa" color="rgba(255,255,255,0.3)" />
                  </div>
                )}
              </div>
            </div>

            {/* ── Chỉ tiêu (manual) ── */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase", letterSpacing: "0.08em" }}>
                🎯 Chỉ Tiêu Ngày
              </div>
              <div style={{ padding: 14 }}>
                <InlineInput label="Chỉ tiêu doanh số" value={targetDay} onChange={setTargetDay} />
              </div>
            </div>

            {/* ── Danh mục HB/SC/ACC (manual — Odoo chưa sync category) ── */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase", letterSpacing: "0.08em", display: "flex",
                alignItems: "center", justifyContent: "space-between" }}>
                <span>👜 Danh Mục (HB / SC / ACC)</span>
                <span style={{ fontSize: 9, fontWeight: 400, color: "rgba(255,255,255,0.2)" }}>
                  ← từ Odoo (đang xử lý tự động)
                </span>
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <InlineInput label="Handbag (HB)" value={revHB} onChange={setRevHB} />
                <InlineInput label="Shoe Care (SC)" value={revSC} onChange={setRevSC} />
                <InlineInput label="Accessories (ACC)" value={revACC} onChange={setRevACC} />
                {odoo.revTotal > 0 && (revHB + revSC + revACC) > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginTop: 4 }}>
                    {[["HB", revHB, "#C9A55A"], ["SC", revSC, "#38bdf8"], ["ACC", revACC, "#a78bfa"]].map(([l, v, c]) => (
                      <div key={String(l)} style={{ textAlign: "center", padding: "6px 0",
                        background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: String(c) }}>
                          {((Number(v) / odoo.revTotal) * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Top products (auto from Odoo) ── */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, overflow: "hidden" }}>
              <button onClick={() => setShowProducts(s => !s)} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                <span>📦 Sản Phẩm Bán Trong Ngày ({data.topProducts.length})</span>
                {showProducts ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showProducts && (
                <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {data.topProducts.length === 0 ? (
                    <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", padding: 20, fontSize: 12 }}>
                      Chưa có dữ liệu ngày này
                    </div>
                  ) : (
                    data.topProducts.map((p, i) => (
                      <div key={p.productName} style={{
                        display: "grid", gridTemplateColumns: "24px 1fr 40px 90px",
                        gap: 10, alignItems: "center", padding: "7px 10px", borderRadius: 8,
                        background: i < 3 ? "rgba(201,165,90,0.04)" : "transparent",
                        border: "1px solid " + (i < 3 ? "rgba(201,165,90,0.1)" : "rgba(255,255,255,0.05)"),
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textAlign: "center",
                          color: i < 3 ? "#C9A55A" : "rgba(255,255,255,0.2)" }}>
                          #{i + 1}
                        </span>
                        <span style={{ fontSize: 12, color: "#fff", overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.productName}</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "right" }}>
                          ×{p.totalQty}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#C9A55A", textAlign: "right" }}>
                          {fmt(p.totalRevenue)} ₫
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ── Orders list (auto from Odoo) ── */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, overflow: "hidden" }}>
              <button onClick={() => setShowOrders(s => !s)} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                <span>🧾 Đơn Hàng Trong Ngày ({data.orders.length})</span>
                {showOrders ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showOrders && (
                <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {data.orders.length === 0 ? (
                    <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", padding: 20, fontSize: 12 }}>
                      Chưa có đơn hàng ngày này
                    </div>
                  ) : data.orders.map(o => (
                    <div key={o.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "7px 10px", borderRadius: 8,
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                      gap: 10,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{o.name}</span>
                        {o.customerName && (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>
                            {o.customerName}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{fmtTime(o.createdAt)}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{o.lineCount} SP</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#C9A55A" }}>{fmt(o.amountTotal)} ₫</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Ghi chú ── */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>
                  Người báo cáo
                </label>
                <input value={preparedBy} onChange={e => setPreparedBy(e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#fff", outline: "none",
                  }}
                  placeholder="Tên nhân viên..." />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>
                  Ghi chú
                </label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#fff",
                    outline: "none", resize: "vertical", fontFamily: "inherit",
                  }}
                  placeholder="Ghi chú sự kiện, vấn đề phát sinh..." />
              </div>
            </div>

            {/* ── Save button ── */}
            <button onClick={saveReport} disabled={saving} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px 0", borderRadius: 12, cursor: saving ? "default" : "pointer",
              background: saved ? "rgba(34,197,94,0.12)" : "rgba(201,165,90,0.1)",
              border: saved ? "1px solid rgba(34,197,94,0.35)" : "1px solid rgba(201,165,90,0.3)",
              color: saved ? "#86efac" : "#C9A55A",
              fontSize: 14, fontWeight: 700, opacity: saving ? 0.7 : 1,
            }}>
              {saved
                ? <><CheckCircle2 size={16} /> Đã lưu</>
                : <><Save size={15} /> Lưu Báo Cáo {fmtDateVN(date)}</>}
            </button>
          </>
        )}

        {/* History panel */}
        {showHistory && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase", letterSpacing: "0.06em" }}>Lịch sử báo cáo</span>
              <button onClick={() => setShowHistory(false)} style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12,
              }}>Đóng</button>
            </div>
            {history.length === 0
              ? <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", padding: 24, fontSize: 12 }}>Chưa có báo cáo</div>
              : history.map(r => (
                <div key={r.id} onClick={() => { setDate(r.date); setShowHistory(false); }}
                  style={{
                    padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4,
                  }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                      {dayOfWeek(r.date)} {fmtDateVN(r.date)}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                      {r.preparedBy && r.preparedBy + " · "}{r.bills} bill · {fmt(r.revTotal)} ₫
                      {r.traffic > 0 && ` · ${(r.bills / r.traffic * 100).toFixed(0)}% conv`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {r.targetDay > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 700,
                        color: r.revTotal >= r.targetDay ? "#86efac" : "#fca5a5" }}>
                        {(r.revTotal / r.targetDay * 100).toFixed(0)}%
                      </span>
                    )}
                    <ChevronRight size={13} color="rgba(255,255,255,0.2)" />
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }
        textarea { color-scheme: dark; }
      `}</style>
    </div>
  );
}
