"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useStore, sel } from "@/store/useStore";
import {
  DollarSign, Eye, Package, Layers,
  ArrowRight, RefreshCw,
  TrendingUp, Target, Trophy, Users,
} from "lucide-react";
import AdminNotifyPanel from "@/components/AdminNotifyPanel";
import { useTheme } from "@/hooks/useTheme";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type Movement = {
  id: string;
  productName: string;
  variant: string;
  type: string;
  fromLoc: string | null;
  toLoc: string | null;
  qty: number;
  byUser: string;
  createdAt: string;
};

// ─── Config ──────────────────────────────────────────────────────────────────

const MOVEMENT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  TRANSFER:   { label: "CHUYỂN",     color: "#0ea5e9", bg: "rgba(14,165,233,0.08)"  },
  RECEIVE:    { label: "NHẬP KHO",   color: "#16a34a", bg: "rgba(22,163,74,0.08)"   },
  SALE:       { label: "BÁN RA",     color: "#C9A55A", bg: "rgba(201,165,90,0.10)"  },
  ADJUSTMENT: { label: "ĐIỀU CHỈNH", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  MARKDOWN:   { label: "MARKDOWN",   color: "#dc2626", bg: "rgba(220,38,38,0.08)"   },
  RETURN:     { label: "TRẢ HÀNG",   color: "#64748b", bg: "rgba(100,116,139,0.08)" },
};

const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.36, ease: [0.16, 1, 0.3, 1] },
  }),
};

