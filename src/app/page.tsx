"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WarehousePanel from "@/components/WarehousePanel";
import SectionEditor from "@/components/SectionEditor";
import WarehouseShelfEditor from "@/components/WarehouseShelfEditor";
import ShelfViewer3D from "@/components/ShelfViewer3D";
import { useStore } from "@/store/useStore";
import Product3DViewer from "@/components/Product3DViewer";

type MainTab = "products" | "display" | "warehouse" | "shelf";

const TAB_META: Record<MainTab, { label: string; short: string; icon: string; color: string }> = {
  products:  { label: "Sản phẩm",     short: "SẢN PHẨM",  icon: "▦", color: "#B8914A" },
  display:   { label: "Sàn trưng bày", short: "TRƯNG BÀY", icon: "◫", color: "#B8914A" },
  warehouse: { label: "Kho dự trữ",   short: "KHO",        icon: "▤", color: "#5A7898" },
  shelf:     { label: "Xem kệ",       short: "XEM KỆ",     icon: "◈", color: "#6A8868" },
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
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 border-b border-border bg-bg-surface"
        style={{
          height: 52,
          boxShadow: "0 1px 0 #EAE6E0, 0 2px 8px rgba(26,20,16,0.05)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 flex items-center justify-center flex-shrink-0"
            style={{
              border: "1px solid rgba(184,145,74,0.5)",
              background: "linear-gradient(145deg, #FFFDF8 0%, #F9F6EF 100%)",
              boxShadow: "0 1px 4px rgba(184,145,74,0.15)",
            }}
          >
            <span className="text-gold text-[11px] font-medium tracking-widest">P</span>
          </div>
          <div className="hidden sm:block leading-none">
            <p className="text-[10px] tracking-[0.45em] text-gold font-semibold uppercase">POSTLAIN</p>
            <p className="text-[7px] tracking-[0.22em] text-text-muted uppercase mt-0.5">Store Manager · ALDO</p>
          </div>
          <span className="sm:hidden text-[11px] tracking-[0.35em] text-gold font-semibold uppercase">POSTLAIN</span>
        </div>

        {/* Desktop tab switcher */}
        <div
          className="hidden md:flex items-center gap-0.5 rounded-sm p-0.5"
          style={{ background: "#F0EDE8", border: "1px solid #DDD8D0" }}
        >
          {(["display", "warehouse", "shelf"] as MainTab[]).map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative px-4 py-1.5 text-[9px] tracking-[0.2em] font-medium rounded-sm transition-all duration-150"
                style={isActive
                  ? { background: TAB_META[tab].color, color: "#FFFFFF", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }
                  : { color: "#9A9080" }
                }
              >
                {TAB_META[tab].short}
              </button>
            );
          })}
        </div>

        {/* Right status area */}
        <div className="flex items-center gap-3">
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-sm"
              style={{ background: "rgba(184,145,74,0.07)", border: "1px solid rgba(184,145,74,0.22)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-gold" style={{ animation: "pulseGold 2s ease-in-out infinite" }} />
              <span className="text-[8px] text-gold max-w-[110px] truncate font-medium">{selectedProduct.name}</span>
            </motion.div>
          )}

          {activeTab === "warehouse" && totalSlots > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "#EAE6E0" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${fillPct}%`, background: "#5A7898" }} />
              </div>
              <span className="text-[8px] font-medium" style={{ color: "#5A7898" }}>{fillPct}%</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"
              style={{ animation: "pulseGreen 2s ease-in-out infinite" }}
            />
            <span className="text-[8px] text-text-muted tracking-widest hidden sm:inline font-medium">LIVE</span>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT: Products panel */}
        <div
          className={[
            "flex-shrink-0 flex flex-col border-r border-border overflow-hidden bg-bg-surface",
            "md:w-[292px] md:flex",
            activeTab === "products" ? "flex flex-1 w-full" : "hidden md:flex md:w-[292px]",
          ].join(" ")}
          style={{ boxShadow: "1px 0 0 #EAE6E0" }}
        >
          {/* Panel header */}
          <div
            className="px-4 py-2.5 border-b border-border flex-shrink-0 flex items-center justify-between"
            style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #F9F7F4 100%)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[8px] tracking-[0.35em] text-gold uppercase font-semibold">SẢN PHẨM</span>
              <span
                className="px-1.5 py-0.5 rounded-full text-[7px] font-medium text-gold"
                style={{ background: "rgba(184,145,74,0.10)", border: "1px solid rgba(184,145,74,0.20)" }}
              >
                {products.length}
              </span>
            </div>
            <div className="w-1 h-1 rounded-full" style={{ background: "rgba(184,145,74,0.4)" }} />
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <WarehousePanel />
          </div>
        </div>

        {/* RIGHT: Main content */}
        <div className={[
          "flex-1 flex flex-col overflow-hidden min-w-0",
          activeTab === "products" ? "hidden md:flex" : "flex",
        ].join(" ")}>
          <AnimatePresence mode="wait" initial={false}>

            {/* SÀN TRƯNG BÀY */}
            {activeTab === "display" && (
              <motion.div
                key="display"
                className="flex-1 flex overflow-hidden h-full w-full min-h-0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                {/* Mobile: selected product chip */}
                <div className="md:hidden absolute top-[52px] left-0 right-0 z-20 pointer-events-none">
                  <AnimatePresence>
                    {selectedProduct && (
                      <motion.div
                        initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mx-3 mt-2 px-3 py-2 flex items-center gap-2 pointer-events-auto rounded-md"
                        style={{
                          background: "rgba(184,145,74,0.10)",
                          border: "1px solid rgba(184,145,74,0.28)",
                          boxShadow: "0 2px 8px rgba(184,145,74,0.12)",
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0"
                          style={{ animation: "pulseGold 2s ease-in-out infinite" }} />
                        <span className="text-[11px] text-gold flex-1 truncate font-medium">{selectedProduct.name}</span>
                        <span className="text-[9px] text-gold/60 flex-shrink-0">→ chọn ô kệ</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1 overflow-hidden min-w-0 relative">
                  <SectionEditor />
                </div>
                {selectedProduct && (
                  <div className="hidden md:block w-[180px] flex-shrink-0 border-l border-border overflow-hidden"
                    style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #F9F7F4 100%)" }}>
                    <Product3DViewer product={selectedProduct} />
                  </div>
                )}
              </motion.div>
            )}

            {/* KHO DỰ TRỮ */}
            {activeTab === "warehouse" && (
              <motion.div
                key="warehouse"
                className="flex-1 flex flex-col overflow-hidden h-full w-full min-h-0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                {totalSlots > 0 && (
                  <div
                    className="md:hidden px-4 py-2 border-b border-border flex-shrink-0 flex items-center gap-3"
                    style={{ background: "rgba(90,120,152,0.04)" }}
                  >
                    <span className="text-[9px] text-text-muted font-medium">Kho:</span>
                    <span className="text-[11px] font-semibold" style={{ color: "#5A7898" }}>
                      {totalFilled}<span className="font-normal text-text-muted">/{totalSlots}</span>
                    </span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#EAE6E0" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${fillPct}%`, background: "#5A7898" }} />
                    </div>
                    <span className="text-[9px] font-medium" style={{ color: "#5A7898" }}>{fillPct}%</span>
                  </div>
                )}
                <div className="flex-1 overflow-hidden min-h-0">
                  <WarehouseShelfEditor />
                </div>
              </motion.div>
            )}

            {/* XEM KỆ */}
            {activeTab === "shelf" && (
              <motion.div
                key="shelf"
                className="flex-1 overflow-hidden h-full w-full min-h-0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <ShelfViewer3D />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom nav — mobile only ─────────────────────────────────────── */}
      <nav
        className="md:hidden flex-shrink-0 border-t border-border bg-bg-surface"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 4px)",
          boxShadow: "0 -1px 0 #EAE6E0, 0 -2px 10px rgba(26,20,16,0.06)",
        }}
      >
        <div className="flex">
          {(["products", "display", "warehouse", "shelf"] as MainTab[]).map(tab => {
            const meta = TAB_META[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-all active:opacity-60"
                style={{ minHeight: 54, paddingTop: 10, paddingBottom: 8 }}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavBar"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-b-full"
                    style={{ width: 28, background: meta.color }}
                    transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                  />
                )}
                <span
                  className="text-[15px] leading-none transition-all duration-150"
                  style={{ color: isActive ? meta.color : "#B0A898", transform: isActive ? "scale(1.1)" : "scale(1)" }}
                >
                  {meta.icon}
                </span>
                <span
                  className="text-[8px] font-semibold tracking-wider leading-none transition-colors duration-150"
                  style={{ color: isActive ? meta.color : "#B0A898" }}
                >
                  {meta.short}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
