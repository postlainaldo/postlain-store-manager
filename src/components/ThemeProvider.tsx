"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

// Theme is locked to light — dark mode removed.
// Context kept so existing imports don't break.
interface ThemeContextValue {
  theme:    "light";
  toggle:   () => void;
  setTheme: (t: "light") => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:    "light",
  toggle:   () => {},
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Ensure dark class is never present
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    try { localStorage.removeItem("postlain-theme"); } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "light", toggle: () => {}, setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}
