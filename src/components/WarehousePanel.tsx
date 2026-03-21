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

// Find all warehouse locations for a product id
function useProductLocations(productId: string) {
  const { warehouseShelves, storeSections } = useStore();
  const locs: string[] = [];

  // Warehouse
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

  // Store sections
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
    <div className="mt-1.5 pt-1.5 border-t border-border/50 flex flex-col gap-0.5">
      <span className="text-[7px] text-text-muted tracking-widest uppercase">Vị trí</span>
      {locs.map((loc, i) => (
        <span key={i} className="text-[8px] text-text-secondary font-mono leading-snug">{loc}</span>
      ))}
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

  useEffect(() => { fetchProducts(); }, []);

  // Clear checked items that no longer exist
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
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
    <div className="flex flex-col h-full bg-bg-base">
      {/* Stats */}
      <div className="grid grid-cols-3 border-b border-border bg-bg-surface">
        {[
          { label: "Sản phẩm", value: products.length },
          { label: "Tổng SL", value: totalQty },
          { label: "Giá trị", value: totalVal > 0 ? new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(totalVal) + "đ" : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="px-4 py-3.5 border-r border-border last:border-0">
            <p className="text-[9px] tracking-[0.2em] text-text-muted uppercase">{label}</p>
            <p className="text-text-primary text-lg font-light mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="px-3 py-2.5 border-b border-border bg-bg-surface flex flex-col gap-2 flex-shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs">⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm tên, SKU..."
              className="w-full pl-7 pr-3 py-1.5 bg-bg-card border border-border text-text-primary text-xs rounded-sm focus:outline-none focus:border-gold/60 placeholder:text-text-muted transition-colors"
            />
          </div>
          <button
            onClick={() => setShowExcel(true)}
            className="px-3 py-1.5 text-[10px] tracking-wider text-text-muted border border-border hover:border-gold/50 hover:text-gold rounded-sm transition-all"
            title="Import Excel"
          >⊞ IMPORT</button>
          <button
            onClick={() => { setEditProduct(null); setShowForm(true); }}
            className="px-3 py-1.5 text-[10px] tracking-wider font-medium text-white bg-gold hover:bg-gold-light rounded-sm transition-all"
          >+ THÊM</button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {cats.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-2.5 py-1 text-[9px] tracking-wider rounded-sm whitespace-nowrap flex-shrink-0 transition-all ${
                filterCat === cat
                  ? "bg-gold text-white font-medium"
                  : "bg-bg-card border border-border text-text-muted hover:border-border-strong hover:text-text-secondary"
              }`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {someChecked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex-shrink-0"
          >
            <div className="px-3 py-2 bg-red-50 border-b border-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-red-600 font-medium">{checked.size} đã chọn</span>
                <button onClick={() => setChecked(new Set())}
                  className="text-[9px] text-red-400 hover:text-red-600 transition-colors">
                  Bỏ chọn
                </button>
              </div>
              {confirmBulkDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-red-600">Xóa {checked.size} sản phẩm?</span>
                  <button onClick={handleBulkDelete}
                    className="px-2.5 py-1 text-[9px] text-white bg-red-500 hover:bg-red-600 rounded-sm transition-all">
                    XÁC NHẬN
                  </button>
                  <button onClick={() => setConfirmBulkDelete(false)}
                    className="px-2.5 py-1 text-[9px] text-text-muted border border-border rounded-sm transition-all">
                    HỦY
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmBulkDelete(true)}
                  className="px-3 py-1 text-[10px] text-red-500 border border-red-300 hover:bg-red-500 hover:text-white rounded-sm transition-all">
                  XÓA {checked.size} MÓN
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List header with select-all */}
      {filtered.length > 0 && (
        <div className="px-3 py-1.5 border-b border-border/50 bg-bg-surface flex items-center gap-3 flex-shrink-0">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div onClick={toggleAll}
              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${
                allFilteredChecked ? "bg-gold border-gold" : "border-border hover:border-gold/60"
              }`}>
              {allFilteredChecked && <span className="text-white text-[8px] leading-none">✓</span>}
            </div>
            <span className="text-[9px] text-text-muted group-hover:text-text-secondary transition-colors">
              {allFilteredChecked ? "Bỏ chọn tất cả" : `Chọn tất cả (${filtered.length})`}
            </span>
          </label>
        </div>
      )}

      {/* Product List */}
      <div className="flex-1 overflow-y-auto bg-bg-surface">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted gap-3">
            <span className="text-3xl opacity-20">◫</span>
            <p className="text-xs">{products.length === 0 ? "Kho trống. Thêm sản phẩm!" : "Không tìm thấy."}</p>
            {products.length === 0 && (
              <button onClick={() => setShowForm(true)}
                className="px-4 py-1.5 text-[10px] tracking-wider border border-border text-text-muted hover:text-gold hover:border-gold/50 rounded-sm transition-all">
                THÊM SẢN PHẨM
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            <AnimatePresence>
              {filtered.map((p, i) => {
                const isSelected = selectedProduct?.id === p.id;
                const isChecked = checked.has(p.id);
                const colorInfo = getProductColorInfo(p.sku);
                const typeConfig = p.productType ? PRODUCT_TYPES[p.productType] : null;
                const displayColor = colorInfo?.hex ?? p.color;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ delay: Math.min(i * 0.008, 0.3), duration: 0.2 }}
                    className={`relative flex items-center gap-2.5 px-3 py-3 md:py-2.5 transition-all duration-150 group border-l-2 ${
                      isChecked
                        ? "bg-red-50/60 border-l-red-300"
                        : isSelected
                        ? "bg-gold/5 border-l-gold"
                        : "border-l-transparent hover:bg-bg-card"
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      onClick={() => toggleCheck(p.id)}
                      className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${
                        isChecked ? "bg-red-400 border-red-400" : "border-border hover:border-red-300"
                      }`}
                    >
                      {isChecked && <span className="text-white text-[8px] leading-none">✓</span>}
                    </div>

                    {/* Thumbnail */}
                    <div
                      onClick={() => !isChecked && selectProduct(isSelected ? null : p)}
                      className="w-9 h-11 rounded-sm overflow-hidden bg-bg-elevated border border-border flex-shrink-0 cursor-pointer relative"
                    >
                      {p.imagePath ? (
                        <img src={p.imagePath} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5"
                          style={{ background: displayColor ? `${displayColor}20` : "#F5F2EE" }}>
                          {displayColor && (
                            <div className="w-4 h-4 rounded-full border border-white/40 shadow-sm flex-shrink-0"
                              style={{ background: displayColor }} />
                          )}
                          <span className="text-[8px] font-medium" style={{ color: displayColor ?? "#B8914A" }}>
                            {p.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !isChecked && selectProduct(isSelected ? null : p)}>
                      <p className={`text-sm md:text-xs font-light truncate transition-colors ${isSelected ? "text-gold" : "text-text-primary"}`}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[11px] md:text-[9px] text-text-muted">{p.category}</span>
                        <span className="text-[9px] text-text-muted/50">·</span>
                        <span className="text-[11px] md:text-[9px] text-text-muted">SL: {p.quantity}</span>
                        {colorInfo && (
                          <span className="flex items-center gap-0.5">
                            <span className="w-2.5 h-2.5 rounded-full border border-border/40 flex-shrink-0"
                              style={{ background: colorInfo.hex }} />
                            <span className="text-[8px] text-text-muted/70">{colorInfo.name}</span>
                          </span>
                        )}
                      </div>
                      {(p.price || p.markdownPrice) ? (
                        <p className="text-[10px] flex items-center gap-1.5 flex-wrap mt-0.5">
                          {p.price ? <span className="text-text-muted line-through decoration-1">{fmt(p.price)}</span> : null}
                          {p.markdownPrice ? <span className="text-gold font-medium">{fmt(p.markdownPrice)}</span> : null}
                        </p>
                      ) : null}
                    </div>

                    {/* Hover tooltip card — desktop only (hidden on touch screens) */}
                    <div className="hidden md:block absolute left-full top-0 ml-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0 min-w-[200px]">
                      <div className="bg-white border border-border rounded-lg shadow-xl overflow-hidden">
                        {/* Color header */}
                        <div className="h-2 w-full" style={{ background: displayColor ?? "#C9A96E" }} />
                        <div className="px-3 py-2.5">
                          <p className="text-[10px] font-medium text-text-primary leading-snug">{p.name}</p>
                          {p.sku && <p className="text-[8px] text-text-muted mt-0.5 font-mono">{p.sku}</p>}
                          <div className="mt-2 pt-2 border-t border-border/50 flex flex-col gap-1">
                            <div className="flex justify-between">
                              <span className="text-[8px] text-text-muted">Danh mục</span>
                              <span className="text-[8px] text-text-secondary">{p.category}</span>
                            </div>
                            {typeConfig && (
                              <div className="flex justify-between">
                                <span className="text-[8px] text-text-muted">Loại</span>
                                <span className="text-[8px] text-text-secondary">{typeConfig.label}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-[8px] text-text-muted">Số lượng</span>
                              <span className="text-[8px] font-medium text-text-primary">{p.quantity}</span>
                            </div>
                            {colorInfo && (
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] text-text-muted">Màu</span>
                                <span className="flex items-center gap-1">
                                  <span className="w-3 h-3 rounded-full border border-border/50" style={{ background: colorInfo.hex }} />
                                  <span className="text-[8px] text-text-secondary">{colorInfo.name} ({colorInfo.code})</span>
                                </span>
                              </div>
                            )}
                            {p.size && (
                              <div className="flex justify-between">
                                <span className="text-[8px] text-text-muted">Size</span>
                                <span className="text-[8px] text-text-secondary">{p.size}</span>
                              </div>
                            )}
                            {(p.price || p.markdownPrice) && (
                              <div className="flex justify-between items-center mt-0.5 pt-1.5 border-t border-border/50">
                                <span className="text-[8px] text-text-muted">Giá</span>
                                <span className="flex items-center gap-1.5">
                                  {p.price && <span className="text-[8px] text-text-muted line-through">{fmt(p.price)}</span>}
                                  {p.markdownPrice && <span className="text-[9px] text-gold font-medium">{fmt(p.markdownPrice)}</span>}
                                </span>
                              </div>
                            )}
                            {p.notes && (
                              <p className="text-[8px] text-text-muted italic mt-1 pt-1 border-t border-border/50 leading-snug">{p.notes}</p>
                            )}
                            <ProductLocationTag productId={p.id} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); setEditProduct(p); setShowForm(true); }}
                        className="px-2 py-1 text-[9px] text-text-muted border border-border hover:border-gold/40 hover:text-gold rounded-sm transition-all">
                        SỬA
                      </button>
                      <button onClick={e => { e.stopPropagation(); deleteProduct(p.id); }}
                        className="px-2 py-1 text-[9px] text-text-muted border border-border hover:border-red-400/40 hover:text-red-500 rounded-sm transition-all">
                        XÓA
                      </button>
                    </div>

                    {isSelected && !isChecked && (
                      <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse flex-shrink-0" />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Selection hint */}
      {selectedProduct && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 border-t border-gold/20 bg-gold/5 flex-shrink-0"
        >
          <p className="text-[10px] text-gold">
            <span className="font-medium">{selectedProduct.name}</span> — chuyển sang SÀN TRƯNG BÀY để đặt vào kệ
          </p>
          <button onClick={() => selectProduct(null)} className="text-[9px] text-text-muted hover:text-text-secondary mt-1 transition-colors">
            Bỏ chọn (ESC)
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {showForm && <ProductFormModal product={editProduct} onClose={() => { setShowForm(false); setEditProduct(null); }} />}
        {showExcel && <ExcelImportModal onClose={() => setShowExcel(false)} />}
      </AnimatePresence>
    </div>
  );
}
