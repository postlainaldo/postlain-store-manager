"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { Product, StoreSubsection, WarehouseShelf } from "@/types";

type ShelfEntry =
  | { kind: "store"; section: string; sectionType: string; sub: StoreSubsection }
  | { kind: "warehouse"; shelf: WarehouseShelf };

// Category → accent color (matches app palette)
const CAT_COLOR: Record<string, string> = {
  "women":  "#C9856A",
  "men":    "#5A7898",
  "kids":   "#7BAF6A",
  "acc":    "#9B7DC8",
  "sale":   "#C8A84A",
  "phụ kiện": "#9B7DC8",
  "chăm sóc": "#8A9870",
};
function catColor(cat?: string): string {
  if (!cat) return "#B8914A";
  const lc = cat.toLowerCase();
  for (const [k, v] of Object.entries(CAT_COLOR)) {
    if (lc.includes(k)) return v;
  }
  return "#8A8078";
}

// Section accent colors (same as SectionEditor)
const SECTION_ACCENT: Record<string, string> = {
  wall_woman:   "#B8914A",
  wall_man:     "#5A7898",
  center_woman: "#A87848",
  center_man:   "#486888",
  acc:          "#6A8868",
  window:       "#8868A8",
};

// ─── Slot box ─────────────────────────────────────────────────────────────────
function SlotBox({ product, slotW, slotH, rowType }: {
  product: Product | null;
  slotW: number;
  slotH: number;
  rowType?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const cc = product ? catColor(product.category) : null;

  return (
    <div
      style={{
        width: slotW,
        height: slotH,
        flexShrink: 0,
        position: "relative",
        borderRadius: 3,
        border: product
          ? `1px solid ${cc}55`
          : "1px solid #E8E4DE",
        background: product ? `${cc}14` : "#FAF8F5",
        transition: "transform 0.12s, box-shadow 0.12s",
        transform: hovered && product ? "translateY(-2px)" : "none",
        boxShadow: hovered && product ? `0 4px 10px ${cc}33` : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        cursor: product ? "default" : "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={product ? `${product.name}${product.sku ? ` · ${product.sku}` : ""}` : ""}
    >
      {product ? (
        <>
          {/* Color strip top */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: cc || "#B8914A",
            borderRadius: "3px 3px 0 0",
          }} />
          {/* Color dot */}
          {product.color && (
            <div style={{
              position: "absolute", top: 6, right: 4,
              width: 6, height: 6, borderRadius: "50%",
              background: product.color,
              border: "1px solid rgba(0,0,0,0.12)",
            }} />
          )}
          {/* Name */}
          <p style={{
            fontSize: Math.max(8, Math.min(10, slotW / 8)),
            color: "#2A2420",
            fontWeight: 500,
            textAlign: "center",
            lineHeight: 1.25,
            padding: "0 4px",
            marginTop: 4,
            wordBreak: "break-word",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: slotH > 50 ? 3 : 2,
            WebkitBoxOrient: "vertical",
          }}>
            {product.name}
          </p>
          {/* SKU */}
          {product.sku && slotH > 56 && (
            <p style={{
              fontSize: 7, color: "#9A9080",
              marginTop: 2, letterSpacing: "0.05em",
              fontFamily: "monospace",
            }}>
              {product.sku.slice(-6)}
            </p>
          )}
        </>
      ) : (
        <div style={{
          width: "55%", height: "35%",
          border: "1px dashed #D8D0C8",
          borderRadius: 2,
        }} />
      )}
    </div>
  );
}

// ─── Store shelf (SÀN TRƯNG BÀY) ─────────────────────────────────────────────
function StoreSub({ sub, products }: { sub: StoreSubsection; products: Product[] }) {
  const prodMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const rows = sub.rows;
  const maxSlots = Math.max(...rows.map(r => r.products.length), 1);
  const SLOT_W = Math.max(68, Math.min(108, Math.floor(760 / maxSlots)));
  const SLOT_H = 58;
  const GAP = 3;
  const LABEL_W = 42;

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: GAP,
        padding: "14px 14px 14px 14px",
        background: "#FFFFFF",
        border: "1px solid #E8E4DE",
        borderRadius: 6,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        minWidth: "max-content",
        position: "relative",
      }}>
        {/* Top rail */}
        <div style={{
          position: "absolute", top: 0, left: 10, right: 10, height: 5,
          background: "linear-gradient(90deg,#C8BEB4,#E8E0D8,#C8BEB4)",
          borderRadius: "0 0 3px 3px",
        }} />

        {rows.map((row, ri) => {
          const filled = row.products.filter(Boolean).length;
          const isImage = row.type === "image";
          const isShort = row.type === "short";

          if (isImage) {
            return (
              <div key={ri} style={{ display: "flex", alignItems: "center", gap: GAP }}>
                <div style={{ width: LABEL_W, flexShrink: 0, textAlign: "right", paddingRight: 8 }}>
                  <span style={{ fontSize: 8, color: "#B8A898", letterSpacing: "0.08em" }}>TRANH</span>
                </div>
                <div style={{
                  height: 36, width: maxSlots * (SLOT_W + GAP) - GAP,
                  border: "1px dashed #D8D0C8", borderRadius: 3,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "#F8F5F0",
                }}>
                  <span style={{ fontSize: 9, color: "#B8A898", letterSpacing: "0.15em" }}>IMAGE / TRANH PANEL</span>
                </div>
              </div>
            );
          }

          return (
            <div key={ri} style={{ display: "flex", alignItems: "flex-end", gap: GAP }}>
              {/* Tier label */}
              <div style={{
                width: LABEL_W, flexShrink: 0,
                display: "flex", flexDirection: "column",
                alignItems: "flex-end", paddingRight: 8,
                paddingBottom: 6,
              }}>
                <span style={{
                  fontSize: 8.5, fontWeight: 600,
                  color: isShort ? "#A87848" : "#8A8078",
                  letterSpacing: "0.08em",
                }}>
                  {isShort ? "NGẮN" : "DÀI"}
                </span>
                <span style={{
                  fontSize: 7.5, marginTop: 2,
                  color: filled > 0 ? "#B8914A" : "#C8C0B8",
                }}>
                  {filled}/{row.products.length}
                </span>
              </div>

              {/* Slots + shelf board */}
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", gap: GAP }}>
                  {row.products.map((pid, si) => (
                    <SlotBox
                      key={si}
                      product={pid ? (prodMap.get(pid) ?? null) : null}
                      slotW={SLOT_W}
                      slotH={SLOT_H}
                      rowType={row.type}
                    />
                  ))}
                </div>
                {/* Shelf board */}
                <div style={{
                  marginTop: 2, height: 5, borderRadius: 2,
                  background: isShort
                    ? "linear-gradient(90deg,#C8A880,#E8C898,#C8A880)"
                    : "linear-gradient(90deg,#C8C0B8,#E0D8D0,#C8C0B8)",
                }} />
              </div>
            </div>
          );
        })}

        {/* Bottom rail */}
        <div style={{
          position: "absolute", bottom: 0, left: 10, right: 10, height: 5,
          background: "linear-gradient(90deg,#C8BEB4,#E8E0D8,#C8BEB4)",
          borderRadius: "3px 3px 0 0",
        }} />
      </div>
    </div>
  );
}

