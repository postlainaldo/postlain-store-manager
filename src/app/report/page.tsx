"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardList, ChevronDown, ChevronUp, CheckCircle2,
  Sun, Moon, RefreshCw, History, ChevronRight,
} from "lucide-react";
import { useStore } from "@/store/useStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type Shift = "start" | "end";

type ReportForm = {
  date: string;
  shift: Shift;
  targetDay: number;
  // Payment breakdown
  revCash: number;
  revCard: number;
  revTransfer: number;
  revVnpay: number;
  revMomo: number;
  revUrbox: number;
  revNinja: number;
  revOther: number;
  // Category
  revHB: number;
  revSC: number;
  revACC: number;
  // Ops
  traffic: number;
  bills: number;
  qtyTotal: number;
  note: string;
  preparedBy: string;
};

type PrefillData = {
  summary: {
    totalRevenue: number;
    orderCount: number;
    avgOrderValue: number;
    qtyTotal: number;
  } | null;
  topProducts: { productName: string; sku: string | null; totalQty: number; totalRevenue: number }[];
};

type SavedReport = ReportForm & { id: string; revTotal: number; conversion: number; aov: number; ipt: number; createdAt: string; updatedAt: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (!n) return "0";
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calcRevTotal(f: ReportForm) {
  return f.revCash + f.revCard + f.revTransfer + f.revVnpay + f.revMomo + f.revUrbox + f.revNinja + f.revOther;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NumInput({
  label, value, onChange, unit = "₫", highlight = false,
}: {
  label: string; value: number; onChange: (v: number) => void;
  unit?: string; highlight?: boolean;
}) {
  const [raw, setRaw] = useState(value ? String(value) : "");
  useEffect(() => { setRaw(value ? String(value) : ""); }, [value]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          inputMode="numeric"
          value={raw}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, "");
            setRaw(v);
            onChange(v ? parseInt(v) : 0);
          }}
          style={{
            width: "100%", boxSizing: "border-box",
            background: highlight ? "rgba(201,165,90,0.08)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${highlight ? "rgba(201,165,90,0.3)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 8, padding: "8px 36px 8px 10px",
            fontSize: 14, color: "#fff", outline: "none",
          }}
          placeholder="0"
        />
        <span style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          fontSize: 11, color: "rgba(255,255,255,0.25)",
        }}>{unit}</span>
      </div>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
        color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600,
      }}>
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const currentUser = useStore(s => s.currentUser);
  const today = todayStr();

  const [form, setForm] = useState<ReportForm>({
    date: today,
    shift: "end",
    targetDay: 0,
    revCash: 0, revCard: 0, revTransfer: 0,
    revVnpay: 0, revMomo: 0, revUrbox: 0,
    revNinja: 0, revOther: 0,
    revHB: 0, revSC: 0, revACC: 0,
    traffic: 0, bills: 0, qtyTotal: 0,
    note: "", preparedBy: currentUser?.name ?? "",
  });

  const [prefill, setPrefill] = useState<PrefillData | null>(null);
  const [prefilling, setPrefilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<SavedReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [existingReport, setExistingReport] = useState<SavedReport | null>(null);

  const set = (k: keyof ReportForm, v: ReportForm[keyof ReportForm]) =>
    setForm(f => ({ ...f, [k]: v }));

  // Load prefill from POS data
  const loadPrefill = useCallback(async (date: string) => {
    setPrefilling(true);
    try {
      const res = await fetch(`/api/reports?date=${date}&action=prefill`).then(r => r.json());
      if (res.ok) setPrefill(res);
    } finally { setPrefilling(false); }
  }, []);

  // Check for existing report on date/shift change
  const checkExisting = useCallback(async (date: string, shift: string) => {
    const res = await fetch(`/api/reports?date=${date}&shift=${shift}`).then(r => r.json());
    if (res.ok && res.report) {
      setExistingReport(res.report as SavedReport);
      // Load its values into form
      const r = res.report as SavedReport;
      setForm(f => ({
        ...f,
        targetDay: r.targetDay, revCash: r.revCash, revCard: r.revCard,
        revTransfer: r.revTransfer, revVnpay: r.revVnpay, revMomo: r.revMomo,
        revUrbox: r.revUrbox, revNinja: r.revNinja, revOther: r.revOther,
        revHB: r.revHB, revSC: r.revSC, revACC: r.revACC,
        traffic: r.traffic, bills: r.bills, qtyTotal: r.qtyTotal,
        note: r.note, preparedBy: r.preparedBy,
      }));
    } else {
      setExistingReport(null);
    }
  }, []);

  useEffect(() => {
    loadPrefill(today);
    checkExisting(today, "end");
  }, []);

  useEffect(() => {
    if (form.preparedBy === "" && currentUser?.name) {
      setForm(f => ({ ...f, preparedBy: currentUser.name }));
    }
  }, [currentUser]);

  // Apply POS prefill to bills and qty
  const applyPrefill = () => {
    if (!prefill?.summary) return;
    setForm(f => ({
      ...f,
      bills: prefill.summary!.orderCount,
      qtyTotal: prefill.summary!.qtyTotal,
    }));
  };

  // Load history
  const loadHistory = async () => {
    const res = await fetch("/api/reports").then(r => r.json());
    if (res.ok) setHistory(res.reports ?? []);
    setShowHistory(true);
  };

  // Save report
  const saveReport = async () => {
    setSaving(true); setSaved(false);
    const revTotal = calcRevTotal(form);
    const conversion = form.traffic > 0 ? form.bills / form.traffic : 0;
    const aov = form.bills > 0 ? revTotal / form.bills : 0;
    const ipt = form.bills > 0 ? form.qtyTotal / form.bills : 0;

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, revTotal, conversion, aov, ipt }),
      }).then(r => r.json());
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  };

  const revTotal = calcRevTotal(form);
  const conversion = form.traffic > 0 ? (form.bills / form.traffic * 100).toFixed(1) : "—";
  const aov = form.bills > 0 ? revTotal / form.bills : 0;
  const ipt = form.bills > 0 ? form.qtyTotal / form.bills : 0;
  const vsTarget = form.targetDay > 0 ? (revTotal / form.targetDay * 100).toFixed(1) : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0c1a2e 0%, #0f2035 100%)",
      padding: "24px 16px 90px",
    }}>
      <div style={{ maxWidth: 620, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <ClipboardList size={20} color="#C9A55A" />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Báo Cáo Ca</h1>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              Đầu ca / Cuối ca · Dữ liệu từ Odoo POS
            </p>
          </div>
          <button onClick={loadHistory} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
            borderRadius: 8, background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer",
          }}>
            <History size={13} /> Lịch sử
          </button>
        </div>

        {/* Date + Shift selector */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Ngày</label>
            <input
              type="date"
              value={form.date}
              onChange={e => {
                set("date", e.target.value);
                loadPrefill(e.target.value);
                checkExisting(e.target.value, form.shift);
              }}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "9px 10px", fontSize: 14, color: "#fff",
                outline: "none", colorScheme: "dark",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Ca</label>
            <div style={{ display: "flex", gap: 6 }}>
              {([["start", "Đầu ca", Sun], ["end", "Cuối ca", Moon]] as const).map(([v, label, Icon]) => (
                <button key={v} onClick={() => {
                  set("shift", v);
                  checkExisting(form.date, v);
                }} style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  padding: "9px 0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                  background: form.shift === v ? "rgba(201,165,90,0.15)" : "rgba(255,255,255,0.04)",
                  border: form.shift === v ? "1px solid rgba(201,165,90,0.4)" : "1px solid rgba(255,255,255,0.1)",
                  color: form.shift === v ? "#C9A55A" : "rgba(255,255,255,0.4)",
                }}>
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Existing report notice */}
        {existingReport && (
          <div style={{
            padding: "9px 14px", borderRadius: 8, fontSize: 12,
            background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)",
            color: "#7dd3fc",
          }}>
            Đã có báo cáo {form.shift === "start" ? "đầu ca" : "cuối ca"} ngày {fmtDate(form.date + "T00:00:00")} · Đang chỉnh sửa
          </div>
        )}

        {/* POS Data Prefill banner */}
        {prefill && (
          <div style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "12px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Dữ liệu Odoo POS — {fmtDate(form.date + "T00:00:00")}
              </span>
              {prefilling && <RefreshCw size={12} color="rgba(255,255,255,0.3)" style={{ animation: "spin 1s linear infinite" }} />}
            </div>

            {prefill.summary ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 10 }}>
                  {[
                    { label: "Doanh thu", value: fmt(prefill.summary.totalRevenue) + " ₫" },
                    { label: "Số bill", value: String(prefill.summary.orderCount) },
                    { label: "SL hàng", value: String(prefill.summary.qtyTotal) },
                    { label: "AOV", value: fmt(prefill.summary.avgOrderValue) + " ₫" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A55A" }}>{value}</div>
                    </div>
                  ))}
                </div>

                {prefill.topProducts.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Top sản phẩm hôm nay</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {prefill.topProducts.slice(0, 5).map((p, i) => (
                        <div key={p.productName} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          fontSize: 12, color: "rgba(255,255,255,0.55)",
                        }}>
                          <span style={{ color: i < 3 ? "#C9A55A" : "rgba(255,255,255,0.35)", marginRight: 6, minWidth: 16, textAlign: "right" }}>
                            #{i + 1}
                          </span>
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.productName}</span>
                          <span style={{ marginLeft: 8, color: "#C9A55A", flexShrink: 0 }}>×{p.totalQty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={applyPrefill} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                  borderRadius: 6, background: "rgba(201,165,90,0.1)", border: "1px solid rgba(201,165,90,0.25)",
                  color: "#C9A55A", fontSize: 12, cursor: "pointer",
                }}>
                  <ChevronRight size={12} /> Điền bill & số lượng vào form
                </button>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Chưa có dữ liệu POS ngày này</div>
            )}
          </div>
        )}

        {/* Daily target */}
        <Section title="🎯 Chỉ Tiêu Ngày">
          <NumInput label="Chỉ tiêu doanh số ngày" value={form.targetDay} onChange={v => set("targetDay", v)} highlight />
        </Section>

        {/* Payment breakdown */}
        <Section title="💰 Doanh Thu Theo Hình Thức Thanh Toán">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <NumInput label="Tiền mặt (Cash)" value={form.revCash} onChange={v => set("revCash", v)} />
            <NumInput label="Thẻ (Credit/Debit)" value={form.revCard} onChange={v => set("revCard", v)} />
            <NumInput label="Chuyển khoản" value={form.revTransfer} onChange={v => set("revTransfer", v)} />
            <NumInput label="VNPAY" value={form.revVnpay} onChange={v => set("revVnpay", v)} />
            <NumInput label="MoMo" value={form.revMomo} onChange={v => set("revMomo", v)} />
            <NumInput label="Urbox (Voucher)" value={form.revUrbox} onChange={v => set("revUrbox", v)} />
            <NumInput label="Ninja Thu Hộ" value={form.revNinja} onChange={v => set("revNinja", v)} />
            <NumInput label="Khác" value={form.revOther} onChange={v => set("revOther", v)} />
          </div>
          {/* Total */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderRadius: 8,
            background: revTotal > 0 ? "rgba(201,165,90,0.08)" : "rgba(255,255,255,0.02)",
            border: "1px solid rgba(201,165,90,0.2)",
          }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Tổng doanh thu</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#C9A55A" }}>{fmt(revTotal)} ₫</span>
          </div>
          {vsTarget && (
            <div style={{
              fontSize: 12, textAlign: "right",
              color: parseFloat(vsTarget) >= 100 ? "#86efac" : "#fca5a5",
            }}>
              {parseFloat(vsTarget) >= 100 ? "✓" : "▼"} {vsTarget}% chỉ tiêu
              {form.targetDay > 0 && ` · ${parseFloat(vsTarget) >= 100 ? "Vượt" : "Còn thiếu"} ${fmt(Math.abs(revTotal - form.targetDay))} ₫`}
            </div>
          )}
        </Section>

        {/* Category breakdown */}
        <Section title="👜 Doanh Thu Theo Danh Mục">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <NumInput label="Handbag (HB)" value={form.revHB} onChange={v => set("revHB", v)} />
            <NumInput label="Shoe Care (SC)" value={form.revSC} onChange={v => set("revSC", v)} />
            <NumInput label="Accessories (ACC)" value={form.revACC} onChange={v => set("revACC", v)} />
          </div>
          {revTotal > 0 && (
            <div style={{ display: "flex", gap: 10 }}>
              {[["HB", form.revHB], ["SC", form.revSC], ["ACC", form.revACC]].map(([label, val]) => (
                <div key={label} style={{
                  flex: 1, textAlign: "center", padding: "6px 0",
                  background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{label}%</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                    {((Number(val) / revTotal) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Traffic & KPIs */}
        <Section title="📊 Traffic & KPI">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <NumInput label="Traffic (lượt vào)" value={form.traffic} onChange={v => set("traffic", v)} unit="khách" />
            <NumInput label="Số Bill (đơn)" value={form.bills} onChange={v => set("bills", v)} unit="bill" />
            <NumInput label="Số lượng SP bán" value={form.qtyTotal} onChange={v => set("qtyTotal", v)} unit="cái" />
          </div>
          {/* Calculated KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[
              { label: "Conversion", value: conversion + (form.traffic > 0 ? "%" : "") },
              { label: "AOV", value: fmt(aov) + " ₫" },
              { label: "IPT", value: ipt.toFixed(2) },
            ].map(({ label, value }) => (
              <div key={label} style={{
                textAlign: "center", padding: "8px 4px",
                background: "rgba(56,189,248,0.05)", borderRadius: 8, border: "1px solid rgba(56,189,248,0.12)",
              }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#38bdf8" }}>{value}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Note + Prepared by */}
        <Section title="📝 Ghi Chú">
          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Người lập báo cáo</label>
            <input
              value={form.preparedBy}
              onChange={e => set("preparedBy", e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "9px 10px", fontSize: 14, color: "#fff", outline: "none",
              }}
              placeholder="Tên nhân viên..."
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Ghi chú</label>
            <textarea
              value={form.note}
              onChange={e => set("note", e.target.value)}
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "9px 10px", fontSize: 13, color: "#fff", outline: "none",
                resize: "vertical",
              }}
              placeholder="Ghi chú, vấn đề phát sinh trong ca..."
            />
          </div>
        </Section>

        {/* Save button */}
        <button onClick={saveReport} disabled={saving} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "14px 0", borderRadius: 12, cursor: saving ? "default" : "pointer",
          background: saved ? "rgba(34,197,94,0.15)" : "rgba(201,165,90,0.15)",
          border: saved ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(201,165,90,0.4)",
          color: saved ? "#86efac" : "#C9A55A",
          fontSize: 15, fontWeight: 700, opacity: saving ? 0.7 : 1,
        }}>
          {saved ? <><CheckCircle2 size={16} /> Đã lưu!</> : saving ? "Đang lưu..." : `Lưu Báo Cáo ${form.shift === "start" ? "Đầu Ca" : "Cuối Ca"}`}
        </button>

        {/* History panel */}
        {showHistory && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Lịch sử báo cáo
              </span>
              <button onClick={() => setShowHistory(false)} style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12,
              }}>Đóng</button>
            </div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", padding: 30, fontSize: 13 }}>Chưa có báo cáo nào</div>
            ) : (
              history.map(r => (
                <div key={r.id} onClick={() => {
                  setForm({
                    date: r.date, shift: r.shift,
                    targetDay: r.targetDay, revCash: r.revCash, revCard: r.revCard,
                    revTransfer: r.revTransfer, revVnpay: r.revVnpay, revMomo: r.revMomo,
                    revUrbox: r.revUrbox, revNinja: r.revNinja, revOther: r.revOther,
                    revHB: r.revHB, revSC: r.revSC, revACC: r.revACC,
                    traffic: r.traffic, bills: r.bills, qtyTotal: r.qtyTotal,
                    note: r.note, preparedBy: r.preparedBy,
                  });
                  setShowHistory(false);
                }} style={{
                  padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                      {fmtDate(r.date + "T00:00:00")} · {r.shift === "start" ? "Đầu ca" : "Cuối ca"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                      {r.preparedBy && r.preparedBy + " · "}{r.bills} bill · {fmt(r.revTotal)} ₫
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#C9A55A", fontWeight: 600 }}>
                    {r.targetDay > 0 ? (r.revTotal / r.targetDay * 100).toFixed(0) + "%" : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
      `}</style>
    </div>
  );
}
