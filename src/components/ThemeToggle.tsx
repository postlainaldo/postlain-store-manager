"use client";

// ThemeToggle is a no-op stub — the app is locked to Blue Mint light mode.
// Kept as a file so existing imports in Sidebar / Settings don't break.
// Returns null; the sidebar will simply render nothing for this slot.

export default function ThemeToggle({
  variant: _variant = "compact",
  className: _className = "",
}: {
  variant?: "compact" | "full";
  className?: string;
}) {
  return null;
}
