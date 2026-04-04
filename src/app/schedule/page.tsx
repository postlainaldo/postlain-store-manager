"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Clock,
  Users, Trash2, Edit3, CalendarDays, Settings2,
  ChevronDown, AlertCircle, CheckCircle2, XCircle, UserPlus, UserMinus,
  CheckSquare, Square, MessageCircle, Send, Download, ClipboardList,
} from "lucide-react";
import { useStore, sel, AppUser } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "@/hooks/useSFX";


// ─── Types ────────────────────────────────────────────────────────────────────
type StaffType = "FT" | "PT" | "ALL";

type ShiftTemplate = {
  id: string; name: string; startTime: string; endTime: string;
  color: string; maxStaff: number; createdAt: string;
  staffType?: StaffType;
};
type ShiftSlot = {
  id: string; templateId: string | null; date: string;
  name: string; startTime: string; endTime: string;
  color: string; maxStaff: number; note: string | null;
  createdAt: string; updatedAt: string;
  staffType?: StaffType;
};
type ShiftRegistration = {
  id: string; slotId: string; userId: string; userName: string;
  status: string; note: string | null; createdAt: string; updatedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS_VI   = ["CN","T2","T3","T4","T5","T6","T7"];
const DAYS_FULL = ["Chủ Nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"];
const MONTHS_VI = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                   "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

/** Date string in VN timezone (UTC+7) — prevents off-by-one at midnight */
function toDateStr(d: Date) {
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 10);
}
/** Today string in VN time */
function todayVN() { return toDateStr(new Date()); }

/** Business week counter from store epoch: W001 starts 2026-02-02 (Mon). Mar 23 = W008. */
const WEEK_EPOCH = new Date("2026-02-02T00:00:00+07:00");
function getISOWeek(d: Date): number {
  // d is already a VN-adjusted UTC date from getWeekDates
  const day = d.getUTCDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  const diffMs = monday.getTime() - WEEK_EPOCH.getTime();
  const weekNum = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, weekNum);
}

function getWeekDates(weekOffset: number): Date[] {
  // Use VN local date to avoid midnight timezone drift
  const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const day = nowVN.getUTCDay();
  const monday = new Date(nowVN);
  monday.setUTCDate(nowVN.getUTCDate() - ((day + 6) % 7) + weekOffset * 7);
  monday.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d;
  });
}

function fmt(t: string) { return t.slice(0, 5); }

/** Infer FT/PT from slot name prefix [FULL]/[PT] if staffType not explicitly set */
function inferStaffType(slot: { staffType?: StaffType; name: string }): StaffType {
  if (slot.staffType && slot.staffType !== "ALL") return slot.staffType;
  const n = slot.name.toUpperCase();
  if (n.startsWith("[FULL]") || n.startsWith("FULL ")) return "FT";
  if (n.startsWith("[PT]") || n.startsWith("PT ")) return "PT";
  return slot.staffType ?? "ALL";
}

/**
 * Registration window rule:
 *   Thu–Sat  (dow 4,5,6) → staff can register for NEXT week's shifts
 *   Sun–Wed  (dow 0,1,2,3) → registration closed; view-only
 *
 * For admins this gate never applies (admin can always manage slots).
 * `slotDate` is the date string of the shift slot being checked.
 */
function canStaffRegister(slotDate: string): boolean {
  // Use VN time (UTC+7) for day-of-week check
  const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const todayDow = nowVN.getUTCDay(); // 0=Sun … 6=Sat
  const openWindow = todayDow >= 4 && todayDow <= 6; // Thu/Fri/Sat only

  if (!openWindow) return false;

  // Next week Mon–Sun
  const daysToNextMon = ((8 - todayDow) % 7) || 7;
  const nextMonday = new Date(nowVN);
  nextMonday.setUTCDate(nowVN.getUTCDate() + daysToNextMon);
  nextMonday.setUTCHours(0,0,0,0);
  const nextSunday = new Date(nextMonday);
  nextSunday.setUTCDate(nextMonday.getUTCDate() + 6);

  const nms = nextMonday.toISOString().slice(0, 10);
  const nss = nextSunday.toISOString().slice(0, 10);
  return slotDate >= nms && slotDate <= nss;
}

function statusColor(s: string) {
  return s === "approved" ? "#10b981" : s === "rejected" ? "#ef4444" : "#f59e0b";
}
function statusLabel(s: string) {
  return s === "approved" ? "Đã xếp" : s === "rejected" ? "Từ chối" : "Chờ duyệt";
}
function StatusIcon({ status }: { status: string }) {
  if (status === "approved") return <CheckCircle2 size={11} style={{ color: "#10b981" }} />;
  if (status === "rejected") return <XCircle size={11} style={{ color: "#ef4444" }} />;
  return <AlertCircle size={11} style={{ color: "#f59e0b" }} />;
}
function roleLabel(r: string) {
  return r === "admin" ? "Admin" : r === "manager" ? "Quản lý" : "Nhân viên";
}

const PRESET_COLORS = ["#0ea5e9","#10b981","#f59e0b","#8b5cf6","#ef4444","#ec4899","#06b6d4","#84cc16"];

const STAFF_TYPE_CFG: Record<StaffType, { label: string; bg: string; color: string; border: string }> = {
  FT:  { label: "FULL TIME", bg: "rgba(14,165,233,0.10)", color: "#0284c7", border: "rgba(14,165,233,0.30)" },
  PT:  { label: "PART TIME", bg: "rgba(124,58,237,0.10)", color: "#7c3aed", border: "rgba(124,58,237,0.30)" },
  ALL: { label: "TẤT CẢ",    bg: "rgba(16,185,129,0.08)", color: "#059669", border: "rgba(16,185,129,0.25)" },
};

function StaffTypeBadge({ type, size = "sm" }: { type?: StaffType; size?: "sm" | "xs" }) {
  if (!type || type === "ALL") return null;
  const cfg = STAFF_TYPE_CFG[type];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: size === "xs" ? "1px 5px" : "2px 7px",
      borderRadius: 20,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      fontSize: size === "xs" ? 7 : 8,
      fontWeight: 800,
      color: cfg.color,
      letterSpacing: "0.06em",
      flexShrink: 0,
    }}>
      {type}
    </span>
  );
}

function StaffTypeSelect({ value, onChange }: { value: StaffType; onChange: (v: StaffType) => void }) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {(["ALL", "FT", "PT"] as StaffType[]).map(t => {
        const cfg = STAFF_TYPE_CFG[t];
        const active = value === t;
        return (
          <button key={t} onClick={() => onChange(t)}
            style={{
              flex: 1, height: 30, borderRadius: 8,
              border: `1.5px solid ${active ? cfg.border : "#e2e8f0"}`,
              background: active ? cfg.bg : "#fff",
              cursor: "pointer", fontFamily: "inherit",
              fontSize: 9, fontWeight: 800,
              color: active ? cfg.color : "#94a3b8",
              letterSpacing: "0.06em",
              transition: "all 0.12s",
            }}>
            {t === "ALL" ? "Tất cả" : t}
          </button>
        );
      })}
    </div>
  );
}

// ─── Template Form ────────────────────────────────────────────────────────────
function TemplateForm({ initial, onSave, onClose }: {
  initial?: ShiftTemplate;
  onSave: (t: Omit<ShiftTemplate, "id"|"createdAt"> & { staffType: StaffType }) => void;
  onClose: () => void;
}) {
  const [name,      setName]      = useState(initial?.name ?? "");
  const [start,     setStart]     = useState(initial?.startTime ?? "08:00");
  const [end,       setEnd]       = useState(initial?.endTime ?? "14:00");
  const [color,     setColor]     = useState(initial?.color ?? "#0ea5e9");
  const [max,       setMax]       = useState(initial?.maxStaff ?? 3);
  const [staffType, setStaffType] = useState<StaffType>(initial?.staffType ?? "ALL");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        <label style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:"0.1em" }}>TÊN CA</label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ca Sáng"
          className="input-glow" style={{ height:36, padding:"0 10px", fontSize:12, width:"100%" }} />
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:"0.1em" }}>BẮT ĐẦU</label>
          <input type="time" value={start} onChange={e=>setStart(e.target.value)}
            className="input-glow" style={{ height:36, padding:"0 10px", fontSize:12, width:"100%" }} />
        </div>
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:"0.1em" }}>KẾT THÚC</label>
          <input type="time" value={end} onChange={e=>setEnd(e.target.value)}
            className="input-glow" style={{ height:36, padding:"0 10px", fontSize:12, width:"100%" }} />
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        <label style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:"0.1em" }}>LOẠI NHÂN VIÊN</label>
        <StaffTypeSelect value={staffType} onChange={setStaffType} />
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:"0.1em" }}>MÀU</label>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={()=>setColor(c)}
                style={{ width:22, height:22, borderRadius:6, background:c, border:`2px solid ${color===c?"#0c1a2e":"transparent"}`, cursor:"pointer" }} />
            ))}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:"0.1em" }}>TỐI ĐA</label>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <button onClick={()=>setMax(m=>Math.max(1,m-1))}
              style={{ width:28, height:28, borderRadius:7, border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer", fontSize:14, color:"#0c1a2e" }}>−</button>
            <span style={{ minWidth:24, textAlign:"center", fontSize:13, fontWeight:700, color:"#0c1a2e" }}>{max}</span>
            <button onClick={()=>setMax(m=>Math.min(20,m+1))}
              style={{ width:28, height:28, borderRadius:7, border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer", fontSize:14, color:"#0c1a2e" }}>+</button>
          </div>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:4 }}>
        <button onClick={onClose}
          className="btn-ghost" style={{ flex:1, height:36, fontFamily:"inherit", fontSize:11 }}>
          Huỷ
        </button>
        <button
          onClick={()=>{ if(name.trim()) { playSound("save"); onSave({name:name.trim(),startTime:start,endTime:end,color,maxStaff:max,staffType}); } }}
          disabled={!name.trim()}
          className="btn-primary" style={{ flex:2, height:36, fontFamily:"inherit", fontSize:11, opacity:name.trim()?1:0.5 }}>
          Lưu ca
        </button>
      </div>
    </div>
  );
}

