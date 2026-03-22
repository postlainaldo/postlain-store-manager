"use client";

import {
  useState, useEffect, useMemo, useCallback, useRef,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Search, X, Package, ArrowRight, Eye, Layers,
  LayoutGrid, ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import type { Product, StoreSection } from "@/types";

// ─── Zone colour mapping ────────────────────────────────────────────────────

const ZONE_CFG: Record<string, { color: string; label: string }> = {
  wall_woman:   { color: "#C9A55A", label: "KỆ NỮ"        },
  wall_man:     { color: "#7A9EC0", label: "KỆ NAM"        },
  center_woman: { color: "#C4956A", label: "WOMAN CENTER"  },
  center_man:   { color: "#6A9EC4", label: "MAN CENTER"    },
  acc:          { color: "#9B88C4", label: "ACC CENTER"    },
  window:       { color: "#7BAF6A", label: "WINDOW"        },
};

const CAT_DOT: Record<string, string> = {
  "Giày nữ": "#C49A6C", "Giày nam": "#5A7888", "Bốt nữ": "#C4A080",
  "Bốt nam": "#6A8094", "Sandal nữ": "#D4A090", "Sandal nam": "#8890C4",
  "Túi nữ": "#9B7060", "Túi nam": "#607080", "Phụ kiện": "#7A8B6B",
};

function catColor(cat: string) { return CAT_DOT[cat] ?? "#888"; }

// ─── ID encoding ────────────────────────────────────────────────────────────
// Format: "src__pid"
// src variants:
//   "pool"                         ← product pool
//   "sec:{sId}:{subId}:{ri}:{si}"  ← store slot

function mkPoolId(pid: string) { return `pool__${pid}`; }
function mkSlotId(sId: string, subId: string, ri: number, si: number, pid: string) {
  return `sec:${sId}:${subId}:${ri}:${si}__${pid}`;
}
function mkEmptyId(sId: string, subId: string, ri: number, si: number) {
  return `empty:${sId}:${subId}:${ri}:${si}__null`;
}

interface ParsedId {
  isPool: boolean;
  isEmpty: boolean;
  sId: string; subId: string; ri: number; si: number;
  pid: string;
}
function parseId(raw: string): ParsedId {
  const sep = raw.indexOf("__");
  const src = raw.slice(0, sep);
  const pid = raw.slice(sep + 2);
  if (src === "pool") return { isPool: true, isEmpty: false, sId: "", subId: "", ri: 0, si: 0, pid };
  const parts = src.split(":");          // "sec" | "empty", sId, subId, ri, si
  return {
    isPool: false,
    isEmpty: src.startsWith("empty"),
    sId: parts[1], subId: parts[2],
    ri: parseInt(parts[3]), si: parseInt(parts[4]),
    pid,
  };
}

// ─── Pool card (draggable) ───────────────────────────────────────────────────

function PoolCard({ product }: { product: Product }) {
  const id  = mkPoolId(product.id);
  const cc  = catColor(product.category);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.25 : 1 }}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-bg-elevated cursor-grab select-none hover:border-border-strong transition-colors"
      {...attributes} {...listeners}
    >
      {/* Colour swatch / thumbnail */}
      <div
        className="w-7 h-7 rounded-md flex-shrink-0 overflow-hidden border border-border"
        style={{ background: product.color ? `${product.color}55` : `${cc}33` }}
      >
        {product.imagePath && (
          <img src={product.imagePath} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary truncate" style={{ fontSize: 10, fontWeight: 500 }}>
          {product.name}
        </p>
        <p className="text-text-muted" style={{ fontSize: 8, marginTop: 1 }}>
          {product.category} · {product.quantity > 0 ? `${product.quantity} cái` : <span style={{ color: "var(--accent-red)" }}>Hết hàng</span>}
        </p>
      </div>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: product.quantity > 0 ? cc : "var(--border)" }} />
    </div>
  );
}

// ─── Store slot (draggable when occupied, droppable when empty) ──────────────

