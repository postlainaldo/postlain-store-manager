"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface Props {
  /** compact = icon only, full = icon + label */
  variant?: "compact" | "full";
  className?: string;
}

export default function ThemeToggle({ variant = "compact", className = "" }: Props) {
  const { theme, toggle } = useTheme();

  // ── Hydration fix ──────────────────────────────────────────────────────────
  // Server doesn't know the saved theme yet.  Render a neutral placeholder
  // until the component is mounted on the client, then swap in the real icon.
  // This eliminates the server/client aria-label & className mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted ? theme === "dark" : false; // stable server default

  const sharedBtnClass = [
    "relative inline-flex items-center gap-2 rounded-md border",
    "transition-all duration-200",
    variant === "full" ? "px-3 py-2" : "w-9 h-9 justify-center",
    "border-border bg-bg-card text-text-secondary hover:border-blue hover:text-blue",
    className,
  ].join(" ");

  // ── Pre-mount: render an identical-looking neutral skeleton ───────────────
  // Same dimensions / classes → no layout shift, no hydration mismatch.
  if (!mounted) {
    return (
      <button
        aria-label="Chuyển chế độ"
        className={sharedBtnClass}
        // no onClick — user can't click before hydration anyway
      >
        <span className="flex w-[15px] h-[15px]" />
        {variant === "full" && (
          <span className="text-[10px] font-medium tracking-widest whitespace-nowrap opacity-0">
            ----
          </span>
        )}
      </button>
    );
  }

  // ── Post-mount: full interactive toggle ───────────────────────────────────
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Chuyển sang sáng" : "Chuyển sang tối"}
      className={sharedBtnClass}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ rotate: -30, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0,   opacity: 1, scale: 1   }}
            exit={{   rotate:  30,  opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            className="flex"
          >
            <Sun size={15} strokeWidth={1.8} />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate:  30, opacity: 0, scale: 0.8 }}
            animate={{ rotate:  0,  opacity: 1, scale: 1   }}
            exit={{   rotate: -30,  opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            className="flex"
          >
            <Moon size={15} strokeWidth={1.8} />
          </motion.span>
        )}
      </AnimatePresence>

      {variant === "full" && (
        <span className="text-[10px] font-medium tracking-widest whitespace-nowrap">
          {isDark ? "SÁNG" : "TỐI"}
        </span>
      )}
    </button>
  );
}
