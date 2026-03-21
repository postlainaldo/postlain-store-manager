"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import WarehouseShelfEditor from "./WarehouseShelfEditor";

const WarehouseSingleShelf3D = dynamic(() => import("./WarehouseSingleShelf3D"), {
  ssr: false,
  loading: () => (
    <div style={{
      position: "absolute", inset: 0, background: "#F5F2EE",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 12,
    }}>
      <div style={{
        width: 28, height: 28,
        border: "1px solid rgba(90,120,152,0.25)",
        borderTopColor: "#5A7898", borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />
      <p style={{ color: "#9A9080", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase" }}>
        Đang tải kệ 3D…
      </p>
    </div>
  ),
});

type ViewMode = "2d" | "3d_shelf";

export default function WarehouseViewPanel() {
  const { products, warehouseShelves, selectedProduct } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>("2d");

  const totalQty = products.reduce((s, p) => s + p.quantity, 0);
  const totalFilled = warehouseShelves.reduce(
    (s, shelf) => s + shelf.tiers.reduce((ts, tier) => ts + tier.filter(Boolean).length, 0),
    0
  );
  const totalSlots = warehouseShelves.reduce((s, shelf) => s + shelf.tiers.length * 25, 0);

  return (
    <div className="flex flex-col h-full bg-bg-base">
      {/* Stats + toolbar */}
      <div className="px-5 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0 bg-bg-surface">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[8px] tracking-[0.2em] text-text-muted uppercase">Mặt hàng</p>
            <p className="text-text-primary text-base font-light">{products.length}</p>
          </div>
          <div>
            <p className="text-[8px] tracking-[0.2em] text-text-muted uppercase">Tổng SL</p>
            <p className="text-text-primary text-base font-light">{totalQty}</p>
          </div>
          <div>
            <p className="text-[8px] tracking-[0.2em] text-text-muted uppercase">Ô đã xếp</p>
            <p className="text-text-primary text-base font-light">
              {totalFilled}<span className="text-text-muted text-xs">/{totalSlots}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedProduct && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gold/8 border border-gold/25 rounded-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse flex-shrink-0" />
              <p className="text-[9px] text-gold max-w-[160px] truncate">
                {selectedProduct.name}
              </p>
            </div>
          )}

          <div className="flex items-center gap-1 bg-bg-base border border-border rounded-sm p-0.5">
            <button
              onClick={() => setViewMode("2d")}
              className={`px-3 py-1 text-[9px] tracking-[0.15em] rounded-sm transition-all ${
                viewMode === "2d"
                  ? "bg-gold text-white shadow-sm"
                  : "text-text-muted hover:text-text-secondary border border-transparent"
              }`}
            >
              2D XẾP KHO
            </button>
            <button
              onClick={() => setViewMode("3d_shelf")}
              className={`px-3 py-1 text-[9px] tracking-[0.15em] rounded-sm transition-all ${
                viewMode === "3d_shelf"
                  ? "bg-gold text-white shadow-sm"
                  : "text-text-muted hover:text-text-secondary border border-transparent"
              }`}
            >
              3D KỆ ĐƠN
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <AnimatePresence mode="wait" initial={false}>
          {viewMode === "2d" ? (
            <div key="2d" className="w-full h-full">
              <WarehouseShelfEditor />
            </div>
          ) : (
            <div key="3d_shelf" className="relative w-full h-full">
              <WarehouseSingleShelf3D shelves={warehouseShelves} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
