import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-montserrat)", "Montserrat", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        bg: {
          base:     "var(--bg-base)",
          surface:  "var(--bg-surface)",
          card:     "var(--bg-card)",
          elevated: "var(--bg-elevated)",
          overlay:  "var(--bg-overlay)",
          input:    "var(--bg-input)",
          sidebar:  "var(--bg-sidebar)",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle:  "var(--border-subtle)",
          strong:  "var(--border-strong)",
        },
        gold: {
          DEFAULT: "var(--lime)",
          light:   "var(--lime-light)",
          dark:    "var(--lime-dark)",
          muted:   "var(--lime-muted)",
          glow:    "var(--lime-glow)",
        },
        lime: {
          DEFAULT: "var(--lime)",
          light:   "var(--lime-light)",
          dark:    "var(--lime-dark)",
          muted:   "var(--lime-muted)",
          glow:    "var(--lime-glow)",
        },
        blue: {
          DEFAULT: "var(--blue)",
          light:   "var(--blue-light)",
          dark:    "var(--blue-dark)",
          glow:    "var(--blue-glow)",
          subtle:  "var(--blue-subtle)",
        },
        text: {
          primary:   "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted:     "var(--text-muted)",
          inverse:   "var(--text-inverse)",
        },
        accent: {
          blue:   "var(--accent-blue)",
          green:  "var(--accent-green)",
          red:    "var(--accent-red)",
          purple: "var(--accent-purple)",
          gold:   "var(--accent-gold)",
        },
      },
      boxShadow: {
        xs:    "var(--shadow-xs)",
        sm:    "var(--shadow-sm)",
        md:    "var(--shadow-md)",
        lg:    "var(--shadow-lg)",
        xl:    "var(--shadow-xl)",
        blue:  "var(--shadow-blue)",
        gold:  "var(--shadow-lime)",
        lime:  "var(--shadow-lime)",
        inner: "inset 0 2px 6px rgba(0,0,0,0.07)",
      },
      borderRadius: {
        xs:   "var(--r-xs)",
        sm:   "var(--r-sm)",
        md:   "var(--r-md)",
        lg:   "var(--r-lg)",
        xl:   "var(--r-xl)",
        full: "var(--r-full)",
      },
      screens: {
        xs: "375px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px",
      },
      animation: {
        "fade-in":    "fadeIn 0.24s ease forwards",
        "slide-up":   "slideUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
        "slide-down": "slideDown 0.24s ease forwards",
        "scale-in":   "scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards",
        "pulse-gold": "pulseLime 2s ease-in-out infinite",
        "pulse-lime": "pulseLime 2s ease-in-out infinite",
        "pulse-blue": "pulseBlue 2s ease-in-out infinite",
        "shimmer":    "shimmer 1.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:     { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:    { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideDown:  { from: { opacity: "0", transform: "translateY(-10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        scaleIn:    { from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
        pulseGold:  { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.7" } },
        pulseBlue:  { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.65" } },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
