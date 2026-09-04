/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#F5FAFF",
        panel: "#FFFFFF",
        panel2: "#EAF4FE",
        border: "#D3E7F7",
        accent: "#0EA5E9",
        accent2: "#2563EB",
        muted: "#5B7A99",
        ink: "#0F2942",
        high: "#16A34A",
        medium: "#D97706",
        low: "#DC2626",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        popIn: {
          "0%": { transform: "scale(0.94)" },
          "60%": { transform: "scale(1.03)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-slide-up": "fadeSlideUp 0.35s ease-out both",
        shimmer: "shimmer 1.6s infinite linear",
        "pop-in": "popIn 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};
