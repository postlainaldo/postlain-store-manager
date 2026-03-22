"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Check, X, Edit2, Phone, FileText,
  Crown, UserCheck, User, Circle, Send,
  Lock, Eye, EyeOff, LogOut, ChevronDown,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Status = "online" | "busy" | "away" | "offline";
type Activity = { id: string; userId: string; userName: string; type: string; content: string; createdAt: string };
type TeamMember = { id: string; name: string; fullName: string; username: string; role: string; active: number; avatar: string | null; status: string; bio: string; phone: string; createdAt: string };

const STATUS_CFG: Record<Status, { label: string; color: string }> = {
  online:  { label: "Đang hoạt động", color: "#10b981" },
  busy:    { label: "Bận",            color: "#f59e0b" },
  away:    { label: "Vắng mặt",       color: "#94a3b8" },
  offline: { label: "Ngoại tuyến",    color: "#cbd5e1" },
};

const ROLE_CFG: Record<string, { label: string; color: string; icon: typeof User }> = {
  admin:   { label: "Admin",    color: "#C9A55A", icon: Crown     },
  manager: { label: "Quản Lý", color: "#0ea5e9", icon: UserCheck },
  staff:   { label: "Nhân Viên",color: "#64748b", icon: User      },
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

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 80, status }: { src?: string | null; name: string; size?: number; status?: string }) {
  const color = STATUS_CFG[(status as Status) ?? "offline"]?.color ?? "#cbd5e1";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: src ? "transparent" : "linear-gradient(135deg, #0c1a2e, #1e3a5f)",
        border: "2px solid #bae6fd", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {src
          ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "#C9A55A" }}>{name.slice(0, 1).toUpperCase()}</span>
        }
      </div>
      {status && (
        <div style={{
          position: "absolute", bottom: 2, right: 2,
          width: size * 0.22, height: size * 0.22,
          borderRadius: "50%", background: color,
          border: "2px solid #fff",
        }} />
      )}
    </div>
  );
}

// ─── Activity item ─────────────────────────────────────────────────────────────

