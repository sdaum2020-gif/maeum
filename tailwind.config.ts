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
        ivory: "#FFFFF0",
        beige: "#F5F5DC",
        cream: "#FFFDD0",
        "soft-green": "#90EE90",
        "soft-yellow": "#FFFACD",
        "warm-brown": "#8B7355",
      },
      fontFamily: {
        sans: ["var(--font-pretendard)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;