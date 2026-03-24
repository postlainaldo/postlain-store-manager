"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Check, X, Edit2, Phone, FileText,
  Crown, UserCheck, User, Circle, Send,
  Lock, Eye, EyeOff, LogOut, ChevronDown,
  Settings, Users, RefreshCw, Info,
  ToggleLeft, ToggleRight, Plus, Trash2,
  UserPlus, Activity, MessageSquare,
  Award,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import type { UserRole, AppUser } from "@/store/useStore";
import { useUpdateContext } from "@/components/Providers";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

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
        border: `${size > 40 ? 3 : 2}px solid rgba(201,165,90,0.5)`,
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: size > 40 ? "0 0 0 3px rgba(14,165,233,0.15), 0 8px 24px rgba(0,0,0,0.15)" : undefined,
      }}>
        {src
          ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "#C9A55A" }}>{name.slice(0, 1).toUpperCase()}</span>
        }
      </div>
      {status && (
        <div style={{
          position: "absolute", bottom: size > 40 ? 3 : 2, right: size > 40 ? 3 : 2,
          width: size * 0.22, height: size * 0.22,
          borderRadius: "50%", background: color,
          border: `2px solid #fff`,
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
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{
        padding: "14px 16px", borderRadius: 14,
        border: `1px solid ${isMe ? "#bae6fd" : "#e0f2fe"}`,
        background: isMe ? "linear-gradient(135deg, #f0f9ff, #e0f2fe20)" : "#fff",
        display: "flex", gap: 12, alignItems: "center",
        boxShadow: isMe ? "0 2px 12px rgba(14,165,233,0.08)" : undefined,
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
    </motion.div>
  );
}

// ─── Settings sub-components ──────────────────────────────────────────────────

function SCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 14, border: "1px solid #bae6fd", background: "#fff", overflow: "hidden" }}>
      <div style={{ padding: "8px 20px", borderBottom: "1px solid #e0f2fe", background: "#f0f9ff" }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: "#64748b", letterSpacing: "0.2em" }}>{title}</p>
      </div>
      <div style={{ padding: "4px 0" }}>{children}</div>
    </div>
  );
}

function SToggle({ label, desc, on, set }: { label: string; desc: string; on: boolean; set: (v: boolean) => void }) {
  const Icon = on ? ToggleRight : ToggleLeft;
  return (
    <div onClick={() => set(!on)} style={{ padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "background 0.1s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "#f0f9ff")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      <div>
        <p style={{ fontSize: 11, color: "#0c1a2e" }}>{label}</p>
        <p style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{desc}</p>
      </div>
      <Icon size={22} strokeWidth={1.5} style={{ flexShrink: 0, color: on ? "#C9A55A" : "#bae6fd", transition: "color 0.14s" }} />
    </div>
  );
}

function SInputRow({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 16 }}>
      <label style={{ fontSize: 11, color: "#64748b", flexShrink: 0, width: 140 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }}
        onFocus={e => (e.target.style.borderColor = "#0ea5e9")}
        onBlur={e => (e.target.style.borderColor = "#bae6fd")} />
    </div>
  );
}

