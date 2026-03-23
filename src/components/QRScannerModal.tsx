"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Camera, Package, ArrowUpRight, ArrowDownRight,
  Check, AlertTriangle, ScanLine,
} from "lucide-react";
import { useStore } from "@/store/useStore";

type Product = {
  id: string; name: string; sku: string | null;
  quantity: number; category: string; color?: string;
};

type Props = { open: boolean; onClose: () => void };

// ─── Fuzzy SKU matcher (same logic as visual-board) ──────────────────────────
function matchProductBySku(products: Product[], code: string): Product | null {
  const raw = code.trim();

  // 1. Exact SKU
  let m = products.find(p => p.sku && p.sku.trim().toLowerCase() === raw.toLowerCase());
  if (m) return m;

  // 2. Exact name
  m = products.find(p => p.name.toLowerCase() === raw.toLowerCase());
  if (m) return m;

  // 3. Strip leading zeros from both
  const norm = raw.replace(/^0+/, "") || "0";
  m = products.find(p => {
    if (!p.sku) return false;
    return (p.sku.trim().replace(/^0+/, "") || "0") === norm;
  });
  if (m) return m;

  // 4. Scanned code contains SKU
  m = products.find(p => p.sku && raw.toLowerCase().includes(p.sku.trim().toLowerCase()));
  if (m) return m;

  // 5. SKU is a prefix of the scanned code
  m = products.find(p => p.sku && raw.toLowerCase().startsWith(p.sku.trim().toLowerCase()));
  if (m) return m;

  return null;
}

