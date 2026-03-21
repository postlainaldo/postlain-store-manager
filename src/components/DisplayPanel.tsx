"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import SectionEditor from "./SectionEditor";

const StoreFloorScene = dynamic(() => import("./StoreFloorScene"), {
  ssr: false,
  loading: () => (
    <div style={{
      position: "absolute", inset: 0,
      background: "#F5F2EE",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16,
    }}>
      <div style={{
        width: 28, height: 28,
        border: "1px solid rgba(184,145,74,0.25)",
        borderTopColor: "#B8914A",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />
      <p style={{ color: "#9A9080", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase" }}>
        Đang tải sàn 3D…
      </p>
    </div>
  ),
});

type ViewMode = "2d" | "3d";

export default function DisplayPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>("2d");

  return (
    <div className="flex flex-col h-full bg-bg-base">
      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0 bg-bg-surface">
        <div className="flex items-center gap-1 bg-bg-base border border-border rounded-sm p-0.5">
          <button
            onClick={() => setViewMode("2d")}
            className={`px-3 py-1 text-[9px] tracking-[0.15em] rounded-sm transition-all ${
              viewMode === "2d"
                ? "bg-gold text-white shadow-sm"
                : "text-text-muted hover:text-text-secondary border border-transparent"
            }`}
          >
            2D PLANOGRAM
          </button>
          <button
            onClick={() => setViewMode("3d")}
            className={`px-3 py-1 text-[9px] tracking-[0.15em] rounded-sm transition-all ${
              viewMode === "3d"
                ? "bg-gold text-white shadow-sm"
                : "text-text-muted hover:text-text-secondary border border-transparent"
            }`}
          >
            3D TỔNG QUAN
          </button>
        </div>

        <span className="text-[9px] text-text-muted tracking-widest">
          {viewMode === "2d" ? "Chọn kệ → xếp sản phẩm" : "Kéo xoay · Scroll zoom"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <AnimatePresence mode="wait" initial={false}>
          {viewMode === "2d" ? (
            <div key="2d" className="w-full h-full">
              <SectionEditor />
            </div>
          ) : (
            <div key="3d" className="relative w-full h-full">
              <div style={{ position: "absolute", inset: 0 }}>
                <StoreFloorScene />
              </div>
              <div className="absolute top-3 right-3 pointer-events-none z-10">
                <p className="text-[8px] tracking-[0.2em] text-text-muted uppercase bg-white/70 px-2 py-1 rounded-sm backdrop-blur-sm">
                  Xem tổng quan · Không chỉnh sửa
                </p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
