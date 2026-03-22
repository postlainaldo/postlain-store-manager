"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { StoreSection, StoreSubsection, StoreShelfRow } from "@/types";

const SECTION_ACCENT: Record<string, string> = {
  wall_woman:   "#B8914A",
  wall_man:     "#5A7898",
  center_woman: "#A87848",
  center_man:   "#486888",
  acc:          "#6A8868",
  window:       "#8868A8",
};

const ROW_LABEL: Record<string, string> = {
  long:  "DÀI",
  short: "NGẮN",
  image: "TRANH",
};

const CAT_COLORS: Record<string, string> = {
  "Giày nữ": "#C49A6C", "Giày nam": "#5A7888", "Bốt nữ": "#C4A080",
  "Bốt nam": "#6A8094", "Sandal nữ": "#D4A090", "Sandal nam": "#8890C4",
  "Giày trẻ em": "#8DC4A0", "Sandal trẻ em": "#A0D4B8",
  "Túi nữ": "#9B7060", "Túi nam": "#607080", "Phụ kiện": "#7A8B6B",
  "Trang sức": "#B8A045",
};

// ─── Slot ─────────────────────────────────────────────────────────────────────
function Slot({ productId, sectionId, subsectionId, rowIndex, slotIndex }: {
  productId: string | null; sectionId: string; subsectionId: string;
  rowIndex: number; slotIndex: number;
}) {
  const { products, selectedProduct, placeInSection } = useStore();
  const product = productId ? products.find(p => p.id === productId) : null;
  const isPlacementMode = !!selectedProduct;
  const canPlace = isPlacementMode && !product;
  const canRemove = !isPlacementMode && !!product;

  const handleClick = () => {
    if (canPlace && selectedProduct) placeInSection(sectionId, subsectionId, rowIndex, slotIndex, selectedProduct.id);
    else if (canRemove) placeInSection(sectionId, subsectionId, rowIndex, slotIndex, null);
  };

  const catColor = product ? (CAT_COLORS[product.category] || "#9A8878") : null;

  return (
    <div
      onClick={handleClick}
      title={product ? `${product.name} — tap để gỡ` : isPlacementMode ? "Tap để đặt" : ""}
      className={`relative flex-shrink-0 overflow-hidden select-none transition-all duration-100 ${
        (canPlace || canRemove) ? "cursor-pointer active:scale-95" : "cursor-default"
      } ${canPlace ? "slot-placement-pulse" : ""}`}
      style={{
        width: "clamp(34px, 7.5vw, 44px)",
        height: "clamp(44px, 9.5vw, 54px)",
        borderRadius: 5,
        border: product
          ? `1px solid ${catColor}55`
          : isPlacementMode
          ? "1px solid rgba(99,179,237,0.55)"
          : "1px solid var(--border)",
        background: product
          ? `${catColor}16`
          : isPlacementMode
          ? "rgba(96,165,250,0.08)"
          : "var(--bg-elevated)",
        boxShadow: product ? `0 1px 4px ${catColor}20` : "none",
      }}
    >
      {product && (
        <>
          <div
            className="absolute top-0 left-0 right-0"
            style={{ height: 3, background: catColor || "#B8914A" }}
          />
          {product.imagePath ? (
            <img src={product.imagePath} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center pt-1">
              <span style={{ fontSize: 12, fontWeight: 700, color: catColor || "#B8914A" }}>
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity"
            style={{ background: "rgba(220,38,38,0.10)" }}
          >
            <span style={{ color: "#EF4444", fontSize: 16, fontWeight: 700 }}>×</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Shelf row ────────────────────────────────────────────────────────────────
function ShelfRowView({ row, rowIndex, sectionId, subsectionId, shelfNumber, shortIndex, onRemove }: {
  row: StoreShelfRow; rowIndex: number; sectionId: string;
  subsectionId: string; shelfNumber: number; shortIndex?: number;
  onRemove?: () => void;
}) {
  const filledCount = row.products.filter(Boolean).length;
  const isShort = row.type === "short";
  const SLOT_GAP = 2;

  if (row.type === "image") {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-[7px] text-text-muted w-5 text-right flex-shrink-0">{shelfNumber || ""}</span>
        <div
          className="h-9 flex-1 min-w-0 flex items-center justify-center"
          style={{
            border: "1.5px dashed var(--border)",
            borderRadius: 5,
            background: "var(--bg-elevated)",
          }}
        >
          <span className="text-[8px] text-text-muted tracking-widest font-medium">IMAGE PANEL</span>
        </div>
      </div>
    );
  }

  const alignRight = isShort && (shortIndex ?? 0) % 2 === 1;

  return (
    <div className={`flex items-end gap-1.5 group py-0.5 ${alignRight ? "flex-row-reverse" : ""}`}>
      <span className={`text-[7px] text-text-muted w-5 flex-shrink-0 pb-1.5 ${alignRight ? "text-left" : "text-right"}`}>
        {shelfNumber}
      </span>
      <div className="flex flex-col">
        <div className="flex items-end" style={{ gap: SLOT_GAP }}>
          {row.products.map((pid, si) => (
            <Slot key={si} productId={pid} sectionId={sectionId} subsectionId={subsectionId}
              rowIndex={rowIndex} slotIndex={si} />
          ))}
        </div>
        {/* Shelf board */}
        <div
          className="mt-0.5 rounded-sm"
          style={{
            height: 4,
            background: isShort
              ? "linear-gradient(90deg, #C8A880, #E8C898, #C8A880)"
              : "linear-gradient(90deg, #C8C0B8, #E0D8D0, #C8C0B8)",
            boxShadow: "0 1px 2px rgba(26,20,16,0.08)",
          }}
        />
      </div>
      <div className={`flex flex-col gap-0.5 flex-shrink-0 pb-1.5 ${alignRight ? "mr-0.5 items-end" : "ml-0.5 items-start"}`}>
        <span className={`text-[7px] tracking-wider font-bold ${isShort ? "text-[#B8914A]" : "text-text-muted/60"}`}>
          {ROW_LABEL[row.type]}
        </span>
        {filledCount > 0 && (
          <span className="text-[7px] text-gold font-medium">{filledCount}/{row.products.length}</span>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-[8px] text-text-muted/30 hover:text-red-400 transition-colors mt-0.5 opacity-0 group-hover:opacity-100"
          >×</button>
        )}
      </div>
    </div>
  );
}

// ─── Add Row form ─────────────────────────────────────────────────────────────
function AddRowForm({ sectionId, subsectionId, onDone }: {
  sectionId: string; subsectionId: string; onDone: () => void;
}) {
  const { addSubsectionRow } = useStore();
  const [type, setType] = useState<"long" | "short" | "image">("long");
  const [slots, setSlots] = useState(8);

  useEffect(() => {
    setSlots(type === "long" ? 8 : type === "short" ? 3 : 0);
  }, [type]);

  const handleAdd = () => {
    addSubsectionRow(sectionId, subsectionId, type, type === "image" ? 0 : Math.max(1, slots));
    onDone();
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
      className="overflow-hidden"
    >
      <div
        className="mt-3 p-3 flex flex-wrap items-center gap-3"
        style={{
          border: "1.5px dashed rgba(184,145,74,0.35)",
          borderRadius: 8,
          background: "rgba(184,145,74,0.04)",
        }}
      >
        <div className="flex gap-1">
          {(["long", "short", "image"] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="px-3 py-1.5 text-[9px] tracking-[0.12em] font-semibold transition-all active:scale-95"
              style={{
                borderRadius: 5,
                border: type === t ? "1px solid rgba(184,145,74,0.5)" : "1px solid var(--border)",
                background: type === t ? "rgba(184,145,74,0.12)" : "var(--bg-elevated)",
                color: type === t ? "var(--gold)" : "var(--text-muted)",
              }}
            >
              {t === "long" ? "DÀI" : t === "short" ? "NGẮN" : "TRANH"}
            </button>
          ))}
        </div>
        {type !== "image" && (
          <label className="flex items-center gap-2">
            <span className="text-[9px] text-text-muted font-medium">Số ngăn:</span>
            <input
              type="number" min={1} max={20} value={slots}
              onChange={e => setSlots(Math.max(1, Math.min(20, Number(e.target.value))))}
              className="w-12 px-2 py-1 text-[10px] text-center text-text-primary focus:outline-none"
              style={{
                border: "1px solid var(--border)", borderRadius: 5,
                background: "var(--bg-input)",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(184,145,74,0.5)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          </label>
        )}
        {type !== "image" && (
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(slots, 12) }).map((_, i) => (
              <div key={i} style={{ width: 11, height: 15, borderRadius: 2, border: "1px solid var(--border)", background: "var(--bg-elevated)" }} />
            ))}
            {slots > 12 && <span className="text-[8px] text-text-muted self-end ml-0.5">+{slots - 12}</span>}
          </div>
        )}
        <div className="flex gap-1.5 ml-auto">
          <button
            onClick={onDone}
            className="px-3 py-1.5 text-[9px] font-medium text-text-muted transition-all active:scale-95"
            style={{ border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg-elevated)" }}
          >Hủy</button>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 text-[9px] font-semibold text-white transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #B8914A 0%, #D4B06E 100%)",
              borderRadius: 5,
              boxShadow: "0 2px 6px rgba(184,145,74,0.25)",
            }}
          >+ Thêm</button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Planogram ────────────────────────────────────────────────────────────────
function Planogram({ section, subsection }: { section: StoreSection; subsection: StoreSubsection }) {
  const { clearSubsection, removeSubsectionRow } = useStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);

  const totalSlots = subsection.rows.reduce((s, r) => s + r.products.length, 0);
  const filledSlots = subsection.rows.reduce((s, r) => s + r.products.filter(Boolean).length, 0);
  const accent = SECTION_ACCENT[section.sectionType] || "#B8914A";
  const fillPct = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;

  let shelfCounter = 0;
  let shortCounter = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--bg-surface)" }}>
      {/* Header */}
      <div
        className="px-3 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0 gap-2"
        style={{ borderLeftWidth: 3, borderLeftColor: accent, paddingLeft: 12 }}
      >
        <div className="min-w-0">
          <p className="text-[7px] tracking-[0.22em] uppercase font-bold truncate" style={{ color: accent }}>
            {section.name}
          </p>
          <p className="text-text-primary text-[13px] font-medium truncate leading-tight mt-0.5">
            {subsection.name}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {totalSlots > 0 && (
            <span
              className="text-[8px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: filledSlots > 0 ? accent : "var(--text-muted)",
                background: filledSlots > 0 ? `${accent}12` : "var(--bg-elevated)",
                border: `1px solid ${filledSlots > 0 ? `${accent}25` : "var(--border)"}`,
              }}
            >
              {filledSlots}/{totalSlots}
            </span>
          )}
          {confirmClear ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { clearSubsection(section.id, subsection.id); setConfirmClear(false); }}
                className="px-2 py-1 text-[8px] text-white bg-red-500 rounded-sm active:scale-95"
              >OK</button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-2 py-1 text-[8px] text-text-muted border border-border rounded-sm"
              >Hủy</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-[8px] text-text-muted/40 hover:text-red-400 transition-colors px-1 py-1"
            >Xóa tất cả</button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalSlots > 0 && (
        <div className="h-0.5 flex-shrink-0" style={{ background: "var(--border)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${fillPct}%`, background: accent, opacity: 0.75 }}
          />
        </div>
      )}

      {/* Rows — horizontal scroll */}
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        <div className="px-3 py-3 flex flex-col gap-0.5" style={{ minWidth: "max-content" }}>
          {subsection.rows.map((row, ri) => {
            if (row.type !== "image") shelfCounter++;
            const si = row.type === "short" ? shortCounter++ : undefined;
            return (
              <ShelfRowView
                key={ri} row={row} rowIndex={ri}
                sectionId={section.id} subsectionId={subsection.id}
                shelfNumber={row.type !== "image" ? shelfCounter : 0}
                shortIndex={si}
                onRemove={() => removeSubsectionRow(section.id, subsection.id, ri)}
              />
            );
          })}

          <div className="mt-3">
            <AnimatePresence mode="wait">
              {showAddRow ? (
                <AddRowForm key="form" sectionId={section.id} subsectionId={subsection.id}
                  onDone={() => setShowAddRow(false)} />
              ) : (
                <motion.button
                  key="btn"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowAddRow(true)}
                  className="flex items-center gap-2 px-3 py-2 text-[9px] font-medium text-text-muted hover:text-gold transition-colors active:opacity-70"
                  style={{
                    border: "1.5px dashed var(--border)",
                    borderRadius: 6,
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
                  <span className="tracking-wider">Thêm ngăn kệ</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SectionEditor() {
  const { storeSections, selectedProduct } = useStore();
  const [selSectionId, setSelSectionId] = useState(storeSections[0]?.id || "");
  const [selSubId, setSelSubId] = useState(storeSections[0]?.subsections[0]?.id || "");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const section = storeSections.find(s => s.id === selSectionId);
  const subsection = section?.subsections.find(s => s.id === selSubId);
  const accent = section ? (SECTION_ACCENT[section.sectionType] || "#B8914A") : "#B8914A";

  const handleSelect = (sId: string, subId: string) => {
    setSelSectionId(sId);
    setSelSubId(subId);
    setMobileNavOpen(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--bg-base)" }}>

      {/* ── Section / subsection picker ─────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", flexShrink: 0, minHeight: 46 }}>
        <button
          onClick={() => setMobileNavOpen(v => !v)}
          className="flex-1 min-w-0 flex items-center gap-2.5 text-left transition-colors"
          style={{
            paddingLeft: 12, paddingTop: 10, paddingBottom: 10, paddingRight: 12,
            background: "transparent", border: "none", cursor: "pointer",
            borderLeft: `2.5px solid ${accent}`,
          }}
        >
          <div className="min-w-0 flex-1">
            <p style={{ fontSize: 7, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, color: accent, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {section?.name ?? "Chọn khu vực"}
            </p>
            <p style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3, marginTop: 2 }}>
              {subsection?.name ?? "—"}
            </p>
          </div>
          <motion.span
            animate={{ rotate: mobileNavOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: 9, color: "var(--text-muted)", flexShrink: 0 }}
          >▼</motion.span>
        </button>
      </div>

      {/* ── Layout ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Dropdown (all sizes) */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute", left: 0, right: 0, zIndex: 30, overflowY: "auto",
                top: 54 + 40 + 46,
                maxHeight: "60vh",
                background: "var(--bg-surface)",
                borderBottom: "1px solid var(--border)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              }}
            >
              {storeSections.map(sec => {
                const acc = SECTION_ACCENT[sec.sectionType] || "var(--gold)";
                return (
                  <div key={sec.id}>
                    <div style={{ padding: "7px 16px", background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                      <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, color: acc }}>
                        {sec.name}
                      </p>
                    </div>
                    {sec.subsections.map(sub => {
                      const isSelected = selSectionId === sec.id && selSubId === sub.id;
                      const subFilled = sub.rows.reduce((s, r) => s + r.products.filter(Boolean).length, 0);
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSelect(sec.id, sub.id)}
                          style={{
                            width: "100%", textAlign: "left",
                            padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                            borderBottom: "1px solid var(--border-subtle)",
                            borderLeft: `3px solid ${isSelected ? acc : "transparent"}`,
                            paddingLeft: isSelected ? 17 : 20,
                            background: isSelected ? "var(--bg-card)" : "transparent",
                            border: "none", cursor: "pointer", transition: "background 0.1s",
                          }}
                        >
                          <span style={{ fontSize: 14, color: isSelected ? "var(--text-primary)" : "var(--text-muted)", fontWeight: isSelected ? 600 : 400 }}>
                            {sub.name}
                          </span>
                          {subFilled > 0 && (
                            <span style={{ fontSize: 10, marginLeft: 8, flexShrink: 0, fontWeight: 600, color: acc }}>
                              {subFilled}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0 relative">
          {/* Selected product banner */}
          <AnimatePresence>
            {selectedProduct && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden flex-shrink-0"
              >
                <div
                  className="px-3 py-2 flex items-center gap-2 border-b"
                  style={{ background: "rgba(184,145,74,0.05)", borderBottomColor: "rgba(184,145,74,0.18)" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0"
                    style={{ animation: "pulseGold 2s ease-in-out infinite" }} />
                  <p className="text-[10px] text-gold truncate">
                    <span className="font-semibold">{selectedProduct.name}</span>
                    <span className="ml-1 opacity-60">— tap ô trống để đặt</span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {section && subsection ? (
            <Planogram section={section} subsection={subsection} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[11px] text-text-muted">Chọn khu vực ở trên</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
