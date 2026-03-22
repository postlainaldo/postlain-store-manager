"use client";

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { WarehouseShelf } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

const TIER_COLS = 5;
const TIER_ROWS = 5;

const BOX_COLORS: Record<string, string> = {
  "Giày nữ": "#C49A6C", "Giày nam": "#5A7888", "Bốt nữ": "#C4A080", "Bốt nam": "#6A8094",
  "Sandal nữ": "#D4A090", "Sandal nam": "#8890C4", "Giày trẻ em": "#8DC4A0",
  "Túi nữ": "#9B7060", "Túi nam": "#607080", "Phụ kiện": "#7A8B6B",
  "Trang sức": "#B8A045", "Chăm sóc giày": "#9A9080",
};

// ─── Warehouse slot (2D grid) ──────────────────────────────────────────────────
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
      title={product
        ? `${product.name} (${product.category}) ×${product.quantity} — click gỡ`
        : isPlacementMode ? "Click để xếp vào đây" : ""}
      className={`relative flex-shrink-0 overflow-hidden select-none transition-all duration-100 ${
        (canPlace || canRemove) ? "cursor-pointer active:scale-95" : "cursor-default"
      } ${canPlace ? "slot-placement-pulse" : ""}`}
      style={{
        width: 52, height: 46,
        borderRadius: 6,
        border: product
          ? `1px solid ${boxColor}55`
          : isPlacementMode
          ? "1px solid rgba(99,179,237,0.55)"
          : "1px solid var(--border)",
        background: product
          ? `${boxColor}18`
          : isPlacementMode
          ? "rgba(96,165,250,0.08)"
          : "var(--bg-elevated)",
        boxShadow: product ? `0 2px 6px ${boxColor}20` : "none",
      }}
    >
      {product ? (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: boxColor || "#B8914A", borderRadius: "6px 6px 0 0" }} />
          <div style={{
            position: "absolute", bottom: 1, left: 0, right: 0,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px",
          }}>
            <span style={{ fontSize: 6, fontFamily: "monospace", color: `${boxColor}AA`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", textAlign: "center" }}>
              {product.sku || product.name.slice(0, 5).toUpperCase()}
            </span>
          </div>
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 8, paddingTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: boxColor || "#B8914A" }}>
              {product.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div
            style={{
              position: "absolute", inset: 0, opacity: 0, background: "rgba(220,38,38,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "opacity 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
          >
            <span style={{ color: "#EF4444", fontSize: 18, fontWeight: 700, lineHeight: 1 }}>×</span>
          </div>
        </>
      ) : isPlacementMode ? (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 16, color: "rgba(99,179,237,0.5)", lineHeight: 1 }}>+</span>
        </div>
      ) : null}
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
  const accentBlue = "var(--accent-blue)";
  const TIER_LABELS = ["Tầng 1 · Thấp nhất", "Tầng 2 · Giữa thấp", "Tầng 3 · Giữa cao", "Tầng 4 · Cao nhất"];

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "visible", boxShadow: "var(--shadow-xs)" }}>
      {/* Header */}
      <div style={{
        padding: "8px 12px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-card)",
        borderRadius: "10px 10px 0 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: accentBlue }}>{tierIndex + 1}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: accentBlue }}>{TIER_LABELS[tierIndex]}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 48, height: 3, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${fillPct}%`, height: "100%", background: accentBlue, opacity: 0.75, borderRadius: 2, transition: "width 0.4s" }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: filled > 0 ? accentBlue : "var(--text-muted)" }}>{filled}/{total}</span>
          </div>
          {filled > 0 && !confirmClear && (
            <button onClick={() => setConfirmClear(true)}
              style={{ fontSize: 8, color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none", padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-red)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
            >Xóa</button>
          )}
          {confirmClear && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => { clearWarehouseTier(shelfId, tierIndex); setConfirmClear(false); }}
                style={{ fontSize: 8, color: "white", background: "var(--accent-red)", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontWeight: 600 }}>
                OK
              </button>
              <button onClick={() => setConfirmClear(false)}
                style={{ fontSize: 8, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>
                Hủy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Slot grid */}
      <div style={{ padding: 10, background: "var(--bg-base)", borderRadius: "0 0 10px 10px", overflowX: "auto" }}>
        <div style={{ minWidth: "max-content", display: "inline-block" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {Array.from({ length: TIER_ROWS }, (_, visualRow) => {
              const row = TIER_ROWS - 1 - visualRow;
              return (
                <div key={row} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 16, flexShrink: 0, textAlign: "right", fontSize: 7, color: "var(--text-muted)", fontFamily: "monospace" }}>
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
          {/* Column labels */}
          <div style={{ display: "flex", gap: 3, marginTop: 4, marginLeft: 19 }}>
            {Array.from({ length: TIER_COLS }, (_, col) => (
              <div key={col} style={{ width: 52, textAlign: "center", fontSize: 7, color: "var(--text-muted)", fontFamily: "monospace", flexShrink: 0 }}>
                {col + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shelf panel ───────────────────────────────────────────────────────────────
function ShelfPanel({ shelf, onRemove }: { shelf: WarehouseShelf; onRemove: () => void }) {
  const { clearWarehouseShelf, renameWarehouseShelf, setWarehouseShelfNotes } = useStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
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
  const accentColor = shelf.shelfType === "shoes" ? "var(--accent-blue)" : "var(--gold)";
  const accentHex   = shelf.shelfType === "shoes" ? "#5A7898" : "#C9A55A";
  const typeLabel = shelf.shelfType === "shoes" ? "KỆ GIÀY" : "KỆ TÚI";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--bg-base)" }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px 10px 13px",
        borderBottom: "1px solid var(--border)",
        borderLeft: `3px solid ${accentHex}`,
        background: "var(--bg-surface)",
        flexShrink: 0,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        boxShadow: "0 1px 0 var(--border)",
      }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          <p style={{ fontSize: 7, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 700, color: accentColor }}>{typeLabel}</p>
          {editingName ? (
            <input
              ref={nameRef} value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") { setNameVal(shelf.name); setEditingName(false); }
              }}
              style={{
                fontSize: 18, fontWeight: 300, color: "var(--text-primary)", background: "transparent",
                outline: "none", width: "100%", marginTop: 2,
                borderBottom: "1.5px solid var(--gold)",
              }}
            />
          ) : (
            <h3
              onClick={() => setEditingName(true)}
              title="Click để đổi tên"
              style={{
                fontSize: 18, fontWeight: 300, color: "var(--text-primary)", marginTop: 2,
                cursor: "text", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {shelf.name}
              <span style={{ fontSize: 8, color: "var(--text-muted)", opacity: 0 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>✎</span>
            </h3>
          )}
          <div style={{ marginTop: 4 }}>
            {editingNotes ? (
              <textarea
                ref={notesRef} value={notesVal} rows={2}
                onChange={e => setNotesVal(e.target.value)} onBlur={commitNotes}
                onKeyDown={e => { if (e.key === "Escape") { setNotesVal(shelf.notes ?? ""); setEditingNotes(false); } }}
                placeholder="Ghi chú..."
                style={{
                  fontSize: 9, color: "var(--text-secondary)", width: "100%", resize: "none", outline: "none",
                  background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 5,
                  padding: "4px 8px",
                }}
              />
            ) : (
              <p
                onClick={() => setEditingNotes(true)}
                style={{ fontSize: 9, color: "var(--text-muted)", cursor: "text", minHeight: 14 }}
              >
                {shelf.notes ? shelf.notes : <span style={{ fontStyle: "italic", opacity: 0.5 }}>+ ghi chú...</span>}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 7, color: "var(--text-muted)", letterSpacing: "0.2em", fontWeight: 600 }}>ĐANG LƯU</p>
            <p style={{ fontSize: 18, fontWeight: 300, color: accentColor, lineHeight: 1 }}>
              {totalFilled}
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>/{totalSlots}</span>
            </p>
          </div>

          {/* Clear shelf */}
          {confirmClear ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Xóa tất cả?</span>
              <button
                onClick={() => { clearWarehouseShelf(shelf.id); setConfirmClear(false); }}
                style={{ padding: "4px 10px", fontSize: 8, color: "white", background: "var(--accent-red)", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: 600 }}
              >OK</button>
              <button
                onClick={() => setConfirmClear(false)}
                style={{ padding: "4px 10px", fontSize: 8, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer" }}
              >HỦY</button>
            </div>
          ) : confirmRemove ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: "var(--accent-red)" }}>Xóa kệ này?</span>
              <button
                onClick={() => { onRemove(); }}
                style={{ padding: "4px 10px", fontSize: 8, color: "white", background: "var(--accent-red)", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: 600 }}
              >OK</button>
              <button
                onClick={() => setConfirmRemove(false)}
                style={{ padding: "4px 10px", fontSize: 8, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer" }}
              >HỦY</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button
                onClick={() => setConfirmClear(true)}
                style={{
                  fontSize: 9, color: "var(--text-muted)", padding: "4px 10px",
                  border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg-elevated)", cursor: "pointer",
                  transition: "all 0.1s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-red)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(220,38,38,0.3)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
              >
                Xóa kệ
              </button>
              <button
                onClick={() => setConfirmRemove(true)}
                style={{
                  fontSize: 9, color: "var(--accent-red)", padding: "4px 10px",
                  border: "1px solid rgba(220,38,38,0.3)", borderRadius: 5, background: "rgba(220,38,38,0.06)", cursor: "pointer",
                  transition: "all 0.1s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.06)"; }}
              >
                Bỏ kệ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fill progress */}
      <div style={{ height: 3, background: "var(--bg-elevated)", flexShrink: 0 }}>
        <div style={{ width: `${fillPct}%`, height: "100%", background: accentHex, transition: "width 0.6s ease" }} />
      </div>

      {/* 2D tier grid list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
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
  const { warehouseShelves, selectedProduct, removeWarehouseShelf, addWarehouseShelf } = useStore();
  const [shelfIndex, setShelfIndex] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const total = warehouseShelves.length;
  const idx = Math.max(0, Math.min(shelfIndex, total - 1));
  const shelf = warehouseShelves[idx] ?? null;

  const goLeft  = () => setShelfIndex(i => Math.max(0, i - 1));
  const goRight = () => setShelfIndex(i => Math.min(total - 1, i + 1));

  const handleRemoveShelf = () => {
    removeWarehouseShelf(shelf!.id);
    setShelfIndex(i => Math.max(0, i - 1));
  };

  const handleAddShelf = (type: "shoes" | "bags") => {
    addWarehouseShelf(type);
    setShelfIndex(total); // navigate to newly added shelf
    setShowAddMenu(false);
  };

  const shelfGroup = shelf ? (shelf.shelfType === "shoes" ? "Kệ Giày" : "Kệ Túi") : "";
  const groupColor = shelf?.shelfType === "shoes" ? "var(--accent-blue)" : "var(--gold)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--bg-base)" }}>

      {/* Placement hint */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", flexShrink: 0 }}
          >
            <div style={{
              padding: "8px 16px", borderBottom: "1px solid rgba(96,165,250,0.2)",
              background: "rgba(96,165,250,0.06)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div className="pulse-blue" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-blue)", flexShrink: 0 }} />
              <p style={{ fontSize: 10, color: "var(--accent-blue)" }}>
                <span style={{ fontWeight: 600 }}>{selectedProduct.name}</span>
                <span style={{ opacity: 0.6, marginLeft: 6 }}>— click ô để xếp vào kho</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)", flexShrink: 0,
        boxShadow: "0 1px 0 var(--border)",
      }}>
        {/* Prev button */}
        <button
          onClick={goLeft} disabled={idx === 0}
          style={{
            width: 38, height: 38, borderRadius: 8, border: "none",
            background: idx === 0 ? "var(--bg-elevated)" : "var(--text-primary)",
            color: idx === 0 ? "var(--text-muted)" : "var(--bg-base)",
            fontSize: 16, cursor: idx === 0 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "all 0.15s",
            boxShadow: idx === 0 ? "none" : "var(--shadow-sm)",
          }}
        >←</button>

        {/* Center info */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, marginLeft: 12, marginRight: 12 }}>
          <span style={{ fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, color: groupColor }}>{shelfGroup}</span>
          <span style={{ fontSize: 16, fontWeight: 400, color: "var(--text-primary)", lineHeight: 1 }}>{shelf?.name ?? "—"}</span>
          {/* Dot indicators */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, flexWrap: "wrap", justifyContent: "center", maxWidth: 160 }}>
            {warehouseShelves.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setShelfIndex(i)}
                style={{
                  width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
                  background: i === idx ? (s.shelfType === "shoes" ? "#5A7898" : "#C9A55A") : "var(--border-strong)",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 500 }}>{total > 0 ? `${idx + 1} / ${total}` : "Trống"}</span>
        </div>

        {/* Right controls: Add shelf */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, position: "relative" }}>
          <button
            onClick={() => setShowAddMenu(v => !v)}
            title="Thêm kệ mới"
            style={{
              width: 38, height: 38, borderRadius: 8,
              border: "1px solid var(--border)",
              background: showAddMenu ? "var(--bg-elevated)" : "var(--bg-elevated)",
              color: "var(--text-secondary)",
              fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
          >+</button>

          {/* Next button */}
          <button
            onClick={goRight} disabled={idx === total - 1}
            style={{
              width: 38, height: 38, borderRadius: 8, border: "none",
              background: idx === total - 1 ? "var(--bg-elevated)" : "var(--text-primary)",
              color: idx === total - 1 ? "var(--text-muted)" : "var(--bg-base)",
              fontSize: 16, cursor: idx === total - 1 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.15s",
              boxShadow: idx === total - 1 ? "none" : "var(--shadow-sm)",
            }}
          >→</button>

          {/* Add shelf dropdown */}
          <AnimatePresence>
            {showAddMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -4 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "absolute", top: 44, right: 0, zIndex: 50,
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: 10, boxShadow: "var(--shadow-md)",
                  overflow: "hidden", minWidth: 140,
                }}
              >
                <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 8, letterSpacing: "0.25em", color: "var(--text-muted)", fontWeight: 700 }}>THÊM KỆ MỚI</p>
                </div>
                {[
                  { type: "shoes" as const, label: "Kệ Giày", color: "var(--accent-blue)" },
                  { type: "bags"  as const, label: "Kệ Túi",  color: "var(--gold)" },
                ].map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => handleAddShelf(opt.type)}
                    style={{
                      width: "100%", padding: "10px 14px", border: "none", cursor: "pointer",
                      background: "transparent", display: "flex", alignItems: "center", gap: 8,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: opt.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 500 }}>{opt.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Shelf content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {shelf ? (
          <ShelfPanel shelf={shelf} onRemove={handleRemoveShelf} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Chưa có kệ kho</p>
            <button
              onClick={() => setShowAddMenu(true)}
              style={{
                padding: "8px 18px", fontSize: 10, fontWeight: 600,
                color: "var(--text-primary)", background: "var(--bg-elevated)",
                border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer",
              }}
            >+ Thêm kệ</button>
          </div>
        )}
      </div>
    </div>
  );
}
