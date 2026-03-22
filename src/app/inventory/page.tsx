"use client";

import {
  useState, useEffect, useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import type { Product, WarehouseShelf } from "@/types";
import ProductFormModal from "@/components/ProductFormModal";
import ExcelImportModal from "@/components/ExcelImportModal";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Upload, Package, Pencil, Trash2,
  MapPin, X, Warehouse, Eye, CheckSquare, Square,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) { return new Intl.NumberFormat("vi-VN").format(n); }
function fmtPrice(n?: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}

function resolveLocation(
  pid: string,
  storeSections: ReturnType<typeof useStore.getState>["storeSections"],
  warehouseShelves: WarehouseShelf[]
): string | null {
  for (const sec of storeSections) {
    for (const sub of sec.subsections) {
      for (let ri = 0; ri < sub.rows.length; ri++) {
        const si = sub.rows[ri].products.indexOf(pid);
        if (si !== -1) return `Kệ ${sub.name} — Hàng ${ri + 1}, Ô ${si + 1}`;
      }
    }
  }
  for (const shelf of warehouseShelves) {
    for (let ti = 0; ti < shelf.tiers.length; ti++) {
      const si = shelf.tiers[ti].indexOf(pid);
      if (si !== -1) return `Kho — ${shelf.name} · Tầng ${ti + 1}, Ô ${si + 1}`;
    }
  }
  return null;
}

// ─── Navigate to visual-board with highlight ──────────────────────────────────

