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

type ProductLoc = { type: "warehouse" | "display"; label: string };

function useProductLocations(productId: string): ProductLoc[] {
  const { warehouseShelves, storeSections } = useStore();
  const locs: ProductLoc[] = [];
  for (const shelf of warehouseShelves) {
    for (let ti = 0; ti < shelf.tiers.length; ti++) {
      const tier = shelf.tiers[ti];
      for (let si = 0; si < tier.length; si++) {
        if (tier[si] === productId) {
          const col = (si % 5) + 1;
          const row = Math.floor(si / 5) + 1;
          locs.push({ type: "warehouse", label: `${shelf.name} · T${ti + 1} · C${col}R${row}` });
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
            locs.push({ type: "display", label: `${sub.name} · #${ri + 1}-${si + 1}` });
          }
        }
      }
    }
  }
  return locs;
}

function ProductTooltip({ product, rect }: { product: Product; rect: DOMRect }) {
  const colorInfo = getProductColorInfo(product.sku);
  const typeConfig = product.productType ? PRODUCT_TYPES[product.productType] : null;
  const displayColor = colorInfo?.hex ?? product.color;
  const locs = useProductLocations(product.id);
  const tooltipW = 260;
  const top = Math.max(8, Math.min(rect.top, window.innerHeight - 300));
  const spaceRight = window.innerWidth - rect.right - 12;
  const left = spaceRight >= tooltipW ? rect.right + 12 : rect.left - tooltipW - 8;

  return (
    <div style={{ position: "fixed", zIndex: 9999, pointerEvents: "none", top, left, minWidth: 220, maxWidth: tooltipW }}>
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: 12, overflow: "hidden",
        boxShadow: "var(--shadow-lg)",
      }}>
        <div style={{ height: 5, background: displayColor ?? "#C9A96E" }} />
        <div style={{ padding: "12px 14px" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.35 }}>{product.name}</p>
          {product.sku && <p style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 3, fontFamily: "monospace", letterSpacing: "0.05em" }}>{product.sku}</p>}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
            <Row label="Danh mục" value={product.category} />
            {typeConfig && <Row label="Loại" value={typeConfig.label} />}
            <Row label="Số lượng" value={String(product.quantity)} bold />
            {colorInfo && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 8, color: "var(--text-muted)" }}>Màu</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: colorInfo.hex, border: "1px solid rgba(0,0,0,0.08)", flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontSize: 8, color: "var(--text-secondary)" }}>{colorInfo.name}</span>
                </span>
              </div>
            )}
            {product.size && <Row label="Size" value={product.size} />}
            {(product.price || product.markdownPrice) && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: 8, color: "var(--text-muted)" }}>Giá</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {product.price && <span style={{ fontSize: 8, color: "var(--text-muted)", textDecoration: "line-through" }}>{fmt(product.price)}</span>}
                  {product.markdownPrice && <span style={{ fontSize: 9, color: "#B8914A", fontWeight: 600 }}>{fmt(product.markdownPrice)}</span>}
                </span>
              </div>
            )}
            {locs.length > 0 && (
              <div style={{ marginTop: 4, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <p style={{ fontSize: 7, color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 5 }}>VỊ TRÍ</p>
                {locs.map((loc, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 6, fontWeight: 800, letterSpacing: "0.12em", flexShrink: 0,
                      padding: "1px 4px", borderRadius: 3,
                      background: loc.type === "warehouse" ? "rgba(90,120,152,0.12)" : "rgba(184,145,74,0.12)",
                      color: loc.type === "warehouse" ? "#5A7898" : "#B8914A",
                      border: `1px solid ${loc.type === "warehouse" ? "rgba(90,120,152,0.25)" : "rgba(184,145,74,0.25)"}`,
                    }}>
                      {loc.type === "warehouse" ? "KHO" : "TRƯNG BÀY"}
                    </span>
                    <span style={{ fontSize: 8, color: "var(--text-secondary)", fontFamily: "monospace", lineHeight: 1.5 }}>{loc.label}</span>
                  </div>
                ))}
              </div>
            )}
            {product.notes && (
              <p style={{ fontSize: 8, color: "var(--text-muted)", fontStyle: "italic", marginTop: 4, paddingTop: 6, borderTop: "1px solid var(--border)", lineHeight: 1.5 }}>{product.notes}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 8, color: "var(--text-primary)", fontWeight: bold ? 600 : 400 }}>{value}</span>
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-surface)" }}>

      {/* ── Stats strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", flexShrink: 0 }}>
        {[
          { label: "Sản phẩm", value: products.length, color: "#B8914A" },
          { label: "Tổng SL",  value: totalQty, color: "#5A7898" },
          { label: "Giá trị",  value: totalVal > 0 ? new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(totalVal) + "đ" : "—", color: "#6A8868" },
        ].map(({ label, value, color }, i) => (
          <div key={label} style={{
            padding: "10px 12px",
            borderRight: i < 2 ? "1px solid var(--border)" : "none",
            display: "flex", flexDirection: "column", gap: 3,
          }}>
            <p style={{ fontSize: 7, letterSpacing: "0.2em", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 300, lineHeight: 1, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Search + action buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 15, lineHeight: 1, pointerEvents: "none" }}>⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm tên, SKU..."
              style={{
                width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 9, paddingBottom: 9,
                fontSize: 11, color: "var(--text-primary)", background: "var(--bg-input)",
                border: "1px solid var(--border)", borderRadius: 7, outline: "none",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(184,145,74,0.6)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          </div>
          {/* Import button */}
          <button
            onClick={() => setShowExcel(true)}
            style={{
              padding: "9px 12px", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em",
              color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--border)",
              borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap",
              transition: "all 0.12s",
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.background = "var(--bg-elevated)"; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.background = "var(--bg-elevated)"; }}
          >⊞ IMPORT</button>
          {/* Add button */}
          <button
            onClick={() => { setEditProduct(null); setShowForm(true); }}
            style={{
              padding: "9px 14px", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
              color: "#FFFFFF",
              background: "linear-gradient(135deg,#B8914A,#D4B06E)",
              border: "none", borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap",
              boxShadow: "0 2px 10px rgba(184,145,74,0.32)",
              transition: "all 0.12s",
            }}
            onMouseEnter={e => { (e.currentTarget).style.boxShadow = "0 4px 16px rgba(184,145,74,0.45)"; }}
            onMouseLeave={e => { (e.currentTarget).style.boxShadow = "0 2px 10px rgba(184,145,74,0.32)"; }}
          >+ THÊM</button>
        </div>

        {/* Category chips */}
        <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
          {cats.map(cat => {
            const isActive = filterCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                style={{
                  padding: "5px 10px", fontSize: 8, fontWeight: 600, letterSpacing: "0.08em",
                  whiteSpace: "nowrap", flexShrink: 0,
                  borderRadius: 6,
                  border: isActive ? "1px solid rgba(184,145,74,0.4)" : "1px solid var(--border)",
                  background: isActive ? "rgba(184,145,74,0.12)" : "var(--bg-elevated)",
                  color: isActive ? "var(--gold)" : "var(--text-muted)",
                  cursor: "pointer", transition: "all 0.1s",
                }}
              >{cat}</button>
            );
          })}
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      <AnimatePresence>
        {someChecked && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden", flexShrink: 0 }}>
            <div style={{
              padding: "8px 14px", borderBottom: "1px solid rgba(220,38,38,0.15)",
              background: "rgba(220,38,38,0.04)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 600 }}>{checked.size} đã chọn</span>
                <button onClick={() => setChecked(new Set())}
                  style={{ fontSize: 9, color: "#F87171", background: "none", border: "none", cursor: "pointer" }}>Bỏ chọn</button>
              </div>
              {confirmBulkDelete ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 9, color: "#DC2626" }}>Xóa {checked.size} SP?</span>
                  <button onClick={handleBulkDelete}
                    style={{ padding: "4px 10px", fontSize: 9, color: "white", background: "#EF4444", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: 600 }}>XÁC NHẬN</button>
                  <button onClick={() => setConfirmBulkDelete(false)}
                    style={{ padding: "4px 10px", fontSize: 9, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer" }}>HỦY</button>
                </div>
              ) : (
                <button onClick={() => setConfirmBulkDelete(true)}
                  style={{
                    padding: "5px 12px", fontSize: 9, color: "#EF4444",
                    border: "1px solid rgba(220,38,38,0.3)", borderRadius: 5,
                    background: "transparent", cursor: "pointer", fontWeight: 500,
                  }}>
                  XÓA {checked.size} MÓN
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Select-all ── */}
      {filtered.length > 0 && (
        <div style={{
          padding: "7px 14px", borderBottom: "1px solid rgba(220,216,208,0.5)",
          background: "var(--bg-surface)", flexShrink: 0,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div
            onClick={toggleAll}
            style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: "pointer",
              border: allFilteredChecked ? "1px solid var(--gold)" : "1px solid var(--border-strong)",
              background: allFilteredChecked ? "var(--gold)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {allFilteredChecked && <span style={{ color: "white", fontSize: 9, lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 500, cursor: "pointer" }} onClick={toggleAll}>
            {allFilteredChecked ? "Bỏ chọn tất cả" : `Chọn tất cả (${filtered.length})`}
          </span>
        </div>
      )}

      {/* ── Product list ── */}
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-surface)" }}>
        {filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 12 }}>
            <span style={{ fontSize: 36, opacity: 0.12, color: "var(--text-muted)" }}>◫</span>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {products.length === 0 ? "Kho trống — thêm sản phẩm đầu tiên" : "Không tìm thấy kết quả"}
            </p>
            {products.length === 0 && (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  marginTop: 4, padding: "9px 18px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                  color: "#FFFFFF", background: "linear-gradient(135deg,#B8914A,#D4B06E)",
                  border: "none", borderRadius: 7, cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(184,145,74,0.28)",
                }}
              >+ THÊM SẢN PHẨM</button>
            )}
          </div>
        ) : (
          <div>
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
                    transition={{ delay: Math.min(i * 0.005, 0.2), duration: 0.16 }}
                    onMouseEnter={e => {
                      if (window.innerWidth >= 768) {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setHoveredProduct({ product: p, rect });
                      }
                    }}
                    onMouseLeave={() => setHoveredProduct(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(220,216,208,0.35)",
                      background: isChecked ? "rgba(220,38,38,0.03)" : isSelected ? "rgba(184,145,74,0.04)" : undefined,
                      borderLeft: `2.5px solid ${isChecked ? "#EF4444" : isSelected ? "#B8914A" : "transparent"}`,
                      position: "relative", cursor: "default",
                      minHeight: 52,
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      onClick={() => toggleCheck(p.id)}
                      style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: "pointer",
                        border: isChecked ? "1px solid #EF4444" : "1px solid var(--border-strong)",
                        background: isChecked ? "#EF4444" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.1s",
                      }}
                    >
                      {isChecked && <span style={{ color: "white", fontSize: 9, lineHeight: 1 }}>✓</span>}
                    </div>

                    {/* Thumbnail */}
                    <div
                      onClick={() => !isChecked && selectProduct(isSelected ? null : p)}
                      style={{
                        width: 36, height: 46, borderRadius: 6, flexShrink: 0,
                        border: "1px solid var(--border)",
                        background: displayColor ? `${displayColor}18` : "var(--bg-elevated)",
                        overflow: "hidden", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
                      }}
                    >
                      {p.imagePath ? (
                        <img src={p.imagePath} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <>
                          {displayColor && (
                            <div style={{ width: 12, height: 12, borderRadius: "50%", background: displayColor, border: "1px solid rgba(255,255,255,0.5)", marginBottom: 2 }} />
                          )}
                          <span style={{ fontSize: 10, fontWeight: 700, color: displayColor ?? "#B8914A", lineHeight: 1 }}>
                            {p.name.charAt(0)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Info */}
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                      onClick={() => !isChecked && selectProduct(isSelected ? null : p)}
                    >
                      <p style={{
                        fontSize: 12, fontWeight: 500, lineHeight: 1.3,
                        color: isSelected ? "var(--gold)" : "var(--text-primary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        transition: "color 0.1s",
                      }}>{p.name}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{p.category}</span>
                        <span style={{ fontSize: 8, color: "rgba(154,144,128,0.4)" }}>·</span>
                        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>×{p.quantity}</span>
                        {colorInfo && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: colorInfo.hex, border: "1px solid rgba(0,0,0,0.08)", display: "inline-block", flexShrink: 0 }} />
                            <span style={{ fontSize: 8, color: "rgba(154,144,128,0.6)" }}>{colorInfo.name}</span>
                          </span>
                        )}
                      </div>
                      {(p.price || p.markdownPrice) && (
                        <p style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                          {p.price && <span style={{ fontSize: 9, color: "rgba(154,144,128,0.6)", textDecoration: "line-through" }}>{fmt(p.price)}</span>}
                          {p.markdownPrice && <span style={{ fontSize: 9, color: "#B8914A", fontWeight: 600 }}>{fmt(p.markdownPrice)}</span>}
                        </p>
                      )}
                    </div>

                    {/* Hover actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100" style={{ display: "flex", gap: 4, flexShrink: 0 }}
                      onMouseEnter={e => {
                        const btns = (e.currentTarget as HTMLElement).querySelectorAll("button");
                        btns.forEach(b => (b as HTMLElement).style.opacity = "1");
                      }}
                    >
                      <button
                        onClick={e => { e.stopPropagation(); setEditProduct(p); setShowForm(true); }}
                        style={{
                          padding: "5px 8px", fontSize: 8, fontWeight: 600, color: "var(--text-secondary)",
                          border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg-elevated)", cursor: "pointer",
                          transition: "all 0.1s",
                        }}
                        onMouseEnter={e => { (e.currentTarget).style.background = "var(--bg-card)"; }}
                        onMouseLeave={e => { (e.currentTarget).style.background = "var(--bg-elevated)"; }}
                      >SỬA</button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteProduct(p.id); }}
                        style={{
                          padding: "5px 8px", fontSize: 8, fontWeight: 600, color: "#EF4444",
                          border: "1px solid rgba(220,38,38,0.2)", borderRadius: 5, background: "rgba(220,38,38,0.04)", cursor: "pointer",
                          transition: "all 0.1s",
                        }}
                        onMouseEnter={e => { (e.currentTarget).style.background = "#EF4444"; (e.currentTarget).style.color = "white"; }}
                        onMouseLeave={e => { (e.currentTarget).style.background = "rgba(220,38,38,0.04)"; (e.currentTarget).style.color = "#EF4444"; }}
                      >XÓA</button>
                    </div>

                    {isSelected && !isChecked && (
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#B8914A", flexShrink: 0, animation: "pulseGold 2s ease-in-out infinite" }} />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Selection hint ── */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            style={{
              padding: "10px 14px", borderTop: "1px solid rgba(184,145,74,0.18)",
              background: "rgba(184,145,74,0.05)", flexShrink: 0,
            }}
          >
            <p style={{ fontSize: 10, color: "#B8914A", lineHeight: 1.4 }}>
              <span style={{ fontWeight: 600 }}>{selectedProduct.name}</span>
              <span style={{ opacity: 0.6, marginLeft: 4 }}>— chuyển sang kệ để đặt</span>
            </p>
            <button
              onClick={() => selectProduct(null)}
              style={{ fontSize: 9, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4 }}
            >Bỏ chọn (ESC)</button>
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
