"use client";

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import {
  Search, X, Package, Warehouse, Eye,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Camera, ScanLine, Check, AlertCircle, QrCode,
  RefreshCw, LayoutGrid, Layers, Plus, Minus,
  Wifi, WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import type { Product, StoreSection, WarehouseShelf } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────
type Subtab = "display" | "warehouse";
type PendingSlot =
  | { kind: "display"; sId: string; subId: string; ri: number; si: number; label: string }
  | { kind: "warehouse"; shelfId: string; ti: number; si: number; label: string }
  | null;

// ─── Zone colors ──────────────────────────────────────────────────────────────
const ZONE_CFG: Record<string, { color: string; bg: string }> = {
  wall_woman:   { color: "#0ea5e9", bg: "rgba(14,165,233,0.08)"   },
  wall_man:     { color: "#0284c7", bg: "rgba(2,132,199,0.08)"    },
  center_woman: { color: "#38bdf8", bg: "rgba(56,189,248,0.08)"   },
  center_man:   { color: "#075985", bg: "rgba(7,89,133,0.08)"     },
  acc:          { color: "#10b981", bg: "rgba(16,185,129,0.08)"   },
  window:       { color: "#C9A55A", bg: "rgba(201,165,90,0.08)"   },
};

const CAT_COLOR: Record<string, string> = {
  "Giày nữ": "#0ea5e9", "Giày nam": "#0284c7",
  "Bốt nữ": "#38bdf8",  "Bốt nam": "#075985",
  "Sandal nữ": "#7dd3fc","Sandal nam":"#0369a1",
  "Túi nữ": "#10b981",   "Túi nam": "#059669",
  "Phụ kiện": "#C9A55A",
};
function catColor(cat: string) { return CAT_COLOR[cat] ?? "#64748b"; }

// ─── Barcode fuzzy match ──────────────────────────────────────────────────────
function findProduct(products: Product[], code: string): Product | null {
  const raw = code.trim();
  let m = products.find(p => p.sku && p.sku.trim().toLowerCase() === raw.toLowerCase());
  if (m) return m;
  m = products.find(p => p.name.toLowerCase() === raw.toLowerCase());
  if (m) return m;
  const norm = raw.replace(/^0+/, "") || "0";
  m = products.find(p => {
    if (!p.sku) return false;
    return (p.sku.trim().replace(/^0+/, "") || "0") === norm;
  });
  if (m) return m;
  m = products.find(p => p.sku && raw.toLowerCase().includes(p.sku.trim().toLowerCase()));
  if (m) return m;
  return null;
}

// ─── Product card in slot ─────────────────────────────────────────────────────
const ProductCard = memo(function ProductCard({
  product, size = 64, highlight = false, onRemove,
}: {
  product: Product; size?: number; highlight?: boolean; onRemove?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const cc = catColor(product.category);
  const isSmall = size < 56;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: size, height: size, borderRadius: isSmall ? 8 : 10, overflow: "hidden",
        position: "relative", cursor: onRemove ? "pointer" : "default",
        border: `1.5px solid ${highlight ? "#C9A55A" : `${cc}55`}`,
        boxShadow: highlight ? "0 0 0 2px rgba(201,165,90,0.3)" : "0 1px 4px rgba(0,0,0,0.06)",
        background: product.imagePath ? "transparent" : (product.color ? `${product.color}22` : `${cc}18`),
        transition: "all 0.12s",
        flexShrink: 0,
      }}
    >
      {product.imagePath ? (
        <img
          src={product.imagePath} alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
        />
      ) : (
        <div style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: isSmall ? 1 : 2, padding: isSmall ? 2 : 4,
        }}>
          {product.color && (
            <div style={{
              width: isSmall ? 8 : 12, height: isSmall ? 8 : 12,
              borderRadius: "50%", background: product.color,
              border: "1.5px solid rgba(255,255,255,0.6)", flexShrink: 0,
            }} />
          )}
          {/* Short name (first word or 2 chars) */}
          <span style={{
            fontSize: isSmall ? 6.5 : 7.5, fontWeight: 700, color: cc,
            textAlign: "center", lineHeight: 1.15,
            maxWidth: "100%", wordBreak: "break-all",
            overflow: "hidden",
          }}>
            {product.name.split(" ")[0].slice(0, isSmall ? 4 : 6)}
          </span>
          {/* SKU last 4 chars */}
          {product.sku && (
            <span style={{
              fontSize: isSmall ? 5.5 : 6.5, fontWeight: 500, color: `${cc}aa`,
              textAlign: "center", lineHeight: 1,
              maxWidth: "100%",
            }}>
              {product.sku.slice(-4)}
            </span>
          )}
        </div>
      )}

      {/* Category bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 3, background: highlight ? "#C9A55A" : cc,
      }} />

      {/* Qty badge */}
      {(product.quantity ?? 0) > 1 && !isSmall && (
        <div style={{
          position: "absolute", top: 2, right: 2,
          background: "rgba(12,26,46,0.8)", borderRadius: 4,
          padding: "0 3px", lineHeight: "12px",
          fontSize: 6.5, fontWeight: 700, color: "#fff",
        }}>×{product.quantity}</div>
      )}

      {/* Hover: remove + tooltip */}
      {hov && (
        <>
          {onRemove && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
              onClick={e => { e.stopPropagation(); onRemove(); }}
              style={{
                position: "absolute", top: 2, left: 2,
                width: 16, height: 16, borderRadius: 4,
                background: "rgba(220,38,38,0.9)", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 10,
              }}
            >
              <X size={8} color="#fff" />
            </motion.button>
          )}
          {!isSmall && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{
                position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
                transform: "translateX(-50%)", zIndex: 100, pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              <div style={{
                background: "#0c1a2e", borderRadius: 8, padding: "5px 10px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              }}>
                <p style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{product.name}</p>
                {product.sku && <p style={{ fontSize: 8, color: "#7dd3fc", marginTop: 1 }}>{product.sku}</p>}
                <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 1 }}>{product.category} · qty: {product.quantity}</p>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
});

// ─── Empty slot ───────────────────────────────────────────────────────────────
function EmptySlot({
  size = 64, canPlace, canScan, onPlace, onScan, label,
}: {
  size?: number; canPlace: boolean; canScan: boolean;
  onPlace?: () => void; onScan?: () => void; label?: string;
}) {
  const [hov, setHov] = useState(false);
  const isSmall = size < 56;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => { if (canPlace) onPlace?.(); else if (canScan) onScan?.(); }}
      title={canScan ? "Click để quét QR" : canPlace ? "Click để đặt" : undefined}
      style={{
        width: size, height: size, borderRadius: isSmall ? 8 : 10,
        border: `1.5px dashed ${canPlace && hov ? "#C9A55A" : canPlace ? "#0ea5e9" : canScan && hov ? "#C9A55A" : "#e0f2fe"}`,
        background: canPlace && hov ? "rgba(201,165,90,0.1)" : canPlace ? "rgba(14,165,233,0.05)" : canScan && hov ? "rgba(201,165,90,0.06)" : "#f8fafc",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: canPlace || canScan ? "pointer" : "default",
        transition: "all 0.12s",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {canPlace ? (
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: hov ? "#C9A55A" : "#0ea5e9", opacity: 0.7 }} />
      ) : canScan && hov ? (
        <ScanLine size={isSmall ? 10 : 14} style={{ color: "#C9A55A" }} />
      ) : (
        <Package size={isSmall ? 8 : 10} style={{ color: "#cbd5e1" }} />
      )}
      {label && hov && canScan && (
        <div style={{
          position: "absolute", bottom: "calc(100%+6px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#0c1a2e", borderRadius: 6, padding: "3px 7px",
          fontSize: 8, color: "#7dd3fc", whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          Quét QR
        </div>
      )}
    </div>
  );
}

// ─── QR Scanner ───────────────────────────────────────────────────────────────
function QRScanner({
  open, onClose, onResult, slotLabel, notFound,
}: {
  open: boolean; onClose: () => void;
  onResult: (code: string) => void;
  slotLabel?: string; notFound?: string | null;
}) {
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockRef = useRef(false);

  const stop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const handleCode = useCallback((code: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setLastCode(code);
    stop();
    onResult(code);
  }, [stop, onResult]);

  const start = useCallback(async () => {
    setCamError(null); setLastCode(null); lockRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setScanning(true);
    } catch {
      setCamError("Không thể mở camera — dùng chế độ nhập SKU thủ công");
      return;
    }

    // Detectors
    type NativeD = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
    let nativeD: NativeD | null = null;
    try {
      if ("BarcodeDetector" in window) {
        const BD = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => NativeD }).BarcodeDetector;
        nativeD = new BD({ formats: ["qr_code","ean_13","ean_8","code_128","code_39","upc_a","upc_e","data_matrix","aztec"] });
      }
    } catch { /* ignore */ }

    type ZxR = { decodeFromVideoElement: (v: HTMLVideoElement) => Promise<{ getText(): string }> };
    let zxR: ZxR | null = null;
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      zxR = new BrowserMultiFormatReader() as unknown as ZxR;
    } catch { /* ignore */ }

    type JsQRFn = (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
    let jsQRFn: JsQRFn | null = null;
    try { jsQRFn = ((await import("jsqr")) as { default: JsQRFn }).default; } catch { /* ignore */ }

    const tick = async () => {
      if (lockRef.current || !streamRef.current) return;
      const v = videoRef.current; const cv = canvasRef.current;
      if (v && v.readyState >= v.HAVE_ENOUGH_DATA) {
        if (nativeD) {
          try { const r = await nativeD.detect(v); if (r[0]) { handleCode(r[0].rawValue); return; } } catch { /* ignore */ }
        }
        if (zxR) {
          try { const r = await zxR.decodeFromVideoElement(v); if (r) { handleCode(r.getText()); return; } } catch { /* NotFoundException = normal */ }
        }
        if (jsQRFn && cv) {
          cv.width = v.videoWidth; cv.height = v.videoHeight;
          const ctx = cv.getContext("2d");
          if (ctx) {
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, cv.width, cv.height);
            const r = jsQRFn(img.data, img.width, img.height);
            if (r) { handleCode(r.data); return; }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [handleCode]);

  useEffect(() => { if (open) start(); else stop(); return stop; }, [open]); // eslint-disable-line

  // When parent notifies "not found", re-enable scanning
  useEffect(() => {
    if (notFound) { lockRef.current = false; }
  }, [notFound]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) { stop(); onClose(); } }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(12,26,46,0.8)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 380,
          overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 18px", background: "#0c1a2e", display: "flex", alignItems: "center", gap: 10 }}>
          <QrCode size={16} style={{ color: "#C9A55A" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Quét mã sản phẩm</p>
            {slotLabel && <p style={{ fontSize: 9, color: "#C9A55A", marginTop: 1 }}>→ {slotLabel}</p>}
          </div>
          <button onClick={() => { stop(); onClose(); }}
            style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={13} color="#fff" />
          </button>
        </div>

        {/* Camera */}
        <div style={{ position: "relative", background: "#000", aspectRatio: "4/3" }}>
          <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline muted autoPlay />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {scanning && (
            <>
              {/* Scan frame */}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: 200, height: 140, position: "relative" }}>
                  {[
                    { top: 0, left: 0, borderTop: "3px solid #C9A55A", borderLeft: "3px solid #C9A55A" },
                    { top: 0, right: 0, borderTop: "3px solid #C9A55A", borderRight: "3px solid #C9A55A" },
                    { bottom: 0, left: 0, borderBottom: "3px solid #C9A55A", borderLeft: "3px solid #C9A55A" },
                    { bottom: 0, right: 0, borderBottom: "3px solid #C9A55A", borderRight: "3px solid #C9A55A" },
                  ].map((s, i) => <div key={i} style={{ position: "absolute", width: 28, height: 28, ...s }} />)}
                  <motion.div
                    animate={{ top: ["4px", "calc(100% - 4px)", "4px"] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ position: "absolute", left: 4, right: 4, height: 2, background: "linear-gradient(90deg, transparent, rgba(201,165,90,0.9), transparent)", borderRadius: 2 }}
                  />
                </div>
              </div>
              <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center" }}>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", background: "rgba(0,0,0,0.4)", padding: "2px 8px", borderRadius: 20 }}>
                  EAN-13 · Code-128 · QR · UPC · DataMatrix
                </span>
              </div>
            </>
          )}

          {!scanning && !camError && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
              <p style={{ color: "#94a3b8", fontSize: 11 }}>Đang khởi động camera...</p>
            </div>
          )}
        </div>

        {/* Status */}
        <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {camError && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", fontSize: 11, color: "#dc2626" }}>
              {camError}
            </div>
          )}

          {notFound && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", gap: 8, alignItems: "center" }}>
              <AlertCircle size={13} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 10, color: "#92400e", fontWeight: 600 }}>Không tìm thấy sản phẩm</p>
                <p style={{ fontSize: 9, color: "#b45309", marginTop: 1 }}>Mã: <span style={{ fontFamily: "monospace" }}>{notFound}</span></p>
              </div>
              <button onClick={() => { lockRef.current = false; start(); }}
                style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 7, border: "1px solid #bae6fd", background: "#f0f9ff", fontSize: 8.5, color: "#0ea5e9", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Quét lại
              </button>
            </div>
          )}

          {lastCode && !notFound && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", gap: 8, alignItems: "center" }}>
              <Check size={13} style={{ color: "#10b981" }} />
              <p style={{ fontSize: 10, color: "#065f46", fontWeight: 600 }}>Đã quét: {lastCode}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { stop(); onClose(); }}
              style={{ flex: 1, height: 38, borderRadius: 10, border: "1px solid #bae6fd", background: "#f0f9ff", fontSize: 10, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>
              Đóng
            </button>
            {!scanning && (
              <button onClick={() => { lockRef.current = false; start(); }}
                style={{ flex: 1, height: 38, borderRadius: 10, border: "none", background: "#0c1a2e", fontSize: 10, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Camera size={13} /> Bật Camera
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Product Picker (bottom sheet on mobile, sidebar panel on desktop) ─────────
function ProductPicker({
  products, selectedPid, onSelect, assignedIds, mode, open, onClose,
}: {
  products: Product[]; selectedPid: string | null; onSelect: (pid: string | null) => void;
  assignedIds: Set<string>; mode: Subtab; open: boolean; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const presentCats = useMemo(() => {
    const s = new Set(products.map(p => p.category));
    return [...s].sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products
      .filter(p => (!cat || p.category === cat) && (!q || p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q)))
      .sort((a, b) => {
        const ap = assignedIds.has(a.id) ? 1 : 0;
        const bp = assignedIds.has(b.id) ? 1 : 0;
        return ap - bp || a.name.localeCompare(b.name, "vi");
      });
  }, [products, cat, search, assignedIds]);

  const accentColor = mode === "display" ? "#C9A55A" : "#10b981";
  const placed = assignedIds.size;

  return (
    <>
      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 198, background: "rgba(12,26,46,0.4)" }} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 199,
                background: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
                height: "80vh", display: "flex", flexDirection: "column",
                boxShadow: "0 -8px 40px rgba(12,26,46,0.2)",
              }}
              className="md:hidden"
            >
              <PickerContent
                products={filtered} presentCats={presentCats} cat={cat} setCat={setCat}
                search={search} setSearch={setSearch}
                selectedPid={selectedPid} onSelect={pid => { onSelect(pid); if (pid) onClose(); }}
                assignedIds={assignedIds} accentColor={accentColor} placed={placed} total={products.length}
                onClose={onClose}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Desktop sidebar */}
      <div className="hidden md:flex" style={{ width: 260, flexShrink: 0 }}>
        <div style={{
          width: "100%", display: "flex", flexDirection: "column", gap: 8,
          background: "#fff", border: "1px solid #bae6fd", borderRadius: 16,
          padding: 12, height: "100%", overflow: "hidden",
        }}>
          <PickerContent
            products={filtered} presentCats={presentCats} cat={cat} setCat={setCat}
            search={search} setSearch={setSearch}
            selectedPid={selectedPid} onSelect={onSelect}
            assignedIds={assignedIds} accentColor={accentColor} placed={placed} total={products.length}
          />
        </div>
      </div>
    </>
  );
}

function PickerContent({
  products, presentCats, cat, setCat, search, setSearch,
  selectedPid, onSelect, assignedIds, accentColor, placed, total, onClose,
}: {
  products: Product[]; presentCats: string[]; cat: string | null; setCat: (c: string | null) => void;
  search: string; setSearch: (s: string) => void;
  selectedPid: string | null; onSelect: (pid: string | null) => void;
  assignedIds: Set<string>; accentColor: string; placed: number; total: number;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Handle (mobile only) */}
      {onClose && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e0f2fe" }} />
        </div>
      )}

      {/* Header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: onClose ? "0 16px 8px" : "0 0 4px" }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#64748b", letterSpacing: "0.15em" }}>KHO SẢN PHẨM</p>
          <p style={{ fontSize: 10, color: "#0c1a2e", marginTop: 1 }}>
            <span style={{ color: accentColor, fontWeight: 700 }}>{placed}</span>
            <span style={{ color: "#94a3b8" }}> / {total} đã xếp</span>
          </p>
        </div>
        {onClose && <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #bae6fd", background: "#f0f9ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={12} style={{ color: "#64748b" }} /></button>}
      </div>

      {/* Search */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "0 10px", height: 36, margin: onClose ? "0 16px" : 0 }}>
        <Search size={12} style={{ color: "#94a3b8" }} strokeWidth={1.5} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên, SKU..."
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 11, fontFamily: "inherit", color: "#0c1a2e" }} />
        {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={10} style={{ color: "#94a3b8" }} /></button>}
      </div>

      {/* Category chips */}
      <div style={{ flexShrink: 0, display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none", padding: onClose ? "0 16px" : undefined }}>
        {["Tất cả", ...presentCats].map(c => {
          const active = c === "Tất cả" ? cat === null : cat === c;
          const cc = c === "Tất cả" ? "#0ea5e9" : catColor(c);
          return (
            <button key={c} onClick={() => setCat(c === "Tất cả" ? null : c)}
              style={{
                flexShrink: 0, padding: "4px 10px", borderRadius: 20,
                border: `1.5px solid ${active ? cc : "#e0f2fe"}`,
                background: active ? `${cc}15` : "#fff",
                color: active ? cc : "#64748b",
                fontSize: 8.5, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 4,
              }}>
              {c !== "Tất cả" && <span style={{ width: 5, height: 5, borderRadius: "50%", background: cc, flexShrink: 0 }} />}
              {c}
            </button>
          );
        })}
      </div>

      {/* Selected hint */}
      <AnimatePresence>
        {selectedPid && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ flexShrink: 0, overflow: "hidden", margin: onClose ? "0 16px" : 0 }}>
            <div style={{ padding: "6px 10px", background: "rgba(201,165,90,0.1)", borderRadius: 10, border: "1px solid rgba(201,165,90,0.35)", display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={10} style={{ color: "#C9A55A" }} />
              <span style={{ fontSize: 9, color: "#C9A55A", fontWeight: 600 }}>Đã chọn · Nhấn vào ô trống để đặt</span>
              <button onClick={() => onSelect(null)} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto" }}><X size={9} style={{ color: "#C9A55A" }} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product list */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, padding: onClose ? "0 16px 16px" : "0 0 4px" }}>
        {products.length === 0 && (
          <p style={{ textAlign: "center", marginTop: 32, fontSize: 11, color: "#94a3b8" }}>Không có sản phẩm</p>
        )}
        {products.map(p => {
          const cc = catColor(p.category);
          const isSelected = selectedPid === p.id;
          const isPlaced = assignedIds.has(p.id);
          return (
            <button key={p.id} onClick={() => onSelect(isSelected ? null : p.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                borderRadius: 12, cursor: "pointer", border: isSelected ? `2px solid #C9A55A` : "1px solid #bae6fd",
                background: isSelected ? "rgba(201,165,90,0.10)" : isPlaced ? "#f0fff4" : "#fff",
                fontFamily: "inherit", textAlign: "left",
                boxShadow: isSelected ? "0 0 0 3px rgba(201,165,90,0.18)" : "none",
                transition: "all 0.12s", flexShrink: 0,
              }}>
              {/* Thumbnail */}
              <div style={{
                width: 40, height: 40, borderRadius: 8, flexShrink: 0, overflow: "hidden",
                border: `1.5px solid ${isSelected ? "#C9A55A88" : `${cc}44`}`,
                background: p.color ? `${p.color}22` : `${cc}22`,
                display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
              }}>
                {p.imagePath
                  ? <img src={p.imagePath} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <>
                      {p.color && <div style={{ width: 14, height: 14, borderRadius: "50%", background: p.color, border: "1.5px solid rgba(255,255,255,0.6)" }} />}
                      {!p.color && <span style={{ fontSize: 11, fontWeight: 700, color: cc }}>{p.name.slice(0, 2)}</span>}
                    </>
                }
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: cc }} />
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: isSelected ? "#C9A55A" : "#0c1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: cc, flexShrink: 0 }} />
                  <span style={{ fontSize: 8.5, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.sku && <span style={{ color: "#0ea5e9", marginRight: 3 }}>{p.sku}</span>}
                    {p.category}
                  </span>
                </div>
              </div>
              {/* Right */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                {(p.quantity ?? 0) > 0 && <span style={{ fontSize: 8.5, fontWeight: 700, padding: "1px 5px", borderRadius: 6, background: "#0ea5e9", color: "#fff" }}>×{p.quantity}</span>}
                {isPlaced && <span style={{ fontSize: 7.5, fontWeight: 700, padding: "1px 5px", borderRadius: 6, background: `${accentColor}18`, color: accentColor }}>Đã xếp</span>}
                {isSelected && <Check size={11} style={{ color: "#C9A55A" }} />}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Display Tab ──────────────────────────────────────────────────────────────
function DisplayTab({ products, storeSections, placeInSection, highlightPid }: {
  products: Product[]; storeSections: StoreSection[];
  placeInSection: (sId: string, subId: string, ri: number, si: number, pid: string | null) => void;
  highlightPid: string | null;
}) {
  const [sectionIdx, setSectionIdx] = useState(0);
  const [selectedPid, setSelectedPid] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<PendingSlot>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrNotFound, setQrNotFound] = useState<string | null>(null);

  const displayIds = useMemo(() => {
    const ids = new Set<string>();
    storeSections.forEach(sec => sec.subsections.forEach(sub => sub.rows.forEach(row => row.products.forEach(pid => { if (pid) ids.add(pid); }))));
    return ids;
  }, [storeSections]);

  const clampedIdx = Math.min(sectionIdx, Math.max(0, storeSections.length - 1));
  const currentSection = storeSections[clampedIdx] ?? null;
  const cfg = currentSection ? (ZONE_CFG[currentSection.sectionType] ?? ZONE_CFG.window) : ZONE_CFG.window;

  // Jump to section containing highlighted product
  useEffect(() => {
    if (!highlightPid) return;
    const idx = storeSections.findIndex(sec => sec.subsections.some(sub => sub.rows.some(row => row.products.includes(highlightPid))));
    if (idx !== -1) setSectionIdx(idx);
  }, [highlightPid]); // eslint-disable-line

  const handlePlace = useCallback((sId: string, subId: string, ri: number, si: number) => {
    if (!selectedPid) return;
    placeInSection(sId, subId, ri, si, selectedPid);
    setSelectedPid(null);
  }, [selectedPid, placeInSection]);

  const handleScanToPlace = useCallback((sId: string, subId: string, ri: number, si: number) => {
    const sec = storeSections.find(s => s.id === sId);
    const sub = sec?.subsections.find(s => s.id === subId);
    const label = sub ? `${sub.name} · Hàng ${ri + 1}, Ô ${si + 1}` : `Ô ${si + 1}`;
    setPendingSlot({ kind: "display", sId, subId, ri, si, label });
    setQrNotFound(null);
    setQrOpen(true);
  }, [storeSections]);

  const handleQrResult = useCallback((code: string) => {
    const match = findProduct(products, code);
    if (match && pendingSlot?.kind === "display") {
      placeInSection(pendingSlot.sId, pendingSlot.subId, pendingSlot.ri, pendingSlot.si, match.id);
      setQrOpen(false);
      setPendingSlot(null);
      setQrNotFound(null);
    } else {
      setQrNotFound(code);
    }
  }, [products, pendingSlot, placeInSection]);

  // Stats
  const totalSlots = storeSections.reduce((s, sec) => s + sec.subsections.reduce((ss, sub) => ss + sub.rows.reduce((rs, r) => rs + r.products.length, 0), 0), 0);

  return (
    <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
      <AnimatePresence>
        {qrOpen && <QRScanner open={qrOpen} onClose={() => { setQrOpen(false); setPendingSlot(null); }} onResult={handleQrResult} slotLabel={pendingSlot?.label} notFound={qrNotFound} />}
      </AnimatePresence>

      <ProductPicker products={products} selectedPid={selectedPid} onSelect={setSelectedPid}
        assignedIds={displayIds} mode="display" open={pickerOpen} onClose={() => setPickerOpen(false)} />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8, minWidth: 0, minHeight: 0 }}>
        {/* Stats - desktop */}
        <div className="hidden md:flex" style={{ flexShrink: 0, alignItems: "center", gap: 8 }}>
          {[
            { icon: Eye, val: displayIds.size, unit: "đang trưng bày", color: "#C9A55A" },
            { icon: LayoutGrid, val: totalSlots, unit: "tổng ô", color: "#94a3b8" },
            { icon: Layers, val: `${totalSlots > 0 ? Math.round((displayIds.size / totalSlots) * 100) : 0}%`, unit: "lấp đầy", color: "#0ea5e9" },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 12, background: "#fff", border: "1px solid #bae6fd" }}>
                <Icon size={11} style={{ color: c.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.val}</span>
                <span style={{ fontSize: 9, color: "#94a3b8" }}>{c.unit}</span>
              </div>
            );
          })}
        </div>

        {/* Selected chip */}
        <AnimatePresence>
          {selectedPid && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: "rgba(201,165,90,0.10)", border: "1px solid rgba(201,165,90,0.4)" }}>
              {(() => { const p = products.find(x => x.id === selectedPid); return p ? <ProductCard product={p} size={32} /> : null; })()}
              <span style={{ fontSize: 10, color: "#C9A55A", fontWeight: 600, flex: 1 }}>
                {products.find(p => p.id === selectedPid)?.name ?? "..."} · Nhấn ô trống để đặt
              </span>
              <button onClick={() => setSelectedPid(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={10} style={{ color: "#C9A55A" }} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section navigator */}
        {storeSections.length > 0 && (
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setSectionIdx(i => Math.max(0, i - 1))} disabled={clampedIdx === 0}
              style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #bae6fd", background: clampedIdx === 0 ? "#f8fafc" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: clampedIdx === 0 ? "default" : "pointer" }}>
              <ChevronLeft size={16} style={{ color: clampedIdx === 0 ? "#bae6fd" : "#0ea5e9" }} />
            </button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 36, background: "#fff", border: "1px solid #bae6fd", borderRadius: 10 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, flex: 1 }}>{currentSection?.name ?? "—"}</span>
              <span style={{ fontSize: 9, color: "#94a3b8" }}>{clampedIdx + 1} / {storeSections.length}</span>
            </div>
            <button onClick={() => setSectionIdx(i => Math.min(storeSections.length - 1, i + 1))} disabled={clampedIdx === storeSections.length - 1}
              style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #bae6fd", background: clampedIdx === storeSections.length - 1 ? "#f8fafc" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: clampedIdx === storeSections.length - 1 ? "default" : "pointer" }}>
              <ChevronRight size={16} style={{ color: clampedIdx === storeSections.length - 1 ? "#bae6fd" : "#0ea5e9" }} />
            </button>
          </div>
        )}

        {/* Section content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <AnimatePresence mode="wait" initial={false}>
            {currentSection ? (
              <motion.div key={currentSection.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                <SectionView
                  section={currentSection} products={products}
                  selectedPid={selectedPid} highlightPid={highlightPid}
                  onPlace={handlePlace} onScanToPlace={handleScanToPlace}
                  onRemove={(sId, subId, ri, si) => placeInSection(sId, subId, ri, si, null)}
                />
              </motion.div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: "#94a3b8", fontSize: 12 }}>Chưa có khu trưng bày</div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile FAB */}
      <div className="flex md:hidden" style={{ position: "fixed", bottom: "calc(68px + env(safe-area-inset-bottom, 0px))", right: 16, zIndex: 200 }}>
        <button onClick={() => setPickerOpen(true)}
          style={{ width: 56, height: 56, borderRadius: 28, background: "linear-gradient(135deg, #C9A55A, #e6c474)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(201,165,90,0.45)", position: "relative" }}>
          <Package size={22} color="#fff" />
          {selectedPid && <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#10b981", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={8} color="#fff" /></span>}
        </button>
      </div>
    </div>
  );
}

