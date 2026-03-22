"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WarehousePanel from "@/components/WarehousePanel";
import SectionEditor from "@/components/SectionEditor";
import WarehouseShelfEditor from "@/components/WarehouseShelfEditor";
import ShelfViewer3D from "@/components/ShelfViewer3D";
import { useStore } from "@/store/useStore";
type MainTab = "prepare" | "view";
type SubTab  = "display" | "warehouse";
type MobTab  = "products" | "prepare" | "view";

const MAIN_TABS: { id: MainTab; label: string; icon: string }[] = [
  { id: "prepare", label: "CHUẨN BỊ", icon: "◫" },
  { id: "view",    label: "XEM KỆ",   icon: "◈" },
];

const SUB_TABS: { id: SubTab; label: string; icon: string; color: string }[] = [
  { id: "display",   label: "Trưng bày", icon: "◫", color: "#B8914A" },
  { id: "warehouse", label: "Kho",       icon: "▤", color: "#5A7898" },
];

const MOB_TABS: { id: MobTab; label: string; icon: string; color: string }[] = [
  { id: "products", label: "SẢN PHẨM", icon: "▦", color: "#B8914A" },
  { id: "prepare",  label: "CHUẨN BỊ", icon: "◫", color: "#B8914A" },
  { id: "view",     label: "XEM KỆ",   icon: "◈", color: "#6A8868" },
];

