"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { DollarSign, Eye, Layers, Package, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

const MOVEMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  TRANSFER:   { label: "CHUYỂN KHO", color: "var(--blue)",       bg: "var(--blue-subtle)"   },
  RECEIVE:    { label: "NHẬP KHO",   color: "var(--accent-green)",bg: "rgba(123,175,106,0.10)" },
  SALE:       { label: "BÁN RA",     color: "var(--gold)",        bg: "var(--gold-muted)"    },
  ADJUSTMENT: { label: "ĐIỀU CHỈNH", color: "var(--accent-purple)",bg: "rgba(155,136,196,0.10)" },
  MARKDOWN:   { label: "MARKDOWN",   color: "var(--accent-red)",  bg: "rgba(200,122,90,0.10)"  },
  RETURN:     { label: "TRẢ HÀNG",   color: "var(--text-muted)",  bg: "var(--bg-elevated)"   },
};

const RECENT_MOVEMENTS = [
  { id: "mv-001", product: "ALDO Dress Pump",    variant: "Đen / EU 38",    type: "TRANSFER",   from: "Kho Chính A",    to: "Kệ Nữ — DRESS",  qty: 4,  by: "Nguyễn P.", time: "2 phút trước"  },
  { id: "mv-002", product: "ALDO Tote Bag",       variant: "Nude / One Size",type: "RECEIVE",    from: null,             to: "Kho Chính B",     qty: 24, by: "Trần M.",   time: "18 phút trước" },
  { id: "mv-003", product: "ALDO Sneaker Low",    variant: "Trắng / EU 40", type: "SALE",       from: "Kệ Nữ — DRESS",  to: null,              qty: 1,  by: "POS Auto",  time: "42 phút trước" },
  { id: "mv-004", product: "ALDO Block Heel",     variant: "Tan / EU 37",   type: "ADJUSTMENT", from: "Kho Chính A",    to: "Kho Chính A",     qty: -2, by: "Lê T.",     time: "1 giờ trước"   },
  { id: "mv-005", product: "ALDO Strappy Sandal", variant: "Vàng / EU 38",  type: "MARKDOWN",   from: "Kệ Nữ — CASUAL", to: "Khu Markdown",    qty: 8,  by: "Nguyễn P.", time: "2 giờ trước"   },
  { id: "mv-006", product: "ALDO Ankle Boot",     variant: "Đen / EU 39",   type: "RETURN",     from: null,             to: "Kho Kiểm Hàng",   qty: 1,  by: "POS Auto",  time: "3 giờ trước"   },
] as const;

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.38, ease: [0.16, 1, 0.3, 1] },
  }),
};

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export default function OverviewPage() {
  const { products, warehouseShelves, storeSections, fetchProducts } = useStore();

  useEffect(() => { fetchProducts(); }, []);

  const totalSKUs  = products.length;
  const totalValue = products.reduce((s, p) => s + (p.price || 0) * p.quantity, 0);

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

  const categories = Array.from(new Set(products.map(p => p.category))).length;

  const STATS = [
    {
      id: "stock-value", label: "Giá Trị Tồn Kho", sublabel: "Tổng giá trị hàng tồn",
      value: totalValue >= 1_000_000_000
        ? `${(totalValue / 1_000_000_000).toFixed(2)} Tỷ`
        : `${fmt(Math.round(totalValue / 1_000))}K`,
      unit: "VND", icon: DollarSign, trend: +12.4, color: "var(--gold)",
    },
    {
      id: "on-display", label: "Đang Trưng Bày", sublabel: "Sản phẩm đang đặt trên kệ",
      value: fmt(onDisplayCount), unit: "sản phẩm", icon: Eye, trend: onDisplayCount > 0 ? 5 : 0, color: "var(--blue)",
    },
    {
      id: "warehouse", label: "Trong Kho", sublabel: "Vị trí đang có hàng trong kho",
      value: fmt(warehouseTotal), unit: "vị trí", icon: Package, trend: 0, color: "var(--accent-purple)",
    },
    {
      id: "categories", label: "Danh Mục", sublabel: "Số danh mục sản phẩm",
      value: categories, unit: "danh mục", icon: Layers, trend: 0, color: "var(--accent-green)",
    },
  ];

  return (
    <div className="flex flex-col gap-8 md:gap-10">

      {/* ── Tiêu đề ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="flex flex-col gap-1.5"
      >
        <p className="text-text-muted font-semibold uppercase tracking-[0.38em]" style={{ fontSize: 9 }}>
          Quản Lý Cửa Hàng · ALDO
        </p>
        <h1 className="text-text-primary font-light tracking-wide" style={{ fontSize: 26, lineHeight: 1.2 }}>
          Tổng Quan
        </h1>
      </motion.div>

      {/* ── Thẻ thống kê — responsive grid ──────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {STATS.map((stat, i) => {
          const Icon    = stat.icon;
          const trendUp = stat.trend > 0;
          const neutral = stat.trend === 0;
          return (
            <motion.div
              key={stat.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}
              className="relative overflow-hidden rounded-xl border border-border bg-bg-card p-5 flex flex-col gap-3"
            >
              {/* Top gradient line */}
              <div
                className="absolute top-0 left-6 right-6 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${stat.color}55, transparent)` }}
              />
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-text-muted font-semibold uppercase tracking-[0.2em]" style={{ fontSize: 9 }}>{stat.label}</p>
                  <p className="text-text-muted" style={{ fontSize: 8, opacity: 0.5 }}>{stat.sublabel}</p>
                </div>
                <div
                  className="w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${stat.color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${stat.color} 28%, transparent)` }}
                >
                  <Icon size={13} style={{ color: stat.color }} strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-text-primary font-light" style={{ fontSize: 26, letterSpacing: "0.02em" }}>{stat.value}</span>
                <span className="font-medium tracking-widest" style={{ fontSize: 8, color: stat.color }}>{stat.unit}</span>
              </div>
              {!neutral && (
                <div className="flex items-center gap-1">
                  {trendUp
                    ? <ArrowUpRight size={10} className="text-accent-green" />
                    : <ArrowDownRight size={10} className="text-accent-red" />}
                  <span style={{ fontSize: 9 }} className={trendUp ? "text-accent-green" : "text-accent-red"}>
                    {Math.abs(stat.trend)}% so với tháng trước
                  </span>
                </div>
              )}
              {neutral && (
                <div className="flex items-center gap-1">
                  <Minus size={10} className="text-text-muted" />
                  <span style={{ fontSize: 9 }} className="text-text-muted">Không thay đổi</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── Danh sách sản phẩm ──────────────────────────────── */}
      {products.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.32 }}
          className="rounded-xl border border-border bg-bg-card overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-border flex justify-between items-center">
            <p className="text-text-muted font-semibold uppercase tracking-[0.22em]" style={{ fontSize: 9 }}>Danh sách sản phẩm</p>
            <span className="text-text-muted" style={{ fontSize: 9 }}>{totalSKUs} SKU</span>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {products.slice(0, 10).map((p, i) => (
              <div
                key={p.id}
                className="grid px-5 items-center gap-3 border-b border-border last:border-0 product-row"
                style={{ gridTemplateColumns: "2fr 1fr 0.8fr 0.8fr", height: 46 }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {p.color && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />}
                  <span className="text-text-primary font-medium truncate" style={{ fontSize: 11 }}>{p.name}</span>
                </div>
                <span className="text-text-muted tracking-wide" style={{ fontSize: 9 }}>{p.category}</span>
                <span className="text-text-muted font-mono tracking-wide" style={{ fontSize: 9 }}>{p.sku || "—"}</span>
                <span
                  className="font-medium"
                  style={{
                    fontSize: 12,
                    color: p.quantity === 0 ? "var(--accent-red)" : p.quantity < 5 ? "var(--gold)" : "var(--text-primary)",
                  }}
                >
                  {p.quantity}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Biến động gần đây ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, duration: 0.32 }}
        className="rounded-xl border border-border bg-bg-card overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-border">
          <p className="text-text-muted font-semibold uppercase tracking-[0.22em]" style={{ fontSize: 9 }}>Biến Động Gần Đây</p>
        </div>

        {/* Responsive: table on md+, cards on mobile */}
        <div className="hidden md:block">
          <div
            className="grid px-5 items-center gap-3 border-b border-border"
            style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.5fr 0.8fr", height: 32 }}
          >
            {["Sản Phẩm", "Loại", "Từ", "Đến", "SL", "Thời Gian"].map(h => (
              <span key={h} className="text-text-muted font-semibold uppercase tracking-[0.2em]" style={{ fontSize: 8 }}>{h}</span>
            ))}
          </div>
          {RECENT_MOVEMENTS.map((mv, i) => {
            const cfg = MOVEMENT_CONFIG[mv.type];
            return (
              <div
                key={mv.id}
                className="grid px-5 items-center gap-3 border-b border-border last:border-0 product-row"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.5fr 0.8fr", height: 48 }}
              >
                <div>
                  <p className="text-text-primary font-medium" style={{ fontSize: 11 }}>{mv.product}</p>
                  <p className="text-text-muted" style={{ fontSize: 8, marginTop: 1 }}>{mv.variant}</p>
                </div>
                <div className="inline-flex items-center px-2 py-0.5 rounded" style={{ background: cfg.bg }}>
                  <span className="font-semibold tracking-wider" style={{ fontSize: 8, color: cfg.color }}>{cfg.label}</span>
                </div>
                <span className="text-text-muted truncate" style={{ fontSize: 9 }}>{mv.from ?? "—"}</span>
                <span className="text-text-muted truncate" style={{ fontSize: 9 }}>{mv.to ?? "—"}</span>
                <span className="font-medium" style={{ fontSize: 11, color: mv.qty < 0 ? "var(--accent-red)" : "var(--text-primary)" }}>
                  {mv.qty > 0 ? `+${mv.qty}` : mv.qty}
                </span>
                <span className="text-text-muted" style={{ fontSize: 9 }}>{mv.time}</span>
              </div>
            );
          })}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {RECENT_MOVEMENTS.map(mv => {
            const cfg = MOVEMENT_CONFIG[mv.type];
            return (
              <div key={mv.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium truncate" style={{ fontSize: 11 }}>{mv.product}</p>
                  <p className="text-text-muted" style={{ fontSize: 9, marginTop: 2 }}>{mv.variant}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="inline-flex items-center px-1.5 py-0.5 rounded" style={{ background: cfg.bg }}>
                      <span className="font-semibold" style={{ fontSize: 7, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <span className="text-text-muted" style={{ fontSize: 8 }}>{mv.time}</span>
                  </div>
                </div>
                <span
                  className="font-medium flex-shrink-0"
                  style={{ fontSize: 13, color: mv.qty < 0 ? "var(--accent-red)" : "var(--text-primary)" }}
                >
                  {mv.qty > 0 ? `+${mv.qty}` : mv.qty}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
