"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardList, Sun, Moon, BarChart2, RefreshCw,
  ChevronDown, ChevronUp, TrendingUp, Users, Receipt, Package,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type GroupEntry = { group: string; rev: number; qty: number; bills?: number; pct?: number };
type CashierEntry = {
  name: string; rev: number; bills: number; qtyTotal: number;
  byGroup: Record<string, { group: string; rev: number; qty: number }>;
};

type MorningReport = {
  date: string; revTotal: number; bills: number; qtyTotal: number; aov: number; ipt: number;
  byGroup: Record<string, GroupEntry>;
  byCashier: Record<string, CashierEntry>;
  traffic: number | null;
};

type PayBreakdown = {
  cash: number; vnpay: number; momo: number; card: number;
  urbox: number; payoo: number; return: number; voucher: number; other: number;
};
type EveningReport = {
  date: string; revTotal: number; bills: number; qtyTotal: number; aov: number; ipt: number;
  payments: PayBreakdown;
  byGroup: Record<string, GroupEntry>;
};

type OverviewDay = {
  date: string; revTotal: number; bills: number; qtyTotal: number;
  aov: number; ipt: number; traffic: number | null; conversion: number | null;
  byGroup: Record<string, number>;
};
type OverviewReport = {
  days: OverviewDay[];
  totals: { revTotal: number; bills: number; qtyTotal: number };
  insights: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const M = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));
const K = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + "M" : M(n);

