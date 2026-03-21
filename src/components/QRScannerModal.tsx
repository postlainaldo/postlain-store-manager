"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Product, StoreSection, WarehouseShelf } from "@/types";

// BarcodeDetector type declaration
declare class BarcodeDetector {
  static getSupportedFormats(): Promise<string[]>;
  constructor(options?: { formats: string[] });
  detect(source: HTMLVideoElement | HTMLCanvasElement): Promise<Array<{ rawValue: string; format: string }>>;
}

interface Props { onClose: () => void; }

interface ProductResult {
  product: Product;
  displayLocations: string[];
  warehouseLocations: string[];
}

function findProductLocations(
  productId: string,
  storeSections: StoreSection[],
  warehouseShelves: WarehouseShelf[]
) {
  const displayLocations: string[] = [];
  const warehouseLocations: string[] = [];

  for (const section of storeSections) {
    for (const sub of section.subsections) {
      let found = false;
      for (const row of sub.rows) {
        if (!found && row.products.includes(productId)) {
          displayLocations.push(`${section.name} › ${sub.name}`);
          found = true;
        }
      }
    }
  }

  for (const shelf of warehouseShelves) {
    for (let ti = 0; ti < shelf.tiers.length; ti++) {
      const count = shelf.tiers[ti].filter((id: string | null) => id === productId).length;
      if (count > 0) warehouseLocations.push(`${shelf.name} — Tầng ${ti + 1} (×${count})`);
    }
  }
  return { displayLocations, warehouseLocations };
}

export default function QRScannerModal({ onClose }: Props) {
  const { products, storeSections, warehouseShelves } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [result, setResult] = useState<ProductResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hasBarcodeDetector] = useState(() => typeof window !== "undefined" && "BarcodeDetector" in window);

  const searchProduct = useCallback((query: string) => {
    const q = query.trim();
    if (!q) return;
    const p = products.find(
      (p) => p.sku === q || p.id === q || p.name.toLowerCase() === q.toLowerCase()
    );
    if (p) {
      const locs = findProductLocations(p.id, storeSections, warehouseShelves);
      setResult({ product: p, ...locs });
      setNotFound(false);
    } else {
      setResult(null);
      setNotFound(true);
    }
  }, [products, storeSections, warehouseShelves]);

  // Start camera
  useEffect(() => {
    if (!hasBarcodeDetector) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 480, height: 360 },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
        // Create detector
        detectorRef.current = new BarcodeDetector({
          formats: ["qr_code", "code_128", "code_39", "ean_13", "upc_a"],
        });
        setScanning(true);
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || !detectorRef.current) return;
          try {
            const codes = await detectorRef.current.detect(videoRef.current);
            if (codes.length > 0) {
              const val = codes[0].rawValue;
              setScanning(false);
              if (intervalRef.current) clearInterval(intervalRef.current);
              searchProduct(val);
              setManualInput(val);
            }
          } catch { /* ignore */ }
        }, 400);
      } catch {
        if (!cancelled) setCameraError("Không thể truy cập camera. Vui lòng dùng ô nhập bên dưới.");
      }
    })();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [hasBarcodeDetector, searchProduct]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const formatPrice = (p?: number) =>
    p ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(p) : "—";

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full max-w-md bg-white border border-border rounded shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-text-muted uppercase">Quét mã</p>
            <h2 className="text-text-primary font-light text-lg mt-0.5">QR / Barcode Scanner</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Camera viewfinder */}
          {hasBarcodeDetector && (
            <div className="relative bg-black rounded overflow-hidden" style={{ aspectRatio: "4/3" }}>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
              {cameraReady && scanning && (
                <>
                  {/* Scan guides */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gold" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gold" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold" />
                      {/* Scanning line */}
                      <motion.div
                        className="absolute left-2 right-2 h-0.5 bg-gold/70"
                        animate={{ top: ["8px", "calc(100% - 8px)", "8px"] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  </div>
                  <p className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-white/60 tracking-widest">
                    ĐANG QUÉT...
                  </p>
                </>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <p className="text-white/60 text-xs text-center px-4">{cameraError}</p>
                </div>
              )}
            </div>
          )}

          {/* Manual input */}
          <div>
            <label className="block text-[10px] tracking-[0.15em] text-text-muted uppercase mb-2">
              Nhập SKU / Mã sản phẩm thủ công
            </label>
            <div className="flex gap-2">
              <input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchProduct(manualInput)}
                placeholder="SKU hoặc tên sản phẩm..."
                className="flex-1 bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded focus:outline-none focus:border-gold/60 placeholder:text-text-muted"
              />
              <button
                onClick={() => searchProduct(manualInput)}
                className="px-4 py-2.5 bg-gold text-white text-xs tracking-wider rounded hover:bg-gold-light transition-all"
              >
                TÌM
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <motion.div
              className="bg-bg-card border border-gold/30 rounded p-4 space-y-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded bg-bg-elevated border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {result.product.imagePath
                    ? <img src={result.product.imagePath} alt="" className="w-full h-full object-cover" />
                    : <span className="text-gold text-lg font-light">{result.product.name.charAt(0)}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium text-sm truncate">{result.product.name}</p>
                  <p className="text-text-muted text-xs mt-0.5">{result.product.category}</p>
                  {result.product.sku && (
                    <p className="text-text-muted text-xs font-mono mt-0.5">SKU: {result.product.sku}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-lg font-light ${
                    result.product.quantity === 0
                      ? "text-red-500"
                      : result.product.quantity <= 5
                      ? "text-amber-500"
                      : "text-text-primary"
                  }`}>
                    {result.product.quantity}
                  </p>
                  <p className="text-[9px] text-text-muted">trong kho</p>
                </div>
              </div>

              {result.product.price && (
                <p className="text-sm text-gold font-light">{formatPrice(result.product.price)}</p>
              )}

              {/* Locations */}
              {(result.displayLocations.length > 0 || result.warehouseLocations.length > 0) && (
                <div className="pt-2 border-t border-border space-y-2">
                  {result.displayLocations.length > 0 && (
                    <div>
                      <p className="text-[9px] tracking-widest text-gold uppercase mb-1">Đang trưng bày</p>
                      {result.displayLocations.map((loc, i) => (
                        <p key={i} className="text-xs text-text-secondary">• {loc}</p>
                      ))}
                    </div>
                  )}
                  {result.warehouseLocations.length > 0 && (
                    <div>
                      <p className="text-[9px] tracking-widest text-text-muted uppercase mb-1">Trong kho</p>
                      {result.warehouseLocations.map((loc, i) => (
                        <p key={i} className="text-xs text-text-secondary">• {loc}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {result.displayLocations.length === 0 && result.warehouseLocations.length === 0 && (
                <p className="text-xs text-text-muted pt-2 border-t border-border">
                  Chưa được xếp vào kệ nào.
                </p>
              )}
            </motion.div>
          )}

          {notFound && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
              <p className="text-red-600 text-sm">Không tìm thấy sản phẩm</p>
              <p className="text-red-400 text-xs mt-1">Thử nhập SKU khác hoặc kiểm tra lại mã barcode</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
