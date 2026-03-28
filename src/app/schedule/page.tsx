"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Clock,
  Users, Trash2, Edit3, CalendarDays, Settings2,
  ChevronDown, AlertCircle, CheckCircle2, XCircle,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
type ShiftTemplate = {
  id: string; name: string; startTime: string; endTime: string;
  color: string; maxStaff: number; createdAt: string;
};
type ShiftSlot = {
  id: string; templateId: string | null; date: string;
  name: string; startTime: string; endTime: string;
  color: string; maxStaff: number; note: string | null; createdAt: string;
};
type ShiftRegistration = {
  id: string; slotId: string; userId: string; userName: string;
  status: string; note: string | null; createdAt: string; updatedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DAYS_FULL = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const MONTHS_VI = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}
function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
function fmt(t: string) { return t.slice(0, 5); }
function statusColor(s: string) {
  return s === "approved" ? "#10b981" : s === "rejected" ? "#ef4444" : "#f59e0b";
}
function statusLabel(s: string) {
  return s === "approved" ? "Đã duyệt" : s === "rejected" ? "Từ chối" : "Chờ duyệt";
}
function StatusIcon({ status }: { status: string }) {
  if (status === "approved") return <CheckCircle2 size={11} style={{ color: "#10b981" }} />;
  if (status === "rejected") return <XCircle size={11} style={{ color: "#ef4444" }} />;
  return <AlertCircle size={11} style={{ color: "#f59e0b" }} />;
}

const PRESET_COLORS = ["#0ea5e9","#10b981","#f59e0b","#8b5cf6","#ef4444","#ec4899","#06b6d4","#84cc16"];

// ─── Template Form ────────────────────────────────────────────────────────────
function TemplateForm({ initial, onSave, onClose }: {
  initial?: ShiftTemplate;
  onSave: (t: Omit<ShiftTemplate, "id"|"createdAt">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [start, setStart] = useState(initial?.startTime ?? "08:00");
  const [end, setEnd] = useState(initial?.endTime ?? "14:00");
  const [color, setColor] = useState(initial?.color ?? "#0ea5e9");
  const [max, setMax] = useState(initial?.maxStaff ?? 3);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        <label style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:"0.1em" }}>TÊN CA</label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ca Sáng"
          style={{ height:36, borderRadius:8, border:"1px solid #e2e8f0", padding:"0 10px", fontSize:12, fontFamily:"inherit", outline:"none", color:"#0c1a2e" }} />
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:"0.1em" }}>BẮT ĐẦU</label>
          <input type="time" value={start} onChange={e=>setStart(e.target.value)}
            style={{ height:36, borderRadius:8, border:"1px solid #e2e8f0", padding:"0 10px", fontSize:12, fontFamily:"inherit", outline:"none", color:"#0c1a2e" }} />
        </div>
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:"0.1em" }}>KẾT THÚC</label>
          <input type="time" value={end} onChange={e=>setEnd(e.target.value)}
            style={{ height:36, borderRadius:8, border:"1px solid #e2e8f0", padding:"0 10px", fontSize:12, fontFamily:"inherit", outline:"none", color:"#0c1a2e" }} />
        </div>
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
          style={{ flex:1, height:36, borderRadius:9, border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer", fontSize:11, fontWeight:600, color:"#64748b", fontFamily:"inherit" }}>
          Huỷ
        </button>
        <button onClick={()=>{ if(name.trim()) onSave({name:name.trim(),startTime:start,endTime:end,color,maxStaff:max}); }}
          disabled={!name.trim()}
          style={{ flex:2, height:36, borderRadius:9, border:"none", background: name.trim() ? "#0ea5e9":"#e2e8f0", cursor: name.trim()?"pointer":"default", fontSize:11, fontWeight:700, color:"#fff", fontFamily:"inherit" }}>
          Lưu ca
        </button>
      </div>
    </div>
  );
}

