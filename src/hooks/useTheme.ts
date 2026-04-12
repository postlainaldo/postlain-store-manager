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
  cardBorderGold:  "rgba(181,242,61,0.20)",
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

// ─── Dark (True Black × Lime) ──────────────────────────────────────────────
const DARK = {
  isLight: false,
  isDark: true,

  cardBg:          "rgba(17,17,17,0.90)",
  cardBgGlass:     "rgba(17,17,17,0.85)",
  cardBgElevated:  "rgba(26,26,26,0.98)",
  cardBorder:      "rgba(255,255,255,0.07)",
  cardBorderGold:  "rgba(181,242,61,0.18)",
  cardShadow:      "0 4px 24px rgba(0,0,0,0.70)",
  cardShadowLg:    "0 12px 40px rgba(0,0,0,0.85)",

  headerBg:        "rgba(5,5,5,0.94)",
  headerBorder:    "rgba(255,255,255,0.05)",

  inputBg:         "#0f0f0f",
  inputBorder:     "rgba(255,255,255,0.08)",

  textPrimary:     "#ffffff",
  textSecondary:   "#a0a0a0",
  textMuted:       "#555555",

  surfaceBg:       "#0a0a0a",
  surfaceBorder:   "rgba(255,255,255,0.04)",

  rowHover:        "rgba(181,242,61,0.04)",

  avatarGradient:  "linear-gradient(135deg, #111111, #1a1a1a)",
  avatarText:      "#b5f23d",

  overlayBg:       "rgba(0,0,0,0.80)",

  bubbleBg:        "rgba(255,255,255,0.07)",

  labelBg:         "rgba(0,0,0,0.85)",
  labelBorder:     "rgba(255,255,255,0.07)",

  statusDotBorder: "rgba(5,5,5,0.9)",

  iconBtnBg:       "rgba(255,255,255,0.06)",
  iconBtnBorder:   "rgba(255,255,255,0.10)",
} as const;

export type ThemeValues = typeof LIGHT;

export function useTheme(): ThemeValues {
  const theme = useStore(sel.theme);
  return theme === "dark" ? DARK : LIGHT;
}
