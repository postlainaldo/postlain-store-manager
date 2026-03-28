"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import {
  Store, User, Database, CheckCircle2,
  ChevronRight, ChevronLeft, Eye, EyeOff,
  Loader2, AlertCircle,
} from "lucide-react";

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "store",    label: "Cửa Hàng",  icon: Store,    desc: "Thông tin cơ bản" },
  { id: "admin",    label: "Tài Khoản", icon: User,     desc: "Admin đầu tiên"   },
  { id: "seed",     label: "Dữ Liệu",   icon: Database, desc: "Khởi tạo kho"     },
  { id: "done",     label: "Hoàn Tất",  icon: CheckCircle2, desc: "Sẵn sàng dùng" },
] as const;

type StepId = typeof STEPS[number]["id"];

// ─── Shared Input ─────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = "text", placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#f0f9ff", border: "1.5px solid #bae6fd",
            borderRadius: 10, padding: isPassword ? "9px 38px 9px 12px" : "9px 12px",
            fontSize: 12, color: "#0c1a2e", outline: "none", fontFamily: "inherit",
            transition: "border-color 0.15s",
          }}
          onFocus={e => (e.target.style.borderColor = "#0ea5e9")}
          onBlur={e => (e.target.style.borderColor = "#bae6fd")}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "#94a3b8" }}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p style={{ fontSize: 9, color: "#94a3b8" }}>{hint}</p>}
    </div>
  );
}

// ─── Step 1: Store info ───────────────────────────────────────────────────────

function StoreStep({
  data, onChange,
}: {
  data: { name: string; address: string; phone: string; email: string };
  onChange: (k: string, v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Tên cửa hàng *" value={data.name} onChange={v => onChange("name", v)}
        placeholder="VD: POSTLAIN ALDO GO! ĐÀ LẠT" />
      <Field label="Địa chỉ" value={data.address} onChange={v => onChange("address", v)}
        placeholder="Trung Tâm GO! Đà Lạt, Đà Lạt, Lâm Đồng" />
      <Field label="Số điện thoại" value={data.phone} onChange={v => onChange("phone", v)}
        placeholder="+84 28 3822 1234" type="tel" />
      <Field label="Email cửa hàng" value={data.email} onChange={v => onChange("email", v)}
        placeholder="store@domain.com" type="email" />
    </div>
  );
}

// ─── Step 2: Admin account ────────────────────────────────────────────────────

function AdminStep({
  data, onChange,
}: {
  data: { name: string; email: string; password: string; confirm: string };
  onChange: (k: string, v: string) => void;
}) {
  const mismatch = data.confirm && data.password !== data.confirm;
  const weak = data.password && data.password.length < 4;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)", fontSize: 10, color: "#0369a1", lineHeight: 1.5 }}>
        Tài khoản này sẽ là <b>Admin</b> duy nhất lúc đầu. Bạn có thể thêm nhân viên sau trong mục Cài Đặt → Người Dùng.
      </div>
      <Field label="Họ tên *" value={data.name} onChange={v => onChange("name", v)} placeholder="Nguyễn Văn A" />
      <Field label="Email đăng nhập *" value={data.email} onChange={v => onChange("email", v)} placeholder="admin@postlain.com" type="email" />
      <Field label="Mật khẩu *" value={data.password} onChange={v => onChange("password", v)}
        type="password" hint={weak ? "Tối thiểu 4 ký tự" : undefined} />
      <div>
        <Field label="Xác nhận mật khẩu *" value={data.confirm} onChange={v => onChange("confirm", v)} type="password" />
        {mismatch && <p style={{ fontSize: 9, color: "#dc2626", marginTop: 4 }}>Mật khẩu không khớp</p>}
      </div>
    </div>
  );
}

// ─── Step 3: Seed data ────────────────────────────────────────────────────────

