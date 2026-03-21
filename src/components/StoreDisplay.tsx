"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Product } from "@/types";
import ShelfConfigModal from "./ShelfConfigModal";

const ShelfScene = dynamic(() => import("./ShelfScene"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "absolute", inset: 0, background: "#F5F2EE", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
      <div style={{ width: 28, height: 28, border: "1px solid rgba(184,145,74,0.25)", borderTopColor: "#B8914A", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <p style={{ color: "#9A9080", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase" }}>Đang tải 3D…</p>
    </div>
  ),
});

function ProductCard({ product, isSelected, isPlaced, onClick }: { product: Product; isSelected: boolean; isPlaced: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full flex items-center gap-3 p-3 rounded-sm border transition-all duration-200 text-left ${
        isSelected ? "border-gold bg-gold/8 shadow-[0_0_12px_rgba(201,169,110,0.2)]"
          : isPlaced ? "border-border/30 bg-bg-card/30 opacity-50"
          : "border-border bg-bg-card hover:border-border-strong"
      }`}
    >
      <div className="w-10 h-12 rounded-sm overflow-hidden bg-bg-elevated flex-shrink-0">
        {product.imagePath ? (
          <img src={product.imagePath} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gold/70 text-base bg-bg-elevated">
            {product.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-light truncate ${isSelected ? "text-gold" : "text-text-primary"}`}>{product.name}</p>
        <p className="text-[10px] text-text-muted mt-0.5">{product.category}</p>
        <p className="text-[10px] text-text-muted">SL: {product.quantity}</p>
      </div>
      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0 animate-pulse" />}
      {isPlaced && <span className="text-[10px] text-gold/60 flex-shrink-0">✓</span>}
    </motion.button>
  );
}

export default function StoreDisplay() {
  const { products, shelfLayout, shelfConfig, selectedProduct, selectProduct, fetchProducts } = useStore();
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const totalSlots = shelfConfig.rows * shelfConfig.cols;
  const placedIds = new Set(Object.values(shelfLayout).filter(Boolean) as string[]);

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Left Panel */}
      <div className="w-64 flex-shrink-0 flex flex-col bg-bg-surface border-r border-border h-full overflow-hidden">
        {/* Panel Header */}
        <div className="px-4 py-4 border-b border-border flex-shrink-0 flex items-start justify-between">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-text-muted uppercase">Kho hàng</p>
            <p className="text-text-primary text-sm font-light mt-0.5">
              {products.length}
              {shelfConfig.maxInventory > 0 && <span className="text-text-muted">/{shelfConfig.maxInventory}</span>} sản phẩm
            </p>
          </div>
          <button
            onClick={() => setShowConfig(true)}
            className="mt-1 px-2.5 py-1.5 text-[9px] tracking-[0.15em] text-text-muted border border-border hover:border-gold/50 hover:text-gold rounded-sm transition-all flex items-center gap-1.5"
          >
            ⚙ CẤU HÌNH
          </button>
        </div>

        {/* Shelf info */}
        <div className="px-4 py-2 border-b border-border/50 flex-shrink-0">
          <p className="text-[10px] text-text-muted">
            Kệ: <span className="text-text-secondary">{shelfConfig.rows} tầng × {shelfConfig.cols} ô = {totalSlots} chỗ</span>
          </p>
        </div>

        {/* Instructions */}
        <div className={`mx-3 mt-3 mb-2 px-3 py-2 rounded-sm text-[10px] leading-relaxed flex-shrink-0 transition-all ${
          selectedProduct ? "bg-gold/10 border border-gold/30 text-gold" : "bg-bg-card border border-border text-text-muted"
        }`}>
          {selectedProduct ? (
            <><span className="font-medium">{selectedProduct.name}</span><br />Click ô trống trên kệ để đặt</>
          ) : "Chọn sản phẩm → click ô kệ để trưng bày"}
        </div>

        <AnimatePresence>
          {selectedProduct && (
            <motion.button
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onClick={() => selectProduct(null)}
              className="mx-3 mb-2 py-1.5 text-[10px] tracking-wider text-text-muted border border-border hover:border-border-strong rounded-sm transition-all flex-shrink-0"
            >
              HỦY CHỌN (ESC)
            </motion.button>
          )}
        </AnimatePresence>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-text-muted gap-2">
              <span className="text-2xl opacity-30">◫</span>
              <p className="text-xs text-center">Chưa có sản phẩm.<br />Thêm trong tab Kho hàng.</p>
            </div>
          ) : (
            products.map((p) => (
              <ProductCard
                key={p.id} product={p}
                isSelected={selectedProduct?.id === p.id}
                isPlaced={placedIds.has(p.id)}
                onClick={() => selectedProduct?.id === p.id ? selectProduct(null) : selectProduct(p)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 flex-shrink-0">
          <p className="text-[10px] text-text-muted">
            <span className="text-gold">{placedIds.size}</span> / {totalSlots} ô đã trưng bày
          </p>
          <div className="mt-1.5 w-full h-0.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${totalSlots > 0 ? (placedIds.size / totalSlots) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative bg-bg-base" style={{ minHeight: 0, minWidth: 0 }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <ShelfScene />
        </div>

        {/* Labels */}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1 pointer-events-none z-10">
          <p className="text-[9px] tracking-[0.25em] text-text-muted uppercase">POSTLAIN — Store Display</p>
          <p className="text-[9px] text-text-muted/50">Kéo để xoay · Scroll để zoom</p>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 pointer-events-none z-10">
          <div className="flex gap-3 bg-white/80 backdrop-blur-sm border border-border rounded-sm px-3 py-2 shadow-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border border-gold/40 bg-gold/10" />
              <span className="text-[9px] text-text-muted">Ô trống</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gold/60" />
              <span className="text-[9px] text-text-muted">Có sản phẩm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      <AnimatePresence>
        {showConfig && <ShelfConfigModal onClose={() => setShowConfig(false)} />}
      </AnimatePresence>
    </div>
  );
}