function navigateToBoard(
  router: ReturnType<typeof useRouter>,
  pid: string,
  mode: "display" | "warehouse"
) {
  try {
    sessionStorage.setItem("postlain_highlight", JSON.stringify({ pid, mode }));
  } catch { /* noop */ }
  router.push("/visual-board");
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView() {
  const {
    products, storeSections, warehouseShelves,
    fetchProducts, deleteProduct,
  } = useStore();
  const router = useRouter();

  const [search,        setSearch]        = useState("");
  const [editProduct,   setEditProduct]   = useState<Product | null>(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [showImport,    setShowImport]    = useState(false);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);
  const [hoveredId,     setHoveredId]     = useState<string | null>(null);
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [confirmBulk,   setConfirmBulk]   = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const filtered = useMemo(() =>
    products.filter(p =>
      !search
        || p.name.toLowerCase().includes(search.toLowerCase())
        || (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
        || p.category.toLowerCase().includes(search.toLowerCase())
    ),
    [products, search]
  );

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));
  const someSelected = selected.size > 0;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    await fetchProducts();
    setSelected(new Set());
    setConfirmBulk(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-2 flex-1 min-w-[180px] rounded-xl px-3 h-9"
          style={{ background: "#ffffff", border: "1px solid #bae6fd" }}
        >
          <Search size={12} style={{ color: "#94a3b8" }} strokeWidth={1.5} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tên, SKU, danh mục..."
            className="flex-1 bg-transparent border-none outline-none font-[inherit]"
            style={{ fontSize: 11, color: "#0c1a2e" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <X size={10} style={{ color: "#94a3b8" }} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl border font-[inherit] cursor-pointer transition-colors hover:border-blue"
          style={{ background: "#ffffff", borderColor: "#bae6fd", fontSize: 10, color: "#334e68", letterSpacing: "0.1em" }}
        >
          <Upload size={11} strokeWidth={1.5} /> NHẬP EXCEL
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl border font-[inherit] cursor-pointer transition-colors"
          style={{ background: "#0ea5e9", borderColor: "#0284c7", color: "#ffffff", fontSize: 10, letterSpacing: "0.1em" }}
        >
          <Plus size={11} strokeWidth={2} /> THÊM SẢN PHẨM
        </button>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="flex items-center gap-3 px-4 rounded-xl overflow-hidden"
            style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)", minHeight: 40 }}
          >
            <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>
              Đã chọn {selected.size} sản phẩm
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setSelected(new Set())}
              style={{ fontSize: 9, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              Bỏ chọn
            </button>
            <button
              onClick={() => setConfirmBulk(true)}
              className="flex items-center gap-1.5 px-3 h-7 rounded-lg border font-[inherit] cursor-pointer"
              style={{ background: "#dc2626", borderColor: "#b91c1c", color: "#fff", fontSize: 9, letterSpacing: "0.08em" }}
            >
              <Trash2 size={10} /> XOÁ {selected.size} MỤC
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table — desktop */}
      <div
        className="hidden md:block rounded-2xl border overflow-hidden"
        style={{ background: "#ffffff", borderColor: "#bae6fd" }}
      >
        {/* Header */}
        <div
          className="grid px-5 items-center border-b"
          style={{ gridTemplateColumns: "28px 2fr 1fr 0.8fr 0.8fr 1fr 0.7fr", height: 36, borderColor: "#e0f2fe", background: "#f0f9ff" }}
        >
          {/* Select all checkbox */}
          <button onClick={toggleAll} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
            {allSelected
              ? <CheckSquare size={13} style={{ color: "#0ea5e9" }} />
              : <Square size={13} style={{ color: "#bae6fd" }} />
            }
          </button>
          {["Sản Phẩm", "Danh Mục", "SKU", "SL", "Giá", ""].map(h => (
            <span key={h} className="font-bold uppercase tracking-[0.2em]" style={{ fontSize: 8, color: "#64748b" }}>{h}</span>
          ))}
        </div>
        {/* Rows */}
        {filtered.map(p => {
          const loc       = resolveLocation(p.id, storeSections, warehouseShelves);
          const isHov     = hoveredId === p.id;
          const inDisplay = storeSections.some(sec =>
            sec.subsections.some(sub =>
              sub.rows.some(row => row.products.includes(p.id))
            )
          );
          const inWarehouse = warehouseShelves.some(sh =>
            sh.tiers.some(t => t.includes(p.id))
          );
          const isSel = selected.has(p.id);
          return (
            <div
              key={p.id}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="grid px-5 items-center border-b last:border-0"
              style={{
                gridTemplateColumns: "28px 2fr 1fr 0.8fr 0.8fr 1fr auto",
                height: 48,
                borderColor: "#e0f2fe",
                background: isSel ? "rgba(220,38,38,0.04)" : isHov ? "rgba(14,165,233,0.04)" : "transparent",
                transition: "background 0.12s",
              }}
            >
              {/* Row checkbox */}
              <button
                onClick={() => toggleSelect(p.id)}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                {isSel
                  ? <CheckSquare size={13} style={{ color: "#dc2626" }} />
                  : <Square size={13} style={{ color: isHov ? "#bae6fd" : "transparent" }} />
                }
              </button>
              <div className="flex items-center gap-2 overflow-hidden">
                {p.color && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />}
                <div className="overflow-hidden">
                  <p className="font-semibold truncate" style={{ fontSize: 11, color: "#0c1a2e" }}>{p.name}</p>
                  {loc && (
                    <p className="flex items-center gap-0.5" style={{ fontSize: 8, color: "#0ea5e9", marginTop: 1 }}>
                      <MapPin size={7} /> {loc}
                    </p>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 9, color: "#64748b" }}>{p.category}</span>
              <span className="font-mono" style={{ fontSize: 9, color: "#64748b" }}>{p.sku ?? "—"}</span>
              <span className="font-semibold" style={{ fontSize: 12, color: p.quantity === 0 ? "#dc2626" : p.quantity < 5 ? "#C9A55A" : "#0c1a2e" }}>
                {p.quantity}
              </span>
              <span style={{ fontSize: 9, color: "#334e68" }}>{fmtPrice(p.price)}</span>

              {/* Action group */}
              <div className="flex items-center gap-1.5 justify-end">
                <AnimatePresence>
                  {isHov && (
                    <motion.div
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.12 }}
                      className="flex items-center gap-1"
                    >
                      {/* Xem Trưng Bày */}
                      <button
                        onClick={() => navigateToBoard(router, p.id, "display")}
                        title={inDisplay ? "Xem vị trí Trưng Bày" : "Chưa xếp vào kệ trưng bày"}
                        className="flex items-center gap-1 px-2 h-6 rounded-lg border cursor-pointer transition-all"
                        style={{
                          background:  inDisplay ? "rgba(201,165,90,0.10)" : "#f0f9ff",
                          borderColor: inDisplay ? "rgba(201,165,90,0.45)" : "#bae6fd",
                          fontSize:    8,
                          color:       inDisplay ? "#C9A55A" : "#94a3b8",
                          fontFamily:  "inherit",
                          letterSpacing: "0.08em",
                          fontWeight:  inDisplay ? 700 : 400,
                          whiteSpace:  "nowrap",
                        }}
                      >
                        <Eye size={8} />
                        TRƯNG BÀY
                      </button>
                      {/* Xem Kho */}
                      <button
                        onClick={() => navigateToBoard(router, p.id, "warehouse")}
                        title={inWarehouse ? "Xem vị trí Kho" : "Chưa xếp vào kho"}
                        className="flex items-center gap-1 px-2 h-6 rounded-lg border cursor-pointer transition-all"
                        style={{
                          background:  inWarehouse ? "rgba(14,165,233,0.10)" : "#f0f9ff",
                          borderColor: inWarehouse ? "rgba(14,165,233,0.45)" : "#bae6fd",
                          fontSize:    8,
                          color:       inWarehouse ? "#0ea5e9" : "#94a3b8",
                          fontFamily:  "inherit",
                          letterSpacing: "0.08em",
                          fontWeight:  inWarehouse ? 700 : 400,
                          whiteSpace:  "nowrap",
                        }}
                      >
                        <Warehouse size={8} />
                        KHO
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {isHov && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="flex items-center gap-1"
                    >
                      <button
                        onClick={() => setEditProduct(p)}
                        className="w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer"
                        style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}
                      >
                        <Pencil size={9} style={{ color: "#0ea5e9" }} />
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer"
                        style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}
                      >
                        <Trash2 size={9} style={{ color: "#dc2626" }} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-16 text-center" style={{ color: "#94a3b8", fontSize: 11 }}>
            Không tìm thấy sản phẩm nào
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-2">
        {filtered.map(p => {
          const loc = resolveLocation(p.id, storeSections, warehouseShelves);
          return (
            <div
              key={p.id}
              className="rounded-xl border px-4 py-3 flex items-start gap-3"
              style={{ background: "#ffffff", borderColor: "#bae6fd" }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ fontSize: 12, color: "#0c1a2e" }}>{p.name}</p>
                <p style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{p.category}{p.sku ? ` · ${p.sku}` : ""}</p>
                {loc && (
                  <p className="flex items-center gap-1 mt-1" style={{ fontSize: 8, color: "#0ea5e9" }}>
                    <MapPin size={7} /> {loc}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span
                  className="font-bold"
                  style={{ fontSize: 14, color: p.quantity === 0 ? "#dc2626" : p.quantity < 5 ? "#C9A55A" : "#0c1a2e" }}
                >
                  {p.quantity}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setEditProduct(p)} className="w-7 h-7 rounded-lg border flex items-center justify-center" style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}>
                    <Pencil size={10} style={{ color: "#0ea5e9" }} />
                  </button>
                  <button onClick={() => setDeleteId(p.id)} className="w-7 h-7 rounded-lg border flex items-center justify-center" style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}>
                    <Trash2 size={10} style={{ color: "#dc2626" }} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {(showAdd || !!editProduct) && (
        <ProductFormModal
          product={editProduct}
          onClose={() => { setShowAdd(false); setEditProduct(null); }}
        />
      )}
      {showImport && (
        <ExcelImportModal
          onClose={() => setShowImport(false)}
        />
      )}
      {/* Single delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "rgba(12,26,46,0.35)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              className="rounded-2xl border p-6 max-w-sm w-full"
              style={{ background: "#ffffff", borderColor: "#bae6fd", boxShadow: "0 20px 60px rgba(12,26,46,0.15)" }}
            >
              <p className="font-bold mb-1" style={{ fontSize: 14, color: "#0c1a2e" }}>Xác nhận xoá?</p>
              <p style={{ fontSize: 11, color: "#64748b", marginBottom: 20 }}>Thao tác này không thể hoàn tác.</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 rounded-xl border font-[inherit] cursor-pointer"
                  style={{ background: "#f0f9ff", borderColor: "#bae6fd", fontSize: 11, color: "#334e68" }}
                >
                  Huỷ
                </button>
                <button
                  onClick={async () => { await deleteProduct(deleteId); setDeleteId(null); }}
                  className="px-4 py-2 rounded-xl border font-[inherit] cursor-pointer"
                  style={{ background: "#dc2626", borderColor: "#b91c1c", color: "#ffffff", fontSize: 11 }}
                >
                  Xoá
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk delete confirm */}
      <AnimatePresence>
        {confirmBulk && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "rgba(12,26,46,0.35)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              className="rounded-2xl border p-6 max-w-sm w-full"
              style={{ background: "#ffffff", borderColor: "#fca5a5", boxShadow: "0 20px 60px rgba(12,26,46,0.15)" }}
            >
              <p className="font-bold mb-1" style={{ fontSize: 14, color: "#0c1a2e" }}>
                Xoá {selected.size} sản phẩm?
              </p>
              <p style={{ fontSize: 11, color: "#64748b", marginBottom: 20 }}>
                Tất cả sản phẩm đã chọn sẽ bị xoá vĩnh viễn. Không thể hoàn tác.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmBulk(false)}
                  className="px-4 py-2 rounded-xl border font-[inherit] cursor-pointer"
                  style={{ background: "#f0f9ff", borderColor: "#bae6fd", fontSize: 11, color: "#334e68" }}
                >
                  Huỷ
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 rounded-xl border font-[inherit] cursor-pointer"
                  style={{ background: "#dc2626", borderColor: "#b91c1c", color: "#ffffff", fontSize: 11 }}
                >
                  Xoá {selected.size} mục
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { products } = useStore();

  const totalValue = products.reduce((s, p) => s + (p.price ?? 0) * p.quantity, 0);

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}
        className="flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
          <p className="font-bold uppercase tracking-[0.38em]" style={{ fontSize: 9, color: "#94a3b8" }}>
            Quản Lý Cửa Hàng · ALDO
          </p>
          <h1 className="font-light tracking-wide mt-1" style={{ fontSize: 26, color: "#0c1a2e" }}>
            Kho Hàng
          </h1>
        </div>

        {/* Quick stats */}
        <div
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border"
          style={{ background: "#ffffff", borderColor: "#bae6fd" }}
        >
          <Package size={10} style={{ color: "#0ea5e9" }} />
          <span className="font-semibold" style={{ fontSize: 10, color: "#0c1a2e" }}>{products.length}</span>
          <span style={{ fontSize: 9, color: "#64748b" }}>SKU</span>
          <span style={{ fontSize: 9, color: "#bae6fd", margin: "0 2px" }}>·</span>
          <span style={{ fontSize: 9, color: "#334e68" }}>
            {totalValue >= 1_000_000_000
              ? `${(totalValue / 1_000_000_000).toFixed(1)}Tỷ`
              : `${fmt(Math.round(totalValue / 1_000))}K`} VND
          </span>
        </div>
      </motion.div>

      {/* Content */}
      <ListView />
    </div>
  );
}
