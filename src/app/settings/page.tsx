"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, Bell, Palette, Users, Database, Shield,
  ChevronRight, Check, ToggleLeft, ToggleRight,
  Plus, Trash2, Pencil, Warehouse, X, Eye, EyeOff,
  Download, Upload, RefreshCw, Lock, Key, UserPlus,
  Crown, UserCheck, User, Smartphone, Info,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import type { UserRole, AppUser } from "@/store/useStore";
import { useUpdateContext } from "@/components/Providers";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

const SECTIONS = [
  { id: "store",    label: "Thông Tin Cửa Hàng", icon: Store,     desc: "Tên, địa chỉ, liên hệ",     minRole: "manager" },
  { id: "shelves",  label: "Quản Lý Kệ Kho",      icon: Warehouse, desc: "Thêm, xoá, đổi tên kệ",     minRole: "manager" },
  { id: "notify",   label: "Thông Báo",            icon: Bell,      desc: "Cảnh báo tồn kho, báo cáo", minRole: "manager" },
  { id: "display",  label: "Giao Diện",            icon: Palette,   desc: "Bố cục, hoạt ảnh, theme",   minRole: "staff"   },
  { id: "users",    label: "Người Dùng",           icon: Users,     desc: "Phân quyền truy cập",        minRole: "admin"   },
  { id: "data",     label: "Dữ Liệu & Xuất File",  icon: Database,  desc: "Sao lưu, export Excel",      minRole: "manager" },
  { id: "security", label: "Bảo Mật",              icon: Shield,    desc: "Mật khẩu, xác thực",         minRole: "staff"   },
  { id: "version",  label: "Phiên Bản",            icon: Info,      desc: `v${APP_VERSION} · Cập nhật app`, minRole: "staff" },
] as const;

type SectionMinRole = typeof SECTIONS[number]["minRole"];

function hasAccess(userRole: string | undefined, minRole: SectionMinRole): boolean {
  const rank: Record<string, number> = { staff: 0, manager: 1, admin: 2 };
  return (rank[userRole ?? "staff"] ?? 0) >= (rank[minRole] ?? 0);
}

type SectionId = typeof SECTIONS[number]["id"];

// ─── Shared components ────────────────────────────────────────────────────────

function InputRow({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 16 }}>
      <label style={{ fontSize: 11, color: "#64748b", flexShrink: 0, width: 160 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd",
          borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "#0c1a2e",
          outline: "none", fontFamily: "inherit",
        }}
        onFocus={e => (e.target.style.borderColor = "#0ea5e9")}
        onBlur={e => (e.target.style.borderColor = "#bae6fd")}
      />
    </div>
  );
}

function Toggle({ label, desc, on, set }: { label: string; desc: string; on: boolean; set: (v: boolean) => void }) {
  const Icon = on ? ToggleRight : ToggleLeft;
  return (
    <div
      onClick={() => set(!on)}
      style={{ padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
      onMouseEnter={e => (e.currentTarget.style.background = "#f0f9ff")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <div>
        <p style={{ fontSize: 11, color: "#0c1a2e" }}>{label}</p>
        <p style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{desc}</p>
      </div>
      <Icon size={22} strokeWidth={1.5} style={{ flexShrink: 0, color: on ? "#C9A55A" : "#bae6fd", transition: "color 0.14s" }} />
    </div>
  );
}

function Divider() { return <div style={{ height: 1, background: "#e0f2fe", margin: "0 20px" }} />; }

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 14, border: "1px solid #bae6fd", background: "#ffffff", overflow: "hidden" }}>
      <div style={{ padding: "8px 20px", borderBottom: "1px solid #e0f2fe", background: "#f0f9ff" }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: "#64748b", letterSpacing: "0.2em" }}>{title}</p>
      </div>
      <div style={{ padding: "4px 0" }}>{children}</div>
    </div>
  );
}

// ─── Store Info Panel ────────────────────────────────────────────────────────

