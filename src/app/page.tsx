"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import {
  DollarSign, Eye, Package, Layers,
  ArrowUpRight, ArrowDownRight, Minus,
  ArrowRight, RefreshCw, AlertTriangle,
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

// ─── Config ──────────────────────────────────────────────────────────────────

const MOVEMENT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  TRANSFER:   { label: "CHUYỂN KHO",  color: "#0ea5e9", bg: "rgba(14,165,233,0.08)"  },
  RECEIVE:    { label: "NHẬP KHO",    color: "#16a34a", bg: "rgba(22,163,74,0.08)"   },
  SALE:       { label: "BÁN RA",      color: "#C9A55A", bg: "rgba(201,165,90,0.10)"  },
  ADJUSTMENT: { label: "ĐIỀU CHỈNH",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  MARKDOWN:   { label: "MARKDOWN",    color: "#dc2626", bg: "rgba(220,38,38,0.08)"   },
  RETURN:     { label: "TRẢ HÀNG",    color: "#64748b", bg: "rgba(100,116,139,0.08)" },
};

const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.36, ease: [0.16, 1, 0.3, 1] },
  }),
};

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { products, warehouseShelves, storeSections, fetchProducts, currentUser, storeName } = useStore();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager";

  const [movements, setMovements] = useState<Movement[]>([]);
  const [movLoading, setMovLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(products.length === 0);

  // ── Fetch products & movements on mount ────────────────────────────────
  useEffect(() => {
    setProductsLoading(true);
    fetchProducts().finally(() => setProductsLoading(false));
    useStore.getState().fetchDbState();
  }, []);

  const loadMovements = useCallback(async () => {
    setMovLoading(true);
    try {
      const res = await fetch("/api/movements?limit=10");
      if (res.ok) setMovements(await res.json());
    } catch {/* silently ignore */}
    finally { setMovLoading(false); }
  }, []);

  useEffect(() => { loadMovements(); }, [loadMovements]);

  // ── Computed stats ──────────────────────────────────────────────────────
  const totalSKUs   = products.length;
  const totalValue  = products.reduce((s, p) => s + (p.price ?? 0) * p.quantity, 0);
  const lowStock    = products.filter(p => p.quantity > 0 && p.quantity <= 5).length;
  const outOfStock  = products.filter(p => p.quantity === 0).length;

  const displayedIds = new Set<string>();
  storeSections.forEach(sec =>
    sec.subsections.forEach(sub =>
      sub.rows.forEach(row =>
        row.products.forEach(pid => { if (pid) displayedIds.add(pid); })
      )
    )
  );
  const onDisplayCount = displayedIds.size;

  const warehouseTotal = warehouseShelves.reduce(
    (s, sh) => s + sh.tiers.reduce((ts, t) => ts + t.filter(Boolean).length, 0), 0
  );

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).length;

  const STATS = [
    {
      id: "stock-value",
      label: "Giá Trị Tồn Kho",
      sublabel: "Tổng giá trị hàng tồn",
      value: totalValue >= 1_000_000_000
        ? `${(totalValue / 1_000_000_000).toFixed(2)} Tỷ`
        : totalValue >= 1_000_000
        ? `${fmt(Math.round(totalValue / 1_000))}K`
        : fmt(Math.round(totalValue)),
      unit: "VND",
      icon: DollarSign,
      color: "#C9A55A",
      trend: null as number | null,
    },
    {
      id: "on-display",
      label: "Đang Trưng Bày",
      sublabel: storeSections.length === 0 ? "Chưa đồng bộ vị trí" : "Sản phẩm trên kệ cửa hàng",
      value: fmt(onDisplayCount),
      unit: "sản phẩm",
      icon: Eye,
      color: "#0ea5e9",
      trend: null as number | null,
    },
    {
      id: "warehouse",
      label: "Trong Kho",
      sublabel: warehouseShelves.length === 0 ? "Chưa đồng bộ kho" : "Vị trí đang có hàng",
      value: fmt(warehouseTotal),
      unit: "vị trí",
      icon: Package,
      color: "#7c3aed",
      trend: null as number | null,
    },
    {
      id: "categories",
      label: "Danh Mục",
      sublabel: "Số danh mục sản phẩm",
      value: categories || totalSKUs,
      unit: categories ? "danh mục" : "SKU",
      icon: Layers,
      color: "#16a34a",
      trend: null as number | null,
    },
  ];

  const storeSubtitle = storeName.includes("—") ? storeName.split("—")[1]?.trim() : storeName;

  return (
    <div className="flex flex-col gap-6 md:gap-8">

      {/* ── Header ─────────────────────────────────────────────────── */}
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
        {/* Quick links */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/inventory" style={{ textDecoration: "none" }}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-muted hover:border-blue hover:text-blue transition-colors" style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em" }}>
              <Package size={10} /> KHO HÀNG
            </div>
          </Link>
          <Link href="/visual-board" style={{ textDecoration: "none" }}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-muted hover:border-blue hover:text-blue transition-colors" style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em" }}>
              <Eye size={10} /> TRƯNG BÀY
            </div>
          </Link>
        </div>
      </motion.div>

      {/* ── Alert banners ────────��──────────────────────────────────── */}
      {(lowStock > 0 || outOfStock > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.28 }}
          className="flex flex-col gap-2"
        >
          {outOfStock > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border" style={{ background: "rgba(220,38,38,0.05)", borderColor: "rgba(220,38,38,0.2)" }}>
              <AlertTriangle size={13} style={{ color: "#dc2626", flexShrink: 0 }} />
              <p style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>
                {outOfStock} sản phẩm đã hết hàng
              </p>
              <Link href="/inventory?filter=out" style={{ textDecoration: "none", marginLeft: "auto" }}>
                <span style={{ fontSize: 9, color: "#dc2626", fontWeight: 600, letterSpacing: "0.08em" }}>XEM →</span>
              </Link>
            </div>
          )}
          {lowStock > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border" style={{ background: "rgba(201,165,90,0.06)", borderColor: "rgba(201,165,90,0.25)" }}>
              <AlertTriangle size={13} style={{ color: "#C9A55A", flexShrink: 0 }} />
              <p style={{ fontSize: 10, color: "#C9A55A", fontWeight: 600 }}>
                {lowStock} sản phẩm sắp hết hàng (≤ 5)
              </p>
              <Link href="/inventory?filter=low" style={{ textDecoration: "none", marginLeft: "auto" }}>
                <span style={{ fontSize: 9, color: "#C9A55A", fontWeight: 600, letterSpacing: "0.08em" }}>XEM →</span>
              </Link>
            </div>
          )}
        </motion.div>
      )}

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          const isZeroPlaceholder = productsLoading && stat.value === "0";
          return (
            <motion.div
              key={stat.id}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="relative overflow-hidden rounded-xl border border-border bg-bg-card"
              style={{ padding: "16px" }}
            >
              {/* Top accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, transparent 10%, ${stat.color}55 50%, transparent 90%)` }}
              />

              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <p className="text-text-muted font-semibold uppercase tracking-[0.18em] leading-tight" style={{ fontSize: 8.5 }}>
                  {stat.label}
                </p>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `color-mix(in srgb, ${stat.color} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${stat.color} 25%, transparent)`,
                  }}
                >
                  <Icon size={12} style={{ color: stat.color }} strokeWidth={1.6} />
                </div>
              </div>

              {/* Value */}
              <div className="flex items-baseline gap-1.5">
                {isZeroPlaceholder
                  ? <div className="skeleton" style={{ width: 60, height: 28, borderRadius: 6 }} />
                  : <>
                      <span className="font-light" style={{ fontSize: 28, color: "#0c1a2e", letterSpacing: "0.01em", lineHeight: 1 }}>
                        {stat.value}
                      </span>
                      <span className="font-medium tracking-widest" style={{ fontSize: 7.5, color: stat.color }}>
                        {stat.unit}
                      </span>
                    </>
                }
              </div>

              {/* Sublabel */}
              <p className="mt-2" style={{ fontSize: 8, color: "#94a3b8" }}>{stat.sublabel}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ── Two-column layout: product list + admin panel ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">

        {/* Product list — takes 3/5 on desktop */}
        {(products.length > 0 || productsLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.32 }}
            className="lg:col-span-3 rounded-xl border border-border bg-bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <p className="text-text-muted font-semibold uppercase tracking-[0.2em]" style={{ fontSize: 8.5 }}>
                Sản Phẩm
              </p>
              <div className="flex items-center gap-3">
                <span className="text-text-muted" style={{ fontSize: 8.5 }}>{totalSKUs} SKU</span>
                <Link href="/inventory" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 8.5, color: "#0ea5e9", fontWeight: 600 }}>Tất cả</span>
                  <ArrowRight size={9} style={{ color: "#0ea5e9" }} />
                </Link>
              </div>
            </div>

            {/* Table header */}
            <div
              className="grid px-5 items-center gap-3 border-b border-border"
              style={{ gridTemplateColumns: "2fr 1fr 0.7fr 0.7fr", height: 30, background: "#f8faff" }}
            >
              {["Sản Phẩm", "Danh Mục", "SKU", "Tồn"].map(h => (
                <span key={h} className="text-text-muted font-semibold uppercase tracking-[0.15em]" style={{ fontSize: 7.5 }}>{h}</span>
              ))}
            </div>

            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {productsLoading && products.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid px-5 items-center gap-3 border-b border-border" style={{ gridTemplateColumns: "2fr 1fr 0.7fr 0.7fr", height: 44 }}>
                  <div className="skeleton" style={{ height: 10, width: "70%", borderRadius: 4 }} />
                  <div className="skeleton" style={{ height: 10, width: "60%", borderRadius: 4 }} />
                  <div className="skeleton" style={{ height: 10, width: "50%", borderRadius: 4 }} />
                  <div className="skeleton" style={{ height: 10, width: "30%", borderRadius: 4 }} />
                </div>
              ))}
              {products.filter(Boolean).slice(0, 12).map((p) => (
                <div
                  key={p.id}
                  className="grid px-5 items-center gap-3 border-b border-border last:border-0 product-row"
                  style={{ gridTemplateColumns: "2fr 1fr 0.7fr 0.7fr", height: 44 }}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {p.color && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: p.color, border: "1px solid rgba(0,0,0,0.1)" }}
                      />
                    )}
                    <span className="text-text-primary font-medium truncate" style={{ fontSize: 11 }}>{p.name}</span>
                  </div>
                  <span className="text-text-muted truncate tracking-wide" style={{ fontSize: 8.5 }}>{p.category || "—"}</span>
                  <span className="text-text-muted font-mono tracking-wide" style={{ fontSize: 8.5 }}>{p.sku || "—"}</span>
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: 12,
                      color: p.quantity === 0
                        ? "#dc2626"
                        : p.quantity <= 5
                        ? "#C9A55A"
                        : "#0c1a2e",
                    }}
                  >
                    {p.quantity}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Admin notify panel — takes 2/5 on desktop, shows if admin */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.32 }}
            className={products.length > 0 ? "lg:col-span-2" : "lg:col-span-5"}
          >
            <AdminNotifyPanel />
          </motion.div>
        )}

        {/* If no products and not admin, show empty state */}
        {products.length === 0 && !isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-5 rounded-xl border border-border bg-bg-card flex flex-col items-center justify-center gap-3"
            style={{ minHeight: 160 }}
          >
            <Package size={28} style={{ color: "#bae6fd" }} strokeWidth={1} />
            <p className="text-text-muted" style={{ fontSize: 11 }}>Chưa có sản phẩm nào</p>
            <Link href="/inventory" style={{ textDecoration: "none" }}>
              <div className="btn-primary" style={{ fontSize: 9, padding: "6px 16px" }}>+ Thêm Sản Phẩm</div>
            </Link>
          </motion.div>
        )}
      </div>

      {/* ── Movements ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34, duration: 0.32 }}
        className="rounded-xl border border-border bg-bg-card overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <p className="text-text-muted font-semibold uppercase tracking-[0.2em]" style={{ fontSize: 8.5 }}>
            Biến Động Gần Đây
          </p>
          <button
            onClick={loadMovements}
            className="flex items-center gap-1.5 text-text-muted hover:text-blue transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 8.5, fontWeight: 600 }}
          >
            <RefreshCw size={9} />
            Làm mới
          </button>
        </div>

        {movLoading ? (
          <div className="px-5 py-8 flex items-center justify-center">
            <div className="skeleton w-full" style={{ height: 40 }} />
          </div>
        ) : movements.length === 0 ? (
          <div className="px-5 py-10 flex flex-col items-center gap-2">
            <Package size={24} style={{ color: "#bae6fd" }} strokeWidth={1} />
            <p style={{ fontSize: 10, color: "#94a3b8" }}>Chưa có biến động nào được ghi lại</p>
            <p style={{ fontSize: 9, color: "#b0c4d8" }}>Biến động sẽ tự động xuất hiện khi có nhập/xuất/chuyển kho</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <div
                className="grid px-5 items-center gap-3 border-b border-border"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.5fr 0.9fr", height: 30, background: "#f8faff" }}
              >
                {["Sản Phẩm", "Loại", "Từ", "Đến", "SL", "Thời Gian"].map(h => (
                  <span key={h} className="text-text-muted font-semibold uppercase tracking-[0.15em]" style={{ fontSize: 7.5 }}>{h}</span>
                ))}
              </div>
              {movements.map(mv => {
                const cfg = MOVEMENT_CFG[mv.type] ?? MOVEMENT_CFG.ADJUSTMENT;
                return (
                  <div
                    key={mv.id}
                    className="grid px-5 items-center gap-3 border-b border-border last:border-0 product-row"
                    style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.5fr 0.9fr", height: 46 }}
                  >
                    <div>
                      <p className="text-text-primary font-medium truncate" style={{ fontSize: 11 }}>{mv.productName}</p>
                      {mv.variant && <p className="text-text-muted truncate" style={{ fontSize: 8, marginTop: 1 }}>{mv.variant}</p>}
                    </div>
                    <div className="inline-flex items-center px-2 py-0.5 rounded-md" style={{ background: cfg.bg, width: "fit-content" }}>
                      <span className="font-semibold tracking-wide" style={{ fontSize: 7.5, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <span className="text-text-muted truncate" style={{ fontSize: 8.5 }}>{mv.fromLoc ?? "—"}</span>
                    <span className="text-text-muted truncate" style={{ fontSize: 8.5 }}>{mv.toLoc ?? "—"}</span>
                    <span
                      className="font-semibold"
                      style={{ fontSize: 12, color: mv.qty < 0 ? "#dc2626" : mv.qty > 0 ? "#16a34a" : "#94a3b8" }}
                    >
                      {mv.qty > 0 ? `+${mv.qty}` : mv.qty}
                    </span>
                    <span className="text-text-muted" style={{ fontSize: 8.5 }}>{timeAgo(mv.createdAt)}</span>
                  </div>
                );
              })}
            </div>

            {/* Mobile cards */}
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
                    <span
                      className="font-semibold flex-shrink-0"
                      style={{ fontSize: 14, color: mv.qty < 0 ? "#dc2626" : mv.qty > 0 ? "#16a34a" : "#94a3b8" }}
                    >
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
  );
}
