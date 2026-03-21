"use client";

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { WarehouseShelf } from "@/types";
import Product3DViewer from "./Product3DViewer";

const TIER_COLS = 5;
const TIER_ROWS = 5;

const BOX_COLORS: Record<string, string> = {
  "Giày nữ": "#C49A6C", "Giày nam": "#5A7888", "Bốt nữ": "#C4A080", "Bốt nam": "#6A8094",
  "Sandal nữ": "#D4A090", "Sandal nam": "#8890C4", "Giày trẻ em": "#8DC4A0",
  "Túi nữ": "#9B7060", "Túi nam": "#607080", "Phụ kiện": "#7A8B6B",
  "Trang sức": "#B8A045", "Chăm sóc giày": "#9A9080",
};

// ─── Warehouse slot ───────────────────────────────────────────────────────────
function WarehouseSlot({ productId, shelfId, tierIndex, slotIndex }: {
  productId: string | null; shelfId: string; tierIndex: number; slotIndex: number;
}) {
  const { products, selectedProduct, placeInWarehouse } = useStore();
  const product = productId ? products.find(p => p.id === productId) : null;
  const isPlacementMode = !!selectedProduct;
  const canPlace = isPlacementMode && !product;
  const canRemove = !isPlacementMode && !!product;

  const handleClick = () => {
    if (canPlace && selectedProduct) placeInWarehouse(shelfId, tierIndex, slotIndex, selectedProduct.id);
    else if (canRemove) placeInWarehouse(shelfId, tierIndex, slotIndex, null);
  };

  const boxColor = product ? (BOX_COLORS[product.category] || "#9A8878") : null;

  return (
    <div
      onClick={handleClick}
      title={product ? `${product.name} (${product.category}) ×${product.quantity} — click gỡ` : isPlacementMode ? "Click để xếp" : ""}
      className={`relative flex-shrink-0 rounded-sm border transition-all select-none overflow-hidden ${
        (canPlace || canRemove) ? "cursor-pointer" : "cursor-default"
      } ${
        product
          ? "border-transparent shadow-sm"
          : isPlacementMode
          ? "border-blue-300/60 bg-blue-50 hover:border-blue-400 hover:bg-blue-100/70 animate-pulse"
          : "border-border bg-bg-elevated hover:border-border-strong"
      }`}
      style={{
        width: "clamp(44px, 10vw, 52px)",
        height: "clamp(40px, 9vw, 48px)",
        background: product ? `${boxColor}22` : undefined,
        borderColor: product ? `${boxColor}60` : undefined,
      }}
    >
      {product && (
        <>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: boxColor || "#B8914A" }} />
          <div className="absolute bottom-0 left-0 right-0 h-5 flex items-center justify-center px-0.5">
            <span className="text-[6px] font-mono truncate" style={{ color: `${boxColor}CC` || "#9A8878" }}>
              {product.sku || product.name.slice(0, 5).toUpperCase()}
            </span>
          </div>
          <div className="w-full h-full flex items-center justify-center pb-2">
            <span className="text-[10px] font-medium" style={{ color: boxColor || "#B8914A" }}>
              {product.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="absolute inset-0 bg-red-50/0 hover:bg-red-50/80 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
            <span className="text-red-500 text-lg leading-none">×</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tier grid (5×5) ──────────────────────────────────────────────────────────
function TierGrid({ tier, tierIndex, shelfId }: {
  tier: (string | null)[]; tierIndex: number; shelfId: string;
}) {
  const { clearWarehouseTier } = useStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const filled = tier.filter(Boolean).length;
  const labels = ["Tầng thấp nhất", "Tầng giữa thấp", "Tầng giữa cao", "Tầng cao nhất"];

  return (
    <div className="border border-border rounded-sm overflow-hidden bg-bg-surface">
      <div className="px-3 py-2 bg-bg-card border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] tracking-[0.15em] text-[#5A7898] font-medium">TẦNG {tierIndex + 1}</span>
          <span className="text-[8px] text-text-muted">{labels[tierIndex]}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[8px] ${filled > 0 ? "text-[#5A7898]" : "text-text-muted"}`}>
            {filled}/{TIER_COLS * TIER_ROWS}
          </span>
          {filled > 0 && !confirmClear && (
            <button onClick={() => setConfirmClear(true)}
              className="text-[8px] text-text-muted hover:text-red-500 transition-colors">Xóa</button>
          )}
          {confirmClear && (
            <div className="flex items-center gap-1">
              <button onClick={() => { clearWarehouseTier(shelfId, tierIndex); setConfirmClear(false); }}
                className="text-[8px] text-red-500 font-medium">OK</button>
              <button onClick={() => setConfirmClear(false)} className="text-[8px] text-text-muted">HỦY</button>
            </div>
          )}
        </div>
      </div>

      <div className="p-2 bg-bg-elevated overflow-x-auto">
        <div style={{ minWidth: "max-content" }}>
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: TIER_ROWS }, (_, visualRow) => {
              const row = TIER_ROWS - 1 - visualRow;
              return (
                <div key={row} className="flex items-center gap-0.5">
                  <div className="text-[7px] text-text-muted text-right flex-shrink-0" style={{ width: 14 }}>
                    {TIER_ROWS - visualRow}
                  </div>
                  {Array.from({ length: TIER_COLS }, (_, col) => {
                    const slotIndex = row * TIER_COLS + col;
                    return <WarehouseSlot key={slotIndex} productId={tier[slotIndex] ?? null}
                      shelfId={shelfId} tierIndex={tierIndex} slotIndex={slotIndex} />;
                  })}
                </div>
              );
            })}
          </div>
          <div className="flex gap-0.5 mt-1 ml-[18px]">
            {Array.from({ length: TIER_COLS }, (_, col) => (
              <div key={col} className="text-center text-[7px] text-text-muted flex-shrink-0"
                style={{ width: "clamp(44px, 10vw, 52px)" }}>{col + 1}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shelf detail panel ───────────────────────────────────────────────────────
function ShelfPanel({ shelf }: { shelf: WarehouseShelf }) {
  const { clearWarehouseShelf, renameWarehouseShelf, setWarehouseShelfNotes } = useStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(shelf.name);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState(shelf.notes ?? "");
  const nameRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setNameVal(shelf.name); }, [shelf.name]);
  useEffect(() => { setNotesVal(shelf.notes ?? ""); }, [shelf.notes]);
  useEffect(() => { if (editingName) nameRef.current?.focus(); }, [editingName]);
  useEffect(() => { if (editingNotes) notesRef.current?.focus(); }, [editingNotes]);

  const commitName = () => {
    const t = nameVal.trim();
    if (t && t !== shelf.name) renameWarehouseShelf(shelf.id, t);
    else setNameVal(shelf.name);
    setEditingName(false);
  };
  const commitNotes = () => { setWarehouseShelfNotes(shelf.id, notesVal.trim()); setEditingNotes(false); };

  const totalFilled = shelf.tiers.reduce((s, t) => s + t.filter(Boolean).length, 0);
  const totalSlots = shelf.tiers.length * TIER_COLS * TIER_ROWS;
  const fillPct = totalSlots > 0 ? (totalFilled / totalSlots) * 100 : 0;
  const accentColor = shelf.shelfType === "shoes" ? "#5A7898" : "#9A7050";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-base">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-start justify-between flex-shrink-0 bg-bg-surface"
        style={{ borderLeftWidth: 3, borderLeftColor: accentColor, paddingLeft: 14 }}>
        <div className="flex-1 min-w-0 mr-3">
          <p className="text-[8px] tracking-[0.25em] uppercase font-medium" style={{ color: accentColor }}>
            {shelf.shelfType === "shoes" ? "KỆ GIÀY" : "KỆ TÚI"}
          </p>
          {editingName ? (
            <input ref={nameRef} value={nameVal} onChange={e => setNameVal(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameVal(shelf.name); setEditingName(false); } }}
              className="text-text-primary text-lg font-light mt-0.5 bg-transparent border-b border-gold/50 focus:outline-none focus:border-gold w-full" />
          ) : (
            <h3 onClick={() => setEditingName(true)} title="Click để đổi tên"
              className="text-text-primary text-lg font-light mt-0.5 cursor-text hover:text-gold transition-colors group flex items-center gap-1.5">
              {shelf.name}
              <span className="text-[8px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
            </h3>
          )}
          <div className="mt-1">
            {editingNotes ? (
              <textarea ref={notesRef} value={notesVal} rows={2}
                onChange={e => setNotesVal(e.target.value)} onBlur={commitNotes}
                onKeyDown={e => { if (e.key === "Escape") { setNotesVal(shelf.notes ?? ""); setEditingNotes(false); } }}
                placeholder="Ghi chú..."
                className="text-[9px] text-text-secondary bg-bg-card border border-border rounded-sm px-2 py-1 w-full focus:outline-none focus:border-gold/40 resize-none placeholder:text-text-muted" />
            ) : (
              <p onClick={() => setEditingNotes(true)} title="Click để ghi chú"
                className="text-[9px] text-text-muted hover:text-text-secondary cursor-text transition-colors min-h-[16px]">
                {shelf.notes ? shelf.notes : <span className="italic opacity-60">+ ghi chú</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-[8px] text-text-muted tracking-widest">Đang lưu</p>
            <p className="text-sm font-light" style={{ color: accentColor }}>
              {totalFilled}<span className="text-text-muted text-xs">/{totalSlots}</span>
            </p>
          </div>
          {confirmClear ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-text-muted">Xóa toàn bộ?</span>
              <button onClick={() => { clearWarehouseShelf(shelf.id); setConfirmClear(false); }}
                className="px-2 py-1 text-[8px] text-red-500 border border-red-300 rounded-sm">OK</button>
              <button onClick={() => setConfirmClear(false)}
                className="px-2 py-1 text-[8px] text-text-muted border border-border rounded-sm">HỦY</button>
            </div>
          ) : (
            <button onClick={() => setConfirmClear(true)}
              className="text-[9px] text-text-muted hover:text-red-500 transition-colors px-2 py-1 border border-border hover:border-red-300 rounded-sm">
              Xóa kệ
            </button>
          )}
        </div>
      </div>

      {/* Fill bar */}
      <div className="px-5 pt-3 pb-2 flex-shrink-0 bg-bg-surface border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] text-text-muted tracking-widest">SỨC CHỨA</span>
          <span className="text-[7px]" style={{ color: accentColor }}>{fillPct.toFixed(0)}%</span>
        </div>
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${fillPct}%`, background: accentColor, opacity: 0.8 }} />
        </div>
      </div>

      {/* 4 tiers — highest tier at top, lowest at bottom */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {[...shelf.tiers].reverse().map((tier, reversedIdx) => {
          const ti = shelf.tiers.length - 1 - reversedIdx;
          return <TierGrid key={ti} tier={tier} tierIndex={ti} shelfId={shelf.id} />;
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WarehouseShelfEditor() {
  const { warehouseShelves, selectedProduct } = useStore();
  const [shelfIndex, setShelfIndex] = useState(0);

  const total = warehouseShelves.length;
  const idx = Math.max(0, Math.min(shelfIndex, total - 1));
  const shelf = warehouseShelves[idx] ?? null;

  const goLeft = () => setShelfIndex(i => Math.max(0, i - 1));
  const goRight = () => setShelfIndex(i => Math.min(total - 1, i + 1));

  // Group label for current shelf
  const shelfGroup = shelf ? (shelf.shelfType === "shoes" ? "Kệ Giày" : "Kệ Túi") : "";
  const groupColor = shelf?.shelfType === "shoes" ? "#5A7898" : "#9A7050";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-base">
      {/* Placement hint */}
      {selectedProduct && (
        <div className="px-4 py-2 border-b border-[#5A7898]/20 bg-[#5A7898]/5 flex-shrink-0 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5A7898] animate-pulse" />
          <p className="text-[9px] text-[#5A7898]">
            <span className="font-medium">{selectedProduct.name}</span> — click ô để xếp vào kho
          </p>
        </div>
      )}

      {/* Arrow navigation bar */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-bg-surface flex-shrink-0">
        <button
          onClick={goLeft}
          disabled={idx === 0}
          className={`flex items-center justify-center rounded-sm border transition-all active:scale-95
            ${idx === 0 ? "border-border/40 text-text-muted/30 cursor-not-allowed" : "border-border text-text-muted hover:text-text-primary hover:bg-bg-card"}
          `}
          style={{ width: "clamp(36px,9vw,44px)", height: "clamp(36px,9vw,44px)", fontSize: "clamp(14px,4vw,18px)" }}
        >
          ←
        </button>

        <div className="flex flex-col items-center gap-0.5 flex-1 mx-4">
          <span className="text-[8px] tracking-[0.2em] uppercase font-medium" style={{ color: groupColor }}>
            {shelfGroup}
          </span>
          <span className="text-text-primary font-light text-base leading-tight">{shelf?.name ?? "—"}</span>
          <div className="flex items-center gap-1 mt-0.5">
            {warehouseShelves.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setShelfIndex(i)}
                className={`rounded-full transition-all ${
                  i === idx
                    ? "w-4 h-1.5"
                    : "w-1.5 h-1.5 hover:opacity-70"
                }`}
                style={{
                  background: i === idx
                    ? (s.shelfType === "shoes" ? "#5A7898" : "#9A7050")
                    : "#C8C0B8",
                }}
              />
            ))}
          </div>
          <span className="text-[8px] text-text-muted mt-0.5">{idx + 1} / {total}</span>
        </div>

        <button
          onClick={goRight}
          disabled={idx === total - 1}
          className={`flex items-center justify-center rounded-sm border transition-all active:scale-95
            ${idx === total - 1 ? "border-border/40 text-text-muted/30 cursor-not-allowed" : "border-border text-text-muted hover:text-text-primary hover:bg-bg-card"}
          `}
          style={{ width: "clamp(36px,9vw,44px)", height: "clamp(36px,9vw,44px)", fontSize: "clamp(14px,4vw,18px)" }}
        >
          →
        </button>
      </div>

      {/* Shelf detail — full height */}
      <div className="flex-1 overflow-hidden flex min-w-0">
        <div className="flex-1 overflow-hidden">
          {shelf ? <ShelfPanel shelf={shelf} /> : (
            <div className="flex-1 flex items-center justify-center text-text-muted text-xs h-full">Kho trống</div>
          )}
        </div>
        {selectedProduct && <Product3DViewer product={selectedProduct} />}
      </div>
    </div>
  );
}