function fmt(n: number) { return new Intl.NumberFormat("vi-VN").format(n); }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m}p trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h trước`;
  return `${Math.floor(h / 24)}d trước`;
}

// ─── Floating orb background ──────────────────────────────────────────────────

function FloatingOrb({ x, y, size, color, delay }: {
  x: string; y: string; size: number; color: string; delay: number;
}) {
  return (
    <motion.div
      style={{
        position: "absolute", left: x, top: y,
        width: size, height: size, borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(50px)", pointerEvents: "none",
      }}
      animate={{
        y: [0, -28, 10, -15, 0],
        x: [0, 12, -8, 5, 0],
        scale: [1, 1.08, 0.96, 1.04, 1],
        opacity: [0.18, 0.28, 0.16, 0.24, 0.18],
      }}
      transition={{ duration: 14 + delay * 2.5, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

// ─── Mini SVG sparkline ───────────────────────────────────────────────────────

function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const W = 200, pad = 4;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const id = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  const [lx, ly] = pts[pts.length - 1].split(",").map(Number);
  const areaPath = `M ${pts[0]} ` + pts.slice(1).map(p => `L ${p}`).join(" ")
    + ` L ${(W - pad).toFixed(1)},${height} L ${pad},${height} Z`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3" fill={color} />
    </svg>
  );
}

// ─── KPI Store Target Widget ─────────────────────────────────────────────────

type StaffRow = { advisorName: string; advisorId: number; orders: number; qty: number; revenue: number; lines: number; byGroup: { group: string; revenue: number; qty: number }[] };

function KpiWidget() {
  const kpiStoreTarget       = useStore(sel.kpiStoreTarget);
  const kpiIndividualTargets = useStore(sel.kpiIndividualTargets);
  const users                = useStore(sel.users);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const curMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/odoo/advisor-sales?month=${curMonth}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d?.rows)) setRows(d.rows); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [curMonth]);

  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
  const storePct = kpiStoreTarget > 0 ? Math.round(totalRev / kpiStoreTarget * 100) : null;
  const remaining = kpiStoreTarget > 0 ? Math.max(0, kpiStoreTarget - totalRev) : 0;

  const fmtM = (n: number) => n >= 1e9 ? `${(n/1e9).toFixed(1)}T` : n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n/1e3)}K` : String(Math.round(n));

  // Per-person progress
  const staffWithTarget = rows.map(row => {
    const matched = users.find(u => {
      const uN = u.name.toLowerCase(); const rN = row.advisorName.toLowerCase();
      return uN === rN || uN.includes(rN) || rN.includes(uN);
    });
    const target = matched ? (kpiIndividualTargets[matched.id] ?? 0) : 0;
    const pct = target > 0 ? Math.round(row.revenue / target * 100) : null;
    return { ...row, target, pct, matchedId: matched?.id };
  }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  const pctColor = (p: number | null) =>
    p == null ? "#64748b" : p >= 100 ? "#C9A55A" : p >= 80 ? "#10b981" : p >= 60 ? "#0ea5e9" : p >= 40 ? "#f59e0b" : "#ef4444";

  const storeBarColor = storePct == null ? "#0ea5e9"
    : storePct >= 100 ? "#C9A55A" : storePct >= 80 ? "#10b981" : storePct >= 60 ? "#0ea5e9" : "#f59e0b";

  const [mn, yr] = [new Date().getMonth() + 1, new Date().getFullYear()];
  const daysInMonth = new Date(yr, mn, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const timeProgress = Math.round(dayOfMonth / daysInMonth * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.2em" }}>
            KPI Target Cửa Hàng
          </p>
          <p style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
            Tháng {mn}/{yr} · Ngày {dayOfMonth}/{daysInMonth}
          </p>
        </div>
        <Target size={15} color="#C9A55A" strokeWidth={1.5} />
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 90, borderRadius: 10 }} />
      ) : kpiStoreTarget === 0 ? (
        <div style={{ textAlign: "center", padding: "18px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <Target size={22} style={{ color: "var(--text-muted)", opacity: 0.4 }} strokeWidth={1} />
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Chưa đặt Target tháng này</p>
          <p style={{ fontSize: 9, color: "var(--text-muted)", opacity: 0.7 }}>Vào Hồ Sơ → Cài Đặt để thiết lập KPI Target</p>
        </div>
      ) : (
        <>
          {/* Big store progress */}
          <div style={{
            padding: "14px 16px", borderRadius: 12,
            background: `linear-gradient(135deg, ${storeBarColor}10 0%, ${storeBarColor}05 100%)`,
            border: `1px solid ${storeBarColor}28`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                  {storePct ?? "—"}
                </span>
                <span style={{ fontSize: 12, color: storeBarColor, fontWeight: 700, marginLeft: 4 }}>%</span>
                <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                  {fmtM(totalRev)} / {fmtM(kpiStoreTarget)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                {remaining > 0 && (
                  <p style={{ fontSize: 9, color: "var(--text-secondary)" }}>Còn <span style={{ fontWeight: 700, color: storeBarColor }}>{fmtM(remaining)}</span></p>
                )}
                <p style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 2 }}>Thời gian: {timeProgress}%</p>
              </div>
            </div>

            {/* Store progress bar */}
            <div style={{ position: "relative", height: 8, borderRadius: 4, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, storePct ?? 0)}%` }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                style={{
                  height: "100%", borderRadius: 4,
                  background: `linear-gradient(90deg, ${storeBarColor}cc, ${storeBarColor})`,
                  boxShadow: `0 0 8px ${storeBarColor}60`,
                }}
              />
              {/* Time marker */}
              <div style={{
                position: "absolute", top: 0, bottom: 0, left: `${timeProgress}%`,
                width: 1.5, background: "rgba(0,0,0,0.18)", borderRadius: 1,
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 7.5, color: "var(--text-muted)" }}>0</span>
              <span style={{ fontSize: 7.5, color: "var(--text-muted)", position: "absolute", left: `${timeProgress}%`, transform: "translateX(-50%)", marginTop: 2 }}>
                ▲ Hôm nay
              </span>
              <span style={{ fontSize: 7.5, color: "var(--text-muted)" }}>{fmtM(kpiStoreTarget)}</span>
            </div>
          </div>

          {/* Sparkline — daily-equivalent projection */}
          {totalRev > 0 && (
            <div style={{ marginTop: -4, opacity: 0.75 }}>
              <Sparkline
                data={[0, totalRev * 0.08, totalRev * 0.22, totalRev * 0.38, totalRev * 0.55, totalRev * 0.72, totalRev * 0.88, totalRev]}
                color={storeBarColor} height={28}
              />
            </div>
          )}

          {/* Per-staff mini bars */}
          {staffWithTarget.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <p style={{ fontSize: 8, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.16em" }}>
                Cá Nhân
              </p>
              {staffWithTarget.slice(0, 5).map((s, i) => {
                const c = pctColor(s.pct);
                return (
                  <motion.div key={s.advisorId}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: `${c}18`, border: `1.5px solid ${c}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 8, fontWeight: 800, color: c }}>
                        {s.advisorName.split(" ").pop()?.slice(0, 2).toUpperCase() ?? "??"}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" }}>
                          {s.advisorName.split(" ").slice(-2).join(" ")}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: c, flexShrink: 0 }}>
                          {s.pct != null ? `${s.pct}%` : fmtM(s.revenue)}
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, s.pct ?? (s.target > 0 ? 0 : 50))}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 + i * 0.07 }}
                          style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${c}99, ${c})` }}
                        />
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", gap: 6 }}>
                      <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{s.orders}đơn</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Summary chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -4 }}>
            {[
              { icon: Trophy, label: `${rows.filter((_,i) => (staffWithTarget[i]?.pct ?? 0) >= 100).length} đạt 100%`, color: "#C9A55A" },
              { icon: Users, label: `${rows.length} NV`, color: "#0ea5e9" },
              { icon: TrendingUp, label: `${fmtM(totalRev / Math.max(1, rows.length))}/NV`, color: "#10b981" },
            ].map((chip, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 8,
                background: `${chip.color}0e`, border: `1px solid ${chip.color}25`,
              }}>
                <chip.icon size={9} style={{ color: chip.color }} />
                <span style={{ fontSize: 8.5, fontWeight: 600, color: chip.color }}>{chip.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const products         = useStore(sel.products);
  const warehouseShelves = useStore(sel.warehouseShelves);
  const storeSections    = useStore(sel.storeSections);
  const fetchProducts    = useStore(sel.fetchProducts);
  const currentUser      = useStore(sel.currentUser);
  const storeName        = useStore(sel.storeName);
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager";
  const t = useTheme();
  const cardBg = t.cardBg;
  const cardBorder = t.cardBorder;
  const cardShadow = t.cardShadow;
  const tableHeaderBg = t.isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)";

  const [movements, setMovements] = useState<Movement[]>([]);
  const [movLoading, setMovLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(products.length === 0);

  useEffect(() => {
    setProductsLoading(true);
    fetchProducts().finally(() => setProductsLoading(false));
    useStore.getState().fetchDbState();
  }, []);

  const loadMovements = useCallback(async () => {
    setMovLoading(true);
    try {
      const res = await fetch("/api/movements?limit=8");
      if (res.ok) setMovements(await res.json());
    } catch {/* silently ignore */}
    finally { setMovLoading(false); }
  }, []);

  useEffect(() => { loadMovements(); }, [loadMovements]);

  // ── Stats ──
  const totalSKUs  = products.length;
  // Use markdown (current/sale) price if available, else list price
  const totalValue = products.reduce((s, p) => s + ((p.markdownPrice ?? p.price) || 0) * p.quantity, 0);

  const displayedIds = new Set<string>();
  storeSections.forEach(sec => sec.subsections.forEach(sub =>
    sub.rows.forEach(row => row.products.forEach(pid => { if (pid) displayedIds.add(pid); }))
  ));
  const onDisplayCount = displayedIds.size;
  const warehouseTotal = warehouseShelves.reduce(
    (s, sh) => s + sh.tiers.reduce((ts, t) => ts + t.filter(Boolean).length, 0), 0
  );
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).length;

  const STATS = [
    {
      id: "stock-value", label: "Giá Trị Tồn Kho", sublabel: "Theo giá hiện tại",
      value: totalValue >= 1e9 ? `${(totalValue/1e9).toFixed(2)} Tỷ`
           : totalValue >= 1e6 ? `${fmt(Math.round(totalValue/1000))}K`
           : fmt(Math.round(totalValue)),
      unit: "VND", icon: DollarSign, color: "#C9A55A",
    },
    {
      id: "on-display", label: "Đang Trưng Bày",
      sublabel: storeSections.length === 0 ? "Chưa đồng bộ vị trí" : "Sản phẩm trên kệ",
      value: fmt(onDisplayCount), unit: "sản phẩm", icon: Eye, color: "#0ea5e9",
    },
    {
      id: "warehouse", label: "Trong Kho",
      sublabel: warehouseShelves.length === 0 ? "Chưa đồng bộ kho" : "Vị trí có hàng",
      value: fmt(warehouseTotal), unit: "vị trí", icon: Package, color: "#7c3aed",
    },
    {
      id: "categories", label: "Danh Mục", sublabel: "Số danh mục sản phẩm",
      value: String(categories || totalSKUs), unit: categories ? "danh mục" : "SKU",
      icon: Layers, color: "#16a34a",
    },
  ];

  const storeSubtitle = storeName.includes("—") ? storeName.split("—")[1]?.trim() : storeName;

  return (
    <div className="flex flex-col gap-6 md:gap-8" style={{ position: "relative" }}>

      {/* ── Animated background ────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <FloatingOrb x="0%"  y="5%"  size={360} color="rgba(14,165,233,0.25)"  delay={0}   />
        <FloatingOrb x="65%" y="2%"  size={260} color="rgba(201,165,90,0.18)"  delay={2.5} />
        <FloatingOrb x="55%" y="55%" size={300} color="rgba(14,165,233,0.12)"  delay={4}   />
        <FloatingOrb x="10%" y="65%" size={220} color="rgba(124,58,237,0.12)"  delay={1.5} />
        <FloatingOrb x="80%" y="75%" size={180} color="rgba(201,165,90,0.12)"  delay={3}   />
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="flex items-start justify-between"
        >
          <div className="flex flex-col gap-1">
            <p className="text-text-muted font-semibold uppercase tracking-[0.36em]" style={{ fontSize: 9 }}>
              {storeSubtitle || "Quản Lý Cửa Hàng"}
            </p>
            <h1 className="text-text-primary font-light tracking-wide" style={{ fontSize: 24, lineHeight: 1.2 }}>
              Tổng Quan
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Link href="/inventory" style={{ textDecoration: "none" }}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-muted hover:border-blue hover:text-blue transition-colors"
                style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em" }}>
                <Package size={10} /> KHO HÀNG
              </div>
            </Link>
            <Link href="/visual-board" style={{ textDecoration: "none" }}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-muted hover:border-blue hover:text-blue transition-colors"
                style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em" }}>
                <Eye size={10} /> TRƯNG BÀY
              </div>
            </Link>
          </div>
        </motion.div>


        {/* ── KPI Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            const isLoading = productsLoading && stat.value === "0";
            return (
              <motion.div
                key={stat.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}
                whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 20 } }}
                className="relative overflow-hidden rounded-xl"
                style={{
                  padding: "16px", cursor: "default",
                  background: cardBg,
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: `1px solid ${cardBorder}`,
                  boxShadow: cardShadow,
                }}
              >
                {/* Top shimmer accent */}
                <div className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: `linear-gradient(90deg, transparent 0%, ${stat.color}60 50%, transparent 100%)` }} />
                {/* Bg radial glow */}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 12, pointerEvents: "none",
                  background: `radial-gradient(ellipse at top left, ${stat.color}0a 0%, transparent 55%)`,
                }} />

                <div className="flex items-start justify-between mb-3" style={{ position: "relative" }}>
                  <p className="text-text-muted font-semibold uppercase tracking-[0.18em] leading-tight" style={{ fontSize: 8.5 }}>
                    {stat.label}
                  </p>
                  <motion.div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    whileHover={{ scale: 1.2, rotate: 8 }} transition={{ type: "spring", stiffness: 400 }}
                    style={{
                      background: `color-mix(in srgb, ${stat.color} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${stat.color} 28%, transparent)`,
                    }}>
                    <Icon size={12} style={{ color: stat.color }} strokeWidth={1.6} />
                  </motion.div>
                </div>

                <div className="flex items-baseline gap-1.5" style={{ position: "relative" }}>
                  {isLoading
                    ? <div className="skeleton" style={{ width: 60, height: 28, borderRadius: 6 }} />
                    : <>
                        <motion.span className="font-light"
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + i * 0.05 }}
                          style={{ fontSize: 28, color: "var(--text-primary)", letterSpacing: "0.01em", lineHeight: 1 }}>
                          {stat.value}
                        </motion.span>
                        <span className="font-medium tracking-widest" style={{ fontSize: 7.5, color: stat.color }}>{stat.unit}</span>
                      </>
                  }
                </div>
                <p className="mt-2" style={{ fontSize: 8, color: "#94a3b8", position: "relative" }}>{stat.sublabel}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Palexy + Admin panel ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
            className="lg:col-span-3 rounded-xl overflow-hidden"
            style={{
              padding: "18px 20px",
              background: cardBg,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: `1px solid ${cardBorder}`,
              boxShadow: cardShadow,
            }}
          >
            <KpiWidget />
          </motion.div>

          {isAdmin ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="lg:col-span-2">
              <AdminNotifyPanel />
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="lg:col-span-2 rounded-xl"
              style={{
                padding: "18px 20px",
                background: cardBg,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: `1px solid ${cardBorder}`,
                boxShadow: cardShadow,
                }}>
              <p className="text-text-muted font-semibold uppercase tracking-[0.2em]" style={{ fontSize: 8.5, marginBottom: 14 }}>
                Liên Kết Nhanh
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { href: "/report", label: "Báo Cáo Hôm Nay", icon: TrendingUp, color: "#C9A55A" },
                  { href: "/inventory", label: "Kho Hàng", icon: Package, color: "#7c3aed" },
                ].map(item => (
                  <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                    <motion.div whileHover={{ x: 3 }} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 8,
                      background: "var(--bg-surface)", border: "1px solid var(--border)",
                      cursor: "pointer",
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: `${item.color}14`, border: `1px solid ${item.color}30`,
                      }}>
                        <item.icon size={12} style={{ color: item.color }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</span>
                      <ArrowRight size={11} style={{ color: "var(--text-muted)", marginLeft: "auto" }} />
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Recent movements ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
          className="rounded-xl overflow-hidden"
          style={{
            background: cardBg,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: `1px solid ${cardBorder}`,
            boxShadow: cardShadow,
            transition: "background 0.5s, border-color 0.5s",
          }}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <p className="text-text-muted font-semibold uppercase tracking-[0.2em]" style={{ fontSize: 8.5 }}>
              Biến Động Gần Đây
            </p>
            <button onClick={loadMovements}
              className="flex items-center gap-1.5 text-text-muted hover:text-blue transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 8.5, fontWeight: 600 }}>
              <RefreshCw size={9} /> Làm mới
            </button>
          </div>

          {movLoading ? (
            <div className="px-5 py-8"><div className="skeleton w-full" style={{ height: 40 }} /></div>
          ) : movements.length === 0 ? (
            <div className="px-5 py-10 flex flex-col items-center gap-2">
              <Package size={24} style={{ color: "#bae6fd" }} strokeWidth={1} />
              <p style={{ fontSize: 10, color: "#94a3b8" }}>Chưa có biến động nào được ghi lại</p>
              <p style={{ fontSize: 9, color: "#b0c4d8" }}>Biến động sẽ tự động xuất hiện khi có nhập/xuất/chuyển kho</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <div className="grid px-5 items-center gap-3 border-b border-border"
                  style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.5fr 0.9fr", height: 30, background: tableHeaderBg }}>
                  {["Sản Phẩm", "Loại", "Từ", "Đến", "SL", "Thời Gian"].map(h => (
                    <span key={h} className="text-text-muted font-semibold uppercase tracking-[0.15em]" style={{ fontSize: 7.5 }}>{h}</span>
                  ))}
                </div>
                {movements.map((mv, i) => {
                  const cfg = MOVEMENT_CFG[mv.type] ?? MOVEMENT_CFG.ADJUSTMENT;
                  return (
                    <motion.div key={mv.id}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="grid px-5 items-center gap-3 border-b border-border last:border-0 product-row"
                      style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.5fr 0.9fr", height: 46 }}>
                      <div>
                        <p className="text-text-primary font-medium truncate" style={{ fontSize: 11 }}>{mv.productName}</p>
                        {mv.variant && <p className="text-text-muted truncate" style={{ fontSize: 8, marginTop: 1 }}>{mv.variant}</p>}
                      </div>
                      <div className="inline-flex items-center px-2 py-0.5 rounded-md"
                        style={{ background: cfg.bg, width: "fit-content" }}>
                        <span className="font-semibold tracking-wide" style={{ fontSize: 7.5, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <span className="text-text-muted truncate" style={{ fontSize: 8.5 }}>{mv.fromLoc ?? "—"}</span>
                      <span className="text-text-muted truncate" style={{ fontSize: 8.5 }}>{mv.toLoc ?? "—"}</span>
                      <span className="font-semibold"
                        style={{ fontSize: 12, color: mv.qty < 0 ? "#dc2626" : mv.qty > 0 ? "#16a34a" : "#94a3b8" }}>
                        {mv.qty > 0 ? `+${mv.qty}` : mv.qty}
                      </span>
                      <span className="text-text-muted" style={{ fontSize: 8.5 }}>{timeAgo(mv.createdAt)}</span>
                    </motion.div>
                  );
                })}
              </div>

              <div className="md:hidden divide-y divide-border">
                {movements.map(mv => {
                  const cfg = MOVEMENT_CFG[mv.type] ?? MOVEMENT_CFG.ADJUSTMENT;
                  return (
                    <div key={mv.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-medium truncate" style={{ fontSize: 11 }}>{mv.productName}</p>
                        {mv.variant && <p className="text-text-muted" style={{ fontSize: 9, marginTop: 1 }}>{mv.variant}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="inline-flex items-center px-1.5 py-0.5 rounded" style={{ background: cfg.bg }}>
                            <span className="font-semibold" style={{ fontSize: 7, color: cfg.color }}>{cfg.label}</span>
                          </div>
                          <span className="text-text-muted" style={{ fontSize: 8 }}>{timeAgo(mv.createdAt)}</span>
                        </div>
                      </div>
                      <span className="font-semibold flex-shrink-0"
                        style={{ fontSize: 14, color: mv.qty < 0 ? "#dc2626" : mv.qty > 0 ? "#16a34a" : "#94a3b8" }}>
                        {mv.qty > 0 ? `+${mv.qty}` : mv.qty}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

      </div>
    </div>
  );
}
