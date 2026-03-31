"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import {
  DollarSign, Eye, Package, Layers,
  ArrowRight, RefreshCw,
  TrendingUp, Activity,
} from "lucide-react";
import AdminNotifyPanel from "@/components/AdminNotifyPanel";
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

type PalexyDay = { date: string; visits: number };

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

function daysBack(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
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

// ─── Palexy analytics panel ───────────────────────────────────────────────────

function PalexyWidget() {
  const [days, setDays] = useState<PalexyDay[]>([]);
  const [loading, setLoading] = useState(true);
  const DOW = ["CN","T2","T3","T4","T5","T6","T7"];

  useEffect(() => {
    (async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const dates = Array.from({ length: 7 }, (_, i) => daysBack(6 - i)).filter(d => d <= today);
      const results: PalexyDay[] = [];
      await Promise.all(dates.map(async (date) => {
        try {
          const r = await fetch(`/api/palexy?date=${date}`).then(x => x.json());
          if (r.ok && r.traffic != null) results.push({ date, visits: r.traffic });
        } catch {/* ignore */}
      }));
      results.sort((a, b) => a.date.localeCompare(b.date));
      setDays(results);
      setLoading(false);
    })();
  }, []);

  const visits = days.map(d => d.visits);
  const maxV = Math.max(...visits, 1);
  const avgVisits = visits.length ? Math.round(visits.reduce((s, v) => s + v, 0) / visits.length) : 0;
  const last = visits[visits.length - 1] ?? 0;
  const prev = visits[visits.length - 2] ?? 0;
  const trend = prev > 0 ? ((last - prev) / prev) * 100 : 0;

  const insights: { type: "warn" | "good" | "tip" | "info"; text: string }[] = [];
  if (avgVisits > 0) {
    if (last < avgVisits * 0.7)
      insights.push({ type: "warn", text: `Traffic hôm qua (${fmt(last)}) thấp hơn TB tuần ${Math.round((1 - last/avgVisits)*100)}%. Tăng cường thu hút khách trước cửa.` });
    else if (last > avgVisits * 1.2)
      insights.push({ type: "good", text: `Traffic hôm qua (${fmt(last)}) cao hơn TB tuần ${Math.round((last/avgVisits-1)*100)}%. Đảm bảo đủ nhân lực phục vụ.` });
    else
      insights.push({ type: "info", text: `Traffic ổn định ~${fmt(avgVisits)} khách/ngày. Tập trung nâng conversion rate.` });
  }
  if (days.length >= 5) {
    const we = days.filter(d => [0,6].includes(new Date(d.date+"T12:00:00").getDay()));
    const wd = days.filter(d => ![0,6].includes(new Date(d.date+"T12:00:00").getDay()));
    const weA = we.length ? we.reduce((s,d)=>s+d.visits,0)/we.length : 0;
    const wdA = wd.length ? wd.reduce((s,d)=>s+d.visits,0)/wd.length : 0;
    if (weA > wdA * 1.25 && we.length > 0)
      insights.push({ type: "tip", text: `Cuối tuần đông hơn ngày thường ${Math.round((weA/wdA-1)*100)}%. Cân nhắc tăng ca T7–CN.` });
  }
  if (insights.length === 0 && !loading)
    insights.push({ type: "info", text: "Chưa đủ dữ liệu Palexy để phân tích xu hướng tuần này." });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.2em" }}>
            Traffic Khách — Hôm Qua
          </p>
          {avgVisits > 0 && (
            <p style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3 }}>
              TB {fmt(avgVisits)}/ngày
              {trend !== 0 && (
                <span style={{ marginLeft: 8, fontWeight: 700, color: trend > 0 ? "#16a34a" : "#dc2626" }}>
                  {trend > 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
                </span>
              )}
            </p>
          )}
        </div>
        <Activity size={15} color="var(--blue)" strokeWidth={1.5} />
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />
      ) : days.length === 0 ? (
        <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Chưa có dữ liệu Palexy</p>
      ) : (
        <>
          {/* Bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 64 }}>
            {days.map((d, i) => {
              const h = Math.max(4, Math.round((d.visits / maxV) * 54));
              const dow = new Date(d.date + "T12:00:00").getDay();
              const isWknd = dow === 0 || dow === 6;
              const isYesterday = d.date === daysBack(1);
              return (
                <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <motion.div
                    initial={{ scaleY: 0, originY: 1 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.1 + i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    title={`${d.date}: ${fmt(d.visits)} khách`}
                    style={{
                      width: "100%", height: h, borderRadius: "4px 4px 2px 2px",
                      background: isYesterday
                        ? "linear-gradient(180deg, var(--gold) 0%, rgba(201,165,90,0.45) 100%)"
                        : isWknd
                          ? "linear-gradient(180deg, var(--blue) 0%, rgba(14,165,233,0.4) 100%)"
                          : "linear-gradient(180deg, #7c3aed 0%, rgba(124,58,237,0.35) 100%)",
                      boxShadow: isYesterday ? "0 0 10px rgba(201,165,90,0.3)" : "none",
                    }}
                  />
                  <span style={{ fontSize: 8, color: isYesterday ? "var(--gold)" : "var(--text-muted)", fontWeight: isYesterday ? 700 : 400 }}>
                    {DOW[dow]}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Sparkline trend */}
          <div style={{ marginTop: -8, opacity: 0.7 }}>
            <Sparkline data={visits} color="var(--blue)" height={28} />
          </div>
        </>
      )}

      {/* Insights */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {insights.map((ins, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              padding: "8px 10px", borderRadius: 8,
              background: ins.type === "warn" ? "rgba(220,38,38,0.04)"
                : ins.type === "good" ? "rgba(22,163,74,0.05)"
                : ins.type === "tip" ? "rgba(14,165,233,0.05)"
                : "var(--bg-surface)",
              border: `1px solid ${ins.type === "warn" ? "rgba(220,38,38,0.15)"
                : ins.type === "good" ? "rgba(22,163,74,0.15)"
                : ins.type === "tip" ? "rgba(14,165,233,0.15)"
                : "var(--border-subtle)"}`,
            }}>
            <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>
              {ins.type === "warn" ? "⚠️" : ins.type === "good" ? "✅" : ins.type === "tip" ? "💡" : "ℹ️"}
            </span>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>{ins.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { products, warehouseShelves, storeSections, fetchProducts, currentUser, storeName } = useStore();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager";
  const cardBg = "rgba(255,255,255,0.88)";
  const cardBorder = "rgba(186,230,253,0.55)";
  const cardShadow = "0 2px 12px rgba(12,26,46,0.06), 0 1px 3px rgba(12,26,46,0.04), inset 0 1px 0 rgba(255,255,255,0.7)";
  const tableHeaderBg = "rgba(240,248,255,0.7)";

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
            <PalexyWidget />
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
