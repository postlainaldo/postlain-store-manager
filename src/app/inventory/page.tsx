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
  MapPin, X, Warehouse, Eye, CheckSquare, Square, ScanLine,
  RefreshCw,
} from "lucide-react";
import QRScannerModal from "@/components/QRScannerModal";
import { parseMCFromNotes } from "@/lib/categoryMapping";

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

  const [search,          setSearch]        = useState("");
  const [filterCategory,  setFilterCat]     = useState("");
  const [editProduct,     setEditProduct]   = useState<Product | null>(null);
  const [showAdd,         setShowAdd]       = useState(false);
  const [showImport,      setShowImport]    = useState(false);
  const [deleteId,        setDeleteId]      = useState<string | null>(null);
  const [hoveredId,       setHoveredId]     = useState<string | null>(null);
  const [selected,        setSelected]      = useState<Set<string>>(new Set());
  const [confirmBulk,     setConfirmBulk]   = useState(false);
  const [showScanner,     setShowScanner]   = useState(false);
  const [odooSyncing,     setOdooSyncing]   = useState(false);
  const [odooMsg,         setOdooMsg]       = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() =>
    products.filter(p => {
      if (filterCategory && p.category !== filterCategory) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q)
        || (p.sku ?? "").toLowerCase().includes(q)
        || p.category.toLowerCase().includes(q)
        || (p.color ?? "").includes(q)
        || (p.size ?? "").toLowerCase().includes(q)
        || (p.notes ?? "").toLowerCase().includes(q)
      );
    }),
    [products, search, filterCategory]
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

  const handleOdooSync = async () => {
    setOdooSyncing(true);
    setOdooMsg(null);
    try {
      const res = await fetch("/api/odoo/sync", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setOdooMsg(`Đồng bộ thành công ${data.synced} sản phẩm`);
        await fetchProducts();
      } else {
        setOdooMsg(`Lỗi: ${data.error}`);
      }
    } catch {
      setOdooMsg("Không kết nối được Odoo");
    } finally {
      setOdooSyncing(false);
      setTimeout(() => setOdooMsg(null), 5000);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    setConfirmBulk(false);
    setSelected(new Set());

    // Optimistically remove from store immediately
    useStore.getState().setProducts(
      useStore.getState().products.filter(p => !ids.includes(p.id))
    );

    const res = await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      // Rollback by re-fetching if server failed
      await fetchProducts();
    }
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
        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={e => setFilterCat(e.target.value)}
          className="h-9 rounded-xl border px-3 font-[inherit] cursor-pointer"
          style={{ background: filterCategory ? "#f0f9ff" : "#ffffff", borderColor: filterCategory ? "#0ea5e9" : "#bae6fd", fontSize: 10, color: filterCategory ? "#0ea5e9" : "#64748b", minWidth: 120 }}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl border font-[inherit] cursor-pointer transition-colors"
          style={{ background: "#ffffff", borderColor: "#bae6fd", fontSize: 10, color: "#0ea5e9", letterSpacing: "0.1em" }}
        >
          <ScanLine size={11} strokeWidth={1.5} /> QUÉT MÃ
        </button>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl border font-[inherit] cursor-pointer transition-colors hover:border-blue"
          style={{ background: "#ffffff", borderColor: "#bae6fd", fontSize: 10, color: "#334e68", letterSpacing: "0.1em" }}
        >
          <Upload size={11} strokeWidth={1.5} /> NHẬP EXCEL
        </button>
        <button
          onClick={handleOdooSync}
          disabled={odooSyncing}
          title="Đồng bộ sản phẩm từ Odoo"
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl border font-[inherit] cursor-pointer transition-colors disabled:opacity-60"
          style={{ background: "#f0fdf4", borderColor: "#86efac", fontSize: 10, color: "#16a34a", letterSpacing: "0.1em" }}
        >
          <RefreshCw size={11} strokeWidth={1.5} className={odooSyncing ? "animate-spin" : ""} />
          {odooSyncing ? "ĐỒNG BỘ..." : "SYNC ODOO"}
        </button>
        {odooMsg && (
          <span
            className="px-3 h-9 flex items-center rounded-xl text-xs font-medium"
            style={{
              background: odooMsg.startsWith("Lỗi") || odooMsg.startsWith("Không") ? "rgba(220,38,38,0.08)" : "rgba(22,163,74,0.08)",
              color: odooMsg.startsWith("Lỗi") || odooMsg.startsWith("Không") ? "#dc2626" : "#16a34a",
              border: `1px solid ${odooMsg.startsWith("Lỗi") || odooMsg.startsWith("Không") ? "rgba(220,38,38,0.2)" : "rgba(22,163,74,0.2)"}`,
              fontSize: 10,
            }}
          >
            {odooMsg}
          </span>
        )}
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
        className="hidden md:block rounded-2xl border"
        style={{ background: "#ffffff", borderColor: "#bae6fd", overflowX: "auto" }}
      >
        {/* Header */}
        <div
          className="grid px-4 items-center border-b"
          style={{ gridTemplateColumns: "28px 2fr 55px 115px 72px 88px 88px 50px 44px 104px", height: 36, borderColor: "#e0f2fe", background: "#f0f9ff" }}
        >
          <button onClick={toggleAll} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
            {allSelected
              ? <CheckSquare size={13} style={{ color: "#0ea5e9" }} />
              : <Square size={13} style={{ color: "#bae6fd" }} />
            }
          </button>
          {["Tên SP", "Màu", "Barcode", "MC", "Full Price", "Giá Sale", "Size", "SL", ""].map(h => (
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
          const mc = parseMCFromNotes(p.notes);
          return (
            <div
              key={p.id}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="grid px-4 items-center border-b last:border-0"
              style={{
                gridTemplateColumns: "28px 2fr 55px 115px 72px 88px 88px 50px 44px 104px",
                minHeight: 44,
                borderColor: "#e0f2fe",
                background: isSel ? "rgba(220,38,38,0.04)" : isHov ? "rgba(14,165,233,0.04)" : "transparent",
                transition: "background 0.12s",
              }}
            >
              {/* Checkbox */}
              <button onClick={() => toggleSelect(p.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                {isSel
                  ? <CheckSquare size={13} style={{ color: "#dc2626" }} />
                  : <Square size={13} style={{ color: isHov ? "#bae6fd" : "transparent" }} />
                }
              </button>

              {/* Tên SP */}
              <div className="overflow-hidden pr-2">
                <p className="font-semibold truncate" style={{ fontSize: 11, color: "#0c1a2e" }}>{p.name}</p>
                {loc && (
                  <p className="flex items-center gap-0.5" style={{ fontSize: 8, color: "#0ea5e9", marginTop: 1 }}>
                    <MapPin size={7} /> {loc}
                  </p>
                )}
              </div>

              {/* Màu — 3-digit color code */}
              <span className="font-mono font-semibold" style={{ fontSize: 10, color: p.color ? "#0c1a2e" : "#cbd5e1" }}>
                {p.color ?? "—"}
              </span>

              {/* Barcode (SKU) */}
              <span className="font-mono truncate" style={{ fontSize: 9, color: "#64748b" }}>{p.sku ?? "—"}</span>

              {/* MC */}
              <span className="font-mono" style={{ fontSize: 9, color: mc ? "#0ea5e9" : "#cbd5e1" }}>
                {mc ?? "—"}
              </span>

              {/* Full Price */}
              <span style={{ fontSize: 9, color: "#334e68" }}>{fmtPrice(p.price)}</span>

              {/* Giá Sale */}
              <span style={{ fontSize: 9, color: p.markdownPrice ? "#dc2626" : "#cbd5e1" }}>
                {p.markdownPrice ? fmtPrice(p.markdownPrice) : "—"}
              </span>

              {/* Size */}
              <span style={{ fontSize: 10, color: p.size ? "#0c1a2e" : "#cbd5e1" }}>{p.size ?? "—"}</span>

              {/* QTY */}
              <span className="font-semibold" style={{ fontSize: 12, color: p.quantity === 0 ? "#dc2626" : p.quantity < 5 ? "#C9A55A" : "#0c1a2e" }}>
                {p.quantity}
              </span>

              {/* Actions — fixed width, no layout shift */}
              <div className="flex items-center gap-1 justify-end" style={{ width: 104 }}>
                <button
                  onClick={() => navigateToBoard(router, p.id, "display")}
                  title={inDisplay ? "Xem vị trí Trưng Bày" : "Chưa xếp vào kệ trưng bày"}
                  className="flex items-center justify-center h-6 rounded-lg border cursor-pointer transition-all"
                  style={{
                    width: 28,
                    background:  inDisplay ? "rgba(201,165,90,0.10)" : isHov ? "#f0f9ff" : "transparent",
                    borderColor: inDisplay ? "rgba(201,165,90,0.45)" : isHov ? "#bae6fd" : "transparent",
                  }}
                >
                  <Eye size={9} style={{ color: inDisplay ? "#C9A55A" : isHov ? "#94a3b8" : "transparent" }} />
                </button>
                <button
                  onClick={() => navigateToBoard(router, p.id, "warehouse")}
                  title={inWarehouse ? "Xem vị trí Kho" : "Chưa xếp vào kho"}
                  className="flex items-center justify-center h-6 rounded-lg border cursor-pointer transition-all"
                  style={{
                    width: 28,
                    background:  inWarehouse ? "rgba(14,165,233,0.10)" : isHov ? "#f0f9ff" : "transparent",
                    borderColor: inWarehouse ? "rgba(14,165,233,0.45)" : isHov ? "#bae6fd" : "transparent",
                  }}
                >
                  <Warehouse size={9} style={{ color: inWarehouse ? "#0ea5e9" : isHov ? "#94a3b8" : "transparent" }} />
                </button>
                <button
                  onClick={() => setEditProduct(p)}
                  className="flex items-center justify-center w-6 h-6 rounded-lg border cursor-pointer transition-all"
                  style={{ background: isHov ? "#f0f9ff" : "transparent", borderColor: isHov ? "#bae6fd" : "transparent" }}
                >
                  <Pencil size={9} style={{ color: isHov ? "#0ea5e9" : "transparent" }} />
                </button>
                <button
                  onClick={() => setDeleteId(p.id)}
                  className="flex items-center justify-center w-6 h-6 rounded-lg border cursor-pointer transition-all"
                  style={{ background: isHov ? "#f0f9ff" : "transparent", borderColor: isHov ? "#fecaca" : "transparent" }}
                >
                  <Trash2 size={9} style={{ color: isHov ? "#dc2626" : "transparent" }} />
                </button>
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
          const mc = parseMCFromNotes(p.notes);
          return (
            <div
              key={p.id}
              className="rounded-xl border px-3 py-2.5 flex items-start gap-2"
              style={{ background: "#ffffff", borderColor: "#bae6fd" }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ fontSize: 12, color: "#0c1a2e" }}>{p.name}</p>
                {/* Tags row: Màu · MC · Size · Category */}
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                  {p.color && <span style={{ fontSize: 9, color: "#0ea5e9", fontWeight: 600 }}>{p.color}</span>}
                  {mc && <span style={{ fontSize: 9, color: "#0ea5e9", fontWeight: 600 }}>{mc}</span>}
                  {p.size && <span style={{ fontSize: 9, color: "#334e68" }}>Size {p.size}</span>}
                  <span style={{ fontSize: 9, color: "#94a3b8" }}>{p.category}</span>
                </div>
                {/* Barcode + price row */}
                <div className="flex gap-2 mt-0.5 flex-wrap">
                  {p.sku && <span className="font-mono" style={{ fontSize: 8, color: "#94a3b8" }}>{p.sku}</span>}
                  {p.price && <span style={{ fontSize: 9, color: "#334e68", fontWeight: 600 }}>{fmtPrice(p.price)}</span>}
                </div>
                {loc && (
                  <p className="flex items-center gap-1 mt-1" style={{ fontSize: 8, color: "#0ea5e9" }}>
                    <MapPin size={7} /> {loc}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="font-bold" style={{ fontSize: 16, color: p.quantity === 0 ? "#dc2626" : p.quantity < 5 ? "#C9A55A" : "#0c1a2e" }}>
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
      <QRScannerModal open={showScanner} onClose={() => setShowScanner(false)} />
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
