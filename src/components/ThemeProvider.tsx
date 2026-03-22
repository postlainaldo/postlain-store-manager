"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme:  Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:    "dark",
  toggle:   () => {},
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialise from what the blocking script already set on <html>
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try { localStorage.setItem("postlain-theme", t); } catch {}
    setThemeState(t);
  }, []);

  // Sync on mount (in case SSR mismatch)
  useEffect(() => {
    const saved = (() => {
      try { return localStorage.getItem("postlain-theme") as Theme | null; } catch { return null; }
    })();
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved: Theme = saved === "light" || saved === "dark"
      ? saved
      : prefersDark ? "dark" : "light";
    applyTheme(resolved);
  }, [applyTheme]);

  const toggle = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark");
  }, [theme, applyTheme]);

  const setTheme = useCallback((t: Theme) => {
    applyTheme(t);
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
