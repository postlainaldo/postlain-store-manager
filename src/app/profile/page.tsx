"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Check, X, Edit2, Edit3, Phone, FileText,
  Crown, UserCheck, User, Circle, Send,
  Lock, Eye, EyeOff, LogOut, ChevronDown,
  Settings, Users, RefreshCw, Info,
  Plus, Trash2, UserPlus, Activity,
  Award, Bell, Zap, Shield, Store, Trophy, BarChart2, TrendingUp, ChevronLeft, ChevronRight,
  Download, Upload, Database, AlertTriangle,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import type { UserRole, AppUser } from "@/store/useStore";
import { useUpdateContext } from "@/components/Providers";
import { playSound } from "@/hooks/useSFX";


const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "2.1.0";
const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE
  ? (() => {
      const d = new Date(process.env.NEXT_PUBLIC_BUILD_DATE!);
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    })()
  : null;

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type Status = "working" | "off_shift" | "day_off" | "AL" | "SL" | "MAL" | "PCU" | "UL" | "OIL" | "BT" | "MML" | "CSL" | "CML" | "CL" | "PX" | "NDF" | "PHC" | "Xmas" | "MS";
type Activity = { id: string; userId: string; userName: string; type: string; content: string; createdAt: string };
type TeamMember = { id: string; name: string; fullName: string; username: string; role: string; active: number; avatar: string | null; status: string; bio: string; phone: string; createdAt: string };

// Grouped status config: schedule-based + leave codes
const STATUS_CFG: Record<string, { label: string; color: string; group: string }> = {
  // ── Ca làm ──
  working:   { label: "Hoạt động",           color: "#10b981", group: "shift" },
  off_shift: { label: "Không trong ca",       color: "#64748b", group: "shift" },
  day_off:   { label: "Nghỉ tuần",            color: "#94a3b8", group: "shift" },
  // ── Phép ──
  AL:  { label: "AL – Nghỉ phép năm",         color: "#0ea5e9", group: "leave" },
  SL:  { label: "SL – Nghỉ ốm đau",           color: "#f59e0b", group: "leave" },
  MAL: { label: "MAL – Nghỉ kết hôn",         color: "#ec4899", group: "leave" },
  PCU: { label: "PCU – Paternity Leave",       color: "#8b5cf6", group: "leave" },
  UL:  { label: "UL – Nghỉ không lương",       color: "#ef4444", group: "leave" },
  OIL: { label: "OIL – Nghỉ bù",              color: "#06b6d4", group: "leave" },
  BT:  { label: "BT – Đi công tác",            color: "#C9A55A", group: "leave" },
  MML: { label: "MML – Thai sản (nam)",        color: "#10b981", group: "leave" },
  CSL: { label: "CSL – Nghỉ con bệnh",         color: "#f97316", group: "leave" },
  CML: { label: "CML – Nghỉ cưới con",         color: "#ec4899", group: "leave" },
  CL:  { label: "CL – Tang chế",               color: "#475569", group: "leave" },
  PX:  { label: "PX – Nghỉ khám thai",         color: "#8b5cf6", group: "leave" },
  NDF: { label: "NDF – Thiên tai, bão lũ",     color: "#64748b", group: "leave" },
  PHC: { label: "PHC – Dưỡng sức sau sinh",    color: "#0ea5e9", group: "leave" },
  Xmas:{ label: "Xmas – Lễ Giáng Sinh",        color: "#ef4444", group: "leave" },
  MS:  { label: "MS – Làm ngoài văn phòng",    color: "#10b981", group: "leave" },
};

