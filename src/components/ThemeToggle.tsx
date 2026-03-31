"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle({
  variant = "compact",
  className = "",
}: {
  variant?: "compact" | "full";
  className?: string;
}) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  if (variant === "full") {
    return (
      <button
        onClick={toggle}
        className={className}
        title={isDark ? "Chuyển sang Light Mode" : "Chuyển sang Dark Mode"}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px", borderRadius: 10,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`,
          background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
          color: isDark ? "#94a3b8" : "#334e68",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          transition: "background 0.2s, border-color 0.2s, transform 0.18s",
          fontFamily: "inherit",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
          (e.currentTarget as HTMLButtonElement).style.background = isDark
            ? "rgba(255,255,255,0.09)"
            : "rgba(0,0,0,0.07)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLButtonElement).style.background = isDark
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.04)";
        }}
      >
        {isDark
          ? <Sun  size={14} strokeWidth={1.5} color="rgba(201,165,90,0.9)" />
          : <Moon size={14} strokeWidth={1.5} color="#334e68" />
        }
        <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={className}
      title={isDark ? "Chuyển sang Light Mode" : "Chuyển sang Dark Mode"}
      style={{
        width: 30, height: 30, borderRadius: 8,
        border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`,
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s, transform 0.18s",
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.10)";
        (e.currentTarget as HTMLButtonElement).style.background = isDark
          ? "rgba(255,255,255,0.10)"
          : "rgba(0,0,0,0.09)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLButtonElement).style.background = isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(0,0,0,0.05)";
      }}
    >
      {isDark
        ? <Sun  size={13} strokeWidth={1.5} color="rgba(201,165,90,0.90)" />
        : <Moon size={13} strokeWidth={1.5} color="#64748b" />
      }
    </button>
  );
}
