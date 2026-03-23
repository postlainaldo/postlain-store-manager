"use client";

import {
  useState, useEffect, useMemo, useCallback, useRef, memo,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Search, X, Package, Eye, Layers,
  LayoutGrid, ChevronDown, ChevronUp, Warehouse,
  MapPin, Check, ChevronLeft, ChevronRight,
  Camera, ScanLine, ShoppingBag, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import type { Product, StoreSection, WarehouseShelf } from "@/types";

// ─── Subtab type ──────────────────────────────────────────────────────────────
type Subtab = "display" | "warehouse";

// ─── Zone color config ────────────────────────────────────────────────────────
const ZONE_CFG: Record<string, { color: string }> = {
  wall_woman:   { color: "#0ea5e9" },
  wall_man:     { color: "#0284c7" },
  center_woman: { color: "#38bdf8" },
  center_man:   { color: "#075985" },
  acc:          { color: "#10b981" },
  window:       { color: "#C9A55A" },
};

const CAT_DOT: Record<string, string> = {
  "Giày nữ":   "#0ea5e9", "Giày nam":   "#0284c7",
  "Bốt nữ":    "#38bdf8", "Bốt nam":    "#075985",
  "Sandal nữ": "#7dd3fc", "Sandal nam": "#0369a1",
  "Túi nữ":    "#10b981", "Túi nam":    "#059669",
  "Phụ kiện":  "#C9A55A",
};

const ALL_CATEGORIES = [
  "Giày nữ", "Giày nam", "Bốt nữ", "Bốt nam",
  "Sandal nữ", "Sandal nam", "Túi nữ", "Túi nam", "Phụ kiện",
];

function catColor(cat: string) { return CAT_DOT[cat] ?? "#64748b"; }

// ─── Barcode fuzzy match ──────────────────────────────────────────────────────
// Strips or pads leading zeros to match barcodes that differ only in zero-padding
function findProductByCode(products: Product[], code: string): Product | null {
  const raw = code.trim();

  // 1. Exact SKU match (case-insensitive)
  let match = products.find(p => p.sku && p.sku.trim().toLowerCase() === raw.toLowerCase());
  if (match) return match;

  // 2. Exact name match
  match = products.find(p => p.name.toLowerCase() === raw.toLowerCase());
  if (match) return match;

  // 3. Numeric fuzzy: strip all leading zeros from both sides, compare
  const norm = raw.replace(/^0+/, "") || "0";
  match = products.find(p => {
    if (!p.sku) return false;
    const skuNorm = p.sku.trim().replace(/^0+/, "") || "0";
    return skuNorm === norm;
  });
  if (match) return match;

  // 4. Substring SKU match (barcode contains more info, SKU is inside)
  match = products.find(p => p.sku && raw.toLowerCase().includes(p.sku.trim().toLowerCase()));
  if (match) return match;

  // 5. SKU is a prefix of the scanned code (e.g. SKU "12345" vs code "12345-01")
  match = products.find(p => p.sku && raw.toLowerCase().startsWith(p.sku.trim().toLowerCase()));
  if (match) return match;

  return null;
}

// ─── QR Scan Modal ────────────────────────────────────────────────────────────

function QRScanModal({
  open,
  onClose,
  onScan,
  slotLabel,
  notFoundCode,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  slotLabel?: string;
  notFoundCode?: string | null;
}) {
  const [scanning, setScanning] = useState(false);
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startScan = async () => {
    setErrorMsg(null);
    setScannedValue(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
    } catch {
      setErrorMsg("Không thể truy cập camera. Vui lòng cấp quyền camera.");
    }
  };

  const stopScan = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const handleScan = useCallback((code: string) => {
    stopScan();
    setScannedValue(code);
    onScan(code);
  }, [stopScan, onScan]);

  useEffect(() => {
    if (!scanning) return;
    let raf: number;
    let zxingReader: { decodeFromVideoElement: (el: HTMLVideoElement) => Promise<{ getText(): string }> } | null = null;
    let jsQRFn: ((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;

    // Init detectors once
    const initDetectors = async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        zxingReader = new BrowserMultiFormatReader() as unknown as typeof zxingReader;
      } catch { /* not available */ }
      try {
        const mod = await import("jsqr");
        jsQRFn = mod.default as unknown as typeof jsQRFn;
      } catch { /* not available */ }
    };

    // Build native BarcodeDetector if available
    type NativeDetector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
    let nativeDetector: NativeDetector | null = null;
    try {
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        const BD = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => NativeDetector }).BarcodeDetector;
        nativeDetector = new BD({ formats: ["qr_code","ean_13","ean_8","code_128","code_39","upc_a","upc_e","data_matrix","aztec"] });
      }
    } catch { /* not available */ }

    const tick = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState >= video.HAVE_ENOUGH_DATA) {
        // 1. Native BarcodeDetector
        if (nativeDetector) {
          try {
            const results = await nativeDetector.detect(video);
            if (results.length > 0) { handleScan(results[0].rawValue); return; }
          } catch { /* ignore */ }
        }

        // 2. zxing (all formats, all browsers)
        if (zxingReader) {
          try {
            const result = await zxingReader.decodeFromVideoElement(video);
            if (result) { handleScan(result.getText()); return; }
          } catch { /* NotFoundException = no barcode, normal */ }
        }

        // 3. jsqr canvas fallback (QR only)
        if (jsQRFn) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQRFn(img.data, img.width, img.height);
            if (code) { handleScan(code.data); return; }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    initDetectors().then(() => { raf = requestAnimationFrame(tick); });
    return () => cancelAnimationFrame(raf);
  }, [scanning, handleScan]);

  // Stop stream when modal closes
  useEffect(() => {
    if (!open) {
      stopScan();
      setScannedValue(null);
      setErrorMsg(null);
    }
  }, [open, stopScan]);

  // When parent signals not found, clear scannedValue to show warning instead of green tick
  useEffect(() => {
    if (notFoundCode) setScannedValue(null);
  }, [notFoundCode]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={e => { if (e.target === e.currentTarget) { stopScan(); onClose(); } }}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(12,26,46,0.72)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: "#ffffff", borderRadius: 20,
              width: "100%", maxWidth: 420,
              overflow: "hidden",
              boxShadow: "0 24px 64px rgba(12,26,46,0.28)",
            }}
          >
            {/* Modal header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid #bae6fd",
              background: "#f0f9ff",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "linear-gradient(135deg, #0c1a2e, #0ea5e9)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Camera size={16} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0c1a2e" }}>Quét QR / Barcode</p>
                  <p style={{ fontSize: 10, color: slotLabel ? "#C9A55A" : "#64748b", marginTop: 1, fontWeight: slotLabel ? 600 : 400 }}>
                    {slotLabel ? `→ Đặt vào ${slotLabel}` : "Hướng camera vào mã sản phẩm"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { stopScan(); onClose(); }}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "#e0f2fe", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={14} style={{ color: "#0c1a2e" }} />
              </button>
            </div>

            {/* Camera area */}
            <div style={{ padding: 20 }}>
              <div style={{
                position: "relative", borderRadius: 16, overflow: "hidden",
                background: "#0c1a2e", aspectRatio: "4/3",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{
                    width: "100%", height: "100%", objectFit: "cover",
                    display: scanning ? "block" : "none",
                  }}
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {!scanning && !scannedValue && (
                  <div style={{ textAlign: "center", padding: 24 }}>
                    <ScanLine size={40} style={{ color: "#0ea5e9", marginBottom: 12, opacity: 0.8 }} />
                    <p style={{ color: "#94a3b8", fontSize: 12 }}>Camera chưa bật</p>
                  </div>
                )}

                {scanning && (
                  <motion.div
                    animate={{ y: ["-40%", "40%", "-40%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{
                      position: "absolute", left: "10%", right: "10%",
                      height: 2, background: "rgba(14,165,233,0.8)",
                      borderRadius: 2,
                      boxShadow: "0 0 8px rgba(14,165,233,0.6)",
                    }}
                  />
                )}

                {scanning && (
                  <>
                    {/* Corner brackets */}
                    {[
                      { top: 16, left: 16, borderTop: "2px solid #C9A55A", borderLeft: "2px solid #C9A55A" },
                      { top: 16, right: 16, borderTop: "2px solid #C9A55A", borderRight: "2px solid #C9A55A" },
                      { bottom: 16, left: 16, borderBottom: "2px solid #C9A55A", borderLeft: "2px solid #C9A55A" },
                      { bottom: 16, right: 16, borderBottom: "2px solid #C9A55A", borderRight: "2px solid #C9A55A" },
                    ].map((s, i) => (
                      <div key={i} style={{ position: "absolute", width: 24, height: 24, borderRadius: 2, ...s }} />
                    ))}
                  </>
                )}

                {scannedValue && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      position: "absolute", inset: 0,
                      background: "rgba(16,185,129,0.15)",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={24} color="#fff" />
                    </div>
                    <p style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Đã quét!</p>
                    <p style={{ color: "#d1fae5", fontSize: 11 }}>{scannedValue}</p>
                  </motion.div>
                )}
              </div>

              {/* Error */}
              {errorMsg && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 10, marginTop: 12,
                  background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)",
                }}>
                  <AlertCircle size={14} style={{ color: "#dc2626", flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: "#dc2626" }}>{errorMsg}</p>
                </div>
              )}

              {/* Not found warning */}
              {notFoundCode && !scanning && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "10px 14px", borderRadius: 10, marginTop: 12,
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
                }}>
                  <AlertCircle size={14} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 11, color: "#92400e", fontWeight: 600 }}>Không tìm thấy sản phẩm</p>
                    <p style={{ fontSize: 10, color: "#b45309", marginTop: 2 }}>Mã: <span style={{ fontFamily: "monospace" }}>{notFoundCode}</span></p>
                    <p style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>Kiểm tra lại SKU trong dữ liệu hoặc quét lại mã khác</p>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                {!scanning ? (
                  <button
                    onClick={startScan}
                    style={{
                      flex: 1, height: 44, borderRadius: 12, border: "none",
                      background: "linear-gradient(135deg, #0c1a2e, #0ea5e9)",
                      color: "#fff", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 8, fontFamily: "inherit",
                    }}
                  >
                    <Camera size={16} />
                    Bật Camera
                  </button>
                ) : (
                  <button
                    onClick={stopScan}
                    style={{
                      flex: 1, height: 44, borderRadius: 12, border: "1px solid #bae6fd",
                      background: "#f0f9ff", color: "#0c1a2e", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 8, fontFamily: "inherit",
                    }}
                  >
                    <X size={16} />
                    Dừng
                  </button>
                )}
                <button
                  onClick={() => { stopScan(); onClose(); }}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: "1px solid #bae6fd",
                    background: "#ffffff", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "inherit",
                  }}
                >
                  <X size={16} style={{ color: "#64748b" }} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Product Pool Panel ────────────────────────────────────────────────────────

