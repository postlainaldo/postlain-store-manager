"use client";

import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Tab } from "@/types";

const NAV_ITEMS: { tab: Tab; label: string; icon: string }[] = [
  { tab: "inventory", label: "KHO HÀNG", icon: "▦" },
  { tab: "display", label: "TRƯNG BÀY", icon: "◈" },
];

export default function Navigation() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <nav className="w-20 flex flex-col items-center bg-bg-surface border-r border-border py-8 gap-2 flex-shrink-0">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-10 h-10 flex items-center justify-center border border-gold/40 rounded-sm">
          <span className="text-gold text-xl font-light tracking-widest">P</span>
        </div>
      </div>

      {NAV_ITEMS.map(({ tab, label, icon }) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative w-full flex flex-col items-center gap-1.5 py-4 group transition-all duration-300"
          >
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-gold rounded-r"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            <span
              className={`text-lg transition-colors duration-300 ${
                isActive ? "text-gold" : "text-text-muted group-hover:text-text-secondary"
              }`}
            >
              {icon}
            </span>
            <span
              className={`text-[9px] tracking-[0.15em] font-medium transition-colors duration-300 leading-tight text-center ${
                isActive ? "text-gold" : "text-text-muted group-hover:text-text-secondary"
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}

      {/* Bottom spacer */}
      <div className="mt-auto mb-4">
        <div className="w-8 h-px bg-border" />
      </div>
    </nav>
  );
}
