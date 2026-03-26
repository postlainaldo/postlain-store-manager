"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import {
  Clock, LogIn, LogOut, Calendar, User, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Timer, Users, TrendingUp,
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function duration(checkIn: string, checkOut: string | null): string {
  const end = checkOut ? new Date(checkOut) : new Date();
  const ms  = end.getTime() - new Date(checkIn).getTime();
  const h   = Math.floor(ms / 3_600_000);
  const m   = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}g${m.toString().padStart(2, "0")}p`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
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
      <div style={{ fontSize: 48, fontWeight: 800, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {time.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, letterSpacing: "0.06em" }}>
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
      padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 2px 10px rgba(14,165,233,0.05)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
        background: `${color}15`, flexShrink: 0,
      }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function AttRow({ rec, isMe }: { rec: AttendanceRecord; isMe: boolean }) {
  const done = !!rec.checkOut;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 90px 90px 80px 80px",
        padding: "10px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        alignItems: "center",
        background: isMe ? "rgba(14,165,233,0.02)" : "transparent",
      }}
    >
      {/* Name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: isMe ? "linear-gradient(135deg,#0ea5e9,#0284c7)" : "linear-gradient(135deg,#475569,#1e293b)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>
            {rec.userName.slice(0, 1).toUpperCase()}
          </span>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>
            {rec.userName} {isMe && <span style={{ fontSize: 8, color: "var(--blue)", background: "rgba(14,165,233,0.1)", padding: "1px 5px", borderRadius: 4, marginLeft: 4 }}>Bạn</span>}
          </div>
          {rec.note && <div style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 1 }}>{rec.note}</div>}
        </div>
      </div>

      {/* Check in */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <LogIn size={10} style={{ color: "#10b981" }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#10b981" }}>{fmtTime(rec.checkIn)}</span>
      </div>

      {/* Check out */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {done ? (
          <>
            <LogOut size={10} style={{ color: "#64748b" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>{fmtTime(rec.checkOut)}</span>
          </>
        ) : (
          <span style={{ fontSize: 9, color: "var(--text-muted)", fontStyle: "italic" }}>Đang làm...</span>
        )}
      </div>

      {/* Duration */}
      <span style={{ fontSize: 10, color: done ? "var(--text-secondary)" : "var(--blue)", fontVariantNumeric: "tabular-nums" }}>
        {duration(rec.checkIn, rec.checkOut)}
      </span>

      {/* Status badge */}
      <div>
        {done ? (
          <span style={{ fontSize: 8, fontWeight: 700, color: "#475569", background: "rgba(71,85,105,0.08)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(71,85,105,0.15)" }}>
            Hoàn thành
          </span>
        ) : (
          <span style={{ fontSize: 8, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.08)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(16,185,129,0.2)" }}>
            Đang ca
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const currentUser = useStore(s => s.currentUser);

  const [records,   setRecords]   = useState<AttendanceRecord[]>([]);
  const [myRecord,  setMyRecord]  = useState<AttendanceRecord | null>(null); // open record today
  const [loading,   setLoading]   = useState(true);
  const [acting,    setActing]    = useState(false);
  const [note,      setNote]      = useState("");
  const [msg,       setMsg]       = useState<{ text: string; ok: boolean } | null>(null);
  const [viewDate,  setViewDate]  = useState(todayStr());
  const [tab,       setTab]       = useState<"today" | "history">("today");

  // ── Load records ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${viewDate}&limit=200`);
      const data: AttendanceRecord[] = await res.json();
      setRecords(data);

      // Find my open record today
      if (currentUser) {
        const open = data.find(r => r.userId === currentUser.id && !r.checkOut);
        setMyRecord(open ?? null);
      }
    } catch {
      setMsg({ text: "Lỗi tải dữ liệu", ok: false });
    } finally {
      setLoading(false);
    }
  }, [viewDate, currentUser]);

  useEffect(() => { load(); }, [load]);

  // Auto-dismiss message
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  // ── Check in ────────────────────────────────────────────────────────────────
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
      await load();
    } finally {
      setActing(false);
    }
  }

  // ── Check out ───────────────────────────────────────────────────────────────
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
      const dur = duration(data.checkIn, data.checkOut);
      setMsg({ text: `Check out — ${dur} làm việc`, ok: true });
      setNote("");
      await load();
    } finally {
      setActing(false);
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const todayRecords = records.filter(r => r.checkIn.startsWith(todayStr()));
  const present      = todayRecords.filter(r => !r.checkOut).length;
  const finished     = todayRecords.filter(r => !!r.checkOut).length;
  const avgHours     = (() => {
    const doneRecs = todayRecords.filter(r => !!r.checkOut);
    if (!doneRecs.length) return "—";
    const avg = doneRecs.reduce((s, r) => s + (new Date(r.checkOut!).getTime() - new Date(r.checkIn).getTime()), 0) / doneRecs.length;
    const h = Math.floor(avg / 3_600_000);
    const m = Math.floor((avg % 3_600_000) / 60_000);
    return `${h}g${m.toString().padStart(2, "0")}p`;
  })();

  const isToday = viewDate === todayStr();

  return (
    <div style={{ flex: 1, overflow: "auto", background: "var(--bg-base)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Chấm Công
          </h1>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
            Ghi nhận giờ làm việc hằng ngày
          </p>
        </div>

        {/* ── Toast ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                marginBottom: 16, padding: "10px 14px", borderRadius: 10,
                background: msg.ok ? "rgba(16,185,129,0.08)" : "rgba(220,38,38,0.07)",
                border: `1px solid ${msg.ok ? "rgba(16,185,129,0.3)" : "rgba(220,38,38,0.25)"}`,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {msg.ok
                ? <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                : <XCircle size={14} style={{ color: "#dc2626" }} />}
              <span style={{ fontSize: 11, fontWeight: 600, color: msg.ok ? "#10b981" : "#dc2626" }}>
                {msg.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Check in/out card (own user) ─────────────────────── */}
        {currentUser && (
          <div style={{
            background: "#fff", borderRadius: 18, border: "1px solid var(--border)",
            padding: "28px 28px 24px", marginBottom: 20,
            boxShadow: "0 4px 24px rgba(14,165,233,0.08)",
          }}>
            <LiveClock />

            <div style={{ height: 1, background: "var(--border-subtle)", margin: "20px 0" }} />

            {/* Status pill */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              {myRecord ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                  background: "rgba(16,185,129,0.08)", borderRadius: 20,
                  border: "1px solid rgba(16,185,129,0.25)",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 3px rgba(16,185,129,0.25)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#10b981" }}>
                    Đang ca — vào lúc {fmtTime(myRecord.checkIn)} ({duration(myRecord.checkIn, null)})
                  </span>
                </div>
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                  background: "rgba(100,116,139,0.07)", borderRadius: 20,
                  border: "1px solid rgba(100,116,139,0.15)",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Chưa check in hôm nay</span>
                </div>
              )}
            </div>

            {/* Note input */}
            <div style={{ marginBottom: 14 }}>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ghi chú (không bắt buộc)"
                style={{
                  width: "100%", height: 38, borderRadius: 10, padding: "0 12px",
                  border: "1px solid var(--border)", background: "var(--bg-base)",
                  fontSize: 11, color: "var(--text-primary)", boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              {!myRecord ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCheckIn}
                  disabled={acting}
                  style={{
                    flex: 1, height: 46, borderRadius: 12, border: "none",
                    background: acting ? "#e2e8f0" : "linear-gradient(135deg,#10b981,#059669)",
                    color: "#fff", fontSize: 13, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: acting ? "none" : "0 4px 14px rgba(16,185,129,0.3)",
                  }}
                >
                  <LogIn size={16} />
                  {acting ? "Đang xử lý..." : "Check In"}
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCheckOut}
                  disabled={acting}
                  style={{
                    flex: 1, height: 46, borderRadius: 12, border: "none",
                    background: acting ? "#e2e8f0" : "linear-gradient(135deg,#f59e0b,#d97706)",
                    color: "#fff", fontSize: 13, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: acting ? "none" : "0 4px 14px rgba(245,158,11,0.3)",
                  }}
                >
                  <LogOut size={16} />
                  {acting ? "Đang xử lý..." : "Check Out"}
                </motion.button>
              )}
            </div>
          </div>
        )}

        {/* ── Stats (today) ──────────────────────────────────────── */}
        {isToday && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
            <StatCard icon={Users}     label="Đang làm việc" value={String(present)}  color="#10b981" />
            <StatCard icon={CheckCircle2} label="Đã check out" value={String(finished)} color="#0ea5e9" />
            <StatCard icon={TrendingUp} label="Giờ TB"        value={avgHours}         color="#C9A55A" />
          </div>
        )}

        {/* ── Table header + date nav ─────────────────────────────── */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid var(--border)",
          boxShadow: "0 2px 12px rgba(14,165,233,0.05)",
          overflow: "hidden",
        }}>
          {/* Date nav */}
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={14} style={{ color: "var(--blue)" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                {isToday ? "Hôm nay" : new Date(viewDate).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
              </span>
              {isToday && (
                <span style={{ fontSize: 8, fontWeight: 700, color: "var(--blue)", background: "rgba(14,165,233,0.1)", padding: "2px 6px", borderRadius: 5 }}>
                  {records.length} bản ghi
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => setViewDate(addDays(viewDate, -1))}
                style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <ChevronLeft size={13} style={{ color: "var(--text-muted)" }} />
              </button>
              {!isToday && (
                <button
                  onClick={() => setViewDate(todayStr())}
                  style={{ height: 28, padding: "0 10px", borderRadius: 8, border: "1px solid var(--blue)", background: "rgba(14,165,233,0.08)", cursor: "pointer", fontSize: 9, fontWeight: 700, color: "var(--blue)" }}
                >
                  Hôm nay
                </button>
              )}
              <button
                onClick={() => setViewDate(addDays(viewDate, 1))}
                disabled={isToday}
                style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: isToday ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: isToday ? 0.3 : 1 }}
              >
                <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          </div>

          {/* Table head */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 90px 90px 80px 80px",
            padding: "6px 16px",
            background: "linear-gradient(to bottom, #f8fbff, #f0f9ff)",
            borderBottom: "1px solid var(--border-subtle)",
          }}>
            {["Nhân viên", "Check in", "Check out", "Thời gian", "Trạng thái"].map((h, i) => (
              <span key={i} style={{ fontSize: 8, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.14em" }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
              <Timer size={20} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              Đang tải...
            </div>
          ) : records.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <Clock size={32} style={{ margin: "0 auto 10px", color: "var(--border)", display: "block" }} />
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Chưa có bản ghi chấm công</p>
              <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                {isToday ? "Bấm Check In để bắt đầu ca làm" : "Không có dữ liệu ngày này"}
              </p>
            </div>
          ) : (
            records.map(rec => (
              <AttRow
                key={rec.id}
                rec={rec}
                isMe={currentUser?.id === rec.userId}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
