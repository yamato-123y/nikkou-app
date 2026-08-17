import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 現場の安全ベスト・標識に使われる高視認性オレンジをブランドカラーに採用
        brand: {
          DEFAULT: "#EA580C",
          dark: "#C2410C",
        },
        // カメラ操作を示す落ち着いた青
        accent: {
          DEFAULT: "#2563EB",
        },
        danger: {
          DEFAULT: "#DC2626",
        },
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(220,38,38,0.4)" },
          "50%": { boxShadow: "0 0 0 14px rgba(220,38,38,0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
