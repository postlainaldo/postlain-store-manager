"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Package, ArrowUpRight, ArrowDownRight, Check, AlertTriangle } from "lucide-react";
import { useStore } from "@/store/useStore";

type Product = { id: string; name: string; sku: string | null; quantity: number; category: string; color?: string };

type Props = {
  open: boolean;
  onClose: () => void;
};

declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

export default function QRScannerModal({ open, onClose }: Props) {
  const { currentUser } = useStore();
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [found, setFound] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [action, setAction] = useState<"in" | "out">("in");
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<InstanceType<NonNullable<typeof window.BarcodeDetector>> | null>(null);
  const scanLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) clearInterval(scanLoopRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const lookupProduct = useCallback(async (sku: string) => {
    setNotFound(false);
    setFound(null);
    setManualInput(sku);
    try {
      const res = await fetch(`/api/products?sku=${encodeURIComponent(sku.trim())}`);
      if (!res.ok) { setNotFound(true); return; }
      const data = await res.json();
      const product = Array.isArray(data) ? data[0] : data;
      if (!product) { setNotFound(true); return; }
      setFound(product as Product);
    } catch {
      setNotFound(true);
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!window.BarcodeDetector) { setMode("manual"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      detectorRef.current = new window.BarcodeDetector!({
        formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"],
      });
      setScanning(true);
      scanLoopRef.current = setInterval(async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
          const results = await detectorRef.current.detect(videoRef.current);
          if (results.length > 0) {
            stopCamera();
            await lookupProduct(results[0].rawValue);
          }
        } catch {/**/}
      }, 400);
    } catch {
      setMode("manual");
      setError("Không thể mở camera. Vui lòng nhập SKU thủ công.");
    }
  }, [stopCamera, lookupProduct]);

  useEffect(() => {
    if (open) {
      setFound(null); setNotFound(false); setDone(false);
      setManualInput(""); setError(null); setQty(1);
      if (window.BarcodeDetector) { setMode("scan"); startCamera(); }
      else { setMode("manual"); setTimeout(() => inputRef.current?.focus(), 100); }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (mode === "manual") { stopCamera(); setTimeout(() => inputRef.current?.focus(), 100); }
    else startCamera();
  }, [mode]);

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
    const newQty = action === "in" ? found.quantity + qty : Math.max(0, found.quantity - qty);
    await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...found, quantity: newQty }),
    }).catch(() => {});
    useStore.getState().fetchProducts();
    setDone(true);
    setTimeout(() => {
      setDone(false); setFound(null); setManualInput(""); setQty(1); setNotFound(false);
    }, 2000);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(12,26,46,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: "#fff", borderRadius: 20, border: "1px solid #bae6fd", boxShadow: "0 24px 64px rgba(12,26,46,0.22)", width: "100%", maxWidth: 420, overflow: "hidden" }}
        >
          {/* Header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0f2fe", display: "flex", alignItems: "center", gap: 10 }}>
            <Camera size={14} style={{ color: "#0ea5e9" }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#0c1a2e", flex: 1 }}>Quét Mã / Tìm Sản Phẩm</p>
            <div style={{ display: "flex", gap: 4 }}>
              {(["scan", "manual"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{ fontSize: 8.5, padding: "3px 10px", borderRadius: 8, border: `1px solid ${mode === m ? "#0ea5e9" : "#e0f2fe"}`, background: mode === m ? "rgba(14,165,233,0.08)" : "transparent", color: mode === m ? "#0ea5e9" : "#94a3b8", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                  {m === "scan" ? "Camera" : "Nhập SKU"}
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #e0f2fe", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={12} style={{ color: "#64748b" }} />
            </button>
          </div>

          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Camera */}
            {mode === "scan" && (
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#0c1a2e", aspectRatio: "4/3" }}>
                <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline muted />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ width: 160, height: 160, position: "relative" }}>
                    {[[0,0],[0,1],[1,0],[1,1]].map(([r,c], i) => (
                      <div key={i} style={{ position: "absolute", width: 24, height: 24, top: r ? "auto" : 0, bottom: r ? 0 : "auto", left: c ? "auto" : 0, right: c ? 0 : "auto", borderTop: !r ? "2.5px solid #0ea5e9" : "none", borderBottom: r ? "2.5px solid #0ea5e9" : "none", borderLeft: !c ? "2.5px solid #0ea5e9" : "none", borderRight: c ? "2.5px solid #0ea5e9" : "none" }} />
                    ))}
                    {scanning && <div style={{ position: "absolute", left: 4, right: 4, height: 2, background: "rgba(14,165,233,0.8)", animation: "scanLine 1.8s ease-in-out infinite" }} />}
                  </div>
                </div>
                {!scanning && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(12,26,46,0.6)" }}>
                    <p style={{ fontSize: 11, color: "#7dd3fc" }}>Đang khởi động camera...</p>
                  </div>
                )}
              </div>
            )}

            {/* Manual */}
            {mode === "manual" && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={inputRef}
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && lookupProduct(manualInput)}
                  placeholder="Nhập SKU hoặc tên sản phẩm..."
                  style={{ flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "9px 14px", fontSize: 12, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }}
                  onFocus={e => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={e => (e.target.style.borderColor = "#bae6fd")}
                />
                <button onClick={() => lookupProduct(manualInput)} style={{ padding: "0 16px", borderRadius: 10, border: "none", background: "#0ea5e9", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>TÌM</button>
              </div>
            )}

            {error && (
              <div style={{ display: "flex", gap: 6, padding: "8px 12px", borderRadius: 8, background: "rgba(201,165,90,0.08)", border: "1px solid rgba(201,165,90,0.25)", alignItems: "center" }}>
                <AlertTriangle size={11} style={{ color: "#C9A55A" }} />
                <p style={{ fontSize: 10, color: "#92712a" }}>{error}</p>
              </div>
            )}

            {notFound && (
              <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", alignItems: "center" }}>
                <Package size={13} style={{ color: "#dc2626" }} />
                <p style={{ fontSize: 11, color: "#dc2626" }}>Không tìm thấy sản phẩm với mã <strong>{manualInput}</strong></p>
              </div>
            )}

            {found && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "#f0f9ff", border: "1px solid #bae6fd", display: "flex", gap: 12, alignItems: "center" }}>
                  {found.color && <div style={{ width: 12, height: 12, borderRadius: "50%", background: found.color, border: "1.5px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#0c1a2e" }}>{found.name}</p>
                    <p style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{found.category}{found.sku ? ` · SKU: ${found.sku}` : ""}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 20, fontWeight: 700, color: found.quantity === 0 ? "#dc2626" : found.quantity <= 5 ? "#C9A55A" : "#0c1a2e" }}>{found.quantity}</p>
                    <p style={{ fontSize: 8, color: "#94a3b8" }}>tồn kho</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {(["in", "out"] as const).map(a => (
                    <button key={a} onClick={() => setAction(a)} style={{ flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", border: `1.5px solid ${action === a ? (a === "in" ? "#16a34a" : "#dc2626") : "#e0f2fe"}`, background: action === a ? (a === "in" ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.06)") : "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      {a === "in" ? <ArrowDownRight size={13} style={{ color: action === "in" ? "#16a34a" : "#94a3b8" }} /> : <ArrowUpRight size={13} style={{ color: action === "out" ? "#dc2626" : "#94a3b8" }} />}
                      <span style={{ fontSize: 10, fontWeight: 700, color: action === a ? (a === "in" ? "#16a34a" : "#dc2626") : "#94a3b8" }}>{a === "in" ? "NHẬP KHO" : "XUẤT KHO"}</span>
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => setQty(v => Math.max(1, v - 1))} style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid #bae6fd", background: "#f0f9ff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} style={{ flex: 1, textAlign: "center", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 9, padding: "8px", fontSize: 16, fontWeight: 700, color: "#0c1a2e", outline: "none", fontFamily: "inherit" }} />
                  <button onClick={() => setQty(v => v + 1)} style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid #bae6fd", background: "#f0f9ff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  <button onClick={handleConfirm} style={{ flex: 2, height: 36, borderRadius: 9, border: "none", background: done ? "#10b981" : (action === "in" ? "#16a34a" : "#dc2626"), color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.2s" }}>
                    {done ? <><Check size={12} /> XONG!</> : `XÁC NHẬN ${action === "in" ? "+" : "−"}${qty}`}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
      <style>{`@keyframes scanLine { 0%,100% { top: 4px; } 50% { top: calc(100% - 6px); } }`}</style>
    </AnimatePresence>
  );
}