export default function QRScannerModal({ open, onClose }: Props) {
  const { currentUser } = useStore();
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [found, setFound] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [action, setAction] = useState<"in" | "out">("in");
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lockRef = useRef(false); // prevent duplicate detections

  // ── Load all products for fuzzy local matching ──────────────────────────────
  useEffect(() => {
    if (!open) return;
    fetch("/api/products")
      .then(r => r.json())
      .then(d => setAllProducts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [open]);

  // ── Stop camera ─────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  // ── Process a detected barcode string ───────────────────────────────────────
  const handleCode = useCallback(async (raw: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    stopCamera();

    // Try local fuzzy match first (instant)
    if (allProducts.length > 0) {
      const local = matchProductBySku(allProducts, raw);
      if (local) { setFound(local); setNotFound(null); lockRef.current = false; return; }
    }

    // Fallback: API lookup (supports server-side lookup)
    setNotFound(null);
    try {
      const res = await fetch(`/api/products?sku=${encodeURIComponent(raw.trim())}`);
      if (res.ok) {
        const data = await res.json();
        const product = Array.isArray(data) ? data[0] : data;
        if (product) { setFound(product as Product); lockRef.current = false; return; }
      }
    } catch { /* ignore */ }

    setNotFound(raw);
    lockRef.current = false;
  }, [allProducts, stopCamera]);

  // ── Start camera + multi-format scan loop ────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setFound(null);
    setNotFound(null);
    lockRef.current = false;

    // 1. Get camera stream
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    } catch (e: unknown) {
      const msg = (e instanceof Error && e.name === "NotAllowedError")
        ? "Vui lòng cấp quyền camera trong cài đặt trình duyệt"
        : "Không thể mở camera. Dùng chế độ nhập SKU thủ công.";
      setCameraError(msg);
      setMode("manual");
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try { await videoRef.current.play(); } catch { /* autoplay may be blocked */ }
    }
    setScanning(true);

    // 2. Try native BarcodeDetector (Chrome Android / desktop Chrome)
    const nativeDetector: null | {
      detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
    } = (() => {
      try {
        if (typeof window !== "undefined" && "BarcodeDetector" in window) {
          const BD = (window as unknown as {
            BarcodeDetector: new (opts: { formats: string[] }) => {
              detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
            };
          }).BarcodeDetector;
          return new BD({
            formats: ["qr_code", "ean_13", "ean_8", "ean_2", "ean_5",
              "code_128", "code_39", "code_93", "codabar",
              "upc_a", "upc_e", "itf", "aztec", "data_matrix"],
          });
        }
      } catch { /* not available */ }
      return null;
    })();

    // 3. Dynamically import zxing for broad format coverage
    type ZxingReader = { decodeFromVideoElement: (el: HTMLVideoElement) => Promise<{ getText(): string }> };
    let zxingReader: ZxingReader | null = null;
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      zxingReader = new BrowserMultiFormatReader() as unknown as ZxingReader;
    } catch { /* zxing not available */ }

    // 4. Canvas-based jsqr fallback for QR codes
    type JsQRFn = (data: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
    let jsQR: JsQRFn | null = null;
    try {
      const mod = await import("jsqr");
      jsQR = mod.default as unknown as JsQRFn;
    } catch { /* not available */ }

    // 5. Scan loop — runs every animation frame, tries each detector
    const tick = async () => {
      if (lockRef.current || !streamRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState >= video.HAVE_ENOUGH_DATA) {
        // Try native BarcodeDetector first (fastest)
        if (nativeDetector) {
          try {
            const results = await nativeDetector.detect(video);
            if (results.length > 0) {
              handleCode(results[0].rawValue);
              return;
            }
          } catch { /* may fail on first frames */ }
        }

        // Try zxing (best cross-platform coverage)
        if (zxingReader) {
          try {
            const result = await zxingReader.decodeFromVideoElement(video);
            if (result) {
              handleCode(result.getText());
              return;
            }
          } catch { /* NotFoundException is normal when no barcode in frame */ }
        }

        // Try jsqr canvas fallback (QR only)
        if (jsQR && canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(img.data, img.width, img.height);
            if (result) {
              handleCode(result.data);
              return;
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [handleCode]);

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setFound(null); setNotFound(null); setDone(false);
      setManualInput(""); setCameraError(null); setQty(1);
      setMode("scan");
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    if (mode === "manual") {
      stopCamera();
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      startCamera();
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Manual lookup ────────────────────────────────────────────────────────────
  const handleManualSearch = useCallback(async () => {
    const q = manualInput.trim();
    if (!q) return;
    setNotFound(null); setFound(null);

    // Local fuzzy first
    if (allProducts.length > 0) {
      const local = matchProductBySku(allProducts, q)
        ?? allProducts.find(p => p.name.toLowerCase().includes(q.toLowerCase()));
      if (local) { setFound(local); return; }
    }

    // API fallback
    try {
      const res = await fetch(`/api/products?sku=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        const product = Array.isArray(data) ? data[0] : data;
        if (product) { setFound(product as Product); return; }
      }
    } catch { /* ignore */ }
    setNotFound(q);
  }, [manualInput, allProducts]);

  // ── Confirm stock movement ────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!found || !currentUser || done) return;
    const movement = {
      productId: found.id,
      productName: found.name,
      variant: [found.color, found.category].filter(Boolean).join(" / "),
      type: action === "in" ? "RECEIVE" : "SALE",
      fromLoc: action === "out" ? "Kho / Kệ" : null,
      toLoc: action === "in" ? "Kho" : null,
      qty: action === "in" ? qty : -qty,
      byUser: currentUser.name,
    };
    await fetch("/api/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(movement),
    }).catch(() => {});
    const newQty = action === "in"
      ? found.quantity + qty
      : Math.max(0, found.quantity - qty);
    await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...found, quantity: newQty }),
    }).catch(() => {});
    useStore.getState().fetchProducts();
    setDone(true);
    setTimeout(() => {
      setDone(false); setFound(null); setManualInput(""); setQty(1);
      setNotFound(null);
      // Restart scanner for next product
      if (mode === "scan") startCamera();
    }, 1800);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(12,26,46,0.65)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: "#fff", borderRadius: 20, border: "1px solid #bae6fd",
            boxShadow: "0 24px 64px rgba(12,26,46,0.22)",
            width: "100%", maxWidth: 420, overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0f2fe", display: "flex", alignItems: "center", gap: 10 }}>
            <ScanLine size={14} style={{ color: "#0ea5e9" }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#0c1a2e", flex: 1 }}>Quét Mã / Tìm Sản Phẩm</p>
            <div style={{ display: "flex", gap: 4 }}>
              {(["scan", "manual"] as const).map(m => (
                <button
                  key={m} onClick={() => setMode(m)}
                  style={{
                    fontSize: 8.5, padding: "3px 10px", borderRadius: 8,
                    border: `1px solid ${mode === m ? "#0ea5e9" : "#e0f2fe"}`,
                    background: mode === m ? "rgba(14,165,233,0.08)" : "transparent",
                    color: mode === m ? "#0ea5e9" : "#94a3b8",
                    cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                  }}
                >
                  {m === "scan" ? "Camera" : "Nhập SKU"}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #e0f2fe", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <X size={12} style={{ color: "#64748b" }} />
            </button>
          </div>

          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Camera view */}
            {mode === "scan" && (
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#0c1a2e", aspectRatio: "4/3" }}>
                <video
                  ref={videoRef}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  playsInline muted autoPlay
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {/* Scanning overlay */}
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ width: 200, height: 160, position: "relative" }}>
                    {/* Corner brackets */}
                    {[
                      { top: 0, left: 0, borderTop: "2.5px solid #C9A55A", borderLeft: "2.5px solid #C9A55A" },
                      { top: 0, right: 0, borderTop: "2.5px solid #C9A55A", borderRight: "2.5px solid #C9A55A" },
                      { bottom: 0, left: 0, borderBottom: "2.5px solid #C9A55A", borderLeft: "2.5px solid #C9A55A" },
                      { bottom: 0, right: 0, borderBottom: "2.5px solid #C9A55A", borderRight: "2.5px solid #C9A55A" },
                    ].map((s, i) => (
                      <div key={i} style={{ position: "absolute", width: 24, height: 24, ...s }} />
                    ))}
                    {/* Scan line */}
                    {scanning && (
                      <motion.div
                        animate={{ top: ["4px", "calc(100% - 6px)", "4px"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                          position: "absolute", left: 4, right: 4, height: 2,
                          background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.9), transparent)",
                          borderRadius: 2,
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Loading state */}
                {!scanning && !cameraError && (
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 8,
                    background: "rgba(12,26,46,0.7)",
                  }}>
                    <Camera size={24} style={{ color: "#7dd3fc", opacity: 0.6 }} />
                    <p style={{ fontSize: 11, color: "#7dd3fc" }}>Đang khởi động camera...</p>
                  </div>
                )}

                {/* Supported formats hint */}
                {scanning && (
                  <div style={{
                    position: "absolute", bottom: 8, left: 0, right: 0,
                    display: "flex", justifyContent: "center",
                  }}>
                    <div style={{
                      background: "rgba(12,26,46,0.7)", borderRadius: 8, padding: "3px 10px",
                    }}>
                      <p style={{ fontSize: 8, color: "#94a3b8", letterSpacing: "0.08em" }}>
                        QR · EAN-13 · Code-128 · Code-39 · UPC · DataMatrix
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual input */}
            {mode === "manual" && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={inputRef}
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleManualSearch()}
                  placeholder="Nhập SKU hoặc tên sản phẩm..."
                  style={{
                    flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd",
                    borderRadius: 10, padding: "9px 14px", fontSize: 12,
                    color: "#0c1a2e", outline: "none", fontFamily: "inherit",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={e => (e.target.style.borderColor = "#bae6fd")}
                />
                <button
                  onClick={handleManualSearch}
                  style={{
                    padding: "0 16px", borderRadius: 10, border: "none",
                    background: "#0ea5e9", color: "#fff", fontSize: 9,
                    fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}
                >TÌM</button>
              </div>
            )}

            {/* Camera error */}
            {cameraError && (
              <div style={{
                display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10,
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
                alignItems: "flex-start",
              }}>
                <AlertTriangle size={13} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 10, color: "#92400e", fontWeight: 600 }}>{cameraError}</p>
                  <button
                    onClick={() => { setCameraError(null); startCamera(); }}
                    style={{ fontSize: 9, color: "#0ea5e9", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4, fontFamily: "inherit" }}
                  >
                    Thử lại →
                  </button>
                </div>
              </div>
            )}

            {/* Not found */}
            {notFound && !found && (
              <div style={{
                display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10,
                background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)",
                alignItems: "flex-start",
              }}>
                <Package size={13} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>Không tìm thấy sản phẩm</p>
                  <p style={{ fontSize: 9, color: "#b91c1c", marginTop: 1 }}>
                    Mã: <span style={{ fontFamily: "monospace" }}>{notFound}</span>
                  </p>
                  <p style={{ fontSize: 8.5, color: "#94a3b8", marginTop: 2 }}>Kiểm tra lại SKU hoặc quét mã khác</p>
                </div>
                {mode === "scan" && (
                  <button
                    onClick={() => { setNotFound(null); startCamera(); }}
                    style={{
                      flexShrink: 0, padding: "4px 10px", borderRadius: 7,
                      border: "1px solid #bae6fd", background: "#f0f9ff",
                      fontSize: 8.5, color: "#0ea5e9", fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >Quét lại</button>
                )}
              </div>
            )}

            {/* Product found */}
            {found && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  padding: "12px 16px", borderRadius: 12,
                  background: "#f0f9ff", border: "1px solid #bae6fd",
                  display: "flex", gap: 12, alignItems: "center",
                }}>
                  {found.color && (
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: found.color, border: "1.5px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#0c1a2e" }}>{found.name}</p>
                    <p style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>
                      {found.category}{found.sku ? ` · SKU: ${found.sku}` : ""}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{
                      fontSize: 20, fontWeight: 700, lineHeight: 1,
                      color: found.quantity === 0 ? "#dc2626" : found.quantity <= 5 ? "#C9A55A" : "#0c1a2e",
                    }}>{found.quantity}</p>
                    <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>tồn kho</p>
                  </div>
                </div>

                {/* In / Out toggle */}
                <div style={{ display: "flex", gap: 8 }}>
                  {(["in", "out"] as const).map(a => (
                    <button
                      key={a} onClick={() => setAction(a)}
                      style={{
                        flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
                        fontFamily: "inherit",
                        border: `1.5px solid ${action === a ? (a === "in" ? "#16a34a" : "#dc2626") : "#e0f2fe"}`,
                        background: action === a
                          ? (a === "in" ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.06)")
                          : "#f8fafc",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      {a === "in"
                        ? <ArrowDownRight size={13} style={{ color: action === "in" ? "#16a34a" : "#94a3b8" }} />
                        : <ArrowUpRight size={13} style={{ color: action === "out" ? "#dc2626" : "#94a3b8" }} />
                      }
                      <span style={{ fontSize: 10, fontWeight: 700, color: action === a ? (a === "in" ? "#16a34a" : "#dc2626") : "#94a3b8" }}>
                        {a === "in" ? "NHẬP KHO" : "XUẤT KHO"}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Qty + confirm */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => setQty(v => Math.max(1, v - 1))}
                    style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid #bae6fd", background: "#f0f9ff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >−</button>
                  <input
                    type="number" min={1} value={qty}
                    onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                    style={{ flex: 1, textAlign: "center", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 9, padding: "8px", fontSize: 16, fontWeight: 700, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }}
                  />
                  <button
                    onClick={() => setQty(v => v + 1)}
                    style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid #bae6fd", background: "#f0f9ff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >+</button>
                  <button
                    onClick={handleConfirm}
                    style={{
                      flex: 2, height: 36, borderRadius: 9, border: "none",
                      background: done ? "#10b981" : (action === "in" ? "#16a34a" : "#dc2626"),
                      color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 6, transition: "background 0.2s",
                    }}
                  >
                    {done ? <><Check size={12} /> XONG!</> : `XÁC NHẬN ${action === "in" ? "+" : "−"}${qty}`}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