function SDivider() { return <div style={{ height: 1, background: "#e0f2fe", margin: "0 20px" }} />; }

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
    setSaved(true); setTimeout(() => setSaved(false), 1400);
  };
  return (
    <SCard title="THÔNG TIN CỬA HÀNG">
      <SInputRow label="Tên cửa hàng" value={name} onChange={setName} />
      <SDivider />
      <SInputRow label="Địa chỉ" value={addr} onChange={setAddr} />
      <SDivider />
      <SInputRow label="Điện thoại" value={phone} onChange={setPhone} />
      <SDivider />
      <SInputRow label="Email" value={email} onChange={setEmail} />
      <SDivider />
      <div style={{ padding: "10px 20px", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSave} style={{ padding: "7px 20px", borderRadius: 8, border: "none", background: saved ? "#10b981" : "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          <Check size={10} /> {saved ? "ĐÃ LƯU" : "LƯU"}
        </button>
      </div>
    </SCard>
  );
}

function DisplayPanel() {
  const { uiAnimations, setUISetting } = useStore();
  return (
    <SCard title="GIAO DIỆN">
      <SToggle label="Hiệu ứng chuyển động" desc="Bật/tắt animation toàn app" on={!!uiAnimations} set={v => setUISetting("uiAnimations", v)} />
    </SCard>
  );
}

function NotifyPanel() {
  const { lowStockThreshold, setLowStockThreshold } = useStore();
  const [thresh, setThresh] = useState(String(lowStockThreshold ?? 5));
  const [saved, setSaved] = useState(false);
  const save = () => { setLowStockThreshold(Number(thresh) || 5); setSaved(true); setTimeout(() => setSaved(false), 1400); };
  return (
    <SCard title="THÔNG BÁO">
      <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <label style={{ fontSize: 11, color: "#64748b", flexShrink: 0, width: 140 }}>Ngưỡng cảnh báo tồn kho</label>
        <input type="number" value={thresh} onChange={e => setThresh(e.target.value)} min={1}
          style={{ width: 80, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }} />
        <button onClick={save} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: saved ? "#10b981" : "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {saved ? "ĐÃ LƯU" : "LƯU"}
        </button>
      </div>
    </SCard>
  );
}

function ShelvesPanel() {
  const { warehouseShelves, addWarehouseShelf, removeWarehouseShelf } = useStore();
  const [shelfType, setShelfType] = useState<"shoes" | "bags">("shoes");
  return (
    <SCard title="QUẢN LÝ KỆ KHO">
      <div style={{ padding: "4px 20px 12px" }}>
        {warehouseShelves.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f9ff" }}>
            <span style={{ fontSize: 11, color: "#0c1a2e" }}>{s.name}</span>
            <button onClick={() => removeWarehouseShelf(s.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <Trash2 size={12} style={{ color: "#dc2626" }} />
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <select value={shelfType} onChange={e => setShelfType(e.target.value as "shoes" | "bags")}
            style={{ flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }}>
            <option value="shoes">Kệ Giày</option>
            <option value="bags">Kệ Túi</option>
          </select>
          <button onClick={() => addWarehouseShelf(shelfType)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
            <Plus size={10} /> THÊM
          </button>
        </div>
      </div>
    </SCard>
  );
}

function UsersPanel() {
  const { users, currentUser, addUser, removeUser, updateUser } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", username: "", password: "", role: "staff" as UserRole });
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const handleAdd = async () => {
    if (!newUser.name.trim() || !newUser.username.trim() || !newUser.password.trim()) {
      setAddMsg("Điền đầy đủ thông tin"); return;
    }
    if (users.find(u => u.email === newUser.username.trim())) {
      setAddMsg("Tên đăng nhập đã tồn tại"); return;
    }
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", name: newUser.name.trim(), username: newUser.username.trim(), password: newUser.password.trim(), role: newUser.role }) });
    setAddMsg("Đã thêm người dùng");
    setTimeout(() => { setAddMsg(null); setShowAdd(false); setNewUser({ name: "", username: "", password: "", role: "staff" }); }, 1200);
  };

  const handleToggleActive = async (u: AppUser) => {
    const body = { id: u.id, name: u.name, username: u.email, role: u.role, active: !u.active };
    await fetch("/api/auth", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    updateUser(u.id, { active: !u.active });
  };

  return (
    <SCard title="NGƯỜI DÙNG">
      <div style={{ padding: "4px 20px 12px" }}>
        {users.map(u => {
          const rcfg = ROLE_CFG[u.role] ?? ROLE_CFG.staff;
          const RIcon = rcfg.icon;
          const isMe = u.id === currentUser?.id;
          return (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f0f9ff" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #0c1a2e, #1e3a5f)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#C9A55A" }}>{u.name.slice(0,1).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#0c1a2e" }}>{u.name}</span>
                  {isMe && <span style={{ fontSize: 7, color: "#0ea5e9", background: "rgba(14,165,233,0.1)", padding: "1px 5px", borderRadius: 10, fontWeight: 700 }}>BẠN</span>}
                </div>
                <span style={{ fontSize: 8, color: "#94a3b8" }}>@{u.email}</span>
              </div>
              <div style={{ padding: "2px 8px", borderRadius: 20, background: `${rcfg.color}15`, display: "flex", alignItems: "center", gap: 3 }}>
                <RIcon size={8} style={{ color: rcfg.color }} />
                <span style={{ fontSize: 7.5, fontWeight: 700, color: rcfg.color }}>{rcfg.label}</span>
              </div>
              {!isMe && (
                <button onClick={() => handleToggleActive(u)} style={{ padding: "3px 8px", borderRadius: 8, border: `1px solid ${u.active ? "rgba(16,185,129,0.3)" : "rgba(148,163,184,0.3)"}`, background: u.active ? "rgba(16,185,129,0.06)" : "rgba(148,163,184,0.06)", color: u.active ? "#10b981" : "#94a3b8", fontSize: 7.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {u.active ? "BẬT" : "TẮT"}
                </button>
              )}
            </div>
          );
        })}
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "1px dashed #bae6fd", background: "transparent", color: "#0ea5e9", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
            <UserPlus size={12} /> Thêm người dùng mới
          </button>
        ) : (
          <div style={{ marginTop: 10, padding: "14px", borderRadius: 12, border: "1px solid #bae6fd", background: "#f0f9ff", display: "flex", flexDirection: "column", gap: 8 }}>
            {addMsg && <div style={{ padding: "6px 10px", borderRadius: 8, background: addMsg.startsWith("Đã") ? "rgba(16,185,129,0.08)" : "rgba(220,38,38,0.06)", fontSize: 10, color: addMsg.startsWith("Đã") ? "#10b981" : "#dc2626" }}>{addMsg}</div>}
            {[["Tên hiển thị", "name"], ["Tên đăng nhập", "username"], ["Mật khẩu", "password"]].map(([lbl, key]) => (
              <input key={key} type={key === "password" ? "password" : "text"} placeholder={lbl} value={(newUser as Record<string,string>)[key]}
                onChange={e => setNewUser(v => ({ ...v, [key]: e.target.value }))}
                style={{ background: "#fff", border: "1px solid #bae6fd", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }} />
            ))}
            <select value={newUser.role} onChange={e => setNewUser(v => ({ ...v, role: e.target.value as UserRole }))}
              style={{ background: "#fff", border: "1px solid #bae6fd", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }}>
              <option value="staff">Nhân Viên</option>
              <option value="manager">Quản Lý</option>
              <option value="admin">Admin</option>
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAdd} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>THÊM</button>
              <button onClick={() => setShowAdd(false)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #bae6fd", background: "transparent", color: "#94a3b8", fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}><X size={10} /></button>
            </div>
          </div>
        )}
      </div>
    </SCard>
  );
}

function SecurityPanel({ currentUser }: { currentUser: { id: string; email: string; name: string; role: string } }) {
  const [oldPw, setOldPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confirmPw, setConfirmPw] = useState("");
  const [showOld, setShowOld] = useState(false); const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok"|"err"; text: string } | null>(null);

  const handleChange = async () => {
    if (newPw.length < 4) { setMsg({ type: "err", text: "Tối thiểu 4 ký tự" }); return; }
    if (newPw !== confirmPw) { setMsg({ type: "err", text: "Mật khẩu không khớp" }); return; }
    const check = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: currentUser.email, password: oldPw }) });
    if (!check.ok) { setMsg({ type: "err", text: "Mật khẩu hiện tại không đúng" }); return; }
    await fetch("/api/auth", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: currentUser.id, name: currentUser.name, username: currentUser.email, role: currentUser.role, active: true, password: newPw }) });
    setMsg({ type: "ok", text: "Đã đổi mật khẩu" });
    setTimeout(() => { setMsg(null); setOldPw(""); setNewPw(""); setConfirmPw(""); }, 1500);
  };

  const PwRow = ({ label, value, set, show, setShow }: { label: string; value: string; set: (v: string) => void; show: boolean; setShow: (v: boolean) => void }) => (
    <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12 }}>
      <label style={{ fontSize: 11, color: "#64748b", flexShrink: 0, width: 160 }}>{label}</label>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
        <input type={show ? "text" : "password"} value={value} onChange={e => set(e.target.value)}
          style={{ flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }} />
        <button onClick={() => setShow(!show)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#94a3b8" }}>
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  );

  return (
    <SCard title="ĐỔI MẬT KHẨU">
      {msg && <div style={{ margin: "8px 20px 0", padding: "6px 12px", borderRadius: 8, background: msg.type === "ok" ? "rgba(16,185,129,0.08)" : "rgba(220,38,38,0.06)", fontSize: 10, color: msg.type === "ok" ? "#10b981" : "#dc2626" }}>{msg.text}</div>}
      <PwRow label="Mật khẩu hiện tại" value={oldPw} set={setOldPw} show={showOld} setShow={setShowOld} />
      <SDivider />
      <PwRow label="Mật khẩu mới" value={newPw} set={setNewPw} show={showNew} setShow={setShowNew} />
      <SDivider />
      <PwRow label="Xác nhận mật khẩu mới" value={confirmPw} set={setConfirmPw} show={showNew} setShow={setShowNew} />
      <div style={{ padding: "8px 20px 12px", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleChange} style={{ padding: "7px 20px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1em" }}>
          ĐỔI MẬT KHẨU
        </button>
      </div>
    </SCard>
  );
}