const ROLE_CFG: Record<string, { label: string; color: string; icon: typeof User }> = {
  admin:    { label: "Admin",                   color: "#C9A55A", icon: Crown     },
  manager:  { label: "Quản Lý",                 color: "#0ea5e9", icon: UserCheck },
  staff:    { label: "Nhân Viên",               color: "#64748b", icon: User      },
  staff_ft: { label: "Nhân Viên (Full Time)",   color: "#10b981", icon: User      },
  staff_pt: { label: "Nhân Viên (Part Time)",   color: "#7c3aed", icon: User      },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

// ─── FloatingOrb ───────────────────────────────────────────────────────────────

function FloatingOrb({ x, y, size, color, delay }: { x: string; y: string; size: number; color: string; delay: number }) {
  return (
    <motion.div
      animate={{ y: [0, -28, 10, -15, 0], x: [0, 12, -8, 5, 0], scale: [1, 1.08, 0.96, 1.04, 1], opacity: [0.15, 0.25, 0.13, 0.22, 0.15] }}
      transition={{ duration: 14 + delay * 2.5, repeat: Infinity, delay, ease: "easeInOut" }}
      style={{
        position: "fixed", left: x, top: y, width: size, height: size,
        borderRadius: "50%", pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
        filter: "blur(40px)",
      }}
    />
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 80, status, ring = false }: { src?: string | null; name: string; size?: number; status?: string; ring?: boolean }) {
  const color = STATUS_CFG[status ?? "off_shift"]?.color ?? "#cbd5e1";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {ring && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", inset: -4, borderRadius: "50%",
            background: "conic-gradient(from 0deg, transparent 0%, #C9A55A 25%, transparent 50%, #0ea5e9 75%, transparent 100%)",
            filter: "blur(2px)", opacity: 0.7,
          }}
        />
      )}
      <div style={{
        position: "absolute", inset: ring ? -2 : 0, borderRadius: "50%",
        background: src ? "transparent" : "linear-gradient(135deg, #0c1a2e, #1e3a5f)",
        border: `${ring ? 2 : size > 40 ? 3 : 2}px solid rgba(201,165,90,${ring ? 0.6 : 0.5})`,
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: ring
          ? "0 0 0 3px rgba(14,165,233,0.2), 0 0 20px rgba(201,165,90,0.2)"
          : size > 40 ? "0 0 0 3px rgba(14,165,233,0.15), 0 8px 24px rgba(0,0,0,0.15)" : undefined,
        zIndex: 1,
      }}>
        {src
          ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "#C9A55A" }}>{name.slice(0, 1).toUpperCase()}</span>
        }
      </div>
      {status && (
        <div style={{
          position: "absolute", bottom: ring ? 2 : size > 40 ? 3 : 2, right: ring ? 2 : size > 40 ? 3 : 2,
          width: size * 0.22, height: size * 0.22, borderRadius: "50%",
          background: color, border: "2px solid #fff", zIndex: 2,
        }}>
          {status === "online" && (
            <motion.div
              animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── PremiumCard ───────────────────────────────────────────────────────────────

function PremiumCard({
  title, icon: Icon, iconColor = "#0ea5e9", accentColor = "#0ea5e9", children,
}: {
  title: string; icon: typeof User; iconColor?: string; accentColor?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      borderRadius: 16, border: "1px solid rgba(186,230,253,0.55)",
      background: "rgba(255,255,255,0.88)",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      overflow: "hidden",
      boxShadow: "0 2px 16px rgba(12,26,46,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
    }}>
      <div style={{
        padding: "11px 20px", borderBottom: "1px solid rgba(186,230,253,0.4)",
        background: `linear-gradient(90deg, ${accentColor}08, rgba(255,255,255,0.5))`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: `${accentColor}12`,
          border: `1px solid ${accentColor}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={13} style={{ color: iconColor }} />
        </div>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: accentColor, flexShrink: 0, boxShadow: `0 0 6px ${accentColor}60` }} />
        <p style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.18em", textTransform: "uppercase" }}>{title}</p>
      </div>
      <div style={{ padding: "4px 0" }}>{children}</div>
    </div>
  );
}

// ─── AnimatedToggle ────────────────────────────────────────────────────────────

function AnimatedToggle({ on, set, label, desc }: { on: boolean; set: (v: boolean) => void; label: string; desc: string }) {
  return (
    <motion.div
      onClick={() => set(!on)}
      whileTap={{ scale: 0.98 }}
      style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
    >
      <div>
        <p style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{desc}</p>
      </div>
      <div style={{
        width: 40, height: 22, borderRadius: 11,
        background: on ? "#C9A55A" : "#bae6fd",
        position: "relative", flexShrink: 0,
        transition: "background 0.22s ease",
        boxShadow: on ? "0 0 8px rgba(201,165,90,0.4)" : "none",
      }}>
        <motion.div
          animate={{ x: on ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
        />
      </div>
    </motion.div>
  );
}

function SDivider() { return <div style={{ height: 1, background: "var(--border-subtle)", margin: "0 20px" }} />; }

function SInputRow({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 16 }}>
      <label style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, width: 140 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ flex: 1, background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "var(--text-primary)", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s" }}
        onFocus={e => { e.target.style.borderColor = "#0ea5e9"; e.target.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.1)"; }}
        onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
    </div>
  );
}

// ─── StatChip ──────────────────────────────────────────────────────────────────

function StatChip({ icon: Icon, value, label, color }: { icon: typeof User; value: string | number; label: string; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        flex: 1, padding: "12px 8px", borderRadius: 12, textAlign: "center",
        background: `${color}08`, border: `1px solid ${color}22`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      }}
    >
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={13} style={{ color }} />
      </div>
      <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    </motion.div>
  );
}

// ─── ActivityItem ──────────────────────────────────────────────────────────────

function ActivityItem({ item, members, currentUserId }: { item: Activity; members: TeamMember[]; currentUserId: string }) {
  const member = members.find(m => m.id === item.userId);
  const isMsg = item.type === "message";
  const isMe = item.userId === currentUserId;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", gap: 10, padding: "10px 0", alignItems: "flex-start" }}
    >
      <Avatar src={member?.avatar} name={item.userName} size={32} status={member?.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", marginBottom: isMsg ? 4 : 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>{item.userName}</span>
          {!isMsg && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.content}</span>}
          <span style={{ fontSize: 9, color: "var(--border-strong)" }}>{timeAgo(item.createdAt)}</span>
        </div>
        {isMsg && (
          <div style={{
            padding: "8px 12px", borderRadius: isMe ? "10px 10px 4px 10px" : "4px 10px 10px 10px",
            background: isMe ? "linear-gradient(135deg, rgba(14,165,233,0.1), rgba(14,165,233,0.06))" : "#f0f9ff",
            border: `1px solid ${isMe ? "rgba(14,165,233,0.2)" : "var(--border)"}`,
            fontSize: 11, color: "var(--text-primary)", lineHeight: 1.6,
            maxWidth: "90%", alignSelf: isMe ? "flex-end" : "flex-start",
          }}>
            {item.content}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── StaffProfileModal ─────────────────────────────────────────────────────────

function StaffProfileModal({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const rcfg = ROLE_CFG[member.role] ?? ROLE_CFG.staff;
  const scfg = STATUS_CFG[member.status] ?? STATUS_CFG.off_shift;
  const RIcon = rcfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(12,26,46,0.55)", backdropFilter: "blur(4px)" }} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative", zIndex: 1, width: "100%", maxWidth: 360,
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 24px 80px rgba(12,26,46,0.28)",
          border: "1px solid rgba(14,165,233,0.2)",
        }}
      >
        {/* Cover */}
        <div style={{ height: 90, background: `linear-gradient(135deg, ${rcfg.color}22, #e0f2fe)`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 18px,rgba(14,165,233,0.05) 18px,rgba(14,165,233,0.05) 19px),repeating-linear-gradient(90deg,transparent,transparent 18px,rgba(14,165,233,0.05) 18px,rgba(14,165,233,0.05) 19px)" }} />
          <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${rcfg.color}30 0%, transparent 70%)` }} />
          <button onClick={onClose} style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(14,165,233,0.2)", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={12} style={{ color: "#64748b" }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ background: "#fff", padding: "0 20px 20px" }}>
          {/* Avatar row */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: -28, marginBottom: 14 }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: member.avatar ? "transparent" : "linear-gradient(135deg,#0c1a2e,#1e3a5f)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `3px solid ${rcfg.color}`, boxShadow: `0 0 0 3px #fff, 0 4px 16px ${rcfg.color}40` }}>
                {member.avatar
                  ? <img src={member.avatar} alt={member.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 22, fontWeight: 700, color: "#C9A55A" }}>{member.name.slice(0,1).toUpperCase()}</span>
                }
              </div>
              <div style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: scfg.color, border: "2px solid #fff", boxShadow: `0 0 6px ${scfg.color}` }} />
            </div>
            <div style={{ padding: "5px 12px", borderRadius: 20, background: `${rcfg.color}12`, border: `1px solid ${rcfg.color}30`, display: "flex", alignItems: "center", gap: 5, boxShadow: `0 0 8px ${rcfg.color}20` }}>
              <RIcon size={10} style={{ color: rcfg.color }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: rcfg.color }}>{rcfg.label}</span>
            </div>
          </div>

          {/* Name */}
          <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "0.01em" }}>{member.name}</p>
          {member.fullName && <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{member.fullName}</p>}
          {member.username && <p style={{ fontSize: 9, color: "rgba(14,165,233,0.8)", marginTop: 1 }}>@{member.username}</p>}

          {/* Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: scfg.color, boxShadow: `0 0 5px ${scfg.color}` }} />
            <span style={{ fontSize: 9.5, color: "var(--text-muted)" }}>{scfg.label}</span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />

          {/* Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {member.bio && (
              <div style={{ padding: "8px 12px", borderRadius: 10, background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.5 }}>"{member.bio}"</p>
              </div>
            )}
            {member.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                <Phone size={11} style={{ color: "#0ea5e9", flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: "var(--text-primary)" }}>{member.phone}</span>
              </div>
            )}
            {member.createdAt && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                <Info size={11} style={{ color: "#64748b", flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Tham gia: {new Date(member.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: member.active ? "rgba(16,185,129,0.06)" : "rgba(148,163,184,0.06)", border: `1px solid ${member.active ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.2)"}` }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: member.active ? "#10b981" : "#94a3b8" }} />
              <span style={{ fontSize: 10, color: member.active ? "#10b981" : "#94a3b8", fontWeight: 600 }}>{member.active ? "Đang hoạt động" : "Đã vô hiệu hóa"}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── TeamCard ──────────────────────────────────────────────────────────────────

function TeamCard({ member, isMe, onView, canView }: { member: TeamMember; isMe: boolean; onView?: () => void; canView?: boolean }) {
  const rcfg = ROLE_CFG[member.role] ?? ROLE_CFG.staff;
  const scfg = STATUS_CFG[member.status] ?? STATUS_CFG.off_shift;
  const RIcon = rcfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: `0 8px 32px rgba(12,26,46,0.1)` }}
      onClick={canView && !isMe ? onView : undefined}
      style={{
        padding: "16px", borderRadius: 16,
        border: `1px solid ${isMe ? "rgba(201,165,90,0.35)" : "var(--border)"}`,
        background: "#fff", display: "flex", gap: 14, alignItems: "center",
        boxShadow: "0 2px 8px rgba(14,165,233,0.05)",
        position: "relative", overflow: "hidden",
        transition: "box-shadow 0.2s",
        cursor: canView && !isMe ? "pointer" : "default",
      }}
    >
      {/* Accent bar */}
      {isMe && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #C9A55A, #e6c474, #C9A55A)" }} />
      )}
      {/* Role glow */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${rcfg.color}10 0%, transparent 70%)`, pointerEvents: "none" }} />

      <Avatar src={member.avatar} name={member.name} size={48} status={member.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{member.name}</p>
          {isMe && (
            <span style={{ fontSize: 7, color: "#0ea5e9", background: "rgba(14,165,233,0.1)", padding: "1px 6px", borderRadius: 20, fontWeight: 700, letterSpacing: "0.08em" }}>BẠN</span>
          )}
        </div>
        {member.fullName && <p style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>{member.fullName}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <div style={{
            padding: "3px 10px", borderRadius: 20,
            background: `${rcfg.color}12`, border: `1px solid ${rcfg.color}30`,
            display: "flex", alignItems: "center", gap: 4,
            boxShadow: `0 0 8px ${rcfg.color}20`,
          }}>
            <RIcon size={9} style={{ color: rcfg.color }} />
            <span style={{ fontSize: 8, fontWeight: 700, color: rcfg.color }}>{rcfg.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ position: "relative", width: 8, height: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: scfg.color }} />
              {member.status === "online" && (
                <motion.div
                  animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ position: "absolute", inset: 0, borderRadius: "50%", background: scfg.color }}
                />
              )}
            </div>
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{scfg.label}</span>
          </div>
        </div>
        {member.bio && <p style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 5, fontStyle: "italic", lineHeight: 1.5 }}>"{member.bio}"</p>}
        {member.phone && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Phone size={9} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{member.phone}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Settings sub-components ──────────────────────────────────────────────────

function StorePanel() {
  const { storeName, storeAddress, storePhone, storeEmail, setStoreSetting } = useStore();
  const [name, setName] = useState(storeName);
  const [addr, setAddr] = useState(storeAddress);
  const [phone, setPhone] = useState(storePhone);
  const [email, setEmail] = useState(storeEmail);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.storeName)    { setName(d.storeName);    setStoreSetting("storeName",    d.storeName); }
      if (d.storeAddress) { setAddr(d.storeAddress); setStoreSetting("storeAddress", d.storeAddress); }
      if (d.storePhone)   { setPhone(d.storePhone);  setStoreSetting("storePhone",   d.storePhone); }
      if (d.storeEmail)   { setEmail(d.storeEmail);  setStoreSetting("storeEmail",   d.storeEmail); }
    }).catch(() => {});
  }, []);
  const handleSave = () => {
    setStoreSetting("storeName", name); setStoreSetting("storeAddress", addr);
    setStoreSetting("storePhone", phone); setStoreSetting("storeEmail", email);
    fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeName: name, storeAddress: addr, storePhone: phone, storeEmail: email }) }).catch(() => {});
    playSound("save");
    setSaved(true); setTimeout(() => setSaved(false), 1400);
  };
  return (
    <PremiumCard title="THÔNG TIN CỬA HÀNG" icon={Store} iconColor="#0ea5e9" accentColor="#0ea5e9">
      <SInputRow label="Tên cửa hàng" value={name} onChange={setName} />
      <SDivider />
      <SInputRow label="Địa chỉ" value={addr} onChange={setAddr} />
      <SDivider />
      <SInputRow label="Điện thoại" value={phone} onChange={setPhone} />
      <SDivider />
      <SInputRow label="Email" value={email} onChange={setEmail} />
      <SDivider />
      <div style={{ padding: "10px 20px", display: "flex", justifyContent: "flex-end" }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSave}
          style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: saved ? "#10b981" : "linear-gradient(135deg, #C9A55A, #d4a84b)", color: saved ? "#fff" : "#0c1a2e", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}>
          <Check size={10} /> {saved ? "ĐÃ LƯU" : "LƯU"}
        </motion.button>
      </div>
    </PremiumCard>
  );
}

function DisplayPanel() {
  const { uiAnimations, setUISetting } = useStore();
  return (
    <PremiumCard title="GIAO DIỆN" icon={Zap} iconColor="#C9A55A" accentColor="#C9A55A">
      <AnimatedToggle label="Hiệu ứng chuyển động" desc="Bật/tắt animation toàn app" on={!!uiAnimations} set={v => setUISetting("uiAnimations", v)} />
    </PremiumCard>
  );
}

function NotifyPanel() {
  const { lowStockThreshold, setLowStockThreshold } = useStore();
  const [thresh, setThresh] = useState(String(lowStockThreshold ?? 5));
  const [saved, setSaved] = useState(false);
  const save = () => { setLowStockThreshold(Number(thresh) || 5); setSaved(true); setTimeout(() => setSaved(false), 1400); };
  return (
    <PremiumCard title="THÔNG BÁO" icon={Bell} iconColor="#7c3aed" accentColor="#7c3aed">
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <label style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, width: 140 }}>Ngưỡng cảnh báo tồn kho</label>
        <input type="number" value={thresh} onChange={e => setThresh(e.target.value)} min={1}
          style={{ width: 80, background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }} />
        <motion.button whileTap={{ scale: 0.96 }} onClick={save}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: saved ? "#10b981" : "#7c3aed", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s" }}>
          {saved ? "✓" : "LƯU"}
        </motion.button>
      </div>
    </PremiumCard>
  );
}

function ShelvesPanel() {
  const { warehouseShelves, addWarehouseShelf, removeWarehouseShelf } = useStore();
  const [shelfType, setShelfType] = useState<"shoes" | "bags">("shoes");
  return (
    <PremiumCard title="QUẢN LÝ KỆ KHO" icon={Info} iconColor="#0ea5e9" accentColor="#0ea5e9">
      <div style={{ padding: "4px 20px 12px" }}>
        {warehouseShelves.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: 11, color: "var(--text-primary)" }}>{s.name}</span>
            <button onClick={() => removeWarehouseShelf(s.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <Trash2 size={12} style={{ color: "#dc2626" }} />
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <select value={shelfType} onChange={e => setShelfType(e.target.value as "shoes" | "bags")}
            style={{ flex: 1, background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }}>
            <option value="shoes">Kệ Giày</option>
            <option value="bags">Kệ Túi</option>
          </select>
          <button onClick={() => addWarehouseShelf(shelfType)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
            <Plus size={10} /> THÊM
          </button>
        </div>
      </div>
    </PremiumCard>
  );
}

function UsersPanel() {
  const { users, currentUser, removeUser, updateUser, fetchUsersFromDb } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", username: "", password: "", role: "staff" as UserRole });
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "staff" as UserRole, password: "" });
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newUser.name.trim() || !newUser.username.trim() || !newUser.password.trim()) { setAddMsg("Điền đầy đủ thông tin"); return; }
    if (users.find(u => u.email === newUser.username.trim())) { setAddMsg("Tên đăng nhập đã tồn tại"); return; }
    const res = await fetch("/api/auth", { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newUser.name.trim(), username: newUser.username.trim(), password: newUser.password.trim(), role: newUser.role }) });
    if (!res.ok) { setAddMsg("Lỗi tạo tài khoản"); return; }
    playSound("save");
    setAddMsg("Đã thêm người dùng");
    await fetchUsersFromDb();
    setTimeout(() => { setAddMsg(null); setShowAdd(false); setNewUser({ name: "", username: "", password: "", role: "staff" }); }, 1200);
  };

  const handleToggleActive = async (u: AppUser) => {
    const body = { id: u.id, name: u.name, username: u.email, role: u.role, active: !u.active };
    await fetch("/api/auth", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    updateUser(u.id, { active: !u.active });
  };

  const handleEditSave = async (u: AppUser) => {
    if (!editForm.name.trim()) { setEditMsg("Tên không được trống"); return; }
    const body: Record<string, unknown> = { id: u.id, name: editForm.name.trim(), username: u.email, role: editForm.role, active: u.active };
    if (editForm.password.trim()) body.password = editForm.password.trim();
    const res = await fetch("/api/auth", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { setEditMsg("Lỗi cập nhật"); return; }
    playSound("save");
    updateUser(u.id, { name: editForm.name.trim(), role: editForm.role });
    setEditMsg("Đã lưu");
    setTimeout(() => { setEditMsg(null); setEditingId(null); }, 1000);
  };

  const handleDelete = async (u: AppUser) => {
    const res = await fetch("/api/auth", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id }) });
    if (!res.ok) return;
    playSound("destroy");
    removeUser(u.id);
    setConfirmDeleteId(null);
  };

  return (
    <PremiumCard title="NGƯỜI DÙNG" icon={Users} iconColor="#C9A55A" accentColor="#C9A55A">
      <div style={{ padding: "4px 20px 12px" }}>
        {users.map(u => {
          const rcfg = ROLE_CFG[u.role] ?? ROLE_CFG.staff;
          const RIcon = rcfg.icon;
          const isMe = u.id === currentUser?.id;
          const isEditing = editingId === u.id;
          const isConfirmDelete = confirmDeleteId === u.id;
          return (
            <div key={u.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${rcfg.color}20, ${rcfg.color}08)`, border: `1.5px solid ${rcfg.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: rcfg.color }}>{u.name.slice(0,1).toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{u.name}</span>
                    {isMe && <span style={{ fontSize: 7, color: "#0ea5e9", background: "rgba(14,165,233,0.1)", padding: "1px 5px", borderRadius: 10, fontWeight: 700 }}>BẠN</span>}
                  </div>
                  <span style={{ fontSize: 8, color: "var(--text-muted)" }}>@{u.email}</span>
                </div>
                <div style={{ padding: "2px 8px", borderRadius: 20, background: `${rcfg.color}12`, border: `1px solid ${rcfg.color}25`, display: "flex", alignItems: "center", gap: 3 }}>
                  <RIcon size={8} style={{ color: rcfg.color }} />
                  <span style={{ fontSize: 7.5, fontWeight: 700, color: rcfg.color }}>{rcfg.label}</span>
                </div>
                {!isMe && (
                  <>
                    <motion.button whileTap={{ scale: 0.94 }} onClick={() => handleToggleActive(u)}
                      style={{ padding: "3px 10px", borderRadius: 20, border: `1px solid ${u.active ? "rgba(16,185,129,0.3)" : "rgba(148,163,184,0.3)"}`, background: u.active ? "rgba(16,185,129,0.08)" : "rgba(148,163,184,0.06)", color: u.active ? "#10b981" : "#94a3b8", fontSize: 7.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      {u.active ? "BẬT" : "TẮT"}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.94 }}
                      onClick={() => { setEditingId(isEditing ? null : u.id); setEditForm({ name: u.name, role: u.role as UserRole, password: "" }); setEditMsg(null); setConfirmDeleteId(null); }}
                      style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${isEditing ? "#0ea5e9" : "var(--border)"}`, background: isEditing ? "rgba(14,165,233,0.1)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Edit3 size={11} style={{ color: isEditing ? "#0ea5e9" : "#64748b" }} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.94 }}
                      onClick={() => { setConfirmDeleteId(isConfirmDelete ? null : u.id); setEditingId(null); }}
                      style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${isConfirmDelete ? "rgba(220,38,38,0.4)" : "var(--border)"}`, background: isConfirmDelete ? "rgba(220,38,38,0.08)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Trash2 size={11} style={{ color: isConfirmDelete ? "#dc2626" : "#94a3b8" }} />
                    </motion.button>
                  </>
                )}
              </div>

              {/* Edit form */}
              {isEditing && (
                <div style={{ marginBottom: 10, padding: 12, borderRadius: 10, background: "var(--bg-base)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 7 }}>
                  {editMsg && <div style={{ padding: "5px 8px", borderRadius: 7, background: editMsg === "Đã lưu" ? "rgba(16,185,129,0.08)" : "rgba(220,38,38,0.06)", fontSize: 10, color: editMsg === "Đã lưu" ? "#10b981" : "#dc2626" }}>{editMsg}</div>}
                  <input value={editForm.name} onChange={e => setEditForm(v => ({ ...v, name: e.target.value }))}
                    placeholder="Tên hiển thị"
                    style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }} />
                  <select value={editForm.role} onChange={e => setEditForm(v => ({ ...v, role: e.target.value as UserRole }))}
                    style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }}>
                    <option value="staff_ft">Nhân Viên (Full Time)</option>
                    <option value="staff_pt">Nhân Viên (Part Time)</option>
                    <option value="staff">Nhân Viên</option>
                    <option value="manager">Quản Lý</option>
                    <option value="admin">Admin</option>
                  </select>
                  <input type="password" value={editForm.password} onChange={e => setEditForm(v => ({ ...v, password: e.target.value }))}
                    placeholder="Mật khẩu mới (để trống = giữ nguyên)"
                    style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleEditSave(u)} style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>LƯU</button>
                    <button onClick={() => setEditingId(null)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>HỦY</button>
                  </div>
                </div>
              )}

              {/* Delete confirm */}
              {isConfirmDelete && (
                <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 10, color: "#dc2626" }}>Xóa tài khoản <strong>{u.name}</strong>?</span>
                  <button onClick={() => handleDelete(u)} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>XÓA</button>
                  <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>HỦY</button>
                </div>
              )}
            </div>
          );
        })}
        {!showAdd ? (
          <motion.button whileHover={{ background: "rgba(14,165,233,0.04)" }} onClick={() => setShowAdd(true)}
            style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "1px dashed var(--border)", background: "transparent", color: "#0ea5e9", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
            <UserPlus size={12} /> Thêm người dùng mới
          </motion.button>
        ) : (
          <div style={{ marginTop: 10, padding: "14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-base)", display: "flex", flexDirection: "column", gap: 8 }}>
            {addMsg && <div style={{ padding: "6px 10px", borderRadius: 8, background: addMsg.startsWith("Đã") ? "rgba(16,185,129,0.08)" : "rgba(220,38,38,0.06)", fontSize: 10, color: addMsg.startsWith("Đã") ? "#10b981" : "#dc2626" }}>{addMsg}</div>}
            {[["Tên hiển thị", "name"], ["Tên đăng nhập", "username"], ["Mật khẩu", "password"]].map(([lbl, key]) => (
              <input key={key} type={key === "password" ? "password" : "text"} placeholder={lbl} value={(newUser as Record<string,string>)[key]}
                onChange={e => setNewUser(v => ({ ...v, [key]: e.target.value }))}
                style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }} />
            ))}
            <select value={newUser.role} onChange={e => setNewUser(v => ({ ...v, role: e.target.value as UserRole }))}
              style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }}>
              <option value="staff_ft">Nhân Viên (Full Time)</option>
              <option value="staff_pt">Nhân Viên (Part Time)</option>
              <option value="staff">Nhân Viên</option>
              <option value="manager">Quản Lý</option>
              <option value="admin">Admin</option>
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAdd} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>THÊM</button>
              <button onClick={() => setShowAdd(false)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}><X size={10} /></button>
            </div>
          </div>
        )}
      </div>
    </PremiumCard>
  );
}

function SecurityPanel({ currentUser }: { currentUser: { id: string; email: string; name: string; role: string } }) {
  const [oldPw, setOldPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confirmPw, setConfirmPw] = useState("");
  const [showOld, setShowOld] = useState(false); const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok"|"err"; text: string } | null>(null);

  const strength = newPw.length === 0 ? 0 : newPw.length < 6 ? 1 : newPw.length < 10 ? 2 : 3;
  const strengthColor = ["transparent", "#ef4444", "#f59e0b", "#10b981"][strength];
  const strengthLabel = ["", "Yếu", "Trung bình", "Mạnh"][strength];

  const handleChange = async () => {
    if (newPw.length < 4) { setMsg({ type: "err", text: "Tối thiểu 4 ký tự" }); return; }
    if (newPw !== confirmPw) { setMsg({ type: "err", text: "Mật khẩu không khớp" }); return; }
    const check = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: currentUser.email, password: oldPw }) });
    if (!check.ok) { setMsg({ type: "err", text: "Mật khẩu hiện tại không đúng" }); return; }
    await fetch("/api/auth", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: currentUser.id, name: currentUser.name, username: currentUser.email, role: currentUser.role, active: true, password: newPw }) });
    setMsg({ type: "ok", text: "Đã đổi mật khẩu thành công" });
    setTimeout(() => { setMsg(null); setOldPw(""); setNewPw(""); setConfirmPw(""); }, 1500);
  };

  const PwRow = ({ label, value, set, show, setShow }: { label: string; value: string; set: (v: string) => void; show: boolean; setShow: (v: boolean) => void }) => (
    <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12 }}>
      <label style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, width: 160 }}>{label}</label>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 10px", height: 36 }}>
        <input type={show ? "text" : "password"} value={value} onChange={e => set(e.target.value)}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 11, fontFamily: "inherit", color: "var(--text-primary)" }} />
        <button onClick={() => setShow(!show)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
          {show ? <EyeOff size={12} style={{ color: "var(--text-muted)" }} /> : <Eye size={12} style={{ color: "var(--text-muted)" }} />}
        </button>
      </div>
    </div>
  );

  return (
    <PremiumCard title="BẢO MẬT" icon={Shield} iconColor="#dc2626" accentColor="#dc2626">
      {msg && <div style={{ margin: "8px 20px 0", padding: "8px 12px", borderRadius: 8, background: msg.type === "ok" ? "rgba(16,185,129,0.08)" : "rgba(220,38,38,0.06)", fontSize: 10, color: msg.type === "ok" ? "#10b981" : "#dc2626", border: `1px solid ${msg.type === "ok" ? "rgba(16,185,129,0.2)" : "rgba(220,38,38,0.15)"}` }}>{msg.text}</div>}
      <PwRow label="Mật khẩu hiện tại" value={oldPw} set={setOldPw} show={showOld} setShow={setShowOld} />
      <SDivider />
      <PwRow label="Mật khẩu mới" value={newPw} set={setNewPw} show={showNew} setShow={setShowNew} />
      {newPw && (
        <div style={{ padding: "0 20px 6px 20px" }}>
          <div style={{ height: 3, borderRadius: 2, background: "var(--border-subtle)", overflow: "hidden" }}>
            <motion.div animate={{ width: `${(strength / 3) * 100}%` }} transition={{ duration: 0.3 }}
              style={{ height: "100%", background: strengthColor, borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 8.5, color: strengthColor, fontWeight: 600, marginTop: 3, display: "block" }}>{strengthLabel}</span>
        </div>
      )}
      <SDivider />
      <PwRow label="Xác nhận mật khẩu mới" value={confirmPw} set={setConfirmPw} show={showNew} setShow={setShowNew} />
      <div style={{ padding: "10px 20px 14px", display: "flex", justifyContent: "flex-end" }}>
        <motion.button whileTap={{ scale: 0.96 }} onClick={handleChange}
          style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #dc2626, #b91c1c)", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em" }}>
          ĐỔI MẬT KHẨU
        </motion.button>
      </div>
    </PremiumCard>
  );
}

function PushPanel({ userId }: { userId: string }) {
  const [permStatus, setPermStatus] = useState("...");
  const [subCount, setSubCount] = useState<number | null>(null);
  const [pushStatus, setPushStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [resubStatus, setResubStatus] = useState<"idle"|"loading"|"done"|"error">("idle");

  const refreshCount = () =>
    fetch("/api/push/test").then(r => r.json()).then(d => setSubCount(d.subscriptions ?? 0)).catch(() => {});

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermStatus(Notification.permission);
    refreshCount();
  }, []);

  const doSubscribe = async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(vapidKey) });
    await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, subscription: sub.toJSON() }) });
    return true;
  };

  const enable = async () => {
    setResubStatus("loading");
    try {
      const perm = await Notification.requestPermission();
      setPermStatus(perm);
      if (perm !== "granted") { setResubStatus("error"); return; }
      await doSubscribe(); await refreshCount(); setResubStatus("done");
    } catch { setResubStatus("error"); }
    setTimeout(() => setResubStatus("idle"), 3000);
  };

  const resub = async () => {
    setResubStatus("loading");
    try { await doSubscribe(); await refreshCount(); setResubStatus("done"); }
    catch { setResubStatus("error"); }
    setTimeout(() => setResubStatus("idle"), 3000);
  };

  const sendTest = async () => {
    setPushStatus("sending");
    try {
      const r = await fetch("/api/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Kiểm tra thông báo", body: "Push hoạt động ✓" }) });
      setPushStatus(r.ok ? "sent" : "error");
    } catch { setPushStatus("error"); }
    setTimeout(() => setPushStatus("idle"), 3000);
  };

  const permColor = permStatus === "granted" ? "#10b981" : permStatus === "denied" ? "#ef4444" : "#f59e0b";
  const isDefault = permStatus === "default" || permStatus === "...";
  const isDenied = permStatus === "denied";
  const isGranted = permStatus === "granted";

  return (
    <PremiumCard title="PUSH NOTIFICATION" icon={Bell} iconColor="#7c3aed" accentColor="#7c3aed">
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: permColor, boxShadow: `0 0 6px ${permColor}80` }} />
            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {isGranted ? "Đã cấp quyền" : isDenied ? "Bị từ chối" : "Chưa bật thông báo"}
            </span>
          </div>
          <span style={{ fontSize: 9, color: "var(--text-muted)", paddingLeft: 14 }}>
            {subCount === null ? "Đang kiểm tra…" : `${subCount} thiết bị đã đăng ký`}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!isDenied && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={isGranted ? resub : enable} disabled={resubStatus === "loading"}
              style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: resubStatus === "done" ? "#10b981" : resubStatus === "error" ? "#ef4444" : isDefault ? "#C9A55A" : "#7c3aed", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {resubStatus === "loading" ? "…" : resubStatus === "done" ? "✓ Đã đăng ký" : resubStatus === "error" ? "✗ Lỗi" : isDefault ? "BẬT THÔNG BÁO" : "Đăng ký lại"}
            </motion.button>
          )}
          {isGranted && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={sendTest} disabled={pushStatus === "sending"}
              style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid var(--border)", background: pushStatus === "sent" ? "#f0fdf4" : "var(--bg-base)", color: pushStatus === "sent" ? "#10b981" : pushStatus === "error" ? "#ef4444" : "#0ea5e9", fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {pushStatus === "sending" ? "Đang gửi…" : pushStatus === "sent" ? "✓ Đã gửi" : pushStatus === "error" ? "✗ Lỗi" : "Gửi thử"}
            </motion.button>
          )}
        </div>
      </div>
      {isDenied && (
        <div style={{ padding: "0 20px 12px" }}>
          <p style={{ fontSize: 9, color: "#ef4444", lineHeight: 1.5 }}>
            Thông báo bị chặn. Vào Settings trình duyệt → site settings → store.postlain.com → bật lại Notifications.
          </p>
        </div>
      )}
    </PremiumCard>
  );
}

// ─── Backup / Restore ─────────────────────────────────────────────────────────
function BackupPanel({ currentUser }: { currentUser: { id: string } }) {
  const [status, setStatus] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    setStatus({ type: "info", text: "Đang xuất dữ liệu..." });
    try {
      const res = await fetch("/api/backup", { headers: { "x-user-id": currentUser.id } });
      if (!res.ok) { setStatus({ type: "err", text: "Không thể xuất backup" }); return; }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "postlain-backup.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: "ok", text: "Đã tải xuống backup thành công" });
    } catch {
      setStatus({ type: "err", text: "Lỗi kết nối" });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) { setStatus({ type: "err", text: "Chọn file .json" }); return; }
    setPendingFile(file);
    setConfirmRestore(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRestore = async () => {
    if (!pendingFile) return;
    setRestoring(true);
    setConfirmRestore(false);
    setStatus({ type: "info", text: "Đang khôi phục..." });
    try {
      const text = await pendingFile.text();
      let payload: unknown;
      try { payload = JSON.parse(text); } catch { setStatus({ type: "err", text: "File JSON không hợp lệ" }); setRestoring(false); return; }
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": currentUser.id },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setStatus({ type: "err", text: data.error ?? "Lỗi restore" }); }
      else {
        const total = Object.values(data.restored as Record<string, number>).reduce((a, b) => a + b, 0);
        setStatus({ type: "ok", text: `Khôi phục thành công — ${total} bản ghi` });
        setTimeout(() => window.location.reload(), 1800);
      }
    } catch {
      setStatus({ type: "err", text: "Lỗi đọc file" });
    } finally {
      setRestoring(false);
      setPendingFile(null);
    }
  };

  const statusColor = status?.type === "ok" ? "#10b981" : status?.type === "err" ? "#dc2626" : "#0ea5e9";
  const statusBg   = status?.type === "ok" ? "rgba(16,185,129,0.08)" : status?.type === "err" ? "rgba(220,38,38,0.06)" : "rgba(14,165,233,0.08)";

  return (
    <PremiumCard title="SAO LƯU & KHÔI PHỤC" icon={Database} iconColor="#8b5cf6" accentColor="#8b5cf6">
      <div style={{ padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Xuất toàn bộ dữ liệu (sản phẩm, vị trí, chat, đơn hàng, người dùng...) thành file JSON. Dùng file này để khôi phục khi cần.
        </p>

        {status && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: statusBg, border: `1px solid ${statusColor}30`, display: "flex", alignItems: "center", gap: 6 }}>
            {status.type === "err" && <AlertTriangle size={11} style={{ color: statusColor, flexShrink: 0 }} />}
            {status.type === "ok"  && <Check size={11} style={{ color: statusColor, flexShrink: 0 }} />}
            {status.type === "info" && <RefreshCw size={11} style={{ color: statusColor, flexShrink: 0, animation: "spin 1s linear infinite" }} />}
            <span style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>{status.text}</span>
          </div>
        )}

        {/* Confirm restore dialog */}
        {confirmRestore && pendingFile && (
          <div style={{ padding: "12px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <AlertTriangle size={14} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>Xác nhận khôi phục?</p>
                <p style={{ fontSize: 9.5, color: "#92400e", marginTop: 3, lineHeight: 1.5 }}>
                  Toàn bộ dữ liệu hiện tại sẽ bị <strong>xóa</strong> và thay bằng dữ liệu trong file:<br />
                  <span style={{ fontFamily: "monospace", color: "#dc2626" }}>{pendingFile.name}</span>
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleRestore}
                style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                XÁC NHẬN KHÔI PHỤC
              </button>
              <button onClick={() => { setConfirmRestore(false); setPendingFile(null); }}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                HỦY
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {/* Download backup */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleDownload}
            style={{ flex: 1, height: 42, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: "0 4px 14px rgba(139,92,246,0.3)" }}>
            <Download size={14} /> Xuất Backup
          </motion.button>

          {/* Upload restore */}
          <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleFileChange} />
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()} disabled={restoring}
            style={{ flex: 1, height: 42, borderRadius: 10, border: "1.5px solid rgba(139,92,246,0.4)", background: "rgba(139,92,246,0.06)", color: "#8b5cf6", fontSize: 11, fontWeight: 700, cursor: restoring ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <Upload size={14} /> Nhập Restore
          </motion.button>
        </div>

        <p style={{ fontSize: 8.5, color: "var(--text-muted)", textAlign: "center" }}>
          Backup bao gồm: sản phẩm · vị trí · người dùng · chat · đơn hàng · báo cáo
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PremiumCard>
  );
}

function VersionPanel() {
  const { updateReady, onUpdate } = useUpdateContext();
  return (
    <PremiumCard title="PHIÊN BẢN" icon={Info} iconColor="#0ea5e9" accentColor="#0ea5e9">
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(145deg, #0d1f38, #061020)", border: "1.5px solid rgba(201,165,90,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(201,165,90,0.15)" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#C9A55A", letterSpacing: "0.05em", fontFamily: "var(--font-montserrat), sans-serif" }}>ADL</span>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 700 }}>Postlain Store Manager</p>
            <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>v{APP_VERSION} · Đà Lạt{BUILD_DATE && <span style={{ color: "var(--text-muted)", opacity: 0.7 }}> · Build {BUILD_DATE}</span>}</p>
          </div>
        </div>
        {updateReady ? (
          <motion.button whileTap={{ scale: 0.96 }} onClick={onUpdate}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #C9A55A, #d4a84b)", color: "#0c1a2e", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            <RefreshCw size={10} /> CẬP NHẬT
          </motion.button>
        ) : (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <Check size={10} style={{ color: "#10b981" }} />
            <span style={{ fontSize: 9, color: "#10b981", fontWeight: 600 }}>Mới nhất</span>
          </motion.div>
        )}
      </div>
    </PremiumCard>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { currentUser, logout } = useStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const cardBg = "rgba(255,255,255,0.88)";
  const cardBorder = "rgba(186,230,253,0.55)";
  const cardShadow = "0 2px 14px rgba(12,26,46,0.07), inset 0 1px 0 rgba(255,255,255,0.7)";

  const [profile, setProfile] = useState<TeamMember | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [tab, setTab] = useState<"profile" | "team" | "leaderboard" | "settings">("profile");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", fullName: "", bio: "", phone: "", status: "working" as Status });
  const [saved, setSaved] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [oldPw, setOldPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok"|"err"; text: string } | null>(null);
  const [msg, setMsg] = useState("");
  const [posting, setPosting] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<"working" | "off_shift" | null>(null);
  const [odooStats, setOdooStats] = useState<{ sales: number; ipt: number; rank: string } | null>(null);
  const [lbMonth, setLbMonth] = useState(() => new Date().toISOString().slice(0, 7)); // "2026-03"
  type StaffSalesRow = { advisorName: string; advisorId: number; orders: number; qty: number; revenue: number; lines: number; byGroup: { group: string; revenue: number; qty: number }[] };
  const [staffSales, setStaffSales] = useState<StaffSalesRow[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  const load = async () => {
    if (!currentUser) return;
    const [p, t, a] = await Promise.all([
      fetch(`/api/profile?id=${currentUser.id}`).then(r => r.json()),
      fetch("/api/profile").then(r => r.json()),
      fetch("/api/activity").then(r => r.json()),
    ]);
    setProfile(p);
    setActivity(Array.isArray(a) ? a : []);
    const savedStatus = (p.status ?? "working") as Status;
    setForm({ name: p.name ?? "", fullName: p.fullName ?? "", bio: p.bio ?? "", phone: p.phone ?? "", status: savedStatus });

    // Compute schedule-based shift status for ALL members today
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const nowMins = now.getHours() * 60 + now.getMinutes();

      const shiftData = await fetch(`/api/shifts?dateFrom=${today}&dateTo=${today}`).then(r => r.json()).catch(() => ({}));
      const slots: Array<{ id: string; startTime: string; endTime: string }> = Array.isArray(shiftData?.slots) ? shiftData.slots : [];
      const registrations: Array<{ slotId: string; userId: string; status: string }> = Array.isArray(shiftData?.registrations) ? shiftData.registrations : [];

      const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };

      // Compute shift status for any userId
      const computeShiftStatus = (uid: string): "working" | "off_shift" | "day_off" => {
        const mySlotIds = new Set(
          registrations.filter(r => r.userId === uid && (r.status === "approved" || r.status === "pending")).map(r => r.slotId)
        );
        if (mySlotIds.size === 0) return "day_off";
        const inShift = slots.some(slot => {
          if (!mySlotIds.has(slot.id)) return false;
          const start = toMins(slot.startTime);
          const end   = toMins(slot.endTime);
          return end > start ? (nowMins >= start && nowMins < end) : (nowMins >= start || nowMins < end);
        });
        return inShift ? "working" : "off_shift";
      };

      // Override team members' status from schedule (preserve leave statuses)
      const teamData: TeamMember[] = (Array.isArray(t) ? t : []).map((m: TeamMember) => {
        const isLeave = STATUS_CFG[m.status]?.group === "leave";
        if (isLeave) return m;
        return { ...m, status: computeShiftStatus(m.id) };
      });
      setTeam(teamData);

      // Current user shift status
      const myShiftStatus = computeShiftStatus(currentUser.id);
      setScheduleStatus(myShiftStatus === "day_off" ? "off_shift" : myShiftStatus);

      // Auto-update current user's status in DB
      const isLeave = STATUS_CFG[savedStatus]?.group === "leave";
      if (!isLeave) {
        const autoStatus: Status = myShiftStatus;
        if (autoStatus !== savedStatus) {
          setForm(f => ({ ...f, status: autoStatus }));
          await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: currentUser.id, name: p.name ?? "", fullName: p.fullName ?? "", bio: p.bio ?? "", phone: p.phone ?? "", status: autoStatus, avatar: p.avatar }) });
        }
      }
    } catch {
      setTeam(Array.isArray(t) ? t : []);
    }

    // Fetch personal sales stats from pos_orders salesperson field
    try {
      const curMonth = new Date().toISOString().slice(0, 7);
      const salesRes = await fetch(`/api/odoo/advisor-sales?month=${curMonth}`).then(r => r.json()).catch(() => ({}));
      const rows: StaffSalesRow[] = Array.isArray(salesRes?.rows) ? salesRes.rows : [];
      setStaffSales(rows);
      const myName = (p.name ?? currentUser.name).toLowerCase();
      const myRow = rows.find(r => r.advisorName.toLowerCase().includes(myName) || myName.includes(r.advisorName.toLowerCase()));
      if (myRow) {
        const staffCount = rows.length || 1;
        const pos = rows.findIndex(r => r.advisorId === myRow.advisorId) + 1;
        const pct = pos / staffCount;
        const rank = pct <= 0.2 ? "Xuất sắc" : pct <= 0.4 ? "Tốt" : pct <= 0.6 ? "Trung bình" : pct <= 0.8 ? "Yếu" : "Kém";
        const ipt = myRow.orders > 0 ? myRow.qty / myRow.orders : 0;
        setOdooStats({ sales: myRow.revenue, ipt, rank });
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, [currentUser]);

  // Re-check shift status every 60 seconds (shift boundaries can change while page is open)
  useEffect(() => {
    if (!currentUser) return;
    const refreshShift = async () => {
      try {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const shiftData = await fetch(`/api/shifts?dateFrom=${today}&dateTo=${today}`).then(r => r.json()).catch(() => ({}));
        const slots: Array<{ id: string; startTime: string; endTime: string }> = Array.isArray(shiftData?.slots) ? shiftData.slots : [];
        const registrations: Array<{ slotId: string; userId: string; status: string }> = Array.isArray(shiftData?.registrations) ? shiftData.registrations : [];
        const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
        const mySlotIds = new Set(
          registrations.filter(r => r.userId === currentUser.id && (r.status === "approved" || r.status === "pending")).map(r => r.slotId)
        );
        if (mySlotIds.size === 0) { setScheduleStatus("off_shift"); return; }
        const inShift = slots.some(slot => {
          if (!mySlotIds.has(slot.id)) return false;
          const start = toMins(slot.startTime);
          const end = toMins(slot.endTime);
          return end > start ? (nowMins >= start && nowMins < end) : (nowMins >= start || nowMins < end);
        });
        setScheduleStatus(inShift ? "working" : "off_shift");
      } catch { /* ignore */ }
    };
    const interval = setInterval(refreshShift, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  useEffect(() => {
    setLbLoading(true);
    fetch(`/api/odoo/advisor-sales?month=${lbMonth}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d?.rows)) setStaffSales(d.rows); })
      .catch(() => {})
      .finally(() => setLbLoading(false));
  }, [lbMonth]);

  if (!currentUser) { router.replace("/login"); return null; }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: currentUser.id, ...form, avatar: dataUrl }) });
      load();
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: currentUser.id, ...form, avatar: profile?.avatar }) });
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
    load();
  };

  const handleStatusChange = async (s: string) => {
    setStatusOpen(false);
    const updated = { ...form, status: s as Status };
    setForm(updated);
    await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: currentUser.id, ...updated, avatar: profile?.avatar }) });
    load();
  };

  const handleChangePw = async () => {
    if (newPw.length < 4) { setPwMsg({ type: "err", text: "Tối thiểu 4 ký tự" }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: "err", text: "Mật khẩu không khớp" }); return; }
    const check = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: currentUser.email, password: oldPw }) });
    if (!check.ok) { setPwMsg({ type: "err", text: "Mật khẩu hiện tại không đúng" }); return; }
    await fetch("/api/auth", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: currentUser.id, name: currentUser.name, username: currentUser.email, role: currentUser.role, active: true, password: newPw }) });
    setPwMsg({ type: "ok", text: "Đã đổi mật khẩu" });
    setTimeout(() => { setPwMsg(null); setPwOpen(false); setOldPw(""); setNewPw(""); setConfirmPw(""); }, 1500);
  };

  const handlePost = async () => {
    if (!msg.trim() || posting) return;
    setPosting(true);
    await fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: currentUser.id, userName: currentUser.name, type: "message", content: msg.trim() }) });
    setMsg("");
    await load();
    setPosting(false);
  };

  const scfg = STATUS_CFG[form.status] ?? STATUS_CFG.working;
  const rcfg = ROLE_CFG[currentUser.role] ?? ROLE_CFG.staff;
  const RIcon = rcfg.icon;
  const isAdmin = currentUser.role === "admin";
  const isManager = currentUser.role === "admin" || currentUser.role === "manager";
  const canViewProfiles = isManager;

  const activeMembers = team.filter(m => m.active).length;

  const TABS = [
    { id: "profile" as const,      label: "Hồ Sơ",       icon: User       },
    { id: "team" as const,         label: "Nhóm",         icon: Users      },
    { id: "leaderboard" as const,  label: "Xếp Hạng",    icon: Trophy     },
    { id: "settings" as const,     label: "Cài Đặt",      icon: Settings   },
  ];

  const pwStrength = newPw.length === 0 ? 0 : newPw.length < 6 ? 1 : newPw.length < 10 ? 2 : 3;
  const pwStrengthColor = ["transparent", "#ef4444", "#f59e0b", "#10b981"][pwStrength];

  return (
    <div style={{ position: "relative", maxWidth: 860, margin: "0 auto" }}>
      {/* Staff profile modal */}
      <AnimatePresence>
        {viewingMember && (
          <StaffProfileModal member={viewingMember} onClose={() => setViewingMember(null)} />
        )}
      </AnimatePresence>

      {/* ── Floating Background Orbs ─────────────────────────────────────── */}
      <FloatingOrb x="5%"  y="10%" size={280} color="rgba(14,165,233,0.18)"   delay={0}   />
      <FloatingOrb x="70%" y="5%"  size={200} color="rgba(201,165,90,0.15)"  delay={2.5} />
      <FloatingOrb x="60%" y="55%" size={240} color="rgba(124,58,237,0.12)"  delay={1.2} />
      <FloatingOrb x="0%"  y="60%" size={180} color="rgba(16,185,129,0.12)"  delay={3.5} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 0 }}>

        {/* ── Hero Header ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 40px rgba(12,26,46,0.14)", marginBottom: 16 }}
        >
          {/* Cover */}
          <div style={{ height: 140, background: "linear-gradient(135deg, #0c1a2e 0%, #1e3a5f 40%, #0ea5e9 75%, #C9A55A 100%)", position: "relative", overflow: "hidden" }}>
            {/* Animated mesh overlay */}
            <motion.div
              animate={{ opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(14,165,233,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.06) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
            />
            {/* Rotating orb */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "conic-gradient(from 0deg, transparent, rgba(201,165,90,0.15) 25%, transparent 50%, rgba(14,165,233,0.12) 75%, transparent)", filter: "blur(8px)" }}
            />
            {/* Particles */}
            {[
              { x: "15%", y: "25%", s: 4 }, { x: "75%", y: "60%", s: 3 },
              { x: "55%", y: "20%", s: 3 }, { x: "30%", y: "75%", s: 2 },
            ].map((p, i) => (
              <motion.div key={i}
                animate={{ opacity: [0, 0.7, 0], scale: [0, 1, 0], y: [0, -20] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, repeatDelay: 1.5 }}
                style={{ position: "absolute", left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: "50%", background: "linear-gradient(135deg, #C9A55A, #0ea5e9)" }}
              />
            ))}
            {/* Corner brackets */}
            {[
              { top: "12%", left: "3%",  br: "0 0 6px 0",  bRight: "1px solid rgba(201,165,90,0.5)", bBot: "1px solid rgba(201,165,90,0.5)" },
              { top: "12%", right: "3%", br: "0 0 0 6px",  bLeft:  "1px solid rgba(201,165,90,0.5)", bBot: "1px solid rgba(201,165,90,0.5)" },
              { bottom: "12%", left: "3%",  br: "0 6px 0 0", bRight: "1px solid rgba(14,165,233,0.4)", bTop: "1px solid rgba(14,165,233,0.4)" },
              { bottom: "12%", right: "3%", br: "6px 0 0 0", bLeft:  "1px solid rgba(14,165,233,0.4)", bTop: "1px solid rgba(14,165,233,0.4)" },
            ].map((c, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                style={{ position: "absolute", width: 16, height: 16, borderRadius: c.br, ...c }}
              />
            ))}
          </div>

          <div style={{ background: "#fff", padding: "0 20px 20px" }}>
            {/* Avatar row */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -52 }}>
              <div style={{ position: "relative" }}>
                <Avatar src={profile?.avatar} name={currentUser.name} size={96} status={form.status} ring />
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.94 }}
                  onClick={() => fileRef.current?.click()}
                  style={{ position: "absolute", bottom: 4, right: 4, width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #C9A55A, #d4a84b)", border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 3, boxShadow: "0 2px 8px rgba(201,165,90,0.4)" }}>
                  <Camera size={12} style={{ color: "#fff" }} />
                </motion.button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
              </div>

              <div style={{ flex: 1, paddingBottom: 4, paddingTop: 52 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", fontFamily: "var(--font-montserrat), sans-serif" }}>
                    {profile?.fullName || currentUser.name}
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    style={{ padding: "3px 10px", borderRadius: 20, background: `${rcfg.color}14`, border: `1px solid ${rcfg.color}35`, display: "flex", alignItems: "center", gap: 5, boxShadow: `0 0 10px ${rcfg.color}20` }}>
                    <RIcon size={10} style={{ color: rcfg.color }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: rcfg.color, letterSpacing: "0.06em" }}>{rcfg.label}</span>
                  </motion.div>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>@{currentUser.email}</p>
                {profile?.bio && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>"{profile.bio}"</p>}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, paddingTop: 52, paddingBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-base)" }}>
                  <div style={{ position: "relative", width: 8, height: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: scfg.color }} />
                    {form.status === "working" && (
                      <motion.div animate={{ scale: [1, 2], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
                        style={{ position: "absolute", inset: 0, borderRadius: "50%", background: scfg.color }} />
                    )}
                  </div>
                  <span style={{ fontSize: 9, color: scfg.color, fontWeight: 600 }}>{scfg.label}</span>
                </div>
                <motion.button
                  whileHover={{ background: "rgba(220,38,38,0.08)" }} whileTap={{ scale: 0.96 }}
                  onClick={() => { logout(); router.replace("/login"); }}
                  style={{ padding: "7px 12px", borderRadius: 10, border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.05)", color: "#dc2626", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                  <LogOut size={11} /> THOÁT
                </motion.button>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              {[
                { label: "Thành viên", value: activeMembers, icon: Users,    color: "#10b981", fmt: (v: number | string) => String(v) },
                { label: "Doanh số",   value: odooStats?.sales ?? null, icon: Zap,     color: "#C9A55A", fmt: (v: number | string) => typeof v === "number" ? (v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${Math.round(v/1e3)}K`) : "—" },
                { label: "IPT",        value: odooStats?.ipt ?? null,   icon: Activity, color: "#0ea5e9", fmt: (v: number | string) => typeof v === "number" ? (v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(Math.round(v as number))) : "—" },
                { label: "Xếp hạng",  value: odooStats?.rank ?? null,  icon: Award,   color: "#7c3aed", fmt: (v: number | string) => v == null ? "—" : String(v) },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -2 }}
                  style={{
                    flex: 1, padding: "10px 6px", borderRadius: 12, textAlign: "center",
                    background: `${s.color}07`, border: `1px solid ${s.color}20`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  }}
                >
                  <s.icon size={12} style={{ color: s.color }} />
                  <span style={{ fontSize: s.value == null ? 10 : 14, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{s.value == null ? "—" : s.fmt(s.value)}</span>
                  <span style={{ fontSize: 7.5, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 3,
          background: cardBg,
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          borderRadius: 16, border: `1px solid ${cardBorder}`, padding: 5, marginBottom: 16,
          boxShadow: cardShadow,
          transition: "background 0.5s, border-color 0.5s",
        }}>
          {TABS.map(t => {
            const TIcon = t.icon;
            const active = tab === t.id;
            return (
              <motion.button
                key={t.id}
                onClick={() => setTab(t.id)}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1, padding: "9px 4px", borderRadius: 11, border: "none", cursor: "pointer",
                  fontFamily: "inherit", position: "relative",
                  background: active ? "linear-gradient(135deg, #C9A55A, #d4a84b)" : "transparent",
                  color: active ? "#fff" : "var(--text-muted)",
                  fontSize: 9.5, fontWeight: active ? 700 : 500,
                  transition: "all 0.18s",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  boxShadow: active ? "0 2px 10px rgba(201,165,90,0.3)" : "none",
                }}
              >
                <TIcon size={13} />
                {t.label}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >

            {/* ── Profile tab ── */}
            {tab === "profile" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Info card */}
                <div style={{ borderRadius: 16, border: `1px solid ${cardBorder}`, background: cardBg, overflow: "hidden", boxShadow: cardShadow, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                  <div style={{ padding: "13px 20px", borderBottom: "1px solid var(--border-subtle)", background: "linear-gradient(90deg, rgba(14,165,233,0.05), #fff)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 3, height: 14, borderRadius: 2, background: "#0ea5e9", boxShadow: "0 0 6px rgba(14,165,233,0.5)" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <User size={12} style={{ color: "#0ea5e9" }} />
                        <p style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.18em", textTransform: "uppercase" }}>THÔNG TIN CÁ NHÂN</p>
                      </div>
                    </div>
                    {!editing
                      ? <motion.button whileHover={{ background: "var(--bg-base)" }} whileTap={{ scale: 0.96 }} onClick={() => setEditing(true)}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 8.5, color: "#0ea5e9", fontWeight: 700 }}>
                          <Edit2 size={9} /> CHỈNH SỬA
                        </motion.button>
                      : <div style={{ display: "flex", gap: 6 }}>
                          <motion.button whileTap={{ scale: 0.96 }} onClick={handleSave}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 8, border: "none", background: saved ? "#10b981" : "linear-gradient(135deg, #C9A55A, #d4a84b)", color: saved ? "#fff" : "#0c1a2e", cursor: "pointer", fontFamily: "inherit", fontSize: 8.5, fontWeight: 700 }}>
                            <Check size={9} /> {saved ? "ĐÃ LƯU" : "LƯU"}
                          </motion.button>
                          <button onClick={() => setEditing(false)}
                            style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                            <X size={9} style={{ color: "var(--text-muted)" }} />
                          </button>
                        </div>
                    }
                  </div>

                  {[
                    { label: "Tên hiển thị", key: "name" as const,     icon: User,     placeholder: "Tên trong app" },
                    { label: "Họ và tên",    key: "fullName" as const,  icon: User,     placeholder: "Nguyễn Văn A" },
                    { label: "Số điện thoại",key: "phone" as const,     icon: Phone,    placeholder: "0901 234 567" },
                    { label: "Giới thiệu",   key: "bio" as const,       icon: FileText, placeholder: "Một câu giới thiệu..." },
                  ].map((f, i) => {
                    const FIcon = f.icon;
                    return (
                      <div key={f.key}>
                        {i > 0 && <div style={{ height: 1, background: "var(--border-subtle)", margin: "0 20px" }} />}
                        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <FIcon size={12} style={{ color: "#0ea5e9" }} />
                          </div>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", width: 110, flexShrink: 0 }}>{f.label}</span>
                          {editing
                            ? <input value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                                placeholder={f.placeholder}
                                className="input-glow"
                                style={{ flex: 1, padding: "7px 11px", fontSize: 11 }} />
                            : <span style={{ fontSize: 11, color: form[f.key] ? "var(--text-primary)" : "var(--border-strong)", fontStyle: form[f.key] ? "normal" : "italic", fontWeight: form[f.key] ? 500 : 400 }}>
                                {form[f.key] || f.placeholder}
                              </span>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stats chips */}
                <div style={{ display: "flex", gap: 8 }}>
                  <StatChip icon={Users}    value={activeMembers}                                                                 label="Thành viên" color="#10b981" />
                  <StatChip icon={Zap}      value={odooStats ? (odooStats.sales >= 1e6 ? `${(odooStats.sales/1e6).toFixed(1)}M` : `${Math.round(odooStats.sales/1e3)}K`) : "—"} label="Doanh số"   color="#C9A55A" />
                  <StatChip icon={Activity} value={odooStats ? (odooStats.ipt >= 1000 ? `${(odooStats.ipt/1000).toFixed(0)}K` : String(Math.round(odooStats.ipt))) : "—"}           label="IPT"        color="#0ea5e9" />
                  <StatChip icon={Award}    value={odooStats?.rank ?? "—"}                                                        label="Xếp hạng"   color="#7c3aed" />
                </div>

                {/* Password change */}
                <div style={{ borderRadius: 16, border: `1px solid ${cardBorder}`, background: cardBg, overflow: "hidden", boxShadow: cardShadow, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", transition: "background 0.5s, border-color 0.5s" }}>
                  <motion.button whileHover={{ background: "var(--bg-base)" }} onClick={() => setPwOpen(v => !v)}
                    style={{ width: "100%", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "background 0.15s" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Lock size={12} style={{ color: "#dc2626" }} />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-primary)", flex: 1, fontWeight: 600 }}>Đổi mật khẩu</span>
                    <motion.div animate={{ rotate: pwOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
                    </motion.div>
                  </motion.button>
                  <AnimatePresence>
                    {pwOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
                        <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border-subtle)" }}>
                          {pwMsg && (
                            <div style={{ padding: "8px 12px", borderRadius: 8, background: pwMsg.type === "ok" ? "rgba(16,185,129,0.08)" : "rgba(220,38,38,0.06)", border: `1px solid ${pwMsg.type === "ok" ? "rgba(16,185,129,0.2)" : "rgba(220,38,38,0.15)"}`, fontSize: 10, color: pwMsg.type === "ok" ? "#10b981" : "#dc2626", marginTop: 8 }}>
                              {pwMsg.text}
                            </div>
                          )}
                          {[
                            { label: "Mật khẩu hiện tại", val: oldPw, set: setOldPw },
                            { label: "Mật khẩu mới", val: newPw, set: setNewPw },
                            { label: "Xác nhận", val: confirmPw, set: setConfirmPw },
                          ].map((f, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: i === 0 ? 12 : 0 }}>
                              <span style={{ fontSize: 10, color: "var(--text-muted)", width: 140, flexShrink: 0 }}>{f.label}</span>
                              <div className="input-glow" style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 10px", height: 36 }}>
                                <input type={showPw ? "text" : "password"} value={f.val} onChange={e => f.set(e.target.value)}
                                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 11, fontFamily: "inherit", color: "var(--text-primary)" }} />
                                {i === 0 && <button onClick={() => setShowPw(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                                  {showPw ? <EyeOff size={12} style={{ color: "var(--text-muted)" }} /> : <Eye size={12} style={{ color: "var(--text-muted)" }} />}
                                </button>}
                              </div>
                            </div>
                          ))}
                          {newPw && (
                            <div style={{ paddingLeft: 150 }}>
                              <div style={{ height: 3, borderRadius: 2, background: "var(--border-subtle)", overflow: "hidden" }}>
                                <motion.div animate={{ width: `${(pwStrength / 3) * 100}%` }} transition={{ duration: 0.3 }}
                                  style={{ height: "100%", background: pwStrengthColor, borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 8.5, color: pwStrengthColor, fontWeight: 600, marginTop: 2, display: "block" }}>
                                {["", "Yếu", "Trung bình", "Mạnh"][pwStrength]}
                              </span>
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                            <motion.button whileTap={{ scale: 0.96 }} onClick={handleChangePw}
                              style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #dc2626, #b91c1c)", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              ĐỔI MẬT KHẨU
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            )}

            {/* ── Team tab ── */}
            {tab === "team" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Section label */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(14,165,233,0.25)", background: "rgba(14,165,233,0.06)", width: "fit-content" }}>
                  <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ width: 5, height: 5, borderRadius: "50%", background: "#0ea5e9", boxShadow: "0 0 6px rgba(14,165,233,0.8)" }} />
                  <span style={{ fontSize: 9, color: "rgba(14,165,233,0.8)", letterSpacing: "0.15em", fontWeight: 600 }}>
                    {team.filter(m => m.active).length} THÀNH VIÊN ĐANG HOẠT ĐỘNG
                  </span>
                </div>
                {canViewProfiles && (
                  <div style={{ fontSize: 9, color: "rgba(14,165,233,0.7)", padding: "0 2px 4px", display: "flex", alignItems: "center", gap: 4 }}>
                    <Info size={9} style={{ color: "rgba(14,165,233,0.6)" }} />
                    Nhấn vào thẻ nhân viên để xem hồ sơ chi tiết
                  </div>
                )}
                {team.filter(m => m.active).map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <TeamCard member={m} isMe={m.id === currentUser.id} canView={canViewProfiles} onView={() => setViewingMember(m)} />
                  </motion.div>
                ))}
                {team.filter(m => !m.active).length > 0 && (
                  <>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(148,163,184,0.06)", width: "fit-content", marginTop: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#94a3b8" }} />
                      <span style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", fontWeight: 600 }}>ĐÃ VÔ HIỆU HÓA</span>
                    </div>
                    {team.filter(m => !m.active).map(m => (
                      <div key={m.id} style={{ opacity: 0.4 }}><TeamCard member={m} isMe={false} canView={canViewProfiles} onView={() => setViewingMember(m)} /></div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── Leaderboard tab ── */}
            {tab === "leaderboard" && (() => {
              const myName = (profile?.name ?? currentUser.name).toLowerCase();
              const maxRev = staffSales[0]?.revenue ?? 1;
              const rankColors: Record<string, string> = { "Xuất sắc": "#C9A55A", "Tốt": "#10b981", "Trung bình": "#0ea5e9", "Yếu": "#f59e0b", "Kém": "#ef4444" };
              const medals = ["🥇", "🥈", "🥉"];
              // Month navigation
              const prevMonth = () => {
                const [y, m] = lbMonth.split("-").map(Number);
                const d = new Date(y, m - 2, 1);
                setLbMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
              };
              const nextMonth = () => {
                const [y, m] = lbMonth.split("-").map(Number);
                const d = new Date(y, m, 1);
                const now = new Date();
                if (d.getFullYear() > now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() >= now.getMonth())) return;
                setLbMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
              };
              const [ly, lm] = lbMonth.split("-").map(Number);
              const monthLabel = new Date(ly, lm - 1, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Month selector */}
                  <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--border)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 12px rgba(14,165,233,0.05)" }}>
                    <Trophy size={16} style={{ color: "#C9A55A" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1, fontFamily: "var(--font-montserrat), sans-serif" }}>BẢNG XẾP HẠNG DOANH SỐ</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={prevMonth}
                        style={{ width: 26, height: 26, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <ChevronLeft size={12} style={{ color: "var(--text-muted)" }} />
                      </motion.button>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", minWidth: 100, textAlign: "center" }}>{monthLabel}</span>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={nextMonth}
                        style={{ width: 26, height: 26, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
                      </motion.button>
                    </div>
                  </div>

                  {lbLoading ? (
                    <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 12 }}>Đang tải...</div>
                  ) : staffSales.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 12 }}>
                      <BarChart2 size={32} style={{ color: "var(--border-strong)", marginBottom: 8 }} />
                      <div>Chưa có dữ liệu — chạy đồng bộ Odoo để cập nhật</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {staffSales.map((row, i) => {
                        const isMe = row.advisorName.toLowerCase().includes(myName) || myName.includes(row.advisorName.toLowerCase());
                        const barPct = maxRev > 0 ? row.revenue / maxRev : 0;
                        const staffCount = staffSales.length;
                        const posPct = (i + 1) / staffCount;
                        const rank = posPct <= 0.2 ? "Xuất sắc" : posPct <= 0.4 ? "Tốt" : posPct <= 0.6 ? "Trung bình" : posPct <= 0.8 ? "Yếu" : "Kém";
                        const rankColor = rankColors[rank] ?? "#64748b";
                        const ipt = row.orders > 0 ? row.qty / row.orders : 0;
                        return (
                          <motion.div key={row.advisorId}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                              background: isMe ? "linear-gradient(135deg, rgba(201,165,90,0.06), rgba(14,165,233,0.04))" : "#fff",
                              border: isMe ? "1.5px solid rgba(201,165,90,0.35)" : "1px solid var(--border)",
                              borderRadius: 14, padding: "14px 16px", boxShadow: isMe ? "0 4px 20px rgba(201,165,90,0.12)" : "0 1px 4px rgba(0,0,0,0.04)",
                            }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 10, background: i < 3 ? `${rankColor}15` : "var(--bg-base)", border: `1.5px solid ${i < 3 ? rankColor : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {i < 3 ? <span style={{ fontSize: 15 }}>{medals[i]}</span> : <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)" }}>#{i + 1}</span>}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{row.advisorName}</span>
                                  {isMe && <span style={{ fontSize: 7, color: "#0ea5e9", background: "rgba(14,165,233,0.1)", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>BẠN</span>}
                                  <span style={{ fontSize: 8, fontWeight: 700, color: rankColor, background: `${rankColor}12`, padding: "1px 8px", borderRadius: 10, border: `1px solid ${rankColor}25` }}>{rank}</span>
                                </div>
                                {/* Revenue bar */}
                                <div style={{ marginTop: 5, height: 4, background: "var(--bg-base)", borderRadius: 4, overflow: "hidden" }}>
                                  <motion.div
                                    initial={{ width: 0 }} animate={{ width: `${barPct * 100}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                                    style={{ height: "100%", borderRadius: 4, background: i === 0 ? "linear-gradient(90deg, #C9A55A, #e6c474)" : i === 1 ? "linear-gradient(90deg, #94a3b8, #cbd5e1)" : i === 2 ? "linear-gradient(90deg, #c07a38, #d4956a)" : `linear-gradient(90deg, ${rankColor}80, ${rankColor})` }}
                                  />
                                </div>
                                {/* Product group breakdown pills */}
                                {row.byGroup && row.byGroup.length > 0 && (
                                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                                    {row.byGroup.filter(g => g.group !== "Undefined").map(g => (
                                      <span key={g.group} style={{ fontSize: 7.5, padding: "2px 7px", borderRadius: 8, background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                                        {g.group}: {g.revenue >= 1e6 ? `${(g.revenue/1e6).toFixed(1)}M` : `${Math.round(g.revenue/1e3)}K`}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
                                    {row.revenue >= 1e9 ? `${(row.revenue / 1e9).toFixed(2)}B` : row.revenue >= 1e6 ? `${(row.revenue / 1e6).toFixed(1)}M` : `${Math.round(row.revenue / 1e3)}K`}
                                  </div>
                                  <div style={{ fontSize: 7.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Doanh số</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0ea5e9" }}>{row.orders}</div>
                                  <div style={{ fontSize: 7.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Đơn</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: 14, fontWeight: 800, color: "#7c3aed" }}>{ipt.toFixed(1)}</div>
                                  <div style={{ fontSize: 7.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>IPT</div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary totals */}
                  {staffSales.length > 0 && (() => {
                    const totalRev = staffSales.reduce((s, r) => s + r.revenue, 0);
                    const totalOrders = staffSales.reduce((s, r) => s + r.orders, 0);
                    return (
                      <div style={{ background: "linear-gradient(135deg, rgba(12,26,46,0.04), rgba(14,165,233,0.04))", borderRadius: 14, border: "1px solid var(--border)", padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 8 }}>
                          <TrendingUp size={12} style={{ color: "#C9A55A" }} />
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Tổng Cộng Tháng</span>
                        </div>
                        <div style={{ display: "flex", gap: 20 }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                              {totalRev >= 1e9 ? `${(totalRev / 1e9).toFixed(2)}B` : `${(totalRev / 1e6).toFixed(1)}M`}
                            </div>
                            <div style={{ fontSize: 7.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Doanh số team</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "#0ea5e9" }}>{totalOrders}</div>
                            <div style={{ fontSize: 7.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Đơn hàng</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}>{staffSales.length}</div>
                            <div style={{ fontSize: 7.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Nhân viên</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* ── Settings tab ── */}
            {tab === "settings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <DisplayPanel />
                <PushPanel userId={currentUser.id} />
                <SecurityPanel currentUser={{ id: currentUser.id, email: currentUser.email, name: currentUser.name, role: currentUser.role }} />
                {isAdmin && <UsersPanel />}
                {isAdmin && <BackupPanel currentUser={{ id: currentUser.id }} />}
                <VersionPanel />
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        <div style={{ height: 32 }} />
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
