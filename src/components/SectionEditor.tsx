"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { StoreSection, StoreSubsection, StoreShelfRow } from "@/types";
import Product3DViewer from "./Product3DViewer";

const SECTION_ACCENT: Record<string, string> = {
  wall_woman: "#B8914A",
  wall_man:   "#5A7898",
  center_woman: "#A87848",
  center_man:   "#486888",
  acc:        "#6A8868",
  window:     "#8868A8",
};

const ROW_LABEL: Record<string, string> = {
  long:  "DÀI",
  short: "NGẮN",
  image: "TRANH",
};

// ─── Product slot ────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  "Giày nữ": "#C49A6C", "Giày nam": "#5A7888", "Bốt nữ": "#C4A080",
  "Bốt nam": "#6A8094", "Sandal nữ": "#D4A090", "Sandal nam": "#8890C4",
  "Giày trẻ em": "#8DC4A0", "Sandal trẻ em": "#A0D4B8",
  "Túi nữ": "#9B7060", "Túi nam": "#607080", "Phụ kiện": "#7A8B6B",
  "Trang sức": "#B8A045", "Áo": "#607090", "Quần": "#706080", "Đầm/Váy": "#906070",
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
      title={product ? `${product.name} — Click để gỡ` : isPlacementMode ? "Click để đặt" : ""}
      className={`relative flex-shrink-0 rounded-sm border transition-all select-none overflow-hidden ${
        (canPlace || canRemove) ? "cursor-pointer" : "cursor-default"
      } ${
        product
          ? "border-transparent shadow-sm"
          : isPlacementMode
          ? "border-blue-300/70 bg-blue-50 hover:border-blue-400 hover:bg-blue-100/80 animate-pulse"
          : "border-border bg-bg-elevated hover:border-border-strong"
      }`}
      style={{
        width: 38, height: 48,
        background: product ? `${catColor}18` : undefined,
        borderColor: product ? `${catColor}60` : undefined,
      }}
    >
      {product && (
        <>
          {/* Category color strip at top */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: catColor || "#B8914A" }} />
          {product.imagePath ? (
            <img src={product.imagePath} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center pt-1">
              <span className="text-xs font-medium" style={{ color: catColor || "#B8914A" }}>
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Remove overlay */}
          <div className="absolute inset-0 bg-red-50/0 hover:bg-red-50/80 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
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

  if (row.type === "image") {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-[8px] tracking-widest text-text-muted w-8 text-right flex-shrink-0">{shelfNumber || ""}</span>
        <div className="h-10 flex-1 border border-dashed border-border rounded-sm flex items-center justify-center bg-bg-elevated">
          <span className="text-[9px] text-text-muted tracking-widest">TRANH / IMAGE PANEL</span>
        </div>
      </div>
    );
  }

  // Each slot = 38px wide + 2px gap. Board = slots * 40 - 2 (no trailing gap)
  const SLOT_W = 38;
  const SLOT_GAP = 2;
  const boardWidth = row.products.length * SLOT_W + (row.products.length - 1) * SLOT_GAP;

  // Short rows: alternate left/right. Even shortIndex = left, odd = right.
  const alignRight = isShort && (shortIndex ?? 0) % 2 === 1;

  return (
    <div className={`flex items-end gap-2 group py-0.5 ${alignRight ? "flex-row-reverse" : ""}`}>
      <span className={`text-[8px] text-text-muted w-8 flex-shrink-0 group-hover:text-text-secondary transition-colors pb-1 ${alignRight ? "text-left" : "text-right"}`}>
        {shelfNumber}
      </span>
      <div className="flex flex-col" style={{ width: boardWidth }}>
        <div className="flex items-end" style={{ gap: SLOT_GAP }}>
          {row.products.map((pid, si) => (
            <Slot key={si} productId={pid} sectionId={sectionId} subsectionId={subsectionId}
              rowIndex={rowIndex} slotIndex={si} />
          ))}
        </div>
        {/* Shelf board — exact width of slots */}
        <div className="mt-0.5 h-[4px] rounded-sm"
          style={{
            width: boardWidth,
            background: isShort
              ? "linear-gradient(90deg, #B8A890, #D8CEC4, #B8A890)"
              : "linear-gradient(90deg, #C8C0B8, #E0D8D0, #C8C0B8)",
          }}
        />
      </div>
      <div className={`flex flex-col gap-0.5 flex-shrink-0 pb-1 ${alignRight ? "mr-1 items-end" : "ml-1 items-start"}`}>
        <span className={`text-[8px] tracking-[0.1em] font-medium ${isShort ? "text-[#B8914A]" : "text-text-muted"}`}>
          {ROW_LABEL[row.type]}
        </span>
        {filledCount > 0 && (
          <span className="text-[7px] text-gold">{filledCount}/{row.products.length}</span>
        )}
        {onRemove && (
          <button onClick={onRemove}
            className="text-[7px] text-text-muted/40 hover:text-red-400 transition-colors mt-0.5 opacity-0 group-hover:opacity-100">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add Row inline form ──────────────────────────────────────────────────────
function AddRowForm({ sectionId, subsectionId, onDone }: {
  sectionId: string; subsectionId: string; onDone: () => void;
}) {
  const { addSubsectionRow } = useStore();
  const [type, setType] = useState<"long" | "short" | "image">("long");
  const [slots, setSlots] = useState(type === "long" ? 8 : 3);
  const slotsRef = useRef<HTMLInputElement>(null);

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
        {/* Type */}
        <div className="flex gap-1">
          {(["long", "short", "image"] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-1 text-[9px] tracking-[0.12em] rounded-sm border transition-all ${
                type === t
                  ? "bg-gold text-white border-gold font-medium"
                  : "border-border text-text-muted hover:border-gold/50 hover:text-gold"
              }`}>
              {t === "long" ? "DÀI" : t === "short" ? "NGẮN" : "TRANH"}
            </button>
          ))}
        </div>

        {/* Slot count */}
        {type !== "image" && (
          <label className="flex items-center gap-2">
            <span className="text-[9px] text-text-muted">Số ngăn:</span>
            <input
              ref={slotsRef}
              type="number" min={1} max={20}
              value={slots}
              onChange={e => setSlots(Math.max(1, Math.min(20, Number(e.target.value))))}
              className="w-12 px-2 py-1 text-[10px] text-center border border-border rounded-sm bg-bg-base focus:outline-none focus:border-gold/60 text-text-primary"
            />
          </label>
        )}

        {/* Preview */}
        {type !== "image" && (
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(slots, 12) }).map((_, i) => (
              <div key={i} style={{ width: 14, height: 18, borderRadius: 2, border: "1px solid #D8D0C8", background: "#F8F5F0" }} />
            ))}
            {slots > 12 && <span className="text-[8px] text-text-muted self-end">+{slots - 12}</span>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 ml-auto">
          <button onClick={onDone}
            className="px-3 py-1 text-[9px] text-text-muted border border-border rounded-sm hover:border-border-strong transition-all">
            Hủy
          </button>
          <button onClick={handleAdd}
            className="px-3 py-1 text-[9px] text-white bg-gold rounded-sm hover:bg-gold-light transition-all font-medium">
            + Thêm ngăn
          </button>
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
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0"
        style={{ borderLeftWidth: 3, borderLeftColor: accent, paddingLeft: 14 }}>
        <div>
          <p className="text-[9px] tracking-[0.2em] uppercase font-medium" style={{ color: accent }}>{section.name}</p>
          <h3 className="text-text-primary text-base font-light mt-0.5">{subsection.name}</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[8px] text-text-muted tracking-widest">Đã trưng bày</p>
            <p className="text-sm font-light" style={{ color: filledSlots > 0 ? accent : "#9A9080" }}>
              {filledSlots}<span className="text-text-muted text-xs">/{totalSlots}</span>
            </p>
          </div>
          {confirmClear ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-text-muted">Xóa hết?</span>
              <button onClick={() => { clearSubsection(section.id, subsection.id); setConfirmClear(false); }}
                className="px-2 py-1 text-[8px] text-red-500 border border-red-300 hover:border-red-400 rounded-sm">OK</button>
              <button onClick={() => setConfirmClear(false)}
                className="px-2 py-1 text-[8px] text-text-muted border border-border rounded-sm">HỦY</button>
            </div>
          ) : (
            <button onClick={() => setConfirmClear(true)}
              className="text-[9px] text-text-muted hover:text-red-500 transition-colors px-2 py-1 border border-border hover:border-red-300 rounded-sm">
              Xóa trưng bày
            </button>
          )}
        </div>
      </div>

      {/* Planogram content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 bg-bg-base">
        {/* Progress */}
        {totalSlots > 0 && (
          <div className="mb-4 h-0.5 bg-border rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(filledSlots / totalSlots) * 100}%`, background: accent, opacity: 0.8 }} />
          </div>
        )}

        {/* Rows */}
        <div className="flex flex-col gap-0.5">
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
        </div>

        {/* Add row */}
        <div className="mt-3">
          <AnimatePresence mode="wait">
            {showAddRow ? (
              <AddRowForm
                key="form"
                sectionId={section.id}
                subsectionId={subsection.id}
                onDone={() => setShowAddRow(false)}
              />
            ) : (
              <motion.button
                key="btn"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowAddRow(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] text-text-muted border border-dashed border-border hover:border-gold/50 hover:text-gold rounded-sm transition-all"
              >
                <span>+</span> Thêm ngăn
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-border flex items-center gap-4 flex-wrap">
          {[
            { bg: "bg-bg-elevated", border: "border-border", label: "Ô trống" },
            { bg: "bg-blue-50", border: "border-blue-300/70", label: "Đang chọn sản phẩm" },
            { bg: "bg-gold/10", border: "border-gold/40", label: "Có sản phẩm (hover → gỡ)" },
          ].map(({ bg, border, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-6 h-4 border rounded-sm ${bg} ${border}`} />
              <span className="text-[8px] text-text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section nav ──────────────────────────────────────────────────────────────
function SectionNav({ sections, selectedSectionId, selectedSubId, onSelect }: {
  sections: StoreSection[]; selectedSectionId: string; selectedSubId: string;
  onSelect: (sId: string, subId: string) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([sections[0]?.id || ""]);
  const toggle = (id: string) =>
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="flex flex-col overflow-y-auto divide-y divide-border/50">
      {sections.map(sec => {
        const accent = SECTION_ACCENT[sec.sectionType] || "#B8914A";
        const isOpen = expanded.includes(sec.id);
        const filled = sec.subsections.reduce(
          (s, sub) => s + sub.rows.reduce((rs, r) => rs + r.products.filter(Boolean).length, 0), 0
        );
        return (
          <div key={sec.id}>
            <button onClick={() => toggle(sec.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-bg-card transition-colors text-left">
              <span className="text-[9px] tracking-[0.15em] font-medium uppercase"
                style={{ color: isOpen ? accent : "#9A9080" }}>
                {sec.name}
              </span>
              <div className="flex items-center gap-1.5">
                {filled > 0 && <span className="text-[7px] text-gold">{filled}</span>}
                <span className="text-text-muted text-xs">{isOpen ? "−" : "+"}</span>
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                  {sec.subsections.map(sub => {
                    const isSelected = selectedSectionId === sec.id && selectedSubId === sub.id;
                    const subFilled = sub.rows.reduce((s, r) => s + r.products.filter(Boolean).length, 0);
                    return (
                      <button key={sub.id} onClick={() => onSelect(sec.id, sub.id)}
                        className={`w-full text-left px-5 py-2 flex items-center justify-between text-[10px] transition-all ${
                          isSelected ? "text-text-primary bg-bg-card" : "text-text-muted hover:text-text-secondary hover:bg-bg-card/60"
                        }`}
                        style={isSelected ? { borderLeft: `2px solid ${accent}`, paddingLeft: 18 } : { borderLeft: "2px solid transparent" }}>
                        <span>{sub.name}</span>
                        {subFilled > 0 && <span className="text-[7px] ml-1" style={{ color: isSelected ? accent : "#9A9080" }}>{subFilled}</span>}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SectionEditor() {
  const { storeSections, selectedProduct } = useStore();
  const [selSectionId, setSelSectionId] = useState(storeSections[0]?.id || "");
  const [selSubId, setSelSubId] = useState(storeSections[0]?.subsections[0]?.id || "");

  const section = storeSections.find(s => s.id === selSectionId);
  const subsection = section?.subsections.find(s => s.id === selSubId);

  return (
    <div className="flex h-full overflow-hidden bg-bg-base">
      {/* Left nav */}
      <div className="w-44 flex-shrink-0 border-r border-border overflow-y-auto bg-bg-surface">
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-[8px] tracking-[0.25em] text-text-muted uppercase">Khu vực</p>
        </div>
        <SectionNav sections={storeSections} selectedSectionId={selSectionId}
          selectedSubId={selSubId} onSelect={(sId, subId) => { setSelSectionId(sId); setSelSubId(subId); }} />
      </div>

      {/* Main planogram */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {selectedProduct && (
          <div className="px-4 py-2 border-b border-gold/20 bg-gold/5 flex-shrink-0 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <p className="text-[9px] text-gold">
              <span className="font-medium">{selectedProduct.name}</span> — click ô trống để đặt vào kệ
            </p>
          </div>
        )}
        {section && subsection ? (
          <Planogram section={section} subsection={subsection} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted text-xs">
            Chọn khu vực bên trái
          </div>
        )}
      </div>

      {selectedProduct && <Product3DViewer product={selectedProduct} />}
    </div>
  );
}
