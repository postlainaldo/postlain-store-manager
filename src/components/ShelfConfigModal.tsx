"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useStore, ShelfConfig } from "@/store/useStore";

interface Props {
  onClose: () => void;
}

export default function ShelfConfigModal({ onClose }: Props) {
  const { shelfConfig, setShelfConfig, products, shelfLayout, clearShelfLayout } = useStore();
  const [form, setForm] = useState<ShelfConfig>({ ...shelfConfig });
  const [confirmClear, setConfirmClear] = useState(false);

  const totalSlots = form.rows * form.cols;
  const placedCount = Object.values(shelfLayout).filter(Boolean).length;
  const willLoseSlots =
    totalSlots < shelfConfig.rows * shelfConfig.cols && placedCount > totalSlots;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleApply = () => {
    setShelfConfig(form);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative z-10 w-full max-w-md bg-bg-surface border border-border rounded-sm shadow-2xl"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-text-muted uppercase">Cấu hình</p>
            <h2 className="text-text-primary font-light text-lg mt-0.5">Thiết kế kệ trưng bày</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl">×</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Rows */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] tracking-[0.15em] text-text-muted uppercase">
                Số tầng kệ
              </label>
              <span className="text-gold text-sm font-light">{form.rows} tầng</span>
            </div>
            <input
              type="range" min={1} max={5} step={1}
              value={form.rows}
              onChange={(e) => setForm((f) => ({ ...f, rows: Number(e.target.value) }))}
              className="w-full accent-[#C9A96E] cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`text-[9px] ${form.rows === n ? "text-gold" : "text-text-muted"}`}>{n}</span>
              ))}
            </div>
          </div>

          {/* Cols */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] tracking-[0.15em] text-text-muted uppercase">
                Số ô mỗi tầng
              </label>
              <span className="text-gold text-sm font-light">{form.cols} ô</span>
            </div>
            <input
              type="range" min={2} max={8} step={1}
              value={form.cols}
              onChange={(e) => setForm((f) => ({ ...f, cols: Number(e.target.value) }))}
              className="w-full accent-[#C9A96E] cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <span key={n} className={`text-[9px] ${form.cols === n ? "text-gold" : "text-text-muted"}`}>{n}</span>
              ))}
            </div>
          </div>

          {/* Max Inventory */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] tracking-[0.15em] text-text-muted uppercase">
                Giới hạn kho
              </label>
              <span className="text-text-secondary text-xs font-light">
                {form.maxInventory === 0 ? "Không giới hạn" : `${form.maxInventory} sản phẩm`}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="number" min={0} max={9999}
                value={form.maxInventory}
                onChange={(e) => setForm((f) => ({ ...f, maxInventory: Number(e.target.value) }))}
                className="flex-1 bg-bg-card border border-border text-text-primary px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-gold/60 transition-colors"
                placeholder="0 = không giới hạn"
              />
              <button
                onClick={() => setForm((f) => ({ ...f, maxInventory: 0 }))}
                className="px-3 py-2 text-xs text-text-muted border border-border hover:border-border-strong rounded-sm transition-all"
              >
                ∞
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-bg-card border border-border rounded-sm p-4">
            <p className="text-[10px] tracking-[0.15em] text-text-muted uppercase mb-3">Xem trước</p>
            <div className="flex flex-col gap-1.5 items-center">
              {Array.from({ length: form.rows }, (_, row) => (
                <div key={row} className="flex gap-1.5">
                  {Array.from({ length: form.cols }, (_, col) => {
                    const idx = row * form.cols + col;
                    const placed = shelfLayout[idx];
                    return (
                      <div
                        key={col}
                        className={`rounded-sm transition-colors ${
                          placed ? "bg-gold/60" : "bg-bg-elevated border border-border"
                        }`}
                        style={{ width: Math.min(28, 180 / form.cols), height: Math.min(32, 200 / form.rows) }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3">
              <p className="text-[10px] text-text-muted">
                Tổng ô trưng bày: <span className="text-gold">{totalSlots}</span>
              </p>
              <p className="text-[10px] text-text-muted">
                Kho: <span className="text-text-secondary">{products.length}{form.maxInventory > 0 ? `/${form.maxInventory}` : ""} SP</span>
              </p>
            </div>
          </div>

          {/* Warning */}
          {willLoseSlots && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-sm px-4 py-3">
              <p className="text-[10px] text-red-400">
                ⚠ Giảm kích thước kệ sẽ xóa {placedCount - totalSlots} sản phẩm đang trưng bày vượt quá số ô mới.
              </p>
            </div>
          )}

          {/* Clear all */}
          <div className="pt-1 border-t border-border/50">
            {confirmClear ? (
              <div className="flex gap-2 items-center">
                <p className="text-xs text-text-muted flex-1">Xác nhận xóa toàn bộ trưng bày?</p>
                <button onClick={() => { clearShelfLayout(); setConfirmClear(false); }}
                  className="px-3 py-1.5 text-xs text-red-400 border border-red-500/40 hover:border-red-500 rounded-sm transition-all">
                  XÁC NHẬN
                </button>
                <button onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 text-xs text-text-muted border border-border rounded-sm transition-all">
                  HỦY
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)}
                className="text-[10px] tracking-wider text-text-muted hover:text-red-400 transition-colors">
                Xóa toàn bộ trưng bày
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-5 border-t border-border">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm tracking-wider text-text-secondary border border-border hover:border-border-strong rounded-sm transition-all">
            HỦY
          </button>
          <button onClick={handleApply}
            className="flex-1 py-2.5 text-sm tracking-wider font-medium bg-gold hover:bg-gold-light text-text-inverse rounded-sm transition-all">
            ÁP DỤNG
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
