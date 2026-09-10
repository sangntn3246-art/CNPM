import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#6F7A90",
        canvas: "#F7F8FB",
        subtle: "#F5F7FA",
        line: "#E5E9F1",
        brand: "#2859C5",
        positive: "#18875A",
        warning: "#B7791F",
        danger: "#B5473E",
      },
      fontFamily: {
        sans: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        soft: "0 8px 24px rgba(28, 39, 61, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
