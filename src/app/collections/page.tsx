"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Package, CalendarDays, Pencil, Archive, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { CollectionStatus, Gender, COLLECTION_STATUS_LABEL, GENDER_LABEL } from "@/types/inventory";
import { useTheme } from "@/hooks/useTheme";

// ─── Mock data ────────────────────────────────────────────────────────────────

const COLLECTIONS = [
  { id: "c1", name: "SS25 Women",  season: "SS25", year: 2025, gender: Gender.WOMEN, status: CollectionStatus.PRODUCTION, desc: "Spring/Summer 2025 — Nữ",       launch: "2025-03-01", end: "2025-08-31", count: 34 },
  { id: "c2", name: "SS25 Men",    season: "SS25", year: 2025, gender: Gender.MEN,   status: CollectionStatus.PRODUCTION, desc: "Spring/Summer 2025 — Nam",       launch: "2025-03-15", end: "2025-08-31", count: 22 },
  { id: "c3", name: "AW25 Women",  season: "AW25", year: 2025, gender: Gender.WOMEN, status: CollectionStatus.SAMPLING,   desc: "Thu/Đông 2025 — Đang may mẫu",  launch: "2025-09-01", end: "2026-02-28", count: 12 },
  { id: "c4", name: "AW25 Men",    season: "AW25", year: 2025, gender: Gender.MEN,   status: CollectionStatus.SKETCH,     desc: "Thu/Đông 2025 — Bản thảo",      launch: "2025-09-15", end: "2026-02-28", count: 5  },
  { id: "c5", name: "SS24 Women",  season: "SS24", year: 2024, gender: Gender.WOMEN, status: CollectionStatus.RELEASED,   desc: "Spring/Summer 2024 — Đã ra mắt", launch: "2024-03-01", end: "2024-08-31", count: 40 },
  { id: "c6", name: "AW24 Women",  season: "AW24", year: 2024, gender: Gender.WOMEN, status: CollectionStatus.ARCHIVED,   desc: "Thu/Đông 2024 — Kết thúc",      launch: "2024-09-01", end: "2025-02-28", count: 38 },
] as const;

const STATUS_ORDER = [
  CollectionStatus.SKETCH,
  CollectionStatus.SAMPLING,
  CollectionStatus.PRODUCTION,
  CollectionStatus.RELEASED,
  CollectionStatus.ARCHIVED,
];

const STATUS_CFG: Record<CollectionStatus, { color: string; bg: string; icon: typeof CheckCircle2; vi: string }> = {
  [CollectionStatus.SKETCH]:     { color: "#9B88C4", bg: "rgba(155,136,196,0.10)", icon: Pencil,       vi: "Bản Thảo"  },
  [CollectionStatus.SAMPLING]:   { color: "#7A9EC0", bg: "rgba(122,158,192,0.10)", icon: Sparkles,     vi: "Đang Mẫu"  },
  [CollectionStatus.PRODUCTION]: { color: "#b5f23d", bg: "rgba(181,242,61,0.10)",  icon: Clock,        vi: "Sản Xuất"  },
  [CollectionStatus.RELEASED]:   { color: "#7BAF6A", bg: "rgba(123,175,106,0.10)", icon: CheckCircle2, vi: "Đã Ra Mắt" },
  [CollectionStatus.ARCHIVED]:   { color: "#555",    bg: "rgba(85,85,85,0.10)",    icon: Archive,      vi: "Kết Thúc"  },
};

const GENDER_COLOR: Record<Gender, string> = {
  [Gender.WOMEN]: "#b5f23d", [Gender.MEN]: "#7A9EC0", [Gender.KIDS]: "#7BAF6A", [Gender.UNISEX]: "#9B88C4",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { month: "short", year: "numeric" });
}