function StorePanel() {
  const { storeName, storeAddress, storePhone, storeEmail, setStoreSetting } = useStore();
  const [name,    setName]    = useState(storeName);
  const [addr,    setAddr]    = useState(storeAddress);
  const [phone,   setPhone]   = useState(storePhone);
  const [email,   setEmail]   = useState(storeEmail);
  const [saved,   setSaved]   = useState(false);

  // Load from DB on mount (source of truth)
  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      if (data.storeName)    { setName(data.storeName);    setStoreSetting("storeName",    data.storeName); }
      if (data.storeAddress) { setAddr(data.storeAddress); setStoreSetting("storeAddress", data.storeAddress); }
      if (data.storePhone)   { setPhone(data.storePhone);  setStoreSetting("storePhone",   data.storePhone); }
      if (data.storeEmail)   { setEmail(data.storeEmail);  setStoreSetting("storeEmail",   data.storeEmail); }
    }).catch(() => {});
  }, []);

  const handleSave = () => {
    setStoreSetting("storeName",    name);
    setStoreSetting("storeAddress", addr);
    setStoreSetting("storePhone",   phone);
    setStoreSetting("storeEmail",   email);
    // Persist to DB
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeName: name, storeAddress: addr, storePhone: phone, storeEmail: email }),
    }).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card title="Thông Tin Cơ Bản">
        <InputRow label="Tên cửa hàng"   value={name}  onChange={setName}  />
        <Divider /><InputRow label="Địa chỉ"         value={addr}  onChange={setAddr}  />
        <Divider /><InputRow label="Điện thoại"      value={phone} onChange={setPhone} />
        <Divider /><InputRow label="Email"           value={email} onChange={setEmail} type="email" />
      </Card>
      <Card title="Khu Vực">
        <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          <label style={{ fontSize: 11, color: "#64748b", width: 160, flexShrink: 0 }}>Đơn vị tiền tệ</label>
          <div style={{ flex: 1, padding: "7px 12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, fontSize: 11, color: "#0c1a2e" }}>VND</div>
        </div>
      </Card>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 20px", borderRadius: 10, border: "none",
            background: saved ? "#10b981" : "#0ea5e9", color: "#ffffff",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
            cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s",
          }}
        >
          {saved ? <><Check size={10} /> ĐÃ LƯU</> : "LƯU THAY ĐỔI"}
        </button>
      </div>
    </div>
  );
}

// ─── Shelf Management Panel ───────────────────────────────────────────────────