// ─── Slot Card ────────────────────────────────────────────────────────────────
function SlotCard({ slot, regs, isAdmin, currentUserId, currentUserName, onRegister, onCancel, onApprove, onReject, onDelete }: {
  slot: ShiftSlot;
  regs: ShiftRegistration[];
  isAdmin: boolean;
  currentUserId: string;
  currentUserName: string;
  onRegister: (slotId: string) => void;
  onCancel: (regId: string) => void;
  onApprove: (reg: ShiftRegistration) => void;
  onReject: (reg: ShiftRegistration) => void;
  onDelete: (slotId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const myReg = regs.find(r => r.userId === currentUserId);
  const approved = regs.filter(r => r.status === "approved");
  const pending  = regs.filter(r => r.status === "pending");
  const full = approved.length >= slot.maxStaff;
  const canRegister = !myReg && !full;

  return (
    <div style={{ borderRadius:10, border:`1.5px solid ${slot.color}30`, background:"#fff", overflow:"hidden", boxShadow:`0 1px 6px ${slot.color}10` }}>
      {/* Color bar */}
      <div style={{ height:3, background:slot.color }} />
      <div style={{ padding:"8px 10px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:11, fontWeight:700, color:"#0c1a2e", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{slot.name}</p>
            <p style={{ fontSize:9, color:"#64748b", marginTop:1, display:"flex", alignItems:"center", gap:3 }}>
              <Clock size={8} />{fmt(slot.startTime)} – {fmt(slot.endTime)}
            </p>
          </div>
          {/* Slots filled indicator */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
            <span style={{ fontSize:13, fontWeight:800, color: full?"#ef4444":slot.color, lineHeight:1 }}>{approved.length}</span>
            <span style={{ fontSize:7, color:"#94a3b8" }}>/{slot.maxStaff}</span>
          </div>
          {isAdmin && (
            <button onClick={()=>onDelete(slot.id)}
              style={{ width:22, height:22, borderRadius:6, border:"1px solid #fee2e2", background:"#fff5f5", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Trash2 size={9} style={{ color:"#ef4444" }} />
            </button>
          )}
          {regs.length > 0 && (
            <button onClick={()=>setExpanded(v=>!v)}
              style={{ width:22, height:22, borderRadius:6, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <ChevronDown size={10} style={{ color:"#64748b", transform: expanded?"rotate(180deg)":"none", transition:"transform 0.15s" }} />
            </button>
          )}
        </div>

        {/* My registration status */}
        {myReg && (
          <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:5, padding:"4px 8px", borderRadius:7, background:`${statusColor(myReg.status)}10`, border:`1px solid ${statusColor(myReg.status)}30` }}>
            <StatusIcon status={myReg.status} />
            <span style={{ fontSize:9, fontWeight:700, color:statusColor(myReg.status), flex:1 }}>{statusLabel(myReg.status)}</span>
            {myReg.status === "pending" && (
              <button onClick={()=>onCancel(myReg.id)}
                style={{ fontSize:8, color:"#ef4444", fontWeight:600, background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>Huỷ</button>
            )}
          </div>
        )}

        {/* Pending count badge for admin */}
        {isAdmin && pending.length > 0 && (
          <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ fontSize:9, fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.1)", padding:"2px 7px", borderRadius:20, border:"1px solid rgba(245,158,11,0.2)" }}>
              {pending.length} chờ duyệt
            </span>
          </div>
        )}

        {/* Register button */}
        {!myReg && !isAdmin && (
          <button onClick={()=>canRegister && onRegister(slot.id)} disabled={!canRegister}
            style={{ marginTop:7, width:"100%", height:28, borderRadius:7, border:`1px solid ${canRegister?slot.color:slot.color+"40"}`, background: canRegister?`${slot.color}12`:"#f8fafc", cursor: canRegister?"pointer":"default", fontSize:10, fontWeight:700, color: canRegister?slot.color:"#94a3b8", fontFamily:"inherit" }}>
            {full ? "Đầy ca" : "Đăng ký"}
          </button>
        )}
      </div>

      {/* Expanded registrations */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} style={{ overflow:"hidden" }}>
            <div style={{ borderTop:`1px solid ${slot.color}20`, padding:"6px 10px 8px", display:"flex", flexDirection:"column", gap:4 }}>
              {regs.length === 0 && <p style={{ fontSize:9, color:"#94a3b8", textAlign:"center" }}>Chưa có đăng ký</p>}
              {regs.map(reg => (
                <div key={reg.id} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", background:`${statusColor(reg.status)}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:8, fontWeight:700, color:statusColor(reg.status) }}>{reg.userName.slice(0,1).toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize:10, color:"#0c1a2e", flex:1, fontWeight:500 }}>{reg.userName}</span>
                  <StatusIcon status={reg.status} />
                  <span style={{ fontSize:8, color:statusColor(reg.status), fontWeight:600 }}>{statusLabel(reg.status)}</span>
                  {isAdmin && reg.status === "pending" && (
                    <div style={{ display:"flex", gap:3 }}>
                      <button onClick={()=>onApprove(reg)}
                        style={{ width:22, height:22, borderRadius:6, border:"1px solid #bbf7d0", background:"#f0fdf4", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Check size={10} style={{ color:"#10b981" }} />
                      </button>
                      <button onClick={()=>onReject(reg)}
                        style={{ width:22, height:22, borderRadius:6, border:"1px solid #fee2e2", background:"#fff5f5", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <X size={10} style={{ color:"#ef4444" }} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Add Slot Modal ───────────────────────────────────────────────────────────
function AddSlotModal({ templates, date, onSave, onClose }: {
  templates: ShiftTemplate[]; date: string;
  onSave: (slot: Omit<ShiftSlot,"id"|"createdAt">) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"template"|"custom">(templates.length ? "template" : "custom");
  const [selectedTmpl, setSelectedTmpl] = useState<ShiftTemplate | null>(templates[0] ?? null);
  const [name, setName] = useState("");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("14:00");
  const [color, setColor] = useState("#0ea5e9");
  const [max, setMax] = useState(3);
  const [note, setNote] = useState("");

  const dateObj = new Date(date + "T00:00:00");
  const dayLabel = `${DAYS_FULL[dateObj.getDay()]}, ${dateObj.getDate()} tháng ${dateObj.getMonth()+1}`;

  function handleSave() {
    if (mode === "template" && selectedTmpl) {
      onSave({ templateId:selectedTmpl.id, date, name:selectedTmpl.name,
        startTime:selectedTmpl.startTime, endTime:selectedTmpl.endTime,
        color:selectedTmpl.color, maxStaff:selectedTmpl.maxStaff, note:note||null });
    } else {
      if (!name.trim()) return;
      onSave({ templateId:null, date, name:name.trim(), startTime:start, endTime:end, color, maxStaff:max, note:note||null });
    }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity:0, scale:0.95, y:10 }} animate={{ opacity:1, scale:1, y:0 }}
        style={{ background:"#fff", borderRadius:16, padding:20, width:"100%", maxWidth:360, boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:"#0c1a2e" }}>Thêm ca</p>
            <p style={{ fontSize:10, color:"#64748b" }}>{dayLabel}</p>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={12} style={{ color:"#64748b" }} />
          </button>
        </div>

        {templates.length > 0 && (
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {(["template","custom"] as const).map(m => (
              <button key={m} onClick={()=>setMode(m)}
                style={{ flex:1, height:30, borderRadius:8, border:`1px solid ${mode===m?"#0ea5e9":"#e2e8f0"}`, background:mode===m?"#f0f9ff":"#fff", cursor:"pointer", fontSize:10, fontWeight:700, color:mode===m?"#0ea5e9":"#64748b", fontFamily:"inherit" }}>
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
                  <p style={{ fontSize:11, fontWeight:700, color:"#0c1a2e" }}>{t.name}</p>
                  <p style={{ fontSize:9, color:"#64748b" }}>{fmt(t.startTime)} – {fmt(t.endTime)} · tối đa {t.maxStaff} người</p>
                </div>
                {selectedTmpl?.id===t.id && <Check size={12} style={{ color:t.color }} />}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tên ca..."
              style={{ height:36, borderRadius:8, border:"1px solid #e2e8f0", padding:"0 10px", fontSize:12, fontFamily:"inherit", outline:"none", color:"#0c1a2e" }} />
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const { currentUser, users, fetchUsersFromDb } = useStore();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager";

  const [weekOffset, setWeekOffset] = useState(0);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [slots, setSlots] = useState<ShiftSlot[]>([]);
  const [registrations, setRegistrations] = useState<ShiftRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingSlot, setAddingSlot] = useState<string | null>(null); // date
  const [showTemplates, setShowTemplates] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ShiftTemplate | null>(null);
  const [addTemplate, setAddTemplate] = useState(false);
  const [viewMode, setViewMode] = useState<"week"|"staff">("week");
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const dateFrom = toDateStr(weekDates[0]);
  const dateTo   = toDateStr(weekDates[6]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
        setSlots(data.slots ?? []);
        setRegistrations(data.registrations ?? []);
      }
    } finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isAdmin) fetchUsersFromDb(); }, [isAdmin]);

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleSaveTemplate(data: Omit<ShiftTemplate,"id"|"createdAt">) {
    const t: ShiftTemplate = { ...data, id: editTemplate?.id ?? `tmpl_${Date.now()}`, createdAt: editTemplate?.createdAt ?? new Date().toISOString() };
    await fetch("/api/shifts", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({kind:"template",data:t}) });
    setEditTemplate(null); setAddTemplate(false);
    load();
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Xoá mẫu ca này?")) return;
    await fetch(`/api/shifts?kind=template&id=${id}`, { method:"DELETE" });
    load();
  }

  async function handleAddSlot(slotData: Omit<ShiftSlot,"id"|"createdAt">) {
    await fetch("/api/shifts", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({kind:"slot",data:slotData}) });
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
    await fetch("/api/shifts/register", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"register", slotId, userId:currentUser.id, userName:currentUser.name }) });
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

  // ── Derived ────────────────────────────────────────────────────────────────
  const slotsByDate = useMemo(() => {
    const m: Record<string, ShiftSlot[]> = {};
    for (const s of slots) {
      if (!m[s.date]) m[s.date] = [];
      m[s.date].push(s);
    }
    return m;
  }, [slots]);

  const regsBySlot = useMemo(() => {
    const m: Record<string, ShiftRegistration[]> = {};
    for (const r of registrations) {
      if (!m[r.slotId]) m[r.slotId] = [];
      m[r.slotId].push(r);
    }
    return m;
  }, [registrations]);

  // Staff view: approved shifts per person per week
  const staffSchedule = useMemo(() => {
    const staffIds = [...new Set(registrations.filter(r=>r.status==="approved").map(r=>r.userId))];
    return staffIds.map(uid => {
      const name = registrations.find(r=>r.userId===uid)?.userName ?? uid;
      const myRegs = registrations.filter(r=>r.userId===uid && r.status==="approved");
      const mySlots = myRegs.map(r => slots.find(s=>s.id===r.slotId)).filter(Boolean) as ShiftSlot[];
      return { uid, name, slots: mySlots };
    });
  }, [registrations, slots]);

  const pendingCount = registrations.filter(r=>r.status==="pending").length;
  const today = toDateStr(new Date());

  const weekLabel = (() => {
    const m0 = weekDates[0]; const m6 = weekDates[6];
    if (m0.getMonth() === m6.getMonth())
      return `${MONTHS_VI[m0.getMonth()]} ${m0.getFullYear()}`;
    return `${m0.getDate()} ${MONTHS_VI[m0.getMonth()]} – ${m6.getDate()} ${MONTHS_VI[m6.getMonth()]} ${m6.getFullYear()}`;
  })();

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:0, background:"#f8fafc" }}>
      {/* Header */}
      <div style={{ padding:"16px 20px 12px", background:"#fff", borderBottom:"1px solid #e0f2fe", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
              <p style={{ fontSize:9, fontWeight:700, color:"#94a3b8", letterSpacing:"0.2em" }}>LỊCH LÀM · POSTLAIN</p>
            </div>
            <h1 style={{ fontSize:20, fontWeight:800, color:"#0c1a2e", margin:0 }}>Lịch Làm Việc</h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {isAdmin && pendingCount > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:20, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)" }}>
                <AlertCircle size={11} style={{ color:"#f59e0b" }} />
                <span style={{ fontSize:10, fontWeight:700, color:"#f59e0b" }}>{pendingCount} chờ duyệt</span>
              </div>
            )}
            {isAdmin && (
              <button onClick={()=>setShowTemplates(v=>!v)}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:10, border:"1px solid #bae6fd", background: showTemplates?"#f0f9ff":"#fff", cursor:"pointer", fontFamily:"inherit" }}>
                <Settings2 size={12} style={{ color:"#0ea5e9" }} />
                <span style={{ fontSize:10, fontWeight:600, color:"#0ea5e9" }}>Mẫu Ca</span>
              </button>
            )}
          </div>
        </div>

        {/* Template panel */}
        <AnimatePresence>
          {showTemplates && isAdmin && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} style={{ overflow:"hidden" }}>
              <div style={{ marginTop:12, padding:14, background:"#f8fafc", borderRadius:12, border:"1px solid #e0f2fe" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <p style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:"0.12em" }}>MẪU CA LÀM VIỆC</p>
                  <button onClick={()=>setAddTemplate(v=>!v)}
                    style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", borderRadius:8, border:"1px solid #bae6fd", background:"#fff", cursor:"pointer", fontSize:10, fontWeight:600, color:"#0ea5e9", fontFamily:"inherit" }}>
                    <Plus size={11} /> Thêm mẫu
                  </button>
                </div>
                {addTemplate && (
                  <div style={{ marginBottom:12, padding:12, background:"#fff", borderRadius:10, border:"1px solid #e0f2fe" }}>
                    <TemplateForm onSave={handleSaveTemplate} onClose={()=>setAddTemplate(false)} />
                  </div>
                )}
                {editTemplate && (
                  <div style={{ marginBottom:12, padding:12, background:"#fff", borderRadius:10, border:`1.5px solid ${editTemplate.color}40` }}>
                    <TemplateForm initial={editTemplate} onSave={handleSaveTemplate} onClose={()=>setEditTemplate(null)} />
                  </div>
                )}
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {templates.map(t => (
                    <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, background:"#fff", border:`1.5px solid ${t.color}30`, minWidth:160 }}>
                      <div style={{ width:10, height:28, borderRadius:3, background:t.color, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:11, fontWeight:700, color:"#0c1a2e" }}>{t.name}</p>
                        <p style={{ fontSize:9, color:"#64748b" }}>{fmt(t.startTime)}–{fmt(t.endTime)} · {t.maxStaff} người</p>
                      </div>
                      <button onClick={()=>setEditTemplate(t)}
                        style={{ width:24,height:24,borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <Edit3 size={10} style={{ color:"#64748b" }} />
                      </button>
                      <button onClick={()=>handleDeleteTemplate(t.id)}
                        style={{ width:24,height:24,borderRadius:6,border:"1px solid #fee2e2",background:"#fff5f5",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <Trash2 size={10} style={{ color:"#ef4444" }} />
                      </button>
                    </div>
                  ))}
                  {templates.length === 0 && <p style={{ fontSize:10, color:"#94a3b8" }}>Chưa có mẫu ca nào. Tạo mẫu để dùng nhanh khi phân ca.</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Week nav + view toggle */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12 }}>
          <button onClick={()=>setWeekOffset(v=>v-1)}
            style={{ width:30,height:30,borderRadius:9,border:"1px solid #e0f2fe",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <ChevronLeft size={14} style={{ color:"#64748b" }} />
          </button>
          <button onClick={()=>setWeekOffset(0)}
            style={{ padding:"5px 12px",borderRadius:9,border:"1px solid #e0f2fe",background:weekOffset===0?"#0ea5e9":"#fff",cursor:"pointer",fontSize:10,fontWeight:700,color:weekOffset===0?"#fff":"#64748b",fontFamily:"inherit" }}>
            Tuần này
          </button>
          <span style={{ fontSize:11, fontWeight:700, color:"#0c1a2e", flex:1, textAlign:"center" }}>{weekLabel}</span>
          <button onClick={()=>setWeekOffset(v=>v+1)}
            style={{ width:30,height:30,borderRadius:9,border:"1px solid #e0f2fe",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <ChevronRight size={14} style={{ color:"#64748b" }} />
          </button>
          {/* View toggle */}
          <div style={{ display:"flex", gap:2, padding:3, background:"#f0f9ff", borderRadius:10, border:"1px solid #e0f2fe" }}>
            {([["week","Tuần"],["staff","Nhân viên"]] as const).map(([v,l]) => (
              <button key={v} onClick={()=>setViewMode(v)}
                style={{ padding:"4px 10px", borderRadius:7, border:"none", background:viewMode===v?"#0ea5e9":"transparent", cursor:"pointer", fontSize:9, fontWeight:700, color:viewMode===v?"#fff":"#64748b", fontFamily:"inherit" }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 24px" }}>
        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:"#94a3b8", fontSize:12 }}>Đang tải...</div>
        ) : viewMode === "week" ? (
          /* ── Weekly grid ── */
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, minmax(0, 1fr))", gap:8 }}>
            {weekDates.map((date, di) => {
              const ds = toDateStr(date);
              const isToday = ds === today;
              const daySlots = slotsByDate[ds] ?? [];
              const isPast = ds < today;
              return (
                <div key={ds} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {/* Day header */}
                  <div style={{ textAlign:"center" }}>
                    <p style={{ fontSize:9, fontWeight:700, color: isToday?"#0ea5e9":"#94a3b8", letterSpacing:"0.1em" }}>{DAYS_VI[date.getDay()]}</p>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:isToday?"#0ea5e9":"transparent", display:"flex", alignItems:"center", justifyContent:"center", margin:"2px auto" }}>
                      <span style={{ fontSize:13, fontWeight:800, color:isToday?"#fff":isPast?"#cbd5e1":"#0c1a2e" }}>{date.getDate()}</span>
                    </div>
                  </div>
                  {/* Shift slots */}
                  {daySlots.map(slot => (
                    <SlotCard key={slot.id} slot={slot}
                      regs={regsBySlot[slot.id] ?? []}
                      isAdmin={isAdmin}
                      currentUserId={currentUser?.id ?? ""}
                      currentUserName={currentUser?.name ?? ""}
                      onRegister={handleRegister}
                      onCancel={handleCancel}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onDelete={handleDeleteSlot} />
                  ))}
                  {/* Add slot button (admin only, not past) */}
                  {isAdmin && !isPast && (
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
        ) : (
          /* ── Staff view ── */
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {/* Legend row */}
            <div style={{ display:"grid", gridTemplateColumns:"140px repeat(7,1fr)", gap:6, fontSize:9, fontWeight:700, color:"#94a3b8", letterSpacing:"0.08em" }}>
              <div>NHÂN VIÊN</div>
              {weekDates.map(d => (
                <div key={d.getTime()} style={{ textAlign:"center", color: toDateStr(d)===today?"#0ea5e9":"#94a3b8" }}>
                  {DAYS_VI[d.getDay()]}<br/>{d.getDate()}
                </div>
              ))}
            </div>
            {/* Per-staff rows */}
            {staffSchedule.length === 0 && (
              <p style={{ fontSize:11, color:"#94a3b8", textAlign:"center", padding:"40px 0" }}>Chưa có ca nào được duyệt trong tuần này.</p>
            )}
            {staffSchedule.map(({ uid, name, slots: mySlots }) => (
              <div key={uid} style={{ display:"grid", gridTemplateColumns:"140px repeat(7,1fr)", gap:6, alignItems:"start" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 0" }}>
                  <div style={{ width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#0c1a2e,#1e3a5f)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <span style={{ fontSize:10,fontWeight:700,color:"#C9A55A" }}>{name.slice(0,1).toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize:10,fontWeight:600,color:"#0c1a2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</span>
                </div>
                {weekDates.map(d => {
                  const ds = toDateStr(d);
                  const dayShifts = mySlots.filter(s=>s.date===ds);
                  return (
                    <div key={ds} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                      {dayShifts.map(s => (
                        <div key={s.id} style={{ padding:"4px 6px", borderRadius:7, background:`${s.color}18`, border:`1px solid ${s.color}40` }}>
                          <p style={{ fontSize:9, fontWeight:700, color:s.color, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.name}</p>
                          <p style={{ fontSize:8, color:"#64748b" }}>{fmt(s.startTime)}–{fmt(s.endTime)}</p>
                        </div>
                      ))}
                      {dayShifts.length === 0 && (
                        <div style={{ height:36, borderRadius:7, background:"#f8fafc", border:"1px dashed #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ fontSize:8, color:"#cbd5e1" }}>—</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {/* All staff (even those with no shifts) */}
            {isAdmin && users.filter(u=>u.role==="staff" && u.active && !staffSchedule.find(s=>s.uid===u.id)).map(u => (
              <div key={u.id} style={{ display:"grid", gridTemplateColumns:"140px repeat(7,1fr)", gap:6, alignItems:"center", opacity:0.45 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:26,height:26,borderRadius:"50%",background:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <span style={{ fontSize:10,fontWeight:700,color:"#94a3b8" }}>{u.name.slice(0,1).toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize:10,fontWeight:600,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.name}</span>
                </div>
                {weekDates.map(d => (
                  <div key={d.getTime()} style={{ height:36,borderRadius:7,background:"#f8fafc",border:"1px dashed #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <span style={{ fontSize:8,color:"#cbd5e1" }}>—</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
}
