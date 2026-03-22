"use client";

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { WarehouseShelf } from "@/types";
import Product3DViewer from "./Product3DViewer";
import { motion, AnimatePresence } from "framer-motion";

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
      className={`relative flex-shrink-0 overflow-hidden select-none transition-all duration-100 ${
        (canPlace || canRemove) ? "cursor-pointer active:scale-95" : "cursor-default"
      } ${canPlace ? "slot-placement-pulse" : ""}`}
      style={{
        width: "clamp(42px, 9.5vw, 50px)",
        height: "clamp(38px, 8.5vw, 46px)",
        borderRadius: 5,
        border: product
          ? `1px solid ${boxColor}50`
          : isPlacementMode
          ? "1px solid rgba(99,179,237,0.5)"
          : "1px solid #E8E4DE",
        background: product
          ? `${boxColor}1A`
          : isPlacementMode
          ? "rgba(235,248,255,0.7)"
          : "#F8F6F2",
        boxShadow: product ? `0 1px 3px ${boxColor}18` : "none",
      }}
    >
      {product && (
        <>
          <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: boxColor || "#B8914A" }} />
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center px-0.5 pb-0.5">
            <span className="text-[6px] font-mono truncate" style={{ color: `${boxColor}BB` }}>
              {product.sku || product.name.slice(0, 5).toUpperCase()}
            </span>
          </div>
          <div className="w-full h-full flex items-center justify-center pb-2 pt-1">
            <span className="text-[10px] font-bold" style={{ color: boxColor || "#B8914A" }}>
              {product.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
            style={{ background: "rgba(220,38,38,0.10)" }}
          >
            <span style={{ color: "#EF4444", fontSize: 18, fontWeight: 700, lineHeight: 1 }}>×</span>
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
  const total = TIER_COLS * TIER_ROWS;
  const fillPct = (filled / total) * 100;
  const TIER_LABELS = ["Tầng 1 · Thấp nhất", "Tầng 2 · Giữa thấp", "Tầng 3 · Giữa cao", "Tầng 4 · Cao nhất"];
  const accentBlue = "#5A7898";

  return (
    <div
      className="overflow-hidden"
      style={{
        border: "1px solid #DDD8D0",
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(26,20,16,0.05)",
      }}
    >
      {/* Tier header */}
      <div
        className="px-3 py-2 border-b border-border flex items-center justify-between"
        style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #F9F7F4 100%)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 flex items-center justify-center flex-shrink-0 rounded-sm"
            style={{ background: `${accentBlue}14`, border: `1px solid ${accentBlue}28` }}
          >
            <span className="text-[8px] font-bold" style={{ color: accentBlue }}>{tierIndex + 1}</span>
          </div>
          <span className="text-[9px] font-semibold" style={{ color: accentBlue }}>
            {TIER_LABELS[tierIndex]}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "#EAE6E0" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${fillPct}%`, background: accentBlue, opacity: 0.7 }} />
            </div>
            <span className="text-[8px] font-medium" style={{ color: filled > 0 ? accentBlue : "#C8C0B8" }}>
              {filled}/{total}
            </span>
          </div>
          {filled > 0 && !confirmClear && (
            <button onClick={() => setConfirmClear(true)}
              className="text-[8px] text-text-muted/50 hover:text-red-400 transition-colors">Xóa</button>
          )}
          {confirmClear && (
            <div className="flex items-center gap-1">
              <button onClick={() => { clearWarehouseTier(shelfId, tierIndex); setConfirmClear(false); }}
                className="text-[8px] text-white bg-red-500 px-1.5 py-0.5 rounded-sm font-medium">OK</button>
              <button onClick={() => setConfirmClear(false)}
                className="text-[8px] text-text-muted px-1.5 py-0.5 border border-border rounded-sm">HỦY</button>
            </div>
          )}
        </div>
      </div>

      {/* Slot grid */}
      <div className="p-2 overflow-x-auto" style={{ background: "#F8F6F2", boxShadow: "inset 0 2px 4px rgba(26,20,16,0.04)" }}>
        <div style={{ minWidth: "max-content" }}>
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: TIER_ROWS }, (_, visualRow) => {
              const row = TIER_ROWS - 1 - visualRow;
              return (
                <div key={row} className="flex items-center gap-0.5">
                  <div className="text-[7px] text-text-muted/60 text-right flex-shrink-0 font-mono" style={{ width: 14 }}>
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
          <div className="flex gap-0.5 mt-1" style={{ marginLeft: 18 }}>
            {Array.from({ length: TIER_COLS }, (_, col) => (
              <div key={col} className="text-center text-[7px] text-text-muted/50 font-mono flex-shrink-0"
                style={{ width: "clamp(42px, 9.5vw, 50px)" }}>{col + 1}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shelf panel ───────────────────────────────────────────────────────────────
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
  const typeLabel = shelf.shelfType === "shoes" ? "KỆ GIÀY" : "KỆ TÚI";

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#F8F6F2" }}>
      {/* Header */}
      <div
        className="px-5 py-3.5 border-b border-border flex items-start justify-between flex-shrink-0 bg-bg-surface"
        style={{ borderLeftWidth: 3, borderLeftColor: accentColor, paddingLeft: 14, boxShadow: "0 1px 0 #EAE6E0" }}
      >
        <div className="flex-1 min-w-0 mr-4">
          <p className="text-[7px] tracking-[0.3em] uppercase font-bold" style={{ color: accentColor }}>{typeLabel}</p>
          {editingName ? (
            <input
              ref={nameRef} value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameVal(shelf.name); setEditingName(false); } }}
              className="text-text-primary text-[18px] font-light mt-0.5 bg-transparent focus:outline-none w-full"
              style={{ borderBottom: "1.5px solid rgba(184,145,74,0.5)" }}
            />
          ) : (
            <h3
              onClick={() => setEditingName(true)}
              title="Click để đổi tên"
              className="text-text-primary text-[18px] font-light mt-0.5 cursor-text hover:text-gold transition-colors group flex items-center gap-1.5"
            >
              {shelf.name}
              <span className="text-[8px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
            </h3>
          )}
          <div className="mt-1">
            {editingNotes ? (
              <textarea
                ref={notesRef} value={notesVal} rows={2}
                onChange={e => setNotesVal(e.target.value)} onBlur={commitNotes}
                onKeyDown={e => { if (e.key === "Escape") { setNotesVal(shelf.notes ?? ""); setEditingNotes(false); } }}
                placeholder="Ghi chú..."
                className="text-[9px] text-text-secondary w-full focus:outline-none resize-none placeholder:text-text-muted"
                style={{
                  background: "#F0EDE8", border: "1px solid #DDD8D0",
                  borderRadius: 5, padding: "4px 8px",
                }}
              />
            ) : (
              <p
                onClick={() => setEditingNotes(true)}
                className="text-[9px] text-text-muted hover:text-text-secondary cursor-text transition-colors min-h-[14px]"
              >
                {shelf.notes ? shelf.notes : <span className="italic opacity-50">+ ghi chú...</span>}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-[7px] text-text-muted tracking-widest font-semibold">ĐANG LƯU</p>
            <p className="text-[17px] font-light" style={{ color: accentColor }}>
              {totalFilled}
              <span className="text-text-muted text-[11px]">/{totalSlots}</span>
            </p>
          </div>
          {confirmClear ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-text-muted">Xóa tất cả?</span>
              <button
                onClick={() => { clearWarehouseShelf(shelf.id); setConfirmClear(false); }}
                className="px-2.5 py-1 text-[8px] text-white bg-red-500 rounded-sm active:scale-95"
              >OK</button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-2.5 py-1 text-[8px] text-text-muted border border-border rounded-sm"
              >HỦY</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-[9px] text-text-muted/50 hover:text-red-400 transition-colors px-2 py-1"
              style={{ border: "1px solid #EAE6E0", borderRadius: 5, background: "#F9F7F4" }}
            >
              Xóa kệ
            </button>
          )}
        </div>
      </div>

      {/* Fill bar */}
      <div
        className="px-5 pt-3 pb-3 flex-shrink-0 border-b border-border bg-bg-surface"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[7px] text-text-muted tracking-widest font-semibold">SỨC CHỨA</span>
          <span className="text-[8px] font-semibold" style={{ color: accentColor }}>{fillPct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#EAE6E0" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${fillPct}%`, background: accentColor }}
          />
        </div>
      </div>

      {/* Tiers */}
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

  const goLeft  = () => setShelfIndex(i => Math.max(0, i - 1));
  const goRight = () => setShelfIndex(i => Math.min(total - 1, i + 1));

  const shelfGroup = shelf ? (shelf.shelfType === "shoes" ? "Kệ Giày" : "Kệ Túi") : "";
  const groupColor = shelf?.shelfType === "shoes" ? "#5A7898" : "#9A7050";

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#F5F2EE" }}>
      {/* Placement hint */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden flex-shrink-0"
          >
            <div
              className="px-4 py-2 border-b flex items-center gap-2"
              style={{ background: "rgba(90,120,152,0.05)", borderBottomColor: "rgba(90,120,152,0.18)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "#5A7898", animation: "pulseBlue 2s ease-in-out infinite" }} />
              <p className="text-[9px]" style={{ color: "#5A7898" }}>
                <span className="font-semibold">{selectedProduct.name}</span>
                <span className="opacity-60 ml-1">— click ô để xếp vào kho</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shelf navigation */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-surface flex-shrink-0"
        style={{ boxShadow: "0 1px 0 #EAE6E0" }}
      >
        <button
          onClick={goLeft}
          disabled={idx === 0}
          className="flex items-center justify-center rounded-md border transition-all active:scale-95"
          style={{
            width: "clamp(36px,9vw,42px)", height: "clamp(36px,9vw,42px)",
            fontSize: "clamp(14px,4vw,18px)",
            border: idx === 0 ? "1px solid #EAE6E0" : "1px solid #DDD8D0",
            background: idx === 0 ? "#F8F6F2" : "#F0EDE8",
            color: idx === 0 ? "#C8C0B8" : "#6A6050",
            cursor: idx === 0 ? "not-allowed" : "pointer",
          }}
        >←</button>

        <div className="flex flex-col items-center gap-1 flex-1 mx-4">
          <span
            className="text-[8px] tracking-[0.22em] uppercase font-bold"
            style={{ color: groupColor }}
          >{shelfGroup}</span>
          <span className="text-text-primary font-medium text-[15px] leading-tight">{shelf?.name ?? "—"}</span>

          {/* Dot indicators */}
          <div className="flex items-center gap-1 mt-0.5">
            {warehouseShelves.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setShelfIndex(i)}
                className="transition-all duration-200"
                style={{
                  width: i === idx ? 16 : 6, height: 6, borderRadius: 3,
                  background: i === idx
                    ? (s.shelfType === "shoes" ? "#5A7898" : "#9A7050")
                    : "#C8C0B8",
                }}
              />
            ))}
          </div>
          <span className="text-[8px] text-text-muted font-medium">{idx + 1} / {total}</span>
        </div>

        <button
          onClick={goRight}
          disabled={idx === total - 1}
          className="flex items-center justify-center rounded-md border transition-all active:scale-95"
          style={{
            width: "clamp(36px,9vw,42px)", height: "clamp(36px,9vw,42px)",
            fontSize: "clamp(14px,4vw,18px)",
            border: idx === total - 1 ? "1px solid #EAE6E0" : "1px solid #DDD8D0",
            background: idx === total - 1 ? "#F8F6F2" : "#F0EDE8",
            color: idx === total - 1 ? "#C8C0B8" : "#6A6050",
            cursor: idx === total - 1 ? "not-allowed" : "pointer",
          }}
        >→</button>
      </div>

      {/* Shelf content */}
      <div className="flex-1 overflow-hidden flex min-w-0">
        <div className="flex-1 overflow-hidden">
          {shelf ? <ShelfPanel shelf={shelf} /> : (
            <div className="flex-1 flex items-center justify-center h-full">
              <p className="text-[11px] text-text-muted">Kho trống</p>
            </div>
          )}
        </div>
        {selectedProduct && (
          <div
            className="flex-shrink-0 border-l border-border overflow-hidden"
            style={{ width: 160, background: "linear-gradient(180deg, #FFFFFF 0%, #F9F7F4 100%)" }}
          >
            <Product3DViewer product={selectedProduct} />
          </div>
        )}
      </div>
    </div>
  );
}
