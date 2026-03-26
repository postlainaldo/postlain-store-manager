"use client";

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import {
  Search, X, Package, Warehouse, Eye,
  ChevronLeft, ChevronRight, ChevronUp,
  Camera, ScanLine, Check, AlertCircle, QrCode,
  RefreshCw, LayoutGrid, Layers, Plus, Minus,
  Wifi, WifiOff, Lock, Settings2, Trash2, Edit3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import type { Product, StoreSection, WarehouseShelf } from "@/types";
import "barcode-detector/polyfill";
import { parseMCFromNotes, parseSeasonFromNotes, colorCodeToHex } from "@/lib/categoryMapping";

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

function fmtPrice(n?: number | null) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

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
  product, size = 64, highlight = false, onRemove, variant = "square",
}: {
  product: Product; size?: number; highlight?: boolean; onRemove?: () => void;
  variant?: "square" | "label";
}) {
  const [hov, setHov] = useState(false);
  const cc = catColor(product.category);
  const isSmall = size < 56;
  const price = product.markdownPrice ?? product.price;
  const colorHex = colorCodeToHex(product.color);

  // ── Label variant (horizontal card for display slots) ──────────────────────
  if (variant === "label") {
    return (
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: 92, minHeight: 52, borderRadius: 9, overflow: "visible",
          position: "relative", cursor: onRemove ? "pointer" : "default",
          border: `1.5px solid ${highlight ? "#C9A55A" : `${cc}55`}`,
          boxShadow: highlight ? "0 0 0 2px rgba(201,165,90,0.3)" : "0 1px 4px rgba(0,0,0,0.06)",
          background: product.color ? `${product.color}18` : `${cc}12`,
          transition: "box-shadow 0.12s",
          flexShrink: 0,
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Top color accent */}
        <div style={{ height: 3, background: highlight ? "#C9A55A" : cc, borderRadius: "7px 7px 0 0", flexShrink: 0 }} />

        <div style={{ padding: "5px 6px 5px", display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {/* TÊN */}
          <span style={{
            fontSize: 9.5, fontWeight: 700, color: "#0c1a2e", lineHeight: 1.2,
            overflow: "hidden", display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            wordBreak: "break-word",
          }}>
            {product.name}
          </span>

          {/* MC row */}
          {product.sku && (
            <span style={{ fontSize: 8, fontWeight: 600, color: cc, lineHeight: 1, letterSpacing: "0.02em" }}>
              {product.sku}
            </span>
          )}

          {/* MÀU + GIÁ row */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
            {product.color && (
              <div style={{
                width: 9, height: 9, borderRadius: "50%", background: product.color,
                border: "1.5px solid rgba(255,255,255,0.8)", flexShrink: 0,
              }} />
            )}
            {product.color && (
              <span style={{ fontSize: 7.5, color: "#64748b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {product.color}
              </span>
            )}
            {price && (
              <span style={{
                fontSize: 8, fontWeight: 700, whiteSpace: "nowrap",
                color: product.markdownPrice ? "#dc2626" : "#475569",
              }}>
                {fmtPrice(price)}
              </span>
            )}
          </div>
        </div>

        {/* Remove button */}
        {hov && onRemove && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
            onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{
              position: "absolute", top: -6, right: -6,
              width: 16, height: 16, borderRadius: "50%",
              background: "#dc2626", border: "1.5px solid #fff",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 10,
            }}
          >
            <X size={8} color="#fff" />
          </motion.button>
        )}
      </div>
    );
  }

  // ── Square variant (warehouse / sidebar) ───────────────────────────────────
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: size, height: size, borderRadius: isSmall ? 8 : 10, overflow: "hidden",
        position: "relative", cursor: onRemove ? "pointer" : "default",
        border: `1.5px solid ${highlight ? "#C9A55A" : `${cc}55`}`,
        boxShadow: highlight ? "0 0 0 2px rgba(201,165,90,0.3)" : "0 1px 4px rgba(0,0,0,0.06)",
        background: product.imagePath ? "transparent" : colorHex ? `${colorHex}22` : `${cc}18`,
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
          gap: 1, padding: isSmall ? 2 : 3,
        }}>
          {/* Tên sản phẩm */}
          <span style={{
            fontSize: isSmall ? 6 : 7, fontWeight: 700, color: cc,
            textAlign: "center", lineHeight: 1.1,
            maxWidth: "100%", overflow: "hidden", wordBreak: "break-all",
          }}>
            {product.name.split(" ")[0].slice(0, isSmall ? 4 : 6)}
          </span>
          {/* Màu (3-digit code) */}
          {product.color && !isSmall && (
            <span style={{ fontSize: 6, fontWeight: 700, color: `${cc}bb`, textAlign: "center", lineHeight: 1 }}>
              {product.color}
            </span>
          )}
          {/* MC code */}
          {!isSmall && (
            <span style={{ fontSize: 5.5, fontWeight: 600, color: `${cc}99`, textAlign: "center", lineHeight: 1, maxWidth: "100%", overflow: "hidden" }}>
              {parseMCFromNotes(product.notes) ?? ""}
            </span>
          )}
          {/* Size */}
          {product.size && !isSmall && (
            <span style={{ fontSize: 6, fontWeight: 700, color: `${cc}cc`, textAlign: "center", lineHeight: 1 }}>
              {product.size}
            </span>
          )}
        </div>
      )}

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: highlight ? "#C9A55A" : cc }} />

      {(product.quantity ?? 0) > 1 && !isSmall && (
        <div style={{ position: "absolute", top: 2, right: 2, background: "rgba(12,26,46,0.8)", borderRadius: 4, padding: "0 3px", lineHeight: "12px", fontSize: 6.5, fontWeight: 700, color: "#fff" }}>
          ×{product.quantity}
        </div>
      )}

      {hov && (
        <>
          {onRemove && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
              onClick={e => { e.stopPropagation(); onRemove(); }}
              style={{ position: "absolute", top: 2, left: 2, width: 16, height: 16, borderRadius: 4, background: "rgba(220,38,38,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}
            >
              <X size={8} color="#fff" />
            </motion.button>
          )}
          {!isSmall && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", zIndex: 100, pointerEvents: "none", whiteSpace: "nowrap" }}
            >
              <div style={{ background: "#0c1a2e", borderRadius: 8, padding: "5px 10px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
                <p style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{product.name}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                  {product.color && <p style={{ fontSize: 8, color: "#7dd3fc" }}>Màu: <b>{product.color}</b></p>}
                  {parseMCFromNotes(product.notes) && <p style={{ fontSize: 8, color: "#7dd3fc" }}>MC: <b>{parseMCFromNotes(product.notes)}</b></p>}
                  {product.size && <p style={{ fontSize: 8, color: "#7dd3fc" }}>Size: <b>{product.size}</b></p>}
                  {parseSeasonFromNotes(product.notes) && <p style={{ fontSize: 8, color: "#94a3b8" }}>{parseSeasonFromNotes(product.notes)}</p>}
                </div>
                {price && <p style={{ fontSize: 8, color: product.markdownPrice ? "#fca5a5" : "#94a3b8", marginTop: 2 }}>
                  {product.markdownPrice ? `${fmtPrice(product.markdownPrice)} ↓` : fmtPrice(product.price)}
                </p>}
                <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>{product.category} · SL: {product.quantity}</p>
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
  size = 64, canPlace, canScan, onPlace, onScan,
}: {
  size?: number; canPlace: boolean; canScan: boolean;
  onPlace?: () => void; onScan?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const isSmall = size < 56;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => { if (canPlace) onPlace?.(); else if (canScan) onScan?.(); }}
      style={{
        width: size, height: size, borderRadius: isSmall ? 8 : 10,
        border: `1.5px dashed ${canPlace && hov ? "#C9A55A" : canPlace ? "#0ea5e9" : canScan && hov ? "#C9A55A" : "#e0f2fe"}`,
        background: canPlace && hov ? "rgba(201,165,90,0.1)" : canPlace ? "rgba(14,165,233,0.05)" : canScan && hov ? "rgba(201,165,90,0.06)" : "#f8fafc",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: canPlace || canScan ? "pointer" : "default",
        transition: "all 0.12s",
        flexShrink: 0,
      }}
    >
      {canPlace ? (
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: hov ? "#C9A55A" : "#0ea5e9", opacity: 0.7 }} />
      ) : canScan && hov ? (
        <ScanLine size={isSmall ? 10 : 14} style={{ color: "#C9A55A" }} />
      ) : (
        <Package size={isSmall ? 8 : 10} style={{ color: "#cbd5e1" }} />
      )}
    </div>
  );
}

// ─── iOS detection ────────────────────────────────────────────────────────────
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// ─── QR Scanner ───────────────────────────────────────────────────────────────
function QRScanner({
  open, onClose, onResult, slotLabel, notFound,
}: {
  open: boolean; onClose: () => void;
  onResult: (code: string) => void;
  slotLabel?: string; notFound?: string | null;
}) {
  const ios = isIOS();
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [iosDecoding, setIosDecoding] = useState(false);
  const [iosError, setIosError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockRef = useRef(false);
  const iosFileRef = useRef<HTMLInputElement>(null);

  const stop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCamError(null);
    setLastCode(null);
    lockRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
      }
    } catch {
      setCamError("Không thể mở camera. Kiểm tra quyền truy cập.");
    }
  }, []);

  // iOS: decode barcode from photo
  const handleIosFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIosDecoding(true);
    setIosError(null);
    setLastCode(null);

    const loadImage = (f: File): Promise<HTMLImageElement> =>
      new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = URL.createObjectURL(f);
      });

    const prepareCanvas = (img: HTMLImageElement): HTMLCanvasElement => {
      const MAX = 1200;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      return c;
    };

    try {
      const img = await loadImage(file);
      const canvas = prepareCanvas(img);
      URL.revokeObjectURL(img.src);
      const ctx = canvas.getContext("2d")!;

      let code: string | null = null;

      // 1. jsqr for QR codes
      if (!code) {
        try {
          const mod = await import("jsqr");
          type JsQRFn = (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
          const jsQR = mod.default as unknown as JsQRFn;
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imgData.data, canvas.width, canvas.height);
          if (result?.data) code = result.data;
        } catch { /* not available */ }
      }

      // 2. zxing library — direct canvas decode, no DOM needed
      if (!code) {
        try {
          const zxing = await import("@zxing/library");
          const { MultiFormatReader, BinaryBitmap, HybridBinarizer, RGBLuminanceSource } = zxing;
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const len = canvas.width * canvas.height;
          const luminance = new Uint8ClampedArray(len);
          for (let i = 0; i < len; i++) {
            luminance[i] = Math.round(0.299 * imgData.data[i*4] + 0.587 * imgData.data[i*4+1] + 0.114 * imgData.data[i*4+2]);
          }
          const source = new RGBLuminanceSource(luminance, canvas.width, canvas.height);
          const bitmap = new BinaryBitmap(new HybridBinarizer(source));
          const result = new MultiFormatReader().decode(bitmap);
          if (result) code = result.getText();
        } catch { /* NotFoundException is normal */ }
      }

      if (code) {
        setLastCode(code);
        onResult(code);
      } else {
        setIosError("Không đọc được mã — chụp sát và rõ hơn");
      }
    } catch {
      setIosError("Lỗi đọc ảnh — thử lại");
    } finally {
      setIosDecoding(false);
      if (iosFileRef.current) iosFileRef.current.value = "";
    }
  }, [onResult]);

  // Detection loop (non-iOS)
  useEffect(() => {
    if (!scanning) return;
    let nativeDetector: { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } | null = null;
    let zxingReader: { decodeFromVideoElement: (v: HTMLVideoElement) => Promise<{ getText: () => string }> } | null = null;
    type JsQRFn = (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
    let jsQRFn: JsQRFn | null = null;

    async function init() {
      try {
        if ("BarcodeDetector" in window) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nativeDetector = new (window as any).BarcodeDetector({ formats: ["ean_13","ean_8","code_128","code_39","qr_code","upc_a","upc_e","itf","data_matrix","aztec"] });
        }
      } catch { /* not supported */ }
      try {
        type ZxingMod = { BrowserMultiFormatReader: new () => { decodeFromVideoElement: (v: HTMLVideoElement) => Promise<{ getText: () => string }> } };
        const mod = await import("@zxing/browser") as unknown as ZxingMod;
        zxingReader = new mod.BrowserMultiFormatReader();
      } catch { /* not available */ }
      try {
        const mod = await import("jsqr");
        jsQRFn = mod.default as unknown as JsQRFn;
      } catch { /* not available */ }
    }

    init().then(() => {
      const loop = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }
        if (lockRef.current) { rafRef.current = requestAnimationFrame(loop); return; }

        let code: string | null = null;

        // 1. Native
        if (!code && nativeDetector) {
          try {
            const results = await nativeDetector.detect(video);
            if (results.length > 0) code = results[0].rawValue;
          } catch { /* ignore */ }
        }
        // 2. ZXing
        if (!code && zxingReader) {
          try {
            const result = await zxingReader.decodeFromVideoElement(video);
            if (result) code = result.getText();
          } catch { /* not found */ }
        }
        // 3. jsQR fallback
        if (!code && jsQRFn && canvas) {
          try {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qr = jsQRFn(img.data, img.width, img.height);
              if (qr) code = qr.data;
            }
          } catch { /* ignore */ }
        }

        if (code && code !== lastCode) {
          lockRef.current = true;
          setLastCode(code);
          onResult(code);
          setTimeout(() => { lockRef.current = false; }, 2000);
        }

        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scanning, lastCode, onResult]);

  useEffect(() => {
    if (open) startCamera();
    return () => stop();
  }, [open]); // eslint-disable-line

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(12,26,46,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        style={{ width: "100%", maxWidth: 420, background: "#0c1a2e", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 9, color: "#7dd3fc", letterSpacing: "0.2em", fontWeight: 700 }}>QUÉT MÃ VẠCH</p>
            {slotLabel && <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>→ {slotLabel}</p>}
          </div>
          <button onClick={() => { stop(); onClose(); }}
            style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} color="#fff" />
          </button>
        </div>

        {/* Video stream (all platforms — iOS via BarcodeDetector polyfill) */}
        <div style={{ borderRadius: 16, overflow: "hidden", background: "#000", position: "relative", aspectRatio: "16/9" }}>
          <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: "60%", aspectRatio: "3/2", border: "2px solid rgba(201,165,90,0.8)", borderRadius: 12, boxShadow: "0 0 0 1000px rgba(0,0,0,0.4)" }} />
            </div>
          )}
          {!scanning && !camError && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={32} style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>
          )}
        </div>

        {camError && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)" }}>
            <AlertCircle size={13} style={{ color: "#fca5a5", flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: "#fca5a5" }}>{camError}</p>
            <button onClick={startCamera} style={{ marginLeft: "auto", fontSize: 10, color: "#7dd3fc", background: "none", border: "none", cursor: "pointer" }}>Thử lại</button>
          </div>
        )}

        {notFound && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "rgba(201,165,90,0.12)", border: "1px solid rgba(201,165,90,0.35)" }}>
            <QrCode size={13} style={{ color: "#C9A55A", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 10, color: "#C9A55A", fontWeight: 600 }}>Không tìm thấy</p>
              <p style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>Mã: {notFound}</p>
            </div>
          </div>
        )}

        {lastCode && !notFound && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)" }}>
            <Check size={13} style={{ color: "#10b981", flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>Đã nhận diện: {lastCode}</p>
          </div>
        )}

        {scanning && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A55A", animation: "pulse 1.2s ease-in-out infinite" }} />
            <span style={{ fontSize: 10, color: "#94a3b8" }}>Đang quét...</span>
          </div>
        )}
      </motion.div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }`}</style>
    </motion.div>
  );
}

// ─── Product Picker ─────────────────────────────────────────────────────────
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
      <div className="hidden md:flex" style={{ width: 248, flexShrink: 0 }}>
        <div style={{
          width: "100%", display: "flex", flexDirection: "column", gap: 8,
          background: "#fff", border: "1px solid var(--border)",
          borderRadius: 16, padding: 12, height: "100%", overflow: "hidden",
          boxShadow: "0 2px 16px rgba(14,165,233,0.06)",
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
      {onClose && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e0f2fe" }} />
        </div>
      )}
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
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "0 10px", height: 36, margin: onClose ? "0 16px" : 0 }}>
        <Search size={12} style={{ color: "#94a3b8" }} strokeWidth={1.5} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên, SKU..."
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 11, fontFamily: "inherit", color: "#0c1a2e" }} />
        {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={10} style={{ color: "#94a3b8" }} /></button>}
      </div>
      <div style={{ flexShrink: 0, padding: onClose ? "0 16px" : undefined }}>
        <select
          value={cat ?? ""}
          onChange={e => setCat(e.target.value || null)}
          style={{
            width: "100%", height: 34, borderRadius: 10,
            border: `1.5px solid ${cat ? catColor(cat) : "var(--border)"}`,
            background: cat ? `${catColor(cat)}0d` : "var(--bg-surface)",
            color: cat ? catColor(cat) : "var(--text-secondary)",
            fontSize: 11, fontWeight: cat ? 700 : 400,
            fontFamily: "inherit", padding: "0 10px",
            outline: "none", cursor: "pointer",
            appearance: "none", WebkitAppearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2364748b'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
            paddingRight: 28,
          }}
        >
          <option value="">Tất cả danh mục</option>
          {presentCats.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
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
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, padding: onClose ? "0 16px 16px" : "0 0 4px" }}>
        {products.length === 0 && (
          <p style={{ textAlign: "center", marginTop: 32, fontSize: 11, color: "#94a3b8" }}>Không có sản phẩm</p>
        )}
        {products.map(p => {
          const cc = catColor(p.category);
          const isSelected = selectedPid === p.id;
          const isPlaced = assignedIds.has(p.id);
          const price = p.markdownPrice ?? p.price;
          const pColorHex = colorCodeToHex(p.color);
          return (
            <motion.button key={p.id}
              onClick={() => onSelect(isSelected ? null : p.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                borderRadius: 12, cursor: "pointer",
                border: isSelected ? `2px solid #C9A55A` : `1px solid ${isPlaced ? "rgba(22,163,74,0.2)" : "var(--border)"}`,
                background: isSelected ? "rgba(201,165,90,0.10)" : isPlaced ? "rgba(22,163,74,0.04)" : "#fff",
                fontFamily: "inherit", textAlign: "left",
                boxShadow: isSelected ? "0 0 0 3px rgba(201,165,90,0.15), 0 2px 8px rgba(201,165,90,0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
                transition: "all 0.12s", flexShrink: 0,
              }}>
              <div style={{
                width: 38, height: 38, borderRadius: 9, flexShrink: 0, overflow: "hidden",
                border: `1.5px solid ${isSelected ? "#C9A55A88" : `${cc}44`}`,
                background: pColorHex ? `${pColorHex}33` : `${cc}22`,
                display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                boxShadow: pColorHex ? `0 0 0 2px ${pColorHex}18` : "none",
              }}>
                {p.imagePath
                  ? <img src={p.imagePath} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: p.color ? 9 : 10, fontWeight: 700, color: cc, textAlign: "center", lineHeight: 1 }}>
                      {p.color ? p.color : p.name.slice(0, 2)}
                    </span>
                }
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: cc }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: isSelected ? "#C9A55A" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                  {parseMCFromNotes(p.notes) && (
                    <span style={{ fontSize: 8, color: "var(--blue)", fontWeight: 700, background: "rgba(14,165,233,0.08)", padding: "1px 4px", borderRadius: 4 }}>
                      {parseMCFromNotes(p.notes)}
                    </span>
                  )}
                  {p.color && <span style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 600 }}>{p.color}</span>}
                  {p.size && <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{p.size}</span>}
                  {price && <span style={{ fontSize: 8, color: p.markdownPrice ? "#dc2626" : "var(--text-muted)", fontWeight: 700 }}>{fmtPrice(price)}</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                {(p.quantity ?? 0) > 0 && (
                  <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "var(--blue)", color: "#fff" }}>
                    ×{p.quantity}
                  </span>
                )}
                {isPlaced && <span style={{ fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 5, background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}>Đã xếp</span>}
                {isSelected && <Check size={10} style={{ color: "#C9A55A" }} />}
              </div>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

// ─── Display Tab ──────────────────────────────────────────────────────────────
function DisplayTab({ products, storeSections, placeInSection, highlightPid, canEdit }: {
  products: Product[]; storeSections: StoreSection[];
  placeInSection: (sId: string, subId: string, ri: number, si: number, pid: string | null) => void;
  highlightPid: string | null; canEdit: boolean;
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

  useEffect(() => {
    if (!highlightPid) return;
    const idx = storeSections.findIndex(sec => sec.subsections.some(sub => sub.rows.some(row => row.products.includes(highlightPid))));
    if (idx !== -1) setSectionIdx(idx);
    // Scroll to highlighted product after section renders
    setTimeout(() => {
      const el = document.querySelector(`[data-hpid="${highlightPid}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 300);
  }, [highlightPid]); // eslint-disable-line

  const handlePlace = useCallback((sId: string, subId: string, ri: number, si: number) => {
    if (!selectedPid || !canEdit) return;
    placeInSection(sId, subId, ri, si, selectedPid);
    setSelectedPid(null);
  }, [selectedPid, placeInSection, canEdit]);

  const handleScanToPlace = useCallback((sId: string, subId: string, ri: number, si: number) => {
    if (!canEdit) return;
    const sec = storeSections.find(s => s.id === sId);
    const sub = sec?.subsections.find(s => s.id === subId);
    const label = sub ? `${sub.name} · Hàng ${ri + 1}, Ô ${si + 1}` : `Ô ${si + 1}`;
    setPendingSlot({ kind: "display", sId, subId, ri, si, label });
    setQrNotFound(null);
    setQrOpen(true);
  }, [storeSections, canEdit]);

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

  const totalSlots = storeSections.reduce((s, sec) => s + sec.subsections.reduce((ss, sub) => ss + sub.rows.reduce((rs, r) => rs + r.products.length, 0), 0), 0);

  return (
    <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
      <AnimatePresence>
        {qrOpen && <QRScanner open={qrOpen} onClose={() => { setQrOpen(false); setPendingSlot(null); }} onResult={handleQrResult} slotLabel={pendingSlot?.label} notFound={qrNotFound} />}
      </AnimatePresence>

      {/* Sidebar product picker — only show on desktop when canEdit */}
      {canEdit && (
        <ProductPicker products={products} selectedPid={selectedPid} onSelect={setSelectedPid}
          assignedIds={displayIds} mode="display" open={pickerOpen} onClose={() => setPickerOpen(false)} />
      )}
      {!canEdit && <div className="hidden md:block" style={{ width: 240, flexShrink: 0 }} />}

      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8, minWidth: 0, minHeight: 0 }}>
        {/* Stats — desktop full, mobile compact */}
        <div className="hidden md:flex" style={{ flexShrink: 0, alignItems: "center", gap: 8 }}>
          {[
            { icon: Eye, val: displayIds.size, unit: "đang trưng bày", color: "#C9A55A" },
            { icon: LayoutGrid, val: totalSlots, unit: "tổng ô", color: "#94a3b8" },
            { icon: Layers, val: `${totalSlots > 0 ? Math.round((displayIds.size / totalSlots) * 100) : 0}%`, unit: "lấp đầy", color: "#0ea5e9" },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div key={i} whileHover={{ y: -1 }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 12, background: "#fff", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(14,165,233,0.05)" }}>
                <Icon size={11} style={{ color: c.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.val}</span>
                <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{c.unit}</span>
              </motion.div>
            );
          })}
          {!canEdit && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 12, background: "rgba(148,163,184,0.08)", border: "1px solid #e2e8f0" }}>
              <Lock size={10} style={{ color: "#94a3b8" }} />
              <span style={{ fontSize: 9, color: "#94a3b8" }}>Chỉ xem</span>
            </div>
          )}
        </div>
        {/* Mobile compact stats */}
        <div className="flex md:hidden" style={{ flexShrink: 0, alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, background: "rgba(201,165,90,0.08)", border: "1px solid rgba(201,165,90,0.25)" }}>
            <Eye size={10} style={{ color: "#C9A55A" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#C9A55A" }}>{displayIds.size}</span>
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>trưng bày</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)" }}>
            <Layers size={10} style={{ color: "#0ea5e9" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0ea5e9" }}>{totalSlots > 0 ? Math.round((displayIds.size / totalSlots) * 100) : 0}%</span>
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>lấp đầy</span>
          </div>
        </div>

        {/* Selected chip */}
        <AnimatePresence>
          {selectedPid && canEdit && (
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
          <div style={{ flexShrink: 0, position: "relative" }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 4, height: 16, borderRadius: 3, background: cfg.color, boxShadow: `0 0 6px ${cfg.color}60`, zIndex: 1, pointerEvents: "none" }} />
            <select
              value={clampedIdx}
              onChange={e => setSectionIdx(Number(e.target.value))}
              style={{
                width: "100%", height: 38, borderRadius: 12,
                border: `1px solid ${cfg.color}35`,
                background: `linear-gradient(to right, ${cfg.color}08, transparent)`,
                color: cfg.color, fontSize: 12, fontWeight: 700,
                fontFamily: "inherit", paddingLeft: 26, paddingRight: 36,
                outline: "none", cursor: "pointer",
                appearance: "none", WebkitAppearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2364748b'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                boxShadow: `0 2px 8px ${cfg.color}10`,
              }}
            >
              {storeSections.map((sec, i) => (
                <option key={sec.id} value={i}>{sec.name}</option>
              ))}
            </select>
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
                  canEdit={canEdit}
                  onPlace={handlePlace} onScanToPlace={handleScanToPlace}
                  onRemove={(sId, subId, ri, si) => canEdit && placeInSection(sId, subId, ri, si, null)}
                />
              </motion.div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: "#94a3b8", fontSize: 12 }}>Chưa có khu trưng bày</div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile FAB */}
      {canEdit && (
        <div className="flex md:hidden" style={{ position: "fixed", bottom: "calc(68px + env(safe-area-inset-bottom, 0px))", right: 16, zIndex: 200 }}>
          <button onClick={() => setPickerOpen(true)}
            style={{ width: 52, height: 52, borderRadius: 26, background: "linear-gradient(135deg, #C9A55A, #e6c474)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(201,165,90,0.45)", position: "relative" }}>
            <Package size={20} color="#fff" />
            {selectedPid && <span style={{ position: "absolute", top: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: "#10b981", border: "2px solid #fff" }} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Shelf Management Panel ───────────────────────────────────────────────────
function ShelfManagePanel({
  warehouseShelves, onAdd, onRemove, onAdjustSlots,
}: {
  warehouseShelves: WarehouseShelf[];
  onAdd: (type: "shoes" | "bags") => void;
  onRemove: (id: string) => void;
  onAdjustSlots: (id: string, delta: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const shoes = warehouseShelves.filter(s => s.shelfType === "shoes");
  const bags  = warehouseShelves.filter(s => s.shelfType === "bags");

  return (
    <div style={{ flexShrink: 0 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
          borderRadius: 12, border: "1px solid #bae6fd", background: open ? "#f0f9ff" : "#fff",
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
        }}>
        <Settings2 size={13} style={{ color: "#0ea5e9" }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: "#0ea5e9" }}>Quản Lý Kệ</span>
        {open ? <ChevronUp size={12} style={{ color: "#94a3b8" }} /> : <ChevronRight size={12} style={{ color: "#94a3b8" }} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ paddingTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Add buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onAdd("shoes")}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 10, border: "1.5px dashed #0ea5e9", background: "rgba(14,165,233,0.05)", cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 600, color: "#0ea5e9" }}>
                  <Plus size={12} /> Thêm kệ Giày
                </button>
                <button onClick={() => onAdd("bags")}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 10, border: "1.5px dashed #10b981", background: "rgba(16,185,129,0.05)", cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 600, color: "#10b981" }}>
                  <Plus size={12} /> Thêm kệ Túi
                </button>
              </div>

              {/* Shelf list */}
              {[{ label: "KỆ GIÀY", shelves: shoes, color: "#0ea5e9" }, { label: "KỆ TÚI", shelves: bags, color: "#10b981" }].map(group => (
                <div key={group.label}>
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: group.color, letterSpacing: "0.15em", marginBottom: 6 }}>{group.label} ({group.shelves.length})</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {group.shelves.map(shelf => {
                      const slotsPerTier = shelf.tiers[0]?.length ?? 25;
                      const filled = shelf.tiers.reduce((s, t) => s + t.filter(Boolean).length, 0);
                      return (
                        <div key={shelf.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "#fff", border: `1px solid ${group.color}22` }}>
                          <div style={{ width: 3, height: 28, borderRadius: 2, background: group.color, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: "#0c1a2e" }}>{shelf.name}</p>
                            <p style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>{shelf.tiers.length} tầng · {slotsPerTier} ô/tầng · {filled} SP</p>
                          </div>
                          {/* Adjust slots per tier */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 8, color: "#64748b" }}>Ô:</span>
                            <button onClick={() => onAdjustSlots(shelf.id, -1)} disabled={slotsPerTier <= 5}
                              style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid #e2e8f0", background: slotsPerTier <= 5 ? "#f8fafc" : "#fff", cursor: slotsPerTier <= 5 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Minus size={10} style={{ color: slotsPerTier <= 5 ? "#cbd5e1" : "#0c1a2e" }} />
                            </button>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#0c1a2e", minWidth: 20, textAlign: "center" }}>{slotsPerTier}</span>
                            <button onClick={() => onAdjustSlots(shelf.id, 1)} disabled={slotsPerTier >= 50}
                              style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid #e2e8f0", background: slotsPerTier >= 50 ? "#f8fafc" : "#fff", cursor: slotsPerTier >= 50 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Plus size={10} style={{ color: slotsPerTier >= 50 ? "#cbd5e1" : "#0c1a2e" }} />
                            </button>
                          </div>
                          {/* Remove shelf */}
                          <button onClick={() => { if (confirm(`Xoá kệ "${shelf.name}"?`)) onRemove(shelf.id); }}
                            style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #fee2e2", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Trash2 size={11} style={{ color: "#dc2626" }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Warehouse Tab ────────────────────────────────────────────────────────────
function WarehouseTab({ products, warehouseShelves, placeInWarehouse, highlightPid, canEdit,
  addWarehouseShelf, removeWarehouseShelf, adjustShelfSlots,
}: {
  products: Product[]; warehouseShelves: WarehouseShelf[];
  placeInWarehouse: (shelfId: string, ti: number, si: number, pid: string | null) => void;
  highlightPid: string | null; canEdit: boolean;
  addWarehouseShelf: (type: "shoes" | "bags") => void;
  removeWarehouseShelf: (id: string) => void;
  adjustShelfSlots: (id: string, delta: number) => void;
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

  useEffect(() => {
    if (!effectiveHighlight) return;
    const idx = warehouseShelves.findIndex(sh => sh.tiers.some(t => t.includes(effectiveHighlight)));
    if (idx !== -1) setShelfIdx(idx);
    // Scroll to highlighted product after shelf renders
    setTimeout(() => {
      const el = document.querySelector(`[data-hpid="${effectiveHighlight}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 300);
  }, [effectiveHighlight]); // eslint-disable-line

  const handlePlace = useCallback((shelfId: string, ti: number, si: number) => {
    if (!selectedPid || !canEdit) return;
    placeInWarehouse(shelfId, ti, si, selectedPid);
    setSelectedPid(null);
  }, [selectedPid, placeInWarehouse, canEdit]);

  const handleScanToPlace = useCallback((shelfId: string, ti: number, si: number) => {
    if (!canEdit) return;
    const shelf = warehouseShelves.find(s => s.id === shelfId);
    const label = shelf ? `${shelf.name} · Tầng ${ti + 1}, Ô ${si + 1}` : `Ô ${si + 1}`;
    setPendingSlot({ kind: "warehouse", shelfId, ti, si, label });
    setQrNotFound(null);
    setQrOpen(true);
  }, [warehouseShelves, canEdit]);

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

      {canEdit && (
        <ProductPicker products={products} selectedPid={selectedPid} onSelect={setSelectedPid}
          assignedIds={warehouseIds} mode="warehouse" open={pickerOpen} onClose={() => setPickerOpen(false)} />
      )}

      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8, minWidth: 0, minHeight: 0 }}>
        {/* Search row */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160, display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #bae6fd", borderRadius: 12, padding: "0 12px", height: 38 }}>
            <Search size={13} style={{ color: "#94a3b8" }} strokeWidth={1.5} />
            <input value={wSearch} onChange={e => setWSearch(e.target.value)} placeholder="Tìm SKU, tên..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, fontFamily: "inherit", color: "#0c1a2e" }} />
            {wSearch && <button onClick={() => setWSearch("")} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={11} style={{ color: "#94a3b8" }} /></button>}
          </div>
          <div className="hidden md:flex" style={{ gap: 6 }}>
            {[
              { label: "SP", val: products.length, color: "#0c1a2e" },
              { label: "Kho", val: warehouseIds.size, color: "#0ea5e9" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 12px", height: 38, borderRadius: 12, background: "#fff", border: "1px solid #bae6fd" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.val}</span>
                <span style={{ fontSize: 9, color: "#64748b" }}>{s.label}</span>
              </div>
            ))}
          </div>
          {!canEdit && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 12px", height: 38, borderRadius: 12, background: "rgba(148,163,184,0.08)", border: "1px solid #e2e8f0" }}>
              <Lock size={11} style={{ color: "#94a3b8" }} />
              <span style={{ fontSize: 9, color: "#94a3b8" }}>Chỉ xem</span>
            </div>
          )}
        </div>

        {/* Shelf manage panel (admin only) */}
        {canEdit && (
          <ShelfManagePanel
            warehouseShelves={warehouseShelves}
            onAdd={addWarehouseShelf}
            onRemove={removeWarehouseShelf}
            onAdjustSlots={adjustShelfSlots}
          />
        )}

        {/* Selected chip */}
        <AnimatePresence>
          {selectedPid && canEdit && (
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
          <div style={{ flexShrink: 0, position: "relative" }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 4, height: 16, borderRadius: 3, background: shelfTypeColor, boxShadow: `0 0 6px ${shelfTypeColor}60`, zIndex: 1, pointerEvents: "none" }} />
            <select
              value={clampedIdx}
              onChange={e => setShelfIdx(Number(e.target.value))}
              style={{
                width: "100%", height: 38, borderRadius: 12,
                border: `1px solid ${shelfTypeColor}35`,
                background: `linear-gradient(to right, ${shelfTypeColor}08, transparent)`,
                color: "#0c1a2e", fontSize: 11, fontWeight: 600,
                fontFamily: "inherit", paddingLeft: 26, paddingRight: 36,
                outline: "none", cursor: "pointer",
                appearance: "none", WebkitAppearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2364748b'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                boxShadow: `0 2px 8px ${shelfTypeColor}10`,
              }}
            >
              {warehouseShelves.map((shelf, i) => (
                <option key={shelf.id} value={i}>
                  {shelf.shelfType === "bags" ? "TÚI" : "GIÀY"} · {shelf.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Shelf content */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
          <AnimatePresence mode="wait" initial={false}>
            {currentShelf ? (
              <motion.div key={currentShelf.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                <ShelfView shelf={currentShelf} products={products}
                  selectedPid={selectedPid} highlightPid={effectiveHighlight}
                  canEdit={canEdit}
                  onPlace={handlePlace} onScanToPlace={handleScanToPlace}
                  onRemove={(shelfId, ti, si) => canEdit && placeInWarehouse(shelfId, ti, si, null)} />
              </motion.div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: "#94a3b8", fontSize: 12 }}>Chưa có kệ nào</div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile FAB */}
      {canEdit && (
        <div className="flex md:hidden" style={{ position: "fixed", bottom: "calc(68px + env(safe-area-inset-bottom, 0px))", right: 16, zIndex: 200 }}>
          <button onClick={() => setPickerOpen(true)}
            style={{ width: 52, height: 52, borderRadius: 26, background: "linear-gradient(135deg, #10b981, #34d399)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(16,185,129,0.4)", position: "relative" }}>
            <Package size={20} color="#fff" />
            {selectedPid && <span style={{ position: "absolute", top: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: "#C9A55A", border: "2px solid #fff" }} />}
          </button>
        </div>
      )}
    </div>
  );
}

const TIER_LABELS = ["Tầng 4", "Tầng 3", "Tầng 2", "Tầng 1"];
const COLS = 5;

function ShelfView({ shelf, products, selectedPid, highlightPid, canEdit, onPlace, onScanToPlace, onRemove }: {
  shelf: WarehouseShelf; products: Product[];
  selectedPid: string | null; highlightPid: string | null;
  canEdit: boolean;
  onPlace: (shelfId: string, ti: number, si: number) => void;
  onScanToPlace: (shelfId: string, ti: number, si: number) => void;
  onRemove: (shelfId: string, ti: number, si: number) => void;
}) {
  const filled = shelf.tiers.reduce((s, t) => s + t.filter(Boolean).length, 0);
  const total = shelf.tiers.length * (shelf.tiers[0]?.length ?? 25);
  const density = total > 0 ? filled / total : 0;
  const densityColor = density >= 0.85 ? "#dc2626" : density >= 0.6 ? "#C9A55A" : "#10b981";

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 2px 12px rgba(14,165,233,0.06)" }}>
      <div style={{ padding: "10px 14px", background: "linear-gradient(to bottom, #f8fbff, #f0f9ff)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <Warehouse size={13} style={{ color: "#0ea5e9" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#0c1a2e", flex: 1 }}>{shelf.name}</span>
        <div style={{ width: 50, height: 4, background: "#e0f2fe", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${density * 100}%`, background: densityColor, borderRadius: 4, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: 9, color: "#64748b" }}>{filled}/{total}</span>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {shelf.tiers.map((tier, ti) => (
          <div key={ti} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <span style={{ fontSize: 8, fontWeight: 600, color: "#94a3b8", width: 34, textAlign: "right", flexShrink: 0, paddingTop: 9 }}>{TIER_LABELS[ti]}</span>
            <div style={{ display: "flex", flexWrap: "nowrap", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
              {tier.map((pid, si) => {
                const p = pid && typeof pid === "string" ? products.find(x => x.id === pid) ?? null : null;
                const isHighlit = !!pid && pid === highlightPid;
                if (p) return (
                  <div key={si} {...(isHighlit ? { "data-hpid": p.id } : {})}>
                    <ProductCard product={p} size={48} highlight={isHighlit}
                      onRemove={canEdit ? () => onRemove(shelf.id, ti, si) : undefined} />
                  </div>
                );
                return (
                  <EmptySlot key={si} size={48}
                    canPlace={canEdit && !!selectedPid} canScan={canEdit && !selectedPid}
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

function SectionView({ section, products, selectedPid, highlightPid, canEdit, onPlace, onScanToPlace, onRemove }: {
  section: StoreSection; products: Product[];
  selectedPid: string | null; highlightPid: string | null;
  canEdit: boolean;
  onPlace: (sId: string, subId: string, ri: number, si: number) => void;
  onScanToPlace: (sId: string, subId: string, ri: number, si: number) => void;
  onRemove: (sId: string, subId: string, ri: number, si: number) => void;
}) {
  const cfg = ZONE_CFG[section.sectionType] ?? ZONE_CFG.window;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {section.subsections.map(sub => {
        const filled = sub.rows.reduce((s, r) => s + r.products.filter(Boolean).length, 0);
        const total = sub.rows.reduce((s, r) => s + r.products.length, 0);
        const pct = total > 0 ? (filled / total) * 100 : 0;
        return (
          <div key={sub.id} style={{ background: "#fff", border: `1px solid ${cfg.color}30`, borderRadius: 14, overflow: "visible", boxShadow: `0 2px 10px ${cfg.color}08` }}>
            <div style={{ padding: "8px 12px", background: `linear-gradient(to right, ${cfg.bg}, transparent)`, borderBottom: `1px solid ${cfg.color}20`, display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: cfg.color, flex: 1 }}>{sub.name}</p>
              <span style={{ fontSize: 8, color: cfg.color, opacity: 0.7 }}>{filled}/{total}</span>
              <div style={{ width: 40, height: 3, borderRadius: 2, background: `${cfg.color}22`, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: cfg.color, borderRadius: 2, transition: "width 0.3s" }} />
              </div>
            </div>
            <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 8, overflow: "visible" }}>
              {[...sub.rows].reverse().map((row, revIdx) => {
                const ri = sub.rows.length - 1 - revIdx;
                if (row.type === "image") return (
                  <div key={ri} style={{ height: 16, borderRadius: 6, background: "#f0f9ff", display: "flex", alignItems: "center", paddingLeft: 8 }}>
                    <span style={{ fontSize: 7, color: "#94a3b8", letterSpacing: "0.2em" }}>TRANH / DECOR</span>
                  </div>
                );
                const emptySize = row.type === "long" ? 52 : 44;
                return (
                  <div key={ri} style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                    <span style={{ fontSize: 7, width: 20, flexShrink: 0, color: "#94a3b8", fontFamily: "monospace", textAlign: "right", paddingTop: 8 }}>
                      {row.type === "long" ? "D" : "N"}
                    </span>
                    <div style={{ display: "flex", gap: 5, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 2 }}>
                      {row.products.map((pid, si) => {
                        const p = pid && typeof pid === "string" ? products.find(x => x.id === pid) ?? null : null;
                        const isHighlit = pid === highlightPid;
                        if (p) return (
                          <div key={si} {...(isHighlit ? { "data-hpid": p.id } : {})}>
                            <ProductCard product={p} variant="label"
                              highlight={isHighlit}
                              onRemove={canEdit ? () => onRemove(section.id, sub.id, ri, si) : undefined} />
                          </div>
                        );
                        return (
                          <EmptySlot key={si} size={emptySize}
                            canPlace={canEdit && !!selectedPid} canScan={canEdit && !selectedPid}
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

// ─── Realtime hook ────────────────────────────────────────────────────────────
function useRealtimeSync(onRefresh: () => void) {
  const [online, setOnline] = useState(true);
  const esRef = useRef<EventSource | null>(null);
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
  const {
    products, storeSections, warehouseShelves,
    placeInSection, placeInWarehouse, fetchDbState,
    currentUser, addWarehouseShelf, removeWarehouseShelf,
  } = useStore();

  const [subtab, setSubtab] = useState<Subtab>("display");
  const [highlightPid, setHighlightPid] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Permission: only admin/manager can edit
  const canEdit = currentUser?.role === "admin" || currentUser?.role === "manager";

  // Adjust slots per tier for a shelf (client-side only — modifies tiers array width)
  const adjustShelfSlots = useCallback((shelfId: string, delta: number) => {
    // We use placeInWarehouse with a trick: adjust via Zustand directly
    // This is a client-side layout change only
    const store = useStore.getState();
    const shelf = store.warehouseShelves.find(s => s.id === shelfId);
    if (!shelf) return;
    const current = shelf.tiers[0]?.length ?? 25;
    const next = Math.max(5, Math.min(50, current + delta));
    if (next === current) return;
    // Rebuild tiers with new slot count
    const newTiers = shelf.tiers.map(tier => {
      if (next > current) return [...tier, ...Array(next - current).fill(null)];
      return tier.slice(0, next);
    });
    useStore.setState(s => ({
      warehouseShelves: s.warehouseShelves.map(sh =>
        sh.id === shelfId ? { ...sh, tiers: newTiers } : sh
      ),
    }));
  }, []);

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
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%", minHeight: 0 }}>

      {/* Header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div className="hidden md:block">
          <p style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.3em" }}>Vị Trí · POSTLAIN</p>
          <h1 style={{ fontSize: 20, fontWeight: 300, color: "#0c1a2e", letterSpacing: "0.04em", marginTop: 1 }}>Quản Lý Vị Trí</h1>
        </div>
        <div style={{ flex: 1 }} />
        {/* Realtime indicator */}
        <motion.div
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: online ? "rgba(16,185,129,0.07)" : "rgba(148,163,184,0.07)", border: `1px solid ${online ? "rgba(16,185,129,0.25)" : "rgba(148,163,184,0.25)"}` }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: online ? "#10b981" : "#94a3b8", boxShadow: online ? "0 0 6px rgba(16,185,129,0.7)" : "none" }} />
          <span style={{ fontSize: 8.5, color: online ? "#10b981" : "#94a3b8", fontWeight: 700, letterSpacing: "0.1em" }}>{online ? "LIVE" : "OFFLINE"}</span>
        </motion.div>
        <motion.button onClick={handleRefresh} title="Tải lại"
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
          style={{ width: 36, height: 36, borderRadius: 11, border: "1px solid var(--border)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 4px rgba(14,165,233,0.08)" }}>
          <RefreshCw size={13} style={{ color: "var(--blue)", animation: refreshing ? "spin 0.6s linear infinite" : "none" }} />
        </motion.button>
      </div>

      {/* Subtab switcher */}
      <div style={{ flexShrink: 0, display: "flex", gap: 3, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 4, alignSelf: "flex-start", boxShadow: "0 1px 4px rgba(14,165,233,0.06)" }}>
        {([
          { key: "display" as const,   label: "TRƯNG BÀY",  icon: Eye,       color: "#0ea5e9" },
          { key: "warehouse" as const, label: "KHO HÀNG",   icon: Warehouse, color: "#10b981" },
        ]).map(({ key, label, icon: Icon, color }) => (
          <motion.button key={key} onClick={() => setSubtab(key)}
            whileHover={{ scale: subtab !== key ? 1.02 : 1 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, border: "none",
              background: subtab === key ? color : "transparent",
              color: subtab === key ? "#fff" : "var(--text-secondary)",
              fontSize: 10, fontWeight: subtab === key ? 700 : 500, letterSpacing: "0.1em",
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s",
              boxShadow: subtab === key ? `0 3px 12px ${color}40` : "none",
            }}>
            <Icon size={13} />
            {label}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={subtab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
          style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {subtab === "display" ? (
            <DisplayTab
              products={products} storeSections={storeSections}
              placeInSection={placeInSection} highlightPid={highlightPid}
              canEdit={canEdit}
            />
          ) : (
            <WarehouseTab
              products={products} warehouseShelves={warehouseShelves}
              placeInWarehouse={placeInWarehouse} highlightPid={highlightPid}
              canEdit={canEdit}
              addWarehouseShelf={addWarehouseShelf}
              removeWarehouseShelf={removeWarehouseShelf}
              adjustShelfSlots={adjustShelfSlots}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
