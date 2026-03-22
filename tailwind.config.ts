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
          base:     "#F5F2EE",
          surface:  "#FFFFFF",
          card:     "#F9F7F4",
          elevated: "#F0EDE8",
          overlay:  "rgba(26,20,16,0.45)",
        },
        border: {
          DEFAULT: "#DDD8D0",
          subtle:  "#EAE6E0",
          strong:  "#C8C0B8",
        },
        gold: {
          DEFAULT: "#B8914A",
          light:   "#D4B06E",
          dark:    "#8A6A28",
          muted:   "#C8A870",
          glow:    "rgba(184,145,74,0.18)",
        },
        text: {
          primary:   "#1A1410",
          secondary: "#6A6050",
          muted:     "#9A9080",
          inverse:   "#FFFFFF",
        },
        // Store area accent colors
        area: {
          women:   "#B8914A",
          men:     "#5A7898",
          kids:    "#6A8868",
          acc:     "#8868A8",
          sale:    "#C85A5A",
        },
      },
      boxShadow: {
        xs:    "0 1px 2px rgba(26,20,16,0.06)",
        sm:    "0 2px 8px rgba(26,20,16,0.08), 0 1px 2px rgba(26,20,16,0.04)",
        md:    "0 4px 16px rgba(26,20,16,0.10), 0 2px 4px rgba(26,20,16,0.06)",
        lg:    "0 8px 32px rgba(26,20,16,0.12), 0 4px 8px rgba(26,20,16,0.08)",
        xl:    "0 16px 48px rgba(26,20,16,0.15), 0 8px 16px rgba(26,20,16,0.10)",
        gold:  "0 4px 20px rgba(184,145,74,0.22)",
        inner: "inset 0 2px 4px rgba(26,20,16,0.05)",
      },
      backgroundImage: {
        "gradient-gold":   "linear-gradient(135deg, #B8914A 0%, #D4B06E 50%, #B8914A 100%)",
        "gradient-gold-h": "linear-gradient(90deg, #B8914A 0%, #D4B06E 100%)",
        "gradient-light":  "linear-gradient(180deg, #FFFFFF 0%, #F5F2EE 100%)",
        "gradient-card":   "linear-gradient(145deg, #FFFFFF 0%, #F9F7F4 100%)",
      },
      borderRadius: {
        xs: "3px",
        sm: "6px",
        md: "10px",
        lg: "16px",
        xl: "24px",
      },
      animation: {
        "fade-in":      "fadeIn 0.3s ease-out",
        "slide-up":     "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down":   "slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-right":  "slideRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in":     "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-gold":   "pulseGold 2s ease-in-out infinite",
        "pulse-green":  "pulseGreen 2s ease-in-out infinite",
        "slot-pulse":   "slotPulse 1.2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:    { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp:   { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideDown: { "0%": { opacity: "0", transform: "translateY(-10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideRight:{ "0%": { opacity: "0", transform: "translateX(-14px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        scaleIn:   { "0%": { opacity: "0", transform: "scale(0.95)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        pulseGold: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(184,145,74,0.4)" },
          "50%": { opacity: "0.7", boxShadow: "0 0 0 5px rgba(184,145,74,0)" }
        },
        pulseGreen: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(34,197,94,0.4)" },
          "50%": { opacity: "0.8", boxShadow: "0 0 0 4px rgba(34,197,94,0)" }
        },
        slotPulse: {
          "0%, 100%": { borderColor: "rgba(99,179,237,0.5)", background: "rgba(235,248,255,0.6)" },
          "50%": { borderColor: "rgba(66,153,225,0.8)", background: "rgba(235,248,255,0.9)" }
        },
      },
      spacing: {
        "safe-b": "env(safe-area-inset-bottom)",
        "safe-t": "env(safe-area-inset-top)",
      },
    },
  },
  plugins: [],
};

export default config;
