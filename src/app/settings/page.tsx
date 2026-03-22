"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Store, Bell, Palette, Users, Database, Shield, ChevronRight, Check, ToggleLeft, ToggleRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const SECTIONS = [
  { id: "store",    label: "Thông Tin Cửa Hàng", icon: Store,    desc: "Tên, địa chỉ, liên hệ"    },
  { id: "notify",   label: "Thông Báo",           icon: Bell,     desc: "Cảnh báo tồn kho, báo cáo" },
  { id: "display",  label: "Giao Diện",            icon: Palette,  desc: "Bố cục, hoạt ảnh, theme"  },
  { id: "users",    label: "Người Dùng",           icon: Users,    desc: "Phân quyền truy cập"       },
  { id: "data",     label: "Dữ Liệu & Xuất File",  icon: Database, desc: "Sao lưu, export Excel"     },
  { id: "security", label: "Bảo Mật",              icon: Shield,   desc: "Mật khẩu, xác thực"       },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

function InputRow({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="px-5 py-3 flex items-center gap-4">
      <label className="text-text-secondary flex-shrink-0" style={{ fontSize: 11, width: 160 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary outline-none font-[inherit] transition-colors focus:border-blue"
        style={{ fontSize: 11 }}
      />
    </div>
  );
}

function Toggle({ label, desc, on, set }: { label: string; desc: string; on: boolean; set: (v: boolean) => void }) {
  const Icon = on ? ToggleRight : ToggleLeft;
  return (
    <div onClick={() => set(!on)} className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-bg-elevated transition-colors">
      <div>
        <p className="text-text-primary" style={{ fontSize: 11 }}>{label}</p>
        <p className="text-text-muted" style={{ fontSize: 9, marginTop: 2 }}>{desc}</p>
      </div>
      <Icon size={22} strokeWidth={1.5} style={{ flexShrink: 0, color: on ? "var(--gold)" : "var(--text-muted)", transition: "color 0.14s" }} />
    </div>
  );
}

function Divider() { return <div className="h-px bg-border mx-5" />; }

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <p className="text-text-muted font-semibold uppercase tracking-[0.2em]" style={{ fontSize: 8 }}>{title}</p>
      </div>
      <div className="py-1.5">{children}</div>
    </div>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────

function StorePanel() {
  const [name,     setName]     = useState("ALDO — Vincom Đồng Khởi");
  const [addr,     setAddr]     = useState("72 Lê Thánh Tôn, Q.1, TP.HCM");
  const [phone,    setPhone]    = useState("+84 28 3822 1234");
  const [email,    setEmail]    = useState("store.hcm@aldo.com");
  const [currency, setCurrency] = useState("VND");
  return (
    <div className="flex flex-col gap-3">
      <Card title="Thông Tin Cơ Bản">
        <InputRow label="Tên cửa hàng"   value={name}     onChange={setName}    />
        <Divider /><InputRow label="Địa chỉ"         value={addr}     onChange={setAddr}    />
        <Divider /><InputRow label="Điện thoại"      value={phone}    onChange={setPhone}   />
        <Divider /><InputRow label="Email"           value={email}    onChange={setEmail}   type="email" />
      </Card>
      <Card title="Khu Vực">
        <InputRow label="Đơn vị tiền tệ" value={currency} onChange={setCurrency} />
      </Card>
    </div>
  );
}

function NotifyPanel() {
  const [lowStock,  setLowStock]  = useState(true);
  const [movement,  setMovement]  = useState(true);
  const [daily,     setDaily]     = useState(false);
  const [pushNotif, setPushNotif] = useState(true);
  return (
    <div className="flex flex-col gap-3">
      <Card title="Cảnh Báo Kho">
        <Toggle label="Cảnh báo tồn kho thấp" desc="Thông báo khi SL < ngưỡng tối thiểu" on={lowStock} set={setLowStock} />
        <Divider />
        <Toggle label="Thông báo biến động"   desc="Mỗi khi có nhập/xuất/chuyển kho mới"  on={movement} set={setMovement} />
        <Divider />
        <Toggle label="Báo cáo hàng ngày"     desc="Tổng hợp cuối ngày gửi qua email"     on={daily}    set={setDaily} />
      </Card>
      <Card title="Kênh Nhận Thông Báo">
        <Toggle label="Push trên trình duyệt" desc="Thông báo trực tiếp" on={pushNotif} set={setPushNotif} />
      </Card>
    </div>
  );
}

function DisplayPanel() {
  const [compact, setCompact] = useState(false);
  const [anim,    setAnim]    = useState(true);
  const [density, setDensity] = useState<"thoải_mái" | "gọn">("thoải_mái");
  return (
    <div className="flex flex-col gap-3">
      {/* Theme toggle */}
      <Card title="Giao Diện Màu Sắc">
        <div className="px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-text-primary" style={{ fontSize: 11 }}>Chế Độ Sáng / Tối</p>
            <p className="text-text-muted" style={{ fontSize: 9, marginTop: 2 }}>Chuyển đổi giữa giao diện sáng và tối</p>
          </div>
          <ThemeToggle variant="full" />
        </div>
      </Card>

      <Card title="Chế Độ Hiển Thị">
        <Toggle label="Chế độ gọn" desc="Thu nhỏ khoảng cách trong bảng" on={compact} set={setCompact} />
        <Divider />
        <Toggle label="Hoạt ảnh"   desc="Bật/tắt hiệu ứng chuyển động"   on={anim}   set={setAnim} />
      </Card>

      <Card title="Mật Độ Bảng Dữ Liệu">
        {(["thoải_mái", "gọn"] as const).map((d, i) => (
          <div key={d}>
            <div onClick={() => setDensity(d)} className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-bg-elevated transition-colors">
              <div>
                <p className="text-text-primary" style={{ fontSize: 11 }}>{d === "thoải_mái" ? "Thoải Mái" : "Gọn"}</p>
                <p className="text-text-muted" style={{ fontSize: 9, marginTop: 2 }}>
                  {d === "thoải_mái" ? "Hàng cao 52px — dễ đọc" : "Hàng cao 38px — nhiều hàng hơn"}
                </p>
              </div>
              <div
                className="w-4 h-4 rounded-full border flex items-center justify-center transition-all"
                style={{
                  borderColor: density === d ? "var(--blue)" : "var(--border)",
                  background:  density === d ? "var(--blue)" : "transparent",
                }}
              >
                {density === d && <Check size={8} color="white" strokeWidth={3} />}
              </div>
            </div>
            {i === 0 && <Divider />}
          </div>
        ))}
      </Card>
    </div>
  );
}

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card py-14 text-center">
      <p className="text-text-muted tracking-widest" style={{ fontSize: 11 }}>{label} — sắp có</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>("store");

  function renderPanel() {
    if (active === "store")   return <StorePanel />;
    if (active === "notify")  return <NotifyPanel />;
    if (active === "display") return <DisplayPanel />;
    return <PlaceholderPanel label={SECTIONS.find(s => s.id === active)?.label ?? active} />;
  }

  const showSave = active === "store" || active === "notify" || active === "display";

  return (
    <div className="flex flex-col gap-8">

      {/* Tiêu đề */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="flex flex-col gap-1.5"
      >
        <p className="text-text-muted font-semibold uppercase tracking-[0.38em]" style={{ fontSize: 9 }}>
          Quản Lý Cửa Hàng · ALDO
        </p>
        <h1 className="text-text-primary font-light tracking-wide" style={{ fontSize: 26 }}>Cài Đặt</h1>
      </motion.div>

      {/* 2-column layout */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-start">

        {/* Sidebar nav */}
        <motion.div
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="w-full md:w-[200px] md:flex-shrink-0 rounded-xl border border-border bg-bg-card overflow-hidden"
        >
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            const isA  = active === s.id;
            return (
              <div key={s.id}>
                <button
                  onClick={() => setActive(s.id)}
                  className="w-full px-3.5 py-3 flex items-center gap-2.5 border-l-2 font-[inherit] cursor-pointer transition-all hover:bg-bg-elevated"
                  style={{
                    background:  isA ? "var(--blue-subtle)" : "transparent",
                    borderColor: isA ? "var(--blue)" : "transparent",
                    border: `none`,
                    borderLeft: `2px solid ${isA ? "var(--blue)" : "transparent"}`,
                  }}
                >
                  <Icon size={12} strokeWidth={1.5} style={{ flexShrink: 0, color: isA ? "var(--blue)" : "var(--text-muted)" }} />
                  <div className="text-left flex-1 overflow-hidden">
                    <p className="truncate" style={{ fontSize: 11, color: isA ? "var(--text-primary)" : "var(--text-secondary)" }}>{s.label}</p>
                    <p className="truncate text-text-muted" style={{ fontSize: 8, marginTop: 2 }}>{s.desc}</p>
                  </div>
                  <ChevronRight size={9} strokeWidth={1.5} style={{ color: isA ? "var(--text-muted)" : "var(--border)" }} />
                </button>
                {i < SECTIONS.length - 1 && <div className="h-px bg-border" />}
              </div>
            );
          })}
        </motion.div>

        {/* Panel */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
          className="flex-1 min-w-0 flex flex-col gap-3"
        >
          {renderPanel()}
          {showSave && (
            <div className="flex justify-end">
              <button
                className="px-6 py-2.5 rounded-lg border font-semibold cursor-pointer font-[inherit] transition-colors"
                style={{
                  background:  "var(--blue-subtle)",
                  borderColor: "var(--blue-dark)",
                  color:       "var(--blue)",
                  fontSize:    9,
                  letterSpacing: "0.16em",
                }}
              >
                LƯU THAY ĐỔI
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