const fadeUp = {
  hidden:  { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] } }),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const t = useTheme();
  const [filter,   setFilter]   = useState<CollectionStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const shown = COLLECTIONS.filter(c => filter === "all" || c.status === filter);
  const byStatus = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = COLLECTIONS.filter(c => c.status === s).length;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* Tiêu đề */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 13,
          background: "linear-gradient(135deg, rgba(181,242,61,0.18) 0%, rgba(181,242,61,0.06) 100%)",
          border: "1px solid rgba(181,242,61,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(181,242,61,0.16)",
          flexShrink: 0,
        }}>
          <Sparkles size={18} color="var(--gold)" />
        </div>
        <div>
          <p style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.32em", margin: 0 }}>POSTLAIN</p>
          <h1 style={{ fontSize: 22, fontWeight: 300, color: "var(--text-primary)", margin: 0, letterSpacing: "0.01em", lineHeight: 1.2 }}>Bộ Sưu Tập</h1>
        </div>
      </motion.div>

      {/* Thanh pipeline */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "rgba(186,230,253,0.3)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(186,230,253,0.55)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        {STATUS_ORDER.map(s => {
          const cfg   = STATUS_CFG[s];
          const Icon  = cfg.icon;
          const isA   = filter === s;
          return (
            <button key={s} onClick={() => setFilter(prev => prev === s ? "all" : s)}
              style={{ padding: "16px 14px", background: isA ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 8, borderBottom: `2px solid ${isA ? cfg.color : "transparent"}`, transition: "all 0.14s" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Icon size={12} color={cfg.color} strokeWidth={1.5} />
                <span style={{ fontSize: 15, fontWeight: 300, color: isA ? cfg.color : "var(--text-muted)" }}>{byStatus[s] || 0}</span>
              </div>
              <div style={{ textAlign: "left" }}>
                <p style={{ fontSize: 9, letterSpacing: "0.16em", color: isA ? cfg.color : "var(--text-muted)", fontWeight: 600 }}>{cfg.vi.toUpperCase()}</p>
              </div>
            </button>
          );
        })}
      </motion.div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <button onClick={() => setFilter("all")} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid", borderColor: filter === "all" ? "rgba(181,242,61,0.4)" : "var(--border)", background: filter === "all" ? "rgba(181,242,61,0.10)" : "var(--bg-surface)", color: filter === "all" ? "var(--gold)" : "var(--text-muted)", fontSize: 9, letterSpacing: "0.12em", cursor: "pointer", fontFamily: "inherit" }}>Tất Cả</button>
        {STATUS_ORDER.map(s => {
          const cfg = STATUS_CFG[s];
          const isA = filter === s;
          return <button key={s} onClick={() => setFilter(s)} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid", borderColor: isA ? cfg.color + "55" : "var(--border)", background: isA ? cfg.bg : "var(--bg-surface)", color: isA ? cfg.color : "var(--text-muted)", fontSize: 9, letterSpacing: "0.12em", cursor: "pointer", fontFamily: "inherit" }}>{cfg.vi}</button>;
        })}
      </div>

      {/* Danh sách */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {shown.map((col, i) => {
          const cfg  = STATUS_CFG[col.status];
          const Icon = cfg.icon;
          const open = expanded === col.id;
          return (
            <motion.div key={col.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}
              style={{ background: t.cardBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: `1px solid ${t.cardBorder}`, borderRadius: 12, overflow: "hidden", boxShadow: t.cardShadow }}
            >
              <button onClick={() => setExpanded(open ? null : col.id)}
                style={{ width: "100%", padding: "14px 20px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 16, alignItems: "center" }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{col.name}</span>
                    <span style={{ fontSize: 8, padding: "2px 7px", borderRadius: 4, background: GENDER_COLOR[col.gender] + "18", color: GENDER_COLOR[col.gender], letterSpacing: "0.1em", fontWeight: 600 }}>{GENDER_LABEL[col.gender].toUpperCase()}</span>
                  </div>
                  <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3 }}>{col.desc}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-muted)" }}>
                  <CalendarDays size={11} strokeWidth={1.5} />
                  <span style={{ fontSize: 9 }}>{fmtDate(col.launch)} – {fmtDate(col.end)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-muted)" }}>
                  <Package size={11} strokeWidth={1.5} />
                  <span style={{ fontSize: 11 }}>{col.count}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 5, background: cfg.bg }}>
                  <Icon size={10} color={cfg.color} strokeWidth={1.8} />
                  <span style={{ fontSize: 8, color: cfg.color, letterSpacing: "0.12em", fontWeight: 600 }}>{cfg.vi.toUpperCase()}</span>
                </div>
                <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.18 }}>
                  <ChevronRight size={13} color="var(--text-muted)" strokeWidth={1.5} />
                </motion.div>
              </button>

              {/* Chi tiết mở rộng — vòng đời */}
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
                    <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                      {STATUS_ORDER.map(s => {
                        const scfg  = STATUS_CFG[s];
                        const SIcon = scfg.icon;
                        const isCur = col.status === s;
                        const isPast = STATUS_ORDER.indexOf(s) < STATUS_ORDER.indexOf(col.status);
                        return (
                          <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, opacity: isCur ? 1 : isPast ? 0.45 : 0.18 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 7, background: isCur ? scfg.bg : "transparent", border: `1px solid ${isCur ? scfg.color + "55" : "var(--border-subtle)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <SIcon size={12} color={isCur ? scfg.color : "var(--text-muted)"} strokeWidth={1.5} />
                            </div>
                            <p style={{ fontSize: 8, color: isCur ? scfg.color : "var(--text-muted)", letterSpacing: "0.08em", textAlign: "center" }}>{scfg.vi.toUpperCase()}</p>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
