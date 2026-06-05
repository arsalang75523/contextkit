import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050706",
        carbon: "#0a0f0d",
        alloy: "#111816",
        mint: "#73f3c3",
        aqua: "#68d8ff",
        amber: "#f6d365",
        coral: "#ff7b6b",
        line: "rgba(219, 255, 239, 0.12)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"]
      },
      boxShadow: {
        glow: "0 0 80px rgba(115, 243, 195, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;
