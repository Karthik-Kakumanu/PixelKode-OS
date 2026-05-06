import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0F19",
        card: "#111827",
        border: "rgba(255,255,255,0.08)",
        muted: "#9CA3AF",
        primary: {
          DEFAULT: "#7C3AED",
          blue: "#2563EB"
        },
        success: "#22C55E",
        warning: "#F97316",
        danger: "#EF4444"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 18px 60px rgba(15, 23, 42, 0.35)"
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "brand-gradient": "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)"
      }
    }
  },
  plugins: []
};

export default config;