function PushPanel({ userId }: { userId: string }) {
  const [permStatus, setPermStatus] = useState("...");
  const [subCount, setSubCount]     = useState<number | null>(null);
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

  // Called when permission is "default" — requests permission then subscribes
  const enable = async () => {
    setResubStatus("loading");
    try {
      const perm = await Notification.requestPermission();
      setPermStatus(perm);
      if (perm !== "granted") { setResubStatus("error"); return; }
      await doSubscribe();
      await refreshCount();
      setResubStatus("done");
    } catch { setResubStatus("error"); }
    setTimeout(() => setResubStatus("idle"), 3000);
  };

  // Called when already granted — re-subscribe
  const resub = async () => {
    setResubStatus("loading");
    try {
      await doSubscribe();
      await refreshCount();
      setResubStatus("done");
    } catch { setResubStatus("error"); }
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
  const isDenied  = permStatus === "denied";
  const isGranted = permStatus === "granted";

  return (
    <SCard title="PUSH NOTIFICATION">
      {/* Status row */}
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: permColor }} />
            <span style={{ fontSize: 10, color: "#334e68" }}>
              {isGranted ? "Đã cấp quyền" : isDenied ? "Bị từ chối" : "Chưa bật thông báo"}
            </span>
          </div>
          <span style={{ fontSize: 9, color: "#94a3b8", paddingLeft: 14 }}>
            {subCount === null ? "Đang kiểm tra…" : `${subCount} thiết bị đã đăng ký`}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {/* Primary action: enable (if default) or resub (if granted) */}
          {!isDenied && (
            <button
              onClick={isGranted ? resub : enable}
              disabled={resubStatus === "loading"}
              style={{
                padding: "6px 14px", borderRadius: 7, border: "none",
                background: resubStatus === "done" ? "#10b981" : resubStatus === "error" ? "#ef4444"
                  : isDefault ? "#C9A55A" : "#0ea5e9",
                color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>
              {resubStatus === "loading" ? "…"
                : resubStatus === "done" ? "✓ Đã đăng ký"
                : resubStatus === "error" ? "✗ Lỗi"
                : isDefault ? "BẬT THÔNG BÁO" : "Đăng ký lại"}
            </button>
          )}
          {/* Test send — only when granted */}
          {isGranted && (
            <button onClick={sendTest} disabled={pushStatus === "sending"}
              style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #bae6fd", background: pushStatus === "sent" ? "#f0fdf4" : "#f0f9ff", color: pushStatus === "sent" ? "#10b981" : pushStatus === "error" ? "#ef4444" : "#0ea5e9", fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {pushStatus === "sending" ? "Đang gửi…" : pushStatus === "sent" ? "✓ Đã gửi" : pushStatus === "error" ? "✗ Lỗi" : "Gửi thử"}
            </button>
          )}
        </div>
      </div>
      {isDenied && (
        <div style={{ padding: "0 20px 12px" }}>
          <p style={{ fontSize: 9, color: "#ef4444" }}>
            Thông báo bị chặn. Vào Settings trình duyệt → site settings → store.postlain.com → bật lại Notifications, rồi nhấn &quot;Đăng ký lại&quot;.
          </p>
        </div>
      )}
    </SCard>
  );
}

function VersionPanel() {
  const { updateReady, onUpdate } = useUpdateContext();
  return (
    <SCard title="PHIÊN BẢN">
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, color: "#0c1a2e", fontWeight: 600 }}>Postlain Store Manager</p>
          <p style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>v{APP_VERSION}</p>
        </div>
        {updateReady ? (
          <button onClick={onUpdate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "none", background: "#C9A55A", color: "#0c1a2e", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            <RefreshCw size={10} /> CẬP NHẬT
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <Check size={10} style={{ color: "#10b981" }} />
            <span style={{ fontSize: 9, color: "#10b981", fontWeight: 600 }}>Mới nhất</span>
          </div>
        )}
      </div>
    </SCard>
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
  const [tab, setTab] = useState<"profile" | "team" | "feed" | "settings">("profile");

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  const handleStatusChange = async (s: Status) => {
    setStatusOpen(false);
    const updated = { ...form, status: s };
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
    setTab("feed");
  };

  const scfg = STATUS_CFG[form.status] ?? STATUS_CFG.online;
  const rcfg = ROLE_CFG[currentUser.role] ?? ROLE_CFG.staff;
  const RIcon = rcfg.icon;
  const isAdmin = currentUser.role === "admin";
  const isManager = currentUser.role === "admin" || currentUser.role === "manager";

  // Stats
  const myActivity = activity.filter(a => a.userId === currentUser.id);
  const msgCount = myActivity.filter(a => a.type === "message").length;
  const activeMembers = team.filter(m => m.active).length;
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN", { month: "short", year: "numeric" }) : "—";

  const TABS = [
    { id: "profile" as const,  label: "Hồ Sơ",     icon: User     },
    { id: "team" as const,     label: "Nhóm",       icon: Users    },
    { id: "feed" as const,     label: "Hoạt Động",  icon: Activity },
    { id: "settings" as const, label: "Cài Đặt",    icon: Settings },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 860, margin: "0 auto" }}>

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 40px rgba(12,26,46,0.12)", marginBottom: 16 }}>

        {/* Cover gradient */}
        <div style={{
          height: 110,
          background: "linear-gradient(135deg, #0c1a2e 0%, #1e3a5f 45%, #0ea5e9 80%, #C9A55A 100%)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative orbs */}
          <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(201,165,90,0.12)" }} />
          <div style={{ position: "absolute", bottom: -30, left: "30%", width: 80, height: 80, borderRadius: "50%", background: "rgba(14,165,233,0.15)" }} />
          <div style={{ position: "absolute", top: 10, left: "60%", width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        </div>

        <div style={{ background: "#fff", padding: "0 20px 20px" }}>
          {/* Avatar row */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -44 }}>
            <div style={{ position: "relative" }}>
              <Avatar src={profile?.avatar} name={currentUser.name} size={88} status={form.status} />
              <button onClick={() => fileRef.current?.click()}
                style={{ position: "absolute", bottom: 2, right: 2, width: 26, height: 26, borderRadius: "50%", background: "#0ea5e9", border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Camera size={11} style={{ color: "#fff" }} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
            </div>

            <div style={{ flex: 1, paddingBottom: 4, paddingTop: 44 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: "#0c1a2e", letterSpacing: "-0.01em" }}>
                  {profile?.fullName || currentUser.name}
                </p>
                <div style={{ padding: "3px 10px", borderRadius: 20, background: `${rcfg.color}18`, border: `1px solid ${rcfg.color}40`, display: "flex", alignItems: "center", gap: 5 }}>
                  <RIcon size={10} style={{ color: rcfg.color }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: rcfg.color }}>{rcfg.label}</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>@{currentUser.email}</p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, paddingTop: 44, paddingBottom: 4 }}>
              {/* Status selector */}
              <div style={{ position: "relative" }}>
                <button onClick={() => setStatusOpen(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 10, border: "1px solid #bae6fd", background: "#f0f9ff", cursor: "pointer", fontFamily: "inherit" }}>
                  <Circle size={8} style={{ color: scfg.color, fill: scfg.color }} />
                  <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>{scfg.label}</span>
                  <ChevronDown size={9} style={{ color: "#94a3b8" }} />
                </button>
                <AnimatePresence>
                  {statusOpen && (
                    <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid #bae6fd", borderRadius: 12, overflow: "hidden", zIndex: 50, minWidth: 170, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
                      {(Object.entries(STATUS_CFG) as [Status, { label: string; color: string }][]).map(([key, cfg]) => (
                        <button key={key} onClick={() => handleStatusChange(key)}
                          style={{ width: "100%", padding: "9px 14px", display: "flex", alignItems: "center", gap: 8, background: form.status === key ? "#f0f9ff" : "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                          <Circle size={8} style={{ color: cfg.color, fill: cfg.color }} />
                          <span style={{ fontSize: 11, color: "#0c1a2e", flex: 1 }}>{cfg.label}</span>
                          {form.status === key && <Check size={9} style={{ color: "#0ea5e9" }} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button onClick={() => { logout(); router.replace("/login"); }}
                style={{ padding: "6px 12px", borderRadius: 10, border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.05)", color: "#dc2626", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                <LogOut size={11} /> THOÁT
              </button>
            </div>
          </div>

          {profile?.bio && (
            <p style={{ fontSize: 11, color: "#64748b", marginTop: 10, fontStyle: "italic", lineHeight: 1.6 }}>"{profile.bio}"</p>
          )}

          {/* Stats row */}
          <div style={{ display: "flex", gap: 0, marginTop: 16, borderTop: "1px solid #e0f2fe", paddingTop: 14 }}>
            {[
              { label: "Tin nhắn", value: msgCount, icon: MessageSquare, color: "#0ea5e9" },
              { label: "Thành viên", value: activeMembers, icon: Users, color: "#10b981" },
              { label: "Tham gia", value: memberSince, icon: Award, color: "#C9A55A" },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "0 8px", borderRight: i < 2 ? "1px solid #e0f2fe" : "none" }}>
                  <Icon size={14} style={{ color: stat.color }} />
                  <span style={{ fontSize: typeof stat.value === "number" ? 18 : 12, fontWeight: 800, color: "#0c1a2e", lineHeight: 1 }}>{stat.value}</span>
                  <span style={{ fontSize: 8, color: "#94a3b8", letterSpacing: "0.05em" }}>{stat.label.toUpperCase()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 2, background: "#fff", borderRadius: 14, border: "1px solid #bae6fd", padding: 4, marginBottom: 16, boxShadow: "0 2px 8px rgba(14,165,233,0.05)" }}>
        {TABS.map(t => {
          const TIcon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                background: active ? "linear-gradient(135deg, #0ea5e9, #0284c7)" : "transparent",
                color: active ? "#fff" : "#64748b",
                fontSize: 9.5, fontWeight: active ? 700 : 500,
                transition: "all 0.15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}>
              <TIcon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>

          {/* ── Profile tab ── */}
          {tab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Edit form */}
              <div style={{ borderRadius: 16, border: "1px solid #bae6fd", background: "#fff", overflow: "hidden", boxShadow: "0 2px 12px rgba(14,165,233,0.05)" }}>
                <div style={{ padding: "12px 20px", borderBottom: "1px solid #e0f2fe", background: "linear-gradient(90deg, #f0f9ff, #fff)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <User size={12} style={{ color: "#0ea5e9" }} />
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#64748b", letterSpacing: "0.15em" }}>THÔNG TIN CÁ NHÂN</p>
                  </div>
                  {!editing
                    ? <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid #bae6fd", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 8.5, color: "#0ea5e9", fontWeight: 700 }}>
                        <Edit2 size={9} /> CHỈNH SỬA
                      </button>
                    : <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 14px", borderRadius: 8, border: "none", background: saved ? "#10b981" : "#0ea5e9", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 8.5, fontWeight: 700, transition: "background 0.2s" }}>
                          <Check size={9} /> {saved ? "ĐÃ LƯU" : "LƯU"}
                        </button>
                        <button onClick={() => setEditing(false)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #bae6fd", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                          <X size={9} style={{ color: "#94a3b8" }} />
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
                  const FIcon = f.icon;
                  return (
                    <div key={f.key}>
                      {i > 0 && <div style={{ height: 1, background: "#e0f2fe", margin: "0 20px" }} />}
                      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                        <FIcon size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: "#64748b", width: 120, flexShrink: 0 }}>{f.label}</span>
                        {editing
                          ? <input value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              style={{ flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "7px 11px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }} />
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
              <div style={{ borderRadius: 16, border: "1px solid #bae6fd", background: "#fff", overflow: "hidden", boxShadow: "0 2px 12px rgba(14,165,233,0.05)" }}>
                <button onClick={() => setPwOpen(v => !v)}
                  style={{ width: "100%", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                  <Lock size={13} style={{ color: "#64748b" }} />
                  <span style={{ fontSize: 11, color: "#0c1a2e", flex: 1, fontWeight: 500 }}>Đổi mật khẩu</span>
                  <ChevronDown size={13} style={{ color: "#94a3b8", transform: pwOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
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
                            <div style={{ flex: 1, display: "flex", alignItems: "center", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "0 10px", height: 36 }}>
                              <input type={showPw ? "text" : "password"} value={f.val} onChange={e => f.set(e.target.value)}
                                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 11, fontFamily: "inherit", color: "#0c1a2e" }} />
                              {i === 0 && <button onClick={() => setShowPw(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                                {showPw ? <EyeOff size={12} style={{ color: "#94a3b8" }} /> : <Eye size={12} style={{ color: "#94a3b8" }} />}
                              </button>}
                            </div>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                          <button onClick={handleChangePw} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
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
              <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em", padding: "0 4px" }}>
                {team.filter(m => m.active).length} THÀNH VIÊN ĐANG HOẠT ĐỘNG
              </div>
              {team.filter(m => m.active).map(m => (
                <TeamCard key={m.id} member={m} isMe={m.id === currentUser.id} />
              ))}
              {team.filter(m => !m.active).length > 0 && (
                <>
                  <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em", padding: "8px 4px 0" }}>ĐÃ VÔ HIỆU HÓA</div>
                  {team.filter(m => !m.active).map(m => (
                    <div key={m.id} style={{ opacity: 0.4 }}><TeamCard member={m} isMe={false} /></div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Feed tab ── */}
          {tab === "feed" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ borderRadius: 16, border: "1px solid #bae6fd", background: "#fff", padding: "14px 16px", boxShadow: "0 2px 12px rgba(14,165,233,0.05)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Avatar src={profile?.avatar} name={currentUser.name} size={34} />
                  <div style={{ flex: 1 }}>
                    <textarea value={msg} onChange={e => setMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
                      placeholder="Chia sẻ cập nhật với nhóm... (Enter để gửi)"
                      rows={2}
                      style={{ width: "100%", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "8px 12px", fontSize: 11, color: "#0c1a2e", fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.5 }} />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                      <button onClick={handlePost} disabled={!msg.trim() || posting}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 9, border: "none", background: msg.trim() ? "#0ea5e9" : "#e0f2fe", color: msg.trim() ? "#fff" : "#94a3b8", fontSize: 9, fontWeight: 700, cursor: msg.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
                        <Send size={10} /> GỬI
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ borderRadius: 16, border: "1px solid #bae6fd", background: "#fff", overflow: "hidden", boxShadow: "0 2px 12px rgba(14,165,233,0.05)" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #e0f2fe", background: "#f0f9ff" }}>
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

          {/* ── Settings tab ── */}
          {tab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <DisplayPanel />
              <NotifyPanel />
              <PushPanel userId={currentUser.id} />
              <SecurityPanel currentUser={{ id: currentUser.id, email: currentUser.email, name: currentUser.name, role: currentUser.role }} />
              {isManager && <StorePanel />}
              {isAdmin && <UsersPanel />}
              <VersionPanel />
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Bottom spacer */}
      <div style={{ height: 24 }} />
    </div>
  );
}
