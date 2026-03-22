"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Product } from "@/types";
import ProductFormModal from "./ProductFormModal";
import ExcelImportModal from "./ExcelImportModal";
import { getProductColorInfo } from "@/lib/nrfColors";
import { PRODUCT_TYPES } from "@/lib/productTypes";

function fmt(p?: number) {
  if (!p) return "";
  return new Intl.NumberFormat("vi-VN").format(p) + "đ";
}

function useProductLocations(productId: string) {
  const { warehouseShelves, storeSections } = useStore();
  const locs: string[] = [];
  for (const shelf of warehouseShelves) {
    for (let ti = 0; ti < shelf.tiers.length; ti++) {
      const tier = shelf.tiers[ti];
      for (let si = 0; si < tier.length; si++) {
        if (tier[si] === productId) {
          const col = (si % 5) + 1;
          const row = Math.floor(si / 5) + 1;
          locs.push(`Kho: ${shelf.name} · T${ti + 1} · C${col}R${row}`);
        }
      }
    }
  }
  for (const sec of storeSections) {
    for (const sub of sec.subsections) {
      for (let ri = 0; ri < sub.rows.length; ri++) {
        const row = sub.rows[ri];
        for (let si = 0; si < row.products.length; si++) {
          if (row.products[si] === productId) {
            locs.push(`Sàn: ${sub.name} · Ngăn ${ri + 1} · Ô ${si + 1}`);
          }
        }
      }
    }
  }
  return locs;
}

function ProductLocationTag({ productId }: { productId: string }) {
  const locs = useProductLocations(productId);
  if (locs.length === 0) return null;
  return (
    <div className="mt-1.5 pt-1.5 border-t border-border/40 flex flex-col gap-0.5">
      <span className="text-[7px] text-text-muted tracking-widest uppercase font-medium">Vị trí</span>
      {locs.map((loc, i) => (
        <span key={i} className="text-[8px] text-text-secondary font-mono leading-snug">{loc}</span>
      ))}
    </div>
  );
}

