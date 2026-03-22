"use client";

import {
  useState, useEffect, useMemo, useCallback, useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import type { Product, WarehouseShelf } from "@/types";
import ProductFormModal from "@/components/ProductFormModal";
import ExcelImportModal from "@/components/ExcelImportModal";
import {
  Search, Plus, Upload, Package, Pencil, Trash2,
  MapPin, AlertTriangle, X, Warehouse, ArrowRightLeft,
  ChevronRight,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) { return new Intl.NumberFormat("vi-VN").format(n); }
function fmtPrice(n?: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}

/** Return text description of where a product lives */
function resolveLocation(
  productId: string,
  storeSections: ReturnType<typeof useStore.getState>["storeSections"],
  warehouseShelves: WarehouseShelf[]
): string | null {
  for (const sec of storeSections) {
    for (const sub of sec.subsections) {
      for (let ri = 0; ri < sub.rows.length; ri++) {
        const si = sub.rows[ri].products.indexOf(productId);
        if (si !== -1) return `Kệ ${sub.name} — Hàng ${ri + 1}, Ô ${si + 1}`;
      }
    }
  }
  for (const shelf of warehouseShelves) {
    for (let ti = 0; ti < shelf.tiers.length; ti++) {
      const si = shelf.tiers[ti].indexOf(productId);
      if (si !== -1) return `Kho — ${shelf.name} · Tầng ${ti + 1}, Ô ${si + 1}`;
    }
  }
  return null;
}

// ─── WAREHOUSE MAP ──────────────────────────────────────────────────────────

const TIER_LABELS = ["Tầng 4 (Trên)", "Tầng 3", "Tầng 2", "Tầng 1 (Dưới)"];
const SLOTS_PER_TIER = 25;  // 5 × 5

interface BinProps {
  productId: string | null;
  products: Product[];
  highlighted: boolean;
  /** click to open move modal */
  onClick?: () => void;
}

function Bin({ productId, products, highlighted, onClick }: BinProps) {
  const [hov, setHov] = useState(false);
  const p = productId ? products.find(x => x.id === productId) : null;
  const filled = !!p;

  return (
    <motion.button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      animate={highlighted ? { scale: [1, 1.12, 1], boxShadow: ["0 0 0px transparent", "0 0 10px var(--gold)", "0 0 0px transparent"] } : {}}
      transition={highlighted ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : {}}
      className="relative w-5 h-5 rounded-sm border transition-all duration-100 cursor-pointer"
      style={{
        background:   highlighted
          ? "var(--gold)"
          : filled
          ? `color-mix(in srgb, ${p!.color ?? "var(--blue)"} 30%, var(--bg-elevated))`
          : "var(--bg-elevated)",
        borderColor:  highlighted
          ? "var(--gold)"
          : filled
          ? `color-mix(in srgb, ${p!.color ?? "var(--blue)"} 60%, transparent)`
          : "var(--border)",
      }}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {hov && p && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap"
          >
            <div className="rounded-md border border-border bg-bg-elevated px-2 py-1 shadow-md">
              <p className="text-text-primary font-medium" style={{ fontSize: 9 }}>{p.name}</p>
              <p className="text-text-muted" style={{ fontSize: 7 }}>{p.category} · {p.quantity} cái</p>
            </div>
          </motion.div>
        )}
        {hov && !p && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap"
          >
            <div className="rounded-md border border-border bg-bg-elevated px-2 py-1 shadow-md">
              <p className="text-text-muted" style={{ fontSize: 8 }}>Trống</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

interface ShelfCardProps {
  shelf: WarehouseShelf;
  products: Product[];
  highlightProductId: string | null;
  onMoveProduct: (shelfId: string, tierIndex: number, slotIndex: number, productId: string) => void;
}

function ShelfCard({ shelf, products, highlightProductId, onMoveProduct }: ShelfCardProps) {
  const filledSlots = shelf.tiers.reduce(
    (s, tier) => s + tier.filter(Boolean).length, 0
  );
  const totalSlots = shelf.tiers.length * SLOTS_PER_TIER;
  const density    = totalSlots > 0 ? filledSlots / totalSlots : 0;
  const isHighlighted = highlightProductId !== null && shelf.tiers.some(
    tier => tier.includes(highlightProductId)
  );

  // Density colour
  const densityColor =
    density >= 0.85 ? "var(--accent-red)"
    : density >= 0.6  ? "var(--gold)"
    : "var(--accent-green)";

  return (
    <motion.div
      animate={isHighlighted ? { borderColor: ["var(--border)", "var(--gold)", "var(--border)"] } : {}}
      transition={isHighlighted ? { duration: 1, repeat: Infinity } : {}}
      className="rounded-xl border bg-bg-card overflow-hidden flex flex-col"
      style={{ borderColor: isHighlighted ? "var(--gold)" : "var(--border)" }}
    >
      {/* Shelf header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Warehouse size={10} style={{ color: isHighlighted ? "var(--gold)" : "var(--text-muted)" }} />
          <p
            className="font-semibold tracking-wider"
            style={{ fontSize: 9, color: isHighlighted ? "var(--gold)" : "var(--text-primary)" }}
          >
            {shelf.name}
          </p>
          {isHighlighted && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-[7px] font-semibold tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: "var(--gold-muted)", color: "var(--gold)" }}
            >
              TÌM THẤY
            </motion.span>
          )}
        </div>
        {/* Density */}
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${density * 100}%`, background: densityColor }}
            />
          </div>
          <span style={{ fontSize: 8, color: densityColor }}>{Math.round(density * 100)}%</span>
          <span className="text-text-muted" style={{ fontSize: 7 }}>{filledSlots}/{totalSlots}</span>
        </div>
      </div>

      {/* Tiers */}
      <div className="p-2.5 flex flex-col gap-1.5">
        {shelf.tiers.map((tier, ti) => {
          const tierLabel = TIER_LABELS[ti] ?? `Tầng ${ti + 1}`;
          const tierFilled = tier.filter(Boolean).length;
          return (
            <div key={ti} className="flex items-center gap-2">
              <span
                className="text-text-muted font-mono flex-shrink-0 text-right"
                style={{ fontSize: 7, width: 56 }}
              >
                {tierLabel}
              </span>
              <div className="flex gap-0.5 flex-wrap">
                {tier.map((pid, si) => (
                  <Bin
                    key={si}
                    productId={pid}
                    products={products}
                    highlighted={!!pid && pid === highlightProductId}
                    onClick={pid ? () => onMoveProduct(shelf.id, ti, si, pid) : undefined}
                  />
                ))}
              </div>
              <span className="text-text-muted" style={{ fontSize: 7 }}>
                {tierFilled}/{SLOTS_PER_TIER}
              </span>
            </div>
          );
        })}
      </div>
      {shelf.notes && (
        <p className="px-3 pb-2 text-text-muted" style={{ fontSize: 8 }}>{shelf.notes}</p>
      )}
    </motion.div>
  );
}

// ─── Move modal ──────────────────────────────────────────────────────────────

interface MoveTarget {
  shelfId: string;
  tierIndex: number;
  slotIndex: number;
  productId: string;
}

function MoveProductModal({
  target,
  onClose,
}: {
  target: MoveTarget;
  onClose: () => void;
}) {
  const { products, storeSections, warehouseShelves, placeInSection, placeInWarehouse } = useStore();
  const p = products.find(x => x.id === target.productId);
  const [dest, setDest] = useState<"store" | "warehouse">("store");
  const [selSection, setSelSection] = useState("");
  const [selSub,     setSelSub]     = useState("");
  const [selRow,     setSelRow]     = useState(0);
  const [selShelf,   setSelShelf]   = useState("");
  const [selTier,    setSelTier]    = useState(0);

  const currentShelf = warehouseShelves.find(s => s.id === target.shelfId);

  function handleMove() {
    if (dest === "store") {
      if (!selSection || !selSub) return;
      const sec = storeSections.find(s => s.id === selSection);
      const sub = sec?.subsections.find(s => s.id === selSub);
      const row = sub?.rows[selRow];
      if (!row) return;
      const ei = row.products.findIndex(x => x === null);
      if (ei === -1) return;
      // Remove from warehouse
      placeInWarehouse(target.shelfId, target.tierIndex, target.slotIndex, null);
      // Place on display
      placeInSection(selSection, selSub, selRow, ei, target.productId);
    } else {
      if (!selShelf) return;
      const shelf = warehouseShelves.find(s => s.id === selShelf);
      if (!shelf) return;
      const slotIdx = shelf.tiers[selTier].findIndex(x => x === null);
      if (slotIdx === -1) return;
      // Remove from current location
      placeInWarehouse(target.shelfId, target.tierIndex, target.slotIndex, null);
      // Place in new location
      placeInWarehouse(selShelf, selTier, slotIdx, target.productId);
    }
    onClose();
  }

  if (!p) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        className="rounded-2xl border border-border bg-bg-card w-[90%] max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ArrowRightLeft size={13} className="text-gold" />
            <p className="text-text-primary font-medium tracking-wide" style={{ fontSize: 13 }}>
              Chuyển Hàng
            </p>
          </div>
          <button onClick={onClose} className="cursor-pointer" style={{ background: "none", border: "none" }}>
            <X size={14} className="text-text-muted" />
          </button>
        </div>

        {/* Product info */}
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg border border-border flex items-center justify-center flex-shrink-0"
            style={{ background: p.color ? `${p.color}33` : "var(--bg-elevated)" }}
          >
            {p.imagePath
              ? <img src={p.imagePath} alt="" className="w-full h-full object-cover rounded-lg" />
              : <Package size={13} className="text-text-muted" />
            }
          </div>
          <div>
            <p className="text-text-primary font-medium" style={{ fontSize: 12 }}>{p.name}</p>
            <p className="text-text-muted" style={{ fontSize: 9, marginTop: 2 }}>
              Hiện tại: {currentShelf?.name ?? "?"} · Tầng {target.tierIndex + 1} · Ô {target.slotIndex + 1}
            </p>
          </div>
        </div>

        {/* Destination picker */}
        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Dest type */}
          <div className="flex gap-2">
            {(["store", "warehouse"] as const).map(d => (
              <button
                key={d}
                onClick={() => setDest(d)}
                className="flex-1 py-2 rounded-lg border font-[inherit] cursor-pointer transition-colors"
                style={{
                  background:  dest === d ? "var(--blue-subtle)" : "transparent",
                  borderColor: dest === d ? "var(--blue)" : "var(--border)",
                  color:       dest === d ? "var(--blue)" : "var(--text-muted)",
                  fontSize:    10,
                  letterSpacing: "0.1em",
                  fontWeight:  dest === d ? 600 : 400,
                }}
              >
                {d === "store" ? "Kệ Trưng Bày" : "Kho Khác"}
              </button>
            ))}
          </div>

          {dest === "store" ? (
            <div className="flex flex-col gap-2">
              <select
                value={selSection}
                onChange={e => { setSelSection(e.target.value); setSelSub(""); }}
                className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary font-[inherit] outline-none"
                style={{ fontSize: 11 }}
              >
                <option value="">— Chọn khu vực —</option>
                {storeSections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {selSection && (
                <select
                  value={selSub}
                  onChange={e => setSelSub(e.target.value)}
                  className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary font-[inherit] outline-none"
                  style={{ fontSize: 11 }}
                >
                  <option value="">— Chọn vị trí —</option>
                  {storeSections.find(s => s.id === selSection)?.subsections.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              )}
              {selSub && (() => {
                const sec = storeSections.find(s => s.id === selSection);
                const sub = sec?.subsections.find(s => s.id === selSub);
                if (!sub) return null;
                return (
                  <select
                    value={selRow}
                    onChange={e => setSelRow(Number(e.target.value))}
                    className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary font-[inherit] outline-none"
                    style={{ fontSize: 11 }}
                  >
                    {sub.rows.map((row, ri) => {
                      const empty = row.products.filter(x => x === null).length;
                      return (
                        <option key={ri} value={ri} disabled={empty === 0}>
                          Hàng {ri + 1} ({row.type}) — {empty} ô trống
                        </option>
                      );
                    })}
                  </select>
                );
              })()}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <select
                value={selShelf}
                onChange={e => setSelShelf(e.target.value)}
                className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary font-[inherit] outline-none"
                style={{ fontSize: 11 }}
              >
                <option value="">— Chọn kệ kho —</option>
                {warehouseShelves
                  .filter(s => s.id !== target.shelfId)
                  .map(s => {
                    const free = s.tiers.reduce((acc, t) => acc + t.filter(x => x === null).length, 0);
                    return (
                      <option key={s.id} value={s.id} disabled={free === 0}>
                        {s.name} — {free} ô trống
                      </option>
                    );
                  })}
              </select>
              {selShelf && (
                <select
                  value={selTier}
                  onChange={e => setSelTier(Number(e.target.value))}
                  className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary font-[inherit] outline-none"
                  style={{ fontSize: 11 }}
                >
                  {TIER_LABELS.map((label, ti) => {
                    const shelf = warehouseShelves.find(s => s.id === selShelf);
                    const free  = shelf ? shelf.tiers[ti].filter(x => x === null).length : 0;
                    return (
                      <option key={ti} value={ti} disabled={free === 0}>
                        {label} — {free} ô trống
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border bg-transparent text-text-muted font-[inherit] cursor-pointer hover:border-border-strong transition-colors"
            style={{ fontSize: 10, letterSpacing: "0.1em" }}
          >
            HỦY
          </button>
          <button
            onClick={handleMove}
            className="px-5 py-2 rounded-lg border font-semibold font-[inherit] cursor-pointer transition-colors"
            style={{
              background:   "var(--blue-subtle)",
              borderColor:  "var(--blue-dark)",
              color:        "var(--blue)",
              fontSize:      10,
              letterSpacing: "0.14em",
            }}
          >
            CHUYỂN HÀNG
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Inventory table row (with location tooltip) ─────────────────────────────

const fadeUp = {
  hidden:  { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.025, duration: 0.26, ease: [0.16, 1, 0.3, 1] },
  }),
};

function ProductRow({
  p, index, onEdit, onDelete,
}: {
  p: Product; index: number; onEdit: (p: Product) => void; onDelete: (p: Product) => void;
}) {
  const { storeSections, warehouseShelves } = useStore();
  const [hov, setHov] = useState(false);
  const location = useMemo(
    () => resolveLocation(p.id, storeSections, warehouseShelves),
    [p.id, storeSections, warehouseShelves]
  );

  return (
    <motion.div
      custom={index} initial="hidden" animate="visible" variants={fadeUp}
      exit={{ opacity: 0, x: -16 }} layout
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="relative grid px-5 items-center gap-3 border-b border-border last:border-0 product-row"
      style={{ gridTemplateColumns: "2.5fr 1fr 1fr 0.8fr 0.8fr 0.8fr 80px", height: 54 }}
    >
      {/* Product + location tooltip */}
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div
          className="w-8 h-8 rounded-md flex-shrink-0 border border-border flex items-center justify-center overflow-hidden"
          style={{ background: p.color ? `${p.color}44` : "var(--bg-elevated)" }}
        >
          {p.imagePath
            ? <img src={p.imagePath} alt="" className="w-full h-full object-cover" />
            : !p.color && <Package size={11} className="text-text-muted" />
          }
        </div>
        <div className="overflow-hidden flex-1">
          <p className="text-text-primary font-medium truncate" style={{ fontSize: 11 }}>{p.name}</p>
          {p.notes && <p className="text-text-muted truncate" style={{ fontSize: 8, marginTop: 1 }}>{p.notes}</p>}
        </div>
        {/* Location badge */}
        <AnimatePresence>
          {hov && location && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 2 }}
              className="absolute left-4 -top-10 z-40 pointer-events-none"
            >
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 shadow-md whitespace-nowrap">
                <MapPin size={9} className="text-blue flex-shrink-0" />
                <span className="text-text-primary" style={{ fontSize: 9 }}>{location}</span>
              </div>
            </motion.div>
          )}
          {hov && !location && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-4 -top-8 z-40 pointer-events-none"
            >
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2 py-1">
                <AlertTriangle size={8} className="text-gold flex-shrink-0" />
                <span className="text-text-muted" style={{ fontSize: 8 }}>Chưa có vị trí</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <span className="text-text-muted" style={{ fontSize: 10 }}>{p.category}</span>
      <span className="text-text-muted font-mono tracking-wide" style={{ fontSize: 9 }}>{p.sku || "—"}</span>
      <span
        className="font-medium"
        style={{
          fontSize: 14,
          color: p.quantity === 0
            ? "var(--accent-red)"
            : p.quantity < 5
            ? "var(--gold)"
            : "var(--text-primary)",
        }}
      >
        {p.quantity}
      </span>
      <span className="text-text-secondary" style={{ fontSize: 10 }}>{fmtPrice(p.price)}</span>
      <span style={{ fontSize: 10, color: p.markdownPrice ? "var(--accent-red)" : "var(--text-muted)" }}>
        {p.markdownPrice ? fmtPrice(p.markdownPrice) : "—"}
      </span>
      <div className="flex gap-1.5 justify-end">
        <button
          onClick={() => onEdit(p)}
          className="w-7 h-7 rounded-md border border-border bg-transparent flex items-center justify-center hover:border-blue hover:text-blue transition-colors cursor-pointer"
        >
          <Pencil size={10} className="text-text-muted" />
        </button>
        <button
          onClick={() => onDelete(p)}
          className="w-7 h-7 rounded-md border border-border bg-transparent flex items-center justify-center hover:border-accent-red transition-colors cursor-pointer"
        >
          <Trash2 size={10} className="text-text-muted" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

type View = "list" | "warehouse";

export default function InventoryPage() {
  const {
    products, storeSections, warehouseShelves,
    deleteProduct, fetchProducts,
  } = useStore();

  const [view,        setView]        = useState<View>("list");
  const [search,      setSearch]      = useState("");
  const [filterCat,   setFilterCat]   = useState("Tất cả");
  const [showForm,    setShowForm]    = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showExcel,   setShowExcel]   = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [confirmDel,  setConfirmDel]  = useState<Product | null>(null);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [moveTarget,  setMoveTarget]  = useState<MoveTarget | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  const categories = useMemo(
    () => ["Tất cả", ...Array.from(new Set(products.map(p => p.category)))],
    [products]
  );

  const filtered = useMemo(() =>
    products.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || p.name.toLowerCase().includes(q)
        || (p.sku ?? "").toLowerCase().includes(q);
      return matchSearch && (filterCat === "Tất cả" || p.category === filterCat);
    }),
    [products, search, filterCat]
  );

  // Find product matching warehouse search
  const highlightProductId = useMemo(() => {
    if (!warehouseSearch.trim()) return null;
    const q = warehouseSearch.toLowerCase();
    const match = products.find(
      p => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q)
    );
    return match?.id ?? null;
  }, [warehouseSearch, products]);

  const totalUnits = useMemo(() => products.reduce((s, p) => s + p.quantity, 0), [products]);
  const totalValue = useMemo(() => products.reduce((s, p) => s + (p.price || 0) * p.quantity, 0), [products]);
  const lowStock   = useMemo(() => products.filter(p => p.quantity > 0 && p.quantity < 5).length, [products]);
  const outOfStock = useMemo(() => products.filter(p => p.quantity === 0).length, [products]);

  const warehouseStats = useMemo(() => {
    const total  = warehouseShelves.reduce((s, sh) => s + sh.tiers.length * SLOTS_PER_TIER, 0);
    const filled = warehouseShelves.reduce(
      (s, sh) => s + sh.tiers.reduce((ts, t) => ts + t.filter(Boolean).length, 0), 0
    );
    return { total, filled, density: total > 0 ? filled / total : 0 };
  }, [warehouseShelves]);

  const handleDelete = useCallback(async (p: Product) => {
    setDeletingId(p.id);
    await deleteProduct(p.id);
    setDeletingId(null);
    setConfirmDel(null);
  }, [deleteProduct]);

  const handleEdit   = useCallback((p: Product) => { setEditProduct(p); setShowForm(true); }, []);
  const handleDelete2= useCallback((p: Product) => setConfirmDel(p), []);

  // Separate shelves by type for warehouse map
  const shoesShelves = useMemo(() => warehouseShelves.filter(s => s.shelfType === "shoes"), [warehouseShelves]);
  const bagsShelves  = useMemo(() => warehouseShelves.filter(s => s.shelfType === "bags"),  [warehouseShelves]);

  return (
    <div className="flex flex-col gap-6 md:gap-8">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="flex flex-col gap-1.5"
      >
        <p className="text-text-muted font-semibold uppercase tracking-[0.38em]" style={{ fontSize: 9 }}>
          Quản Lý Cửa Hàng · ALDO
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-text-primary font-light tracking-wide" style={{ fontSize: 26, lineHeight: 1.2 }}>
            Kho Hàng
          </h1>
          {/* View switcher */}
          <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
            {(["list", "warehouse"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 font-[inherit] cursor-pointer transition-colors"
                style={{
                  background:  view === v ? "var(--blue-subtle)" : "transparent",
                  color:       view === v ? "var(--blue)" : "var(--text-muted)",
                  borderRight: v === "list" ? "1px solid var(--border)" : "none",
                  fontSize:     9,
                  letterSpacing: "0.1em",
                  fontWeight:   view === v ? 600 : 400,
                }}
              >
                {v === "list" ? "DANH SÁCH" : "BẢN ĐỒ KHO"}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Sản Phẩm",      value: products.length,             unit: "SKU",      color: "var(--gold)"          },
          { label: "Tổng Số Lượng", value: fmt(totalUnits),             unit: "đơn vị",  color: "var(--blue)"          },
          { label: "Giá Trị",       value: totalValue >= 1_000_000
              ? `${fmt(Math.round(totalValue / 1_000_000))}M` : fmt(totalValue),
            unit: "VND",       color: "var(--accent-purple)"  },
          { label: "Cần Nhập",      value: lowStock + outOfStock,       unit: "mặt hàng", color: lowStock + outOfStock > 0 ? "var(--accent-red)" : "var(--accent-green)" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            custom={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-border bg-bg-card px-4 py-4"
          >
            <p className="text-text-muted font-semibold uppercase tracking-[0.2em]" style={{ fontSize: 8 }}>{s.label}</p>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-text-primary font-light" style={{ fontSize: 22 }}>{s.value}</span>
              <span className="font-medium tracking-widest" style={{ fontSize: 8, color: s.color }}>{s.unit}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: LIST
      ══════════════════════════════════════════════════════════════════════ */}
      {view === "list" && (
        <>
          {/* Toolbar */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16 }}
            className="flex flex-wrap gap-2.5 items-center"
          >
            <div className="flex-1 min-w-[180px] flex items-center gap-2 bg-bg-input border border-border rounded-lg px-3 h-9">
              <Search size={12} className="text-text-muted flex-shrink-0" strokeWidth={1.5} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm sản phẩm, SKU..."
                className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted font-[inherit]"
                style={{ fontSize: 11, letterSpacing: "0.04em" }}
              />
              {search && (
                <button onClick={() => setSearch("")} className="cursor-pointer" style={{ background: "none", border: "none" }}>
                  <X size={9} className="text-text-muted" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  className="px-2.5 py-1.5 rounded-md border font-[inherit] cursor-pointer transition-colors"
                  style={{
                    borderColor: filterCat === cat ? "var(--gold)" : "var(--border)",
                    background:  filterCat === cat ? "var(--gold-muted)" : "transparent",
                    color:       filterCat === cat ? "var(--gold)" : "var(--text-muted)",
                    fontSize: 9, letterSpacing: "0.1em",
                  }}
                >{cat}</button>
              ))}
            </div>
            <div className="flex gap-2 ml-auto flex-shrink-0">
              <button onClick={() => setShowExcel(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-transparent border border-border rounded-lg text-text-muted font-[inherit] cursor-pointer hover:border-border-strong transition-colors"
                style={{ fontSize: 9, letterSpacing: "0.12em" }}
              >
                <Upload size={11} strokeWidth={1.5} /> IMPORT
              </button>
              <button onClick={() => { setEditProduct(null); setShowForm(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border font-semibold font-[inherit] cursor-pointer transition-colors"
                style={{ background: "var(--gold-muted)", borderColor: "var(--gold-dark)", color: "var(--gold)", fontSize: 9, letterSpacing: "0.14em" }}
              >
                <Plus size={11} strokeWidth={2} /> THÊM
              </button>
            </div>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-bg-card overflow-hidden"
          >
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Package size={28} className="text-text-muted mx-auto opacity-20" />
                <p className="text-text-muted mt-4 tracking-wide" style={{ fontSize: 11 }}>
                  {products.length === 0 ? "Chưa có sản phẩm nào" : "Không tìm thấy kết quả"}
                </p>
                {products.length === 0 && (
                  <button onClick={() => setShowForm(true)}
                    className="mt-4 px-5 py-2 bg-transparent border border-border rounded-lg text-text-muted font-[inherit] cursor-pointer hover:border-blue hover:text-blue transition-colors"
                    style={{ fontSize: 9, letterSpacing: "0.12em" }}
                  >THÊM SẢN PHẨM ĐẦU TIÊN</button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block">
                  <div
                    className="grid px-5 items-center gap-3 border-b border-border"
                    style={{ gridTemplateColumns: "2.5fr 1fr 1fr 0.8fr 0.8fr 0.8fr 80px", height: 36 }}
                  >
                    {["Sản Phẩm", "Danh Mục", "SKU", "Số Lượng", "Đơn Giá", "Giá Giảm", ""].map(h => (
                      <span key={h} className="text-text-muted font-semibold uppercase tracking-[0.2em]" style={{ fontSize: 8 }}>{h}</span>
                    ))}
                  </div>
                  <AnimatePresence>
                    {filtered.map((p, i) => (
                      <ProductRow key={p.id} p={p} index={i} onEdit={handleEdit} onDelete={handleDelete2} />
                    ))}
                  </AnimatePresence>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-border">
                  {filtered.map(p => {
                    const loc = resolveLocation(p.id, storeSections, warehouseShelves);
                    return (
                      <div key={p.id} className="px-4 py-3 flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-md flex-shrink-0 border border-border flex items-center justify-center overflow-hidden"
                          style={{ background: p.color ? `${p.color}44` : "var(--bg-elevated)" }}
                        >
                          {p.imagePath
                            ? <img src={p.imagePath} alt="" className="w-full h-full object-cover" />
                            : <Package size={13} className="text-text-muted" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-medium truncate" style={{ fontSize: 12 }}>{p.name}</p>
                          <p className="text-text-muted" style={{ fontSize: 9, marginTop: 1 }}>{p.category} {p.sku ? `· ${p.sku}` : ""}</p>
                          {loc && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin size={8} className="text-blue flex-shrink-0" />
                              <span className="text-text-muted" style={{ fontSize: 8 }}>{loc}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span
                            className="font-medium"
                            style={{ fontSize: 15, color: p.quantity === 0 ? "var(--accent-red)" : p.quantity < 5 ? "var(--gold)" : "var(--text-primary)" }}
                          >{p.quantity}</span>
                          <div className="flex gap-1">
                            <button onClick={() => handleEdit(p)} className="w-6 h-6 rounded border border-border flex items-center justify-center cursor-pointer">
                              <Pencil size={9} className="text-text-muted" />
                            </button>
                            <button onClick={() => handleDelete2(p)} className="w-6 h-6 rounded border border-border flex items-center justify-center cursor-pointer">
                              <Trash2 size={9} className="text-text-muted" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>

          <p className="text-text-muted tracking-wider text-right" style={{ fontSize: 9 }}>
            {filtered.length} / {products.length} sản phẩm
          </p>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: WAREHOUSE MAP
      ══════════════════════════════════════════════════════════════════════ */}
      {view === "warehouse" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="flex flex-col gap-5"
        >
          {/* Warehouse summary + search */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg-card">
                <Warehouse size={11} className="text-text-muted" />
                <span className="text-text-primary font-medium" style={{ fontSize: 11 }}>
                  {warehouseShelves.length} kệ
                </span>
                <span className="text-text-muted" style={{ fontSize: 9 }}>·</span>
                <span
                  style={{
                    fontSize: 10,
                    color: warehouseStats.density >= 0.85 ? "var(--accent-red)"
                         : warehouseStats.density >= 0.6  ? "var(--gold)"
                         : "var(--accent-green)",
                  }}
                >
                  {Math.round(warehouseStats.density * 100)}% lấp đầy
                </span>
                <span className="text-text-muted" style={{ fontSize: 9 }}>
                  ({warehouseStats.filled}/{warehouseStats.total})
                </span>
              </div>
              {/* Legend */}
              <div className="hidden md:flex items-center gap-2.5">
                {[
                  { color: "var(--accent-green)", label: "< 60%" },
                  { color: "var(--gold)",          label: "60-85%" },
                  { color: "var(--accent-red)",    label: "> 85%" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm" style={{ background: l.color }} />
                    <span className="text-text-muted" style={{ fontSize: 8 }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Find item search */}
            <div className="flex items-center gap-2 bg-bg-input border border-border rounded-lg px-3 h-9 min-w-[240px]">
              <Search size={11} strokeWidth={1.5} style={{ color: highlightProductId ? "var(--gold)" : "var(--text-muted)", flexShrink: 0 }} />
              <input
                value={warehouseSearch}
                onChange={e => setWarehouseSearch(e.target.value)}
                placeholder="Tìm vị trí hàng (tên / SKU)..."
                className="flex-1 bg-transparent border-none outline-none font-[inherit]"
                style={{ fontSize: 10, color: highlightProductId ? "var(--gold)" : "var(--text-primary)" }}
              />
              {warehouseSearch && (
                <button onClick={() => setWarehouseSearch("")} className="cursor-pointer" style={{ background: "none", border: "none" }}>
                  <X size={9} className="text-text-muted" />
                </button>
              )}
            </div>
          </div>

          {/* Search result feedback */}
          <AnimatePresence>
            {warehouseSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{
                    background:  highlightProductId ? "color-mix(in srgb, var(--gold) 8%, var(--bg-card))" : "var(--bg-card)",
                    borderColor: highlightProductId ? "var(--gold)" : "var(--border)",
                  }}
                >
                  {highlightProductId ? (
                    <>
                      <MapPin size={11} className="text-gold flex-shrink-0" />
                      <span className="text-gold font-medium" style={{ fontSize: 10 }}>
                        Tìm thấy: {products.find(p => p.id === highlightProductId)?.name}
                      </span>
                      <ChevronRight size={10} className="text-gold" />
                      <span className="text-text-secondary" style={{ fontSize: 10 }}>
                        {resolveLocation(highlightProductId, storeSections, warehouseShelves) ?? "Chưa có vị trí kho"}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={11} className="text-text-muted flex-shrink-0" />
                      <span className="text-text-muted" style={{ fontSize: 10 }}>Không tìm thấy sản phẩm khớp</span>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Shoe shelves */}
          {shoesShelves.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-3.5 rounded-full bg-gold" />
                <p className="text-gold font-semibold tracking-[0.2em]" style={{ fontSize: 10 }}>KHO GIÀY</p>
                <div className="flex-1 h-px bg-border" />
                <span className="text-text-muted" style={{ fontSize: 8 }}>{shoesShelves.length} kệ</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {shoesShelves.map(shelf => (
                  <ShelfCard
                    key={shelf.id}
                    shelf={shelf}
                    products={products}
                    highlightProductId={highlightProductId}
                    onMoveProduct={(shelfId, tierIndex, slotIndex, productId) =>
                      setMoveTarget({ shelfId, tierIndex, slotIndex, productId })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bag shelves */}
          {bagsShelves.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-3.5 rounded-full bg-blue" />
                <p className="font-semibold tracking-[0.2em]" style={{ fontSize: 10, color: "var(--blue)" }}>KHO TÚI</p>
                <div className="flex-1 h-px bg-border" />
                <span className="text-text-muted" style={{ fontSize: 8 }}>{bagsShelves.length} kệ</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {bagsShelves.map(shelf => (
                  <ShelfCard
                    key={shelf.id}
                    shelf={shelf}
                    products={products}
                    highlightProductId={highlightProductId}
                    onMoveProduct={(shelfId, tierIndex, slotIndex, productId) =>
                      setMoveTarget({ shelfId, tierIndex, slotIndex, productId })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {warehouseShelves.length === 0 && (
            <div className="py-20 text-center">
              <Warehouse size={32} className="text-text-muted mx-auto opacity-20" />
              <p className="text-text-muted mt-4 tracking-wide" style={{ fontSize: 11 }}>Chưa có kệ kho nào</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Confirm delete ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDel && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[999]"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setConfirmDel(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="rounded-2xl border border-border bg-bg-card p-7 w-[90%] max-w-sm"
            >
              <p className="text-text-primary font-medium tracking-wide" style={{ fontSize: 13 }}>Xóa sản phẩm?</p>
              <p className="text-text-muted mt-2" style={{ fontSize: 11 }}>
                <span className="text-text-primary">{confirmDel.name}</span> sẽ bị xóa vĩnh viễn khỏi tất cả kệ hàng.
              </p>
              <div className="flex gap-2.5 mt-6 justify-end">
                <button onClick={() => setConfirmDel(null)}
                  className="px-4 py-2 bg-transparent border border-border rounded-lg text-text-muted font-[inherit] cursor-pointer hover:border-border-strong transition-colors"
                  style={{ fontSize: 9, letterSpacing: "0.1em" }}
                >HỦY</button>
                <button onClick={() => handleDelete(confirmDel)} disabled={!!deletingId}
                  className="px-4 py-2 rounded-lg border font-[inherit] cursor-pointer transition-colors"
                  style={{ background: "rgba(220,38,38,0.1)", borderColor: "rgba(220,38,38,0.4)", color: "var(--accent-red)", fontSize: 9, letterSpacing: "0.1em" }}
                >{deletingId ? "ĐANG XÓA..." : "XÓA"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Move product modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {moveTarget && (
          <MoveProductModal
            target={moveTarget}
            onClose={() => setMoveTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showForm && (
        <ProductFormModal
          product={editProduct}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
        />
      )}
      {showExcel && <ExcelImportModal onClose={() => setShowExcel(false)} />}
    </div>
  );
}