function SeedStep({
  mode, setMode, status,
}: {
  mode: "sample" | "empty";
  setMode: (m: "sample" | "empty") => void;
  status: "idle" | "seeding" | "done" | "error";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
        Bạn muốn bắt đầu với dữ liệu mẫu hay kho trống?
      </p>
      {(["sample", "empty"] as const).map(m => (
        <button
          key={m}
          onClick={() => setMode(m)}
          style={{
            padding: "14px 18px", borderRadius: 14,
            border: `2px solid ${mode === m ? "#0ea5e9" : "#bae6fd"}`,
            background: mode === m ? "#f0f9ff" : "#fff",
            cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            transition: "all 0.15s",
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: mode === m ? "#0ea5e9" : "#334e68" }}>
            {m === "sample" ? "📦 Dữ liệu mẫu" : "✨ Kho trống"}
          </p>
          <p style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
            {m === "sample"
              ? "55 sản phẩm ALDO mẫu, 22 kệ kho được tạo sẵn — phù hợp để thử nghiệm"
              : "Không có sản phẩm nào — bắt đầu nhập hàng thủ công hoặc qua Excel"}
          </p>
        </button>
      ))}
      {status === "seeding" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)" }}>
          <Loader2 size={13} style={{ color: "#0ea5e9", animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 11, color: "#0ea5e9" }}>Đang khởi tạo dữ liệu...</p>
        </div>
      )}
      {status === "done" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)" }}>
          <CheckCircle2 size={13} style={{ color: "#10b981" }} />
          <p style={{ fontSize: 11, color: "#065f46", fontWeight: 600 }}>Khởi tạo hoàn tất!</p>
        </div>
      )}
      {status === "error" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <AlertCircle size={13} style={{ color: "#dc2626" }} />
          <p style={{ fontSize: 11, color: "#dc2626" }}>Có lỗi xảy ra. Bạn có thể bỏ qua và cài đặt sau.</p>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

function DoneStep({ storeName, adminEmail }: { storeName: string; adminEmail: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", textAlign: "center", padding: "20px 0" }}>
      <motion.div
        initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
        style={{ fontSize: 52 }}
      >
        🎉
      </motion.div>
      <div>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#0c1a2e", letterSpacing: "-0.02em" }}>Sẵn sàng rồi!</p>
        <p style={{ fontSize: 11, color: "#64748b", marginTop: 6, lineHeight: 1.6 }}>
          <b style={{ color: "#0c1a2e" }}>{storeName || "Cửa hàng"}</b> đã được cấu hình.<br />
          Đăng nhập bằng: <b style={{ color: "#0ea5e9" }}>{adminEmail}</b>
        </p>
      </div>
      <div style={{ width: "100%", borderRadius: 12, border: "1px solid #bae6fd", background: "#f0f9ff", padding: "12px 16px" }}>
        <p style={{ fontSize: 9, color: "#64748b", fontWeight: 700, letterSpacing: "0.2em", marginBottom: 10 }}>BƯỚC TIẾP THEO</p>
        {[
          "Đăng nhập với tài khoản admin vừa tạo",
          "Nhập hàng từ file Excel hoặc thêm thủ công",
          "Xếp hàng vào kệ trong mục Trưng Bày",
          "Thêm tài khoản nhân viên trong Cài Đặt",
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#0ea5e9", color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
            <p style={{ fontSize: 10, color: "#334e68", lineHeight: 1.5 }}>{t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const { setStoreSetting, addUser, login } = useStore();

  const [step, setStep] = useState<StepId>("store");
  const stepIdx = STEPS.findIndex(s => s.id === step);

  const [store, setStore] = useState({ name: "", address: "", phone: "", email: "" });
  const [admin, setAdmin] = useState({ name: "", email: "", password: "", confirm: "" });
  const [seedMode, setSeedMode] = useState<"sample" | "empty">("sample");
  const [seedStatus, setSeedStatus] = useState<"idle" | "seeding" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const updateStore = (k: string, v: string) => setStore(s => ({ ...s, [k]: v }));
  const updateAdmin = (k: string, v: string) => setAdmin(s => ({ ...s, [k]: v }));

  const canNext = () => {
    if (step === "store") return store.name.trim().length > 0;
    if (step === "admin") {
      return admin.name.trim() && admin.email.trim() &&
        admin.password.length >= 4 && admin.password === admin.confirm;
    }
    if (step === "seed") return seedStatus === "done" || seedStatus === "error" || seedStatus === "idle";
    return true;
  };

  const handleNext = async () => {
    setError("");

    if (step === "store") {
      setStoreSetting("storeName", store.name);
      if (store.address) setStoreSetting("storeAddress", store.address);
      if (store.phone)   setStoreSetting("storePhone",   store.phone);
      if (store.email)   setStoreSetting("storeEmail",   store.email);
      setStep("admin");
      return;
    }

    if (step === "admin") {
      // Check email not duplicate
      addUser({ name: admin.name, email: admin.email, passwordHash: admin.password, role: "admin", active: true });
      setStep("seed");
      return;
    }

    if (step === "seed") {
      if (seedMode === "sample" && seedStatus === "idle") {
        setSeedStatus("seeding");
        try {
          const res = await fetch("/api/seed", { method: "POST" });
          if (res.ok) {
            setSeedStatus("done");
          } else {
            setSeedStatus("error");
          }
        } catch {
          setSeedStatus("error");
        }
        // Wait a beat then proceed
        await new Promise(r => setTimeout(r, 800));
      }
      setStep("done");
      return;
    }

    if (step === "done") {
      // Log in as the new admin and redirect
      login(admin.email, admin.password);
      router.replace("/");
    }
  };

  const handleBack = () => {
    const idx = STEPS.findIndex(s => s.id === step);
    if (idx > 0) setStep(STEPS[idx - 1].id);
  };

  const isDone = step === "done";

  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 60%, #f0f9ff 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "32px 16px 60px",
      }}>
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#0c1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 16 }}>👟</span>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 900, color: "#0c1a2e", letterSpacing: "-0.01em" }}>POSTLAIN</p>
              <p style={{ fontSize: 8, color: "#94a3b8", letterSpacing: "0.15em" }}>STORE MANAGER</p>
            </div>
          </div>

          {/* Progress steps */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {STEPS.map((s, i) => {
              const done = i < stepIdx;
              const active = i === stepIdx;
              const Icon = s.icon;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? "#0ea5e9" : active ? "#0c1a2e" : "#e0f2fe",
                    border: `2px solid ${done ? "#0ea5e9" : active ? "#0c1a2e" : "#bae6fd"}`,
                    transition: "all 0.25s",
                  }}>
                    {done
                      ? <CheckCircle2 size={14} color="#fff" />
                      : <Icon size={13} color={active ? "#fff" : "#94a3b8"} />
                    }
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: done ? "#0ea5e9" : "#e0f2fe", margin: "0 4px", transition: "background 0.25s" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Card */}
          <motion.div
            style={{ borderRadius: 20, background: "#fff", border: "1px solid #bae6fd", overflow: "hidden", boxShadow: "0 8px 40px rgba(14,165,233,0.08)" }}
          >
            {/* Card header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #e0f2fe", background: "#f0f9ff" }}>
              <p style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.2em", marginBottom: 4 }}>
                BƯỚC {stepIdx + 1} / {STEPS.length}
              </p>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0c1a2e", letterSpacing: "-0.01em" }}>
                {STEPS[stepIdx].label}
              </h2>
              <p style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{STEPS[stepIdx].desc}</p>
            </div>

            {/* Card body */}
            <div style={{ padding: "22px 24px" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                >
                  {step === "store" && <StoreStep data={store} onChange={updateStore} />}
                  {step === "admin" && <AdminStep data={admin} onChange={updateAdmin} />}
                  {step === "seed"  && <SeedStep mode={seedMode} setMode={setSeedMode} status={seedStatus} />}
                  {step === "done"  && <DoneStep storeName={store.name} adminEmail={admin.email} />}
                </motion.div>
              </AnimatePresence>

              {error && (
                <p style={{ marginTop: 12, fontSize: 10, color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertCircle size={11} /> {error}
                </p>
              )}
            </div>
          </motion.div>

          {/* Navigation buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            {stepIdx > 0 && !isDone && (
              <button
                onClick={handleBack}
                style={{
                  flex: "0 0 auto", padding: "0 18px", height: 44, borderRadius: 12,
                  border: "1.5px solid #bae6fd", background: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11, color: "#334e68", fontFamily: "inherit",
                }}
              >
                <ChevronLeft size={14} /> Quay lại
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canNext()}
              style={{
                flex: 1, height: 44, borderRadius: 12, border: "none",
                background: canNext() ? (isDone ? "#10b981" : "#0ea5e9") : "#bae6fd",
                color: "#fff", fontSize: 12, fontWeight: 700, cursor: canNext() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontFamily: "inherit", letterSpacing: "0.05em", transition: "background 0.15s",
              }}
            >
              {isDone ? (
                <>Bắt Đầu Sử Dụng <ChevronRight size={15} /></>
              ) : step === "seed" && seedStatus === "idle" && seedMode === "sample" ? (
                <>Khởi Tạo & Tiếp Tục <ChevronRight size={15} /></>
              ) : (
                <>Tiếp Tục <ChevronRight size={15} /></>
              )}
            </button>
          </div>

          {/* Skip link */}
          {step !== "done" && (
            <button
              onClick={() => router.replace("/login")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#94a3b8", fontFamily: "inherit", textDecoration: "underline" }}
            >
              Bỏ qua, cài đặt sau
            </button>
          )}

        </div>
      </div>
    </>
  );
}