function ShelvesPanel() {
  const {
    warehouseShelves, addWarehouseShelf,
    removeWarehouseShelf, renameWarehouseShelf,
  } = useStore();

  const [editId,    setEditId]    = useState<string | null>(null);
  const [editName,  setEditName]  = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const startEdit = (id: string, name: string) => { setEditId(id); setEditName(name); };
  const commitEdit = () => {
    if (editId && editName.trim()) renameWarehouseShelf(editId, editName.trim());
    setEditId(null);
  };

  const shoeShelves = warehouseShelves.filter(s => s.shelfType === "shoes");
  const bagShelves  = warehouseShelves.filter(s => s.shelfType === "bags");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Shoe shelves */}
      <Card title={`KHU GIÀY · ${shoeShelves.length} KỆ`}>
        {shoeShelves.length === 0 && (
          <p style={{ padding: "16px 20px", fontSize: 10, color: "#94a3b8" }}>Chưa có kệ nào</p>
        )}
        {shoeShelves.map((shelf, i) => (
          <div key={shelf.id}>
            {i > 0 && <Divider />}
            <div style={{ padding: "8px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <Warehouse size={12} style={{ color: "#0ea5e9", flexShrink: 0 }} />
              {editId === shelf.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditId(null); }}
                  style={{ flex: 1, fontSize: 11, color: "#0c1a2e", background: "#f0f9ff", border: "1px solid #0ea5e9", borderRadius: 6, padding: "4px 8px", outline: "none", fontFamily: "inherit" }}
                />
              ) : (
                <p style={{ flex: 1, fontSize: 11, color: "#0c1a2e" }}>{shelf.name}</p>
              )}
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => startEdit(shelf.id, shelf.name)}
                  style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #bae6fd", background: "#f0f9ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Pencil size={10} style={{ color: "#0ea5e9" }} />
                </button>
                {confirmId === shelf.id ? (
                  <>
                    <button onClick={() => { removeWarehouseShelf(shelf.id); setConfirmId(null); }}
                      style={{ padding: "0 8px", height: 26, borderRadius: 7, border: "none", background: "#dc2626", color: "#fff", fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      XOÁ
                    </button>
                    <button onClick={() => setConfirmId(null)}
                      style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #bae6fd", background: "#f0f9ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X size={10} style={{ color: "#94a3b8" }} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmId(shelf.id)}
                    style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #bae6fd", background: "#f0f9ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={10} style={{ color: "#dc2626" }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div style={{ padding: "8px 20px", borderTop: shoeShelves.length > 0 ? "1px solid #e0f2fe" : "none" }}>
          <button
            onClick={() => addWarehouseShelf("shoes")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px dashed #bae6fd", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 9, color: "#0ea5e9", letterSpacing: "0.1em" }}
          >
            <Plus size={10} /> THÊM KỆ GIÀY
          </button>
        </div>
      </Card>

      {/* Bag shelves */}
      <Card title={`KHU TÚI · ${bagShelves.length} KỆ`}>
        {bagShelves.length === 0 && (
          <p style={{ padding: "16px 20px", fontSize: 10, color: "#94a3b8" }}>Chưa có kệ nào</p>
        )}
        {bagShelves.map((shelf, i) => (
          <div key={shelf.id}>
            {i > 0 && <Divider />}
            <div style={{ padding: "8px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <Warehouse size={12} style={{ color: "#10b981", flexShrink: 0 }} />
              {editId === shelf.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditId(null); }}
                  style={{ flex: 1, fontSize: 11, color: "#0c1a2e", background: "#f0f9ff", border: "1px solid #10b981", borderRadius: 6, padding: "4px 8px", outline: "none", fontFamily: "inherit" }}
                />
              ) : (
                <p style={{ flex: 1, fontSize: 11, color: "#0c1a2e" }}>{shelf.name}</p>
              )}
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => startEdit(shelf.id, shelf.name)}
                  style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #bae6fd", background: "#f0f9ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Pencil size={10} style={{ color: "#0ea5e9" }} />
                </button>
                {confirmId === shelf.id ? (
                  <>
                    <button onClick={() => { removeWarehouseShelf(shelf.id); setConfirmId(null); }}
                      style={{ padding: "0 8px", height: 26, borderRadius: 7, border: "none", background: "#dc2626", color: "#fff", fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      XOÁ
                    </button>
                    <button onClick={() => setConfirmId(null)}
                      style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #bae6fd", background: "#f0f9ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X size={10} style={{ color: "#94a3b8" }} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmId(shelf.id)}
                    style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #bae6fd", background: "#f0f9ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={10} style={{ color: "#dc2626" }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div style={{ padding: "8px 20px", borderTop: bagShelves.length > 0 ? "1px solid #e0f2fe" : "none" }}>
          <button
            onClick={() => addWarehouseShelf("bags")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px dashed #bae6fd", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 9, color: "#10b981", letterSpacing: "0.1em" }}
          >
            <Plus size={10} /> THÊM KỆ TÚI
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Notify Panel ────────────────────────────────────────────────────────────

function NotifyPanel() {
  const {
    notifyLowStock, notifyMovement, notifyDaily, notifyPush,
    lowStockThreshold, setNotifySetting, setLowStockThreshold,
  } = useStore();
  const [threshold, setThreshold] = useState(String(lowStockThreshold));
  const [saved, setSaved] = useState(false);

  const saveThreshold = () => {
    const n = parseInt(threshold, 10);
    if (!isNaN(n) && n >= 0) {
      setLowStockThreshold(n);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card title="Cảnh Báo Kho">
        <Toggle label="Cảnh báo tồn kho thấp" desc="Thông báo khi SL < ngưỡng tối thiểu"
          on={notifyLowStock} set={v => setNotifySetting("notifyLowStock", v)} />
        <Divider />
        {/* Threshold input — only shown when lowStock is on */}
        {notifyLowStock && (
          <>
            <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <label style={{ fontSize: 11, color: "#64748b", flexShrink: 0, width: 160 }}>Ngưỡng tồn kho thấp</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="number" min={0} value={threshold}
                  onChange={e => setThreshold(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveThreshold()}
                  style={{ width: 72, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }}
                  onFocus={e => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={e => { e.target.style.borderColor = "#bae6fd"; saveThreshold(); }}
                />
                <span style={{ fontSize: 10, color: "#94a3b8" }}>sản phẩm</span>
                {saved && <Check size={12} style={{ color: "#10b981" }} />}
              </div>
            </div>
            <Divider />
          </>
        )}
        <Toggle label="Thông báo biến động"   desc="Mỗi khi có nhập/xuất/chuyển kho mới"
          on={notifyMovement} set={v => setNotifySetting("notifyMovement", v)} />
        <Divider />
        <Toggle label="Báo cáo hàng ngày"     desc="Tổng hợp cuối ngày gửi qua email"
          on={notifyDaily} set={v => setNotifySetting("notifyDaily", v)} />
      </Card>
      <Card title="Kênh Nhận Thông Báo">
        <Toggle label="Push trên trình duyệt" desc="Thông báo trực tiếp trên màn hình"
          on={notifyPush} set={v => setNotifySetting("notifyPush", v)} />
      </Card>
    </div>
  );
}

// ─── Display Panel ────────────────────────────────────────────────────────────

function DisplayPanel() {
  const { uiCompact, uiAnimations, uiDensity, setUISetting, setUIDensity } = useStore();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card title="Chế Độ Hiển Thị">
        <Toggle label="Chế độ gọn" desc="Thu nhỏ khoảng cách trong bảng"
          on={uiCompact} set={v => setUISetting("uiCompact", v)} />
        <Divider />
        <Toggle label="Hoạt ảnh" desc="Bật/tắt hiệu ứng chuyển động"
          on={uiAnimations} set={v => setUISetting("uiAnimations", v)} />
      </Card>
      <Card title="Mật Độ Bảng Dữ Liệu">
        {(["comfortable", "compact"] as const).map((d, i) => (
          <div key={d}>
            <div
              onClick={() => setUIDensity(d)}
              style={{ padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f0f9ff")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div>
                <p style={{ fontSize: 11, color: "#0c1a2e" }}>{d === "comfortable" ? "Thoải Mái" : "Gọn"}</p>
                <p style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
                  {d === "comfortable" ? "Hàng cao 52px — dễ đọc" : "Hàng cao 38px — nhiều hàng hơn"}
                </p>
              </div>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                border: `1.5px solid ${uiDensity === d ? "#0ea5e9" : "#bae6fd"}`,
                background: uiDensity === d ? "#0ea5e9" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
              }}>
                {uiDensity === d && <Check size={8} color="white" strokeWidth={3} />}
              </div>
            </div>
            {i === 0 && <Divider />}
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Users Panel ──────────────────────────────────────────────────────────────

const ROLE_CFG: Record<UserRole, { label: string; color: string; icon: React.FC<{ size?: number; style?: React.CSSProperties }> }> = {
  admin:   { label: "Admin",   color: "#C9A55A", icon: Crown     },
  manager: { label: "Quản Lý", color: "#0ea5e9", icon: UserCheck },
  staff:   { label: "Nhân Viên", color: "#64748b", icon: User    },
};

type DbUser = { id: string; name: string; username: string; role: string; active: number };

function UsersPanel() {
  const { currentUser } = useStore();
  const [dbUsers, setDbUsers] = useState<DbUser[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", role: "staff" as UserRole, password: "" });

  const isAdmin = currentUser?.role === "admin";

  const load = () => fetch("/api/auth").then(r => r.json()).then(setDbUsers).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) return;
    await fetch("/api/auth", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name.trim(), username: form.username.trim(), password: form.password, role: form.role }),
    });
    setForm({ name: "", username: "", role: "staff", password: "" });
    setAddOpen(false);
    load();
  };

  const handleToggleActive = async (u: DbUser) => {
    await fetch("/api/auth", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, name: u.name, username: u.username, role: u.role, active: !u.active }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/auth", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConfirmId(null);
    load();
  };

  const handleChangePw = async (uid: string, username: string, name: string, role: string) => {
    if (!newPw.trim()) return;
    await fetch("/api/auth", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: uid, name, username, role, active: true, password: newPw.trim() }),
    });
    setNewPw(""); setPwOpen(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!isAdmin && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(201,165,90,0.08)", border: "1px solid rgba(201,165,90,0.3)", fontSize: 10, color: "#C9A55A" }}>
          Chỉ Admin mới có quyền quản lý người dùng.
        </div>
      )}
      <Card title={`NGƯỜI DÙNG · ${dbUsers.length}`}>
        {dbUsers.map((u, i) => {
          const role = (u.role in ROLE_CFG ? u.role : "staff") as UserRole;
          const rcfg = ROLE_CFG[role];
          const RIcon = rcfg.icon;
          const isMe = currentUser?.id === u.id;
          const isActive = u.active === 1;
          return (
            <div key={u.id}>
              {i > 0 && <Divider />}
              <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${rcfg.color}22`, border: `1.5px solid ${rcfg.color}66`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <RIcon size={13} style={{ color: rcfg.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#0c1a2e" }}>
                    {u.name} {isMe && <span style={{ fontSize: 8, color: "#0ea5e9", marginLeft: 4 }}>(bạn)</span>}
                  </p>
                  <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>Đăng nhập: {u.username}</p>
                </div>
                <div style={{ padding: "2px 8px", borderRadius: 8, background: `${rcfg.color}18`, border: `1px solid ${rcfg.color}44` }}>
                  <span style={{ fontSize: 7.5, fontWeight: 700, color: rcfg.color, letterSpacing: "0.08em" }}>{rcfg.label}</span>
                </div>
                {isAdmin && !isMe && (
                  <button onClick={() => handleToggleActive(u)}
                    style={{ fontSize: 7.5, padding: "2px 8px", borderRadius: 8, border: `1px solid ${isActive ? "#10b981" : "#94a3b8"}`, background: "transparent", color: isActive ? "#10b981" : "#94a3b8", cursor: "pointer", fontFamily: "inherit" }}>
                    {isActive ? "Hoạt động" : "Tắt"}
                  </button>
                )}
                {isAdmin && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => { setPwOpen(u.id); setNewPw(""); setShowPw(false); }}
                      style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #bae6fd", background: "#f0f9ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Key size={10} style={{ color: "#C9A55A" }} />
                    </button>
                    {!isMe && (confirmId === u.id ? (
                      <>
                        <button onClick={() => handleDelete(u.id)}
                          style={{ padding: "0 8px", height: 26, borderRadius: 7, border: "none", background: "#dc2626", color: "#fff", fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>XOÁ</button>
                        <button onClick={() => setConfirmId(null)}
                          style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #bae6fd", background: "#f0f9ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <X size={10} style={{ color: "#94a3b8" }} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmId(u.id)}
                        style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #bae6fd", background: "#f0f9ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={10} style={{ color: "#dc2626" }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {pwOpen === u.id && (
                <div style={{ padding: "8px 20px 12px", display: "flex", alignItems: "center", gap: 8, background: "#f0f9ff", borderTop: "1px solid #e0f2fe" }}>
                  <Key size={11} style={{ color: "#C9A55A", flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "#ffffff", border: "1px solid #bae6fd", borderRadius: 8, padding: "0 10px", height: 30 }}>
                    <input type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)}
                      placeholder="Mật khẩu mới..."
                      onKeyDown={e => e.key === "Enter" && handleChangePw(u.id, u.username, u.name, u.role)}
                      style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 11, fontFamily: "inherit", color: "#0c1a2e" }} />
                    <button onClick={() => setShowPw(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                      {showPw ? <EyeOff size={10} style={{ color: "#94a3b8" }} /> : <Eye size={10} style={{ color: "#94a3b8" }} />}
                    </button>
                  </div>
                  <button onClick={() => handleChangePw(u.id, u.username, u.name, u.role)}
                    style={{ padding: "0 12px", height: 30, borderRadius: 8, border: "none", background: "#C9A55A", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>LƯU</button>
                  <button onClick={() => setPwOpen(null)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #bae6fd", background: "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={10} style={{ color: "#94a3b8" }} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {isAdmin && (
          <div style={{ padding: "8px 20px", borderTop: dbUsers.length > 0 ? "1px solid #e0f2fe" : "none" }}>
            {!addOpen ? (
              <button onClick={() => setAddOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px dashed #bae6fd", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 9, color: "#0ea5e9", letterSpacing: "0.1em" }}>
                <UserPlus size={10} /> THÊM NGƯỜI DÙNG
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} placeholder="Họ tên hiển thị"
                    style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }} />
                  <input value={form.username} onChange={e => setForm(v => ({ ...v, username: e.target.value.toLowerCase().replace(/\s/g,"") }))} placeholder="Tên đăng nhập (không dấu)"
                    style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input value={form.password} onChange={e => setForm(v => ({ ...v, password: e.target.value }))} type="password" placeholder="Mật khẩu"
                    style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <select value={form.role} onChange={e => setForm(v => ({ ...v, role: e.target.value as UserRole }))}
                    style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }}>
                    <option value="staff">Nhân Viên</option>
                    <option value="manager">Quản Lý</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleAdd} style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>THÊM</button>
                    <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: "7px", borderRadius: 8, border: "1px solid #bae6fd", background: "transparent", color: "#64748b", fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>HUỶ</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Data Panel ───────────────────────────────────────────────────────────────

function DataPanel() {
  const { products, storeSections, warehouseShelves, importProducts } = useStore();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number } | null>(null);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportResult(null);
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Map các cột Excel → Product fields
      const mapped = rows.map(r => ({
        id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name:          String(r["Tên sản phẩm"] ?? r["name"] ?? "").trim(),
        sku:           String(r["SKU"]          ?? r["sku"]  ?? "").trim() || undefined,
        category:      String(r["Danh mục"]     ?? r["category"] ?? "").trim(),
        productType:   String(r["Loại"]         ?? r["productType"] ?? "").trim() || undefined,
        quantity:      Number(r["Số lượng"]     ?? r["quantity"] ?? 0),
        price:         r["Giá"]       ? Number(r["Giá"])       : undefined,
        markdownPrice: r["Giá Sale"]  ? Number(r["Giá Sale"])  : undefined,
        color:         String(r["Màu"]          ?? r["color"] ?? "").trim() || undefined,
        size:          String(r["Kích cỡ"]      ?? r["size"]  ?? "").trim() || undefined,
        notes:         String(r["Ghi chú"]      ?? r["notes"] ?? "").trim() || undefined,
        createdAt:     new Date().toISOString(),
        updatedAt:     new Date().toISOString(),
      })).filter(p => p.name);

      if (!mapped.length) { flash("File không có dữ liệu hợp lệ"); setImporting(false); return; }

      // Gọi API bulk — server tự phân biệt mới/cũ
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapped),
      });
      if (res.ok) {
        const { inserted, updated, deleted } = await res.json();
        setImportResult({ inserted, updated });
        // Refresh store
        const allRes = await fetch("/api/products");
        if (allRes.ok) useStore.getState().setProducts(await allRes.json());
        flash(`Nhập thành công: ${inserted} mới, ${updated} cập nhật SL, ${deleted} xóa`);
      } else {
        flash("Lỗi nhập dữ liệu từ server");
      }
    } catch (err) {
      flash("Không đọc được file Excel");
    }
    setImporting(false);
  };

  const exportProducts = async () => {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const rows = products.map(p => ({
        "Tên sản phẩm": p.name,
        "SKU": p.sku ?? "",
        "Danh mục": p.category,
        "Số lượng": p.quantity,
        "Giá gốc": p.price ?? "",
        "Giá giảm": p.markdownPrice ?? "",
        "Màu sắc": p.color ?? "",
        "Cỡ": p.size ?? "",
        "Ghi chú": p.notes ?? "",
        "Ngày tạo": p.createdAt.slice(0, 10),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sản phẩm");
      XLSX.writeFile(wb, `postlain_products_${new Date().toISOString().slice(0, 10)}.xlsx`);
      flash(`Đã xuất ${products.length} sản phẩm`);
    } catch { flash("Lỗi xuất file"); }
    setExporting(false);
  };

  const exportPlanogram = async () => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      // Display sections
      storeSections.forEach(sec => {
        const rows: Record<string, string>[] = [];
        sec.subsections.forEach(sub => {
          sub.rows.forEach((row, ri) => {
            row.products.forEach((pid, si) => {
              rows.push({ "Khu": sec.name, "Vị trí": sub.name, "Hàng": String(ri + 1), "Ô": String(si + 1), "Sản phẩm ID": pid ?? "" });
            });
          });
        });
        if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sec.name.slice(0, 28));
      });
      // Warehouse
      const wRows: Record<string, string>[] = [];
      warehouseShelves.forEach(sh => {
        sh.tiers.forEach((tier, ti) => {
          tier.forEach((pid, si) => {
            wRows.push({ "Kệ": sh.name, "Tầng": String(ti + 1), "Ô": String(si + 1), "Sản phẩm ID": pid ?? "" });
          });
        });
      });
      if (wRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wRows), "Kho");
      XLSX.writeFile(wb, `postlain_planogram_${new Date().toISOString().slice(0, 10)}.xlsx`);
      flash("Đã xuất sơ đồ trưng bày");
    } catch { flash("Lỗi xuất file"); }
  };

  const exportFullBackup = async () => {
    try {
      const data = JSON.stringify({ products, storeSections, warehouseShelves, exportedAt: new Date().toISOString() }, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `postlain_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      flash("Đã tạo bản sao lưu");
    } catch { flash("Lỗi tạo backup"); }
  };

  const stats = [
    { label: "Tổng sản phẩm",    val: products.length,         color: "#0c1a2e" },
    { label: "Khu trưng bày",    val: storeSections.length,    color: "#C9A55A" },
    { label: "Kệ kho",           val: warehouseShelves.length, color: "#0ea5e9" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {msg && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.4)", fontSize: 10, color: "#10b981", display: "flex", alignItems: "center", gap: 6 }}>
          <Check size={11} /> {msg}
        </div>
      )}
      <Card title="THỐNG KÊ DỮ LIỆU">
        <div style={{ padding: "12px 20px", display: "flex", gap: 24 }}>
          {stats.map(s => (
            <div key={s.label}>
              <p style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</p>
              <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card title="XUẤT DỮ LIỆU">
        {[
          { icon: Download, label: "Xuất danh sách sản phẩm", desc: "File Excel (.xlsx) — tất cả sản phẩm", color: "#0ea5e9", action: exportProducts, loading: exporting },
          { icon: Download, label: "Xuất sơ đồ trưng bày",   desc: "Trưng bày + kho theo từng khu/kệ",     color: "#C9A55A", action: exportPlanogram, loading: false },
          { icon: Download, label: "Sao lưu toàn bộ",         desc: "File JSON — dùng để khôi phục",        color: "#10b981", action: exportFullBackup, loading: false },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i}>
              {i > 0 && <Divider />}
              <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${item.color}14`, border: `1px solid ${item.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={14} style={{ color: item.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: "#0c1a2e" }}>{item.label}</p>
                  <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>{item.desc}</p>
                </div>
                <button onClick={item.action} disabled={item.loading}
                  style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${item.color}66`, background: `${item.color}10`, color: item.color, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1em", opacity: item.loading ? 0.6 : 1 }}>
                  {item.loading ? "..." : "XUẤT"}
                </button>
              </div>
            </div>
          );
        })}
      </Card>
      <Card title="NHẬP DỮ LIỆU">
        {importResult && (
          <div style={{ margin: "8px 20px 0", padding: "8px 14px", borderRadius: 8, background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.25)", fontSize: 9, color: "#0ea5e9", display: "flex", gap: 16 }}>
            <span>✦ Mới thêm: <b>{importResult.inserted}</b></span>
            <span>✦ Cập nhật SL: <b>{importResult.updated}</b></span>
          </div>
        )}
        <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Upload size={14} style={{ color: "#0ea5e9" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "#0c1a2e" }}>Nhập sản phẩm từ Excel</p>
            <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>Sản phẩm mới → thêm đầy đủ · Sản phẩm cũ (trùng SKU/tên) → chỉ cập nhật số lượng</p>
          </div>
          <label style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(14,165,233,0.5)", background: "rgba(14,165,233,0.08)", color: "#0ea5e9", fontSize: 9, fontWeight: 700, cursor: importing ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: importing ? 0.6 : 1, whiteSpace: "nowrap" }}>
            {importing ? "..." : "NHẬP"}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} style={{ display: "none" }} disabled={importing} />
          </label>
        </div>
        <Divider />
        <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <RefreshCw size={14} style={{ color: "#64748b" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "#0c1a2e" }}>Khôi phục từ backup</p>
            <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>Nhập file JSON đã sao lưu — chức năng dành cho kỹ thuật viên</p>
          </div>
          <button
            onClick={() => flash("Liên hệ kỹ thuật viên để khôi phục")}
            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #bae6fd", background: "transparent", color: "#64748b", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            NHẬP
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Security Panel ───────────────────────────────────────────────────────────

function SecurityPanel() {
  const { currentUser, logout } = useStore();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 3000);
  };

  const handleChange = async () => {
    if (!currentUser) return;
    if (newPw.length < 4) { flash("err", "Mật khẩu mới phải ít nhất 4 ký tự"); return; }
    if (newPw !== confirmPw) { flash("err", "Xác nhận mật khẩu không khớp"); return; }
    // Verify old password via API
    const check = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUser.email, password: oldPw }),
    });
    if (!check.ok) { flash("err", "Mật khẩu hiện tại không đúng"); return; }
    // Update password
    await fetch("/api/auth", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentUser.id, name: currentUser.name, username: currentUser.email, role: currentUser.role, active: true, password: newPw }),
    });
    setOldPw(""); setNewPw(""); setConfirmPw("");
    flash("ok", "Đã đổi mật khẩu thành công");
  };

  const PwField = ({ label, value, set, show, setShow }: { label: string; value: string; set: (v: string) => void; show: boolean; setShow: (v: boolean) => void }) => (
    <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 16 }}>
      <label style={{ fontSize: 11, color: "#64748b", flexShrink: 0, width: 160 }}>{label}</label>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "0 12px", height: 34 }}>
        <input
          type={show ? "text" : "password"} value={value} onChange={e => set(e.target.value)}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 11, color: "#0c1a2e", fontFamily: "inherit" }}
        />
        <button onClick={() => setShow(!show)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
          {show ? <EyeOff size={11} style={{ color: "#94a3b8" }} /> : <Eye size={11} style={{ color: "#94a3b8" }} />}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!currentUser && (
        <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(201,165,90,0.08)", border: "1px solid rgba(201,165,90,0.3)", fontSize: 10, color: "#C9A55A" }}>
          Vui lòng đăng nhập để truy cập cài đặt bảo mật.
        </div>
      )}
      {msg && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: msg.type === "ok" ? "rgba(16,185,129,0.10)" : "rgba(220,38,38,0.08)", border: `1px solid ${msg.type === "ok" ? "rgba(16,185,129,0.4)" : "rgba(220,38,38,0.3)"}`, fontSize: 10, color: msg.type === "ok" ? "#10b981" : "#dc2626", display: "flex", alignItems: "center", gap: 6 }}>
          {msg.type === "ok" ? <Check size={11} /> : <X size={11} />} {msg.text}
        </div>
      )}
      <Card title="PHIÊN ĐĂNG NHẬP HIỆN TẠI">
        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          {currentUser ? (
            <>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(14,165,233,0.12)", border: "1.5px solid rgba(14,165,233,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Lock size={14} style={{ color: "#0ea5e9" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#0c1a2e" }}>{currentUser.name}</p>
                <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>{currentUser.email} · {ROLE_CFG[currentUser.role].label}</p>
              </div>
              <button onClick={logout}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.4)", background: "rgba(220,38,38,0.06)", color: "#dc2626", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                ĐĂNG XUẤT
              </button>
            </>
          ) : (
            <p style={{ fontSize: 10, color: "#94a3b8" }}>Chưa đăng nhập</p>
          )}
        </div>
      </Card>
      {currentUser && (
        <Card title="ĐỔI MẬT KHẨU">
          <PwField label="Mật khẩu hiện tại" value={oldPw} set={setOldPw} show={showOld} setShow={setShowOld} />
          <Divider />
          <PwField label="Mật khẩu mới" value={newPw} set={setNewPw} show={showNew} setShow={setShowNew} />
          <Divider />
          <PwField label="Xác nhận mật khẩu mới" value={confirmPw} set={setConfirmPw} show={showNew} setShow={setShowNew} />
          <div style={{ padding: "8px 20px 12px", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleChange}
              style={{ padding: "7px 20px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1em" }}>
              ĐỔI MẬT KHẨU
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Version Panel ────────────────────────────────────────────────────────────

function VersionPanel() {
  const { updateReady, onUpdate } = useUpdateContext();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card title="PHIÊN BẢN ỨNG DỤNG">
        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, color: "#0c1a2e", fontWeight: 600 }}>Postlain Store Manager</p>
            <p style={{ fontSize: 9, color: "#64748b", marginTop: 3 }}>Phiên bản hiện tại: <strong>v{APP_VERSION}</strong></p>
          </div>
          {updateReady ? (
            <button onClick={onUpdate} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 9, border: "none",
              background: "#C9A55A", color: "#0c1a2e",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              <RefreshCw size={10} /> CẬP NHẬT NGAY
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <Check size={10} style={{ color: "#10b981" }} />
              <span style={{ fontSize: 9, color: "#10b981", fontWeight: 600 }}>Mới nhất</span>
            </div>
          )}
        </div>
        <Divider />
        <div style={{ padding: "8px 20px 12px" }}>
          <p style={{ fontSize: 9, color: "#94a3b8" }}>
            Khi có bản cập nhật mới, nút &quot;CẬP NHẬT NGAY&quot; sẽ xuất hiện ở đây.
            Update lớn đổi tên version (v1 → v2), update nhỏ đổi đuôi (v1.0 → v1.1).
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const currentUser = useStore(s => s.currentUser);
  const storeName = useStore(s => s.storeName);
  const brandName = storeName.split("—")[0]?.trim() || storeName;
  const role = currentUser?.role ?? "staff";
  const { updateReady } = useUpdateContext();

  const visibleSections = SECTIONS.filter(s => hasAccess(role, s.minRole));
  const defaultSection = visibleSections[0]?.id ?? "security";
  const [active, setActive] = useState<SectionId>(defaultSection);

  // Nếu section đang active không có quyền → chuyển về section đầu tiên được phép
  const activeSection = visibleSections.find(s => s.id === active) ? active : defaultSection;

  function renderPanel() {
    if (!hasAccess(role, SECTIONS.find(s => s.id === activeSection)?.minRole ?? "admin")) {
      return (
        <div style={{ padding: "24px", borderRadius: 14, border: "1px solid rgba(201,165,90,0.3)", background: "rgba(201,165,90,0.06)", fontSize: 11, color: "#92712a", display: "flex", alignItems: "center", gap: 10 }}>
          <Lock size={14} style={{ color: "#C9A55A", flexShrink: 0 }} />
          Bạn không có quyền truy cập mục này.
        </div>
      );
    }
    if (activeSection === "store")    return <StorePanel />;
    if (activeSection === "shelves")  return <ShelvesPanel />;
    if (activeSection === "notify")   return <NotifyPanel />;
    if (activeSection === "display")  return <DisplayPanel />;
    if (activeSection === "users")    return <UsersPanel />;
    if (activeSection === "data")     return <DataPanel />;
    if (activeSection === "security") return <SecurityPanel />;
    if (activeSection === "version")  return <VersionPanel />;
    return null;
  }

  const [mobileShowPanel, setMobileShowPanel] = useState(false);

  const handleMobileSelect = (id: SectionId) => {
    setActive(id);
    setMobileShowPanel(true);
  };

  const SidebarContent = () => (
    <>
      {SECTIONS.map((s, i) => {
        const Icon = s.icon;
        const allowed = hasAccess(role, s.minRole);
        const isA = activeSection === s.id;
        return (
          <div key={s.id}>
            <button
              onClick={() => { if (allowed) { setActive(s.id); setMobileShowPanel(true); } }}
              style={{
                width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
                background: isA ? "rgba(14,165,233,0.06)" : "transparent",
                border: "none", borderLeft: `2px solid ${isA ? "#0ea5e9" : "transparent"}`,
                cursor: allowed ? "pointer" : "default", fontFamily: "inherit", textAlign: "left",
                opacity: allowed ? 1 : 0.4,
              }}
              onMouseEnter={e => { if (!isA && allowed) e.currentTarget.style.background = "#f0f9ff"; }}
              onMouseLeave={e => { if (!isA) e.currentTarget.style.background = "transparent"; }}
            >
              <Icon size={12} strokeWidth={1.5} style={{ flexShrink: 0, color: isA ? "#0ea5e9" : "#94a3b8" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, color: isA ? "#0c1a2e" : "#334e68", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</p>
                <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.desc}</p>
              </div>
              {s.id === "version" && updateReady && (
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#C9A55A", flexShrink: 0, marginRight: 2 }} />
              )}
              {allowed
                ? <ChevronRight size={9} style={{ color: isA ? "#94a3b8" : "#bae6fd", flexShrink: 0 }} />
                : <Lock size={9} style={{ color: "#bae6fd", flexShrink: 0 }} />
              }
            </button>
            {i < SECTIONS.length - 1 && <div style={{ height: 1, background: "#e0f2fe" }} />}
          </div>
        );
      })}
      <div style={{ height: 1, background: "#e0f2fe" }} />
      <Link href="/install" style={{ textDecoration: "none" }}>
        <div
          style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, background: "transparent", cursor: "pointer" }}
          onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = "#f0f9ff")}
          onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
        >
          <Smartphone size={12} strokeWidth={1.5} style={{ flexShrink: 0, color: "#C9A55A" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, color: "#334e68" }}>Cài Đặt App</p>
            <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>Cài PWA lên màn hình chính</p>
          </div>
          <ChevronRight size={9} style={{ color: "#C9A55A", flexShrink: 0 }} />
        </div>
      </Link>
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.38em" }}>
          QUẢN LÝ CỬA HÀNG · {brandName.toUpperCase()}
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 300, color: "#0c1a2e", marginTop: 4 }}>Cài Đặt</h1>
      </motion.div>

      {/* ── DESKTOP layout: sidebar + panel side-by-side ───────────────────── */}
      <div className="hidden md:flex" style={{ gap: 20, alignItems: "flex-start" }}>
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}
          style={{ width: 200, flexShrink: 0, borderRadius: 14, border: "1px solid #bae6fd", background: "#ffffff", overflow: "hidden" }}
        >
          <SidebarContent />
        </motion.div>

        {/* Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1, minWidth: 0 }}
          >
            {renderPanel()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── MOBILE layout: list → drill-in panel ───────────────────────────── */}
      <div className="md:hidden">
        {!mobileShowPanel ? (
          /* Section list */
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 14, border: "1px solid #bae6fd", background: "#ffffff", overflow: "hidden" }}
          >
            <SidebarContent />
          </motion.div>
        ) : (
          /* Panel with back button */
          <div>
            <button
              onClick={() => setMobileShowPanel(false)}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                cursor: "pointer", padding: "6px 0 12px", fontFamily: "inherit",
              }}
            >
              <ChevronRight size={13} style={{ color: "#0ea5e9", transform: "rotate(180deg)" }} />
              <span style={{ fontSize: 11, color: "#0ea5e9", fontWeight: 600 }}>Quay lại</span>
            </button>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                {renderPanel()}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
