"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Send, Pin, Trash2, Megaphone, Info, AlertTriangle, CheckCircle, X } from "lucide-react";
import { useStore, sel } from "@/store/useStore";
import { useTheme } from "@/hooks/useTheme";

type Notif = { id: string; title: string; body: string; type: string; createdBy: string; createdAt: string; pinned: number };

const TYPES = [
  { id: "info",    label: "Thông tin", icon: Info,          color: "#0ea5e9" },
  { id: "warning", label: "Cảnh báo",  icon: AlertTriangle, color: "#f59e0b" },
  { id: "success", label: "Tốt",       icon: CheckCircle,   color: "#10b981" },
  { id: "urgent",  label: "Khẩn",      icon: Megaphone,     color: "#dc2626" },
];

export default function AdminNotifyPanel() {
  const currentUser = useStore(sel.currentUser);
  const t = useTheme();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [form, setForm] = useState({ title: "", body: "", type: "info", pinned: false });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const load = () => fetch("/api/notifications").then(r => r.json()).then(d => setNotifs(Array.isArray(d) ? d : [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim() || !currentUser) return;
    setSending(true);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": currentUser.id },
      body: JSON.stringify({ ...form, createdBy: currentUser.id }),
    });
    setForm({ title: "", body: "", type: "info", pinned: false });
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 2000);
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json", "x-user-id": currentUser?.id ?? "" }, body: JSON.stringify({ id }) });
    load();
  };

  const handlePin = async (id: string, pinned: number) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json", "x-user-id": currentUser?.id ?? "" }, body: JSON.stringify({ id, pinned: pinned === 0 ? 1 : 0 }) });
    load();
  };

  const selectedType = TYPES.find(t => t.id === form.type) ?? TYPES[0];
  const SelectedIcon = selectedType.icon;

  return (
    <div style={{ borderRadius: 18, border: `1px solid ${t.cardBorder}`, background: t.cardBg, backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", overflow: "hidden", maxHeight: "85vh", overflowY: "auto", boxShadow: t.cardShadowLg }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(90deg, rgba(14,165,233,0.10), rgba(255,255,255,0.03))", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(14,165,233,0.10)", border: "1px solid rgba(14,165,233,0.20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Bell size={11} style={{ color: "#0ea5e9" }} />
        </div>
        <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.22em", flex: 1, textTransform: "uppercase" }}>Gửi Thông Báo Nhân Viên</p>
      </div>

      {/* Compose */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(186,230,253,0.4)" }}>
        {/* Type selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {TYPES.map(t => {
            const TIcon = t.icon;
            const active = form.type === t.id;
            return (
              <button key={t.id} onClick={() => setForm(v => ({ ...v, type: t.id }))}
                style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20,
                  border: `1px solid ${active ? t.color : "var(--border)"}`,
                  background: active ? `${t.color}12` : "transparent",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                <TIcon size={9} style={{ color: t.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: active ? t.color : "#94a3b8" }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        <input
          value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))}
          placeholder="Tiêu đề thông báo..."
          style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 16, color: "var(--text-primary)", outline: "none", fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box" }}
        />
        <textarea
          value={form.body} onChange={e => setForm(v => ({ ...v, body: e.target.value }))}
          placeholder="Nội dung chi tiết..."
          rows={2}
          style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 16, color: "var(--text-primary)", outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box" }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 10, color: "#64748b" }}>
            <input type="checkbox" checked={form.pinned} onChange={e => setForm(v => ({ ...v, pinned: e.target.checked }))} />
            <Pin size={10} style={{ color: "#b5f23d" }} />
            Ghim thông báo
          </label>

          <button onClick={handleSend} disabled={!form.title.trim() || !form.body.trim() || sending}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", minHeight: 40, borderRadius: 9, border: "none",
              background: sent ? "#10b981" : (form.title.trim() ? "linear-gradient(135deg, var(--blue), var(--blue-dark))" : "rgba(186,230,253,0.4)"),
              color: form.title.trim() ? "#fff" : "var(--text-muted)",
              fontSize: 9, fontWeight: 700, cursor: form.title.trim() ? "pointer" : "default", fontFamily: "inherit",
              boxShadow: form.title.trim() && !sent ? "0 2px 10px rgba(14,165,233,0.28)" : "none",
              transition: "background 0.2s, box-shadow 0.2s",
            }}>
            {sent ? <><CheckOk size={10} /> ĐÃ GỬI</> : <><Send size={10} /> GỬI NGAY</>}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        {notifs.length === 0 && <p style={{ padding: "16px 20px", fontSize: 10, color: "#94a3b8" }}>Chưa có thông báo nào</p>}
        {notifs.map((n, i) => {
          const tcfg = TYPES.find(t => t.id === n.type) ?? TYPES[0];
          const NIcon = tcfg.icon;
          return (
            <div key={n.id} style={{ padding: "10px 20px", borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${tcfg.color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <NIcon size={12} style={{ color: tcfg.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>{n.title}</p>
                  {n.pinned === 1 && <Pin size={8} style={{ color: "#b5f23d" }} />}
                </div>
                <p style={{ fontSize: 11, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>{n.body}</p>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => handlePin(n.id, n.pinned)}
                  style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${n.pinned ? "rgba(181,242,61,0.45)" : "var(--border)"}`, background: n.pinned ? "rgba(181,242,61,0.10)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Pin size={12} style={{ color: n.pinned ? "#b5f23d" : "var(--text-muted)" }} />
                </button>
                <button onClick={() => handleDelete(n.id)}
                  style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Trash2 size={12} style={{ color: "#dc2626" }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckOk({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
