"use client";

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, sel } from "@/store/useStore";
import type { Product, WarehouseShelf } from "@/types";
import ProductFormModal from "@/components/ProductFormModal";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search, Plus, Pencil, Trash2,
  MapPin, X, Warehouse, Eye, CheckSquare, Square, ScanLine,
  RefreshCw, Filter, Camera,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown,
} from "lucide-react";
import QRScannerModal from "@/components/QRScannerModal";
import { useTheme } from "@/hooks/useTheme";
import { playSound } from "@/hooks/useSFX";
import { parseMCFromNotes, colorCodeToHex } from "@/lib/categoryMapping";
import "barcode-detector/polyfill";

// ─── Inline search scanner (mobile) ──────────────────────────────────────────
function SearchScanner({ onResult, onClose }: { onResult: (code: string) => void; onClose: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockRef = useRef(false);

  const stop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let nativeDetector: { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } | null = null;
    type JsQRFn = (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
    let jsQRFn: JsQRFn | null = null;
    let canvas: HTMLCanvasElement | null = null;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setScanning(true);
      } catch {
        setErr("Không thể mở camera");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ("BarcodeDetector" in window) {
        try { nativeDetector = new (window as any).BarcodeDetector({ formats: ["ean_13","ean_8","code_128","code_39","qr_code","upc_a","upc_e"] }); } catch { /* */ }
      }
      try { const m = await import("jsqr"); jsQRFn = m.default as unknown as JsQRFn; canvas = document.createElement("canvas"); } catch { /* */ }

      const loop = async () => {
        if (lockRef.current || !streamRef.current) return;
        const video = videoRef.current;
        if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }

        let code: string | null = null;
        if (nativeDetector) {
          try { const r = await nativeDetector.detect(video); if (r.length) code = r[0].rawValue; } catch { /* */ }
        }
        if (!code && jsQRFn && canvas) {
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) { ctx.drawImage(video, 0, 0); const r = jsQRFn(ctx.getImageData(0,0,canvas.width,canvas.height).data, canvas.width, canvas.height); if (r) code = r.data; }
        }
        if (code) { lockRef.current = true; stop(); onResult(code); return; }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }

    start();
    return () => stop();
  }, []); // eslint-disable-line

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(12,26,46,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}
      onClick={e => { if (e.target === e.currentTarget) { stop(); onClose(); } }}
    >
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        style={{ width: "100%", maxWidth: 480, background: "#050505", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: "20px 20px 36px", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#7dd3fc", letterSpacing: "0.2em" }}>QUÉT ĐỂ TÌM KIẾM</p>
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Hướng camera vào mã vạch hoặc QR</p>
          </div>
          <button onClick={() => { stop(); onClose(); }}
            style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} color="#fff" />
          </button>
        </div>

        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000", aspectRatio: "4/3" }}>
          <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: "65%", aspectRatio: "2/1", border: "2px solid rgba(181,242,61,0.85)", borderRadius: 10, boxShadow: "0 0 0 1000px rgba(0,0,0,0.35)" }}>
                <motion.div animate={{ top: ["4px","calc(100% - 4px)","4px"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ position: "absolute", left: 4, right: 4, height: 2, background: "linear-gradient(90deg,transparent,rgba(181,242,61,0.9),transparent)", borderRadius: 2 }} />
              </div>
            </div>
          )}
          {!scanning && !err && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={28} style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>
          )}
          {err && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <p style={{ fontSize: 12, color: "#fca5a5", textAlign: "center" }}>{err}</p>
            </div>
          )}
        </div>

        {scanning && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#b5f23d" }} />
            <span style={{ fontSize: 10, color: "#94a3b8" }}>Đang quét...</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) { return new Intl.NumberFormat("vi-VN").format(n); }
function fmtPrice(n?: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n) + " ₫";
}

function navigateToBoard(
  router: ReturnType<typeof useRouter>,
  pid: string,
  mode: "display" | "warehouse"
) {
  try { sessionStorage.setItem("postlain_highlight", JSON.stringify({ pid, mode })); } catch { /* noop */ }
  router.push("/visual-board");
}

// ─── Qty pill ────────────────────────────────────────────────────────────────

function QtyPill({ qty }: { qty: number }) {
  const color = qty === 0 ? "#dc2626" : qty <= 3 ? "#ea580c" : qty <= 5 ? "#f59e0b" : "#16a34a";
  const bg    = qty === 0 ? "rgba(220,38,38,0.08)" : qty <= 3 ? "rgba(234,88,12,0.08)" : qty <= 5 ? "rgba(245,158,11,0.10)" : "rgba(22,163,74,0.07)";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 28, height: 22, borderRadius: 6, padding: "0 6px",
      background: bg, border: `1px solid ${color}30`,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{qty}</span>
    </div>
  );
}

// ─── Sort indicator ──────────────────────────────────────────────────────────

type SortKey = "mc" | "name" | "price" | "qty" | "size" | "color";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown size={9} style={{ color: "var(--border)", marginLeft: 3, flexShrink: 0 }} />;
  return sortDir === "asc"
    ? <ArrowUp size={9} style={{ color: "var(--blue)", marginLeft: 3, flexShrink: 0 }} />
    : <ArrowDown size={9} style={{ color: "var(--blue)", marginLeft: 3, flexShrink: 0 }} />;
}