function ProductTooltip({ product, rect }: { product: Product; rect: DOMRect }) {
  const colorInfo = getProductColorInfo(product.sku);
  const typeConfig = product.productType ? PRODUCT_TYPES[product.productType] : null;
  const displayColor = colorInfo?.hex ?? product.color;
  const top = Math.max(8, Math.min(rect.top, window.innerHeight - 260));
  const left = rect.right + 10;

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ top, left, minWidth: 210, maxWidth: 250 }}
    >
      <div
        className="overflow-hidden"
        style={{
          background: "#FFFFFF",
          border: "1px solid #DDD8D0",
          borderRadius: 10,
          boxShadow: "0 8px 32px rgba(26,20,16,0.14), 0 2px 8px rgba(26,20,16,0.08)",
        }}
      >
        {/* Color header strip */}
        <div className="h-2 w-full" style={{ background: displayColor ?? "#C9A96E" }} />
        <div className="px-3.5 py-3">
          <p className="text-[10px] font-semibold text-text-primary leading-snug">{product.name}</p>
          {product.sku && <p className="text-[8px] text-text-muted mt-0.5 font-mono tracking-wider">{product.sku}</p>}
          <div className="mt-2.5 pt-2 border-t border-border/50 flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-[8px] text-text-muted">Danh mục</span>
              <span className="text-[8px] text-text-secondary font-medium">{product.category}</span>
            </div>
            {typeConfig && (
              <div className="flex justify-between">
                <span className="text-[8px] text-text-muted">Loại</span>
                <span className="text-[8px] text-text-secondary">{typeConfig.label}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[8px] text-text-muted">Số lượng</span>
              <span className="text-[8px] font-semibold text-text-primary">{product.quantity}</span>
            </div>
            {colorInfo && (
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-text-muted">Màu</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border border-border/50 flex-shrink-0"
                    style={{ background: colorInfo.hex }} />
                  <span className="text-[8px] text-text-secondary">{colorInfo.name}</span>
                </span>
              </div>
            )}
            {product.size && (
              <div className="flex justify-between">
                <span className="text-[8px] text-text-muted">Size</span>
                <span className="text-[8px] text-text-secondary">{product.size}</span>
              </div>
            )}
            {(product.price || product.markdownPrice) && (
              <div className="flex justify-between items-center pt-1 mt-0.5 border-t border-border/40">
                <span className="text-[8px] text-text-muted">Giá</span>
                <span className="flex items-center gap-1.5">
                  {product.price && <span className="text-[8px] text-text-muted line-through">{fmt(product.price)}</span>}
                  {product.markdownPrice && <span className="text-[9px] text-gold font-semibold">{fmt(product.markdownPrice)}</span>}
                </span>
              </div>
            )}
            {product.notes && (
              <p className="text-[8px] text-text-muted italic mt-0.5 pt-1.5 border-t border-border/40 leading-snug">{product.notes}</p>
            )}
            <ProductLocationTag productId={product.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WarehousePanel() {
  const { products, deleteProduct, fetchProducts, selectedProduct, selectProduct } = useStore();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Tất cả");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showExcel, setShowExcel] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState<{ product: Product; rect: DOMRect } | null>(null);

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => {
    setChecked(prev => {
      const ids = new Set(products.map(p => p.id));
      const next = new Set([...prev].filter(id => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [products]);

  const cats = ["Tất cả", ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q))
      && (filterCat === "Tất cả" || p.category === filterCat);
  });

  const totalQty = products.reduce((s, p) => s + p.quantity, 0);
  const totalVal = products.reduce((s, p) => s + (p.price || 0) * p.quantity, 0);
  const allFilteredChecked = filtered.length > 0 && filtered.every(p => checked.has(p.id));
  const someChecked = checked.size > 0;

  const toggleCheck = (id: string) => {
    setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (allFilteredChecked) {
      setChecked(prev => { const n = new Set(prev); filtered.forEach(p => n.delete(p.id)); return n; });
    } else {
      setChecked(prev => { const n = new Set(prev); filtered.forEach(p => n.add(p.id)); return n; });
    }
  };
  const handleBulkDelete = async () => {
    await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(checked) }),
    });
    await fetchProducts();
    setChecked(new Set());
    setConfirmBulkDelete(false);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#F9F7F4" }}>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 border-b border-border bg-bg-surface flex-shrink-0">
        {[
          { label: "Sản phẩm", value: products.length, color: "#B8914A" },
          { label: "Tổng SL",  value: totalQty, color: "#5A7898" },
          { label: "Giá trị",  value: totalVal > 0 ? new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(totalVal) + "đ" : "—", color: "#6A8868" },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-3.5 py-3 border-r border-border last:border-0 flex flex-col gap-0.5">
            <p className="text-[8px] tracking-[0.22em] text-text-muted uppercase font-medium">{label}</p>
            <p className="text-lg font-light leading-none mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2.5 border-b border-border bg-bg-surface flex-shrink-0 flex flex-col gap-2">
        {/* Search + action buttons */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm leading-none select-none">⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm tên, SKU..."
              className="w-full pl-8 pr-3 py-2 text-[11px] text-text-primary placeholder:text-text-muted transition-colors focus:outline-none"
              style={{
                background: "#F0EDE8",
                border: "1px solid #DDD8D0",
                borderRadius: 6,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(184,145,74,0.55)")}
              onBlur={e => (e.currentTarget.style.borderColor = "#DDD8D0")}
            />
          </div>
          <button
            onClick={() => setShowExcel(true)}
            className="px-3 py-2 text-[9px] tracking-wider font-medium text-text-muted transition-all active:scale-95"
            style={{ border: "1px solid #DDD8D0", borderRadius: 6, background: "#F9F7F4" }}
            title="Import Excel"
          >
            ⊞ IMPORT
          </button>
          <button
            onClick={() => { setEditProduct(null); setShowForm(true); }}
            className="px-3 py-2 text-[9px] tracking-wider font-semibold text-white transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #B8914A 0%, #D4B06E 100%)",
              borderRadius: 6,
              boxShadow: "0 2px 8px rgba(184,145,74,0.30)",
            }}
          >
            + THÊM
          </button>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5"
          style={{ scrollbarWidth: "none" }}>
          {cats.map(cat => {
            const isActive = filterCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className="px-2.5 py-1 text-[8px] font-semibold tracking-wider whitespace-nowrap flex-shrink-0 transition-all active:scale-95"
                style={{
                  borderRadius: 5,
                  border: isActive ? "1px solid rgba(184,145,74,0.4)" : "1px solid #DDD8D0",
                  background: isActive ? "rgba(184,145,74,0.12)" : "#F0EDE8",
                  color: isActive ? "#B8914A" : "#9A9080",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bulk action bar ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {someChecked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex-shrink-0"
          >
            <div
              className="px-3.5 py-2 border-b flex items-center justify-between"
              style={{ background: "rgba(220,38,38,0.04)", borderBottomColor: "rgba(220,38,38,0.15)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-red-600 font-semibold">{checked.size} đã chọn</span>
                <button onClick={() => setChecked(new Set())}
                  className="text-[9px] text-red-400 hover:text-red-600 transition-colors">Bỏ chọn</button>
              </div>
              {confirmBulkDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-red-600">Xóa {checked.size} sản phẩm?</span>
                  <button onClick={handleBulkDelete}
                    className="px-2.5 py-1 text-[9px] text-white bg-red-500 rounded-sm transition-all active:scale-95">XÁC NHẬN</button>
                  <button onClick={() => setConfirmBulkDelete(false)}
                    className="px-2.5 py-1 text-[9px] text-text-muted border border-border rounded-sm transition-all">HỦY</button>
                </div>
              ) : (
                <button onClick={() => setConfirmBulkDelete(true)}
                  className="px-3 py-1 text-[9px] text-red-500 border border-red-300/60 rounded-sm hover:bg-red-500 hover:text-white transition-all active:scale-95">
                  XÓA {checked.size} MÓN
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Select-all header ────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="px-3.5 py-2 border-b border-border/50 bg-bg-surface flex items-center gap-2.5 flex-shrink-0">
          <div
            onClick={toggleAll}
            className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all"
            style={{
              borderRadius: 3,
              border: allFilteredChecked ? "1px solid #B8914A" : "1px solid #C8C0B8",
              background: allFilteredChecked ? "#B8914A" : "transparent",
            }}
          >
            {allFilteredChecked && <span className="text-white text-[8px] leading-none">✓</span>}
          </div>
          <span className="text-[8px] text-text-muted font-medium cursor-pointer" onClick={toggleAll}>
            {allFilteredChecked ? "Bỏ chọn tất cả" : `Chọn tất cả (${filtered.length})`}
          </span>
        </div>
      )}

      {/* ── Product list ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-bg-surface">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <span className="text-3xl opacity-15 text-text-muted">◫</span>
            <p className="text-[11px] text-text-muted">
              {products.length === 0 ? "Kho trống — thêm sản phẩm đầu tiên" : "Không tìm thấy kết quả"}
            </p>
            {products.length === 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-1 px-4 py-2 text-[9px] tracking-wider font-semibold text-white transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #B8914A 0%, #D4B06E 100%)",
                  borderRadius: 6,
                  boxShadow: "0 2px 8px rgba(184,145,74,0.25)",
                }}
              >
                + THÊM SẢN PHẨM
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            <AnimatePresence>
              {filtered.map((p, i) => {
                const isSelected = selectedProduct?.id === p.id;
                const isChecked = checked.has(p.id);
                const colorInfo = getProductColorInfo(p.sku);
                const displayColor = colorInfo?.hex ?? p.color;

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: Math.min(i * 0.006, 0.25), duration: 0.18 }}
                    onMouseEnter={e => {
                      if (window.innerWidth >= 768) {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setHoveredProduct({ product: p, rect });
                      }
                    }}
                    onMouseLeave={() => setHoveredProduct(null)}
                    className="relative flex items-center gap-2.5 px-3 py-2.5 md:py-2 group transition-colors duration-100"
                    style={{
                      background: isChecked
                        ? "rgba(220,38,38,0.04)"
                        : isSelected
                        ? "rgba(184,145,74,0.05)"
                        : undefined,
                      borderLeft: `2.5px solid ${
                        isChecked ? "#EF4444" : isSelected ? "#B8914A" : "transparent"
                      }`,
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      onClick={() => toggleCheck(p.id)}
                      className="flex-shrink-0 cursor-pointer transition-all active:scale-90"
                      style={{
                        width: 14, height: 14, borderRadius: 3,
                        border: isChecked ? "1px solid #EF4444" : "1px solid #C8C0B8",
                        background: isChecked ? "#EF4444" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {isChecked && <span className="text-white text-[7px] leading-none">✓</span>}
                    </div>

                    {/* Thumbnail */}
                    <div
                      onClick={() => !isChecked && selectProduct(isSelected ? null : p)}
                      className="flex-shrink-0 cursor-pointer overflow-hidden"
                      style={{
                        width: 34, height: 42, borderRadius: 5,
                        border: "1px solid #EAE6E0",
                        background: displayColor ? `${displayColor}18` : "#F0EDE8",
                      }}
                    >
                      {p.imagePath ? (
                        <img src={p.imagePath} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5">
                          {displayColor && (
                            <div className="w-3.5 h-3.5 rounded-full border border-white/50 flex-shrink-0"
                              style={{ background: displayColor }} />
                          )}
                          <span className="text-[9px] font-semibold" style={{ color: displayColor ?? "#B8914A" }}>
                            {p.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => !isChecked && selectProduct(isSelected ? null : p)}
                    >
                      <p className="text-[12px] md:text-[11px] font-medium truncate leading-tight transition-colors"
                        style={{ color: isSelected ? "#B8914A" : "#1A1410" }}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] md:text-[8px] text-text-muted">{p.category}</span>
                        <span className="text-[8px] text-text-muted/40">·</span>
                        <span className="text-[10px] md:text-[8px] text-text-muted">×{p.quantity}</span>
                        {colorInfo && (
                          <span className="flex items-center gap-0.5">
                            <span className="w-2.5 h-2.5 rounded-full border border-border/40 flex-shrink-0"
                              style={{ background: colorInfo.hex }} />
                            <span className="text-[8px] text-text-muted/60">{colorInfo.name}</span>
                          </span>
                        )}
                      </div>
                      {(p.price || p.markdownPrice) && (
                        <p className="text-[9px] flex items-center gap-1.5 mt-0.5">
                          {p.price && <span className="text-text-muted/60 line-through">{fmt(p.price)}</span>}
                          {p.markdownPrice && <span className="text-gold font-semibold">{fmt(p.markdownPrice)}</span>}
                        </p>
                      )}
                    </div>

                    {/* Hover actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setEditProduct(p); setShowForm(true); }}
                        className="px-2 py-1 text-[8px] font-medium text-text-muted transition-all active:scale-95"
                        style={{ border: "1px solid #DDD8D0", borderRadius: 4, background: "#F9F7F4" }}
                      >SỬA</button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteProduct(p.id); }}
                        className="px-2 py-1 text-[8px] font-medium text-red-400 transition-all active:scale-95"
                        style={{ border: "1px solid rgba(220,38,38,0.2)", borderRadius: 4, background: "rgba(220,38,38,0.04)" }}
                      >XÓA</button>
                    </div>

                    {isSelected && !isChecked && (
                      <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0"
                        style={{ animation: "pulseGold 2s ease-in-out infinite" }} />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Selection hint bar ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="px-4 py-3 border-t flex-shrink-0"
            style={{
              background: "rgba(184,145,74,0.05)",
              borderTopColor: "rgba(184,145,74,0.18)",
            }}
          >
            <p className="text-[10px] text-gold leading-snug">
              <span className="font-semibold">{selectedProduct.name}</span>
              <span className="opacity-60 ml-1">— chuyển sang SÀN TRƯNG BÀY để đặt vào kệ</span>
            </p>
            <button
              onClick={() => selectProduct(null)}
              className="text-[9px] text-text-muted hover:text-text-secondary mt-1 transition-colors"
            >
              Bỏ chọn (ESC)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && <ProductFormModal product={editProduct} onClose={() => { setShowForm(false); setEditProduct(null); }} />}
        {showExcel && <ExcelImportModal onClose={() => setShowExcel(false)} />}
      </AnimatePresence>

      {hoveredProduct && <ProductTooltip product={hoveredProduct.product} rect={hoveredProduct.rect} />}
    </div>
  );
}
