import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0d0f12",
          card: "#13161b",
          hover: "#1a1d24",
          input: "#0a0c0f",
        },
        accent: {
          DEFAULT: "#00ff88",
          dim: "#00cc6a",
          glow: "rgba(0, 255, 136, 0.15)",
        },
        border: {
          DEFAULT: "#1e2128",
          bright: "#2a2e38",
        },
        text: {
          primary: "#e0e0e0",
          secondary: "#6b7280",
          muted: "#3d4250",
        },
        status: {
          online: "#00ff88",
          offline: "#ff4444",
          warning: "#ffaa00",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
        display: ['"Syne"', "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
