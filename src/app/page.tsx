"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WarehousePanel from "@/components/WarehousePanel";
import SectionEditor from "@/components/SectionEditor";
import WarehouseShelfEditor from "@/components/WarehouseShelfEditor";
import ShelfViewer3D from "@/components/ShelfViewer3D";
import { useStore } from "@/store/useStore";
import Product3DViewer from "@/components/Product3DViewer";

// ─── Tab types ─────────────────────────────────────────────────────────────────
type MainTab = "products" | "display" | "warehouse" | "shelf";

const TAB_META: Record<MainTab, { label: string; short: string; icon: string; color: string }> = {
  products:  { label: "Sản phẩm",    short: "SẢN PHẨM",  icon: "▦", color: "#B8914A" },
  display:   { label: "Sàn trưng bày", short: "TRƯNG BÀY", icon: "◫", color: "#B8914A" },
  warehouse: { label: "Kho dự trữ",  short: "KHO",       icon: "▤", color: "#5A7898" },
  shelf:     { label: "Xem kệ",      short: "XEM KỆ",    icon: "◈", color: "#6A8868" },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<MainTab>("display");
  const { selectedProduct, warehouseShelves, products } = useStore();

  const totalFilled = warehouseShelves.reduce(
    (s, sh) => s + sh.tiers.reduce((ts, t) => ts + t.filter(Boolean).length, 0), 0
  );
  const totalSlots = warehouseShelves.reduce((s, sh) => s + sh.tiers.length * 25, 0);
  const fillPct = totalSlots > 0 ? Math.round((totalFilled / totalSlots) * 100) : 0;

  const tabColor = TAB_META[activeTab].color;

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-bg-base">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-surface flex-shrink-0 shadow-sm"
        style={{ minHeight: 48 }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 border border-gold/60 flex items-center justify-center flex-shrink-0">
            <span className="text-gold text-xs font-light tracking-widest">P</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-[10px] tracking-[0.4em] text-gold font-medium uppercase leading-none">POSTLAIN</h1>
            <p className="text-[7px] tracking-[0.2em] text-text-muted uppercase mt-0.5">Store Manager · ALDO</p>
          </div>
          <span className="sm:hidden text-[11px] tracking-[0.3em] text-gold font-medium uppercase">POSTLAIN</span>
        </div>

        {/* Desktop tab switcher — hidden on mobile (uses bottom nav) */}
        <div className="hidden md:flex items-center gap-0.5 bg-bg-base border border-border rounded-sm p-0.5">
          {(["display", "warehouse", "shelf"] as MainTab[]).map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-1.5 text-[9px] tracking-[0.18em] rounded-sm transition-all ${
                activeTab === tab
                  ? "text-white font-semibold shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
              style={activeTab === tab ? { background: TAB_META[tab].color } : {}}
            >
              {TAB_META[tab].short}
            </button>
          ))}
        </div>

        {/* Right: status + selected product chip */}
        <div className="flex items-center gap-2.5">
          {selectedProduct && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-gold/8 border border-gold/25 rounded-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse flex-shrink-0" />
              <p className="text-[8px] text-gold max-w-[120px] truncate">{selectedProduct.name}</p>
            </div>
          )}
          {activeTab === "warehouse" && totalSlots > 0 && (
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="w-10 h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: "#5A7898", opacity: 0.8 }} />
              </div>
              <span className="text-[8px]" style={{ color: "#5A7898" }}>{fillPct}%</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] text-text-muted tracking-widest hidden sm:inline">ONLINE</span>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT panel: Products — desktop always visible, mobile = own tab */}
        <div className={`
          flex-shrink-0 flex flex-col border-r border-border overflow-hidden bg-bg-surface
          md:w-[300px] md:flex
          ${activeTab === "products" ? "flex flex-1 w-full" : "hidden md:flex md:w-[300px]"}
        `}>
          <div className="px-4 py-2 border-b border-border flex-shrink-0 flex items-center justify-between bg-bg-card">
            <p className="text-[8px] tracking-[0.3em] text-gold uppercase font-medium">SẢN PHẨM</p>
            <span className="text-[8px] text-text-muted">{products.length} mặt hàng</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <WarehousePanel />
          </div>
        </div>

        {/* RIGHT: Main content — hidden when products tab on mobile */}
        <div className={`
          flex-1 flex flex-col overflow-hidden min-w-0
          ${activeTab === "products" ? "hidden md:flex" : "flex"}
        `}>
          <AnimatePresence mode="wait" initial={false}>

            {/* SÀN TRƯNG BÀY */}
            {activeTab === "display" && (
              <motion.div key="display" className="flex-1 flex overflow-hidden h-full w-full min-h-0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.13 }}>

                {/* Mobile: selected product chip */}
                <div className="md:hidden absolute top-0 left-0 right-0 z-10 pointer-events-none">
                  <AnimatePresence>
                    {selectedProduct && (
                      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                        className="mx-4 mt-2 px-3 py-1.5 bg-gold/10 border border-gold/30 rounded-sm flex items-center gap-2 pointer-events-auto">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                        <span className="text-[11px] text-gold flex-1 truncate">{selectedProduct.name}</span>
                        <span className="text-[10px] text-gold/60">→ chọn ô kệ</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1 overflow-hidden min-w-0 relative">
                  <SectionEditor />
                </div>
                {selectedProduct && (
                  <div className="hidden md:block w-[188px] flex-shrink-0 border-l border-border overflow-hidden">
                    <Product3DViewer product={selectedProduct} />
                  </div>
                )}
              </motion.div>
            )}

            {/* KHO DỰ TRỮ */}
            {activeTab === "warehouse" && (
              <motion.div key="warehouse" className="flex-1 overflow-hidden h-full w-full min-h-0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.13 }}>

                {/* Mobile kho stats bar */}
                {totalSlots > 0 && (
                  <div className="md:hidden px-4 py-2 border-b border-border bg-bg-surface flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] text-text-muted">Kho:</span>
                    <span className="text-[11px] font-medium" style={{ color: "#5A7898" }}>{totalFilled}/{totalSlots}</span>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: "#5A7898", opacity: 0.8 }} />
                    </div>
                    <span className="text-[10px]" style={{ color: "#5A7898" }}>{fillPct}%</span>
                  </div>
                )}

                <div className="flex-1 overflow-hidden h-full">
                  <WarehouseShelfEditor />
                </div>
              </motion.div>
            )}

            {/* XEM KỆ */}
            {activeTab === "shelf" && (
              <motion.div key="shelf" className="flex-1 overflow-hidden h-full w-full min-h-0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.13 }}>
                <ShelfViewer3D />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom nav — mobile only ────────────────────────────────────────── */}
      <nav className="md:hidden flex-shrink-0 border-t border-border bg-bg-surface"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex">
          {(["products", "display", "warehouse", "shelf"] as MainTab[]).map(tab => {
            const meta = TAB_META[tab];
            const isActive = activeTab === tab;
            return (
              <button key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all active:opacity-70"
                style={{ minHeight: 52 }}>
                <span className="text-base leading-none transition-colors"
                  style={{ color: isActive ? meta.color : "#9A9080" }}>
                  {meta.icon}
                </span>
                <span className="text-[9px] font-medium tracking-wider leading-none transition-colors"
                  style={{ color: isActive ? meta.color : "#9A9080" }}>
                  {meta.short}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 h-0.5 w-8 rounded-t-full"
                    style={{ background: meta.color }} />
                )}
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
