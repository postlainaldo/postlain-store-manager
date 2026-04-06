"use client";

import { useStore, sel } from "@/store/useStore";

// ─── Light (Apple-style) ───────────────────────────────────────────────────
const LIGHT = {
  isLight: true,
  isDark: false,

  // Card / panel backgrounds
  cardBg:          "#ffffff",
  cardBgGlass:     "rgba(255,255,255,0.88)",
  cardBgElevated:  "#f2f2f7",
  cardBorder:      "rgba(0,0,0,0.07)",
  cardBorderGold:  "rgba(201,165,90,0.22)",
  cardShadow:      "0 2px 16px rgba(0,0,0,0.08)",
  cardShadowLg:    "0 8px 32px rgba(0,0,0,0.12)",

  // Header / nav
  headerBg:        "rgba(255,255,255,0.92)",
  headerBorder:    "rgba(0,0,0,0.06)",

  // Input
  inputBg:         "#ffffff",
  inputBorder:     "rgba(0,0,0,0.10)",

  // Text
  textPrimary:     "#1c1c1e",
  textSecondary:   "#3c3c43",
  textMuted:       "#8e8e93",

  // Surface
  surfaceBg:       "#f2f2f7",
  surfaceBorder:   "rgba(0,0,0,0.05)",

  // Row highlight (tables)
  rowHover:        "rgba(0,0,0,0.025)",

  // Avatar gradient
  avatarGradient:  "linear-gradient(135deg, #e5e5ea, #d1d1d6)",
  avatarText:      "#1c1c1e",

  // Overlay / modal backdrop
  overlayBg:       "rgba(0,0,0,0.35)",

  // Message bubble (chat) non-mine
  bubbleBg:        "rgba(0,0,0,0.06)",

  // Sticky / floating badge
  labelBg:         "rgba(255,255,255,0.9)",
  labelBorder:     "rgba(0,0,0,0.08)",

  // Status dot border
  statusDotBorder: "rgba(255,255,255,0.8)",

  // Icon button
  iconBtnBg:       "rgba(0,0,0,0.05)",
  iconBtnBorder:   "rgba(0,0,0,0.10)",
} as const;

// ─── Dark (Midnight Gold Glass) ────────────────────────────────────────────
const DARK = {
  isLight: false,
  isDark: true,

  cardBg:          "rgba(15,23,42,0.85)",
  cardBgGlass:     "rgba(15,23,42,0.85)",
  cardBgElevated:  "rgba(20,32,52,0.95)",
  cardBorder:      "rgba(255,255,255,0.07)",
  cardBorderGold:  "rgba(201,165,90,0.22)",
  cardShadow:      "0 4px 24px rgba(0,0,0,0.40)",
  cardShadowLg:    "0 12px 40px rgba(0,0,0,0.55)",

  headerBg:        "rgba(8,14,26,0.92)",
  headerBorder:    "rgba(255,255,255,0.06)",

  inputBg:         "#0d1525",
  inputBorder:     "rgba(255,255,255,0.10)",

  textPrimary:     "#f0f4ff",
  textSecondary:   "#94a3b8",
  textMuted:       "#64748b",

  surfaceBg:       "#0f1729",
  surfaceBorder:   "rgba(255,255,255,0.05)",

  rowHover:        "rgba(59,130,246,0.05)",

  avatarGradient:  "linear-gradient(135deg, #0c1a2e, #1e3a5f)",
  avatarText:      "#C9A55A",

  overlayBg:       "rgba(0,0,0,0.65)",

  bubbleBg:        "rgba(255,255,255,0.08)",

  labelBg:         "rgba(5,10,22,0.75)",
  labelBorder:     "rgba(255,255,255,0.08)",

  statusDotBorder: "rgba(8,14,26,0.8)",

  iconBtnBg:       "rgba(255,255,255,0.08)",
  iconBtnBorder:   "rgba(255,255,255,0.12)",
} as const;

export type ThemeValues = typeof LIGHT;

export function useTheme(): ThemeValues {
  const theme = useStore(sel.theme);
  return theme === "dark" ? DARK : LIGHT;
}