export default function Home() {
  const [mainTab, setMainTab] = useState<MainTab>("prepare");
  const [subTab, setSubTab]   = useState<SubTab>("display");
  const [mobTab, setMobTab]   = useState<MobTab>("prepare");

  const { selectedProduct, warehouseShelves, products } = useStore();

  const totalFilled = warehouseShelves.reduce(
    (s, sh) => s + sh.tiers.reduce((ts, t) => ts + t.filter(Boolean).length, 0), 0
  );
  const totalSlots = warehouseShelves.reduce((s, sh) => s + sh.tiers.length * 25, 0);
  const fillPct = totalSlots > 0 ? Math.round((totalFilled / totalSlots) * 100) : 0;

  // ESC to deselect
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") useStore.getState().selectProduct(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function PrepareContent() {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Local subtab bar — TRƯNG BÀY / KHO */}
        <div
          className="flex-shrink-0 border-b border-border flex items-stretch"
          style={{ height: 40, background: "#FAFAF8" }}
        >
          <div className="flex items-stretch">
            {SUB_TABS.map(tab => {
              const isActive = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSubTab(tab.id)}
                  className="relative flex items-center gap-1.5 px-5 transition-colors"
                  style={{
                    fontSize: 9, fontWeight: 600, letterSpacing: "0.18em",
                    color: isActive ? tab.color : "#B0A898",
                    background: isActive ? "rgba(255,255,255,0.8)" : "transparent",
                    minWidth: 100,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{tab.icon}</span>
                  <span>{tab.label.toUpperCase()}</span>
                  {isActive && (
                    <motion.div
                      layoutId="prepSubUnderline"
                      className="absolute bottom-0 left-0 right-0"
                      style={{ height: 2, background: tab.color, borderRadius: "2px 2px 0 0" }}
                      transition={{ type: "spring", bounce: 0.25, duration: 0.35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {/* Right status */}
          <div className="ml-auto flex items-center gap-4 px-4">
            {subTab === "warehouse" && totalSlots > 0 && (
              <div className="flex items-center gap-2">
                <div style={{ width: 64, height: 3, background: "#EAE6E0", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${fillPct}%`, height: "100%", background: "#5A7898", borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 8, color: "#5A7898", fontWeight: 600 }}>{fillPct}%</span>
              </div>
            )}
            {subTab === "display" && selectedProduct && (
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full pulse-gold" style={{ background: "#B8914A" }} />
                <span style={{ fontSize: 8, color: "#B8914A", fontWeight: 500, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedProduct.name}
                </span>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {subTab === "display" && (
            <motion.div key="prep-display"
              className="flex-1 flex overflow-hidden min-h-0"
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex-1 overflow-hidden min-w-0 relative">
                <SectionEditor />
              </div>
            </motion.div>
          )}
          {subTab === "warehouse" && (
            <motion.div key="prep-warehouse"
              className="flex-1 flex flex-col overflow-hidden min-h-0"
              initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex-1 overflow-hidden min-h-0">
                <WarehouseShelfEditor />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  function ViewContent() {
    return (
      <div className="flex-1 overflow-hidden h-full w-full min-h-0">
        <ShelfViewer3D activeSubTab={subTab} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center justify-between border-b border-border"
        style={{
          height: 54,
          paddingLeft: 16, paddingRight: 16,
          background: "#FFFFFF",
          boxShadow: "0 1px 0 #EAE6E0, 0 2px 12px rgba(26,20,16,0.04)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="w-8 h-8 flex items-center justify-center flex-shrink-0"
            style={{
              border: "1px solid rgba(184,145,74,0.4)",
              background: "linear-gradient(145deg,#FFFDF9,#F5F0E8)",
              boxShadow: "0 1px 6px rgba(184,145,74,0.14), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            <span style={{ color: "#B8914A", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em" }}>P</span>
          </div>
          <div className="leading-none">
            <p style={{ fontSize: 10, letterSpacing: "0.5em", color: "#B8914A", fontWeight: 600 }}>POSTLAIN</p>
            <p className="hidden sm:block" style={{ fontSize: 7, letterSpacing: "0.22em", color: "#9A9080", marginTop: 2 }}>
              STORE MANAGER · ALDO
            </p>
          </div>
        </div>

        {/* Desktop main tab switcher */}
        <div className="hidden md:flex items-center"
          style={{
            background: "#F0EDE8", border: "1px solid #DDD8D0",
            borderRadius: 8, padding: 3, gap: 2,
          }}>
          {MAIN_TABS.map(t => {
            const isActive = mainTab === t.id;
            return (
              <button key={t.id} onClick={() => setMainTab(t.id)}
                className="transition-all duration-150 active:scale-95"
                style={{
                  padding: "7px 20px",
                  borderRadius: 6,
                  fontSize: 9, fontWeight: 600, letterSpacing: "0.2em",
                  background: isActive ? "#1A1410" : "transparent",
                  color: isActive ? "#FFFFFF" : "#9A9080",
                  boxShadow: isActive ? "0 1px 6px rgba(0,0,0,0.2)" : "none",
                }}
              >{t.icon} {t.label}</button>
            );
          })}
        </div>

        {/* Right indicators */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Live dot */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full pulse-green flex-shrink-0" style={{ background: "#22C55E" }} />
            <span className="hidden sm:inline" style={{ fontSize: 8, color: "#9A9080", letterSpacing: "0.2em", fontWeight: 500 }}>LIVE</span>
          </div>

          {/* Product count badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5"
            style={{ background: "#F5F2EE", border: "1px solid #DDD8D0", borderRadius: 6 }}>
            <span style={{ fontSize: 7, color: "#9A9080", letterSpacing: "0.2em" }}>SKU</span>
            <span style={{ fontSize: 10, color: "#1A1410", fontWeight: 600 }}>{products.length}</span>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT: Products panel */}
        <div
          className={[
            "flex-shrink-0 flex flex-col border-r border-border overflow-hidden",
            "md:w-[280px] md:flex bg-white",
            mobTab === "products" ? "flex flex-1 w-full" : "hidden md:flex md:w-[280px]",
          ].join(" ")}
          style={{ boxShadow: "1px 0 0 #EAE6E0" }}
        >
          {/* Panel header */}
          <div
            className="px-4 py-2.5 border-b border-border flex-shrink-0 flex items-center justify-between"
            style={{ background: "linear-gradient(180deg,#FFFFFF 0%,#FAFAF8 100%)", minHeight: 40 }}
          >
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 8, letterSpacing: "0.35em", color: "#B8914A", fontWeight: 700, textTransform: "uppercase" }}>
                SẢN PHẨM
              </span>
              <span
                style={{
                  padding: "1px 7px", borderRadius: 20,
                  fontSize: 8, fontWeight: 700, color: "#B8914A",
                  background: "rgba(184,145,74,0.10)", border: "1px solid rgba(184,145,74,0.20)",
                }}
              >{products.length}</span>
            </div>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(184,145,74,0.3)" }} />
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <WarehousePanel />
          </div>
        </div>

        {/* RIGHT: Content area */}
        <div className={[
          "flex-1 flex flex-col overflow-hidden min-w-0",
          mobTab === "products" ? "hidden md:flex" : "flex",
        ].join(" ")}>

          {/* DESKTOP content */}
          <div className="hidden md:flex flex-1 overflow-hidden min-h-0">
            {mainTab === "prepare" && <PrepareContent />}
            {mainTab === "view"    && <ViewContent />}
          </div>

          {/* MOBILE content */}
          <div className="md:hidden flex-1 overflow-hidden min-h-0 relative">
            {/* Selected product banner */}
            {mobTab === "prepare" && subTab === "display" && selectedProduct && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="absolute top-0 left-0 right-0 z-20 mx-3 mt-2 px-3 py-2 flex items-center gap-2"
                style={{
                  background: "rgba(184,145,74,0.09)", border: "1px solid rgba(184,145,74,0.28)",
                  borderRadius: 8, boxShadow: "0 2px 8px rgba(184,145,74,0.12)",
                  pointerEvents: "none",
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full pulse-gold flex-shrink-0" style={{ background: "#B8914A" }} />
                <span style={{ fontSize: 11, color: "#B8914A", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                  {selectedProduct.name}
                </span>
                <span style={{ fontSize: 9, color: "rgba(184,145,74,0.6)", flexShrink: 0 }}>→ chọn ô kệ</span>
              </motion.div>
            )}
            {mobTab === "prepare" && <PrepareContent />}
            {mobTab === "view"    && <ViewContent />}
          </div>
        </div>
      </div>

      {/* ── Bottom nav — mobile only ──────────────────────────────────────────── */}
      <nav
        className="md:hidden flex-shrink-0 border-t border-border"
        style={{
          background: "#FFFFFF",
          paddingBottom: "max(env(safe-area-inset-bottom), 6px)",
          boxShadow: "0 -1px 0 #EAE6E0, 0 -4px 20px rgba(26,20,16,0.06)",
        }}
      >
        <div className="flex">
          {MOB_TABS.map(tab => {
            const isActive = mobTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMobTab(tab.id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-all tap-scale"
                style={{ minHeight: 56, paddingTop: 10, paddingBottom: 8 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomNavBar"
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                    style={{ height: 2, width: 32, background: tab.color }}
                    transition={{ type: "spring", bounce: 0.35, duration: 0.4 }}
                  />
                )}
                <motion.span
                  animate={{ scale: isActive ? 1.12 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={{ fontSize: 17, lineHeight: 1, color: isActive ? tab.color : "#B0A898" }}
                >
                  {tab.icon}
                </motion.span>
                <span style={{
                  fontSize: 8, fontWeight: 600, letterSpacing: "0.08em", lineHeight: 1,
                  color: isActive ? tab.color : "#B0A898",
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
