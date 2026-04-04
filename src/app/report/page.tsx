"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardList, Sun, Moon, BarChart2, RefreshCw,
  ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type GroupEntry = { group: string; rev: number; qty: number; bills?: number; pct?: number };

type MorningReport = {
  date: string; revTotal: number; bills: number; qtyTotal: number; aov: number; ipt: number;
  traffic: number | null;
  byGroup: GroupEntry[];
  byAdvisor: {
    name: string; rev: number; bills: number; qty: number;
    byGroup: { group: string; rev: number; qty: number }[];
  }[];
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
  return new Date(new Date().toLocaleString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })).toISOString().slice(0, 10);
}
function yesterdayVN() {
  const d = new Date(new Date().toLocaleString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }));
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
    <div className="card-float" style={{
      background: gold
        ? "linear-gradient(135deg, rgba(201,165,90,0.10) 0%, rgba(255,255,255,0.88) 100%)"
        : "rgba(255,255,255,0.88)",
      border: `1px solid ${gold ? "rgba(201,165,90,0.32)" : "rgba(186,230,253,0.55)"}`,
      padding: "14px 16px",
    }}>{children}</div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="section-accent" style={{ marginBottom: 10 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {title}
        {sub && <span style={{ fontWeight: 400, marginLeft: 6, opacity: 0.6 }}>{sub}</span>}
      </span>
    </div>
  );
}

function Row({ label, value, sub, bold, color }: {
  label: string; value: string; sub?: string; bold?: boolean; color?: string;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: "6px 0", borderBottom: "1px solid var(--border-subtle)",
    }}>
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 500,
        color: color ?? (bold ? "var(--gold)" : "var(--text-primary)") }}>
        {value}{sub && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>{sub}</span>}
      </span>
    </div>
  );
}

