import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        void: "#090E17",
        steel: "#101722",
        wire: "#202A3A",
        mist: "#8D99AD",
        ok: "#37B37E",
        alert: "#DF6B63",
        adminblue: "#5D85E2",
      },
      fontFamily: {
        sans: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        glow: "0 8px 24px rgba(51, 93, 194, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
