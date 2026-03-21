"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { StoreSection, StoreSubsection, StoreShelfRow } from "@/types";
import Product3DViewer from "./Product3DViewer";

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

// ─── Slot ─────────────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  "Giày nữ": "#C49A6C", "Giày nam": "#5A7888", "Bốt nữ": "#C4A080",
  "Bốt nam": "#6A8094", "Sandal nữ": "#D4A090", "Sandal nam": "#8890C4",
  "Giày trẻ em": "#8DC4A0", "Sandal trẻ em": "#A0D4B8",
  "Túi nữ": "#9B7060", "Túi nam": "#607080", "Phụ kiện": "#7A8B6B",
  "Trang sức": "#B8A045",
};

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
      className={`relative flex-shrink-0 rounded-sm border transition-all select-none overflow-hidden
        ${(canPlace || canRemove) ? "cursor-pointer active:scale-95" : "cursor-default"}
        ${product ? "border-transparent shadow-sm"
          : isPlacementMode ? "border-blue-300/70 bg-blue-50 animate-pulse"
          : "border-border bg-bg-elevated"}
      `}
      style={{
        width: "clamp(36px, 8vw, 46px)",
        height: "clamp(46px, 10vw, 56px)",
        background: product ? `${catColor}18` : undefined,
        borderColor: product ? `${catColor}60` : undefined,
      }}
    >
      {product && (
        <>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: catColor || "#B8914A" }} />
          {product.imagePath ? (
            <img src={product.imagePath} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center pt-1">
              <span style={{ fontSize: 13, fontWeight: 600, color: catColor || "#B8914A" }}>
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-red-50/0 active:bg-red-50/80 transition-colors flex items-center justify-center opacity-0 active:opacity-100">
            <span className="text-red-500 text-base leading-none">×</span>
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
        <span className="text-[8px] tracking-widest text-text-muted w-6 text-right flex-shrink-0">{shelfNumber || ""}</span>
        <div className="h-9 flex-1 min-w-0 border border-dashed border-border rounded-sm flex items-center justify-center bg-bg-elevated">
          <span className="text-[9px] text-text-muted tracking-widest">IMAGE PANEL</span>
        </div>
      </div>
    );
  }

  const alignRight = isShort && (shortIndex ?? 0) % 2 === 1;

  return (
    <div className={`flex items-end gap-1.5 group py-0.5 ${alignRight ? "flex-row-reverse" : ""}`}>
      <span className={`text-[8px] text-text-muted w-6 flex-shrink-0 pb-1.5 ${alignRight ? "text-left" : "text-right"}`}>
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
        <div className="mt-0.5 h-1 rounded-sm"
          style={{
            background: isShort
              ? "linear-gradient(90deg,#C8A880,#E8C898,#C8A880)"
              : "linear-gradient(90deg,#C8C0B8,#E0D8D0,#C8C0B8)",
          }}
        />
      </div>
      <div className={`flex flex-col gap-0.5 flex-shrink-0 pb-1 ${alignRight ? "mr-0.5 items-end" : "ml-0.5 items-start"}`}>
        <span className={`text-[7px] tracking-wider font-semibold ${isShort ? "text-[#B8914A]" : "text-text-muted/70"}`}>
          {ROW_LABEL[row.type]}
        </span>
        {filledCount > 0 && (
          <span className="text-[7px] text-gold">{filledCount}/{row.products.length}</span>
        )}
        {onRemove && (
          <button onClick={onRemove}
            className="text-[8px] text-text-muted/30 hover:text-red-400 active:text-red-500 transition-colors mt-0.5 opacity-0 group-hover:opacity-100">
            ×
          </button>
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
      <div className="mt-3 p-3 border border-dashed border-gold/40 rounded-sm bg-gold/4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(["long", "short", "image"] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-1.5 text-[9px] tracking-[0.12em] rounded-sm border transition-all ${
                type === t ? "bg-gold text-white border-gold font-medium" : "border-border text-text-muted hover:border-gold/50"
              }`}>
              {t === "long" ? "DÀI" : t === "short" ? "NGẮN" : "TRANH"}
            </button>
          ))}
        </div>
        {type !== "image" && (
          <label className="flex items-center gap-2">
            <span className="text-[9px] text-text-muted">Số ngăn:</span>
            <input type="number" min={1} max={20} value={slots}
              onChange={e => setSlots(Math.max(1, Math.min(20, Number(e.target.value))))}
              className="w-12 px-2 py-1 text-[10px] text-center border border-border rounded-sm bg-bg-base focus:outline-none focus:border-gold/60 text-text-primary" />
          </label>
        )}
        {type !== "image" && (
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(slots, 12) }).map((_, i) => (
              <div key={i} style={{ width: 12, height: 16, borderRadius: 2, border: "1px solid #D8D0C8", background: "#F8F5F0" }} />
            ))}
            {slots > 12 && <span className="text-[8px] text-text-muted self-end">+{slots - 12}</span>}
          </div>
        )}
        <div className="flex gap-1.5 ml-auto">
          <button onClick={onDone}
            className="px-3 py-1.5 text-[9px] text-text-muted border border-border rounded-sm">Hủy</button>
          <button onClick={handleAdd}
            className="px-3 py-1.5 text-[9px] text-white bg-gold rounded-sm font-medium">+ Thêm</button>
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

  let shelfCounter = 0;
  let shortCounter = 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-surface">
      {/* Compact header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-shrink-0 gap-2"
        style={{ borderLeftWidth: 3, borderLeftColor: accent, paddingLeft: 10 }}>
        <div className="min-w-0">
          <p className="text-[8px] tracking-[0.18em] uppercase font-medium truncate" style={{ color: accent }}>
            {section.name}
          </p>
          <p className="text-text-primary text-sm font-light truncate leading-tight">{subsection.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[9px]" style={{ color: filledSlots > 0 ? accent : "#9A9080" }}>
            {filledSlots}/{totalSlots}
          </span>
          {confirmClear ? (
            <div className="flex items-center gap-1">
              <button onClick={() => { clearSubsection(section.id, subsection.id); setConfirmClear(false); }}
                className="px-2 py-1 text-[8px] text-red-500 border border-red-300 rounded-sm">OK</button>
              <button onClick={() => setConfirmClear(false)}
                className="px-2 py-1 text-[8px] text-text-muted border border-border rounded-sm">Hủy</button>
            </div>
          ) : (
            <button onClick={() => setConfirmClear(true)}
              className="text-[8px] text-text-muted/50 hover:text-red-400 transition-colors px-1 py-1">
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalSlots > 0 && (
        <div className="h-0.5 flex-shrink-0 bg-border overflow-hidden">
          <div className="h-full transition-all duration-500"
            style={{ width: `${(filledSlots / totalSlots) * 100}%`, background: accent, opacity: 0.7 }} />
        </div>
      )}

      {/* Rows — horizontal scroll */}
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        <div className="px-3 py-3 flex flex-col gap-0.5" style={{ minWidth: "max-content" }}>
          {subsection.rows.map((row, ri) => {
            if (row.type !== "image") shelfCounter++;
            const si = row.type === "short" ? shortCounter++ : undefined;
            return (
              <ShelfRowView key={ri} row={row} rowIndex={ri}
                sectionId={section.id} subsectionId={subsection.id}
                shelfNumber={row.type !== "image" ? shelfCounter : 0}
                shortIndex={si}
                onRemove={() => removeSubsectionRow(section.id, subsection.id, ri)} />
            );
          })}

          {/* Add row */}
          <div className="mt-3">
            <AnimatePresence mode="wait">
              {showAddRow ? (
                <AddRowForm key="form" sectionId={section.id} subsectionId={subsection.id}
                  onDone={() => setShowAddRow(false)} />
              ) : (
                <motion.button key="btn"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowAddRow(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-[9px] text-text-muted border border-dashed border-border hover:border-gold/50 hover:text-gold rounded-sm transition-all active:opacity-70">
                  + Thêm ngăn
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
    <div className="flex flex-col h-full overflow-hidden bg-bg-base">

      {/* ── Mobile: section/sub picker row ── */}
      <div className="flex items-center border-b border-border bg-bg-surface flex-shrink-0">
        {/* Current selection button — tap opens dropdown */}
        <button
          onClick={() => setMobileNavOpen(v => !v)}
          className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 text-left active:bg-bg-card transition-colors"
          style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 10 }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[7px] tracking-[0.18em] uppercase font-medium truncate" style={{ color: accent }}>
              {section?.name ?? "Chọn khu vực"}
            </p>
            <p className="text-[12px] text-text-primary font-light truncate leading-tight">
              {subsection?.name ?? "—"}
            </p>
          </div>
          <span className="text-text-muted text-xs flex-shrink-0">{mobileNavOpen ? "▲" : "▼"}</span>
        </button>

        {/* Desktop: sidebar button label */}
        <div className="hidden md:flex px-3 border-l border-border">
          <p className="text-[8px] tracking-[0.2em] text-text-muted uppercase">Khu vực</p>
        </div>
      </div>

      {/* ── Dropdown nav (mobile) or sidebar (desktop) ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Desktop sidebar */}
        <div className="hidden md:flex w-44 flex-shrink-0 border-r border-border overflow-y-auto bg-bg-surface flex-col">
          <div className="flex flex-col overflow-y-auto divide-y divide-border/50">
            {storeSections.map(sec => {
              const acc = SECTION_ACCENT[sec.sectionType] || "#B8914A";
              const filled = sec.subsections.reduce(
                (s, sub) => s + sub.rows.reduce((rs, r) => rs + r.products.filter(Boolean).length, 0), 0
              );
              return (
                <div key={sec.id}>
                  <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
                    <span className="text-[8px] tracking-[0.15em] font-medium uppercase" style={{ color: acc }}>
                      {sec.name}
                    </span>
                    {filled > 0 && <span className="text-[7px] text-gold">{filled}</span>}
                  </div>
                  {sec.subsections.map(sub => {
                    const isSelected = selSectionId === sec.id && selSubId === sub.id;
                    const subFilled = sub.rows.reduce((s, r) => s + r.products.filter(Boolean).length, 0);
                    return (
                      <button key={sub.id} onClick={() => handleSelect(sec.id, sub.id)}
                        className={`w-full text-left px-4 py-2 flex items-center justify-between text-[10px] transition-all ${
                          isSelected ? "text-text-primary bg-bg-card" : "text-text-muted hover:bg-bg-card/60"
                        }`}
                        style={isSelected ? { borderLeft: `2px solid ${acc}`, paddingLeft: 14 } : { borderLeft: "2px solid transparent" }}>
                        <span className="truncate">{sub.name}</span>
                        {subFilled > 0 && <span className="text-[7px] ml-1 flex-shrink-0" style={{ color: isSelected ? acc : "#9A9080" }}>{subFilled}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile dropdown overlay */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="md:hidden absolute left-0 right-0 z-30 bg-bg-surface border-b border-border shadow-lg overflow-y-auto"
              style={{ top: 88, maxHeight: "55vh" }}
            >
              {storeSections.map(sec => {
                const acc = SECTION_ACCENT[sec.sectionType] || "#B8914A";
                return (
                  <div key={sec.id}>
                    <div className="px-4 py-2 bg-bg-card border-b border-border/40">
                      <p className="text-[9px] tracking-[0.15em] uppercase font-medium" style={{ color: acc }}>{sec.name}</p>
                    </div>
                    {sec.subsections.map(sub => {
                      const isSelected = selSectionId === sec.id && selSubId === sub.id;
                      const subFilled = sub.rows.reduce((s, r) => s + r.products.filter(Boolean).length, 0);
                      return (
                        <button key={sub.id} onClick={() => handleSelect(sec.id, sub.id)}
                          className={`w-full text-left px-5 py-3 flex items-center justify-between border-b border-border/30 active:bg-bg-card transition-colors ${isSelected ? "bg-bg-card" : ""}`}
                          style={isSelected ? { borderLeft: `3px solid ${acc}`, paddingLeft: 17 } : { borderLeft: "3px solid transparent" }}>
                          <span className={`text-sm ${isSelected ? "text-text-primary font-medium" : "text-text-muted"}`}>{sub.name}</span>
                          {subFilled > 0 && <span className="text-[10px] ml-2 flex-shrink-0" style={{ color: acc }}>{subFilled}</span>}
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
          {selectedProduct && (
            <div className="px-3 py-2 border-b border-gold/20 bg-gold/5 flex-shrink-0 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse flex-shrink-0" />
              <p className="text-[10px] text-gold truncate">
                <span className="font-medium">{selectedProduct.name}</span>
                <span className="ml-1 opacity-70">— tap ô trống để đặt</span>
              </p>
            </div>
          )}
          {section && subsection ? (
            <Planogram section={section} subsection={subsection} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted text-xs">
              Chọn khu vực ở trên
            </div>
          )}
        </div>

        {/* Product 3D viewer — desktop only */}
        {selectedProduct && (
          <div className="hidden md:block w-[188px] flex-shrink-0 border-l border-border overflow-hidden">
            <Product3DViewer product={selectedProduct} />
          </div>
        )}
      </div>
    </div>
  );
}