// ─── Main list view ──────────────────────────────────────────────────────────

function ListView() {
  const products         = useStore(sel.products);
  const storeSections    = useStore(sel.storeSections);
  const warehouseShelves = useStore(sel.warehouseShelves);
  const fetchProducts    = useStore(sel.fetchProducts);
  const fetchDbState     = useStore(sel.fetchDbState);
  const deleteProduct    = useStore(sel.deleteProduct);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTheme();
  const cardBg = t.cardBg;
  const cardBorder = t.cardBorder;
  const tableHeaderBg = t.isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)";

  // ── URL-backed filters (shareable, survive refresh) ───────────────
  const search      = searchParams.get("q")     ?? "";
  const filterCat   = searchParams.get("cat")   ?? "";
  const filterColor = searchParams.get("color") ?? "";
  const filterSize  = searchParams.get("size")  ?? "";
  const filterStock = (searchParams.get("stock") ?? "all") as "all"|"low"|"out";
  const filterLoc   = (searchParams.get("loc")   ?? "all") as "all"|"display"|"warehouse"|"unplaced";
  const sortKey     = (searchParams.get("sort")  ?? "mc")  as SortKey;
  const sortDir     = (searchParams.get("dir")   ?? "asc") as SortDir;

  // Helper: merge one param, push new URL without full navigation
  const setParam = useCallback((key: string, value: string, def?: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (!value || value === def) p.delete(key); else p.set(key, value);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  const setSearch      = (v: string)                                     => setParam("q",     v);
  const setFilterCat   = (v: string)                                     => setParam("cat",   v);
  const setFilterColor = (v: string)                                     => setParam("color", v);
  const setFilterSize  = (v: string)                                     => setParam("size",  v);
  const setFilterStock = (v: "all"|"low"|"out")                          => setParam("stock", v, "all");
  const setFilterLoc   = (v: "all"|"display"|"warehouse"|"unplaced")     => setParam("loc",   v, "all");
  const [editProduct,   setEditProduct] = useState<Product | null>(null);
  const [showAdd,       setShowAdd]     = useState(false);
  const [deleteId,      setDeleteId]    = useState<string | null>(null);
  const [hoveredId,     setHoveredId]   = useState<string | null>(null);
  const [selected,      setSelected]    = useState<Set<string>>(new Set());
  const [confirmBulk,   setConfirmBulk] = useState(false);
  const [showScanner,       setShowScanner]       = useState(false);
  const [showSearchScanner, setShowSearchScanner] = useState(false);
  const [odooSyncing,   setOdooSyncing] = useState(false);
  const [odooMsg,       setOdooMsg]     = useState<string | null>(null);
  const [showFilters,   setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => { fetchProducts(); }, []);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))).sort(), [products]);
  const colors     = useMemo(() => Array.from(new Set(products.map(p => p.color).filter(Boolean))).sort() as string[], [products]);
  const sizes      = useMemo(() => Array.from(new Set(products.map(p => p.size).filter(Boolean))).sort() as string[], [products]);

  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const sec of storeSections)
      for (const sub of sec.subsections)
        for (let ri = 0; ri < sub.rows.length; ri++)
          for (let si = 0; si < sub.rows[ri].products.length; si++) {
            const pid = sub.rows[ri].products[si];
            if (pid) m.set(pid, `${sub.name} / H${ri+1}·Ô${si+1}`);
          }
    for (const shelf of warehouseShelves)
      for (let ti = 0; ti < shelf.tiers.length; ti++)
        for (let si = 0; si < shelf.tiers[ti].length; si++) {
          const pid = shelf.tiers[ti][si];
          if (pid) m.set(pid, `${shelf.name} T${ti+1}·Ô${si+1}`);
        }
    return m;
  }, [storeSections, warehouseShelves]);

  const displaySet = useMemo(() => {
    const s = new Set<string>();
    for (const sec of storeSections)
      for (const sub of sec.subsections)
        for (const row of sub.rows)
          for (const pid of row.products)
            if (pid) s.add(pid);
    return s;
  }, [storeSections]);

  const warehouseSet = useMemo(() => {
    const s = new Set<string>();
    for (const shelf of warehouseShelves)
      for (const tier of shelf.tiers)
        for (const pid of tier)
          if (pid) s.add(pid);
    return s;
  }, [warehouseShelves]);

  const filtered = useMemo(() => products.filter(p => {
    if (filterCat   && p.category !== filterCat)   return false;
    if (filterColor && (p.color ?? "") !== filterColor) return false;
    if (filterSize  && (p.size  ?? "") !== filterSize)  return false;
    if (filterStock === "out" && p.quantity !== 0) return false;
    if (filterStock === "low" && !(p.quantity > 0 && p.quantity <= 5)) return false;
    if (filterLoc === "display"   && !displaySet.has(p.id))   return false;
    if (filterLoc === "warehouse" && !warehouseSet.has(p.id)) return false;
    if (filterLoc === "unplaced"  && (displaySet.has(p.id) || warehouseSet.has(p.id))) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q)
      || (p.sku ?? "").toLowerCase().includes(q)
      || p.category.toLowerCase().includes(q)
      || (p.color ?? "").toLowerCase().includes(q)
      || (p.size ?? "").toLowerCase().includes(q)
      || (p.notes ?? "").toLowerCase().includes(q)
    );
  }), [products, search, filterCat, filterColor, filterSize, filterStock, filterLoc, displaySet, warehouseSet]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "mc": {
          const ma = parseMCFromNotes(a.notes) ?? "";
          const mb = parseMCFromNotes(b.notes) ?? "";
          const na = parseInt(ma.replace(/\D/g, "") || "999999", 10);
          const nb = parseInt(mb.replace(/\D/g, "") || "999999", 10);
          return na !== nb ? (na - nb) * dir : a.name.localeCompare(b.name);
        }
        case "name":  return a.name.localeCompare(b.name) * dir;
        case "price": return ((a.price ?? 0) - (b.price ?? 0)) * dir;
        case "qty":   return (a.quantity - b.quantity) * dir;
        case "size":  return (a.size ?? "").localeCompare(b.size ?? "") * dir;
        case "color": return (a.color ?? "").localeCompare(b.color ?? "") * dir;
        default:      return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    const p = new URLSearchParams(searchParams.toString());
    if (sortKey === key) {
      const next = sortDir === "asc" ? "desc" : "asc";
      if (next === "asc") p.delete("dir"); else p.set("dir", next);
    } else {
      p.set("sort", key);
      p.delete("dir");
    }
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  const allSelected = sorted.length > 0 && sorted.every(p => selected.has(p.id));

  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => allSelected ? setSelected(new Set()) : setSelected(new Set(sorted.map(p => p.id)));

  const handleOdooSync = async () => {
    setOdooSyncing(true); setOdooMsg(null);
    try {
      const data = await fetch("/api/odoo/sync", { method: "POST" }).then(r => r.json());
      if (data.ok) {
        // Also clean up any leftover bad products (category Khác or price 0)
        await fetch("/api/products/cleanup", { method: "POST" }).catch(() => {});
        // Reload full state (products + placements) so location map stays in sync
        await fetchDbState();
        setOdooMsg(`✓ Đồng bộ ${data.synced} sản phẩm`);
      } else {
        setOdooMsg(`Lỗi: ${data.error}`);
      }
    } catch { setOdooMsg("Không kết nối được Odoo"); }
    finally { setOdooSyncing(false); setTimeout(() => setOdooMsg(null), 5000); }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    setConfirmBulk(false); setSelected(new Set());
    useStore.getState().setProducts(useStore.getState().products.filter(p => !ids.includes(p.id)));
    const uid = useStore.getState().currentUser?.id ?? "";
    const res = await fetch("/api/products", { method: "DELETE", headers: { "Content-Type": "application/json", "x-user-id": uid }, body: JSON.stringify({ ids }) });
    if (!res.ok) await fetchProducts();
  };

  const hasActiveFilter = !!(filterCat || filterColor || filterSize || filterStock !== "all" || filterLoc !== "all");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px",
          background: cardBg, backdropFilter: isMobile ? "none" : "blur(10px)", WebkitBackdropFilter: isMobile ? "none" : "blur(10px)",
          border: `1px solid ${cardBorder}`, borderRadius: 12,
          padding: "0 12px", height: isMobile ? 46 : 38,
          boxShadow: "0 2px 8px rgba(12,26,46,0.05)",
          transition: "box-shadow 0.18s, border-color 0.18s",
        }}>
          <Search size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} strokeWidth={1.5} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tên, SKU, danh mục, màu..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 16, color: "var(--text-primary)", fontFamily: "inherit",
            }}
          />
          {search ? (
            <button onClick={() => setSearch("")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}>
              <X size={11} style={{ color: "var(--text-muted)" }} />
            </button>
          ) : (
            <button
              className="md:hidden"
              onClick={() => setShowSearchScanner(true)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}
            >
              <ScanLine size={14} style={{ color: "var(--blue)" }} strokeWidth={1.6} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(s => !s)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            height: isMobile ? 44 : 38, padding: "0 14px", borderRadius: 12, border: "1px solid",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            background: hasActiveFilter ? "rgba(14,165,233,0.08)" : "rgba(255,255,255,0.85)",
            borderColor: hasActiveFilter ? "rgba(14,165,233,0.4)" : "var(--border)",
            color: hasActiveFilter ? "var(--blue)" : "var(--text-secondary)",
          }}
        >
          <Filter size={13} strokeWidth={1.6} />
          {hasActiveFilter ? "Đang lọc" : "Lọc"}
          {hasActiveFilter && (
            <span style={{
              width: 18, height: 18, borderRadius: "50%",
              background: "var(--blue)", color: "#fff",
              fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            }}>!</span>
          )}
        </button>

        <button onClick={() => setShowScanner(true)} style={{
          display: "flex", alignItems: "center", gap: 6,
          height: isMobile ? 44 : 38, padding: "0 14px", borderRadius: 12,
          background: "rgba(255,255,255,0.85)", border: "1px solid var(--border)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          fontSize: 12, color: "var(--blue)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
          letterSpacing: "0.06em",
        }}>
          <ScanLine size={13} strokeWidth={1.5} /> QUÉT MÃ
        </button>

        <button onClick={handleOdooSync} disabled={odooSyncing} style={{
          display: "flex", alignItems: "center", gap: 6,
          height: isMobile ? 44 : 38, padding: "0 14px", borderRadius: 12,
          background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.3)",
          fontSize: 12, color: "#16a34a", cursor: odooSyncing ? "default" : "pointer",
          fontFamily: "inherit", fontWeight: 600, letterSpacing: "0.06em",
          opacity: odooSyncing ? 0.7 : 1,
        }}>
          <RefreshCw size={13} strokeWidth={1.5} className={odooSyncing ? "animate-spin" : ""} />
          {odooSyncing ? "ĐỒNG BỘ..." : "SYNC ODOO"}
        </button>

        {odooMsg && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{
              padding: "0 12px", height: 38, display: "flex", alignItems: "center",
              borderRadius: 12, fontSize: 11, fontWeight: 600,
              background: odooMsg.startsWith("✓") ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)",
              border: `1px solid ${odooMsg.startsWith("✓") ? "rgba(22,163,74,0.25)" : "rgba(220,38,38,0.2)"}`,
              color: odooMsg.startsWith("✓") ? "#16a34a" : "#dc2626",
            }}>
            {odooMsg}
          </motion.span>
        )}

        <button onClick={() => { playSound("modalOpen"); setShowAdd(true); }} style={{
          display: "flex", alignItems: "center", gap: 6,
          height: isMobile ? 44 : 38, padding: "0 16px", borderRadius: 12,
          background: "var(--blue)", border: "1px solid var(--blue-dark)",
          color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", letterSpacing: "0.06em",
          boxShadow: "0 2px 10px rgba(14,165,233,0.25)",
        }}>
          <Plus size={13} strokeWidth={2.5} /> THÊM SẢN PHẨM
        </button>
      </div>

      {/* ── Filter panel ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}
          >
            <div style={{
              display: "flex", flexDirection: "column", gap: 10,
              padding: "14px 16px", borderRadius: 14,
              background: "rgba(255,255,255,0.88)", border: "1px solid rgba(186,230,253,0.55)",
              backdropFilter: isMobile ? "none" : "blur(12px)", WebkitBackdropFilter: isMobile ? "none" : "blur(12px)",
              boxShadow: "0 2px 12px rgba(12,26,46,0.05)",
            }}>
              {/* Row 1: Tồn kho + Vị trí */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em", minWidth: 44 }}>Tồn:</span>
                {(["all","low","out"] as const).map(v => (
                  <button key={v} onClick={() => setFilterStock(v)} style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                    fontFamily: "inherit", fontWeight: filterStock === v ? 700 : 500,
                    background: filterStock === v
                      ? v === "out" ? "rgba(220,38,38,0.10)" : v === "low" ? "rgba(245,158,11,0.10)" : "rgba(14,165,233,0.10)"
                      : "rgba(255,255,255,0.6)",
                    border: `1px solid ${filterStock === v
                      ? v === "out" ? "rgba(220,38,38,0.35)" : v === "low" ? "rgba(245,158,11,0.35)" : "rgba(14,165,233,0.35)"
                      : "var(--border)"}`,
                    color: filterStock === v
                      ? v === "out" ? "#dc2626" : v === "low" ? "#b45309" : "var(--blue)"
                      : "var(--text-secondary)",
                  }}>
                    {v === "all" ? "Tất cả" : v === "low" ? "Sắp hết ≤5" : "Hết hàng"}
                  </button>
                ))}
                <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em", minWidth: 32 }}>Vị trí:</span>
                {(["all","display","warehouse","unplaced"] as const).map(v => (
                  <button key={v} onClick={() => setFilterLoc(v)} style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                    fontFamily: "inherit", fontWeight: filterLoc === v ? 700 : 500,
                    background: filterLoc === v ? "rgba(124,58,237,0.10)" : "rgba(255,255,255,0.6)",
                    border: `1px solid ${filterLoc === v ? "rgba(124,58,237,0.35)" : "var(--border)"}`,
                    color: filterLoc === v ? "#7c3aed" : "var(--text-secondary)",
                  }}>
                    {v === "all" ? "Tất cả" : v === "display" ? "Trưng bày" : v === "warehouse" ? "Kho" : "Chưa xếp"}
                  </button>
                ))}
              </div>

              {/* Row 2: Danh mục + Màu + Size */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em", minWidth: 44 }}>Danh mục:</span>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{
                  height: 30, borderRadius: 20, border: "1px solid var(--border)",
                  padding: "0 28px 0 12px", fontSize: 11,
                  color: filterCat ? "var(--blue)" : "var(--text-secondary)",
                  background: filterCat ? "rgba(14,165,233,0.06)" : "rgba(255,255,255,0.7)",
                  fontFamily: "inherit", cursor: "pointer", outline: "none", appearance: "none",
                }}>
                  <option value="">Tất cả</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Màu:</span>
                <select value={filterColor} onChange={e => setFilterColor(e.target.value)} style={{
                  height: 30, borderRadius: 20, border: "1px solid var(--border)",
                  padding: "0 12px", fontSize: 11,
                  color: filterColor ? "var(--blue)" : "var(--text-secondary)",
                  background: filterColor ? "rgba(14,165,233,0.06)" : "rgba(255,255,255,0.7)",
                  fontFamily: "inherit", cursor: "pointer", outline: "none", minWidth: 80,
                }}>
                  <option value="">Tất cả</option>
                  {colors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Size:</span>
                <select value={filterSize} onChange={e => setFilterSize(e.target.value)} style={{
                  height: 30, borderRadius: 20, border: "1px solid var(--border)",
                  padding: "0 12px", fontSize: 11,
                  color: filterSize ? "var(--blue)" : "var(--text-secondary)",
                  background: filterSize ? "rgba(14,165,233,0.06)" : "rgba(255,255,255,0.7)",
                  fontFamily: "inherit", cursor: "pointer", outline: "none", minWidth: 70,
                }}>
                  <option value="">Tất cả</option>
                  {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {hasActiveFilter && (
                  <button onClick={() => router.replace(pathname, { scroll: false })} style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 10, cursor: "pointer",
                    background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)",
                    color: "#dc2626", fontFamily: "inherit", fontWeight: 600,
                  }}>
                    ✕ Xoá bộ lọc
                  </button>
                )}

                <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  <b style={{ color: "var(--text-secondary)" }}>{sorted.length}</b> / {products.length} sản phẩm
                </span>
              </div>

              {/* Row 3: Sort */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", paddingTop: 2, borderTop: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em", minWidth: 44 }}>Sắp xếp:</span>
                {([
                  { key: "mc"    as SortKey, label: "Mã MC" },
                  { key: "name"  as SortKey, label: "Tên" },
                  { key: "price" as SortKey, label: "Giá" },
                  { key: "qty"   as SortKey, label: "Số lượng" },
                  { key: "color" as SortKey, label: "Màu" },
                  { key: "size"  as SortKey, label: "Size" },
                ]).map(({ key, label }) => (
                  <button key={key} onClick={() => toggleSort(key)} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                    fontFamily: "inherit", fontWeight: sortKey === key ? 700 : 500,
                    background: sortKey === key ? "rgba(14,165,233,0.10)" : "rgba(255,255,255,0.6)",
                    border: `1px solid ${sortKey === key ? "rgba(14,165,233,0.35)" : "var(--border)"}`,
                    color: sortKey === key ? "var(--blue)" : "var(--text-secondary)",
                  }}>
                    {label}
                    {sortKey === key
                      ? sortDir === "asc" ? <ArrowUp size={9} /> : <ArrowDown size={9} />
                      : <ArrowUpDown size={9} style={{ opacity: 0.4 }} />
                    }
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk action bar ───────────────────────────────────────── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
              borderRadius: 12, background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.2)",
            }}>
              <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>
                {selected.size} sản phẩm được chọn
              </span>
              <div style={{ flex: 1 }} />
              <button onClick={() => setSelected(new Set())} style={{
                fontSize: 10, color: "var(--text-muted)", background: "none", border: "none",
                cursor: "pointer", fontFamily: "inherit",
              }}>Bỏ chọn</button>
              <button onClick={() => setConfirmBulk(true)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 8, border: "1px solid #b91c1c",
                background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                <Trash2 size={10} /> XOÁ {selected.size} MỤC
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop table ─────────────────────────────────────────── */}
      {!isMobile && <div style={{
        borderRadius: 16,
        background: cardBg,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${cardBorder}`,
        overflowX: "auto",
        boxShadow: "0 2px 16px rgba(12,26,46,0.07), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
          <colgroup>
            <col style={{ width: 32 }} />
            {/* Name: auto — stretches to fill remaining space */}
            <col />
            <col style={{ width: 60 }} />   {/* Color */}
            <col style={{ width: 140 }} />  {/* Barcode */}
            <col style={{ width: 72 }} />   {/* MC */}
            <col style={{ width: 110 }} />  {/* Full Price */}
            <col style={{ width: 110 }} />  {/* Giá Sale */}
            <col style={{ width: 48 }} />   {/* Size */}
            <col style={{ width: 52 }} />   {/* SL */}
            <col style={{ width: 88 }} />   {/* Actions */}
          </colgroup>
          <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
            <tr style={{
              background: tableHeaderBg,
              borderBottom: "1px solid rgba(186,230,253,0.5)",
            }}>
              <th style={{ padding: "0 0 0 16px", height: 34, textAlign: "left" }}>
                <button onClick={toggleAll} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  {allSelected
                    ? <CheckSquare size={13} style={{ color: "var(--blue)" }} />
                    : <Square size={13} style={{ color: "var(--border)" }} />}
                </button>
              </th>
              {([
                { label: "Tên SP",     key: "name"  as SortKey | null },
                { label: "Màu",        key: "color" as SortKey | null },
                { label: "Barcode",    key: null },
                { label: "MC",         key: "mc"    as SortKey | null },
                { label: "Full Price", key: "price" as SortKey | null },
                { label: "Giá Sale",   key: null },
                { label: "Size",       key: "size"  as SortKey | null },
                { label: "SL",         key: "qty"   as SortKey | null },
                { label: "",           key: null },
              ]).map((h, i) => (
                <th key={i} style={{
                  padding: "0 8px", height: 34, textAlign: "left",
                  fontSize: 8, fontWeight: 700, color: h.key === sortKey ? "var(--blue)" : "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.18em",
                  whiteSpace: "nowrap", cursor: h.key ? "pointer" : "default",
                  userSelect: "none",
                }}
                onClick={() => h.key && toggleSort(h.key)}
                >
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    {h.label}
                    {h.key && <SortIcon col={h.key} sortKey={sortKey} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
          {sorted.length === 0 ? (
            <tr><td colSpan={10} style={{ padding: "56px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
              Không tìm thấy sản phẩm nào
            </td></tr>
          ) : sorted.map((p) => {
            const loc      = locationMap.get(p.id) ?? null;
            const isHov    = hoveredId === p.id;
            const isSel    = selected.has(p.id);
            const inDisp   = displaySet.has(p.id);
            const inWh     = warehouseSet.has(p.id);
            const mc       = parseMCFromNotes(p.notes);
            const colorHex = colorCodeToHex(p.color);
            const hasSale  = !!p.markdownPrice;

            return (
              <tr
                key={p.id}
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: isSel
                    ? "rgba(220,38,38,0.03)"
                    : isHov ? "rgba(14,165,233,0.03)" : "transparent",
                  transition: "background 0.1s",
                }}
              >
                {/* Checkbox */}
                <td style={{ padding: "0 0 0 16px", height: 46 }}>
                  <button onClick={() => toggleSelect(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    {isSel
                      ? <CheckSquare size={13} style={{ color: "#dc2626" }} />
                      : <Square size={13} style={{ color: isHov ? "var(--border)" : "transparent" }} />}
                  </button>
                </td>

                {/* Name + location */}
                <td style={{ padding: "0 8px 0 8px", maxWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </p>
                  {loc ? (
                    <p style={{ fontSize: 8, color: "var(--blue)", marginTop: 2, display: "flex", alignItems: "center", gap: 2 }}>
                      <MapPin size={7} /> {loc}
                    </p>
                  ) : (
                    <p style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 2 }}>{p.category}</p>
                  )}
                </td>

                {/* Color */}
                <td style={{ padding: "0 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 11, height: 11, borderRadius: "50%", flexShrink: 0,
                      background: colorHex ?? "#e2e8f0",
                      border: "1.5px solid rgba(0,0,0,0.1)",
                      boxShadow: colorHex ? `0 0 0 2px ${colorHex}22` : "none",
                    }} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: p.color ? "var(--text-primary)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                      {p.color ?? "—"}
                    </span>
                  </div>
                </td>

                {/* Barcode */}
                <td style={{ padding: "0 8px" }}>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {p.sku ?? "—"}
                  </span>
                </td>

                {/* MC */}
                <td style={{ padding: "0 8px" }}>
                  {mc ? (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: "var(--blue)",
                      background: "rgba(14,165,233,0.08)", padding: "2px 6px",
                      borderRadius: 6, display: "inline-block",
                      border: "1px solid rgba(14,165,233,0.2)",
                    }}>{mc}</span>
                  ) : (
                    <span style={{ fontSize: 9, color: "var(--border)" }}>—</span>
                  )}
                </td>

                {/* Full Price */}
                <td style={{ padding: "0 8px" }}>
                  <span style={{ fontSize: 9, color: hasSale ? "var(--text-muted)" : "var(--text-secondary)", textDecoration: hasSale ? "line-through" : "none" }}>
                    {fmtPrice(p.price)}
                  </span>
                </td>

                {/* Sale Price */}
                <td style={{ padding: "0 8px" }}>
                  {hasSale ? (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626" }}>
                      {fmtPrice(p.markdownPrice)}
                    </span>
                  ) : (
                    <span style={{ fontSize: 9, color: "var(--border)" }}>—</span>
                  )}
                </td>

                {/* Size */}
                <td style={{ padding: "0 8px" }}>
                  <span style={{ fontSize: 10, color: p.size ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {p.size ?? "—"}
                  </span>
                </td>

                {/* Qty */}
                <td style={{ padding: "0 8px" }}>
                  <QtyPill qty={p.quantity} />
                </td>

                {/* Actions */}
                <td style={{ padding: "0 16px 0 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                  {inDisp && (
                    <button
                      onClick={() => navigateToBoard(router, p.id, "display")}
                      title="Xem vị trí trưng bày"
                      style={{
                        width: 26, height: 26, borderRadius: 8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid rgba(181,242,61,0.35)",
                        background: "rgba(181,242,61,0.06)",
                        cursor: "pointer",
                      }}>
                      <Eye size={10} style={{ color: "#b5f23d" }} />
                    </button>
                  )}
                  {inWh && (
                    <button
                      onClick={() => navigateToBoard(router, p.id, "warehouse")}
                      title="Xem vị trí kho"
                      style={{
                        width: 26, height: 26, borderRadius: 8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid rgba(14,165,233,0.4)",
                        background: "rgba(14,165,233,0.08)",
                        cursor: "pointer",
                      }}>
                      <Warehouse size={10} style={{ color: "var(--blue)" }} />
                    </button>
                  )}
                  <button
                    onClick={() => { playSound("modalOpen"); setEditProduct(p); }}
                    style={{
                      width: 26, height: 26, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1px solid ${isHov ? "var(--border)" : "transparent"}`,
                      background: "transparent", cursor: "pointer",
                    }}>
                    <Pencil size={10} style={{ color: isHov ? "var(--blue)" : "transparent" }} />
                  </button>
                  <button
                    onClick={() => { playSound("tap"); setDeleteId(p.id); }}
                    style={{
                      width: 26, height: 26, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1px solid ${isHov ? "rgba(220,38,38,0.25)" : "transparent"}`,
                      background: "transparent", cursor: "pointer",
                    }}>
                    <Trash2 size={10} style={{ color: isHov ? "#dc2626" : "transparent" }} />
                  </button>
                </div>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>}

      {/* ── Mobile cards ──────────────────────────────────────────── */}
      {isMobile && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map(p => {
          const loc      = locationMap.get(p.id) ?? null;
          const mc       = parseMCFromNotes(p.notes);
          const colorHex = colorCodeToHex(p.color);
          const inDisp   = displaySet.has(p.id);
          const inWh     = warehouseSet.has(p.id);
          const isLow    = p.quantity > 0 && p.quantity <= 3;
          const isOut    = p.quantity === 0;
          return (
            <div key={p.id} style={{
              borderRadius: 16,
              background: cardBg,
              border: `1px solid ${isOut ? "rgba(220,38,38,0.18)" : isLow ? "rgba(234,88,12,0.18)" : cardBorder}`,
              boxShadow: "0 2px 12px rgba(12,26,46,0.07), inset 0 1px 0 rgba(255,255,255,0.8)",
              overflow: "hidden",
            }}>
              {/* Top row: name + qty */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 14px 10px" }}>
                {/* Color bar on left */}
                {colorHex && (
                  <div style={{
                    width: 4, borderRadius: 4, flexShrink: 0, alignSelf: "stretch",
                    background: colorHex, opacity: 0.85, minHeight: 40,
                  }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>
                    {p.name}
                  </p>
                  {/* Tags row */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 6px" }}>
                    {mc && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", background: "rgba(14,165,233,0.10)", padding: "2px 7px", borderRadius: 6, border: "1px solid rgba(14,165,233,0.20)" }}>
                        {mc}
                      </span>
                    )}
                    {p.size && (
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "rgba(0,0,0,0.04)", padding: "2px 7px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.07)" }}>
                        {p.size}
                      </span>
                    )}
                    {p.color && (
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "rgba(0,0,0,0.04)", padding: "2px 7px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.07)" }}>
                        {p.color}
                      </span>
                    )}
                    {p.category && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)", padding: "2px 0" }}>
                        {p.category}
                      </span>
                    )}
                  </div>
                </div>
                {/* Qty — large, easy to read */}
                <div style={{ flexShrink: 0, textAlign: "center" }}>
                  <div style={{
                    minWidth: 44, height: 44, borderRadius: 12, padding: "0 8px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isOut ? "rgba(220,38,38,0.08)" : isLow ? "rgba(234,88,12,0.08)" : p.quantity <= 5 ? "rgba(245,158,11,0.10)" : "rgba(22,163,74,0.07)",
                    border: `1.5px solid ${isOut ? "rgba(220,38,38,0.25)" : isLow ? "rgba(234,88,12,0.25)" : p.quantity <= 5 ? "rgba(245,158,11,0.25)" : "rgba(22,163,74,0.20)"}`,
                  }}>
                    <span style={{
                      fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                      color: isOut ? "#dc2626" : isLow ? "#ea580c" : p.quantity <= 5 ? "#c9a55a" : "#16a34a",
                      lineHeight: 1,
                    }}>{p.quantity}</span>
                  </div>
                  <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3, letterSpacing: "0.02em" }}>SL</p>
                </div>
              </div>

              {/* Price + SKU + location row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px 10px", paddingLeft: colorHex ? 30 : 14 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {p.markdownPrice ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#dc2626" }}>{fmtPrice(p.markdownPrice)}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "line-through" }}>{fmtPrice(p.price)}</span>
                    </div>
                  ) : p.price ? (
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>{fmtPrice(p.price)}</span>
                  ) : null}
                  {p.sku && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace", background: "rgba(0,0,0,0.04)", padding: "1px 6px", borderRadius: 4 }}>
                      {p.sku}
                    </span>
                  )}
                </div>
                {loc && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <MapPin size={10} style={{ color: "var(--blue)", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "var(--blue)", fontWeight: 600 }}>{loc}</span>
                  </div>
                )}
              </div>

              {/* Action bar — full width, easy tap */}
              <div style={{
                display: "flex", borderTop: `1px solid ${cardBorder}`,
                background: "rgba(255,255,255,0.03)",
              }}>
                {inDisp && (
                  <button onClick={() => navigateToBoard(router, p.id, "display")} style={{
                    flex: 1, height: 44, border: "none", borderRight: `1px solid ${cardBorder}`,
                    background: "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    <Eye size={13} style={{ color: "#b5f23d" }} />
                    <span style={{ fontSize: 11, color: "#b5f23d", fontWeight: 600 }}>Trưng bày</span>
                  </button>
                )}
                {inWh && (
                  <button onClick={() => navigateToBoard(router, p.id, "warehouse")} style={{
                    flex: 1, height: 44, border: "none", borderRight: `1px solid ${cardBorder}`,
                    background: "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    <Warehouse size={13} style={{ color: "var(--blue)" }} />
                    <span style={{ fontSize: 11, color: "var(--blue)", fontWeight: 600 }}>Kho</span>
                  </button>
                )}
                <button onClick={() => { playSound("modalOpen"); setEditProduct(p); }} style={{
                  flex: 1, height: 44, border: "none", borderRight: `1px solid ${cardBorder}`,
                  background: "transparent", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}>
                  <Pencil size={13} style={{ color: "var(--blue)" }} />
                  <span style={{ fontSize: 11, color: "var(--blue)", fontWeight: 600 }}>Sửa</span>
                </button>
                <button onClick={() => { playSound("tap"); setDeleteId(p.id); }} style={{
                  flex: "0 0 52px", height: 44, border: "none",
                  background: "transparent", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Trash2 size={14} style={{ color: "#dc2626" }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>}

      {/* ── Modals ────────────────────────────────────────────────── */}
      {(showAdd || !!editProduct) && (
        <ProductFormModal product={editProduct} onClose={() => { setShowAdd(false); setEditProduct(null); }} />
      )}
      <QRScannerModal open={showScanner} onClose={() => setShowScanner(false)} />
      <AnimatePresence>
        {showSearchScanner && (
          <SearchScanner
            onResult={code => { setSearch(code); setShowSearchScanner(false); }}
            onClose={() => setShowSearchScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* Single delete */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(12,26,46,0.3)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 20, padding: 28, maxWidth: 360, width: "100%", border: "1px solid rgba(220,38,38,0.2)", boxShadow: "0 24px 64px rgba(12,26,46,0.18), inset 0 1px 0 rgba(255,255,255,0.9)" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Xác nhận xoá?</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>Thao tác này không thể hoàn tác.</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { playSound("softTap"); setDeleteId(null); }} style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-surface)", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Huỷ</button>
                <button onClick={async () => { playSound("destroy"); await deleteProduct(deleteId); setDeleteId(null); }} style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid #b91c1c", background: "#dc2626", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Xoá</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk delete */}
      <AnimatePresence>
        {confirmBulk && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(12,26,46,0.3)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 20, padding: 28, maxWidth: 380, width: "100%", border: "1px solid rgba(220,38,38,0.2)", boxShadow: "0 24px 64px rgba(12,26,46,0.18), inset 0 1px 0 rgba(255,255,255,0.9)" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Xoá {selected.size} sản phẩm?</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>Tất cả sản phẩm đã chọn sẽ bị xoá vĩnh viễn. Không thể hoàn tác.</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setConfirmBulk(false)} style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-surface)", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Huỷ</button>
                <button onClick={handleBulkDelete} style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid #b91c1c", background: "#dc2626", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Xoá {selected.size} mục</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stats header (client — reads live Zustand after hydration) ───────────────

type StatChip = { label: string; value: number | string; color: string };

function StatChips({ initial }: { initial: StatChip[] }) {
  const products = useStore(sel.products);

  // Use live Zustand data once hydrated, fall back to SSR initial values
  const chips: StatChip[] = products.length > 0
    ? (() => {
        const totalValue = products.reduce((s, p) => s + ((p.markdownPrice ?? p.price) || 0) * p.quantity, 0);
        const totalQty   = products.reduce((s, p) => s + p.quantity, 0);
        const onSale     = products.filter(p => !!p.markdownPrice).length;
        return [
          { label: "SKU",       value: products.length,                                                              color: "var(--blue)" },
          { label: "Tổng tồn",  value: totalQty,                                                                    color: "#7c3aed" },
          { label: "Giá trị",   value: totalValue >= 1e9 ? `${(totalValue/1e9).toFixed(2)}Tỷ` : `${fmt(Math.round(totalValue/1e6))}M`, color: "var(--gold)" },
          { label: "Đang sale", value: onSale,                                                                       color: "#dc2626" },
        ];
      })()
    : initial;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {chips.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 + i * 0.04 }}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "6px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(186,230,253,0.65)",
            boxShadow: "0 2px 8px rgba(12,26,46,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, boxShadow: `0 0 4px ${s.color}80` }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
            {typeof s.value === "number" ? fmt(s.value) : s.value}
          </span>
          <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {s.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Page (receives SSR-fetched stats as props) ────────────────────────────────

export default function InventoryClient({ initialStats }: { initialStats?: StatChip[] }) {
  const ssrStats: StatChip[] = initialStats ?? [
    { label: "SKU",       value: 0, color: "var(--blue)" },
    { label: "Tổng tồn",  value: 0, color: "#7c3aed" },
    { label: "Giá trị",   value: "—", color: "var(--gold)" },
    { label: "Đang sale", value: 0, color: "#dc2626" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}
        style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.38em" }}>
            Quản Lý Cửa Hàng · ALDO
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 300, color: "var(--text-primary)", letterSpacing: "0.04em", marginTop: 4, lineHeight: 1.2 }}>
            Kho Hàng
          </h1>
        </div>
        <StatChips initial={ssrStats} />
      </motion.div>

      <Suspense fallback={null}>
        <ListView />
      </Suspense>
    </div>
  );
}