function PoolPanel({
  products,
  selectedPid,
  onSelect,
  mode,
  assignedIds,
  compact = false,
}: {
  products: Product[];
  selectedPid: string | null;
  onSelect: (pid: string | null) => void;
  mode: Subtab;
  assignedIds: Set<string>;
  compact?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"name" | "qty" | "unplaced">("unplaced");
  const [qrOpen, setQrOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const presentCats = useMemo(() => {
    const s = new Set(products.map(p => p.category));
    return ALL_CATEGORIES.filter(c => s.has(c));
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.filter(p =>
      (!activeCat || p.category === activeCat) &&
      (!search
        || p.name.toLowerCase().includes(search.toLowerCase())
        || (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
        || p.category.toLowerCase().includes(search.toLowerCase()))
    );
    if (sortMode === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    else if (sortMode === "qty") list = [...list].sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0));
    else list = [...list].sort((a, b) => {
      const aPlaced = assignedIds.has(a.id) ? 1 : 0;
      const bPlaced = assignedIds.has(b.id) ? 1 : 0;
      return aPlaced - bPlaced;
    });
    return list;
  }, [products, activeCat, search, sortMode, assignedIds]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 62,
    overscan: 6,
  });

  const accentColor = mode === "display" ? "#C9A55A" : "#10b981";

  const handleQrScan = useCallback((code: string) => {
    const match = findProductByCode(products, code);
    if (match) {
      onSelect(match.id);
      setQrOpen(false);
    }
    // if not found, keep modal open so user sees scanned value and can retry
  }, [products, onSelect]);

  const placedCount = assignedIds.size;
  const unplacedCount = products.length - placedCount;

  return (
    <div style={{
      width: compact ? "100%" : 260,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      background: "#ffffff",
      border: "1px solid #bae6fd",
      borderRadius: compact ? 0 : 16,
      padding: compact ? "12px 12px 0" : 12,
      overflow: "hidden",
      boxShadow: compact ? "none" : "0 1px 4px rgba(12,26,46,0.06)",
      height: compact ? "100%" : undefined,
    }}>
      <QRScanModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        onScan={handleQrScan}
      />

      {/* Header row */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#64748b", letterSpacing: "0.18em" }}>KHO SẢN PHẨM</p>
          <p style={{ fontSize: 10, color: "#0c1a2e", marginTop: 1 }}>
            <span style={{ color: accentColor, fontWeight: 700 }}>{placedCount}</span>
            <span style={{ color: "#94a3b8" }}> / {products.length} đã xếp</span>
          </p>
        </div>
        {/* QR scan button */}
        <button
          onClick={() => setQrOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: 10, border: "1px solid #bae6fd",
            background: "#f0f9ff", color: "#0c1a2e", fontSize: 10, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            transition: "all 0.15s",
          }}
          title="Quét QR / Barcode"
        >
          <Camera size={12} style={{ color: "#0ea5e9" }} />
          QR
        </button>
      </div>

      {/* Stats bar */}
      <div style={{
        flexShrink: 0, display: "flex", gap: 6,
        padding: "6px 8px", borderRadius: 10,
        background: "#f8fafc", border: "1px solid #e0f2fe",
      }}>
        {[
          { label: "Tổng", val: products.length, color: "#0c1a2e" },
          { label: "Đã xếp", val: placedCount, color: accentColor },
          { label: "Chưa xếp", val: unplacedCount, color: "#94a3b8" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</p>
            <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
        background: "#f0f9ff", border: "1px solid #bae6fd",
        borderRadius: 10, padding: "0 10px", height: 36,
      }}>
        <Search size={12} style={{ color: "#94a3b8", flexShrink: 0 }} strokeWidth={1.5} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tên, SKU, danh mục..."
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            fontSize: 11, color: "#0c1a2e", fontFamily: "inherit",
          }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <X size={10} style={{ color: "#94a3b8" }} />
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div style={{
        flexShrink: 0, display: "flex", gap: 5, overflowX: "auto",
        paddingBottom: 2,
        scrollbarWidth: "none",
      }}>
        <button
          onClick={() => setActiveCat(null)}
          style={{
            flexShrink: 0, padding: "4px 10px", borderRadius: 20,
            border: `1.5px solid ${activeCat === null ? "#0ea5e9" : "#bae6fd"}`,
            background: activeCat === null ? "#0ea5e9" : "#ffffff",
            color: activeCat === null ? "#ffffff" : "#64748b",
            fontSize: 9, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.12s",
          }}
        >
          Tất cả
        </button>
        {presentCats.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(activeCat === cat ? null : cat)}
            style={{
              flexShrink: 0, padding: "4px 10px", borderRadius: 20,
              border: `1.5px solid ${activeCat === cat ? catColor(cat) : "#bae6fd"}`,
              background: activeCat === cat ? `${catColor(cat)}18` : "#ffffff",
              color: activeCat === cat ? catColor(cat) : "#64748b",
              fontSize: 9, fontWeight: activeCat === cat ? 700 : 400,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: catColor(cat), flexShrink: 0 }} />
            {cat}
          </button>
        ))}
      </div>

      {/* Sort options */}
      <div style={{ flexShrink: 0, display: "flex", gap: 4 }}>
        {([
          { key: "unplaced", label: "Chưa xếp" },
          { key: "name",     label: "Tên A-Z"  },
          { key: "qty",      label: "Qty ↓"    },
        ] as const).map(s => (
          <button
            key={s.key}
            onClick={() => setSortMode(s.key)}
            style={{
              flex: 1, padding: "4px 4px", borderRadius: 8,
              border: `1px solid ${sortMode === s.key ? accentColor : "#e0f2fe"}`,
              background: sortMode === s.key ? `${accentColor}14` : "#f8fafc",
              color: sortMode === s.key ? accentColor : "#94a3b8",
              fontSize: 8.5, fontWeight: sortMode === s.key ? 700 : 400,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Selection hint */}
      <AnimatePresence>
        {selectedPid && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ flexShrink: 0, overflow: "hidden" }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 10px", background: "rgba(201,165,90,0.08)",
              borderRadius: 10, border: "1px solid rgba(201,165,90,0.35)",
            }}>
              <Check size={10} style={{ color: "#C9A55A", flexShrink: 0 }} />
              <p style={{ fontSize: 9, color: "#C9A55A", fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Đã chọn · Nhấn vào ô trống để đặt
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Virtual product list */}
      <div ref={parentRef} style={{ flex: 1, overflowY: "auto", paddingRight: 2, minHeight: 0 }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", marginTop: 32, fontSize: 11, color: "#94a3b8" }}>Không có sản phẩm</p>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map(vi => {
              const p = filtered[vi.index];
              const cc = catColor(p.category);
              const isSelected = selectedPid === p.id;
              const isPlaced = assignedIds.has(p.id);
              return (
                <div
                  key={vi.key}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${vi.start}px)`, paddingBottom: 5 }}
                >
                  <button
                    onClick={() => onSelect(isSelected ? null : p.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 10px", borderRadius: 12, cursor: "pointer",
                      border: isSelected ? `2px solid #C9A55A` : "1px solid #bae6fd",
                      background: isSelected ? "rgba(201,165,90,0.10)" : isPlaced ? "#f8fffe" : "#ffffff",
                      fontFamily: "inherit", textAlign: "left",
                      boxShadow: isSelected ? "0 0 0 3px rgba(201,165,90,0.18)" : "none",
                      transition: "all 0.12s",
                    }}
                  >
                    {/* Color swatch / thumbnail */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0, overflow: "hidden",
                      border: `1.5px solid ${isSelected ? "#C9A55A88" : `${cc}44`}`,
                      background: p.color ? `${p.color}22` : `${cc}22`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative",
                    }}>
                      {p.imagePath
                        ? <img src={p.imagePath} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 11, fontWeight: 700, color: cc, textTransform: "uppercase" }}>
                            {p.name.slice(0, 2)}
                          </span>
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 11, fontWeight: 600,
                        color: isSelected ? "#C9A55A" : "#0c1a2e",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {p.name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: cc, flexShrink: 0 }} />
                        <p style={{ fontSize: 9, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.sku ? <span style={{ color: "#0ea5e9", marginRight: 3 }}>{p.sku}</span> : null}
                          {p.category}
                        </p>
                      </div>
                    </div>

                    {/* Right badges */}
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      {(p.quantity ?? 0) > 0 && (
                        <span style={{
                          fontSize: 8.5, fontWeight: 700, padding: "1px 5px", borderRadius: 6,
                          background: "#0ea5e9", color: "#fff",
                        }}>
                          ×{p.quantity}
                        </span>
                      )}
                      {isPlaced && (
                        <span style={{
                          fontSize: 7.5, fontWeight: 700, padding: "1px 5px", borderRadius: 6,
                          background: `${accentColor}18`, color: accentColor, letterSpacing: "0.04em",
                        }}>
                          Đã xếp
                        </span>
                      )}
                      {isSelected && <Check size={12} style={{ color: "#C9A55A" }} />}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mobile Bottom Sheet Picker ────────────────────────────────────────────────

function MobilePickerSheet({
  open,
  onClose,
  products,
  selectedPid,
  onSelect,
  mode,
  assignedIds,
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
  selectedPid: string | null;
  onSelect: (pid: string | null) => void;
  mode: Subtab;
  assignedIds: Set<string>;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(12,26,46,0.5)",
            }}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 201,
              background: "#ffffff",
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              height: "75vh",
              display: "flex", flexDirection: "column",
              boxShadow: "0 -8px 40px rgba(12,26,46,0.18)",
              overflow: "hidden",
            }}
          >
            {/* Handle + header */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e0f2fe" }} />
              </div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "4px 16px 10px",
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0c1a2e" }}>Chọn sản phẩm</p>
                <button
                  onClick={onClose}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "#f0f9ff", border: "1px solid #bae6fd",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <X size={14} style={{ color: "#64748b" }} />
                </button>
              </div>
            </div>

            {/* Pool panel (compact mode, no border-radius, fills rest) */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <PoolPanel
                products={products}
                selectedPid={selectedPid}
                onSelect={pid => { onSelect(pid); if (pid) onClose(); }}
                mode={mode}
                assignedIds={assignedIds}
                compact
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Display Board: Store Slot ────────────────────────────────────────────────

function StoreSlot({
  pid, sId, subId, ri, si, onPlace, onRemove, highlightPid, products, selectedPid, onScanToPlace,
}: {
  pid: string | null; sId: string; subId: string; ri: number; si: number;
  onPlace: (sId: string, subId: string, ri: number, si: number) => void;
  onRemove: () => void;
  highlightPid: string | null;
  products: Product[];
  selectedPid: string | null;
  onScanToPlace?: (sId: string, subId: string, ri: number, si: number) => void;
}) {
  const [hov, setHov] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);

  const p  = useMemo(() => (pid ? products.find(x => x.id === pid) ?? null : null), [pid, products]);
  const cc = p ? catColor(p.category) : "transparent";
  const isHighlit = !!pid && pid === highlightPid;
  const isEmpty = !pid;
  const canPlace = isEmpty && !!selectedPid;
  const canScan  = isEmpty && !selectedPid && !!onScanToPlace;

  useEffect(() => {
    if (!isHighlit) return;
    const t = setTimeout(() => {
      slotRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => clearTimeout(t);
  }, [isHighlit]);

  if (isEmpty) {
    return (
      <div
        ref={slotRef}
        onClick={() => {
          if (canPlace) onPlace(sId, subId, ri, si);
          else if (canScan) onScanToPlace!(sId, subId, ri, si);
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: 48, height: 48, borderRadius: 10,
          border: `1.5px dashed ${canPlace && hov ? "#C9A55A" : canPlace ? "#0ea5e9" : canScan && hov ? "#C9A55A" : "#bae6fd"}`,
          background: canPlace && hov ? "rgba(201,165,90,0.12)" : canPlace ? "rgba(14,165,233,0.06)" : canScan && hov ? "rgba(201,165,90,0.08)" : "#f0f9ff",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: canPlace || canScan ? "pointer" : "default",
          transition: "all 0.12s",
          touchAction: "manipulation",
        }}
        title={canScan ? "Quét QR để đặt sản phẩm" : undefined}
      >
        {canPlace
          ? <div style={{ width: 10, height: 10, borderRadius: "50%", background: hov ? "#C9A55A" : "#0ea5e9", opacity: 0.8 }} />
          : canScan && hov
            ? <ScanLine size={12} style={{ color: "#C9A55A" }} />
            : <Package size={10} style={{ color: "#bae6fd" }} />
        }
      </div>
    );
  }

  return (
    <div
      ref={slotRef}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={isHighlit ? "slot-highlight" : undefined}
      style={{
        width: 48, height: 48, borderRadius: 10,
        border: `1.5px solid ${isHighlit ? "#C9A55A" : `${cc}66`}`,
        background: isHighlit ? "rgba(201,165,90,0.22)" : p!.color ? `${p!.color}22` : `${cc}18`,
        position: "relative", overflow: "hidden", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        touchAction: "manipulation",
      }}
    >
      {p!.imagePath
        ? <img src={p!.imagePath} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{
            fontSize: 10, color: isHighlit ? "#C9A55A" : cc, fontWeight: 700,
            textAlign: "center", padding: "0 2px", lineHeight: 1.2,
            textTransform: "uppercase",
          }}>
            {p!.name.slice(0, 2)}
          </span>
      }
      {/* Qty badge */}
      {(p!.quantity ?? 0) > 1 && (
        <span style={{
          position: "absolute", bottom: 2, right: 2,
          fontSize: 7, fontWeight: 700, background: "#0c1a2e",
          color: "#fff", borderRadius: 4, padding: "0 3px", lineHeight: "12px",
        }}>
          ×{p!.quantity}
        </span>
      )}
      <AnimatePresence>
        {hov && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.1 }}
            onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{
              position: "absolute", top: 2, right: 2, width: 16, height: 16,
              borderRadius: 5, background: "rgba(12,26,46,0.8)", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={8} color="#fff" />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {hov && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
              transform: "translateX(-50%)", zIndex: 50, pointerEvents: "none", whiteSpace: "nowrap",
            }}
          >
            <div style={{
              background: "#ffffff", border: "1px solid #bae6fd",
              borderRadius: 8, padding: "5px 10px",
              boxShadow: "0 4px 12px rgba(12,26,46,0.1)",
            }}>
              <p style={{ fontSize: 10, color: "#0c1a2e", fontWeight: 600 }}>{p!.name}</p>
              {p!.sku && <p style={{ fontSize: 8, color: "#0ea5e9", marginTop: 1 }}>{p!.sku}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Display Board: SubBlock ──────────────────────────────────────────────────

const SubBlock = memo(function SubBlock({
  section, subIdx, highlightPid, products, selectedPid, onPlace, placeInSection, onScanToPlace,
}: {
  section: StoreSection; subIdx: number; highlightPid: string | null;
  products: Product[];
  selectedPid: string | null;
  onPlace: (sId: string, subId: string, ri: number, si: number) => void;
  placeInSection: (sId: string, subId: string, ri: number, si: number, pid: string | null) => void;
  onScanToPlace?: (sId: string, subId: string, ri: number, si: number) => void;
}) {
  const sub = section.subsections[subIdx];
  const cfg = ZONE_CFG[section.sectionType] ?? { color: "#0ea5e9" };
  const total  = sub.rows.reduce((s, r) => s + r.products.length, 0);
  const filled = sub.rows.reduce((s, r) => s + r.products.filter(Boolean).length, 0);
  const pct    = total > 0 ? (filled / total) * 100 : 0;

  const reversedRows = [...sub.rows].reverse();

  return (
    <div style={{
      minWidth: 160, background: "#ffffff",
      border: "1px solid #bae6fd", borderRadius: 14, padding: 10,
      display: "flex", flexDirection: "column", gap: 6,
      boxShadow: "0 1px 3px rgba(12,26,46,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: cfg.color }}>{sub.name}</p>
        <span style={{ fontSize: 8, color: "#94a3b8" }}>{filled}/{total}</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "#e0f2fe", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: cfg.color, borderRadius: 2, transition: "width 0.3s" }} />
      </div>
      {reversedRows.map((row, revIdx) => {
        const ri = sub.rows.length - 1 - revIdx;
        if (row.type === "image") return (
          <div key={ri} style={{ height: 14, borderRadius: 5, background: "#f0f9ff", display: "flex", alignItems: "center", paddingLeft: 6 }}>
            <span style={{ fontSize: 6, color: "#94a3b8", letterSpacing: "0.2em" }}>TRANH</span>
          </div>
        );
        return (
          <div key={ri} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 6, width: 20, flexShrink: 0, color: "#94a3b8", fontFamily: "monospace" }}>
              {row.type === "long" ? "DÀI" : "N"}
            </span>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              {row.products.map((pid, si) => (
                <StoreSlot
                  key={si}
                  pid={pid} sId={section.id} subId={sub.id} ri={ri} si={si}
                  highlightPid={highlightPid}
                  products={products}
                  selectedPid={selectedPid}
                  onPlace={onPlace}
                  onRemove={() => placeInSection(section.id, sub.id, ri, si, null)}
                  onScanToPlace={onScanToPlace}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ─── Display Board: SectionGroup ─────────────────────────────────────────────

const SectionGroup = memo(function SectionGroup({
  section, highlightPid, products, selectedPid, onPlace, placeInSection, onScanToPlace,
}: {
  section: StoreSection; highlightPid: string | null;
  products: Product[];
  selectedPid: string | null;
  onPlace: (sId: string, subId: string, ri: number, si: number) => void;
  placeInSection: (sId: string, subId: string, ri: number, si: number, pid: string | null) => void;
  onScanToPlace?: (sId: string, subId: string, ri: number, si: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const cfg = ZONE_CFG[section.sectionType] ?? { color: "#0ea5e9" };
  const secFilled = section.subsections.reduce((s, sub) => s + sub.rows.reduce((rs, r) => rs + r.products.filter(Boolean).length, 0), 0);
  const secTotal  = section.subsections.reduce((s, sub) => s + sub.rows.reduce((rs, r) => rs + r.products.length, 0), 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <div style={{ width: 3, height: 16, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: cfg.color }}>{section.name}</p>
        <div style={{ flex: 1, height: 1, background: "#e0f2fe" }} />
        <span style={{ fontSize: 9, color: "#94a3b8" }}>{secFilled}/{secTotal}</span>
        {open ? <ChevronUp size={11} style={{ color: "#94a3b8" }} /> : <ChevronDown size={11} style={{ color: "#94a3b8" }} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: "hidden" }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 4 }}>
              {section.subsections.map((sub, si) => (
                <SubBlock
                  key={sub.id} section={section} subIdx={si}
                  highlightPid={highlightPid}
                  products={products}
                  selectedPid={selectedPid}
                  onPlace={onPlace}
                  placeInSection={placeInSection}
                  onScanToPlace={onScanToPlace}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── Warehouse: WBin ──────────────────────────────────────────────────────────

const TIER_LABELS_W = ["Tầng 4", "Tầng 3", "Tầng 2", "Tầng 1"];
const COLS = 5;

function WBin({
  shelfId, ti, si, pid, products, highlightPid, selectedPid,
  onPlace, onRemove, onScanToPlace,
}: {
  shelfId: string; ti: number; si: number;
  pid: string | null; products: Product[];
  highlightPid: string | null;
  selectedPid: string | null;
  onPlace: (shelfId: string, ti: number, si: number) => void;
  onRemove: () => void;
  onScanToPlace?: (shelfId: string, ti: number, si: number) => void;
}) {
  const [hov, setHov] = useState(false);
  const binRef = useRef<HTMLDivElement>(null);
  const p         = pid ? products.find(x => x.id === pid) ?? null : null;
  const isHighlit = !!pid && pid === highlightPid;
  const cc        = p ? catColor(p.category) : "transparent";
  const canPlace  = !pid && !!selectedPid;
  const canScan   = !pid && !selectedPid && !!onScanToPlace;

  useEffect(() => {
    if (!isHighlit) return;
    const t = setTimeout(() => {
      binRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => clearTimeout(t);
  }, [isHighlit]);

  const borderColor = isHighlit ? "#C9A55A"
    : canPlace && hov ? "#C9A55A"
    : canPlace ? "#0ea5e9"
    : canScan && hov ? "#C9A55A"
    : pid ? `${cc}88`
    : "#bae6fd";

  const bgColor = isHighlit ? "rgba(201,165,90,0.28)"
    : canPlace && hov ? "rgba(201,165,90,0.12)"
    : canPlace ? "rgba(14,165,233,0.06)"
    : canScan && hov ? "rgba(201,165,90,0.08)"
    : pid ? (p?.color ? `${p.color}22` : `${cc}18`)
    : "#f0f9ff";

  return (
    <div
      ref={binRef}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => {
        if (canPlace) onPlace(shelfId, ti, si);
        else if (canScan) onScanToPlace!(shelfId, ti, si);
      }}
      className={isHighlit ? "slot-highlight" : undefined}
      title={canScan ? "Quét QR để đặt sản phẩm" : undefined}
      style={{
        width: 52, height: 52, borderRadius: 9,
        border: `1.5px ${pid ? "solid" : "dashed"} ${borderColor}`,
        background: bgColor,
        position: "relative", cursor: canPlace || pid || canScan ? "pointer" : "default",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 2, overflow: "hidden",
        transition: "all 0.12s",
        touchAction: "manipulation",
      }}
    >
      {pid && p ? (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: isHighlit ? "#C9A55A" : cc }} />
          {p.imagePath
            ? <img src={p.imagePath} alt="" style={{ width: 26, height: 26, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
            : <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: p.color ?? cc, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
          }
          <p style={{
            fontSize: 7, fontWeight: 700, color: isHighlit ? "#C9A55A" : "#0c1a2e",
            letterSpacing: "0.04em", textAlign: "center", lineHeight: 1.1,
            maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {p.sku ? p.sku.slice(0, 7) : p.name.slice(0, 6)}
          </p>
          {/* Qty badge */}
          {(p.quantity ?? 0) > 1 && (
            <span style={{
              position: "absolute", bottom: 2, right: 2,
              fontSize: 6.5, fontWeight: 700, background: "#0c1a2e",
              color: "#fff", borderRadius: 3, padding: "0 2px", lineHeight: "11px",
            }}>
              ×{p.quantity}
            </span>
          )}
        </>
      ) : canPlace ? (
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: hov ? "#C9A55A" : "#0ea5e9", opacity: 0.8 }} />
      ) : canScan && hov ? (
        <ScanLine size={14} style={{ color: "#C9A55A" }} />
      ) : null}

      {/* Tooltip */}
      <AnimatePresence>
        {hov && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
              transform: "translateX(-50%)", zIndex: 60, pointerEvents: "none", whiteSpace: "nowrap",
            }}
          >
            <div style={{
              background: "#ffffff", border: "1px solid #bae6fd",
              borderRadius: 8, padding: "5px 10px",
              boxShadow: "0 4px 12px rgba(12,26,46,0.12)",
            }}>
              {p ? (
                <>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#0c1a2e" }}>{p.name}</p>
                  <p style={{ fontSize: 8, color: "#64748b", marginTop: 1 }}>
                    {p.sku && <span style={{ color: "#0ea5e9", marginRight: 4 }}>{p.sku}</span>}
                    {p.color && <span style={{ marginRight: 4 }}>{p.color}</span>}
                    {p.category}
                  </p>
                </>
              ) : canPlace ? (
                <p style={{ fontSize: 9, color: "#C9A55A" }}>Đặt vào đây</p>
              ) : (
                <p style={{ fontSize: 9, color: "#94a3b8" }}>Trống</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove button */}
      <AnimatePresence>
        {hov && pid && !canPlace && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.1 }}
            onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{
              position: "absolute", top: 2, right: 2, width: 15, height: 15, borderRadius: 4,
              background: "rgba(220,38,38,0.9)", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
            }}
          >
            <X size={7} color="#fff" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Warehouse: ShelfCard ─────────────────────────────────────────────────────

const SLOTS_PER_TIER = 25;

function ShelfCard({
  shelf, products, highlightPid, selectedPid, onPlaceSlot, onRemoveSlot, onScanToPlace,
}: {
  shelf: WarehouseShelf; products: Product[]; highlightPid: string | null;
  selectedPid: string | null;
  onPlaceSlot: (shelfId: string, ti: number, si: number) => void;
  onRemoveSlot: (shelfId: string, ti: number, si: number) => void;
  onScanToPlace?: (shelfId: string, ti: number, si: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const filled     = shelf.tiers.reduce((s, t) => s + t.filter(Boolean).length, 0);
  const total      = shelf.tiers.length * SLOTS_PER_TIER;
  const density    = total > 0 ? filled / total : 0;
  const isTarget   = !!highlightPid && shelf.tiers.some(t => t.includes(highlightPid));
  const densityColor = density >= 0.85 ? "#dc2626" : density >= 0.6 ? "#C9A55A" : "#10b981";

  return (
    <motion.div
      animate={isTarget ? { borderColor: ["#bae6fd", "#C9A55A", "#bae6fd"] } : {}}
      transition={isTarget ? { duration: 1.2, repeat: 3 } : {}}
      style={{
        background: "#ffffff", borderRadius: 16, overflow: "hidden",
        border: `1px solid ${isTarget ? "#C9A55A" : "#bae6fd"}`,
        boxShadow: isTarget ? "0 0 0 2px rgba(201,165,90,0.22)" : "0 1px 4px rgba(12,26,46,0.06)",
        minWidth: 220,
      }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
          background: isTarget ? "rgba(201,165,90,0.08)" : "#f0f9ff",
          border: "none", borderBottom: "1px solid #bae6fd",
          width: "100%", cursor: "pointer",
        }}
      >
        <Warehouse size={12} style={{ color: isTarget ? "#C9A55A" : "#0ea5e9", flexShrink: 0 }} />
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
          color: isTarget ? "#C9A55A" : "#0c1a2e", flex: 1, textAlign: "left",
        }}>
          {shelf.name}
        </p>
        {isTarget && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
            style={{
              fontSize: 8, fontWeight: 700, letterSpacing: "0.2em",
              background: "rgba(201,165,90,0.18)", color: "#C9A55A",
              padding: "2px 7px", borderRadius: 5,
            }}
          >
            TÌM THẤY
          </motion.span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
          <div style={{ width: 36, height: 3, background: "#e0f2fe", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${density * 100}%`, background: densityColor, transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: 8, color: "#64748b" }}>{filled}/{total}</span>
        </div>
        {open ? <ChevronUp size={10} style={{ color: "#94a3b8", flexShrink: 0 }} /> : <ChevronDown size={10} style={{ color: "#94a3b8", flexShrink: 0 }} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
              {shelf.tiers.map((tier, ti) => (
                <div key={ti} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <span style={{
                    fontSize: 8, fontWeight: 600, color: "#94a3b8",
                    width: 36, textAlign: "right", flexShrink: 0, paddingTop: 8,
                  }}>
                    {TIER_LABELS_W[ti]}
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 52px)`, gap: 4 }}>
                    {tier.map((pid, si) => (
                      <WBin
                        key={si} shelfId={shelf.id} ti={ti} si={si}
                        pid={pid} products={products}
                        highlightPid={highlightPid}
                        selectedPid={selectedPid}
                        onPlace={onPlaceSlot}
                        onRemove={() => onRemoveSlot(shelf.id, ti, si)}
                        onScanToPlace={onScanToPlace}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Display Board tab ────────────────────────────────────────────────────────

// Pending slot for QR-to-place
type PendingSlot = { sId: string; subId: string; ri: number; si: number; label: string } | null;
type PendingWSlot = { shelfId: string; ti: number; si: number; label: string } | null;

function DisplayTab({
  products, storeSections, placeInSection, highlightPid,
}: {
  products: Product[];
  storeSections: StoreSection[];
  placeInSection: (sId: string, subId: string, ri: number, si: number, pid: string | null) => void;
  highlightPid: string | null;
}) {
  const [sectionIdx, setSectionIdx] = useState(0);
  const [selectedPid, setSelectedPid] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [slotQrOpen, setSlotQrOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<PendingSlot>(null);
  const [slotQrNotFound, setSlotQrNotFound] = useState<string | null>(null);

  const displayIds = useMemo(() => {
    const ids = new Set<string>();
    storeSections.forEach(sec => sec.subsections.forEach(sub => sub.rows.forEach(row => row.products.forEach(pid => { if (pid) ids.add(pid); }))));
    return ids;
  }, [storeSections]);

  const totalSlots = useMemo(() =>
    storeSections.reduce((s, sec) => s + sec.subsections.reduce((ss, sub) => ss + sub.rows.reduce((rs, r) => rs + r.products.length, 0), 0), 0),
    [storeSections]
  );

  const clampedIdx = Math.min(sectionIdx, Math.max(0, storeSections.length - 1));
  const currentSection = storeSections[clampedIdx] ?? null;
  const cfg = currentSection ? (ZONE_CFG[currentSection.sectionType] ?? { color: "#0ea5e9" }) : { color: "#0ea5e9" };

  useEffect(() => {
    if (!highlightPid) return;
    const idx = storeSections.findIndex(sec =>
      sec.subsections.some(sub => sub.rows.some(row => row.products.includes(highlightPid)))
    );
    if (idx !== -1 && idx !== clampedIdx) setSectionIdx(idx);
  }, [highlightPid]);

  const handlePlace = useCallback((sId: string, subId: string, ri: number, si: number) => {
    if (!selectedPid) return;
    placeInSection(sId, subId, ri, si, selectedPid);
    setSelectedPid(null);
  }, [selectedPid, placeInSection]);

  // Open QR scanner targeted at a specific slot
  const handleScanToPlace = useCallback((sId: string, subId: string, ri: number, si: number) => {
    // Find human-readable label
    const sec = storeSections.find(s => s.id === sId);
    const sub = sec?.subsections.find(s => s.id === subId);
    const label = sub ? `${sub.name} · Hàng ${ri + 1}, Ô ${si + 1}` : `Ô ${si + 1}`;
    setPendingSlot({ sId, subId, ri, si, label });
    setSlotQrOpen(true);
  }, [storeSections]);

  const handleSlotQrScan = useCallback((code: string) => {
    if (!pendingSlot) return;
    const match = findProductByCode(products, code);
    if (match) {
      placeInSection(pendingSlot.sId, pendingSlot.subId, pendingSlot.ri, pendingSlot.si, match.id);
      setSlotQrOpen(false);
      setPendingSlot(null);
      setSlotQrNotFound(null);
    } else {
      setSlotQrNotFound(code);
    }
  }, [pendingSlot, products, placeInSection]);

  return (
    <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
      {/* Slot-targeted QR modal */}
      <QRScanModal
        open={slotQrOpen}
        onClose={() => { setSlotQrOpen(false); setPendingSlot(null); setSlotQrNotFound(null); }}
        onScan={handleSlotQrScan}
        slotLabel={pendingSlot?.label}
        notFoundCode={slotQrNotFound}
      />

      {/* Desktop pool panel */}
      <div className="hidden md:flex">
        <PoolPanel
          products={products}
          selectedPid={selectedPid}
          onSelect={setSelectedPid}
          mode="display"
          assignedIds={displayIds}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8, minWidth: 0, minHeight: 0 }}>
        {/* Stats chips — hidden on mobile to save vertical space */}
        <div className="hidden md:flex" style={{ flexShrink: 0, alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {[
            { icon: Eye,        val: displayIds.size, unit: "trưng bày", color: "#C9A55A" },
            { icon: LayoutGrid, val: totalSlots,       unit: "tổng ô",   color: "#94a3b8" },
            { icon: Layers,     val: `${totalSlots > 0 ? Math.round((displayIds.size / totalSlots) * 100) : 0}%`, unit: "lấp đầy", color: "#0ea5e9" },
          ].map((chip, i) => {
            const Icon = chip.icon;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 12,
                background: "#ffffff", border: "1px solid #bae6fd",
                boxShadow: "0 1px 3px rgba(12,26,46,0.05)",
              }}>
                <Icon size={11} style={{ color: chip.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: chip.color }}>{chip.val}</span>
                <span style={{ fontSize: 9, color: "#94a3b8" }}>{chip.unit}</span>
              </div>
            );
          })}
        </div>

        {/* Selected chip */}
        <AnimatePresence>
          {selectedPid && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 12,
                background: "rgba(201,165,90,0.10)", border: "1px solid rgba(201,165,90,0.4)",
              }}
            >
              <Check size={11} style={{ color: "#C9A55A" }} />
              <span style={{ fontSize: 10, color: "#C9A55A", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {products.find(p => p.id === selectedPid)?.name ?? "..."} · Nhấn ô trống để đặt
              </span>
              <button onClick={() => setSelectedPid(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexShrink: 0 }}>
                <X size={10} style={{ color: "#C9A55A" }} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section navigator */}
        {storeSections.length > 0 && (
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setSectionIdx(i => Math.max(0, i - 1))}
              disabled={clampedIdx === 0}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "1px solid #bae6fd",
                background: clampedIdx === 0 ? "#f8fafc" : "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: clampedIdx === 0 ? "default" : "pointer", flexShrink: 0,
                transition: "all 0.12s",
              }}
            >
              <ChevronLeft size={16} style={{ color: clampedIdx === 0 ? "#bae6fd" : "#0ea5e9" }} />
            </button>

            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 10,
              padding: "0 14px", height: 36,
              background: "#ffffff", border: "1px solid #bae6fd", borderRadius: 10,
            }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, flex: 1 }}>{currentSection?.name ?? "—"}</span>
              <span style={{ fontSize: 9, color: "#94a3b8" }}>{clampedIdx + 1} / {storeSections.length} khu</span>
            </div>

            <button
              onClick={() => setSectionIdx(i => Math.min(storeSections.length - 1, i + 1))}
              disabled={clampedIdx === storeSections.length - 1}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "1px solid #bae6fd",
                background: clampedIdx === storeSections.length - 1 ? "#f8fafc" : "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: clampedIdx === storeSections.length - 1 ? "default" : "pointer", flexShrink: 0,
                transition: "all 0.12s",
              }}
            >
              <ChevronRight size={16} style={{ color: clampedIdx === storeSections.length - 1 ? "#bae6fd" : "#0ea5e9" }} />
            </button>
          </div>
        )}

        {/* Single section view */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 2 }}>
          <AnimatePresence mode="wait" initial={false}>
            {currentSection ? (
              <motion.div
                key={currentSection.id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <SectionGroup
                  section={currentSection}
                  highlightPid={highlightPid}
                  products={products}
                  selectedPid={selectedPid}
                  onPlace={handlePlace}
                  placeInSection={placeInSection}
                  onScanToPlace={handleScanToPlace}
                />
              </motion.div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: "#94a3b8", fontSize: 12 }}>
                Chưa có khu trưng bày nào
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile: floating picker button */}
      <div className="flex md:hidden" style={{ position: "fixed", bottom: "calc(68px + env(safe-area-inset-bottom, 0px))", right: 20, zIndex: 200 }}>
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            width: 56, height: 56, borderRadius: 28,
            background: "linear-gradient(135deg, #C9A55A, #e6c474)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(201,165,90,0.45)",
            position: "relative",
          }}
        >
          <ShoppingBag size={22} color="#fff" />
          {selectedPid && (
            <span style={{
              position: "absolute", top: -2, right: -2,
              width: 16, height: 16, borderRadius: "50%",
              background: "#10b981", border: "2px solid #fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Check size={8} color="#fff" />
            </span>
          )}
        </button>
      </div>

      <MobilePickerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        products={products}
        selectedPid={selectedPid}
        onSelect={setSelectedPid}
        mode="display"
        assignedIds={displayIds}
      />
    </div>
  );
}

// ─── Warehouse tab ────────────────────────────────────────────────────────────

function WarehouseTab({
  products, warehouseShelves, placeInWarehouse, highlightPid,
}: {
  products: Product[];
  warehouseShelves: WarehouseShelf[];
  placeInWarehouse: (shelfId: string, ti: number, si: number, pid: string | null) => void;
  highlightPid: string | null;
}) {
  const [wSearch,      setWSearch]      = useState("");
  const [selectedPid,  setSelectedPid]  = useState<string | null>(null);
  const [shelfIdx,     setShelfIdx]     = useState(0);
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [slotQrOpen,    setSlotQrOpen]    = useState(false);
  const [pendingWSlot,  setPendingWSlot]  = useState<PendingWSlot>(null);
  const [slotQrNotFound, setSlotQrNotFound] = useState<string | null>(null);

  const warehouseIds = useMemo(() => {
    const ids = new Set<string>();
    warehouseShelves.forEach(sh => sh.tiers.forEach(t => t.forEach(pid => { if (pid) ids.add(pid); })));
    return ids;
  }, [warehouseShelves]);

  const searchHighlightPid = useMemo(() => {
    if (!wSearch.trim()) return null;
    const q = wSearch.trim().toLowerCase();
    return products.find(p => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q))?.id ?? null;
  }, [wSearch, products]);

  const effectivePid = highlightPid ?? searchHighlightPid;

  const highlightShelf = useMemo(() => {
    if (!effectivePid) return null;
    for (const shelf of warehouseShelves) {
      for (let ti = 0; ti < shelf.tiers.length; ti++) {
        const si = shelf.tiers[ti].indexOf(effectivePid);
        if (si !== -1) return { shelf: shelf.name, tier: TIER_LABELS_W[ti], slot: si + 1 };
      }
    }
    return null;
  }, [effectivePid, warehouseShelves]);

  const handlePlace = useCallback((shelfId: string, ti: number, si: number) => {
    if (!selectedPid) return;
    placeInWarehouse(shelfId, ti, si, selectedPid);
    setSelectedPid(null);
  }, [selectedPid, placeInWarehouse]);

  const onRemoveSlot = useCallback((shelfId: string, ti: number, si: number) => {
    placeInWarehouse(shelfId, ti, si, null);
  }, [placeInWarehouse]);

  const handleScanToPlace = useCallback((shelfId: string, ti: number, si: number) => {
    const shelf = warehouseShelves.find(s => s.id === shelfId);
    const label = shelf ? `${shelf.name} · ${TIER_LABELS_W[ti]}, Ô ${si + 1}` : `Ô ${si + 1}`;
    setPendingWSlot({ shelfId, ti, si, label });
    setSlotQrOpen(true);
  }, [warehouseShelves]);

  const handleSlotQrScan = useCallback((code: string) => {
    if (!pendingWSlot) return;
    const match = findProductByCode(products, code);
    if (match) {
      placeInWarehouse(pendingWSlot.shelfId, pendingWSlot.ti, pendingWSlot.si, match.id);
      setSlotQrOpen(false);
      setPendingWSlot(null);
      setSlotQrNotFound(null);
    } else {
      setSlotQrNotFound(code);
    }
  }, [pendingWSlot, products, placeInWarehouse]);

  const allShelves = warehouseShelves;
  const clampedIdx = Math.min(shelfIdx, Math.max(0, allShelves.length - 1));
  const currentShelf = allShelves[clampedIdx] ?? null;

  useEffect(() => {
    if (!effectivePid) return;
    const idx = allShelves.findIndex(sh => sh.tiers.some(t => t.includes(effectivePid!)));
    if (idx !== -1 && idx !== clampedIdx) setShelfIdx(idx);
  }, [effectivePid]);

  const shelfTypeColor = currentShelf?.shelfType === "bags" ? "#10b981" : "#0ea5e9";
  const shelfTypeLabel = currentShelf?.shelfType === "bags" ? "KHU TÚI" : "KHU GIÀY";

  return (
    <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
      {/* Slot-targeted QR modal */}
      <QRScanModal
        open={slotQrOpen}
        onClose={() => { setSlotQrOpen(false); setPendingWSlot(null); setSlotQrNotFound(null); }}
        onScan={handleSlotQrScan}
        slotLabel={pendingWSlot?.label}
        notFoundCode={slotQrNotFound}
      />

      {/* Desktop pool panel */}
      <div className="hidden md:flex">
        <PoolPanel
          products={products}
          selectedPid={selectedPid}
          onSelect={setSelectedPid}
          mode="warehouse"
          assignedIds={warehouseIds}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8, minWidth: 0, minHeight: 0 }}>
        {/* Search bar (always shown) + stats chips (desktop only) */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            flex: 1,
            display: "flex", alignItems: "center", gap: 8,
            background: "#ffffff", border: "1px solid #bae6fd",
            borderRadius: 12, padding: "0 14px", height: 38,
          }}>
            <Search size={13} style={{ color: "#94a3b8" }} strokeWidth={1.5} />
            <input
              value={wSearch}
              onChange={e => setWSearch(e.target.value)}
              placeholder="Tìm SKU, tên sản phẩm..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 12, color: "#0c1a2e", fontFamily: "inherit",
              }}
            />
            {wSearch && (
              <button onClick={() => setWSearch("")} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={11} style={{ color: "#94a3b8" }} />
              </button>
            )}
          </div>
          {/* Stats — desktop only */}
          {[
            { label: "SKU",   val: products.length,                    color: "#0c1a2e" },
            { label: "Kho",   val: warehouseIds.size,                   color: "#0ea5e9" },
            { label: "Chưa",  val: products.length - warehouseIds.size, color: "#C9A55A" },
          ].map(s => (
            <div key={s.label} className="hidden md:flex" style={{
              alignItems: "center", gap: 4,
              padding: "0 12px", height: 38, borderRadius: 12,
              background: "#ffffff", border: "1px solid #bae6fd", flexShrink: 0,
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.val}</span>
              <span style={{ fontSize: 9, color: "#64748b" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Selected product chip */}
        <AnimatePresence>
          {selectedPid && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 12,
                background: "rgba(201,165,90,0.10)", border: "1px solid rgba(201,165,90,0.4)",
              }}
            >
              <Check size={11} style={{ color: "#C9A55A" }} />
              <span style={{ fontSize: 10, color: "#C9A55A", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {products.find(p => p.id === selectedPid)?.name ?? "..."} · Nhấn ô trống để xếp
              </span>
              <button onClick={() => setSelectedPid(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexShrink: 0 }}>
                <X size={10} style={{ color: "#C9A55A" }} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Highlight banner */}
        <AnimatePresence>
          {(wSearch || highlightPid) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
                padding: "10px 16px", borderRadius: 12,
                background: highlightShelf ? "rgba(201,165,90,0.08)" : "#f0f9ff",
                border: `1px solid ${highlightShelf ? "rgba(201,165,90,0.5)" : "#bae6fd"}`,
              }}
            >
              <MapPin size={12} style={{ color: highlightShelf ? "#C9A55A" : "#94a3b8" }} />
              {highlightShelf ? (
                <p style={{ fontSize: 11, color: "#0c1a2e" }}>
                  Tìm thấy tại <strong style={{ color: "#C9A55A" }}>{highlightShelf.shelf}</strong>
                  {" · "}{highlightShelf.tier}, Ô {highlightShelf.slot}
                </p>
              ) : (
                <p style={{ fontSize: 11, color: "#94a3b8" }}>Không tìm thấy sản phẩm nào khớp</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Single-shelf navigator */}
        {allShelves.length > 0 && (
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setShelfIdx(i => Math.max(0, i - 1))}
              disabled={clampedIdx === 0}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "1px solid #bae6fd",
                background: clampedIdx === 0 ? "#f8fafc" : "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: clampedIdx === 0 ? "default" : "pointer",
                flexShrink: 0, transition: "all 0.12s",
              }}
            >
              <ChevronLeft size={16} style={{ color: clampedIdx === 0 ? "#bae6fd" : "#0ea5e9" }} />
            </button>

            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 10,
              padding: "0 14px", height: 36,
              background: "#ffffff", border: "1px solid #bae6fd", borderRadius: 10,
            }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: shelfTypeColor, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: shelfTypeColor }}>{shelfTypeLabel}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0c1a2e", flex: 1 }}>{currentShelf?.name ?? "—"}</span>
              <span style={{ fontSize: 9, color: "#94a3b8" }}>{clampedIdx + 1} / {allShelves.length} kệ</span>
            </div>

            <button
              onClick={() => setShelfIdx(i => Math.min(allShelves.length - 1, i + 1))}
              disabled={clampedIdx === allShelves.length - 1}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "1px solid #bae6fd",
                background: clampedIdx === allShelves.length - 1 ? "#f8fafc" : "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: clampedIdx === allShelves.length - 1 ? "default" : "pointer",
                flexShrink: 0, transition: "all 0.12s",
              }}
            >
              <ChevronRight size={16} style={{ color: clampedIdx === allShelves.length - 1 ? "#bae6fd" : "#0ea5e9" }} />
            </button>
          </div>
        )}

        {/* Single ShelfCard */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", paddingRight: 2 }}>
          <AnimatePresence mode="wait" initial={false}>
            {currentShelf ? (
              <motion.div
                key={currentShelf.id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <ShelfCard
                  shelf={currentShelf} products={products}
                  highlightPid={effectivePid} selectedPid={selectedPid}
                  onPlaceSlot={handlePlace} onRemoveSlot={onRemoveSlot}
                  onScanToPlace={handleScanToPlace}
                />
              </motion.div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: "#94a3b8", fontSize: 12 }}>
                Chưa có kệ nào
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile: floating picker button */}
      <div className="flex md:hidden" style={{ position: "fixed", bottom: "calc(68px + env(safe-area-inset-bottom, 0px))", right: 20, zIndex: 200 }}>
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            width: 56, height: 56, borderRadius: 28,
            background: "linear-gradient(135deg, #10b981, #34d399)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
            position: "relative",
          }}
        >
          <ShoppingBag size={22} color="#fff" />
          {selectedPid && (
            <span style={{
              position: "absolute", top: -2, right: -2,
              width: 16, height: 16, borderRadius: "50%",
              background: "#C9A55A", border: "2px solid #fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Check size={8} color="#fff" />
            </span>
          )}
        </button>
      </div>

      <MobilePickerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        products={products}
        selectedPid={selectedPid}
        onSelect={setSelectedPid}
        mode="warehouse"
        assignedIds={warehouseIds}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VisualBoardPage() {
  const { products, storeSections, warehouseShelves, placeInSection, placeInWarehouse, fetchProducts } = useStore();

  const [subtab, setSubtab] = useState<Subtab>("display");
  const [highlightPid, setHighlightPid] = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("postlain_highlight");
      if (!raw) return;
      sessionStorage.removeItem("postlain_highlight");
      const { pid, mode } = JSON.parse(raw) as { pid: string; mode: Subtab };
      setSubtab(mode);
      setTimeout(() => {
        setHighlightPid(pid);
        setTimeout(() => setHighlightPid(null), 4000);
      }, 450);
    } catch { /* noop */ }
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", minHeight: 0 }}>

      {/* Header — hidden on mobile to save space */}
      <div className="hidden md:flex" style={{ flexShrink: 0, alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.38em" }}>
            Quản Lý Cửa Hàng · ALDO
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 300, color: "#0c1a2e", letterSpacing: "0.04em", marginTop: 4 }}>
            Bảng Trưng Bày
          </h1>
        </div>
      </div>

      {/* Prominent subtab switcher */}
      <div style={{
        flexShrink: 0, display: "flex", gap: 4,
        background: "#f0f9ff", border: "1px solid #bae6fd",
        borderRadius: 16, padding: 4, alignSelf: "flex-start",
      }}>
        {([
          { key: "display",   label: "TRƯNG BÀY", icon: Eye,       activeColor: "#0ea5e9", activeBg: "#0ea5e9" },
          { key: "warehouse", label: "KHO HÀNG",  icon: Warehouse, activeColor: "#10b981", activeBg: "#10b981" },
        ] as const).map(({ key, label, icon: Icon, activeBg }) => (
          <button
            key={key}
            onClick={() => setSubtab(key)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 12, border: "none",
              background: subtab === key ? activeBg : "transparent",
              color: subtab === key ? "#ffffff" : "#64748b",
              fontSize: 10, fontWeight: subtab === key ? 700 : 500,
              letterSpacing: "0.1em", cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.18s",
              boxShadow: subtab === key ? `0 2px 8px ${activeBg}44` : "none",
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Subtab content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={subtab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
        >
          {subtab === "display" ? (
            <DisplayTab
              products={products}
              storeSections={storeSections}
              placeInSection={placeInSection}
              highlightPid={highlightPid}
            />
          ) : (
            <WarehouseTab
              products={products}
              warehouseShelves={warehouseShelves}
              placeInWarehouse={placeInWarehouse}
              highlightPid={highlightPid}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
