"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import {
  Clock, LogIn, LogOut, Calendar, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Timer, Users, TrendingUp, Download,
  BarChart2, User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  checkIn: string;
  checkOut: string | null;
  note: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function durationMs(checkIn: string, checkOut: string | null): number {
  const end = checkOut ? new Date(checkOut) : new Date();
  return end.getTime() - new Date(checkIn).getTime();
}

function fmtDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}g${m.toString().padStart(2, "0")}p`;
}

function duration(checkIn: string, checkOut: string | null) {
  return fmtDuration(durationMs(checkIn, checkOut));
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function getWeekRange(date: string) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) };
}

function getMonthRange(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const from = `${yearMonth}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV(records: AttendanceRecord[], filename: string) {
  const header = ["Nhân viên", "Ngày", "Check In", "Check Out", "Thời gian làm", "Ghi chú"];
  const rows = records.map(r => [
    r.userName,
    new Date(r.checkIn).toLocaleDateString("vi-VN"),
    fmtTime(r.checkIn),
    fmtTime(r.checkOut),
    r.checkOut ? fmtDuration(durationMs(r.checkIn, r.checkOut)) : "Chưa check out",
    r.note ?? "",
  ]);
  const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Live Clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 44, fontWeight: 800, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {time.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5, letterSpacing: "0.06em" }}>
        {time.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1px solid var(--border)",
      padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 2px 10px rgba(14,165,233,0.05)",
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}15`, flexShrink: 0 }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Attendance Row ───────────────────────────────────────────────────────────

function AttRow({ rec, isMe, showDate }: { rec: AttendanceRecord; isMe: boolean; showDate?: boolean }) {
  const done = !!rec.checkOut;
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ borderBottom: "1px solid var(--border-subtle)", background: isMe ? "rgba(14,165,233,0.02)" : "transparent" }}
    >
      <td style={{ padding: "9px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
            background: isMe ? "linear-gradient(135deg,#0ea5e9,#0284c7)" : "linear-gradient(135deg,#475569,#1e293b)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>{rec.userName.slice(0, 1).toUpperCase()}</span>
          </div>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>
              {rec.userName}
              {isMe && <span style={{ fontSize: 7, color: "var(--blue)", background: "rgba(14,165,233,0.1)", padding: "1px 4px", borderRadius: 4, marginLeft: 5 }}>Bạn</span>}
            </span>
            {rec.note && <div style={{ fontSize: 8, color: "var(--text-muted)" }}>{rec.note}</div>}
          </div>
        </div>
      </td>
      {showDate && (
        <td style={{ padding: "9px 8px" }}>
          <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
            {new Date(rec.checkIn).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
          </span>
        </td>
      )}
      <td style={{ padding: "9px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <LogIn size={9} style={{ color: "#10b981" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#10b981" }}>{fmtTime(rec.checkIn)}</span>
        </div>
      </td>
      <td style={{ padding: "9px 8px" }}>
        {done ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <LogOut size={9} style={{ color: "#64748b" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>{fmtTime(rec.checkOut)}</span>
          </div>
        ) : (
          <span style={{ fontSize: 9, color: "var(--text-muted)", fontStyle: "italic" }}>Đang làm...</span>
        )}
      </td>
      <td style={{ padding: "9px 8px" }}>
        <span style={{ fontSize: 10, color: done ? "var(--text-secondary)" : "var(--blue)", fontVariantNumeric: "tabular-nums" }}>
          {duration(rec.checkIn, rec.checkOut)}
        </span>
      </td>
      <td style={{ padding: "9px 16px 9px 8px" }}>
        {done ? (
          <span style={{ fontSize: 7, fontWeight: 700, color: "#475569", background: "rgba(71,85,105,0.08)", padding: "2px 7px", borderRadius: 5, border: "1px solid rgba(71,85,105,0.15)" }}>Xong</span>
        ) : (
          <span style={{ fontSize: 7, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.08)", padding: "2px 7px", borderRadius: 5, border: "1px solid rgba(16,185,129,0.2)" }}>Đang ca</span>
        )}
      </td>
    </motion.tr>
  );
}

// ─── Summary by person (for week/month view) ─────────────────────────────────

function PersonSummaryRow({ name, records, isMe }: { name: string; records: AttendanceRecord[]; isMe: boolean }) {
  const days  = new Set(records.map(r => r.checkIn.slice(0, 10))).size;
  const total = records.filter(r => r.checkOut).reduce((s, r) => s + durationMs(r.checkIn, r.checkOut), 0);
  const avg   = days > 0 ? total / days : 0;
  return (
    <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: isMe ? "rgba(14,165,233,0.02)" : "transparent" }}>
      <td style={{ padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: isMe ? "linear-gradient(135deg,#0ea5e9,#0284c7)" : "linear-gradient(135deg,#475569,#1e293b)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{name.slice(0, 1).toUpperCase()}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
            {name} {isMe && <span style={{ fontSize: 7, color: "var(--blue)", background: "rgba(14,165,233,0.1)", padding: "1px 4px", borderRadius: 4, marginLeft: 4 }}>Bạn</span>}
          </span>
        </div>
      </td>
      <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>{days}</td>
      <td style={{ padding: "10px 8px", fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>{records.length}</td>
      <td style={{ padding: "10px 8px", fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums", textAlign: "center" }}>{total > 0 ? fmtDuration(total) : "—"}</td>
      <td style={{ padding: "10px 16px 10px 8px", fontSize: 12, color: "var(--blue)", fontVariantNumeric: "tabular-nums", textAlign: "center" }}>{avg > 0 ? fmtDuration(avg) : "—"}</td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const currentUser = useStore(s => s.currentUser);
  const isManager   = currentUser?.role === "admin" || currentUser?.role === "manager";

  // Today tab state
  const [todayRecs,  setTodayRecs]  = useState<AttendanceRecord[]>([]);
  const [myRecord,   setMyRecord]   = useState<AttendanceRecord | null>(null);
  const [viewDate,   setViewDate]   = useState(todayStr());
  const [loadingDay, setLoadingDay] = useState(true);
  const [acting,     setActing]     = useState(false);
  const [note,       setNote]       = useState("");
  const [msg,        setMsg]        = useState<{ text: string; ok: boolean } | null>(null);

  // History tab state
  const [histMode,   setHistMode]   = useState<"week" | "month">("week");
  const [weekAnchor, setWeekAnchor] = useState(todayStr());
  const [yearMonth,  setYearMonth]  = useState(todayStr().slice(0, 7));
  const [histRecs,   setHistRecs]   = useState<AttendanceRecord[]>([]);
  const [loadingHist,setLoadingHist]= useState(false);
  const [histView,   setHistView]   = useState<"detail" | "summary">("summary");
  const [filterUser, setFilterUser] = useState<string>("all");

  // Active tab
  const [activeTab,  setActiveTab]  = useState<"today" | "history">("today");

  // ── Load today ─────────────────────────────────────────────────────────────
  const loadDay = useCallback(async () => {
    setLoadingDay(true);
    try {
      const res  = await fetch(`/api/attendance?date=${viewDate}&limit=200`);
      const data: AttendanceRecord[] = await res.json();
      setTodayRecs(data);
      if (currentUser) setMyRecord(data.find(r => r.userId === currentUser.id && !r.checkOut) ?? null);
    } catch {
      setMsg({ text: "Lỗi tải dữ liệu", ok: false });
    } finally { setLoadingDay(false); }
  }, [viewDate, currentUser]);

  useEffect(() => { if (activeTab === "today") loadDay(); }, [loadDay, activeTab]);

  // ── Load history ───────────────────────────────────────────────────────────
  const loadHist = useCallback(async () => {
    setLoadingHist(true);
    try {
      const range = histMode === "week" ? getWeekRange(weekAnchor) : getMonthRange(yearMonth);
      const uid   = (!isManager && currentUser) ? `&userId=${currentUser.id}` : "";
      const res   = await fetch(`/api/attendance?from=${range.from}&to=${range.to}&limit=1000${uid}`);
      const data: AttendanceRecord[] = await res.json();
      setHistRecs(data);
    } catch {
      setMsg({ text: "Lỗi tải lịch sử", ok: false });
    } finally { setLoadingHist(false); }
  }, [histMode, weekAnchor, yearMonth, isManager, currentUser]);

  useEffect(() => { if (activeTab === "history") loadHist(); }, [loadHist, activeTab]);

  // Auto-dismiss
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  // ── Check in ───────────────────────────────────────────────────────────────
  async function handleCheckIn() {
    if (!currentUser) return;
    setActing(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, userName: currentUser.name, note }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ text: data.error ?? "Lỗi check in", ok: false }); return; }
      setMsg({ text: `Check in lúc ${fmtTime(data.checkIn)}`, ok: true });
      setNote("");
      await loadDay();
    } finally { setActing(false); }
  }

  // ── Check out ──────────────────────────────────────────────────────────────
  async function handleCheckOut() {
    if (!currentUser) return;
    setActing(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, note }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ text: data.error ?? "Lỗi check out", ok: false }); return; }
      setMsg({ text: `Check out — ${duration(data.checkIn, data.checkOut)} làm việc`, ok: true });
      setNote("");
      await loadDay();
    } finally { setActing(false); }
  }

  // ── Today stats ────────────────────────────────────────────────────────────
  const isToday = viewDate === todayStr();
  const present = todayRecs.filter(r => !r.checkOut).length;
  const finished = todayRecs.filter(r => !!r.checkOut).length;
  const avgHours = useMemo(() => {
    const done = todayRecs.filter(r => !!r.checkOut);
    if (!done.length) return "—";
    return fmtDuration(done.reduce((s, r) => s + durationMs(r.checkIn, r.checkOut), 0) / done.length);
  }, [todayRecs]);

  // ── History data ───────────────────────────────────────────────────────────
  const histRange = histMode === "week" ? getWeekRange(weekAnchor) : getMonthRange(yearMonth);
  const filteredHist = filterUser === "all" ? histRecs : histRecs.filter(r => r.userId === filterUser);
  const histUsers    = useMemo(() => Array.from(new Map(histRecs.map(r => [r.userId, r.userName]))), [histRecs]);

  // Summary grouped by user
  const summaryByUser = useMemo(() => {
    const map = new Map<string, { name: string; records: AttendanceRecord[] }>();
    for (const r of filteredHist) {
      if (!map.has(r.userId)) map.set(r.userId, { name: r.userName, records: [] });
      map.get(r.userId)!.records.push(r);
    }
    return Array.from(map.entries()).map(([uid, v]) => ({ uid, ...v }));
  }, [filteredHist]);

  // ── Export ─────────────────────────────────────────────────────────────────
  function doExport() {
    const data = activeTab === "today" ? todayRecs : filteredHist;
    const name = activeTab === "today"
      ? `chamcong_${viewDate}.csv`
      : `chamcong_${histRange.from}_${histRange.to}.csv`;
    exportCSV(data, name);
  }

  // ── Week nav helpers ───────────────────────────────────────────────────────
  function prevWeek() { setWeekAnchor(a => addDays(a, -7)); }
  function nextWeek() { setWeekAnchor(a => addDays(a, 7)); }
  const weekStr = (() => {
    const { from, to } = getWeekRange(weekAnchor);
    const f = new Date(from).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    const t = new Date(to).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    return `${f} – ${t}`;
  })();

  const TAB_STYLE = (active: boolean) => ({
    height: 32, padding: "0 16px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.06em",
    color: active ? "#fff" : "var(--text-muted)",
    background: active ? "linear-gradient(135deg,#0ea5e9,#0284c7)" : "transparent",
    boxShadow: active ? "0 2px 8px rgba(14,165,233,0.25)" : "none",
    transition: "all 0.15s",
  });

  return (
    <div style={{ flex: 1, overflow: "auto", background: "var(--bg-base)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Chấm Công</h1>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Ghi nhận giờ làm việc hằng ngày</p>
          </div>
          <button
            onClick={doExport}
            style={{
              height: 34, padding: "0 14px", borderRadius: 9, border: "1px solid var(--border)",
              background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontSize: 10, fontWeight: 600, color: "var(--text-secondary)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <Download size={12} /> Export CSV
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "var(--bg-elevated)", borderRadius: 10, padding: 4, width: "fit-content" }}>
          <button onClick={() => setActiveTab("today")}   style={TAB_STYLE(activeTab === "today")}>Hôm Nay</button>
          <button onClick={() => setActiveTab("history")} style={TAB_STYLE(activeTab === "history")}>Lịch Sử</button>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {msg && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{
                marginBottom: 14, padding: "10px 14px", borderRadius: 10,
                background: msg.ok ? "rgba(16,185,129,0.08)" : "rgba(220,38,38,0.07)",
                border: `1px solid ${msg.ok ? "rgba(16,185,129,0.3)" : "rgba(220,38,38,0.25)"}`,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {msg.ok ? <CheckCircle2 size={13} style={{ color: "#10b981" }} /> : <XCircle size={13} style={{ color: "#dc2626" }} />}
              <span style={{ fontSize: 11, fontWeight: 600, color: msg.ok ? "#10b981" : "#dc2626" }}>{msg.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ TODAY TAB ══════════════════════════════════════════════════════════ */}
        {activeTab === "today" && (
          <>
            {/* Check in/out card */}
            {currentUser && (
              <div style={{
                background: "#fff", borderRadius: 18, border: "1px solid var(--border)",
                padding: "24px 24px 20px", marginBottom: 16,
                boxShadow: "0 4px 24px rgba(14,165,233,0.08)",
              }}>
                <LiveClock />
                <div style={{ height: 1, background: "var(--border-subtle)", margin: "18px 0" }} />

                {/* Status */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                  {myRecord ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "rgba(16,185,129,0.08)", borderRadius: 20, border: "1px solid rgba(16,185,129,0.25)" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 3px rgba(16,185,129,0.2)" }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#10b981" }}>
                        Đang ca — vào lúc {fmtTime(myRecord.checkIn)} ({duration(myRecord.checkIn, null)})
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "rgba(100,116,139,0.07)", borderRadius: 20, border: "1px solid rgba(100,116,139,0.15)" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Chưa check in hôm nay</span>
                    </div>
                  )}
                </div>

                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)"
                  style={{ width: "100%", height: 36, borderRadius: 9, padding: "0 12px", border: "1px solid var(--border)", background: "var(--bg-base)", fontSize: 11, color: "var(--text-primary)", boxSizing: "border-box", outline: "none", marginBottom: 12 }} />

                {!myRecord ? (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleCheckIn} disabled={acting}
                    style={{ width: "100%", height: 44, borderRadius: 11, border: "none", background: acting ? "#e2e8f0" : "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: acting ? "none" : "0 4px 14px rgba(16,185,129,0.3)" }}>
                    <LogIn size={15} /> {acting ? "Đang xử lý..." : "Check In"}
                  </motion.button>
                ) : (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleCheckOut} disabled={acting}
                    style={{ width: "100%", height: 44, borderRadius: 11, border: "none", background: acting ? "#e2e8f0" : "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: acting ? "none" : "0 4px 14px rgba(245,158,11,0.3)" }}>
                    <LogOut size={15} /> {acting ? "Đang xử lý..." : "Check Out"}
                  </motion.button>
                )}
              </div>
            )}

            {/* Stats */}
            {isToday && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
                <StatCard icon={Users}        label="Đang làm việc" value={String(present)}  color="#10b981" />
                <StatCard icon={CheckCircle2} label="Đã check out"  value={String(finished)} color="#0ea5e9" />
                <StatCard icon={TrendingUp}   label="Giờ TB"        value={avgHours}          color="#C9A55A" />
              </div>
            )}

            {/* Date nav + table */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 2px 12px rgba(14,165,233,0.05)" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar size={13} style={{ color: "var(--blue)" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                    {isToday ? "Hôm nay" : new Date(viewDate).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                  <span style={{ fontSize: 8, color: "var(--blue)", background: "rgba(14,165,233,0.1)", padding: "1px 5px", borderRadius: 4 }}>{todayRecs.length}</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => setViewDate(d => addDays(d, -1))} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ChevronLeft size={12} style={{ color: "var(--text-muted)" }} />
                  </button>
                  {!isToday && (
                    <button onClick={() => setViewDate(todayStr())} style={{ height: 26, padding: "0 9px", borderRadius: 7, border: "1px solid var(--blue)", background: "rgba(14,165,233,0.08)", cursor: "pointer", fontSize: 8, fontWeight: 700, color: "var(--blue)" }}>
                      Hôm nay
                    </button>
                  )}
                  <button onClick={() => setViewDate(d => addDays(d, 1))} disabled={isToday} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid var(--border)", background: "transparent", cursor: isToday ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: isToday ? 0.3 : 1 }}>
                    <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(to bottom,#f8fbff,#f0f9ff)", borderBottom: "1px solid var(--border-subtle)" }}>
                    {["Nhân viên", "Check In", "Check Out", "Thời gian", "Trạng thái"].map((h, i) => (
                      <th key={i} style={{ padding: "6px 8px", textAlign: "left", fontSize: 7, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.14em", ...(i === 0 && { paddingLeft: 16 }), ...(i === 4 && { paddingRight: 16 }) }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingDay ? (
                    <tr><td colSpan={5} style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>Đang tải...</td></tr>
                  ) : todayRecs.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: "40px 0", textAlign: "center" }}>
                      <Clock size={28} style={{ margin: "0 auto 8px", color: "var(--border)", display: "block" }} />
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{isToday ? "Bấm Check In để bắt đầu ca làm" : "Không có dữ liệu ngày này"}</p>
                    </td></tr>
                  ) : (
                    todayRecs.map(rec => <AttRow key={rec.id} rec={rec} isMe={currentUser?.id === rec.userId} />)
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══ HISTORY TAB ════════════════════════════════════════════════════════ */}
        {activeTab === "history" && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 2px 12px rgba(14,165,233,0.05)" }}>

            {/* Toolbar */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Week / Month toggle */}
              <div style={{ display: "flex", gap: 2, background: "var(--bg-elevated)", borderRadius: 8, padding: 2 }}>
                <button onClick={() => setHistMode("week")}  style={{ height: 26, padding: "0 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 9, fontWeight: histMode === "week" ? 700 : 500, background: histMode === "week" ? "#fff" : "transparent", color: histMode === "week" ? "var(--text-primary)" : "var(--text-muted)", boxShadow: histMode === "week" ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>Tuần</button>
                <button onClick={() => setHistMode("month")} style={{ height: 26, padding: "0 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 9, fontWeight: histMode === "month" ? 700 : 500, background: histMode === "month" ? "#fff" : "transparent", color: histMode === "month" ? "var(--text-primary)" : "var(--text-muted)", boxShadow: histMode === "month" ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>Tháng</button>
              </div>

              {/* Range nav */}
              {histMode === "week" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={prevWeek} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={11} style={{ color: "var(--text-muted)" }} /></button>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-primary)", minWidth: 110, textAlign: "center" }}>{weekStr}</span>
                  <button onClick={nextWeek} disabled={getWeekRange(addDays(weekAnchor, 7)).from > todayStr()} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: getWeekRange(addDays(weekAnchor, 7)).from > todayStr() ? 0.3 : 1 }}><ChevronRight size={11} style={{ color: "var(--text-muted)" }} /></button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => setYearMonth(ym => { const d = new Date(ym + "-01"); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={11} style={{ color: "var(--text-muted)" }} /></button>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-primary)", minWidth: 80, textAlign: "center" }}>Tháng {yearMonth.split("-")[1]}/{yearMonth.split("-")[0]}</span>
                  <button onClick={() => setYearMonth(ym => { const d = new Date(ym + "-01"); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 7); })} disabled={yearMonth >= todayStr().slice(0, 7)} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: yearMonth >= todayStr().slice(0, 7) ? 0.3 : 1 }}><ChevronRight size={11} style={{ color: "var(--text-muted)" }} /></button>
                </div>
              )}

              {/* Filter by user (manager only) */}
              {isManager && histUsers.length > 0 && (
                <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
                  style={{ height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "#fff", padding: "0 8px", fontSize: 10, color: "var(--text-secondary)", cursor: "pointer", outline: "none" }}>
                  <option value="all">Tất cả nhân viên</option>
                  {histUsers.map(([uid, name]) => <option key={uid} value={uid}>{name}</option>)}
                </select>
              )}

              {/* Detail / Summary toggle */}
              <div style={{ marginLeft: "auto", display: "flex", gap: 2, background: "var(--bg-elevated)", borderRadius: 8, padding: 2 }}>
                <button onClick={() => setHistView("summary")} title="Tổng hợp" style={{ width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", background: histView === "summary" ? "#fff" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: histView === "summary" ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}><BarChart2 size={12} style={{ color: histView === "summary" ? "var(--blue)" : "var(--text-muted)" }} /></button>
                <button onClick={() => setHistView("detail")} title="Chi tiết" style={{ width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", background: histView === "detail" ? "#fff" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: histView === "detail" ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}><User size={12} style={{ color: histView === "detail" ? "var(--blue)" : "var(--text-muted)" }} /></button>
              </div>
            </div>

            {/* Table */}
            {loadingHist ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
                <Timer size={20} style={{ margin: "0 auto 8px", opacity: 0.4, display: "block" }} />Đang tải...
              </div>
            ) : filteredHist.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center" }}>
                <Calendar size={28} style={{ margin: "0 auto 8px", color: "var(--border)", display: "block" }} />
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Không có dữ liệu trong khoảng thời gian này</p>
              </div>
            ) : histView === "summary" ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(to bottom,#f8fbff,#f0f9ff)", borderBottom: "1px solid var(--border-subtle)" }}>
                    {["Nhân viên", "Ngày làm", "Ca", "Tổng giờ", "Giờ TB/ngày"].map((h, i) => (
                      <th key={i} style={{ padding: "6px 8px", textAlign: i === 0 ? "left" : "center", fontSize: 7, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.14em", ...(i === 0 && { paddingLeft: 16 }), ...(i === 4 && { paddingRight: 16 }) }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaryByUser.map(({ uid, name, records }) => (
                    <PersonSummaryRow key={uid} name={name} records={records} isMe={currentUser?.id === uid} />
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(to bottom,#f8fbff,#f0f9ff)", borderBottom: "1px solid var(--border-subtle)" }}>
                    {["Nhân viên", "Ngày", "Check In", "Check Out", "Thời gian", ""].map((h, i) => (
                      <th key={i} style={{ padding: "6px 8px", textAlign: "left", fontSize: 7, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.14em", ...(i === 0 && { paddingLeft: 16 }), ...(i === 5 && { paddingRight: 16 }) }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHist.map(rec => <AttRow key={rec.id} rec={rec} isMe={currentUser?.id === rec.userId} showDate />)}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