// ─── Slot Card ────────────────────────────────────────────────────────────────
function SlotCard({ slot, regs, isAdmin, currentUserId, allStaff, canRegister, onRegister, onCancel, onApprove, onReject, onAssign, onUnassign, onDelete, bulkMode, isSelected, onToggleSelect }: {
  slot: ShiftSlot;
  regs: ShiftRegistration[];
  isAdmin: boolean;
  currentUserId: string;
  allStaff: AppUser[];
  canRegister: boolean;
  onRegister: (slotId: string) => void;
  onCancel: (regId: string) => void;
  onApprove: (reg: ShiftRegistration) => void;
  onReject: (reg: ShiftRegistration) => void;
  onAssign: (slotId: string, user: AppUser) => void;
  onUnassign: (slotId: string, userId: string) => void;
  onDelete: (slotId: string) => void;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (slotId: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const myReg = regs.find(r => r.userId === currentUserId);
  const approved = regs.filter(r => r.status === "approved");
  const pending = regs.filter(r => r.status === "pending");
  const full = approved.length >= slot.maxStaff;
  const unassigned = allStaff.filter(u => !regs.find(r => r.userId === u.id));

  return (
    <div
      onClick={bulkMode ? () => { playSound("tap"); onToggleSelect?.(slot.id); } : undefined}
      style={{
        borderRadius:12,
        border: bulkMode && isSelected ? `2px solid ${slot.color}` : `1.5px solid ${slot.color}28`,
        background: bulkMode && isSelected ? `${slot.color}10` : "rgba(255,255,255,0.88)",
        backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
        boxShadow: "0 2px 12px rgba(12,26,46,0.06), 0 1px 3px rgba(12,26,46,0.04)",
        overflow:"hidden", marginBottom:0,
        cursor: bulkMode ? "pointer" : "default",
        transition:"transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease",
        position: "relative",
      }}
      onMouseEnter={e=>{
        if (bulkMode) return;
        (e.currentTarget as HTMLElement).style.transform="translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow= "0 8px 24px rgba(12,26,46,0.10), 0 2px 6px rgba(12,26,46,0.06)";
      }}
      onMouseLeave={e=>{
        if (bulkMode) return;
        (e.currentTarget as HTMLElement).style.transform="translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow= "0 2px 12px rgba(12,26,46,0.06), 0 1px 3px rgba(12,26,46,0.04)";
      }}
    >
      {/* Color top bar */}
      <div style={{ height:3, background:slot.color }} />
      {/* Bulk mode checkbox overlay */}
      {bulkMode && (
        <div style={{ position:"absolute", top:8, right:8, zIndex:10 }}>
          {isSelected
            ? <CheckSquare size={16} style={{ color: slot.color }} />
            : <Square size={16} style={{ color: "#cbd5e1" }} />
          }
        </div>
      )}

      {/* Header */}
      <div style={{ padding:"8px 10px 6px", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#0c1a2e" }}>{slot.name}</p>
            <StaffTypeBadge type={inferStaffType(slot)} size="xs" />
          </div>
          <p style={{ fontSize:10, color:"#64748b", marginTop:1 }}>
            {fmt(slot.startTime)}–{fmt(slot.endTime)} · {approved.length}/{slot.maxStaff}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => onDelete(slot.id)}
            style={{ width:22, height:22, borderRadius:6, border:"1px solid #fee2e2", background:"#fff5f5", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Trash2 size={9} style={{ color:"#ef4444" }} />
          </button>
        )}
      </div>

      {/* ADMIN VIEW */}
      {isAdmin ? (
        <div style={{ padding:"0 10px 10px" }}>
          {/* Approved list */}
          {approved.length > 0 && (
            <div style={{ marginBottom:6 }}>
              <p style={{ fontSize:8, fontWeight:700, color:"#10b981", letterSpacing:"0.1em", marginBottom:4 }}>ĐÃ XẾP</p>
              {approved.map(reg => (
                <div key={reg.id} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"#dcfce7", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:7, fontWeight:700, color:"#10b981" }}>{reg.userName[0]?.toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize:10, color:"#0c1a2e", flex:1 }}>{reg.userName}</span>
                  <button onClick={() => onUnassign(slot.id, reg.userId)}
                    style={{ width:18, height:18, borderRadius:4, border:"1px solid #fca5a5", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <UserMinus size={8} style={{ color:"#ef4444" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pending list */}
          {pending.length > 0 && (
            <div style={{ marginBottom:6 }}>
              <p style={{ fontSize:8, fontWeight:700, color:"#f59e0b", letterSpacing:"0.1em", marginBottom:4 }}>CHỜ DUYỆT ({pending.length})</p>
              {pending.map(reg => (
                <div key={reg.id} style={{ display:"flex", alignItems:"center", gap:4, marginBottom:3, background:"rgba(245,158,11,0.05)", borderRadius:6, padding:"3px 6px" }}>
                  <span style={{ fontSize:10, color:"#0c1a2e", flex:1 }}>{reg.userName}</span>
                  <button onClick={() => onApprove(reg)}
                    style={{ height:20, padding:"0 7px", borderRadius:5, border:"1px solid #bbf7d0", background:"#f0fdf4", cursor:"pointer", fontSize:9, fontWeight:700, color:"#10b981", fontFamily:"inherit" }}>
                    ✓
                  </button>
                  <button onClick={() => onReject(reg)}
                    style={{ height:20, padding:"0 7px", borderRadius:5, border:"1px solid #fca5a5", background:"#fff5f5", cursor:"pointer", fontSize:9, fontWeight:700, color:"#ef4444", fontFamily:"inherit" }}>
                    ✗
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add staff button */}
          {!full && unassigned.length > 0 && (
            <div>
              <button onClick={() => setShowAdd(v => !v)}
                style={{ width:"100%", height:26, borderRadius:7, border:`1px dashed ${slot.color}60`, background:"transparent", cursor:"pointer", fontSize:9, fontWeight:600, color:slot.color, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                <UserPlus size={9} /> Xếp nhân viên
              </button>
              <AnimatePresence>
                {showAdd && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} style={{ overflow:"hidden" }}>
                    <div style={{ marginTop:6, display:"flex", flexWrap:"wrap", gap:4 }}>
                      {unassigned.map(u => (
                        <button key={u.id} onClick={() => { onAssign(slot.id, u); setShowAdd(false); }}
                          style={{ padding:"3px 8px", borderRadius:20, border:`1px solid ${slot.color}40`, background:"#fff", cursor:"pointer", fontSize:9, fontWeight:600, color:slot.color, fontFamily:"inherit" }}>
                          {u.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {full && <p style={{ fontSize:9, color:"#10b981", fontWeight:600, textAlign:"center" }}>Ca đã đủ người</p>}
        </div>
      ) : (
        /* STAFF VIEW */
        <div style={{ padding:"0 10px 10px" }}>
          {/* Who's on this shift */}
          {approved.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:8 }}>
              {approved.map(reg => (
                <span key={reg.id} style={{ fontSize:9, color:"#64748b", background:"#f1f5f9", padding:"2px 7px", borderRadius:20 }}>{reg.userName}</span>
              ))}
            </div>
          )}

          {/* My status */}
          {!myReg ? (
            canRegister ? (
              <button onClick={() => { if (!full) { playSound("save"); onRegister(slot.id); } }} disabled={full}
                style={{ width:"100%", height:30, borderRadius:8, border:"none", background:full?"#f1f5f9":`linear-gradient(135deg,${slot.color},${slot.color}cc)`, cursor:full?"default":"pointer", fontSize:10, fontWeight:700, color:full?"#94a3b8":"#fff", fontFamily:"inherit" }}>
                {full ? "Đầy ca" : "Đăng ký ca này"}
              </button>
            ) : (
              <div style={{ width:"100%", height:30, borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                <span style={{ fontSize:9, color:"#94a3b8", fontWeight:600 }}>
                  {full ? "Đầy ca" : "Đăng ký mở T5–CN"}
                </span>
              </div>
            )
          ) : myReg.status === "approved" ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:10, color:"#10b981", fontWeight:700 }}>✓ Đã được xếp vào ca</span>
              {canRegister && <button onClick={() => onCancel(myReg.id)} style={{ fontSize:9, color:"#94a3b8", background:"none", border:"none", cursor:"pointer" }}>Huỷ</button>}
            </div>
          ) : myReg.status === "pending" ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:10, color:"#f59e0b", fontWeight:600 }}>⏳ Chờ xếp lịch</span>
              {canRegister && <button onClick={() => onCancel(myReg.id)} style={{ fontSize:9, color:"#94a3b8", background:"none", border:"none", cursor:"pointer" }}>Huỷ</button>}
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:10, color:"#ef4444", fontWeight:600 }}>✗ Không được xếp vào ca này</span>
              {canRegister && <button onClick={() => onRegister(slot.id)} style={{ fontSize:9, color:"#0ea5e9", background:"none", border:"none", cursor:"pointer" }}>Đăng ký lại</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Slot Modal ───────────────────────────────────────────────────────────
function AddSlotModal({ templates, date, onSave, onClose }: {
  templates: ShiftTemplate[]; date: string;
  onSave: (slot: Omit<ShiftSlot,"id"|"createdAt"|"updatedAt"> & { staffType: StaffType }) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"template"|"custom">(templates.length ? "template" : "custom");
  const [selectedTmpl, setSelectedTmpl] = useState<ShiftTemplate | null>(templates[0] ?? null);
  const [name,      setName]      = useState("");
  const [start,     setStart]     = useState("08:00");
  const [end,       setEnd]       = useState("14:00");
  const [color,     setColor]     = useState("#0ea5e9");
  const [max,       setMax]       = useState(3);
  const [note,      setNote]      = useState("");
  const [staffType, setStaffType] = useState<StaffType>("ALL");

  const dateObj = new Date(date + "T00:00:00");
  const dayLabel = `${DAYS_FULL[dateObj.getDay()]}, ${dateObj.getDate()} tháng ${dateObj.getMonth()+1}`;

  function handleSave() {
    if (mode === "template" && selectedTmpl) {
      onSave({ templateId:selectedTmpl.id, date, name:selectedTmpl.name,
        startTime:selectedTmpl.startTime, endTime:selectedTmpl.endTime,
        color:selectedTmpl.color, maxStaff:selectedTmpl.maxStaff, note:note||null,
        staffType: selectedTmpl.staffType ?? "ALL" });
    } else {
      if (!name.trim()) return;
      onSave({ templateId:null, date, name:name.trim(), startTime:start, endTime:end, color, maxStaff:max, note:note||null, staffType });
    }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity:0, scale:0.95, y:10 }} animate={{ opacity:1, scale:1, y:0 }}
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
          borderRadius:20, padding:20, width:"100%", maxWidth:360,
          boxShadow: "0 24px 80px rgba(12,26,46,0.18), 0 4px 16px rgba(12,26,46,0.08)",
          border: "1px solid rgba(186,230,253,0.5)",
        }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:"#0c1a2e" }}>Thêm ca làm</p>
            <p style={{ fontSize:10, color:"#64748b" }}>{dayLabel}</p>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={12} style={{ color:"#64748b" }} />
          </button>
        </div>

        {templates.length > 0 && (
          <div className="tab-nav" style={{ marginBottom:14 }}>
            {(["template","custom"] as const).map(m => (
              <button key={m} onClick={()=>setMode(m)}
                className={`tab-nav-item${mode===m?" active":""}`}>
                {m==="template" ? "Từ mẫu" : "Tuỳ chỉnh"}
              </button>
            ))}
          </div>
        )}

        {mode === "template" && templates.length > 0 ? (
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
            {templates.map(t => (
              <button key={t.id} onClick={()=>setSelectedTmpl(t)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:10, border:`1.5px solid ${selectedTmpl?.id===t.id?t.color:t.color+"30"}`, background:selectedTmpl?.id===t.id?`${t.color}10`:"#fff", cursor:"pointer", textAlign:"left" }}>
                <div style={{ width:10, height:10, borderRadius:3, background:t.color, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:"#0c1a2e" }}>{t.name}</p>
                    <StaffTypeBadge type={t.staffType} size="xs" />
                  </div>
                  <p style={{ fontSize:9, color:"#64748b" }}>{fmt(t.startTime)} – {fmt(t.endTime)} · tối đa {t.maxStaff} người</p>
                </div>
                {selectedTmpl?.id===t.id && <Check size={12} style={{ color:t.color }} />}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tên ca..."
              className="input-glow" style={{ height:36, padding:"0 10px", fontSize:12, width:"100%" }} />
            <div style={{ display:"flex", gap:8 }}>
              <input type="time" value={start} onChange={e=>setStart(e.target.value)}
                style={{ flex:1, height:36, borderRadius:8, border:"1px solid #e2e8f0", padding:"0 8px", fontSize:12, fontFamily:"inherit", outline:"none" }} />
              <input type="time" value={end} onChange={e=>setEnd(e.target.value)}
                style={{ flex:1, height:36, borderRadius:8, border:"1px solid #e2e8f0", padding:"0 8px", fontSize:12, fontFamily:"inherit", outline:"none" }} />
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={()=>setColor(c)}
                  style={{ width:22, height:22, borderRadius:6, background:c, border:`2px solid ${color===c?"#0c1a2e":"transparent"}`, cursor:"pointer" }} />
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:10, color:"#64748b" }}>Tối đa:</span>
              <button onClick={()=>setMax(m=>Math.max(1,m-1))} style={{ width:26,height:26,borderRadius:7,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontSize:14 }}>−</button>
              <span style={{ minWidth:20,textAlign:"center",fontSize:13,fontWeight:700,color:"#0c1a2e" }}>{max}</span>
              <button onClick={()=>setMax(m=>Math.min(20,m+1))} style={{ width:26,height:26,borderRadius:7,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontSize:14 }}>+</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <span style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:"0.1em" }}>LOẠI NHÂN VIÊN</span>
              <StaffTypeSelect value={staffType} onChange={setStaffType} />
            </div>
          </div>
        )}

        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Ghi chú (tuỳ chọn)..."
          rows={2}
          style={{ width:"100%", borderRadius:8, border:"1px solid #e2e8f0", padding:"8px 10px", fontSize:11, fontFamily:"inherit", outline:"none", resize:"none", color:"#0c1a2e", boxSizing:"border-box", marginBottom:12 }} />

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose}
            style={{ flex:1, height:36, borderRadius:9, border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer", fontSize:11, fontWeight:600, color:"#64748b", fontFamily:"inherit" }}>Huỷ</button>
          <button onClick={handleSave}
            style={{ flex:2, height:36, borderRadius:9, border:"none", background:"#0ea5e9", cursor:"pointer", fontSize:11, fontWeight:700, color:"#fff", fontFamily:"inherit" }}>
            Thêm ca
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Shift Note Widget ────────────────────────────────────────────────────────
const ROOM_ID = "room_schedule_issues";

type NoteMsg = { id: string; userId: string; userName: string; content: string; createdAt: string };
type ShiftRequest = {
  id: string; userId: string; userName: string; type: string;
  status: "pending" | "approved" | "rejected";
  content: string; adminNote: string | null;
  targetDate: string | null; createdAt: string;
};

const REQ_TYPE_LABEL: Record<string, string> = {
  swap_shift: "Đổi ca", day_off: "Xin nghỉ", note: "Ghi chú", other: "Khác",
};
const STATUS_CFG = {
  pending:  { label: "Chờ duyệt", bg: "#fef3c7", color: "#d97706" },
  approved: { label: "Đã duyệt",  bg: "#dcfce7", color: "#16a34a" },
  rejected: { label: "Từ chối",   bg: "#fee2e2", color: "#dc2626" },
};

function ShiftNoteWidget({ currentUser, isAdmin }: { currentUser: AppUser | null; isAdmin: boolean }) {
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState<"notes" | "requests">("notes");
  // Notes tab
  const [msgs, setMsgs]           = useState<NoteMsg[]>([]);
  const [text, setText]           = useState("");
  const [sending, setSending]     = useState(false);
  const [unread, setUnread]       = useState(0);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const lsKey = currentUser ? `shiftnote_seen_${currentUser.id}` : null;
  const lastSeenRef               = useRef<string>("");
  // Requests tab
  const [requests, setRequests]   = useState<ShiftRequest[]>([]);
  const [reqType, setReqType]     = useState("other");
  const [reqContent, setReqContent] = useState("");
  const [reqDate, setReqDate]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  // Staff: count of own requests resolved since last viewed
  const [resolvedUnread, setResolvedUnread] = useState(0);
  const reqLsKey = currentUser ? `sreq_seen_${currentUser.id}` : null;
  // Admin reply input per request
  const [replyNote, setReplyNote] = useState<Record<string, string>>({});
  // Admin: which resolved request is being edited
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [editReqStatus, setEditReqStatus] = useState<"approved" | "rejected">("approved");
  const [editReqNote, setEditReqNote] = useState("");

  // Load lastSeen from localStorage on mount
  useEffect(() => {
    if (!lsKey) return;
    lastSeenRef.current = localStorage.getItem(lsKey) ?? "";
  }, [lsKey]);

  // Use refs so the interval callback always reads latest values without
  // being in its dependency array (avoids restarting interval on tab/open changes)
  const openRef    = useRef(open);
  const tabRef     = useRef(tab);
  const userIdRef  = useRef(currentUser?.id);
  useEffect(() => { openRef.current = open; },           [open]);
  useEffect(() => { tabRef.current  = tab; },            [tab]);
  useEffect(() => { userIdRef.current = currentUser?.id; }, [currentUser?.id]);

  const fetchMsgs = useCallback(async () => {
    const res = await fetch(`/api/chat?roomId=${ROOM_ID}`);
    if (!res.ok) return;
    const data: NoteMsg[] = await res.json();
    setMsgs(data);
    if (!openRef.current || tabRef.current !== "notes") {
      const newCount = data.filter(m => m.createdAt > lastSeenRef.current && m.userId !== userIdRef.current).length;
      setUnread(newCount);
    }
  }, []); // stable — reads state via refs

  const fetchRequests = useCallback(async () => {
    const url = isAdmin
      ? "/api/shifts/requests"
      : `/api/shifts/requests?userId=${currentUser?.id}`;
    const data: ShiftRequest[] = await fetch(url).then(r => r.json()).catch(() => []);
    if (!Array.isArray(data)) return;
    setRequests(data);
    if (isAdmin) {
      setPendingCount(data.filter(r => r.status === "pending").length);
    } else if (reqLsKey) {
      const seenIds: string[] = JSON.parse(localStorage.getItem(reqLsKey) ?? "[]");
      const resolved = data.filter(r => r.status !== "pending" && !seenIds.includes(r.id));
      setResolvedUnread(resolved.length);
    }
  }, [isAdmin, currentUser?.id, reqLsKey]);

  useEffect(() => {
    fetch("/api/chat", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ROOM_ID, name: "Ghi chú lịch làm", type: "channel", createdBy: "user_admin" }),
    }).catch(() => {});
    fetchMsgs();
    fetchRequests();
    // Single stable interval — fetchMsgs is stable (uses refs), fetchRequests
    // only changes when user/role changes which triggers a new effect anyway
    const iv = setInterval(() => { fetchMsgs(); fetchRequests(); }, 8000);
    return () => clearInterval(iv);
  }, [fetchMsgs, fetchRequests]);

  // Scroll + mark seen when notes tab open
  useEffect(() => {
    if (open && tab === "notes") {
      setUnread(0);
      const now = new Date().toISOString();
      lastSeenRef.current = now;
      if (lsKey) localStorage.setItem(lsKey, now);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
    // Mark resolved requests as seen when staff opens requests tab
    if (open && tab === "requests" && !isAdmin && reqLsKey) {
      const resolvedIds = requests.filter(r => r.status !== "pending").map(r => r.id);
      localStorage.setItem(reqLsKey, JSON.stringify(resolvedIds));
      setResolvedUnread(0);
    }
  }, [open, tab, msgs, requests]);

  async function handleSend() {
    if (!text.trim() || !currentUser || sending) return;
    setSending(true);
    await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: ROOM_ID, userId: currentUser.id, userName: currentUser.name, content: text.trim() }),
    });
    setText(""); setSending(false); fetchMsgs();
  }

  async function handleSubmitRequest() {
    if (!reqContent.trim() || !currentUser || submitting) return;
    setSubmitting(true);
    await fetch("/api/shifts/requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id, userName: currentUser.name,
        type: reqType, content: reqContent.trim(),
        targetDate: reqDate || null,
      }),
    });
    setReqContent(""); setReqDate(""); setSubmitting(false);
    playSound("save"); fetchRequests();
  }

  async function handleAdminAction(id: string, status: "approved" | "rejected") {
    await fetch("/api/shifts/requests", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, adminNote: replyNote[id] ?? "" }),
    });
    playSound(status === "approved" ? "save" : "tap");
    setReplyNote(prev => { const n = { ...prev }; delete n[id]; return n; });
    fetchRequests();
  }

  function startEditReq(r: ShiftRequest) {
    setEditingReqId(r.id);
    setEditReqStatus(r.status as "approved" | "rejected");
    setEditReqNote(r.adminNote ?? "");
  }

  async function saveEditReq() {
    if (!editingReqId) return;
    await fetch("/api/shifts/requests", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingReqId, status: editReqStatus, adminNote: editReqNote }),
    });
    playSound("save");
    setEditingReqId(null);
    fetchRequests();
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) +
      " " + d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  }

  const totalBadge = unread + (isAdmin ? pendingCount : resolvedUnread);
  const badgeColor = (isAdmin ? pendingCount > 0 : resolvedUnread > 0) ? "#d97706" : "#ef4444";

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(v => !v); playSound("tap"); }}
        style={{
          position: "fixed",
          bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
          right: 16, width: 46, height: 46, borderRadius: "50%",
          background: "linear-gradient(135deg,#0c1a2e,#1e3a5f)",
          border: "2px solid #C9A55A", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(12,26,46,0.30)", zIndex: 180,
          transition: "transform 0.18s",
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        <MessageCircle size={18} style={{ color: "#C9A55A" }} />
        {totalBadge > 0 && (
          <div style={{
            position: "absolute", top: -4, right: -4,
            width: 18, height: 18, borderRadius: "50%",
            background: badgeColor, border: "2px solid #fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 8, fontWeight: 800, color: "#fff" }}>{totalBadge > 9 ? "9+" : totalBadge}</span>
          </div>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            style={{
              position: "fixed",
              bottom: "calc(126px + env(safe-area-inset-bottom, 0px))",
              right: 16,
              width: "min(340px, calc(100vw - 32px))",
              height: 460,
              borderRadius: 18,
              background: "rgba(255,255,255,0.98)",
              boxShadow: "0 16px 48px rgba(12,26,46,0.22), 0 2px 8px rgba(12,26,46,0.08)",
              border: "1px solid rgba(201,165,90,0.3)",
              display: "flex", flexDirection: "column",
              zIndex: 179, overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ padding: "12px 14px 0", background: "linear-gradient(135deg,#0c1a2e,#1e3a5f)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <MessageCircle size={14} style={{ color: "#C9A55A", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0 }}>Ghi chú & Yêu cầu</p>
                  <p style={{ fontSize: 9, color: "rgba(201,165,90,0.6)", margin: 0 }}>Lịch làm việc · POSTLAIN</p>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <X size={14} style={{ color: "#64748b" }} />
                </button>
              </div>
              {/* Tab bar */}
              <div style={{ display: "flex", gap: 4, paddingBottom: 10 }}>
                {([["notes", "Ghi chú", MessageCircle], ["requests", "Yêu cầu", ClipboardList]] as const).map(([key, label, Icon]) => (
                  <button key={key} onClick={() => setTab(key)}
                    style={{
                      flex: 1, height: 30, borderRadius: 8, border: "none",
                      background: tab === key ? "rgba(201,165,90,0.18)" : "rgba(255,255,255,0.06)",
                      cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      transition: "all 0.15s",
                    }}>
                    <Icon size={11} style={{ color: tab === key ? "#C9A55A" : "#64748b" }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: tab === key ? "#C9A55A" : "#64748b" }}>{label}</span>
                    {key === "requests" && isAdmin && pendingCount > 0 && (
                      <span style={{ fontSize: 7, fontWeight: 800, color: "#fff", background: "#d97706", padding: "1px 5px", borderRadius: 10 }}>{pendingCount}</span>
                    )}
                    {key === "requests" && !isAdmin && resolvedUnread > 0 && (
                      <span style={{ fontSize: 7, fontWeight: 800, color: "#fff", background: "#d97706", padding: "1px 5px", borderRadius: 10 }}>{resolvedUnread}</span>
                    )}
                    {key === "notes" && unread > 0 && (
                      <span style={{ fontSize: 7, fontWeight: 800, color: "#fff", background: "#ef4444", padding: "1px 5px", borderRadius: 10 }}>{unread}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tab: Ghi chú ── */}
            {tab === "notes" && (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {msgs.length === 0 && (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <p style={{ fontSize: 11, color: "#cbd5e1", textAlign: "center" }}>Chưa có tin nhắn.<br/>Ghi chú trao đổi nhanh ở đây.</p>
                    </div>
                  )}
                  {msgs.map(m => {
                    const isMine = m.userId === currentUser?.id;
                    return (
                      <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                        {!isMine && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#0c1a2e,#1e3a5f)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 7, fontWeight: 700, color: "#C9A55A" }}>{m.userName[0]?.toUpperCase()}</span>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 600, color: "#64748b" }}>{m.userName}</span>
                          </div>
                        )}
                        <div style={{
                          maxWidth: "85%", padding: "7px 11px",
                          borderRadius: isMine ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                          background: isMine ? "linear-gradient(135deg,#0c1a2e,#1e3a5f)" : "#f1f5f9",
                          color: isMine ? "#fff" : "#0c1a2e", fontSize: 11, lineHeight: 1.4, wordBreak: "break-word",
                        }}>{m.content}</div>
                        <span style={{ fontSize: 8, color: "#cbd5e1", marginTop: 2 }}>{formatTime(m.createdAt)}</span>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <textarea value={text} onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={isAdmin ? "Phản hồi nhân viên..." : "Trao đổi nhanh với admin..."}
                    rows={2} style={{ flex: 1, borderRadius: 10, border: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 11, fontFamily: "inherit", outline: "none", resize: "none", color: "#0c1a2e", background: "#f8fafc", lineHeight: 1.4 }} />
                  <button onClick={handleSend} disabled={!text.trim() || sending}
                    style={{ width: 36, height: 36, borderRadius: 10, border: "none", flexShrink: 0, background: text.trim() ? "linear-gradient(135deg,#0c1a2e,#1e3a5f)" : "#f1f5f9", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Send size={14} style={{ color: text.trim() ? "#C9A55A" : "#cbd5e1" }} />
                  </button>
                </div>
              </>
            )}

            {/* ── Tab: Yêu cầu ── */}
            {tab === "requests" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Staff: form gửi yêu cầu */}
                {!isAdmin && (
                  <div style={{ padding: "12px", borderRadius: 12, border: "1px solid #e0f2fe", background: "#f0f9ff", display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#0c1a2e", margin: 0 }}>Gửi yêu cầu mới</p>
                    <select value={reqType} onChange={e => setReqType(e.target.value)}
                      style={{ borderRadius: 8, border: "1px solid #bae6fd", padding: "6px 8px", fontSize: 11, fontFamily: "inherit", color: "#0c1a2e", background: "#fff", outline: "none" }}>
                      {Object.entries(REQ_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    {(reqType === "swap_shift" || reqType === "day_off") && (
                      <input type="date" value={reqDate} onChange={e => setReqDate(e.target.value)}
                        style={{ borderRadius: 8, border: "1px solid #bae6fd", padding: "6px 8px", fontSize: 11, fontFamily: "inherit", color: "#0c1a2e", background: "#fff", outline: "none" }} />
                    )}
                    <textarea value={reqContent} onChange={e => setReqContent(e.target.value)}
                      placeholder="Mô tả yêu cầu của bạn..." rows={2}
                      style={{ borderRadius: 8, border: "1px solid #bae6fd", padding: "7px 9px", fontSize: 11, fontFamily: "inherit", resize: "none", color: "#0c1a2e", background: "#fff", outline: "none", lineHeight: 1.4 }} />
                    <button onClick={handleSubmitRequest} disabled={!reqContent.trim() || submitting}
                      style={{ height: 32, borderRadius: 8, border: "none", background: reqContent.trim() ? "linear-gradient(135deg,#0c1a2e,#1e3a5f)" : "#e2e8f0", color: reqContent.trim() ? "#C9A55A" : "#94a3b8", fontSize: 11, fontWeight: 700, cursor: reqContent.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
                      {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
                    </button>
                  </div>
                )}

                {/* Request list */}
                {requests.length === 0 && (
                  <p style={{ fontSize: 11, color: "#cbd5e1", textAlign: "center", marginTop: 20 }}>
                    {isAdmin ? "Chưa có yêu cầu nào." : "Bạn chưa gửi yêu cầu nào."}
                  </p>
                )}
                {requests.map(r => {
                  const scfg = STATUS_CFG[r.status];
                  const isPending = r.status === "pending";
                  const isApproved = r.status === "approved";
                  const isRejected = r.status === "rejected";
                  // Staff: highlight cards that were just resolved and not yet seen
                  const seenIds: string[] = !isAdmin && reqLsKey
                    ? JSON.parse(localStorage.getItem(reqLsKey) ?? "[]") : [];
                  const isNewlyResolved = !isAdmin && !isPending && !seenIds.includes(r.id);
                  const cardBorder = isPending && isAdmin ? "#fde68a"
                    : isNewlyResolved && isApproved ? "#86efac"
                    : isNewlyResolved && isRejected ? "#fca5a5"
                    : "#e2e8f0";
                  const cardBg = isPending && isAdmin ? "#fffbeb"
                    : isNewlyResolved && isApproved ? "#f0fdf4"
                    : isNewlyResolved && isRejected ? "#fff1f2"
                    : "#fff";
                  const noteStyle = isApproved
                    ? { bg: "#f0fdf4", border: "#bbf7d0", label: "#16a34a", text: "#15803d" }
                    : { bg: "#fff1f2", border: "#fecaca", label: "#dc2626", text: "#b91c1c" };
                  return (
                    <div key={r.id} style={{ borderRadius: 12, border: `1px solid ${cardBorder}`, background: cardBg, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: scfg.bg, color: scfg.color }}>{scfg.label}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: "#64748b", background: "#f1f5f9", padding: "2px 7px", borderRadius: 20 }}>{REQ_TYPE_LABEL[r.type] ?? r.type}</span>
                        {isAdmin && <span style={{ fontSize: 9, color: "#94a3b8", marginLeft: "auto" }}>{r.userName}</span>}
                        {isNewlyResolved && <span style={{ fontSize: 8, fontWeight: 800, color: isApproved ? "#16a34a" : "#dc2626", marginLeft: "auto" }}>● Mới</span>}
                      </div>
                      <p style={{ fontSize: 11, color: "#0c1a2e", margin: 0, lineHeight: 1.4 }}>{r.content}</p>
                      {r.targetDate && <p style={{ fontSize: 9, color: "#64748b", margin: 0 }}>📅 {r.targetDate}</p>}
                      {!isPending && r.adminNote && r.adminNote.trim() !== "" && (
                        <div style={{ padding: "6px 9px", borderRadius: 8, background: noteStyle.bg, border: `1px solid ${noteStyle.border}` }}>
                          <p style={{ fontSize: 9, fontWeight: 700, color: noteStyle.label, margin: "0 0 2px" }}>Phản hồi từ Admin</p>
                          <p style={{ fontSize: 10, color: noteStyle.text, margin: 0 }}>{r.adminNote}</p>
                        </div>
                      )}
                      {!isPending && (!r.adminNote || r.adminNote.trim() === "") && !isAdmin && (
                        <p style={{ fontSize: 9, color: "#94a3b8", margin: 0, fontStyle: "italic" }}>Không có ghi chú phản hồi.</p>
                      )}
                      <p style={{ fontSize: 8, color: "#cbd5e1", margin: 0 }}>{formatTime(r.createdAt)}</p>
                      {/* Admin: xử lý pending */}
                      {isAdmin && isPending && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2 }}>
                          <input value={replyNote[r.id] ?? ""} onChange={e => setReplyNote(prev => ({ ...prev, [r.id]: e.target.value }))}
                            placeholder="Lý do / ghi chú phản hồi (tuỳ chọn)..."
                            style={{ borderRadius: 7, border: "1px solid #e2e8f0", padding: "5px 8px", fontSize: 10, fontFamily: "inherit", outline: "none", color: "#0c1a2e" }} />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => handleAdminAction(r.id, "approved")}
                              style={{ flex: 1, height: 28, borderRadius: 7, border: "none", background: "#16a34a", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              ✓ Duyệt
                            </button>
                            <button onClick={() => handleAdminAction(r.id, "rejected")}
                              style={{ flex: 1, height: 28, borderRadius: 7, border: "none", background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              ✕ Từ chối
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Admin: sửa yêu cầu đã xử lý */}
                      {isAdmin && !isPending && editingReqId === r.id && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2, padding: "8px 10px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <p style={{ fontSize: 9, fontWeight: 700, color: "#64748b", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Chỉnh sửa quyết định</p>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button onClick={() => setEditReqStatus("approved")}
                              style={{ flex: 1, height: 26, borderRadius: 6, border: `1.5px solid ${editReqStatus === "approved" ? "#16a34a" : "#e2e8f0"}`, background: editReqStatus === "approved" ? "#f0fdf4" : "#fff", color: editReqStatus === "approved" ? "#16a34a" : "#94a3b8", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              ✓ Duyệt
                            </button>
                            <button onClick={() => setEditReqStatus("rejected")}
                              style={{ flex: 1, height: 26, borderRadius: 6, border: `1.5px solid ${editReqStatus === "rejected" ? "#dc2626" : "#e2e8f0"}`, background: editReqStatus === "rejected" ? "#fff1f2" : "#fff", color: editReqStatus === "rejected" ? "#dc2626" : "#94a3b8", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              ✕ Từ chối
                            </button>
                          </div>
                          <input value={editReqNote} onChange={e => setEditReqNote(e.target.value)}
                            placeholder="Ghi chú phản hồi..."
                            style={{ borderRadius: 6, border: "1px solid #e2e8f0", padding: "5px 8px", fontSize: 10, fontFamily: "inherit", outline: "none", color: "#0c1a2e" }} />
                          <div style={{ display: "flex", gap: 5 }}>
                            <button onClick={saveEditReq}
                              style={{ flex: 1, height: 26, borderRadius: 6, border: "none", background: "linear-gradient(135deg,#0c1a2e,#1e3a5f)", color: "#C9A55A", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              Lưu
                            </button>
                            <button onClick={() => setEditingReqId(null)}
                              style={{ height: 26, padding: "0 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                              Huỷ
                            </button>
                          </div>
                        </div>
                      )}
                      {isAdmin && !isPending && editingReqId !== r.id && (
                        <button onClick={() => startEditReq(r)}
                          style={{ alignSelf: "flex-start", height: 22, padding: "0 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#94a3b8", fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 2 }}>
                          ✎ Sửa
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const currentUser      = useStore(sel.currentUser);
  const users            = useStore(sel.users);
  const fetchUsersFromDb = useStore(sel.fetchUsersFromDb);
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager";

  const [weekOffset, setWeekOffset]       = useState(0);
  const [templates, setTemplates]         = useState<ShiftTemplate[]>([]);
  const [slots, setSlots]                 = useState<ShiftSlot[]>([]);
  const [registrations, setRegistrations] = useState<ShiftRegistration[]>([]);
  const [loading, setLoading]             = useState(true);
  const [addingSlot, setAddingSlot]       = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editTemplate, setEditTemplate]   = useState<ShiftTemplate | null>(null);
  const [addTemplate, setAddTemplate]     = useState(false);
  const [viewMode, setViewMode]           = useState<"week"|"staff">("week");
  const [filterType, setFilterType]       = useState<"ALL"|"FT"|"PT">("ALL");
  const [bulkMode, setBulkMode]           = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set());
  const [regClosed, setRegClosed]         = useState(false); // admin can force-close registration

  // ── Responsive ─────────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 680);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const dateFrom  = toDateStr(weekDates[0]);
  const dateTo    = toDateStr(weekDates[6]);
  const weekNum   = getISOWeek(weekDates[0]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
        setSlots(data.slots ?? []);
        setRegistrations(data.registrations ?? []);
        setRegClosed(data.regClosed ?? false);
      }
    } finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchUsersFromDb(); }, []);

  // ── Active staff (all roles) from DB ──────────────────────────────────────
  const activeStaff: AppUser[] = useMemo(() =>
    users.filter(u => u.active),
    [users]
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleSaveTemplate(data: Omit<ShiftTemplate,"id"|"createdAt">) {
    const id  = editTemplate?.id ?? `tmpl_${Date.now()}`;
    const cat = editTemplate?.createdAt ?? new Date().toISOString();
    const t: ShiftTemplate = { ...data, id, createdAt: cat };
    const res = await fetch("/api/shifts", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ kind:"template", data:t }),
    });
    if (!res.ok) { alert("Lưu mẫu thất bại, thử lại."); return; }
    setEditTemplate(null);
    setAddTemplate(false);
    load();
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Xoá mẫu ca này?")) return;
    await fetch(`/api/shifts?kind=template&id=${id}`, { method:"DELETE" });
    load();
  }

  async function handleAddSlot(slotData: Omit<ShiftSlot,"id"|"createdAt"|"updatedAt">) {
    const now = new Date().toISOString();
    const res = await fetch("/api/shifts", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ kind:"slot", data:{ ...slotData, createdAt:now, updatedAt:now } }),
    });
    if (!res.ok) { alert("Thêm ca thất bại, thử lại."); return; }
    setAddingSlot(null);
    load();
  }

  async function handleDeleteSlot(slotId: string) {
    if (!confirm("Xoá ca này?")) return;
    await fetch(`/api/shifts?kind=slot&id=${slotId}`, { method:"DELETE" });
    load();
  }

  async function handleRegister(slotId: string) {
    if (!currentUser) return;
    const res = await fetch("/api/shifts/register", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"register", slotId, userId:currentUser.id, userName:currentUser.name }) });
    if (!res.ok) { alert("Đăng ký ca thất bại, thử lại."); return; }
    load();
  }

  async function handleCancel(regId: string) {
    const reg = registrations.find(r => r.id === regId);
    if (!reg) return;
    await fetch("/api/shifts/register", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"cancel", slotId:reg.slotId, userId:reg.userId, userName:reg.userName, registrationId:regId }) });
    load();
  }

  async function handleApprove(reg: ShiftRegistration) {
    await fetch("/api/shifts/register", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"approve", slotId:reg.slotId, userId:reg.userId, userName:reg.userName, registrationId:reg.id }) });
    load();
  }

  async function handleReject(reg: ShiftRegistration) {
    await fetch("/api/shifts/register", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"reject", slotId:reg.slotId, userId:reg.userId, userName:reg.userName, registrationId:reg.id }) });
    load();
  }

  async function handleAssign(slotId: string, user: AppUser) {
    const res = await fetch("/api/shifts/register", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"assign", slotId, userId:user.id, userName:user.name }) });
    if (!res.ok) { alert("Xếp ca thất bại, thử lại."); return; }
    load();
  }

  async function handleUnassign(slotId: string, userId: string) {
    const res = await fetch("/api/shifts/register", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"unassign", slotId, userId, userName:"" }) });
    if (!res.ok) { alert("Bỏ xếp ca thất bại, thử lại."); return; }
    load();
  }

  function handleToggleSelect(slotId: string) {
    setSelectedSlotIds(prev => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = [...selectedSlotIds];
    if (ids.length === 0) return;
    if (!confirm(`Xoá ${ids.length} ca đã chọn?`)) return;
    playSound("modalClose");
    await Promise.all(ids.map(id => fetch(`/api/shifts?kind=slot&id=${id}`, { method:"DELETE" })));
    setSelectedSlotIds(new Set());
    setBulkMode(false);
    load();
  }

  // ── Auto-generate next week's slots from templates ──────────────────────────
  const [generating, setGenerating] = useState(false);

  /** Returns Mon–Sun dates of next week (VN time) */
  function getNextWeekDates(): string[] {
    const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const dow = nowVN.getUTCDay();
    const daysToNextMon = ((8 - dow) % 7) || 7;
    const nextMon = new Date(nowVN);
    nextMon.setUTCDate(nowVN.getUTCDate() + daysToNextMon);
    nextMon.setUTCHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(nextMon);
      d.setUTCDate(nextMon.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }

  /** True when viewing next week */
  const isNextWeek = weekOffset === 1;

  /** Next week already has slots? */
  const nextWeekHasSlots = useMemo(() => {
    if (!isNextWeek) return false;
    return slots.length > 0;
  }, [isNextWeek, slots]);

  async function handleGenerateNextWeek() {
    if (templates.length === 0) { alert("Chưa có mẫu ca nào. Tạo mẫu ca trước."); return; }
    const dates = getNextWeekDates();
    const total = dates.length * templates.length;
    if (!confirm(`Tạo ${total} ca cho tuần sau (${templates.length} mẫu × 7 ngày)?\nNhân viên sẽ thấy nút đăng ký ngay.`)) return;
    setGenerating(true);
    try {
      const now = new Date().toISOString();
      const jobs = dates.flatMap(date =>
        templates.map(t => fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "slot",
            data: {
              id: `slot_${date}_${t.id}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
              templateId: t.id,
              date,
              name: t.name,
              startTime: t.startTime,
              endTime: t.endTime,
              color: t.color,
              maxStaff: t.maxStaff,
              note: null,
              staffType: t.staffType ?? "ALL",
              createdAt: now,
              updatedAt: now,
            },
          }),
        }))
      );
      await Promise.all(jobs);
      playSound("save");
      load();
    } finally {
      setGenerating(false);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredSlots = useMemo(() =>
    filterType === "ALL"
      ? slots
      : slots.filter(s => inferStaffType(s) === filterType),
    [slots, filterType]
  );

  const slotsByDate = useMemo(() => {
    const m: Record<string, ShiftSlot[]> = {};
    for (const s of filteredSlots) {
      if (!m[s.date]) m[s.date] = [];
      m[s.date].push(s);
    }
    // Sort each day: FT first, PT second, unclassified last; then by startTime
    const typeOrder: Record<StaffType, number> = { FT: 0, PT: 1, ALL: 2 };
    for (const key of Object.keys(m)) {
      m[key].sort((a, b) => {
        const ta = typeOrder[inferStaffType(a)];
        const tb = typeOrder[inferStaffType(b)];
        if (ta !== tb) return ta - tb;
        return a.startTime.localeCompare(b.startTime);
      });
    }
    return m;
  }, [filteredSlots]);

  const regsBySlot = useMemo(() => {
    const m: Record<string, ShiftRegistration[]> = {};
    for (const r of registrations) {
      if (!m[r.slotId]) m[r.slotId] = [];
      m[r.slotId].push(r);
    }
    return m;
  }, [registrations]);

  // Staff view: ALL active staff, show approved shifts
  const staffSchedule = useMemo(() => {
    return activeStaff.map(u => {
      const myRegs  = registrations.filter(r => r.userId === u.id && r.status === "approved");
      const mySlots = myRegs.map(r => slots.find(s => s.id === r.slotId)).filter(Boolean) as ShiftSlot[];
      return { uid: u.id, name: u.name, role: u.role, slots: mySlots };
    });
  }, [activeStaff, registrations, slots]);

  const pendingCount = registrations.filter(r => r.status === "pending").length;
  const today = todayVN();

  /**
   * Whether the current staff can register for a given slot:
   * - Admin/manager: always yes
   * - FT staff: only FT or ALL slots, within registration window
   * - PT staff: only PT or ALL slots, within registration window
   */
  function canUserRegister(slot: ShiftSlot): boolean {
    if (isAdmin) return true;
    if (regClosed || !canStaffRegister(slot.date)) return false;
    const slotType = inferStaffType(slot);
    if (slotType === "ALL") return true;
    // staff_pt can only register PT slots; staff_ft and plain staff → FT slots
    const userIsPT = currentUser?.role === "staff_pt";
    const userIsFT = !userIsPT; // staff_ft, staff, manager, admin
    if (slotType === "PT") return userIsPT;
    if (slotType === "FT") return userIsFT;
    return true;
  }

  const weekLabel = (() => {
    const m0 = weekDates[0]; const m6 = weekDates[6];
    if (m0.getUTCMonth() === m6.getUTCMonth())
      return `${m0.getUTCDate()}–${m6.getUTCDate()} ${MONTHS_VI[m0.getUTCMonth()]} ${m0.getUTCFullYear()}`;
    return `${m0.getUTCDate()} ${MONTHS_VI[m0.getUTCMonth()]} – ${m6.getUTCDate()} ${MONTHS_VI[m6.getUTCMonth()]} ${m6.getUTCFullYear()}`;
  })();

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:0, background:"#f8fafc" }}>
      {/* ── Header ── */}
      <div style={{ padding: isMobile ? "12px 14px 10px" : "16px 20px 12px", background:"#fff", borderBottom:"1px solid #e0f2fe", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
              <p style={{ fontSize:9, fontWeight:700, color:"#94a3b8", letterSpacing:"0.2em" }}>LỊCH LÀM · POSTLAIN</p>
              <span style={{ fontSize:9, fontWeight:800, color:"#fff", background:"#0c1a2e", padding:"1px 7px", borderRadius:5, letterSpacing:"0.08em" }}>
                W{String(weekNum).padStart(3,"0")}
              </span>
            </div>
            <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight:800, color:"#0c1a2e", margin:0 }}>Lịch Làm Việc</h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {isAdmin && pendingCount > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:20, background:"rgba(245,158,11,0.12)", border:"1.5px solid rgba(245,158,11,0.4)", cursor:"pointer" }}>
                <AlertCircle size={12} style={{ color:"#f59e0b" }} />
                <span style={{ fontSize:10, fontWeight:800, color:"#d97706" }}>{pendingCount} chờ duyệt</span>
              </div>
            )}
            {/* Generate next-week slots button — shown when Admin views next week and no slots yet */}
            {isAdmin && isNextWeek && !nextWeekHasSlots && templates.length > 0 && (
              <button
                onClick={handleGenerateNextWeek}
                disabled={generating}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:10, border:"1px solid #bbf7d0", background:generating?"#f0fdf4":"#f0fdf4", cursor:generating?"default":"pointer", fontFamily:"inherit", opacity:generating?0.7:1 }}>
                <CalendarDays size={12} style={{ color:"#10b981" }} />
                <span style={{ fontSize:10, fontWeight:700, color:"#10b981" }}>{generating ? "Đang tạo..." : "Tạo ca tuần này"}</span>
              </button>
            )}
            {isAdmin && (
              <button onClick={()=>{ setShowTemplates(v=>!v); setAddTemplate(false); setEditTemplate(null); }}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:10, border:`1px solid ${showTemplates?"#0ea5e9":"#bae6fd"}`, background:showTemplates?"#f0f9ff":"#fff", cursor:"pointer", fontFamily:"inherit" }}>
                <Settings2 size={12} style={{ color:"#0ea5e9" }} />
                <span style={{ fontSize:10, fontWeight:600, color:"#0ea5e9" }}>{isMobile ? "Mẫu" : "Mẫu Ca"}</span>
                {templates.length > 0 && (
                  <span style={{ fontSize:8, fontWeight:800, color:"#fff", background:"#0ea5e9", padding:"1px 5px", borderRadius:10 }}>{templates.length}</span>
                )}
              </button>
            )}
            {isAdmin && (
              <button onClick={() => { setBulkMode(v => !v); setSelectedSlotIds(new Set()); playSound("tap"); }}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:10, border:`1px solid ${bulkMode?"#ef4444":"#fca5a5"}`, background:bulkMode?"#fff5f5":"#fff", cursor:"pointer", fontFamily:"inherit" }}>
                <CheckSquare size={12} style={{ color: bulkMode ? "#ef4444" : "#f87171" }} />
                <span style={{ fontSize:10, fontWeight:600, color: bulkMode ? "#ef4444" : "#f87171" }}>{bulkMode ? "Huỷ chọn" : "Chọn"}</span>
                {bulkMode && selectedSlotIds.size > 0 && (
                  <span style={{ fontSize:8, fontWeight:800, color:"#fff", background:"#ef4444", padding:"1px 5px", borderRadius:10 }}>{selectedSlotIds.size}</span>
                )}
              </button>
            )}
            {isAdmin && (
              <button onClick={async () => {
                const next = !regClosed;
                setRegClosed(next);
                playSound("tap");
                await fetch("/api/shifts", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ regClosed: next }),
                });
              }}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:10,
                  border: `1px solid ${regClosed ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)"}`,
                  background: regClosed ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                  cursor:"pointer", fontFamily:"inherit" }}>
                <span style={{ fontSize:10, fontWeight:700, color: regClosed ? "#ef4444" : "#d97706" }}>
                  {regClosed ? "Đã đóng ĐK" : "Đóng ĐK"}
                </span>
              </button>
            )}
            {isAdmin && (
              <a
                href={`/api/shifts/export?dateFrom=${dateFrom}&dateTo=${dateTo}`}
                download
                onClick={() => playSound("save")}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:10, border:"1px solid #bbf7d0", background:"#f0fdf4", cursor:"pointer", textDecoration:"none" }}>
                <Download size={12} style={{ color:"#10b981" }} />
                <span style={{ fontSize:10, fontWeight:600, color:"#10b981" }}>Excel</span>
              </a>
            )}
          </div>
        </div>

        {/* Reg closed banner — staff only */}
        {!isAdmin && regClosed && (
          <div style={{
            marginTop: 10,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.25)",
            display: "flex", alignItems: "flex-start", gap: 9,
          }}>
            <AlertCircle size={15} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", margin: 0 }}>Đã đóng đăng ký lịch làm</p>
              <p style={{ fontSize: 10, color: "#64748b", margin: "2px 0 0" }}>
                Mọi yêu cầu vui lòng ghi chú trong <strong>Ghi chú &amp; Yêu cầu</strong>. Kiểm tra lịch của bạn trong tab <strong>Nhân viên</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Template panel — desktop inline accordion */}
        {!isMobile && (
          <AnimatePresence>
            {showTemplates && isAdmin && (
              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} style={{ overflow:"hidden" }}>
                <div style={{ marginTop:12, padding:14, background:"#f8fafc", borderRadius:12, border:"1px solid #e0f2fe" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <p style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:"0.12em" }}>MẪU CA LÀM VIỆC</p>
                    <button onClick={()=>{ setAddTemplate(v=>!v); setEditTemplate(null); }}
                      style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", borderRadius:8, border:`1px solid ${addTemplate?"#0ea5e9":"#bae6fd"}`, background:addTemplate?"#f0f9ff":"#fff", cursor:"pointer", fontSize:10, fontWeight:600, color:"#0ea5e9", fontFamily:"inherit" }}>
                      <Plus size={11} /> Thêm mẫu
                    </button>
                  </div>

                  {addTemplate && !editTemplate && (
                    <div style={{ marginBottom:12, padding:14, background:"#fff", borderRadius:10, border:"1px solid #bae6fd" }}>
                      <p style={{ fontSize:10, fontWeight:700, color:"#0ea5e9", marginBottom:10 }}>Tạo mẫu mới</p>
                      <TemplateForm onSave={handleSaveTemplate} onClose={()=>setAddTemplate(false)} />
                    </div>
                  )}

                  {editTemplate && (
                    <div style={{ marginBottom:12, padding:14, background:"#fff", borderRadius:10, border:`1.5px solid ${editTemplate.color}60` }}>
                      <p style={{ fontSize:10, fontWeight:700, color:editTemplate.color, marginBottom:10 }}>Chỉnh sửa: {editTemplate.name}</p>
                      <TemplateForm initial={editTemplate} onSave={handleSaveTemplate} onClose={()=>setEditTemplate(null)} />
                    </div>
                  )}

                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {templates.map(t => (
                      <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, background:"#fff", border:`1.5px solid ${t.color}40`, minWidth:160 }}>
                        <div style={{ width:4, height:32, borderRadius:2, background:t.color, flexShrink:0 }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <p style={{ fontSize:11, fontWeight:700, color:"#0c1a2e" }}>{t.name}</p>
                            <StaffTypeBadge type={t.staffType} size="xs" />
                          </div>
                          <p style={{ fontSize:9, color:"#64748b" }}>{fmt(t.startTime)}–{fmt(t.endTime)} · {t.maxStaff} người</p>
                        </div>
                        <button onClick={()=>{ setEditTemplate(t); setAddTemplate(false); }}
                          style={{ width:24,height:24,borderRadius:6,border:`1px solid ${editTemplate?.id===t.id?"#0ea5e9":"#e2e8f0"}`,background:editTemplate?.id===t.id?"#f0f9ff":"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                          <Edit3 size={10} style={{ color:editTemplate?.id===t.id?"#0ea5e9":"#64748b" }} />
                        </button>
                        <button onClick={()=>handleDeleteTemplate(t.id)}
                          style={{ width:24,height:24,borderRadius:6,border:"1px solid #fee2e2",background:"#fff5f5",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                          <Trash2 size={10} style={{ color:"#ef4444" }} />
                        </button>
                      </div>
                    ))}
                    {templates.length === 0 && !addTemplate && (
                      <p style={{ fontSize:10, color:"#94a3b8" }}>Chưa có mẫu ca nào. Bấm "Thêm mẫu" để tạo.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Week nav + view toggle */}
        <div style={{ display:"flex", alignItems:"center", gap:isMobile?6:8, marginTop:12 }}>
          <button onClick={()=>setWeekOffset(v=>v-1)}
            style={{ width:30,height:30,borderRadius:9,border:"1px solid #e0f2fe",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <ChevronLeft size={14} style={{ color:"#64748b" }} />
          </button>
          <button onClick={()=>setWeekOffset(0)}
            style={{ padding:"5px 10px",borderRadius:9,border:"1px solid #e0f2fe",background:weekOffset===0?"#0c1a2e":"#fff",cursor:"pointer",fontSize:10,fontWeight:700,color:weekOffset===0?"#fff":"#64748b",fontFamily:"inherit",flexShrink:0 }}>
            Tuần này
          </button>
          <span style={{ fontSize:isMobile?10:11, fontWeight:700, color:"#0c1a2e", flex:1, textAlign:"center" }}>{weekLabel}</span>
          <button onClick={()=>setWeekOffset(v=>v+1)}
            style={{ width:30,height:30,borderRadius:9,border:"1px solid #e0f2fe",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <ChevronRight size={14} style={{ color:"#64748b" }} />
          </button>
          <div style={{ display:"flex", gap:2, padding:3, background:"#f0f9ff", borderRadius:10, border:"1px solid #e0f2fe", flexShrink:0 }}>
            {([["week","Tuần"],["staff","NV"]] as const).map(([v,l]) => (
              <button key={v} onClick={()=>setViewMode(v)}
                style={{ padding:"4px 8px", borderRadius:7, border:"none", background:viewMode===v?"#0ea5e9":"transparent", cursor:"pointer", fontSize:9, fontWeight:700, color:viewMode===v?"#fff":"#64748b", fontFamily:"inherit" }}>
                {isMobile ? l : (v === "week" ? "Tuần" : "Nhân viên")}
              </button>
            ))}
          </div>
        </div>

        {/* Registration window banner (staff only) */}
        {!isAdmin && (() => {
          const dow = new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCDay();
          const open = dow >= 4 && dow <= 6;
          return (
            <div style={{
              marginTop:8, padding:"5px 12px", borderRadius:20,
              background: open ? "rgba(16,185,129,0.08)" : "rgba(148,163,184,0.08)",
              border: `1px solid ${open ? "rgba(16,185,129,0.30)" : "rgba(148,163,184,0.25)"}`,
              display:"inline-flex", alignItems:"center", gap:6,
            }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background: open ? "#10b981" : "#94a3b8", flexShrink:0 }} />
              <span style={{ fontSize:9, fontWeight:700, color: open ? "#059669" : "#94a3b8" }}>
                {open ? "Đang mở đăng ký ca tuần sau (T5–T7)" : "Đăng ký đóng từ CN–T4, mở lại vào T5"}
              </span>
            </div>
          );
        })()}

        {/* FT / PT filter pills */}
        <div style={{ display:"flex", gap:5, marginTop:8 }}>
          {(["ALL","FT","PT"] as const).map(t => {
            const cfg = STAFF_TYPE_CFG[t];
            const active = filterType === t;
            return (
              <button key={t} onClick={() => { playSound("tap"); setFilterType(t); }}
                style={{
                  height: 26, padding: "0 11px", borderRadius: 20,
                  border: `1.5px solid ${active ? cfg.border : "rgba(186,230,253,0.60)"}`,
                  background: active ? cfg.bg : "rgba(255,255,255,0.72)",
                  cursor: "pointer", fontFamily: "inherit",
                  fontSize: 9, fontWeight: 800,
                  color: active ? cfg.color : "#94a3b8",
                  letterSpacing: "0.07em",
                  transition: "all 0.15s",
                  backdropFilter: "blur(6px)",
                  boxShadow: active ? `0 0 0 2px ${cfg.border}` : "none",
                }}>
                {t === "ALL" ? "Tất cả" : t === "FT" ? "Full Time" : "Part Time"}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex:1, overflowY:"auto", padding: isMobile ? "0 0 80px" : "16px 16px 80px" }}>
        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:"#94a3b8", fontSize:12 }}>Đang tải...</div>
        ) : viewMode === "week" ? (
          isMobile ? (
            /* ── Mobile: vertical day list ── */
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {weekDates.map(date => {
                const ds = toDateStr(date);
                const isToday = ds === today;
                const isPast = ds < today;
                const daySlots = slotsByDate[ds] ?? [];
                const hasSlots = daySlots.length > 0;

                return (
                  <div key={ds} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    {/* Day header */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px 8px", background:isToday?"#f0f9ff":"transparent" }}>
                      <div style={{ width:36, height:36, borderRadius:"50%", background:isToday?"#0ea5e9":"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <div style={{ textAlign:"center" }}>
                          <p style={{ fontSize:8, fontWeight:700, color:isToday?"#fff":"#94a3b8", lineHeight:1 }}>{DAYS_VI[date.getUTCDay()]}</p>
                          <p style={{ fontSize:13, fontWeight:800, color:isToday?"#fff":isPast?"#cbd5e1":"#0c1a2e", lineHeight:1.2 }}>{date.getUTCDate()}</p>
                        </div>
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:11, fontWeight:600, color:isToday?"#0ea5e9":"#0c1a2e" }}>{DAYS_FULL[date.getUTCDay()]}</p>
                        <p style={{ fontSize:9, color:"#94a3b8" }}>{hasSlots ? `${daySlots.length} ca` : "Không có ca"}</p>
                      </div>
                      {isAdmin && (
                        <button onClick={() => setAddingSlot(ds)}
                          style={{ width:30, height:30, borderRadius:9, border:"1px solid #e0f2fe", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <Plus size={13} style={{ color:"#0ea5e9" }} />
                        </button>
                      )}
                    </div>

                    {/* Slots */}
                    {hasSlots && (
                      <div style={{ padding:"0 16px 12px", display:"flex", flexDirection:"column", gap:8 }}>
                        {(["FT","PT","ALL"] as StaffType[]).map(group => {
                          let groupSlots = daySlots.filter(s => inferStaffType(s) === group);
                          if (!isAdmin && regClosed) groupSlots = groupSlots.filter(s => (regsBySlot[s.id] ?? []).some(r => r.status === "approved"));
                          if (groupSlots.length === 0) return null;
                          const cfg = STAFF_TYPE_CFG[group];
                          const groupLabel = group === "FT" ? "FULL TIME" : group === "PT" ? "PART TIME" : null;
                          return (
                            <div key={group} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                              {groupLabel && (
                                <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4 }}>
                                  <div style={{ height:1.5, flex:1, background:cfg.border }} />
                                  <span style={{ fontSize:9, fontWeight:800, color:cfg.color, letterSpacing:"0.08em", padding:"2px 10px", background:cfg.bg, borderRadius:20, border:`1px solid ${cfg.border}` }}>
                                    {groupLabel}
                                  </span>
                                  <div style={{ height:1.5, flex:1, background:cfg.border }} />
                                </div>
                              )}
                              {groupSlots.map(slot => (
                                <SlotCard key={slot.id} slot={slot} regs={regsBySlot[slot.id] ?? []} isAdmin={isAdmin}
                                  currentUserId={currentUser?.id ?? ""} allStaff={activeStaff}
                                  canRegister={canUserRegister(slot)}
                                  onRegister={handleRegister} onCancel={handleCancel}
                                  onApprove={handleApprove} onReject={handleReject}
                                  onAssign={handleAssign} onUnassign={handleUnassign} onDelete={handleDeleteSlot}
                                  bulkMode={bulkMode} isSelected={selectedSlotIds.has(slot.id)} onToggleSelect={handleToggleSelect} />
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Desktop: 7-column grid ── */
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7, minmax(0, 1fr))", gap:8 }}>
              {weekDates.map((date) => {
                const ds = toDateStr(date);
                const isToday = ds === today;
                const daySlots = slotsByDate[ds] ?? [];
                const isPast = ds < today;
                return (
                  <div key={ds} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {/* Day header */}
                    <div style={{ textAlign:"center" }}>
                      <p style={{ fontSize:9, fontWeight:700, color:isToday?"#0ea5e9":"#94a3b8", letterSpacing:"0.1em" }}>{DAYS_VI[date.getUTCDay()]}</p>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:isToday?"#0ea5e9":"transparent", display:"flex", alignItems:"center", justifyContent:"center", margin:"2px auto" }}>
                        <span style={{ fontSize:13, fontWeight:800, color:isToday?"#fff":isPast?"#cbd5e1":"#0c1a2e" }}>{date.getUTCDate()}</span>
                      </div>
                    </div>
                    {(["FT","PT","ALL"] as StaffType[]).map(group => {
                      let groupSlots = daySlots.filter(s => inferStaffType(s) === group);
                      if (!isAdmin && regClosed) groupSlots = groupSlots.filter(s => (regsBySlot[s.id] ?? []).some(r => r.status === "approved"));
                      if (groupSlots.length === 0) return null;
                      const cfg = STAFF_TYPE_CFG[group];
                      const groupLabel = group === "FT" ? "FULL TIME" : group === "PT" ? "PART TIME" : null;
                      return (
                        <div key={group} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          {groupLabel && (
                            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop: 2 }}>
                              <span style={{
                                fontSize:7, fontWeight:800, color:cfg.color,
                                letterSpacing:"0.06em", padding:"2px 7px",
                                background:cfg.bg, borderRadius:20,
                                border:`1px solid ${cfg.border}`, whiteSpace:"nowrap", flexShrink:0,
                              }}>
                                {groupLabel}
                              </span>
                              <div style={{ height:1, flex:1, background:cfg.border }} />
                            </div>
                          )}
                          {groupSlots.map(slot => (
                            <SlotCard key={slot.id} slot={slot}
                              regs={regsBySlot[slot.id] ?? []}
                              isAdmin={isAdmin}
                              currentUserId={currentUser?.id ?? ""}
                              allStaff={activeStaff}
                              canRegister={canUserRegister(slot)}
                              onRegister={handleRegister}
                              onCancel={handleCancel}
                              onApprove={handleApprove}
                              onReject={handleReject}
                              onAssign={handleAssign}
                              onUnassign={handleUnassign}
                              onDelete={handleDeleteSlot}
                              bulkMode={bulkMode} isSelected={selectedSlotIds.has(slot.id)} onToggleSelect={handleToggleSelect} />
                          ))}
                        </div>
                      );
                    })}
                    {isAdmin && (
                      <button onClick={()=>setAddingSlot(ds)}
                        style={{ height:28, borderRadius:9, border:"1.5px dashed #bae6fd", background:"rgba(14,165,233,0.03)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4, color:"#94a3b8", fontSize:9, fontWeight:600, fontFamily:"inherit", transition:"all 0.12s" }}
                        onMouseEnter={e=>(e.currentTarget.style.borderColor="#0ea5e9", e.currentTarget.style.color="#0ea5e9")}
                        onMouseLeave={e=>(e.currentTarget.style.borderColor="#bae6fd", e.currentTarget.style.color="#94a3b8")}>
                        <Plus size={10} /> Ca
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── Staff view ── */
          isMobile ? (
            /* Mobile: vertical person cards */
            <div style={{ display:"flex", flexDirection:"column", gap:8, padding:"12px 14px" }}>
              {staffSchedule.length === 0 && (
                <p style={{ fontSize:11, color:"#94a3b8", textAlign:"center", padding:"40px 0" }}>Không có nhân viên nào đang hoạt động.</p>
              )}
              {staffSchedule.map(({ uid, name, role, slots: mySlots }) => (
                <div key={uid} style={{ background:"#fff", borderRadius:12, border:"1px solid #e0f2fe", padding:"10px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: mySlots.length > 0 ? 8 : 0 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#0c1a2e,#1e3a5f)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:"#C9A55A" }}>{name[0]?.toUpperCase()}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:"#0c1a2e" }}>{name}</p>
                      <p style={{ fontSize:9, color:"#94a3b8" }}>{roleLabel(role)} · {mySlots.length} ca tuần này</p>
                    </div>
                  </div>
                  {mySlots.length > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {mySlots.map(s => (
                        <div key={s.id} style={{ padding:"3px 8px", borderRadius:20, background:`${s.color}15`, border:`1px solid ${s.color}40` }}>
                          <span style={{ fontSize:9, fontWeight:600, color:s.color }}>{DAYS_VI[new Date(s.date+"T00:00:00+07:00").getDay()]} {new Date(s.date+"T00:00:00+07:00").getDate()} · {s.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {mySlots.length === 0 && <p style={{ fontSize:10, color:"#cbd5e1" }}>Không có ca tuần này</p>}
                </div>
              ))}
            </div>
          ) : (
            /* Desktop: staff grid */
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {/* Legend */}
              <div style={{ display:"grid", gridTemplateColumns:"150px repeat(7,minmax(60px,1fr))", gap:4, fontSize:9, fontWeight:700, color:"#94a3b8", letterSpacing:"0.08em", padding:"0 0 6px", borderBottom:"1px solid #e0f2fe" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <Users size={11} style={{ color:"#94a3b8" }} />
                  NHÂN VIÊN ({activeStaff.length})
                </div>
                {weekDates.map(d => (
                  <div key={d.getTime()} style={{ textAlign:"center", color:toDateStr(d)===today?"#0ea5e9":"#94a3b8" }}>
                    {DAYS_VI[d.getUTCDay()]}<br/>{d.getUTCDate()}
                  </div>
                ))}
              </div>
              {staffSchedule.length === 0 && (
                <p style={{ fontSize:11, color:"#94a3b8", textAlign:"center", padding:"40px 0" }}>Không có nhân viên nào đang hoạt động.</p>
              )}
              {staffSchedule.map(({ uid, name, role, slots: mySlots }) => {
                const shiftCount = mySlots.length;
                return (
                  <div key={uid} style={{ display:"grid", gridTemplateColumns:"150px repeat(7,minmax(60px,1fr))", gap:4, alignItems:"start", padding:"6px 0", borderBottom:"1px solid #f1f5f9" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, paddingRight:8 }}>
                      <div style={{ position:"relative", flexShrink:0 }}>
                        <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#0c1a2e,#1e3a5f)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                          <span style={{ fontSize:10,fontWeight:700,color:"#C9A55A" }}>{name.slice(0,1).toUpperCase()}</span>
                        </div>
                        {shiftCount > 0 && (
                          <div style={{ position:"absolute",bottom:-2,right:-2,width:14,height:14,borderRadius:"50%",background:"#10b981",border:"1.5px solid #fff",display:"flex",alignItems:"center",justifyContent:"center" }}>
                            <span style={{ fontSize:7,fontWeight:800,color:"#fff" }}>{shiftCount}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:10,fontWeight:600,color:"#0c1a2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</p>
                        <p style={{ fontSize:7.5,color:"#94a3b8",letterSpacing:"0.08em" }}>{roleLabel(role).toUpperCase()}</p>
                      </div>
                    </div>
                    {weekDates.map(d => {
                      const ds = toDateStr(d);
                      const dayShifts = mySlots.filter(s => s.date === ds);
                      return (
                        <div key={ds} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          {dayShifts.map(s => (
                            <div key={s.id} style={{ padding:"3px 6px", borderRadius:7, background:`${s.color}18`, border:`1px solid ${s.color}40` }}>
                              <p style={{ fontSize:9, fontWeight:700, color:s.color, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.name}</p>
                              <p style={{ fontSize:7.5, color:"#64748b" }}>{fmt(s.startTime)}–{fmt(s.endTime)}</p>
                            </div>
                          ))}
                          {dayShifts.length === 0 && (
                            <div style={{ height:34, borderRadius:7, background:"#f8fafc", border:"1px dashed #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <span style={{ fontSize:8, color:"#e2e8f0" }}>—</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Leave Type Legend */}
      <div style={{ padding:"12px 20px 16px", background:"#fff", borderTop:"1px solid #e0f2fe", flexShrink:0 }}>
        <p style={{ fontSize:8.5, fontWeight:700, color:"#94a3b8", letterSpacing:"0.12em", marginBottom:8 }}>LOẠI NGÀY VẮNG / PHÉP</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"5px 10px" }}>
          {[
            { code:"AL",   label:"Nghỉ phép năm",         color:"#0ea5e9" },
            { code:"SL",   label:"Nghỉ ốm đau",            color:"#f59e0b" },
            { code:"MAL",  label:"Nghỉ kết hôn",           color:"#ec4899" },
            { code:"PCU",  label:"Paternity Leave",         color:"#8b5cf6" },
            { code:"UL",   label:"Nghỉ không lương",       color:"#ef4444" },
            { code:"OIL",  label:"Nghỉ bù",                color:"#06b6d4" },
            { code:"BT",   label:"Đi công tác",            color:"#C9A55A" },
            { code:"MML",  label:"Thai sản (nam)",          color:"#10b981" },
            { code:"CSL",  label:"Nghỉ con bệnh",          color:"#f97316" },
            { code:"CML",  label:"Nghỉ cưới con",          color:"#ec4899" },
            { code:"CL",   label:"Tang chế",               color:"#475569" },
            { code:"PX",   label:"Nghỉ khám thai",         color:"#8b5cf6" },
            { code:"NDF",  label:"Thiên tai, bão lũ",      color:"#64748b" },
            { code:"PHC",  label:"Dưỡng sức sau sinh",     color:"#0ea5e9" },
            { code:"Xmas", label:"Lễ Giáng Sinh",          color:"#ef4444" },
            { code:"MS",   label:"Làm ngoài văn phòng",    color:"#10b981" },
          ].map(({ code, label, color }) => (
            <div key={code} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:16, height:16, borderRadius:4, background:`${color}18`, border:`1px solid ${color}50`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontSize:7, fontWeight:800, color, letterSpacing:"0.02em" }}>{code.length <= 3 ? code : code.slice(0,3)}</span>
              </div>
              <span style={{ fontSize:9, color:"#64748b", whiteSpace:"nowrap" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {bulkMode && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{
              position: "fixed",
              bottom: isMobile ? "calc(64px + env(safe-area-inset-bottom, 0px))" : 16,
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(420px, calc(100vw - 32px))",
              background: "rgba(15,23,42,0.96)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: 16,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,0.40)",
              border: "1px solid rgba(255,255,255,0.10)",
              zIndex: 150,
            }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9" }}>
                {selectedSlotIds.size > 0 ? `Đã chọn ${selectedSlotIds.size} ca` : "Bấm vào ca để chọn"}
              </p>
              <p style={{ fontSize: 10, color: "#64748b" }}>
                {selectedSlotIds.size > 0 ? "Chọn thêm hoặc thực hiện thao tác" : "Chọn nhiều ca cùng lúc"}
              </p>
            </div>
            {selectedSlotIds.size > 0 && (
              <button
                onClick={() => setSelectedSlotIds(new Set())}
                style={{ height: 34, padding: "0 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#94a3b8", fontFamily: "inherit" }}>
                Bỏ chọn
              </button>
            )}
            <button
              onClick={handleBulkDelete}
              disabled={selectedSlotIds.size === 0}
              style={{
                height: 34, padding: "0 16px", borderRadius: 9, border: "none",
                background: selectedSlotIds.size > 0 ? "#ef4444" : "rgba(239,68,68,0.2)",
                cursor: selectedSlotIds.size > 0 ? "pointer" : "default",
                fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6,
                opacity: selectedSlotIds.size > 0 ? 1 : 0.4,
              }}>
              <Trash2 size={12} />
              Xoá {selectedSlotIds.size > 0 ? `(${selectedSlotIds.size})` : ""}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Slot Modal */}
      <AnimatePresence>
        {addingSlot && (
          <AddSlotModal
            templates={templates}
            date={addingSlot}
            onSave={handleAddSlot}
            onClose={()=>setAddingSlot(null)} />
        )}
      </AnimatePresence>

      {/* Mobile template bottom sheet */}
      <AnimatePresence>
        {isMobile && showTemplates && isAdmin && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type:"spring", damping:30, stiffness:300 }}
            style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderRadius:"16px 16px 0 0",
                     boxShadow:"0 -4px 32px rgba(0,0,0,0.15)", zIndex:200, maxHeight:"80vh", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <p style={{ fontSize:13, fontWeight:700, color:"#0c1a2e" }}>Mẫu Ca Làm Việc</p>
              <button onClick={() => setShowTemplates(false)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={16} style={{ color:"#94a3b8" }} />
              </button>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"12px 16px 32px" }}>
              {/* Add new template button */}
              <button onClick={()=>{ setAddTemplate(v=>!v); setEditTemplate(null); }}
                style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${addTemplate?"#0ea5e9":"#bae6fd"}`, background:addTemplate?"#f0f9ff":"#fff", cursor:"pointer", fontSize:11, fontWeight:600, color:"#0ea5e9", fontFamily:"inherit", marginBottom:12 }}>
                <Plus size={12} /> Thêm mẫu mới
              </button>

              {addTemplate && !editTemplate && (
                <div style={{ marginBottom:16, padding:14, background:"#f8fafc", borderRadius:12, border:"1px solid #bae6fd" }}>
                  <p style={{ fontSize:10, fontWeight:700, color:"#0ea5e9", marginBottom:10 }}>Tạo mẫu mới</p>
                  <TemplateForm onSave={handleSaveTemplate} onClose={()=>setAddTemplate(false)} />
                </div>
              )}

              {editTemplate && (
                <div style={{ marginBottom:16, padding:14, background:"#f8fafc", borderRadius:12, border:`1.5px solid ${editTemplate.color}60` }}>
                  <p style={{ fontSize:10, fontWeight:700, color:editTemplate.color, marginBottom:10 }}>Chỉnh sửa: {editTemplate.name}</p>
                  <TemplateForm initial={editTemplate} onSave={handleSaveTemplate} onClose={()=>setEditTemplate(null)} />
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {templates.map(t => (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, background:"#fff", border:`1.5px solid ${t.color}40` }}>
                    <div style={{ width:4, height:36, borderRadius:2, background:t.color, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, fontWeight:700, color:"#0c1a2e" }}>{t.name}</p>
                      <p style={{ fontSize:10, color:"#64748b" }}>{fmt(t.startTime)}–{fmt(t.endTime)} · {t.maxStaff} người</p>
                    </div>
                    <button onClick={()=>{ setEditTemplate(t); setAddTemplate(false); }}
                      style={{ width:28,height:28,borderRadius:8,border:`1px solid ${editTemplate?.id===t.id?"#0ea5e9":"#e2e8f0"}`,background:editTemplate?.id===t.id?"#f0f9ff":"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Edit3 size={11} style={{ color:editTemplate?.id===t.id?"#0ea5e9":"#64748b" }} />
                    </button>
                    <button onClick={()=>handleDeleteTemplate(t.id)}
                      style={{ width:28,height:28,borderRadius:8,border:"1px solid #fee2e2",background:"#fff5f5",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Trash2 size={11} style={{ color:"#ef4444" }} />
                    </button>
                  </div>
                ))}
                {templates.length === 0 && !addTemplate && (
                  <p style={{ fontSize:11, color:"#94a3b8", textAlign:"center", padding:"20px 0" }}>Chưa có mẫu ca nào. Bấm "Thêm mẫu mới" để tạo.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shift note / request widget */}
      {currentUser && <ShiftNoteWidget currentUser={currentUser} isAdmin={isAdmin} />}
    </div>
  );
}