function SectionView({ section, products, selectedPid, highlightPid, onPlace, onScanToPlace, onRemove }: {
  section: StoreSection; products: Product[];
  selectedPid: string | null; highlightPid: string | null;
  onPlace: (sId: string, subId: string, ri: number, si: number) => void;
  onScanToPlace: (sId: string, subId: string, ri: number, si: number) => void;
  onRemove: (sId: string, subId: string, ri: number, si: number) => void;
}) {
  const cfg = ZONE_CFG[section.sectionType] ?? ZONE_CFG.window;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {section.subsections.map(sub => {
        const filled = sub.rows.reduce((s, r) => s + r.products.filter(Boolean).length, 0);
        const total = sub.rows.reduce((s, r) => s + r.products.length, 0);
        const pct = total > 0 ? (filled / total) * 100 : 0;
        return (
          <div key={sub.id} style={{ background: "#fff", border: `1px solid ${cfg.color}33`, borderRadius: 14, overflow: "hidden" }}>
            {/* Sub header */}
            <div style={{ padding: "8px 14px", background: cfg.bg, borderBottom: `1px solid ${cfg.color}22`, display: "flex", alignItems: "center", gap: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: cfg.color, flex: 1 }}>{sub.name}</p>
              <span style={{ fontSize: 8, color: cfg.color, opacity: 0.7 }}>{filled}/{total}</span>
              <div style={{ width: 50, height: 3, borderRadius: 2, background: `${cfg.color}22`, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: cfg.color, borderRadius: 2, transition: "width 0.3s" }} />
              </div>
            </div>
            {/* Rows */}
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              {[...sub.rows].reverse().map((row, revIdx) => {
                const ri = sub.rows.length - 1 - revIdx;
                if (row.type === "image") return (
                  <div key={ri} style={{ height: 18, borderRadius: 6, background: "#f0f9ff", display: "flex", alignItems: "center", paddingLeft: 8 }}>
                    <span style={{ fontSize: 7, color: "#94a3b8", letterSpacing: "0.2em" }}>TRANH / DECOR</span>
                  </div>
                );
                const slotSize = row.type === "long" ? 56 : 48;
                return (
                  <div key={ri} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 7, width: 24, flexShrink: 0, color: "#94a3b8", fontFamily: "monospace", textAlign: "right" }}>
                      {row.type === "long" ? "DÀI" : "N"}
                    </span>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {row.products.map((pid, si) => {
                        const p = pid && typeof pid === "string" ? products.find(x => x.id === pid) ?? null : null;
                        if (p) return (
                          <ProductCard key={si} product={p} size={slotSize}
                            highlight={pid === highlightPid}
                            onRemove={() => onRemove(section.id, sub.id, ri, si)} />
                        );
                        return (
                          <EmptySlot key={si} size={slotSize}
                            canPlace={!!selectedPid} canScan={!selectedPid}
                            onPlace={() => onPlace(section.id, sub.id, ri, si)}
                            onScan={() => onScanToPlace(section.id, sub.id, ri, si)} />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Warehouse Tab ────────────────────────────────────────────────────────────
function WarehouseTab({ products, warehouseShelves, placeInWarehouse, highlightPid }: {
  products: Product[]; warehouseShelves: WarehouseShelf[];
  placeInWarehouse: (shelfId: string, ti: number, si: number, pid: string | null) => void;
  highlightPid: string | null;
}) {
  const [shelfIdx, setShelfIdx] = useState(0);
  const [selectedPid, setSelectedPid] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [wSearch, setWSearch] = useState("");
  const [pendingSlot, setPendingSlot] = useState<PendingSlot>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrNotFound, setQrNotFound] = useState<string | null>(null);

  const warehouseIds = useMemo(() => {
    const ids = new Set<string>();
    warehouseShelves.forEach(sh => sh.tiers.forEach(t => t.forEach(pid => { if (pid) ids.add(pid); })));
    return ids;
  }, [warehouseShelves]);

  const clampedIdx = Math.min(shelfIdx, Math.max(0, warehouseShelves.length - 1));
  const currentShelf = warehouseShelves[clampedIdx] ?? null;

  const searchHighlightPid = useMemo(() => {
    if (!wSearch.trim()) return null;
    const q = wSearch.trim().toLowerCase();
    return products.find(p => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q))?.id ?? null;
  }, [wSearch, products]);
  const effectiveHighlight = highlightPid ?? searchHighlightPid;

  // Jump to shelf containing highlighted product
  useEffect(() => {
    if (!effectiveHighlight) return;
    const idx = warehouseShelves.findIndex(sh => sh.tiers.some(t => t.includes(effectiveHighlight)));
    if (idx !== -1) setShelfIdx(idx);
  }, [effectiveHighlight]); // eslint-disable-line

  const handlePlace = useCallback((shelfId: string, ti: number, si: number) => {
    if (!selectedPid) return;
    placeInWarehouse(shelfId, ti, si, selectedPid);
    setSelectedPid(null);
  }, [selectedPid, placeInWarehouse]);

  const handleScanToPlace = useCallback((shelfId: string, ti: number, si: number) => {
    const shelf = warehouseShelves.find(s => s.id === shelfId);
    const label = shelf ? `${shelf.name} · Tầng ${ti + 1}, Ô ${si + 1}` : `Ô ${si + 1}`;
    setPendingSlot({ kind: "warehouse", shelfId, ti, si, label });
    setQrNotFound(null);
    setQrOpen(true);
  }, [warehouseShelves]);

  const handleQrResult = useCallback((code: string) => {
    const match = findProduct(products, code);
    if (match && pendingSlot?.kind === "warehouse") {
      placeInWarehouse(pendingSlot.shelfId, pendingSlot.ti, pendingSlot.si, match.id);
      setQrOpen(false);
      setPendingSlot(null);
      setQrNotFound(null);
    } else {
      setQrNotFound(code);
    }
  }, [products, pendingSlot, placeInWarehouse]);

  const highlightShelf = useMemo(() => {
    if (!effectiveHighlight) return null;
    for (const shelf of warehouseShelves) {
      for (let ti = 0; ti < shelf.tiers.length; ti++) {
        const si = shelf.tiers[ti].indexOf(effectiveHighlight);
        if (si !== -1) return { shelf: shelf.name, tier: `Tầng ${ti + 1}`, slot: si + 1 };
      }
    }
    return null;
  }, [effectiveHighlight, warehouseShelves]);

  const shelfTypeColor = currentShelf?.shelfType === "bags" ? "#10b981" : "#0ea5e9";

  return (
    <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
      <AnimatePresence>
        {qrOpen && <QRScanner open={qrOpen} onClose={() => { setQrOpen(false); setPendingSlot(null); }} onResult={handleQrResult} slotLabel={pendingSlot?.label} notFound={qrNotFound} />}
      </AnimatePresence>

      <ProductPicker products={products} selectedPid={selectedPid} onSelect={setSelectedPid}
        assignedIds={warehouseIds} mode="warehouse" open={pickerOpen} onClose={() => setPickerOpen(false)} />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8, minWidth: 0, minHeight: 0 }}>
        {/* Search */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #bae6fd", borderRadius: 12, padding: "0 14px", height: 38 }}>
            <Search size={13} style={{ color: "#94a3b8" }} strokeWidth={1.5} />
            <input value={wSearch} onChange={e => setWSearch(e.target.value)} placeholder="Tìm SKU, tên sản phẩm..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, fontFamily: "inherit", color: "#0c1a2e" }} />
            {wSearch && <button onClick={() => setWSearch("")} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={11} style={{ color: "#94a3b8" }} /></button>}
          </div>
          {/* Stats desktop */}
          {[
            { label: "SKU", val: products.length, color: "#0c1a2e" },
            { label: "Kho", val: warehouseIds.size, color: "#0ea5e9" },
            { label: "Trống", val: products.length - warehouseIds.size, color: "#C9A55A" },
          ].map(s => (
            <div key={s.label} className="hidden md:flex" style={{ alignItems: "center", gap: 4, padding: "0 12px", height: 38, borderRadius: 12, background: "#fff", border: "1px solid #bae6fd", flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.val}</span>
              <span style={{ fontSize: 9, color: "#64748b" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Selected chip */}
        <AnimatePresence>
          {selectedPid && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: "rgba(201,165,90,0.10)", border: "1px solid rgba(201,165,90,0.4)" }}>
              {(() => { const p = products.find(x => x.id === selectedPid); return p ? <ProductCard product={p} size={32} /> : null; })()}
              <span style={{ fontSize: 10, color: "#C9A55A", fontWeight: 600, flex: 1 }}>
                {products.find(p => p.id === selectedPid)?.name ?? "..."} · Nhấn ô trống để xếp
              </span>
              <button onClick={() => setSelectedPid(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={10} style={{ color: "#C9A55A" }} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location banner */}
        <AnimatePresence>
          {effectiveHighlight && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, background: highlightShelf ? "rgba(201,165,90,0.08)" : "#f0f9ff", border: `1px solid ${highlightShelf ? "rgba(201,165,90,0.5)" : "#bae6fd"}` }}>
              <Package size={12} style={{ color: highlightShelf ? "#C9A55A" : "#94a3b8" }} />
              {highlightShelf
                ? <p style={{ fontSize: 11, color: "#0c1a2e" }}>Tìm thấy tại <strong style={{ color: "#C9A55A" }}>{highlightShelf.shelf}</strong> · {highlightShelf.tier}, Ô {highlightShelf.slot}</p>
                : <p style={{ fontSize: 11, color: "#94a3b8" }}>Không tìm thấy trong kho</p>
              }
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shelf navigator */}
        {warehouseShelves.length > 0 && (
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setShelfIdx(i => Math.max(0, i - 1))} disabled={clampedIdx === 0}
              style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #bae6fd", background: clampedIdx === 0 ? "#f8fafc" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: clampedIdx === 0 ? "default" : "pointer" }}>
              <ChevronLeft size={16} style={{ color: clampedIdx === 0 ? "#bae6fd" : "#0ea5e9" }} />
            </button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 36, background: "#fff", border: "1px solid #bae6fd", borderRadius: 10 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: shelfTypeColor }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: shelfTypeColor, letterSpacing: "0.12em" }}>
                {currentShelf?.shelfType === "bags" ? "TÚI" : "GIÀY"}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0c1a2e", flex: 1 }}>{currentShelf?.name ?? "—"}</span>
              <span style={{ fontSize: 9, color: "#94a3b8" }}>{clampedIdx + 1} / {warehouseShelves.length}</span>
            </div>
            <button onClick={() => setShelfIdx(i => Math.min(warehouseShelves.length - 1, i + 1))} disabled={clampedIdx === warehouseShelves.length - 1}
              style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #bae6fd", background: clampedIdx === warehouseShelves.length - 1 ? "#f8fafc" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: clampedIdx === warehouseShelves.length - 1 ? "default" : "pointer" }}>
              <ChevronRight size={16} style={{ color: clampedIdx === warehouseShelves.length - 1 ? "#bae6fd" : "#0ea5e9" }} />
            </button>
          </div>
        )}

        {/* Shelf content */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
          <AnimatePresence mode="wait" initial={false}>
            {currentShelf ? (
              <motion.div key={currentShelf.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                <ShelfView shelf={currentShelf} products={products}
                  selectedPid={selectedPid} highlightPid={effectiveHighlight}
                  onPlace={handlePlace} onScanToPlace={handleScanToPlace}
                  onRemove={(shelfId, ti, si) => placeInWarehouse(shelfId, ti, si, null)} />
              </motion.div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: "#94a3b8", fontSize: 12 }}>Chưa có kệ nào</div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile FAB */}
      <div className="flex md:hidden" style={{ position: "fixed", bottom: "calc(68px + env(safe-area-inset-bottom, 0px))", right: 16, zIndex: 200 }}>
        <button onClick={() => setPickerOpen(true)}
          style={{ width: 56, height: 56, borderRadius: 28, background: "linear-gradient(135deg, #10b981, #34d399)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(16,185,129,0.4)", position: "relative" }}>
          <Package size={22} color="#fff" />
          {selectedPid && <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#C9A55A", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={8} color="#fff" /></span>}
        </button>
      </div>
    </div>
  );
}

const TIER_LABELS = ["Tầng 4", "Tầng 3", "Tầng 2", "Tầng 1"];
const COLS = 5;

function ShelfView({ shelf, products, selectedPid, highlightPid, onPlace, onScanToPlace, onRemove }: {
  shelf: WarehouseShelf; products: Product[];
  selectedPid: string | null; highlightPid: string | null;
  onPlace: (shelfId: string, ti: number, si: number) => void;
  onScanToPlace: (shelfId: string, ti: number, si: number) => void;
  onRemove: (shelfId: string, ti: number, si: number) => void;
}) {
  const filled = shelf.tiers.reduce((s, t) => s + t.filter(Boolean).length, 0);
  const total = shelf.tiers.length * (shelf.tiers[0]?.length ?? 25);
  const density = total > 0 ? filled / total : 0;
  const densityColor = density >= 0.85 ? "#dc2626" : density >= 0.6 ? "#C9A55A" : "#10b981";

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #bae6fd", overflow: "hidden" }}>
      {/* Shelf header */}
      <div style={{ padding: "10px 16px", background: "#f0f9ff", borderBottom: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: 10 }}>
        <Warehouse size={13} style={{ color: "#0ea5e9" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#0c1a2e", flex: 1 }}>{shelf.name}</span>
        <div style={{ width: 60, height: 4, background: "#e0f2fe", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${density * 100}%`, background: densityColor, borderRadius: 4, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: 9, color: "#64748b" }}>{filled}/{total}</span>
      </div>

      {/* Tiers */}
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {shelf.tiers.map((tier, ti) => (
          <div key={ti} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 8, fontWeight: 600, color: "#94a3b8", width: 38, textAlign: "right", flexShrink: 0, paddingTop: 10 }}>{TIER_LABELS[ti]}</span>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 52px)`, gap: 4 }}>
              {tier.map((pid, si) => {
                const p = pid && typeof pid === "string" ? products.find(x => x.id === pid) ?? null : null;
                const isHighlit = !!pid && pid === highlightPid;
                if (p) return (
                  <ProductCard key={si} product={p} size={52} highlight={isHighlit}
                    onRemove={() => onRemove(shelf.id, ti, si)} />
                );
                return (
                  <EmptySlot key={si} size={52}
                    canPlace={!!selectedPid} canScan={!selectedPid}
                    onPlace={() => onPlace(shelf.id, ti, si)}
                    onScan={() => onScanToPlace(shelf.id, ti, si)} />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Realtime hook ────────────────────────────────────────────────────────────
function useRealtimeSync(onRefresh: () => void) {
  const [online, setOnline] = useState(true);
  const esRef = useRef<EventSource | null>(null);
  // Keep a stable ref so SSE/poll closures always call the latest callback
  const refreshRef = useRef(onRefresh);
  useEffect(() => { refreshRef.current = onRefresh; });

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (typeof EventSource === "undefined") return;
      const es = new EventSource("/api/placements/stream");
      esRef.current = es;

      es.onopen = () => setOnline(true);
      es.onmessage = () => { refreshRef.current(); };
      es.onerror = () => {
        setOnline(false);
        es.close();
        retryTimer = setTimeout(connect, 4000);
      };
    }

    connect();
    // Fallback polling every 15s
    const poll = setInterval(() => refreshRef.current(), 15_000);

    return () => {
      esRef.current?.close();
      clearTimeout(retryTimer);
      clearInterval(poll);
    };
  }, []); // eslint-disable-line

  return { online };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function VisualBoardPage() {
  const { products, storeSections, warehouseShelves, placeInSection, placeInWarehouse, fetchDbState } = useStore();

  const [subtab, setSubtab] = useState<Subtab>("display");
  const [highlightPid, setHighlightPid] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDbState();
    setTimeout(() => setRefreshing(false), 600);
  }, [fetchDbState]);

  const { online } = useRealtimeSync(handleRefresh);

  useEffect(() => { fetchDbState(); }, []); // eslint-disable-line

  // Handle incoming highlight from global search
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
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", minHeight: 0 }}>

      {/* Header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="hidden md:block">
          <p style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.3em" }}>Trưng Bày · POSTLAIN</p>
          <h1 style={{ fontSize: 22, fontWeight: 300, color: "#0c1a2e", letterSpacing: "0.04em", marginTop: 2 }}>Quản Lý Trưng Bày</h1>
        </div>

        <div style={{ flex: 1 }} />

        {/* Realtime indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, background: online ? "rgba(16,185,129,0.08)" : "rgba(148,163,184,0.08)", border: `1px solid ${online ? "rgba(16,185,129,0.3)" : "rgba(148,163,184,0.3)"}` }}>
          {online ? <Wifi size={11} style={{ color: "#10b981" }} /> : <WifiOff size={11} style={{ color: "#94a3b8" }} />}
          <span style={{ fontSize: 8.5, color: online ? "#10b981" : "#94a3b8", fontWeight: 600 }}>{online ? "REALTIME" : "OFFLINE"}</span>
        </div>

        {/* Refresh */}
        <button onClick={handleRefresh} title="Tải lại dữ liệu"
          style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #bae6fd", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <RefreshCw size={14} style={{ color: "#0ea5e9", animation: refreshing ? "spin 0.6s linear infinite" : "none" }} />
        </button>
      </div>

      {/* Subtab switcher */}
      <div style={{ flexShrink: 0, display: "flex", gap: 4, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 14, padding: 4, alignSelf: "flex-start" }}>
        {([
          { key: "display" as const,   label: "TRƯNG BÀY", icon: Eye,       color: "#0ea5e9" },
          { key: "warehouse" as const, label: "KHO HÀNG",  icon: Warehouse, color: "#10b981" },
        ]).map(({ key, label, icon: Icon, color }) => (
          <button key={key} onClick={() => setSubtab(key)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none",
              background: subtab === key ? color : "transparent",
              color: subtab === key ? "#fff" : "#64748b",
              fontSize: 10, fontWeight: subtab === key ? 700 : 500, letterSpacing: "0.1em",
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s",
              boxShadow: subtab === key ? `0 2px 8px ${color}44` : "none",
            }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={subtab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
          style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {subtab === "display" ? (
            <DisplayTab products={products} storeSections={storeSections} placeInSection={placeInSection} highlightPid={highlightPid} />
          ) : (
            <WarehouseTab products={products} warehouseShelves={warehouseShelves} placeInWarehouse={placeInWarehouse} highlightPid={highlightPid} />
          )}
        </motion.div>
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