function KpiGrid({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length},1fr)`, gap: 6 }}>
      {items.map(i => (
        <div key={i.label} className="card-kpi" style={{
          padding: "9px 10px", textAlign: "center",
          "--kpi-accent": i.color ?? "var(--blue)",
        } as React.CSSProperties}>
          <div style={{ fontSize: 8.5, color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.06em" }}>{i.label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: i.color ?? "var(--text-primary)" }}>{i.value}</div>
        </div>
      ))}
    </div>
  );
}

function LoadState({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return (
    <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)", fontSize: 13 }}>
      <RefreshCw size={18} style={{ animation: "spin 1s linear infinite", display: "inline-block", marginBottom: 8 }} />
      <br />Đang tải từ Odoo...
    </div>
  );
  if (error) return (
    <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.06)",
      border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626", fontSize: 12 }}>
      {error}
    </div>
  );
  return null;
}

function DatePicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  return (
    <input type="date" value={value} onChange={e => onChange(e.target.value)}
      className="input-glow"
      style={{
        flex: 1, padding: "10px 12px", fontSize: 13, fontWeight: 600,
        color: "var(--text-primary)", colorScheme: "light",
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
      const res = await fetch(`/api/daily-report?type=morning&date=${d}`);
      const text = await res.text();
      let r: Record<string, unknown>;
      try { r = JSON.parse(text); }
      catch { throw new Error(`Lỗi server (${res.status}): ${text.slice(0, 120)}`); }
      if (!r.ok) throw new Error((r.error as string) ?? "Lỗi không xác định");
      setData(r.report as MorningReport);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(date); }, [date]);

  const groups = data?.byGroup ?? [];
  const advisors = data?.byAdvisor ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Date row */}
      <div style={{ display: "flex", gap: 8 }}>
        <DatePicker value={date} onChange={setDate} />
        <div style={{ padding: "10px 12px", borderRadius: 10,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{dow(date)}</div>
        <button onClick={() => load(date)} style={{
          padding: "10px 12px", borderRadius: 10,
          background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.25)",
          color: "var(--blue)", cursor: "pointer",
        }}><RefreshCw size={14} /></button>
      </div>

      <LoadState loading={loading} error={error} />

      {data && (
        <>
          {/* ── Tổng quan ── */}
          <Card gold>
            <SectionHeader title={`Kết quả ${dow(date)} ${fmtVN(date)}`} />
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--gold)", marginBottom: 10 }}>
              {M(data.revTotal)} ₫
            </div>
            <KpiGrid items={[
              { label: "Số bill", value: String(data.bills), color: "var(--blue)" },
              { label: "Số món", value: String(data.qtyTotal), color: "#7c3aed" },
              { label: "AOV", value: M(data.aov) + " ₫", color: "var(--gold)" },
              { label: "IPT", value: data.ipt.toFixed(2), color: "#ea580c" },
              ...(data.traffic ? [{ label: "Traffic", value: String(data.traffic), color: "#059669" }] : []),
              ...(data.traffic && data.bills ? [{ label: "Conv.", value: (data.bills / data.traffic * 100).toFixed(1) + "%", color: "#db2777" }] : []),
            ]} />
          </Card>

          {/* ── Theo nhóm MH ── */}
          <Card>
            <SectionHeader title="Doanh thu theo nhóm sản phẩm" sub="(copy vào Store Agenda / Monthly Tracking)" />
            {groups.map((g, i) => (
              <Row key={g.group}
                label={g.group || "Không rõ nhóm"}
                value={M(g.rev) + " ₫"}
                sub={`${g.qty} món · ${g.bills ?? 0} bill`}
                bold={i === 0}
                color={i === 0 ? "var(--gold)" : undefined}
              />
            ))}
            {groups.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>Không có dữ liệu</div>
            )}
          </Card>

          {/* ── Theo nhân viên ── */}
          <Card>
            <SectionHeader title="Doanh thu theo cá nhân" sub="(copy vào Club Elite)" />
            {advisors.map(a => {
              const key = a.name;
              const open = expanded[key];
              return (
                <div key={key} style={{ marginBottom: 2 }}>
                  <button onClick={() => setExpanded(e => ({ ...e, [key]: !open }))}
                    style={{
                      width: "100%", background: "none", border: "none", cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 0", borderBottom: "1px solid var(--border-subtle)",
                    }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{a.name}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>{M(a.rev)} ₫</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{a.bills} bill · {a.qty} món</span>
                      {open ? <ChevronUp size={12} color="var(--text-muted)" /> : <ChevronDown size={12} color="var(--text-muted)" />}
                    </span>
                  </button>
                  {open && (
                    <div style={{ paddingLeft: 14, paddingBottom: 8, paddingTop: 4 }}>
                      {a.byGroup.map(g => (
                        <div key={g.group} style={{
                          display: "flex", justifyContent: "space-between",
                          padding: "3px 0", fontSize: 12,
                          borderBottom: "1px solid var(--border-subtle)",
                        }}>
                          <span style={{ color: "var(--text-secondary)" }}>{g.group || "Khác"}</span>
                          <span style={{ color: "var(--text-primary)" }}>{M(g.rev)} ₫ · {g.qty} món</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {advisors.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>
                Không có dữ liệu nhân viên (cần gán Sale Advisor trong Odoo POS)
              </div>
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
      const res = await fetch(`/api/daily-report?type=evening&date=${d}`);
      const text = await res.text();
      let r: Record<string, unknown>;
      try { r = JSON.parse(text); }
      catch { throw new Error(`Lỗi server (${res.status}): ${text.slice(0, 120)}`); }
      if (!r.ok) throw new Error((r.error as string) ?? "Lỗi không xác định");
      setData(r.report as EveningReport);
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
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{dow(date)}</div>
        <button onClick={() => load(date)} style={{
          padding: "10px 12px", borderRadius: 10,
          background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.25)",
          color: "var(--blue)", cursor: "pointer",
        }}><RefreshCw size={14} /></button>
      </div>

      <LoadState loading={loading} error={error} />

      {data && (
        <>
          {/* ── Tổng doanh thu ── */}
          <Card gold>
            <SectionHeader title={`Cuối ngày ${dow(date)} ${fmtVN(date)}`} />
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--gold)", marginBottom: 10 }}>
              {M(data.revTotal)} ₫
            </div>
            <KpiGrid items={[
              { label: "Số bill", value: String(data.bills), color: "var(--blue)" },
              { label: "Số món", value: String(data.qtyTotal), color: "#7c3aed" },
              { label: "AOV", value: M(data.aov) + " ₫", color: "var(--gold)" },
              { label: "IPT", value: data.ipt.toFixed(2), color: "#ea580c" },
            ]} />
          </Card>

          {/* ── Hình thức thanh toán ── */}
          <Card>
            <SectionHeader title="Hình thức thanh toán" sub="(copy vào Daily Sale Report)" />
            {pays.map(([key, val]) => (
              <Row key={key}
                label={PAY_LABELS[key] ?? key}
                value={M(val) + " ₫"}
                bold={key === "cash" || key === "vnpay"}
              />
            ))}
            {pays.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6,
                borderTop: "1px solid var(--border)", marginTop: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Tổng thanh toán</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
                  {M(pays.reduce((s, [, v]) => s + v, 0))} ₫
                </span>
              </div>
            )}
          </Card>

          {/* ── Theo nhóm MH ── */}
          <Card>
            <SectionHeader title="Doanh thu theo nhóm sản phẩm" sub="(copy vào Daily Sale Report)" />
            {groups.map((g, i) => (
              <Row key={g.group}
                label={g.group || "Không rõ nhóm"}
                value={M(g.rev) + " ₫"}
                sub={`${((g.pct ?? 0)).toFixed(1)}% · ${g.qty} món`}
                bold={i === 0}
                color={i === 0 ? "var(--gold)" : undefined}
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
      const res = await fetch(`/api/daily-report?type=overview&from=${f}&to=${t}`);
      const text = await res.text();
      let r: Record<string, unknown>;
      try { r = JSON.parse(text); }
      catch { throw new Error(`Lỗi server (${res.status}): ${text.slice(0, 120)}`); }
      if (!r.ok) throw new Error((r.error as string) ?? "Lỗi không xác định");
      setData(r as unknown as OverviewReport);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(from, to); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Range shortcuts */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {RANGE_OPTIONS.map(o => {
          const active = from === o.from && to === o.to;
          return (
            <button key={o.label}
              onClick={() => { setFrom(o.from); setTo(o.to); load(o.from, o.to); }}
              className={`badge ${active ? "badge-gold" : "badge-muted"}`}
              style={{ padding: "5px 13px", fontSize: 10, cursor: "pointer", border: "none", fontFamily: "inherit" }}>
              {o.label}
            </button>
          );
        })}
      </div>

      {/* Custom range */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <DatePicker value={from} onChange={setFrom} />
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>→</span>
        <DatePicker value={to} onChange={setTo} />
        <button onClick={() => load(from, to)} style={{
          padding: "10px 12px", borderRadius: 10,
          background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.25)",
          color: "var(--blue)", cursor: "pointer", flexShrink: 0,
        }}><RefreshCw size={14} /></button>
      </div>

      <LoadState loading={loading} error={error} />

      {data && (
        <>
          {/* ── Tổng kết ── */}
          <Card gold>
            <SectionHeader title={`Tổng kết ${fmtVN(from)} – ${fmtVN(to)}`} />
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--gold)", marginBottom: 10 }}>
              {K(data.totals.revTotal)} ₫
            </div>
            <KpiGrid items={[
              { label: "Tổng bill", value: String(data.totals.bills), color: "var(--blue)" },
              { label: "Tổng món", value: String(data.totals.qtyTotal), color: "#7c3aed" },
              { label: "AOV TB", value: K(data.totals.bills > 0 ? data.totals.revTotal / data.totals.bills : 0) + " ₫", color: "var(--gold)" },
            ]} />
          </Card>

          {/* ── Insights ── */}
          <Card>
            <SectionHeader title="Nhận xét & Đề xuất" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.insights.map((t, i) => (
                <div key={i} style={{
                  fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5,
                  padding: "8px 10px", borderRadius: 8,
                  background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
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
              {showDays
                ? <ChevronUp size={13} color="var(--text-muted)" />
                : <ChevronDown size={13} color="var(--text-muted)" />}
            </button>
            {showDays && (
              <div style={{ marginTop: 6 }}>
                {/* Header */}
                <div style={{
                  display: "grid", gridTemplateColumns: "70px 1fr 44px 44px 54px",
                  gap: 4, padding: "4px 0",
                  fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase",
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
                    borderTop: "1px solid var(--border-subtle)", fontSize: 12,
                  }}>
                    <span style={{ color: "var(--text-secondary)" }}>{dow(d.date)} {d.date.slice(5)}</span>
                    <span style={{ textAlign: "right", fontWeight: 600, color: d.revTotal > 0 ? "var(--gold)" : "var(--text-muted)" }}>
                      {d.revTotal > 0 ? K(d.revTotal) : "—"}
                    </span>
                    <span style={{ textAlign: "right", color: "var(--text-secondary)" }}>{d.bills || "—"}</span>
                    <span style={{ textAlign: "right", color: "var(--text-secondary)", fontSize: 11 }}>
                      {d.aov > 0 ? K(d.aov) : "—"}
                    </span>
                    <span style={{ textAlign: "right", color: d.conversion ? "#059669" : "var(--text-muted)", fontSize: 11 }}>
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
    <div style={{ minHeight: "100vh", padding: "16px 16px 90px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, rgba(201,165,90,0.15), rgba(201,165,90,0.06))",
            border: "1px solid rgba(201,165,90,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ClipboardList size={17} color="var(--gold)" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>Báo Cáo</h1>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, marginTop: 1 }}>
              Dữ liệu live từ Odoo POS + Palexy
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="card-float"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "10px 8px", cursor: "pointer",
                background: tab === t.key
                  ? "linear-gradient(135deg, rgba(201,165,90,0.14), rgba(201,165,90,0.06))"
                  : "rgba(255,255,255,0.75)",
                border: tab === t.key ? "1px solid rgba(201,165,90,0.38)" : "1px solid rgba(186,230,253,0.5)",
                color: tab === t.key ? "var(--gold)" : "var(--text-secondary)",
                boxShadow: tab === t.key ? "0 2px 12px rgba(201,165,90,0.12)" : undefined,
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, fontSize: 12 }}>
                {t.icon} {t.label}
              </div>
              <div style={{ fontSize: 8.5, opacity: 0.65, textAlign: "center", letterSpacing: "0.02em" }}>{t.sub}</div>
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
        input[type="date"]::-webkit-calendar-picker-indicator { filter: none; opacity: 0.5; }
      `}</style>
    </div>
  );
}