function todayVN() {
  const d = new Date();
  const local = new Date(d.getTime() + (7 * 60 - d.getTimezoneOffset()) * 60000);
  return local.toISOString().slice(0, 10);
}
function yesterdayVN() {
  const d = new Date(todayVN());
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function fmtVN(s: string) {
  const [y, m, day] = s.split("-"); return `${day}/${m}/${y}`;
}
function dow(s: string) {
  return ["CN","T2","T3","T4","T5","T6","T7"][new Date(s + "T12:00:00").getDay()];
}
function daysBack(n: number): string {
  const d = new Date(todayVN()); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function Card({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <div style={{
      background: gold ? "linear-gradient(135deg, rgba(201,165,90,0.1) 0%, rgba(201,165,90,0.04) 100%)"
        : "rgba(255,255,255,0.025)",
      border: `1px solid ${gold ? "rgba(201,165,90,0.25)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 12, padding: "14px 16px",
    }}>{children}</div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)",
      textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
      {title}{sub && <span style={{ fontWeight: 400, marginLeft: 6, color: "rgba(255,255,255,0.2)" }}>{sub}</span>}
    </div>
  );
}

function Row({ label, value, sub, bold, color }: {
  label: string; value: string; sub?: string; bold?: boolean; color?: string;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{label}</span>
      <span style={{ fontSize: bold ? 14 : 12, fontWeight: bold ? 700 : 500,
        color: color ?? (bold ? "#C9A55A" : "#fff") }}>
        {value}{sub && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>{sub}</span>}
      </span>
    </div>
  );
}

function KpiGrid({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length},1fr)`, gap: 6 }}>
      {items.map(i => (
        <div key={i.label} style={{
          background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>{i.label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: i.color ?? "#fff" }}>{i.value}</div>
        </div>
      ))}
    </div>
  );
}

function LoadState({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return (
    <div style={{ textAlign: "center", padding: 48, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
      <RefreshCw size={18} style={{ animation: "spin 1s linear infinite", display: "inline-block", marginBottom: 8 }} />
      <br />Đang tải từ Odoo...
    </div>
  );
  if (error) return (
    <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 12 }}>
      {error}
    </div>
  );
  return null;
}

function DatePicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  return (
    <input type="date" value={value} onChange={e => onChange(e.target.value)}
      style={{
        flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10, padding: "10px 12px", fontSize: 14, fontWeight: 600, color: "#fff",
        outline: "none", colorScheme: "dark",
      }} />
  );
}

// ─── MORNING TAB ──────────────────────────────────────────────────────────────

function MorningTab() {
  const [date, setDate] = useState(yesterdayVN());
  const [data, setData] = useState<MorningReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async (d: string) => {
    setLoading(true); setError(""); setData(null);
    try {
      const r = await fetch(`/api/daily-report?type=morning&date=${d}`).then(x => x.json());
      if (!r.ok) throw new Error(r.error);
      setData(r.report);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(date); }, [date]);

  const groups = data ? Object.values(data.byGroup).sort((a, b) => b.rev - a.rev) : [];
  const cashiers = data ? Object.values(data.byCashier).sort((a, b) => b.rev - a.rev) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Date row */}
      <div style={{ display: "flex", gap: 8 }}>
        <DatePicker value={date} onChange={setDate} />
        <div style={{ padding: "10px 12px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          fontSize: 13, fontWeight: 700, color: "#C9A55A" }}>{dow(date)}</div>
        <button onClick={() => load(date)} style={{
          padding: "10px 12px", borderRadius: 10,
          background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.2)",
          color: "#38bdf8", cursor: "pointer",
        }}><RefreshCw size={14} /></button>
      </div>

      <LoadState loading={loading} error={error} />

      {data && (
        <>
          {/* ── Tổng quan ── */}
          <Card gold>
            <SectionHeader title={`Kết quả ${dow(date)} ${fmtVN(date)}`} />
            <div style={{ fontSize: 28, fontWeight: 800, color: "#C9A55A", marginBottom: 10 }}>
              {K(data.revTotal)} ₫
            </div>
            <KpiGrid items={[
              { label: "Số bill", value: String(data.bills), color: "#38bdf8" },
              { label: "Số món", value: String(data.qtyTotal), color: "#a78bfa" },
              { label: "AOV", value: K(data.aov) + " ₫", color: "#C9A55A" },
              { label: "IPT", value: data.ipt.toFixed(2), color: "#fb923c" },
              ...(data.traffic ? [{ label: "Traffic", value: String(data.traffic), color: "#34d399" }] : []),
              ...(data.traffic && data.bills ? [{ label: "Conv.", value: (data.bills / data.traffic * 100).toFixed(1) + "%", color: "#f472b6" }] : []),
            ]} />
          </Card>

          {/* ── Theo nhóm MH ── */}
          <Card>
            <SectionHeader title="Doanh thu theo nhóm sản phẩm" sub="(copy vào Store Agenda / Monthly Tracking)" />
            {groups.map((g, i) => (
              <Row key={g.group}
                label={g.group || "Không rõ nhóm"}
                value={K(g.rev) + " ₫"}
                sub={`${g.qty} món · ${g.bills ?? 0} bill`}
                bold={i === 0}
                color={i === 0 ? "#C9A55A" : "#fff"}
              />
            ))}
            {groups.length === 0 && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", padding: "8px 0" }}>Không có dữ liệu</div>
            )}
          </Card>

          {/* ── Theo nhân viên ── */}
          <Card>
            <SectionHeader title="Doanh thu theo cá nhân" sub="(copy vào Club Elite)" />
            {cashiers.map(c => {
              const key = c.name;
              const open = expanded[key];
              const cGroups = Object.values(c.byGroup).sort((a, b) => b.rev - a.rev);
              return (
                <div key={key} style={{ marginBottom: 2 }}>
                  <button onClick={() => setExpanded(e => ({ ...e, [key]: !open }))}
                    style={{
                      width: "100%", background: "none", border: "none", cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{c.name}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#C9A55A", fontWeight: 700 }}>{K(c.rev)} ₫</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{c.bills} bill</span>
                      {open ? <ChevronUp size={12} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={12} color="rgba(255,255,255,0.3)" />}
                    </span>
                  </button>
                  {open && (
                    <div style={{ paddingLeft: 12, paddingBottom: 6 }}>
                      {cGroups.map(g => (
                        <div key={g.group} style={{ display: "flex", justifyContent: "space-between",
                          padding: "3px 0", fontSize: 12 }}>
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>{g.group || "Khác"}</span>
                          <span style={{ color: "rgba(255,255,255,0.7)" }}>{K(g.rev)} ₫ · {g.qty} món</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {cashiers.length === 0 && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", padding: "8px 0" }}>Không có dữ liệu</div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ─── EVENING TAB ──────────────────────────────────────────────────────────────

const PAY_LABELS: Record<string, string> = {
  cash: "💵 Tiền mặt", vnpay: "📱 VNPay", momo: "🟣 MoMo", card: "💳 Thẻ",
  urbox: "🎁 Urbox", payoo: "Payoo", return: "↩ Trả hàng", voucher: "🎟 Voucher", other: "Khác",
};

function EveningTab() {
  const [date, setDate] = useState(todayVN());
  const [data, setData] = useState<EveningReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (d: string) => {
    setLoading(true); setError(""); setData(null);
    try {
      const r = await fetch(`/api/daily-report?type=evening&date=${d}`).then(x => x.json());
      if (!r.ok) throw new Error(r.error);
      setData(r.report);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(date); }, [date]);

  const groups = data ? Object.values(data.byGroup).sort((a, b) => b.rev - a.rev) : [];
  const pays = data ? Object.entries(data.payments).filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <DatePicker value={date} onChange={setDate} />
        <div style={{ padding: "10px 12px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          fontSize: 13, fontWeight: 700, color: "#C9A55A" }}>{dow(date)}</div>
        <button onClick={() => load(date)} style={{
          padding: "10px 12px", borderRadius: 10,
          background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.2)",
          color: "#38bdf8", cursor: "pointer",
        }}><RefreshCw size={14} /></button>
      </div>

      <LoadState loading={loading} error={error} />

      {data && (
        <>
          {/* ── Tổng doanh thu ── */}
          <Card gold>
            <SectionHeader title={`Cuối ngày ${dow(date)} ${fmtVN(date)}`} />
            <div style={{ fontSize: 28, fontWeight: 800, color: "#C9A55A", marginBottom: 10 }}>
              {K(data.revTotal)} ₫
            </div>
            <KpiGrid items={[
              { label: "Số bill", value: String(data.bills), color: "#38bdf8" },
              { label: "Số món", value: String(data.qtyTotal), color: "#a78bfa" },
              { label: "AOV", value: K(data.aov) + " ₫", color: "#C9A55A" },
              { label: "IPT", value: data.ipt.toFixed(2), color: "#fb923c" },
            ]} />
          </Card>

          {/* ── Hình thức thanh toán ── */}
          <Card>
            <SectionHeader title="Hình thức thanh toán" sub="(copy vào Daily Sale Report)" />
            {pays.map(([key, val]) => (
              <Row key={key}
                label={PAY_LABELS[key] ?? key}
                value={K(val) + " ₫"}
                bold={key === "cash" || key === "vnpay"}
              />
            ))}
          </Card>

          {/* ── Theo nhóm MH ── */}
          <Card>
            <SectionHeader title="Doanh thu theo nhóm sản phẩm" sub="(copy vào Daily Sale Report)" />
            {groups.map((g, i) => (
              <Row key={g.group}
                label={g.group || "Không rõ nhóm"}
                value={K(g.rev) + " ₫"}
                sub={`${((g.pct ?? 0)).toFixed(1)}% · ${g.qty} món`}
                bold={i === 0}
                color={i === 0 ? "#C9A55A" : "#fff"}
              />
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: "7 ngày", from: daysBack(6), to: todayVN() },
  { label: "Tuần này", from: daysBack(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1), to: todayVN() },
  { label: "14 ngày", from: daysBack(13), to: todayVN() },
  { label: "Tháng này", from: todayVN().slice(0, 7) + "-01", to: todayVN() },
];

function OverviewTab() {
  const [from, setFrom] = useState(daysBack(6));
  const [to, setTo] = useState(todayVN());
  const [data, setData] = useState<OverviewReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDays, setShowDays] = useState(true);

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true); setError(""); setData(null);
    try {
      const r = await fetch(`/api/daily-report?type=overview&from=${f}&to=${t}`).then(x => x.json());
      if (!r.ok) throw new Error(r.error);
      setData(r);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(from, to); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Range shortcuts */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {RANGE_OPTIONS.map(o => (
          <button key={o.label}
            onClick={() => { setFrom(o.from); setTo(o.to); load(o.from, o.to); }}
            style={{
              padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
              background: from === o.from && to === o.to ? "rgba(201,165,90,0.15)" : "rgba(255,255,255,0.04)",
              border: from === o.from && to === o.to ? "1px solid rgba(201,165,90,0.4)" : "1px solid rgba(255,255,255,0.08)",
              color: from === o.from && to === o.to ? "#C9A55A" : "rgba(255,255,255,0.5)",
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Custom range */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <DatePicker value={from} onChange={setFrom} />
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>→</span>
        <DatePicker value={to} onChange={setTo} />
        <button onClick={() => load(from, to)} style={{
          padding: "10px 12px", borderRadius: 10,
          background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.2)",
          color: "#38bdf8", cursor: "pointer", flexShrink: 0,
        }}><RefreshCw size={14} /></button>
      </div>

      <LoadState loading={loading} error={error} />

      {data && (
        <>
          {/* ── Tổng kết ── */}
          <Card gold>
            <SectionHeader title={`Tổng kết ${fmtVN(from)} – ${fmtVN(to)}`} />
            <div style={{ fontSize: 26, fontWeight: 800, color: "#C9A55A", marginBottom: 10 }}>
              {K(data.totals.revTotal)} ₫
            </div>
            <KpiGrid items={[
              { label: "Tổng bill", value: String(data.totals.bills), color: "#38bdf8" },
              { label: "Tổng món", value: String(data.totals.qtyTotal), color: "#a78bfa" },
              { label: "AOV TB", value: K(data.totals.bills > 0 ? data.totals.revTotal / data.totals.bills : 0) + " ₫", color: "#C9A55A" },
            ]} />
          </Card>

          {/* ── Insights ── */}
          <Card>
            <SectionHeader title="Nhận xét & Đề xuất" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.insights.map((t, i) => (
                <div key={i} style={{
                  fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5,
                  padding: "6px 10px", borderRadius: 8,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                }}>{t}</div>
              ))}
            </div>
          </Card>

          {/* ── Bảng từng ngày ── */}
          <Card>
            <button onClick={() => setShowDays(s => !s)} style={{
              width: "100%", background: "none", border: "none", cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: 0,
            }}>
              <SectionHeader title={`Chi tiết từng ngày (${data.days.length})`} />
              {showDays ? <ChevronUp size={13} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={13} color="rgba(255,255,255,0.3)" />}
            </button>
            {showDays && (
              <div style={{ marginTop: 6 }}>
                {/* Header */}
                <div style={{
                  display: "grid", gridTemplateColumns: "70px 1fr 44px 44px 54px",
                  gap: 4, padding: "4px 0",
                  fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
                }}>
                  <span>Ngày</span><span style={{ textAlign: "right" }}>Doanh thu</span>
                  <span style={{ textAlign: "right" }}>Bill</span>
                  <span style={{ textAlign: "right" }}>AOV</span>
                  <span style={{ textAlign: "right" }}>Conv%</span>
                </div>
                {data.days.map(d => (
                  <div key={d.date} style={{
                    display: "grid", gridTemplateColumns: "70px 1fr 44px 44px 54px",
                    gap: 4, padding: "5px 0",
                    borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 12,
                  }}>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>{dow(d.date)} {d.date.slice(5)}</span>
                    <span style={{ textAlign: "right", fontWeight: 600, color: d.revTotal > 0 ? "#C9A55A" : "rgba(255,255,255,0.2)" }}>
                      {d.revTotal > 0 ? K(d.revTotal) : "—"}
                    </span>
                    <span style={{ textAlign: "right", color: "rgba(255,255,255,0.6)" }}>{d.bills || "—"}</span>
                    <span style={{ textAlign: "right", color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                      {d.aov > 0 ? K(d.aov) : "—"}
                    </span>
                    <span style={{ textAlign: "right", color: d.conversion ? "#34d399" : "rgba(255,255,255,0.2)", fontSize: 11 }}>
                      {d.conversion != null ? d.conversion.toFixed(1) + "%" : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

type Tab = "morning" | "evening" | "overview";

export default function ReportPage() {
  const [tab, setTab] = useState<Tab>("morning");

  const tabs: { key: Tab; icon: React.ReactNode; label: string; sub: string }[] = [
    { key: "morning", icon: <Sun size={14} />, label: "Đầu Ca", sub: "Store Agenda · Club Elite" },
    { key: "evening", icon: <Moon size={14} />, label: "Cuối Ca", sub: "Daily Sale Report" },
    { key: "overview", icon: <BarChart2 size={14} />, label: "Tổng Quan", sub: "Phân tích xu hướng" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0c1a2e 0%, #0f2035 100%)",
      padding: "16px 16px 90px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <ClipboardList size={18} color="#C9A55A" />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>Báo Cáo</h1>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>
              Dữ liệu live từ Odoo POS + Palexy
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: "10px 8px", borderRadius: 12, cursor: "pointer",
              background: tab === t.key ? "rgba(201,165,90,0.12)" : "rgba(255,255,255,0.03)",
              border: tab === t.key ? "1px solid rgba(201,165,90,0.35)" : "1px solid rgba(255,255,255,0.07)",
              color: tab === t.key ? "#C9A55A" : "rgba(255,255,255,0.4)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 13 }}>
                {t.icon} {t.label}
              </div>
              <div style={{ fontSize: 9, opacity: 0.7, textAlign: "center" }}>{t.sub}</div>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "morning" && <MorningTab />}
        {tab === "evening" && <EveningTab />}
        {tab === "overview" && <OverviewTab />}
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }
      `}</style>
    </div>
  );
}