function ActivityItem({ item, members }: { item: Activity; members: TeamMember[] }) {
  const member = members.find(m => m.id === item.userId);
  const isMsg = item.type === "message";
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0" }}>
      <Avatar src={member?.avatar} name={item.userName} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0c1a2e" }}>{item.userName}</span>
          {!isMsg && <span style={{ fontSize: 10, color: "#64748b" }}>{item.content}</span>}
          <span style={{ fontSize: 9, color: "#b0c4d8" }}>{timeAgo(item.createdAt)}</span>
        </div>
        {isMsg && (
          <div style={{
            marginTop: 4, padding: "8px 12px", borderRadius: "0 10px 10px 10px",
            background: "#f0f9ff", border: "1px solid #bae6fd",
            fontSize: 11, color: "#0c1a2e", lineHeight: 1.5,
          }}>
            {item.content}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Team card ─────────────────────────────────────────────────────────────────

function TeamCard({ member, isMe }: { member: TeamMember; isMe: boolean }) {
  const rcfg = ROLE_CFG[member.role] ?? ROLE_CFG.staff;
  const scfg = STATUS_CFG[(member.status as Status)] ?? STATUS_CFG.offline;
  const RIcon = rcfg.icon;
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 14, border: `1px solid ${isMe ? "#bae6fd" : "#e0f2fe"}`,
      background: isMe ? "#f0f9ff" : "#fff",
      display: "flex", gap: 12, alignItems: "center",
    }}>
      <Avatar src={member.avatar} name={member.name} size={44} status={member.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#0c1a2e" }}>{member.name}</p>
          {isMe && <span style={{ fontSize: 7, color: "#0ea5e9", background: "rgba(14,165,233,0.1)", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>BẠN</span>}
        </div>
        {member.fullName && <p style={{ fontSize: 9, color: "#64748b", marginTop: 1 }}>{member.fullName}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <div style={{ padding: "1px 7px", borderRadius: 20, background: `${rcfg.color}15`, border: `1px solid ${rcfg.color}44`, display: "flex", alignItems: "center", gap: 4 }}>
            <RIcon size={8} style={{ color: rcfg.color }} />
            <span style={{ fontSize: 7.5, fontWeight: 700, color: rcfg.color }}>{rcfg.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Circle size={6} style={{ color: scfg.color, fill: scfg.color }} />
            <span style={{ fontSize: 8, color: "#94a3b8" }}>{scfg.label}</span>
          </div>
        </div>
        {member.bio && <p style={{ fontSize: 9, color: "#94a3b8", marginTop: 4, fontStyle: "italic" }}>"{member.bio}"</p>}
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { currentUser, logout } = useStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<TeamMember | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [tab, setTab] = useState<"profile" | "team" | "feed">("profile");

  // Edit state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", fullName: "", bio: "", phone: "", status: "online" as Status });
  const [saved, setSaved] = useState(false);

  // Password change
  const [pwOpen, setPwOpen] = useState(false);
  const [oldPw, setOldPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok"|"err"; text: string } | null>(null);

  // Message
  const [msg, setMsg] = useState("");
  const [posting, setPosting] = useState(false);

  // Status dropdown
  const [statusOpen, setStatusOpen] = useState(false);

  const load = async () => {
    if (!currentUser) return;
    const [p, t, a] = await Promise.all([
      fetch(`/api/profile?id=${currentUser.id}`).then(r => r.json()),
      fetch("/api/profile").then(r => r.json()),
      fetch("/api/activity").then(r => r.json()),
    ]);
    setProfile(p);
    setTeam(Array.isArray(t) ? t : []);
    setActivity(Array.isArray(a) ? a : []);
    setForm({ name: p.name ?? "", fullName: p.fullName ?? "", bio: p.bio ?? "", phone: p.phone ?? "", status: (p.status ?? "online") as Status });
  };

  useEffect(() => { load(); }, [currentUser]);

  if (!currentUser) { router.replace("/login"); return null; }

  // ── Handlers ──

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentUser.id, ...form, avatar: dataUrl }),
      });
      load();
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentUser.id, ...form, avatar: profile?.avatar }),
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
    load();
  };

  const handleStatusChange = async (s: Status) => {
    setStatusOpen(false);
    const updated = { ...form, status: s };
    setForm(updated);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentUser.id, ...updated, avatar: profile?.avatar }),
    });
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
    setTab("feed");
  };

  const scfg = STATUS_CFG[form.status] ?? STATUS_CFG.online;
  const rcfg = ROLE_CFG[currentUser.role] ?? ROLE_CFG.staff;
  const RIcon = rcfg.icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860, margin: "0 auto" }}>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ borderRadius: 20, background: "#fff", border: "1px solid #bae6fd", overflow: "hidden", boxShadow: "0 4px 24px rgba(14,165,233,0.06)" }}>

        {/* Banner */}
        <div style={{ height: 80, background: "linear-gradient(135deg, #0c1a2e 0%, #1e3a5f 60%, #C9A55A 100%)" }} />

        <div style={{ padding: "0 24px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -36 }}>
            {/* Avatar + upload */}
            <div style={{ position: "relative" }}>
              <Avatar src={profile?.avatar} name={currentUser.name} size={72} status={form.status} />
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#0ea5e9", border: "2px solid #fff",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                <Camera size={10} style={{ color: "#fff" }} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
            </div>

            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#0c1a2e" }}>{profile?.fullName || currentUser.name}</p>
                <div style={{ padding: "2px 8px", borderRadius: 20, background: `${rcfg.color}15`, border: `1px solid ${rcfg.color}44`, display: "flex", alignItems: "center", gap: 4 }}>
                  <RIcon size={9} style={{ color: rcfg.color }} />
                  <span style={{ fontSize: 8, fontWeight: 700, color: rcfg.color }}>{rcfg.label}</span>
                </div>
              </div>
              <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>@{currentUser.email}</p>
            </div>

            {/* Status selector */}
            <div style={{ position: "relative", paddingBottom: 4 }}>
              <button
                onClick={() => setStatusOpen(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, border: "1px solid #bae6fd", background: "#f0f9ff", cursor: "pointer", fontFamily: "inherit" }}>
                <Circle size={8} style={{ color: scfg.color, fill: scfg.color }} />
                <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>{scfg.label}</span>
                <ChevronDown size={9} style={{ color: "#94a3b8" }} />
              </button>
              <AnimatePresence>
                {statusOpen && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "#fff", border: "1px solid #bae6fd", borderRadius: 10, overflow: "hidden", zIndex: 50, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                    {(Object.entries(STATUS_CFG) as [Status, { label: string; color: string }][]).map(([key, cfg]) => (
                      <button key={key} onClick={() => handleStatusChange(key)}
                        style={{ width: "100%", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, background: form.status === key ? "#f0f9ff" : "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                        <Circle size={8} style={{ color: cfg.color, fill: cfg.color }} />
                        <span style={{ fontSize: 10, color: "#0c1a2e" }}>{cfg.label}</span>
                        {form.status === key && <Check size={9} style={{ color: "#0ea5e9", marginLeft: "auto" }} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => { logout(); router.replace("/login"); }}
              style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.05)", color: "#dc2626", fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", paddingBottom: 8 }}>
              <LogOut size={10} style={{ display: "block", margin: "0 auto 2px" }} />
              THOÁT
            </button>
          </div>

          {profile?.bio && !editing && (
            <p style={{ fontSize: 11, color: "#64748b", marginTop: 10, fontStyle: "italic" }}>"{profile.bio}"</p>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, background: "#fff", borderRadius: 12, border: "1px solid #bae6fd", padding: 4 }}>
        {([["profile", "Hồ Sơ"], ["team", "Nhóm"], ["feed", "Hoạt Động"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              flex: 1, padding: "7px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
              background: tab === id ? "#0ea5e9" : "transparent",
              color: tab === id ? "#fff" : "#64748b",
              fontSize: 10, fontWeight: tab === id ? 700 : 400,
              transition: "all 0.15s",
            }}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

          {/* ── Profile tab ── */}
          {tab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Edit form */}
              <div style={{ borderRadius: 14, border: "1px solid #bae6fd", background: "#fff", overflow: "hidden" }}>
                <div style={{ padding: "10px 20px", borderBottom: "1px solid #e0f2fe", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 8, fontWeight: 700, color: "#64748b", letterSpacing: "0.2em" }}>THÔNG TIN CÁ NHÂN</p>
                  {!editing
                    ? <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 7, border: "1px solid #bae6fd", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 8, color: "#0ea5e9", fontWeight: 700 }}>
                        <Edit2 size={9} /> CHỈNH SỬA
                      </button>
                    : <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 7, border: "none", background: saved ? "#10b981" : "#0ea5e9", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 8, fontWeight: 700 }}>
                          <Check size={9} /> {saved ? "ĐÃ LƯU" : "LƯU"}
                        </button>
                        <button onClick={() => setEditing(false)} style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid #bae6fd", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 8, color: "#94a3b8" }}>
                          <X size={9} />
                        </button>
                      </div>
                  }
                </div>

                {[
                  { label: "Tên hiển thị", key: "name" as const, icon: User, placeholder: "Tên trong app" },
                  { label: "Họ và tên", key: "fullName" as const, icon: User, placeholder: "Nguyễn Văn A" },
                  { label: "Số điện thoại", key: "phone" as const, icon: Phone, placeholder: "0901 234 567" },
                  { label: "Giới thiệu", key: "bio" as const, icon: FileText, placeholder: "Một câu giới thiệu bản thân..." },
                ].map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.key}>
                      {i > 0 && <div style={{ height: 1, background: "#e0f2fe", margin: "0 20px" }} />}
                      <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                        <Icon size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: "#64748b", width: 120, flexShrink: 0 }}>{f.label}</span>
                        {editing
                          ? <input value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              style={{ flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }} />
                          : <span style={{ fontSize: 11, color: form[f.key] ? "#0c1a2e" : "#cbd5e1", fontStyle: form[f.key] ? "normal" : "italic" }}>
                              {form[f.key] || f.placeholder}
                            </span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Password change */}
              <div style={{ borderRadius: 14, border: "1px solid #bae6fd", background: "#fff", overflow: "hidden" }}>
                <button onClick={() => setPwOpen(v => !v)}
                  style={{ width: "100%", padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                  <Lock size={12} style={{ color: "#64748b" }} />
                  <span style={{ fontSize: 11, color: "#0c1a2e", flex: 1 }}>Đổi mật khẩu</span>
                  <ChevronDown size={12} style={{ color: "#94a3b8", transform: pwOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                <AnimatePresence>
                  {pwOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
                      <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #e0f2fe" }}>
                        {pwMsg && (
                          <div style={{ padding: "8px 12px", borderRadius: 8, background: pwMsg.type === "ok" ? "rgba(16,185,129,0.08)" : "rgba(220,38,38,0.06)", fontSize: 10, color: pwMsg.type === "ok" ? "#10b981" : "#dc2626", marginTop: 8 }}>
                            {pwMsg.text}
                          </div>
                        )}
                        {[
                          { label: "Mật khẩu hiện tại", val: oldPw, set: setOldPw },
                          { label: "Mật khẩu mới", val: newPw, set: setNewPw },
                          { label: "Xác nhận mật khẩu mới", val: confirmPw, set: setConfirmPw },
                        ].map((f, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: i === 0 ? 12 : 0 }}>
                            <span style={{ fontSize: 10, color: "#64748b", width: 160, flexShrink: 0 }}>{f.label}</span>
                            <div style={{ flex: 1, display: "flex", alignItems: "center", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "0 10px", height: 34 }}>
                              <input type={showPw ? "text" : "password"} value={f.val} onChange={e => f.set(e.target.value)}
                                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 11, fontFamily: "inherit", color: "#0c1a2e" }} />
                              {i === 0 && <button onClick={() => setShowPw(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                                {showPw ? <EyeOff size={11} style={{ color: "#94a3b8" }} /> : <Eye size={11} style={{ color: "#94a3b8" }} />}
                              </button>}
                            </div>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                          <button onClick={handleChangePw} style={{ padding: "7px 20px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                            ĐỔI MẬT KHẨU
                          </button>
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
              <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.1em", padding: "0 4px" }}>
                {team.filter(m => m.active).length} THÀNH VIÊN ĐANG HOẠT ĐỘNG
              </div>
              {team.filter(m => m.active).map(m => (
                <TeamCard key={m.id} member={m} isMe={m.id === currentUser.id} />
              ))}
              {team.filter(m => !m.active).length > 0 && (
                <>
                  <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.1em", padding: "8px 4px 0" }}>ĐÃ VÔ HIỆU HÓA</div>
                  {team.filter(m => !m.active).map(m => (
                    <div key={m.id} style={{ opacity: 0.45 }}><TeamCard member={m} isMe={false} /></div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Feed tab ── */}
          {tab === "feed" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Post box */}
              <div style={{ borderRadius: 14, border: "1px solid #bae6fd", background: "#fff", padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Avatar src={profile?.avatar} name={currentUser.name} size={32} />
                  <div style={{ flex: 1 }}>
                    <textarea
                      value={msg}
                      onChange={e => setMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
                      placeholder="Chia sẻ cập nhật với nhóm... (Enter để gửi)"
                      rows={2}
                      style={{
                        width: "100%", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10,
                        padding: "8px 12px", fontSize: 11, color: "#0c1a2e", fontFamily: "inherit",
                        resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.5,
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                      <button onClick={handlePost} disabled={!msg.trim() || posting}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "6px 14px", borderRadius: 8, border: "none",
                          background: msg.trim() ? "#0ea5e9" : "#e0f2fe",
                          color: msg.trim() ? "#fff" : "#94a3b8",
                          fontSize: 9, fontWeight: 700, cursor: msg.trim() ? "pointer" : "default", fontFamily: "inherit",
                        }}>
                        <Send size={10} /> GỬI
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feed */}
              <div style={{ borderRadius: 14, border: "1px solid #bae6fd", background: "#fff", overflow: "hidden" }}>
                <div style={{ padding: "8px 16px", borderBottom: "1px solid #e0f2fe", background: "#f0f9ff" }}>
                  <p style={{ fontSize: 8, fontWeight: 700, color: "#64748b", letterSpacing: "0.2em" }}>HOẠT ĐỘNG GẦN ĐÂY</p>
                </div>
                <div style={{ padding: "0 16px" }}>
                  {activity.length === 0 && (
                    <p style={{ padding: "20px 0", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>Chưa có hoạt động nào</p>
                  )}
                  {activity.map((item, i) => (
                    <div key={item.id}>
                      {i > 0 && <div style={{ height: 1, background: "#f0f9ff" }} />}
                      <ActivityItem item={item} members={team} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
