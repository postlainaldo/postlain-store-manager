"use client";

import { useStore, sel } from "@/store/useStore";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ size = 18 }: { size?: number }) {
  const theme    = useStore(sel.theme);
  const setTheme = useStore(sel.setTheme);

  const isLight = theme === "light";

  const toggle = () => {
    const next = isLight ? "dark" : "light";
    setTheme(next);
    if (typeof window !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
  };

  return (
    <button
      onClick={toggle}
      title={isLight ? "Chuyển Dark Mode" : "Chuyển Light Mode"}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: isLight ? "1px solid rgba(0,0,0,0.10)" : "1px solid rgba(255,255,255,0.12)",
        background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s",
        flexShrink: 0,
      }}
    >
      {isLight
        ? <Moon size={size} style={{ color: "#1c1c1e" }} />
        : <Sun  size={size} style={{ color: "#C9A55A" }} />
      }
    </button>
  );
}
