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
        brand: {
          DEFAULT: "#6C63FF",
          foreground: "#FFFFFF",
          light: "#8B85FF",
          dark: "#5A52D4",
        },
        background: "#F9FAFB",
        foreground: "#111827",
      },
    },
  },
  plugins: [],
};
export default config;