function StoreSlot({
  pid, sId, subId, ri, si, onRemove,
}: {
  pid: string | null; sId: string; subId: string; ri: number; si: number; onRemove: () => void;
}) {
  const { products } = useStore();
  const [hov, setHov] = useState(false);

  const p   = useMemo(() => (pid ? products.find(x => x.id === pid) ?? null : null), [pid, products]);
  const id  = p ? mkSlotId(sId, subId, ri, si, p.id) : mkEmptyId(sId, subId, ri, si);
  const cc  = p ? catColor(p.category) : "transparent";

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id });

  if (!p) {
    return (
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          width: 40, height: 40,
          borderRadius: 6,
          borderWidth: 1, borderStyle: "dashed",
          borderColor: isOver ? "var(--blue)" : "var(--border)",
          background: isOver ? "var(--blue-subtle)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        {...attributes} {...listeners}
      >
        <Package size={8} style={{ color: isOver ? "var(--blue)" : "var(--border)" }} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity:     isDragging ? 0.15 : 1,
        width:       40,
        height:      40,
        background:  `${p.color ?? cc}28`,
        borderColor: `${cc}55`,
        borderWidth:  1,
        borderStyle: "solid",
      }}
      className="relative rounded-md overflow-hidden cursor-grab flex items-center justify-center"
      {...attributes} {...listeners}
    >
      {p.imagePath
        ? <img src={p.imagePath} alt="" className="w-full h-full object-cover" />
        : <span className="font-semibold text-center leading-tight" style={{ fontSize: 6, color: cc, padding: "0 2px" }}>
            {p.name.slice(0, 9)}
          </span>
      }
      {/* Remove button */}
      <AnimatePresence>
        {hov && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.1 }}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(0,0,0,0.85)", border: "none" }}
          >
            <X size={7} color="#fff" />
          </motion.button>
        )}
      </AnimatePresence>
      {/* Tooltip on hover */}
      <AnimatePresence>
        {hov && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap"
          >
            <div className="rounded-md border border-border bg-bg-elevated px-2 py-1 shadow-md">
              <p className="text-text-primary" style={{ fontSize: 9 }}>{p.name}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Subsection block ────────────────────────────────────────────────────────

function SubBlock({
  section, subIdx, highlightOver,
}: {
  section: StoreSection; subIdx: number; highlightOver: boolean;
}) {
  const { placeInSection } = useStore();
  const sub = section.subsections[subIdx];
  const cfg = ZONE_CFG[section.sectionType] ?? { color: "#C9A55A" };

  const total  = sub.rows.reduce((s, r) => s + r.products.length, 0);
  const filled = sub.rows.reduce((s, r) => s + r.products.filter(Boolean).length, 0);
  const pct    = total > 0 ? (filled / total) * 100 : 0;

  const allIds = sub.rows.flatMap((row, ri) =>
    row.products.map((pid, si) =>
      pid ? mkSlotId(section.id, sub.id, ri, si, pid) : mkEmptyId(section.id, sub.id, ri, si)
    )
  );

  return (
    <SortableContext items={allIds} strategy={rectSortingStrategy}>
      <div
        className="rounded-xl border p-2.5 transition-all duration-150"
        style={{
          minWidth:    148,
          background:  highlightOver ? `color-mix(in srgb, ${cfg.color} 6%, var(--bg-card))` : "var(--bg-card)",
          borderColor: highlightOver ? `${cfg.color}66` : "var(--border)",
          boxShadow:   highlightOver ? `0 0 0 1px ${cfg.color}33` : "none",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold tracking-wider" style={{ fontSize: 8, color: cfg.color }}>
            {sub.name}
          </p>
          <span className="text-text-muted" style={{ fontSize: 7 }}>{filled}/{total}</span>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-border rounded-full mb-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: cfg.color }}
          />
        </div>
        {/* Rows */}
        <div className="flex flex-col gap-0.5">
          {sub.rows.map((row, ri) => {
            if (row.type === "image") return (
              <div key={ri} className="h-3 rounded flex items-center px-1 bg-bg-elevated">
                <span className="text-text-muted tracking-widest" style={{ fontSize: 5 }}>TRANH</span>
              </div>
            );
            return (
              <div key={ri} className="flex items-center gap-0.5">
                <span className="text-text-muted flex-shrink-0 font-mono" style={{ fontSize: 5, width: 16 }}>
                  {row.type === "long" ? "DÀI" : "N"}
                </span>
                <div className="flex gap-0.5 flex-wrap">
                  {row.products.map((pid, si) => (
                    <StoreSlot
                      key={si} pid={pid} sId={section.id} subId={sub.id}
                      ri={ri} si={si}
                      onRemove={() => placeInSection(section.id, sub.id, ri, si, null)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SortableContext>
  );
}

// ─── Section group (collapsible) ─────────────────────────────────────────────

function SectionGroup({
  section, overKey,
}: {
  section: StoreSection; overKey: string | null;
}) {
  const [open, setOpen] = useState(true);
  const cfg = ZONE_CFG[section.sectionType] ?? { color: "#C9A55A", label: section.name };

  const secFilled = section.subsections.reduce(
    (s, sub) => s + sub.rows.reduce((rs, r) => rs + r.products.filter(Boolean).length, 0), 0
  );
  const secTotal = section.subsections.reduce(
    (s, sub) => s + sub.rows.reduce((rs, r) => rs + r.products.length, 0), 0
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full cursor-pointer hover:opacity-80 transition-opacity"
        style={{ background: "none", border: "none" }}
      >
        <div className="w-0.5 h-3.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
        <p className="font-semibold tracking-[0.2em]" style={{ fontSize: 10, color: cfg.color }}>
          {section.name}
        </p>
        <div className="flex-1 h-px bg-border" />
        <span className="text-text-muted" style={{ fontSize: 8 }}>{secFilled}/{secTotal}</span>
        {open
          ? <ChevronUp size={10} className="text-text-muted" />
          : <ChevronDown size={10} className="text-text-muted" />
        }
      </button>

      {/* Sub-blocks */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 flex-wrap pb-1">
              {section.subsections.map((sub, si) => (
                <SubBlock
                  key={sub.id}
                  section={section}
                  subIdx={si}
                  highlightOver={!!overKey?.includes(`${section.id}:${sub.id}`)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── DragOverlay ghost ───────────────────────────────────────────────────────

function DragGhost({ id, products }: { id: string; products: Product[] }) {
  const { pid } = parseId(id);
  const p  = products.find(x => x.id === pid);
  if (!p) return null;
  const cc = catColor(p.category);
  return (
    <div
      className="rounded-lg flex items-center gap-2 px-3 py-2 shadow-xl border"
      style={{
        background:  "var(--bg-elevated)",
        borderColor: `${cc}66`,
        minWidth:     140,
        cursor:      "grabbing",
        boxShadow:   `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${cc}44`,
      }}
    >
      <div
        className="w-7 h-7 rounded-md flex-shrink-0 border border-border overflow-hidden"
        style={{ background: `${p.color ?? cc}33` }}
      >
        {p.imagePath && <img src={p.imagePath} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary font-medium truncate" style={{ fontSize: 10 }}>{p.name}</p>
        <p className="text-text-muted" style={{ fontSize: 8 }}>{p.category}</p>
      </div>
    </div>
  );
}

// ─── Virtual pool list ───────────────────────────────────────────────────────

function ProductPool({
  products, onDisplayIds,
}: {
  products: Product[]; onDisplayIds: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() =>
    products.filter(p =>
      !search
        || p.name.toLowerCase().includes(search.toLowerCase())
        || (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
        || p.category.toLowerCase().includes(search.toLowerCase())
    ),
    [products, search]
  );

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 6,
  });

  const poolIds = useMemo(() => filtered.map(p => mkPoolId(p.id)), [filtered]);

  return (
    <div className="flex flex-col gap-2.5 bg-bg-card border border-border rounded-xl p-3 overflow-hidden"
      style={{ width: 240, flexShrink: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-text-muted font-semibold uppercase tracking-[0.2em]" style={{ fontSize: 8 }}>
          Kho Sản Phẩm
        </p>
        <div className="flex gap-2">
          <span className="text-text-muted" style={{ fontSize: 8 }}>
            <span style={{ color: "var(--blue)" }}>{onDisplayIds.size}</span> / {products.length} trưng bày
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 flex items-center gap-2 bg-bg-input border border-border rounded-lg px-2.5 h-8">
        <Search size={10} className="text-text-muted flex-shrink-0" strokeWidth={1.5} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tên, SKU, danh mục..."
          className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted font-[inherit]"
          style={{ fontSize: 10 }}
        />
        {search && (
          <button onClick={() => setSearch("")} className="cursor-pointer" style={{ background: "none", border: "none" }}>
            <X size={9} className="text-text-muted" />
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-1.5 flex-shrink-0">
        {[
          { label: "Tổng SKU",    val: products.length,    color: "var(--text-primary)" },
          { label: "Trưng Bày",  val: onDisplayIds.size,  color: "var(--gold)"         },
          { label: "Trong Kho",  val: products.length - onDisplayIds.size, color: "var(--blue)" },
        ].map(s => (
          <div key={s.label} className="flex-1 bg-bg-elevated rounded-lg py-1.5 text-center">
            <p className="font-light" style={{ fontSize: 14, color: s.color }}>{s.val}</p>
            <p className="text-text-muted tracking-wider" style={{ fontSize: 6 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-bg-elevated border border-border">
        <ArrowRight size={9} className="text-text-muted" />
        <p className="text-text-muted" style={{ fontSize: 8 }}>Kéo sản phẩm vào ô trống trên kệ</p>
      </div>

      {/* Virtualized list */}
      <SortableContext items={poolIds} strategy={rectSortingStrategy}>
        <div ref={parentRef} className="flex-1 overflow-y-auto pr-0.5">
          {filtered.length === 0 ? (
            <p className="text-text-muted text-center mt-8" style={{ fontSize: 10 }}>
              Không tìm thấy sản phẩm
            </p>
          ) : (
            <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map(vi => (
                <div
                  key={vi.key}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${vi.start}px)`, paddingBottom: 4 }}
                >
                  <PoolCard product={filtered[vi.index]} />
                </div>
              ))}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VisualBoardPage() {
  const { products, storeSections, placeInSection, fetchProducts } = useStore();
  const [activeSection, setActiveSection] = useState("all");
  const [activeDId,     setActiveDId]     = useState<string | null>(null);
  const [overKey,       setOverKey]       = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Compute which products are currently on display
  const onDisplayIds = useMemo(() => {
    const ids = new Set<string>();
    storeSections.forEach(sec =>
      sec.subsections.forEach(sub =>
        sub.rows.forEach(row =>
          row.products.forEach(pid => { if (pid) ids.add(pid); })
        )
      )
    );
    return ids;
  }, [storeSections]);

  const shownSections = useMemo(() =>
    activeSection === "all" ? storeSections : storeSections.filter(s => s.id === activeSection),
    [storeSections, activeSection]
  );

  const totalSlots = useMemo(() =>
    storeSections.reduce((s, sec) =>
      s + sec.subsections.reduce((ss, sub) =>
        ss + sub.rows.reduce((rs, r) => rs + r.products.length, 0), 0), 0),
    [storeSections]
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveDId(String(e.active.id));
  }, []);

  const onDragOver = useCallback((e: DragOverEvent) => {
    setOverKey(e.over ? String(e.over.id) : null);
  }, []);

  const onDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    setActiveDId(null);
    setOverKey(null);
    if (!over || active.id === over.id) return;

    const from = parseId(String(active.id));
    const to   = parseId(String(over.id));

    // ── POOL → STORE SLOT ──────────────────────────────────────────────────
    if (from.isPool) {
      if (to.isEmpty || !to.isPool) {
        // Place into the target slot (only if it is empty or we accept the swap)
        const sec = storeSections.find(s => s.id === to.sId);
        const sub = sec?.subsections.find(s => s.id === to.subId);
        const row = sub?.rows[to.ri];
        if (!row) return;
        // Find the first empty slot in this row if target isn't explicitly empty
        if (to.isEmpty) {
          placeInSection(to.sId, to.subId, to.ri, to.si, from.pid);
        } else {
          // Dropped onto an occupied slot — find nearest empty in same subsection
          const emptyRowIdx = sub!.rows.findIndex(r => r.products.some(p => p === null));
          if (emptyRowIdx === -1) return;
          const emptySlotIdx = sub!.rows[emptyRowIdx].products.findIndex(p => p === null);
          placeInSection(to.sId, to.subId, emptyRowIdx, emptySlotIdx, from.pid);
        }
      }
      return;
    }

    // ── STORE SLOT → STORE SLOT ────────────────────────────────────────────
    if (!from.isPool && !to.isPool) {
      const sameRow = from.sId === to.sId && from.subId === to.subId && from.ri === to.ri;

      if (sameRow) {
        // Reorder within same row
        const sec = storeSections.find(s => s.id === from.sId);
        const sub = sec?.subsections.find(s => s.id === from.subId);
        const row = sub?.rows[from.ri];
        if (!row) return;
        const fi = row.products.indexOf(from.pid);
        const ti = to.isEmpty ? to.si : row.products.indexOf(to.pid);
        if (fi === -1 || ti === -1) return;
        const reordered = arrayMove([...row.products], fi, ti);
        reordered.forEach((pid, i) => placeInSection(from.sId, from.subId, from.ri, i, pid));
      } else {
        // Move across rows / subsections
        const fSec = storeSections.find(s => s.id === from.sId);
        const fRow = fSec?.subsections.find(s => s.id === from.subId)?.rows[from.ri];
        const tSec = storeSections.find(s => s.id === to.sId);
        const tSub = tSec?.subsections.find(s => s.id === to.subId);
        const tRow = tSub?.rows[to.ri];
        if (!fRow || !tRow) return;
        const fi = fRow.products.indexOf(from.pid);
        if (fi === -1) return;

        if (to.isEmpty) {
          // Swap: move product, clear original slot
          placeInSection(from.sId, from.subId, from.ri, fi, null);
          placeInSection(to.sId, to.subId, to.ri, to.si, from.pid);
        } else {
          // Swap two occupied slots
          const ti = tRow.products.indexOf(to.pid);
          if (ti === -1) return;
          placeInSection(from.sId, from.subId, from.ri, fi, to.pid);
          placeInSection(to.sId, to.subId, to.ri, ti, from.pid);
        }
      }
    }
  }, [storeSections, placeInSection]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div
        className="flex flex-col gap-4"
        style={{ height: "calc(100vh - 72px)", minHeight: 0 }}
      >
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-end justify-between gap-4">
          <div>
            <p className="text-text-muted font-semibold uppercase tracking-[0.38em]" style={{ fontSize: 9 }}>
              Quản Lý Cửa Hàng · ALDO
            </p>
            <h1 className="text-text-primary font-light mt-1" style={{ fontSize: 26, letterSpacing: "0.04em" }}>
              Bảng Trưng Bày
            </h1>
          </div>

          {/* Summary chips */}
          <div className="hidden md:flex items-center gap-3 mb-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border">
              <Eye size={10} className="text-gold" />
              <span className="text-gold font-medium" style={{ fontSize: 10 }}>{onDisplayIds.size}</span>
              <span className="text-text-muted" style={{ fontSize: 9 }}>trưng bày</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border">
              <LayoutGrid size={10} className="text-text-muted" />
              <span className="text-text-primary font-medium" style={{ fontSize: 10 }}>{totalSlots}</span>
              <span className="text-text-muted" style={{ fontSize: 9 }}>tổng ô</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border">
              <Layers size={10} className="text-blue" />
              <span style={{ fontSize: 10, color: "var(--blue)", fontWeight: 500 }}>
                {totalSlots > 0 ? Math.round((onDisplayIds.size / totalSlots) * 100) : 0}%
              </span>
              <span className="text-text-muted" style={{ fontSize: 9 }}>lấp đầy</span>
            </div>
          </div>
        </div>

        {/* ── Main body: pool + shelves ────────────────────────────────────── */}
        <div className="flex gap-3 flex-1 min-h-0">

          {/* Product pool — desktop only */}
          <div className="hidden md:flex">
            <ProductPool products={products} onDisplayIds={onDisplayIds} />
          </div>

          {/* Right: filter + shelf grid */}
          <div className="flex flex-col flex-1 gap-2 min-w-0 min-h-0">

            {/* Section filter tabs */}
            <div className="flex-shrink-0 flex gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveSection("all")}
                className="px-2.5 py-1 rounded-lg border font-[inherit] cursor-pointer transition-colors text-[9px] tracking-wider"
                style={{
                  borderColor: activeSection === "all" ? "var(--gold)" : "var(--border)",
                  background:  activeSection === "all" ? "color-mix(in srgb, var(--gold) 10%, transparent)" : "transparent",
                  color:       activeSection === "all" ? "var(--gold)" : "var(--text-muted)",
                }}
              >
                Tất Cả
              </button>
              {storeSections.map(sec => {
                const cfg = ZONE_CFG[sec.sectionType] ?? { color: "var(--text-muted)" };
                const isA = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    className="px-2.5 py-1 rounded-lg border font-[inherit] cursor-pointer transition-colors text-[9px] tracking-wider"
                    style={{
                      borderColor: isA ? `${cfg.color}66` : "var(--border)",
                      background:  isA ? `color-mix(in srgb, ${cfg.color} 10%, transparent)` : "transparent",
                      color:       isA ? cfg.color : "var(--text-muted)",
                    }}
                  >
                    {sec.name}
                  </button>
                );
              })}
            </div>

            {/* Shelf sections — scrollable */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-0.5">
              {shownSections.map(section => (
                <SectionGroup key={section.id} section={section} overKey={overKey} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay — floating ghost card */}
      <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
        {activeDId ? <DragGhost id={activeDId} products={products} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
