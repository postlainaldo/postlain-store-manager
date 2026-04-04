"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Pin, Megaphone, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { useStore } from "@/store/useStore";
import { playSound } from "@/hooks/useSFX";

type Notif = { id: string; title: string; body: string; type: string; createdBy: string; createdAt: string; pinned: number };

const TYPE_CFG: Record<string, { icon: typeof Info; color: string; bg: string; border: string }> = {
  info:    { icon: Info,          color: "#0ea5e9", bg: "rgba(14,165,233,0.07)",  border: "rgba(14,165,233,0.25)"  },
  warning: { icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.25)"  },
  success: { icon: CheckCircle,   color: "#10b981", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.25)"  },
  urgent:  { icon: Megaphone,     color: "#dc2626", bg: "rgba(220,38,38,0.07)",  border: "rgba(220,38,38,0.25)"   },
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

export default function NotificationBanner() {
  const { currentUser } = useStore();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  // For banner popup (latest pinned/urgent)
  const [banner, setBanner] = useState<Notif | null>(null);

  // Load dismissed IDs from localStorage synchronously on first render
  const lsKey = currentUser ? `notif_dismissed_${currentUser.id}` : null;
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined" || !currentUser) return new Set<string>();
    try {
      const key = `notif_dismissed_${currentUser.id}`;
      const saved = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(saved)) return new Set<string>(saved);
    } catch { /* ignore */ }
    return new Set<string>();
  });
  // Keep a ref so load() always reads current dismissed without re-subscribing
  const dismissedRef = useRef(dismissed);
  useEffect(() => { dismissedRef.current = dismissed; }, [dismissed]);

  // Persist dismissed to localStorage whenever it changes
  useEffect(() => {
    if (!lsKey) return;
    localStorage.setItem(lsKey, JSON.stringify([...dismissed]));
  }, [dismissed, lsKey]);

  const load = useCallback(async () => {
    const data = await fetch("/api/notifications").then(r => r.json()).catch(() => []);
    if (!Array.isArray(data)) return;
    setNotifs(data);
    // Show banner for latest urgent/pinned not yet dismissed
    const important = data.find((n: Notif) =>
      (n.pinned || n.type === "urgent") && !dismissedRef.current.has(n.id)
    );
    if (important) setBanner(prev => prev?.id === important.id ? prev : important);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 300000); // poll every 5 min
    return () => clearInterval(t);
  }, [load]);

  const unread = notifs.filter(n => !dismissed.has(n.id)).length;

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager";

  return (
    <>
      {/* Bell button */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => { const next = !open; setOpen(next); setBanner(null); playSound(next ? "modalOpen" : "modalClose"); }}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid #bae6fd",
            background: open ? "rgba(14,165,233,0.08)" : "#f0f9ff",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            position: "relative",
          }}
          title="Thông báo"
        >
          <Bell size={14} style={{ color: unread > 0 ? "#0ea5e9" : "#94a3b8" }} />
          {unread > 0 && (
            <div style={{
              position: "absolute", top: -4, right: -4,
              width: 16, height: 16, borderRadius: "50%",
              background: "#dc2626", border: "2px solid #fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 7, fontWeight: 700, color: "#fff" }}>{unread > 9 ? "9+" : unread}</span>
            </div>
          )}
        </button>

        {/* Dropdown panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                width: 340, maxHeight: 480,
                background: "#fff", border: "1px solid #bae6fd",
                borderRadius: 16, boxShadow: "0 12px 40px rgba(12,26,46,0.12)",
                zIndex: 200, overflow: "hidden", display: "flex", flexDirection: "column",
              }}
            >
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #e0f2fe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Bell size={13} style={{ color: "#0ea5e9" }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#0c1a2e" }}>Thông Báo</p>
                  {unread > 0 && <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 20, background: "#dc2626", color: "#fff", fontWeight: 700 }}>{unread}</span>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {unread > 0 && (
                    <button onClick={() => setDismissed(new Set(notifs.map(n => n.id)))}
                      style={{ fontSize: 8, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                      Đánh dấu tất cả đã đọc
                    </button>
                  )}
                  <button onClick={() => setOpen(false)}
                    style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid #e0f2fe", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X size={10} style={{ color: "#94a3b8" }} />
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto" }}>
                {notifs.length === 0 && (
                  <p style={{ padding: "24px", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>Không có thông báo nào</p>
                )}
                {notifs.map(n => {
                  const tcfg = TYPE_CFG[n.type] ?? TYPE_CFG.info;
                  const Icon = tcfg.icon;
                  const isRead = dismissed.has(n.id);
                  return (
                    <div key={n.id}
                      onClick={() => setDismissed(prev => new Set([...prev, n.id]))}
                      style={{
                        padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f0f9ff",
                        background: isRead ? "transparent" : "rgba(14,165,233,0.03)",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = isRead ? "transparent" : "rgba(14,165,233,0.03)"}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: tcfg.bg, border: `1px solid ${tcfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={13} style={{ color: tcfg.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#0c1a2e" }}>{n.title}</p>
                            {n.pinned === 1 && <Pin size={9} style={{ color: "#C9A55A" }} />}
                            {!isRead && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0ea5e9", marginLeft: "auto", flexShrink: 0 }} />}
                          </div>
                          <p style={{ fontSize: 10, color: "#64748b", marginTop: 2, lineHeight: 1.5 }}>{n.body}</p>
                          <p style={{ fontSize: 8, color: "#b0c4d8", marginTop: 4 }}>{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating banner for urgent/pinned */}
      <AnimatePresence>
        {banner && !open && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            style={{
              position: "fixed", top: 64, left: "50%",
              width: "min(420px, calc(100vw - 32px))",
              background: "#fff", border: "1px solid #bae6fd",
              borderRadius: 14, padding: "14px 16px",
              boxShadow: "0 8px 32px rgba(12,26,46,0.15)",
              zIndex: 300, display: "flex", gap: 12, alignItems: "flex-start",
            }}
          >
            {(() => {
              const tcfg = TYPE_CFG[banner.type] ?? TYPE_CFG.info;
              const Icon = tcfg.icon;
              return (
                <>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: tcfg.bg, border: `1px solid ${tcfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={16} style={{ color: tcfg.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#0c1a2e" }}>{banner.title}</p>
                    <p style={{ fontSize: 10, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{banner.body}</p>
                  </div>
                  <button onClick={() => { setBanner(null); setDismissed(prev => new Set([...prev, banner.id])); }}
                    style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid #e0f2fe", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    <X size={10} style={{ color: "#94a3b8" }} />
                  </button>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