// ─── Warehouse shelf (KHO) ────────────────────────────────────────────────────
function WarehouseSub({ shelf, products }: { shelf: WarehouseShelf; products: Product[] }) {
  const prodMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const COLS = 5;
  const ROWS = 5;
  const SLOT_W = 82;
  const SLOT_H = 44;
  const GAP = 3;
  const accentColor = shelf.shelfType === "shoes" ? "#5A7898" : "#9A7050";

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 6,
        padding: "14px",
        background: "#FFFFFF",
        border: "1px solid #E8E4DE",
        borderRadius: 6,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        minWidth: "max-content",
        position: "relative",
      }}>
        {/* Top beam */}
        <div style={{
          position: "absolute", top: 0, left: 10, right: 10, height: 5,
          background: `linear-gradient(90deg,${accentColor}88,${accentColor}CC,${accentColor}88)`,
          borderRadius: "0 0 3px 3px",
        }} />

        {[...shelf.tiers].reverse().map((tier, revIdx) => {
          const ti = shelf.tiers.length - 1 - revIdx;
          const filled = tier.filter(Boolean).length;
          const tierLabels = ["Tầng thấp nhất", "Tầng giữa thấp", "Tầng giữa cao", "Tầng cao nhất"];

          return (
            <div key={ti} style={{ display: "flex", alignItems: "flex-end", gap: GAP }}>
              {/* Tier label */}
              <div style={{
                width: 56, flexShrink: 0,
                display: "flex", flexDirection: "column",
                alignItems: "flex-end", paddingRight: 8, paddingBottom: 5,
              }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: accentColor, letterSpacing: "0.06em" }}>
                  T{ti + 1}
                </span>
                <span style={{ fontSize: 7.5, color: "#9A9080", marginTop: 1, textAlign: "right", lineHeight: 1.2 }}>
                  {tierLabels[ti]}
                </span>
                <span style={{ fontSize: 7.5, marginTop: 2, color: filled > 0 ? accentColor : "#C8C0B8" }}>
                  {filled}/25
                </span>
              </div>

              {/* 25 slots (5×5 shown as 1 row of 25 → split into 5 cols of 5) */}
              <div style={{ position: "relative" }}>
                {/* Show as 5 columns of 5 rows stacked horizontally */}
                <div style={{ display: "flex", gap: 6 }}>
                  {Array.from({ length: COLS }, (_, col) => (
                    <div key={col} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                      {Array.from({ length: ROWS }, (_, row) => {
                        const slotIdx = row * COLS + col;
                        const pid = tier[slotIdx] ?? null;
                        return (
                          <SlotBox
                            key={slotIdx}
                            product={pid ? (prodMap.get(pid) ?? null) : null}
                            slotW={SLOT_W}
                            slotH={SLOT_H}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                {/* Shelf board */}
                <div style={{
                  marginTop: 2, height: 5, borderRadius: 2,
                  background: `linear-gradient(90deg,${accentColor}55,${accentColor}99,${accentColor}55)`,
                }} />
              </div>
            </div>
          );
        })}

        {/* Bottom beam */}
        <div style={{
          position: "absolute", bottom: 0, left: 10, right: 10, height: 5,
          background: `linear-gradient(90deg,${accentColor}88,${accentColor}CC,${accentColor}88)`,
          borderRadius: "3px 3px 0 0",
        }} />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ShelfViewer3D() {
  const { storeSections, warehouseShelves, products } = useStore();
  const [selected, setSelected] = useState<string | null>(null);

  const entries = useMemo<ShelfEntry[]>(() => {
    const list: ShelfEntry[] = [];
    for (const sec of storeSections) {
      for (const sub of sec.subsections) {
        list.push({ kind: "store", section: sec.name, sectionType: sec.sectionType, sub });
      }
    }
    for (const shelf of warehouseShelves) {
      list.push({ kind: "warehouse", shelf });
    }
    return list;
  }, [storeSections, warehouseShelves]);

  const selectedEntry = useMemo(() => {
    if (!selected) return entries[0] ?? null;
    return entries.find(e =>
      e.kind === "store" ? e.sub.id === selected : e.shelf.id === selected
    ) ?? entries[0] ?? null;
  }, [selected, entries]);

  const selectedId = selectedEntry
    ? (selectedEntry.kind === "store" ? selectedEntry.sub.id : selectedEntry.shelf.id)
    : null;

  function entryStats(e: ShelfEntry) {
    if (e.kind === "store") {
      const total = e.sub.rows.reduce((s, r) => s + r.products.length, 0);
      const filled = e.sub.rows.reduce((s, r) => s + r.products.filter(Boolean).length, 0);
      return { filled, total };
    }
    const total = e.shelf.tiers.length * 25;
    const filled = e.shelf.tiers.reduce((s, t) => s + t.filter(Boolean).length, 0);
    return { filled, total };
  }

  // Group store by section
  const storeGroups = useMemo(() => {
    const map = new Map<string, { name: string; type: string; subs: Extract<ShelfEntry, { kind: "store" }>[] }>();
    for (const e of entries) {
      if (e.kind !== "store") continue;
      if (!map.has(e.section)) map.set(e.section, { name: e.section, type: e.sectionType, subs: [] });
      map.get(e.section)!.subs.push(e);
    }
    return [...map.values()];
  }, [entries]);

  const warehouseEntries = entries.filter((e): e is Extract<ShelfEntry, { kind: "warehouse" }> => e.kind === "warehouse");

  const accent = selectedEntry
    ? selectedEntry.kind === "store"
      ? SECTION_ACCENT[selectedEntry.sectionType] ?? "#B8914A"
      : selectedEntry.shelf.shelfType === "shoes" ? "#5A7898" : "#9A7050"
    : "#B8914A";

  return (
    <div className="flex h-full w-full overflow-hidden bg-bg-base">

      {/* ── Sidebar ── */}
      <div className="w-52 flex-shrink-0 flex flex-col border-r border-border bg-bg-surface overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border flex-shrink-0">
          <p className="text-[8px] tracking-[0.28em] text-text-muted uppercase">Chọn kệ</p>
          <p className="text-[10px] text-text-muted mt-0.5">{entries.length} kệ</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Store shelves */}
          {storeGroups.map(group => {
            const groupAccent = SECTION_ACCENT[group.type] ?? "#B8914A";
            return (
              <div key={group.name}>
                <div className="px-3 py-1.5 mt-2 border-t border-border/50" style={{ borderTopColor: `${groupAccent}30` }}>
                  <p className="text-[8px] tracking-[0.18em] uppercase font-medium" style={{ color: groupAccent }}>
                    {group.name}
                  </p>
                </div>
                {group.subs.map(e => {
                  const { filled, total } = entryStats(e);
                  const isSelected = selectedId === e.sub.id;
                  return (
                    <button
                      key={e.sub.id}
                      onClick={() => setSelected(e.sub.id)}
                      className={`w-full text-left px-3 py-2 flex flex-col gap-1 transition-all ${
                        isSelected ? "bg-bg-card" : "hover:bg-bg-card/60"
                      }`}
                      style={isSelected ? { borderLeft: `2px solid ${groupAccent}`, paddingLeft: 10 } : { borderLeft: "2px solid transparent" }}
                    >
                      <span className={`text-[10px] leading-snug ${isSelected ? "text-text-primary font-medium" : "text-text-muted"}`}>
                        {e.sub.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                          <div style={{
                            width: total > 0 ? `${(filled / total) * 100}%` : "0%",
                            height: "100%",
                            background: filled > 0 ? groupAccent : "transparent",
                            borderRadius: 99, opacity: 0.7,
                          }} />
                        </div>
                        <span className="text-[8px] text-text-muted flex-shrink-0">{filled}/{total}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Warehouse shelves */}
          {warehouseEntries.length > 0 && (
            <div>
              <div className="px-3 py-1.5 mt-2 border-t border-border/50">
                <p className="text-[8px] tracking-[0.18em] uppercase font-medium text-[#5A7898]">KHO DỰ TRỮ</p>
              </div>
              {warehouseEntries.map(e => {
                const { filled, total } = entryStats(e);
                const isSelected = selectedId === e.shelf.id;
                const wAccent = e.shelf.shelfType === "shoes" ? "#5A7898" : "#9A7050";
                return (
                  <button
                    key={e.shelf.id}
                    onClick={() => setSelected(e.shelf.id)}
                    className={`w-full text-left px-3 py-2 flex flex-col gap-1 transition-all ${
                      isSelected ? "bg-bg-card" : "hover:bg-bg-card/60"
                    }`}
                    style={isSelected ? { borderLeft: `2px solid ${wAccent}`, paddingLeft: 10 } : { borderLeft: "2px solid transparent" }}
                  >
                    <span className={`text-[10px] leading-snug ${isSelected ? "text-text-primary font-medium" : "text-text-muted"}`}>
                      {e.shelf.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                        <div style={{
                          width: total > 0 ? `${(filled / total) * 100}%` : "0%",
                          height: "100%",
                          background: filled > 0 ? wAccent : "transparent",
                          borderRadius: 99, opacity: 0.7,
                        }} />
                      </div>
                      <span className="text-[8px] text-text-muted flex-shrink-0">{filled}/{total}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Main viewer ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {selectedEntry ? (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-border bg-bg-surface flex-shrink-0 flex items-center justify-between"
              style={{ borderLeftWidth: 3, borderLeftColor: accent, paddingLeft: 14 }}>
              <div>
                <p className="text-[8px] tracking-[0.22em] uppercase font-medium" style={{ color: accent }}>
                  {selectedEntry.kind === "store" ? selectedEntry.section : (selectedEntry.shelf.shelfType === "shoes" ? "KỆ GIÀY" : "KỆ TÚI")}
                </p>
                <h2 className="text-text-primary text-base font-light mt-0.5">
                  {selectedEntry.kind === "store" ? selectedEntry.sub.name : selectedEntry.shelf.name}
                </h2>
              </div>

              {/* Stats */}
              {(() => {
                const { filled, total } = entryStats(selectedEntry);
                const pct = total > 0 ? Math.round(filled / total * 100) : 0;
                return (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p style={{ fontSize: 18, fontWeight: 300, color: accent, lineHeight: 1 }}>
                        {filled}<span className="text-text-muted text-xs font-normal">/{total}</span>
                      </p>
                      <p className="text-[8px] text-text-muted mt-0.5 tracking-widest">SẢN PHẨM</p>
                    </div>
                    <div style={{ position: "relative", width: 40, height: 40 }}>
                      <svg width="40" height="40" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="20" cy="20" r="16" fill="none" stroke="#E8E4DE" strokeWidth="3" />
                        <circle cx="20" cy="20" r="16" fill="none" stroke={accent} strokeWidth="3"
                          strokeDasharray={`${2 * Math.PI * 16 * pct / 100} ${2 * Math.PI * 16}`}
                          strokeLinecap="round" />
                      </svg>
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 600, color: accent,
                      }}>
                        {pct}%
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Legend */}
            <div className="px-5 py-1.5 border-b border-border/50 bg-bg-surface flex-shrink-0 flex items-center gap-3 flex-wrap">
              <span className="text-[8px] text-text-muted tracking-widest">MÀU DANH MỤC:</span>
              {[
                { label: "Women", color: "#C9856A" },
                { label: "Men",   color: "#5A7898" },
                { label: "Kids",  color: "#7BAF6A" },
                { label: "Acc",   color: "#9B7DC8" },
                { label: "Sale",  color: "#C8A84A" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                  <span className="text-[8px] text-text-muted">{label}</span>
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-5">
              {selectedEntry.kind === "store"
                ? <StoreSub sub={selectedEntry.sub} products={products} />
                : <WarehouseSub shelf={selectedEntry.shelf} products={products} />
              }
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-text-muted">
            <span className="text-3xl opacity-20">◫</span>
            <p className="text-[10px] tracking-[0.2em] uppercase">Chọn kệ để xem</p>
          </div>
        )}
      </div>
    </div>
  );
}
