"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WarehousePanel from "@/components/WarehousePanel";
import SectionEditor from "@/components/SectionEditor";
import WarehouseShelfEditor from "@/components/WarehouseShelfEditor";
import ShelfViewer3D from "@/components/ShelfViewer3D";
import { useStore } from "@/store/useStore";
import Product3DViewer from "@/components/Product3DViewer";

type MainTab = "2d" | "shelf";
type SubTab2D = "display" | "warehouse";

export default function Home() {
  const [mainTab, setMainTab] = useState<MainTab>("2d");
  const [sub2D, setSub2D] = useState<SubTab2D>("display");
  const { selectedProduct, warehouseShelves, products } = useStore();

  const totalFilled = warehouseShelves.reduce(
    (s, shelf) => s + shelf.tiers.reduce((ts, tier) => ts + tier.filter(Boolean).length, 0), 0
  );
  const totalSlots = warehouseShelves.reduce((s, shelf) => s + shelf.tiers.length * 25, 0);
  const fillPct = totalSlots > 0 ? Math.round((totalFilled / totalSlots) * 100) : 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base flex-col">

      {/* ── Header ── */}
      <header className="relative flex items-center justify-between px-6 py-3 border-b border-border bg-bg-surface flex-shrink-0 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-gold/60 flex items-center justify-center flex-shrink-0">
            <span className="text-gold text-sm font-light tracking-widest">P</span>
          </div>
          <div>
            <h1 className="text-[11px] tracking-[0.45em] text-gold font-medium uppercase leading-none">POSTLAIN</h1>
            <p className="text-[8px] tracking-[0.22em] text-text-muted uppercase mt-0.5">Store Manager · ALDO</p>
          </div>
        </div>

        {/* Tab switcher — centred */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-bg-base border border-border rounded-sm p-0.5">
          <button
            onClick={() => setMainTab("2d")}
            className={`px-7 py-1.5 text-[9px] tracking-[0.22em] rounded-sm transition-all ${
              mainTab === "2d"
                ? "bg-gold text-white font-semibold shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            ◫ BỐ TRÍ 2D
          </button>
          <button
            onClick={() => setMainTab("shelf")}
            className={`px-7 py-1.5 text-[9px] tracking-[0.22em] rounded-sm transition-all ${
              mainTab === "shelf"
                ? "bg-gold text-white font-semibold shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            ▤ XEM KỆ
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] text-text-muted tracking-widest">ONLINE</span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT: Inventory — always visible */}
        <div className="w-[310px] flex-shrink-0 flex flex-col border-r border-border overflow-hidden bg-bg-surface">
          <div className="px-4 py-2 border-b border-border flex-shrink-0 flex items-center justify-between bg-bg-card">
            <p className="text-[8px] tracking-[0.3em] text-gold uppercase font-medium">SẢN PHẨM</p>
            <span className="text-[8px] text-text-muted">{products.length} mặt hàng</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <WarehousePanel />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <AnimatePresence mode="wait" initial={false}>

            {/* ══ BỐ TRÍ 2D ══ */}
            {mainTab === "2d" && (
              <motion.div key="tab2d" className="flex flex-col h-full w-full"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}>

                {/* Sub-tab bar */}
                <div className="flex items-center justify-between px-5 py-2 border-b border-border bg-bg-surface flex-shrink-0">
                  <div className="flex gap-0.5 bg-bg-base border border-border rounded-sm p-0.5">
                    <button
                      onClick={() => setSub2D("display")}
                      className={`px-5 py-1 text-[9px] tracking-[0.18em] rounded-sm transition-all ${
                        sub2D === "display"
                          ? "bg-gold text-white font-medium shadow-sm"
                          : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      SÀN TRƯNG BÀY
                    </button>
                    <button
                      onClick={() => setSub2D("warehouse")}
                      className={`px-5 py-1 text-[9px] tracking-[0.18em] rounded-sm transition-all ${
                        sub2D === "warehouse"
                          ? "bg-[#5A7898] text-white font-medium shadow-sm"
                          : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      KHO DỰ TRỮ
                    </button>
                  </div>

                  {/* Context info */}
                  <div className="flex items-center gap-4">
                    {sub2D === "warehouse" && totalSlots > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-text-muted">Kho:</span>
                        <span className="text-[9px] font-medium" style={{ color: "#5A7898" }}>
                          {totalFilled}/{totalSlots}
                        </span>
                        <div className="w-14 h-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: "#5A7898", opacity: 0.8 }} />
                        </div>
                        <span className="text-[8px]" style={{ color: "#5A7898" }}>{fillPct}%</span>
                      </div>
                    )}
                    {selectedProduct && (
                      <div className="flex items-center gap-2 px-2.5 py-1 bg-gold/8 border border-gold/25 rounded-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse flex-shrink-0" />
                        <p className="text-[8px] text-gold max-w-[160px] truncate">{selectedProduct.name}</p>
                      </div>
                    )}
                    <span className="text-[8px] text-text-muted tracking-widest hidden lg:block">
                      {sub2D === "display" ? "Chọn kệ → click ô để đặt sản phẩm" : "Click ô để xếp · Click lại để gỡ"}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative min-h-0">
                  <AnimatePresence mode="wait" initial={false}>
                    {sub2D === "display" ? (
                      <motion.div key="sub-display" className="absolute inset-0 flex"
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.13 }}>
                        <div className="flex-1 overflow-hidden min-w-0">
                          <SectionEditor />
                        </div>
                        {selectedProduct && (
                          <div className="w-[188px] flex-shrink-0 border-l border-border overflow-hidden">
                            <Product3DViewer product={selectedProduct} />
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div key="sub-warehouse" className="absolute inset-0"
                        initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
                        transition={{ duration: 0.13 }}>
                        <WarehouseShelfEditor />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ══ XEM KỆ ══ */}
            {mainTab === "shelf" && (
              <motion.div key="tab-shelf" className="flex-1 w-full h-full min-h-0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ overflow: "hidden" }}>
                <ShelfViewer3D />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
