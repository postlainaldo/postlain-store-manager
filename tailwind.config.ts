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
        sans: ["var(--font-montserrat)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        bg: {
          base:     "#F5F2EE",
          surface:  "#FFFFFF",
          card:     "#F9F7F4",
          elevated: "#F0EDE8",
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
        },
        text: {
          primary:   "#1A1410",
          secondary: "#6A6050",
          muted:     "#9A9080",
          inverse:   "#FFFFFF",
        },
      },
      backgroundImage: {
        "gradient-gold": "linear-gradient(135deg, #B8914A 0%, #D4B06E 50%, #B8914A 100%)",
        "gradient-light": "linear-gradient(180deg, #FFFFFF 0%, #F5F2EE 100%)",
      },
      animation: {
        "fade-in":    "fadeIn 0.4s ease-out",
        "slide-up":   "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-right":"slideRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:    { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp:   { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideRight:{ "0%": { opacity: "0", transform: "translateX(-16px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        pulseGold: { "0%, 100%": { boxShadow: "0 0 8px rgba(184, 145, 74, 0.3)" }, "50%": { boxShadow: "0 0 20px rgba(184, 145, 74, 0.7)" } },
      },
    },
  },
  plugins: [],
};

export default config;
